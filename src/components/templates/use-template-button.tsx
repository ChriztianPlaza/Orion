"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";

/**
 * Creates a project from a template. Quotas are enforced server-side; a 402
 * response opens the upgrade dialog rather than a dead end.
 */
export function UseTemplateButton({
  slug,
  autoStart = false,
  children = "Use this template",
  ...buttonProps
}: {
  slug: string;
  autoStart?: boolean;
  children?: React.ReactNode;
} & Omit<ButtonProps, "onClick" | "children">) {
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState<string | null>(null);
  const started = React.useRef(false);

  const create = React.useCallback(async () => {
    if (status === "unauthenticated") {
      router.push(`/login?next=${encodeURIComponent(`/templates/${slug}?use=1`)}`);
      return;
    }
    if (status !== "authenticated") return;

    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: slug }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 402) {
        setUpgradeReason(payload.message ?? "You have reached your plan limit.");
        return;
      }
      if (!response.ok) {
        toast({
          variant: "error",
          title: "Could not create the project",
          description: payload.message ?? "Please try again in a moment.",
        });
        return;
      }

      router.push(`/editor/${payload.project.id}`);
    } catch {
      toast({
        variant: "error",
        title: "Network error",
        description: "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [router, slug, status, toast]);

  React.useEffect(() => {
    if (!autoStart || started.current || status === "loading") return;
    started.current = true;
    void create();
  }, [autoStart, create, status]);

  return (
    <>
      <Button {...buttonProps} loading={loading} onClick={() => void create()}>
        {children}
        {!loading && <ArrowRight />}
      </Button>
      <UpgradeDialog
        open={Boolean(upgradeReason)}
        reason={upgradeReason ?? ""}
        onClose={() => setUpgradeReason(null)}
      />
    </>
  );
}
