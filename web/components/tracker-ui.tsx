"use client";

import clsx from "clsx";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type JobStatus,
} from "@/lib/useTracker";
import {
  fitTier,
  FIT_TIER_LABELS,
  LEVEL_LABELS,
  LEVELS,
  SPONSORSHIP_LABELS,
} from "@/lib/jobs";
import type { Level, Sponsorship } from "@/lib/types";
import {
  BookmarkIcon,
  BriefcaseIcon,
  DollarIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  StarIcon,
  TargetIcon,
} from "./icons";

/* ------------------------------------------------------------------ */
/*  Status palette                                                     */
/* ------------------------------------------------------------------ */

type StatusVisual = { chip: string; dot: string; ring: string };

export const STATUS_VISUALS: Record<Exclude<JobStatus, "none">, StatusVisual> = {
  interested: {
    chip: "bg-sky-100 text-sky-700 ring-sky-300",
    dot: "bg-sky-400",
    ring: "ring-sky-300",
  },
  applied: {
    chip: "bg-emerald-100 text-emerald-700 ring-emerald-300",
    dot: "bg-emerald-400",
    ring: "ring-emerald-300",
  },
  interviewing: {
    chip: "bg-violet-100 text-violet-700 ring-violet-300",
    dot: "bg-violet-400",
    ring: "ring-violet-300",
  },
  offer: {
    chip: "bg-amber-100 text-amber-700 ring-amber-300",
    dot: "bg-amber-400",
    ring: "ring-amber-300",
  },
  rejected: {
    chip: "bg-rose-100 text-rose-700 ring-rose-300",
    dot: "bg-rose-400",
    ring: "ring-rose-300",
  },
};

export function StatusChip({ status, className }: { status: JobStatus; className?: string }) {
  if (status === "none") return null;
  const v = STATUS_VISUALS[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        v.chip,
        className
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", v.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Save (bookmark) toggle                                             */
/* ------------------------------------------------------------------ */

export function SaveButton({
  saved,
  onToggle,
  label,
  size = "sm",
  className,
}: {
  saved: boolean;
  onToggle: () => void;
  label?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const icon = size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={saved}
      aria-label={`${saved ? "Remove from saved" : "Save"}${label ? ` — ${label}` : ""}`}
      title={saved ? "Saved" : "Save"}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        dims,
        saved
          ? "border-turbo bg-turbo text-chalk"
          : "border-line bg-chalk/[0.05] text-chalk/55 hover:border-chalk/30 hover:bg-chalk/[0.1] hover:text-chalk",
        className
      )}
    >
      <BookmarkIcon filled={saved} className={icon} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Status selector — interested / applied / interviewing / offer / rejected */
/* ------------------------------------------------------------------ */

export function StatusSelector({
  value,
  onChange,
  label,
  className,
}: {
  value: JobStatus;
  onChange: (status: JobStatus) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={`Set status${label ? ` for ${label}` : ""}`}
      className={clsx(
        "inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-chalk/[0.04] p-1",
        className
      )}
    >
      {STATUS_ORDER.map((s) => {
        const active = value === s;
        const v = STATUS_VISUALS[s];
        return (
          <button
            key={s}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(active ? "none" : s);
            }}
            aria-pressed={active}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
              active ? clsx(v.chip, "ring-1 ring-inset") : "text-chalk/50 hover:bg-chalk/[0.08] hover:text-chalk"
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NEW badge                                                          */
/* ------------------------------------------------------------------ */

export function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        "bg-green-600 text-white",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="pb-live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-300" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      New
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Top badge                                                          */
/* ------------------------------------------------------------------ */

export function TopBadge({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span
      className={clsx(
        "pb-top-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className
      )}
      title={name ? `${name} — top company` : "Top company"}
      aria-label={name ? `Top company: ${name}` : "Top company"}
    >
      <StarIcon className="h-2.5 w-2.5" />
      Top
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Salary chip                                                        */
/* ------------------------------------------------------------------ */

export function SalaryChip({ salary, className }: { salary: string; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-300",
        className
      )}
    >
      <DollarIcon className="h-3.5 w-3.5 text-emerald-700" />
      {salary}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Fit badge — the profile-match score                                */
/* ------------------------------------------------------------------ */

const FIT_VISUALS: Record<ReturnType<typeof fitTier>, string> = {
  strong: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  good: "bg-sky-100 text-sky-700 ring-sky-300",
  possible: "bg-amber-100 text-amber-700 ring-amber-300",
  weak: "bg-chalk/[0.06] text-chalk/55 ring-chalk/15",
};

export function FitBadge({
  score,
  size = "sm",
  className,
  showLabel = false,
}: {
  score: number;
  size?: "sm" | "lg";
  className?: string;
  showLabel?: boolean;
}) {
  const tier = fitTier(score);
  return (
    <span
      title={`${FIT_TIER_LABELS[tier]} — fit score ${score}/100`}
      aria-label={`Fit score ${score} of 100, ${FIT_TIER_LABELS[tier]}`}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-semibold tabular-nums ring-1 ring-inset",
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-[11px]",
        FIT_VISUALS[tier],
        className
      )}
    >
      <TargetIcon className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
      {score}
      {showLabel && <span className="font-medium opacity-80">· {FIT_TIER_LABELS[tier]}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Sponsorship badge — only shown when the posting is explicit        */
/* ------------------------------------------------------------------ */

export function SponsorBadge({
  sponsorship,
  className,
  verbose = false,
}: {
  sponsorship: Sponsorship;
  className?: string;
  verbose?: boolean;
}) {
  if (sponsorship === "unknown") return null;
  const no = sponsorship === "no";
  const Icon = no ? ShieldXIcon : ShieldCheckIcon;
  return (
    <span
      title={SPONSORSHIP_LABELS[sponsorship]}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        no
          ? "bg-rose-100 text-rose-700 ring-rose-300"
          : "bg-emerald-100 text-emerald-700 ring-emerald-300",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {verbose ? SPONSORSHIP_LABELS[sponsorship] : no ? "No sponsorship" : "Sponsors visas"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Level chip                                                         */
/* ------------------------------------------------------------------ */

export function LevelChip({ level, className }: { level: Level; className?: string }) {
  const short = LEVELS.find((l) => l.key === level)?.short ?? level;
  return (
    <span
      title={LEVEL_LABELS[level]}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border border-line bg-chalk/[0.05] px-2 py-0.5 text-[11px] font-medium text-chalk/60",
        className
      )}
    >
      <BriefcaseIcon className="h-3 w-3 text-chalk/45" />
      {short}
    </span>
  );
}
