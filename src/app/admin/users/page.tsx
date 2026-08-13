import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDate, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const perPage = 50;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        downloadCount: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { projects: true, favorites: true } },
      },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="container-page py-10">
      <header className="mb-6">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.025em]">Users</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">{total} registered</p>
      </header>

      <div className="card-surface overflow-x-auto rounded-[12px]">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">User</th>
              <th scope="col" className="px-4 py-3 font-medium">Plan</th>
              <th scope="col" className="px-4 py-3 font-medium">Role</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Projects</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Downloads</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Favourites</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/[0.05] last:border-0">
                <td className="px-4 py-3">
                  <p className="truncate text-white">{user.name || user.email.split("@")[0]}</p>
                  <p className="truncate text-[11.5px] text-ink-dim">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.plan === "PRO" ? "brand" : "outline"}>{user.plan}</Badge>
                </td>
                <td className="px-4 py-3">
                  {user.role === "ADMIN" ? (
                    <Badge variant="violet">Admin</Badge>
                  ) : (
                    <span className="text-ink-muted">User</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-ink-muted">{user._count.projects}</td>
                <td className="px-4 py-3 text-right text-ink-muted">{user.downloadCount}</td>
                <td className="px-4 py-3 text-right text-ink-muted">{user._count.favorites}</td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {user.lastSeenAt ? relativeTime(user.lastSeenAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="py-14 text-center text-[13.5px] text-ink-dim">No users yet.</p>
        )}
      </div>
    </div>
  );
}
