from fastapi.testclient import TestClient
from app.main import app
from app.models.user_models import UserRole
from tests.auth_helpers import authenticate_client


def test_veraval_saved_location_and_description_survive_officer_read():
    fisher = authenticate_client(TestClient(app))
    location = {"lat": 20.9, "lon": 70.37}
    assert fisher.post('/api/location/update', json=location).status_code == 200
    response = fisher.post('/api/emergency/sos', json={**location, "location_source": "selected", "location_name": "Veraval", "notes": "Engine stopped; drifting"})
    assert response.status_code == 201, response.text
    officer = authenticate_client(TestClient(app), UserRole.GOVERNMENT)
    record = next(item for item in officer.get('/api/emergency/sos/active').json() if item['sos_id'] == response.json()['sos_id'])
    assert record['recorded_telemetry']['lat'] == 20.9
    assert record['recorded_telemetry']['lon'] == 70.37
    assert record['recorded_telemetry']['location_name'] == 'Veraval'
    assert record['recorded_telemetry']['location_source'] == 'selected'
    assert record['recorded_telemetry']['notes'] == 'Engine stopped; drifting'
    assert '20.9000' in record['mayday_message']
    assert 'Engine stopped; drifting' in record['mayday_message']
    assert 'Mumbai' in record['assigned_mrcc']  # Contact is separate from origin.


def test_old_selected_location_is_rejected_but_explicit_gps_is_independent():
    fisher = authenticate_client(TestClient(app))
    assert fisher.post('/api/location/update', json={"lat":20.9,"lon":70.37}).status_code == 200
    old = {"lat":18.9,"lon":72.7,"location_source":"selected"}
    assert fisher.post('/api/emergency/sos', json=old).status_code == 409
    assert fisher.post('/api/emergency/sos', json={**old,"location_source":"gps"}).status_code == 201


def test_selected_sos_cannot_borrow_another_accounts_saved_location():
    first = authenticate_client(TestClient(app)); second = authenticate_client(TestClient(app))
    assert first.post('/api/location/update', json={"lat":20.9,"lon":70.37}).status_code == 200
    assert second.post('/api/emergency/sos', json={"lat":20.9,"lon":70.37,"location_source":"selected"}).status_code == 409
