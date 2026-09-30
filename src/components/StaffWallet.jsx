import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  Download, 
  Clock, 
  CreditCard, 
  Building, 
  Zap,
  QrCode,
  Receipt,
  ArrowLeftRight,
  Plus
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

export default function StaffWallet({ userProfile, staffId = userProfile.id, staffList = [], onWalletBalanceChange, onWithdrawSuccess, onOpenPayment }) {
  const { showToast } = useToast();
  const [walletBalance, setWalletBalance] = useState(Number(userProfile.walletBalance || 0));
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(walletBalance);
  const [upiId, setUpiId] = useState('arjun.devgan@okaxis');
  const [demoFundAmount, setDemoFundAmount] = useState('10000');
  const [funding, setFunding] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [recipientStaffId, setRecipientStaffId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [walletError, setWalletError] = useState('');

  const otherStaff = staffList.filter(staff => staff.id !== staffId);

  useEffect(() => {
    let active = true;
    api.getWalletSummary(staffId).then(summary => {
      if (!active) return;
      const balance = Number(summary.balance || 0);
      setWalletBalance(balance);
      setWalletTransactions(summary.transactions || []);
      onWalletBalanceChange?.(balance);
    }).catch(error => {
      if (active) setWalletError(error.message || 'Could not load the demo wallet.');
    });
    return () => { active = false; };
  }, [staffId, onWalletBalanceChange]);

  const handleAddDemoFunds = async () => {
    const amount = Number(demoFundAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
      setWalletError('Enter an amount from ₹1 to ₹50,000.');
      return;
    }
    setFunding(true);
    setWalletError('');
    try {
      const result = await api.addDemoWalletFunds(staffId, amount);
      setWalletBalance(Number(result.balance));
      onWalletBalanceChange?.(Number(result.balance));
      const summary = await api.getWalletSummary(staffId);
      setWalletTransactions(summary.transactions || []);
      showToast({ type: 'success', title: 'Demo funds added', message: `₹${amount.toLocaleString('en-IN')} fake money was added to your test wallet.` });
    } catch (error) {
      setWalletError(error.message || 'Could not add demo funds.');
    } finally {
      setFunding(false);
    }
  };

  const handleStaffTransfer = async (e) => {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!recipientStaffId || !Number.isFinite(amount) || amount <= 0 || amount > walletBalance) {
      setWalletError('Choose a staff member and enter an amount within your balance.');
      return;
    }
    setTransferring(true);
    setWalletError('');
    try {
      const result = await api.transferWalletFunds(staffId, recipientStaffId, amount, transferNote);
      setWalletBalance(Number(result.sender_balance));
      onWalletBalanceChange?.(Number(result.sender_balance));
      setWalletTransactions(previous => [result.transaction, ...previous]);
      setTransferModalOpen(false);
      setTransferAmount('');
      setTransferNote('');
      showToast({
        type: 'success',
        title: 'Demo transfer complete',
        message: `₹${amount.toLocaleString('en-IN')} fake money sent to ${otherStaff.find(staff => staff.id === recipientStaffId)?.name || 'staff member'}.`
      });
    } catch (error) {
      setWalletError(error.message || 'Transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (withdrawAmount <= 0 || withdrawAmount > walletBalance) {
      showToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid withdrawal amount within your available balance.'
      });
      return;
    }

    setFunding(true);
    try {
      const result = await api.withdrawDemoWalletFunds(staffId, Number(withdrawAmount), upiId);
      setWalletBalance(Number(result.balance));
      onWalletBalanceChange?.(Number(result.balance));
      const summary = await api.getWalletSummary(staffId);
      setWalletTransactions(summary.transactions || []);
      setWithdrawModalOpen(false);
      showToast({
        type: 'success',
        title: 'Demo withdrawal complete',
        message: `₹${Number(withdrawAmount).toLocaleString('en-IN')} fake money was removed from the test wallet. No bank payment was made.`
      });
      if (onWithdrawSuccess) onWithdrawSuccess(Number(withdrawAmount));
    } catch (error) {
      setWalletError(error.message || 'Could not complete demo withdrawal.');
    } finally {
      setFunding(false);
    }
  };

  return (
    <div>
      {/* Wallet Metric Cards */}
      <div className="metric-grid-4">
        <div className="metric-card glass-panel success">
          <div className="metric-header">
            <span className="metric-title">Available for Transfer</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-success)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ fontFamily: 'var(--font-mono)' }}>
            ₹{walletBalance.toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button 
              id="btn-instant-withdraw"
              className="btn-success"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={() => {
                setWithdrawAmount(walletBalance);
                setWithdrawModalOpen(true);
              }}
              disabled={walletBalance <= 0}
            >
              <Zap size={14} />
              <span>Simulate withdrawal</span>
            </button>

            <button 
              id="btn-staff-qr"
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
              onClick={() => onOpenPayment && onOpenPayment({
                title: `Shift Payout - Dynamic UPI QR`,
                recipientName: userProfile.name,
                recipientUpi: upiId,
                payerName: 'Nexus Event Technologies Pvt Ltd',
                amount: walletBalance > 0 ? walletBalance : 5700,
                role: userProfile.title,
                hoursLogged: 8,
                hourlyRate: 750,
                eventName: 'Bangalore Tech Summit 2026'
              })}
            >
              <QrCode size={14} />
              <span>View payout QR</span>
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Demo ₹
              <input
                aria-label="Demo funds amount"
                type="number"
                min="1"
                max="50000"
                step="100"
                value={demoFundAmount}
                onChange={event => setDemoFundAmount(event.target.value)}
                style={{ width: '92px', padding: '6px 8px' }}
              />
            </label>

            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '6px 10px', fontSize: '0.76rem' }}
              onClick={handleAddDemoFunds}
              disabled={funding}
            >
              <Plus size={13} />
              <span>{funding ? 'Adding...' : 'Add fake funds'}</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              style={{ padding: '6px 10px', fontSize: '0.76rem' }}
              onClick={() => {
                setWalletError('');
                setRecipientStaffId(otherStaff[0]?.id || '');
                setTransferModalOpen(true);
              }}
              disabled={!otherStaff.length || walletBalance <= 0}
            >
              <ArrowLeftRight size={13} />
              <span>Send demo money</span>
            </button>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '8px' }}>Test money only. No real bank or UPI transfer is made.</div>
          {walletError && <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.74rem', marginTop: '8px' }}>{walletError}</p>}
        </div>

        <div className="metric-card glass-panel warning">
          <div className="metric-header">
            <span className="metric-title">Locked in Escrow</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-warning)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ fontFamily: 'var(--font-mono)', color: '#FBBF24' }}>
            ₹{userProfile.pendingEscrow.toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext">
            <span>Releases immediately at shift end</span>
          </div>
        </div>

        <div className="metric-card glass-panel cyan">
          <div className="metric-header">
            <span className="metric-title">Lifetime Career Earnings</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-cyan)' }}>
              <Building size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ fontFamily: 'var(--font-mono)' }}>
            ₹{userProfile.lifetimeEarnings.toLocaleString('en-IN')}
          </div>
          <div className="metric-subtext">
            <span>Across {userProfile.shiftsCompleted} verified event shifts</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span className="metric-title">Linked Payout Rails</span>
            <div className="metric-icon-box" style={{ color: 'var(--accent-primary)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '4px' }}>
            HDFC Bank & UPI
          </div>
          <div className="metric-subtext">
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{upiId}</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem' }}>Demo money activity</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Fake funds and staff-to-staff transfers saved to your demo wallet.</p>
        </div>
        {walletTransactions.length ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {walletTransactions.slice(0, 8).map(transaction => {
              const incoming = transaction.recipient_staff_id === staffId;
              const isTopUp = transaction.transaction_type === 'DEMO_TOP_UP';
              const staffName = staffList.find(staff => staff.id === (incoming ? transaction.sender_staff_id : transaction.recipient_staff_id))?.name;
              const description = isTopUp
                ? 'Demo funds added'
                : incoming ? `Received from ${staffName || 'staff member'}` : `Sent to ${staffName || 'staff member'}`;
              const amountPrefix = isTopUp || incoming ? '+' : '-';
              return (
                <div key={transaction.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>{description}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {transaction.note || transaction.status} · {new Date(transaction.created_at).toLocaleString()}
                    </div>
                  </div>
                  <strong style={{ color: amountPrefix === '+' ? 'var(--accent-success)' : '#FDA4AF', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {amountPrefix}₹{Number(transaction.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No demo money activity yet.</p>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Direct Escrow Disbursal Ledger</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Automated smart contract releases upon biometric supervisor sign-off
            </p>
          </div>

          <button 
            className="btn-ghost" 
            style={{ fontSize: '0.78rem' }}
            onClick={() => showToast({
              type: 'info',
              title: 'Generating Tax Invoices',
              message: 'Compiling digitally-signed GST Invoices and TDS summary for financial year...'
            })}
          >
            <Download size={14} />
            <span>Download Tax Invoices</span>
          </button>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Event & Organizer</th>
              <th>Shift Role</th>
              <th>Hours Verified</th>
              <th>Net Disbursed</th>
              <th>Settlement Rail</th>
              <th>Status</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>Bangalore Tech Summit 2026</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nexus Event Tech Pvt Ltd</div>
              </td>
              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>VIP Hospitality Lead</td>
              <td>8.0 hrs</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-success)' }}>₹5,700</td>
              <td>UPI / IMPS (0s)</td>
              <td><span className="badge-status disbursed">SETTLED</span></td>
              <td>
                <button 
                  className="btn-ghost" 
                  style={{ padding: '4px 8px', fontSize: '0.74rem', gap: '4px' }} 
                  onClick={() => onOpenPayment && onOpenPayment({
                    showReceiptOnly: true,
                    alreadyPaid: true,
                    title: 'Bangalore Tech Summit 2026 - VIP Hospitality Lead',
                    recipientName: userProfile.name,
                    recipientUpi: upiId,
                    payerName: 'Nexus Event Tech Pvt Ltd',
                    amount: 5700,
                    role: 'VIP Hospitality Lead',
                    hoursLogged: 8,
                    hourlyRate: 712.5,
                    eventName: 'Bangalore Tech Summit 2026',
                    invoiceNo: 'CP-9102',
                    txnId: 'TXN-UPI-9821873B'
                  })}
                >
                  <Receipt size={12} />
                  <span>Invoice #CP-9102</span>
                </button>
              </td>
            </tr>

            <tr>
              <td>
                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>A.R. Rahman Live in Concert</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>LiveNation India</div>
              </td>
              <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Stage Floor Coordinator</td>
              <td>10.0 hrs</td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-success)' }}>₹7,125</td>
              <td>Direct Bank Transfer</td>
              <td><span className="badge-status disbursed">SETTLED</span></td>
              <td>
                <button 
                  className="btn-ghost" 
                  style={{ padding: '4px 8px', fontSize: '0.74rem', gap: '4px' }} 
                  onClick={() => onOpenPayment && onOpenPayment({
                    showReceiptOnly: true,
                    alreadyPaid: true,
                    title: 'A.R. Rahman Live in Concert - Stage Floor Coordinator',
                    recipientName: userProfile.name,
                    recipientUpi: upiId,
                    payerName: 'LiveNation India Pvt Ltd',
                    amount: 7125,
                    role: 'Stage Floor Coordinator',
                    hoursLogged: 10,
                    hourlyRate: 712.5,
                    eventName: 'A.R. Rahman Live in Concert',
                    invoiceNo: 'CP-8844',
                    txnId: 'TXN-UPI-6721094F'
                  })}
                >
                  <Receipt size={12} />
                  <span>Invoice #CP-8844</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {transferModalOpen && (
        <div className="modal-overlay" onClick={() => setTransferModalOpen(false)}>
          <div className="modal-dialog" onClick={event => event.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <h3>Send demo money</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>This transfer only moves fake money inside CrewPulse.</p>
              </div>
              <button type="button" onClick={() => setTransferModalOpen(false)} aria-label="Close transfer form" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleStaffTransfer}>
              <div className="modal-body" style={{ display: 'grid', gap: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Send to crew member
                  <select value={recipientStaffId} onChange={event => setRecipientStaffId(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px' }} required>
                    <option value="">Choose staff</option>
                    {otherStaff.map(staff => <option key={staff.id} value={staff.id}>{staff.name} - {staff.role}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Amount (₹)
                  <input type="number" min="1" step="0.01" max={walletBalance} value={transferAmount} onChange={event => setTransferAmount(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px' }} required />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Available: ₹{walletBalance.toLocaleString('en-IN')}</span>
                </label>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Note (optional)
                  <input value={transferNote} onChange={event => setTransferNote(event.target.value)} maxLength={120} placeholder="For travel or meal costs" style={{ display: 'block', width: '100%', marginTop: '6px' }} />
                </label>
                {walletError && <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.76rem' }}>{walletError}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={transferring || !recipientStaffId || Number(transferAmount) <= 0 || Number(transferAmount) > walletBalance}>
                  {transferring ? 'Sending...' : 'Send demo money'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {withdrawModalOpen && (
        <div className="modal-overlay" onClick={() => setWithdrawModalOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Demo wallet withdrawal</h3>
              <button onClick={() => setWithdrawModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <form onSubmit={handleWithdraw}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Demo amount (₹)
                  </label>
                  <input 
                    type="number" 
                    max={walletBalance} 
                    min="100" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(parseInt(e.target.value) || 0)} 
                    style={{ width: '100%', fontSize: '1.2rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Available: ₹{walletBalance.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Recipient UPI ID / Bank VPA
                  </label>
                  <input 
                    type="text" 
                    value={upiId} 
                    onChange={e => setUpiId(e.target.value)} 
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '12px', borderRadius: '8px', fontSize: '0.78rem', color: '#FDE68A' }}>
                  Demo only. This changes your test wallet balance; it does not send money to a bank or UPI ID.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setWithdrawModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-success" disabled={funding}>{funding ? 'Processing...' : `Simulate ₹${Number(withdrawAmount).toLocaleString('en-IN')} withdrawal`}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
