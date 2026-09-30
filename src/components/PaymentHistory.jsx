import React, { startTransition, useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, RefreshCw, ReceiptText } from 'lucide-react';
import { api } from '../services/api';

const formatAmount = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatTime = value => {
  if (!value) return 'Date not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function PaymentHistory({ role, eventId, staffId, staffName, staffList = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (showLoading = false) => {
    if (showLoading) {
      startTransition(() => {
        setLoading(true);
        setError('');
      });
    }
    try {
      const [orders, escrowRows, walletSummary] = await Promise.all([
        api.getPaymentOrders(eventId),
        api.getEscrowTransactions(eventId),
        role === 'STAFF' ? api.getWalletSummary(staffId) : Promise.resolve({ transactions: [] })
      ]);

      const paymentRows = orders
        .filter(order => role !== 'STAFF' || String(order.recipient_name || '').toLowerCase() === String(staffName || '').toLowerCase())
        .map(order => ({
          id: `order-${order.order_id}`,
          source: 'Payment order',
          description: order.title || `Payment to ${order.recipient_name || 'recipient'}`,
          counterparty: role === 'ORGANIZER' ? order.recipient_name : order.payer_name,
          amount: Number(order.amount || 0),
          status: order.status || 'PENDING',
          reference: order.invoice_no || order.order_id,
          time: order.updated_at || order.created_at,
          incoming: role === 'STAFF'
        }));

      const escrowHistory = escrowRows
        .filter(txn => role !== 'STAFF' || txn.staff_id === staffId)
        .map(txn => ({
          id: `escrow-${txn.id}`,
          source: txn.staff_id === 'vault-deposit' ? 'Reserve funding' : 'Salary payout',
          description: txn.staff_id === 'vault-deposit' ? txn.staff_name : `${txn.role} · ${txn.staff_name}`,
          counterparty: role === 'ORGANIZER' ? txn.staff_name : 'Event organizer',
          amount: Number(txn.staff_id === 'vault-deposit' ? txn.gross_amount : txn.net_payout),
          status: txn.status,
          reference: txn.id,
          time: txn.timestamp,
          incoming: role === 'STAFF'
        }));

      const walletHistory = role === 'STAFF' ? (walletSummary.transactions || [])
        .filter(txn => txn.transaction_type !== 'ESCROW_PAYOUT' || !escrowRows.some(escrow => txn.note?.includes(escrow.id)))
        .map(txn => {
          const incoming = txn.recipient_staff_id === staffId;
          const counterpartyId = incoming ? txn.sender_staff_id : txn.recipient_staff_id;
          const counterparty = staffList.find(staff => staff.id === counterpartyId)?.name || (txn.transaction_type === 'DEMO_TOP_UP' ? 'Demo funds' : 'Crew member');
          return {
            id: `wallet-${txn.id}`,
            source: txn.transaction_type === 'DEMO_TOP_UP' ? 'Demo top-up' : txn.transaction_type === 'DEMO_WITHDRAWAL' ? 'Demo withdrawal' : 'Staff transfer',
            description: txn.note || (incoming ? `Received from ${counterparty}` : `Sent to ${counterparty}`),
            counterparty,
            amount: Number(txn.amount || 0),
            status: txn.status || 'COMPLETED',
            reference: txn.id,
            time: txn.created_at,
            incoming: txn.transaction_type === 'DEMO_TOP_UP' || incoming
          };
        }) : [];

      const combined = [...paymentRows, ...escrowHistory, ...walletHistory]
        .sort((first, second) => new Date(second.time || 0).getTime() - new Date(first.time || 0).getTime());
      startTransition(() => setRows(combined));
    } catch (loadError) {
      startTransition(() => setError(loadError.message || 'Could not load payment history.'));
    } finally {
      startTransition(() => setLoading(false));
    }
  }, [eventId, role, staffId, staffName, staffList]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <section className="glass-panel" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem' }}>Payment history</h2>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            {role === 'ORGANIZER' ? 'Payments and payouts for the selected event.' : 'Your payouts, transfers, and demo wallet activity.'}
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => loadHistory(true)} disabled={loading}>
          <RefreshCw size={14} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {error && <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.8rem', marginBottom: '12px' }}>{error}</p>}
      {loading && !rows.length ? (
        <p style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Loading payments...</p>
      ) : rows.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr><th>Type</th><th>Details</th><th>From / To</th><th>Amount</th><th>Status</th><th>Date</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ReceiptText size={13} />{row.source}</span></td>
                  <td>{row.description}</td>
                  <td>{row.counterparty || '—'}</td>
                  <td style={{ color: row.incoming ? 'var(--accent-success)' : 'var(--text-main)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {row.incoming ? <ArrowDownLeft size={13} style={{ verticalAlign: 'middle' }} /> : <ArrowUpRight size={13} style={{ verticalAlign: 'middle' }} />} {formatAmount(row.amount)}
                  </td>
                  <td><span className={`badge-status ${row.status === 'PAID' || row.status === 'DISBURSED' || row.status === 'COMPLETED' ? 'disbursed' : 'escrow-locked'}`}>{row.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}><Clock3 size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{formatTime(row.time)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{row.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No payment activity for this view yet.
        </div>
      )}
    </section>
  );
}
