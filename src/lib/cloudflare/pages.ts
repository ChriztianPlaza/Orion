import { blake3 } from "hash-wasm";
import { env, isCloudflareConfigured } from "@/lib/env";
import { mimeTypeFor } from "@/lib/security/paths";
import type { GeneratedFile } from "@/lib/templates/generate";

/**
 * Cloudflare Pages Direct Upload.
 *
 * Implements the same four-step flow wrangler uses, so deployments are real:
 *   1. ensure the Pages project exists
 *   2. mint a scoped upload token for that project
 *   3. ask which content hashes are missing, upload only those
 *   4. create the deployment from a manifest of path -> hash
 *
 * The API token never leaves the server. Callers pass files and a project name;
 * they get back a URL or a typed failure.
 */

const API = "https://api.cloudflare.com/client/v4";

export class CloudflareNotConfiguredError extends Error {
  constructor() {
    super("Cloudflare deployment is not configured.");
    this.name = "CloudflareNotConfiguredError";
  }
}

export class CloudflareError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "CloudflareError";
  }
}

type CfResponse<T> = {
  success: boolean;
  result: T;
  errors?: { code: number; message: string }[];
  messages?: unknown[];
};

async function cf<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<CfResponse<T>> {
  if (!isCloudflareConfigured()) throw new CloudflareNotConfiguredError();

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token ?? env.CLOUDFLARE_API_TOKEN}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as CfResponse<T> | null;

  if (!response.ok || !payload?.success) {
    const message =
      payload?.errors?.map((e) => e.message).join("; ") ||
      `Cloudflare request failed (${response.status})`;
    throw new CloudflareError(message, response.status, payload?.errors);
  }

  return payload;
}

/* ------------------------------------------------------------- projects */

export type PagesProject = {
  name: string;
  subdomain: string;
  domains: string[];
  created_on: string;
};

export async function getProject(name: string): Promise<PagesProject | null> {
  try {
    const result = await cf<PagesProject>(
      `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${encodeURIComponent(name)}`,
    );
    return result.result;
  } catch (error) {
    if (error instanceof CloudflareError && error.status === 404) return null;
    throw error;
  }
}

export async function ensureProject(name: string): Promise<PagesProject> {
  const existing = await getProject(name);
  if (existing) return existing;

  const created = await cf<PagesProject>(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, production_branch: "main" }),
    },
  );
  return created.result;
}

export async function deleteProject(name: string): Promise<void> {
  await cf(`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

/** True when the name is free to claim on this account. */
export async function isProjectNameAvailable(name: string): Promise<boolean> {
  const project = await getProject(name);
  return project === null;
}

/* -------------------------------------------------------------- uploads */

async function uploadToken(projectName: string): Promise<string> {
  const result = await cf<{ jwt: string }>(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${encodeURIComponent(projectName)}/upload-token`,
  );
  return result.result.jwt;
}

type PreparedFile = {
  /** Manifest path, always absolute with a leading slash. */
  path: string;
  hash: string;
  base64: string;
  contentType: string;
  bytes: number;
};

/**
 * Content hash, matching wrangler: blake3 over the base64 payload concatenated
 * with the bare extension, truncated to 32 hex characters.
 */
async function prepare(file: GeneratedFile): Promise<PreparedFile> {
  const base64 = Buffer.from(file.bytes).toString("base64");
  const extension = file.path.includes(".") ? file.path.split(".").pop()!.toLowerCase() : "";
  const digest = await blake3(base64 + extension);

  return {
    path: `/${file.path.replace(/^\/+/, "")}`,
    hash: digest.slice(0, 32),
    base64,
    contentType: file.mimeType || mimeTypeFor(file.path),
    bytes: file.bytes.byteLength,
  };
}

async function checkMissing(jwt: string, hashes: string[]): Promise<Set<string>> {
  const response = await fetch(`${API}/pages/assets/check-missing`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ hashes }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as CfResponse<string[]> | null;
  if (!response.ok || !payload?.success) {
    // Fall back to uploading everything rather than failing the deploy.
    return new Set(hashes);
  }
  return new Set(payload.result ?? hashes);
}

const UPLOAD_BATCH = 20;

async function uploadAssets(jwt: string, files: PreparedFile[]): Promise<void> {
  for (let index = 0; index < files.length; index += UPLOAD_BATCH) {
    const batch = files.slice(index, index + UPLOAD_BATCH);
    const response = await fetch(`${API}/pages/assets/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        batch.map((file) => ({
          key: file.hash,
          value: file.base64,
          metadata: { contentType: file.contentType },
          base64: true,
        })),
      ),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new CloudflareError(
        `Asset upload failed (${response.status})`,
        response.status,
        detail.slice(0, 500),
      );
    }
  }
}

/* ----------------------------------------------------------- deployment */

export type DeploymentResult = {
  id: string;
  url: string;
  aliasUrl: string;
  fileCount: number;
  bytes: number;
};

export type DeployProgress = (step: string, detail?: string) => void | Promise<void>;

export async function deployToPages(input: {
  projectName: string;
  files: GeneratedFile[];
  onProgress?: DeployProgress;
}): Promise<DeploymentResult> {
  const { projectName, files, onProgress } = input;
  if (!isCloudflareConfigured()) throw new CloudflareNotConfiguredError();
  if (!files.length) throw new CloudflareError("Nothing to deploy.", 400);

  await onProgress?.("preparing", "Hashing files");
  const prepared = await Promise.all(files.map(prepare));
  const manifest: Record<string, string> = {};
  for (const file of prepared) manifest[file.path] = file.hash;

  await onProgress?.("project", "Creating the Pages project");
  const project = await ensureProject(projectName);

  await onProgress?.("uploading", `Uploading ${prepared.length} files`);
  const jwt = await uploadToken(projectName);

  // De-duplicate by hash before asking Cloudflare — identical files (a shared
  // stylesheet across pages) only need one upload.
  const byHash = new Map(prepared.map((file) => [file.hash, file]));
  const missing = await checkMissing(jwt, [...byHash.keys()]);
  const toUpload = [...byHash.values()].filter((file) => missing.has(file.hash));
  if (toUpload.length) await uploadAssets(jwt, toUpload);

  await onProgress?.("deploying", "Publishing the deployment");
  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));

  const deployment = await cf<{ id: string; url: string; aliases?: string[] }>(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
    { method: "POST", body: form },
  );

  const aliasUrl = `https://${project.subdomain || `${projectName}.${env.CLOUDFLARE_PAGES_DOMAIN}`}`;

  return {
    id: deployment.result.id,
    url: deployment.result.url ?? aliasUrl,
    aliasUrl: deployment.result.aliases?.[0] ?? aliasUrl,
    fileCount: prepared.length,
    bytes: prepared.reduce((sum, file) => sum + file.bytes, 0),
  };
}

export async function deleteDeployment(projectName: string, deploymentId: string): Promise<void> {
  await cf(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${encodeURIComponent(projectName)}/deployments/${encodeURIComponent(deploymentId)}`,
    { method: "DELETE" },
  );
}
