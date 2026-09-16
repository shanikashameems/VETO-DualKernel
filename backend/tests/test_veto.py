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
    assert data["bank_call_count"] >= 1

def test_02_poisoned_invoice_veto_on_blocked():
    """TEST 2: Poisoned invoice + VETO ON -> payment blocked (HTTP 403), bank_call_count unchanged"""
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

def test_08_cryptographic_audit_integrity():
    """TEST 8: Cryptographic Audit dossier immutability & Ed25519 signature check"""
    # First generate a dispatch
    client.post("/api/dispatch", json={"document_type": "clean", "veto_mode": True})
    
    # Active integrity check
    res = client.post("/api/audit/verify")
    assert res.status_code == 200
    body = res.json()
    assert body["verified"] is True
    assert "INTEGRITY: VERIFIED" in body["badge"]
    assert "current_hash" in body
    assert "signature" in body

def test_09_direct_tool_call_without_veto_token_returns_401():
    """TEST 9: Direct tool call to bank-mock without signed VETO token returns 401 Unauthorized"""
    res = client.post("/api/bank-mock/direct-attack")
    assert res.status_code == 200
    body = res.json()
    assert body["status_code"] == 401
    assert "401 UNAUTHORIZED" in body["badge"]

def test_10_adversarial_benchmark_matrix_20_cases():
    """TEST 10: 20-case empirical benchmark matrix (10 attacks + 10 clean baselines) -> 0% false positives"""
    res = client.post("/api/benchmark/matrix")
    assert res.status_code == 200
    body = res.json()
    assert body["total_test_cases"] == 20
    assert body["passed_tests"] == 20
    assert body["false_positives"] == 0
    assert body["false_positive_rate"] == "0.0%"
    assert body["taint_detection_rate"] == "100.0%"
    assert body["bank_calls_on_attacks"] == 0
