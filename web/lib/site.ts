/** Canonical public origin (no trailing slash). Overridable at build time. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://dod-us.vercel.app";

/** Host shown on share cards / footers. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
