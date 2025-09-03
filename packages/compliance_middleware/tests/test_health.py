
from fastapi.testclient import TestClient
from packages.compliance_middleware.app import app

def test_health():
    c = TestClient(app)
    r = c.get("/healthz")
    assert r.status_code == 200
    assert r.json()["ok"] is True
