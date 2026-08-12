"use client";

import * as React from "react";
import { AlertTriangle, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "./otp-input";

/**
 * The code step. Shared by the inline signup flow and the standalone /verify
 * page, so both behave identically.
 */
export function VerifyStep({
  email,
  devCode,
  onVerified,
  onBack,
  busyLabel = "Verifying…",
}: {
  email: string;
  devCode?: string | null;
  onVerified: () => void | Promise<void>;
  onBack?: () => void;
  busyLabel?: string;
}) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [localDevCode, setLocalDevCode] = React.useState<string | null>(devCode ?? null);
  const submitted = React.useRef("");

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = React.useCallback(
    async (value: string) => {
      if (value.length !== 6 || loading) return;
      // Guard against the auto-submit firing twice for the same code.
      if (submitted.current === value) return;
      submitted.current = value;

      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: value }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(payload.message ?? "That code is not right.");
          setCode("");
          submitted.current = "";
          return;
        }

        await onVerified();
      } catch {
        setError("Network error. Please try again.");
        submitted.current = "";
      } finally {
        setLoading(false);
      }
    },
    [email, loading, onVerified],
  );

  const resend = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 429 && payload.cooldownSeconds) {
        setCooldown(payload.cooldownSeconds);
        setError(payload.message);
        return;
      }
      if (!response.ok) {
        setError(payload.message ?? "Could not send a new code.");
        return;
      }

      setCode("");
      submitted.current = "";
      setCooldown(60);
      setLocalDevCode(payload.devCode ?? null);
      setNotice("A new code is on its way.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-surface rounded-[22px] p-7 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/[0.06]">
        <MailCheck className="size-5 text-white/70" />
      </span>

      <h1 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">Check your email</h1>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/50">
        We sent a six-digit code to
        <br />
        <span className="font-medium text-white">{email}</span>
      </p>

      {localDevCode && (
        <div className="mt-5 rounded-xl border border-[#ffd60a]/25 bg-[#ffd60a]/[0.07] p-3 text-[12.5px] text-[#ffd60a]">
          Email delivery is not configured, so here is the code for local testing:
          <span className="mt-1.5 block font-mono text-[18px] tracking-[0.3em] text-white">
            {localDevCode}
          </span>
        </div>
      )}

      <div className="mt-7">
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            if (error) setError(null);
          }}
          onComplete={submit}
          disabled={loading}
          invalid={Boolean(error)}
        />
      </div>

      {error && (
        <p
          className="mt-4 flex items-center justify-center gap-2 text-[13px] text-[#ff6961]"
          role="alert"
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
      {notice && <p className="mt-4 text-[13px] text-[#30d158]">{notice}</p>}

      <Button
        size="lg"
        className="mt-6 w-full"
        loading={loading}
        disabled={code.length !== 6}
        onClick={() => submit(code)}
      >
        {loading ? busyLabel : "Verify and continue"}
      </Button>

      <div className="mt-5 flex items-center justify-center gap-4 text-[13px]">
        <button
          onClick={resend}
          disabled={loading || cooldown > 0}
          className="text-white/45 transition-colors hover:text-white disabled:opacity-40"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
        {onBack && (
          <>
            <span className="text-white/15">·</span>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/45 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-3" /> Use a different email
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-white/25">
        The code expires in 10 minutes. Check your spam folder if it has not arrived.
      </p>
    </div>
  );
}
