# DOD US — Live US Strategy & Operations jobs

A job radar tuned for one profile: a **Senior Strategy & Operations Manager** (marketplace /
delivery / consumer growth / pricing / capital allocation) based in **Austin, TX**, open to
remote-US roles. Forked from [DOD](https://github.com/dbzkunalsharma-wq/dod) (India design jobs).

## What it does

* **Scrapes** US roles twice a day from LinkedIn (guest endpoint), SimplyHired (Indeed's index),
  Built In, Greenhouse / Lever / Ashby / SmartRecruiters boards for 100+ watchlisted companies,
  Workday tenants, Amazon Jobs, Google Careers and RemoteOK.
* **Classifies** each posting into four disciplines with a deterministic keyword taxonomy
  (`classify.py`): Strategy & Ops, Corporate Strategy, Growth & Pricing, Strategic Finance &
  Analytics. Engineering, sales, marketing, warehouse ops, HR, accounting etc. are excluded.
* **Reads signals** off the full posting (`signals.py`): visa-sponsorship wording, USD pay range,
  seniority level, work mode, and which resume keywords the posting hits.
* **Scores fit** in the web app (`web/lib/jobs.ts` → `fitScore`): title match, level, Austin /
  Texas / remote, keyword hits, sponsorship, company tier, recency. Explainable, no ML.
* **Web app** (`web/`, Next.js): board sorted by best fit, filters (level, role type, metro, work
  mode, "hide no-sponsorship", "strong fit"), saved + pipeline tracker (interested → applied →
  interviewing → offer), company pages, insights (pay, metros, sponsorship), a `/network` page with
  recruiter-search links + outreach templates, and an RSS feed of best fits at `/feed.xml`.

## Run locally

```bash
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python poll.py --seed     # scrape + classify + enrich → dod.db
.venv\Scripts\python export.py          # → web/public/jobs.json + stats-history.json
.venv\Scripts\python ledger.py          # → web/public/companies-ledger.json
cd web && npm install && npm run dev -- --port 3138
```

Tests: `python classify.py`, `python geo.py`, `python signals.py`, `python sources/ats.py`.

## Cloud refresh

`.github/workflows/refresh.yml` runs the pipeline at 11:00 and 21:00 UTC, commits the JSON feed and
redeploys Vercel. Needs repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Tuning

* Add companies: `watchlist.json` (Greenhouse/Lever/Ashby/SmartRecruiters slug, or Workday
  `slug` + `wd` + `site`).
* Change what counts as in-scope: `classify.py` phrase lists (tests at the bottom).
* Change how fit is scored: `web/lib/jobs.ts` → `fitScore`, `TAG_WEIGHTS`, `DISCIPLINE_BASE`.
* Metros: `web/lib/jobs.ts` → `LOCATIONS` / `CITY_ALIASES`.
