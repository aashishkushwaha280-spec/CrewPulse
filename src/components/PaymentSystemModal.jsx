import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  QrCode, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Receipt, 
  Printer, 
  Copy, 
  Clock, 
  ArrowRight, 
  Zap, 
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function PaymentSystemModal({ 
  paymentData, 
  onClose,
  onPaymentSuccess
}) {
  const [data] = useState(() => ({
    title: paymentData?.title || 'Escrow Vault Fund Deposit',
    recipientName: paymentData?.recipientName || 'CrewPulse Escrow Trust (ICICI)',
    recipientUpi: paymentData?.recipientUpi || 'crewpulse.escrow@icici',
    payerName: paymentData?.payerName || 'Nexus Event Technologies Pvt Ltd',
    amount: paymentData?.amount || 25000,
    role: paymentData?.role || 'Shift & Escrow Funding',
    eventName: paymentData?.eventName || 'Bangalore Tech Summit 2026',
    hoursLogged: paymentData?.hoursLogged || 8,
    hourlyRate: paymentData?.hourlyRate || 750,
    invoiceNo: paymentData?.invoiceNo || `CP-INV-${Math.floor(100000 + Math.random() * 900000)}`,
    txnId: paymentData?.txnId || `TXN-UPI-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    ...paymentData
  }));

  const [activeTab, setActiveTab] = useState(data.showReceiptOnly ? 'RECEIPT' : 'UPI_QR'); // 'UPI_QR' | 'CARD' | 'NETBANKING' | 'RECEIPT'
  const [paymentStatus, setPaymentStatus] = useState(data.alreadyPaid ? 'SUCCESS' : 'PENDING'); // 'PENDING' | 'PROCESSING' | 'SUCCESS'
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 min timer
  const [copied, setCopied] = useState(false);
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [cardForm, setCardForm] = useState({
    number: '4532 •••• •••• 8821',
    holder: 'NEELAM RAO',
    expiry: '08/29',
    cvv: '•••'
  });

  const receiptRef = useRef(null);

  useEffect(() => {
    if (data.alreadyPaid) return;
    api.createPaymentOrder({
      amount: data.amount,
      title: data.title,
      recipient_name: data.recipientName,
      recipient_upi: data.recipientUpi,
      payer_name: data.payerName,
      event_id: data.eventId || 'evt-101',
      role: data.role
    }).then(setPaymentOrder).catch(error => setPaymentError(error.message));
  }, [data]);

  // 5-minute countdown for dynamic QR
  useEffect(() => {
    if (paymentStatus === 'SUCCESS') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentStatus]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate UPI Payment URI for QR code
  const upiUri = paymentOrder?.upi_uri || `upi://pay?pa=${encodeURIComponent(data.recipientUpi)}&pn=${encodeURIComponent(data.recipientName)}&am=${data.amount}&cu=INR&tn=${encodeURIComponent(data.title)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(data.recipientUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerPaymentSuccess = async () => {
    if (!paymentOrder?.order_id) {
      setPaymentError('Payment order is not ready. Check the backend connection and retry.');
      return;
    }
    setPaymentStatus('PROCESSING');
    try {
      const result = await api.simulatePaymentSuccess(paymentOrder.order_id);
      if (onPaymentSuccess) {
        const completed = await onPaymentSuccess({ ...data, orderId: paymentOrder.order_id, txnId: paymentOrder.txn_id, payment: result.order });
        if (completed === false) throw new Error('Payment was received, but the escrow update did not finish. Try again.');
      }
      setPaymentStatus('SUCCESS');
      // Auto open receipt after 1.2s
      setTimeout(() => {
        setActiveTab('RECEIPT');
      }, 1200);
    } catch (error) {
      setPaymentStatus('PENDING');
      setPaymentError(error.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Financial calculations
  const gross = data.amount;
  const gstRate = 0.18;
  const taxableAmount = Math.round(gross / (1 + gstRate));
  const gstAmount = gross - taxableAmount;
  const cgst = Math.round(gstAmount / 2);
  const sgst = gstAmount - cgst;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-dialog" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: activeTab === 'RECEIPT' ? '680px' : '560px',
          transition: 'all 0.3s ease',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-medium)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(16, 185, 129, 0.25))',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-subtle)'
            }}>
              {activeTab === 'RECEIPT' ? <Receipt size={18} /> : <Zap size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.01em', margin: 0 }}>
                {activeTab === 'RECEIPT' ? 'Official Tax Invoice & Bill Receipt' : 'CrewPulse Smart Payment Gateway'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                {activeTab === 'RECEIPT' 
                  ? 'IRN & GST Compliant Tamper-Proof Cryptographic Receipt' 
                  : 'NPCI UPI & Instant Escrow Settlement Rail (0s Latency)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid var(--border-subtle)', 
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation if not locked to receipt */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(10, 15, 26, 0.4)', padding: '4px 16px' }}>
          <button
            className={`tab-btn ${activeTab === 'UPI_QR' ? 'active' : ''}`}
            onClick={() => setActiveTab('UPI_QR')}
            style={{ padding: '10px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <QrCode size={14} />
            <span>Dynamic UPI QR</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'CARD' ? 'active' : ''}`}
            onClick={() => setActiveTab('CARD')}
            style={{ padding: '10px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CreditCard size={14} />
            <span>Cards & RuPay</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'NETBANKING' ? 'active' : ''}`}
            onClick={() => setActiveTab('NETBANKING')}
            style={{ padding: '10px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Building2 size={14} />
            <span>Net Banking</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'RECEIPT' ? 'active' : ''}`}
            onClick={() => setActiveTab('RECEIPT')}
            disabled={paymentStatus !== 'SUCCESS'}
            style={{ 
              padding: '10px 14px', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginLeft: 'auto',
              color: paymentStatus === 'SUCCESS' ? 'var(--accent-success)' : undefined
            }}
          >
            <Receipt size={14} />
            <span>Bill Receipt</span>
            {paymentStatus === 'SUCCESS' && (
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: 'var(--accent-success)',
                display: 'inline-block' 
              }} />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px' }}>
          {paymentError && <p role="alert" style={{ color: 'var(--accent-danger)', marginBottom: '12px' }}>{paymentError}</p>}
          
          {/* ======================= TAB 1: DYNAMIC UPI QR ======================= */}
          {activeTab === 'UPI_QR' && (
            <div>
              {/* Payment Summary Header */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.08))', 
                border: '1px solid rgba(99, 102, 241, 0.25)', 
                borderRadius: '12px', 
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment For
                  </span>
                  <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                    {data.title}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Beneficiary: <strong style={{ color: '#E2E8F0' }}>{data.recipientName}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Amount Due
                  </span>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--accent-success)', lineHeight: 1.1 }}>
                    ₹{data.amount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                    GST Inclusive
                  </div>
                </div>
              </div>

              {/* QR Code Container */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                background: 'rgba(14, 21, 35, 0.6)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '16px', 
                padding: '24px 20px',
                position: 'relative'
              }}>
                {/* Live Scanner Guide Overlay */}
                <div style={{ 
                  background: '#FFFFFF', 
                  padding: '16px', 
                  borderRadius: '14px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <QRCodeSVG 
                    value={upiUri} 
                    size={200}
                    level="H"
                    includeMargin={false}
                  />

                  {/* Dynamic Laser Scan Animation Effect */}
                  {paymentStatus === 'PENDING' && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent, #10B981, transparent)',
                      boxShadow: '0 0 12px #10B981',
                      animation: 'scanLine 2.4s ease-in-out infinite'
                    }} />
                  )}

                  {paymentStatus === 'PROCESSING' && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}>
                      <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: '0.75rem', color: '#FFF', fontWeight: '600' }}>Confirming UPI Rail...</span>
                    </div>
                  )}

                  {paymentStatus === 'SUCCESS' && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(16, 185, 129, 0.95)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      gap: '6px'
                    }}>
                      <CheckCircle2 size={44} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>Payment Received!</span>
                      <span style={{ fontSize: '0.72rem' }}>Redirecting to Bill...</span>
                    </div>
                  )}
                </div>

                {/* Expiry Countdown & Instructions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                  <Clock size={14} style={{ color: timeLeft < 60 ? 'var(--accent-danger)' : 'var(--accent-warning)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    QR expires in: <strong style={{ color: timeLeft < 60 ? 'var(--accent-danger)' : 'var(--accent-warning)', fontFamily: 'var(--font-mono)' }}>{formatTimer(timeLeft)}</strong>
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px', maxWidth: '380px' }}>
                  Scan with any UPI app on your phone to complete instant zero-fee settlement.
                </p>

                {/* Supported UPI Apps Badges */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
                  {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Cred', 'Navi'].map((app) => (
                    <span 
                      key={app} 
                      style={{ 
                        fontSize: '0.68rem', 
                        fontWeight: '600',
                        color: 'var(--text-secondary)', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--border-subtle)', 
                        padding: '3px 8px', 
                        borderRadius: '6px' 
                      }}
                    >
                      {app}
                    </span>
                  ))}
                </div>

                {/* Copy UPI ID Box */}
                <div style={{ 
                  marginTop: '16px', 
                  width: '100%', 
                  maxWidth: '380px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--border-medium)', 
                  borderRadius: '8px',
                  padding: '6px 10px'
                }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>UPI ID</div>
                    <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {data.recipientUpi}
                    </div>
                  </div>
                  <button 
                    onClick={handleCopyUpi}
                    className="btn-ghost"
                    style={{ padding: '6px 10px', fontSize: '0.72rem', gap: '4px' }}
                  >
                    {copied ? <Check size={12} style={{ color: 'var(--accent-success)' }} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  className="btn-ghost" 
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button 
                  id="btn-simulate-payment"
                  className="btn-success" 
                  style={{ flex: 2, justifyContent: 'center', fontSize: '0.86rem', gap: '6px' }}
                  onClick={triggerPaymentSuccess}
                  disabled={!paymentOrder || paymentStatus === 'PROCESSING' || paymentStatus === 'SUCCESS'}
                >
                  <Zap size={15} />
                  <span>{paymentStatus === 'SUCCESS' ? 'Settlement Confirmed ✓' : paymentOrder ? 'Simulate UPI App Approval' : 'Creating Payment Order...'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 2: CREDIT / DEBIT CARD ======================= */}
          {activeTab === 'CARD' && (
            <div>
              {/* Virtual Card Graphic */}
              <div style={{ 
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
                borderRadius: '16px',
                padding: '22px',
                color: '#FFF',
                marginBottom: '20px',
                boxShadow: '0 12px 30px rgba(67, 56, 202, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} style={{ color: '#A5B4FC' }} />
                    <span style={{ fontSize: '0.76rem', fontWeight: '700', letterSpacing: '0.08em', color: '#C7D2FE' }}>
                      CREWPULSE ESCROW VAULT CARD
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', fontStyle: 'italic' }}>RuPay Corporate</span>
                </div>

                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '1.25rem', 
                  letterSpacing: '0.12em', 
                  marginBottom: '20px',
                  color: '#F8FAFC' 
                }}>
                  {cardForm.number}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: '#A5B4FC', textTransform: 'uppercase' }}>Cardholder</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.04em' }}>{cardForm.holder}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.62rem', color: '#A5B4FC', textTransform: 'uppercase' }}>Expires</span>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{cardForm.expiry}</div>
                  </div>
                </div>
              </div>

              {/* Card Input Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Card Number
                  </label>
                  <input 
                    type="text" 
                    value={cardForm.number} 
                    onChange={e => setCardForm({ ...cardForm, number: e.target.value })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Name on Card
                    </label>
                    <input 
                      type="text" 
                      value={cardForm.holder} 
                      onChange={e => setCardForm({ ...cardForm, holder: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Expiry
                    </label>
                    <input 
                      type="text" 
                      value={cardForm.expiry} 
                      onChange={e => setCardForm({ ...cardForm, expiry: e.target.value })}
                      placeholder="MM/YY"
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      CVV
                    </label>
                    <input 
                      type="password" 
                      value={cardForm.cvv} 
                      onChange={e => setCardForm({ ...cardForm, cvv: e.target.value })}
                      maxLength={3}
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.75rem', color: '#C7D2FE', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} />
                  <span>Protected by 256-bit SSL encryption & RBI Mandate Tokenization</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, justifyContent: 'center', fontSize: '0.86rem' }}
                  onClick={triggerPaymentSuccess}
                  disabled={!paymentOrder || paymentStatus === 'PROCESSING' || paymentStatus === 'SUCCESS'}
                >
                  Pay ₹{data.amount.toLocaleString('en-IN')} via Card
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 3: NET BANKING ======================= */}
          {activeTab === 'NETBANKING' && (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Select your preferred bank to authorize direct Escrow clearing:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { code: 'HDFC', name: 'HDFC Bank' },
                  { code: 'ICICI', name: 'ICICI Bank' },
                  { code: 'SBI', name: 'State Bank' },
                  { code: 'AXIS', name: 'Axis Bank' },
                  { code: 'KOTAK', name: 'Kotak Bank' },
                  { code: 'YES', name: 'Yes Bank' }
                ].map((b) => (
                  <button
                    key={b.code}
                    onClick={() => setSelectedBank(b.code)}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '10px',
                      background: selectedBank === b.code ? 'rgba(99, 102, 241, 0.2)' : 'rgba(14, 21, 35, 0.6)',
                      border: selectedBank === b.code ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      color: selectedBank === b.code ? 'var(--text-main)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Building2 size={18} style={{ color: selectedBank === b.code ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: selectedBank === b.code ? '700' : '500' }}>
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px', borderRadius: '8px', fontSize: '0.76rem', color: '#A7F3D0' }}>
                ⚡ Direct Corporate Settlement: Zero gateway surcharges applied.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2, justifyContent: 'center', fontSize: '0.86rem' }}
                  onClick={triggerPaymentSuccess}
                  disabled={!paymentOrder || paymentStatus === 'PROCESSING' || paymentStatus === 'SUCCESS'}
                >
                  Proceed to {selectedBank} NetBanking
                </button>
              </div>
            </div>
          )}

          {/* ======================= TAB 4: OFFICIAL BILL RECEIPT / TAX INVOICE ======================= */}
          {activeTab === 'RECEIPT' && (
            <div ref={receiptRef}>
              {/* Receipt Printable Card */}
              <div 
                id="printable-bill-receipt"
                style={{ 
                  background: '#FFFFFF', 
                  color: '#0F172A', 
                  borderRadius: '12px', 
                  padding: '28px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  border: '1px solid #E2E8F0',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {/* Invoice Top Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '6px', 
                        background: '#4F46E5', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#FFF',
                        fontWeight: '800',
                        fontSize: '0.9rem'
                      }}>
                        ⚡
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', color: '#0F172A' }}>
                        CrewPulse
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                      CrewPulse Technologies Pvt. Ltd. • ICICI Escrow Trustee Rail<br />
                      GSTIN: <strong>29AAACC8291M1Z4</strong> • SAC: <strong>998513</strong> (Event Staffing & Escrow)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      background: '#ECFDF5', 
                      color: '#059669', 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.74rem', 
                      fontWeight: '800',
                      border: '1px solid #A7F3D0'
                    }}>
                      <CheckCircle2 size={12} />
                      TAX INVOICE / PAID
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#0F172A', marginTop: '6px', fontFamily: 'monospace' }}>
                      #{paymentOrder?.invoice_no || data.invoiceNo}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Billed To / From */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '16px 0', borderBottom: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>
                      Billed To (Client / Organizer)
                    </span>
                    <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '0.86rem', marginTop: '2px' }}>
                      {data.payerName}
                    </div>
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      Event: {data.eventName}<br />
                      Bangalore International Exhibition Centre (BIEC)
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>
                      Beneficiary / Service Provider
                    </span>
                    <div style={{ fontWeight: '800', color: '#0F172A', fontSize: '0.86rem', marginTop: '2px' }}>
                      {data.recipientName}
                    </div>
                    <div style={{ color: '#475569', marginTop: '2px' }}>
                      Role: {data.role}<br />
                      UPI VPA: <span style={{ fontFamily: 'monospace' }}>{data.recipientUpi}</span>
                    </div>
                  </div>
                </div>

                {/* Line Item Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '8px 10px', fontWeight: '700' }}>Item & Service Description</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700' }}>Hours / Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>Rate (₹)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px' }}>
                        <strong style={{ color: '#0F172A' }}>{data.title}</strong>
                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          Verified Geofenced Telemetry & Escrow Protection
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace' }}>
                        {data.hoursLogged} hrs
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{data.hourlyRate.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace', color: '#0F172A' }}>
                        ₹{taxableAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Total & Tax Breakdown */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '16px', paddingTop: '12px' }}>
                  {/* Embedded Receipt QR for Instant Verification */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      padding: '6px', 
                      background: '#F8FAFC', 
                      border: '1px solid #E2E8F0', 
                      borderRadius: '8px' 
                    }}>
                      <QRCodeSVG 
                        value={`https://crewpulse.app/verify/receipt?id=${paymentOrder?.invoice_no || data.invoiceNo}&hash=${paymentOrder?.txn_id || data.txnId}`}
                        size={64}
                        level="M"
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                      <strong style={{ color: '#0F172A', display: 'block' }}>Scan to Verify Authenticity</strong>
                      Hash: <span style={{ fontFamily: 'monospace', color: '#4F46E5' }}>{paymentOrder?.txn_id || data.txnId}</span><br />
                      RBI Escrow Directive PSS-19
                    </div>
                  </div>

                  {/* Calculations */}
                  <div style={{ minWidth: '220px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#64748B' }}>
                      <span>Taxable Value:</span>
                      <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>₹{taxableAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#64748B' }}>
                      <span>CGST (9%):</span>
                      <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>₹{cgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#64748B' }}>
                      <span>SGST (9%):</span>
                      <span style={{ fontFamily: 'monospace', color: '#0F172A' }}>₹{sgst.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '8px 0 4px 0', 
                      borderTop: '2px solid #0F172A', 
                      marginTop: '6px',
                      fontWeight: '800',
                      fontSize: '0.96rem',
                      color: '#0F172A'
                    }}>
                      <span>Total Paid:</span>
                      <span style={{ fontFamily: 'monospace', color: '#059669' }}>₹{gross.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Footer seal */}
                <div style={{ 
                  marginTop: '20px', 
                  paddingTop: '12px', 
                  borderTop: '1px dashed #CBD5E1', 
                  fontSize: '0.66rem', 
                  color: '#94A3B8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>This is a computer-generated tax invoice verified via cryptographic smart escrow. No physical signature required.</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>VERIFIED & SETTLED</span>
                </div>
              </div>

              {/* Action Buttons for Receipt */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  className="btn-ghost" 
                  style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
                  onClick={() => setActiveTab('UPI_QR')}
                >
                  <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                  <span>Payment Screen</span>
                </button>

                <button 
                  id="btn-print-receipt"
                  className="btn-primary" 
                  style={{ flex: 2, justifyContent: 'center', gap: '6px', fontSize: '0.86rem' }}
                  onClick={handlePrint}
                >
                  <Printer size={15} />
                  <span>Print / Save Tax Bill (PDF)</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
