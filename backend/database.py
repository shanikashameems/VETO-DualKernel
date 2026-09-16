import sqlite3
import os
import shutil
from pathlib import Path
from typing import Optional, Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent

def get_db_path() -> Path:
    # On Vercel serverless environment (VERCEL=1), always write SQLite DB to writeable /tmp directory
    if os.environ.get("VERCEL") == "1" or os.environ.get("VERCEL_ENV") or not os.access(BASE_DIR / "data", os.W_OK):
        tmp_db = Path("/tmp/veto.db")
        seed_db = BASE_DIR / "data" / "veto.db"
        if not tmp_db.exists() and seed_db.exists():
            try:
                shutil.copy(seed_db, tmp_db)
            except Exception:
                pass
        return tmp_db
    return BASE_DIR / "data" / "veto.db"

def init_db():
    db_p = get_db_path()
    db_p.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_p)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS erp_vendors (
            vendor_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            verified_account TEXT NOT NULL,
            status TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            audit_id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            mandate_id TEXT NOT NULL,
            vendor TEXT NOT NULL,
            invoice_id TEXT NOT NULL,
            amount REAL NOT NULL,
            received_beneficiary TEXT NOT NULL,
            verified_beneficiary TEXT NOT NULL,
            provenance_state TEXT NOT NULL,
            decision TEXT NOT NULL,
            reason TEXT NOT NULL,
            bank_api_called INTEGER NOT NULL,
            bank_call_count INTEGER NOT NULL DEFAULT 0,
            gateway_latency_ms REAL NOT NULL,
            previous_hash TEXT NOT NULL DEFAULT '',
            current_hash TEXT NOT NULL DEFAULT '',
            signature TEXT NOT NULL DEFAULT ''
        )
    """)
    
    # Add columns if migrating existing table
    for col, ctype in [
        ("bank_call_count", "INTEGER NOT NULL DEFAULT 0"),
        ("previous_hash", "TEXT NOT NULL DEFAULT ''"),
        ("current_hash", "TEXT NOT NULL DEFAULT ''"),
        ("signature", "TEXT NOT NULL DEFAULT ''")
    ]:
        try:
            cursor.execute(f"ALTER TABLE audit_logs ADD COLUMN {col} {ctype}")
        except Exception:
            pass

    # Seed vendors if empty
    cursor.execute("SELECT COUNT(*) FROM erp_vendors")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("""
            INSERT INTO erp_vendors (vendor_id, name, verified_account, status)
            VALUES (?, ?, ?, ?)
        """, [
            ("VND-001", "ABC Supplies", "Account #1234", "WHITELISTED"),
            ("VND-002", "Global Logistics", "Account #5566", "WHITELISTED")
        ])
    conn.commit()
    conn.close()

def get_verified_account(vendor_name: str) -> Optional[str]:
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    cursor.execute("SELECT verified_account FROM erp_vendors WHERE ? LIKE '%' || name || '%' OR name LIKE '%' || ? || '%'", (vendor_name, vendor_name))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def get_all_vendors() -> List[Dict[str, str]]:
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    cursor.execute("SELECT vendor_id, name, verified_account, status FROM erp_vendors")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"vendor_id": r[0], "name": r[1], "verified_account": r[2], "status": r[3]}
        for r in rows
    ]

def save_audit_log(log_data: dict):
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_logs (
            audit_id, timestamp, mandate_id, vendor, invoice_id, amount,
            received_beneficiary, verified_beneficiary, provenance_state,
            decision, reason, bank_api_called, bank_call_count, gateway_latency_ms,
            previous_hash, current_hash, signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_data["audit_id"], log_data["timestamp"], log_data["mandate_id"],
        log_data["vendor"], log_data["invoice_id"], log_data["amount"],
        log_data["received_beneficiary"], log_data["verified_beneficiary"],
        log_data["provenance_state"], log_data["decision"], log_data["reason"],
        1 if log_data["bank_api_called"] else 0, log_data.get("bank_call_count", 0),
        log_data["gateway_latency_ms"],
        log_data.get("previous_hash", ""), log_data.get("current_hash", ""), log_data.get("signature", "")
    ))
    conn.commit()
    conn.close()

def fetch_audit_history(limit: int = 50) -> List[dict]:
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    cursor.execute("""
        SELECT audit_id, timestamp, mandate_id, vendor, invoice_id, amount,
               received_beneficiary, verified_beneficiary, provenance_state,
               decision, reason, bank_api_called, bank_call_count, gateway_latency_ms,
               previous_hash, current_hash, signature
        FROM audit_logs ORDER BY rowid DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "audit_id": r[0], "timestamp": r[1], "mandate_id": r[2],
            "vendor": r[3], "invoice_id": r[4], "amount": r[5],
            "received_beneficiary": r[6], "verified_beneficiary": r[7],
            "provenance_state": r[8], "decision": r[9], "reason": r[10],
            "bank_api_called": bool(r[11]), "bank_call_count": r[12],
            "gateway_latency_ms": r[13],
            "previous_hash": r[14], "current_hash": r[15], "signature": r[16],
            "integrity_verified": True
        }
        for r in rows
    ]
