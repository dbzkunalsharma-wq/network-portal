import type { Discipline, Job, Level, Source, Sponsorship } from "./types";

/* ------------------------------------------------------------------ */
/*  Discipline metadata                                                */
/* ------------------------------------------------------------------ */

export interface DisciplineMeta {
  key: Discipline;
  label: string;
  /** One-line description shown on the hero card. */
  blurb: string;
  /** Tailwind class fragments — written as literals so v4 can detect them. */
  dot: string; // small accent dot
  text: string; // accent text colour
  badge: string; // discipline badge (tint bg + dark text + ring)
  glow: string; // (unused in flat mode — kept for API compatibility)
  gradient: string; // SOLID fill used for hover states / apply buttons
  topLine: string; // SOLID accent line on cards / bars
  ring: string; // active ring tint
  glowShadow: string; // (unused in flat mode)
  hoverGlow: string; // card hover border tint
  avatarTint: string; // tinted circle behind initials
  card: string; // hero poster-card fill
  cardText: string; // text colour on the poster card
}

export const DISCIPLINES: DisciplineMeta[] = [
  {
    key: "stratops",
    label: "Strategy & Ops",
    blurb: "S&O · BizOps · marketplace & city ops",
    dot: "bg-brand",
    text: "text-brand",
    badge: "bg-[#EDE5FF] text-[#4B1FB3] ring-[#C9B6FF]",
    glow: "",
    gradient: "bg-brand",
    topLine: "bg-brand",
    ring: "ring-brand",
    glowShadow: "",
    hoverGlow: "hover:border-brand",
    avatarTint: "bg-[#EDE5FF] text-[#4B1FB3]",
    card: "bg-brand",
    cardText: "text-white",
  },
  {
    key: "strategy",
    label: "Corporate Strategy",
    blurb: "Strategy · planning · chief of staff",
    dot: "bg-[#7EA6FF]",
    text: "text-[#0B2A8A]",
    badge: "bg-[#E1EAFF] text-[#0B2A8A] ring-[#B7CBFF]",
    glow: "",
    gradient: "bg-[#7EA6FF]",
    topLine: "bg-[#7EA6FF]",
    ring: "ring-[#7EA6FF]",
    glowShadow: "",
    hoverGlow: "hover:border-[#7EA6FF]",
    avatarTint: "bg-[#E1EAFF] text-[#0B2A8A]",
    card: "bg-[#7EA6FF]",
    cardText: "text-[#0B2A8A]",
  },
  {
    key: "growth",
    label: "Growth & Pricing",
    blurb: "Growth · pricing · retention · expansion",
    dot: "bg-[#22C36B]",
    text: "text-[#0F6B3A]",
    badge: "bg-[#DDF7E8] text-[#0F6B3A] ring-[#9FE3BE]",
    glow: "",
    gradient: "bg-[#22C36B]",
    topLine: "bg-[#22C36B]",
    ring: "ring-[#22C36B]",
    glowShadow: "",
    hoverGlow: "hover:border-[#22C36B]",
    avatarTint: "bg-[#DDF7E8] text-[#0F6B3A]",
    card: "bg-[#22C36B]",
    cardText: "text-[#003D14]",
  },
  {
    key: "finance",
    label: "Strategic Finance",
    blurb: "FP&A · capital allocation · RevOps · analytics",
    dot: "bg-[#FFD43A]",
    text: "text-[#7A5400]",
    badge: "bg-[#FFF3C4] text-[#7A5400] ring-[#FFE28A]",
    glow: "",
    gradient: "bg-[#FFD43A]",
    topLine: "bg-[#FFD43A]",
    ring: "ring-[#FFD43A]",
    glowShadow: "",
    hoverGlow: "hover:border-[#FFD43A]",
    avatarTint: "bg-[#FFF3C4] text-[#7A5400]",
    card: "bg-[#FFD43A]",
    cardText: "text-[#5A3E00]",
  },
];

export const DISCIPLINE_MAP: Record<Discipline, DisciplineMeta> =
  Object.fromEntries(DISCIPLINES.map((d) => [d.key, d])) as Record<
    Discipline,
    DisciplineMeta
  >;

/* ------------------------------------------------------------------ */
/*  Source metadata                                                    */
/* ------------------------------------------------------------------ */

export const SOURCE_LABELS: Record<Source, string> = {
  linkedin: "LinkedIn",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  workday: "Workday",
  amazon: "Amazon Jobs",
  google: "Google Careers",
  builtin: "Built In",
  simplyhired: "SimplyHired",
  wellfound: "Wellfound",
  remoteok: "RemoteOK",
};

/** Stable display order for source chips (biggest US sources first). */
export const SOURCE_ORDER: Source[] = [
  "linkedin",
  "simplyhired",
  "builtin",
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "amazon",
  "google",
  "smartrecruiters",
  "wellfound",
  "remoteok",
];

export function sourceLabel(source: string): string {
  return (SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

/** Route slug for a job id (":" → "~", an unreserved, filename-safe char). */
export function jobSlug(id: string): string {
  return id.replace(/:/g, "~");
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

export function effectiveTime(job: Job): number {
  const raw = job.posted_at ?? job.seen_at;
  const ms = parseLoose(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

function parseLoose(value: string | null | undefined): number {
  if (!value) return NaN;
  const normalised = value.includes(" ") ? value.replace(" ", "T") : value;
  return new Date(normalised).getTime();
}

export function relativeTime(
  value: string | null | undefined,
  now: number = Date.now()
): string {
  const ms = parseLoose(value);
  if (Number.isNaN(ms)) return "—";
  const diff = now - ms;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 45) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Real posting age for the card meta; "Recently" when the source had no date. */
export function postedAgo(job: Job, now: number = Date.now()): string {
  return job.posted_at ? relativeTime(job.posted_at, now) : "Recently";
}

export function withinDays(job: Job, days: number, now: number = Date.now()): boolean {
  const t = effectiveTime(job);
  if (t === 0) return false;
  const diff = now - t;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

/* ------------------------------------------------------------------ */
/*  Company identity helpers                                           */
/* ------------------------------------------------------------------ */

export function companyInitials(company: string | null | undefined): string {
  if (!company) return "?";
  const cleaned = company
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim();
  if (!cleaned) return "?";
  const skip = new Set([
    "the", "inc", "llc", "co", "corp", "company", "corporation", "technologies",
    "technology", "labs", "group", "holdings", "usa",
  ]);
  const words = cleaned.split(/\s+/).filter((w) => w && !skip.has(w.toLowerCase()));
  const pick = words.length > 0 ? words : cleaned.split(/\s+/);
  const letters = pick.slice(0, 2).map((w) => [...w][0]).join("");
  return (letters || [...cleaned][0] || "?").toUpperCase().slice(0, 2);
}

export function guessDomain(company: string | null | undefined): string | null {
  if (!company) return null;
  const slug = company
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(inc|incorporated|llc|corp|corporation|co|company|ltd|limited|the|usa)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
  if (slug.length < 2) return null;
  return `${slug}.com`;
}

export function faviconUrl(company: string | null | undefined, size = 64): string | null {
  const domain = guessDomain(company);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
}

/* ------------------------------------------------------------------ */
/*  Top companies — curated US employers for this profile              */
/* ------------------------------------------------------------------ */

export const TOP_COMPANIES: string[] = [
  // marketplaces / delivery / mobility (the home turf)
  "Uber", "DoorDash", "Instacart", "Lyft", "Airbnb", "Gopuff", "Grubhub", "Turo", "Rover",
  "Thumbtack", "TaskRabbit", "Zipline", "Waymo", "Nuro", "Via", "Bird", "Lime", "Flexport",
  "Instawork", "Faire", "Whatnot", "Carvana", "StockX", "Poshmark", "Etsy", "eBay", "Wayfair",
  "Chewy", "Amazon", "Walmart", "Target", "Costco", "H-E-B", "Whole Foods Market", "Favor",
  "Expedia", "Booking.com", "Vrbo", "Hopper", "Sonder", "Vacasa", "Zillow", "Redfin", "Opendoor",
  "Sweetgreen", "Cava", "Starbucks", "Nike", "Peloton", "Whoop", "Oura",
  // fintech
  "Stripe", "Block", "Square", "Cash App", "PayPal", "Visa", "Mastercard", "American Express",
  "Capital One", "Chime", "Brex", "Ramp", "Affirm", "Klarna", "Robinhood", "Coinbase", "Plaid",
  "SoFi", "Upstart", "Mercury", "Carta", "Adyen", "Wise", "Intuit", "Kalshi", "Polymarket",
  // big tech / AI
  "Google", "Meta", "Apple", "Microsoft", "Netflix", "Salesforce", "Oracle", "Adobe", "Nvidia",
  "Tesla", "SpaceX", "OpenAI", "Anthropic", "Scale AI", "Perplexity", "Cursor", "Sierra",
  "Harvey", "ElevenLabs", "Cohere", "Databricks", "Snowflake", "MongoDB", "Datadog", "Cloudflare",
  "Okta", "GitLab", "Vercel", "Figma", "Notion", "Linear", "Asana", "Airtable", "Webflow",
  "Zapier", "Calendly", "Lattice", "Amplitude", "Klaviyo", "Toast", "Gusto", "Rippling",
  "Navan", "Twilio", "Dropbox", "Pinterest", "Reddit", "Discord", "Twitch", "Roblox", "Spotify",
  "Canva", "Duolingo", "Coursera", "Udemy", "Samsara", "Verkada", "Anduril", "Workday",
  "ServiceNow", "Atlassian", "Indeed", "Bumble", "Dell", "AMD", "Cisco", "IBM", "Zoom",
  // consulting / finance houses that hire strategy talent
  "McKinsey & Company", "Boston Consulting Group", "Bain & Company", "Deloitte", "Accenture",
  "EY", "PwC", "KPMG", "Goldman Sachs", "JPMorgan Chase", "Morgan Stanley", "BlackRock",
  // healthtech / consumer
  "Oscar Health", "Ro", "Hims & Hers", "Calm", "Headspace", "Strava", "Nextdoor", "Yelp",
  "Glossier", "Warby Parker", "Allbirds", "FanDuel", "DraftKings",
];

export function normalizeCompany(company: string): string {
  const skip = new Set([
    "inc", "incorporated", "llc", "corp", "corporation", "co", "company", "ltd", "limited",
    "technologies", "technology", "tech", "labs", "lab", "usa", "us", "global", "solutions",
    "systems", "the", "group", "holdings", "services", "international", "north", "america", "com",
  ]);
  return company
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !skip.has(w))
    .join(" ")
    .trim();
}

/** Short / ambiguous tokens that must match by EXACT equality only. */
const AMBIGUOUS_TOKENS = new Set<string>([
  "meta", "block", "square", "bird", "via", "ro", "calm", "target", "toast", "linear", "cursor",
  "sierra", "harvey", "mercury", "notion", "oura", "wise", "lime", "faire", "carta", "ramp",
  "brex", "chime", "affirm", "plaid", "upstart", "strava", "yelp", "asana", "okta", "ey",
  "amazon", "apple", "google", "nike", "cava", "via",
]);

const TOP_COMPANY_DENYLIST = new Set<string>(["amazon filters", "digital apple"]);

const TOP_COMPANY_LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const name of TOP_COMPANIES) {
    const key = normalizeCompany(name);
    if (key) m.set(key, name);
  }
  return m;
})();

export function topCompanyName(company: string | null): string | null {
  if (!company) return null;
  const cleaned = normalizeCompany(company);
  if (!cleaned) return null;
  const exact = TOP_COMPANY_LOOKUP.get(cleaned);
  if (exact) return exact;
  if (TOP_COMPANY_DENYLIST.has(cleaned)) return null;
  let best: string | null = null;
  let bestLen = 0;
  for (const [token, name] of TOP_COMPANY_LOOKUP) {
    if (token.length <= bestLen) continue;
    if (AMBIGUOUS_TOKENS.has(token)) continue;
    if (cleaned === token || cleaned.startsWith(`${token} `)) {
      best = name;
      bestLen = token.length;
    }
  }
  return best;
}

export function isTopCompany(company: string | null): boolean {
  return topCompanyName(company) !== null;
}

const ELITE_COMPANY_NAMES: string[] = [
  "Uber", "DoorDash", "Instacart", "Lyft", "Airbnb", "Amazon", "Google", "Meta", "Apple",
  "Microsoft", "Netflix", "Stripe", "OpenAI", "Anthropic", "Salesforce", "Nvidia", "Figma",
  "Block", "PayPal", "Capital One", "Coinbase", "Robinhood", "Tesla", "SpaceX", "Databricks",
  "McKinsey & Company", "Boston Consulting Group", "Bain & Company",
];

export const ELITE_COMPANIES: Set<string> = new Set(
  ELITE_COMPANY_NAMES.map((n) => normalizeCompany(n)).filter(Boolean)
);

export function reputationTier(company: string | null): number {
  if (!company) return 0;
  const cleaned = normalizeCompany(company);
  if (cleaned && ELITE_COMPANIES.has(cleaned)) return 2;
  return isTopCompany(company) ? 1 : 0;
}

export function isRecentJob(job: Job, days = 30): boolean {
  const t = effectiveTime(job);
  if (t === 0) return false;
  const diff = Date.now() - t;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

/* ------------------------------------------------------------------ */
/*  Contact helpers                                                    */
/* ------------------------------------------------------------------ */

export function contactHref(contact: string): string | null {
  const c = contact.trim();
  if (isEmailContact(c)) return `mailto:${c}`;
  if (isPhoneContact(c)) return `tel:${c.replace(/[^\d+]/g, "")}`;
  if (/^https?:\/\//i.test(c)) return c;
  return null;
}

export function isPhoneContact(contact: string | null | undefined): boolean {
  if (!contact) return false;
  const c = contact.trim();
  if (c.includes("@")) return false;
  const digits = c.replace(/[^\d]/g, "");
  return digits.length >= 10 && /^[+\d(][\d\s().+-]+$/.test(c);
}

export function isEmailContact(contact: string | null | undefined): boolean {
  if (!contact) return false;
  const c = contact.trim();
  return c.includes("@") && c.includes(".") && !c.startsWith("@");
}

/* ------------------------------------------------------------------ */
/*  Seniority level — Analyst / Manager / Senior Manager / Director+   */
/* ------------------------------------------------------------------ */

export interface LevelMeta {
  key: Level;
  label: string;
  short: string;
}

export const LEVELS: LevelMeta[] = [
  { key: "analyst", label: "Analyst / Associate", short: "Analyst" },
  { key: "manager", label: "Manager", short: "Manager" },
  { key: "senior", label: "Senior Manager / Lead", short: "Senior" },
  { key: "director", label: "Director+", short: "Director+" },
];

export const LEVEL_LABELS: Record<Level, string> = Object.fromEntries(
  LEVELS.map((l) => [l.key, l.label])
) as Record<Level, string>;

const DIRECTOR_RE = /\b(director|vp|vice president|svp|evp|head of|chief (?!of staff)|president|partner|general manager|gm)\b/i;
const SENIOR_RE = /\b(senior manager|sr\.? manager|senior mgr|sr\.? mgr|group manager|principal|(?<!of )staff|senior lead|sr\.? lead|manager ii|manager iii|lead)\b/i;
const SR_WORD_RE = /\b(senior|sr\.?)\b/i;
const MANAGER_RE = /\b(manager|mgr|chief of staff)\b/i;
const ANALYST_RE = /\b(analyst|associate|specialist|coordinator|consultant)\b/i;

/** Seniority tier: the pipeline's value when present, else derived from the title. */
export function levelOf(job: Job): Level {
  if (job.level === "analyst" || job.level === "manager" || job.level === "senior" || job.level === "director") {
    return job.level;
  }
  const t = job.title ?? "";
  if (DIRECTOR_RE.test(t)) return "director";
  if (SENIOR_RE.test(t) || (SR_WORD_RE.test(t) && MANAGER_RE.test(t))) return "senior";
  if (MANAGER_RE.test(t)) return "manager";
  if (ANALYST_RE.test(t)) return "analyst";
  return "manager";
}

/* ------------------------------------------------------------------ */
/*  Specialization — the role-type depth within a discipline           */
/* ------------------------------------------------------------------ */

export type Specialization =
  | "stratops"
  | "bizops"
  | "chief-of-staff"
  | "corp-strategy"
  | "growth"
  | "pricing"
  | "marketplace"
  | "expansion"
  | "strategic-finance"
  | "revops"
  | "sales-strategy"
  | "product-ops"
  | "analytics"
  | "transformation"
  | "generalist";

export interface SpecializationMeta {
  key: Specialization;
  label: string;
}

export const SPECIALIZATIONS: SpecializationMeta[] = [
  { key: "stratops", label: "Strategy & Operations" },
  { key: "bizops", label: "Business Operations" },
  { key: "chief-of-staff", label: "Chief of Staff" },
  { key: "corp-strategy", label: "Corporate Strategy" },
  { key: "marketplace", label: "Marketplace" },
  { key: "pricing", label: "Pricing & Monetization" },
  { key: "growth", label: "Growth & Retention" },
  { key: "expansion", label: "Launch & Expansion" },
  { key: "strategic-finance", label: "Strategic Finance / FP&A" },
  { key: "revops", label: "Revenue Operations" },
  { key: "sales-strategy", label: "Sales Strategy & Ops" },
  { key: "product-ops", label: "Product Operations" },
  { key: "analytics", label: "Analytics & Insights" },
  { key: "transformation", label: "Transformation" },
  { key: "generalist", label: "Generalist" },
];

export const SPECIALIZATION_LABELS: Record<Specialization, string> =
  Object.fromEntries(SPECIALIZATIONS.map((s) => [s.key, s.label])) as Record<
    Specialization,
    string
  >;

const SPECIALIZATION_RULES: { key: Exclude<Specialization, "generalist">; re: RegExp }[] = [
  { key: "chief-of-staff", re: /\bchief of staff\b|office of the c[eo]o\b/i },
  { key: "sales-strategy", re: /\bsales (?:strategy|operations|ops)\b|\bgtm (?:strategy|operations|ops)\b|go-to-market/i },
  { key: "revops", re: /\brev(?:enue)? ?op(?:eration)?s\b/i },
  { key: "product-ops", re: /\bproduct op(?:eration)?s\b/i },
  { key: "pricing", re: /\bpricing\b|\bmonetiz|yield management|revenue management/i },
  { key: "marketplace", re: /\bmarketplace\b|supply (?:&|and) demand|liquidity/i },
  { key: "expansion", re: /\b(?:expansion|launch(?:er|es|ing)?|new markets?|city (?:operations|ops|manager|launcher))\b/i },
  { key: "strategic-finance", re: /strategic finance|fp&a|financial planning|corporate finance|capital allocation|finance (?:&|and) strategy|business finance|finance business partner/i },
  { key: "analytics", re: /\banalytics\b|\binsights\b|business intelligence/i },
  { key: "transformation", re: /\btransformation\b|operational excellence|operations excellence/i },
  { key: "growth", re: /\bgrowth\b|\bretention\b|\blifecycle\b|\bchurn\b|\bloyalty\b/i },
  { key: "stratops", re: /strategy\s*(?:&|and|\/|,)\s*op(?:eration)?s|op(?:eration)?s\s*(?:&|and|\/)\s*strategy|\bs&o\b|strategic operations|operations strategy/i },
  { key: "bizops", re: /\bbiz ?ops\b|business op(?:eration)?s/i },
  { key: "corp-strategy", re: /corporate strategy|business strategy|strategic (?:planning|initiatives|projects)|\bstrategy\b/i },
];

export function specialization(job: Job): Specialization {
  const title = job.title ?? "";
  for (const { key, re } of SPECIALIZATION_RULES) {
    if (re.test(title)) return key;
  }
  if (job.discipline === "stratops") return "stratops";
  if (job.discipline === "strategy") return "corp-strategy";
  if (job.discipline === "growth") return "growth";
  if (job.discipline === "finance") return "strategic-finance";
  return "generalist";
}

/* ------------------------------------------------------------------ */
/*  Location facet — US metros                                          */
/* ------------------------------------------------------------------ */

export type LocationKey =
  | "austin"
  | "texas"
  | "bay-area"
  | "new-york"
  | "seattle"
  | "los-angeles"
  | "chicago"
  | "denver"
  | "boston"
  | "dc"
  | "atlanta"
  | "remote"
  | "other";

export interface LocationMeta {
  key: LocationKey;
  label: string;
}

export const LOCATIONS: LocationMeta[] = [
  { key: "austin", label: "Austin" },
  { key: "texas", label: "Texas (other)" },
  { key: "remote", label: "Remote (US)" },
  { key: "bay-area", label: "SF Bay Area" },
  { key: "new-york", label: "New York" },
  { key: "seattle", label: "Seattle" },
  { key: "los-angeles", label: "Los Angeles" },
  { key: "chicago", label: "Chicago" },
  { key: "denver", label: "Denver" },
  { key: "boston", label: "Boston" },
  { key: "dc", label: "Washington DC" },
  { key: "atlanta", label: "Atlanta" },
  { key: "other", label: "Other US" },
];

export const LOCATION_LABELS: Record<LocationKey, string> = Object.fromEntries(
  LOCATIONS.map((l) => [l.key, l.label])
) as Record<LocationKey, string>;

export const CITY_ALIASES: Record<Exclude<LocationKey, "remote" | "other">, string[]> = {
  austin: ["austin", "round rock", "cedar park", "bastrop"],
  texas: ["dallas", "fort worth", "plano", "irving", "frisco", "houston", "san antonio", "texas", ", tx"],
  "bay-area": [
    "san francisco", "bay area", "san jose", "oakland", "palo alto", "mountain view", "menlo park",
    "sunnyvale", "santa clara", "redwood city", "cupertino", "south san francisco", "san mateo",
    "foster city", "berkeley", "fremont", "pleasanton", "silicon valley",
  ],
  "new-york": ["new york", "nyc", "manhattan", "brooklyn", "jersey city", "hoboken", ", ny"],
  seattle: ["seattle", "bellevue", "redmond", "kirkland"],
  "los-angeles": ["los angeles", "santa monica", "culver city", "playa vista", "irvine", "san diego", "orange county"],
  chicago: ["chicago"],
  denver: ["denver", "boulder", "colorado"],
  boston: ["boston", "cambridge, ma", "somerville", "massachusetts"],
  dc: ["washington, dc", "washington dc", "washington, d.c.", "arlington", "mclean", "reston", "tysons", "bethesda", "district of columbia"],
  atlanta: ["atlanta"],
};

function looksRemote(job: Job): boolean {
  if (job.work_mode === "remote") return true;
  const hay = `${job.location ?? ""} ${job.title ?? ""}`.toLowerCase();
  return /\bremote\b|work from home|wfh\b|\banywhere\b/.test(hay);
}

/** Bucket a job into one clean US metro facet (first metro named wins; remote only when no city). */
export function locationKey(job: Job): LocationKey {
  const loc = (job.location ?? "").toLowerCase();
  for (const { key } of LOCATIONS) {
    if (key === "remote" || key === "other") continue;
    const aliases = CITY_ALIASES[key as keyof typeof CITY_ALIASES];
    if (aliases.some((a) => loc.includes(a))) return key;
  }
  if (looksRemote(job)) return "remote";
  return "other";
}

/* ------------------------------------------------------------------ */
/*  Work-mode facet                                                    */
/* ------------------------------------------------------------------ */

export type WorkMode = "remote" | "hybrid" | "onsite";

export interface WorkModeMeta {
  key: WorkMode;
  label: string;
}

export const WORK_MODES: WorkModeMeta[] = [
  { key: "remote", label: "Remote" },
  { key: "hybrid", label: "Hybrid" },
  { key: "onsite", label: "On-site" },
];

export function workMode(job: Job): WorkMode {
  if (job.work_mode === "remote" || job.work_mode === "hybrid" || job.work_mode === "onsite") {
    return job.work_mode;
  }
  const hay = `${job.location ?? ""} ${job.title ?? ""}`;
  if (/\bhybrid\b/i.test(hay)) return "hybrid";
  if (looksRemote(job)) return "remote";
  return "onsite";
}

export function hasSalary(job: Job): boolean {
  return !!job.salary && job.salary.trim().length > 0;
}

/* ------------------------------------------------------------------ */
/*  Salary parsing — annual USD (lower bound) for sorting              */
/* ------------------------------------------------------------------ */

export function salaryValue(salary: string | null | undefined): number {
  if (!salary) return 0;
  const raw = salary.trim();
  if (!raw) return 0;
  const lower = raw.toLowerCase();
  const tokens = raw.replace(/,/g, "").match(/\d+(?:\.\d+)?\s?k?/gi) ?? [];
  const nums = tokens
    .map((t) => {
      const k = /k$/i.test(t.trim());
      const n = parseFloat(t);
      return k ? n * 1000 : n;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return 0;
  const base = Math.min(...nums);
  const hourly = /\/\s*hr|per hour|an hour|hourly|\/\s*hour/.test(lower);
  const monthly = /\/\s*mo|per month|a month|monthly/.test(lower);
  let annual: number;
  if (hourly) annual = base * 2080;
  else if (monthly) annual = base * 12;
  else if (base < 1000) annual = base * 1000; // "$120 – $150" shorthand for k
  else annual = base;
  if (annual < 20_000 || annual > 2_000_000) return 0;
  return Math.round(annual);
}

/** "$145k" style compact annual figure. */
export function formatUsd(annual: number): string {
  if (!annual || annual <= 0) return "—";
  if (annual >= 1000) return `$${Math.round(annual / 1000)}k`;
  return `$${Math.round(annual)}`;
}

/* ------------------------------------------------------------------ */
/*  Sponsorship                                                        */
/* ------------------------------------------------------------------ */

export function sponsorshipOf(job: Job): Sponsorship {
  return job.sponsorship === "yes" || job.sponsorship === "no" ? job.sponsorship : "unknown";
}

export const SPONSORSHIP_LABELS: Record<Sponsorship, string> = {
  yes: "Offers visa sponsorship",
  no: "No visa sponsorship",
  unknown: "Sponsorship not stated",
};

/* ------------------------------------------------------------------ */
/*  Resume-tag labels (keys come from the pipeline's TAG_RULES)        */
/* ------------------------------------------------------------------ */

export const TAG_LABELS: Record<string, string> = {
  marketplace: "Marketplace",
  delivery: "Delivery / mobility",
  merchants: "Merchants / eaters",
  pricing: "Pricing & fees",
  capital: "Capital allocation",
  forecasting: "Forecasting",
  pnl: "P&L",
  growth: "Growth & retention",
  markets: "Market strategy",
  sql: "SQL",
  dashboards: "Dashboards & sheets",
  xfn: "Cross-functional",
  regulatory: "Regulatory / policy",
  automation: "Process & automation",
  leadership: "Leads a team",
  kpis: "KPIs & reporting",
  experimentation: "Experiments & pilots",
  exec: "Exec-facing",
};

export function tagLabel(key: string): string {
  return TAG_LABELS[key] ?? key;
}

/* ------------------------------------------------------------------ */
/*  Fit score — how well a role matches the target profile (0–100)    */
/*  Deterministic, explainable, no ML. Tuned for a Senior Strategy &   */
/*  Operations Manager (marketplace / delivery / growth / pricing /     */
/*  capital allocation) based in Austin, TX.                            */
/* ------------------------------------------------------------------ */

export interface Fit {
  score: number;
  /** Positive, human-readable reasons in priority order. */
  reasons: string[];
  /** Cautions (e.g. no sponsorship, level mismatch). */
  flags: string[];
}

export type FitTier = "strong" | "good" | "possible" | "weak";

export function fitTier(score: number): FitTier {
  if (score >= 75) return "strong";
  if (score >= 55) return "good";
  if (score >= 35) return "possible";
  return "weak";
}

export const FIT_TIER_LABELS: Record<FitTier, string> = {
  strong: "Strong fit",
  good: "Good fit",
  possible: "Possible",
  weak: "Weak fit",
};

const TAG_WEIGHTS: Record<string, number> = {
  marketplace: 4, delivery: 4, merchants: 3, pricing: 4, capital: 4, forecasting: 3, pnl: 3,
  growth: 3, markets: 2, sql: 3, dashboards: 2, xfn: 1, regulatory: 2, automation: 2,
  leadership: 1, kpis: 1, experimentation: 2, exec: 1,
};

const DISCIPLINE_BASE: Record<Discipline, number> = {
  stratops: 30, strategy: 24, growth: 24, finance: 20,
};

const HUB_KEYS = new Set<LocationKey>(["bay-area", "new-york", "seattle", "los-angeles", "chicago", "denver", "boston", "dc", "atlanta"]);

export function fitScore(job: Job, now: number = Date.now()): Fit {
  const reasons: string[] = [];
  const flags: string[] = [];
  let score = DISCIPLINE_BASE[job.discipline] ?? 20;

  const t = (job.title ?? "").toLowerCase();
  if (/strategy\s*(?:&|and|\/|,)\s*op(?:eration)?s|op(?:eration)?s\s*(?:&|and|\/)\s*strategy|\bs&o\b/.test(t)) {
    score += 25; reasons.push("Strategy & Operations title");
  } else if (/\bbiz ?ops\b|business op(?:eration)?s/.test(t)) {
    score += 20; reasons.push("Business Operations title");
  } else if (/chief of staff/.test(t)) {
    score += 16; reasons.push("Chief of Staff role");
  } else if (/growth strategy|pricing|marketplace|monetiz/.test(t)) {
    score += 16; reasons.push("Growth / pricing / marketplace title");
  } else if (/strategic finance|capital allocation|fp&a/.test(t)) {
    score += 14; reasons.push("Strategic finance title");
  } else if (/corporate strategy|strategic (?:planning|initiatives)|business strategy/.test(t)) {
    score += 14; reasons.push("Corporate strategy title");
  } else if (/strateg/.test(t)) {
    score += 10; reasons.push("Strategy role");
  } else if (/operations|ops\b/.test(t)) {
    score += 6; reasons.push("Operations role");
  }

  const lvl = levelOf(job);
  if (lvl === "senior") { score += 14; reasons.push("Senior-manager level"); }
  else if (lvl === "manager") { score += 10; reasons.push("Manager level"); }
  else if (lvl === "director") { score += 2; flags.push("Director-level stretch"); }
  else { score -= 6; flags.push("Below target level"); }

  const loc = locationKey(job);
  if (loc === "austin") { score += 12; reasons.push("In Austin"); }
  else if (loc === "texas") { score += 8; reasons.push("In Texas"); }
  else if (loc === "remote") { score += 10; reasons.push("Remote (US)"); }
  else if (HUB_KEYS.has(loc)) { score += 3; reasons.push(`${LOCATION_LABELS[loc]} hub`); }
  else if (loc === "other") { flags.push("Relocation likely"); }

  const tags = Array.isArray(job.tags) ? job.tags : [];
  let tagPts = 0;
  const hitLabels: string[] = [];
  for (const k of tags) {
    const w = TAG_WEIGHTS[k];
    if (w) { tagPts += w; hitLabels.push(tagLabel(k)); }
  }
  tagPts = Math.min(22, tagPts);
  score += tagPts;
  if (hitLabels.length > 0) {
    reasons.push(`Matches ${hitLabels.slice(0, 4).join(", ")}${hitLabels.length > 4 ? ` +${hitLabels.length - 4}` : ""}`);
  }

  const spons = sponsorshipOf(job);
  if (spons === "no") { score -= 35; flags.push("No visa sponsorship"); }
  else if (spons === "yes") { score += 6; reasons.push("Offers sponsorship"); }

  const rep = reputationTier(job.company);
  if (rep === 2) { score += 6; reasons.push("Elite company"); }
  else if (rep === 1) { score += 4; reasons.push("Top company"); }

  if (withinDays(job, 7, now)) { score += 4; reasons.push("Posted this week"); }
  else if (withinDays(job, 14, now)) { score += 2; }

  if (hasSalary(job)) {
    if (/\/\s*hr|per hour|an hour|hourly/i.test(job.salary ?? "")) {
      score -= 20; flags.push("Hourly pay (likely not a manager role)");
    } else {
      score += 2; reasons.push("Pay disclosed");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons, flags };
}

/** "Best fit" comparator (negative ⇒ a first): fit desc → recency desc. */
export function compareBestFit(a: Job, b: Job): number {
  const fa = fitScore(a).score;
  const fb = fitScore(b).score;
  if (fa !== fb) return fb - fa;
  return effectiveTime(b) - effectiveTime(a);
}

/** Window (ms) within which a role is flagged "NEW". */
export const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

export function isNew(job: Job, now: number = Date.now()): boolean {
  const t = effectiveTime(job);
  if (t === 0) return false;
  return now - t <= NEW_WINDOW_MS && now - t >= 0;
}

/* ------------------------------------------------------------------ */
/*  Apply-assist — template-only outreach note (no AI / API)           */
/* ------------------------------------------------------------------ */

export interface Profile {
  name: string;
  headline: string;
  linkedin: string;
}

export const EMPTY_PROFILE: Profile = { name: "", headline: "", linkedin: "" };

export function applyNote(job: Job, profile: Profile = EMPTY_PROFILE): string {
  const role = (job.title ?? "the role").trim();
  const company = job.company ? job.company.trim() : "your team";
  const name = profile.name.trim() || "[Your Name]";
  const headline =
    profile.headline.trim() ||
    "a Strategy & Operations leader (most recently at a large delivery marketplace), with experience in capital allocation, pricing and consumer growth across 40+ US markets";
  const li = profile.linkedin.trim() || "[LinkedIn URL]";
  return [
    `Hi ${company} team,`,
    "",
    `I just applied for the ${role} role and wanted to reach out directly. I'm ${headline}.`,
    "",
    `I'd love a few minutes to share how that experience maps to what you're building. My profile: ${li}`,
    "",
    "Thanks for your time,",
    name,
  ].join("\n");
}

export function applySubject(job: Job): string {
  const role = (job.title ?? "Strategy & Operations role").trim();
  return job.company ? `${role} at ${job.company.trim()} — quick intro` : `${role} — quick intro`;
}

export function applyMailtoHref(job: Job, profile: Profile = EMPTY_PROFILE): string | null {
  if (!job.contact || !isEmailContact(job.contact)) return null;
  const to = job.contact.trim();
  const subject = encodeURIComponent(applySubject(job));
  const body = encodeURIComponent(applyNote(job, profile));
  return `mailto:${to}?subject=${subject}&body=${body}`;
}
