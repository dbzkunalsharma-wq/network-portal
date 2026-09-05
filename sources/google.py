"""Google Careers (google.com/about/careers) — server-rendered results, no login.

Each result <li> carries the job link (jobs/results/<id>-<slug>), title, company
(Google / YouTube / Fitbit…), one or more "City, ST, USA" locations, a level word
(Mid / Advanced / Early) and the minimum-qualifications snippet. Google is one of
the largest Strategy & Operations employers in the US (incl. Austin), so it gets its
own source. Never raises.
"""

import logging
import re
import time

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger("dod")

_BASE = "https://www.google.com/about/careers/applications/jobs/results"
_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
       "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9"}
_QUERIES = ('"strategy and operations"', '"business operations"', '"chief of staff"',
            '"pricing strategy"', '"strategic finance"', '"growth strategy"',
            '"corporate strategy"', '"strategy and planning"')
_PAGES = 2
_DELAY = 0.8
_ID = re.compile(r"jobs/results/(\d+)-")


def _to_job(li) -> dict | None:
    a = li.select_one('a[href*="jobs/results/"]')
    if a is None:
        return None
    href = a.get("href") or ""
    m = _ID.search(href)
    if not m:
        return None
    jid = m.group(1)
    parts = [p.strip(" ;") for p in li.get_text(" | ", strip=True).split(" | ")]
    parts = [p for p in parts if p and p not in ("corporate_fare", "place", "bar_chart")]
    if not parts:
        return None
    title = parts[0]
    company = "Google"
    locs: list[str] = []
    level = None
    snippet = ""
    for p in parts[1:]:
        if p in ("Google", "YouTube", "Fitbit", "Waymo", "Verily", "DeepMind", "Google Fiber"):
            company = p
        elif re.search(r",\s*[A-Z]{2},\s*USA$", p) or re.search(r"\bUSA\b", p):
            locs.append(p)
        elif p.startswith("+") and "more" in p:
            continue
        elif p in ("Early", "Mid", "Advanced", "Director", "Executive"):
            level = level or p
        elif len(p) > 40:
            snippet = p if len(p) > len(snippet) else snippet
    url = href if href.startswith("http") else "https://www.google.com/about/careers/applications/" + href.lstrip("/")
    url = url.split("?")[0]
    desc = " ".join(x for x in (f"Level: {level}." if level else "", snippet) if x)
    return {
        "id": f"google:{jid}",
        "source": "google",
        "title": title,
        "company": company,
        "location": "; ".join(dict.fromkeys(locs)) if locs else None,
        "url": url,
        "logo": "https://www.google.com/s2/favicons?sz=128&domain=google.com",
        "contact": None,
        "posted_at": None,
        "salary": None,
        "description": desc,
        "work_mode": None,
    }


def fetch() -> list[dict]:
    jobs: list[dict] = []
    seen: set[str] = set()
    with httpx.Client(headers=_UA, timeout=30, follow_redirects=True) as c:
        for q in _QUERIES:
            for page in range(1, _PAGES + 1):
                try:
                    r = c.get(_BASE, params={"q": q, "location": "United States", "page": page})
                    if r.status_code != 200:
                        log.warning("google: %r p%d -> HTTP %s", q, page, r.status_code)
                        break
                    s = BeautifulSoup(r.text, "html.parser")
                    found = 0
                    for li in s.select("li"):
                        if li.select_one('a[href*="jobs/results/"]') is None:
                            continue
                        job = _to_job(li)
                        if job and job["id"] not in seen:
                            seen.add(job["id"])
                            jobs.append(job)
                            found += 1
                    if found == 0:
                        break
                except Exception as e:  # noqa: BLE001
                    log.warning("google: %r p%d failed (%s)", q, page, e)
                    break
                time.sleep(_DELAY)
    log.info("google: %d unique US postings", len(jobs))
    return jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = fetch()
    print(len(res))
    for j in res[:10]:
        print(f"{j['location']} | {j['title']} | {j['company']}".encode("ascii", "replace").decode("ascii"))
