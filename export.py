"""Export jobs to web/public/jobs.json (the feed the web app reads).

UNIONS the previously-published feed with the current DB rows, keyed by job id, so each
daily run ADDS to the live feed rather than replacing it (robust to a throttled cloud
scrape). Stale roles are then evicted by date so the union can't grow without bound.
"""

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import db

OUT = Path(__file__).parent / "web" / "public" / "jobs.json"
HIST = Path(__file__).parent / "web" / "public" / "stats-history.json"
FIELDS = ("id", "source", "discipline", "title", "company", "location",
          "url", "contact", "posted_at", "logo", "salary", "seen_at",
          "sponsorship", "level", "work_mode")

HISTORY_DAYS = 120
MAX_AGE_DAYS = 45
MAX_SEEN_AGE_DAYS = 50
DESCRIPTION_CHARS = 1600


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


def _is_stale(job, now) -> bool:
    posted = _parse_posted(job.get("posted_at"))
    if posted is not None:
        return (now - posted).days > MAX_AGE_DAYS
    seen = _parse_posted(job.get("seen_at"))
    if seen is not None:
        return (now - seen).days > MAX_SEEN_AGE_DAYS
    return False


def _load_prior_jobs() -> list[dict]:
    try:
        payload = json.loads(OUT.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError, OSError):
        return []
    jobs = payload.get("jobs") if isinstance(payload, dict) else None
    return [j for j in jobs if isinstance(j, dict) and j.get("id")] if isinstance(jobs, list) else []


def _update_history(jobs, now) -> int:
    today = now.date().isoformat()
    entry = {
        "date": today,
        "total": len(jobs),
        "per_source": dict(Counter(j.get("source") for j in jobs if j.get("source"))),
        "per_discipline": dict(Counter(j.get("discipline") for j in jobs if j.get("discipline"))),
    }
    try:
        hist = json.loads(HIST.read_text(encoding="utf-8"))
        if not isinstance(hist, list):
            hist = []
    except (FileNotFoundError, ValueError):
        hist = []
    hist = [h for h in hist if h.get("date") != today]
    hist.append(entry)
    hist.sort(key=lambda h: h.get("date", ""))
    hist = hist[-HISTORY_DAYS:]
    HIST.write_text(json.dumps(hist, ensure_ascii=False), encoding="utf-8")
    return len(hist)


def _project(row) -> dict:
    job = {k: row.get(k) for k in FIELDS}
    job["description"] = (row.get("description") or "").strip()[:DESCRIPTION_CHARS]
    tags = row.get("tags")
    if isinstance(tags, str):
        tags = [t for t in tags.split(",") if t]
    job["tags"] = list(tags) if isinstance(tags, (list, tuple)) else []
    return job


def main():
    now = datetime.now(timezone.utc)
    merged: dict[str, dict] = {}
    prior = _load_prior_jobs()
    for j in prior:
        merged[j["id"]] = _project(j)
    prior_count = len(merged)

    rows = db.recent_jobs(limit=8000)
    current_count = 0
    for r in rows:
        rid = r.get("id")
        if not rid:
            continue
        merged[rid] = _project(r)
        current_count += 1

    jobs = []
    dropped = 0
    for job in merged.values():
        if _is_stale(job, now):
            dropped += 1
            continue
        jobs.append(job)

    payload = {
        "generated_at": now.isoformat(timespec="seconds"),
        "count": len(jobs),
        "jobs": jobs,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    days = _update_history(jobs, now)
    print(f"prior {prior_count} + current {current_count} -> union {len(merged)}; "
          f"wrote {len(jobs)} jobs to {OUT} (dropped {dropped} stale); stats-history now {days} day(s)")


if __name__ == "__main__":
    main()
