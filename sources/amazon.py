"""Amazon corporate jobs via the public search JSON on amazon.jobs.

https://www.amazon.jobs/en/search.json?base_query=...&country=USA returns rich rows
(description, basic/preferred qualifications, location "US, TX, Austin", posted_date,
job_path). Amazon is the largest single employer of Strategy/BizOps/Finance roles in
the US, and Austin/Seattle-heavy, so it gets its own source. Never raises.
"""

import logging
import re
import time
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("netportal")

_API = "https://www.amazon.jobs/en/search.json"
_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
       "Accept": "application/json"}

_QUERIES = (
    "strategy operations manager", "business operations manager", "chief of staff",
    "growth strategy", "pricing strategy", "strategic finance", "corporate strategy",
    "marketplace strategy", "strategy and planning", "strategic initiatives",
    "business strategy", "revenue operations",
)
_LIMIT = 100
_DELAY = 0.6


def _strip(html_text) -> str:
    if not html_text:
        return ""
    return BeautifulSoup(str(html_text), "html.parser").get_text(" ", strip=True)


def _parse_date(text) -> str | None:
    if not text:
        return None
    t = re.sub(r"\s+", " ", str(text)).strip()
    for fmt in ("%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(t, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _to_job(j: dict) -> dict | None:
    jid = j.get("id_icims") or j.get("id")
    title = j.get("title")
    if not jid or not title:
        return None
    body = " ".join(part for part in (
        _strip(j.get("description")),
        "Basic qualifications: " + _strip(j.get("basic_qualifications")) if j.get("basic_qualifications") else "",
        "Preferred qualifications: " + _strip(j.get("preferred_qualifications")) if j.get("preferred_qualifications") else "",
    ) if part)
    cat = j.get("job_category")
    if cat:
        body = f"Category: {cat}\n\n{body}"
    loc = j.get("normalized_location") or j.get("location")
    return {
        "id": f"amazon:{jid}",
        "source": "amazon",
        "title": title,
        "company": (j.get("company_name") or "Amazon").replace("Amazon.com Services LLC", "Amazon"),
        "location": loc,
        "url": "https://www.amazon.jobs" + (j.get("job_path") or f"/en/jobs/{jid}"),
        "logo": "https://www.google.com/s2/favicons?sz=128&domain=amazon.com",
        "contact": None,
        "posted_at": _parse_date(j.get("posted_date")),
        "salary": None,
        "description": body,
        "work_mode": None,
    }


def fetch() -> list[dict]:
    jobs: list[dict] = []
    seen: set[str] = set()
    for q in _QUERIES:
        try:
            r = httpx.get(_API, params={"base_query": q, "country": "USA", "loc_query": "United States",
                                        "result_limit": _LIMIT, "offset": 0, "sort": "recent",
                                        "category[]": ["business-intelligence", "business-merchant-development",
                                                       "finance-accounting", "operations-it-support-eng",
                                                       "project-program-product-management-non-tech",
                                                       "sales-advertising-account-management"]},
                          headers=_UA, timeout=25)
            if r.status_code != 200:
                log.warning("amazon: %r -> HTTP %s", q, r.status_code)
                continue
            for j in r.json().get("jobs", []) or []:
                job = _to_job(j)
                if job and job["id"] not in seen:
                    seen.add(job["id"])
                    jobs.append(job)
        except Exception as e:  # noqa: BLE001
            log.warning("amazon: %r failed (%s)", q, e)
        time.sleep(_DELAY)
    log.info("amazon: %d unique US postings", len(jobs))
    return jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = fetch()
    print(len(res))
    for j in res[:8]:
        print(f"{j['location']} | {j['title']} | {j['posted_at']}".encode("ascii", "replace").decode("ascii"))
