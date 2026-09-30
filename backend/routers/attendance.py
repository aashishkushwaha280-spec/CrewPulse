from fastapi import APIRouter, HTTPException
from database import add_notification, get_db_connection
from models import CheckInRequest, CheckOutRequest, ShiftBreakRequest
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/attendance", tags=["Turnstile & Attendance"])


def _session_payload(row):
    if not row:
        return None

    session = dict(row)
    now = datetime.now()
    started_at = datetime.fromisoformat(session['check_in_at'])
    break_seconds = int(session['break_seconds'] or 0)
    if session['status'] == 'ON_BREAK' and session['break_started_at']:
        break_seconds += max(0, int((now - datetime.fromisoformat(session['break_started_at'])).total_seconds()))

    if session['status'] == 'CHECKED_OUT' and session['hours_logged'] is not None:
        elapsed_seconds = int(session['hours_logged'] * 3600)
    else:
        elapsed_seconds = max(0, int((now - started_at).total_seconds()) - break_seconds)

    session['break_seconds'] = break_seconds
    session['elapsed_seconds'] = elapsed_seconds
    return session


@router.get("/session")
def get_shift_session(staff_id: str, event_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM shift_sessions WHERE staff_id = ? AND event_id = ? ORDER BY id DESC LIMIT 1",
            (staff_id, event_id),
        )
        return _session_payload(cursor.fetchone())
    finally:
        conn.close()


@router.post("/break")
def update_shift_break(req: ShiftBreakRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM shift_sessions WHERE staff_id = ? AND event_id = ? AND status IN ('CHECKED_IN', 'ON_BREAK') ORDER BY id DESC LIMIT 1",
            (req.staff_id, req.event_id),
        )
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="No active shift session found.")

        now = datetime.now()
        if req.action == 'START':
            if session['status'] != 'CHECKED_IN':
                raise HTTPException(status_code=409, detail="Shift is already on break.")
            cursor.execute(
                "UPDATE shift_sessions SET status = 'ON_BREAK', break_started_at = ? WHERE id = ?",
                (now.isoformat(), session['id']),
            )
        else:
            if session['status'] != 'ON_BREAK':
                raise HTTPException(status_code=409, detail="Shift is not on break.")
            break_duration = max(0, int((now - datetime.fromisoformat(session['break_started_at'])).total_seconds()))
            cursor.execute(
                "UPDATE shift_sessions SET status = 'CHECKED_IN', break_seconds = break_seconds + ?, break_started_at = NULL WHERE id = ?",
                (break_duration, session['id']),
            )

        cursor.execute("SELECT name FROM staff WHERE id = ?", (req.staff_id,))
        staff = cursor.fetchone()
        staff_name = staff['name'] if staff else "Event staff"
        break_title = "Break started" if req.action == 'START' else "Shift resumed"
        break_message = f"{staff_name} started a break." if req.action == 'START' else f"{staff_name} resumed their shift."
        add_notification(cursor, req.event_id, break_title, break_message, "attendance")

        conn.commit()
        cursor.execute("SELECT * FROM shift_sessions WHERE id = ?", (session['id'],))
        return _session_payload(cursor.fetchone())
    finally:
        conn.close()


@router.get("/logs")
def get_attendance_logs(limit: int = 50):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM attendance_logs ORDER BY created_at DESC LIMIT ?", (limit,))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


@router.get("/overview")
def get_attendance_overview(event_id: str = "evt-101"):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, total_staff_needed, staff_hired, staff_on_site FROM events WHERE id = ?", (event_id,))
        event = cursor.fetchone()

        cursor.execute("SELECT id, current_status FROM staff WHERE assigned_event_id = ? OR current_status = 'ON_SITE'", (event_id,))
        assigned_staff = cursor.fetchall()

        checked_in = sum(1 for row in assigned_staff if row['current_status'] == 'ON_SITE')
        currently_working = checked_in
        absent = sum(1 for row in assigned_staff if row['current_status'] in ('AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT', 'UNAVAILABLE'))
        total_needed = int((event['total_staff_needed'] if event else 0) or max(1, len(assigned_staff)))
        event_progress = round((float(event['staff_hired'] if event else currently_working) / total_needed) * 100, 1) if total_needed else 0.0

        cursor.execute(
            "INSERT INTO event_operation_snapshots (event_id, checked_in, absent, currently_working, event_progress, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
            (event_id, checked_in, absent, currently_working, event_progress),
        )
        conn.commit()

        return {
            "event_id": event_id,
            "checked_in": checked_in,
            "absent": absent,
            "currently_working": currently_working,
            "event_progress": event_progress,
            "total_staff_needed": total_needed,
            "staff_on_site": int(event['staff_on_site'] if event else checked_in),
            "updated_at": datetime.now().isoformat(),
            "staff_status_breakdown": {
                "ON_SITE": checked_in,
                "AVAILABLE": sum(1 for row in assigned_staff if row['current_status'] == 'AVAILABLE'),
                "EN_ROUTE": sum(1 for row in assigned_staff if row['current_status'] == 'EN_ROUTE'),
                "CHECKED_OUT": sum(1 for row in assigned_staff if row['current_status'] == 'CHECKED_OUT'),
                "UNAVAILABLE": sum(1 for row in assigned_staff if row['current_status'] == 'UNAVAILABLE')
            }
        }
    finally:
        conn.close()


@router.post("/check-in")
def check_in(req: CheckInRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        if req.shift_id:
            cursor.execute("SELECT id FROM shifts WHERE id = ? AND event_id = ?", (req.shift_id, req.event_id))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Shift not found for this event.")

        cursor.execute("SELECT name, zone, current_status FROM staff WHERE id = ?", (req.staff_id,))
        staff = cursor.fetchone()
        staff_name = staff['name'] if staff else "Event Staff Member"
        zone = (staff['zone'] if staff and staff['zone'] else req.location) or "Gate 1 Turnstiles"
        now = datetime.now()
        time_str = now.strftime("%I:%M %p")

        cursor.execute(
            "SELECT * FROM shift_sessions WHERE staff_id = ? AND event_id = ? AND status IN ('CHECKED_IN', 'ON_BREAK') ORDER BY id DESC LIMIT 1",
            (req.staff_id, req.event_id),
        )
        existing_session = cursor.fetchone()
        if existing_session:
            active_session = _session_payload(existing_session)
            return {"success": True, "message": "Shift is already active.", "timestamp": time_str, "session": active_session}

        # Update staff status
        cursor.execute("""
        UPDATE staff
        SET current_status = 'ON_SITE', clocked_in_time = ?, zone = ?
        WHERE id = ?
        """, (time_str, zone, req.staff_id))

        # Update event staffOnSite
        if not staff or staff['current_status'] != 'ON_SITE':
            cursor.execute("""
            UPDATE events
            SET staff_on_site = staff_on_site + 1
            WHERE id = ?
            """, (req.event_id,))

        cursor.execute(
            "INSERT INTO shift_sessions (staff_id, event_id, shift_id, check_in_at, status) VALUES (?, ?, ?, ?, 'CHECKED_IN')",
            (req.staff_id, req.event_id, req.shift_id, now.isoformat()),
        )
        session_id = cursor.lastrowid

        # Log turnstile event
        log_id = f"att-{str(uuid.uuid4())[:8]}"
        cursor.execute("""
        INSERT INTO attendance_logs (id, staff_id, event_id, staff_name, type, timestamp, method, location)
        VALUES (?, ?, ?, ?, 'CHECK_IN', ?, ?, ?)
        """, (log_id, req.staff_id, req.event_id, staff_name, time_str, req.method, zone))
        add_notification(cursor, req.event_id, "Staff checked in", f"{staff_name} marked attendance at {zone}.", "attendance")

        conn.commit()
        cursor.execute("SELECT * FROM shift_sessions WHERE id = ?", (session_id,))
        active_session = _session_payload(cursor.fetchone())

        return {
            "success": True,
            "message": f"Verified: {staff_name} clocked into {zone}.",
            "timestamp": time_str,
            "session": active_session
        }
    finally:
        conn.close()


@router.post("/check-out")
def check_out(req: CheckOutRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT name, hourly_rate, role FROM staff WHERE id = ?", (req.staff_id,))
        staff = cursor.fetchone()
        staff_name = staff['name'] if staff else "Event Staff Member"
        staff_role = (staff['role'] if staff and staff['role'] else None) or "Event Specialist"
        rate = float(staff['hourly_rate']) if staff and staff['hourly_rate'] else 750.0
        now = datetime.now()
        time_str = now.strftime("%I:%M %p")

        cursor.execute(
            "SELECT * FROM shift_sessions WHERE staff_id = ? AND event_id = ? AND status IN ('CHECKED_IN', 'ON_BREAK') ORDER BY id DESC LIMIT 1",
            (req.staff_id, req.event_id),
        )
        active_session = cursor.fetchone()
        session_payload = None
        hours_logged = float(req.hours_logged or 8.0)

        if active_session:
            session_data = _session_payload(active_session)
            if session_data and session_data.get('elapsed_seconds'):
                hours_logged = max(0.01, round(session_data['elapsed_seconds'] / 3600.0, 4))
            cursor.execute(
                "UPDATE shift_sessions SET status = 'CHECKED_OUT', check_out_at = ?, break_seconds = ?, break_started_at = NULL, hours_logged = ? WHERE id = ?",
                (now.isoformat(), session_data.get('break_seconds', 0), hours_logged, active_session['id']),
            )

        # Update staff status
        cursor.execute("""
        UPDATE staff
        SET current_status = 'CHECKED_OUT'
        WHERE id = ?
        """, (req.staff_id,))

        # Decrement event on-site count
        cursor.execute("""
        UPDATE events
        SET staff_on_site = MAX(0, staff_on_site - 1)
        WHERE id = ?
        """, (req.event_id,))

        # Calculate financial amounts BEFORE building notification & txn
        gross = round(rate * hours_logged, 2)
        platform_fee = round(gross * 0.05, 2)
        net_payout = round(gross - platform_fee, 2)

        # Log departure in attendance logs
        log_id = f"att-{str(uuid.uuid4())[:8]}"
        cursor.execute("""
        INSERT INTO attendance_logs (id, staff_id, event_id, staff_name, type, timestamp, method, location)
        VALUES (?, ?, ?, ?, 'CHECK_OUT', ?, ?, ?)
        """, (log_id, req.staff_id, req.event_id, staff_name, time_str, req.method, req.location))
        
        add_notification(
            cursor, 
            req.event_id, 
            "Staff checked out", 
            f"{staff_name} completed their shift. ₹{net_payout:,.2f} queued for payout.", 
            "attendance"
        )

        # Queue Escrow Disbursement Record
        tx_id = f"tx-{str(uuid.uuid4())[:8]}"
        cursor.execute("""
        INSERT INTO escrow_txns (id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate, gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ESCROW_LOCKED', datetime('now'), ?)
        """, (
            tx_id,
            req.event_id,
            req.staff_id,
            staff_name,
            staff_role,
            hours_logged,
            rate,
            gross,
            platform_fee,
            net_payout,
            f"0x{uuid.uuid4().hex[:12]}..."
        ))

        # Credit staff user balance
        cursor.execute("""
        UPDATE users
        SET wallet_balance = wallet_balance + ?,
            lifetime_earnings = lifetime_earnings + ?
        WHERE name = ? OR id = ?
        """, (net_payout, net_payout, staff_name, req.staff_id))

        conn.commit()

        if active_session:
            cursor.execute("SELECT * FROM shift_sessions WHERE id = ?", (active_session['id'],))
            session_payload = _session_payload(cursor.fetchone())
        else:
            session_payload = {
                "id": None,
                "staff_id": req.staff_id,
                "event_id": req.event_id,
                "shift_id": None,
                "check_in_at": now.isoformat(),
                "check_out_at": now.isoformat(),
                "status": "CHECKED_OUT",
                "hours_logged": hours_logged,
                "break_seconds": 0,
                "elapsed_seconds": int(hours_logged * 3600)
            }

        return {
            "success": True,
            "message": f"Check-out confirmed for {staff_name}. ₹{net_payout:,.2f} net payout queued for settlement.",
            "escrow_tx_id": tx_id,
            "hours_logged": hours_logged,
            "gross_amount": gross,
            "net_payout": net_payout,
            "session": session_payload
        }
    finally:
        conn.close()
