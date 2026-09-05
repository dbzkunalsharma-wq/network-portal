"use client";

import clsx from "clsx";
import { CloseIcon, SearchIcon } from "./icons";

export function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search title, company or city…"
        aria-label="Search jobs"
        className={clsx(
          "w-full rounded-2xl border border-line bg-ink/[0.06] py-3 pl-10 pr-10 text-sm text-ink placeholder:text-ink/40",
          " transition-colors duration-200",
          "hover:border-ink/25 focus:border-violet-300 focus:bg-ink/[0.09]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
          // hide the native search clear control; we render our own
          "[&::-webkit-search-cancel-button]:appearance-none"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink/45 transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
