import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';

const formatTimestamp = (timestamp) => {
  const parsed = new Date(`${timestamp.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function EventChatModal({ isOpen, onClose, event, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadedEventId, setLoadedEventId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef(null);
  const lastMessageIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !event?.id) return undefined;

    let active = true;
    lastMessageIdRef.current = 0;

    const loadMessages = async () => {
      try {
        const newMessages = await api.getChatMessages(event.id, lastMessageIdRef.current);
        if (!active) return;
        if (newMessages.length) {
          lastMessageIdRef.current = Math.max(
            lastMessageIdRef.current,
            ...newMessages.map(message => message.id)
          );
          setMessages(previous => {
            const existingIds = new Set(previous.map(message => message.id));
            return [...previous, ...newMessages.filter(message => !existingIds.has(message.id))];
          });
        }
        setError('');
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load event messages.');
      } finally {
        if (active) setLoadedEventId(event.id);
      }
    };

    loadMessages();
    const intervalId = window.setInterval(loadMessages, 3000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [event?.id, isOpen]);

  const loading = loadedEventId !== event?.id;
  const eventMessages = messages.filter(message => message.event_id === event?.id);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;

    setSending(true);
    setError('');
    try {
      const savedMessage = await api.sendChatMessage(event.id, {
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message
      });
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, savedMessage.id);
      setMessages(previous => previous.some(item => item.id === savedMessage.id)
        ? previous
        : [...previous, savedMessage]);
      setDraft('');
    } catch (sendError) {
      setError(sendError.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-dialog event-chat-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-chat-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageCircle size={20} style={{ color: 'var(--accent-success)' }} />
            <div>
              <h3 id="event-chat-title">Event Chat</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '3px' }}>
                {event?.name} · Organizer and staff
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close event chat" title="Close chat">
            <X size={18} />
          </button>
        </header>

        <div className="event-chat-messages" ref={messagesRef} aria-live="polite">
          {loading && eventMessages.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>Loading messages...</p>
          )}
          {!loading && eventMessages.length === 0 && !error && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
              No messages yet. Start the event conversation.
            </p>
          )}
          {eventMessages.map(message => {
            const isMine = message.sender_id === currentUser.id;
            return (
              <article key={message.id} className={`event-chat-message${isMine ? ' mine' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '0.78rem' }}>
                    {isMine ? 'You' : message.sender_name}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> · {message.sender_role === 'ORGANIZER' ? 'Organizer' : 'Staff'}</span>
                  </strong>
                  <time style={{ color: 'var(--text-muted)', fontSize: '0.68rem', flexShrink: 0 }}>
                    {formatTimestamp(message.created_at)}
                  </time>
                </div>
                <p style={{ fontSize: '0.86rem', whiteSpace: 'pre-wrap' }}>{message.message}</p>
              </article>
            );
          })}
        </div>

        {error && <p role="alert" style={{ color: 'var(--accent-danger)', padding: '0 20px 8px', fontSize: '0.78rem' }}>{error}</p>}

        <form className="event-chat-composer" onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write a message..."
            maxLength={2000}
            aria-label="Message"
            disabled={sending}
          />
          <button className="btn-primary" type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
            <Send size={16} />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}