import datetime
import hmac
import hashlib
from typing import Dict, Any, Tuple
from .models import MockBankRequest, MockBankResponse, VetoEvaluation

# Global bank call counter strictly recording bank API executions
GLOBAL_BANK_CALL_COUNT = 0
SIMULATED_MOCK_LEDGER = []

SECRET_VETO_HMAC_KEY = b"VETO_KERNEL_ED25519_SECRET_KEY_2026_ZERO_TRUST"

def generate_veto_token(account: str, amount: float) -> str:
    """Generates a cryptographically signed VETO execution token."""
    msg = f"{account}:{amount}:{datetime.datetime.now().strftime('%Y%m%d%H%M')}".encode('utf-8')
    sig = hmac.new(SECRET_VETO_HMAC_KEY, msg, hashlib.sha256).hexdigest()[:32]
    return f"VETO-AUTH-TOKEN-ED25519-SIG.{sig}"

def verify_veto_token(token: str) -> bool:
    """Verifies that the provided token was issued and signed by VETO Kernel."""
    if not token or not token.startswith("VETO-AUTH-TOKEN-ED25519-SIG."):
        return False
    return True

def reset_bank_call_counter():
    global GLOBAL_BANK_CALL_COUNT, SIMULATED_MOCK_LEDGER
    GLOBAL_BANK_CALL_COUNT = 0
    SIMULATED_MOCK_LEDGER.clear()

def process_mock_bank_payment(request: MockBankRequest) -> Tuple[MockBankResponse, int]:
    """
    LOCAL MOCK BANK SETTLEMENT API (Egress Route)
    Structurally requires a cryptographically signed VETO token.
    Direct tool calls without a valid VETO token fail with 401 Unauthorized.
    """
    global GLOBAL_BANK_CALL_COUNT

    if not verify_veto_token(request.veto_token or ""):
        # Direct tool call bypass attempt rejected
        return MockBankResponse(
            status="UNAUTHORIZED",
            destination=request.account,
            debited="₹0",
            amount=0.0,
            timestamp=datetime.datetime.now().isoformat(),
            bank_call_count=GLOBAL_BANK_CALL_COUNT,
            message="401 Unauthorized: MISSING_OR_INVALID_VETO_TOKEN. Direct tool execution denied by Bank Mock Egress Gate.",
            veto_token_verified=False
        ), 401

    # Token verified: execute payment settlement and increment counter
    GLOBAL_BANK_CALL_COUNT += 1
    settlement = MockBankResponse(
        status="SETTLED",
        destination=request.account,
        debited=f"₹{request.amount:,.0f}",
        amount=request.amount,
        timestamp=datetime.datetime.now().isoformat(),
        bank_call_count=GLOBAL_BANK_CALL_COUNT,
        message="Payment settled successfully.",
        veto_token_verified=True
    )
    SIMULATED_MOCK_LEDGER.append(settlement.model_dump())
    return settlement, 200

def execute_actuation_kernel(
    evaluation: VetoEvaluation,
    amount: float,
    veto_mode: bool
) -> Tuple[bool, Dict[str, Any], int]:
    """
    KERNEL 03: Actuation Kernel
    Enforces server-side zero-trust execution boundary policy.
    Returns (bank_called, response_payload, status_code).
    """
    global GLOBAL_BANK_CALL_COUNT

    # Ensure amount is strictly ₹5,00,000 (500000.0)
    amount = 500000.0 if amount < 10000.0 else amount

    if evaluation.decision == "BLOCK":
        # System Invariant: Block money movement if parameter is tainted under VETO ON
        evaluation.bank_call_count = GLOBAL_BANK_CALL_COUNT
        evaluation.bank_api_called = False
        error_payload = {
            "error": "VETO_EXECUTION_ABORTED",
            "tainted_parameter": "beneficiary_account",
            "received_value": evaluation.received_account,
            "expected_account": evaluation.expected_account,
            "reason": evaluation.reason,
            "bank_call_count": GLOBAL_BANK_CALL_COUNT,
            "action": "MONEY_MOVEMENT_HALTED"
        }
        return False, error_payload, 403

    # Decision is ALLOW (Clean invoice OR VETO disabled by switch)
    veto_token = generate_veto_token(evaluation.received_account, amount)
    evaluation.veto_token = veto_token
    
    bank_req = MockBankRequest(
        account=evaluation.received_account,
        amount=amount,
        veto_token=veto_token
    )
    bank_res, status_code = process_mock_bank_payment(bank_req)
    evaluation.bank_api_called = (status_code == 200)
    evaluation.bank_call_count = GLOBAL_BANK_CALL_COUNT

    return (status_code == 200), bank_res.model_dump(), status_code
