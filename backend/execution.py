import datetime
from typing import Dict, Any, Tuple
from fastapi import HTTPException
from .models import MockBankRequest, MockBankResponse, VetoEvaluation

# Simulated local ledger
SIMULATED_MOCK_LEDGER = []

def process_mock_bank_payment(request: MockBankRequest) -> MockBankResponse:
    """
    LOCAL MOCK BANK SETTLEMENT API
    Performs privileged settlement only when invoked by backend actuation kernel.
    Never connects to external networks or real payment APIs.
    """
    settlement = MockBankResponse(
        status="SETTLED",
        destination=request.account,
        debited=f"₹{request.amount:,.0f}",
        amount=request.amount,
        timestamp=datetime.datetime.now().isoformat()
    )
    SIMULATED_MOCK_LEDGER.append(settlement.model_dump())
    return settlement

def execute_actuation_kernel(
    evaluation: VetoEvaluation,
    amount: float,
    veto_mode: bool
) -> Tuple[bool, Dict[str, Any], int]:
    """
    KERNEL 03: Actuation Kernel
    Enforces server-side zero-trust execution policy.
    Returns (bank_called, response_payload, status_code).
    """
    if evaluation.decision == "BLOCK":
        # System Invariant: Block money movement if parameter is tainted under VETO ON
        error_payload = {
            "error": "VETO_EXECUTION_ABORTED",
            "tainted_parameter": "beneficiary_account",
            "received_value": evaluation.received_account,
            "expected_account": evaluation.expected_account,
            "reason": evaluation.reason,
            "action": "MONEY_MOVEMENT_HALTED"
        }
        return False, error_payload, 403

    # If decision is ALLOW (Clean invoice OR VETO disabled), execute payment on local mock bank
    bank_req = MockBankRequest(
        account=evaluation.received_account,
        amount=amount
    )
    bank_res = process_mock_bank_payment(bank_req)
    evaluation.bank_api_called = True
    return True, bank_res.model_dump(), 200
