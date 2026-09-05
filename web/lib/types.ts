export type Discipline = "stratops" | "strategy" | "growth" | "finance";

export type Source =
  | "linkedin"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters"
  | "workday"
  | "amazon"
  | "google"
  | "builtin"
  | "simplyhired"
  | "wellfound"
  | "remoteok";

/** Visa / work-authorization signal read off the full posting at ingest. */
export type Sponsorship = "yes" | "no" | "unknown";

/** Seniority tier read off the title (+ years-of-experience wording). */
export type Level = "analyst" | "manager" | "senior" | "director";

/** Structured work mode when the source exposed one. */
export type WorkModeRaw = "remote" | "hybrid" | "onsite";

export interface Job {
  id: string;
  source: Source;
  discipline: Discipline;
  title: string;
  /** May be null in the feed — always guard. */
  company: string | null;
  /** May be null in the feed — always guard. */
  location: string | null;
  url: string;
  contact: string | null;
  posted_at: string | null;
  /** Direct company-logo URL when known; null → fall back to favicon/initials. */
  logo: string | null;
  /** Role description, trimmed at ingest (~1.6k chars). */
  description?: string | null;
  /** Normalised USD pay string ("$120,000 – $150,000/yr") when disclosed. */
  salary: string | null;
  seen_at: string;
  /** Visa sponsorship signal ("no" = the posting says it won't sponsor). */
  sponsorship?: Sponsorship | null;
  /** Seniority tier from the pipeline (title + years wording). */
  level?: Level | null;
  /** Work mode from the source's structured field, when it had one. */
  work_mode?: WorkModeRaw | null;
  /** Resume-keyword tag keys the FULL description hit (see TAG_LABELS). */
  tags?: string[];
}

export interface JobsFeed {
  generated_at: string;
  count: number;
  jobs: Job[];
}

/** One daily snapshot row in public/stats-history.json. */
export interface StatsSnapshot {
  /** "YYYY-MM-DD" */
  date: string;
  total: number;
  per_source: Record<string, number>;
  per_discipline: Record<string, number>;
}

/**
 * One company in the GROWING networking ledger (public/companies-ledger.json).
 * `domain` is ALREADY MX-verified at ingest time.
 */
export interface LedgerEntry {
  name: string;
  first_seen: string;
  last_seen: string;
  days_seen: number;
  open_roles: number;
  disciplines: Discipline[];
  locations: string[];
  logo?: string | null;
  posted_emails: string[];
  posted_phones: string[];
  domain: string | null;
  verified_on?: string;
}

export type CompanyLedger = Record<string, LedgerEntry>;
