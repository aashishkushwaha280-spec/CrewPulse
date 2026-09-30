import React, { useState } from 'react';
import { 
  Briefcase, 
  UserCheck, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Building, 
  ArrowRight, 
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import CrewPulseLogo from './CrewPulseLogo';

export default function AuthScreen({ onLoginSuccess }) {
  const { showToast } = useToast();
  const [authRole, setAuthRole] = useState('ORGANIZER'); // 'ORGANIZER' | 'STAFF'
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [roleCategory, setRoleCategory] = useState('Hospitality & Ushering');
  const [eventCategory, setEventCategory] = useState('Tech Conferences & Summits');
  const [digiLockerVerified, setDigiLockerVerified] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showToast({ type: 'warning', title: 'Missing details', message: 'Enter your email and password.' });
      return;
    }
    if (isSignUp && !name.trim()) {
      showToast({ type: 'warning', title: 'Name required', message: 'Enter your name to create an account.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: isSignUp ? name : undefined,
        email,
        password,
        role: authRole,
        title: isSignUp ? (authRole === 'ORGANIZER' ? 'Event Operations Lead' : roleCategory) : undefined,
        organization: isSignUp ? (authRole === 'ORGANIZER' ? organization || 'Global Event Enterprises' : 'Independent Event Professional') : undefined,
        phone: isSignUp ? phone || '+91 98450 12345' : undefined
      };
      const user = isSignUp ? await api.register(payload) : await api.login(email, password, authRole);
      onLoginSuccess(user);
      showToast({
        type: 'success',
        title: isSignUp ? 'Account created' : 'Welcome back',
        message: isSignUp ? `${user.name} is ready to use CrewPulse.` : `${user.name} signed in successfully.`
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: isSignUp ? 'Registration failed' : 'Sign-in failed',
        message: error.message || 'Unable to sign in right now.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <CrewPulseLogo />

      <div className="auth-card glass-panel">
          <div className="auth-intro">
            <span className="auth-eyebrow">SECURE WORKSPACE ACCESS</span>
            <h2>{isSignUp ? 'Create your account' : 'Choose your sign-in'}</h2>
            <p>Select the account type you use for CrewPulse.</p>
          </div>

          <div className="auth-role-grid" role="group" aria-label="Choose account type">
            <button
              id="auth-role-organizer"
              type="button"
              className={`auth-role-card ${authRole === 'ORGANIZER' ? 'selected organizer' : ''}`}
              aria-pressed={authRole === 'ORGANIZER'}
              onClick={() => setAuthRole('ORGANIZER')}
            >
              <span className="auth-role-icon organizer"><Briefcase size={18} /></span>
              <span className="auth-role-copy">
                <strong>Event Organizer</strong>
                <small>Manage events, staff, and payouts</small>
              </span>
              <span className="auth-role-indicator" />
            </button>

            <button
              id="auth-role-staff"
              type="button"
              className={`auth-role-card ${authRole === 'STAFF' ? 'selected staff' : ''}`}
              aria-pressed={authRole === 'STAFF'}
              onClick={() => setAuthRole('STAFF')}
            >
              <span className="auth-role-icon staff"><UserCheck size={18} /></span>
              <span className="auth-role-copy">
                <strong>Staff Login</strong>
                <small>Find shifts, check in, and track pay</small>
              </span>
              <span className="auth-role-indicator" />
            </button>
          </div>

          <section className={`auth-form-section ${authRole === 'STAFF' ? 'staff' : 'organizer'}`}>
            <div className="auth-form-heading">
              <div>
                <h3>{authRole === 'ORGANIZER' ? 'Organizer sign in' : 'Staff sign in'}</h3>
                <p>{authRole === 'ORGANIZER' ? 'Open your event operations workspace.' : 'Open your crew shifts and attendance.'}</p>
              </div>
              <button
                type="button"
                className="auth-mode-toggle"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Sign in instead' : 'Create account'}
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
            
              {/* Sign Up Specific Fields */}
              {isSignUp && (
                <>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      {authRole === 'ORGANIZER' ? 'Contact Person Full Name' : 'Full Legal Name (as on ID)'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        placeholder={authRole === 'ORGANIZER' ? 'e.g. Vikramaditya Roy' : 'e.g. Arjun Devgan'}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ width: '100%', paddingLeft: '36px' }}
                        required
                      />
                    </div>
                  </div>

                  {authRole === 'ORGANIZER' ? (
                    <>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                          Organization / Agency Name
                        </label>
                        <div style={{ position: 'relative' }}>
                          <Building size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                          <input 
                            type="text" 
                            placeholder="e.g. Nexus Event Tech Pvt Ltd"
                            value={organization}
                            onChange={e => setOrganization(e.target.value)}
                            style={{ width: '100%', paddingLeft: '36px' }}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                          Primary Event Category
                        </label>
                        <select 
                          value={eventCategory} 
                          onChange={e => setEventCategory(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="Tech Conferences & Summits">Tech Conferences & Summits</option>
                          <option value="EDM & Live Concert Festivals">EDM & Live Concert Festivals</option>
                          <option value="Destination Luxury Weddings">Destination Luxury Weddings</option>
                          <option value="Corporate Expos & Trade Shows">Corporate Expos & Trade Shows</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                          Primary Professional Role
                        </label>
                        <select 
                          value={roleCategory} 
                          onChange={e => setRoleCategory(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="Hospitality & Ushering">VIP Hospitality & Ushering</option>
                          <option value="Security & Safety">Security & Crowd Control Lead</option>
                          <option value="Audio/Visual & Stage Tech">AV, Lighting & Sound Technician</option>
                          <option value="Bar & Catering">Mixologist & Craft Bartender</option>
                          <option value="Stage & Production">Stage Manager & Floor Lead</option>
                          <option value="Paramedic & Safety">Emergency Paramedic / First Aider</option>
                        </select>
                      </div>

                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px', borderRadius: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#A7F3D0' }}>
                          <input 
                            type="checkbox" 
                            checked={digiLockerVerified} 
                            onChange={e => setDigiLockerVerified(e.target.checked)} 
                          />
                          <span>Connect DigiLocker Govt ID (Instant KYC Badge)</span>
                        </label>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '24px' }}>
                          Pre-approves Tier-1 high-paying VIP shifts (₹800+/shift).
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                      Mobile Number (with OTP Verification)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input 
                        type="tel" 
                        placeholder="+91 98450 12345"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ width: '100%', paddingLeft: '36px' }}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                  {authRole === 'ORGANIZER' ? 'Work email' : 'Staff email'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="email" 
                    placeholder={authRole === 'ORGANIZER' ? 'lead@agency.com' : 'you@domain.com'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px', paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', color: 'var(--text-muted)', padding: '0' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="auth-demo-row">
                  <span>Demo access</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (authRole === 'ORGANIZER') {
                        setEmail('vikram@nexusevents.com');
                        setPassword('nexus123');
                      } else {
                        setEmail('aarav.sharma@crewpulse.in');
                        setPassword('crew123');
                      }
                    }}
                  >
                    Fill sample login
                  </button>
                </div>
              )}

              <button 
                id="auth-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className={authRole === 'ORGANIZER' ? 'btn-primary' : 'btn-success'}
                style={{ width: '100%', padding: '13px', fontSize: '0.92rem', justifyContent: 'center', marginTop: '4px', opacity: isSubmitting ? 0.75 : 1, cursor: isSubmitting ? 'wait' : 'pointer' }}
              >
                <span>
                  {isSubmitting
                    ? 'Signing in...'
                    : (isSignUp
                      ? (authRole === 'ORGANIZER' ? 'Create organizer account' : 'Create staff account')
                      : (authRole === 'ORGANIZER' ? 'Sign in as organizer' : 'Sign in as staff'))}
                </span>
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </form>
          </section>

          <div className="auth-security-note">
            <ShieldCheck size={15} />
            <span>Secure access for your CrewPulse workspace</span>
          </div>
        </div>

        <p className="auth-page-footer">CrewPulse · Event operations platform</p>
      </main>
    );
}
