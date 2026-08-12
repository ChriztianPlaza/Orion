"use client";

import * as React from "react";
import { AlertTriangle, Check, ExternalLink, Globe, Loader2, RefreshCw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldHint } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { cn, slugify } from "@/lib/utils";

type Deployment = {
  id: string;
  status: string;
  projectName: string;
  url: string | null;
  aliasUrl: string | null;
  fileCount: number;
  bytes: number;
  createdAt: string;
};

type NameCheck = {
  available: boolean;
  valid: boolean;
  host?: string;
  message?: string;
  unverified?: boolean;
};

const STEPS = [
  { id: "preparing", label: "Preparing files" },
  { id: "project", label: "Creating the project" },
  { id: "uploading", label: "Uploading assets" },
  { id: "deploying", label: "Publishing the deployment" },
];

export function DeployDialog({
  open,
  onClose,
  projectId,
  projectName,
  currentSubdomain,
  canDeploy,
  onDeployed,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentSubdomain: string | null;
  canDeploy: boolean;
  onDeployed?: (deployment: Deployment) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState(currentSubdomain ?? slugify(projectName) ?? "");
  const [check, setCheck] = React.useState<NameCheck | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [deploying, setDeploying] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState(-1);
  const [result, setResult] = React.useState<Deployment | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = React.useState<string | null>(null);

  const isRedeploy = Boolean(currentSubdomain) && name === currentSubdomain;

  React.useEffect(() => {
    if (!open) {
      setResult(null);
      setFailure(null);
      setActiveStep(-1);
    }
  }, [open]);

  // Debounced availability check.
  React.useEffect(() => {
    if (!open || !name || isRedeploy) {
      setCheck(null);
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/deployments/check-name?name=${encodeURIComponent(name)}`);
        const payload = (await response.json()) as NameCheck;
        setCheck(payload);
      } catch {
        setCheck(null);
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [name, open, isRedeploy]);

  const deploy = async () => {
    if (!canDeploy) {
      setUpgradeReason("Deploying to the web is a Pro feature.");
      return;
    }

    setDeploying(true);
    setFailure(null);
    setResult(null);
    setActiveStep(0);

    // Advance the visual step list while the request is in flight. The real
    // per-step status is persisted server-side and shown in the deployment
    // history; this keeps the dialog honest about what is happening now.
    const ticker = setInterval(() => {
      setActiveStep((step) => (step < STEPS.length - 1 ? step + 1 : step));
    }, 1800);

    try {
      const response = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: name }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 402) {
        setUpgradeReason(payload.message ?? "Deployment requires Pro.");
        return;
      }
      if (!response.ok) {
        setFailure(payload.message ?? "The deployment failed. Please try again.");
        return;
      }

      setActiveStep(STEPS.length);
      setResult(payload.deployment);
      onDeployed?.(payload.deployment);
      toast({ variant: "success", title: "Your website is live" });
    } catch {
      setFailure("Network error. Your project is safe — try deploying again.");
    } finally {
      clearInterval(ticker);
      setDeploying(false);
    }
  };

  const nameProblem = check && !check.available && !isRedeploy;

  return (
    <>
      <Dialog
        open={open && !upgradeReason}
        onClose={deploying ? () => {} : onClose}
        dismissible={!deploying}
        title={result ? "Your website is live" : isRedeploy ? "Redeploy website" : "Deploy website"}
        description={
          result
            ? "The files are published on Cloudflare's global network."
            : "Publish this project as a static website on Cloudflare Pages."
        }
        size="md"
        footer={
          result ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <a href={result.url ?? "#"} target="_blank" rel="noopener noreferrer">
                <Button data-autofocus>
                  Visit website <ExternalLink />
                </Button>
              </a>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={deploying}>
                Cancel
              </Button>
              <Button
                onClick={deploy}
                loading={deploying}
                disabled={!name || Boolean(nameProblem) || checking}
                data-autofocus
              >
                {isRedeploy ? (
                  <>
                    <RefreshCw /> Redeploy
                  </>
                ) : (
                  <>
                    <Globe /> Deploy
                  </>
                )}
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#30d158]/25 bg-[#30d158]/[0.06] p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#30d158]">
                <Check className="size-4" /> Published
              </div>
              <a
                href={result.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block truncate font-mono text-[13.5px] text-white underline decoration-white/20 underline-offset-4 hover:decoration-white"
              >
                {result.url}
              </a>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-xl border border-white/[0.08] p-3">
                <dt className="text-white/35">Files</dt>
                <dd className="mt-0.5 text-white">{result.fileCount}</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] p-3">
                <dt className="text-white/35">Project</dt>
                <dd className="mt-0.5 truncate font-mono text-white">{result.projectName}</dd>
              </div>
            </dl>
            <p className="text-[12.5px] text-white/40">
              Edit the project and deploy again to update the live site in place.
            </p>
          </div>
        ) : deploying || activeStep >= 0 ? (
          <ol className="space-y-2.5">
            {STEPS.map((step, index) => {
              const state = index < activeStep ? "done" : index === activeStep ? "active" : "todo";
              return (
                <li key={step.id} className="flex items-center gap-3 text-[13.5px]">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      state === "done" && "border-[#30d158]/40 bg-[#30d158]/15 text-[#30d158]",
                      state === "active" && "border-white/25 text-white",
                      state === "todo" && "border-white/10 text-white/20",
                    )}
                  >
                    {state === "done" ? (
                      <Check className="size-3" />
                    ) : state === "active" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className={state === "todo" ? "text-white/30" : "text-white/80"}>
                    {step.label}
                  </span>
                </li>
              );
            })}
            {failure && (
              <li className="flex items-start gap-3 rounded-xl border border-[#ff453a]/25 bg-[#ff453a]/[0.06] p-3 text-[13px] text-[#ff6961]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {failure}
              </li>
            )}
          </ol>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="deploy-name">Project name</Label>
              <Input
                id="deploy-name"
                value={name}
                onChange={(event) => setName(event.target.value.toLowerCase())}
                placeholder="my-awesome-website"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
              <div className="mt-2 flex items-center gap-2 text-[12.5px]">
                {checking ? (
                  <span className="flex items-center gap-1.5 text-white/35">
                    <Loader2 className="size-3 animate-spin" /> Checking availability…
                  </span>
                ) : isRedeploy ? (
                  <Badge variant="brand">Updating your existing site</Badge>
                ) : check ? (
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      check.available ? "text-[#30d158]" : "text-[#ff6961]",
                    )}
                  >
                    {check.available ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    {check.message}
                  </span>
                ) : null}
              </div>
              <FieldHint>Lowercase letters, numbers and hyphens only.</FieldHint>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/25">Your address</p>
              <p className="mt-1.5 truncate font-mono text-[14px] text-white">
                https://{name || "your-name"}.pages.dev
              </p>
            </div>

            {failure && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#ff453a]/25 bg-[#ff453a]/[0.06] p-3 text-[13px] text-[#ff6961]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {failure}
              </div>
            )}
          </div>
        )}
      </Dialog>

      <UpgradeDialog
        open={Boolean(upgradeReason)}
        reason={upgradeReason ?? ""}
        onClose={() => {
          setUpgradeReason(null);
          onClose();
        }}
      />
    </>
  );
}
