"use client";

import Link from "next/link";
import { useMemo } from "react";
import { effectiveTime, fitScore, locationKey, normalizeCompany } from "@/lib/jobs";
import type { Job } from "@/lib/types";
import { useNow } from "@/lib/useRelativeTime";
import { ArrowUpRightIcon } from "./icons";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Thin glass strip under the header: roles · companies · strong fits ·
 * Austin/remote · new this week, linking to /insights.
 */
export function StatsStrip({ jobs }: { jobs: Job[] }) {
  const now = useNow();

  const { total, companies, strong, austinRemote } = useMemo(() => {
    const companyKeys = new Set<string>();
    let strong = 0;
    let austinRemote = 0;
    for (const job of jobs) {
      const original = job.company?.trim();
      if (original) {
        const key = normalizeCompany(original) || original.toLowerCase();
        if (key) companyKeys.add(key);
      }
      if (fitScore(job).score >= 75) strong += 1;
      const loc = locationKey(job);
      if (loc === "austin" || loc === "remote") austinRemote += 1;
    }
    return { total: jobs.length, companies: companyKeys.size, strong, austinRemote };
  }, [jobs]);

  const newThisWeek = useMemo(() => {
    if (now === null) return null;
    let fresh = 0;
    for (const job of jobs) {
      const t = effectiveTime(job);
      if (t > 0 && now - t >= 0 && now - t <= WEEK_MS) fresh += 1;
    }
    return fresh;
  }, [jobs, now]);

  if (total === 0) return null;

  return (
    <Link
      href="/insights"
      className="dod-glass group mt-4 flex items-center justify-between gap-3 rounded-full px-4 py-2.5 transition-colors duration-200 hover:bg-ink/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
      aria-label="View hiring insights"
    >
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink/60 sm:text-sm">
        <span className="font-semibold tabular-nums text-ink">{total.toLocaleString("en-US")}</span> roles
        <span className="text-ink/25" aria-hidden="true">·</span>
        <span className="font-semibold tabular-nums text-ink">{companies.toLocaleString("en-US")}</span> companies
        <span className="text-ink/25" aria-hidden="true">·</span>
        <span className="font-semibold tabular-nums text-emerald-700">{strong.toLocaleString("en-US")}</span> strong fits
        <span className="text-ink/25" aria-hidden="true">·</span>
        <span className="font-semibold tabular-nums text-ink">{austinRemote.toLocaleString("en-US")}</span> Austin or remote
        <span className="text-ink/25" aria-hidden="true">·</span>
        <span className="font-semibold tabular-nums text-ink">{newThisWeek === null ? "—" : newThisWeek.toLocaleString("en-US")}</span> new this week
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink/55 transition-colors group-hover:text-ink">
        Insights
        <ArrowUpRightIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  );
}
