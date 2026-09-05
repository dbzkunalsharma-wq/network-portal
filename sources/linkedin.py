"""LinkedIn US Strategy & Ops jobs via the PUBLIC guest endpoint.

Uses https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search — the
same endpoint LinkedIn serves to logged-out visitors. No login, no captcha. Returns
RAW job dicts; the classifier assigns 'discipline' later. Never raises.

Public contract:
    fetch() -> list[dict]
"""

import logging
import time

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("netportal")

_BASE = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
_UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

# Profile queries; the classifier still makes the final call per result.
_QUERIES = [
    "Strategy and Operations Manager", "Business Operations Manager", "Strategy Manager",
    "Chief of Staff", "Growth Strategy Manager", "Pricing Strategy Manager",
    "Strategic Finance Manager", "Revenue Operations Manager", "Marketplace Operations Manager",
    "Corporate Strategy Manager", "Strategy and Operations Lead", "BizOps",
]
_CORE_QUERIES = [
    "Strategy and Operations Manager", "Business Operations Manager", "Strategy Manager",
    "Chief of Staff", "Growth Strategy", "Strategic Finance",
]

_LOCATION = "United States"
# Home metro first (Austin) and the deepest hiring metros for this profile.
_CITIES = [
    "Austin, TX", "Dallas, TX", "Houston, TX", "San Francisco Bay Area", "New York, NY",
    "Seattle, WA", "Los Angeles, CA", "Chicago, IL", "Denver, CO", "Boston, MA",
    "Washington, DC", "Atlanta, GA",
]

# Only the last week: the daily run keeps the feed fresh and the request count bounded.
_TPR = "r604800"
_WIDE_STARTS = (0, 25)   # US-wide: 12 keywords x 2 pages = 24 requests
_CITY_STARTS = (0,)      # per-city: 12 cities x 6 core keywords x 1 page = 72 requests
_REMOTE_STARTS = (0, 25) # remote-US: 6 core keywords x 2 pages = 12 requests
_DELAY = 1.2


def _to_job(card) -> dict | None:
    title_el = card.select_one(".base-search-card__title")
    if title_el is None:
        return None
    title = title_el.get_text(strip=True)
    comp_el = card.select_one(".base-search-card__subtitle")
    loc_el = card.select_one(".job-search-card__location")
    link_el = card.select_one("a.base-card__full-link") or card.select_one("a[href*='/jobs/view/']")
    time_el = card.select_one("time")

    url = link_el.get("href").split("?")[0] if link_el and link_el.get("href") else None
    urn = card.get("data-entity-urn") or ""
    job_id = urn.rsplit(":", 1)[-1] if urn else (url.rstrip("/").rsplit("-", 1)[-1] if url else None)
    if not job_id:
        return None

    company = comp_el.get_text(strip=True) if comp_el else None
    location = loc_el.get_text(strip=True) if loc_el else None

    logo_el = card.select_one("img.artdeco-entity-image") or card.select_one(
        ".search-entity-media img, .base-search-card__info img"
    )
    logo = None
    if logo_el is not None:
        cand = logo_el.get("data-delayed-url") or logo_el.get("src")
        if isinstance(cand, str) and cand.startswith("http"):
            logo = cand

    sal_el = card.select_one(".job-search-card__salary-info")
    salary = None
    if sal_el is not None:
        raw = sal_el.get_text(" ", strip=True)
        salary = " ".join(raw.split()) or None

    return {
        "id": f"linkedin:{job_id}",
        "source": "linkedin",
        "title": title,
        "company": company,
        "location": location,
        "url": url,
        "logo": logo,
        "contact": None,
        "posted_at": time_el.get("datetime") if time_el else None,
        "salary": salary,
        "description": f"{title} {company or ''}",
        "work_mode": None,
    }


def _run_query(query: str, location: str, starts, jobs: list[dict], seen: set[str],
               extra: dict | None = None) -> None:
    for start in starts:
        try:
            params = {"keywords": query, "location": location, "start": start, "f_TPR": _TPR}
            if extra:
                params.update(extra)
            resp = httpx.get(_BASE, params=params, headers=_UA, timeout=20)
            if resp.status_code != 200:
                log.warning("linkedin: '%s' @ '%s' start=%s -> HTTP %s", query, location, start, resp.status_code)
                break
            cards = BeautifulSoup(resp.text, "html.parser").select("div.base-card")
            if not cards:
                break
            for card in cards:
                job = _to_job(card)
                if job and job["id"] not in seen:
                    seen.add(job["id"])
                    jobs.append(job)
        except Exception as e:  # noqa: BLE001
            log.warning("linkedin: '%s' @ '%s' start=%s failed (%s)", query, location, start, e)
            break
        time.sleep(_DELAY)


def fetch() -> list[dict]:
    jobs: list[dict] = []
    seen: set[str] = set()
    for query in _QUERIES:
        _run_query(query, _LOCATION, _WIDE_STARTS, jobs, seen)
    for city in _CITIES:
        for query in _CORE_QUERIES:
            _run_query(query, city, _CITY_STARTS, jobs, seen)
    for query in _CORE_QUERIES:  # remote-only pass (f_WT=2)
        _run_query(query, _LOCATION, _REMOTE_STARTS, jobs, seen, extra={"f_WT": "2"})
    log.info("linkedin: %d unique US postings (US-wide + %d cities + remote)", len(jobs), len(_CITIES))
    return jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = fetch()
    print(f"\nfetched {len(results)} jobs")
    for j in results[:8]:
        print(f"{j['source']} | {j.get('location') or '-'} | {j['title']} | {j.get('company')}".encode("ascii", "replace").decode("ascii"))
