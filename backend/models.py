from pydantic import BaseModel, Field
from typing import Literal, Optional, List

# Auth Schemas
class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "ORGANIZER"

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    title: Optional[str] = "Event Coordinator"
    organization: Optional[str] = "Event Agency"
    phone: Optional[str] = "+91 98000 00000"

# Shift Schemas
class CreateShiftRequest(BaseModel):
    event_id: str
    role: str
    headcount: int = Field(gt=0)
    duration_hours: float = Field(gt=0)
    hourly_rate: float = Field(gt=0)
    dress_code: Optional[str] = "Dark Formal Attire"
    require_govt_id: Optional[bool] = True
    require_police_clearance: Optional[bool] = True

class ApplyShiftRequest(BaseModel):
    staff_id: str
    notes: Optional[str] = ""

class CreateChatMessageRequest(BaseModel):
    sender_id: str
    sender_name: str = Field(min_length=1, max_length=120)
    sender_role: Literal["ORGANIZER", "STAFF"]
    message: str = Field(min_length=1, max_length=2000)

# Attendance Schemas
class CheckInRequest(BaseModel):
    staff_id: str
    event_id: str
    shift_id: Optional[str] = None
    method: Optional[str] = "Geofenced Mobile App Check-In"
    location: Optional[str] = "Gate 1 Turnstiles"

class CheckOutRequest(BaseModel):
    staff_id: str
    event_id: str
    method: Optional[str] = "Staff Completed Shift Check-Out"
    location: Optional[str] = "Venue Exit"
    hours_logged: Optional[float] = 8.0
    supervisor_rating: Optional[int] = 5

class ShiftBreakRequest(BaseModel):
    staff_id: str
    event_id: str
    action: Literal["START", "RESUME"]

# Payment & Webhook Simulation Schemas
class CreatePaymentOrderRequest(BaseModel):
    amount: float = Field(gt=0)
    currency: Optional[str] = "INR"
    title: str = "Escrow Pre-Funding"
    recipient_name: Optional[str] = "CrewPulse Escrow Trust (ICICI Bank)"
    recipient_upi: Optional[str] = "crewpulse.escrow@icici"
    payer_name: Optional[str] = "Nexus Event Tech Pvt Ltd"
    event_id: Optional[str] = "evt-101"
    role: Optional[str] = "Event Operations"

class SimulatePaymentSuccessRequest(BaseModel):
    order_id: str
    payment_method: Optional[str] = "UPI_QR" # 'UPI_QR' | 'CARD' | 'NETBANKING'

class PaymentWebhookPayload(BaseModel):
    event: str = "payment.captured"
    order_id: str
    payment_id: str
    amount: float
    currency: str = "INR"
    signature: str
    status: str = "SUCCESS"

# Escrow Disbursement Schema
class DisburseEscrowRequest(BaseModel):
    txn_id: str
    admin_approval_token: Optional[str] = "ESCROW-DISBURSE-APPROVED-2026"

class CreateStaffPayoutRequest(BaseModel):
    event_id: str
    staff_id: str
    hours_logged: float = Field(gt=0)
    hourly_rate: float = Field(gt=0)

class DemoWalletFundRequest(BaseModel):
    staff_id: str
    amount: float = Field(gt=0, le=50000)

class DemoWalletWithdrawalRequest(BaseModel):
    staff_id: str
    amount: float = Field(gt=0)
    destination: str

class WalletTransferRequest(BaseModel):
    sender_staff_id: str
    recipient_staff_id: str
    amount: float = Field(gt=0)
    note: Optional[str] = ""
