"""Deterministic role classifier for the Strategy & Operations job radar.

classify(title, description) decides whether a posting is an in-scope Strategy /
Operations / Growth / Strategic-Finance role and, if so, which of the four
disciplines in disciplines.py it belongs to. Rules are keyword/taxonomy based on
purpose: the same input must always yield the same label, and the keyword sets
below are meant to be edited directly.

Profile this is tuned for (see README): a Senior Strategy & Operations Manager
(marketplace / delivery / consumer growth / pricing / capital allocation) — so
the net is: Strategy & Ops + BizOps, Corporate Strategy + Chief of Staff,
Growth + Pricing + Marketplace strategy, Strategic Finance / FP&A / RevOps /
Business Analytics. Everything else (engineering, sales reps, marketing,
warehouse ops, IT/dev/sec ops, HR, accounting, clinical, legal…) stays out.
"""

import re

# --- Hard disqualifiers (title) ----------------------------------------------
# Roles that carry "operations"/"strategy" substrings but are not this profile.
# Matched against the padded, lowercased TITLE so they short-circuit to None.
NON_ROLE = [
    # engineering / tech
    "engineer", "developer", "programmer", "architect", "scientist", "sre",
    "devops", "dev ops", "sysops", "secops", "security operations", "soc analyst",
    "it operations", "network operations", "cloud operations", "noc ",
    "database", "data engineer", "data analyst", "data scientist", "machine learning",
    "qa ", "quality assurance", "test engineer", "technical specialist", "solutions specialist",
    "solution specialist", "technical account", "sales engineer", "pre-sales", "presales",
    "renewal", "renewals", "partner development", "partnerships development", "channel manager",
    "field marketing", "customer marketing", "market development", "alliances",
    # product / program (generic) — product OPS and STRATEGIC programs are rescued below
    "product manager", "product management", "product owner", "technical program",
    "scrum", "agile coach", "delivery manager", "implementation manager",
    "solutions manager", "solution consultant", "customer success", "customer support",
    "support operations", "support specialist", "customer service", "customer experience manager",
    "account manager", "account executive", "account director", "client partner",
    # sales / marketing (strategy & ops flavours rescued below)
    "sales representative", "sales rep", "sales executive", "sales development",
    "business development representative", "bdr", "sdr", "inside sales", "field sales",
    "marketing manager", "brand manager", "content strategist", "brand strategist",
    "marketing strategist", "seo ", "sem ", "paid media", "performance marketing",
    "growth marketing", "demand generation", "social media", "communications manager",
    "public relations", "pr manager", "copywriter", "creative", "designer", "design",
    "community manager", "influencer", "events manager", "event operations",
    # people / HR / admin
    "recruiter", "recruiting", "talent acquisition", "sourcer", "human resources",
    " hr ", "people operations", "people ops", "people partner", "hrbp", "payroll",
    "executive assistant", "administrative", "office manager", "receptionist",
    "coordinator",
    # accounting / audit / treasury / risk
    "accountant", "accounting", "controller", "bookkeep", "tax ", "audit",
    "treasury", "billing", "collections", "accounts payable", "accounts receivable",
    "credit analyst", "underwrit", "actuar", "fraud", "risk analyst", "risk manager",
    "aml", "kyc", "compliance officer", "compliance analyst",
    # physical operations / retail / hospitality / logistics
    "warehouse", "fulfillment", "fulfilment", "distribution center", "sort center",
    "delivery station", "plant ", "manufacturing", "production manager", "production supervisor",
    "shift", "site leader", "site manager", "store manager", "store operations",
    "restaurant", "kitchen", "general manager - store", "branch manager", "facilities",
    "construction", "field service", "field technician", "technician", "maintenance",
    "logistics coordinator", "dispatcher", "driver", "fleet manager", "transportation manager",
    "supply chain", "procurement", "purchasing", "sourcing manager", "buyer", "planner",
    "inventory", "quality manager", "ehs", "safety manager", "housekeeping",
    # clinical / legal / other verticals
    "clinical", "nurse", "physician", "pharmac", "medical", "dental", "therapist",
    "legal", "counsel", "paralegal", "attorney", "teacher", "instructor", "professor",
    "lecturer", "researcher", "research scientist",
    # early-career
    "intern", "internship", "co-op", "apprentice", "trainee", "graduate program",
    "fellow", "student",
]

# Phrases that RESCUE a title from a soft disqualifier: e.g. "Sales Strategy &
# Operations Manager" is in-scope even though "sales" alone is not.
RESCUE = [
    "strategy & operations", "strategy and operations", "strategy & ops", "strategy and ops",
    "strategy/operations", "strategy, operations", "operations & strategy", "operations and strategy",
    "bizops", "biz ops", "business operations", "business ops", "strategic operations",
    "operations strategy", "sales strategy", "sales operations", "sales ops", "revenue operations",
    "revops", "rev ops", "gtm strategy", "go-to-market strategy", "gtm operations",
    "marketing strategy & operations", "marketing strategy and operations", "marketing operations",
    "product operations", "product ops", "strategic program", "strategic programs",
    "program strategy", "chief of staff", "strategic finance", "growth strategy",
    "pricing strategy", "corporate strategy", "business strategy", "strategy manager",
    "strategy lead", "strategy director", "strategy analyst", "strategy associate",
    "strategy consultant", "strategic planning", "strategic initiatives", "fp&a",
    "financial planning", "capital allocation", "lifecycle", "retention", "growth manager",
    "growth lead", "growth & operations", "growth and operations", "monetization",
    "pricing manager", "pricing lead", "head of pricing", "revenue strategy",
    "market expansion", "expansion strategy", "marketplace strategy", "marketplace growth",
    "business analytics", "analytics manager", "insights manager", "strategy & analytics",
]

# Soft disqualifiers: excluded UNLESS a RESCUE phrase is present in the title.
SOFT_EXCLUDE = [
    "sales", "marketing", "business development", "partnerships manager", "partner manager",
    "consultant", "consulting", "project manager", "project management", "program manager",
    "program management", "business analyst", "financial analyst", "analyst",
    "operations manager", "operations lead", "operations director", "director of operations",
    "head of operations", "vp operations", "vp of operations", "operations associate",
    "operations specialist", "operations", "general manager", "finance operations",
]

# --- Physical-ops signals (description) ---------------------------------------
# If a bare "operations" title has these in its description, it's floor/warehouse
# ops, not business ops.
PHYSICAL_SIGNALS = [
    "warehouse", "fulfillment center", "fulfilment center", "forklift", "hourly associates",
    "shift schedule", "night shift", "weekend shift", "plant", "manufacturing floor",
    "distribution center", "sort center", "delivery station", "osha", "safety compliance",
    "restaurant", "kitchen", "store associates", "retail store", "inventory counts",
    "fleet maintenance", "cdl", "loading dock", "pallet", "conveyor", "production line",
    "front of house", "back of house", "housekeeping", "front desk", "patients",
]

# --- Business-ops signals (description) ---------------------------------------
# Rescue a bare "operations manager" toward Strategy & Ops when the brief is
# analytical / strategic rather than physical.
BIZOPS_SIGNALS = [
    "strategy", "strategic", "cross-functional", "cross functional", "analytics",
    "sql", "kpi", "okr", "forecast", "p&l", "pricing", "marketplace", "market share",
    "growth", "unit economics", "business case", "roadmap", "stakeholder", "dashboard",
    "operating model", "operating cadence", "business review", "capital allocation",
    "go-to-market", "gtm", "playbook", "scal", "decision-making", "decision making",
    "experiments", "a/b", "insights", "executive", "leadership team",
]

# --- Discipline title keywords ------------------------------------------------
STRATOPS_TITLES = [
    "strategy & operations", "strategy and operations", "strategy & ops", "strategy and ops",
    "strategy/operations", "strategy, operations", "strategy/ops", "strategy - operations",
    "operations & strategy", "operations and strategy", "ops & strategy", "ops and strategy",
    "operations strategy", "ops strategy", "strategic operations", "s&o ",
    "bizops", "biz ops", "business operations", "business ops", "business operation",
    "marketplace operations", "marketplace ops", "market operations", "market ops",
    "city operations", "city ops", "city manager", "city lead", "city launcher",
    "launch operations", "launch manager", "launcher", "market launch", "new market",
    "market manager", "regional operations", "regional ops", "territory operations",
    "product operations", "product ops", "sales strategy", "sales operations", "sales ops",
    "gtm operations", "go-to-market operations", "gtm ops", "commercial operations",
    "commercial strategy", "partner operations", "partnerships operations", "merchant operations",
    "merchant ops", "restaurant operations manager", "driver operations", "courier operations",
    "supply operations", "demand operations", "fleet strategy", "ride operations",
    "delivery operations", "central operations", "central ops", "operations program",
    "operations excellence", "operational excellence", "operational strategy",
    "business planning", "planning & operations", "planning and operations",
    "strategy & planning", "strategy and planning", "strategic programs", "strategic program",
    "program strategy", "operations manager", "operations lead", "operations director",
    "director of operations", "head of operations", "vp operations", "vp of operations",
    "operations associate", "operations analyst", "operations specialist", "operations principal",
    "marketing strategy & operations", "marketing strategy and operations", "marketing operations",
    "revenue strategy & operations", "revenue strategy and operations", "field operations",
    "expansion operations", "operations, ", "operations -", ", operations",
]

STRATEGY_TITLES = [
    "corporate strategy", "business strategy", "company strategy", "enterprise strategy",
    "strategy manager", "strategy lead", "strategy director", "director of strategy",
    "director, strategy", "head of strategy", "vp strategy", "vp, strategy", "vp of strategy",
    "strategic planning", "strategic initiatives", "strategy & analytics", "strategy and analytics",
    "strategy & insights", "strategy and insights", "strategy & transformation",
    "strategy and transformation", "business transformation", "transformation manager",
    "transformation lead", "chief of staff", "strategy associate", "strategy analyst",
    "strategy consultant", "strategy principal", "strategy senior associate",
    "strategy senior manager", "strategy, ", "strategy -", ", strategy", "strategist",
    "office of the ceo", "office of the coo", "office of the cfo", "ceo office", "ceo's office",
    "strategic projects", "special projects", "strategy & business development",
    "strategy and business development", "strategy & bd", "strategy & partnerships",
    "strategy and partnerships", "strategy & execution",
    "strategy and execution", "strategy & growth", "strategy and growth",
]

GROWTH_TITLES = [
    "growth strategy", "growth manager", "growth lead", "growth operations", "growth & operations",
    "growth and operations", "head of growth", "director of growth", "vp growth", "vp of growth",
    "growth principal", "growth associate", "growth analyst", "growth strategist",
    "consumer growth", "user growth", "customer growth", "rider growth", "eater growth",
    "member growth", "membership growth", "subscriber growth", "growth & retention",
    "growth and retention", "pricing strategy", "pricing manager", "pricing lead",
    "pricing & ", "pricing and ", "head of pricing", "director of pricing", "pricing analyst",
    "pricing principal", "pricing associate", "pricing", "monetization", "monetisation",
    "revenue strategy", "revenue growth", "revenue management", "yield management",
    "gtm strategy", "go-to-market strategy", "market strategy", "market expansion",
    "expansion strategy", "expansion manager", "international expansion", "expansion lead",
    "lifecycle strategy", "lifecycle manager", "lifecycle marketing", "retention strategy",
    "retention manager", "retention lead", "churn", "customer strategy", "consumer strategy",
    "promotions strategy", "promo strategy", "incentives", "incentive strategy",
    "territory strategy", "marketplace strategy", "marketplace growth",
    "supply strategy", "demand strategy", "supply & demand", "supply and demand",
    "marketplace manager", "marketplace lead", "marketplace principal", "marketplace",
    "loyalty strategy", "loyalty manager", "membership strategy", "engagement strategy",
    "acquisition strategy",
]

FINANCE_TITLES = [
    "strategic finance", "finance & strategy", "finance and strategy", "fp&a", "fp & a",
    "financial planning & analysis", "financial planning and analysis", "financial planning",
    "corporate finance", "business finance", "finance manager", "finance lead", "finance director",
    "director of finance", "head of finance", "vp finance", "vp of finance", "finance business partner",
    "business partner, finance", "finance business partnering", "capital allocation",
    "investment strategy", "investment planning", "revenue operations", "revops", "rev ops",
    "business analytics", "analytics manager", "analytics lead", "head of analytics",
    "director of analytics", "insights manager", "insights lead", "business insights",
    "business intelligence manager", "commercial finance", "finance & analytics",
    "finance and analytics", "budget", "forecasting", "planning & analysis",
    "planning and analysis", "business planning & analysis", "strategic planning & analysis",
    "financial strategy", "finance strategy", "finance associate", "finance analyst",
    "financial analyst", "fp&a analyst", "strategic finance analyst", "investment analyst",
    "analytics & insights", "analytics and insights", "analytics principal", "analytics associate",
    "decision analytics", "business analytics manager", "revenue analytics", "growth analytics",
    "operations analytics", "marketplace analytics", "pricing analytics",
]


_GENERIC_OPS = (
    "operations manager", "operations lead", "operations director", "director of operations",
    "head of operations", "vp operations", "vp of operations", "operations associate",
    "operations analyst", "operations specialist", "operations principal", "operations, ",
    "operations -", ", operations", "field operations", "regional operations", "regional ops",
    "delivery operations",
)
STRATOPS_SPECIFIC = [p for p in STRATOPS_TITLES if p not in _GENERIC_OPS]


def _norm(text: str) -> str:
    """Lowercase, normalise fancy ampersands/dashes, collapse whitespace."""
    t = (text or "").lower()
    t = t.replace("&amp;", "&").replace(" and ops", " & ops")
    t = re.sub(r"[–—]", "-", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _has_any(haystack: str, needles) -> bool:
    return any(n in haystack for n in needles)


_MARKETING_STRATEGY_OK = ("marketing strategy & operations", "marketing strategy and operations",
                          "marketing operations", "lifecycle")


def classify(title: str, description: str = "") -> str | None:
    t = _norm(title)
    d = _norm(description)
    both = t + " " + d
    tp = " " + t + " "

    if not t:
        return None

    # 1. Hard disqualifiers — but a handful of them are overridden when the title
    #    carries an explicit in-scope phrase (e.g. "Sales Strategy & Operations" hits
    #    "sales"). "Strong" = any specific discipline phrase (not the generic
    #    "operations manager"-style ones, which need a description to be rescued).
    rescued = (
        _has_any(t, RESCUE)
        or _has_any(t, STRATOPS_SPECIFIC)
        or _has_any(t, STRATEGY_TITLES)
        or _has_any(t, GROWTH_TITLES)
        or _has_any(t, FINANCE_TITLES)
    )
    for bad in NON_ROLE:
        if bad in tp:
            # Rescue only for the "adjacent" families; engineering/clinical/etc. never.
            if rescued and bad in (
                "marketing manager", "growth marketing", "customer experience manager",
                "operations", "analyst", "coordinator", "consultant",
            ):
                continue
            # "product manager" inside "product operations manager"? no — different string.
            return None

    # Soft disqualifiers: out unless rescued by an explicit in-scope phrase.
    if not rescued and _has_any(tp, [" " + s for s in SOFT_EXCLUDE] + [s + " " for s in SOFT_EXCLUDE]):
        # A bare/generic ops title can still be rescued by an analytical description.
        generic_ops = _has_any(t, (
            "operations manager", "operations lead", "operations director", "director of operations",
            "head of operations", "vp operations", "vp of operations", "operations associate",
            "operations specialist", "general manager",
        ))
        if generic_ops and d and not _has_any(d, PHYSICAL_SIGNALS) and _has_any(d, BIZOPS_SIGNALS):
            return "stratops"
        return None

    # Marketing titles are only in when they are the strategy & ops flavour.
    if "marketing" in t and not _has_any(t, _MARKETING_STRATEGY_OK):
        return None

    physical = _has_any(d, PHYSICAL_SIGNALS)

    # 2. Finance / analytics first: "Strategic Finance" beats the generic "strategy" sweep.
    if _has_any(t, ("strategic finance", "fp&a", "fp & a", "financial planning", "corporate finance",
                    "business finance", "revenue operations", "revops", "rev ops", "capital allocation",
                    "investment strategy", "finance & strategy", "finance and strategy",
                    "finance & analytics", "finance and analytics", "financial strategy", "finance strategy")):
        return "finance"

    # 3. Growth & pricing: explicit growth/pricing/marketplace phrases.
    if _has_any(t, ("pricing", "monetization", "monetisation", "growth strategy", "growth manager",
                    "growth lead", "growth operations", "growth & operations", "growth and operations",
                    "head of growth", "director of growth", "vp growth", "vp of growth", "consumer growth",
                    "user growth", "customer growth", "rider growth", "eater growth", "member growth",
                    "retention", "lifecycle", "churn", "market expansion", "expansion strategy",
                    "international expansion", "expansion manager", "expansion lead", "gtm strategy",
                    "go-to-market strategy", "revenue strategy", "revenue growth", "revenue management",
                    "yield management", "marketplace strategy", "marketplace growth", "loyalty",
                    "promotions strategy", "promo strategy", "incentive", "supply & demand",
                    "supply and demand", "supply strategy", "demand strategy", "acquisition strategy",
                    "engagement strategy", "customer strategy", "consumer strategy",
                    "territory strategy", "growth strategist", "growth principal", "growth associate",
                    "growth analyst")):
        return "growth"

    # 4. Strategy & Ops: the core profile.
    if _has_any(t, STRATOPS_TITLES):
        if physical and _has_any(t, ("operations manager", "operations lead", "operations director",
                                     "director of operations", "head of operations", "delivery operations",
                                     "field operations", "regional operations")):
            return None
        return "stratops"

    # 5. Corporate strategy / chief of staff.
    if _has_any(t, STRATEGY_TITLES):
        if _has_any(t, ("content strategist", "brand strategist", "marketing strategist", "seo strategist",
                        "creative strategist", "social strategist", "digital strategist", "media strategist",
                        "ux strategist", "design strategist", "product strategist")):
            return None
        return "strategy"

    # 6. Remaining finance / analytics titles.
    if _has_any(t, FINANCE_TITLES):
        return "finance"

    # 7. Remaining growth titles.
    if _has_any(t, GROWTH_TITLES):
        return "growth"

    # 8. Bare "strategy" / "growth" / "marketplace" words with a manager-ish level.
    if re.search(r"\bstrateg", t) and re.search(r"\b(manager|lead|director|associate|principal|head|analyst|senior|sr)\b", t):
        return "strategy"

    return None


if __name__ == "__main__":
    # --- positives: Strategy & Ops -------------------------------------------
    assert classify("Senior Strategy & Operations Manager") == "stratops"
    assert classify("Strategy and Operations Manager, Marketplace") == "stratops"
    assert classify("Strategy & Ops Lead, US Delivery") == "stratops"
    assert classify("Business Operations Manager (Starlink)") == "stratops"
    assert classify("BizOps Manager") == "stratops"
    assert classify("Manager, City Operations") == "stratops"
    assert classify("Product Operations Manager") == "stratops"
    assert classify("Sales Strategy & Operations Manager") == "stratops"
    assert classify("Senior Manager, Marketplace Operations") == "stratops"
    assert classify("Launch Manager, New Markets") == "stratops"
    assert classify("Strategic Programs Manager") == "stratops"
    assert classify("Operations Manager", "Own strategy, cross-functional KPIs and SQL analytics for the marketplace") == "stratops"
    assert classify("Senior Operations Manager, Strategy & Programs") == "stratops"
    assert classify("Marketing Strategy & Operations, Lead") == "stratops"
    # --- positives: Corporate Strategy ---------------------------------------
    assert classify("Chief of Staff to the COO") == "strategy"
    assert classify("Corporate Strategy Manager") == "strategy"
    assert classify("Director, Business Strategy") == "strategy"
    assert classify("Senior Associate, Strategy") == "strategy"
    assert classify("Strategic Planning Manager") == "strategy"
    assert classify("Manager, Strategic Initiatives") == "strategy"
    assert classify("Strategy Consultant, Payer Operations") == "strategy"
    assert classify("Senior Manager, Strategy & Analytics") == "strategy"
    # --- positives: Growth & Pricing -----------------------------------------
    assert classify("Growth Strategy Manager") == "growth"
    assert classify("Senior Manager, Pricing Strategy") == "growth"
    assert classify("Pricing Manager") == "growth"
    assert classify("Consumer Growth Lead") == "growth"
    assert classify("Retention Strategy Manager") == "growth"
    assert classify("Lifecycle Marketing Manager") == "growth"
    assert classify("Manager, Marketplace Strategy") == "growth"
    assert classify("Head of Monetization") == "growth"
    assert classify("Market Expansion Manager") == "growth"
    assert classify("Revenue Management Manager") == "growth"
    # --- positives: Strategic Finance & Analytics ----------------------------
    assert classify("Strategic Finance Manager") == "finance"
    assert classify("Senior Manager, FP&A") == "finance"
    assert classify("Finance & Strategy Manager") == "finance"
    assert classify("Revenue Operations Manager") == "finance"
    assert classify("Manager, Business Analytics") == "finance"
    assert classify("Senior Financial Analyst, FP&A") == "finance"
    assert classify("Capital Allocation Lead") == "finance"
    assert classify("Finance Business Partner, Marketplace") == "finance"
    assert classify("Senior Analyst, Strategic Finance") == "finance"
    # --- negatives -----------------------------------------------------------
    assert classify("Software Engineer, Operations") is None
    assert classify("Operations Engineer") is None
    assert classify("Data Analyst, Strategy") is None
    assert classify("Data Scientist, Growth") is None
    assert classify("Product Manager, Growth") is None
    assert classify("Senior Product Manager, Pricing") is None
    assert classify("Technical Program Manager") is None
    assert classify("Program Manager") is None
    assert classify("Project Manager") is None
    assert classify("Business Analyst") is None
    assert classify("Account Executive, Strategic") is None
    assert classify("Sales Manager") is None
    assert classify("Marketing Manager") is None
    assert classify("Growth Marketing Manager") is None
    assert classify("Brand Strategist") is None
    assert classify("Content Strategist") is None
    assert classify("Recruiter, Strategy Team") is None
    assert classify("People Operations Manager") is None
    assert classify("Operations Coordinator") is None
    assert classify("Warehouse Operations Manager") is None
    assert classify("Sr. Operations Manager, SSD") is None   # bare ops, no biz signals
    assert classify("Operations Manager", "Lead a warehouse team on the night shift, forklift certified") is None
    assert classify("Site Leader") is None
    assert classify("Store Manager") is None
    assert classify("Supply Chain Manager") is None
    assert classify("Senior Accountant") is None
    assert classify("Financial Controller") is None
    assert classify("Tax Manager") is None
    assert classify("Treasury Analyst") is None
    assert classify("Risk Manager") is None
    assert classify("Customer Success Manager") is None
    assert classify("Support Operations Manager") is None
    assert classify("Security Operations Manager") is None
    assert classify("DevOps Manager") is None
    assert classify("IT Operations Manager") is None
    assert classify("Clinical Operations Manager") is None
    assert classify("Legal Operations Manager") is None
    assert classify("Strategy & Operations Intern") is None
    assert classify("MBA Intern, Strategy") is None
    assert classify("Executive Assistant to the Chief of Staff") is None
    assert classify("Operations Manager") is None            # bare, no description
    assert classify("General Manager") is None
    assert classify("Restaurant General Manager") is None
    assert classify("Field Service Technician") is None
    assert classify("Nurse Manager, Operations") is None
    assert classify("Sr. Worldwide Technical Specialist, Data & AI GTM Strategy") is None
    assert classify("Senior Renewal Operations Manager") is None
    assert classify("Strategic Partnerships Development Manager") is None
    assert classify("Principal Market Development") is None
    assert classify("Solutions Architect, Strategy") is None
    # --- guards --------------------------------------------------------------
    assert classify("Strategy & Operations Manager", "You will partner with engineers and sales") == "stratops"
    assert classify("Chief of Staff", "Support the CEO; work with recruiting and marketing") == "strategy"
    print("classify tests OK")
