"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  slug,
  initial = false,
  className,
}: {
  slug: string;
  initial?: boolean;
  className?: string;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = React.useState(initial);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch(`/api/templates/${encodeURIComponent(slug)}/favorite`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) setFavorited(Boolean(payload.favorited));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, status]);

  const toggle = async () => {
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(`/templates/${slug}`)}`);
      return;
    }
    setPending(true);
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(slug)}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (!response.ok) setFavorited(!next);
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favourites" : "Add to favourites"}
      title={favorited ? "Remove from favourites" : "Save to favourites"}
      className={className}
    >
      <Heart className={cn("size-4", favorited && "fill-[#ff453a] text-[#ff453a]")} />
    </Button>
  );
}
