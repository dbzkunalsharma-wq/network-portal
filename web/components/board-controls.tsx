"use client";

import clsx from "clsx";
import {
  LEVEL_LABELS,
  LEVELS,
  LOCATION_LABELS,
  LOCATIONS,
  SPECIALIZATION_LABELS,
  SPECIALIZATIONS,
  WORK_MODES,
  sourceLabel,
} from "@/lib/jobs";
import type { Specialization } from "@/lib/jobs";
import type {
  DateFilter,
  DisciplineFilter,
  LocationFilter,
  SortMode,
  StatusFilter,
  WorkModeFilter,
} from "@/lib/useFilterState";
import type { Discipline, Level, Source } from "@/lib/types";
import { useCopyToClipboard } from "@/lib/useCopyToClipboard";
import { STATUS_LABELS } from "@/lib/useTracker";
import { STATUS_VISUALS } from "./tracker-ui";
import {
  BookmarkIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  DollarIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SortIcon,
  StarIcon,
  TargetIcon,
} from "./icons";

/* ------------------------------------------------------------------ */
/*  Pill                                                               */
/* ------------------------------------------------------------------ */

function Pill({
  active,
  onClick,
  children,
  ariaLabel,
  tone = "neutral",
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  tone?: "neutral" | "amber" | "gold" | "emerald";
  title?: string;
}) {
  const activeTone =
    tone === "amber"
      ? "border-turbo bg-turbo text-chalk"
      : tone === "gold"
        ? "border-turbo bg-turbo text-chalk"
        : tone === "emerald"
          ? "border-green-600 bg-green-600 text-white"
          : "border-brand bg-brand text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
        active
          ? activeTone
          : "border-line bg-chalk/[0.04] text-chalk/55 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
      )}
    >
      {children}
    </button>
  );
}

function CountedPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-chalk/[0.04] text-chalk/55 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
      )}
    >
      {label}
      <span className={clsx("tabular-nums", active ? "text-chalk/70" : "text-chalk/35")}>{count}</span>
    </button>
  );
}

function AllPill({ active, onClick, label = "All" }: { active: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
        active
          ? "border-chalk bg-chalk text-ink"
          : "border-line bg-chalk/[0.04] text-chalk/55 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
      )}
    >
      {label}
    </button>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-0.5 text-xs font-medium uppercase tracking-wide text-chalk/40">{children}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick toggles — Strong fit / Has salary / Sponsor-friendly / Top / Saved */
/* ------------------------------------------------------------------ */

export function FilterChips({
  fitOnly,
  fitCount,
  hasSalaryOnly,
  sponsorOk,
  noSponsorCount,
  topOnly,
  topCount,
  savedOnly,
  savedCount,
  onFit,
  onHasSalary,
  onSponsor,
  onTop,
  onSaved,
}: {
  fitOnly: boolean;
  fitCount: number;
  hasSalaryOnly: boolean;
  sponsorOk: boolean;
  /** How many roles in the current view explicitly refuse sponsorship. */
  noSponsorCount: number;
  topOnly: boolean;
  topCount: number;
  savedOnly: boolean;
  savedCount: number;
  onFit: () => void;
  onHasSalary: () => void;
  onSponsor: () => void;
  onTop: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick filters">
      <RowLabel>Filters</RowLabel>

      <Pill active={fitOnly} onClick={onFit} tone="emerald" title="Only roles with a fit score of 55 or more">
        <TargetIcon className="h-3.5 w-3.5" />
        Strong fit
        <span className={clsx("tabular-nums", fitOnly ? "text-chalk/80" : "text-chalk/40")}>{fitCount}</span>
      </Pill>

      <Pill
        active={sponsorOk}
        onClick={onSponsor}
        title="Hide roles whose posting says it will not sponsor a visa"
      >
        <ShieldCheckIcon className="h-3.5 w-3.5" />
        Hide no-sponsorship
        {noSponsorCount > 0 && (
          <span className={clsx("tabular-nums", sponsorOk ? "text-chalk/80" : "text-chalk/40")}>
            −{noSponsorCount}
          </span>
        )}
      </Pill>

      <Pill active={hasSalaryOnly} onClick={onHasSalary}>
        <DollarIcon className="h-3.5 w-3.5" />
        Has salary
      </Pill>

      <Pill active={topOnly} onClick={onTop} tone="gold" ariaLabel="Show only roles at top companies">
        <StarIcon className="h-3.5 w-3.5" />
        Top companies
        <span className={clsx("tabular-nums", topOnly ? "text-amber-700" : "text-chalk/40")}>{topCount}</span>
      </Pill>

      <Pill active={savedOnly} onClick={onSaved} tone="amber">
        <BookmarkIcon filled={savedOnly} className="h-3.5 w-3.5" />
        Saved
        <span className={clsx("tabular-nums", savedOnly ? "text-chalk/80" : "text-chalk/40")}>{savedCount}</span>
      </Pill>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Work-type chips                                                    */
/* ------------------------------------------------------------------ */

export function WorkTypeFilter({
  value,
  counts,
  onChange,
}: {
  value: WorkModeFilter;
  counts: Record<string, number>;
  onChange: (mode: WorkModeFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by work type">
      <RowLabel>Work type</RowLabel>
      <AllPill active={value === "all"} onClick={() => onChange("all")} />
      {WORK_MODES.map((m) => (
        <CountedPill
          key={m.key}
          active={value === m.key}
          onClick={() => onChange(value === m.key ? "all" : m.key)}
          label={m.label}
          count={counts[m.key] ?? 0}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Level chips — Analyst / Manager / Senior / Director+               */
/* ------------------------------------------------------------------ */

export function LevelFilter({
  selected,
  counts,
  onToggle,
  onClear,
}: {
  selected: Set<Level>;
  counts: Record<string, number>;
  onToggle: (level: Level) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by seniority">
      <RowLabel>Level</RowLabel>
      <AllPill active={selected.size === 0} onClick={onClear} label="Any" />
      {LEVELS.map((l) => (
        <CountedPill
          key={l.key}
          active={selected.has(l.key)}
          onClick={() => onToggle(l.key)}
          label={l.label}
          count={counts[l.key] ?? 0}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Specialization chips                                               */
/* ------------------------------------------------------------------ */

export function SpecializationFilter({
  selected,
  counts,
  onToggle,
  onClear,
}: {
  selected: Set<Specialization>;
  counts: Record<string, number>;
  onToggle: (key: Specialization) => void;
  onClear: () => void;
}) {
  const visible = SPECIALIZATIONS.filter((s) => (counts[s.key] ?? 0) > 0 || selected.has(s.key));
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by role type">
      <RowLabel>Role type</RowLabel>
      <AllPill active={selected.size === 0} onClick={onClear} label="Any" />
      {visible.map((s) => (
        <CountedPill
          key={s.key}
          active={selected.has(s.key)}
          onClick={() => onToggle(s.key)}
          label={s.label}
          count={counts[s.key] ?? 0}
        />
      ))}
    </div>
  );
}

export function SpecializationTag({
  specialization,
  className,
}: {
  specialization: Specialization;
  className?: string;
}) {
  if (specialization === "generalist") return null;
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border border-line bg-chalk/[0.05] px-2 py-0.5 text-[11px] font-medium text-chalk/55",
        className
      )}
    >
      {SPECIALIZATION_LABELS[specialization]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Glass select                                                       */
/* ------------------------------------------------------------------ */

function GlassSelect({
  value,
  onChange,
  ariaLabel,
  icon,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 text-chalk/45">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={clsx(
          "appearance-none rounded-full border border-line bg-chalk/[0.06] py-1.5 pl-9 pr-8 text-xs font-medium text-chalk",
          " transition-colors duration-200 hover:border-chalk/25 hover:bg-chalk/[0.1]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
          "[&>option]:bg-[#17171c] [&>option]:text-chalk"
        )}
      >
        {children}
      </select>
      <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-chalk/45" />
    </div>
  );
}

export function LocationFilterSelect({
  value,
  counts,
  onChange,
}: {
  value: LocationFilter;
  counts: Record<string, number>;
  onChange: (loc: LocationFilter) => void;
}) {
  return (
    <GlassSelect
      value={value}
      onChange={(v) => onChange(v as LocationFilter)}
      ariaLabel="Filter by location"
      icon={<MapPinIcon className="h-3.5 w-3.5" />}
    >
      <option value="all">All US locations</option>
      {LOCATIONS.map((l) => (
        <option key={l.key} value={l.key}>
          {l.label} ({counts[l.key] ?? 0})
        </option>
      ))}
    </GlassSelect>
  );
}

const SORT_LABELS: Record<SortMode, string> = {
  fit: "🎯 Best fit",
  newest: "Newest",
  salary: "Highest salary",
  company: "Company A–Z",
};

export function SortControl({ value, onChange }: { value: SortMode; onChange: (s: SortMode) => void }) {
  return (
    <GlassSelect
      value={value}
      onChange={(v) => onChange(v as SortMode)}
      ariaLabel="Sort roles"
      icon={<SortIcon className="h-3.5 w-3.5" />}
    >
      {(Object.keys(SORT_LABELS) as SortMode[]).map((s) => (
        <option key={s} value={s}>
          {SORT_LABELS[s]}
        </option>
      ))}
    </GlassSelect>
  );
}

const DATE_LABELS: Record<DateFilter, string> = {
  any: "Any time",
  "24h": "Past 24 hours",
  "7d": "Past 7 days",
  "30d": "Past 30 days",
};
const DATE_ORDER: DateFilter[] = ["any", "24h", "7d", "30d"];

export function DatePostedSelect({ value, onChange }: { value: DateFilter; onChange: (d: DateFilter) => void }) {
  return (
    <GlassSelect
      value={value}
      onChange={(v) => onChange(v as DateFilter)}
      ariaLabel="Filter by date posted"
      icon={<CalendarIcon className="h-3.5 w-3.5" />}
    >
      {DATE_ORDER.map((d) => (
        <option key={d} value={d}>
          {DATE_LABELS[d]}
        </option>
      ))}
    </GlassSelect>
  );
}

/* ------------------------------------------------------------------ */
/*  Status filter                                                      */
/* ------------------------------------------------------------------ */

const STATUS_FILTER_VALUES: StatusFilter[] = ["all", "interested", "applied", "interviewing", "offer", "rejected"];

export function StatusFilterChips({ value, onChange }: { value: StatusFilter; onChange: (s: StatusFilter) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
      <RowLabel>Pipeline</RowLabel>
      {STATUS_FILTER_VALUES.map((s) => {
        const active = value === s;
        const v = s === "all" ? null : STATUS_VISUALS[s];
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
              active
                ? v
                  ? clsx(v.chip, "ring-1 ring-inset")
                  : "border-chalk bg-chalk text-ink"
                : "border-line bg-chalk/[0.04] text-chalk/55 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
            )}
          >
            {v && <span className={clsx("h-1.5 w-1.5 rounded-full", v.dot)} />}
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Copy link buttons                                                  */
/* ------------------------------------------------------------------ */

export function CopyLinkButton({ queryString }: { queryString: string }) {
  const { copied, copy } = useCopyToClipboard();
  const onClick = () => {
    const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    copy(queryString ? `${base}?${queryString}` : base);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy a shareable link to this filtered view"
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
        copied
          ? "border-green-600 bg-green-600 text-white"
          : "border-line bg-chalk/[0.04] text-chalk/65 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
      )}
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

export function CopyJobLinkButton({ jobId }: { jobId: string }) {
  const { copied, copy } = useCopyToClipboard();
  const onClick = () => {
    const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    copy(`${base}?job=${encodeURIComponent(jobId)}`);
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy a shareable link to this role"
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        copied
          ? "border-green-600 bg-green-600 text-white"
          : "border-chalk/10 bg-chalk/[0.06] text-chalk/75 hover:border-chalk/25 hover:bg-chalk/[0.12] hover:text-chalk"
      )}
    >
      {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Active-filters summary                                             */
/* ------------------------------------------------------------------ */

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  stratops: "Strategy & Ops",
  strategy: "Corporate Strategy",
  growth: "Growth & Pricing",
  finance: "Strategic Finance",
};

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  any: "Any time",
  "24h": "Past 24h",
  "7d": "Past 7 days",
  "30d": "Past 30 days",
};

export function ActiveFilters({
  discipline,
  search,
  sources,
  location,
  workMode,
  fitOnly,
  hasSalaryOnly,
  sponsorOk,
  topOnly,
  savedOnly,
  status,
  datePosted,
  levels,
  specializations,
  onClearDiscipline,
  onClearSearch,
  onRemoveSource,
  onClearLocation,
  onClearWorkMode,
  onClearFit,
  onClearHasSalary,
  onClearSponsor,
  onClearTop,
  onClearSaved,
  onClearStatus,
  onClearDatePosted,
  onRemoveLevel,
  onRemoveSpecialization,
  onClearAll,
}: {
  discipline: DisciplineFilter;
  search: string;
  sources: Set<Source>;
  location: LocationFilter;
  workMode: WorkModeFilter;
  fitOnly: boolean;
  hasSalaryOnly: boolean;
  sponsorOk: boolean;
  topOnly: boolean;
  savedOnly: boolean;
  status: StatusFilter;
  datePosted: DateFilter;
  levels: Set<Level>;
  specializations: Set<Specialization>;
  onClearDiscipline: () => void;
  onClearSearch: () => void;
  onRemoveSource: (s: Source) => void;
  onClearLocation: () => void;
  onClearWorkMode: () => void;
  onClearFit: () => void;
  onClearHasSalary: () => void;
  onClearSponsor: () => void;
  onClearTop: () => void;
  onClearSaved: () => void;
  onClearStatus: () => void;
  onClearDatePosted: () => void;
  onRemoveLevel: (level: Level) => void;
  onRemoveSpecialization: (key: Specialization) => void;
  onClearAll: () => void;
}) {
  const chips: ActiveChip[] = [];
  if (discipline !== "all") chips.push({ key: "discipline", label: DISCIPLINE_LABELS[discipline], onRemove: onClearDiscipline });
  if (search.trim()) chips.push({ key: "search", label: `“${search.trim()}”`, onRemove: onClearSearch });
  if (location !== "all") chips.push({ key: "location", label: LOCATION_LABELS[location], onRemove: onClearLocation });
  if (workMode !== "all") {
    const m = WORK_MODES.find((w) => w.key === workMode);
    chips.push({ key: "workmode", label: m?.label ?? workMode, onRemove: onClearWorkMode });
  }
  if (fitOnly) chips.push({ key: "fit", label: "Strong fit", onRemove: onClearFit });
  if (sponsorOk) chips.push({ key: "sponsor", label: "Hide no-sponsorship", onRemove: onClearSponsor });
  if (hasSalaryOnly) chips.push({ key: "salary", label: "Has salary", onRemove: onClearHasSalary });
  if (topOnly) chips.push({ key: "top", label: "Top companies", onRemove: onClearTop });
  if (datePosted !== "any") chips.push({ key: "posted", label: DATE_FILTER_LABELS[datePosted], onRemove: onClearDatePosted });
  for (const level of LEVELS.map((l) => l.key).filter((k) => levels.has(k))) {
    chips.push({ key: `lvl-${level}`, label: LEVEL_LABELS[level], onRemove: () => onRemoveLevel(level) });
  }
  for (const key of SPECIALIZATIONS.map((s) => s.key).filter((k) => specializations.has(k))) {
    chips.push({ key: `spec-${key}`, label: SPECIALIZATION_LABELS[key], onRemove: () => onRemoveSpecialization(key) });
  }
  if (savedOnly) chips.push({ key: "saved", label: "Saved", onRemove: onClearSaved });
  if (status !== "all") chips.push({ key: "status", label: STATUS_LABELS[status], onRemove: onClearStatus });
  for (const s of Array.from(sources).sort()) {
    chips.push({ key: `src-${s}`, label: sourceLabel(s), onRemove: () => onRemoveSource(s) });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <RowLabel>Active</RowLabel>
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-chalk/[0.06] py-1 pl-2.5 pr-1 text-xs font-medium text-chalk/75"
        >
          {c.label}
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={`Remove ${c.label} filter`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-chalk/45 transition-colors hover:bg-chalk/15 hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 rounded-full px-2.5 py-1 text-xs font-medium text-chalk/55 underline-offset-2 transition-colors hover:text-chalk hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
      >
        Clear all
      </button>
    </div>
  );
}
