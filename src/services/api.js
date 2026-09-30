const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEMO_USERS_STORAGE_KEY = 'crewpulse_demo_users';
const DEMO_ATTENDANCE_KEY = 'crewpulse_demo_attendance';
const DEMO_STAFF_OVERRIDES_KEY = 'crewpulse_demo_staff_overrides';
const DEMO_SHIFT_APPLICATIONS_KEY = 'crewpulse_demo_shift_applications';
const DEMO_STAFF_VERIFICATION_KEY = 'crewpulse_demo_staff_verification';
const DEMO_WALLET_KEY = 'crewpulse_demo_wallet';
const DEMO_PAYMENT_ORDERS_KEY = 'crewpulse_demo_payment_orders';
const DEMO_ESCROW_TRANSACTIONS_KEY = 'crewpulse_demo_escrow_transactions';
const DEMO_SHIFTS_KEY = 'crewpulse_demo_shifts';

const demoUsers = [
  {
    id: 'org-demo-1',
    name: 'Vikramaditya Roy',
    email: 'vikram@nexusevents.com',
    password: 'nexus123',
    role: 'ORGANIZER',
    title: 'Managing Director',
    organization: 'Nexus Event Tech Pvt Ltd',
    phone: '+91 98450 12345',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=260&q=80',
    verified: 1,
    escrow_balance: 184000,
    wallet_balance: 0,
    lifetime_earnings: 0,
    reliability_score: 98
  },
  {
    id: 'stf-demo-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@crewpulse.in',
    password: 'crew123',
    role: 'STAFF',
    title: 'Lead Guest Protocol & VIP Liaison',
    organization: 'Independent Event Professional',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
    verified: 1,
    escrow_balance: 0,
    wallet_balance: 14250,
    lifetime_earnings: 88500,
    reliability_score: 98
  }
];

function normalizeDemoUser(user) {
  return {
    ...user,
    role: String(user.role || 'ORGANIZER').toUpperCase(),
    verified: Boolean(user.verified ?? true),
    escrow_balance: user.escrow_balance ?? user.escrowBalance ?? 0,
    wallet_balance: user.wallet_balance ?? user.walletBalance ?? 0,
    lifetime_earnings: user.lifetime_earnings ?? user.lifetimeEarnings ?? 0,
    reliability_score: user.reliability_score ?? user.reliabilityScore ?? 99,
    avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80'
  };
}

function getDemoUsers() {
  try {
    const stored = localStorage.getItem(DEMO_USERS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(demoUsers));
      return [...demoUsers];
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? parsed : [...demoUsers];
  } catch {
    return [...demoUsers];
  }
}

function persistDemoUsers(users) {
  try {
    localStorage.setItem(DEMO_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore storage issues in restricted browsers
  }
}

function getDemoWallet() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_WALLET_KEY) || '{"balances":{"stf-001":14250},"transactions":[]}');
  } catch {
    return { balances: { 'stf-001': 14250 }, transactions: [] };
  }
}

function persistDemoWallet(wallet) {
  try {
    localStorage.setItem(DEMO_WALLET_KEY, JSON.stringify(wallet));
  } catch {
    // Demo transfers stay usable for the current screen if browser storage is unavailable.
  }
}

function getDemoAttendance() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_ATTENDANCE_KEY) || '{"sessions":{},"logs":[]}');
  } catch {
    return { sessions: {}, logs: [] };
  }
}

function persistDemoAttendance(data) {
  try {
    localStorage.setItem(DEMO_ATTENDANCE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage issues in restricted browsers
  }
}

function fallbackAttendance(endpoint, options = {}) {
  if (typeof window === 'undefined') return null;

  const data = getDemoAttendance();
  const body = options.body ? JSON.parse(options.body) : {};
  const params = new URLSearchParams(endpoint.split('?')[1] || '');
  const staffId = body.staff_id || params.get('staff_id');
  const eventId = body.event_id || params.get('event_id');
  const sessionKey = `${staffId}:${eventId}`;
  const now = new Date();

  if (endpoint.startsWith('/api/attendance/session')) {
    const session = data.sessions[sessionKey];
    if (!session) return {};
    const breakSeconds = (session.break_seconds || 0) + (session.status === 'ON_BREAK' && session.break_started_at
      ? Math.max(0, Math.floor((now.getTime() - new Date(session.break_started_at).getTime()) / 1000))
      : 0);
    return {
      ...session,
      break_seconds: breakSeconds,
      elapsed_seconds: session.status === 'CHECKED_OUT'
        ? session.elapsed_seconds
        : Math.max(0, Math.floor((now.getTime() - new Date(session.check_in_at).getTime()) / 1000) - breakSeconds)
    };
  }
  if (endpoint.startsWith('/api/attendance/logs')) {
    return data.logs;
  }
  if (endpoint === '/api/attendance/check-in') {
    const existing = data.sessions[sessionKey];
    if (existing && ['CHECKED_IN', 'ON_BREAK'].includes(existing.status)) {
      return { success: true, message: 'Already checked in.', timestamp: existing.check_in_at, session: existing };
    }
    const session = {
      staff_id: staffId,
      event_id: eventId,
      shift_id: body.shift_id || null,
      check_in_at: now.toISOString(),
      check_out_at: null,
      status: 'CHECKED_IN',
      elapsed_seconds: 0,
      break_seconds: 0
    };
    data.sessions[sessionKey] = session;
    data.logs.unshift({
      id: `demo-${Date.now()}`,
      staff_id: staffId,
      event_id: eventId,
      staff_name: 'Event staff',
      type: 'CHECK_IN',
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: body.method || 'Face check',
      location: body.location || 'Event venue'
    });
    persistDemoAttendance(data);
    return { success: true, message: 'Checked in.', timestamp: session.check_in_at, session };
  }
  if (endpoint === '/api/attendance/break') {
    const session = data.sessions[sessionKey];
    if (!session || !['CHECKED_IN', 'ON_BREAK'].includes(session.status)) {
      throw new Error('No active shift found. Check in first.');
    }
    if (body.action === 'START' && session.status === 'CHECKED_IN') {
      session.status = 'ON_BREAK';
      session.break_started_at = now.toISOString();
    } else if (body.action === 'RESUME' && session.status === 'ON_BREAK') {
      session.break_seconds = (session.break_seconds || 0) + Math.max(0, Math.floor((now.getTime() - new Date(session.break_started_at).getTime()) / 1000));
      session.break_started_at = null;
      session.status = 'CHECKED_IN';
    } else {
      throw new Error(body.action === 'START' ? 'You are already on break.' : 'You are not on a break.');
    }
    data.sessions[sessionKey] = session;
    persistDemoAttendance(data);
    const breakSeconds = (session.break_seconds || 0) + (session.status === 'ON_BREAK' && session.break_started_at
      ? Math.max(0, Math.floor((now.getTime() - new Date(session.break_started_at).getTime()) / 1000))
      : 0);
    return {
      ...session,
      break_seconds: breakSeconds,
      elapsed_seconds: Math.max(0, Math.floor((now.getTime() - new Date(session.check_in_at).getTime()) / 1000) - breakSeconds)
    };
  }
  if (endpoint === '/api/attendance/check-out') {
    const session = data.sessions[sessionKey] || {
      staff_id: staffId,
      event_id: eventId,
      check_in_at: now.toISOString(),
      break_seconds: 0
    };
    session.check_out_at = now.toISOString();
    session.status = 'CHECKED_OUT';
    const activeBreakSeconds = session.break_started_at
      ? Math.max(0, Math.floor((now.getTime() - new Date(session.break_started_at).getTime()) / 1000))
      : 0;
    session.elapsed_seconds = Math.max(0, Math.round((now.getTime() - new Date(session.check_in_at).getTime()) / 1000) - (session.break_seconds || 0) - activeBreakSeconds);
    session.hours_logged = body.hours_logged || session.elapsed_seconds / 3600;
    session.break_seconds = (session.break_seconds || 0) + activeBreakSeconds;
    session.break_started_at = null;
    data.sessions[sessionKey] = session;
    data.logs.unshift({
      id: `demo-${Date.now()}`,
      staff_id: staffId,
      event_id: eventId,
      staff_name: 'Event staff',
      type: 'CHECK_OUT',
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      method: body.method || 'Face check',
      location: body.location || 'Event venue'
    });
    persistDemoAttendance(data);
    return { success: true, net_payout: 0, session };
  }
  return null;
}

function fallbackAuth(endpoint, options = {}) {
  if (typeof window === 'undefined') return null;

  try {
    const body = options.body ? JSON.parse(options.body) : {};

    const verificationPassMatch = endpoint.match(/^\/api\/staff\/([^/]+)\/verification-pass$/);
    if (verificationPassMatch) {
      const staffId = decodeURIComponent(verificationPassMatch[1]);
      const codes = JSON.parse(localStorage.getItem(DEMO_STAFF_VERIFICATION_KEY) || '{}');
      const code = codes[staffId] || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      codes[staffId] = code;
      localStorage.setItem(DEMO_STAFF_VERIFICATION_KEY, JSON.stringify(codes));
      return { staff_id: staffId, code, verified: true };
    }

    const verifyStaffMatch = endpoint.match(/^\/api\/staff\/([^/]+)\/verify\?/);
    if (verifyStaffMatch) {
      const staffId = decodeURIComponent(verifyStaffMatch[1]);
      const code = new URLSearchParams(endpoint.split('?')[1] || '').get('code');
      const codes = JSON.parse(localStorage.getItem(DEMO_STAFF_VERIFICATION_KEY) || '{}');
      const valid = Boolean(code && codes[staffId] && code === codes[staffId]);
      return valid
        ? { valid: true, status: 'VERIFIED', message: 'CrewPulse staff credential verified.', staff: { id: staffId } }
        : { valid: false, status: 'INVALID', message: 'This CrewPulse credential is not valid.' };
    }

    if (endpoint === '/api/auth/login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const requestedRole = String(body.role || '').trim().toUpperCase();
      const users = getDemoUsers();
      const matchedUser = users.find((user) => {
        const userEmail = String(user.email || '').trim().toLowerCase();
        const matchesEmail = userEmail === email;
        const matchesPassword = String(user.password || '') === password;
        const matchesRole = !requestedRole || String(user.role || '').toUpperCase() === requestedRole;
        return matchesEmail && matchesPassword && matchesRole;
      });

      if (!matchedUser) {
        throw new Error('Invalid credentials. For demo: vikram@nexusevents.com / nexus123 or aarav.sharma@crewpulse.in / crew123');
      }

      return normalizeDemoUser(matchedUser);
    }

    if (endpoint === '/api/auth/register') {
      const users = getDemoUsers();
      const email = String(body.email || '').trim().toLowerCase();
      const exists = users.some((user) => String(user.email || '').trim().toLowerCase() === email);
      if (exists) {
        throw new Error('User with this email already exists.');
      }

      const newUser = {
        id: body.id || `usr-${Date.now()}`,
        name: body.name || 'New CrewPulse User',
        email,
        password: body.password || '',
        role: String(body.role || 'ORGANIZER').toUpperCase(),
        title: body.title || 'Event Operations Lead',
        organization: body.organization || 'CrewPulse',
        phone: body.phone || '',
        avatar: body.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
        verified: true,
        escrow_balance: String(body.role || 'ORGANIZER').toUpperCase() === 'ORGANIZER' ? 100000 : 0,
        wallet_balance: String(body.role || 'ORGANIZER').toUpperCase() === 'STAFF' ? 5000 : 0,
        lifetime_earnings: String(body.role || 'ORGANIZER').toUpperCase() === 'STAFF' ? 5000 : 0,
        reliability_score: 99
      };

      const nextUsers = [...users, newUser];
      persistDemoUsers(nextUsers);
      return normalizeDemoUser(newUser);
    }

    if (endpoint === '/api/auth/users') {
      return getDemoUsers().map(normalizeDemoUser);
    }

    if (endpoint === '/api/notifications') {
      return [];
    }

    if (endpoint.startsWith('/api/shifts/create')) {
      const eventId = body.event_id || 'evt-101';
      const demoEvents = {
        'evt-101': { name: 'Bangalore Tech Summit 2026', date: 'Today, Sep 29, 2026', venue: 'Bangalore Palace Grounds, Bengaluru' },
        'evt-102': { name: 'Sunburn Arena EDM Festival', date: 'Nov 02-04, 2026', venue: 'Bhartiya City, North Bengaluru' },
        'evt-103': { name: 'Global FinTech Conclave', date: 'Oct 28-29, 2026', venue: 'KTPO Exhibition Center, Whitefield' }
      };
      const event = demoEvents[eventId] || { name: 'CrewPulse Event', date: 'Upcoming', venue: 'Event venue' };
      const shiftId = `demo-shift-${Date.now()}`;
      const shift = {
        id: shiftId,
        event_id: eventId,
        title: `${body.role} (${event.name})`,
        event_name: event.name,
        role: body.role,
        rate_per_hour: Number(body.hourly_rate),
        duration_hours: Number(body.duration_hours),
        total_pay: Number(body.duration_hours) * Number(body.hourly_rate),
        date: event.date,
        time_window: '09:00 AM - 05:00 PM',
        venue: event.venue,
        dress_code: body.dress_code || 'Dark Formal Attire',
        spots_left: Number(body.headcount),
        escrow_locked: 1,
        urgency: 'HIGH',
        verified_required: body.require_govt_id || body.require_police_clearance ? 1 : 0,
        created_at: new Date().toISOString()
      };
      const savedShifts = JSON.parse(localStorage.getItem(DEMO_SHIFTS_KEY) || '[]');
      savedShifts.unshift(shift);
      localStorage.setItem(DEMO_SHIFTS_KEY, JSON.stringify(savedShifts));
      return {
        success: true,
        shift,
        calculated_escrow: shift.total_pay * shift.spots_left,
        escrow_tx_id: `demo-shift-escrow-${Date.now()}`
      };
    }

    if (endpoint.startsWith('/api/shifts?') || endpoint === '/api/shifts') {
      return JSON.parse(localStorage.getItem(DEMO_SHIFTS_KEY) || '[]');
    }

    if (endpoint.startsWith('/api/emergency/sos')) {
      return { success: true, message: 'Emergency SOS sent.' };
    }

    if (endpoint.startsWith('/api/emergency/dispatch')) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const candidateId = params.get('staff_id');
      const replaceStaffId = params.get('replace_staff_id');
      const eventId = params.get('event_id');
      if (candidateId && candidateId === replaceStaffId) {
        throw new Error('Choose a different person as the replacement.');
      }
      try {
        const overrides = JSON.parse(localStorage.getItem(DEMO_STAFF_OVERRIDES_KEY) || '{}');
        if (candidateId) {
          overrides[candidateId] = {
            assignedEventId: eventId,
            currentStatus: 'EN_ROUTE',
            zone: 'Emergency Replacement - On the way'
          };
        }
        if (replaceStaffId) {
          overrides[replaceStaffId] = { ...overrides[replaceStaffId], assignedEventId: null, currentStatus: 'UNAVAILABLE', zone: 'Replacement assigned' };
        }
        localStorage.setItem(DEMO_STAFF_OVERRIDES_KEY, JSON.stringify(overrides));
      } catch {
        // The in-memory roster can still update if browser storage is blocked.
      }
      return {
        success: true,
        message: 'Replacement assigned.',
        staff_id: candidateId,
        replace_staff_id: replaceStaffId
      };
    }

    if (endpoint === '/api/payments/create-order') {
      const orderId = `DEMO-${Date.now()}`;
      const txnId = `DEMO-TXN-${Date.now()}`;
      const invoiceNo = `CP-INV-${Date.now()}`;
      const upiParams = new URLSearchParams({
        pa: body.recipient_upi || 'crewpulse.escrow@icici',
        pn: body.recipient_name || 'CrewPulse Escrow',
        am: Number(body.amount || 0).toFixed(2),
        cu: body.currency || 'INR',
        tn: body.title || 'Escrow payment'
      });
      const order = {
        success: true,
        order_id: orderId,
        txn_id: txnId,
        invoice_no: invoiceNo,
        amount: Number(body.amount || 0),
        currency: body.currency || 'INR',
        status: 'PENDING',
        upi_uri: `upi://pay?${upiParams.toString()}`
      };
      const orders = JSON.parse(localStorage.getItem(DEMO_PAYMENT_ORDERS_KEY) || '[]');
      orders.unshift({
        ...order,
        event_id: body.event_id || 'evt-101',
        title: body.title || 'Escrow payment',
        payer_name: body.payer_name || '',
        recipient_name: body.recipient_name || '',
        recipient_upi: body.recipient_upi || '',
        payment_method: 'UPI_QR',
        created_at: new Date().toISOString()
      });
      localStorage.setItem(DEMO_PAYMENT_ORDERS_KEY, JSON.stringify(orders));
      return order;
    }

    if (endpoint === '/api/payments/simulate-success') {
      const orders = JSON.parse(localStorage.getItem(DEMO_PAYMENT_ORDERS_KEY) || '[]');
      const order = orders.find(item => item.order_id === body.order_id);
      if (!order) throw new Error('Payment order was not found.');
      order.status = 'PAID';
      order.payment_method = body.payment_method || 'UPI_QR';
      order.updated_at = new Date().toISOString();
      localStorage.setItem(DEMO_PAYMENT_ORDERS_KEY, JSON.stringify(orders));
      return {
        success: true,
        message: 'Demo payment confirmed.',
        order
      };
    }

    if (endpoint.startsWith('/api/payments/orders')) {
      const eventId = new URLSearchParams(endpoint.split('?')[1] || '').get('event_id');
      const orders = JSON.parse(localStorage.getItem(DEMO_PAYMENT_ORDERS_KEY) || '[]');
      return eventId ? orders.filter(order => order.event_id === eventId) : orders;
    }

    if (endpoint.startsWith('/api/escrow/transactions')) {
      const eventId = new URLSearchParams(endpoint.split('?')[1] || '').get('event_id');
      const transactions = JSON.parse(localStorage.getItem(DEMO_ESCROW_TRANSACTIONS_KEY) || '[]');
      return eventId ? transactions.filter(transaction => transaction.event_id === eventId) : transactions;
    }

    if (endpoint.startsWith('/api/escrow/pre-fund')) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const amount = Number(params.get('amount') || 0);
      const eventId = params.get('event_id') || 'evt-101';
      const txId = `demo-fund-${Date.now()}`;
      const transaction = {
        id: txId,
        event_id: eventId,
        staff_id: 'vault-deposit',
        staff_name: 'Escrow Reserve Pre-Funding',
        role: 'Vault Liquidity',
        hours_logged: 0,
        hourly_rate: 0,
        gross_amount: amount,
        platform_fee: 0,
        net_payout: amount,
        status: 'PAID',
        timestamp: new Date().toISOString(),
        escrow_tx_hash: `demo-${Date.now()}`
      };
      const transactions = JSON.parse(localStorage.getItem(DEMO_ESCROW_TRANSACTIONS_KEY) || '[]');
      transactions.unshift(transaction);
      localStorage.setItem(DEMO_ESCROW_TRANSACTIONS_KEY, JSON.stringify(transactions));
      return {
        success: true,
        tx_id: txId,
        transaction
      };
    }

    if (endpoint === '/api/escrow/disburse') {
      const transactions = JSON.parse(localStorage.getItem(DEMO_ESCROW_TRANSACTIONS_KEY) || '[]');
      const transaction = transactions.find(item => item.id === body.txn_id);
      if (transaction) {
        transaction.status = 'DISBURSED';
        transaction.timestamp = new Date().toISOString();
        localStorage.setItem(DEMO_ESCROW_TRANSACTIONS_KEY, JSON.stringify(transactions));
      }
      return { success: true, message: 'Demo payout approved.', txn_id: body.txn_id, status: 'DISBURSED' };
    }

    if (endpoint === '/api/escrow/payouts') {
      const grossAmount = Number(body.hours_logged) * Number(body.hourly_rate);
      const platformFee = Math.round(grossAmount * 0.05 * 100) / 100;
      const transaction = {
        id: `demo-salary-${Date.now()}`,
        event_id: body.event_id,
        staff_id: body.staff_id,
        staff_name: body.staff_name || 'Event staff',
        role: body.role || 'Event staff',
        hours_logged: Number(body.hours_logged),
        hourly_rate: Number(body.hourly_rate),
        gross_amount: grossAmount,
        platform_fee: platformFee,
        net_payout: Math.round((grossAmount - platformFee) * 100) / 100,
        status: 'ESCROW_LOCKED',
        timestamp: new Date().toISOString(),
        escrow_tx_hash: `demo-${Date.now()}`
      };
      const transactions = JSON.parse(localStorage.getItem(DEMO_ESCROW_TRANSACTIONS_KEY) || '[]');
      transactions.unshift(transaction);
      localStorage.setItem(DEMO_ESCROW_TRANSACTIONS_KEY, JSON.stringify(transactions));
      return { success: true, transaction };
    }

    if (endpoint.startsWith('/api/shifts/applications')) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const staffId = params.get('staff_id');
      const applications = JSON.parse(localStorage.getItem(DEMO_SHIFT_APPLICATIONS_KEY) || '[]');
      return applications.filter(application => application.staff_id === staffId);
    }

    const applyShiftMatch = endpoint.match(/^\/api\/shifts\/([^/]+)\/apply$/);
    if (applyShiftMatch) {
      const shiftId = decodeURIComponent(applyShiftMatch[1]);
      const applications = JSON.parse(localStorage.getItem(DEMO_SHIFT_APPLICATIONS_KEY) || '[]');
      const existing = applications.find(application => application.shift_id === shiftId && application.staff_id === body.staff_id);
      if (existing) return { success: true, already_applied: true, message: 'You already applied for this shift.' };
      const application = {
        id: `demo-app-${Date.now()}`,
        shift_id: shiftId,
        staff_id: body.staff_id,
        status: 'APPLIED',
        applied_at: new Date().toISOString()
      };
      applications.push(application);
      localStorage.setItem(DEMO_SHIFT_APPLICATIONS_KEY, JSON.stringify(applications));
      return { success: true, already_applied: false, application, message: 'Your application was sent.' };
    }

    if (endpoint.startsWith('/api/attendance/overview')) {
      const eventId = new URLSearchParams(endpoint.split('?')[1] || '').get('event_id') || 'evt-101';
      const status = {
        event_id: eventId,
        checked_in: 29,
        absent: 5,
        currently_working: 29,
        event_progress: 76,
        total_staff_needed: 38,
        staff_on_site: 29,
        updated_at: new Date().toISOString(),
        staff_status_breakdown: {
          ON_SITE: 29,
          AVAILABLE: 3,
          EN_ROUTE: 2,
          CHECKED_OUT: 4
        }
      };
      return status;
    }

    if (endpoint.startsWith('/api/wallet/summary')) {
      const staffId = new URLSearchParams(endpoint.split('?')[1] || '').get('staff_id');
      const wallet = getDemoWallet();
      return {
        staff_id: staffId,
        balance: Number(wallet.balances[staffId] ?? 0),
        transactions: wallet.transactions.filter(txn => txn.sender_staff_id === staffId || txn.recipient_staff_id === staffId)
      };
    }

    if (endpoint === '/api/wallet/demo-funds') {
      const wallet = getDemoWallet();
      const staffId = body.staff_id;
      const amount = Number(body.amount);
      if (!staffId || !Number.isFinite(amount) || amount <= 0 || amount > 50000) {
        throw new Error('Add an amount between ₹1 and ₹50,000.');
      }
      wallet.balances[staffId] = Number(wallet.balances[staffId] || 0) + amount;
      wallet.transactions.unshift({
        id: `demo-topup-${Date.now()}`,
        sender_staff_id: null,
        recipient_staff_id: staffId,
        transaction_type: 'DEMO_TOP_UP',
        amount,
        note: 'Hackathon demo funds',
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      });
      persistDemoWallet(wallet);
      return { success: true, balance: wallet.balances[staffId], added: amount };
    }

    if (endpoint === '/api/wallet/transfer') {
      const wallet = getDemoWallet();
      const { sender_staff_id: senderId, recipient_staff_id: recipientId } = body;
      const amount = Number(body.amount);
      const senderBalance = Number(wallet.balances[senderId] || 0);
      if (!senderId || !recipientId || senderId === recipientId) throw new Error('Choose a different staff member to receive the transfer.');
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a transfer amount greater than zero.');
      if (senderBalance < amount) throw new Error('Not enough demo funds in this wallet.');
      wallet.balances[senderId] = Math.round((senderBalance - amount) * 100) / 100;
      wallet.balances[recipientId] = Math.round((Number(wallet.balances[recipientId] || 0) + amount) * 100) / 100;
      const transaction = {
        id: `demo-transfer-${Date.now()}`,
        sender_staff_id: senderId,
        recipient_staff_id: recipientId,
        transaction_type: 'STAFF_TRANSFER',
        amount,
        note: body.note || '',
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      };
      wallet.transactions.unshift(transaction);
      persistDemoWallet(wallet);
      return { success: true, sender_balance: wallet.balances[senderId], recipient_balance: wallet.balances[recipientId], transaction };
    }

    if (endpoint === '/api/wallet/demo-withdrawal') {
      const wallet = getDemoWallet();
      const staffId = body.staff_id;
      const amount = Number(body.amount);
      const balance = Number(wallet.balances[staffId] || 0);
      if (!staffId || !Number.isFinite(amount) || amount <= 0) throw new Error('Enter a valid withdrawal amount.');
      if (balance < amount) throw new Error('Not enough demo funds in this wallet.');
      wallet.balances[staffId] = Math.round((balance - amount) * 100) / 100;
      const transaction = {
        id: `demo-withdrawal-${Date.now()}`,
        sender_staff_id: staffId,
        recipient_staff_id: null,
        transaction_type: 'DEMO_WITHDRAWAL',
        amount,
        note: `Simulated withdrawal to ${body.destination || 'bank account'}`,
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      };
      wallet.transactions.unshift(transaction);
      persistDemoWallet(wallet);
      return { success: true, balance: wallet.balances[staffId], withdrawn: amount, transaction };
    }
  } catch (error) {
    console.warn('[CrewPulse API] Demo fallback:', error.message);
    throw error;
  }

  return null;
}

export async function fetchApi(endpoint, options = {}) {
  let serverResponded = false;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    serverResponded = true;
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (!serverResponded) {
      const attendanceFallback = fallbackAttendance(endpoint, options);
      if (attendanceFallback !== null) return attendanceFallback;
    }
    const fallback = fallbackAuth(endpoint, options);
    if (fallback !== null) {
      return fallback;
    }
    console.warn(`[CrewPulse API] ${endpoint} fallback:`, err.message);
    throw err;
  }
}

export const api = {
  // Authentication
  login: (email, password, role) =>
    fetchApi('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
  register: (userData) =>
    fetchApi('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getUsers: () => fetchApi('/api/auth/users'),
  getNotifications: () => fetchApi('/api/notifications'),
  getAttendanceOverview: (eventId = 'evt-101') => fetchApi(`/api/attendance/overview?event_id=${encodeURIComponent(eventId)}`),

  // Events
  getEvents: () => fetchApi('/api/events'),
  getEvent: (id) => fetchApi(`/api/events/${id}`),

  // Shifts
  getShifts: (eventId) => fetchApi(`/api/shifts${eventId ? `?event_id=${eventId}` : ''}`),
  getShiftApplications: (staffId) => fetchApi(`/api/shifts/applications?staff_id=${encodeURIComponent(staffId)}`),
  createShift: (shiftData) =>
    fetchApi('/api/shifts/create', { method: 'POST', body: JSON.stringify(shiftData) }),
  applyShift: (shiftId, staffId, notes = '') =>
    fetchApi(`/api/shifts/${shiftId}/apply`, { method: 'POST', body: JSON.stringify({ staff_id: staffId, notes }) }),

  // Talent & Staff
  getStaffVerificationPass: (staffId) => fetchApi(`/api/staff/${encodeURIComponent(staffId)}/verification-pass`),
  verifyStaffCredential: (staffId, code) =>
    fetchApi(`/api/staff/${encodeURIComponent(staffId)}/verify?code=${encodeURIComponent(code)}`),
  getStaff: (eventId, status) => {
    const params = new URLSearchParams();
    if (eventId) params.append('event_id', eventId);
    if (status) params.append('status', status);
    const q = params.toString();
    return fetchApi(`/api/staff${q ? `?${q}` : ''}`);
  },
  hireStaff: (staffId, eventId) =>
    fetchApi(`/api/staff/${staffId}/hire?event_id=${encodeURIComponent(eventId)}`, { method: 'POST' }),

  // Attendance & Turnstile
  getAttendanceLogs: (limit = 50) => fetchApi(`/api/attendance/logs?limit=${limit}`),
  getShiftSession: (staffId, eventId) =>
    fetchApi(`/api/attendance/session?staff_id=${encodeURIComponent(staffId)}&event_id=${encodeURIComponent(eventId)}`),
  setShiftBreak: (staffId, eventId, action) =>
    fetchApi('/api/attendance/break', { method: 'POST', body: JSON.stringify({ staff_id: staffId, event_id: eventId, action }) }),
  checkIn: (staffId, eventId, method, location, shiftId) =>
    fetchApi('/api/attendance/check-in', { method: 'POST', body: JSON.stringify({ staff_id: staffId, event_id: eventId, method, location, shift_id: shiftId }) }),
  checkOut: (staffId, eventId, hoursLogged, rating, method = 'Staff Completed Shift Check-Out', location = 'Venue Exit') =>
    fetchApi('/api/attendance/check-out', { method: 'POST', body: JSON.stringify({ staff_id: staffId, event_id: eventId, hours_logged: hoursLogged, supervisor_rating: rating, method, location }) }),

  // Mock Payment Gateway & Webhooks
  createPaymentOrder: (orderData) =>
    fetchApi('/api/payments/create-order', { method: 'POST', body: JSON.stringify(orderData) }),
  simulatePaymentSuccess: (orderId, paymentMethod = 'UPI_QR') =>
    fetchApi('/api/payments/simulate-success', { method: 'POST', body: JSON.stringify({ order_id: orderId, payment_method: paymentMethod }) }),
  getPaymentOrders: (eventId) => fetchApi(`/api/payments/orders${eventId ? `?event_id=${encodeURIComponent(eventId)}` : ''}`),

  // Demo wallet for hackathon testing only
  getWalletSummary: (staffId) => fetchApi(`/api/wallet/summary?staff_id=${encodeURIComponent(staffId)}`),
  addDemoWalletFunds: (staffId, amount) => fetchApi('/api/wallet/demo-funds', {
    method: 'POST', body: JSON.stringify({ staff_id: staffId, amount })
  }),
  transferWalletFunds: (senderStaffId, recipientStaffId, amount, note = '') => fetchApi('/api/wallet/transfer', {
    method: 'POST', body: JSON.stringify({ sender_staff_id: senderStaffId, recipient_staff_id: recipientStaffId, amount, note })
  }),
  withdrawDemoWalletFunds: (staffId, amount, destination) => fetchApi('/api/wallet/demo-withdrawal', {
    method: 'POST', body: JSON.stringify({ staff_id: staffId, amount, destination })
  }),

  // Event Chat
  getChatMessages: (eventId, afterId = 0) =>
    fetchApi(`/api/chat/${encodeURIComponent(eventId)}?after_id=${afterId}`),
  sendChatMessage: (eventId, messageData) =>
    fetchApi(`/api/chat/${encodeURIComponent(eventId)}`, { method: 'POST', body: JSON.stringify(messageData) }),

  // Escrow Vault
  getEscrowTransactions: (eventId) =>
    fetchApi(`/api/escrow/transactions${eventId ? `?event_id=${eventId}` : ''}`),
  disburseEscrow: (txnId) =>
    fetchApi('/api/escrow/disburse', { method: 'POST', body: JSON.stringify({ txn_id: txnId }) }),
  createStaffPayout: (payoutData) =>
    fetchApi('/api/escrow/payouts', { method: 'POST', body: JSON.stringify(payoutData) }),
  preFundEscrow: (eventId, amount) =>
    fetchApi(`/api/escrow/pre-fund?event_id=${encodeURIComponent(eventId)}&amount=${amount}`, { method: 'POST' }),

  // Emergency Panic Hot-Swap
  emergencySOS: (eventId = 'evt-101', message = 'Emergency help requested') =>
    fetchApi(`/api/emergency/sos?event_id=${encodeURIComponent(eventId)}&message=${encodeURIComponent(message)}`, { method: 'POST' }),
  emergencyDispatch: (staffId, eventId = 'evt-101', replaceStaffId = '') =>
    fetchApi(`/api/emergency/dispatch?staff_id=${encodeURIComponent(staffId)}&event_id=${encodeURIComponent(eventId)}&replace_staff_id=${encodeURIComponent(replaceStaffId)}`, { method: 'POST' })
};
