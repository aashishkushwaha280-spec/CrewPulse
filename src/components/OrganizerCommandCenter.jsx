import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  DollarSign,
  Clock, 
  Zap, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  ArrowUpRight,
  Radio,
  PhoneCall,
  UserPlus,
  QrCode,
  LogIn,
  LogOut
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function OrganizerCommandCenter({ 
  event, 
  staffList, 
  liveStatus,
  onTriggerEmergency, 
  onSendEmergencySOS,
  onOpenTalentMarket,
  onOpenCreateShift,
  onOpenEscrow,
  onOpenGateTerminal,
  onStaffCheckIn,
  onStaffCheckOut
}) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter staff assigned to this event
  const eventStaff = staffList.filter(s => s.assignedEventId === event.id);
  const onSiteCount = eventStaff.length
    ? eventStaff.filter(staff => staff.currentStatus === 'ON_SITE').length
    : Number(liveStatus?.checked_in ?? event.staffOnSite ?? 0);
  const enRouteCount = eventStaff.filter(staff => staff.currentStatus === 'EN_ROUTE').length;
  const absentCount = eventStaff.filter(staff => ['AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT', 'UNAVAILABLE'].includes(staff.currentStatus)).length;
  const currentlyWorkingCount = eventStaff.length
    ? onSiteCount
    : Number(liveStatus?.currently_working ?? onSiteCount);
  const notArrivedCount = eventStaff.filter(s => s.currentStatus === 'AVAILABLE').length;
  const checkedOutCount = eventStaff.filter(s => s.currentStatus === 'CHECKED_OUT').length;
  const escrowSecured = Number(event.escrowTotal || 0);
  const filteredStaff = eventStaff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.zone && s.zone.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'NOT_ARRIVED' ? s.currentStatus === 'AVAILABLE' : s.currentStatus === statusFilter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Top Banner Metric Summary */}
      <div className="metric-grid-4">
        <div className="metric-card glass-panel success">
          <div className="metric-header">
            <span className="metric-title">Checked In</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-success)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-value">
            {onSiteCount} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/ {event.totalStaffNeeded}</span>
          </div>
          <div className="metric-subtext">
            <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>Verified check-ins</span>
            <span>• Geofence synced</span>
          </div>
        </div>

        <div className="metric-card glass-panel warning">
          <div className="metric-header">
            <span className="metric-title">Absent / Not Working</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-warning)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-value">
            {absentCount} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Staff</span>
          </div>
          <div className="metric-subtext">
            <span>Pending attendance / no-show</span>
          </div>
        </div>

        <div className="metric-card glass-panel cyan">
          <div className="metric-header">
            <span className="metric-title">Currently Working</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-cyan)' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ fontFamily: 'var(--font-mono)' }}>
            {currentlyWorkingCount}
          </div>
          <div className="metric-subtext">
            <span style={{ color: 'var(--accent-cyan)' }}>{enRouteCount} en-route</span>
            <span>• live roster</span>
          </div>
        </div>

      </div>

      {/* Main Command Center Grid: Left Radar & Activity, Right Live Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 360px) 1fr', gap: '24px' }}>
        
        {/* Left Column: Live Radar & Event Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Radar Telemetry Card */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} style={{ color: 'var(--accent-success)' }} />
                <h4 style={{ fontSize: '0.95rem' }}>Geofence Perimeter Radar</h4>
              </div>
              <span className="badge-status on-site">200m Active</span>
            </div>

            <div className="radar-container">
              <div className="radar-sweep"></div>
              <div className="radar-ring radar-ring-1"></div>
              <div className="radar-ring radar-ring-2"></div>
              <div className="radar-center-dot"></div>
              
              {/* Simulated staff dots on radar */}
              <div style={{ position: 'absolute', top: '35%', left: '42%', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} title="Aarav (Gate 1)"></div>
              <div style={{ position: 'absolute', top: '55%', left: '60%', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} title="Ronnie (VIP)"></div>
              <div style={{ position: 'absolute', top: '25%', left: '70%', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} title="Pooja (Main Stage)"></div>
              <div style={{ position: 'absolute', top: '80%', left: '20%', width: '8px', height: '8px', borderRadius: '50%', background: '#FBBF24', boxShadow: '0 0 8px #FBBF24' }} title="Karan (En Route)"></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }}></span>
                Inside Venue ({onSiteCount})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FBBF24' }}></span>
                Approaching ({enRouteCount})
              </span>
            </div>

            <div style={{ marginTop: '18px', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Venue Center:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>13.0617° N, 77.4744° E</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Geofence Lock:</span>
                <span style={{ color: 'var(--accent-success)', fontWeight: '600' }}>Biometric & GPS Strict</span>
              </div>
            </div>
          </div>

          {/* Quick Shift Management Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '14px' }}>Shift Orchestration & Attendance</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                id="btn-open-gate-terminal"
                className="btn-success"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={onOpenGateTerminal}
              >
                <QrCode size={16} />
                <span>Gate Check-In & Scanner Terminal</span>
              </button>

              <button
                id="btn-send-emergency-sos"
                className="btn-danger"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={onSendEmergencySOS}
              >
                <Zap size={16} />
                <span>Send emergency SOS</span>
              </button>

              <button
                id="btn-replace-unavailable-staff"
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', color: '#FDA4AF', borderColor: 'rgba(244, 63, 94, 0.35)' }}
                onClick={onTriggerEmergency}
              >
                <UserPlus size={16} />
                <span>Replace unavailable staff</span>
              </button>

              <button 
                id="btn-browse-verified-talent"
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={onOpenTalentMarket}
              >
                <UserPlus size={16} />
                <span>Browse Verified Talent Pool</span>
              </button>

              <button 
                id="btn-post-new-shift"
                className="btn-ghost" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={onOpenCreateShift}
              >
                <span>+ Create New Role / Shift</span>
              </button>

              <button
                id="btn-view-escrow-vault"
                className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', color: 'var(--accent-warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                onClick={onOpenEscrow}
              >
                <DollarSign size={16} />
                <span>Escrow & payouts (₹{escrowSecured.toLocaleString('en-IN')})</span>
              </button>

            </div>
          </div>
        </div>

        {/* Right Column: Live Workforce Roster Table with Direct Check-In / Check-Out */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem' }}>Active Shift Deployment Roster</h3>
                <span className="badge-status on-site" style={{ fontSize: '0.7rem' }}>
                  {onSiteCount} PRESENT
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Manage on-site check-in / check-out, geofenced timestamps, and zone assignments
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search staff, role, zone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.82rem', width: '190px' }}
                />
              </div>

            </div>
          </div>

          <div role="group" aria-label="Filter staff by attendance status" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {[
              ['ALL', 'All', eventStaff.length],
              ['ON_SITE', 'In Venue', eventStaff.filter(staff => staff.currentStatus === 'ON_SITE').length],
              ['EN_ROUTE', 'Approaching', enRouteCount],
              ['NOT_ARRIVED', 'Not Arrived', notArrivedCount],
              ['CHECKED_OUT', 'Checked Out', checkedOutCount]
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className={statusFilter === value ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '7px 10px', fontSize: '0.76rem' }}
              >
                {label} <span style={{ opacity: 0.75 }}>{count}</span>
              </button>
            ))}
          </div>

          {/* Roster Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Professional</th>
                  <th>Role & Zone</th>
                  <th>Check-In & Telemetry</th>
                  <th>Trust & Badges</th>
                  <th>Status</th>
                  <th>Attendance Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No staff match this attendance status.
                    </td>
                  </tr>
                )}
                {filteredStaff.map((staff) => {
                  const isOnSite = staff.currentStatus === 'ON_SITE';
                  const isCheckedOut = staff.currentStatus === 'CHECKED_OUT';

                  return (
                    <tr key={staff.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={staff.avatar} 
                            alt={staff.name} 
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} 
                          />
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              {staff.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>★ {staff.rating}</span>
                              <span>•</span>
                              <span style={{ color: 'var(--accent-success)' }}>{staff.reliabilityScore}% Reliability</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.84rem' }}>
                          {staff.role}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <MapPin size={12} />
                          <span>{staff.zone || 'Gate 1 Turnstiles'}</span>
                        </div>
                      </td>

                      <td>
                        {staff.clockedInTime ? (
                          <div>
                            <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                              In: {staff.clockedInTime}
                            </div>
                            {staff.clockedOutTime ? (
                              <div style={{ fontSize: '0.72rem', color: '#FDA4AF', fontFamily: 'var(--font-mono)' }}>
                                Out: {staff.clockedOutTime}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} />
                                <span>GPS Geofence OK</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: staff.currentStatus === 'EN_ROUTE' ? 'var(--accent-warning)' : 'var(--text-muted)', fontStyle: 'italic' }}>
                            {staff.currentStatus === 'EN_ROUTE' ? 'Approaching venue' : 'Not arrived yet'}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {staff.verifiedGovtId && (
                            <span className="verified-chip">
                              <ShieldCheck size={11} />
                              <span>DigiLocker KYC</span>
                            </span>
                          )}
                          {staff.policeCleared && (
                            <span className="police-chip">
                              <ShieldCheck size={11} />
                              <span>Police Verified</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {isOnSite ? (
                          <span className="badge-status on-site">ON-SITE</span>
                        ) : isCheckedOut ? (
                          <span className="badge-status disbursed">CHECKED-OUT</span>
                        ) : staff.currentStatus === 'EN_ROUTE' ? (
                          <span className="badge-status en-route">EN-ROUTE</span>
                        ) : (
                          <span className="badge-status available">AVAILABLE</span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {/* Inline Check-In / Check-Out Controls */}
                          {!isOnSite && !isCheckedOut ? (
                            <button 
                              id={`btn-inline-checkin-${staff.id}`}
                              className="btn-success" 
                              style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                              title="Check-In this staff member"
                              onClick={() => onStaffCheckIn(staff.id, "Organizer Dashboard Quick Check-In")}
                            >
                              <LogIn size={13} />
                              <span>Check-In</span>
                            </button>
                          ) : isOnSite ? (
                            <button 
                              id={`btn-inline-checkout-${staff.id}`}
                              className="btn-danger" 
                              style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                              title="Check-Out and release hours"
                              onClick={() => onStaffCheckOut(staff.id, "Organizer Dashboard Quick Check-Out")}
                            >
                              <LogOut size={13} />
                              <span>Check-Out</span>
                            </button>
                          ) : (
                            <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: '0.72rem' }} disabled>
                              Completed
                            </button>
                          )}

                          <button 
                            className="btn-ghost" 
                            style={{ padding: '5px 8px', fontSize: '0.76rem' }}
                            title="Call or Ping Professional"
                            onClick={() => showToast({
                              type: 'info',
                              title: 'Dispatching Relay Call',
                              message: `Connecting encrypted call to ${staff.name} (${staff.phone || '+91 98450 12345'})...`
                            })}
                          >
                            <PhoneCall size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
