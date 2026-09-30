import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';

export default function EmergencyHotSwapModal({ 
  isOpen, 
  onClose, 
  onConfirmReplacement,
  standbyCandidates,
  event
}) {
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  const staffNeedingReplacement = standbyCandidates.filter(staff =>
    staff.assignedEventId === event.id && ['AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT', 'UNAVAILABLE'].includes(staff.currentStatus)
  );
  const selectedStaff = staffNeedingReplacement.find(staff => staff.id === selectedStaffId) || staffNeedingReplacement[0] || null;
  const eligibleCandidates = standbyCandidates.filter(staff =>
    staff.id !== selectedStaff?.id && ['AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT'].includes(staff.currentStatus)
  );
  const replacementOptions = standbyCandidates.filter(staff => staff.id !== selectedStaff?.id);
  const replacementCandidate = eligibleCandidates.find(staff => staff.id === selectedCandidateId) || eligibleCandidates[0] || null;

  if (!isOpen) return null;

  const handleClose = () => {
    setDispatchSuccess(false);
    setDispatchError('');
    onClose();
  };

  const handleDispatch = async () => {
    setDispatching(true);
    setDispatchError('');
    try {
      const result = await onConfirmReplacement(replacementCandidate, selectedStaff?.id);
      if (!result?.success) {
        setDispatchError('Could not assign the replacement. Please try again.');
        return;
      }
      setDispatchSuccess(true);
    } catch (error) {
      setDispatchError(error.message || 'Could not assign the replacement. Please try again.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'rgba(244, 63, 94, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ color: '#FFF' }}>Replace unavailable staff</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Event: {event.name}
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {dispatchSuccess ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#FFF' }}>Replacement assigned</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--accent-success)', marginTop: '4px' }}>
                {replacementCandidate?.name} is on the way to the event.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} style={{ color: 'var(--accent-danger)' }} />
                <span style={{ fontSize: '0.82rem', color: '#FDA4AF' }}>
                  All crew are listed. Staff already working or on break cannot be selected.
                </span>
              </div>

              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '12px' }}>
                Staff who cannot work
                <select
                  value={selectedStaff?.id || ''}
                  onChange={event => setSelectedStaffId(event.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '6px' }}
                >
                  <option value="">Choose staff</option>
                  {staffNeedingReplacement.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name} ({staff.currentStatus.replace('_', ' ')})</option>
                  ))}
                </select>
              </label>
              {staffNeedingReplacement.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', margin: '-6px 0 12px' }}>
                  No absent staff are listed for this event yet.
                </p>
              )}

              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '14px' }}>
                  Replacement crew member
                <select
                  value={replacementCandidate?.id || ''}
                  onChange={event => setSelectedCandidateId(event.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: '6px' }}
                >
                  <option value="">Choose replacement</option>
                    {replacementOptions.map(staff => {
                      const canReplace = ['AVAILABLE', 'EN_ROUTE', 'CHECKED_OUT'].includes(staff.currentStatus);
                      return (
                        <option key={staff.id} value={staff.id} disabled={!canReplace}>
                          {staff.name} - {staff.role} ({(staff.currentStatus || 'UNKNOWN').replaceAll('_', ' ')})
                        </option>
                      );
                    })}
                </select>
              </label>
              {eligibleCandidates.length === 0 && (
                <p style={{ color: '#FDA4AF', fontSize: '0.76rem', margin: '-8px 0 12px' }}>
                  No staff are available right now. Add or release a staff member first.
                </p>
              )}

              {dispatchError && <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.8rem', marginBottom: '12px' }}>{dispatchError}</p>}

              {replacementCandidate && (
                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(14, 21, 35, 0.9)' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
                    <img 
                      src={replacementCandidate.avatar} 
                      alt={replacementCandidate.name} 
                      style={{ width: '56px', height: '56px', borderRadius: '16px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '1.1rem' }}>{replacementCandidate.name}</h4>
                        <span className="badge-status on-site" style={{ fontSize: '0.7rem' }}>{replacementCandidate.currentStatus.replaceAll('_', ' ')}</span>
                      </div>
                      <div style={{ color: 'var(--accent-primary)', fontSize: '0.82rem', fontWeight: '600' }}>
                        {replacementCandidate.role}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} />
                        <span>{replacementCandidate.location || 'Location not set'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Reliability:</span>
                      <div style={{ fontWeight: '700', color: 'var(--accent-success)' }}>{replacementCandidate.reliabilityScore ?? '—'}%</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Rating:</span>
                      <div style={{ fontWeight: '700', color: 'var(--accent-warning)' }}>★ {replacementCandidate.rating ?? '—'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Clearance:</span>
                      <div style={{ fontWeight: '700', color: '#38BDF8' }}>{replacementCandidate.verifiedGovtId ? 'Verified' : 'Check needed'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Hourly rate:</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        ₹{Math.round(replacementCandidate.hourlyRate || 0)}/hr
                      </div>
                    </div>

                    <button 
                      id="btn-confirm-panic-dispatch"
                      className="btn-danger" 
                      style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                      onClick={handleDispatch}
                      disabled={dispatching || !selectedStaff || !replacementCandidate}
                    >
                      <Zap size={15} />
                      <span>{dispatching ? 'Assigning...' : 'Assign replacement'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
