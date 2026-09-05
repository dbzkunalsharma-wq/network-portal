"""Deterministic per-posting signals extracted from the FULL description at ingest.

The public feed truncates descriptions to ~1.2k chars, so anything that depends
on the whole text is computed here and exported as small fields:

  sponsorship(text)  -> "no" | "yes" | "unknown"   (visa / work-authorization wording)
  salary_usd(text)   -> normalised "$120,000 – $150,000/yr" string, or None
  tags(title, text)  -> list of resume-keyword keys the posting hits
  level(title, text) -> "analyst" | "manager" | "senior" | "director"
  work_mode(text)    -> "remote" | "hybrid" | "onsite" | None

No ML: every rule is a regex or phrase list, and every input maps to one output.
"""

import re

# ---------------------------------------------------------------------------
# Visa sponsorship / work authorization
# ---------------------------------------------------------------------------

_NO_SPONSOR = [
    "will not sponsor", "does not sponsor", "do not sponsor", "cannot sponsor", "can not sponsor",
    "unable to sponsor", "not able to sponsor", "not currently sponsor", "not sponsor",
    "no sponsorship", "without sponsorship", "without the need for sponsorship",
    "without the need for visa sponsorship", "without need for sponsorship",
    "not offer sponsorship", "not provide sponsorship", "not provide visa sponsorship",
    "not offer visa sponsorship", "not provide immigration sponsorship",
    "sponsorship is not available", "sponsorship not available", "sponsorship is unavailable",
    "visa sponsorship is not", "not eligible for sponsorship", "no visa sponsorship",
    "are not able to provide sponsorship", "unable to provide sponsorship",
    "not able to provide visa sponsorship", "without requiring sponsorship",
    "without company sponsorship", "without employer sponsorship", "not sponsor work visas",
    "not sponsor visas", "not sponsor employment visas", "not sponsor h-1b", "not sponsor h1b",
    "no h-1b", "no h1b", "must be a u.s. citizen", "must be a us citizen", "must be us citizen",
    "us citizenship required", "u.s. citizenship required", "us citizenship is required",
    "u.s. citizenship is required", "us citizens only", "u.s. citizens only",
    "citizenship is required", "citizenship required", "security clearance",
    "must be authorized to work in the united states without", "authorized to work in the u.s. without",
    "authorized to work in the us without", "authorized to work in the united states without",
    "work authorization without", "green card holders only", "permanent residents only",
    "us persons only", "u.s. persons only", "u.s. person", "itar", "export control",
    "must currently be authorized", "must be currently authorized", "must be legally authorized to work in the united states without",
    "not accept opt", "no opt", "cpt/opt not", "without future sponsorship", "now or in the future",
]

_YES_SPONSOR = [
    "visa sponsorship available", "visa sponsorship is available", "will sponsor",
    "sponsorship available", "sponsorship is available", "offer visa sponsorship",
    "offers visa sponsorship", "provide visa sponsorship", "provides visa sponsorship",
    "h-1b sponsorship", "h1b sponsorship", "h-1b transfer", "h1b transfer", "open to sponsoring",
    "able to sponsor", "we sponsor", "can sponsor", "willing to sponsor", "immigration sponsorship",
    "support visa", "sponsorship for this role", "eligible for sponsorship", "sponsor work visas",
    "sponsor visas", "sponsorship may be available", "sponsorship is possible",
]


def sponsorship(text: str) -> str:
    t = (text or "").lower()
    if not t:
        return "unknown"
    t = re.sub(r"\s+", " ", t)
    # "now or in the future" is the canonical phrasing of "must be authorized … now or in
    # the future (no sponsorship)". Only count it next to authorization wording.
    for phrase in _NO_SPONSOR:
        if phrase == "now or in the future":
            if re.search(r"authoriz\w* to work[^.]{0,80}now or in the future", t):
                return "no"
            continue
        if phrase in t:
            return "no"
    for phrase in _YES_SPONSOR:
        if phrase in t:
            return "yes"
    return "unknown"


# ---------------------------------------------------------------------------
# Salary (USD) extraction
# ---------------------------------------------------------------------------

_NUM = r"(\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d+)?\s?[kK]|\d{4,7}|\d{2,3}(?:\.\d{1,2})?)"
_RANGE = re.compile(
    r"(?:usd\s*)?\$\s?" + _NUM + r"\s*(?:-|–|—|to|and)\s*(?:usd\s*)?\$?\s?" + _NUM
    + r"(?:\s*(?:usd|per\s*(?:year|yr|annum|hour|hr)|/\s*(?:year|yr|hour|hr)|annually|hourly|a year|an hour))?",
    re.IGNORECASE,
)
_SINGLE = re.compile(
    r"\$\s?" + _NUM + r"\s*(?:usd)?\s*(?:per\s*(?:year|yr|annum|hour|hr)|/\s*(?:year|yr|hour|hr)|annually|hourly|a year|an hour|base)",
    re.IGNORECASE,
)


def _to_number(tok: str) -> float:
    s = tok.replace(",", "").strip().lower()
    if s.endswith("k"):
        return float(s[:-1].strip()) * 1000
    return float(s)


def _fmt(n: float) -> str:
    return f"${int(round(n)):,}"


def salary_usd(text: str) -> str | None:
    """Normalise the first plausible USD pay figure in the text.

    Returns e.g. "$120,000 – $150,000/yr", "$95,000/yr" or "$45 – $55/hr"; None when no
    plausible figure is present (annual 30k–1.2M, hourly 15–400)."""
    if not text:
        return None
    t = text.replace(" ", " ")
    for m in _RANGE.finditer(t):
        lo, hi = _to_number(m.group(1)), _to_number(m.group(2))
        tail = m.group(0).lower()
        hourly = "hour" in tail or "/hr" in tail or "hr" in tail.split()[-1:]
        if lo > hi:
            lo, hi = hi, lo
        if hourly or (15 <= lo <= 400 and 15 <= hi <= 400):
            if 15 <= lo <= 400 and 15 <= hi <= 400:
                return f"{_fmt(lo)} – {_fmt(hi)}/hr"
            continue
        if 30_000 <= lo <= 1_200_000 and 30_000 <= hi <= 1_200_000:
            return f"{_fmt(lo)} – {_fmt(hi)}/yr"
    for m in _SINGLE.finditer(t):
        n = _to_number(m.group(1))
        tail = m.group(0).lower()
        if "hour" in tail or "/hr" in tail:
            if 15 <= n <= 400:
                return f"{_fmt(n)}/hr"
            continue
        if 30_000 <= n <= 1_200_000:
            return f"{_fmt(n)}/yr"
    return None


# ---------------------------------------------------------------------------
# Resume-keyword tags (what in the posting matches the target profile)
# ---------------------------------------------------------------------------

TAG_RULES: list[tuple[str, str, str]] = [
    # key, label, regex
    ("marketplace", "Marketplace", r"marketplace|two[- ]sided|supply and demand|supply & demand|liquidity"),
    ("delivery", "Delivery / mobility", r"\bdelivery\b|last[- ]mile|courier|dasher|driver partners?|rideshare|ride[- ]hail|mobility|on[- ]demand|gig economy|logistics network"),
    ("merchants", "Merchants / eaters", r"restaurant|merchant|eater|grocery|\bfood\b|consumer app|diners?"),
    ("pricing", "Pricing & fees", r"pricing|price|\bfees?\b|take rate|promotions?|incentives?|discount|subsidy"),
    ("capital", "Capital allocation", r"capital allocation|investment|\bbudget|\bspend\b|\broi\b|unit economics|contribution margin|payback|cost[- ]benefit"),
    ("forecasting", "Forecasting", r"forecast|projection|scenario|demand planning|capacity planning"),
    ("pnl", "P&L", r"p&l|p and l|profit and loss|profitability|\bmargins?\b|ebitda"),
    ("growth", "Growth & retention", r"\bgrowth\b|acquisition|retention|churn|lifecycle|engagement|frequency|cohort|re-?activation"),
    ("markets", "Market strategy", r"market share|competiti|regional|\bcities\b|city[- ]level|market[- ]level|expansion|launch"),
    ("sql", "SQL", r"\bsql\b|snowflake|bigquery|redshift|presto|\bhive\b|databricks"),
    ("dashboards", "Dashboards & sheets", r"dashboard|tableau|looker|\bmode\b|power ?bi|data studio|apps script|google sheets|spreadsheet|excel"),
    ("xfn", "Cross-functional", r"cross[- ]functional|stakeholder|partner with|collaborat|work closely with"),
    ("regulatory", "Regulatory / policy", r"regulat|compliance|policy|legal requirements|legislat"),
    ("automation", "Process & automation", r"automat|process improvement|operational efficiency|scalable process|playbook|operating model|standardi[sz]"),
    ("leadership", "Leads a team", r"lead a team|manage a team|people manager|direct reports|build and lead|team of"),
    ("kpis", "KPIs & reporting", r"\bkpis?\b|\bokrs?\b|metrics|scorecard|business review|reporting"),
    ("experimentation", "Experiments & pilots", r"a/b test|experiment|pilot|test[- ]and[- ]learn|hypothes"),
    ("exec", "Exec-facing", r"executive|leadership team|c-suite|senior leaders|board"),
]

_TAG_COMPILED = [(k, re.compile(rx, re.IGNORECASE)) for k, _, rx in TAG_RULES]


def tags(title: str, text: str) -> list[str]:
    hay = f"{title or ''}\n{text or ''}"
    return [k for k, rx in _TAG_COMPILED if rx.search(hay)]


# ---------------------------------------------------------------------------
# Seniority level
# ---------------------------------------------------------------------------

_DIRECTOR = re.compile(r"\b(director|vp|vice president|svp|evp|head of|chief (?!of staff)|president|partner|general manager|\bgm\b)\b", re.I)
_SENIOR = re.compile(r"\b(senior manager|sr\.? manager|senior mgr|sr\.? mgr|group manager|principal|(?<!of )staff|senior lead|sr\.? lead|manager ii|manager iii|manager 2|manager 3|lead)\b", re.I)
_SR_WORD = re.compile(r"\b(senior|sr\.?)\b", re.I)
_MANAGER = re.compile(r"\b(manager|mgr|chief of staff)\b", re.I)
_ANALYST = re.compile(r"\b(analyst|associate|specialist|coordinator|consultant|senior associate|senior analyst)\b", re.I)
_YOE = re.compile(r"(\d{1,2})\s*\+?\s*(?:-|–|to)?\s*(\d{1,2})?\s*\+?\s*years?", re.I)


def level(title: str, text: str = "") -> str:
    t = title or ""
    if _DIRECTOR.search(t):
        return "director"
    if _SENIOR.search(t) or (_SR_WORD.search(t) and _MANAGER.search(t)):
        return "senior"
    if _MANAGER.search(t):
        return "manager"
    if _ANALYST.search(t):
        # "Senior Analyst" / "Senior Associate" stay analyst-tier (IC), but a
        # description asking 6+ years reads as manager-equivalent.
        yoe = _min_years(text)
        return "manager" if yoe is not None and yoe >= 6 else "analyst"
    yoe = _min_years(text)
    if yoe is not None:
        if yoe >= 10:
            return "director"
        if yoe >= 7:
            return "senior"
        if yoe <= 2:
            return "analyst"
    return "manager"


def _min_years(text: str):
    if not text:
        return None
    best = None
    for m in _YOE.finditer(text):
        try:
            n = int(m.group(1))
        except ValueError:
            continue
        if 0 <= n <= 25:
            best = n if best is None else min(best, n)
    return best


# ---------------------------------------------------------------------------
# Work mode from free text
# ---------------------------------------------------------------------------

def work_mode(text: str) -> str | None:
    t = (text or "").lower()
    if not t:
        return None
    if re.search(r"\bhybrid\b", t):
        return "hybrid"
    if re.search(r"\b(remote|work from home|wfh|distributed|anywhere)\b", t):
        return "remote"
    if re.search(r"\b(on-?site|in[- ]office|in person)\b", t):
        return "onsite"
    return None


if __name__ == "__main__":
    assert sponsorship("We are unable to sponsor visas for this role.") == "no"
    assert sponsorship("Must be authorized to work in the U.S. without sponsorship now or in the future") == "no"
    assert sponsorship("Applicants must be authorized to work for any employer in the U.S. now or in the future. We are unable to sponsor.") == "no"
    assert sponsorship("Visa sponsorship available for this role.") == "yes"
    assert sponsorship("We are able to sponsor H-1B transfers.") == "yes"
    assert sponsorship("We are not able to sponsor H-1B at this time.") == "no"
    assert sponsorship("Great team, great snacks.") == "unknown"
    assert sponsorship("") == "unknown"
    assert salary_usd("The base pay range is $120,000 - $150,000 per year") == "$120,000 – $150,000/yr"
    assert salary_usd("Compensation: $95K–$115K + equity") == "$95,000 – $115,000/yr"
    assert salary_usd("USD $140,000 to $175,000 annually") == "$140,000 – $175,000/yr"
    assert salary_usd("$45 - $55 / hour") == "$45 – $55/hr"
    assert salary_usd("$128,000 per year base") == "$128,000/yr"
    assert salary_usd("Save $5 today") is None
    assert salary_usd("we manage a $10M weekly budget") is None
    assert "marketplace" in tags("Strategy & Ops", "own marketplace liquidity and pricing with SQL")
    assert "sql" in tags("", "Strong SQL and Tableau")
    assert level("Senior Strategy & Operations Manager") == "senior"
    assert level("Strategy & Operations Manager") == "manager"
    assert level("Director, Strategy") == "director"
    assert level("Head of BizOps") == "director"
    assert level("Chief of Staff") == "manager"
    assert level("Strategy & Operations Associate") == "analyst"
    assert level("Senior Associate, Strategy", "7+ years of experience") == "manager"
    assert level("Strategy & Operations, Marketplace", "8+ years") == "senior"
    assert level("Strategy & Operations Lead") == "senior"
    assert level("Principal, Strategy") == "senior"
    assert work_mode("This is a hybrid role in Austin") == "hybrid"
    assert work_mode("Remote - US") == "remote"
    assert work_mode("Austin, TX") is None
    print("signals tests OK")
