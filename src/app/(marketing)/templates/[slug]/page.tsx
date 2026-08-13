import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCode2, Scale, Layers, MonitorSmartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreviewFrame } from "@/components/templates/live-preview";
import { TemplateCardItem } from "@/components/templates/template-card";
import { UseTemplateButton } from "@/components/templates/use-template-button";
import { TrackTemplateView } from "@/components/templates/track-view";
import { FavoriteButton } from "@/components/templates/favorite-button";
import { getTemplateBySlug, listSimilarTemplates } from "@/lib/templates/queries";
import { formatBytes } from "@/lib/utils";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);
  if (!template) return { title: "Template not found" };

  return {
    title: template.name,
    description: template.description,
    alternates: { canonical: `/templates/${template.slug}` },
    openGraph: {
      title: `${template.name} — Orion template`,
      description: template.description,
      type: "article",
    },
  };
}

export default async function TemplateDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;
  const template = await getTemplateBySlug(slug);
  if (!template) notFound();

  const similar = await listSimilarTemplates(template.categorySlug, template.slug, 3);
  const autoStart = search.use === "1";

  return (
    <div className="container-page py-10 sm:py-14">
      <TrackTemplateView slug={template.slug} />

      <Link
        href={template.categorySlug ? `/templates?category=${template.categorySlug}` : "/templates"}
        className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-white"
      >
        <ArrowLeft className="size-3.5" />
        {template.categoryName ? `Back to ${template.categoryName}` : "Back to templates"}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-12">
        {/*
          min-w-0 is load-bearing. The preview iframe is laid out at 1440px and
          only visually shrunk by a transform, so without it this grid column
          cannot shrink below that width — the track blows out and pushes the
          sidebar past the right edge of the screen.
        */}
        <div className="order-2 min-w-0 lg:order-1">
          <PreviewFrame
            src={`/api/preview/${template.slug}`}
            title={`${template.name} live preview`}
            label={`${template.slug}.orion.app`}
            className="h-[560px] sm:h-[680px]"
          />

          {template.pages.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-ink-muted">Pages in this template:</span>
              {template.pages.map((page) => (
                <a
                  key={page}
                  href={`/api/preview/${template.slug}/${page}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-hairline px-3 py-1 text-[12.5px] text-ink-muted transition-colors hover:border-hairline-strong hover:text-white"
                >
                  {page}
                </a>
              ))}
            </div>
          )}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center gap-2">
              {template.categoryName && <Badge>{template.categoryName}</Badge>}
              {template.tier === "PRO" ? <Badge variant="brand">Pro</Badge> : <Badge variant="success">Free</Badge>}
              {template.featured && <Badge variant="violet">Featured</Badge>}
            </div>

            <h1 className="text-balance-tight mt-4 text-[clamp(1.7rem,3vw,2.3rem)] font-semibold">
              {template.name}
            </h1>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{template.description}</p>

            <div className="mt-7 flex flex-col gap-2.5">
              <UseTemplateButton slug={template.slug} size="lg" autoStart={autoStart} />
              <div className="flex gap-2.5">
                <a
                  href={`/api/preview/${template.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="secondary" className="w-full">
                    Open full preview
                  </Button>
                </a>
                <FavoriteButton slug={template.slug} />
              </div>
            </div>

            <dl className="mt-8 space-y-0 divide-y divide-hairline border-y border-hairline text-[13.5px]">
              <Row icon={<Layers className="size-3.5" />} label="Pages">
                {template.pages.length}
              </Row>
              <Row icon={<FileCode2 className="size-3.5" />} label="Files">
                {template.fileCount} · {formatBytes(template.totalBytes)}
              </Row>
              <Row icon={<MonitorSmartphone className="size-3.5" />} label="Responsive">
                {template.responsive ? "Desktop, tablet and mobile" : "Desktop only"}
              </Row>
              <Row icon={<Scale className="size-3.5" />} label="License">
                {template.license}
              </Row>
              {template.author && (
                <Row icon={<span className="text-[11px]">©</span>} label="Author">
                  {template.source ? (
                    <a
                      href={template.source}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline decoration-white/20 underline-offset-2 hover:decoration-white"
                    >
                      {template.author}
                    </a>
                  ) : (
                    template.author
                  )}
                </Row>
              )}
            </dl>

            {template.attribution && (
              <p className="mt-4 rounded-xl border border-hairline bg-white/[0.02] p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
                <strong className="font-medium text-ink">Attribution required.</strong>{" "}
                {template.attribution} This credit is preserved in every export.
              </p>
            )}

            {template.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/templates?q=${encodeURIComponent(tag)}`}
                    className="rounded-md bg-white/[0.05] px-2 py-1 text-[11.5px] text-ink-muted transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-20 border-t border-hairline pt-12">
          <h2 className="mb-6 text-[19px] font-semibold tracking-[-0.02em]">Similar templates</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <TemplateCardItem key={item.slug} template={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-ink-muted">
        {icon}
        {label}
      </dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
