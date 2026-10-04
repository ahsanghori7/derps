import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import { useSelector } from "react-redux";
import { postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function BillPaymentModal({ open, onClose, supplierName, vendorId, bills = [], credits = [], availableJournalEntries = [], onPaid, loading = false }) {
  const [billSelections, setBillSelections] = useState({});
  const [creditSelections, setCreditSelections] = useState({});
  const [paymentDate, setPaymentDate] = useState("");
  const [billSearch, setBillSearch] = useState("");
  const [creditSearch, setCreditSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const accessToken = useSelector((state) => state.auth.accessToken);

  const tenantId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('userDetails') || '{}');
      return u?.tenantId || u?.tenant?.id || u?.tenant?.tenantId || u?.company?.tenantId || u?.company?.id || '';
    } catch (_) {
      return '';
    }
  })();

  const creditsSource = useMemo(() => {
    return (availableJournalEntries && availableJournalEntries.length > 0) ? availableJournalEntries : (credits || []);
  }, [availableJournalEntries, credits]);

  useEffect(() => {
    if (!open) {
      setBillSelections({});
      setCreditSelections({});
    } else {
      // Prefill selections with 0 amounts (user will enter amounts)
      const preBills = {};
      (bills || []).forEach((b) => {
        preBills[b.id] = { checked: false, amount: '' };
      });
      setBillSelections(preBills);

      const preCredits = {};
      (creditsSource || []).forEach((c) => {
        preCredits[c.id] = { checked: false, amount: '' };
      });
      setCreditSelections(preCredits);
    }
  }, [open, bills, creditsSource]);

  const totals = useMemo(() => {
    const billTotal = Object.values(billSelections)
      .filter((s) => s?.checked || Number(s?.amount) > 0)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const creditTotal = Object.values(creditSelections)
      .filter((s) => s?.checked || Number(s?.amount) > 0)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    return { billTotal, creditTotal, net: billTotal - creditTotal };
  }, [billSelections, creditSelections]);

  function getOpenBalance(b) {
    const original = Number(b?.originalAmount || 0);
    const paid = Number(b?.paidAmount || 0);
    const computed = Math.max(0, original - paid);

    if (b?.outstandingBalance === undefined || b?.outstandingBalance === null || b?.outstandingBalance === '') {
      return computed;
    }

    const apiOpen = Number(b.outstandingBalance);
    if (!Number.isFinite(apiOpen)) return computed;
    if (apiOpen <= 0 && computed > 0) return computed;
    return apiOpen;
  }
  const validation = useMemo(() => {
    const messages = [];
    const allocationsTotal = Object.entries(billSelections).reduce((s, [id, sel]) => s + (Number(sel?.amount) || 0), 0);
    const creditsTotal = Object.entries(creditSelections).reduce((s, [id, sel]) => s + (Number(sel?.amount) || 0), 0);

    if (!paymentDate) messages.push("Payment Date is required");

    // Per-row range checks
    (bills || []).forEach((b) => {
      const sel = billSelections[b.id];
      if (!sel) return;
      const open = getOpenBalance(b);
      const amt = Number(sel.amount || 0);
      if (amt < 0) messages.push(`Bill ${b.poNo}: amount cannot be negative`);
      if (amt > open) messages.push(`Bill ${b.poNo}: amount exceeds open balance`);
    });
    (creditsSource || []).forEach((c) => {
      const sel = creditSelections[c.id];
      if (!sel) return;
      const open = Number(c.availableAmount || 0);
      const amt = Number(sel.amount || 0);
      if (amt < 0) messages.push(`Credit ${c.reference}: amount cannot be negative`);
      if (amt > open) messages.push(`Credit ${c.reference}: amount exceeds available`);
    });

    if (allocationsTotal <= 0 && creditsTotal <= 0) messages.push("Select at least one bill or credit amount");
    if (creditsTotal > allocationsTotal) messages.push("Credits cannot exceed total bill allocations");

    return { ok: messages.length === 0, messages, allocationsTotal, creditsTotal };
  }, [paymentDate, bills, creditsSource, billSelections, creditSelections]);

  const filteredCredits = useMemo(() => {
    const q = (creditSearch || '').toLowerCase();
    return (creditsSource || []).filter(c => !q || String(c.reference || '').toLowerCase().includes(q));
  }, [creditsSource, creditSearch]);

  const formatDate = (value) => {
    if (!value) return '';
    // Prefer date-only parsing to avoid timezone day shift
    if (typeof value === 'string') {
      const dateOnly = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        const [yyyy, mm, dd] = dateOnly.split('-');
        return `${mm}/${dd}/${yyyy}`;
      }
    }

    // Fallback: Date parsing
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const creditsMismatch = useMemo(() => Number((validation.creditsTotal || 0).toFixed(2)) !== Number((validation.allocationsTotal || 0).toFixed(2)), [validation]);

  const handleSavePayment = async () => {
    try {
      if (!vendorId) {
        toast.error("Missing vendorId");
        return;
      }
      const selectedBills = (bills || []).flatMap((b) => {
        const sel = billSelections[b.id];
        const amt = Number(sel?.amount || 0);
        return sel && (sel.checked || amt > 0) && amt > 0
          ? [{ billId: b.id, purchaseOrderId: b.id, allocatedAmount: amt, discountAmount: 0, writeOffAmount: 0, notes: "" }]
          : [];
      });
      const selectedJournals = (creditsSource || []).flatMap((c) => {
        const sel = creditSelections[c.id];
        const amt = Number(sel?.amount || 0);
        return sel && (sel.checked || amt > 0) && amt > 0
          ? [{ journalEntryId: c.id, amountApplied: amt, applicationDate: paymentDate || new Date().toISOString().slice(0,10), notes: "" }]
          : [];
      });

      const allocationsTotal = selectedBills.reduce((s, a) => s + Number(a.allocatedAmount || 0), 0);
      const journalTotal = selectedJournals.reduce((s, j) => s + Number(j.amountApplied || 0), 0);
      if (!validation.ok) {
        toast.error(validation.messages[0]);
        return;
      }
      // Accounting rule: total credits must equal total payment amount
      if (Number(journalTotal.toFixed(2)) !== Number(allocationsTotal.toFixed(2))) {
        toast.error(`Total journal entries used (${journalTotal.toFixed(2)}) must equal Total Payment (${allocationsTotal.toFixed(2)}).`);
        return;
      }
      const body = {
        ...(tenantId ? { tenantId: Number(tenantId) } : {}),
        vendorId: Number(vendorId),
        paymentDate: paymentDate || new Date().toISOString().slice(0,10),
        paymentMethod: "bank_transfer",
        paymentAccountId: null,
        totalAmount: Math.max(0, Number(allocationsTotal.toFixed(2))),
        // Support both possible backend shapes
        billAllocations: selectedBills,
        purchaseOrderAllocations: selectedBills,
        journalEntryApplications: selectedJournals,
        notes,
      };

      setSubmitting(true);
      const res = await postRequestWithBodyAndToken(`${baseURl}purchase-order-payment`, accessToken, body);
      toast.success(res?.message || "Payment recorded");
      onClose?.();
      onPaid?.();
    } catch (e) {
      toast.error(e?.message || "Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          mt: { xs: 2, md: 7 },
          mb: { xs: 2, md: 3 },
          maxHeight: 'calc(100vh - 96px)',
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#fff' }}>Bill Payment</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--dashboard-box-border)',
            background: 'var(--dashboard-card-bg)',
            marginBottom: 12
          }}>
            <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,0.06)' }}>
              <div style={{ width: 16, height: 16, border: '2px solid #3B82F6', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ color: '#3B82F6', fontWeight: 700, fontSize: 14 }}>Loading payment data...</div>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }`}</style>
          </div>
        )}
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 14 }}>
          <TextField
            label="Supplier"
            value={supplierName || ''}
            size="small"
            InputProps={{ readOnly: true }}
          />
          {/* <TextField
            label="Payment Date"
            type="hidden"
            size="small"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            InputLabelProps={{ shrink: true }} */}
          {/* /> */}
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Payment Date"
              format="MM/DD/YYYY"
              value={paymentDate ? dayjs(paymentDate) : null}
              onChange={(value) => {
                setPaymentDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  InputLabelProps: { shrink: true },
                },
              }}
            />
          </LocalizationProvider>
          {/* <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Amount</div>
            <TextField size="small" placeholder="0" disabled />
          </div> */}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 12 }}>
          <TextField
            label="Notes"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add payment notes"
            disabled={loading}
          />
        </div>

        {/* Outstanding Transactions */}
        <div style={{ fontWeight: 800, margin: '12px 0 6px 0' }}>Outstanding Transactions</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <TextField placeholder="Find Bill No." size="small" value={billSearch} onChange={(e) => setBillSearch(e.target.value)} disabled={loading} />
          <div style={{ border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: 8, fontWeight: 700, color: '#1F2937' }}>Filter</div>
          <div style={{ color: '#94A3B8', fontWeight: 700 }}>All</div>
        </div>
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 160px', padding: '10px 12px', background: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)', fontWeight: 700, fontSize: 12, boxSizing: 'border-box' }}>
            <div></div>
            <div>DESCRIPTION</div>
            <div>DUE DATE</div>
            <div style={{ textAlign: 'right' }}>ORIGINAL AMOUNT</div>
            <div style={{ textAlign: 'right' }}>Outstanding Balance</div>
            <div style={{ textAlign: 'right' }}>PAYMENT</div>
          </div>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 160px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                <div><div style={{ width: 16, height: 16, background: '#E5E7EB', borderRadius: 4 }} /></div>
                <div><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: '70%' }} /></div>
                <div><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: '60%' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: 80 }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: 80 }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ height: 32, background: '#E5E7EB', borderRadius: 6, width: 150 }} /></div>
              </div>
            ))
            : (bills || [])
                .filter((b) => {
                  if (!billSearch) return true;
                  const q = billSearch.toLowerCase();
                  const no = String(b.poNo || b.billNumber || b.reference || b.id || '').toLowerCase();
                  return no.includes(q);
                })
                .map((b) => {
            const original = Number(b.originalAmount || 0);
            const paid = Number(b.paidAmount || 0);
            const open = getOpenBalance(b);
            const sel = billSelections[b.id] || { checked: false, amount: 0 };
            const desc = String(b.poNo || b.billNumber || '').replace(/[}]/g, '');
            const orderLabel = formatDate(b.poDate || b.orderDate || b.billDate || b.date);
            const dueLabel = formatDate(b.dueDate);
            return (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 160px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center', background: sel.checked ? 'rgba(59,130,246,0.04)' : 'white', boxSizing: 'border-box' }}>
                <div>
                  <input type="checkbox" checked={sel.checked} onChange={(e) => setBillSelections((prev) => ({ ...prev, [b.id]: { ...sel, checked: e.target.checked } }))} disabled={loading} />
                </div>
                <div>
                  <div style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}>{desc} <span style={{ color: '#6B7280', fontWeight: 600 }}>({orderLabel})</span></div>
                </div>
                <div>{dueLabel || '-'}</div>
                <div style={{ textAlign: 'right' }}>${Number(original).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ textAlign: 'right' }}>${Number(open).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <TextField size="small" type="number" value={sel.amount === 0 ? '' : sel.amount} fullWidth placeholder="0"
                    inputProps={{ style: { textAlign: 'right' }, step: '0.01', min: 0 }}
                    onFocus={() => {
                      if (sel.amount === 0) {
                        setBillSelections((prev) => ({ ...prev, [b.id]: { ...sel, amount: '' } }));
                      }
                    }}
                    onChange={(e) => {
                      const raw = Number(e.target.value || 0);
                      const open = getOpenBalance(b);
                      const amt = Math.max(0, Math.min(raw, open));
                      setBillSelections((prev) => ({ ...prev, [b.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                    }}
                    onBlur={() => {
                      const open = getOpenBalance(b);
                      const amtNum = Number(sel.amount || 0);
                      const amt = Math.max(0, Math.min(amtNum, open));
                      setBillSelections((prev) => ({ ...prev, [b.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                    }}
                    sx={{ maxWidth: 150 }} disabled={loading}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Credits / Available Journal Entries */}
        <div style={{ fontWeight: 800, margin: '12px 0 6px 0' }}>Available Journal Entries (Credits)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <TextField placeholder="Find Supplier Credit No" size="small" value={creditSearch} onChange={(e) => setCreditSearch(e.target.value)} disabled={loading} />
          <div style={{ border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: 8, fontWeight: 700, color: '#1F2937' }}>Filter</div>
          <div style={{ color: '#94A3B8', fontWeight: 700 }}>All</div>
        </div>
        <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 160px', padding: '10px 12px', background: 'var(--navbar-dropdown-hover)', color: 'var(--sidebar-text-selected)', fontWeight: 700, fontSize: 12, boxSizing: 'border-box' }}>
            <div></div>
            <div>DESCRIPTION</div>
            <div style={{ textAlign: 'right' }}>ORIGINAL AMOUNT</div>
            <div style={{ textAlign: 'right' }}>OPEN BALANCE</div>
            <div style={{ textAlign: 'right' }}>PAYMENT</div>
          </div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 160px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center' }}>
                <div><div style={{ width: 16, height: 16, background: '#E5E7EB', borderRadius: 4 }} /></div>
                <div><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: '60%' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: 80 }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ height: 12, background: '#E5E7EB', borderRadius: 6, width: 80 }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div style={{ height: 32, background: '#E5E7EB', borderRadius: 6, width: 150 }} /></div>
              </div>
            ))
            : filteredCredits.length === 0 ? (
              <div style={{ padding: '12px', color: '#6B7280', fontWeight: 600, borderTop: '1px solid #F1F5F9' }}>
                No credits available
              </div>
            ) : filteredCredits.map((c) => {
            const original = Number(c.originalAmount || 0);
            const open = Number(c.availableAmount || 0);
            const sel = creditSelections[c.id] || { checked: false, amount: 0 };
            return (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 160px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center', background: sel.checked ? 'rgba(59,130,246,0.04)' : 'white', boxSizing: 'border-box' }}>
                <div>
                  <input type="checkbox" checked={sel.checked} onChange={(e) => setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, checked: e.target.checked } }))} disabled={loading} />
                </div>
                <div>
                  <div style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}>{String(c.reference || '').replace(/[}]/g, '')} <span style={{ color: '#6B7280', fontWeight: 600 }}>({formatDate(c.date || c.createdAt)})</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>${Number(original).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ textAlign: 'right' }}>${Number(open).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <TextField size="small" type="number" value={sel.amount === 0 ? '' : sel.amount} fullWidth placeholder="0"
                    inputProps={{ style: { textAlign: 'right' }, step: '0.01', min: 0 }}
                    onFocus={() => {
                      if (sel.amount === 0) {
                        setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, amount: '' } }));
                      }
                    }}
                    onChange={(e) => {
                      const raw = Number(e.target.value || 0);
                      // current totals to enforce accounting rule: total credits <= total bill allocations
                      const billSum = Object.values(billSelections).reduce((s, x) => s + (Number(x?.amount) || 0), 0);
                      const otherCredits = Object.entries(creditSelections)
                        .filter(([cid]) => Number(cid) !== Number(c.id))
                        .reduce((s, [, x]) => s + (Number(x?.amount) || 0), 0);
                      const maxAllowedByBills = Math.max(0, billSum - otherCredits);
                      const cap = Math.min(Number(open || 0), maxAllowedByBills);
                      const amt = Math.max(0, Math.min(raw, cap));
                      setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                    }}
                    onBlur={() => {
                      const billSum = Object.values(billSelections).reduce((s, x) => s + (Number(x?.amount) || 0), 0);
                      const otherCredits = Object.entries(creditSelections)
                        .filter(([cid]) => Number(cid) !== Number(c.id))
                        .reduce((s, [, x]) => s + (Number(x?.amount) || 0), 0);
                      const maxAllowedByBills = Math.max(0, billSum - otherCredits);
                      const cap = Math.min(Number(open || 0), maxAllowedByBills);
                      const amtNum = Number(sel.amount || 0);
                      const amt = Math.max(0, Math.min(amtNum, cap));
                      setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                    }}
                    sx={{ maxWidth: 150 }} disabled={loading}
                  />
                </div>
              </div>
            );
          })}
          </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontWeight: 800, color: '#111827', marginTop: 12 }}>
          <div>Total Payment: ${totals.billTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div>Credits: ${totals.creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div>Net: ${totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        {creditsMismatch && (
          <div style={{ marginTop: 6, color: '#DC2626', fontWeight: 700, textAlign: 'right' }}>
            Credits must equal Total Payment to proceed.
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSavePayment} disabled={submitting || loading || creditsMismatch}>Save and close</Button>
      </DialogActions>
    </Dialog>
  );
}
