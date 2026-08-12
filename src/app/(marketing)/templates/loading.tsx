import { TemplateCardSkeleton } from "@/components/templates/template-card";

export default function TemplatesLoading() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mb-10 space-y-4">
        <div className="h-10 w-[320px] animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-[480px] max-w-full animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="mb-8 flex gap-2">
        <div className="h-11 flex-1 animate-pulse rounded-[10px] bg-white/[0.04]" />
        <div className="h-11 w-[170px] animate-pulse rounded-[10px] bg-white/[0.04]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <TemplateCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
