from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

from database import get_db_connection
from models import DemoWalletFundRequest, DemoWalletWithdrawalRequest, WalletTransferRequest

router = APIRouter(prefix="/api/wallet", tags=["Demo Wallet"])


def _ensure_wallet(cursor, staff_id: str):
    cursor.execute("SELECT balance FROM wallet_accounts WHERE staff_id = ?", (staff_id,))
    account = cursor.fetchone()
    if account:
        return float(account["balance"])

    cursor.execute("SELECT name FROM staff WHERE id = ?", (staff_id,))
    staff = cursor.fetchone()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")

    cursor.execute(
        "SELECT wallet_balance FROM users WHERE role = 'STAFF' AND name = ? ORDER BY id LIMIT 1",
        (staff["name"],),
    )
    user = cursor.fetchone()
    starting_balance = float(user["wallet_balance"] or 0) if user else 0.0
    cursor.execute(
        "INSERT OR IGNORE INTO wallet_accounts (staff_id, balance, updated_at) VALUES (?, ?, ?)",
        (staff_id, starting_balance, datetime.now().isoformat()),
    )
    return starting_balance


def _sync_user_balance(cursor, staff_id: str, balance: float):
    cursor.execute("SELECT name FROM staff WHERE id = ?", (staff_id,))
    staff = cursor.fetchone()
    if staff:
        cursor.execute(
            "UPDATE users SET wallet_balance = ? WHERE role = 'STAFF' AND name = ?",
            (balance, staff["name"]),
        )


@router.get("/summary")
def get_wallet_summary(staff_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        balance = _ensure_wallet(cursor, staff_id)
        cursor.execute(
            """
            SELECT tx.*, sender.name AS sender_name, recipient.name AS recipient_name
            FROM wallet_transactions AS tx
            LEFT JOIN staff AS sender ON sender.id = tx.sender_staff_id
            LEFT JOIN staff AS recipient ON recipient.id = tx.recipient_staff_id
            WHERE tx.sender_staff_id = ? OR tx.recipient_staff_id = ?
            ORDER BY tx.created_at DESC
            LIMIT 50
            """,
            (staff_id, staff_id),
        )
        transactions = [dict(row) for row in cursor.fetchall()]
        conn.commit()
        return {"staff_id": staff_id, "balance": balance, "transactions": transactions}
    finally:
        conn.close()


@router.post("/demo-funds")
def add_demo_funds(req: DemoWalletFundRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        current_balance = _ensure_wallet(cursor, req.staff_id)
        next_balance = round(current_balance + req.amount, 2)
        cursor.execute(
            "UPDATE wallet_accounts SET balance = ?, updated_at = ? WHERE staff_id = ?",
            (next_balance, datetime.now().isoformat(), req.staff_id),
        )
        _sync_user_balance(cursor, req.staff_id, next_balance)
        cursor.execute(
            """
            INSERT INTO wallet_transactions (id, sender_staff_id, recipient_staff_id, transaction_type, amount, note, status, created_at)
            VALUES (?, NULL, ?, 'DEMO_TOP_UP', ?, 'Hackathon demo funds', 'COMPLETED', ?)
            """,
            (f"wallet-{uuid.uuid4().hex[:12]}", req.staff_id, req.amount, datetime.now().isoformat()),
        )
        conn.commit()
        return {"success": True, "balance": next_balance, "added": req.amount}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.post("/transfer")
def transfer_demo_funds(req: WalletTransferRequest):
    if req.sender_staff_id == req.recipient_staff_id:
        raise HTTPException(status_code=400, detail="Choose a different staff member to receive the transfer.")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        sender_balance = _ensure_wallet(cursor, req.sender_staff_id)
        recipient_balance = _ensure_wallet(cursor, req.recipient_staff_id)
        if sender_balance < req.amount:
            raise HTTPException(status_code=400, detail="Not enough demo funds in this wallet.")

        sender_balance = round(sender_balance - req.amount, 2)
        recipient_balance = round(recipient_balance + req.amount, 2)
        updated_at = datetime.now().isoformat()
        cursor.execute(
            "UPDATE wallet_accounts SET balance = ?, updated_at = ? WHERE staff_id = ?",
            (sender_balance, updated_at, req.sender_staff_id),
        )
        cursor.execute(
            "UPDATE wallet_accounts SET balance = ?, updated_at = ? WHERE staff_id = ?",
            (recipient_balance, updated_at, req.recipient_staff_id),
        )
        _sync_user_balance(cursor, req.sender_staff_id, sender_balance)
        _sync_user_balance(cursor, req.recipient_staff_id, recipient_balance)
        transfer_id = f"wallet-{uuid.uuid4().hex[:12]}"
        cursor.execute(
            """
            INSERT INTO wallet_transactions (id, sender_staff_id, recipient_staff_id, transaction_type, amount, note, status, created_at)
            VALUES (?, ?, ?, 'STAFF_TRANSFER', ?, ?, 'COMPLETED', ?)
            """,
            (transfer_id, req.sender_staff_id, req.recipient_staff_id, req.amount, req.note or "", updated_at),
        )
        conn.commit()
        return {
            "success": True,
            "transfer_id": transfer_id,
            "sender_balance": sender_balance,
            "recipient_balance": recipient_balance,
            "amount": req.amount,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.post("/demo-withdrawal")
def withdraw_demo_funds(req: DemoWalletWithdrawalRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        current_balance = _ensure_wallet(cursor, req.staff_id)
        if current_balance < req.amount:
            raise HTTPException(status_code=400, detail="Not enough demo funds in this wallet.")
        next_balance = round(current_balance - req.amount, 2)
        created_at = datetime.now().isoformat()
        cursor.execute(
            "UPDATE wallet_accounts SET balance = ?, updated_at = ? WHERE staff_id = ?",
            (next_balance, created_at, req.staff_id),
        )
        _sync_user_balance(cursor, req.staff_id, next_balance)
        cursor.execute(
            """
            INSERT INTO wallet_transactions (id, sender_staff_id, recipient_staff_id, transaction_type, amount, note, status, created_at)
            VALUES (?, ?, NULL, 'DEMO_WITHDRAWAL', ?, ?, 'COMPLETED', ?)
            """,
            (f"wallet-{uuid.uuid4().hex[:12]}", req.staff_id, req.amount, f"Simulated withdrawal to {req.destination}", created_at),
        )
        conn.commit()
        return {"success": True, "balance": next_balance, "withdrawn": req.amount}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
