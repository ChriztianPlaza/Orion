import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatDate, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Admin audit log. Every privileged mutation is recorded with who, what, when
 * and from where.
 */
export default async function AdminActivityPage() {
  const entries = await prisma.adminActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      target: true,
      targetId: true,
      metadata: true,
      ip: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="container-page py-10">
      <header className="mb-6">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.025em]">
          Admin activity
        </h1>
        <p className="mt-1.5 text-[13.5px] text-white/40">
          The last 200 privileged actions taken on this instance.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="card-surface rounded-[18px] py-16 text-center text-[13.5px] text-white/30">
          No admin actions recorded yet.
        </div>
      ) : (
        <ol className="card-surface divide-y divide-white/[0.06] rounded-[18px]">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.action.includes("delete") ? "danger" : "outline"}>
                    {entry.action}
                  </Badge>
                  {entry.target && (
                    <span className="truncate font-mono text-[12.5px] text-white/60">
                      {entry.target}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-[12px] text-white/30">
                  {entry.user?.email ?? "unknown"}
                  {entry.ip ? ` · ${entry.ip}` : ""}
                  {formatMetadata(entry.metadata) ? ` · ${formatMetadata(entry.metadata)}` : ""}
                </p>
              </div>
              <time
                dateTime={entry.createdAt.toISOString()}
                title={formatDate(entry.createdAt, { hour: "numeric", minute: "2-digit" })}
                className="shrink-0 text-[12px] text-white/25"
              >
                {relativeTime(entry.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function formatMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  const entries = Object.entries(metadata as Record<string, unknown>).slice(0, 3);
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(", ");
}
