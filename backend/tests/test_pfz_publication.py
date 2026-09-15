import pytest
from app.services.pfz.publication import parse_publication

def test_date_only_publication_does_not_invent_expiry_time_or_points():
    result=parse_publication("<table><tr><td></td><td>Forecast Date</td><td>Valid upto</td></tr><tr><td></td><td>14 SEP 2026</td><td>15 SEP 2026</td></tr></table>")
    assert result == {"forecast_date":"2026-09-14","valid_upto_date":"2026-09-15"}

def test_unrelated_or_reversed_dates_are_rejected():
    for html in ["<td>14 SEP 2026</td><td>15 SEP 2026</td>","<td>Forecast Date</td><td>Valid upto</td><td>15 SEP 2026</td><td>14 SEP 2026</td>"]:
        with pytest.raises(ValueError): parse_publication(html)
