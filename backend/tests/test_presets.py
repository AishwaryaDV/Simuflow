import pytest
from app.services import preset_service
from app.models.diagrams import PresetBlueprint
from tests.conftest import MINIMAL_TOPOLOGY

SAMPLE_PRESET = PresetBlueprint(
    slug="web_app",
    name="Simple Web App",
    description="Classic 3-tier.",
    category="fundamentals",
    sort_order=1,
    topology=MINIMAL_TOPOLOGY,
)


@pytest.fixture(autouse=True)
def seed_cache():
    preset_service._cache.clear()
    preset_service._cache.append(SAMPLE_PRESET)
    yield
    preset_service._cache.clear()


def test_list_presets_returns_all(auth_client):
    client, _ = auth_client
    res = client.get("/api/v1/presets")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["slug"] == "web_app"


def test_get_preset_by_slug(auth_client):
    client, _ = auth_client
    res = client.get("/api/v1/presets/web_app")
    assert res.status_code == 200
    assert res.json()["name"] == "Simple Web App"


def test_get_preset_not_found(auth_client):
    client, _ = auth_client
    res = client.get("/api/v1/presets/nonexistent")
    assert res.status_code == 404


def test_list_presets_no_auth_still_works(anon_client):
    # Presets are public — no auth needed
    client, _ = anon_client
    res = client.get("/api/v1/presets")
    assert res.status_code == 200
