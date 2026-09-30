from fastapi import APIRouter, HTTPException
from database import add_notification, get_db_connection
from models import CreateStaffPayoutRequest, DisburseEscrowRequest
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/escrow", tags=["Escrow Smart Vault & Settlements"])

@router.get("/transactions")
def get_escrow_transactions(event_id: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if event_id:
        cursor.execute("SELECT * FROM escrow_txns WHERE event_id = ? ORDER BY timestamp DESC", (event_id,))
    else:
        cursor.execute("SELECT * FROM escrow_txns ORDER BY timestamp DESC")
    txns = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return txns


@router.post("/payouts")
def create_staff_payout(req: CreateStaffPayoutRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM events WHERE id = ?", (req.event_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Event not found.")

        cursor.execute(
            "SELECT id, name, role, hourly_rate FROM staff WHERE id = ? AND assigned_event_id = ?",
            (req.staff_id, req.event_id),
        )
        staff = cursor.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member is not assigned to this event.")

        gross_amount = round(req.hours_logged * req.hourly_rate, 2)
        platform_fee = round(gross_amount * 0.05, 2)
        net_payout = round(gross_amount - platform_fee, 2)
        txn_id = f"tx-salary-{uuid.uuid4().hex[:8]}"
        txn_hash = f"0x{uuid.uuid4().hex[:16]}"
        cursor.execute(
            """
            INSERT INTO escrow_txns (
                id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate,
                gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ESCROW_LOCKED', ?, ?)
            """,
            (
                txn_id, req.event_id, staff['id'], staff['name'], staff['role'],
                req.hours_logged, req.hourly_rate, gross_amount, platform_fee,
                net_payout, datetime.now().isoformat(), txn_hash,
            ),
        )
        add_notification(
            cursor,
            req.event_id,
            "Staff salary payout prepared",
            f"₹{net_payout:,.2f} salary payout prepared for {staff['name']}.",
            "escrow",
        )
        conn.commit()
        cursor.execute("SELECT * FROM escrow_txns WHERE id = ?", (txn_id,))
        return {"success": True, "transaction": dict(cursor.fetchone())}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@router.post("/disburse")
def disburse_escrow(req: DisburseEscrowRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM escrow_txns WHERE id = ?", (req.txn_id,))
    txn = cursor.fetchone()
    if not txn:
        conn.close()
        raise HTTPException(status_code=404, detail="Escrow transaction not found.")

    if txn['status'] == 'DISBURSED':
        conn.close()
        return {"success": True, "message": "Payout is already disbursed.", "txn": dict(txn)}

    # Mark as DISBURSED
    cursor.execute("""
    UPDATE escrow_txns
    SET status = 'DISBURSED'
    WHERE id = ?
    """, (req.txn_id,))

    # Credit only the staff member who owns this payout.
    if txn['staff_id'] and not txn['staff_id'].startswith('open-'):
        cursor.execute("""
        UPDATE users
        SET wallet_balance = wallet_balance + ?, lifetime_earnings = lifetime_earnings + ?
        WHERE id = (
            SELECT id FROM users
            WHERE role = 'STAFF' AND name = ?
            ORDER BY id LIMIT 1
        )
        """, (txn['net_payout'], txn['net_payout'], txn['staff_name']))
        cursor.execute("""
        INSERT OR IGNORE INTO wallet_accounts (staff_id, balance)
        VALUES (?, COALESCE((
            SELECT wallet_balance FROM users
            WHERE role = 'STAFF' AND name = ?
            ORDER BY id LIMIT 1
        ), 0))
        """, (txn['staff_id'], txn['staff_name']))
        cursor.execute(
            "UPDATE wallet_accounts SET balance = balance + ?, updated_at = ? WHERE staff_id = ?",
            (txn['net_payout'], datetime.now().isoformat(), txn['staff_id']),
        )
        cursor.execute("""
        INSERT INTO wallet_transactions (id, sender_staff_id, recipient_staff_id, transaction_type, amount, note, status, created_at)
        VALUES (?, NULL, ?, 'ESCROW_PAYOUT', ?, ?, 'COMPLETED', ?)
        """, (
            f"wallet-{uuid.uuid4().hex[:12]}",
            txn['staff_id'],
            txn['net_payout'],
            f"Escrow salary payout {txn['id']}",
            datetime.now().isoformat(),
        ))

    add_notification(cursor, txn['event_id'], "Escrow payout disbursed", f"₹{txn['net_payout']:,.2f} was disbursed to {txn['staff_name']}.", "escrow")

    conn.commit()

    cursor.execute("SELECT * FROM escrow_txns WHERE id = ?", (req.txn_id,))
    updated_txn = cursor.fetchone()
    conn.close()

    return {
        "success": True,
        "message": f"Disbursed ₹{txn['net_payout']:,.2f} to {txn['staff_name']} via ICICI Smart Contract Escrow.",
        "txn": dict(updated_txn)
    }

@router.post("/pre-fund")
def pre_fund_escrow(event_id: str, amount: float):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than zero.")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM events WHERE id = ?", (event_id,))
    evt = cursor.fetchone()
    if not evt:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found.")

    cursor.execute("UPDATE events SET escrow_total = escrow_total + ? WHERE id = ?", (amount, event_id))

    tx_id = f"tx-fund-{str(uuid.uuid4())[:6]}"
    cursor.execute("""
    INSERT INTO escrow_txns (id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate, gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash)
    VALUES (?, ?, 'vault-deposit', 'Escrow Reserve Pre-Funding', 'Vault Liquidity', 0, 0, ?, 0, ?, 'PAID', datetime('now'), ?)
    """, (
        tx_id,
        event_id,
        amount,
        amount,
        f"0x{uuid.uuid4().hex[:12]}..."
    ))
    add_notification(cursor, event_id, "Escrow funded", f"₹{amount:,.2f} was added to the reserve for {evt['name']}.", "escrow")

    conn.commit()
    cursor.execute("SELECT * FROM escrow_txns WHERE id = ?", (tx_id,))
    transaction = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": f"Pre-funded ₹{amount:,.2f} into Escrow Vault for {evt['name']}.",
        "tx_id": tx_id,
        "transaction": transaction
    }
