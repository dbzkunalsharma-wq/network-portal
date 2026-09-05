import argparse
import asyncio
import logging
import os
import re
from datetime import datetime, timezone

from dotenv import load_dotenv
from telegram import Bot

import classify
import db
import geo
import signals
from alerts import broadcast_job
from sources import amazon, ats, builtin, google, linkedin, remoteok, simplyhired

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger("netportal.poll")

SOURCES = (ats, linkedin, simplyhired, amazon, google, builtin, remoteok)

# Freshness gate: drop postings whose posted_at parses to older than this. Jobs with a
# missing or unparseable date are KEPT.
MAX_AGE_DAYS = 45

_SENIORITY = re.compile(
    r"\b(senior|sr|junior|jr|lead|principal|staff|associate|assistant|trainee|intern|"
    r"internship|entry[- ]level|mid[- ]level|i{1,3}|iv|v|grade|level)\b",
    re.IGNORECASE,
)


def _parse_posted(value):
    if not value:
        return None
    text = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        try:
            dt = datetime.strptime(text[:10], "%Y-%m-%d")
        except (ValueError, IndexError):
            return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _is_stale(value, now=None, max_age_days=MAX_AGE_DAYS) -> bool:
    dt = _parse_posted(value)
    if dt is None:
        return False
    now = now or datetime.now(timezone.utc)
    return (now - dt).days > max_age_days


def _dedup_key(title, company):
    comp = re.sub(r"\s+", " ", (company or "").strip().lower())
    if not comp:
        return None
    t = (title or "").lower()
    t = _SENIORITY.sub(" ", t)
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return (t, comp)


def enrich(job: dict) -> dict:
    """Fill the profile signals from the FULL description (before it is truncated for
    export): sponsorship, salary (only when the source gave no structured pay),
    resume tags, seniority level and work mode."""
    title = job.get("title") or ""
    desc = job.get("description") or ""
    loc = job.get("location") or ""
    job["sponsorship"] = signals.sponsorship(desc)
    if not job.get("salary"):
        job["salary"] = signals.salary_usd(desc)
    job["tags"] = signals.tags(title, desc)
    job["level"] = signals.level(title, desc)
    if not job.get("work_mode"):
        job["work_mode"] = signals.work_mode(f"{loc} {title}") or signals.work_mode(desc[:400])
    return job


def collect_and_save():
    """Fetch every source, classify, enrich, persist. Returns the newly-seen jobs."""
    db.init()
    raw = []
    for src in SOURCES:
        name = src.__name__.split(".")[-1]
        try:
            jobs = src.fetch()
            log.info("%s: %d postings", name, len(jobs))
            raw.extend(jobs)
        except Exception:
            log.exception("source failed: %s", name)

    fresh = []
    matched = 0
    skipped_geo = 0
    skipped_stale = 0
    now = datetime.now(timezone.utc)
    seen_keys = set()
    for job in raw:
        if not geo.accepts_us(job.get("location")):
            skipped_geo += 1
            continue
        if _is_stale(job.get("posted_at"), now=now):
            skipped_stale += 1
            continue
        discipline = classify.classify(job.get("title", ""), job.get("description", ""))
        if not discipline:
            continue
        key = _dedup_key(job.get("title"), job.get("company"))
        if key is not None:
            if key in seen_keys:
                continue
            seen_keys.add(key)
        matched += 1
        job["discipline"] = discipline
        enrich(job)
        if db.save_job(job):
            fresh.append(job)
    log.info("non-US skipped: %d | stale (>%dd) skipped: %d | profile matches: %d | new: %d",
             skipped_geo, MAX_AGE_DAYS, skipped_stale, matched, len(fresh))
    return fresh


async def broadcast_all(jobs):
    token = os.environ.get("BOT_TOKEN")
    if not token:
        log.warning("BOT_TOKEN missing; skipping broadcast")
        return 0
    sent = 0
    async with Bot(token) as bot:
        for job in jobs:
            sent += await broadcast_job(bot, job)
    return sent


def main():
    parser = argparse.ArgumentParser(description="poller: fetch -> classify -> enrich -> dedup -> alert")
    parser.add_argument("--seed", action="store_true",
                        help="save current jobs as a baseline WITHOUT sending alerts")
    args = parser.parse_args()

    fresh = collect_and_save()
    sent = 0
    if args.seed:
        log.info("seed mode: %d jobs saved as baseline, no alerts sent", len(fresh))
    elif fresh:
        sent = asyncio.run(broadcast_all(fresh))
    log.info("done | new: %d | alerts sent: %d", len(fresh), sent)


if __name__ == "__main__":
    main()
