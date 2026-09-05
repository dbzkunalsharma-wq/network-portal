import { compareBestFit, fitScore, levelOf, LEVEL_LABELS, sourceLabel, sponsorshipOf, SPONSORSHIP_LABELS, jobSlug } from "@/lib/jobs";
import { loadJobsFeed } from "@/lib/jobs-data";
import { SITE_URL } from "@/lib/site";

/**
 * `/feed.xml` — an RSS 2.0 feed of the best-fit roles (score ≥ 55, best first,
 * capped at 100), rebuilt on every refresh. Paste it into any RSS reader, or a
 * free email-digest tool (Blogtrottr, IFTTT, Zapier) to get new roles by email.
 */

export const dynamic = "force-static";

const MIN_FIT = 55;
const MAX_ITEMS = 100;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(): Promise<Response> {
  const feed = await loadJobsFeed();
  const jobs = (Array.isArray(feed?.jobs) ? feed.jobs : [])
    .filter((j) => fitScore(j).score >= MIN_FIT)
    .sort(compareBestFit)
    .slice(0, MAX_ITEMS);

  const items = jobs
    .map((j) => {
      const fit = fitScore(j);
      const link = `${SITE_URL}/jobs/${jobSlug(j.id)}`;
      const title = `[${fit.score}] ${j.title}${j.company ? ` — ${j.company}` : ""}`;
      const bits = [
        j.location ?? "",
        LEVEL_LABELS[levelOf(j)],
        j.salary ?? "",
        SPONSORSHIP_LABELS[sponsorshipOf(j)],
        `via ${sourceLabel(j.source)}`,
      ].filter(Boolean);
      const desc = `${bits.join(" · ")}\n\nWhy: ${fit.reasons.join("; ")}${fit.flags.length ? `\nWatch out: ${fit.flags.join("; ")}` : ""}\n\nApply: ${j.url}`;
      const stamp = j.posted_at ?? j.seen_at;
      const date = stamp ? new Date(stamp.replace(" ", "T")) : null;
      const pub = date && !Number.isNaN(date.getTime()) ? `<pubDate>${date.toUTCString()}</pubDate>` : "";
      return `<item><title>${esc(title)}</title><link>${esc(link)}</link><guid isPermaLink="true">${esc(link)}</guid>${pub}<description>${esc(desc)}</description></item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>DOD US — best-fit Strategy &amp; Ops roles</title>
<link>${esc(SITE_URL)}</link>
<atom:link href="${esc(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml"/>
<description>US Strategy &amp; Operations, BizOps, Growth, Pricing and Strategic Finance roles scoring ${MIN_FIT}+ on profile fit. Refreshed twice a day.</description>
<language>en-us</language>
<lastBuildDate>${new Date(feed?.generated_at ?? Date.now()).toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
