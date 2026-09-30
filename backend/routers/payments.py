from fastapi import APIRouter, HTTPException, BackgroundTasks
from database import add_notification, get_db_connection
from models import CreatePaymentOrderRequest, SimulatePaymentSuccessRequest, PaymentWebhookPayload
import uuid
import json
import urllib.parse
from datetime import datetime

router = APIRouter(prefix="/api/payments", tags=["Mock Payment Gateway & Webhook Engine"])

@router.post("/create-order")
def create_payment_order(req: CreatePaymentOrderRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    order_id = f"ORDER-{str(uuid.uuid4())[:8].upper()}"
    txn_id = f"TXN-UPI-{str(uuid.uuid4())[:8].upper()}"
    invoice_no = f"CP-INV-{str(uuid.uuid4())[:6].upper()}"

    # Build UPI QR payment URI
    params = {
        "pa": req.recipient_upi,
        "pn": req.recipient_name,
        "am": f"{req.amount:.2f}",
        "cu": req.currency,
        "tn": req.title
    }
    upi_uri = f"upi://pay?{urllib.parse.urlencode(params)}"

    cursor.execute("""
    INSERT INTO payment_orders (order_id, txn_id, event_id, amount, currency, status, payer_name, recipient_name, recipient_upi, payment_method, invoice_no)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, 'UPI_QR', ?)
    """, (
        order_id,
        txn_id,
        req.event_id,
        req.amount,
        req.currency,
        req.payer_name,
        req.recipient_name,
        req.recipient_upi,
        invoice_no
    ))
    add_notification(cursor, req.event_id, "Payment order created", f"₹{req.amount:,.2f} payment order created for {req.title}.", "payment")
    conn.commit()
    conn.close()

    return {
        "success": True,
        "order_id": order_id,
        "txn_id": txn_id,
        "invoice_no": invoice_no,
        "amount": req.amount,
        "currency": req.currency,
        "status": "PENDING",
        "upi_uri": upi_uri,
        "expires_in_seconds": 300,
        "simulation_endpoints": {
            "simulate_payment_success": "/api/payments/simulate-success",
            "trigger_external_webhook": "/api/payments/webhook"
        }
    }

@router.post("/simulate-success")
def simulate_payment_success(req: SimulatePaymentSuccessRequest, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM payment_orders WHERE order_id = ?", (req.order_id,))
    order = cursor.fetchone()
    if not order:
        conn.close()
        raise HTTPException(status_code=404, detail="Payment order not found.")

    if order['status'] == 'PAID':
        conn.close()
        return {"success": True, "message": "Order is already fulfilled.", "order": dict(order)}

    # Mark as PAID
    cursor.execute("""
    UPDATE payment_orders
    SET status = 'PAID', payment_method = ?, updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
    """, (req.payment_method, req.order_id))
    add_notification(cursor, order['event_id'], "Payment received", f"₹{order['amount']:,.2f} payment received from {order['payer_name'] or 'organizer'}.", "payment")

    conn.commit()

    # Trigger automatic webhook simulation asynchronously
    background_tasks.add_task(trigger_simulated_webhook, req.order_id, order['amount'])

    cursor.execute("SELECT * FROM payment_orders WHERE order_id = ?", (req.order_id,))
    updated_order = cursor.fetchone()
    conn.close()

    return {
        "success": True,
        "message": f"Simulated payment success for Order {req.order_id}. Webhook callback queued.",
        "order": dict(updated_order)
    }

def trigger_simulated_webhook(order_id: str, amount: float):
    """Simulates the payment gateway calling our backend webhook asynchronously."""
    conn = get_db_connection()
    cursor = conn.cursor()

    webhook_data = {
        "event": "payment.captured",
        "order_id": order_id,
        "payment_id": f"pay_{uuid.uuid4().hex[:14]}",
        "amount": amount,
        "currency": "INR",
        "signature": f"sig_mock_{uuid.uuid4().hex[:16]}",
        "timestamp": datetime.now().isoformat()
    }

    cursor.execute("""
    UPDATE payment_orders
    SET webhook_received = 1, webhook_payload = ?
    WHERE order_id = ?
    """, (json.dumps(webhook_data), order_id))

    conn.commit()
    conn.close()

@router.post("/webhook")
def receive_payment_webhook(payload: PaymentWebhookPayload):
    """External payment gateway webhook endpoint (e.g. Razorpay, ICICI Escrow)."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM payment_orders WHERE order_id = ?", (payload.order_id,))
    order = cursor.fetchone()
    if not order:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Order {payload.order_id} not found in gateway records.")

    # Update order status
    cursor.execute("""
    UPDATE payment_orders
    SET status = 'PAID', webhook_received = 1, webhook_payload = ?, updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ?
    """, (json.dumps(payload.model_dump()), payload.order_id))
    add_notification(cursor, order['event_id'], "Payment webhook confirmed", f"Payment for ₹{order['amount']:,.2f} was confirmed by the gateway.", "payment")

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "received_event": payload.event,
        "order_id": payload.order_id,
        "message": "Payment webhook verified and escrow vault synchronized successfully."
    }

@router.get("/orders")
def get_payment_orders(event_id: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if event_id:
        cursor.execute("SELECT * FROM payment_orders WHERE event_id = ? ORDER BY created_at DESC", (event_id,))
    else:
        cursor.execute("SELECT * FROM payment_orders ORDER BY created_at DESC")
    orders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return orders
