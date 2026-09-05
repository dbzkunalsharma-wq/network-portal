"use client";

import { useRelativeTime } from "@/lib/useRelativeTime";
import { RssIcon } from "./icons";

export function SiteFooter({
  total,
  generatedAt,
  loading,
}: {
  total: number;
  generatedAt: string | null;
  loading: boolean;
}) {
  const updated = useRelativeTime(generatedAt);

  return (
    <footer className="mt-auto border-t border-chalk/10 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-chalk/55">
            <span className="font-mono font-semibold text-brand">Network Portal</span>
            <span className="text-chalk/25" aria-hidden="true">·</span>
            <span>Live US Strategy &amp; Ops jobs</span>
            <span className="text-chalk/25" aria-hidden="true">·</span>
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1 text-chalk/55 underline-offset-2 hover:text-chalk hover:underline"
              title="RSS feed of the best-fit roles — paste into any reader or an email digest tool"
            >
              <RssIcon className="h-3.5 w-3.5" />
              RSS of best fits
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-chalk/45">
            <span className="font-medium tabular-nums text-chalk/70">{loading ? "—" : total.toLocaleString("en-US")}</span>
            <span>roles tracked</span>
            {updated && (
              <>
                <span className="text-chalk/25" aria-hidden="true">·</span>
                <span>updated {updated}</span>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-chalk/[0.06] pt-4 text-xs leading-relaxed text-chalk/35">
          <p>
            Aggregated from LinkedIn, SimplyHired (Indeed’s index), Built In, Greenhouse, Lever, Ashby,
            Workday, SmartRecruiters, Amazon Jobs, Google Careers &amp; RemoteOK. Fit scores, visa
            wording and pay are read off each posting deterministically; always confirm on the original.
          </p>
          <p className="mt-1.5">
            Network Portal is an independent jobs aggregator and is not affiliated with, endorsed by, or
            sponsored by any of the listed companies or sources. All trademarks belong to their
            respective owners; links lead to the original postings.
          </p>
        </div>
      </div>
    </footer>
  );
}
