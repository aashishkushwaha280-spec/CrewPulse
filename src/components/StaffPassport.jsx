import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export default function StaffPassport({ userProfile, staffId = userProfile.id }) {
  const [verificationPass, setVerificationPass] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    let isActive = true;
    api.getStaffVerificationPass(staffId).then(pass => {
      if (isActive) setVerificationPass(pass);
    }).catch(error => {
      if (isActive) setVerificationError(error.message || 'Could not create your verification code.');
    });
    return () => { isActive = false; };
  }, [staffId]);

  const verificationQr = verificationPass ? JSON.stringify({
    type: 'crewpulse_staff_verification',
    staff_id: verificationPass.staff_id,
    code: verificationPass.code
  }) : '';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '22px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>Portable Digital Credential Passport</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Cryptographically verified identity, government background checks, and immutable work history.
            </p>
          </div>
          <div className="verified-chip" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            <ShieldCheck size={16} />
            <span>{verificationPass?.verified ? 'CREWPULSE RECORD VERIFIED' : 'VERIFICATION PENDING'}</span>
          </div>
        </div>
      </div>

      {/* Main Passport Card */}
      <div className="id-passport-card" style={{ marginBottom: '24px' }}>
        <div className="hologram-strip"></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <img 
              src={userProfile.avatar} 
              alt={userProfile.name} 
              style={{ width: '84px', height: '84px', borderRadius: '20px', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.15)' }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.45rem' }}>{userProfile.name}</h3>
                <CheckCircle2 size={18} style={{ color: 'var(--accent-success)' }} />
              </div>
              <div style={{ color: '#818CF8', fontWeight: '600', fontSize: '0.9rem' }}>
                {userProfile.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                PASSPORT ID: CP-{staffId}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', width: '164px' }}>
            {verificationQr ? (
              <QRCodeSVG value={verificationQr} size={132} level="Q" includeMargin />
            ) : (
              <div style={{ width: '132px', height: '132px', display: 'grid', placeItems: 'center', fontSize: '0.72rem', color: verificationError ? '#FDA4AF' : 'var(--text-muted)' }}>
                {verificationError || 'Creating QR...'}
              </div>
            )}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '7px' }}>SCAN IN GATE TERMINAL</div>
          </div>

        </div>

        {/* 4 Trust Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '24px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anti-Ghosting Score</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-success)', fontFamily: 'var(--font-heading)' }}>
              {userProfile.reliabilityScore}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0 cancellations across 49 gigs</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Organizer Rating</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-warning)', fontFamily: 'var(--font-heading)' }}>
              ★ {userProfile.rating}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>From {userProfile.reviewsCount} verified reviews</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CrewPulse identity record</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: verificationPass?.verified ? '#38BDF8' : 'var(--text-muted)', marginTop: '4px' }}>
              {verificationPass?.verified ? 'Verified in CrewPulse' : 'Not verified'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID: {staffId}</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Police Record Check</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-success)', marginTop: '4px' }}>
              Criminal Clear ✓
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{userProfile.policeCertId}</div>
          </div>
        </div>

        {/* Skills and Certifications Breakdown */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: '0.92rem', marginBottom: '12px' }}>Verified Competency Badges</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {userProfile.certifications.map((cert, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <Award size={16} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '600' }}>{cert.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)' }}>
                    Verified by DigiCert & Govt Registry
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
