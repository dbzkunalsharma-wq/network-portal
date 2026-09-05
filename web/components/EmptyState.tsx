import { BookmarkIcon, EmptyIcon } from "./icons";

export function EmptyState({ onReset, savedView = false }: { onReset?: () => void; savedView?: boolean }) {
  return (
    <div className="dod-glass col-span-full flex flex-col items-center justify-center rounded-3xl px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/10 bg-ink/[0.06]">
        {savedView ? <BookmarkIcon className="h-7 w-7 text-ink/45" /> : <EmptyIcon className="h-7 w-7 text-ink/45" />}
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">
        {savedView ? "No saved roles yet" : "No roles match your filters"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-ink/50">
        {savedView
          ? "Tap the bookmark on any role to save it here for later. Your list is kept on this device."
          : "Try a different discipline, widen the location, or clear the strong-fit toggle. New roles land twice a day."}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-ink/10 bg-ink/[0.06] px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
