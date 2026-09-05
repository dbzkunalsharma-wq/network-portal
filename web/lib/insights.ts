import { buildCompanies, companySlug } from "./companies";
import {
  DISCIPLINES,
  effectiveTime,
  fitScore,
  hasSalary,
  LEVELS,
  levelOf,
  LOCATION_LABELS,
  locationKey,
  normalizeCompany,
  salaryValue,
  SOURCE_ORDER,
  sponsorshipOf,
} from "./jobs";
import type { LocationKey } from "./jobs";
import type { Level } from "./types";
import type { Discipline, Job, Source } from "./types";

/* ------------------------------------------------------------------ */
/*  Insights — pure deterministic analytics over the jobs feed         */
/* ------------------------------------------------------------------ */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;

export interface SourceCount {
  source: Source;
  count: number;
}

export interface DisciplineCount {
  discipline: Discipline;
  label: string;
  count: number;
}

export interface CityCount {
  key: LocationKey;
  label: string;
  count: number;
}

export interface TrendingCompany {
  slug: string;
  name: string;
  logo: string | null;
  recentCount: number;
  totalCount: number;
}

export interface SalarySlice {
  label: string;
  count: number;
  na: boolean;
  /** Annual USD. */
  median: number;
  p25: number;
  p75: number;
}

export interface SalaryStats {
  count: number;
  total: number;
  coveragePct: number;
  overall: SalarySlice;
  byDiscipline: SalarySlice[];
  byLevel: SalarySlice[];
  byCity: SalarySlice[];
}

export interface Insights {
  total: number;
  newThisWeek: number;
  companies: number;
  sourcesLive: number;
  perSource: SourceCount[];
  perDiscipline: DisciplineCount[];
  topCities: CityCount[];
  salaryCoveragePct: number;
  salary: SalaryStats;
  trendingCompanies: TrendingCompany[];
  /** Roles scoring ≥ 55 (good/strong fit). */
  goodFit: number;
  /** Roles scoring ≥ 75. */
  strongFit: number;
  /** Roles whose posting says it won't sponsor. */
  noSponsor: number;
  /** Roles whose posting says it will sponsor. */
  yesSponsor: number;
  /** Roles in Austin or remote-US. */
  austinOrRemote: number;
}

export const SALARY_MIN_SAMPLE = 3;

function percentile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const idx = (n - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function makeSlice(label: string, values: number[]): SalarySlice {
  const count = values.length;
  if (count < SALARY_MIN_SAMPLE) return { label, count, na: true, median: 0, p25: 0, p75: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    label,
    count,
    na: false,
    median: Math.round(percentile(sorted, 0.5)),
    p25: Math.round(percentile(sorted, 0.25)),
    p75: Math.round(percentile(sorted, 0.75)),
  };
}

/** "$145k" for an annual USD figure; "—" for non-positive. */
export function formatPay(annualUsd: number): string {
  if (!annualUsd || annualUsd <= 0) return "—";
  return `$${Math.round(annualUsd / 1000)}k`;
}

/**
 * Annual USD figure from a normalised pay string — uses the range MIDPOINT so a
 * "$120,000 – $180,000/yr" posting reads as $150k. 0 when nothing parseable.
 */
export function annualPay(salary: string | null | undefined): number {
  if (!salary) return 0;
  const lo = salaryValue(salary);
  if (lo <= 0) return 0;
  const nums = (salary.replace(/,/g, "").match(/\d+(?:\.\d+)?\s?k?/gi) ?? [])
    .map((t) => (/k$/i.test(t.trim()) ? parseFloat(t) * 1000 : parseFloat(t)))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length < 2) return lo;
  const hourly = /\/\s*hr|per hour|an hour|hourly|\/\s*hour/i.test(salary);
  let hi = Math.max(...nums);
  if (hourly) hi *= 2080;
  else if (hi < 1000) hi *= 1000;
  if (hi < lo) return lo;
  return Math.round((lo + hi) / 2);
}

export function computeSalaryStats(jobs: Job[]): SalaryStats {
  const total = jobs.length;
  interface Priced {
    value: number;
    discipline: Discipline;
    level: Level;
    city: LocationKey;
  }
  const priced: Priced[] = [];
  for (const job of jobs) {
    const value = annualPay(job.salary);
    if (value <= 0) continue;
    priced.push({ value, discipline: job.discipline, level: levelOf(job), city: locationKey(job) });
  }
  const count = priced.length;
  const coveragePct = total > 0 ? Math.round((count / total) * 100) : 0;
  const overall = makeSlice("Overall", priced.map((p) => p.value));
  const byDiscipline = DISCIPLINES.map((d) =>
    makeSlice(d.label, priced.filter((p) => p.discipline === d.key).map((p) => p.value))
  );
  const byLevel = LEVELS.map((l) =>
    makeSlice(l.short, priced.filter((p) => p.level === l.key).map((p) => p.value))
  );
  const cityValues = new Map<LocationKey, number[]>();
  for (const p of priced) {
    if (p.city === "other") continue;
    const arr = cityValues.get(p.city);
    if (arr) arr.push(p.value);
    else cityValues.set(p.city, [p.value]);
  }
  const byCity = Array.from(cityValues.entries())
    .map(([key, values]) => makeSlice(LOCATION_LABELS[key], values))
    .filter((s) => !s.na)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en"))
    .slice(0, 6);
  return { count, total, coveragePct, overall, byDiscipline, byLevel, byCity };
}

export function computeInsights(jobs: Job[], now: number = Date.now()): Insights {
  const total = jobs.length;

  let newThisWeek = 0;
  for (const job of jobs) {
    const t = effectiveTime(job);
    if (t > 0 && now - t >= 0 && now - t <= WEEK_MS) newThisWeek += 1;
  }

  const companyKeys = new Set<string>();
  for (const job of jobs) {
    const original = job.company?.trim();
    if (!original) continue;
    const key = normalizeCompany(original) || original.toLowerCase();
    if (key) companyKeys.add(key);
  }
  const companies = companyKeys.size;

  const sourceMap = new Map<Source, number>();
  for (const job of jobs) sourceMap.set(job.source, (sourceMap.get(job.source) ?? 0) + 1);
  const perSource: SourceCount[] = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source, "en"));
  const sourcesLive = perSource.filter((s) => s.count > 0).length;

  const discMap = new Map<Discipline, number>();
  for (const job of jobs) discMap.set(job.discipline, (discMap.get(job.discipline) ?? 0) + 1);
  const perDiscipline: DisciplineCount[] = DISCIPLINES.map((d) => ({
    discipline: d.key,
    label: d.label,
    count: discMap.get(d.key) ?? 0,
  }));

  const cityMap = new Map<LocationKey, number>();
  for (const job of jobs) {
    const key = locationKey(job);
    if (key === "other") continue;
    cityMap.set(key, (cityMap.get(key) ?? 0) + 1);
  }
  const topCities: CityCount[] = Array.from(cityMap.entries())
    .map(([key, count]) => ({ key, label: LOCATION_LABELS[key], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "en"))
    .slice(0, 8);

  const withSalary = jobs.reduce((n, j) => n + (hasSalary(j) ? 1 : 0), 0);
  const salaryCoveragePct = total > 0 ? Math.round((withSalary / total) * 100) : 0;

  const companiesAll = buildCompanies(jobs);
  const recentByKey = new Map<string, number>();
  for (const job of jobs) {
    const original = job.company?.trim();
    if (!original) continue;
    const key = normalizeCompany(original) || original.toLowerCase();
    if (!key) continue;
    const t = effectiveTime(job);
    if (t > 0 && now - t >= 0 && now - t <= FORTNIGHT_MS) {
      recentByKey.set(key, (recentByKey.get(key) ?? 0) + 1);
    }
  }
  const trendingCompanies: TrendingCompany[] = companiesAll
    .map((c) => {
      const key = normalizeCompany(c.name) || c.name.toLowerCase();
      return { slug: c.slug, name: c.name, logo: c.logo, recentCount: recentByKey.get(key) ?? 0, totalCount: c.count };
    })
    .filter((c) => c.recentCount > 0)
    .sort(
      (a, b) =>
        b.recentCount - a.recentCount ||
        b.totalCount - a.totalCount ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    )
    .slice(0, 10);

  let goodFit = 0;
  let strongFit = 0;
  let noSponsor = 0;
  let yesSponsor = 0;
  let austinOrRemote = 0;
  for (const job of jobs) {
    const s = fitScore(job, now).score;
    if (s >= 55) goodFit += 1;
    if (s >= 75) strongFit += 1;
    const sp = sponsorshipOf(job);
    if (sp === "no") noSponsor += 1;
    else if (sp === "yes") yesSponsor += 1;
    const loc = locationKey(job);
    if (loc === "austin" || loc === "remote") austinOrRemote += 1;
  }

  return {
    total,
    newThisWeek,
    companies,
    sourcesLive,
    perSource,
    perDiscipline,
    topCities,
    salaryCoveragePct,
    salary: computeSalaryStats(jobs),
    trendingCompanies,
    goodFit,
    strongFit,
    noSponsor,
    yesSponsor,
    austinOrRemote,
  };
}

/* ------------------------------------------------------------------ */
/*  Source health — uses stats-history snapshots                       */
/* ------------------------------------------------------------------ */

export interface SourceHealthRow {
  source: Source;
  count: number;
  noResults: boolean;
  delta: number | null;
}

export interface SourceHealth {
  latestDate: string | null;
  earliestDate: string | null;
  hasTrend: boolean;
  rows: SourceHealthRow[];
  max: number;
}

export function computeSourceHealth(
  history: { date: string; per_source: Record<string, number> }[]
): SourceHealth {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      latestDate: null,
      earliestDate: null,
      hasTrend: false,
      rows: SOURCE_ORDER.map((source) => ({ source, count: 0, noResults: true, delta: null })),
      max: 1,
    };
  }
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];
  const hasTrend = sorted.length > 1;
  const extra = Object.keys(latest.per_source).filter((s) => !(SOURCE_ORDER as string[]).includes(s));
  const allSources = [...SOURCE_ORDER, ...(extra as Source[])];
  const rows: SourceHealthRow[] = allSources.map((source) => {
    const count = latest.per_source[source] ?? 0;
    const known = (SOURCE_ORDER as string[]).includes(source);
    const delta = hasTrend ? count - (earliest.per_source[source] ?? 0) : null;
    return { source, count, noResults: known && count === 0, delta };
  });
  const max = Math.max(1, ...rows.map((r) => r.count));
  return { latestDate: latest.date, earliestDate: earliest.date, hasTrend, rows, max };
}

export { companySlug };
