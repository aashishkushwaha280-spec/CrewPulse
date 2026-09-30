from fastapi import APIRouter, HTTPException, status
from database import get_db_connection
from models import LoginRequest, RegisterRequest
import uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login")
def login(req: LoginRequest):
    email = (req.email or "").strip().lower()
    password = (req.password or "").strip()
    role = (req.role or "").strip().upper()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE LOWER(email) = ? AND password = ?",
        (email, password),
    )
    matching_users = cursor.fetchall()
    conn.close()

    user = None
    if matching_users:
        if role:
            for candidate in matching_users:
                if (candidate["role"] or "").upper() == role:
                    user = candidate
                    break
        if not user:
            user = matching_users[0]

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. For demo: vikram@nexusevents.com / nexus123 or aarav.sharma@crewpulse.in / crew123"
        )
    return dict(user)

@router.post("/register")
def register(req: RegisterRequest):
    normalized_email = (req.email or "").strip().lower()
    normalized_name = (req.name or "").strip()
    normalized_role = (req.role or "").strip().upper()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (normalized_email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    user_id = f"usr-{str(uuid.uuid4())[:8]}"
    default_avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80"

    cursor.execute("""
    INSERT INTO users (id, name, email, password, role, title, organization, phone, avatar, verified, escrow_balance, wallet_balance, lifetime_earnings, reliability_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        normalized_name,
        normalized_email,
        req.password,
        normalized_role,
        req.title,
        req.organization,
        req.phone,
        default_avatar,
        1,
        100000 if normalized_role == 'ORGANIZER' else 0,
        5000 if normalized_role == 'STAFF' else 0,
        5000 if normalized_role == 'STAFF' else 0,
        99
    ))
    conn.commit()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    new_user = cursor.fetchone()
    conn.close()
    return dict(new_user)

@router.get("/users")
def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, role, title, organization, phone, avatar, verified, escrow_balance, wallet_balance, lifetime_earnings, reliability_score FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return users
