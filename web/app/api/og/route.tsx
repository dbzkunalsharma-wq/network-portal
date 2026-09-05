import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SITE_HOST } from "@/lib/site";

/**
 * Dynamic OG share-card route — a single query-driven endpoint rendering a
 * 1200×630 flat card in the DOD US palette (Electric Violet / Turbo / Haiti /
 * Blue Chalk). No gradients, no blur: solid blocks and big type. Wrapped in
 * try/catch so a broken param can never 500 a link unfurl.
 */

export const runtime = "nodejs";

const INK = "#18102B";
const CHALK = "#F5F3FF";
const VIOLET = "#834DFB";
const TURBO = "#F0E100";

const HUE_ACCENT: Record<string, { bg: string; fg: string }> = {
  stratops: { bg: VIOLET, fg: "#FFFFFF" },
  strategy: { bg: "#7EA6FF", fg: "#0B2A8A" },
  growth: { bg: "#22C36B", fg: "#003D14" },
  finance: { bg: "#FFD43A", fg: "#5A3E00" },
};
const DEFAULT_ACCENT = { bg: VIOLET, fg: "#FFFFFF" };

const CACHE_HEADERS = { "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable" };

function clamp(value: string | null, max: number): string {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function Mark() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: INK }}>
      <div style={{ display: "flex", alignItems: "center", width: 40, height: 40, position: "relative" }}>
        <div style={{ display: "flex", width: 11, height: 30, border: `3px solid ${CHALK}` }} />
        <div style={{ display: "flex", width: 4, height: 30, marginLeft: 3, background: CHALK }} />
        <div style={{ display: "flex", position: "absolute", top: 0, right: 0, width: 14, height: 14, borderRadius: 9999, background: TURBO }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", position: "absolute", bottom: 0, right: 0, width: 16, height: 16, border: `3px solid ${CHALK}` }}>
          <div style={{ display: "flex", width: 7, height: 7, background: CHALK }} />
        </div>
      </div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind") ?? "site";
    const hue = searchParams.get("hue") ?? "";
    const accent = HUE_ACCENT[hue] ?? DEFAULT_ACCENT;
    const title = clamp(searchParams.get("title"), kind === "job" ? 90 : 70) || "Live US Strategy & Ops jobs";
    const subtitle = clamp(searchParams.get("subtitle"), 80);
    const tag = clamp(searchParams.get("tag"), 40) || "US strategy jobs";
    const salary = clamp(searchParams.get("salary"), 28);

    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: CHALK, fontFamily: "sans-serif" }}>
          {/* left color block */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 360, height: "100%", background: accent.bg, padding: 56 }}>
            <Mark />
            <div style={{ display: "flex", flexDirection: "column", color: accent.fg }}>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 4 }}>DOD US</div>
              <div style={{ display: "flex", marginTop: 8, fontSize: 22, opacity: 0.85 }}>{tag}</div>
            </div>
          </div>
          {/* right content */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 64, color: INK }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {salary ? (
                <div style={{ display: "flex", padding: "8px 18px", borderRadius: 9999, background: TURBO, color: INK, fontSize: 24, fontWeight: 700 }}>{salary}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: title.length > 48 ? 56 : 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5, maxHeight: 230, overflow: "hidden" }}>
              {title}
            </div>
            {subtitle ? <div style={{ display: "flex", marginTop: 18, fontSize: 28, fontWeight: 500, opacity: 0.7 }}>{subtitle}</div> : null}
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, opacity: 0.6 }}>
              <div style={{ display: "flex", fontWeight: 600 }}>{SITE_HOST}</div>
              <div style={{ display: "flex" }}>·</div>
              <div style={{ display: "flex" }}>Live US Strategy & Ops jobs</div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: CACHE_HEADERS }
    );
  } catch {
    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: VIOLET, padding: 80, fontFamily: "sans-serif", color: "#fff" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 6 }}>DOD US</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 68, fontWeight: 700, letterSpacing: -1.5 }}>Live US Strategy & Ops jobs</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 26, opacity: 0.8 }}>{SITE_HOST}</div>
        </div>
      ),
      { width: 1200, height: 630, headers: CACHE_HEADERS }
    );
  }
}
