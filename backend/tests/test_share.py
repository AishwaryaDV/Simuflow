import pytest
from tests.conftest import TEST_DIAGRAM, TEST_USER_ID, OTHER_USER_ID, MINIMAL_TOPOLOGY, make_result

PUBLIC_DIAGRAM = {**TEST_DIAGRAM, "is_public": True, "share_token": "tok-abc123"}
FORKED_DIAGRAM = {
    **TEST_DIAGRAM,
    "id":      "diag-forked-999",
    "name":    "Test Diagram (fork)",
    "user_id": TEST_USER_ID,
}


def test_generate_share_link(auth_client):
    client, mock_db = auth_client
    mock_db.execute.side_effect = [
        make_result(data=[TEST_DIAGRAM]),      # fetch existing
        make_result(data=[PUBLIC_DIAGRAM]),    # update to public
    ]

    res = client.post(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}/share")

    assert res.status_code == 200
    body = res.json()
    assert "shareToken" in body
    assert body["isPublic"] is True


def test_generate_share_requires_auth(anon_client):
    client, _ = anon_client
    res = client.post(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}/share")
    assert res.status_code == 401


def test_generate_share_other_user_returns_404(auth_client):
    client, mock_db = auth_client
    other_diagram = {**TEST_DIAGRAM, "user_id": OTHER_USER_ID}
    mock_db.execute.return_value = make_result(data=[other_diagram])

    res = client.post(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}/share")

    assert res.status_code == 404


def test_get_shared_diagram(anon_client):
    client, mock_db = anon_client
    mock_db.execute.return_value = make_result(data=[PUBLIC_DIAGRAM])

    res = client.get("/api/v1/shared/tok-abc123")

    assert res.status_code == 200
    assert res.json()["id"] == TEST_DIAGRAM["id"]


def test_get_shared_diagram_bad_token(anon_client):
    client, mock_db = anon_client
    mock_db.execute.return_value = make_result(data=[])

    res = client.get("/api/v1/shared/bad-token")

    assert res.status_code == 404


def test_fork_diagram(auth_client):
    client, mock_db = auth_client
    mock_db.execute.side_effect = [
        make_result(data=[PUBLIC_DIAGRAM]),                       # get shared diagram
        make_result(data=[FORKED_DIAGRAM]),                       # insert fork
        make_result(data=[{"fork_count": 0}]),                    # CAS: read fork_count
        make_result(data=[{**PUBLIC_DIAGRAM, "fork_count": 1}]),  # CAS: update succeeds
    ]

    res = client.post("/api/v1/shared/tok-abc123/fork")

    assert res.status_code == 201
    body = res.json()
    assert body["diagramId"] == FORKED_DIAGRAM["id"]
    assert "fork" in body["name"]


def test_fork_requires_auth(anon_client):
    client, _ = anon_client
    res = client.post("/api/v1/shared/tok-abc123/fork")
    assert res.status_code == 401


def test_revoke_share(auth_client):
    client, mock_db = auth_client
    mock_db.execute.side_effect = [
        make_result(data=[PUBLIC_DIAGRAM]),    # ownership check
        make_result(data=[TEST_DIAGRAM]),      # update to private
    ]

    res = client.delete(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}/share")

    assert res.status_code == 204
