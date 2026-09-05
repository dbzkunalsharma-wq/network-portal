import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { PageNav } from "@/components/PageNav";
import { ArrowUpRightIcon } from "@/components/icons";
import { DISCIPLINE_MAP, DISCIPLINES, sourceLabel } from "@/lib/jobs";
import { loadAllJobs, loadStatsHistory } from "@/lib/jobs-data";
import { computeInsights, computeSourceHealth, formatPay, SALARY_MIN_SAMPLE, type SalarySlice } from "@/lib/insights";
import { ogImageUrl } from "@/lib/og";

const OG_IMAGE = ogImageUrl({
  kind: "site",
  title: "US Strategy & Ops hiring insights",
  subtitle: "Trending companies · disciplines · metros · pay · sponsorship",
  tag: "US strategy jobs",
});

export const metadata: Metadata = {
  title: { absolute: "Insights — US Strategy & Ops hiring · DOD US" },
  description:
    "A live snapshot of US Strategy & Operations hiring: total roles, strong fits, what's new this week, trending companies, source health, discipline mix, top metros, visa sponsorship wording and pay — from DOD US's aggregated feed.",
  alternates: { canonical: "/insights" },
  openGraph: {
    type: "website",
    title: "Insights — US Strategy & Ops hiring · DOD US",
    description: "Trends in US Strategy & Ops hiring: trending companies, source health, discipline mix, metros, sponsorship and pay.",
    url: "/insights",
    siteName: "DOD US",
    locale: "en_US",
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Insights — US Strategy & Ops hiring · DOD US", description: "Trends in US Strategy & Ops hiring.", images: [OG_IMAGE] },
};

function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function InsightsPage() {
  const [jobs, history] = await Promise.all([loadAllJobs(), loadStatsHistory()]);
  const insights = computeInsights(jobs);
  const health = computeSourceHealth(history);
  const { salary } = insights;

  const stats = [
    { label: "Total roles", value: insights.total },
    { label: "Strong fits (75+)", value: insights.strongFit },
    { label: "Good fits (55+)", value: insights.goodFit },
    { label: "New this week", value: insights.newThisWeek },
    { label: "Austin or remote", value: insights.austinOrRemote },
    { label: "Companies hiring", value: insights.companies },
    { label: "Say they sponsor", value: insights.yesSponsor },
    { label: "Say no sponsorship", value: insights.noSponsor },
  ];

  const maxDiscipline = Math.max(1, ...insights.perDiscipline.map((d) => d.count));
  const maxCity = Math.max(1, ...insights.topCities.map((c) => c.count));

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <PageNav current="insights" />

        <div className="mt-8">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">US Strategy &amp; Ops hiring — insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/60 sm:text-base">
            A deterministic snapshot from DOD US&rsquo;s aggregated feed across {insights.sourcesLive} live {insights.sourcesLive === 1 ? "source" : "sources"}.
          </p>
        </div>

        <section aria-label="Headline stats" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="dod-glass rounded-2xl p-4 sm:p-5">
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl">{s.value.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink/45">{s.label}</p>
            </div>
          ))}
        </section>

        {insights.trendingCompanies.length > 0 && (
          <section aria-labelledby="trending-h" className="mt-8">
            <h2 id="trending-h" className="text-sm font-medium uppercase tracking-wide text-ink/45">Trending companies</h2>
            <p className="mt-1 text-xs text-ink/45">Most new roles in the last 14 days.</p>
            <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {insights.trendingCompanies.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/companies/${c.slug}`}
                    className={clsx(
                      "dod-glass group flex items-center gap-3 rounded-2xl p-3.5 transition-all duration-200",
                      "hover:-translate-y-0.5 hover:bg-ink/[0.09]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-chalk"
                    )}
                  >
                    <CompanyAvatar company={c.name} logo={c.logo} discipline="stratops" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                      <p className="text-xs tabular-nums text-ink/55">
                        {c.totalCount} {c.totalCount === 1 ? "role" : "roles"}
                        <span className="text-emerald-700"> · {c.recentCount} new in 14d</span>
                      </p>
                    </div>
                    <ArrowUpRightIcon className="h-4 w-4 shrink-0 text-ink/35 transition-colors group-hover:text-ink/70" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="source-h" className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="source-h" className="text-sm font-medium uppercase tracking-wide text-ink/45">Source health</h2>
            {health.latestDate && <span className="text-xs text-ink/40">Latest run {shortDate(health.latestDate)}</span>}
          </div>
          <div className="dod-glass mt-3 rounded-2xl p-4 sm:p-5">
            <ul className="flex flex-col gap-3.5">
              {health.rows.map((row) => {
                const pct = Math.round((row.count / health.max) * 100);
                return (
                  <li key={row.source}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink/80">{sourceLabel(row.source)}</span>
                        {row.noResults && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-300">
                            no results in latest run
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-semibold text-ink">{row.count.toLocaleString("en-US")}</span>
                        {row.delta !== null && row.delta !== 0 && (
                          <span className={clsx("text-xs", row.delta > 0 ? "text-emerald-700" : "text-rose-700")}>
                            {row.delta > 0 ? "↑" : "↓"} {Math.abs(row.delta).toLocaleString("en-US")}
                            {health.earliestDate ? ` since ${shortDate(health.earliestDate)}` : ""}
                          </span>
                        )}
                        {!health.hasTrend && health.latestDate && <span className="text-xs text-ink/40">tracking since {shortDate(health.latestDate)}</span>}
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]" role="presentation">
                      <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="disc-h">
            <h2 id="disc-h" className="text-sm font-medium uppercase tracking-wide text-ink/45">Disciplines</h2>
            <div className="dod-glass mt-3 rounded-2xl p-4 sm:p-5">
              <ul className="flex flex-col gap-3.5">
                {insights.perDiscipline.map((d) => {
                  const meta = DISCIPLINE_MAP[d.discipline];
                  const pct = Math.round((d.count / maxDiscipline) * 100);
                  return (
                    <li key={d.discipline}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink/80">
                          <span className={clsx("h-2 w-2 rounded-full", meta.dot)} />
                          {d.label}
                        </span>
                        <span className="font-semibold tabular-nums text-ink">{d.count.toLocaleString("en-US")}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                        <div className={clsx("h-full rounded-full", meta.topLine)} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section aria-labelledby="cities-h">
            <h2 id="cities-h" className="text-sm font-medium uppercase tracking-wide text-ink/45">Top metros</h2>
            <div className="dod-glass mt-3 rounded-2xl p-4 sm:p-5">
              {insights.topCities.length > 0 ? (
                <ul className="flex flex-col gap-3.5">
                  {insights.topCities.map((c) => {
                    const pct = Math.round((c.count / maxCity) * 100);
                    return (
                      <li key={c.key}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-ink/80">{c.label}</span>
                          <span className="font-semibold tabular-nums text-ink">{c.count.toLocaleString("en-US")}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink/50">No metro data available yet.</p>
              )}
            </div>

            <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-ink/45">Pay transparency</h2>
            <div className="dod-glass mt-3 rounded-2xl p-4 sm:p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-ink/60">Roles listing a pay range</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{insights.salaryCoveragePct}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${insights.salaryCoveragePct}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink/45">
                Many US states (CA, NY, CO, WA, IL) require pay ranges in postings, so coverage is high where those laws apply.
              </p>
            </div>
          </section>
        </div>

        {salary.count >= SALARY_MIN_SAMPLE && !salary.overall.na && (
          <section aria-labelledby="salary-h" className="mt-8">
            <h2 id="salary-h" className="text-sm font-medium uppercase tracking-wide text-ink/45">Pay snapshot</h2>
            <p className="mt-1 max-w-3xl text-xs text-ink/45">
              Based on the {salary.count.toLocaleString("en-US")} roles (~{salary.coveragePct}%) that disclose a base pay range. Uses the midpoint of each range, annual USD, base only (no bonus or equity).
            </p>
            <div className="dod-glass mt-3 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/45">Median base pay</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">{formatPay(salary.overall.median)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink/45">Typical range (p25–p75)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-ink/85">
                    {formatPay(salary.overall.p25)}
                    <span className="px-1.5 text-ink/40">–</span>
                    {formatPay(salary.overall.p75)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SalaryBreakdown title="By discipline" slices={salary.byDiscipline} dots={DISCIPLINES.map((d) => d.dot)} />
              <SalaryBreakdown title="By level" slices={salary.byLevel} />
              <SalaryBreakdown title="By metro" slices={salary.byCity} emptyHint="Not enough disclosed pay by metro yet." />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SalaryBreakdown({
  title,
  slices,
  dots,
  emptyHint = "Not enough disclosed pay yet.",
}: {
  title: string;
  slices: SalarySlice[];
  dots?: string[];
  emptyHint?: string;
}) {
  const shown = slices.map((slice, i) => ({ slice, dot: dots?.[i] })).filter(({ slice }) => !slice.na);
  const maxMedian = Math.max(1, ...shown.map(({ slice }) => slice.median));
  return (
    <section aria-label={title}>
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink/45">{title}</h3>
      <div className="dod-glass mt-3 rounded-2xl p-4 sm:p-5">
        {shown.length > 0 ? (
          <ul className="flex flex-col gap-3.5">
            {shown.map(({ slice, dot }) => {
              const pct = Math.round((slice.median / maxMedian) * 100);
              return (
                <li key={slice.label}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium text-ink/80">
                      {dot && <span className={clsx("h-2 w-2 shrink-0 rounded-full", dot)} />}
                      {slice.label}
                      <span className="tabular-nums text-ink/40">({slice.count})</span>
                    </span>
                    <span className="font-semibold tabular-nums text-ink" title={`p25 ${formatPay(slice.p25)} · p75 ${formatPay(slice.p75)}`}>
                      {formatPay(slice.median)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink/50">{emptyHint}</p>
        )}
      </div>
    </section>
  );
}
