"""Read publication dates from INCOIS public PFZ overview, never infer map points.

Date-only labels stay date-only. The overview is not proof of sector issuance.
"""
from datetime import datetime, timezone
from html.parser import HTMLParser
from threading import Lock
from time import monotonic
import re
import httpx

URL = "https://incois.gov.in/MarineFisheries/TextDataHome?mfid=1&request_locale=en"
_guard = Lock()
_cache = None

class Cells(HTMLParser):
    def __init__(self):
        super().__init__(); self.cells=[]; self.current=None
    def handle_starttag(self, tag, attrs):
        if tag == "td": self.current=[]
    def handle_data(self, data):
        if self.current is not None: self.current.append(data)
    def handle_endtag(self, tag):
        if tag == "td" and self.current is not None:
            self.cells.append(" ".join(" ".join(self.current).split())); self.current=None

def parse_publication(html):
    parser=Cells(); parser.feed(html)
    cells=parser.cells
    for i, cell in enumerate(cells):
        if cell != "Forecast Date" or "Valid upto" not in cells[i+1:i+4]: continue
        dates=[x for x in cells[i+1:i+10] if re.fullmatch(r"\d{1,2} [A-Z]{3} \d{4}", x)]
        if len(dates)<2: continue
        issued, valid = [datetime.strptime(x,"%d %b %Y").date() for x in dates[:2]]
        if valid < issued: raise ValueError("Invalid publication dates")
        return {"forecast_date":issued.isoformat(),"valid_upto_date":valid.isoformat()}
    raise ValueError("Publication dates not found")

def get_publication():
    global _cache
    with _guard:
        if _cache and monotonic()-_cache[0]<900: return dict(_cache[1])
        result={"source":"INCOIS PFZ overview", "url":URL,"scope":"national_overview", "forecast_date":None,"valid_upto_date":None,"retrieved_at":None,"status":"unavailable"}
        try:
            with httpx.Client(timeout=8, follow_redirects=False) as client:
                with client.stream("GET",URL) as response:
                    response.raise_for_status(); data=bytearray()
                    for chunk in response.iter_bytes():
                        data.extend(chunk)
                        if len(data)>1000000: raise ValueError("Oversized publication")
            result.update(parse_publication(data.decode("utf-8")))
            result.update(status="published",retrieved_at=datetime.now(timezone.utc).isoformat())
        except (httpx.HTTPError,ValueError,UnicodeError): pass
        _cache=(monotonic(),result)
        return dict(result)
