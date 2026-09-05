"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Save + pipeline-status tracking, persisted to localStorage (no backend).
 *
 * A single JSON map keyed by `job.id` lives under `netportal:tracker`. Components
 * subscribe via `useSyncExternalStore`, so any change re-renders every consumer
 * in sync, and across browser tabs via the `storage` event. SSR-safe.
 */

export type JobStatus =
  | "none"
  | "interested"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected";

export interface TrackedEntry {
  saved: boolean;
  status: JobStatus;
}

export type TrackerMap = Record<string, TrackedEntry>;

const STORAGE_KEY = "netportal:tracker";
const EMPTY: TrackerMap = Object.freeze({});

export const STATUS_ORDER: Exclude<JobStatus, "none">[] = [
  "interested",
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

export const STATUS_LABELS: Record<JobStatus, string> = {
  none: "Not tracked",
  interested: "Interested",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

let cache: TrackerMap = EMPTY;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isStatus(v: unknown): v is JobStatus {
  return v === "none" || (STATUS_ORDER as string[]).includes(v as string);
}

function read(): TrackerMap {
  if (!isBrowser()) return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY;
    const out: TrackerMap = {};
    for (const [id, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (!val || typeof val !== "object") continue;
      const v = val as Partial<TrackedEntry>;
      const status = isStatus(v.status) ? v.status : "none";
      const saved = v.saved === true;
      if (saved || status !== "none") out[id] = { saved, status };
    }
    return out;
  } catch {
    return EMPTY;
  }
}

function persist(next: TrackerMap) {
  cache = next;
  if (isBrowser()) {
    try {
      if (Object.keys(next).length === 0) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / privacy mode */
    }
  }
  for (const l of listeners) l();
}

let initialised = false;

function subscribe(listener: () => void): () => void {
  if (!initialised && isBrowser()) {
    cache = read();
    initialised = true;
  }
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = read();
      for (const l of listeners) l();
    }
  };
  if (isBrowser()) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (isBrowser()) window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => cache;
const getServerSnapshot = () => EMPTY;

function setEntry(id: string, patch: Partial<TrackedEntry>) {
  const prev = cache[id] ?? { saved: false, status: "none" as JobStatus };
  const merged: TrackedEntry = { ...prev, ...patch };
  const next = { ...cache };
  if (!merged.saved && merged.status === "none") delete next[id];
  else next[id] = merged;
  persist(next);
}

export interface TrackerApi {
  map: TrackerMap;
  savedCount: number;
  isSaved: (id: string) => boolean;
  statusOf: (id: string) => JobStatus;
  toggleSave: (id: string) => void;
  setStatus: (id: string, status: JobStatus) => void;
}

export function useTracker(): TrackerApi {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isSaved = useCallback((id: string) => map[id]?.saved === true, [map]);
  const statusOf = useCallback((id: string): JobStatus => map[id]?.status ?? "none", [map]);
  const toggleSave = useCallback(
    (id: string) => setEntry(id, { saved: !(cache[id]?.saved === true) }),
    []
  );
  const setStatus = useCallback((id: string, status: JobStatus) => setEntry(id, { status }), []);
  const savedCount = Object.values(map).filter((e) => e.saved).length;
  return { map, savedCount, isSaved, statusOf, toggleSave, setStatus };
}
