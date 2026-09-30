import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  LogOut, 
  LogIn, 
  Clock,
  Search,
  Camera
} from 'lucide-react';

export default function OrganizerGateTerminalModal({ 
  isOpen, 
  onClose, 
  staffList, 
  onStaffCheckIn, 
  onStaffCheckOut, 
  attendanceLogs = [],
  eventName,
  eventId
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [simulatedScannerActive, setSimulatedScannerActive] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [cameraScanning, setCameraScanning] = useState(false);
  const videoRef = useRef(null);
  const scanHandlerRef = useRef(null);

  const handleQrPayload = async (rawValue) => {
    let pass;
    try {
      pass = JSON.parse(rawValue);
    } catch {
      setScanMessage('This QR code is not a CrewPulse credential.');
      return;
    }

    if (pass.type === 'crewpulse_staff_verification') {
      if (!pass.staff_id || !pass.code) {
        setScanMessage('Invalid staff code. Do not accept this credential.');
        return;
      }
      try {
        const result = await api.verifyStaffCredential(pass.staff_id, pass.code);
        setScanMessage(result.valid
          ? `VERIFIED staff: ${result.staff?.name || pass.staff_id} (${result.staff?.role || 'CrewPulse member'}).`
          : 'INVALID staff code. Do not accept this credential.');
      } catch (error) {
        setScanMessage(error.message || 'Could not verify this staff code.');
      }
      return;
    }

    if (pass.type !== 'crewpulse_gate_pass' || pass.event_id !== eventId) {
      setScanMessage('This pass is for a different event or is not valid.');
      return;
    }

    const staff = staffList.find(member => member.id === pass.staff_id);
    if (!staff) {
      setScanMessage('Staff member was not found for this pass.');
      return;
    }

    try {
      const session = await api.getShiftSession(staff.id, eventId);
      const isCheckedIn = ['CHECKED_IN', 'ON_BREAK'].includes(session?.status);
      const result = isCheckedIn
        ? await onStaffCheckOut(staff.id, 'Gate QR Scan Check-Out')
        : await onStaffCheckIn(staff.id, 'Gate QR Scan Check-In', pass.shift_id);
      setScanMessage(result?.session
        ? `${isCheckedIn ? 'Checked out' : 'Checked in'} ${staff.name}.`
        : `Could not update attendance for ${staff.name}.`);
    } catch (error) {
      setScanMessage(error.message || 'Could not read this pass. Try again.');
    }
  };

  useEffect(() => {
    if (!isOpen || !cameraScanning) return undefined;

    let active = true;
    let cameraControls;
    const videoElement = videoRef.current;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScanMessage('Camera access needs a secure browser page. Open CrewPulse on localhost or HTTPS.');
        setCameraScanning(false);
        return;
      }
      if (!videoElement) {
        setScanMessage('Camera preview is not ready. Please try again.');
        setCameraScanning(false);
        return;
      }

      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (!active) return;
        const reader = new BrowserQRCodeReader();
        cameraControls = await reader.decodeFromVideoDevice(
          undefined,
          videoElement,
          (result, _error, controls) => {
            if (!active || !result) return;
            active = false;
            controls.stop();
            setCameraScanning(false);
            setScanMessage('QR read. Checking staff record...');
            scanHandlerRef.current?.(result.getText());
          }
        );
      } catch (error) {
        setScanMessage(error.name === 'NotAllowedError'
          ? 'Camera blocked. Allow camera access in your browser settings, then try again.'
          : 'Could not open the camera. Check browser camera permission and try again.');
        setCameraScanning(false);
      }
    };

    startCamera();
    return () => {
      active = false;
      cameraControls?.stop();
      videoElement?.srcObject?.getTracks().forEach(track => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [cameraScanning, isOpen]);

  if (!isOpen) return null;

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.zone && s.zone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSimulateScan = async (staff) => {
    setSimulatedScannerActive(true);
    setScanMessage(`Updating attendance for ${staff.name}...`);
    try {
      const session = await api.getShiftSession(staff.id, eventId);
      const isOnSite = ['CHECKED_IN', 'ON_BREAK'].includes(session?.status);
      const result = isOnSite
        ? await onStaffCheckOut(staff.id, 'Gate List Check-Out')
        : await onStaffCheckIn(staff.id, 'Gate List Check-In');
      setScanMessage(result?.session
        ? `${isOnSite ? 'Checked out' : 'Checked in'} ${staff.name}.`
        : `Could not update attendance for ${staff.name}.`);
    } catch {
      setScanMessage(`Could not update attendance for ${staff.name}.`);
    } finally {
      setSimulatedScannerActive(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        
        {/* Terminal Header */}
        <div className="modal-header" style={{ background: 'rgba(6, 182, 212, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4, #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#FFF' }}>On-Site Gate Check-In & Scanner Terminal</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Venue Turnstile Manager • {eventName} • Biometric & QR Verification
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Scanner Feedback Banner */}
          {scanMessage && (
            <div style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              border: '1px solid rgba(16, 185, 129, 0.35)', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              color: '#34D399', 
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle2 size={18} />
              <span>{scanMessage}</span>
            </div>
          )}

          {/* QR camera scanner */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'rgba(14, 21, 35, 0.9)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={22} className={simulatedScannerActive ? "animate-pulse" : ""} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>Gate QR scanner</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Start the camera and allow browser access to scan a staff passport QR.
                </div>
              </div>
            </div>

            <button className="btn-primary" onClick={() => {
              scanHandlerRef.current = handleQrPayload;
              if (!cameraScanning) {
                setScanMessage('Allow camera access when your browser asks, then point at the staff passport QR.');
              }
              setCameraScanning(active => !active);
            }}>
              <Camera size={15} />
              <span>{cameraScanning ? 'Stop camera' : 'Start camera'}</span>
            </button>
          </div>

          {cameraScanning && (
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', background: '#000', borderRadius: '8px' }}
            />
          )}

          {/* Search bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search staff by name, role, or gate..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Staff Roster Check-In / Check-Out Table */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Current State</th>
                  <th>Check-In Time</th>
                  <th>Gate / Zone</th>
                  <th>Supervisor Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => {
                  const isOnSite = staff.currentStatus === 'ON_SITE';
                  const isCheckedOut = staff.currentStatus === 'CHECKED_OUT';
                  const isOnBreak = staff.currentStatus === 'ON_BREAK';

                  return (
                    <tr key={staff.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img 
                            src={staff.avatar} 
                            alt={staff.name} 
                            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{staff.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{staff.role}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {isOnSite ? (
                          <span className="badge-status on-site">ON-SITE</span>
                        ) : isOnBreak ? (
                          <span className="badge-status warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                            ON BREAK
                          </span>
                        ) : isCheckedOut ? (
                          <span className="badge-status" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                            CHECKED-OUT
                          </span>
                        ) : (
                          <span className="badge-status en-route">EN-ROUTE</span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                          {staff.clockedInTime || '—'}
                        </div>
                        {staff.clockedOutTime && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            Out: {staff.clockedOutTime}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {staff.zone || 'Gate 1 Turnstiles'}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {/* Turnstile Scan Action */}
                          <button
                            id={`btn-scan-${staff.id}`}
                            className="btn-ghost"
                            style={{ padding: '6px 10px', fontSize: '0.74rem', background: 'rgba(99, 102, 241, 0.15)', color: '#A5B4FC', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                            onClick={() => handleSimulateScan(staff)}
                            title="Record attendance for this staff member"
                          >
                            <QrCode size={13} />
                            <span>Mark attendance</span>
                          </button>

                          {/* Manual Supervisor Check In Button */}
                          {!isOnSite && !isOnBreak ? (
                            <button
                              id={`btn-manual-checkin-${staff.id}`}
                              className="btn-success"
                              style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                              onClick={() => onStaffCheckIn(staff.id, "Supervisor Manual Override")}
                            >
                              <LogIn size={13} />
                              <span>Check-In</span>
                            </button>
                          ) : (
                            /* Manual Supervisor Check Out Button */
                            <button
                              id={`btn-manual-checkout-${staff.id}`}
                              className="btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.74rem' }}
                              onClick={() => onStaffCheckOut(staff.id, "Supervisor Manual Sign-off")}
                            >
                              <LogOut size={13} />
                              <span>Check-Out</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Live Chronological Turnstile Audit Timeline */}
          <div>
            <h4 style={{ fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} />
              <span>Real-Time Turnstile Audit Log Stream</span>
            </h4>

            <div style={{ 
              background: 'rgba(0, 0, 0, 0.35)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '12px', 
              maxHeight: '140px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)'
            }}>
              {attendanceLogs.length > 0 ? (
                attendanceLogs.map((log, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>[{log.timestamp}]</span>
                      <span style={{ fontWeight: '600', color: '#FFF' }}>{log.staffName}</span>
                      <span style={{ 
                        color: log.type === 'CHECK_IN' ? '#34D399' : log.type === 'CHECK_OUT' ? '#F43F5E' : '#FBBF24',
                        fontWeight: '700' 
                      }}>
                        {log.type === 'CHECK_IN' ? 'CHECK-IN' : log.type === 'CHECK_OUT' ? 'CHECK-OUT' : 'BREAK'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>via {log.method}</span>
                    </div>
                    <span style={{ color: '#38BDF8', fontSize: '0.7rem' }}>{log.location}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  No attendance events logged yet. Use the scan or check-in buttons above!
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
