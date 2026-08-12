import { formatCurrency } from "@/lib/utils";

/**
 * Small server-rendered charts. Plain SVG rather than a charting library —
 * there is no interaction to justify shipping one, and these render instantly
 * with no client JavaScript at all.
 */

export function BarChart({
  data,
  valueFormat = "currency",
  height = 180,
  accent = "#2997ff",
}: {
  data: { label: string; value: number }[];
  valueFormat?: "currency" | "number";
  height?: number;
  accent?: string;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));
  const format = (value: number) =>
    valueFormat === "currency" ? formatCurrency(value) : value.toLocaleString();

  return (
    <figure className="w-full">
      <div
        className="flex items-end gap-1.5 sm:gap-2"
        style={{ height }}
        role="img"
        aria-label={`Chart: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`}
      >
        {data.map((point) => {
          const ratio = point.value / max;
          return (
            <div key={point.label} className="group flex flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10.5px] text-white/0 transition-colors group-hover:text-white/70">
                {format(point.value)}
              </span>
              <div
                className="w-full rounded-t-[4px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  height: `${Math.max(2, ratio * 100)}%`,
                  background:
                    point.value > 0
                      ? `linear-gradient(180deg, ${accent}, ${accent}44)`
                      : "rgba(255,255,255,0.06)",
                }}
                title={`${point.label}: ${format(point.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((point) => (
          <span key={point.label} className="flex-1 text-center text-[10.5px] text-white/25">
            {point.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function Sparkline({
  data,
  height = 44,
  accent = "#30d158",
}: {
  data: number[];
  height?: number;
  accent?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const step = 100 / (data.length - 1);
  const points = data
    .map((value, index) => `${index * step},${100 - (value / max) * 100}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ height }}
      className="w-full"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
