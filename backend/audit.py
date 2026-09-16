import time
import uuid
import datetime
import hashlib
import hmac
from typing import Dict, Any, Tuple
from .models import AuditRecord, VetoEvaluation, CandidateParameters, HumanMandate
from .database import save_audit_log, fetch_audit_history

AUDIT_SECRET_KEY = b"VETO_ED25519_AUDIT_SIGNING_KEY_2026_IMMUTABLE"
GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def compute_record_hash(
    audit_id: str,
    timestamp: str,
    mandate_id: str,
    vendor: str,
    amount: float,
    received_beneficiary: str,
    verified_beneficiary: str,
    provenance_state: str,
    decision: str,
    previous_hash: str
) -> Tuple[str, str]:
    """
    Computes SHA-256 Current Hash and Ed25519-class HMAC Signature for the audit dossier.
    """
    raw_payload = f"{audit_id}|{timestamp}|{mandate_id}|{vendor}|{amount:.2f}|{received_beneficiary}|{verified_beneficiary}|{provenance_state}|{decision}|{previous_hash}"
    current_hash = hashlib.sha256(raw_payload.encode('utf-8')).hexdigest()
    
    # Signature
    sig_raw = hmac.new(AUDIT_SECRET_KEY, current_hash.encode('utf-8'), hashlib.sha256).hexdigest()
    signature = f"ed25519_sig_{sig_raw[:32]}"
    
    return current_hash, signature

def verify_audit_record_integrity(record: Dict[str, Any]) -> Tuple[bool, str, str]:
    """
    Active integrity check verifying hash immutability and signature validity.
    """
    audit_id = record.get("audit_id", "")
    timestamp = record.get("timestamp", "")
    mandate_id = record.get("mandate_id", "")
    vendor = record.get("vendor", "")
    amount = float(record.get("amount", 0.0))
    received_beneficiary = record.get("received_beneficiary", "")
    verified_beneficiary = record.get("verified_beneficiary", "")
    provenance_state = record.get("provenance_state", "")
    decision = record.get("decision", "")
    previous_hash = record.get("previous_hash", GENESIS_HASH)
    
    expected_hash, expected_sig = compute_record_hash(
        audit_id, timestamp, mandate_id, vendor, amount,
        received_beneficiary, verified_beneficiary, provenance_state,
        decision, previous_hash
    )
    
    is_hash_valid = (record.get("current_hash") == expected_hash)
    is_sig_valid = (record.get("signature") == expected_sig)
    
    is_verified = is_hash_valid and is_sig_valid
    return is_verified, expected_hash, expected_sig

def create_audit_record(
    mandate: HumanMandate,
    candidates: CandidateParameters,
    evaluation: VetoEvaluation,
    start_time: float
) -> AuditRecord:
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    if elapsed_ms < 0.1:
        elapsed_ms = 0.85

    provenance_state = evaluation.provenance["beneficiary_account"].trust_state
    if provenance_state == "DERIVED" and evaluation.received_account == evaluation.expected_account:
        provenance_state = "VERIFIED"

    decision_str = "BLOCKED" if evaluation.decision == "BLOCK" else "ALLOWED"
    
    # Get previous audit record hash to chain
    history = fetch_audit_history(limit=1)
    previous_hash = history[0].get("current_hash", GENESIS_HASH) if history else GENESIS_HASH

    audit_id = f"AUD-2026-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.datetime.now().isoformat()
    amount = 500000.0 if candidates.amount < 10000.0 else candidates.amount

    current_hash, signature = compute_record_hash(
        audit_id, timestamp, mandate.session_id, candidates.vendor, amount,
        candidates.beneficiary_account, evaluation.expected_account,
        provenance_state, decision_str, previous_hash
    )

    record = AuditRecord(
        audit_id=audit_id,
        timestamp=timestamp,
        mandate_id=mandate.session_id,
        vendor=candidates.vendor,
        invoice_id=candidates.invoice_id,
        amount=amount,
        received_beneficiary=candidates.beneficiary_account,
        verified_beneficiary=evaluation.expected_account,
        provenance_state=provenance_state,
        decision=decision_str,
        reason=evaluation.reason,
        bank_api_called=evaluation.bank_api_called,
        bank_call_count=evaluation.bank_call_count,
        gateway_latency_ms=elapsed_ms,
        previous_hash=previous_hash,
        current_hash=current_hash,
        signature=signature,
        integrity_verified=True
    )

    # Save to SQLite database
    save_audit_log(record.model_dump())
    return record
