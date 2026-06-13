"""
Basic smoke tests for the ClipMart API.
Run: pytest backend/tests/
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db

TEST_DB = "sqlite:///./test.db"
engine = create_engine(TEST_DB, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def override_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_and_login():
    r = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "password123",
    })
    assert r.status_code == 201

    r = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "password123",
    })
    assert r.status_code == 200
    assert "access_token" in r.json()
    return r.json()["access_token"]


def test_templates_list():
    r = client.get("/api/v1/templates")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body


def test_create_template():
    token = test_register_and_login()
    r = client.post(
        "/api/v1/templates",
        json={
            "title": "Test Template",
            "category": "SaaS",
            "agent_count": 3,
            "tags": ["test", "saas"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201
    assert r.json()["slug"].startswith("test-template")
