from fastapi import APIRouter, HTTPException
from database import add_notification, get_db_connection
from models import CreateShiftRequest, ApplyShiftRequest
import uuid

router = APIRouter(prefix="/api/shifts", tags=["Shifts & Gigs"])

@router.get("")
def list_shifts(event_id: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if event_id:
        cursor.execute("SELECT * FROM shifts WHERE event_id = ? ORDER BY created_at DESC", (event_id,))
    else:
        cursor.execute("SELECT * FROM shifts ORDER BY created_at DESC")
    shifts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return shifts

@router.post("/create")
def create_shift(req: CreateShiftRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name, date, venue FROM events WHERE id = ?", (req.event_id,))
    evt = cursor.fetchone()
    if not evt:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found.")

    shift_id = f"sft-{str(uuid.uuid4())[:8]}"
    total_pay = req.duration_hours * req.hourly_rate
    calculated_escrow = total_pay * req.headcount

    cursor.execute("""
    INSERT INTO shifts (id, event_id, title, event_name, role, rate_per_hour, duration_hours, total_pay, date, time_window, venue, dress_code, spots_left, escrow_locked, urgency, verified_required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        shift_id,
        req.event_id,
        f"{req.role} ({evt['name']})",
        evt['name'],
        req.role,
        req.hourly_rate,
        req.duration_hours,
        total_pay,
        evt['date'],
        "08:00 AM - 05:00 PM",
        evt['venue'],
        req.dress_code,
        req.headcount,
        1,
        "HIGH",
        1 if (req.require_govt_id or req.require_police_clearance) else 0
    ))

    # Update event headcount & escrow
    cursor.execute("""
    UPDATE events
    SET total_staff_needed = total_staff_needed + ?, escrow_total = escrow_total + ?
    WHERE id = ?
    """, (req.headcount, calculated_escrow, req.event_id))

    # Record Escrow Tx
    tx_id = f"tx-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
    INSERT INTO escrow_txns (id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate, gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    """, (
        tx_id,
        req.event_id,
        "open-requisition",
        f"{req.headcount}x {req.role}",
        req.role,
        req.duration_hours,
        req.hourly_rate,
        calculated_escrow,
        calculated_escrow * 0.05,
        calculated_escrow * 0.95,
        "ESCROW_LOCKED",
        f"0x{uuid.uuid4().hex[:12]}..."
    ))
    add_notification(cursor, req.event_id, "Shift published", f"{req.headcount} {req.role} position(s) opened for {evt['name']}.", "shift")

    conn.commit()

    cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
    new_shift = cursor.fetchone()
    conn.close()

    return {
        "success": True,
        "shift": dict(new_shift),
        "calculated_escrow": calculated_escrow,
        "escrow_tx_id": tx_id
    }

@router.get("/applications")
def get_shift_applications(staff_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM shift_applications WHERE staff_id = ? ORDER BY applied_at DESC",
            (staff_id,),
        )
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


@router.post("/{shift_id}/apply")
def apply_shift(shift_id: str, req: ApplyShiftRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,))
        shift = cursor.fetchone()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found.")

        cursor.execute(
            "SELECT * FROM shift_applications WHERE shift_id = ? AND staff_id = ?",
            (shift_id, req.staff_id),
        )
        existing_application = cursor.fetchone()
        if existing_application:
            return {
                "success": True,
                "already_applied": True,
                "message": "You already applied for this shift.",
                "application": dict(existing_application),
            }

        cursor.execute(
            "UPDATE shifts SET spots_left = spots_left - 1 WHERE id = ? AND spots_left > 0",
            (shift_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=400, detail="This shift is already fully staffed.")

        cursor.execute(
            "INSERT INTO shift_applications (shift_id, staff_id, notes) VALUES (?, ?, ?)",
            (shift_id, req.staff_id, req.notes or ""),
        )
        application_id = cursor.lastrowid
        cursor.execute("SELECT name FROM staff WHERE id = ?", (req.staff_id,))
        staff = cursor.fetchone()
        applicant_name = staff['name'] if staff else "A staff member"
        add_notification(
            cursor,
            shift['event_id'],
            "Shift application received",
            f"{applicant_name} applied for {shift['title']}.",
            "shift",
        )
        conn.commit()
        cursor.execute("SELECT * FROM shift_applications WHERE id = ?", (application_id,))
        application = dict(cursor.fetchone())
        return {
            "success": True,
            "already_applied": False,
            "message": f"Application sent for '{shift['title']}'.",
            "application": application,
        }
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
