import React, { useState } from 'react';
import { 
  Search, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Award, 
  Sparkles,
  ChevronRight,
  Briefcase
} from 'lucide-react';

export default function OrganizerTalentMarket({ 
  staffList, 
  onHireStaff, 
  selectedEvent,
  onOpenCreateShift
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyPoliceVerified, setOnlyPoliceVerified] = useState(false);
  const [selectedStaffForModal, setSelectedStaffForModal] = useState(null);

  const categories = [
    'ALL',
    'Hospitality & Ushering',
    'Security & Safety',
    'Audio/Visual & Stage Tech',
    'Bar & Catering',
    'Stage & Production'
  ];

  const filteredStaff = staffList.filter(s => {
    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.skills.some(sk => sk.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPolice = !onlyPoliceVerified || s.policeCleared;
    return matchesCategory && matchesSearch && matchesPolice;
  });

  return (
    <div>
      {/* Header and Controls */}
      <div className="glass-panel" style={{ padding: '22px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>Verified Talent Marketplace & AI Matcher</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Browse background-checked event professionals with transparent hourly rates and instant escrow lock
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              id="btn-post-custom-gig"
              className="btn-primary"
              onClick={onOpenCreateShift}
            >
              <Briefcase size={16} />
              <span>Post Custom Gig Request</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by name, skill (e.g. DMX Lighting, Mixology, Crowd Safety)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  background: selectedCategory === cat ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedCategory === cat ? '#FFF' : 'var(--text-secondary)',
                  border: '1px solid ' + (selectedCategory === cat ? 'var(--accent-primary)' : 'var(--border-subtle)')
                }}
              >
                {cat === 'ALL' ? 'All Roles' : cat}
              </button>
            ))}
          </div>

          {/* Toggle for Police Cleared Only */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
            <input 
              type="checkbox" 
              checked={onlyPoliceVerified} 
              onChange={e => setOnlyPoliceVerified(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Police Clearances Only</span>
          </label>
        </div>
      </div>

      {/* Talent Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredStaff.map((staff) => {
          const isHiredForThisEvent = staff.assignedEventId === selectedEvent.id;
          
          return (
            <div key={staff.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.25s', border: isHiredForThisEvent ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)' }}>
              
              <div>
                {/* Top header in card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <img 
                      src={staff.avatar} 
                      alt={staff.name} 
                      style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.1)' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '0.98rem' }}>{staff.name}</h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                        {staff.role}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={11} />
                        <span>{staff.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Compatibility Badge */}
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontFamily: 'var(--font-mono)', 
                    background: 'rgba(99, 102, 241, 0.15)', 
                    color: '#A5B4FC', 
                    border: '1px solid rgba(99, 102, 241, 0.3)', 
                    padding: '3px 8px', 
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Sparkles size={11} />
                    <span>98% Fit</span>
                  </span>
                </div>

                {/* Trust Verification Matrix */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {staff.verifiedGovtId && (
                    <span className="verified-chip">
                      <ShieldCheck size={11} />
                      <span>Govt ID Verified</span>
                    </span>
                  )}
                  {staff.policeCleared && (
                    <span className="police-chip">
                      <ShieldCheck size={11} />
                      <span>Police Clear</span>
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-warning)', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: '600' }}>
                    ★ {staff.rating} ({staff.reviewsCount})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: '600' }}>
                    {staff.reliabilityScore}% Reliability
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                  {staff.bio}
                </p>

                {/* Skills Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  {staff.skills.slice(0, 3).map((sk, i) => (
                    <span key={i} className="tooltip-tag">
                      {sk}
                    </span>
                  ))}
                  {staff.skills.length > 3 && (
                    <span className="tooltip-tag">+{staff.skills.length - 3} more</span>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer: Rate & Action */}
              <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Shift Rate</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--text-main)' }}>
                    ₹{staff.hourlyRate}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/hr</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-ghost" 
                    style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                    onClick={() => setSelectedStaffForModal(staff)}
                  >
                    Passport
                  </button>

                  {isHiredForThisEvent ? (
                    <button 
                      className="btn-success" 
                      style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                      disabled
                    >
                      <CheckCircle2 size={14} />
                      <span>Hired in Roster</span>
                    </button>
                  ) : (
                    <button 
                      className="btn-primary" 
                      style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                      onClick={() => onHireStaff(staff)}
                    >
                      <span>Lock & Escrow</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Staff Passport Details Modal */}
      {selectedStaffForModal && (
        <div className="modal-overlay" onClick={() => setSelectedStaffForModal(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3>Digital Credential Passport & Audit</h3>
              </div>
              <button 
                onClick={() => setSelectedStaffForModal(null)}
                style={{ background: 'transparent', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="id-passport-card">
                <div className="hologram-strip"></div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                  <img 
                    src={selectedStaffForModal.avatar} 
                    alt={selectedStaffForModal.name} 
                    style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover' }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.2rem' }}>{selectedStaffForModal.name}</h3>
                    <div style={{ color: '#818CF8', fontWeight: '600', fontSize: '0.85rem' }}>
                      {selectedStaffForModal.role}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      UID: CP-IND-{selectedStaffForModal.id.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.82rem', marginBottom: '18px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Govt Verification</div>
                    <div style={{ color: 'var(--accent-success)', fontWeight: '600' }}>DigiLocker Aadhaar KYC ✓</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Police Clearance</div>
                    <div style={{ color: '#38BDF8', fontWeight: '600' }}>Criminal Registry Clear ✓</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Reliability Score</div>
                    <div style={{ color: '#FBBF24', fontWeight: '700' }}>{selectedStaffForModal.reliabilityScore}% (Zero Ghosting)</div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Shifts Completed</div>
                    <div style={{ fontWeight: '700' }}>{selectedStaffForModal.shiftsCompleted} Gigs (4.95 Rating)</div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Verified Certifications</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedStaffForModal.certifications.map((cert, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <span style={{ fontWeight: '600' }}>{cert.name}</span>
                        <span style={{ color: 'var(--accent-success)' }}>{cert.issuer || cert.status} ({cert.year || '2025'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-primary" 
                onClick={() => {
                  onHireStaff(selectedStaffForModal);
                  setSelectedStaffForModal(null);
                }}
              >
                Hire Into Active Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
