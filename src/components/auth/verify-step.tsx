"use client";

import * as React from "react";
import { AlertTriangle, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "./otp-input";

/**
 * The code step. Shared by the inline signup flow and the standalone /verify
 * page, so both behave identically.
 */
export type DeliveryReason = "not_configured" | "provider_error" | "network_error";

const DELIVERY_COPY: Record<DeliveryReason, string> = {
  not_configured: "Email delivery is not configured on this instance.",
  provider_error:
    "The email provider refused the message. On Resend's shared test sender you can only receive codes at the address your Resend account was created with — verify a domain to reach anyone else.",
  network_error: "The email provider could not be reached.",
};

export function VerifyStep({
  email,
  devCode,
  deliveryReason,
  onVerified,
  onBack,
  busyLabel = "Verifying…",
}: {
  email: string;
  devCode?: string | null;
  deliveryReason?: DeliveryReason | null;
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
  const [localReason, setLocalReason] = React.useState<DeliveryReason | null>(
    deliveryReason ?? null,
  );
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
      setLocalReason(payload.sent === false ? (payload.reason ?? "provider_error") : null);
      if (payload.sent !== false) setNotice("A new code is on its way.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-surface rounded-[14px] p-7 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/[0.06]">
        <MailCheck className="size-5 text-ink" />
      </span>

      <h1 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">Check your email</h1>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-muted">
        We sent a six-digit code to
        <br />
        <span className="font-medium text-white">{email}</span>
      </p>

      {(localDevCode || localReason) && (
        <div className="mt-5 rounded-xl border border-[#ffd60a]/25 bg-[#ffd60a]/[0.07] p-3.5 text-left text-[12.5px] leading-relaxed text-[#ffd60a]">
          <p className="font-medium">The email was not delivered</p>
          <p className="mt-1 text-[#ffd60a]/80">
            {DELIVERY_COPY[localReason ?? "not_configured"]}
          </p>
          {localDevCode && (
            <>
              <p className="mt-2.5 text-[#ffd60a]/80">Use this code to continue:</p>
              <span className="mt-1 block font-mono text-[20px] tracking-[0.3em] text-white">
                {localDevCode}
              </span>
            </>
          )}
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
          className="text-ink-muted transition-colors hover:text-white disabled:opacity-40"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
        {onBack && (
          <>
            <span className="text-ink-faint">·</span>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-ink-muted transition-colors hover:text-white"
            >
              <ArrowLeft className="size-3" /> Use a different email
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-ink-dim">
        The code expires in 10 minutes. Check your spam folder if it has not arrived.
      </p>
    </div>
  );
}
