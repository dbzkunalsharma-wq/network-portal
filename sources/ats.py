"""ATS source: fetch raw job postings from company Applicant Tracking System feeds.

Companies publish here before aggregators copy them, so this is the early-signal
backbone. Each ATS exposes a public JSON board endpoint; this module normalizes the
per-platform shapes into the common raw-job dict the classifier consumes.

Platforms: Greenhouse, Lever, Ashby (with compensation), SmartRecruiters, and Workday
(per-tenant search + detail, US-facet, keyword-driven because Workday boards are huge).

Public contract (the poller imports this):
    fetch() -> list[dict]
Returns RAW job dicts WITHOUT a "discipline" key (the classifier assigns that later).
Structured fields a platform exposes (salary, work_mode) are filled here; the poller
only fills them from free text when they are still None.
"""

import html
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

import httpx

log = logging.getLogger(__name__)

WATCHLIST_PATH = Path(__file__).parent.parent / "watchlist.json"

TIMEOUT = 20.0
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json",
}


# --- HTML to plain text ---------------------------------------------------

class _TextExtractor(HTMLParser):
    _BLOCK = {"p", "br", "div", "li", "ul", "ol", "tr", "h1", "h2", "h3",
              "h4", "h5", "h6", "section", "header", "footer"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []

    def handle_data(self, data):
        self._parts.append(data)

    def handle_starttag(self, tag, attrs):
        if tag in self._BLOCK:
            self._parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self._BLOCK:
            self._parts.append("\n")

    def text(self) -> str:
        return "".join(self._parts)


def strip_html(raw: str | None) -> str:
    """Return plain text from an HTML string (Greenhouse double-encodes, so unescape first)."""
    if not raw:
        return ""
    parser = _TextExtractor()
    parser.feed(html.unescape(raw))
    text = parser.text()
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()


# --- small shared helpers -------------------------------------------------

def _ms_epoch_to_iso(ms) -> str | None:
    if ms is None:
        return None
    try:
        return datetime.fromtimestamp(int(ms) / 1000, tz=timezone.utc).date().isoformat()
    except (ValueError, TypeError, OSError):
        return None


def _iso_date(value) -> str | None:
    if not value:
        return None
    s = str(value)
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return s[:10] if len(s) >= 10 else s


def _fmt_usd(n) -> str:
    return f"${int(round(float(n))):,}"


def _blank(**overrides) -> dict:
    base = {
        "id": "", "source": "", "title": "", "company": "", "location": None, "url": "",
        "logo": None, "contact": None, "posted_at": None, "salary": None, "description": "",
        "work_mode": None,
    }
    base.update(overrides)
    return base


# --- per-platform normalizers ---------------------------------------------

def normalize_greenhouse(entry: dict, data: dict) -> list[dict]:
    company = entry["company"]
    slug = entry["slug"]
    out = []
    for j in data.get("jobs", []):
        loc = j.get("location") or {}
        depts = [d.get("name") for d in (j.get("departments") or []) if isinstance(d, dict) and d.get("name")]
        body = strip_html(j.get("content"))
        if depts:
            body = f"Department: {', '.join(depts)}\n\n{body}"
        out.append(_blank(
            id=f"greenhouse:{slug}:{j.get('id')}",
            source="greenhouse",
            title=j.get("title") or "",
            company=company,
            location=loc.get("name") if isinstance(loc, dict) else None,
            url=j.get("absolute_url") or "",
            posted_at=_iso_date(j.get("first_published") or j.get("updated_at")),
            description=body,
        ))
    return out


def normalize_lever(entry: dict, data: list) -> list[dict]:
    company = entry["company"]
    slug = entry["slug"]
    out = []
    for j in data:
        cats = j.get("categories") or {}
        loc = None
        if isinstance(cats, dict):
            locs = cats.get("allLocations") or []
            loc = ", ".join(locs) if isinstance(locs, list) and locs else cats.get("location")
        salary = None
        sr = j.get("salaryRange") or {}
        if isinstance(sr, dict) and sr.get("min") and sr.get("max") and (sr.get("currency") or "USD").upper() == "USD":
            unit = "/hr" if (sr.get("interval") or "").lower().startswith("hour") else "/yr"
            salary = f"{_fmt_usd(sr['min'])} – {_fmt_usd(sr['max'])}{unit}"
        wt = (j.get("workplaceType") or "").lower()
        work_mode = wt if wt in ("remote", "hybrid", "onsite") else None
        team = cats.get("team") if isinstance(cats, dict) else None
        body = j.get("descriptionPlain") or strip_html(j.get("description"))
        if team:
            body = f"Team: {team}\n\n{body}"
        out.append(_blank(
            id=f"lever:{slug}:{j.get('id')}",
            source="lever",
            title=j.get("text") or "",
            company=company,
            location=loc,
            url=j.get("hostedUrl") or j.get("applyUrl") or "",
            posted_at=_ms_epoch_to_iso(j.get("createdAt")),
            salary=salary,
            description=body,
            work_mode=work_mode,
        ))
    return out


def normalize_ashby(entry: dict, data: dict) -> list[dict]:
    company = entry["company"]
    slug = entry["slug"]
    out = []
    for j in data.get("jobs", []):
        loc = j.get("location")
        if isinstance(loc, dict):
            loc = loc.get("name") or loc.get("locationName")
        secondary = [s.get("location") for s in (j.get("secondaryLocations") or []) if isinstance(s, dict) and s.get("location")]
        if secondary:
            loc = ", ".join([loc] + secondary) if loc else ", ".join(secondary)
        comp = j.get("compensation") or {}
        salary = None
        if isinstance(comp, dict):
            salary = comp.get("scrapeableCompensationSalarySummary") or comp.get("compensationTierSummary") or None
            if salary:
                salary = re.sub(r"\s+", " ", str(salary)).strip()
                # keep only USD-looking summaries
                if "$" not in salary and "usd" not in salary.lower():
                    salary = None
        work_mode = "remote" if j.get("isRemote") else None
        if isinstance(loc, str) and re.search(r"\bhybrid\b", loc, re.I):
            work_mode = "hybrid"
        body = j.get("descriptionPlain") or strip_html(j.get("descriptionHtml"))
        dept = j.get("department") or j.get("team")
        if dept:
            body = f"Department: {dept}\n\n{body}"
        out.append(_blank(
            id=f"ashby:{slug}:{j.get('id')}",
            source="ashby",
            title=j.get("title") or "",
            company=company,
            location=loc,
            url=j.get("jobUrl") or j.get("applyUrl") or "",
            posted_at=_iso_date(j.get("publishedAt") or j.get("publishedDate")),
            salary=salary,
            description=body,
            work_mode=work_mode,
        ))
    return out


def normalize_smartrecruiters(entry: dict, data: dict) -> list[dict]:
    company = entry["company"]
    slug = entry["slug"]
    out = []
    for j in data.get("content", []):
        posting_id = j.get("id")
        if not posting_id:
            continue
        loc = j.get("location")
        location = None
        work_mode = None
        if isinstance(loc, dict):
            location = loc.get("fullLocation") or ", ".join(
                p for p in (loc.get("city"), loc.get("region"), loc.get("country")) if p
            ) or None
            if loc.get("remote"):
                work_mode = "remote"
        elif isinstance(loc, str):
            location = loc
        out.append(_blank(
            id=f"smartrecruiters:{slug}:{posting_id}",
            source="smartrecruiters",
            title=j.get("name") or "",
            company=company,
            location=location,
            url=f"https://jobs.smartrecruiters.com/{slug}/{posting_id}",
            posted_at=_iso_date(j.get("releasedDate")),
            description="",
            work_mode=work_mode,
        ))
    return out


# --- Workday ----------------------------------------------------------------
# Workday boards are per-tenant (host + site), POST-searched, and huge, so we run a
# handful of profile keyword searches with the United States location facet, then
# fetch the detail JSON for each unique posting whose TITLE could plausibly be in
# scope (a cheap pre-check; the real classifier runs later on the full description).

_WD_US_COUNTRY = "bc33aa3152ec42d4995f4791a106ed09"   # Workday's canonical GUID for the USA
_WD_QUERIES = (
    "strategy operations", "business operations", "chief of staff", "growth strategy",
    "pricing strategy", "strategic finance", "corporate strategy", "revenue operations",
    "marketplace", "strategic planning",
)
_WD_PAGE = 20
_WD_MAX_PAGES = 3
_WD_TITLE_HINT = re.compile(
    r"strateg|operations|bizops|business op|chief of staff|growth|pricing|monetiz|finance|fp&a|"
    r"revenue|marketplace|analytics|planning|expansion|launch|transformation",
    re.I,
)
_WD_TITLE_SKIP = re.compile(
    r"engineer|developer|architect|scientist|recruit|nurse|clinical|warehouse|store|technician|"
    r"intern\b|internship|sales (?:rep|exec|development)|account (?:exec|manager)|marketing manager|"
    r"accountant|counsel|legal|customer success|support|security|devops",
    re.I,
)
_WD_POSTED = re.compile(r"posted\s+(today|yesterday|(\d+)\+?\s+days?\s+ago|30\+\s+days\s+ago)", re.I)


def _wd_posted_to_iso(text: str | None) -> str | None:
    if not text:
        return None
    m = _WD_POSTED.search(text)
    if not m:
        return None
    today = datetime.now(timezone.utc).date()
    word = m.group(1).lower()
    if word == "today":
        return today.isoformat()
    if word == "yesterday":
        return (today - timedelta(days=1)).isoformat()
    if m.group(2):
        return (today - timedelta(days=int(m.group(2)))).isoformat()
    return (today - timedelta(days=30)).isoformat()


def _fetch_workday(client: httpx.Client, entry: dict) -> list[dict]:
    company = entry["company"]
    tenant = entry["slug"]
    wd = entry.get("wd") or "wd5"
    site = entry.get("site") or "External"
    base = f"https://{tenant}.{wd}.myworkdayjobs.com"
    search_url = f"{base}/wday/cxs/{tenant}/{site}/jobs"
    headers = {**HEADERS, "Content-Type": "application/json"}

    seen: dict[str, dict] = {}
    facets_ok = True
    for q in _WD_QUERIES:
        for page in range(_WD_MAX_PAGES):
            payload = {
                "appliedFacets": {"locationCountry": [_WD_US_COUNTRY]} if facets_ok else {},
                "limit": _WD_PAGE, "offset": page * _WD_PAGE, "searchText": q,
            }
            r = client.post(search_url, json=payload, headers=headers)
            if r.status_code in (400, 422) and facets_ok:
                # tenant rejects the country facet → retry this page without it
                facets_ok = False
                r = client.post(search_url, json={**payload, "appliedFacets": {}}, headers=headers)
            if r.status_code != 200:
                log.warning("workday %s: HTTP %s on %r", company, r.status_code, q)
                break
            data = r.json()
            postings = data.get("jobPostings") or []
            for p in postings:
                path = p.get("externalPath")
                title = p.get("title") or ""
                if not path or path in seen:
                    continue
                if not _WD_TITLE_HINT.search(title) or _WD_TITLE_SKIP.search(title):
                    continue
                seen[path] = p
            if len(postings) < _WD_PAGE:
                break
            time.sleep(0.15)

    out = []
    for path, p in seen.items():
        try:
            r = client.get(f"{base}/wday/cxs/{tenant}/{site}{path}", headers=HEADERS)
            if r.status_code != 200:
                continue
            info = (r.json() or {}).get("jobPostingInfo") or {}
        except (httpx.HTTPError, ValueError):
            continue
        locs = [info.get("location")] + list(info.get("additionalLocations") or [])
        locs = [l for l in locs if isinstance(l, str) and l.strip()]
        location = "; ".join(dict.fromkeys(locs)) if locs else p.get("locationsText")
        remote = (info.get("remoteType") or p.get("remoteType") or "").lower()
        work_mode = "remote" if "remote" in remote else ("hybrid" if "flex" in remote or "hybrid" in remote else None)
        req_id = info.get("jobReqId") or (p.get("bulletFields") or [None])[0] or path
        out.append(_blank(
            id=f"workday:{tenant}:{req_id}",
            source="workday",
            title=info.get("title") or p.get("title") or "",
            company=company,
            location=location,
            url=info.get("externalUrl") or f"{base}/en-US/{site}{path}",
            posted_at=_iso_date(info.get("startDate")) or _wd_posted_to_iso(p.get("postedOn")),
            description=strip_html(info.get("jobDescription")),
            work_mode=work_mode,
        ))
        time.sleep(0.1)
    return out


# --- fetchers (I/O) -------------------------------------------------------

_GREENHOUSE_URL = "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
_LEVER_URL = "https://api.lever.co/v0/postings/{slug}?mode=json"
_ASHBY_URL = "https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"
_SMARTRECRUITERS_PAGE = "https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100&offset={offset}"
_SMARTRECRUITERS_MAX = 1000

_PLATFORMS = {
    "greenhouse": (_GREENHOUSE_URL, normalize_greenhouse),
    "lever": (_LEVER_URL, normalize_lever),
    "ashby": (_ASHBY_URL, normalize_ashby),
    "smartrecruiters": (None, normalize_smartrecruiters),
}


def _fetch_smartrecruiters(client: httpx.Client, slug: str) -> dict:
    content: list[dict] = []
    offset = 0
    while offset < _SMARTRECRUITERS_MAX:
        resp = client.get(_SMARTRECRUITERS_PAGE.format(slug=slug, offset=offset))
        resp.raise_for_status()
        data = resp.json()
        page = data.get("content") or []
        content.extend(page)
        offset += 100
        if offset >= (data.get("totalFound") or 0) or not page:
            break
    return {"content": content}


def _fetch_one(client: httpx.Client, entry: dict) -> list[dict]:
    platform = (entry.get("platform") or "").lower()
    slug = entry.get("slug")
    if not platform or not slug:
        log.warning("watchlist entry missing platform/slug: %r", entry)
        return []
    if platform == "workday":
        return _fetch_workday(client, entry)
    spec = _PLATFORMS.get(platform)
    if spec is None:
        log.warning("unknown platform %r for %s", platform, entry.get("company"))
        return []
    url_tmpl, normalizer = spec
    if platform == "smartrecruiters":
        return normalizer(entry, _fetch_smartrecruiters(client, slug))
    resp = client.get(url_tmpl.format(slug=slug))
    resp.raise_for_status()
    return normalizer(entry, resp.json())


def load_watchlist(path: Path = WATCHLIST_PATH) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    return [item for item in raw if isinstance(item, dict)
            and "company" in item and "platform" in item and "slug" in item]


def fetch() -> list[dict]:
    try:
        entries = load_watchlist()
    except (OSError, json.JSONDecodeError) as e:
        log.error("could not load watchlist: %s", e)
        return []
    jobs: list[dict] = []
    with httpx.Client(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
        for entry in entries:
            company = entry.get("company", "?")
            try:
                got = _fetch_one(client, entry)
                log.info("%s (%s): %d jobs", company, entry.get("platform"), len(got))
                jobs.extend(got)
            except httpx.HTTPError as e:
                log.warning("fetch failed for %s: %s", company, e)
            except (ValueError, KeyError) as e:
                log.warning("parse failed for %s: %s", company, e)
    return jobs


# --- tests ----------------------------------------------------------------

_REQUIRED_KEYS = {"id", "source", "title", "company", "location", "url", "logo", "contact",
                  "posted_at", "salary", "description", "work_mode"}


def _check_shape(job: dict, expected_source: str):
    assert set(job.keys()) == _REQUIRED_KEYS, f"key mismatch: {sorted(job.keys())}"
    assert "discipline" not in job
    assert isinstance(job["id"], str) and job["id"]
    assert job["source"] == expected_source
    assert isinstance(job["title"], str) and isinstance(job["company"], str)
    assert job["location"] is None or isinstance(job["location"], str)
    assert isinstance(job["description"], str)


def _run_offline_tests():
    s = strip_html("<p>Hello&nbsp;<b>world</b></p><div>Design&amp;Build</div>")
    assert "Hello" in s and "world" in s and "Design&Build" in s and "<" not in s
    assert _ms_epoch_to_iso(1773335421350) == "2026-03-12"
    assert _iso_date("2026-04-17T12:25:57-04:00") == "2026-04-17"

    gh = normalize_greenhouse({"company": "DoorDash", "slug": "doordashusa"}, {"jobs": [{
        "id": 4321, "title": "Senior Manager, Strategy & Operations",
        "absolute_url": "https://boards.greenhouse.io/doordashusa/jobs/4321",
        "location": {"name": "Austin, TX"}, "updated_at": "2026-09-01T12:25:57-04:00",
        "departments": [{"name": "Strategy & Operations"}],
        "content": "&lt;p&gt;Pay range $140,000 - $180,000&lt;/p&gt;",
    }]})
    _check_shape(gh[0], "greenhouse")
    assert gh[0]["description"].startswith("Department: Strategy & Operations")
    assert "$140,000" in gh[0]["description"] and "<" not in gh[0]["description"]

    lv = normalize_lever({"company": "Gopuff", "slug": "gopuff"}, [{
        "id": "abc", "text": "Strategy & Ops Lead", "hostedUrl": "u",
        "categories": {"location": "Austin", "allLocations": ["Austin, TX", "Remote - US"], "team": "BizOps"},
        "createdAt": 1773335421350, "descriptionPlain": "Own it.",
        "salaryRange": {"min": 120000, "max": 150000, "currency": "USD", "interval": "per-year-salary"},
        "workplaceType": "hybrid",
    }])
    _check_shape(lv[0], "lever")
    assert lv[0]["location"] == "Austin, TX, Remote - US"
    assert lv[0]["salary"] == "$120,000 – $150,000/yr"
    assert lv[0]["work_mode"] == "hybrid"
    assert lv[0]["description"].startswith("Team: BizOps")

    ash = normalize_ashby({"company": "Ramp", "slug": "Ramp"}, {"jobs": [{
        "id": "d3bc", "title": "Chief of Staff", "location": "New York",
        "secondaryLocations": [{"location": "San Francisco"}], "isRemote": False,
        "jobUrl": "https://jobs.ashbyhq.com/Ramp/d3bc", "publishedAt": "2026-08-27T20:13:45.158+00:00",
        "descriptionPlain": "Support the CEO.", "department": "Executive",
        "compensation": {"compensationTierSummary": "$150K – $200K • Offers Equity"},
    }]})
    _check_shape(ash[0], "ashby")
    assert ash[0]["location"] == "New York, San Francisco"
    assert ash[0]["salary"] == "$150K – $200K • Offers Equity"
    assert ash[0]["posted_at"] == "2026-08-27"

    sr = normalize_smartrecruiters({"company": "Canva", "slug": "Canva"}, {"content": [{
        "id": "1", "name": "Strategy Manager", "releasedDate": "2026-09-01T00:00:00.000Z",
        "location": {"city": "Austin", "region": "TX", "country": "us", "fullLocation": "Austin, TX, United States", "remote": True},
    }]})
    _check_shape(sr[0], "smartrecruiters")
    assert sr[0]["work_mode"] == "remote" and sr[0]["location"] == "Austin, TX, United States"

    today = datetime.now(timezone.utc).date()
    assert _wd_posted_to_iso("Posted Today") == today.isoformat()
    assert _wd_posted_to_iso("Posted 3 Days Ago") == (today - timedelta(days=3)).isoformat()
    assert _wd_posted_to_iso("Posted 30+ Days Ago") == (today - timedelta(days=30)).isoformat()
    assert _wd_posted_to_iso(None) is None

    real = load_watchlist()
    assert all({"company", "platform", "slug"} <= set(e) for e in real)
    assert len(real) >= 50
    print("ats tests OK")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    _run_offline_tests()
    import sys
    if "--live" in sys.argv:
        results = fetch()
        by_company: dict[str, int] = {}
        for job in results:
            by_company[job["company"]] = by_company.get(job["company"], 0) + 1
        print(f"live fetch: {len(results)} jobs total")
        for name, n in sorted(by_company.items()):
            print(f"  {name}: {n}")
