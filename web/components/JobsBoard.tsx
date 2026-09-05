"use client";

import clsx from "clsx";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  compareBestFit,
  effectiveTime,
  fitScore,
  hasSalary as jobHasSalary,
  isTopCompany,
  levelOf,
  locationKey,
  salaryValue,
  SOURCE_ORDER,
  specialization as jobSpecialization,
  sponsorshipOf,
  withinDays,
  workMode as jobWorkMode,
} from "@/lib/jobs";
import type { Specialization } from "@/lib/jobs";
import type { Discipline, Job, JobsFeed, Level, Source } from "@/lib/types";
import { DATE_FILTER_DAYS, FIT_ONLY_MIN, useFilterState } from "@/lib/useFilterState";
import { useTracker } from "@/lib/useTracker";
import {
  ActiveFilters,
  CopyLinkButton,
  DatePostedSelect,
  FilterChips,
  LevelFilter,
  LocationFilterSelect,
  SortControl,
  SpecializationFilter,
  StatusFilterChips,
  WorkTypeFilter,
} from "./board-controls";
import { EmptyState } from "./EmptyState";
import { FeaturedCompanies } from "./FeaturedCompanies";
import { Header } from "./Header";
import { JobCard } from "./JobCard";
import { JobDetailModal } from "./JobDetailModal";
import { LoadMore } from "./LoadMore";
import { SearchInput } from "./SearchInput";
import { SegmentedControl } from "./SegmentedControl";
import { SiteFooter } from "./SiteFooter";
import { SkeletonGrid } from "./SkeletonCard";
import { SourceFilter } from "./SourceFilter";
import { StatsStrip } from "./StatsStrip";

const DISCIPLINE_KEYS: Discipline[] = ["stratops", "strategy", "growth", "finance"];
const PAGE_SIZE = 24;

type LoadState = "loading" | "ready" | "error";

function matchesSearch(job: Job, q: string): boolean {
  if (!q) return true;
  const haystack = [job.title, job.company, job.location].filter(Boolean).join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function emptyDisciplineCounts(): Record<Discipline, number> {
  return { stratops: 0, strategy: 0, growth: 0, finance: 0 };
}

function matchesLevel(job: Job, selected: Set<Level>): boolean {
  if (selected.size === 0) return true;
  return selected.has(levelOf(job));
}

function matchesSpecialization(job: Job, selected: Set<Specialization>): boolean {
  if (selected.size === 0) return true;
  return selected.has(jobSpecialization(job));
}

function compareBySort(a: Job, b: Job, sort: string): number {
  if (sort === "fit") return compareBestFit(a, b);
  if (sort === "salary") {
    const sa = salaryValue(a.salary);
    const sb = salaryValue(b.salary);
    if (sa !== sb) return sb - sa;
    return effectiveTime(b) - effectiveTime(a);
  }
  if (sort === "company") {
    const ca = a.company?.trim() ?? "";
    const cb = b.company?.trim() ?? "";
    if (!ca && !cb) return effectiveTime(b) - effectiveTime(a);
    if (!ca) return 1;
    if (!cb) return -1;
    const cmp = ca.localeCompare(cb, "en", { sensitivity: "base" });
    return cmp !== 0 ? cmp : effectiveTime(b) - effectiveTime(a);
  }
  return effectiveTime(b) - effectiveTime(a);
}

function JobsBoardInner() {
  const [feed, setFeed] = useState<JobsFeed | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const f = useFilterState();
  const {
    discipline, search, sources, location, workMode, fitOnly, hasSalaryOnly, topOnly,
    sponsorOk, savedOnly, status, sort, datePosted, levels, specializations,
  } = f;

  const tracker = useTracker();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/jobs.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as JobsFeed;
        if (!cancelled) {
          setFeed(data);
          setState("ready");
        }
      } catch (err) {
        console.error("Failed to load jobs feed:", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allJobs = useMemo<Job[]>(() => {
    if (!feed?.jobs) return [];
    return [...feed.jobs].sort((a, b) => effectiveTime(b) - effectiveTime(a));
  }, [feed]);

  // Fit scores are pure functions of the job — memoise once per feed load.
  const fitById = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of allJobs) m.set(j.id, fitScore(j).score);
    return m;
  }, [allJobs]);
  const fitOf = (job: Job) => fitById.get(job.id) ?? 0;

  const byId = useMemo(() => {
    const m = new Map<string, Job>();
    for (const j of allJobs) m.set(j.id, j);
    return m;
  }, [allJobs]);

  /* ---- predicates ------------------------------------------------------ */
  // Every facet count respects all *other* filters; these are the
  // facet-independent toggles. Each toggle's own live count ignores itself.
  const passesToggles = useMemo(() => {
    const savedMap = tracker.map;
    return (job: Job, opts: { ignoreFit?: boolean; ignoreTop?: boolean; ignoreSponsor?: boolean } = {}) => {
      if (!opts.ignoreFit && fitOnly && fitOf(job) < FIT_ONLY_MIN) return false;
      if (!opts.ignoreSponsor && sponsorOk && sponsorshipOf(job) === "no") return false;
      if (!opts.ignoreTop && topOnly && !isTopCompany(job.company)) return false;
      if (hasSalaryOnly && !jobHasSalary(job)) return false;
      if (savedOnly && savedMap[job.id]?.saved !== true) return false;
      if (status !== "all" && (savedMap[job.id]?.status ?? "none") !== status) return false;
      if (datePosted !== "any" && !withinDays(job, DATE_FILTER_DAYS[datePosted])) return false;
      return true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitOnly, sponsorOk, topOnly, hasSalaryOnly, savedOnly, status, datePosted, tracker.map, fitById]);

  const passesFacets = useMemo(() => {
    return (job: Job, skip: "discipline" | "source" | "location" | "mode" | "level" | "spec" | null = null) => {
      if (skip !== "discipline" && discipline !== "all" && job.discipline !== discipline) return false;
      if (!matchesSearch(job, search)) return false;
      if (skip !== "source" && sources.size > 0 && !sources.has(job.source)) return false;
      if (skip !== "location" && location !== "all" && locationKey(job) !== location) return false;
      if (skip !== "mode" && workMode !== "all" && jobWorkMode(job) !== workMode) return false;
      if (skip !== "level" && !matchesLevel(job, levels)) return false;
      if (skip !== "spec" && !matchesSpecialization(job, specializations)) return false;
      return true;
    };
  }, [discipline, search, sources, location, workMode, levels, specializations]);

  /* ---- faceted counts -------------------------------------------------- */
  const disciplineCounts = useMemo(() => {
    const counts = emptyDisciplineCounts();
    for (const job of allJobs) {
      if (!passesFacets(job, "discipline") || !passesToggles(job)) continue;
      counts[job.discipline] += 1;
    }
    return counts;
  }, [allJobs, passesFacets, passesToggles]);

  const disciplineTotal = useMemo(
    () => DISCIPLINE_KEYS.reduce((sum, k) => sum + (disciplineCounts[k] ?? 0), 0),
    [disciplineCounts]
  );

  const countBy = (skip: "source" | "location" | "mode" | "level" | "spec", keyOf: (j: Job) => string) => {
    const counts: Record<string, number> = {};
    for (const job of allJobs) {
      if (!passesFacets(job, skip) || !passesToggles(job)) continue;
      const k = keyOf(job);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sourceCounts = useMemo(() => countBy("source", (j) => j.source), [allJobs, passesFacets, passesToggles]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const locationCounts = useMemo(() => countBy("location", (j) => locationKey(j)), [allJobs, passesFacets, passesToggles]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const workModeCounts = useMemo(() => countBy("mode", (j) => jobWorkMode(j)), [allJobs, passesFacets, passesToggles]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const levelCounts = useMemo(() => countBy("level", (j) => levelOf(j)), [allJobs, passesFacets, passesToggles]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specializationCounts = useMemo(() => countBy("spec", (j) => jobSpecialization(j)), [allJobs, passesFacets, passesToggles]);

  const hasSpecializations = useMemo(
    () => Object.values(specializationCounts).some((n) => n > 0) || specializations.size > 0,
    [specializationCounts, specializations]
  );

  const availableSources = useMemo(() => {
    const present = Array.from(new Set(allJobs.map((j) => j.source)));
    const ordered = SOURCE_ORDER.filter((s) => present.includes(s));
    const extra = present.filter((s) => !SOURCE_ORDER.includes(s));
    return [...ordered, ...extra];
  }, [allJobs]);

  /* ---- toggle live counts (each ignoring itself) ----------------------- */
  const topJobs = useMemo(
    () => allJobs.filter((job) => isTopCompany(job.company) && passesFacets(job) && passesToggles(job, { ignoreTop: true })),
    [allJobs, passesFacets, passesToggles]
  );
  const fitCount = useMemo(
    () => allJobs.filter((job) => fitOf(job) >= FIT_ONLY_MIN && passesFacets(job) && passesToggles(job, { ignoreFit: true })).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allJobs, passesFacets, passesToggles, fitById]
  );
  const noSponsorCount = useMemo(
    () => allJobs.filter((job) => sponsorshipOf(job) === "no" && passesFacets(job) && passesToggles(job, { ignoreSponsor: true })).length,
    [allJobs, passesFacets, passesToggles]
  );

  /* ---- final list ------------------------------------------------------ */
  const visible = useMemo(() => {
    const filtered = allJobs.filter((job) => passesFacets(job) && passesToggles(job));
    if (sort !== "newest") filtered.sort((a, b) => compareBySort(a, b, sort));
    return filtered;
  }, [allJobs, passesFacets, passesToggles, sort]);

  const resetKey = useMemo(
    () =>
      [
        discipline, search.trim(), Array.from(sources).sort().join(","), location, workMode, fitOnly,
        hasSalaryOnly, topOnly, sponsorOk, savedOnly, status, sort, datePosted,
        Array.from(levels).sort().join(","), Array.from(specializations).sort().join(","),
        savedOnly || status !== "all" ? tracker.savedCount : 0,
      ].join("|"),
    [discipline, search, sources, location, workMode, fitOnly, hasSalaryOnly, topOnly, sponsorOk, savedOnly, status, sort, datePosted, levels, specializations, tracker.savedCount]
  );

  // Reveal window, keyed to the filter signature: any filter/sort change resets
  // it to one page (React's "adjust state while rendering" pattern, no effect).
  const [reveal, setReveal] = useState({ key: resetKey, n: PAGE_SIZE });
  if (reveal.key !== resetKey) setReveal({ key: resetKey, n: PAGE_SIZE });
  const shown = reveal.key === resetKey ? reveal.n : PAGE_SIZE;
  const setShown = (fn: (n: number) => number) => setReveal((w) => ({ key: resetKey, n: fn(w.n) }));

  const pageJobs = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const remaining = Math.max(0, visible.length - pageJobs.length);
  const showMore = () => setShown((n) => n + PAGE_SIZE);

  /* ---- deep link ------------------------------------------------------- */
  const { selectedJobId, setSelectedJobId } = f;
  // The modal's job is derived from the `?job=` param + the loaded feed.
  const selectedJob = useMemo(
    () => (selectedJobId ? byId.get(selectedJobId) ?? null : null),
    [selectedJobId, byId]
  );
  // A stale deep link (id no longer in the feed) is cleared from the URL once
  // the feed has loaded. This is a URL side-effect, so it lives in an effect.
  useEffect(() => {
    if (state === "ready" && selectedJobId && !byId.has(selectedJobId)) {
      setSelectedJobId(null);
    }
  }, [state, selectedJobId, byId, setSelectedJobId]);

  const openJob = (job: Job) => f.setSelectedJobId(job.id);
  const closeJob = () => f.setSelectedJobId(null);

  const resetAll = () => f.reset();
  const total = feed?.count ?? allJobs.length;
  const resultLabel = useMemo(() => {
    const n = visible.length.toLocaleString("en-US");
    const t = total.toLocaleString("en-US");
    const noun = visible.length === 1 ? "role" : "roles";
    if (!f.hasActiveFilters) return `Showing ${n} ${noun}, best fit first`;
    return `Showing ${n} of ${t} ${noun}`;
  }, [visible.length, total, f.hasActiveFilters]);
  const loadedLabel = `Showing ${pageJobs.length.toLocaleString("en-US")} of ${visible.length.toLocaleString("en-US")}`;
  const loading = state === "loading";
  const showStatusFilter = savedOnly || status !== "all";

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <Header total={total} generatedAt={feed?.generated_at ?? null} loading={loading} />

        {!loading && state !== "error" && <StatsStrip jobs={allJobs} />}

        <div className="mt-8">
          <SegmentedControl value={discipline} counts={disciplineCounts} total={disciplineTotal} onChange={f.setDiscipline} />
        </div>

        <div className="mt-5">
          <div className="dod-glass rounded-2xl p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <SearchInput value={search} onChange={f.setSearch} />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <LocationFilterSelect value={location} counts={locationCounts} onChange={f.setLocation} />
                  <DatePostedSelect value={datePosted} onChange={f.setDatePosted} />
                  <SortControl value={sort} onChange={f.setSort} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <FilterChips
                  fitOnly={fitOnly}
                  fitCount={fitCount}
                  hasSalaryOnly={hasSalaryOnly}
                  sponsorOk={sponsorOk}
                  noSponsorCount={noSponsorCount}
                  topOnly={topOnly}
                  topCount={topJobs.length}
                  savedOnly={savedOnly}
                  savedCount={tracker.savedCount}
                  onFit={() => f.setFitOnly(!fitOnly)}
                  onHasSalary={() => f.setHasSalaryOnly(!hasSalaryOnly)}
                  onSponsor={() => f.setSponsorOk(!sponsorOk)}
                  onTop={() => f.setTopOnly(!topOnly)}
                  onSaved={() => f.setSavedOnly(!savedOnly)}
                />
                <CopyLinkButton queryString={f.queryString} />
              </div>

              <div className="border-t border-line pt-3">
                <LevelFilter selected={levels} counts={levelCounts} onToggle={f.toggleLevel} onClear={f.clearLevels} />
              </div>

              <div className="border-t border-line pt-3">
                <WorkTypeFilter value={workMode} counts={workModeCounts} onChange={f.setWorkMode} />
              </div>

              {hasSpecializations && (
                <div className="border-t border-line pt-3">
                  <SpecializationFilter
                    selected={specializations}
                    counts={specializationCounts}
                    onToggle={f.toggleSpecialization}
                    onClear={f.clearSpecializations}
                  />
                </div>
              )}

              {showStatusFilter && (
                <div className="border-t border-line pt-3">
                  <StatusFilterChips value={status} onChange={f.setStatus} />
                </div>
              )}

              {availableSources.length > 0 && (
                <div className="border-t border-line pt-3">
                  <SourceFilter
                    sources={availableSources}
                    counts={sourceCounts}
                    selected={sources}
                    onToggle={(s) => f.toggleSource(s)}
                    onClear={() => f.clearSources()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {!loading && state !== "error" && <FeaturedCompanies jobs={topJobs} />}

        {f.hasActiveFilters && !loading && state !== "error" && (
          <div className="mt-4">
            <ActiveFilters
              discipline={discipline}
              search={search}
              sources={sources}
              location={location}
              workMode={workMode}
              fitOnly={fitOnly}
              hasSalaryOnly={hasSalaryOnly}
              sponsorOk={sponsorOk}
              topOnly={topOnly}
              savedOnly={savedOnly}
              status={status}
              datePosted={datePosted}
              levels={levels}
              specializations={specializations}
              onClearDiscipline={() => f.setDiscipline("all")}
              onClearSearch={() => f.setSearch("")}
              onRemoveSource={(s: Source) => f.toggleSource(s)}
              onClearLocation={() => f.setLocation("all")}
              onClearWorkMode={() => f.setWorkMode("all")}
              onClearFit={() => f.setFitOnly(false)}
              onClearHasSalary={() => f.setHasSalaryOnly(false)}
              onClearSponsor={() => f.setSponsorOk(false)}
              onClearTop={() => f.setTopOnly(false)}
              onClearSaved={() => f.setSavedOnly(false)}
              onClearStatus={() => f.setStatus("all")}
              onClearDatePosted={() => f.setDatePosted("any")}
              onRemoveLevel={(l) => f.toggleLevel(l)}
              onRemoveSpecialization={(k) => f.toggleSpecialization(k)}
              onClearAll={resetAll}
            />
          </div>
        )}

        <div className="mt-5 flex min-h-6 items-center justify-between gap-3">
          <p className="text-sm text-ink/55" aria-live="polite" aria-atomic="true">
            {loading ? "Loading roles…" : state === "error" ? "" : resultLabel}
          </p>
          {f.hasActiveFilters && !loading && state !== "error" && (
            <button
              type="button"
              onClick={resetAll}
              className={clsx(
                "shrink-0 text-xs font-medium text-ink/50 transition-colors hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:rounded"
              )}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="mt-4">
          {loading ? (
            <SkeletonGrid count={6} />
          ) : state === "error" ? (
            <div className="dod-glass flex flex-col items-center justify-center rounded-3xl border-red-300 px-6 py-20 text-center">
              <h3 className="text-base font-semibold text-ink">Couldn’t load the job feed</h3>
              <p className="mt-1 max-w-sm text-sm text-ink/50">The data file didn’t respond. Refresh the page to try again.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl border border-ink/10 bg-ink/[0.06] px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.12]"
              >
                Reload
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="grid grid-cols-1">
              <EmptyState onReset={f.hasActiveFilters ? resetAll : undefined} savedView={savedOnly} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pageJobs.map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} onOpen={openJob} />
                ))}
              </div>
              <LoadMore onMore={showMore} remaining={remaining} loadedLabel={loadedLabel} />
            </>
          )}
        </div>
      </div>

      <SiteFooter total={total} generatedAt={feed?.generated_at ?? null} loading={loading} />
      <JobDetailModal job={selectedJob} onClose={closeJob} />
    </>
  );
}

export function JobsBoard() {
  return (
    <Suspense fallback={<BoardFallback />}>
      <JobsBoardInner />
    </Suspense>
  );
}

function BoardFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="dod-glass dod-shimmer h-[120px] rounded-3xl" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="dod-glass dod-shimmer h-28 rounded-2xl" aria-hidden="true" />
        ))}
      </div>
      <div className="mt-8">
        <SkeletonGrid count={6} />
      </div>
    </div>
  );
}
