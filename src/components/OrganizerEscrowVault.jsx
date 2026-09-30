import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Download, 
  Receipt,
  Clock,
  Zap,
  QrCode,
  UserPlus,
  X
} from 'lucide-react';

export default function OrganizerEscrowVault({ 
  escrowTxns, 
  staffList = [],
  onDisbursePayout, 
  onCreateSalaryPayout,
  event,
  onOpenPayment
}) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [depositAmount, setDepositAmount] = useState('50000');
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [salaryHours, setSalaryHours] = useState('8');
  const [salaryHourlyRate, setSalaryHourlyRate] = useState('');
  const [salarySubmitting, setSalarySubmitting] = useState(false);
  const [salaryError, setSalaryError] = useState('');

  const eventTransactions = escrowTxns.filter(txn => !txn.eventId || txn.eventId === event.id);
  const eventStaff = staffList.filter(staff => staff.assignedEventId === event.id);
  const selectedStaff = eventStaff.find(staff => staff.id === selectedStaffId) || eventStaff[0] || null;
  const hourlyRate = Number(salaryHourlyRate || selectedStaff?.hourlyRate || 0);
  const hours = Number(salaryHours);
  const grossSalary = hours * hourlyRate;
  const platformFee = Math.round(grossSalary * 0.05 * 100) / 100;
  const netSalary = Math.round((grossSalary - platformFee) * 100) / 100;
  const payerName = typeof event.organizer === 'string'
    ? event.organizer
    : event.organizer?.name || 'Nexus Event Technologies Pvt Ltd';
  const totalEscrowBudget = Number(event.escrowTotal || 0);
  const totalDisbursed = eventTransactions
    .filter(txn => txn.status === 'DISBURSED')
    .reduce((total, txn) => total + Number(txn.grossAmount || 0), 0);
  const totalLocked = Math.max(0, totalEscrowBudget - totalDisbursed);

  const handleDisburseClick = (txn) => {
    onDisbursePayout(txn.id);
  };

  const openSalaryModal = () => {
    const firstStaff = eventStaff[0];
    setSelectedStaffId(firstStaff?.id || '');
    setSalaryHourlyRate(String(firstStaff?.hourlyRate || ''));
    setSalaryHours('8');
    setSalaryError('');
    setShowSalaryModal(true);
  };

  const handleCreateSalary = async () => {
    if (!selectedStaff || !Number.isFinite(hours) || hours <= 0 || !Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      setSalaryError('Choose staff and enter valid hours and hourly rate.');
      return;
    }

    setSalarySubmitting(true);
    setSalaryError('');
    try {
      const transaction = await onCreateSalaryPayout({ staff: selectedStaff, hours, hourlyRate });
      if (!transaction) throw new Error('Payout could not be saved. Please try again.');
      setShowSalaryModal(false);
      onOpenPayment?.({
        title: `Salary payout - ${selectedStaff.name}`,
        recipientName: selectedStaff.name,
        recipientUpi: `${selectedStaff.name.toLowerCase().replace(/[^a-z]/g, '')}@okaxis`,
        payerName,
        amount: transaction.netPayout,
        role: selectedStaff.role,
        hoursLogged: transaction.hoursLogged,
        hourlyRate: transaction.hourlyRate,
        eventId: event.id,
        eventName: event.name,
        txnIdToDisburse: transaction.id,
        purpose: 'ESCROW_PAYOUT'
      });
    } catch (error) {
      setSalaryError(error.message || 'Payout could not be saved. Please try again.');
    } finally {
      setSalarySubmitting(false);
    }
  };

  const downloadAudit = () => {
    const columns = ['Transaction ID', 'Event', 'Staff', 'Role', 'Hours', 'Hourly Rate', 'Gross Amount', 'Fee', 'Net Payout', 'Status', 'Timestamp', 'Audit Hash'];
    const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = eventTransactions.map(txn => [
      txn.id, event.name, txn.staffName, txn.role, txn.hoursLogged, txn.hourlyRate,
      txn.grossAmount, txn.platformFee, txn.netPayout, txn.status, txn.timestamp, txn.escrowTxHash
    ]);
    const csv = [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `crewpulse-escrow-${event.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadReceipt = txn => {
    const receiptNo = `CP-REC-${String(txn.id).toUpperCase()}`;
    const receipt = [
      'CREWPULSE ESCROW RECEIPT',
      `Receipt: ${receiptNo}`,
      `Event: ${event.name}`,
      `Staff: ${txn.staffName}`,
      `Role: ${txn.role}`,
      `Hours: ${txn.hoursLogged}`,
      `Hourly rate: INR ${txn.hourlyRate}`,
      `Gross: INR ${txn.grossAmount}`,
      `Fee: INR ${txn.platformFee}`,
      `Net amount: INR ${txn.netPayout}`,
      `Status: ${txn.status}`,
      `Date: ${txn.timestamp}`,
      `Transaction: ${txn.id}`,
      `Audit hash: ${txn.escrowTxHash || 'Not available'}`
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([receipt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receiptNo}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Escrow Header & Summary */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
                <Lock size={16} />
              </div>
              <h2 style={{ fontSize: '1.35rem' }}>Automated Escrow Smart Vault</h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Guaranteed payment protection for organizers and event professionals. Zero payment disputes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
              Deposit ₹
              <input
                aria-label="Escrow deposit amount in rupees"
                type="number"
                min="1"
                step="100"
                value={depositAmount}
                onChange={event => setDepositAmount(event.target.value)}
                style={{ width: '124px', padding: '8px 10px' }}
              />
            </label>
            <button 
              className="btn-primary" 
              style={{ fontSize: '0.8rem', gap: '6px' }}
              disabled={!Number.isFinite(Number(depositAmount)) || Number(depositAmount) <= 0}
              onClick={() => onOpenPayment && onOpenPayment({
                title: `Escrow Vault Pre-funding - ${event.name}`,
                recipientName: 'CrewPulse Escrow Trust (ICICI Bank)',
                recipientUpi: 'crewpulse.escrow@icici',
                payerName,
                amount: Number(depositAmount),
                eventId: event.id,
                eventName: event.name,
                role: 'Advance Shift Escrow Deposit',
                purpose: 'ESCROW_FUND'
              })}
            >
              <Zap size={14} />
              <span>Deposit Escrow Funds (UPI / QR)</span>
            </button>

            <button
              type="button"
              className="btn-success"
              style={{ fontSize: '0.8rem', gap: '6px' }}
              onClick={openSalaryModal}
            >
              <UserPlus size={14} />
              <span>Pay staff salary</span>
            </button>

            <button 
              className="btn-ghost" 
              style={{ fontSize: '0.8rem' }}
              onClick={downloadAudit}
            >
              <Download size={14} />
              <span>Export Escrow Audit (CSV)</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards for Vault */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(14, 21, 35, 0.7)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Shift Budget Deposited
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginTop: '4px' }}>
              ₹{totalEscrowBudget.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)' }}>
              100% Pre-funded via ICICI Escrow
            </span>
          </div>

          <div style={{ background: 'rgba(14, 21, 35, 0.7)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Currently Locked in Vault
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#818CF8', marginTop: '4px' }}>
              ₹{totalLocked.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#A5B4FC' }}>
              Pending shift supervisor sign-off
            </span>
          </div>

          <div style={{ background: 'rgba(14, 21, 35, 0.7)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Instant Payouts Disbursed
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--accent-success)', marginTop: '4px' }}>
              ₹{totalDisbursed.toLocaleString('en-IN')}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)' }}>
              Settled directly to worker UPI IDs
            </span>
          </div>
        </div>
      </div>

      {/* Escrow Milestone & Shift Disbursal Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Shift Telemetry & Payout Approval Queue</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Hours automatically verified via 200m GPS geofence punch clock
            </p>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
            5% Platform & Escrow Insurance Fee Applied
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Professional</th>
                <th>Role</th>
                <th>Geofenced Hours</th>
                <th>Hourly Rate</th>
                <th>Gross Pay</th>
                <th>Net Worker Payout</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {eventTransactions.map((txn) => {
                const hasReceipt = ['DISBURSED', 'PAID'].includes(txn.status);
                const isDisbursed = txn.status === 'DISBURSED';
                
                return (
                  <tr key={txn.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                        {txn.staffName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        TxID: {txn.id}
                      </div>
                    </td>

                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {txn.role}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                          {txn.hoursLogged} hrs
                        </span>
                      </div>
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                      ₹{txn.hourlyRate}/hr
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', fontSize: '0.86rem' }}>
                      ₹{txn.grossAmount.toLocaleString('en-IN')}
                    </td>

                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-success)', fontSize: '0.9rem' }}>
                        ₹{txn.netPayout.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Fee: ₹{txn.platformFee}
                      </div>
                    </td>

                    <td>
                      {isDisbursed || txn.status === 'PAID' ? (
                        <span className="badge-status disbursed">
                          <CheckCircle2 size={12} />
                          {isDisbursed ? 'PAID' : 'FUNDED'}
                        </span>
                      ) : (
                        <span className="badge-status escrow-locked">
                          <Lock size={12} />
                          LOCKED
                        </span>
                      )}
                    </td>

                    <td>
                      {hasReceipt ? (
                        <button 
                          className="btn-ghost" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px' }}
                          onClick={() => setSelectedReceipt(txn)}
                        >
                          <Receipt size={13} />
                          <span>Bill Receipt</span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px' }}
                            title="Generate dynamic UPI QR to scan & pay this staff"
                            onClick={() => {
                              if (onOpenPayment) {
                                onOpenPayment({
                                  title: `Shift Payout - ${txn.staffName}`,
                                  recipientName: txn.staffName,
                                  recipientUpi: `${txn.staffName.toLowerCase().replace(/[^a-z]/g, '')}@okaxis`,
                                  payerName,
                                  amount: txn.netPayout,
                                  role: txn.role,
                                  hoursLogged: txn.hoursLogged,
                                  hourlyRate: txn.hourlyRate,
                                  eventId: event.id,
                                  eventName: event.name,
                                  txnIdToDisburse: txn.id,
                                  purpose: 'ESCROW_PAYOUT'
                                });
                              } else {
                                handleDisburseClick(txn);
                              }
                            }}
                          >
                            <QrCode size={13} />
                            <span>Pay via QR</span>
                          </button>

                          <button 
                            id={`btn-disburse-${txn.id}`}
                            className="btn-success" 
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleDisburseClick(txn)}
                          >
                            <Unlock size={13} />
                            <span>Sign-Off</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showSalaryModal && (
        <div className="modal-overlay" onClick={() => setShowSalaryModal(false)}>
          <div className="modal-dialog" onClick={event => event.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3>Prepare staff salary</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{event.name}</p>
              </div>
              <button type="button" onClick={() => setShowSalaryModal(false)} aria-label="Close salary form" style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Staff member
                <select
                  value={selectedStaff?.id || ''}
                  onChange={changeEvent => {
                    const staff = eventStaff.find(member => member.id === changeEvent.target.value);
                    setSelectedStaffId(changeEvent.target.value);
                    setSalaryHourlyRate(String(staff?.hourlyRate || ''));
                  }}
                  style={{ display: 'block', width: '100%', marginTop: '6px' }}
                  disabled={!eventStaff.length}
                >
                  <option value="">{eventStaff.length ? 'Choose staff' : 'No staff assigned to this event'}</option>
                  {eventStaff.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name} - {staff.role}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Hours
                  <input type="number" min="0.1" step="0.1" value={salaryHours} onChange={changeEvent => setSalaryHours(changeEvent.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px' }} />
                </label>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Rate per hour (₹)
                  <input type="number" min="1" step="1" value={salaryHourlyRate || selectedStaff?.hourlyRate || ''} onChange={changeEvent => setSalaryHourlyRate(changeEvent.target.value)} style={{ display: 'block', width: '100%', marginTop: '6px' }} />
                </label>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '8px', display: 'grid', gap: '7px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Gross salary</span><strong>₹{Number.isFinite(grossSalary) ? grossSalary.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}><span>Platform fee (5%)</span><span>-₹{Number.isFinite(platformFee) ? platformFee.toFixed(2) : '0.00'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-success)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}><span>Staff receives</span><strong>₹{Number.isFinite(netSalary) ? netSalary.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}</strong></div>
              </div>

              {salaryError && <p role="alert" style={{ color: '#FDA4AF', fontSize: '0.78rem' }}>{salaryError}</p>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setShowSalaryModal(false)}>Cancel</button>
              <button type="button" className="btn-success" onClick={handleCreateSalary} disabled={salarySubmitting || !eventStaff.length || grossSalary <= 0}>
                <span>{salarySubmitting ? 'Saving payout...' : 'Create & pay via QR'}</span>
                <QrCode size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verifiable Escrow Receipt Modal */}
      {selectedReceipt && (
        <div className="modal-overlay escrow-receipt-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="modal-dialog escrow-receipt-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <style>{`@media print {
              body * { visibility: hidden !important; }
              .escrow-receipt-overlay, .escrow-receipt-overlay * { visibility: visible !important; }
              .escrow-receipt-overlay { position: static !important; padding: 0 !important; background: #fff !important; }
              .escrow-receipt-dialog { max-width: none !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; }
              .escrow-receipt-dialog .modal-header button, .escrow-receipt-dialog .modal-footer { display: none !important; }
            }`}</style>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} style={{ color: 'var(--accent-success)' }} />
                <h3>{selectedReceipt.status === 'DISBURSED' ? 'Payout receipt' : 'Escrow deposit receipt'}</h3>
              </div>
              <button onClick={() => setSelectedReceipt(null)} style={{ background: 'transparent', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '0.84rem' }}>
              <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px dashed var(--border-medium)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <CheckCircle2 size={26} />
                </div>
                <h4 style={{ fontSize: '1.25rem', color: '#FFF' }}>₹{Number(selectedReceipt.netPayout || 0).toLocaleString('en-IN')}</h4>
                <p style={{ color: 'var(--accent-success)', fontSize: '0.78rem', fontWeight: '600' }}>{selectedReceipt.status === 'DISBURSED' ? 'Payout sent' : 'Funds added to escrow'}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{selectedReceipt.staffName}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '4px' }}>Receipt: CP-REC-{String(selectedReceipt.id).toUpperCase()}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0', borderBottom: '1px dashed var(--border-medium)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Event</span>
                  <span style={{ fontWeight: '600' }}>{event.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shift Hours Verified</span>
                  <span>{selectedReceipt.hoursLogged} Hours</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Base Pay</span>
                  <span>₹{selectedReceipt.grossAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Escrow & Platform Fee (5%)</span>
                  <span>-₹{selectedReceipt.platformFee}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Settlement Timestamp</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedReceipt.timestamp}</span>
                </div>
              </div>

              <div style={{ marginTop: '14px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verifiable Escrow Audit Hash:</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#A5B4FC', wordBreak: 'break-all' }}>
                  {selectedReceipt.escrowTxHash || 'Not available'}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => downloadReceipt(selectedReceipt)}>Download receipt</button>
              <button className="btn-primary" style={{ justifyContent: 'center' }} onClick={() => window.print()}>Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
