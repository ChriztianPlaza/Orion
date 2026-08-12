"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  CloudUpload,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { DeployDialog } from "@/components/editor/deploy-dialog";
import { relativeTime } from "@/lib/utils";

export type DashboardProject = {
  id: string;
  name: string;
  subdomain: string | null;
  status: string;
  updatedAt: string;
  templateName: string | null;
  templateSlug: string | null;
  liveUrl: string | null;
  deploymentCount: number;
};

export function ProjectCard({ project, canDeploy }: { project: DashboardProject; canDeploy: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);
  const [deployOpen, setDeployOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        toast({ variant: "error", title: "Could not delete", description: payload.message });
        return;
      }
      toast({ variant: "success", title: "Website deleted" });
      setConfirmDelete(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 402) {
        setUpgradeReason(payload.message ?? "You have reached your project limit.");
        return;
      }
      if (!response.ok) {
        toast({ variant: "error", title: "Could not duplicate", description: payload.message });
        return;
      }
      toast({ variant: "success", title: "Duplicated", description: payload.project.name });
      router.refresh();
    } finally {
      setDuplicating(false);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <article className="card-surface group relative flex flex-col overflow-hidden rounded-[18px] transition-all duration-500 [contain-intrinsic-size:auto_420px] [content-visibility:auto] hover:border-white/20">
        <Link
          href={`/editor/${project.id}`}
          className="relative block aspect-[16/10] overflow-hidden bg-[#080808]"
        >
          <iframe
            // Thumbnail mode: no scripts, no webfonts, card-sized imagery.
            src={`/api/render/${project.id}?thumb=1`}
            title={`${project.name} preview`}
            sandbox=""
            loading="lazy"
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white"
            style={{ width: "1280px", height: "900px", transform: "scale(0.36)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </Link>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[14.5px] font-medium text-white">{project.name}</h3>
              <p className="mt-0.5 truncate text-[12.5px] text-white/35">
                {project.templateName ?? "Template removed"} · edited {relativeTime(project.updatedAt)}
              </p>
            </div>

            <div className="relative shrink-0" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="Project actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal />
              </Button>
              {menuOpen && (
                <div
                  role="menu"
                  className="glass absolute right-0 top-[calc(100%+6px)] z-20 w-48 rounded-xl p-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,1)]"
                >
                  <Link
                    role="menuitem"
                    href={`/editor/${project.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                  <a
                    role="menuitem"
                    href={`/api/render/${project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Eye className="size-3.5" /> Preview
                  </a>
                  <button
                    role="menuitem"
                    onClick={duplicate}
                    disabled={duplicating}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Copy className="size-3.5" /> {duplicating ? "Duplicating…" : "Duplicate"}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-[#ff6961] hover:bg-[#ff453a]/10"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 truncate text-[12.5px] text-[#2997ff] hover:underline"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-[#30d158]" />
              {project.liveUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="size-3 shrink-0" />
            </a>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Link href={`/editor/${project.id}`} className="flex-1">
              <Button size="sm" variant="secondary" className="w-full">
                <Pencil /> Edit
              </Button>
            </Link>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                if (!canDeploy) {
                  setUpgradeReason("Deploying to the web is a Pro feature.");
                  return;
                }
                setDeployOpen(true);
              }}
            >
              <CloudUpload /> {project.liveUrl ? "Redeploy" : "Deploy"}
            </Button>
          </div>

          {project.status === "PUBLISHED" && (
            <Badge variant="success" className="absolute right-3 top-3">
              Live
            </Badge>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this website?"
        description={
          <>
            <strong className="text-white">{project.name}</strong> and all of its edits will be
            permanently removed. This cannot be undone.
            {project.liveUrl && " The deployed site stays online until you delete it separately."}
          </>
        }
      />

      <DeployDialog
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        projectId={project.id}
        projectName={project.name}
        currentSubdomain={project.subdomain}
        canDeploy={canDeploy}
        onDeployed={() => router.refresh()}
      />

      <UpgradeDialog
        open={Boolean(upgradeReason)}
        reason={upgradeReason ?? ""}
        onClose={() => setUpgradeReason(null)}
      />
    </>
  );
}
