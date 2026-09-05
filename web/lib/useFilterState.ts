"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Discipline, Level, Source } from "./types";
import type { LocationKey, Specialization, WorkMode } from "./jobs";
import { SPECIALIZATIONS } from "./jobs";
import type { JobStatus } from "./useTracker";

/**
 * Single source of truth for the board's filter state, mirrored to the URL so
 * any view is shareable / restorable.
 *
 * URL contract (all optional, omitted at their default):
 *   d=stratops|strategy|growth|finance     discipline (default "all")
 *   q=<text>                                search query
 *   src=linkedin,greenhouse,…               selected sources (CSV)
 *   loc=austin|texas|remote|…               location facet (default "all")
 *   mode=remote|hybrid|onsite               work-type facet (default "all")
 *   fit=1                                   strong/good fit only (score ≥ 55)
 *   salary=1                                has-salary-only toggle
 *   top=1                                   top-companies-only toggle
 *   sponsor=1                               hide roles that say "no sponsorship"
 *   posted=24h|7d|30d                       date-posted window (default "any")
 *   lvl=analyst,manager,senior,director     seniority levels (CSV)
 *   spec=stratops,pricing,…                 specializations (CSV)
 *   sort=newest|salary|company              sort mode (default "fit")
 *   view=saved                              saved-only view
 *   status=interested|applied|…             status filter
 *   job=<id>                                open this job's detail modal
 */

export type DisciplineFilter = "all" | Discipline;
export type StatusFilter = "all" | Exclude<JobStatus, "none">;
export type LocationFilter = "all" | LocationKey;
export type WorkModeFilter = "all" | WorkMode;
export type SortMode = "fit" | "newest" | "salary" | "company";
export type DateFilter = "any" | "24h" | "7d" | "30d";

export const DATE_FILTER_DAYS: Record<Exclude<DateFilter, "any">, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

/** Minimum fit score for the "Strong fit" toggle. */
export const FIT_ONLY_MIN = 55;

const DISCIPLINE_VALUES: Discipline[] = ["stratops", "strategy", "growth", "finance"];
const STATUS_VALUES: Exclude<JobStatus, "none">[] = ["interested", "applied", "interviewing", "offer", "rejected"];
const LOCATION_VALUES: LocationKey[] = [
  "austin", "texas", "bay-area", "new-york", "seattle", "los-angeles", "chicago", "denver",
  "boston", "dc", "atlanta", "remote", "other",
];
const WORK_MODE_VALUES: WorkMode[] = ["remote", "hybrid", "onsite"];
const SORT_VALUES: SortMode[] = ["fit", "newest", "salary", "company"];
const DATE_VALUES: DateFilter[] = ["any", "24h", "7d", "30d"];
const LEVEL_VALUES: Level[] = ["analyst", "manager", "senior", "director"];
const SPECIALIZATION_VALUES: Specialization[] = SPECIALIZATIONS.map((s) => s.key);

export interface FilterState {
  discipline: DisciplineFilter;
  search: string;
  sources: Set<Source>;
  location: LocationFilter;
  workMode: WorkModeFilter;
  fitOnly: boolean;
  hasSalaryOnly: boolean;
  topOnly: boolean;
  sponsorOk: boolean;
  savedOnly: boolean;
  status: StatusFilter;
  sort: SortMode;
  datePosted: DateFilter;
  levels: Set<Level>;
  specializations: Set<Specialization>;
}

function csvSet<T extends string>(raw: string | null, allowed: readonly string[]): Set<T> {
  return new Set<T>(
    raw
      ? (raw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => allowed.includes(s)) as T[])
      : []
  );
}

function parseInitial(params: URLSearchParams): FilterState {
  const d = params.get("d");
  const discipline: DisciplineFilter =
    d && (DISCIPLINE_VALUES as string[]).includes(d) ? (d as Discipline) : "all";
  const src = params.get("src");
  const sources = new Set<Source>(
    src ? (src.split(",").map((s) => s.trim()).filter(Boolean) as Source[]) : []
  );
  const loc = params.get("loc");
  const location: LocationFilter =
    loc && (LOCATION_VALUES as string[]).includes(loc) ? (loc as LocationKey) : "all";
  const modeRaw = params.get("mode");
  const workMode: WorkModeFilter =
    modeRaw && (WORK_MODE_VALUES as string[]).includes(modeRaw) ? (modeRaw as WorkMode) : "all";
  const st = params.get("status");
  const status: StatusFilter =
    st && (STATUS_VALUES as string[]).includes(st) ? (st as Exclude<JobStatus, "none">) : "all";
  const sortRaw = params.get("sort");
  const sort: SortMode =
    sortRaw && (SORT_VALUES as string[]).includes(sortRaw) ? (sortRaw as SortMode) : "fit";
  const postedRaw = params.get("posted");
  const datePosted: DateFilter =
    postedRaw && (DATE_VALUES as string[]).includes(postedRaw) ? (postedRaw as DateFilter) : "any";

  return {
    discipline,
    search: params.get("q") ?? "",
    sources,
    location,
    workMode,
    fitOnly: params.get("fit") === "1",
    hasSalaryOnly: params.get("salary") === "1",
    topOnly: params.get("top") === "1",
    sponsorOk: params.get("sponsor") === "1",
    savedOnly: params.get("view") === "saved",
    status,
    sort,
    datePosted,
    levels: csvSet<Level>(params.get("lvl"), LEVEL_VALUES),
    specializations: csvSet<Specialization>(params.get("spec"), SPECIALIZATION_VALUES),
  };
}

function toQueryString(s: FilterState, job: string | null): string {
  const p = new URLSearchParams();
  if (s.discipline !== "all") p.set("d", s.discipline);
  if (s.search.trim()) p.set("q", s.search.trim());
  if (s.sources.size > 0) p.set("src", Array.from(s.sources).sort().join(","));
  if (s.location !== "all") p.set("loc", s.location);
  if (s.workMode !== "all") p.set("mode", s.workMode);
  if (s.fitOnly) p.set("fit", "1");
  if (s.hasSalaryOnly) p.set("salary", "1");
  if (s.topOnly) p.set("top", "1");
  if (s.sponsorOk) p.set("sponsor", "1");
  if (s.datePosted !== "any") p.set("posted", s.datePosted);
  if (s.levels.size > 0) p.set("lvl", LEVEL_VALUES.filter((l) => s.levels.has(l)).join(","));
  if (s.specializations.size > 0) {
    p.set("spec", SPECIALIZATION_VALUES.filter((k) => s.specializations.has(k)).join(","));
  }
  if (s.savedOnly) p.set("view", "saved");
  if (s.status !== "all") p.set("status", s.status);
  if (s.sort !== "fit") p.set("sort", s.sort);
  if (job) p.set("job", job);
  return p.toString();
}

export interface FilterApi extends FilterState {
  setDiscipline: (d: DisciplineFilter) => void;
  setSearch: (q: string) => void;
  toggleSource: (src: Source) => void;
  clearSources: () => void;
  setLocation: (loc: LocationFilter) => void;
  setWorkMode: (mode: WorkModeFilter) => void;
  setFitOnly: (v: boolean) => void;
  setHasSalaryOnly: (v: boolean) => void;
  setTopOnly: (v: boolean) => void;
  setSponsorOk: (v: boolean) => void;
  setSavedOnly: (v: boolean) => void;
  setStatus: (s: StatusFilter) => void;
  setSort: (s: SortMode) => void;
  setDatePosted: (d: DateFilter) => void;
  toggleLevel: (level: Level) => void;
  clearLevels: () => void;
  toggleSpecialization: (key: Specialization) => void;
  clearSpecializations: () => void;
  reset: () => void;
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  hasActiveFilters: boolean;
  queryString: string;
}

const DEFAULT: FilterState = {
  discipline: "all",
  search: "",
  sources: new Set(),
  location: "all",
  workMode: "all",
  fitOnly: false,
  hasSalaryOnly: false,
  topOnly: false,
  sponsorOk: false,
  savedOnly: false,
  status: "all",
  sort: "fit",
  datePosted: "any",
  levels: new Set(),
  specializations: new Set(),
};

export function useFilterState(): FilterApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<FilterState>(() =>
    parseInitial(new URLSearchParams(searchParams.toString()))
  );
  const [selectedJobId, setSelectedJobIdState] = useState<string | null>(
    () => searchParams.get("job") || null
  );

  const firstRun = useRef(true);
  const queryString = useMemo(() => toQueryString(state, null), [state]);
  const fullQuery = useMemo(() => toQueryString(state, selectedJobId), [state, selectedJobId]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const url = fullQuery ? `${pathname}?${fullQuery}` : pathname;
    router.replace(url, { scroll: false });
  }, [fullQuery, pathname, router]);

  const patch = useCallback(
    (p: Partial<FilterState>) => setState((s) => ({ ...s, ...p })),
    []
  );
  const toggleIn = useCallback(
    <K extends "sources" | "levels" | "specializations">(key: K, value: FilterState[K] extends Set<infer V> ? V : never) =>
      setState((s) => {
        const next = new Set(s[key] as Set<unknown>);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...s, [key]: next };
      }),
    []
  );

  const hasActiveFilters =
    state.discipline !== "all" ||
    state.search.trim() !== "" ||
    state.sources.size > 0 ||
    state.location !== "all" ||
    state.workMode !== "all" ||
    state.fitOnly ||
    state.hasSalaryOnly ||
    state.topOnly ||
    state.sponsorOk ||
    state.savedOnly ||
    state.status !== "all" ||
    state.datePosted !== "any" ||
    state.levels.size > 0 ||
    state.specializations.size > 0;

  return {
    ...state,
    setDiscipline: (discipline) => patch({ discipline }),
    setSearch: (search) => patch({ search }),
    toggleSource: (src) => toggleIn("sources", src),
    clearSources: () => patch({ sources: new Set() }),
    setLocation: (location) => patch({ location }),
    setWorkMode: (workMode) => patch({ workMode }),
    setFitOnly: (fitOnly) => patch({ fitOnly }),
    setHasSalaryOnly: (hasSalaryOnly) => patch({ hasSalaryOnly }),
    setTopOnly: (topOnly) => patch({ topOnly }),
    setSponsorOk: (sponsorOk) => patch({ sponsorOk }),
    setSavedOnly: (savedOnly) => patch({ savedOnly }),
    setStatus: (status) => patch({ status }),
    setSort: (sort) => patch({ sort }),
    setDatePosted: (datePosted) => patch({ datePosted }),
    toggleLevel: (level) => toggleIn("levels", level),
    clearLevels: () => patch({ levels: new Set() }),
    toggleSpecialization: (key) => toggleIn("specializations", key),
    clearSpecializations: () => patch({ specializations: new Set() }),
    reset: () =>
      setState({ ...DEFAULT, sources: new Set(), levels: new Set(), specializations: new Set() }),
    selectedJobId,
    setSelectedJobId: (id) => setSelectedJobIdState(id),
    hasActiveFilters,
    queryString,
  };
}
