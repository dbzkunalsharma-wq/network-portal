import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpecializationTag } from "@/components/board-controls";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { DisciplineBadge } from "@/components/DisciplineBadge";
import { FitPanel } from "@/components/FitPanel";
import { ArrowUpRightIcon, PinIcon } from "@/components/icons";
import { LevelChip, SalaryChip, SponsorBadge, TopBadge } from "@/components/tracker-ui";
import {
  DISCIPLINE_MAP,
  fitScore,
  jobSlug,
  levelOf,
  postedAgo,
  sourceLabel,
  specialization,
  sponsorshipOf,
  topCompanyName,
  WORK_MODES,
  workMode,
} from "@/lib/jobs";
import { getJobBySlug, loadAllJobs } from "@/lib/jobs-data";
import { ogImageUrl } from "@/lib/og";
import type { Job } from "@/lib/types";

/** Per-job detail page (server, SSG) — the crawlable counterpart to the modal. */

export const dynamicParams = true;

type Params = { id: string };

export async function generateStaticParams(): Promise<Params[]> {
  const jobs = await loadAllJobs();
  return jobs.map((job) => ({ id: jobSlug(job.id) }));
}

function metaDescription(job: Job): string {
  const base = job.description?.trim();
  if (base) {
    const oneLine = base.replace(/\s+/g, " ").trim();
    return oneLine.length > 160 ? `${oneLine.slice(0, 157).trimEnd()}…` : oneLine;
  }
  const where = job.location ? ` in ${job.location}` : "";
  const who = job.company ? ` at ${job.company}` : "";
  return `${job.title}${who}${where}. Apply now via DOD US — live US Strategy & Ops jobs.`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobBySlug(decodeURIComponent(id));
  if (!job) return { title: "Role not found" };
  const company = job.company?.trim();
  const title = company ? `${job.title} at ${company}` : job.title;
  const description = metaDescription(job);
  const canonical = `/jobs/${jobSlug(job.id)}`;
  const location = job.location?.trim();
  const ogImage = ogImageUrl({
    kind: "job",
    title: job.title,
    subtitle: [company, location].filter(Boolean).join(" · ") || undefined,
    tag: `${DISCIPLINE_MAP[job.discipline].label} · fit ${fitScore(job).score}`,
    salary: job.salary?.trim() || undefined,
    hue: job.discipline,
  });
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: `${title} · DOD US`,
      description,
      url: canonical,
      siteName: "DOD US",
      locale: "en_US",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title: `${title} · DOD US`, description, images: [ogImage] },
  };
}

export default async function JobPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const job = await getJobBySlug(decodeURIComponent(id));
  if (!job) notFound();

  const topName = topCompanyName(job.company);
  const salary = job.salary?.trim();
  const description = job.description?.trim();
  const spec = specialization(job);
  const meta = DISCIPLINE_MAP[job.discipline];
  const mode = workMode(job);
  const modeLabel = WORK_MODES.find((m) => m.key === mode)?.label ?? mode;

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink/55 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:rounded"
        >
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          Back to all roles
        </Link>

        <article className="dod-glass relative mt-5 overflow-hidden rounded-3xl p-6 sm:p-8">
          <span aria-hidden="true" className={clsx("pointer-events-none absolute inset-x-0 top-0 h-[3px]", topName ? "bg-amber-400" : meta.topLine)} />

          <div className="flex items-start gap-4">
            <CompanyAvatar company={job.company} logo={job.logo} discipline={job.discipline} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DisciplineBadge discipline={job.discipline} />
                {topName && <TopBadge name={topName} />}
                <LevelChip level={levelOf(job)} />
                <SpecializationTag specialization={spec} className="px-2.5 py-1 text-xs" />
                <SponsorBadge sponsorship={sponsorshipOf(job)} verbose />
              </div>
              <h1 className="mt-2 text-balance text-2xl font-semibold leading-snug tracking-tight text-ink sm:text-3xl">{job.title}</h1>
              {job.company && <p className="mt-1 text-base font-medium text-ink/75">{job.company}</p>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink/60">
            {job.location && (
              <>
                <span className="inline-flex items-center gap-1">
                  <PinIcon className="h-4 w-4 text-ink/45" />
                  {job.location}
                </span>
                <span className="text-ink/25" aria-hidden="true">·</span>
              </>
            )}
            <span>{modeLabel}</span>
            <span className="text-ink/25" aria-hidden="true">·</span>
            <span>{sourceLabel(job.source)}</span>
            <span className="text-ink/25" aria-hidden="true">·</span>
            <span className="text-ink/45">{postedAgo(job)}</span>
          </div>

          {salary && (
            <div className="mt-4">
              <SalaryChip salary={salary} />
            </div>
          )}

          <FitPanel job={job} className="mt-6" />

          <div className="mt-6 border-t border-ink/10 pt-6">
            {description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/75 sm:text-base">{description}</p>
            ) : (
              <p className="text-sm italic text-ink/45">No description was provided for this role. Open the original posting for full details.</p>
            )}
          </div>

          <div className="mt-8">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-chalk sm:w-auto"
              aria-label={`Apply to ${job.title}${job.company ? ` at ${job.company}` : ""} (opens in a new tab)`}
            >
              Apply on {sourceLabel(job.source)}
              <ArrowUpRightIcon className="h-4 w-4" />
            </a>
          </div>
        </article>
      </div>
    </main>
  );
}
