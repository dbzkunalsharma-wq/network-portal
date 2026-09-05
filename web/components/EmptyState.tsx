import { BookmarkIcon, EmptyIcon } from "./icons";

export function EmptyState({ onReset, savedView = false }: { onReset?: () => void; savedView?: boolean }) {
  return (
    <div className="pb-glass col-span-full flex flex-col items-center justify-center rounded-3xl px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-chalk/10 bg-chalk/[0.06]">
        {savedView ? <BookmarkIcon className="h-7 w-7 text-chalk/45" /> : <EmptyIcon className="h-7 w-7 text-chalk/45" />}
      </span>
      <h3 className="mt-4 text-base font-semibold text-chalk">
        {savedView ? "No saved roles yet" : "No roles match your filters"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-chalk/50">
        {savedView
          ? "Tap the bookmark on any role to save it here for later. Your list is kept on this device."
          : "Try a different discipline, widen the location, or clear the strong-fit toggle. New roles land twice a day."}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-chalk/10 bg-chalk/[0.06] px-4 py-2 text-sm font-medium text-chalk transition-colors hover:bg-chalk/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk/40"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
