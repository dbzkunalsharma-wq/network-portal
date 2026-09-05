"""RemoteOK remote-ops/strategy source via its public JSON API (https://remoteok.com/api).

Global remote roles; the US filter (geo.accepts_us) keeps the worldwide/US-open ones.
No auth. Returns RAW job dicts; the classifier assigns 'discipline' later. Never raises.
"""

import logging

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("dod")

_API = "https://remoteok.com/api"
_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
_HINTS = ("strateg", "operations", "bizops", "biz ops", "chief of staff", "growth", "pricing",
          "finance", "revenue", "marketplace", "analytics", "ops")


def _strip(html_text) -> str:
    if not html_text:
        return ""
    return BeautifulSoup(str(html_text), "html.parser").get_text(" ", strip=True)


def _to_job(item) -> dict | None:
    position = item.get("position")
    if not position:
        return None
    tags = [str(t).lower() for t in (item.get("tags") or [])]
    blob = (position + " " + " ".join(tags)).lower()
    if not any(h in blob for h in _HINTS):
        return None
    salary = None
    lo, hi = item.get("salary_min"), item.get("salary_max")
    try:
        if lo and hi and int(lo) >= 20000 and int(hi) >= int(lo):
            salary = f"${int(lo):,} – ${int(hi):,}/yr"
    except (TypeError, ValueError):
        salary = None
    return {
        "id": f"remoteok:{item.get('id')}",
        "source": "remoteok",
        "title": position,
        "company": item.get("company"),
        "location": item.get("location") or "Remote",
        "url": item.get("url") or item.get("apply_url"),
        "logo": item.get("company_logo") or item.get("logo") or None,
        "contact": None,
        "posted_at": (item.get("date") or "")[:10] or None,
        "salary": salary,
        "description": f"{position} {_strip(item.get('description'))} {' '.join(tags)}",
        "work_mode": "remote",
    }


def fetch() -> list[dict]:
    try:
        resp = httpx.get(_API, headers=_UA, timeout=20)
        arr = resp.json() if resp.status_code == 200 else []
    except Exception as e:  # noqa: BLE001
        log.warning("remoteok: fetch failed (%s)", e)
        return []
    jobs = []
    for item in arr:
        if not isinstance(item, dict) or "position" not in item:
            continue
        job = _to_job(item)
        if job:
            jobs.append(job)
    log.info("remoteok: %d ops/strategy postings", len(jobs))
    return jobs
