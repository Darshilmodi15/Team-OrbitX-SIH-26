import httpx, json

# Test 1: Wave height and wind query for Mumbai
print("=== TEST 1: INCOIS Wave + Wind Query (Mumbai) ===")
r = httpx.post("http://localhost:8000/api/chat", json={
    "message": "What are the current wave height and wind conditions near Mumbai?",
    "location": {"lat": 18.9220, "lon": 72.8347},
    "language": "en"
}, timeout=30)
data = r.json()
print("Answer:", data["answer"][:400])
print("Risk Level:", data.get("risk_level"))
w = data.get("weather", {})
print("Wave Height:", w.get("wave_height_m"), "m")
print("Wind Speed ms:", w.get("wind_speed_ms"))
print("Wind Speed kmh:", w.get("wind_speed_kmh"))
print("Wind Direction:", w.get("wind_direction_cardinal"), str(w.get("wind_direction_deg")) + "deg")
print("is_mock:", w.get("is_mock"))
print("Source:", w.get("source"))
print("Cache Status:", w.get("cache_status"))
print()

# Test 2: Safety query for Veraval
print("=== TEST 2: Safety Query (Veraval) ===")
r2 = httpx.post("http://localhost:8000/api/chat", json={
    "message": "Is it safe to fish today near Veraval?",
    "location": {"lat": 20.9010, "lon": 70.3673},
    "language": "en"
}, timeout=30)
data2 = r2.json()
print("Answer:", data2["answer"][:400])
print("Risk Level:", data2.get("risk_level"))
w2 = data2.get("weather", {})
print("Wave Height:", w2.get("wave_height_m"), "m")
print("is_mock:", w2.get("is_mock"))
print("Source:", w2.get("source"))
print()

# Test 3: Gujarati language query
print("=== TEST 3: Gujarati Language Query ===")
r3 = httpx.post("http://localhost:8000/api/chat", json={
    "message": "આજે મુંબઈ પાસે માછીમારી કરવું સલામત છે?",
    "location": {"lat": 18.9220, "lon": 72.8347},
    "language": "gu"
}, timeout=30)
data3 = r3.json()
print("Language:", data3.get("language_name"))
print("Answer (first 300 chars):", data3["answer"][:300])
print()

print("=== ALL TESTS COMPLETE ===")
