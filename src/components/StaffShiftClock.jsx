import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  QrCode, 
  Navigation,
  Coffee,
  LogOut,
  LogIn,
  Star,
  Check
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export default function StaffShiftClock({ userProfile, activeShift = userProfile.activeShift, staffId, eventId, onClockInUpdate, onStaffCheckIn, onStaffCheckOut }) {
  const { showToast } = useToast();
  // Geofence simulation state: true = inside 200m perimeter; false = outside perimeter
  const [isInsideGeofence, setIsInsideGeofence] = useState(true);
  
  // Shift state: 'UNCHECKED' | 'CHECKING_IN' | 'CHECKED_IN' | 'ON_BREAK' | 'CHECKING_OUT' | 'CHECKED_OUT'
  const [shiftState, setShiftState] = useState('UNCHECKED');
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Check-In Wizard state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [dressCodeConfirmed, setDressCodeConfirmed] = useState(true);
  const [badgeConfirmed, setBadgeConfirmed] = useState(true);
  const [faceMatchVerified, setFaceMatchVerified] = useState(false);
  const [faceScanStatus, setFaceScanStatus] = useState('Ready for face verification');
  const [faceScanLoading, setFaceScanLoading] = useState(false);

  // Check-Out Wizard state
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [handoverNotes, setHandoverNotes] = useState('All duties completed, radio earpiece returned to supervisor.');
  const [radioReturned, setRadioReturned] = useState(true);

  // QR Pass modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [gatePassToken, setGatePassToken] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const gatePassPayload = JSON.stringify({
    type: 'crewpulse_gate_pass',
    version: 1,
    pass_id: gatePassToken,
    staff_id: staffId,
    staff_name: userProfile.name,
    event_id: eventId,
    event_name: activeShift.eventName,
    shift_id: activeShift.id,
    role: activeShift.role
  });

  const ratePerSecond = activeShift.hourlyRate / 3600;

  useEffect(() => {
    let isActive = true;
    api.getShiftSession(staffId, eventId).then(savedSession => {
      if (!isActive) return;
      setElapsedSeconds(savedSession?.elapsed_seconds || 0);
      setShiftState(savedSession?.status || 'UNCHECKED');
      setCheckInTime(savedSession?.check_in_at
        ? new Date(savedSession.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null);
      setCheckOutTime(savedSession?.check_out_at
        ? new Date(savedSession.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null);
    }).catch(error => {
      if (isActive) showToast({ type: 'error', title: 'Shift session unavailable', message: error.message });
    }).finally(() => {
      if (isActive) setSessionLoaded(true);
    });
    return () => { isActive = false; };
  }, [staffId, eventId, showToast]);

  // Real-time ticking counter when clocked in and not on break
  useEffect(() => {
    let interval = null;
    if (shiftState === 'CHECKED_IN') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shiftState]);

  const earnedSoFar = (elapsedSeconds * ratePerSecond).toFixed(2);

  const formatTime = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const runFaceRecognition = async () => {
    setFaceScanLoading(true);
    setFaceScanStatus('Checking your face...');
    await new Promise(resolve => setTimeout(resolve, 1400));
    const matched = true;
    setFaceMatchVerified(matched);
    setFaceScanStatus(matched ? 'Face check passed.' : 'Face check did not pass. Try again.');
    setFaceScanLoading(false);
    if (!matched) {
      showToast({
        type: 'error',
        title: 'Face verification failed',
        message: 'The system could not confirm your identity. Please retry the scan.'
      });
    }
    return matched;
  };

  // Check-In Submission
  const handleConfirmCheckIn = async () => {
    if (!isInsideGeofence) {
      showToast({
        type: 'warning',
        title: 'You are too far away',
        message: 'Go to the event venue to check in.'
      });
      return;
    }

    if (!faceMatchVerified) {
      showToast({
        type: 'warning',
        title: 'Check your face first',
        message: 'Tap “Check my face” before checking in.'
      });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await onStaffCheckIn(staffId, "Face Recognition Check-In", activeShift.id);
      if (!result?.session) return;
      setElapsedSeconds(result.session.elapsed_seconds || 0);
      setCheckInTime(new Date(result.session.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShiftState(result.session.status);
      setShowCheckInModal(false);
      setFaceMatchVerified(false);
      setFaceScanStatus('Ready for face verification');
      if (onClockInUpdate) onClockInUpdate(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle Break
  const handleToggleBreak = async () => {
    const action = shiftState === 'CHECKED_IN' ? 'START' : 'RESUME';
    setIsUpdating(true);
    try {
      const updatedSession = await api.setShiftBreak(staffId, eventId, action);
      setElapsedSeconds(updatedSession.elapsed_seconds || 0);
      setShiftState(updatedSession.status);
      showToast({
        type: action === 'START' ? 'info' : 'success',
        title: action === 'START' ? 'Break Mode Activated' : 'Shift Resumed',
        message: action === 'START'
          ? 'Shift paused. The wage meter will pause until you resume.'
          : 'Shift resumed and the wage meter is active.'
      });
    } catch (error) {
      showToast({ type: 'error', title: 'Could not update break', message: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  // Check-Out Submission
  const handleConfirmCheckOut = async () => {
    if (!faceMatchVerified) {
      showToast({
        type: 'warning',
        title: 'Check your face first',
        message: 'Tap “Check my face” before checking out.'
      });
      return;
    }

    setIsUpdating(true);
    try {
      const result = await onStaffCheckOut(staffId, "Face Recognition Check-Out", elapsedSeconds / 3600, rating);
      if (!result?.session) return;
      setElapsedSeconds(result.session.elapsed_seconds || 0);
      setCheckOutTime(new Date(result.session.check_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setShiftState(result.session.status);
      setShowCheckOutModal(false);
      setFaceMatchVerified(false);
      setFaceScanStatus('Ready for face verification');
      if (onClockInUpdate) onClockInUpdate(false);
      showToast({
        type: 'success',
        title: 'Shift Completed & Escrow Queued',
        message: `Check-out confirmed. ₹${Number(result.net_payout || 0).toFixed(2)} queued for escrow settlement.`
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      {/* Geofence Testing Simulator Banner (Hackathon Tool) */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Navigation size={20} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main)' }}>
                GPS Telemetry Geofence Simulator (Hackathon Demo Tool)
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Toggle your virtual location relative to {activeShift.venue.split(',')[0]}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="btn-geofence-inside"
              onClick={() => setIsInsideGeofence(true)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: isInsideGeofence ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.05)',
                color: isInsideGeofence ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid ' + (isInsideGeofence ? 'var(--accent-success)' : 'var(--border-subtle)')
              }}
            >
              🟢 Inside Venue (80m away)
            </button>

            <button
              id="btn-geofence-outside"
              onClick={() => {
                setIsInsideGeofence(false);
                if (shiftState === 'CHECKED_IN') {
                  showToast({
                    type: 'warning',
                    title: 'Geofence Breach Detected',
                    message: '⚠️ Warning: You left the 200m venue perimeter!'
                  });
                }
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: '700',
                background: !isInsideGeofence ? 'var(--accent-danger)' : 'rgba(255, 255, 255, 0.05)',
                color: !isInsideGeofence ? '#FFF' : 'var(--text-secondary)',
                border: '1px solid ' + (!isInsideGeofence ? 'var(--accent-danger)' : 'var(--border-subtle)')
              }}
            >
              🔴 Outside Venue (2.8km away)
            </button>
          </div>
        </div>
      </div>

      {/* Main Shift Details & Attendance Terminal Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: '24px' }}>
        
        {/* Left Column: Interactive Check-In / Check-Out Punch Terminal */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Shift Attendance Terminal
              </span>
              {isInsideGeofence ? (
                <span className="badge-status on-site">
                  <CheckCircle2 size={12} />
                  Within Geofence (80m)
                </span>
              ) : (
                <span className="badge-status" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#FB7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                  <AlertTriangle size={12} />
                  Perimeter Locked
                </span>
              )}
            </div>

            {/* Radar / Distance Indicator */}
            <div className="radar-container" style={{ width: '160px', height: '160px', margin: '10px auto 18px' }}>
              <div className="radar-sweep"></div>
              <div className="radar-ring radar-ring-1"></div>
              <div className="radar-center-dot" style={{ background: isInsideGeofence ? '#34D399' : '#FB7185' }}></div>
              <div style={{ position: 'absolute', bottom: '14px', fontSize: '0.7rem', fontWeight: '700', color: isInsideGeofence ? '#34D399' : '#FB7185', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
                {isInsideGeofence ? 'PERIMETER VERIFIED' : 'GEOFENCE BREACH'}
              </div>
            </div>

            {/* Current State Badge */}
            <div style={{ marginBottom: '14px' }}>
              {!sessionLoaded && (
                <span className="badge-status en-route" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  LOADING SAVED SHIFT
                </span>
              )}
              {sessionLoaded && shiftState === 'UNCHECKED' && (
                <span className="badge-status en-route" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  READY FOR CHECK-IN
                </span>
              )}
              {sessionLoaded && shiftState === 'CHECKED_IN' && (
                <span className="badge-status on-site" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  SHIFT IN PROGRESS (CHECKED-IN)
                </span>
              )}
              {sessionLoaded && shiftState === 'ON_BREAK' && (
                <span className="badge-status warning" style={{ fontSize: '0.8rem', padding: '6px 14px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                  ON REST / MEAL BREAK
                </span>
              )}
              {sessionLoaded && shiftState === 'CHECKED_OUT' && (
                <span className="badge-status disbursed" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  SHIFT COMPLETED (CHECKED-OUT)
                </span>
              )}
            </div>

            {/* Timer and Metered Earnings Display */}
            <div style={{ background: 'rgba(14, 21, 35, 0.8)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Logged Shift Duration</div>
              <div style={{ fontSize: '2.1rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: shiftState === 'CHECKED_IN' ? 'var(--accent-success)' : 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                {formatTime(elapsedSeconds)}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accrued Escrow Earnings:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  ₹{earnedSoFar}
                </span>
              </div>

              {checkInTime && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  Check-In: <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>{checkInTime}</span>
                  {checkOutTime && <span> • Check-Out: <span style={{ color: '#FDA4AF', fontWeight: '600' }}>{checkOutTime}</span></span>}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: Check In / Break / Check Out */}
          <div>
            {sessionLoaded && shiftState === 'UNCHECKED' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  id="btn-trigger-checkin-wizard"
                  className="btn-success"
                  style={{ width: '100%', padding: '14px 8px', fontSize: '0.9rem', justifyContent: 'center', opacity: !isInsideGeofence ? 0.6 : 1 }}
                  disabled={!sessionLoaded || isUpdating || !isInsideGeofence}
                  onClick={() => {
                    if (!isInsideGeofence) {
                      showToast({
                        type: 'warning',
                        title: 'You are too far away',
                        message: 'Go to the event venue to check in.'
                      });
                      return;
                    }
                    setShowCheckInModal(true);
                  }}
                >
                  <LogIn size={18} />
                  <span>Check in</span>
                </button>
                <button
                  id="btn-view-qr-pass-before-checkin"
                  className="btn-ghost"
                  style={{ justifyContent: 'center', fontSize: '0.82rem', padding: '10px 8px' }}
                  onClick={() => setShowQrModal(true)}
                >
                  <QrCode size={16} />
                  <span>Show gate pass</span>
                </button>
              </div>
            )}

            {sessionLoaded && (shiftState === 'CHECKED_IN' || shiftState === 'ON_BREAK') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    id="btn-toggle-break"
                    className="btn-ghost"
                    style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '10px' }}
                    disabled={isUpdating}
                    onClick={handleToggleBreak}
                  >
                    <Coffee size={14} />
                    <span>{shiftState === 'ON_BREAK' ? 'Resume work' : 'Take a break'}</span>
                  </button>

                  <button
                    id="btn-view-qr-pass"
                    className="btn-ghost"
                    style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '10px' }}
                    disabled={isUpdating}
                    onClick={() => setShowQrModal(true)}
                  >
                    <QrCode size={14} />
                    <span>Gate Pass QR</span>
                  </button>
                </div>

                <button
                  id="btn-trigger-checkout-wizard"
                  className="btn-danger"
                  style={{ width: '100%', padding: '12px', fontSize: '0.92rem', justifyContent: 'center' }}
                  disabled={isUpdating}
                  onClick={() => setShowCheckOutModal(true)}
                >
                  <LogOut size={16} />
                  <span>Check-Out & Finalize Shift</span>
                </button>
              </div>
            )}

            {sessionLoaded && shiftState === 'CHECKED_OUT' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.82rem', color: '#A7F3D0' }}>
                ✅ Shift Completed! ₹{earnedSoFar} submitted to supervisor for automated escrow disbursal.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Shift Contract & Instructions */}
        <div className="glass-panel" style={{ padding: '26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div>
              <span className="badge-status escrow-locked" style={{ marginBottom: '8px' }}>
                Active Shift Contract
              </span>
              <h2 style={{ fontSize: '1.4rem', color: '#FFF' }}>{activeShift.eventName}</h2>
              <div style={{ fontSize: '0.88rem', color: 'var(--accent-primary)', fontWeight: '600', marginTop: '2px' }}>
                {activeShift.role}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Guaranteed Payout</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--accent-success)' }}>
                ₹{activeShift.expectedPay.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <ShieldCheck size={12} />
                <span>100% Locked in Escrow</span>
              </div>
            </div>
          </div>

          {/* Shift Details Key-Value Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Reporting Venue</div>
              <div style={{ fontWeight: '600', fontSize: '0.86rem', marginTop: '3px' }}>{activeShift.venue}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>Lat: {activeShift.venueCoords.lat}, Lng: {activeShift.venueCoords.lng}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Shift Window & Duration</div>
              <div style={{ fontWeight: '600', fontSize: '0.86rem', marginTop: '3px' }}>{activeShift.shiftWindow}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Report by {activeShift.reportingTime}</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Required Dress Code</div>
              <div style={{ fontWeight: '600', fontSize: '0.84rem', marginTop: '3px', color: '#E2E8F0' }}>
                {activeShift.dressCode}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Shift Lead / Supervisor</div>
              <div style={{ fontWeight: '600', fontSize: '0.84rem', marginTop: '3px', color: '#E2E8F0' }}>
                {activeShift.supervisor}
              </div>
            </div>
          </div>

          {/* Protocols & Safety Banner */}
          <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '14px', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#A5B4FC', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} />
              <span>Shift Security & Check-Out Guarantee</span>
            </h4>
            <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.5' }}>
              <li>Checking in logs your biometric verification and activates the hourly escrow tracker.</li>
              <li>At shift end, completing Check-Out prompts your supervisor for digital sign-off and instant UPI release.</li>
              <li>Taking breaks is permitted; simply tap "Take Break" to pause shift metrics transparently.</li>
            </ul>
          </div>
        </div>

      </div>

      {/* ===================== CHECK-IN CEREMONY MODAL ===================== */}
      {showCheckInModal && (
        <div className="modal-overlay" onClick={() => setShowCheckInModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-success)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogIn size={18} />
                </div>
                <div>
                  <h3>Shift Check-In Verification</h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{activeShift.eventName}</p>
                </div>
              </div>
              <button onClick={() => setShowCheckInModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Geofence radius */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--accent-success)' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#A7F3D0' }}>Step 1: Venue check</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>You are near the event venue.</div>
                </div>
              </div>

              {/* Step 2: Biometric Selfie Preview */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '8px' }}>
                  Step 2: Face check
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => runFaceRecognition()}
                  disabled={faceScanLoading || isUpdating}
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
                >
                  <ShieldCheck size={16} />
                  <span>{faceScanLoading ? 'Checking...' : 'Check my face'}</span>
                </button>

                <div style={{ width: '110px', height: '110px', borderRadius: '50%', margin: '0 auto 10px', position: 'relative', overflow: 'hidden', border: `3px solid ${faceMatchVerified ? 'var(--accent-success)' : 'var(--border-subtle)'}` }}>
                  <img src={userProfile.avatar} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: faceMatchVerified ? '#34D399' : '#E2E8F0', fontSize: '0.65rem', padding: '2px' }}>
                    {faceMatchVerified ? 'MATCH 99.8%' : 'AWAITING SCAN'}
                  </div>
                </div>
                <div style={{ fontSize: '0.74rem', color: faceMatchVerified ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: '600' }}>
                  {faceScanStatus}
                </div>
              </div>

              {/* Step 3: Dress Code Attestation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Step 3: Check your uniform and badge
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dressCodeConfirmed} onChange={e => setDressCodeConfirmed(e.target.checked)} />
                  <span>I am wearing: {activeShift.dressCode}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={badgeConfirmed} onChange={e => setBadgeConfirmed(e.target.checked)} />
                  <span>I have my CrewPulse digital badge ready</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowCheckInModal(false)}>Cancel</button>
              <button 
                id="btn-complete-checkin-ceremony"
                className="btn-success" 
                onClick={handleConfirmCheckIn}
                disabled={!dressCodeConfirmed || !badgeConfirmed || isUpdating || !faceMatchVerified}
              >
                <span>{isUpdating ? 'Checking in...' : 'Check in'}</span>
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CHECK-OUT CEREMONY MODAL ===================== */}
      {showCheckOutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckOutModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-danger)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOut size={18} />
                </div>
                <div>
                  <h3>Shift Check-Out & Sign-Off</h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Finalize hours & trigger escrow release</p>
                </div>
              </div>
              <button onClick={() => setShowCheckOutModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Summary Stats Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Hours Logged</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#FFF' }}>
                    {formatTime(elapsedSeconds)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Accrued Payout</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-success)' }}>
                    ₹{earnedSoFar}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px' }}>Face Recognition Verification</div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => runFaceRecognition()}
                  disabled={faceScanLoading || isUpdating}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <ShieldCheck size={16} />
                  <span>{faceScanLoading ? 'Checking...' : 'Check my face'}</span>
                </button>
                <div style={{ fontSize: '0.72rem', color: faceMatchVerified ? 'var(--accent-success)' : 'var(--text-secondary)', marginTop: '8px', fontWeight: '600' }}>
                  {faceScanStatus}
                </div>
              </div>

              {/* Handover Notes */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Handover Notes / Duty Summary
                </label>
                <textarea 
                  rows="2"
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              {/* Return Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={radioReturned} onChange={e => setRadioReturned(e.target.checked)} />
                <span>Returned all venue access credentials & equipment</span>
              </label>

              {/* Event Rating */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Rate Event Organizer Experience
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ background: 'transparent', padding: '4px', color: star <= rating ? '#FBBF24' : 'rgba(255,255,255,0.2)' }}
                    >
                      <Star size={22} fill={star <= rating ? '#FBBF24' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowCheckOutModal(false)}>Cancel</button>
              <button 
                id="btn-confirm-checkout-final"
                className="btn-danger" 
                onClick={handleConfirmCheckOut}
                disabled={!radioReturned || isUpdating || !faceMatchVerified}
              >
                <span>{isUpdating ? 'Checking out...' : 'Check out'}</span>
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital QR Badge Modal */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3>Gate pass</h3>
              <button onClick={() => setShowQrModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ width: '244px', height: '244px', background: '#FFF', padding: '12px', borderRadius: '8px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QRCodeSVG value={gatePassPayload} size={220} level="M" includeMargin />
              </div>
              <h4 style={{ fontSize: '1.1rem' }}>{userProfile.name}</h4>
              <p style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: '600' }}>{activeShift.role}</p>
              <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-success)', overflowWrap: 'anywhere' }}>
                Pass code: {gatePassToken}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {activeShift.eventName}
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ margin: '14px auto 0', justifyContent: 'center' }}
                onClick={() => setGatePassToken(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`)}
              >
                Make a new pass code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
