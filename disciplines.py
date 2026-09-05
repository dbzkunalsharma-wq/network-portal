DISCIPLINES = {
    "stratops": "Strategy & Ops",
    "strategy": "Corporate Strategy",
    "growth": "Growth & Pricing",
    "finance": "Strategic Finance & Analytics",
}


def label(key: str) -> str:
    return DISCIPLINES.get(key, key)


def all_keys() -> list[str]:
    return list(DISCIPLINES.keys())
