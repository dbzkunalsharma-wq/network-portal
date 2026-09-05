"use client";

import clsx from "clsx";
import { sourceLabel } from "@/lib/jobs";
import type { Source } from "@/lib/types";

export function SourceFilter({
  sources,
  counts,
  selected,
  onToggle,
  onClear,
}: {
  /** sources present in the (discipline+search) filtered data, in display order */
  sources: Source[];
  counts: Record<string, number>;
  selected: Set<Source>;
  onToggle: (source: Source) => void;
  onClear: () => void;
}) {
  if (sources.length === 0) return null;

  const allActive = selected.size === 0;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Filter by source"
    >
      <span className="mr-0.5 text-xs font-medium uppercase tracking-wide text-chalk/40">
        Source
      </span>

      <button
        type="button"
        onClick={onClear}
        aria-pressed={allActive}
        className={clsx(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
          allActive
            ? "border-chalk bg-chalk text-ink"
            : "border-line bg-chalk/[0.04] text-chalk/55 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
        )}
      >
        All
      </button>

      {sources.map((src) => {
        const active = selected.has(src);
        return (
          <button
            key={src}
            type="button"
            onClick={() => onToggle(src)}
            aria-pressed={active}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40",
              active
                ? "border-brand bg-brand text-white"
                : "border-line bg-chalk/[0.04] text-chalk/55 hover:border-chalk/25 hover:bg-chalk/[0.08] hover:text-chalk"
            )}
          >
            {sourceLabel(src)}
            <span
              className={clsx(
                "tabular-nums",
                active ? "text-chalk/70" : "text-chalk/35"
              )}
            >
              {counts[src] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
