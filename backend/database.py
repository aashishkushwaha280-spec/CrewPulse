import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "crewpulse.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 30000;")
    except Exception:
        pass
    return conn


def add_notification(cursor, event_id, title, message, notification_type="info"):
    cursor.execute(
        "INSERT INTO notifications (event_id, title, message, type) VALUES (?, ?, ?, ?)",
        (event_id, title, message, notification_type),
    )

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        title TEXT,
        organization TEXT,
        phone TEXT,
        avatar TEXT,
        verified INTEGER DEFAULT 1,
        escrow_balance REAL DEFAULT 0,
        wallet_balance REAL DEFAULT 0,
        lifetime_earnings REAL DEFAULT 0,
        reliability_score INTEGER DEFAULT 95
    )
    """)

    # Events Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        venue TEXT NOT NULL,
        status TEXT NOT NULL,
        total_staff_needed INTEGER NOT NULL,
        staff_hired INTEGER NOT NULL,
        staff_on_site INTEGER NOT NULL,
        escrow_total REAL NOT NULL,
        shift_hours TEXT NOT NULL
    )
    """)

    # Shifts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        title TEXT NOT NULL,
        event_name TEXT NOT NULL,
        role TEXT NOT NULL,
        rate_per_hour REAL NOT NULL,
        duration_hours REAL NOT NULL,
        total_pay REAL NOT NULL,
        date TEXT NOT NULL,
        time_window TEXT NOT NULL,
        venue TEXT NOT NULL,
        dress_code TEXT,
        spots_left INTEGER NOT NULL,
        escrow_locked INTEGER DEFAULT 1,
        urgency TEXT DEFAULT 'HIGH',
        verified_required INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shift_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shift_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'APPLIED',
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (shift_id, staff_id)
    )
    """)

    # Staff / Talent Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        experience_years REAL,
        reliability_score INTEGER,
        rating REAL,
        hourly_rate REAL,
        avatar TEXT,
        verified INTEGER DEFAULT 1,
        current_status TEXT DEFAULT 'AVAILABLE',
        assigned_event_id TEXT,
        zone TEXT,
        clocked_in_time TEXT,
        phone TEXT,
        verification_code TEXT UNIQUE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wallet_accounts (
        staff_id TEXT PRIMARY KEY,
        balance REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        sender_staff_id TEXT,
        recipient_staff_id TEXT,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_wallet_transactions_sender ON wallet_transactions(sender_staff_id, created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_wallet_transactions_recipient ON wallet_transactions(recipient_staff_id, created_at)")
    staff_columns = {row['name'] for row in cursor.execute("PRAGMA table_info(staff)").fetchall()}
    if 'verification_code' not in staff_columns:
        cursor.execute("ALTER TABLE staff ADD COLUMN verification_code TEXT")

    # Escrow Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS escrow_txns (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        staff_id TEXT,
        staff_name TEXT NOT NULL,
        role TEXT NOT NULL,
        hours_logged REAL NOT NULL,
        hourly_rate REAL NOT NULL,
        gross_amount REAL NOT NULL,
        platform_fee REAL NOT NULL,
        net_payout REAL NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        escrow_tx_hash TEXT NOT NULL
    )
    """)

    # Attendance & Turnstile Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_logs (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        event_id TEXT,
        staff_name TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        method TEXT NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    attendance_columns = {row['name'] for row in cursor.execute("PRAGMA table_info(attendance_logs)").fetchall()}
    if 'event_id' not in attendance_columns:
        cursor.execute("ALTER TABLE attendance_logs ADD COLUMN event_id TEXT")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shift_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        shift_id TEXT,
        check_in_at TEXT NOT NULL,
        check_out_at TEXT,
        status TEXT NOT NULL,
        break_seconds INTEGER DEFAULT 0,
        break_started_at TEXT,
        hours_logged REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    session_columns = {row['name'] for row in cursor.execute("PRAGMA table_info(shift_sessions)").fetchall()}
    if 'shift_id' not in session_columns:
        cursor.execute("ALTER TABLE shift_sessions ADD COLUMN shift_id TEXT")
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_active_shift_session
    ON shift_sessions (staff_id, event_id)
    WHERE status IN ('CHECKED_IN', 'ON_BREAK')
    """)

    # Payment Orders & Webhook Log Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_orders (
        order_id TEXT PRIMARY KEY,
        txn_id TEXT,
        event_id TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT NOT NULL,
        payer_name TEXT,
        recipient_name TEXT,
        recipient_upi TEXT,
        payment_method TEXT,
        invoice_no TEXT,
        webhook_received INTEGER DEFAULT 0,
        webhook_payload TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    payment_columns = {row['name'] for row in cursor.execute("PRAGMA table_info(payment_orders)").fetchall()}
    if 'event_id' not in payment_columns:
        cursor.execute("ALTER TABLE payment_orders ADD COLUMN event_id TEXT")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_event_id ON chat_messages (event_id, id)")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at, id)")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS event_operation_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL,
        checked_in INTEGER DEFAULT 0,
        absent INTEGER DEFAULT 0,
        currently_working INTEGER DEFAULT 0,
        event_progress REAL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_event_operation_snapshots_event_id ON event_operation_snapshots(event_id, updated_at)")

    cursor.execute("SELECT COUNT(*) FROM notifications")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO notifications (event_id, title, message, type, created_at)
         SELECT COALESCE(attendance_logs.event_id, staff.assigned_event_id),
               CASE type WHEN 'CHECK_IN' THEN 'Staff checked in' ELSE 'Staff checked out' END,
               staff_name || CASE type WHEN 'CHECK_IN' THEN ' checked in at ' ELSE ' checked out from ' END || location,
               'attendance', COALESCE(created_at, CURRENT_TIMESTAMP)
         FROM attendance_logs
         LEFT JOIN staff ON staff.id = attendance_logs.staff_id
        UNION ALL
        SELECT event_id, 'Shift published', role || ' shift has ' || spots_left || ' open position(s).',
               'shift', COALESCE(created_at, CURRENT_TIMESTAMP)
        FROM shifts
        UNION ALL
        SELECT event_id,
               CASE status WHEN 'DISBURSED' THEN 'Escrow payout disbursed' WHEN 'PAID' THEN 'Escrow funded' ELSE 'Escrow locked' END,
               staff_name || ': ₹' || printf('%.2f', gross_amount),
               'escrow', COALESCE(timestamp, CURRENT_TIMESTAMP)
        FROM escrow_txns
        UNION ALL
        SELECT event_id,
               CASE status WHEN 'PAID' THEN 'Payment received' ELSE 'Payment order created' END,
               '₹' || printf('%.2f', amount) || ' payment from ' || COALESCE(payer_name, 'organizer'),
               'payment', COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
        FROM payment_orders
        UNION ALL
        SELECT event_id, 'New event chat message', sender_name || ': ' || substr(message, 1, 120),
               'chat', COALESCE(created_at, CURRENT_TIMESTAMP)
        FROM chat_messages
        """)

    cursor.execute("SELECT COUNT(*) FROM event_operation_snapshots")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO event_operation_snapshots (event_id, checked_in, absent, currently_working, event_progress, updated_at)
        VALUES
        ('evt-101', 29, 5, 29, 76.0, datetime('now')),
        ('evt-102', 0, 0, 0, 12.0, datetime('now')),
        ('evt-103', 0, 0, 0, 8.0, datetime('now'))
        """)

    conn.commit()
    conn.close()
