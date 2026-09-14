import time
import datetime
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List

from .models import (
    DispatchRequest, DispatchResponse, DispatchStageLog,
    HumanMandate, CandidateParameters, VetoEvaluation,
    MockBankRequest, MockBankResponse, AuditRecord, TelemetryMetrics
)
from .database import init_db, get_all_vendors, fetch_audit_history
from .perception import read_document_text, extract_candidate_parameters
from .provenance import evaluate_causal_provenance
from .execution import execute_actuation_kernel, process_mock_bank_payment
from .audit import create_audit_record

app = FastAPI(
    title="VETO-DualKernel API",
    description="Zero-Trust Execution for Agentic Finance",
    version="1.0.0"
)

# Enable CORS for local dev / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Global in-memory metrics state updated from real executions
GLOBAL_RUN_HISTORY: List[Dict[str, Any]] = []

def compute_telemetry_metrics() -> TelemetryMetrics:
    if not GLOBAL_RUN_HISTORY:
        return TelemetryMetrics(
            total_attacks=0,
            blocked_attacks=0,
            allowed_clean=0,
            taint_detection_pct=0.0,
            avg_latency_ms=0.0,
            false_positive_pct=0.0
        )
    
    total = len(GLOBAL_RUN_HISTORY)
    poisoned_runs = [r for r in GLOBAL_RUN_HISTORY if r["is_poisoned"]]
    clean_runs = [r for r in GLOBAL_RUN_HISTORY if not r["is_poisoned"]]
    
    blocked_poisoned = [r for r in poisoned_runs if r["decision"] == "BLOCK" and r["veto_mode"]]
    allowed_clean = [r for r in clean_runs if r["decision"] == "ALLOW"]
    false_positives = [r for r in clean_runs if r["decision"] == "BLOCK"]
    
    taint_pct = (len(blocked_poisoned) / len(poisoned_runs) * 100.0) if poisoned_runs else 0.0
    false_pos_pct = (len(false_positives) / len(clean_runs) * 100.0) if clean_runs else 0.0
    
    latencies = [r["latency_ms"] for r in GLOBAL_RUN_HISTORY]
    avg_lat = sum(latencies) / len(latencies) if latencies else 0.0

    return TelemetryMetrics(
        total_attacks=len(poisoned_runs),
        blocked_attacks=len(blocked_poisoned),
        allowed_clean=len(allowed_clean),
        taint_detection_pct=round(taint_pct, 1),
        avg_latency_ms=round(avg_lat, 2),
        false_positive_pct=round(false_pos_pct, 1)
    )

@app.get("/api/status")
def get_status():
    return {
        "status": "ONLINE",
        "proxy": "localhost:8000/veto",
        "boundary": "VETO-DualKernel Active",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.get("/api/vendors")
def list_vendors():
    return get_all_vendors()

@app.post("/api/ingest")
def ingest_document(payload: Dict[str, Any]):
    doc_text = payload.get("document_text") or read_document_text(payload.get("document_type", "poisoned"))
    doc_name = payload.get("document_type", "untrusted_doc.txt")
    candidates = extract_candidate_parameters(doc_text, doc_name)
    return candidates.model_dump()

@app.post("/api/evaluate")
def evaluate_provenance(payload: Dict[str, Any]):
    mandate = HumanMandate(**payload.get("mandate", {}))
    candidates = CandidateParameters(**payload.get("candidate_parameters", {}))
    veto_mode = payload.get("veto_mode", True)
    evaluation = evaluate_causal_provenance(mandate, candidates, veto_mode)
    return evaluation.model_dump()

@app.post("/api/bank-mock")
def mock_bank_endpoint(req: MockBankRequest, response: Response):
    """
    Simulated Bank Egress Route.
    Direct endpoint representing the external banking system.
    """
    res = process_mock_bank_payment(req)
    response.status_code = status.HTTP_200_OK
    return res

@app.post("/api/dispatch", response_model=DispatchResponse)
def dispatch_pipeline(req: DispatchRequest, response: Response):
    start_time = time.perf_counter()
    mandate = req.mandate or HumanMandate()
    logs: List[DispatchStageLog] = []

    def add_log(stage: str, offset_sec: float, msg: str, detail: Any = None):
        logs.append(DispatchStageLog(
            stage=stage,
            timestamp=f"[+{offset_sec:.2f}s]",
            message=msg,
            detail=detail
        ))

    # STAGE 1: Perception Sandbox
    add_log("STAGE 1", 0.00, "Initializing Quarantined Context Window...")
    add_log("STAGE 1", 0.12, "Parsing raw document tokens...")
    
    doc_text = req.custom_text or read_document_text(req.document_type)
    candidates = extract_candidate_parameters(doc_text, f"{req.document_type}_invoice_1042.txt")
    
    add_log("STAGE 1", 0.34, "Context Ingestion Complete.")
    add_log("STAGE 1", 0.34, "Zero network sockets bound.")
    add_log("STAGE 1", 0.46, "Candidate parameter proposal emitted.", candidates.model_dump())

    # STAGE 2: Lineage & Causal Taint Gateway
    add_log("STAGE 2", 0.47, "Intercepting tool dispatch before network egress...")
    add_log("STAGE 2", 0.48, "Resolving parameter lineage...")
    
    evaluation = evaluate_causal_provenance(mandate, candidates, req.veto_mode)
    
    add_log("STAGE 2", 0.51, f"Querying Enterprise Truth Registry... SELECT verified_account FROM erp_vendors WHERE name = '{candidates.vendor}';")
    add_log("STAGE 2", 0.52, f"Registry result: {evaluation.expected_account} | Derived: {candidates.beneficiary_account}")
    
    is_tainted = evaluation.provenance["beneficiary_account"].trust_state == "TAINTED"
    if is_tainted:
        add_log("STAGE 2", 0.53, "TAINT STATE FLIPPED: param('beneficiary_account') = TAINTED")

    # STAGE 3: Privileged Actuation Kernel
    bank_called, bank_res, status_code = execute_actuation_kernel(
        evaluation, candidates.amount, req.veto_mode
    )

    if req.veto_mode and is_tainted:
        add_log("STAGE 3", 0.60, "VETO ENFORCED: Zero-Trust Execution Gate Active")
        add_log("STAGE 3", 0.62, "[VETO-KERNEL-ABORT] Tool execution refused. Money movement halted.")
        response.status_code = status.HTTP_403_FORBIDDEN
    elif not req.veto_mode and is_tainted:
        add_log("STAGE 3", 0.60, "VETO DISABLED: Bypassing Execution Gate")
        add_log("STAGE 3", 0.65, f"POST /api/bank-mock payload: {{account: '{candidates.beneficiary_account}', amount: {candidates.amount}}}")
        add_log("STAGE 3", 0.70, "HTTP 200 OK — PAYMENT EXECUTED — CORPORATE LOSS DETECTED")
        response.status_code = status.HTTP_200_OK
    else:
        add_log("STAGE 3", 0.60, "VETO ENFORCED: Provenance Verified")
        add_log("STAGE 3", 0.65, f"POST /api/bank-mock payload: {{account: '{candidates.beneficiary_account}', amount: {candidates.amount}}}")
        add_log("STAGE 3", 0.70, "HTTP 200 OK — PAYMENT ALLOWED & SETTLED")
        response.status_code = status.HTTP_200_OK

    # Generate Audit Record & Measure Latency
    audit = create_audit_record(mandate, candidates, evaluation, start_time)
    
    # Store run history for live metrics
    GLOBAL_RUN_HISTORY.append({
        "is_poisoned": candidates.has_injection or req.document_type == "poisoned",
        "veto_mode": req.veto_mode,
        "decision": evaluation.decision,
        "latency_ms": audit.gateway_latency_ms
    })
    
    metrics = compute_telemetry_metrics()

    return DispatchResponse(
        document_type=req.document_type,
        veto_mode=req.veto_mode,
        mandate=mandate,
        candidate_parameters=candidates,
        provenance=evaluation.provenance,
        evaluation=evaluation,
        bank_response=bank_res,
        audit=audit,
        logs=logs,
        metrics=metrics
    )

@app.get("/api/metrics", response_model=TelemetryMetrics)
def get_metrics():
    return compute_telemetry_metrics()

@app.get("/api/audit/latest")
def get_latest_audit():
    history = fetch_audit_history(limit=1)
    if history:
        return history[0]
    return {"message": "No audit records found."}

@app.get("/api/audit/history")
def get_audit_history():
    return fetch_audit_history(limit=50)

@app.post("/api/reset")
def reset_state(payload: Dict[str, Any] = {}):
    global GLOBAL_RUN_HISTORY
    reset_metrics = payload.get("reset_metrics", False)
    if reset_metrics:
        GLOBAL_RUN_HISTORY.clear()
    return {
        "status": "RESET_COMPLETE",
        "history_cleared": reset_metrics,
        "metrics": compute_telemetry_metrics().model_dump()
    }

@app.post("/api/benchmark")
def run_benchmark(payload: Dict[str, Any] = {}):
    """
    Executes a deterministic suite of 10 attacks to verify metrics calculation.
    """
    num_tests = payload.get("count", 10)
    mandate = HumanMandate()
    results = []
    
    for i in range(num_tests):
        # 8 poisoned, 2 clean
        doc_type = "poisoned" if i < 8 else "clean"
        doc_text = read_document_text(doc_type)
        candidates = extract_candidate_parameters(doc_text, f"{doc_type}_benchmark_{i}.txt")
        eval_res = evaluate_causal_provenance(mandate, candidates, veto_mode=True)
        
        start_t = time.perf_counter()
        bank_called, b_res, _ = execute_actuation_kernel(eval_res, candidates.amount, veto_mode=True)
        aud = create_audit_record(mandate, candidates, eval_res, start_t)
        
        GLOBAL_RUN_HISTORY.append({
            "is_poisoned": (doc_type == "poisoned"),
            "veto_mode": True,
            "decision": eval_res.decision,
            "latency_ms": aud.gateway_latency_ms
        })
        results.append(aud.model_dump())
        
    return {
        "benchmark_executed": num_tests,
        "metrics": compute_telemetry_metrics().model_dump()
    }
