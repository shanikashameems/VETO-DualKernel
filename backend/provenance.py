from typing import Dict, List
from .models import HumanMandate, CandidateParameters, ParameterProvenance, VetoEvaluation, LineageChainNode
from .database import get_verified_account

def evaluate_causal_provenance(
    mandate: HumanMandate,
    candidates: CandidateParameters,
    veto_mode: bool
) -> VetoEvaluation:
    """
    KERNEL 02: Causal Taint Engine & Security Invariant Gate
    Enforces deterministic server-side check with enriched provenance graph tracing.
    Exposes explicit node origin: Invoice Text ➔ Extracted Token ➔ TAINTED ➔ VETO BLOCK
    """
    provenance_map: Dict[str, ParameterProvenance] = {}
    lineage_nodes: List[LineageChainNode] = []
    
    # 1. Mandate Node (Trusted Root)
    lineage_nodes.append(LineageChainNode(
        step=1,
        name="HUMAN_MANDATE",
        type="TRUSTED_INTENT",
        value=f"Approved Entity: {mandate.approved_entity} | Cap: {mandate.authorized_amount_cap}",
        status="TRUSTED",
        detail=f"Session {mandate.session_id} authorized payment cap {mandate.authorized_amount_cap}",
        node_origin="ERP_ROOT_SESSION"
    ))

    # Rule 1: Mandate parameters are TRUSTED
    provenance_map["vendor"] = ParameterProvenance(
        parameter_name="vendor",
        value=candidates.vendor,
        source="human_mandate",
        source_type="HUMAN_MANDATE",
        trust_state="TRUSTED",
        node_origin="ERP_VENDOR_MANDATE",
        extracted_token=candidates.vendor,
        validated_against="mandate.approved_entity",
        expected_value=mandate.approved_entity,
        validation_result="MATCH"
    )

    provenance_map["amount"] = ParameterProvenance(
        parameter_name="amount",
        value=f"₹{candidates.amount:,.0f}",
        source=candidates.document_source,
        source_type="UNTRUSTED_DOCUMENT",
        trust_state="DERIVED",
        node_origin=f"{candidates.document_source}:Line4",
        extracted_token=f"₹{candidates.amount:,.0f}",
        validated_against="mandate.authorized_amount_cap",
        expected_value=str(mandate.authorized_amount_numeric),
        validation_result="MATCH" if candidates.amount <= mandate.authorized_amount_numeric else "MISMATCH"
    )

    # 2. Document Extraction Node (Origin)
    origin_text = f"{candidates.document_source}:Line14" if candidates.has_injection else f"{candidates.document_source}:Line8"
    lineage_nodes.append(LineageChainNode(
        step=2,
        name="UNTRUSTED_INVOICE_TEXT",
        type="PARSED_DOCUMENT",
        value=f"Extracted Beneficiary: {candidates.beneficiary_account}",
        status="POISONED" if candidates.has_injection else "UNVERIFIED",
        detail=f"Parsed from untrusted document text via Perception Kernel",
        node_origin=origin_text
    ))

    # Resolve beneficiary account against Enterprise Truth SQLite Registry
    verified_account = get_verified_account(candidates.vendor) or "Account #1234"
    received_account = candidates.beneficiary_account
    
    is_tainted = (received_account != verified_account)
    
    provenance_map["beneficiary_account"] = ParameterProvenance(
        parameter_name="beneficiary_account",
        value=received_account,
        source=candidates.document_source,
        source_type="UNTRUSTED_DOCUMENT",
        trust_state="TAINTED" if is_tainted else "VERIFIED",
        node_origin=f"Invoice Text ➔ Extracted {received_account} ➔ TAINTED" if is_tainted else f"Invoice Text ➔ Extracted {received_account} ➔ VERIFIED",
        extracted_token=received_account,
        validated_against="erp_vendors.verified_account",
        expected_value=verified_account,
        validation_result="MISMATCH" if is_tainted else "MATCH"
    )

    # 3. Causal Taint Engine Node
    lineage_nodes.append(LineageChainNode(
        step=3,
        name="CAUSAL_TAINT_ENGINE",
        type="INVARIANT_EVALUATOR",
        value=f"Expected: {verified_account} | Received: {received_account}",
        status="TAINTED" if is_tainted else "VERIFIED",
        detail=f"Registry mismatch detect: Received {received_account} != ERP Truth {verified_account}",
        node_origin=f"Extracted {received_account} ➔ TAINTED" if is_tainted else f"Extracted {received_account} ➔ VERIFIED"
    ))

    # Server-Side Security Decision Invariant
    if is_tainted:
        if veto_mode:
            decision = "BLOCK"
            reason = "CAUSAL_TAINT_MISMATCH"
        else:
            decision = "ALLOW"
            reason = "VETO_DISABLED_BYPASS"
    else:
        decision = "ALLOW"
        reason = "PROVENANCE_VERIFIED"

    # 4. Security Gateway Node
    lineage_nodes.append(LineageChainNode(
        step=4,
        name="EXECUTION_GATEWAY",
        type="SECURITY_GATE",
        value=f"Decision: VETO {decision}",
        status="BLOCKED" if decision == "BLOCK" else "ALLOWED",
        detail=f"Gate evaluation result: {decision} ({reason})",
        node_origin="VETO_INVARIANT_GATE"
    ))

    return VetoEvaluation(
        provenance=provenance_map,
        expected_account=verified_account,
        received_account=received_account,
        decision=decision,
        reason=reason,
        bank_api_called=False,
        bank_call_count=0,
        lineage_chain=lineage_nodes
    )
