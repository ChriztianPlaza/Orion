import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guards";
import { AuthForm } from "@/components/auth/auth-form";
import { oauthProviders } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Orion account.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <Suspense>
      <AuthForm mode="login" providers={oauthProviders} />
    </Suspense>
  );
}
