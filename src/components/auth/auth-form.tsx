"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertTriangle, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { safeNextPath } from "@/lib/security/redirects";
import { VerifyStep, type DeliveryReason } from "./verify-step";

const ERROR_COPY: Record<string, string> = {
  CredentialsSignin: "That email and password combination did not work.",
  OAuthAccountNotLinked: "That email is already registered with a different sign-in method.",
  AccessDenied: "Access denied.",
  Configuration: "Sign-in is not configured correctly on this instance.",
};

export function AuthForm({
  mode,
  providers,
}: {
  mode: "login" | "register";
  providers: { github: boolean; google: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  // `?next=` comes from the URL, so it must be constrained to same-site paths
  // before it is used as a redirect target.
  const next = safeNextPath(params.get("next"));
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  // Only complain once they have left the field — flagging a mismatch on the
  // first keystroke of a password nobody has finished typing is just noise.
  const [confirmTouched, setConfirmTouched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(
    params.get("error") ? (ERROR_COPY[params.get("error")!] ?? "Sign-in failed. Please try again.") : null,
  );

  const isRegister = mode === "register";
  const hasOAuth = providers.github || providers.google;

  const confirmRef = React.useRef<HTMLInputElement>(null);
  const passwordsMatch = password === confirmPassword;
  const showMismatch = isRegister && confirmTouched && confirmPassword.length > 0 && !passwordsMatch;

  // Sign-up is two steps: create the account, then confirm the emailed code.
  // The password is kept in state across the step so a successful verification
  // can sign the user straight in rather than bouncing them to the login form.
  const [step, setStep] = React.useState<"form" | "verify">("form");
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [deliveryReason, setDeliveryReason] = React.useState<DeliveryReason | null>(null);

  const finishSignIn = React.useCallback(async () => {
    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      // Verified but the sign-in still failed — send them to log in manually.
      router.push(`/login?next=${encodeURIComponent(next)}&verified=1`);
      return;
    }

    toast({ variant: "success", title: "Account verified", description: "Welcome to Orion." });
    router.push(next);
    router.refresh();
  }, [email, password, next, router, toast]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Caught before the request so a typo costs nothing, and focus lands on the
    // field that needs fixing rather than leaving the user to hunt for it.
    if (isRegister && !passwordsMatch) {
      setConfirmTouched(true);
      setError("Both passwords must match.");
      confirmRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name || undefined, email, password }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(payload.message ?? "Could not create the account.");
          return;
        }

        // The account exists but cannot sign in until the code is entered.
        setDevCode(payload.devCode ?? null);
        setDeliveryReason(payload.sent === false ? (payload.reason ?? "provider_error") : null);
        setStep("verify");
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError(ERROR_COPY[result.error] ?? "That email and password combination did not work.");
        return;
      }

      toast({ variant: "success", title: "Welcome back" });
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isRegister && step === "verify") {
    return (
      <VerifyStep
        email={email}
        devCode={devCode}
        deliveryReason={deliveryReason}
        onVerified={finishSignIn}
        onBack={() => {
          setStep("form");
          setDevCode(null);
        }}
        busyLabel="Signing you in…"
      />
    );
  }

  return (
    <div className="card-surface rounded-[14px] p-7 sm:p-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.025em]">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-[14px] text-ink-muted">
        {isRegister ? "Five websites free, no card required." : "Sign in to keep building."}
      </p>

      {!isRegister && params.get("verified") === "1" && !error && (
        <div className="mt-5 rounded-xl border border-[#30d158]/25 bg-[#30d158]/[0.06] px-3.5 py-3 text-[13px] text-[#30d158]">
          Email confirmed. Sign in to continue.
        </div>
      )}

      {error && (
        <div
          className="mt-5 rounded-xl border border-[#ff453a]/25 bg-[#ff453a]/[0.06] px-3.5 py-3 text-[13px] text-[#ff6961]"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
          {!isRegister && (
            // Sign-in cannot say "your email is unverified" without confirming
            // that the address has an account, so the hint is offered to
            // everyone who fails to sign in.
            <Link
              href={`/verify${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="mt-2 block underline decoration-[#ff6961]/40 underline-offset-2 hover:decoration-[#ff6961]"
            >
              Never confirmed your email? Verify it here.
            </Link>
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        {isRegister && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <InputGroup
              id="name"
              icon={<User />}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              placeholder="Your name"
              maxLength={80}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <InputGroup
            id="email"
            icon={<Mail />}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="Enter your email"
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          {/* Label and recovery link share a row — the link floating on its own
              line below the field read as an orphan. */}
          <div className="flex items-baseline justify-between gap-4">
            <Label htmlFor="password" className="mb-0">
              Password
            </Label>
            {!isRegister && (
              <Link
                href="/forgot-password"
                className="text-[12.5px] text-ink-muted transition-colors hover:text-ink"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <InputGroup
            id="password"
            icon={<Lock />}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
          />
          {isRegister && (
            <p className="text-[12px] text-ink-dim">
              At least 8 characters, including a letter and a number.
            </p>
          )}
        </div>

        {isRegister && (
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <InputGroup
              ref={confirmRef}
              id="confirm-password"
              icon={<Lock />}
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmTouched(true)}
              autoComplete="new-password"
              placeholder="Type your password again"
              invalid={showMismatch}
              aria-invalid={showMismatch}
              aria-describedby={showMismatch ? "confirm-password-error" : undefined}
            />
            {showMismatch && (
              <p id="confirm-password-error" role="alert" className="text-[12px] text-danger">
                Both passwords must match.
              </p>
            )}
          </div>
        )}

        <Button type="submit" className="h-12 w-full text-[15px]" loading={loading}>
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      {hasOAuth && (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" />
            <span className="text-[11px] uppercase tracking-[0.1em] text-ink-dim">
              or continue with
            </span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <div className="space-y-3">
            {providers.google && (
              <Button
                variant="outline"
                className="h-12 w-full"
                loading={oauthLoading === "google"}
                onClick={() => {
                  setOauthLoading("google");
                  void signIn("google", { callbackUrl: next });
                }}
              >
                <GoogleIcon /> Continue with Google
              </Button>
            )}
            {providers.github && (
              <Button
                variant="outline"
                className="h-12 w-full"
                loading={oauthLoading === "github"}
                onClick={() => {
                  setOauthLoading("github");
                  void signIn("github", { callbackUrl: next });
                }}
              >
                <GitHubIcon /> Continue with GitHub
              </Button>
            )}
          </div>
        </>
      )}

      <p className="mt-7 border-t border-hairline pt-6 text-center text-[13.5px] text-ink-muted">
        {isRegister ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={isRegister ? `/login?next=${encodeURIComponent(next)}` : `/register?next=${encodeURIComponent(next)}`}
          className="font-medium text-ink underline decoration-white/25 underline-offset-2 hover:decoration-white"
        >
          {isRegister ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="size-4">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
