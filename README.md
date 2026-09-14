# VETO-DualKernel: Zero-Trust Execution for Agentic Finance

> **Mission-Critical Execution-Control Infrastructure for Autonomous Financial Agents**

VETO-DualKernel is a local zero-trust execution gateway designed to protect financial agent pipelines from prompt injection attacks and malicious counterparty routing manipulation.

---

## Architectural Security Model

The system enforces a strict server-side **Security Invariant**:
> *A payment parameter originating from untrusted context MUST NOT reach privileged execution unless its provenance has been verified against enterprise truth.*

```
                          ┌────────────────────────┐
                          │  Human ERP Mandate     │
                          │  (TRUSTED_ORIGIN)      │
                          └───────────┬────────────┘
                                      │
┌────────────────────────┐            ▼
│  Untrusted Document    │    ┌────────────────────┐
│  (Clean / Poisoned)    ├───►│ Perception Kernel  │
└────────────────────────┘    │ (Read-Only Sandbox)│
                              └───────────┬────────┘
                                          │ Candidate Parameters
                                          ▼
                              ┌────────────────────┐      SQL      ┌────────────────────────┐
                              │ VETO Gateway       ├──────────────►│ SQLite ERP Registry    │
                              │ (Lineage & Taint)  │◄──────────────┤ (Verified Truth)       │
                              └───────────┬────────┘  Account#1234  └────────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │ Mode Check                        │
          ┌─────────────┴─────────────┐       ┌─────────────┴─────────────┐
          │ VETO OFF                  │       │ VETO ON                   │
          ▼                           ▼       ▼                           ▼
 ┌─────────────────┐         ┌───────────────────┐       ┌─────────────────┐
 │ Lineage Ignored │         │ Tainted Parameter │       │ Verified Match  │
 └────────┬────────┘         └─────────┬─────────┘       └────────┬────────┘
          │                            │                          │
          ▼                            ▼                          ▼
 ┌─────────────────┐         ┌───────────────────┐       ┌─────────────────┐
 │ Mock Bank API   │         │ HTTP 403 FORBIDDEN│       │ Mock Bank API   │
 │ (₹5,00,000      │         │ Zero Funds Moved  │       │ (₹5,00,000      │
 │ Exfiltrated)    │         │ (Invariant Upheld)│       │ Settled #1234)  │
 └─────────────────┘         └───────────────────┘       └─────────────────┘
```

### The Three Kernels:

1. **Kernel 01 — Perception Kernel (Read-Only Sandbox)**:
   Parses untrusted input documents. Emits candidate parameters (`vendor`, `invoice_id`, `amount`, `beneficiary_account`). It can be deceived by prompt injection embedded inside documents.
2. **Kernel 02 — Causal Taint Engine / VETO Gateway**:
   Tracks origin of parameters against Human Mandates (`TRUSTED`) and SQLite ERP Vendor Registry. Computes deterministic state (`TRUSTED`, `DERIVED`, `TAINTED`). No fuzzy ML scores.
3. **Kernel 03 — Actuation Kernel (Privileged Execution)**:
   Performs financial execution on the local mock banking API. If VETO is ON and a parameter is `TAINTED`, aborts execution with `HTTP 403 FORBIDDEN` without invoking the bank.

---

## Directory Structure

```
D:\Veto
├── backend/
│   ├── main.py              # FastAPI application endpoints & telemetry
│   ├── models.py            # Pydantic schemas
│   ├── database.py          # SQLite database connection & seeding (veto.db)
│   ├── perception.py        # Sandboxed text parsing engine
│   ├── provenance.py        # Causal Taint Engine & Invariant Gateway
│   ├── execution.py         # Actuation Kernel & Local Mock Bank API
│   ├── audit.py             # Millisecond latency & Audit Dossier logger
│   └── tests/
│       └── test_veto.py     # 11 automated pytest security invariant tests
├── frontend/
│   ├── src/
│   │   ├── components/      # Header, ThreatIngestion, DualKernelTrace, EnterpriseTruth, TelemetryFooter
│   │   ├── App.tsx          # Main single-page console
│   │   └── index.css        # Tailwind styling & typography
│   ├── package.json
│   └── vite.config.ts
├── data/
│   ├── veto.db              # SQLite enterprise database
│   ├── clean_invoice_1042.txt
│   └── poisoned_invoice_1042.txt
├── scripts/
│   └── benchmark.py         # Automation runner
├── requirements.txt
├── start.bat                # One-click launcher
└── README.md
```

---

## Prerequisites & Installation

### Requirements:
- Python 3.11+
- Node.js v18+ & npm

### Setup:
1. Open terminal in `D:\Veto`.
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Install Frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

---

## Startup & Execution

Simply double-click `start.bat` or run:

```cmd
start.bat
```

This launches:
- **Backend API**: `http://localhost:8000`
- **Frontend App**: `http://localhost:5173`

---

## API Endpoints

- `GET /api/status`: Health check & proxy indicator.
- `POST /api/dispatch`: Primary pipeline trigger for Perception -> Provenance -> Actuation.
- `POST /api/ingest`: Sandboxed document parameter extraction.
- `POST /api/evaluate`: Provenance & Taint calculation.
- `POST /api/bank-mock`: Local mock settlement endpoint.
- `GET /api/metrics`: Dynamic telemetry results.
- `GET /api/vendors`: SQLite verified ERP vendor registry.
- `GET /api/audit/latest`: Returns latest audit dossier JSON.
- `POST /api/benchmark`: Executes 10 automated test attacks.

---

## Live Hackathon Demo Walkthrough

1. **Step 1**: Open `http://localhost:5173`. Top bar shows `[ MODE: UNPROTECTED AGENT ]` (Red).
2. **Step 2**: Select `[ POISONED INVOICE ]` under Untrusted Document Ingestion.
3. **Step 3**: Check `[✓] REVEAL HIDDEN PROMPT INJECTION` to highlight embedded attack directing payment to `Beneficiary Account #9928`.
4. **Step 4**: Click `[ DISPATCH TO AGENT ]`.
5. **Step 5**: Observe Perception Kernel extract `#9928`. Observe VETO Gateway query SQLite (`ABC Supplies` -> `#1234`). Observe `#9928 != #1234` -> `TAINTED`.
6. **Step 6**: Because VETO is OFF, payment executes: `HTTP 200 OK — PAYMENT EXECUTED — CORPORATE LOSS DETECTED ₹5,00,000 EXFILTRATED`.
7. **Step 7**: Toggle top Hero Switch to `[ MODE: VETO ENFORCED ]` (Emerald).
8. **Step 8**: Dispatch the **EXACT SAME POISONED INVOICE** again.
9. **Step 9**: Observe VETO Gateway intercept execution: `HTTP 403 FORBIDDEN — SYSTEM INVARIANT UPHELD — ZERO FUNDS MOVED`. Mock bank is **NEVER** called.
10. **Step 10**: Select `[ CLEAN INVOICE ]` and click Dispatch.
11. **Step 11**: Observe clean invoice `#1234` match `#1234` -> `PROVENANCE VERIFIED — PAYMENT ALLOWED`. Demonstrates zero false positives.
12. **Step 12**: Click `[ RUN 10 ATTACK TESTS ]` at bottom to execute automated benchmark matrix.

---

## Running Automated Tests

Run the full pytest suite:

```bash
set PYTHONPATH=D:\Veto
python -m pytest backend/tests/test_veto.py -v
```

All 11 test cases pass cleanly.
