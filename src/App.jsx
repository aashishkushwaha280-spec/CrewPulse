import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import OrganizerCommandCenter from './components/OrganizerCommandCenter';
import OrganizerTalentMarket from './components/OrganizerTalentMarket';
import OrganizerEscrowVault from './components/OrganizerEscrowVault';
import OrganizerCreateShiftModal from './components/OrganizerCreateShiftModal';
import OrganizerGateTerminalModal from './components/OrganizerGateTerminalModal';
import EmergencyHotSwapModal from './components/EmergencyHotSwapModal';
import StaffShiftClock from './components/StaffShiftClock';
import StaffGigsFeed from './components/StaffGigsFeed';
import StaffPassport from './components/StaffPassport';
import StaffWallet from './components/StaffWallet';
import PaymentHistory from './components/PaymentHistory';
import PaymentSystemModal from './components/PaymentSystemModal';
import EventChatModal from './components/EventChatModal';

import { 
  INITIAL_EVENTS, 
  INITIAL_STAFF, 
  INITIAL_SHIFTS_FEED, 
  INITIAL_ESCROW_TXNS, 
  USER_STAFF_PROFILE 
} from './data/mockData';

import { 
  Activity, 
  Users, 
  DollarSign,
  Clock, 
  Briefcase, 
  CreditCard, 
  Award,
  ReceiptText
} from 'lucide-react';
import { useToast } from './context/ToastContext';
import { api } from './services/api';

const toEvent = (row) => {
  const fallback = INITIAL_EVENTS.find(event => event.id === row.id) || {};
  return {
    ...fallback,
    ...row,
    totalStaffNeeded: row.total_staff_needed ?? row.totalStaffNeeded ?? fallback.totalStaffNeeded ?? 0,
    staffHired: row.staff_hired ?? row.staffHired ?? fallback.staffHired ?? 0,
    staffOnSite: row.staff_on_site ?? row.staffOnSite ?? fallback.staffOnSite ?? 0,
    escrowTotal: row.escrow_total ?? row.escrowTotal ?? fallback.escrowTotal ?? 0,
    shiftHours: row.shift_hours ?? row.shiftHours ?? fallback.shiftHours ?? '',
    status: row.status === 'LIVE' ? 'LIVE_ACTIVE' : row.status === 'UPCOMING' ? 'UPCOMING_PREP' : row.status
  };
};

const toStaff = (row) => {
  const fallback = INITIAL_STAFF.find(staff => staff.id === row.id) || {};
  return {
    ...fallback,
    ...row,
    experienceYears: row.experience_years ?? row.experienceYears ?? fallback.experienceYears ?? 0,
    reliabilityScore: row.reliability_score ?? row.reliabilityScore ?? fallback.reliabilityScore ?? 0,
    hourlyRate: row.hourly_rate ?? row.hourlyRate ?? fallback.hourlyRate ?? 0,
    currentStatus: row.current_status ?? row.currentStatus ?? fallback.currentStatus ?? 'AVAILABLE',
    assignedEventId: row.assigned_event_id ?? row.assignedEventId ?? fallback.assignedEventId ?? null,
    clockedInTime: row.clocked_in_time ?? row.clockedInTime ?? fallback.clockedInTime ?? null,
    verifiedGovtId: Boolean(row.verified ?? fallback.verifiedGovtId),
    avatar: row.avatar || fallback.avatar
  };
};

const toShift = (row) => ({
  ...row,
  eventId: row.event_id ?? row.eventId,
  eventName: row.event_name ?? row.eventName,
  ratePerHour: row.rate_per_hour ?? row.ratePerHour,
  durationHours: row.duration_hours ?? row.durationHours,
  totalPay: row.total_pay ?? row.totalPay,
  timeWindow: row.time_window ?? row.timeWindow,
  dressCode: row.dress_code ?? row.dressCode,
  spotsLeft: row.spots_left ?? row.spotsLeft,
  escrowLocked: Boolean(row.escrow_locked ?? row.escrowLocked),
  verifiedRequired: Boolean(row.verified_required ?? row.verifiedRequired)
});

const toEscrowTxn = (row) => ({
  ...row,
  eventId: row.event_id ?? row.eventId,
  staffId: row.staff_id ?? row.staffId,
  staffName: row.staff_name ?? row.staffName,
  hoursLogged: row.hours_logged ?? row.hoursLogged,
  hourlyRate: row.hourly_rate ?? row.hourlyRate,
  grossAmount: row.gross_amount ?? row.grossAmount,
  platformFee: row.platform_fee ?? row.platformFee,
  netPayout: row.net_payout ?? row.netPayout,
  escrowTxHash: row.escrow_tx_hash ?? row.escrowTxHash
});

const toAttendanceLog = (row) => ({
  ...row,
  staffId: row.staff_id ?? row.staffId
});

const getInitialStaff = () => {
  try {
    const overrides = JSON.parse(localStorage.getItem('crewpulse_demo_staff_overrides') || '{}');
    return INITIAL_STAFF.map(staff => ({ ...staff, ...overrides[staff.id] }));
  } catch {
    return INITIAL_STAFF;
  }
};

const getInitialShifts = () => {
  try {
    const savedShifts = JSON.parse(localStorage.getItem('crewpulse_demo_shifts') || '[]').map(toShift);
    const savedIds = new Set(savedShifts.map(shift => shift.id));
    return [...savedShifts, ...INITIAL_SHIFTS_FEED.filter(shift => !savedIds.has(shift.id))];
  } catch {
    return INITIAL_SHIFTS_FEED;
  }
};

export default function App() {
  const { showToast } = useToast();
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('crewpulse_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [showAuthScreen, setShowAuthScreen] = useState(() => {
    return !localStorage.getItem('crewpulse_user');
  });

  // Global & Persona Navigation State
  const [activeRole, setActiveRole] = useState(currentUser?.role || 'ORGANIZER');
  const [organizerTab, setOrganizerTab] = useState('COMMAND_CENTER');
  const [staffTab, setStaffTab] = useState('PUNCH_CLOCK');
  
  // Data State
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState('evt-101');
  const [staffList, setStaffList] = useState(getInitialStaff);
  const [shiftsFeed, setShiftsFeed] = useState(getInitialShifts);
  const [escrowTxns, setEscrowTxns] = useState(INITIAL_ESCROW_TXNS);
  const [userProfile, setUserProfile] = useState(USER_STAFF_PROFILE);

  // Real-time Attendance & Turnstile Logs
  const [attendanceLogs, setAttendanceLogs] = useState([
    { id: 'att-1', staffId: 'stf-005', staffName: 'Ananya Swaminathan', type: 'CHECK_IN', timestamp: '07:05 AM', method: 'Turnstile QR Scan', location: 'Registration Foyer' },
    { id: 'att-2', staffId: 'stf-002', staffName: "Rohan 'Ronnie' Verma", type: 'CHECK_IN', timestamp: '07:14 AM', method: 'Geofenced Biometric', location: 'Gate 1 Turnstiles' },
    { id: 'att-3', staffId: 'stf-007', staffName: 'Sneha Nair', type: 'CHECK_IN', timestamp: '07:18 AM', method: 'Geofenced Biometric', location: 'Medical Bay Central' },
    { id: 'att-4', staffId: 'stf-001', staffName: 'Aarav Sharma', type: 'CHECK_IN', timestamp: '07:22 AM', method: 'Turnstile QR Scan', location: 'VIP Lounge North' },
    { id: 'att-5', staffId: 'stf-003', staffName: 'Pooja Hegde-Deshmukh', type: 'CHECK_IN', timestamp: '07:28 AM', method: 'Geofenced Biometric', location: 'Main Stage Audio Booth' }
  ]);
  const [attendanceOverview, setAttendanceOverview] = useState({
    checked_in: 0,
    absent: 0,
    currently_working: 0,
    event_progress: 0,
    total_staff_needed: 0,
    staff_on_site: 0,
    staff_status_breakdown: { ON_SITE: 0, AVAILABLE: 0, EN_ROUTE: 0, CHECKED_OUT: 0 }
  });

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  const refreshDashboard = useCallback(async () => {
    const [eventRows, staffRows, shiftRows, txnRows, logRows, userRows, overview] = await Promise.all([
      api.getEvents(),
      api.getStaff(),
      api.getShifts(),
      api.getEscrowTransactions(selectedEventId),
      api.getAttendanceLogs(),
      currentUser?.role === 'STAFF' ? api.getUsers() : Promise.resolve([]),
      api.getAttendanceOverview(selectedEventId || 'evt-101')
    ]);
    if (eventRows.length) setEvents(eventRows.map(toEvent));
    setStaffList(staffRows.map(toStaff));
    if (currentUser?.role === 'STAFF') {
      const staffRecord = staffRows.find(staff => staff.name === currentUser.name);
      if (staffRecord) {
        setUserProfile(previous => {
          const hourlyRate = staffRecord.hourly_rate ?? previous.activeShift.hourlyRate;
          const durationHours = previous.activeShift.expectedPay / previous.activeShift.hourlyRate;
          const event = eventRows.find(row => row.id === staffRecord.assigned_event_id);
          return {
            ...previous,
            id: staffRecord.id,
            hourlyRate,
            activeShift: {
              ...previous.activeShift,
              eventName: event?.name || previous.activeShift.eventName,
              venue: event?.venue || previous.activeShift.venue,
              role: staffRecord.role || previous.activeShift.role,
              hourlyRate,
              expectedPay: hourlyRate * durationHours
            }
          };
        });
      }
    }
    setShiftsFeed(shiftRows.map(toShift));
    setEscrowTxns(txnRows.map(toEscrowTxn));
    setAttendanceLogs(logRows.map(toAttendanceLog));
    setAttendanceOverview({
      checked_in: overview?.checked_in ?? 0,
      absent: overview?.absent ?? 0,
      currently_working: overview?.currently_working ?? 0,
      event_progress: overview?.event_progress ?? 0,
      total_staff_needed: overview?.total_staff_needed ?? currentEvent?.totalStaffNeeded ?? 0,
      staff_on_site: overview?.staff_on_site ?? currentEvent?.staffOnSite ?? 0,
      staff_status_breakdown: overview?.staff_status_breakdown || { ON_SITE: 0, AVAILABLE: 0, EN_ROUTE: 0, CHECKED_OUT: 0 }
    });
    const profile = userRows.find(user => user.id === currentUser?.id || user.email === currentUser?.email);
    if (profile) {
      const updatedProfile = {
        walletBalance: profile.wallet_balance ?? 0,
        lifetimeEarnings: profile.lifetime_earnings ?? 0,
        reliabilityScore: profile.reliability_score ?? 0,
        verified: Boolean(profile.verified)
      };
      setCurrentUser(previous => {
        if (Object.entries(updatedProfile).every(([key, value]) => previous?.[key] === value)) return previous;
        return { ...previous, ...updatedProfile };
      });
      setUserProfile(previous => ({ ...previous, ...updatedProfile }));
    }
  }, [currentUser, selectedEventId, currentEvent]);

  useEffect(() => {
    refreshDashboard().catch(error => {
      console.warn('[CrewPulse] Database unavailable; showing local demo data:', error);
    });
  }, [refreshDashboard]);

  // Modals
  const [isCreateShiftModalOpen, setIsCreateShiftModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isGateTerminalOpen, setIsGateTerminalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const databaseShift = shiftsFeed.find(shift => shift.eventId === currentEvent?.id);
  const activeClockShift = databaseShift ? {
    ...userProfile.activeShift,
    id: databaseShift.id,
    eventName: databaseShift.eventName,
    role: databaseShift.role,
    venue: databaseShift.venue,
    shiftWindow: databaseShift.timeWindow,
    hourlyRate: databaseShift.ratePerHour,
    expectedPay: databaseShift.totalPay,
    dressCode: databaseShift.dressCode || userProfile.activeShift.dressCode
  } : userProfile.activeShift;

  // Auth Handlers
  const handleLoginSuccess = (user) => {
    const normalizedUser = {
      id: user.id || user.user_id || `usr-${Date.now()}`,
      name: user.name || 'CrewPulse User',
      role: (user.role || 'ORGANIZER').toUpperCase(),
      title: user.title || 'Event Operations Lead',
      organization: user.organization || 'CrewPulse',
      email: user.email || '',
      phone: user.phone || '',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
      verified: user.verified ?? true,
      escrowBalance: user.escrow_balance ?? user.escrowBalance ?? 0,
      walletBalance: user.wallet_balance ?? user.walletBalance ?? 0,
      reliabilityScore: user.reliability_score ?? user.reliabilityScore ?? 100,
      rating: user.rating ?? 4.9,
      lifetimeEarnings: user.lifetime_earnings ?? user.lifetimeEarnings ?? 0
    };

    setCurrentUser(normalizedUser);
    if (normalizedUser.role === 'STAFF') {
      setUserProfile(previous => ({
        ...previous,
        name: normalizedUser.name,
        email: normalizedUser.email,
        phone: normalizedUser.phone || previous.phone,
        title: normalizedUser.title || previous.title,
        avatar: normalizedUser.avatar || previous.avatar,
        walletBalance: normalizedUser.walletBalance ?? previous.walletBalance,
        lifetimeEarnings: normalizedUser.lifetimeEarnings ?? previous.lifetimeEarnings,
        reliabilityScore: normalizedUser.reliabilityScore ?? previous.reliabilityScore,
        verified: normalizedUser.verified ?? previous.verified
      }));
    }
    setShowAuthScreen(false);
    setActiveRole(normalizedUser.role);
    localStorage.setItem('crewpulse_user', JSON.stringify(normalizedUser));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAuthScreen(true);
    localStorage.removeItem('crewpulse_user');
  };

  // Check-In and Check-Out Handlers (Used by both Organizer & Staff)
  const resolveStaffId = (staffId) => {
    if (staffId === userProfile.id) {
      return staffList.find(staff => staff.name === currentUser?.name)?.id || staffId;
    }
    return staffId;
  };

  const handleStaffCheckIn = async (staffId, method = "Mobile Geofence", shiftId) => {
    try {
      const actualStaffId = resolveStaffId(staffId);
      const staff = staffList.find(member => member.id === actualStaffId);
      const result = await api.checkIn(actualStaffId, currentEvent.id, method, staff?.zone || 'Gate 1 Turnstiles', shiftId);
      if (result?.session) {
        setStaffList(previous => previous.map(member => member.id === actualStaffId
          ? { ...member, currentStatus: 'ON_SITE', assignedEventId: currentEvent.id, clockedInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : member));
      }
      refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
      return result;
    } catch (error) {
      showToast({ type: 'error', title: 'Could not check in', message: error.message === 'Failed to fetch' ? 'The attendance server is not available. Please try again later.' : error.message });
      return null;
    }
  };

  const handleStaffCheckOut = async (staffId, method = "Mobile Sign-Off", hoursLogged = 8, rating = 5) => {
    try {
      const actualStaffId = resolveStaffId(staffId);
      const staff = staffList.find(member => member.id === actualStaffId);
      const result = await api.checkOut(actualStaffId, currentEvent.id, hoursLogged, rating, method, staff?.zone || 'Venue Exit');
      if (result?.session) {
        setStaffList(previous => previous.map(member => member.id === actualStaffId
          ? { ...member, currentStatus: 'CHECKED_OUT', clockedOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : member));
      }
      refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
      return result;
    } catch (error) {
      showToast({ type: 'error', title: 'Could not check out', message: error.message === 'Failed to fetch' ? 'The attendance server is not available. Please try again later.' : error.message });
      return null;
    }
  };

  // Action Handlers
  const handleHireStaff = async (staff) => {
    try {
      await api.hireStaff(staff.id, currentEvent.id);
      await refreshDashboard();
      showToast({
        type: 'success',
        title: 'Talent Hired & Escrow Locked',
        message: `Successfully hired ${staff.name} for "${currentEvent.name}". ₹${(staff.hourlyRate * 8).toLocaleString('en-IN')} escrow locked.`
      });
    } catch (error) {
      showToast({ type: 'error', title: 'Hiring failed', message: error.message });
    }
  };

  const handleCreateShift = async (newShift, calculatedEscrow) => {
    try {
      const result = await api.createShift({
        event_id: currentEvent.id,
        role: newShift.role,
        headcount: newShift.spotsLeft,
        duration_hours: newShift.durationHours,
        hourly_rate: newShift.ratePerHour,
        dress_code: newShift.dressCode,
        require_govt_id: newShift.requireGovtId,
        require_police_clearance: newShift.requirePoliceClearance
      });
      if (!result?.success || !result.shift) throw new Error('The shift was not saved. Please try again.');
      setShiftsFeed(previous => [toShift(result.shift), ...previous.filter(shift => shift.id !== result.shift.id)]);
      const amount = result.calculated_escrow || calculatedEscrow;
      refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
      showToast({
        type: 'success',
        title: 'Shift Published & Escrow Allocated',
        message: `New shift published for "${newShift.role}". Escrow deposit of ₹${amount.toLocaleString('en-IN')} allocated.`
      });
      setPaymentData({
        title: `Escrow Pre-Funding: ${newShift.role}`,
        recipientName: 'CrewPulse Escrow Trust (ICICI Bank)',
        recipientUpi: 'crewpulse.escrow@icici',
        payerName: currentUser?.organization || 'Nexus Event Tech Pvt Ltd',
        amount,
        role: newShift.role,
        eventId: currentEvent.id,
        eventName: currentEvent.name,
        hoursLogged: newShift.durationHours,
        hourlyRate: newShift.ratePerHour
      });
      setIsPaymentModalOpen(true);
      return result;
    } catch (error) {
      showToast({ type: 'error', title: 'Shift creation failed', message: error.message });
      return null;
    }
  };

  const handleDisbursePayout = async (txnId) => {
    try {
      const result = await api.disburseEscrow(txnId);
      if (!result?.success) return null;
      setEscrowTxns(previous => previous.map(txn => txn.id === txnId
        ? { ...txn, status: 'DISBURSED', timestamp: new Date().toISOString() }
        : txn));
      refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
      showToast({ type: 'success', title: 'Payout approved', message: 'The payout was marked as sent.' });
      return result;
    } catch (error) {
      showToast({ type: 'error', title: 'Payout failed', message: error.message });
      return null;
    }
  };

  const handleWalletBalanceChange = useCallback((balance) => {
    setUserProfile(previous => ({ ...previous, walletBalance: balance }));
    setCurrentUser(previous => {
      if (!previous || previous.walletBalance === balance) return previous;
      const updated = { ...previous, walletBalance: balance };
      localStorage.setItem('crewpulse_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleCreateSalaryPayout = async ({ staff, hours, hourlyRate }) => {
    const result = await api.createStaffPayout({
      event_id: currentEvent.id,
      staff_id: staff.id,
      staff_name: staff.name,
      role: staff.role,
      hours_logged: Number(hours),
      hourly_rate: Number(hourlyRate)
    });
    if (!result?.success || !result.transaction) {
      throw new Error('Could not create the salary payout.');
    }
    const transaction = toEscrowTxn(result.transaction);
    setEscrowTxns(previous => [transaction, ...previous.filter(txn => txn.id !== transaction.id)]);
    refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
    return transaction;
  };

  const handlePaymentSuccess = async (paymentResult) => {
    if (paymentResult?.txnIdToDisburse) {
      const result = await handleDisbursePayout(paymentResult.txnIdToDisburse);
      return result ? true : false;
    }

    if (paymentResult?.purpose === 'ESCROW_FUND') {
      try {
        const result = await api.preFundEscrow(paymentResult.eventId || selectedEventId, paymentResult.amount);
        if (!result?.success) return false;
        const transaction = result.transaction && toEscrowTxn(result.transaction);
        setEvents(previous => previous.map(event => event.id === (paymentResult.eventId || selectedEventId)
          ? { ...event, escrowTotal: Number(event.escrowTotal || 0) + Number(paymentResult.amount) }
          : event));
        if (transaction) setEscrowTxns(previous => [transaction, ...previous.filter(txn => txn.id !== transaction.id)]);
        refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
        showToast({ type: 'success', title: 'Escrow funded', message: `₹${Number(paymentResult.amount).toLocaleString('en-IN')} added to the event reserve.` });
        return true;
      } catch (error) {
        showToast({ type: 'error', title: 'Escrow update failed', message: error.message });
        return false;
      }
    }
    return true;
  };

  const handleConfirmEmergencyReplacement = async (candidate, replaceStaffId) => {
    if (!candidate || !replaceStaffId) return null;
    try {
      const result = await api.emergencyDispatch(candidate.id, currentEvent.id, replaceStaffId);
      if (!result?.success) return null;
      setStaffList(previous => previous.map(staff => {
        if (staff.id === replaceStaffId) {
          return { ...staff, assignedEventId: null, currentStatus: 'UNAVAILABLE', zone: 'Replacement assigned' };
        }
        if (staff.id === candidate.id) {
          return { ...staff, assignedEventId: currentEvent.id, currentStatus: 'EN_ROUTE', zone: 'Emergency Replacement - On the way' };
        }
        return staff;
      }));
      refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
      showToast({ type: 'success', title: 'Replacement assigned', message: `${candidate.name} is on the way to replace the unavailable staff member.` });
      return result;
    } catch (error) {
      showToast({ type: 'error', title: 'Emergency dispatch failed', message: error.message });
      return null;
    }
  };

  const handleEmergencySOS = async () => {
    try {
      const result = await api.emergencySOS(currentEvent.id, `SOS sent by organizer for ${currentEvent.name}.`);
      showToast({ type: 'success', title: 'SOS sent', message: `Emergency alert sent for ${currentEvent.name}.` });
      return result;
    } catch (error) {
      showToast({ type: 'error', title: 'SOS not sent', message: error.message });
      return null;
    }
  };

  // If user requested Auth Screen or is logged out, render AuthScreen
  if (showAuthScreen || !currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      {/* Universal Top Header */}
      <Header 
        currentUser={currentUser}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        onLogout={handleLogout}
        onOpenChat={() => setIsChatOpen(true)}
        events={events}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
      />

      {/* Main Container */}
      <main className="app-container">
        
        {/* ===================== ORGANIZER DASHBOARD ===================== */}
        {activeRole === 'ORGANIZER' && (
          <div>
            {/* View Sub-Tabs for Organizer */}
            <div className="view-tabs-header">
              <div className="tabs-list">
                <button 
                  id="tab-command-center"
                  className={`tab-btn ${organizerTab === 'COMMAND_CENTER' ? 'active' : ''}`}
                  onClick={() => setOrganizerTab('COMMAND_CENTER')}
                >
                  <Activity size={16} />
                  <span>Live Operations Radar</span>
                </button>

                <button 
                  id="tab-talent-market"
                  className={`tab-btn ${organizerTab === 'TALENT_MARKET' ? 'active' : ''}`}
                  onClick={() => setOrganizerTab('TALENT_MARKET')}
                >
                  <Users size={16} />
                  <span>Verified Talent Directory & AI</span>
                </button>

                <button
                  id="tab-escrow-vault"
                  className={`tab-btn ${organizerTab === 'ESCROW_VAULT' ? 'active' : ''}`}
                  onClick={() => setOrganizerTab('ESCROW_VAULT')}
                >
                  <DollarSign size={16} />
                  <span>Escrow Vault & Payouts</span>
                </button>

                <button
                  id="tab-organizer-payment-history"
                  className={`tab-btn ${organizerTab === 'PAYMENT_HISTORY' ? 'active' : ''}`}
                  onClick={() => setOrganizerTab('PAYMENT_HISTORY')}
                >
                  <ReceiptText size={16} />
                  <span>Payment History</span>
                </button>

              </div>

            </div>

            {/* Sub-Views */}
            {organizerTab === 'COMMAND_CENTER' && (
              <OrganizerCommandCenter 
                event={currentEvent}
                staffList={staffList}
                liveStatus={attendanceOverview}
                onTriggerEmergency={() => setIsEmergencyModalOpen(true)}
                onSendEmergencySOS={handleEmergencySOS}
                onOpenTalentMarket={() => setOrganizerTab('TALENT_MARKET')}
                onOpenCreateShift={() => setIsCreateShiftModalOpen(true)}
                onOpenEscrow={() => setOrganizerTab('ESCROW_VAULT')}
                onOpenGateTerminal={() => setIsGateTerminalOpen(true)}
                onStaffCheckIn={handleStaffCheckIn}
                onStaffCheckOut={handleStaffCheckOut}
              />
            )}

            {organizerTab === 'TALENT_MARKET' && (
              <OrganizerTalentMarket 
                staffList={staffList}
                onHireStaff={handleHireStaff}
                selectedEvent={currentEvent}
                onOpenCreateShift={() => setIsCreateShiftModalOpen(true)}
              />
            )}

            {organizerTab === 'ESCROW_VAULT' && (
              <OrganizerEscrowVault
                escrowTxns={escrowTxns}
                staffList={staffList}
                onDisbursePayout={handleDisbursePayout}
                onCreateSalaryPayout={handleCreateSalaryPayout}
                event={currentEvent}
                onOpenPayment={(data) => {
                  setPaymentData(data);
                  setIsPaymentModalOpen(true);
                }}
              />
            )}

            {organizerTab === 'PAYMENT_HISTORY' && (
              <PaymentHistory
                role="ORGANIZER"
                eventId={currentEvent.id}
                staffList={staffList}
              />
            )}

          </div>
        )}

        {/* ===================== STAFF / PROFESSIONAL DASHBOARD ===================== */}
        {activeRole === 'STAFF' && (
          <div>
            {/* View Sub-Tabs for Staff */}
            <div className="view-tabs-header">
              <div className="tabs-list">
                <button 
                  id="tab-staff-clock"
                  className={`tab-btn ${staffTab === 'PUNCH_CLOCK' ? 'active' : ''}`}
                  onClick={() => setStaffTab('PUNCH_CLOCK')}
                >
                  <Clock size={16} />
                  <span>Geofenced Punch Clock & Shift</span>
                </button>

                <button 
                  id="tab-staff-feed"
                  className={`tab-btn ${staffTab === 'GIGS_FEED' ? 'active' : ''}`}
                  onClick={() => setStaffTab('GIGS_FEED')}
                >
                  <Briefcase size={16} />
                  <span>Available Gigs Feed</span>
                </button>

                <button 
                  id="tab-staff-passport"
                  className={`tab-btn ${staffTab === 'PASSPORT' ? 'active' : ''}`}
                  onClick={() => setStaffTab('PASSPORT')}
                >
                  <Award size={16} />
                  <span>Digital Passport & KYC</span>
                </button>

                <button 
                  id="tab-staff-wallet"
                  className={`tab-btn ${staffTab === 'WALLET' ? 'active' : ''}`}
                  onClick={() => setStaffTab('WALLET')}
                >
                  <CreditCard size={16} />
                  <span>Earnings Wallet (₹{userProfile.walletBalance.toLocaleString('en-IN')})</span>
                </button>

                <button
                  id="tab-staff-payment-history"
                  className={`tab-btn ${staffTab === 'PAYMENT_HISTORY' ? 'active' : ''}`}
                  onClick={() => setStaffTab('PAYMENT_HISTORY')}
                >
                  <ReceiptText size={16} />
                  <span>Payment History</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-status on-site" style={{ fontSize: '0.74rem' }}>
                  {userProfile.reliabilityScore}% Reliability Score
                </span>
              </div>
            </div>

            {/* Sub-Views */}
            {staffTab === 'PUNCH_CLOCK' && (
              <StaffShiftClock 
                key={`${resolveStaffId(userProfile.id)}-${currentEvent.id}`}
                userProfile={userProfile} 
                activeShift={activeClockShift}
                staffId={resolveStaffId(userProfile.id)}
                eventId={currentEvent.id}
                onStaffCheckIn={handleStaffCheckIn}
                onStaffCheckOut={handleStaffCheckOut}
              />
            )}

            {staffTab === 'GIGS_FEED' && (
              <StaffGigsFeed 
                shifts={shiftsFeed} 
                staffId={resolveStaffId(userProfile.id)}
                onApplyShift={async (shift) => {
                  try {
                    const result = await api.applyShift(shift.id, resolveStaffId(userProfile.id));
                    if (!result?.success) throw new Error('Your application could not be saved.');
                    if (!result.already_applied) {
                      setShiftsFeed(previous => previous.map(item => item.id === shift.id
                        ? { ...item, spotsLeft: Math.max(0, item.spotsLeft - 1) }
                        : item));
                    }
                    refreshDashboard().catch(error => console.warn('[CrewPulse] Could not refresh dashboard:', error));
                    showToast({
                      type: result.already_applied ? 'info' : 'success',
                      title: result.already_applied ? 'Already applied' : 'Application sent',
                      message: result.message || `Your application for ${shift.title} was saved.`
                    });
                    return result;
                  } catch (error) {
                    showToast({ type: 'error', title: 'Application failed', message: error.message });
                    return null;
                  }
                }}
              />
            )}

            {staffTab === 'PASSPORT' && (
              <StaffPassport userProfile={userProfile} staffId={resolveStaffId(userProfile.id)} />
            )}

            {staffTab === 'WALLET' && (
              <StaffWallet 
                userProfile={userProfile} 
                staffId={resolveStaffId(userProfile.id)}
                staffList={staffList}
                onWalletBalanceChange={handleWalletBalanceChange}
                onOpenPayment={(data) => {
                  setPaymentData(data);
                  setIsPaymentModalOpen(true);
                }}
              />
            )}

            {staffTab === 'PAYMENT_HISTORY' && (
              <PaymentHistory
                role="STAFF"
                eventId={currentEvent.id}
                staffId={resolveStaffId(userProfile.id)}
                staffName={userProfile.name}
                staffList={staffList}
              />
            )}

          </div>
        )}

      </main>

      {/* Global Modals */}
      <OrganizerCreateShiftModal 
        isOpen={isCreateShiftModalOpen}
        onClose={() => setIsCreateShiftModalOpen(false)}
        onCreateShift={handleCreateShift}
        event={currentEvent}
      />

      <OrganizerGateTerminalModal
        isOpen={isGateTerminalOpen}
        onClose={() => setIsGateTerminalOpen(false)}
        staffList={staffList}
        onStaffCheckIn={handleStaffCheckIn}
        onStaffCheckOut={handleStaffCheckOut}
        attendanceLogs={attendanceLogs}
        eventName={currentEvent.name}
        eventId={currentEvent.id}
      />

      <EmergencyHotSwapModal 
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onConfirmReplacement={handleConfirmEmergencyReplacement}
        standbyCandidates={staffList}
        event={currentEvent}
      />

      <EventChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        event={currentEvent}
        currentUser={currentUser}
      />

      {isPaymentModalOpen && (
        <PaymentSystemModal
          paymentData={paymentData}
          onClose={() => { setIsPaymentModalOpen(false); setPaymentData(null); }}
          onPaymentSuccess={(pData) => {
            return handlePaymentSuccess(pData);
          }}
        />
      )}

    </div>

  );
}
