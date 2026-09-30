from fastapi import APIRouter

from database import get_db_connection

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def list_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT notifications.id, notifications.event_id, events.name AS event_name,
               notifications.title, notifications.message, notifications.type,
               notifications.created_at
        FROM notifications
        LEFT JOIN events ON events.id = notifications.event_id
        ORDER BY notifications.id DESC
        """
    )
    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notifications