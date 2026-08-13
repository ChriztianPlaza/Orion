"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const token = params.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "That link is no longer valid.");
        return;
      }

      toast({ variant: "success", title: "Password updated", description: "You can log in now." });
      router.push("/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card-surface rounded-[14px] p-7 text-center">
        <h1 className="text-[19px] font-semibold tracking-[-0.02em]">This link is incomplete</h1>
        <p className="mt-3 text-[13.5px] text-ink-muted">
          Open the link from your email again, or request a new one.
        </p>
        <Link href="/forgot-password" className="mt-6 block">
          <Button variant="secondary" className="w-full">
            Request a new link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card-surface rounded-[14px] p-7">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        At least 8 characters, including a letter and a number.
      </p>

      {error && (
        <p className="mt-5 rounded-xl border border-[#ff453a]/25 bg-[#ff453a]/[0.06] px-3.5 py-3 text-[13px] text-[#ff6961]" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={<div className="card-surface h-[320px] animate-pulse rounded-[14px]" />}
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}
