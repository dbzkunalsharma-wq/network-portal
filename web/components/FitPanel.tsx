"use client";

import clsx from "clsx";
import { fitScore, fitTier, FIT_TIER_LABELS, tagLabel } from "@/lib/jobs";
import type { Job } from "@/lib/types";
import { CheckIcon, TargetIcon } from "./icons";
import { FitBadge } from "./tracker-ui";

/**
 * "Why this fits" — the explainable breakdown behind a role's fit score:
 * the positive reasons, any cautions, and the resume keywords the full posting
 * hit. Pure presentation over `fitScore()`.
 */
export function FitPanel({ job, className }: { job: Job; className?: string }) {
  const fit = fitScore(job);
  const tier = fitTier(fit.score);
  const tags = Array.isArray(job.tags) ? job.tags : [];

  return (
    <section
      aria-label="Why this role fits"
      className={clsx("rounded-2xl border border-line bg-ink/[0.04] p-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TargetIcon className="h-4 w-4 text-emerald-700" />
          <h3 className="text-sm font-semibold text-ink">Why this fits</h3>
        </div>
        <FitBadge score={fit.score} size="lg" showLabel />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">For</p>
          {fit.reasons.length > 0 ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              {fit.reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-xs text-ink/75">
                  <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-ink/45">Nothing specific stood out.</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">Watch out</p>
          {fit.flags.length > 0 ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              {fit.flags.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-center text-[10px] leading-3 text-amber-700">!</span>
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-ink/45">No cautions.</p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 border-t border-ink/[0.06] pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink/40">
            Resume keywords in this posting
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-300"
              >
                {tagLabel(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
        {FIT_TIER_LABELS[tier]}. Scored from the title, level, location, visa wording and the
        keywords in the full posting. Deterministic, no AI.
      </p>
    </section>
  );
}
