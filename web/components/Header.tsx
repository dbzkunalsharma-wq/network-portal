"use client";

import Link from "next/link";
import { useRelativeTime } from "@/lib/useRelativeTime";
import { BrandMark } from "./BrandMark";

export const TAGLINE = "US Strategy & Ops jobs, scored for you";

export function Header({
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
    <header className="pb-glass relative overflow-hidden rounded-3xl px-5 py-5 sm:px-7 sm:py-6">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-2" aria-label="Network Portal">
              <BrandMark className="h-10 w-10 sm:h-11 sm:w-11" />
              <span className="text-lg font-bold tracking-tight text-chalk">Network<span className="font-medium text-brand"> Portal</span></span>
              <span className="sr-only">Network Portal</span>
            </h1>
            <span className="hidden h-6 w-px bg-chalk/15 sm:block" />
            <p className="hidden text-sm text-chalk/60 sm:block">{TAGLINE}</p>
          </div>
          <p className="mt-1 text-sm text-chalk/60 sm:hidden">{TAGLINE}</p>
        </div>

        <div className="flex flex-col items-start gap-2.5 sm:items-end">
          <nav aria-label="Sections" className="flex items-center gap-1.5 text-sm">
            <NavPill href="/companies">Companies</NavPill>
            <NavPill href="/insights">Insights</NavPill>
            <NavPill href="/network">Network</NavPill>
          </nav>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-chalk/[0.06] px-3 py-1.5 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="pb-live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-semibold tabular-nums text-chalk">{loading ? "—" : total.toLocaleString("en-US")}</span>
              <span className="text-chalk/55">open roles</span>
            </div>
            <p className="text-xs text-chalk/45">{loading ? "Loading…" : updated ? `Updated ${updated}` : "Live feed"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-line bg-chalk/[0.04] px-3 py-1.5 font-medium text-chalk/60 transition-colors hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
    >
      {children}
    </Link>
  );
}
