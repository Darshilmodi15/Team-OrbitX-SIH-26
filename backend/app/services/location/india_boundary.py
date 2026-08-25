"""
Authoritative Geographic Boundary and Coastline Data for India.

Contains:
- India sovereign & Exclusive Economic Zone (EEZ) bounding envelope and polygon
- High-density coastline sample coordinates across all coastal states and island territories
"""
import math
from typing import Dict, List, Tuple

# Sovereign & EEZ Outer Envelope for the Republic of India (including Lakshadweep & Andaman-Nicobar)
INDIA_BOUNDS = {
    "min_lat": 6.0,    # Southern tip of Great Nicobar (Indira Point ~6.75°N, EEZ buffer ~6.0°N)
    "max_lat": 37.5,   # Northernmost Jammu & Kashmir / Ladakh
    "min_lon": 68.0,   # Westernmost Gujarat / Sir Creek
    "max_lon": 97.5,   # Easternmost Arunachal Pradesh / Andaman Sea EEZ
}

# Simplified Sovereign Polygon for ray-casting point-in-polygon containment
INDIA_MAINLAND_POLYGON: List[Tuple[float, float]] = [
    # (lat, lon)
    (23.5, 68.1),  # Sir Creek, Gujarat
    (24.5, 71.0),  # Rann of Kutch
    (27.0, 71.5),  # Rajasthan border
    (30.0, 74.0),  # Punjab border
    (32.5, 75.0),  # J&K border
    (35.5, 74.5),  # Northern frontier
    (37.0, 77.0),  # Ladakh north
    (34.0, 79.0),  # Ladakh east
    (31.0, 79.0),  # Himachal / Uttarakhand
    (30.0, 81.0),  # Nepal border
    (27.0, 88.0),  # Sikkim
    (28.0, 89.0),  # Bhutan border
    (29.0, 96.0),  # Arunachal Pradesh
    (27.5, 97.2),  # Eastern extremity
    (24.0, 93.0),  # Manipur / Mizoram
    (22.0, 92.5),  # Tripura / Chittagong border
    (21.5, 89.0),  # Sundarbans, West Bengal
    (19.8, 86.0),  # Odisha coast
    (17.7, 83.3),  # Visakhapatnam, Andhra Pradesh
    (13.1, 80.3),  # Chennai, Tamil Nadu
    (9.3, 79.3),   # Palk Strait / Rameswaram
    (8.08, 77.55), # Kanyakumari (Southern tip of mainland)
    (8.5, 76.9),   # Thiruvananthapuram, Kerala
    (10.0, 76.2),  # Kochi, Kerala
    (12.9, 74.8),  # Mangalore, Karnataka
    (15.4, 73.8),  # Panaji, Goa
    (18.9, 72.8),  # Mumbai, Maharashtra
    (20.9, 70.4),  # Veraval, Gujarat
    (22.2, 68.9),  # Dwarka, Gujarat
    (23.5, 68.1),  # Close loop
]

# Curated High-Density Coastline Points with Associated Coastal Regions (States/UTs)
INDIA_COASTLINE_POINTS: List[Dict[str, any]] = [
    # Gujarat Coast (West Coast)
    {"lat": 23.50, "lon": 68.20, "region": "Gujarat", "name": "Kori Creek"},
    {"lat": 23.25, "lon": 68.60, "region": "Gujarat", "name": "Jakhau Port"},
    {"lat": 22.80, "lon": 69.40, "region": "Gujarat", "name": "Mandvi Coast"},
    {"lat": 23.00, "lon": 70.20, "region": "Gujarat", "name": "Kandla Port"},
    {"lat": 22.50, "lon": 69.00, "region": "Gujarat", "name": "Okha Port"},
    {"lat": 22.24, "lon": 68.97, "region": "Gujarat", "name": "Dwarka"},
    {"lat": 21.63, "lon": 69.60, "region": "Gujarat", "name": "Porbandar"},
    {"lat": 21.15, "lon": 70.05, "region": "Gujarat", "name": "Mangrol"},
    {"lat": 20.90, "lon": 70.37, "region": "Gujarat", "name": "Veraval Port"},
    {"lat": 20.71, "lon": 70.98, "region": "Gujarat", "name": "Diu Coast"},
    {"lat": 20.90, "lon": 71.50, "region": "Gujarat", "name": "Jafrabad"},
    {"lat": 21.75, "lon": 72.15, "region": "Gujarat", "name": "Bhavnagar"},
    {"lat": 21.65, "lon": 72.55, "region": "Gujarat", "name": "Dahej"},
    {"lat": 21.10, "lon": 72.70, "region": "Gujarat", "name": "Surat / Hazira"},
    {"lat": 20.40, "lon": 72.83, "region": "Gujarat", "name": "Daman Coast"},
    {"lat": 20.20, "lon": 72.80, "region": "Gujarat", "name": "Umbergaon"},

    # Maharashtra Coast
    {"lat": 19.95, "lon": 72.70, "region": "Maharashtra", "name": "Dahanu"},
    {"lat": 19.60, "lon": 72.70, "region": "Maharashtra", "name": "Satpati Fishery Port"},
    {"lat": 19.35, "lon": 72.80, "region": "Maharashtra", "name": "Vasai Coast"},
    {"lat": 18.92, "lon": 72.83, "region": "Maharashtra", "name": "Mumbai Sassoon Dock"},
    {"lat": 18.70, "lon": 72.85, "region": "Maharashtra", "name": "Alibaug Coast"},
    {"lat": 18.30, "lon": 72.90, "region": "Maharashtra", "name": "Murud-Janjira"},
    {"lat": 17.98, "lon": 73.05, "region": "Maharashtra", "name": "Dighi / Shrivardhan"},
    {"lat": 17.50, "lon": 73.15, "region": "Maharashtra", "name": "Dabhol Coast"},
    {"lat": 16.99, "lon": 73.30, "region": "Maharashtra", "name": "Ratnagiri Mirkarwada"},
    {"lat": 16.50, "lon": 73.33, "region": "Maharashtra", "name": "Vijaydurg"},
    {"lat": 16.05, "lon": 73.47, "region": "Maharashtra", "name": "Malvan Fishery Harbour"},
    {"lat": 15.75, "lon": 73.65, "region": "Maharashtra", "name": "Vengurla Coast"},

    # Goa Coast
    {"lat": 15.60, "lon": 73.74, "region": "Goa", "name": "Arambol Coast"},
    {"lat": 15.42, "lon": 73.80, "region": "Goa", "name": "Panaji / Mandovi"},
    {"lat": 15.40, "lon": 73.80, "region": "Goa", "name": "Mormugao Port"},
    {"lat": 15.00, "lon": 73.95, "region": "Goa", "name": "Canacona / Palolem"},

    # Karnataka Coast
    {"lat": 14.80, "lon": 74.13, "region": "Karnataka", "name": "Karwar Fishery Port"},
    {"lat": 14.53, "lon": 74.32, "region": "Karnataka", "name": "Gokarna Coast"},
    {"lat": 14.28, "lon": 74.45, "region": "Karnataka", "name": "Honnavar"},
    {"lat": 13.98, "lon": 74.55, "region": "Karnataka", "name": "Bhatkal"},
    {"lat": 13.34, "lon": 74.70, "region": "Karnataka", "name": "Malpe Fishery Harbour (Udupi)"},
    {"lat": 12.91, "lon": 74.82, "region": "Karnataka", "name": "New Mangalore Port"},

    # Kerala Coast (South-West Coast)
    {"lat": 12.50, "lon": 74.98, "region": "Kerala", "name": "Kasaragod Coast"},
    {"lat": 11.87, "lon": 75.36, "region": "Kerala", "name": "Kannur Coast"},
    {"lat": 11.25, "lon": 75.77, "region": "Kerala", "name": "Kozhikode (Calicut) Port"},
    {"lat": 10.79, "lon": 75.92, "region": "Kerala", "name": "Ponnani Port"},
    {"lat": 10.20, "lon": 76.18, "region": "Kerala", "name": "Munambam Fishery Harbour"},
    {"lat": 9.93,  "lon": 76.26, "region": "Kerala", "name": "Kochi (Cochin) Port"},
    {"lat": 9.50,  "lon": 76.32, "region": "Kerala", "name": "Alappuzha (Alleppey)"},
    {"lat": 8.89,  "lon": 76.55, "region": "Kerala", "name": "Kollam (Quilon) Port"},
    {"lat": 8.48,  "lon": 76.95, "region": "Kerala", "name": "Vizhinjam Transshipment Port"},

    # Tamil Nadu Coast (South & East Coast)
    {"lat": 8.08,  "lon": 77.55, "region": "Tamil Nadu", "name": "Kanyakumari (Cape Comorin)"},
    {"lat": 8.40,  "lon": 78.10, "region": "Tamil Nadu", "name": "Tiruchendur Coast"},
    {"lat": 8.76,  "lon": 78.13, "region": "Tamil Nadu", "name": "V.O. Chidambaranar Port (Tuticorin)"},
    {"lat": 9.28,  "lon": 79.12, "region": "Tamil Nadu", "name": "Mandapam (Gulf of Mannar)"},
    {"lat": 9.28,  "lon": 79.31, "region": "Tamil Nadu", "name": "Rameswaram Coast"},
    {"lat": 9.17,  "lon": 79.41, "region": "Tamil Nadu", "name": "Dhanushkodi (Palk Strait)"},
    {"lat": 10.35, "lon": 79.38, "region": "Tamil Nadu", "name": "Mallipattinam"},
    {"lat": 10.76, "lon": 79.84, "region": "Tamil Nadu", "name": "Nagapattinam Fishery Port"},
    {"lat": 11.00, "lon": 79.85, "region": "Tamil Nadu", "name": "Karaikal Port"},
    {"lat": 11.75, "lon": 79.77, "region": "Tamil Nadu", "name": "Cuddalore Port"},
    {"lat": 11.93, "lon": 79.83, "region": "Puducherry", "name": "Puducherry Harbour"},
    {"lat": 12.60, "lon": 80.17, "region": "Tamil Nadu", "name": "Mahabalipuram Coast"},
    {"lat": 13.08, "lon": 80.29, "region": "Tamil Nadu", "name": "Chennai Port / Kasimedu"},
    {"lat": 13.33, "lon": 80.34, "region": "Tamil Nadu", "name": "Kattupalli / Ennore Port"},

    # Andhra Pradesh Coast
    {"lat": 13.90, "lon": 80.15, "region": "Andhra Pradesh", "name": "Pulicat Lake Coast"},
    {"lat": 14.25, "lon": 80.10, "region": "Andhra Pradesh", "name": "Krishnapatnam Port"},
    {"lat": 15.50, "lon": 80.05, "region": "Andhra Pradesh", "name": "Ongole Coast"},
    {"lat": 15.80, "lon": 80.35, "region": "Andhra Pradesh", "name": "Nizampatnam Fishery Harbour"},
    {"lat": 16.18, "lon": 81.13, "region": "Andhra Pradesh", "name": "Machilipatnam Port"},
    {"lat": 16.98, "lon": 82.25, "region": "Andhra Pradesh", "name": "Kakinada Deepwater Port"},
    {"lat": 17.70, "lon": 83.30, "region": "Andhra Pradesh", "name": "Visakhapatnam (Vizag) Port"},
    {"lat": 18.28, "lon": 83.90, "region": "Andhra Pradesh", "name": "Kalingapatnam"},
    {"lat": 18.80, "lon": 84.40, "region": "Andhra Pradesh", "name": "Bhavanapadu Coast"},

    # Odisha Coast
    {"lat": 19.30, "lon": 84.90, "region": "Odisha", "name": "Gopalpur Port"},
    {"lat": 19.65, "lon": 85.35, "region": "Odisha", "name": "Chilika Lake Coast"},
    {"lat": 19.80, "lon": 85.82, "region": "Odisha", "name": "Puri Beach"},
    {"lat": 20.26, "lon": 86.67, "region": "Odisha", "name": "Paradeep Deep Sea Port"},
    {"lat": 20.70, "lon": 87.00, "region": "Odisha", "name": "Gahirmatha Marine Sanctuary"},
    {"lat": 20.80, "lon": 86.95, "region": "Odisha", "name": "Dhamra Port"},
    {"lat": 21.46, "lon": 87.05, "region": "Odisha", "name": "Chandipur Coast"},

    # West Bengal Coast
    {"lat": 21.62, "lon": 87.52, "region": "West Bengal", "name": "Digha Fishery Port"},
    {"lat": 21.80, "lon": 88.00, "region": "West Bengal", "name": "Haldia Port"},
    {"lat": 21.60, "lon": 88.30, "region": "West Bengal", "name": "Sagar Island"},
    {"lat": 21.75, "lon": 88.75, "region": "West Bengal", "name": "Bakkhali / Namkhana"},
    {"lat": 21.85, "lon": 89.05, "region": "West Bengal", "name": "Sundarbans Coastal Delta"},

    # Island Territories (Lakshadweep & Andaman-Nicobar)
    {"lat": 10.56, "lon": 72.64, "region": "Lakshadweep", "name": "Kavaratti Island"},
    {"lat": 10.85, "lon": 72.18, "region": "Lakshadweep", "name": "Agatti Island"},
    {"lat": 8.29,  "lon": 73.04, "region": "Lakshadweep", "name": "Minicoy Island"},
    {"lat": 11.62, "lon": 92.72, "region": "Andaman & Nicobar", "name": "Port Blair (South Andaman)"},
    {"lat": 12.00, "lon": 92.95, "region": "Andaman & Nicobar", "name": "Havelock (Swaraj Dweep)"},
    {"lat": 7.00,  "lon": 93.85, "region": "Andaman & Nicobar", "name": "Great Nicobar / Campbell Bay"},
]


def point_in_polygon(lat: float, lon: float, polygon: List[Tuple[float, float]]) -> bool:
    """Ray-casting algorithm to determine if (lat, lon) is inside a polygon."""
    inside = False
    n = len(polygon)
    for i in range(n):
        lat1, lon1 = polygon[i]
        lat2, lon2 = polygon[(i + 1) % n]
        if (lon1 > lon) != (lon2 > lon):
            intersect_lat = (lat2 - lat1) * (lon - lon1) / (lon2 - lon1) + lat1
            if lat < intersect_lat:
                inside = not inside
    return inside
