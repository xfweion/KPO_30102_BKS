import sys
from pathlib import Path
import os
from app.database import get_connection
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from main import app


@pytest.fixture()
def client():
    return TestClient(app)

def _init_schema():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        spoonacular_id INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        image TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, spoonacular_id)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ingredients TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """)

    conn.commit()
    cur.close()
    conn.close()

def _truncate_all():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE favorites RESTART IDENTITY CASCADE;")
    cur.execute("TRUNCATE TABLE search_history RESTART IDENTITY CASCADE;")
    cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")
    conn.commit()
    cur.close()
    conn.close()

@pytest.fixture(scope="session", autouse=True)
def prepare_test_db():
    _init_schema()

@pytest.fixture(autouse=True)
def clean_db_before_each_test():
    _truncate_all()
