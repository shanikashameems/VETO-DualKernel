from pydantic import BaseModel, Field
from typing import Dict, Optional, Literal, Any, List

class HumanMandate(BaseModel):
    session_id: str = "SES-AUTH-2026-9921"
    intent_directive: str = "Pay ABC Suppliers for outstanding Invoice #1042"
    approved_entity: str = "ABC Supplies"
    authorized_amount_cap: str = "₹5,00,000"
    authorized_amount_numeric: float = 500000.0
    provenance: str = "TRUSTED_ORIGIN"

class CandidateParameters(BaseModel):
    vendor: str
    invoice_id: str
    amount: float
    beneficiary_account: str
    document_source: str
    has_injection: bool = False
    attack_class: Optional[str] = None

class ParameterProvenance(BaseModel):
    parameter_name: str
    value: str
    source: str
    source_type: Literal["HUMAN_MANDATE", "UNTRUSTED_DOCUMENT", "ENTERPRISE_REGISTRY"]
    trust_state: Literal["TRUSTED", "DERIVED", "TAINTED", "VERIFIED"]
    node_origin: Optional[str] = None
    extracted_token: Optional[str] = None
    validated_against: Optional[str] = None
    expected_value: Optional[str] = None
    validation_result: Literal["MATCH", "MISMATCH", "UNVERIFIED"]

class LineageChainNode(BaseModel):
    step: int
    name: str
    type: str
    value: str
    status: str
    detail: str
    node_origin: str

class VetoEvaluation(BaseModel):
    provenance: Dict[str, ParameterProvenance]
    expected_account: str
    received_account: str
    decision: Literal["ALLOW", "BLOCK"]
    reason: str
    bank_api_called: bool = False
    bank_call_count: int = 0
    veto_token: Optional[str] = None
    lineage_chain: List[LineageChainNode] = []

class MockBankRequest(BaseModel):
    account: str
    amount: float
    veto_token: Optional[str] = None

class MockBankResponse(BaseModel):
    status: Literal["SETTLED", "REJECTED", "UNAUTHORIZED"]
    destination: str
    debited: str
    amount: float
    timestamp: str
    bank_call_count: int
    message: Optional[str] = None
    veto_token_verified: bool = False

class AuditRecord(BaseModel):
    audit_id: str
    timestamp: str
    mandate_id: str
    vendor: str
    invoice_id: str
    amount: float
    received_beneficiary: str
    verified_beneficiary: str
    provenance_state: Literal["TRUSTED", "TAINTED", "VERIFIED"]
    decision: Literal["ALLOWED", "BLOCKED"]
    reason: str
    bank_api_called: bool
    bank_call_count: int
    gateway_latency_ms: float
    previous_hash: str
    current_hash: str
    signature: str
    integrity_verified: bool = True

class BenchmarkTestCaseResult(BaseModel):
    id: int
    name: str
    category: Literal["ADVERSARIAL_ATTACK", "CLEAN_BASELINE"]
    attack_class: str
    document_type: str
    expected_account: str
    received_account: str
    trust_state: str
    decision: str
    bank_call_count: int
    passed: bool
    false_positive: bool
    origin_node: str

class TelemetryMetrics(BaseModel):
    total_attacks: int = 0
    blocked_attacks: int = 0
    allowed_clean: int = 0
    bank_call_count: int = 0
    taint_detection_pct: float = 0.0
    avg_latency_ms: float = 0.0
    false_positive_pct: float = 0.0

class DispatchRequest(BaseModel):
    document_type: str = "poisoned"
    attack_class: Optional[str] = None
    custom_text: Optional[str] = None
    veto_mode: bool = True
    mandate: Optional[HumanMandate] = None

class DispatchStageLog(BaseModel):
    stage: str
    timestamp: str
    message: str
    detail: Optional[Any] = None

class DispatchResponse(BaseModel):
    document_type: str
    veto_mode: bool
    mandate: HumanMandate
    candidate_parameters: CandidateParameters
    provenance: Dict[str, ParameterProvenance]
    evaluation: VetoEvaluation
    bank_response: Optional[Dict[str, Any]] = None
    audit: AuditRecord
    logs: list[DispatchStageLog]
    metrics: TelemetryMetrics
    bank_call_count: int

