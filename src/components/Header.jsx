import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  UserCheck, 
  Bell, 
  MessageCircle,
  Layers,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import CrewPulseLogo from './CrewPulseLogo';

const notificationColors = {
  attendance: '#10B981',
  chat: '#38BDF8',
  escrow: '#F59E0B',
  payment: '#818CF8',
  shift: '#A78BFA',
  info: '#94A3B8'
};

const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function Header({ 
  currentUser,
  activeRole, 
  setActiveRole, 
  onLogout,
  events,
  selectedEventId,
  setSelectedEventId,
  onOpenChat
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationError, setNotificationError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const seenStorageKey = `crewpulse_notifications_seen_${currentUser?.id || 'guest'}`;
  const [lastSeenId, setLastSeenId] = useState(() => Number(localStorage.getItem(seenStorageKey)) || 0);
  const unreadCount = notifications.filter(notification => notification.id > lastSeenId).length;

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadNotifications = async () => {
      try {
        const rows = await api.getNotifications();
        if (isActive) {
          setNotifications(rows);
          setNotificationError('');
        }
      } catch (error) {
        if (isActive) setNotificationError(error.message || 'Could not load notifications.');
      } finally {
        if (isActive) setNotificationsLoading(false);
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 10000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  return (
    <>
      <header className="app-header">
        <CrewPulseLogo />

        {/* Role Switcher Pill Bar */}
        <div className="role-switch-container">
          <button 
            id="role-btn-organizer"
            className={`role-pill-btn ${activeRole === 'ORGANIZER' ? 'active-organizer' : ''}`}
            onClick={() => setActiveRole('ORGANIZER')}
          >
            <Briefcase size={16} />
            <span>Event Organizer</span>
          </button>

          <button 
            id="role-btn-staff"
            className={`role-pill-btn ${activeRole === 'STAFF' ? 'active-staff' : ''}`}
            onClick={() => setActiveRole('STAFF')}
          >
            <UserCheck size={16} />
            <span>Staff</span>
          </button>

        </div>

        {/* Action Buttons & User Profile Right */}
        <div className="header-actions">

          <button
            id="btn-open-event-chat"
            onClick={onOpenChat}
            title="Open event chat"
            aria-label="Open event chat"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '7px 9px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <MessageCircle size={16} />
          </button>

          {/* Interactive Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button
              id="btn-header-notifications"
              onClick={() => {
                const opening = !showNotifications;
                setShowNotifications(opening);
                setShowProfileMenu(false);
                if (opening) {
                  const newestId = notifications[0]?.id || lastSeenId;
                  setLastSeenId(newestId);
                  localStorage.setItem(seenStorageKey, String(newestId));
                }
              }}
              style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                borderRadius: '8px',
                padding: '7px 9px',
                color: showNotifications ? '#FFF' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--accent-danger)',
                    color: '#FFF',
                    fontSize: '0.62rem',
                    fontWeight: '800',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '120%',
                  width: 'min(360px, calc(100vw - 24px))',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  background: '#0E1321',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
                  padding: '12px',
                  zIndex: 70
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#FFF' }}>Notifications</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-success)', fontWeight: '600' }}>Live</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notificationsLoading && notifications.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', padding: '10px 4px' }}>Loading notifications...</p>
                  )}
                  {notificationError && (
                    <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '0.74rem', padding: '10px 4px' }}>{notificationError}</p>
                  )}
                  {!notificationsLoading && !notificationError && notifications.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', padding: '10px 4px' }}>No notifications yet.</p>
                  )}
                  {notifications.map(n => (
                    <div key={n.id} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '6px', borderLeft: `3px solid ${notificationColors[n.type] || notificationColors.info}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#FFF' }}>{n.title}</span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', flexShrink: 0 }}>{formatNotificationTime(n.created_at)}</span>
                      </div>
                      {n.event_name && <div style={{ fontSize: '0.66rem', color: 'var(--accent-primary)', marginTop: '3px' }}>{n.event_name}</div>}
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', overflowWrap: 'anywhere' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button 
                id="btn-user-profile-menu"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px 4px 6px',
                  color: 'var(--text-main)'
                }}
              >
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700' }}>
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: currentUser.role === 'ORGANIZER' ? '#818CF8' : '#34D399' }}>
                    {currentUser.role === 'ORGANIZER' ? 'Organizer' : 'Staff'}
                  </div>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '240px',
                  background: '#0E1321',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  padding: '12px',
                  zIndex: 60
                }}>
                  <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{currentUser.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{currentUser.email}</div>
                    {currentUser.organization && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', marginTop: '2px' }}>
                        {currentUser.organization}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => {
                        setActiveRole(currentUser.role === 'ORGANIZER' ? 'STAFF' : 'ORGANIZER');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '6px',
                        textAlign: 'left'
                      }}
                    >
                      <UserCheck size={14} />
                      <span>Switch to {currentUser.role === 'ORGANIZER' ? 'Staff' : 'Event Organizer'}</span>
                    </button>

                    <button
                      id="btn-sign-out"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(244, 63, 94, 0.1)',
                        color: '#FB7185',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '6px',
                        textAlign: 'left',
                        marginTop: '4px'
                      }}
                    >
                      <LogOut size={14} />
                      <span>Sign Out / Switch User</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              id="btn-header-login"
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              onClick={onLogout}
            >
              Sign In / Register
            </button>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '2px',
            padding: '6px 10px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-medium)',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
              <span className="ping-dot" style={{ width: '8px', height: '8px', minWidth: '8px' }}></span>
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          <div className="live-pulse-badge">
            <span className="ping-dot"></span>
            <span>SYSTEM LIVE</span>
          </div>
        </div>
      </header>

      {/* Sub Header / Contextual Bar */}
      <div className="sub-nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>Active Event:</span>
          </span>

          <select 
            id="event-selector-dropdown"
            className="event-picker-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {events.map(evt => (
              <option key={evt.id} value={evt.id}>
                {evt.name} — {evt.venue.split(',')[0]} ({evt.date})
              </option>
            ))}
          </select>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Shift: {currentEvent?.shiftHours}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Escrow Secured:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-success)', fontWeight: '700' }}>
              ₹{currentEvent?.escrowTotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>On-Site Staff:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#38BDF8', fontWeight: '700' }}>
              {currentEvent?.staffOnSite} / {currentEvent?.staffHired} Present
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
