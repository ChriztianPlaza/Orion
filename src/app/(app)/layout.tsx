import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guards";
import { AppHeader } from "@/components/app/app-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fdashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
