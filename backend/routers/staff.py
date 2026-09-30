from fastapi import APIRouter, HTTPException
from database import add_notification, get_db_connection
from datetime import datetime
import uuid
import secrets

router = APIRouter(prefix="/api/staff", tags=["Talent & Professionals"])

@router.get("")
def list_staff(event_id: str = None, status: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM staff WHERE 1=1"
    params = []
    if event_id:
        query += " AND assigned_event_id = ?"
        params.append(event_id)
    if status:
        query += " AND current_status = ?"
        params.append(status)

    cursor.execute(query, tuple(params))
    staff_list = []
    for row in cursor.fetchall():
        staff = dict(row)
        staff.pop('verification_code', None)
        staff_list.append(staff)
    conn.close()
    return staff_list

@router.get("/{staff_id}/verification-pass")
def get_verification_pass(staff_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, role, verified, verification_code FROM staff WHERE id = ?", (staff_id,))
        staff = cursor.fetchone()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found.")
        code = staff['verification_code'] or secrets.token_urlsafe(24)
        if not staff['verification_code']:
            cursor.execute("UPDATE staff SET verification_code = ? WHERE id = ?", (code, staff_id))
            conn.commit()
        return {
            "staff_id": staff['id'],
            "name": staff['name'],
            "role": staff['role'],
            "verified": bool(staff['verified']),
            "code": code
        }
    finally:
        conn.close()

@router.get("/{staff_id}/verify")
def verify_staff_credential(staff_id: str, code: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, role, verified, verification_code FROM staff WHERE id = ?", (staff_id,))
        staff = cursor.fetchone()
        valid_code = bool(staff and staff['verification_code'] and secrets.compare_digest(staff['verification_code'], code))
        is_verified = bool(staff and staff['verified'] and valid_code)
        if not is_verified:
            return {"valid": False, "status": "INVALID", "message": "This CrewPulse credential is not valid."}
        return {
            "valid": True,
            "status": "VERIFIED",
            "message": "CrewPulse staff credential verified.",
            "staff": {"id": staff['id'], "name": staff['name'], "role": staff['role']}
        }
    finally:
        conn.close()

@router.get("/{staff_id}")
def get_staff_detail(staff_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM staff WHERE id = ?", (staff_id,))
    staff = cursor.fetchone()
    conn.close()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    staff_data = dict(staff)
    staff_data.pop('verification_code', None)
    return staff_data

@router.post("/{staff_id}/hire")
def hire_staff(staff_id: str, event_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM staff WHERE id = ?", (staff_id,))
    staff = cursor.fetchone()
    if not staff:
        conn.close()
        raise HTTPException(status_code=404, detail="Staff member not found.")

    cursor.execute("""
    UPDATE staff
    SET assigned_event_id = ?, current_status = 'EN_ROUTE', zone = 'General Operations'
    WHERE id = ?
    """, (event_id, staff_id))

    escrow_amount = staff['hourly_rate'] * 8.0
    cursor.execute("""
    UPDATE events
    SET staff_hired = staff_hired + 1, escrow_total = escrow_total + ?
    WHERE id = ?
    """, (escrow_amount, event_id))

    tx_id = f"tx-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
    INSERT INTO escrow_txns (id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate, gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash)
    VALUES (?, ?, ?, ?, ?, 8, ?, ?, ?, ?, 'ESCROW_LOCKED', ?, ?)
    """, (
        tx_id,
        event_id,
        staff_id,
        staff['name'],
        staff['role'],
        staff['hourly_rate'],
        escrow_amount,
        escrow_amount * 0.05,
        escrow_amount * 0.95,
        datetime.now().isoformat(),
        f"0x{uuid.uuid4().hex[:12]}..."
    ))
    add_notification(cursor, event_id, "Staff hired", f"{staff['name']} was hired for {staff['role']}.", "shift")

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Successfully hired {staff['name']}. ₹{escrow_amount:,.2f} locked in escrow.",
        "locked_escrow": escrow_amount
    }
