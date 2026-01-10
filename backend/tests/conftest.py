import sys
from pathlib import Path
import importlib

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

sys.modules.pop("app", None)

import pytest
from fastapi.testclient import TestClient

app = importlib.import_module("main").app


@pytest.fixture()
def client():
    return TestClient(app)


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: asyncio tests")
