"use client";

import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_PROFILE, type Profile } from "./jobs";

/**
 * The job-seeker's own details (name, one-line headline, LinkedIn URL), kept in
 * localStorage under `dodus:profile` and fed into every outreach template so
 * copy-paste notes come out personalised. Never leaves the browser.
 */

const STORAGE_KEY = "dodus:profile";

let cache: Profile = EMPTY_PROFILE;
let initialised = false;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read(): Profile {
  if (!isBrowser()) return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const p = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof p.name === "string" ? p.name : "",
      headline: typeof p.headline === "string" ? p.headline : "",
      linkedin: typeof p.linkedin === "string" ? p.linkedin : "",
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

function persist(next: Profile) {
  cache = next;
  if (isBrowser()) {
    try {
      if (!next.name && !next.headline && !next.linkedin) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  for (const l of listeners) l();
}

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
const getServerSnapshot = () => EMPTY_PROFILE;

export function useProfile(): { profile: Profile; setProfile: (p: Partial<Profile>) => void } {
  const profile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setProfile = useCallback((p: Partial<Profile>) => persist({ ...cache, ...p }), []);
  return { profile, setProfile };
}
