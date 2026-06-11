import pytest
from tests.conftest import TEST_DIAGRAM, TEST_USER_ID, OTHER_USER_ID, MINIMAL_TOPOLOGY, make_result


def test_create_diagram(auth_client):
    client, mock_db = auth_client
    mock_db.execute.return_value = make_result(data=[TEST_DIAGRAM])

    res = client.post("/api/v1/diagrams", json={
        "name":     "My Diagram",
        "topology": MINIMAL_TOPOLOGY,
    })

    assert res.status_code == 201
    assert res.json()["name"] == "Test Diagram"
    assert res.json()["id"] == TEST_DIAGRAM["id"]


def test_create_diagram_requires_auth(anon_client):
    client, _ = anon_client
    res = client.post("/api/v1/diagrams", json={
        "name":     "My Diagram",
        "topology": MINIMAL_TOPOLOGY,
    })
    assert res.status_code == 401


def test_list_diagrams(auth_client):
    client, mock_db = auth_client
    mock_db.execute.side_effect = [
        make_result(data=[TEST_DIAGRAM], count=1),  # count query
        make_result(data=[TEST_DIAGRAM]),             # list query
    ]

    res = client.get("/api/v1/diagrams")

    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["id"] == TEST_DIAGRAM["id"]


def test_get_diagram_owned(auth_client):
    client, mock_db = auth_client
    mock_db.execute.return_value = make_result(data=[TEST_DIAGRAM])

    res = client.get(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}")

    assert res.status_code == 200
    assert res.json()["id"] == TEST_DIAGRAM["id"]


def test_get_diagram_other_user_private_returns_404(auth_client):
    client, mock_db = auth_client
    other_diagram = {**TEST_DIAGRAM, "user_id": OTHER_USER_ID, "is_public": False}
    mock_db.execute.return_value = make_result(data=[other_diagram])

    res = client.get(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}")

    assert res.status_code == 404


def test_update_diagram(auth_client):
    client, mock_db = auth_client
    updated = {**TEST_DIAGRAM, "name": "Renamed"}
    mock_db.execute.side_effect = [
        make_result(data=[TEST_DIAGRAM]),  # ownership check
        make_result(data=[updated]),        # update
    ]

    res = client.put(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}", json={"name": "Renamed"})

    assert res.status_code == 200
    assert res.json()["name"] == "Renamed"


def test_update_diagram_other_user_returns_404(auth_client):
    client, mock_db = auth_client
    other_diagram = {**TEST_DIAGRAM, "user_id": OTHER_USER_ID}
    mock_db.execute.return_value = make_result(data=[other_diagram])

    res = client.put(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}", json={"name": "Hack"})

    assert res.status_code == 404


def test_delete_diagram(auth_client):
    client, mock_db = auth_client
    mock_db.execute.return_value = make_result(data=[TEST_DIAGRAM])

    res = client.delete(f"/api/v1/diagrams/{TEST_DIAGRAM['id']}")

    assert res.status_code == 204


def test_delete_diagram_not_found(auth_client):
    client, mock_db = auth_client
    mock_db.execute.return_value = make_result(data=[])

    res = client.delete("/api/v1/diagrams/nonexistent-id")

    assert res.status_code == 404
