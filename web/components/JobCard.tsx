"use client";

import clsx from "clsx";
import Link from "next/link";
import { companySlug } from "@/lib/companies";
import {
  contactHref,
  DISCIPLINE_MAP,
  fitScore,
  isNew,
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
import type { Job } from "@/lib/types";
import { useNow } from "@/lib/useRelativeTime";
import { useTracker } from "@/lib/useTracker";
import { SpecializationTag } from "./board-controls";
import { CompanyAvatar } from "./CompanyAvatar";
import { DisciplineBadge } from "./DisciplineBadge";
import { ArrowUpRightIcon, MailIcon, PinIcon } from "./icons";
import {
  FitBadge,
  LevelChip,
  NewBadge,
  SalaryChip,
  SaveButton,
  SponsorBadge,
  StatusSelector,
  TopBadge,
} from "./tracker-ui";

export function JobCard({
  job,
  index = 0,
  onOpen,
}: {
  job: Job;
  index?: number;
  onOpen: (job: Job) => void;
}) {
  const meta = DISCIPLINE_MAP[job.discipline];
  const cHref = job.contact ? contactHref(job.contact) : null;
  const topName = topCompanyName(job.company);
  const spec = specialization(job);
  const fit = fitScore(job);
  const spons = sponsorshipOf(job);
  const level = levelOf(job);
  const mode = workMode(job);
  const modeLabel = WORK_MODES.find((m) => m.key === mode)?.label ?? mode;

  const { isSaved, statusOf, toggleSave, setStatus } = useTracker();
  const saved = isSaved(job.id);
  const status = statusOf(job.id);

  const now = useNow();
  const fresh = now !== null && isNew(job, now);
  const salary = job.salary?.trim();
  const open = () => onOpen(job);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`View details for ${job.title}${job.company ? ` at ${job.company}` : ""}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          open();
        }
      }}
      className={clsx(
        "pb-rise pb-glass group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl p-5 text-left",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:bg-chalk/[0.09]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        topName ? "pb-top" : meta.hoverGlow
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity duration-300 group-hover:opacity-100",
          meta.topLine
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <CompanyAvatar company={job.company} logo={job.logo} discipline={job.discipline} size="sm" />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {topName && <TopBadge name={topName} />}
          {fresh && <NewBadge />}
          <FitBadge score={fit.score} />
          <SaveButton saved={saved} onToggle={() => toggleSave(job.id)} label={job.title} />
        </div>
      </div>

      <h2 className="mt-3 text-balance text-lg font-semibold leading-snug tracking-tight text-chalk">
        {job.title}
      </h2>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <DisciplineBadge discipline={job.discipline} />
        {spec !== "generalist" && <SpecializationTag specialization={spec} />}
        <LevelChip level={level} />
        <SponsorBadge sponsorship={spons} />
      </div>

      {job.company &&
        (() => {
          const cSlug = companySlug(job.company);
          return cSlug ? (
            <Link
              href={`/companies/${cSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block text-sm font-medium text-chalk/70 underline-offset-2 transition-colors hover:text-chalk hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40 focus-visible:rounded"
            >
              {job.company}
            </Link>
          ) : (
            <p className="mt-2 text-sm font-medium text-chalk/70">{job.company}</p>
          );
        })()}

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-chalk/55">
        {job.location && (
          <>
            <span className="inline-flex items-center gap-1">
              <PinIcon className="h-3.5 w-3.5 text-chalk/40" />
              <span className="line-clamp-1">{job.location}</span>
            </span>
            <span className="text-chalk/30" aria-hidden="true">·</span>
          </>
        )}
        <span>{modeLabel}</span>
        <span className="text-chalk/30" aria-hidden="true">·</span>
        <span className="text-chalk/55">{sourceLabel(job.source)}</span>
        <span className="text-chalk/30" aria-hidden="true">·</span>
        <span className="text-chalk/45">{postedAgo(job)}</span>
      </div>

      {salary && (
        <div className="mt-3">
          <SalaryChip salary={salary} />
        </div>
      )}

      {fit.reasons.length > 0 && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-chalk/50">
          <span className="text-chalk/70">Why:</span> {fit.reasons.slice(0, 3).join(" · ")}
        </p>
      )}

      {job.contact && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-chalk/55">
          <MailIcon className="h-3.5 w-3.5 text-chalk/40" />
          {cHref ? (
            <a
              href={cHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={clsx("underline decoration-dotted underline-offset-2 transition-colors hover:text-chalk", meta.text)}
            >
              {job.contact}
            </a>
          ) : (
            <span className="text-chalk/70">{job.contact}</span>
          )}
        </div>
      )}

      <div className="mt-4" onClick={(e) => e.stopPropagation()}>
        <StatusSelector value={status} onChange={(s) => setStatus(job.id, s)} label={job.title} />
      </div>

      <div className="mt-4 flex flex-1 items-end gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white",
            "transition-colors duration-200 hover:bg-brand hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          )}
          aria-label={`Apply to ${job.title}${job.company ? ` at ${job.company}` : ""} (opens in a new tab)`}
        >
          <span className="relative">Apply</span>
          <ArrowUpRightIcon className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
        <Link
          href={`/jobs/${jobSlug(job.id)}`}
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-line bg-chalk/[0.04] px-3 py-2.5 text-sm font-medium text-chalk/65",
            "transition-all duration-200 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          )}
          aria-label={`Open the details page for ${job.title}${job.company ? ` at ${job.company}` : ""}`}
        >
          Open
          <ArrowUpRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
