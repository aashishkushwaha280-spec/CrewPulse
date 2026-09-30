import React, { useEffect, useState } from 'react';
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

export default function StaffGigsFeed({ shifts, onApplyShift, staffId }) {
  const [claimedShifts, setClaimedShifts] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [applyingShiftId, setApplyingShiftId] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationErrors, setApplicationErrors] = useState({});

  useEffect(() => {
    let isActive = true;
    api.getShiftApplications(staffId).then(applications => {
      if (isActive) setClaimedShifts(applications.map(application => application.shift_id));
    }).catch(error => {
      if (isActive) console.warn('[CrewPulse] Could not load shift applications:', error.message);
    }).finally(() => {
      if (isActive) setApplicationsLoading(false);
    });
    return () => { isActive = false; };
  }, [staffId]);

  const handleClaim = async (shift) => {
    if (!onApplyShift || applyingShiftId) return;
    setApplyingShiftId(shift.id);
    setApplicationErrors(previous => ({ ...previous, [shift.id]: '' }));
    try {
      const result = await onApplyShift(shift);
      if (!result?.success) {
        setApplicationErrors(previous => ({ ...previous, [shift.id]: 'Could not apply. Please try again.' }));
        return;
      }
      setClaimedShifts(previous => previous.includes(shift.id) ? previous : [...previous, shift.id]);
    } catch (error) {
      setApplicationErrors(previous => ({ ...previous, [shift.id]: error.message || 'Could not apply. Please try again.' }));
    } finally {
      setApplyingShiftId(null);
    }
  };

  const filteredShifts = shifts.filter(s => {
    return roleFilter === 'ALL' || s.role.toLowerCase().includes(roleFilter.toLowerCase());
  });

  return (
    <div>
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Available Event Gigs & Shifts</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              100% Escrow-Guaranteed shifts with instant post-shift bank transfers
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'Hospitality', 'Security', 'AV', 'Bar'].map(cat => (
              <button
                key={cat}
                onClick={() => setRoleFilter(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  background: roleFilter === cat ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: roleFilter === cat ? '#FFF' : 'var(--text-secondary)',
                  border: '1px solid ' + (roleFilter === cat ? 'var(--accent-primary)' : 'var(--border-subtle)')
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
        {filteredShifts.map((shift) => {
          const isClaimed = claimedShifts.includes(shift.id);
          const isApplying = applyingShiftId === shift.id;

          return (
            <div key={shift.id} className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge-status escrow-locked" style={{ fontSize: '0.72rem' }}>
                    <ShieldCheck size={11} />
                    <span>Escrow Pre-Funded</span>
                  </span>

                  <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: '600' }}>
                    {shift.spotsLeft} Openings
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{shift.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '10px' }}>
                  {shift.eventName}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{shift.venue}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{shift.date} • {shift.timeWindow} ({shift.durationHours} hrs)</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Dress Code:</strong> {shift.dressCode}
                </div>
              </div>

              <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Guaranteed Pay</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--accent-success)' }}>
                    ₹{shift.totalPay.toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}> (₹{shift.ratePerHour}/hr)</span>
                  </div>
                </div>

                {isClaimed ? (
                  <button className="btn-success" style={{ padding: '8px 14px', fontSize: '0.78rem' }} disabled>
                    <CheckCircle2 size={14} />
                    <span>Applied</span>
                  </button>
                ) : (
                  <button 
                    className="btn-primary" 
                    style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                    onClick={() => handleClaim(shift)}
                    disabled={applicationsLoading || Boolean(applyingShiftId) || shift.spotsLeft <= 0}
                  >
                    <span>{isApplying ? 'Applying...' : applicationsLoading ? 'Loading...' : shift.spotsLeft <= 0 ? 'Full' : 'One-Tap Apply'}</span>
                    {!isApplying && !applicationsLoading && shift.spotsLeft > 0 && <ChevronRight size={14} />}
                  </button>
                )}
              </div>
              {applicationErrors[shift.id] && (
                <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.72rem', textAlign: 'right', marginTop: '8px' }}>
                  {applicationErrors[shift.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
