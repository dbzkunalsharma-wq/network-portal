"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { companySlug } from "@/lib/companies";
import {
  DISCIPLINE_MAP,
  isNew,
  jobSlug,
  levelOf,
  postedAgo,
  sourceLabel,
  specialization,
  sponsorshipOf,
  WORK_MODES,
  workMode,
} from "@/lib/jobs";
import type { Job } from "@/lib/types";
import { useNow } from "@/lib/useRelativeTime";
import { useTracker } from "@/lib/useTracker";
import { ApplyAssist } from "./ApplyAssist";
import { CopyJobLinkButton, SpecializationTag } from "./board-controls";
import { CompanyAvatar } from "./CompanyAvatar";
import { DisciplineBadge } from "./DisciplineBadge";
import { FitPanel } from "./FitPanel";
import { ArrowUpRightIcon, CloseIcon, PinIcon } from "./icons";
import { LevelChip, NewBadge, SalaryChip, SaveButton, SponsorBadge, StatusSelector } from "./tracker-ui";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function JobDetailModal({ job, onClose }: { job: Job | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const { isSaved, statusOf, toggleSave, setStatus } = useTracker();
  const now = useNow();
  const open = job !== null;

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;
    closeBtnRef.current?.focus();
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open || !job) return null;

  const meta = DISCIPLINE_MAP[job.discipline];
  const description = job.description?.trim();
  const spec = specialization(job);
  const mode = workMode(job);
  const modeLabel = WORK_MODES.find((m) => m.key === mode)?.label ?? mode;

  return (
    <div
      className="pb-modal-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-chalk/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onMouseDown={(e) => e.stopPropagation()}
        className={clsx(
          "pb-glass pb-modal-panel relative flex max-h-[92dvh] w-full max-w-2xl flex-col",
          "rounded-t-3xl sm:rounded-3xl"
        )}
      >
        <span aria-hidden="true" className={clsx("pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-3xl", meta.topLine)} />
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={clsx(
            "absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full",
            "border border-chalk/15 bg-chalk/[0.06] text-chalk/70 transition-colors",
            "hover:bg-chalk/[0.14] hover:text-chalk",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50"
          )}
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="pb-modal-scroll flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
          <div className="flex items-start gap-4 pr-10">
            <CompanyAvatar company={job.company} logo={job.logo} discipline={job.discipline} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DisciplineBadge discipline={job.discipline} />
                <SpecializationTag specialization={spec} className="px-2.5 py-1 text-xs" />
                <LevelChip level={levelOf(job)} />
                <SponsorBadge sponsorship={sponsorshipOf(job)} />
                {now !== null && isNew(job, now) && <NewBadge />}
              </div>
              <h2 id={titleId} className="mt-2 text-balance text-xl font-semibold leading-snug tracking-tight text-chalk sm:text-2xl">
                {job.title}
              </h2>
              {job.company &&
                (() => {
                  const cSlug = companySlug(job.company);
                  return cSlug ? (
                    <Link
                      href={`/companies/${cSlug}`}
                      className="mt-1 inline-block text-sm font-medium text-chalk/75 underline-offset-2 transition-colors hover:text-chalk hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40 focus-visible:rounded"
                    >
                      {job.company}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-chalk/75">{job.company}</p>
                  );
                })()}
            </div>
            <SaveButton saved={isSaved(job.id)} onToggle={() => toggleSave(job.id)} label={job.title} size="lg" className="mt-0.5" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-chalk/60">
            {job.location && (
              <>
                <span className="inline-flex items-center gap-1">
                  <PinIcon className="h-3.5 w-3.5 text-chalk/45" />
                  {job.location}
                </span>
                <span className="text-chalk/25" aria-hidden="true">·</span>
              </>
            )}
            {!(job.location ?? "").toLowerCase().includes(mode) && (
              <>
                <span>{modeLabel}</span>
                <span className="text-chalk/25" aria-hidden="true">·</span>
              </>
            )}
            <span>{sourceLabel(job.source)}</span>
            <span className="text-chalk/25" aria-hidden="true">·</span>
            <span className="text-chalk/45">{postedAgo(job)}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.salary?.trim() && <SalaryChip salary={job.salary.trim()} />}
            <StatusSelector value={statusOf(job.id)} onChange={(s) => setStatus(job.id, s)} label={job.title} />
          </div>

          <FitPanel job={job} className="mt-5" />

          <ApplyAssist job={job} />

          <div className="mt-5 border-t border-chalk/10 pt-5">
            {description ? (
              <p id={descId} className="whitespace-pre-wrap text-sm leading-relaxed text-chalk/75">
                {description}
              </p>
            ) : (
              <p className="text-sm italic text-chalk/45">
                No description was provided for this role. Open the original posting for full details.
              </p>
            )}
          </div>
        </div>

        <div className=" flex shrink-0 items-center gap-2 border-t border-chalk/10 px-6 py-4 sm:px-8">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className={clsx(
              "group/apply relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl",
              "bg-ink px-4 py-3 text-sm font-semibold text-white",
              "transition-colors duration-200 hover:bg-brand hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            )}
            aria-label={`Apply to ${job.title}${job.company ? ` at ${job.company}` : ""} (opens in a new tab)`}
          >
            <span className="relative">Apply on {sourceLabel(job.source)}</span>
            <ArrowUpRightIcon className="relative h-4 w-4 transition-transform duration-200 group-hover/apply:translate-x-0.5 group-hover/apply:-translate-y-0.5" />
          </a>
          <Link
            href={`/jobs/${jobSlug(job.id)}`}
            className={clsx(
              "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200",
              "border-chalk/10 bg-chalk/[0.06] text-chalk/75 hover:border-chalk/25 hover:bg-chalk/[0.12] hover:text-chalk",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            )}
            aria-label={`Open the full details page for ${job.title}`}
          >
            <ArrowUpRightIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Open page</span>
          </Link>
          <CopyJobLinkButton jobId={job.id} />
        </div>
      </div>
    </div>
  );
}
