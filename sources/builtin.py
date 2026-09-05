"""Built In (builtin.com) — the biggest US tech job board with city hubs (Austin, etc.).

No API; the job listing pages are server-rendered with stable data-id hooks:
  [data-id="job-card"]        one card per job (title/company/location/mode/level/snippet)
  [data-id="job-card-title"]  <a href="/job/<slug>/<id>">Title</a>
  [data-id="company-title"]   company name
  [data-id="company-img"]     logo
We scrape a few profile keyword searches across the home metro + the big hubs + the
remote hub. Cards carry a description snippet + "Senior level"-style seniority, which
is enough for the classifier; the poller runs the sponsorship/salary signals on what
we have. Never raises.
"""

import logging
import re
import time
from datetime import datetime, timedelta, timezone

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("netportal")

_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
       "Accept": "text/html"}

_QUERIES = ("strategy and operations", "business operations", "chief of staff",
            "growth strategy", "pricing strategy", "strategic finance", "corporate strategy")
# City hub paths on builtin.com; "" = national, "remote" = remote hub.
_HUBS = ("austin", "remote", "", "dallas", "houston", "new-york", "san-francisco", "seattle",
         "los-angeles", "chicago", "colorado", "boston")
_DELAY = 0.8

_AGE = re.compile(r"(?:reposted\s+)?(today|yesterday|(\d+)\s+(hour|day|week)s?\s+ago)", re.I)
_MODE = {"remote": "remote", "hybrid": "hybrid", "in-office": "onsite", "in office": "onsite", "onsite": "onsite"}
_LEVEL = re.compile(r"\b(entry|junior|mid|senior|expert/leader|leader|executive)\s*level\b", re.I)


def _age_to_iso(text: str) -> str | None:
    m = _AGE.search(text or "")
    if not m:
        return None
    today = datetime.now(timezone.utc).date()
    w = m.group(1).lower()
    if w == "today":
        return today.isoformat()
    if w == "yesterday":
        return (today - timedelta(days=1)).isoformat()
    n = int(m.group(2)); unit = m.group(3).lower()
    days = 0 if unit == "hour" else n if unit == "day" else n * 7
    return (today - timedelta(days=days)).isoformat()


def _to_job(card) -> dict | None:
    t = card.select_one('[data-id="job-card-title"]')
    if t is None:
        return None
    href = t.get("href") or ""
    m = re.search(r"/(\d+)/?$", href)
    if not m:
        return None
    jid = m.group(1)
    title = t.get_text(" ", strip=True)
    comp = card.select_one('[data-id="company-title"]')
    company = comp.get_text(" ", strip=True) if comp else None
    logo_el = card.select_one('[data-id="company-img"]')
    logo = logo_el.get("src") if logo_el is not None and str(logo_el.get("src", "")).startswith("http") else None

    parts = [p.strip() for p in card.get_text(" | ", strip=True).split(" | ") if p.strip()]
    posted = None
    work_mode = None
    location = None
    level_txt = None
    snippet = ""
    for i, p in enumerate(parts):
        low = p.lower()
        if posted is None and _AGE.search(p):
            posted = _age_to_iso(p)
            continue
        if work_mode is None and low in _MODE:
            work_mode = _MODE[low]
            # the next non-empty part is the location
            for q in parts[i + 1:i + 3]:
                if q.lower() not in ("saved",) and not _LEVEL.search(q) and q.lower() not in _MODE:
                    location = q
                    break
            continue
        if level_txt is None and _LEVEL.search(p):
            level_txt = p
    if parts:
        snippet = parts[-1] if len(parts[-1]) > 60 else ""
    if location is None and work_mode == "remote":
        location = "Remote"
    body = " ".join(x for x in (f"Level: {level_txt}." if level_txt else "", snippet) if x)
    return {
        "id": f"builtin:{jid}",
        "source": "builtin",
        "title": title,
        "company": company,
        "location": location,
        "url": "https://builtin.com" + href if href.startswith("/") else href,
        "logo": logo,
        "contact": None,
        "posted_at": posted,
        "salary": None,
        "description": body,
        "work_mode": work_mode,
    }


def fetch() -> list[dict]:
    jobs: list[dict] = []
    seen: set[str] = set()
    with httpx.Client(headers=_UA, timeout=25, follow_redirects=True) as c:
        for hub in _HUBS:
            for q in _QUERIES:
                url = f"https://builtin.com/jobs/{hub}" if hub else "https://builtin.com/jobs"
                try:
                    r = c.get(url, params={"search": q})
                    if r.status_code != 200:
                        log.warning("builtin: %s %r -> HTTP %s", hub or "national", q, r.status_code)
                        continue
                    cards = BeautifulSoup(r.text, "html.parser").select('[data-id="job-card"]')
                    for card in cards:
                        job = _to_job(card)
                        if job and job["id"] not in seen:
                            seen.add(job["id"])
                            jobs.append(job)
                except Exception as e:  # noqa: BLE001
                    log.warning("builtin: %s %r failed (%s)", hub or "national", q, e)
                time.sleep(_DELAY)
    log.info("builtin: %d unique postings across %d hubs", len(jobs), len(_HUBS))
    return jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = fetch()
    print(len(res))
    for j in res[:10]:
        print(f"{j['location']} | {j['work_mode']} | {j['posted_at']} | {j['title']} | {j['company']}".encode("ascii", "replace").decode("ascii"))
