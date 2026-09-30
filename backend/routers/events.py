from fastapi import APIRouter, HTTPException
from database import get_db_connection

router = APIRouter(prefix="/api/events", tags=["Events & Operations"])

@router.get("")
def list_events():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events")
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return events

@router.get("/{event_id}")
def get_event(event_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cursor.fetchone()
    conn.close()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return dict(event)
