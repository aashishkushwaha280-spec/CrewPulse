from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import uuid

from database import init_db
from seed_data import seed_database
from routers import auth, events, shifts, staff, attendance, payments, escrow, wallet, chat, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed defaults on startup
    init_db()
    seed_database()
    print("CrewPulse SQLite Database initialized & seeded successfully.")
    yield

app = FastAPI(
    title="CrewPulse — Backend API",
    description="Enterprise API engine for on-demand event staffing, geofenced workforce management, mock payment gateway, and automated escrow smart release.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend (Vite default is http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(events.router)
app.include_router(shifts.router)
app.include_router(staff.router)
app.include_router(attendance.router)
app.include_router(payments.router)
app.include_router(escrow.router)
app.include_router(wallet.router)
app.include_router(chat.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "CrewPulse Backend API",
        "version": "1.0.0",
        "docs_url": "http://localhost:8000/docs",
        "active_modules": [
            "Authentication & Role Management",
            "Event Operations & Headcount",
            "Shifts & On-Demand Gigs Feed",
            "Verified Talent Directory & Hiring",
            "Geofenced Turnstile & Attendance Logs",
            "Mock Payment Gateway (UPI / QR / Webhooks)",
            "Automated Escrow Smart Vault & Payouts"
        ]
    }

@app.post("/api/emergency/sos")
def emergency_sos(event_id: str = "evt-101", message: str = "Emergency help requested"):
    from database import add_notification, get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM events WHERE id = ?", (event_id,))
    event = cursor.fetchone()
    if not event:
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found.")
    add_notification(cursor, event_id, "Emergency SOS", message, "attendance")
    conn.commit()
    conn.close()
    return {"success": True, "message": f"SOS sent for {event['name']}."}


@app.post("/api/emergency/dispatch")
def emergency_dispatch(staff_id: str, event_id: str = "evt-101", replace_staff_id: str = ""):
    from database import add_notification, get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM staff WHERE id = ?", (staff_id,))
    replacement = cursor.fetchone()
    if not replacement:
        conn.close()
        raise HTTPException(status_code=404, detail="Replacement staff member not found.")
    if replacement['current_status'] not in ('AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT'):
        conn.close()
        raise HTTPException(status_code=409, detail="This staff member is working or on break and cannot be reassigned.")

    replaced_staff = None
    if replace_staff_id:
        cursor.execute("SELECT * FROM staff WHERE id = ? AND assigned_event_id = ?", (replace_staff_id, event_id))
        replaced_staff = cursor.fetchone()
        if not replaced_staff:
            conn.close()
            raise HTTPException(status_code=404, detail="Staff member to replace was not found for this event.")
        if replaced_staff['current_status'] not in ('AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT', 'UNAVAILABLE'):
            conn.close()
            raise HTTPException(status_code=409, detail="Only staff who have not arrived or have checked out can be replaced.")
        cursor.execute(
            "UPDATE staff SET assigned_event_id = NULL, current_status = 'UNAVAILABLE', zone = 'Replacement assigned' WHERE id = ?",
            (replace_staff_id,),
        )

    cursor.execute("""
    UPDATE staff
    SET assigned_event_id = ?, current_status = 'EN_ROUTE', zone = 'Emergency Replacement - On the way', clocked_in_time = NULL
    WHERE id = ?
    """, (event_id, staff_id))

    hourly_rate = float(replacement['hourly_rate'] or 0)
    escrow_amount = hourly_rate * 8
    cursor.execute("""
    UPDATE events
    SET staff_hired = CASE WHEN ? THEN staff_hired ELSE staff_hired + 1 END,
        escrow_total = escrow_total + ?
    WHERE id = ?
    """, (1 if replace_staff_id else 0, escrow_amount, event_id))

    tx_id = f"tx-{str(uuid.uuid4())[:8]}"
    cursor.execute("""
    INSERT INTO escrow_txns (id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate, gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash)
    VALUES (?, ?, ?, ?, ?, 8, ?, ?, ?, ?, 'ESCROW_LOCKED', ?, ?)
    """, (
        tx_id, event_id, staff_id, replacement['name'], replacement['role'], hourly_rate,
        escrow_amount, escrow_amount * 0.05, escrow_amount * 0.95,
        datetime.now().isoformat(), f"0x{uuid.uuid4().hex[:12]}..."
    ))
    title = "Emergency replacement assigned" if replace_staff_id else "Emergency staff hired"
    message = f"{replacement['name']} is on the way to replace {replaced_staff['name']}." if replaced_staff else f"{replacement['name']} is on the way to the event."
    add_notification(cursor, event_id, title, message, "attendance")

    conn.commit()

    cursor.execute("SELECT * FROM staff WHERE id = ?", (staff_id,))
    staff_member = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": f"{staff_member['name']} is on the way to the event.",
        "staff": staff_member,
        "replaced_staff_id": replace_staff_id or None,
        "locked_escrow": escrow_amount
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
