from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app


def test_health_returns_ok():
    with patch("app.main.preset_service.load_presets"):
        with TestClient(app) as client:
            res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
