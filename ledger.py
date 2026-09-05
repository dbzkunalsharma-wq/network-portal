"""Maintain a GROWING ledger of every US employer we've ever seen posting a profile-fit
role, with verified outreach domains. Run after export.py.

Why: the live feed only holds companies posting RIGHT NOW. A company that posted six
weeks ago is still a perfect networking target for a job hunt. This ledger accumulates
across daily runs (web/public/companies-ledger.json) so the /network page compounds.

Per company it stores: display name, disciplines/locations seen, logo, first/last seen,
days seen, current open roles, recruiter emails/phones the company itself published in
posts, and a MX-VERIFIED domain (.com/.io/.co/.ai + the logo host; we keep the one that
actually resolves with a mail server). Verification is cached and only re-run for new or
stale (>45d) companies.
"""

import asyncio
import json
import logging
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

log = logging.getLogger("netportal.ledger")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")

JOBS = Path(__file__).parent / "web" / "public" / "jobs.json"
LEDGER = Path(__file__).parent / "web" / "public" / "companies-ledger.json"

REVERIFY_DAYS = 45
DOH = "https://dns.google/resolve"
TLDS = ("com", "io", "co", "ai")
MAX_CANDIDATES = 12
DNS_CONCURRENCY = 24
DNS_TIMEOUT = 5.0

PLATFORM_HOSTS = {
    "linkedin.com", "licdn.com", "remoteok.com", "remoteok.io", "indeed.com", "glassdoor.com",
    "builtin.com", "simplyhired.com", "ziprecruiter.com", "wellfound.com", "greenhouse.io",
    "lever.co", "ashbyhq.com", "smartrecruiters.com", "myworkdayjobs.com", "workday.com",
    "gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com",
    "icloud.com", "gstatic.com", "googleusercontent.com", "ggpht.com", "cloudfront.net",
    "amazonaws.com", "fbcdn.net", "cdninstagram.com", "imgix.net", "unsplash.com", "google.com",
}

_SUFFIX = re.compile(
    r"\b(inc|incorporated|llc|corp|corporation|co|company|ltd|limited|technologies|technology|"
    r"labs|group|holdings|usa|us|the)\b",
    re.IGNORECASE,
)
_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE = re.compile(r"(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")


def _norm_key(name: str) -> str:
    s = (name or "").lower()
    s = _SUFFIX.sub(" ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _slug(name: str, strip_suffix: bool) -> str:
    s = (name or "").lower()
    if strip_suffix:
        s = _SUFFIX.sub(" ", s)
    return re.sub(r"[^a-z0-9]+", "", s)


def _registrable(host: str) -> str | None:
    host = (host or "").lower().lstrip(".")
    if host.startswith("www."):
        host = host[4:]
    parts = [p for p in host.split(".") if p]
    if len(parts) < 2:
        return None
    two_level = {"co.uk", "com.au", "co.in", "co.jp"}
    if len(parts) >= 3 and ".".join(parts[-2:]) in two_level:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def _logo_domain(logo: str | None) -> str | None:
    if not logo or not logo.startswith("http"):
        return None
    try:
        host = urlparse(logo).hostname or ""
    except ValueError:
        return None
    reg = _registrable(host)
    if not reg or reg in PLATFORM_HOSTS:
        return None
    return reg


def _domain_candidates(name: str, logo: str | None) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()

    def add(d: str | None):
        if d and d not in seen and "." in d:
            seen.add(d)
            out.append(d)

    add(_logo_domain(logo))
    for strip in (True, False):
        slug = _slug(name, strip)
        if len(slug) < 3:
            continue
        for tld in TLDS:
            add(f"{slug}.{tld}")
    return out[:MAX_CANDIDATES]


def _clean_contacts(jobs: list[dict]) -> tuple[list[str], list[str]]:
    emails: list[str] = []
    phones: list[str] = []
    for j in jobs:
        text = " ".join(str(j.get(k) or "") for k in ("description", "contact"))
        for m in _EMAIL.findall(text):
            dom = _registrable(m.split("@", 1)[1])
            if dom and dom not in PLATFORM_HOSTS and m.lower() not in (e.lower() for e in emails):
                emails.append(m)
        for m in _PHONE.findall(text):
            digits = re.sub(r"\D", "", m)[-10:]
            if len(digits) == 10 and digits not in phones:
                phones.append(digits)
    return emails[:5], phones[:5]


async def _mx_ok(client: httpx.AsyncClient, sem: asyncio.Semaphore, domain: str,
                 cache: dict[str, bool]) -> bool:
    if domain in cache:
        return cache[domain]
    ok = False
    async with sem:
        try:
            r = await client.get(DOH, params={"name": domain, "type": "MX"},
                                 headers={"accept": "application/dns-json"}, timeout=DNS_TIMEOUT)
            data = r.json()
            if data.get("Status") == 0:
                for ans in data.get("Answer", []):
                    if ans.get("type") == 15:
                        exch = str(ans.get("data", "")).split()[-1].rstrip(".")
                        if exch:
                            ok = True
                            break
        except Exception:
            ok = False
    cache[domain] = ok
    return ok


async def _best_domain(client, sem, candidates: list[str], cache) -> str | None:
    for d in candidates:
        if await _mx_ok(client, sem, d, cache):
            return d
    return None


async def _verify(to_check: dict[str, list[str]]) -> dict[str, str | None]:
    cache: dict[str, bool] = {}
    sem = asyncio.Semaphore(DNS_CONCURRENCY)
    out: dict[str, str | None] = {}
    async with httpx.AsyncClient() as client:
        async def one(key, cands):
            out[key] = await _best_domain(client, sem, cands, cache)
        await asyncio.gather(*(one(k, c) for k, c in to_check.items()))
    log.info("MX-checked %d unique domains across %d companies", len(cache), len(to_check))
    return out


def main():
    feed = json.loads(JOBS.read_text(encoding="utf-8"))
    jobs = feed.get("jobs", [])
    today = datetime.now(timezone.utc).date().isoformat()

    groups: dict[str, dict] = {}
    for j in jobs:
        comp = (j.get("company") or "").strip()
        if not comp:
            continue
        key = _norm_key(comp)
        if not key:
            continue
        g = groups.setdefault(key, {"names": Counter(), "disciplines": set(), "locations": set(),
                                    "logos": [], "jobs": []})
        g["names"][comp] += 1
        if j.get("discipline"):
            g["disciplines"].add(j["discipline"])
        if j.get("location"):
            g["locations"].add(j["location"])
        if j.get("logo"):
            g["logos"].append(j["logo"])
        g["jobs"].append(j)

    try:
        ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
        if not isinstance(ledger, dict):
            ledger = {}
    except (FileNotFoundError, ValueError):
        ledger = {}

    to_check: dict[str, list[str]] = {}
    for key, g in groups.items():
        name = g["names"].most_common(1)[0][0]
        logo = g["logos"][0] if g["logos"] else None
        prev = ledger.get(key)
        stale = (not prev or not prev.get("verified_on")
                 or (datetime.fromisoformat(today) - datetime.fromisoformat(prev["verified_on"])).days >= REVERIFY_DAYS
                 or (prev.get("domain") is None))
        if stale:
            to_check[key] = _domain_candidates(name, logo)

    verified = asyncio.run(_verify(to_check)) if to_check else {}

    added = 0
    for key, g in groups.items():
        name = g["names"].most_common(1)[0][0]
        logo = g["logos"][0] if g["logos"] else None
        open_roles = len(g["jobs"])
        emails, phones = _clean_contacts(g["jobs"])
        prev = ledger.get(key)
        if prev is None:
            added += 1
            entry = {"name": name, "first_seen": today, "days_seen": 1}
        else:
            entry = prev
            entry["name"] = name
            entry["days_seen"] = prev.get("days_seen", 1) + (0 if prev.get("last_seen") == today else 1)
        entry["last_seen"] = today
        entry["open_roles"] = open_roles
        entry["disciplines"] = sorted(set(entry.get("disciplines", [])) | g["disciplines"])
        entry["locations"] = sorted(set(entry.get("locations", [])) | g["locations"])[:12]
        if logo and not entry.get("logo"):
            entry["logo"] = logo
        entry["posted_emails"] = sorted(set(entry.get("posted_emails", [])) | set(emails))[:6]
        entry["posted_phones"] = sorted(set(entry.get("posted_phones", [])) | set(phones))[:6]
        if key in verified:
            entry["domain"] = verified[key]
            entry["verified_on"] = today
        ledger[key] = entry

    for key, entry in ledger.items():
        if key not in groups:
            entry["open_roles"] = 0

    LEDGER.write_text(json.dumps(ledger, ensure_ascii=False), encoding="utf-8")
    with_domain = sum(1 for e in ledger.values() if e.get("domain"))
    hiring_now = sum(1 for e in ledger.values() if e.get("open_roles"))
    log.info("ledger: %d companies total (+%d new) | %d currently hiring | %d MX-verified domains",
             len(ledger), added, hiring_now, with_domain)


if __name__ == "__main__":
    main()
