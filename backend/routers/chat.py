from fastapi import APIRouter, HTTPException, Query

from database import add_notification, get_db_connection
from models import CreateChatMessageRequest

router = APIRouter(prefix="/api/chat", tags=["Event Chat"])


@router.get("/{event_id}")
def list_messages(
    event_id: str,
    after_id: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM events WHERE id = ?", (event_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found.")

    if after_id:
        cursor.execute(
            "SELECT * FROM chat_messages WHERE event_id = ? AND id > ? ORDER BY id ASC LIMIT ?",
            (event_id, after_id, limit),
        )
        messages = [dict(row) for row in cursor.fetchall()]
    else:
        cursor.execute(
            "SELECT * FROM chat_messages WHERE event_id = ? ORDER BY id DESC LIMIT ?",
            (event_id, limit),
        )
        messages = [dict(row) for row in reversed(cursor.fetchall())]

    conn.close()
    return messages


@router.post("/{event_id}")
def create_message(event_id: str, req: CreateChatMessageRequest):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM events WHERE id = ?", (event_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Event not found.")

    cursor.execute(
        """
        INSERT INTO chat_messages (event_id, sender_id, sender_name, sender_role, message)
        VALUES (?, ?, ?, ?, ?)
        """,
        (event_id, req.sender_id, req.sender_name.strip(), req.sender_role, message),
    )
    message_id = cursor.lastrowid
    preview = message if len(message) <= 120 else f"{message[:117]}..."
    add_notification(cursor, event_id, "New event chat message", f"{req.sender_name.strip()}: {preview}", "chat")
    conn.commit()

    cursor.execute("SELECT * FROM chat_messages WHERE id = ?", (message_id,))
    saved_message = dict(cursor.fetchone())
    conn.close()
    return saved_message