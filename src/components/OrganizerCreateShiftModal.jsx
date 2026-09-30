import React, { useState } from 'react';
import { 
  X, 
  Lock,
  Plus
} from 'lucide-react';

export default function OrganizerCreateShiftModal({ 
  isOpen, 
  onClose, 
  onCreateShift, 
  event 
}) {
  const [roleTitle, setRoleTitle] = useState('VIP Hospitality Host');
  const [headcount, setHeadcount] = useState(4);
  const [durationHours, setDurationHours] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(700);
  const [dressCode, setDressCode] = useState('Black Blazer, Formal Dark Trousers, Polished Shoes');
  const [requirePoliceClearance, setRequirePoliceClearance] = useState(true);
  const [requireGovtId, setRequireGovtId] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const totalCalculatedEscrow = headcount * durationHours * hourlyRate;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newShift = {
      id: `sft-${Date.now()}`,
      title: `${roleTitle} (${event.name})`,
      eventName: event.name,
      role: roleTitle,
      ratePerHour: hourlyRate,
      durationHours: durationHours,
      totalPay: durationHours * hourlyRate,
      date: event.date,
      timeWindow: "09:00 AM - 05:00 PM",
      venue: event.venue,
      dressCode: dressCode,
      spotsLeft: headcount,
      escrowLocked: true,
      urgency: "HIGH",
      verifiedRequired: requireGovtId || requirePoliceClearance,
      requireGovtId,
      requirePoliceClearance
    };

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await onCreateShift(newShift, totalCalculatedEscrow);
      if (!result?.success) throw new Error('The shift was not saved. Please try again.');
      onClose();
    } catch (error) {
      setSubmitError(error.message || 'The shift was not saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <Plus size={18} />
            </div>
            <div>
              <h3>Publish Shift & Lock Escrow Vault</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Target: {event.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Role Category / Title
              </label>
              <select 
                value={roleTitle} 
                onChange={e => setRoleTitle(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="VIP Hospitality Host">VIP Hospitality Host & Protocol</option>
                <option value="Chief Bouncer & Crowd Control">Chief Bouncer & Crowd Control</option>
                <option value="Lead AV & Stage Lighting Technician">Lead AV & Stage Lighting Technician</option>
                <option value="Master Mixologist / Flair Bartender">Master Mixologist / Flair Bartender</option>
                <option value="Delegate Registration & Accreditation Lead">Delegate Registration & Accreditation Lead</option>
                <option value="Paramedic & Emergency First Aider">Paramedic & Emergency First Aider</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Headcount Needed
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="50" 
                  value={headcount} 
                  onChange={e => setHeadcount(parseInt(e.target.value) || 1)} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Shift Duration (Hrs)
                </label>
                <input 
                  type="number" 
                  min="2" 
                  max="24" 
                  value={durationHours} 
                  onChange={e => setDurationHours(parseInt(e.target.value) || 1)} 
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Rate (₹ / hr)
                </label>
                <input 
                  type="number" 
                  min="300" 
                  step="50" 
                  value={hourlyRate} 
                  onChange={e => setHourlyRate(parseInt(e.target.value) || 300)} 
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Dress Code & Equipment Requirements
              </label>
              <input 
                type="text" 
                value={dressCode} 
                onChange={e => setDressCode(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>

            {/* Credential gates */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mandatory Trust Gate Requirements
              </span>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={requireGovtId} 
                    onChange={e => setRequireGovtId(e.target.checked)} 
                  />
                  <span>Govt DigiLocker KYC Verified</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={requirePoliceClearance} 
                    onChange={e => setRequirePoliceClearance(e.target.checked)} 
                  />
                  <span>Police Clearance Certificate</span>
                </label>
              </div>
            </div>

            {/* Escrow deposit auto calculation box */}
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Calculated Escrow Deposit
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {headcount} staff × {durationHours} hrs × ₹{hourlyRate}/hr
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.45rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#FFF' }}>
                  ₹{totalCalculatedEscrow.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <Lock size={11} />
                  <span>100% Escrow Protected</span>
                </div>
              </div>
            </div>

            {submitError && <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.78rem' }}>{submitError}</p>}

          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Lock size={15} />
              <span>{isSubmitting ? 'Saving shift...' : 'Pre-fund Escrow & Publish Shift'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
