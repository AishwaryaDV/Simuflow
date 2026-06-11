import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_supabase, get_current_user
from app.core.security import AuthUser
from app.services import preset_service

# ── Shared constants ──────────────────────────────────────────────────────────

TEST_USER_ID  = "user-test-123"
TEST_USER     = AuthUser(user_id=TEST_USER_ID, email="test@example.com")
OTHER_USER_ID = "user-other-456"

MINIMAL_TOPOLOGY = {
    "version":  "1.0",
    "nodes":    [],
    "edges":    [],
    "viewport": {"x": 0, "y": 0, "zoom": 1},
}

TEST_DIAGRAM = {
    "id":          "diag-abc-123",
    "user_id":     TEST_USER_ID,
    "name":        "Test Diagram",
    "topology":    MINIMAL_TOPOLOGY,
    "is_public":   False,
    "fork_count":  0,
    "share_token": None,
    "created_at":  "2024-01-01T00:00:00+00:00",
    "updated_at":  "2024-01-01T00:00:00+00:00",
}


def make_result(data=None, count=None):
    """Build a mock Supabase execute() result."""
    r = MagicMock()
    r.data  = data if data is not None else []
    r.count = count
    return r


# ── Mock Supabase — fluent builder that always calls back to .execute() ───────

@pytest.fixture
def mock_db():
    db = MagicMock()
    for method in ("table", "select", "insert", "update", "delete",
                   "eq", "neq", "order", "range", "limit"):
        getattr(db, method).return_value = db
    db.execute.return_value = make_result()
    return db


# ── Clients ───────────────────────────────────────────────────────────────────

@pytest.fixture
def auth_client(mock_db):
    """TestClient with auth + mocked DB. Lifespan patched so no real Supabase call."""
    app.dependency_overrides[get_supabase]      = lambda: mock_db
    app.dependency_overrides[get_current_user]  = lambda: TEST_USER
    with patch("app.main.preset_service.load_presets"):
        with TestClient(app) as c:
            yield c, mock_db
    app.dependency_overrides.clear()


@pytest.fixture
def anon_client(mock_db):
    """TestClient with no auth override — 401 expected on protected routes."""
    app.dependency_overrides[get_supabase] = lambda: mock_db
    with patch("app.main.preset_service.load_presets"):
        with TestClient(app) as c:
            yield c, mock_db
    app.dependency_overrides.clear()
