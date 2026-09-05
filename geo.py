"""US geo filter for job locations.

accepts_us(location) is True when a US-based applicant could take the role:
the location names the United States / a US state / a major US city, or it is
remote and not pinned to a non-US region. is_us() is the strict "named US place"
check; remote_kind() classifies remote wording.
"""

import re

_STATE_NAMES = (
    "alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|"
    "hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|"
    "michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|"
    "new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|"
    "rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|"
    "west virginia|wisconsin|wyoming|district of columbia"
)

_STATE_ABBR = (
    "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|"
    "NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC"
)

_CITIES = (
    "austin|dallas|houston|san antonio|fort worth|plano|irving|frisco|round rock|"
    "san francisco|sf bay area|bay area|san jose|oakland|palo alto|mountain view|menlo park|"
    "sunnyvale|santa clara|redwood city|cupertino|south san francisco|berkeley|san mateo|"
    "new york|nyc|manhattan|brooklyn|jersey city|hoboken|"
    "seattle|bellevue|redmond|kirkland|"
    "los angeles|santa monica|culver city|venice|playa vista|irvine|san diego|orange county|"
    "chicago|denver|boulder|boston|cambridge, ma|somerville|"
    "washington, dc|washington dc|washington, d\\.c\\.|arlington|mclean|reston|tysons|bethesda|"
    "atlanta|miami|fort lauderdale|tampa|orlando|jacksonville|"
    "phoenix|scottsdale|tempe|chandler|philadelphia|pittsburgh|minneapolis|st\\. paul|"
    "nashville|charlotte|raleigh|durham|portland, or|portland, oregon|salt lake city|las vegas|"
    "detroit|ann arbor|columbus|indianapolis|kansas city|st\\. louis|saint louis|baltimore|"
    "sacramento|cincinnati|cleveland|louisville|memphis|new orleans|richmond|hartford|stamford|"
    "providence|madison|milwaukee|boise|albuquerque|tucson|omaha|bentonville|honolulu|anchorage|"
    "san juan|el paso|oklahoma city|tulsa|birmingham|buffalo|rochester|albany|"
    "santa barbara|san luis obispo|fresno|bakersfield|santa cruz|"
    "menlo park|foster city|alameda|emeryville|fremont|walnut creek|pleasanton|"
    "hillsboro|beaverton|vancouver, wa|spokane|"
    "des moines|little rock|jackson, ms|montgomery|columbia, sc|charleston|savannah|"
    "greenville|knoxville|chattanooga|lexington|dayton|toledo|grand rapids|"
    "colorado springs|fort collins|provo|reno|"
    "cherry hill|princeton|newark|stamford|white plains|long island|"
    "silicon valley"
)

_US = re.compile(
    r"(\b(united states|usa|u\.s\.a\.|u\.s\.|us)\b"
    r"|\bamerica\b(?! latina)"
    r"|\b(" + _STATE_NAMES + r")\b"
    r"|(?:,\s*|\b)(" + _STATE_ABBR + r")(?:\s*\d{5}|\s*,|\s*\)|\s*$|\s+us\b|\s*-|\s*/|\s+\d)"
    r"|\b(" + _CITIES + r")\b)",
    re.IGNORECASE,
)

# Explicit "not US" region words. Checked BEFORE the US regex on remote roles and
# also used to reject "USA/Canada" style multi-region strings? No — those are
# fine (a US applicant qualifies). Only used to pin down remote roles.
_NON_US_REGION = re.compile(
    r"\b(canada|canadian|toronto|vancouver, bc|montreal|ontario|british columbia|"
    r"united kingdom|\buk\b|england|london|manchester|ireland|dublin|europe|european|emea|"
    r"germany|berlin|munich|france|paris|spain|madrid|barcelona|portugal|lisbon|netherlands|"
    r"amsterdam|belgium|sweden|stockholm|norway|denmark|copenhagen|finland|poland|warsaw|"
    r"czech|prague|switzerland|zurich|austria|italy|milan|greece|romania|hungary|"
    r"india|bengaluru|bangalore|mumbai|delhi|gurgaon|gurugram|hyderabad|pune|chennai|noida|"
    r"apac|asia|singapore|philippines|manila|indonesia|jakarta|vietnam|thailand|bangkok|"
    r"malaysia|japan|tokyo|korea|seoul|china|beijing|shanghai|hong kong|taiwan|taipei|"
    r"australia|sydney|melbourne|new zealand|auckland|"
    r"latam|latin america|mexico|mexico city|brazil|brasil|sao paulo|são paulo|argentina|"
    r"buenos aires|colombia|bogota|bogotá|chile|santiago|peru|lima|"
    r"middle east|dubai|uae|israel|tel aviv|saudi|riyadh|qatar|egypt|cairo|"
    r"africa|nigeria|lagos|kenya|nairobi|south africa|cape town|johannesburg|"
    r"pakistan|karachi|lahore|bangladesh|dhaka|sri lanka|nepal|turkey|istanbul|"
    r"ukraine|kyiv|russia|moscow)\b",
    re.IGNORECASE,
)

_REMOTE = re.compile(r"\b(remote|anywhere|distributed|work from home|wfh|virtual)\b", re.IGNORECASE)


def is_us(location) -> bool:
    """True if the location text names the United States, a US state or a major US city."""
    if not location:
        return False
    return bool(_US.search(str(location)))


def is_remote(location) -> bool:
    return bool(location) and bool(_REMOTE.search(str(location)))


def accepts_us(location) -> bool:
    """True if a US-based applicant could take the role: US-located, or remote
    that isn't pinned to a specific non-US region."""
    if not location:
        return False
    text = str(location)
    if is_us(text):
        return True
    if not _REMOTE.search(text):
        return False
    return not _NON_US_REGION.search(text)


if __name__ == "__main__":
    assert accepts_us("Austin, TX")
    assert accepts_us("Austin, Texas, United States")
    assert accepts_us("US, CA, Santa Clara")
    assert accepts_us("New York City, New York, United States of America")
    assert accepts_us("Remote-USA")
    assert accepts_us("Remote - US")
    assert accepts_us("Remote")
    assert accepts_us("San Francisco, CA")
    assert accepts_us("United States")
    assert accepts_us("McLean, VA")
    assert accepts_us("Seattle")
    assert accepts_us("Bastrop, TX")
    assert accepts_us("Chicago, IL; New York, NY")
    assert accepts_us("USA or Canada")          # a US applicant qualifies
    assert accepts_us("Remote (Worldwide)")
    assert not accepts_us("Remote - Canada")
    assert not accepts_us("Remote, India")
    assert not accepts_us("Gurugram, Haryana, IND")
    assert not accepts_us("London, UK")
    assert not accepts_us("Remote - EMEA")
    assert not accepts_us("Toronto, Ontario")
    assert not accepts_us("Bengaluru, Karnataka, India")
    assert not accepts_us("Mexico City")
    assert not accepts_us("Sydney, Australia")
    assert not accepts_us(None)
    assert not accepts_us("")
    assert not accepts_us("2 Locations")
    print("geo tests OK")
