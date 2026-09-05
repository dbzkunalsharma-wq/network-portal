"""SimplyHired (Indeed's sister site — same job index, but server-rendered and open).

Indeed and ZipRecruiter both sit behind Cloudflare challenges for non-browser clients,
so SimplyHired is the practical way to get Indeed's inventory: search pages render
[data-testid="searchSerpJob"] cards with title, company, location, a confirmed salary
chip, a "9d" age stamp and Remote/Full-time tags. Detail pages carry the full
description, which we fetch for the roles whose TITLE looks in-scope (bounded) so the
sponsorship / pay / tag signals have real text to work on. Never raises.
"""

import logging
import re
import time
from datetime import datetime, timedelta, timezone

import httpx
from bs4 import BeautifulSoup

import classify

log = logging.getLogger("dod")

_BASE = "https://www.simplyhired.com"
_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
       "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9"}

_QUERIES = ("strategy and operations manager", "business operations manager", "chief of staff",
            "growth strategy manager", "pricing strategy manager", "strategic finance manager",
            "corporate strategy manager", "revenue operations manager")
_LOCATIONS = ("Austin, TX", "Remote", "Dallas, TX", "Houston, TX", "San Francisco, CA",
              "New York, NY", "Seattle, WA", "Chicago, IL", "Denver, CO", "Boston, MA",
              "Los Angeles, CA", "Atlanta, GA", "Washington, DC", "")
_PAGES = 2
_MAX_DETAILS = 120
_DELAY = 0.6

_AGE = re.compile(r"^(\d+)([hdw])\+?$")
_SALARY = re.compile(r"\$[\d,.]+(?:\s*-\s*\$[\d,.]+)?\s*(?:a|an|per|/)\s*(?:year|hour|yr|hr|month)", re.I)


def _age_to_iso(stamp: str | None) -> str | None:
    if not stamp:
        return None
    m = _AGE.match(stamp.strip().lower())
    if not m:
        return None
    n, unit = int(m.group(1)), m.group(2)
    days = 0 if unit == "h" else n if unit == "d" else n * 7
    return (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()


def _text(el) -> str | None:
    return el.get_text(" ", strip=True) if el is not None else None


def _to_job(card) -> dict | None:
    key = card.get("data-jobkey")
    title_el = card.select_one('[data-testid="searchSerpJobTitle"]')
    if not key or title_el is None:
        return None
    title = _text(title_el) or ""
    link = title_el.select_one("a[href]") or card.select_one("a[href]")
    href = link.get("href") if link is not None else f"/job/{key}"
    parts = [p.strip() for p in card.get_text(" | ", strip=True).split(" | ") if p.strip()]
    # company = first part after the title that isn't an icon glyph / rating
    company = None
    for p in parts[1:4]:
        if p == title or len(p) <= 1 or re.fullmatch(r"\d(?:\.\d)?", p):
            continue
        company = p
        break
    location = _text(card.select_one('[data-testid="searchSerpJobLocation"]'))
    stamp = _text(card.select_one('[data-testid="searchSerpJobDateStamp"]'))
    blob = " ".join(parts)
    sal = _SALARY.search(blob)
    salary = None
    if sal:
        s = sal.group(0)
        s = re.sub(r"\s*-\s*", " – ", s)
        s = re.sub(r"\s*(?:a|an|per|/)\s*(year|yr)", "/yr", s, flags=re.I)
        s = re.sub(r"\s*(?:a|an|per|/)\s*(hour|hr)", "/hr", s, flags=re.I)
        salary = s
    work_mode = "remote" if re.search(r"\bremote\b", blob, re.I) else None
    level_txt = next((p for p in parts if re.search(r"\b(entry|mid|senior|executive)[- ]level\b", p, re.I)), None)
    return {
        "id": f"simplyhired:{key}",
        "source": "simplyhired",
        "title": title,
        "company": company,
        "location": location,
        "url": _BASE + href if href.startswith("/") else href,
        "logo": None,
        "contact": None,
        "posted_at": _age_to_iso(stamp),
        "salary": salary,
        "description": f"Level: {level_txt}." if level_txt else "",
        "work_mode": work_mode,
    }


def _detail(client: httpx.Client, url: str) -> str:
    try:
        r = client.get(url)
        if r.status_code != 200:
            return ""
        s = BeautifulSoup(r.text, "html.parser")
        el = (s.select_one('[data-testid="viewJobBodyJobFullDescriptionContent"]')
              or s.select_one('[data-testid="viewJobBodyJobDetails"]')
              or s.select_one('div[class*="description"]'))
        return el.get_text(" ", strip=True) if el is not None else ""
    except Exception:  # noqa: BLE001
        return ""


def fetch() -> list[dict]:
    jobs: list[dict] = []
    seen: set[str] = set()
    with httpx.Client(headers=_UA, timeout=25, follow_redirects=True) as c:
        for loc in _LOCATIONS:
            for q in _QUERIES:
                url = f"{_BASE}/search"
                params = {"q": q, "l": loc, "s": "d"}
                for _ in range(_PAGES):
                    try:
                        r = c.get(url, params=params)
                        if r.status_code != 200:
                            log.warning("simplyhired: %r @ %r -> HTTP %s", q, loc, r.status_code)
                            break
                        s = BeautifulSoup(r.text, "html.parser")
                        for card in s.select('[data-testid="searchSerpJob"]'):
                            job = _to_job(card)
                            if job and job["id"] not in seen:
                                seen.add(job["id"])
                                jobs.append(job)
                        nxt = s.select_one('a[data-testid="pageNumberBlockNext"]')
                        if nxt is None or not nxt.get("href"):
                            break
                        url = _BASE + nxt.get("href")
                        params = None
                    except Exception as e:  # noqa: BLE001
                        log.warning("simplyhired: %r @ %r failed (%s)", q, loc, e)
                        break
                    time.sleep(_DELAY)
        # Enrich the plausible ones with the full description (bounded).
        fetched = 0
        for job in jobs:
            if fetched >= _MAX_DETAILS:
                break
            if classify.classify(job["title"], "") is None:
                continue
            body = _detail(c, job["url"])
            if body:
                job["description"] = f"{job['description']} {body}".strip()
                fetched += 1
                time.sleep(_DELAY)
    log.info("simplyhired: %d unique postings (%d with full descriptions)", len(jobs), fetched)
    return jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = fetch()
    print(len(res))
    for j in res[:10]:
        print(f"{j['location']} | {j['salary']} | {j['posted_at']} | {j['title']} | {j['company']}".encode("ascii", "replace").decode("ascii"))
