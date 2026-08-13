"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  History,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  Rocket,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { DeviceSwitcher, DEVICE_WIDTHS, type Device } from "@/components/templates/live-preview";
import { EditorSidebar, type SchemaPage } from "./editor-sidebar";
import { Inspector } from "./inspector";
import { PublishDialog } from "./publish-dialog";
import { useEditorState } from "./use-editor-state";
import { cn, relativeTime } from "@/lib/utils";
import type {
  EditableElement,
  EditableValue,
  ProjectContent,
  ProjectMeta,
  ProjectTheme,
} from "@/lib/templates/types";

export type EditorProject = {
  id: string;
  name: string;
  content: ProjectContent;
  theme: ProjectTheme;
  meta: ProjectMeta;
  revision: number;
  templateName: string;
  templateSlug: string;
  entryFile: string;
};

type BridgeMessage =
  | { source: "orion-preview"; type: "ready"; data: { count: number } }
  | { source: "orion-preview"; type: "select"; data: SelectPayload }
  | { source: "orion-preview"; type: "deselect"; data: null };

type SelectPayload = {
  key: string;
  tag: string;
  text: string;
  src: string;
  alt: string;
  href: string;
};

export function EditorShell({
  project,
  pages,
  plan,
  downloadsLeft,
}: {
  project: EditorProject;
  pages: SchemaPage[];
  plan: "FREE" | "PRO";
  downloadsLeft: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  const [activeFile, setActiveFile] = React.useState(project.entryFile);
  const [device, setDevice] = React.useState<Device>("desktop");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [frameLoading, setFrameLoading] = React.useState(true);
  const [projectName, setProjectName] = React.useState(project.name);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const [frameNonce, setFrameNonce] = React.useState(0);

  const state = useEditorState({
    projectId: project.id,
    initial: { content: project.content, theme: project.theme, meta: project.meta },
    initialRevision: project.revision,
    onError: (message) => toast({ variant: "error", title: "Save failed", description: message }),
  });

  const currentPage = pages.find((page) => page.file === activeFile) ?? pages[0];
  const elements = currentPage?.elements ?? [];
  const selected = elements.find((element) => element.key === selectedKey) ?? null;
  const fileValues = React.useMemo(
    () => state.snapshot.content[activeFile] ?? {},
    [state.snapshot.content, activeFile],
  );
  const selectedValue: EditableValue = selectedKey ? (fileValues[selectedKey] ?? {}) : {};
  const editedKeys = React.useMemo(() => new Set(Object.keys(fileValues)), [fileValues]);

  const post = React.useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ source: "orion-editor", ...message }, "*");
  }, []);

  /* ------------------------------------------------------- bridge inbound */
  React.useEffect(() => {
    const onMessage = (event: MessageEvent<BridgeMessage>) => {
      const message = event.data;
      if (!message || message.source !== "orion-preview") return;

      if (message.type === "ready") setFrameLoading(false);
      if (message.type === "deselect") setSelectedKey(null);
      if (message.type === "select") setSelectedKey(message.data.key);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* ------------------------------------------------------ bridge outbound */
  const applyValue = React.useCallback(
    (patch: EditableValue, options?: { merge?: boolean }) => {
      if (!selectedKey) return;
      state.setValue(activeFile, selectedKey, patch, options);
      post({ type: "patch", key: selectedKey, value: patch });
    },
    [activeFile, post, selectedKey, state],
  );

  const resetSelected = React.useCallback(() => {
    if (!selectedKey) return;
    state.resetValue(activeFile, selectedKey);
    setFrameNonce((value) => value + 1); // full reload restores the original node
  }, [activeFile, selectedKey, state]);

  // Push theme changes into the frame without a reload.
  const themeSignature = JSON.stringify(state.snapshot.theme);
  React.useEffect(() => {
    if (frameLoading) return;
    post({ type: "theme", css: buildThemeCss(state.snapshot.theme) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSignature, frameLoading, post]);

  const selectElement = (element: EditableElement) => {
    setSelectedKey(element.key);
    post({ type: "scrollTo", key: element.key });
  };

  /* ---------------------------------------------------------- name saving */
  React.useEffect(() => {
    if (projectName === project.name) return;
    const timer = setTimeout(() => {
      fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [projectName, project.id, project.name]);

  /** Replaces editor state with whatever the server currently holds. */
  const resync = React.useCallback(async () => {
    const response = await fetch(`/api/projects/${project.id}`);
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    const fresh = payload?.project;
    if (!fresh) return;

    state.replaceAll(
      {
        content: (fresh.content ?? {}) as ProjectContent,
        theme: (fresh.theme ?? {}) as ProjectTheme,
        meta: (fresh.meta ?? {}) as ProjectMeta,
      },
      fresh.revision,
    );
    setFrameNonce((value) => value + 1);
  }, [project.id, state]);

  /* ---------------------------------------------------------- downloading */
  const download = async () => {
    setDownloading(true);
    try {
      await state.saveNow();
      const response = await fetch(`/api/projects/${project.id}/export`);

      if (response.status === 402) {
        const payload = await response.json().catch(() => ({}));
        setUpgradeReason(payload.message ?? "You have used your free download.");
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast({
          variant: "error",
          title: "Download failed",
          description: payload.message ?? "Please try again.",
        });
        return;
      }

      // The server hands uploaded images back once they are inside the archive.
      const releasedCount = Number(response.headers.get("X-Orion-Images-Released") ?? "0");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast({
        variant: "success",
        title: "Download ready",
        description:
          releasedCount > 0
            ? `Your files are in your downloads folder. ${releasedCount} uploaded ${
                releasedCount === 1 ? "image is" : "images are"
              } bundled inside the ZIP and have been cleared from storage.`
            : "Your website files are in your downloads folder.",
      });

      // Those images are gone server-side, so the in-memory content map now
      // points at URLs that no longer resolve. Pull the trimmed version back
      // rather than letting the next autosave write the dead ones out again.
      if (releasedCount > 0) await resync();

      // The ZIP is only half the job — show them how to put it online.
      setPublishOpen(true);
      router.refresh();
    } catch {
      toast({ variant: "error", title: "Download failed", description: "Check your connection." });
    } finally {
      setDownloading(false);
    }
  };

  const frameSrc = `/api/render/${project.id}/${activeFile}?editor=1&r=${frameNonce}`;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black">
      {/* ─────────────────────────────────────────────────────────── top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-3">
        <Link href="/dashboard" title="Back to dashboard">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft />
            <span className="sr-only">Back to dashboard</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen((value) => !value)}
          title={sidebarOpen ? "Hide panel" : "Show panel"}
        >
          {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          <span className="sr-only">Toggle panel</span>
        </Button>

        <div className="min-w-0 flex-1">
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            aria-label="Project name"
            className="w-full max-w-[280px] truncate rounded-lg bg-transparent px-2 py-1 text-[14px] font-medium text-white outline-none transition-colors hover:bg-white/[0.05] focus:bg-white/[0.06]"
          />
        </div>

        <SaveIndicator state={state.saveState} lastSavedAt={state.lastSavedAt} />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={state.undo} disabled={!state.canUndo} title="Undo (Ctrl+Z)">
            <Undo2 />
            <span className="sr-only">Undo</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={state.redo} disabled={!state.canRedo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 />
            <span className="sr-only">Redo</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setHistoryOpen(true)} title="Version history">
            <History />
            <span className="sr-only">Version history</span>
          </Button>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

        <DeviceSwitcher value={device} onChange={setDevice} className="hidden sm:flex" />

        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

        <a href={`/api/render/${project.id}/${activeFile}`} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            <ExternalLink /> Preview
          </Button>
        </a>

        <Button variant="secondary" size="sm" onClick={() => setPublishOpen(true)}>
          <Rocket />
          <span className="hidden sm:inline">Publish</span>
        </Button>

        <Button size="sm" onClick={download} loading={downloading}>
          <Download />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </header>

      {plan === "FREE" && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-b border-hairline bg-white/[0.02] px-4 py-1.5 text-[12.5px] text-ink-muted">
          <Badge variant="outline">Free plan</Badge>
          {downloadsLeft > 0
            ? `${downloadsLeft} download remaining · hosting your site is free either way`
            : "Download used · upgrade for 50 downloads a week"}
          <button
            onClick={() => setUpgradeReason("Upgrade to Pro for 50 website projects and 50 downloads a week.")}
            className="font-medium text-white underline decoration-white/25 underline-offset-2 hover:decoration-white"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── layout */}
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <aside className="hidden w-[264px] shrink-0 border-r border-hairline lg:block">
            <EditorSidebar
              pages={pages}
              activeFile={activeFile}
              onSelectFile={(file) => {
                setActiveFile(file);
                setSelectedKey(null);
                setFrameLoading(true);
              }}
              elements={elements}
              selectedKey={selectedKey}
              onSelectElement={selectElement}
              editedKeys={editedKeys}
              theme={state.snapshot.theme}
              onThemeChange={state.setTheme}
              meta={state.snapshot.meta}
              onMetaChange={state.setMeta}
              projectName={projectName}
              onProjectNameChange={setProjectName}
            />
          </aside>
        )}

        <main className="relative flex min-w-0 flex-1 items-start justify-center overflow-auto bg-[#050505] p-4 sm:p-6">
          <div
            className="relative w-full overflow-hidden rounded-xl border border-hairline bg-white shadow-[0_30px_100px_-40px_rgba(0,0,0,1)] transition-[max-width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ maxWidth: device === "desktop" ? "100%" : `${DEVICE_WIDTHS[device]}px`, height: "100%" }}
          >
            {frameLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080808]">
                <Loader2 className="size-5 animate-spin text-ink-muted" />
              </div>
            )}
            <iframe
              ref={frameRef}
              key={frameSrc}
              src={frameSrc}
              title="Website preview"
              sandbox="allow-scripts allow-popups allow-forms allow-modals"
              referrerPolicy="no-referrer"
              onLoad={() => setFrameLoading(false)}
              className="size-full border-0"
            />
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 border-l border-hairline bg-[#070707] xl:block">
          <Inspector
            projectId={project.id}
            element={selected}
            value={selectedValue}
            onChange={applyValue}
            onReset={resetSelected}
          />
        </aside>
      </div>

      {/* mobile inspector */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[62vh] overflow-y-auto border-t border-hairline bg-[#070707] xl:hidden">
          <Inspector
            projectId={project.id}
            element={selected}
            value={selectedValue}
            onChange={applyValue}
            onReset={resetSelected}
          />
        </div>
      )}

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        projectName={projectName}
      />

      <VersionHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        projectId={project.id}
        onRestored={(restored) => {
          state.replaceAll(
            {
              content: restored.content as ProjectContent,
              theme: restored.theme as ProjectTheme,
              meta: restored.meta as ProjectMeta,
            },
            restored.revision,
          );
          setFrameNonce((value) => value + 1);
          toast({ variant: "success", title: "Version restored" });
        }}
      />

      <UpgradeDialog
        open={Boolean(upgradeReason)}
        reason={upgradeReason ?? ""}
        onClose={() => setUpgradeReason(null)}
      />
    </div>
  );
}

function SaveIndicator({
  state,
  lastSavedAt,
}: {
  state: ReturnType<typeof useEditorState>["saveState"];
  lastSavedAt: Date | null;
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "dirty"
        ? "Unsaved changes"
        : state === "error"
          ? "Save failed"
          : lastSavedAt
            ? `Saved ${relativeTime(lastSavedAt)}`
            : "All changes saved";

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] sm:flex",
        state === "error" ? "text-[#ff6961]" : "text-ink-muted",
      )}
      role="status"
      aria-live="polite"
    >
      {state === "saving" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : state === "error" ? (
        <span className="size-1.5 rounded-full bg-[#ff453a]" />
      ) : (
        <Check className="size-3" />
      )}
      {label}
    </span>
  );
}

type Version = { id: string; label: string | null; revision: number; createdAt: string };

function VersionHistoryDialog({
  open,
  onClose,
  projectId,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onRestored: (project: { content: unknown; theme: unknown; meta: unknown; revision: number }) => void;
}) {
  const { toast } = useToast();
  const [versions, setVersions] = React.useState<Version[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`);
      const payload = await response.json().catch(() => ({}));
      setVersions(payload.versions ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const snapshot = async () => {
    setBusyId("new");
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "snapshot", label: `Saved ${new Date().toLocaleString()}` }),
      });
      if (response.ok) {
        toast({ variant: "success", title: "Version saved" });
        await load();
      }
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (versionId: string) => {
    setBusyId(versionId);
    try {
      const response = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ variant: "error", title: "Restore failed", description: payload.message });
        return;
      }
      onRestored(payload.project);
      onClose();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Version history"
      description="Snapshots are taken automatically as you work. Restoring is itself reversible — the current state is saved first."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" onClick={snapshot} loading={busyId === "new"}>
            Save a version now
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-ink-dim" />
        </div>
      ) : versions.length === 0 ? (
        <p className="py-6 text-center text-[13.5px] text-ink-muted">
          No versions yet. One is saved automatically as you keep editing.
        </p>
      ) : (
        <ul className="max-h-[320px] space-y-1.5 overflow-y-auto">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] text-ink">{version.label ?? `Revision ${version.revision}`}</p>
                <p className="text-[11.5px] text-ink-dim">{relativeTime(version.createdAt)}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => restore(version.id)}
                loading={busyId === version.id}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/**
 * Client-side twin of the server's theme compiler, used only for instant
 * preview feedback. The server remains the authority for exported output.
 */
function buildThemeCss(theme: ProjectTheme): string {
  const declarations = Object.entries(theme.vars ?? {})
    .filter(([name, value]) => /^--[a-z0-9-]+$/i.test(name) && value)
    .map(([name, value]) => `${name}:${value}`);

  const blocks: string[] = [];
  if (declarations.length) blocks.push(`:root{${declarations.join(";")}}`);
  if (theme.fontFamily) blocks.push(`body{font-family:${theme.fontFamily} !important}`);
  if (theme.headingFont) blocks.push(`h1,h2,h3,h4,h5,h6{font-family:${theme.headingFont} !important}`);
  if (theme.customCss) blocks.push(theme.customCss.replace(/<\/?\s*(style|script)/gi, ""));
  return blocks.join("\n");
}
