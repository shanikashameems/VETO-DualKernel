import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_01_clean_invoice_veto_on_allowed():
    """TEST 1: Clean invoice + VETO ON -> payment allowed (HTTP 200)"""
    payload = {
        "document_type": "clean",
        "veto_mode": True
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["evaluation"]["decision"] == "ALLOW"
    assert data["audit"]["provenance_state"] == "VERIFIED"
    assert data["audit"]["bank_api_called"] is True

def test_02_poisoned_invoice_veto_on_blocked():
    """TEST 2: Poisoned invoice + VETO ON -> payment blocked (HTTP 403)"""
    payload = {
        "document_type": "poisoned",
        "veto_mode": True
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 403
    data = response.json()
    assert data["evaluation"]["decision"] == "BLOCK"
    assert data["audit"]["provenance_state"] == "TAINTED"
    assert data["audit"]["bank_api_called"] is False

def test_03_poisoned_invoice_veto_off_succeeds():
    """TEST 3: Poisoned invoice + VETO OFF -> mock payment succeeds (HTTP 200)"""
    payload = {
        "document_type": "poisoned",
        "veto_mode": False
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["evaluation"]["decision"] == "ALLOW"
    assert data["audit"]["provenance_state"] == "TAINTED"
    assert data["audit"]["bank_api_called"] is True

def test_04_tampered_beneficiary_is_tainted():
    """TEST 4: Tampered beneficiary -> TAINTED"""
    payload = {
        "candidate_parameters": {
            "vendor": "ABC Supplies",
            "invoice_id": "1042",
            "amount": 500000.0,
            "beneficiary_account": "Account #9928",
            "document_source": "test_doc.txt"
        },
        "veto_mode": True
    }
    response = client.post("/api/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provenance"]["beneficiary_account"]["trust_state"] == "TAINTED"

def test_05_trusted_registry_match_is_verified():
    """TEST 5: Trusted registry match -> VERIFIED"""
    payload = {
        "candidate_parameters": {
            "vendor": "ABC Supplies",
            "invoice_id": "1042",
            "amount": 500000.0,
            "beneficiary_account": "Account #1234",
            "document_source": "test_doc.txt"
        },
        "veto_mode": True
    }
    response = client.post("/api/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provenance"]["beneficiary_account"]["validation_result"] == "MATCH"

def test_06_direct_backend_bypass_attempt():
    """TEST 6: Direct attempt to bypass frontend -> backend still blocks tainted payment when VETO ON"""
    payload = {
        "document_type": "poisoned",
        "veto_mode": True
    }
    # Direct API request without frontend session state
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 403
    assert response.json()["evaluation"]["reason"] == "CAUSAL_TAINT_MISMATCH"

def test_07_bank_mock_not_called_when_blocked():
    """TEST 7: Bank mock is NOT called when transaction is blocked"""
    payload = {
        "document_type": "poisoned",
        "veto_mode": True
    }
    response = client.post("/api/dispatch", json=payload)
    assert response.status_code == 403
    data = response.json()
    assert data["evaluation"]["bank_api_called"] is False
    assert data["bank_response"] is None or data["bank_response"].get("action") == "MONEY_MOVEMENT_HALTED"

def test_08_audit_record_created():
    """TEST 8: Audit record is created"""
    response = client.get("/api/audit/latest")
    assert response.status_code == 200
    data = response.json()
    assert "audit_id" in data
    assert "gateway_latency_ms" in data

def test_09_metrics_update_correctly():
    """TEST 9: Metrics update correctly"""
    response = client.get("/api/metrics")
    assert response.status_code == 200
    metrics = response.json()
    assert "total_attacks" in metrics
    assert "blocked_attacks" in metrics
    assert "taint_detection_pct" in metrics

def test_10_repeated_runs_consistency():
    """TEST 10: Repeated runs do not corrupt state"""
    for _ in range(5):
        res1 = client.post("/api/dispatch", json={"document_type": "clean", "veto_mode": True})
        assert res1.status_code == 200
        res2 = client.post("/api/dispatch", json={"document_type": "poisoned", "veto_mode": True})
        assert res2.status_code == 403

def test_11_security_invariant_poisoned_veto_on_no_bank_call():
    """SECURITY TEST: Poisoned invoice -> perception -> taint -> veto -> no bank call"""
    response = client.post("/api/dispatch", json={"document_type": "poisoned", "veto_mode": True})
    assert response.status_code == 403
    body = response.json()
    assert body["evaluation"]["decision"] == "BLOCK"
    assert body["provenance"]["beneficiary_account"]["trust_state"] == "TAINTED"
    assert body["audit"]["bank_api_called"] is False
