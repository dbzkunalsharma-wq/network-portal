import Link from "next/link";
import { BrandMark } from "./BrandMark";

const TAGLINE = "US Strategy & Ops jobs, scored for you";

/** Compact shared sub-nav for the secondary SSG pages. */
export function PageNav({ current }: { current?: "companies" | "insights" | "network" }) {
  return (
    <header className="pb-glass relative overflow-hidden rounded-3xl px-5 py-4 sm:px-7 sm:py-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Network Portal — home"
          className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
        >
          <BrandMark className="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="text-lg font-bold tracking-tight text-chalk">Network<span className="font-medium text-brand"> Portal</span></span>
          <span className="hidden h-6 w-px bg-chalk/15 sm:block" />
          <span className="hidden text-sm text-chalk/60 sm:block">{TAGLINE}</span>
          <span className="sr-only">Network Portal — {TAGLINE}</span>
        </Link>

        <nav aria-label="Sections" className="flex items-center gap-1.5 text-sm">
          <NavLink href="/companies" active={current === "companies"}>Companies</NavLink>
          <NavLink href="/insights" active={current === "insights"}>Insights</NavLink>
          <NavLink href="/network" active={current === "network"}>Network</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full border border-chalk bg-chalk/15 px-3 py-1.5 font-medium text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
          : "rounded-full border border-line bg-chalk/[0.04] px-3 py-1.5 font-medium text-chalk/60 transition-colors hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
      }
    >
      {children}
    </Link>
  );
}
