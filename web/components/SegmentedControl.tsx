"use client";

import clsx from "clsx";
import type { ComponentType, SVGProps } from "react";
import { DISCIPLINES } from "@/lib/jobs";
import type { Discipline } from "@/lib/types";
import { FinanceIcon, GridIcon, GrowthIcon, StratOpsIcon, StrategyIcon } from "./icons";

export type DisciplineFilter = "all" | Discipline;

const ICONS: Record<Discipline, ComponentType<SVGProps<SVGSVGElement>>> = {
  stratops: StratOpsIcon,
  strategy: StrategyIcon,
  growth: GrowthIcon,
  finance: FinanceIcon,
};

/**
 * The centerpiece: a row of flat, solid-color poster cards (one per
 * discipline) that double as the discipline filter. Dark ink card = "All".
 */
export function SegmentedControl({
  value,
  counts,
  total,
  onChange,
}: {
  value: DisciplineFilter;
  counts: Record<Discipline, number>;
  total: number;
  onChange: (value: DisciplineFilter) => void;
}) {
  const allActive = value === "all";
  const base =
    "relative flex flex-col justify-between overflow-hidden rounded-3xl p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-chalk";

  return (
    <div role="group" aria-label="Filter by discipline" className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <button
        type="button"
        aria-pressed={allActive}
        onClick={() => onChange("all")}
        className={clsx(base, "bg-ink text-white", allActive ? "ring-2 ring-ink ring-offset-2 ring-offset-chalk" : "opacity-75 hover:opacity-100")}
      >
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <GridIcon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-3xl font-bold tabular-nums sm:text-4xl">{total.toLocaleString("en-US")}</span>
        </div>
        <div className="mt-3">
          <span className="text-sm font-semibold">All roles</span>
          <span className="mt-0.5 block text-xs opacity-70">Every discipline</span>
        </div>
      </button>

      {DISCIPLINES.map((d) => {
        const active = value === d.key;
        const Icon = ICONS[d.key];
        const count = counts[d.key] ?? 0;
        return (
          <button
            key={d.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(d.key)}
            className={clsx(base, d.card, d.cardText, active ? "ring-2 ring-ink ring-offset-2 ring-offset-chalk" : "opacity-75 hover:opacity-100")}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/10">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-3xl font-bold tabular-nums sm:text-4xl">{count.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-3">
              <span className="text-sm font-semibold">{d.label}</span>
              <span className="mt-0.5 block truncate text-xs opacity-75" title={d.blurb}>
                {d.blurb}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
