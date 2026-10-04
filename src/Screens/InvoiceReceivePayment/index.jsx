import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, IconButton, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { toast } from "react-toastify";
import Heading from "../../Components/Heading";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function InvoiceReceivePayment() {
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);

  const localUserData = useMemo(() => {
    try {
      const raw = localStorage.getItem('userDetails');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const tenantId = useMemo(() => {
    const source = (userData && Object.keys(userData).length ? userData : null) || localUserData;
    const direct = source?.tenantId ?? source?.tenantID ?? source?.tenant_id;
    if (direct != null && direct !== '') return Number(direct);
    const nested = source?.tenant?.id ?? source?.tenant?.tenantId ?? source?.tenant?.tenantID;
    if (nested != null && nested !== '') return Number(nested);
    return null;
  }, [userData, localUserData]);

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [merchantInfo, setMerchantInfo] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [credits, setCredits] = useState([]);

  const [invoiceSelections, setInvoiceSelections] = useState({});
  const [creditSelections, setCreditSelections] = useState({});

  const [paymentDate, setPaymentDate] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [creditSearch, setCreditSearch] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadOutstanding = async () => {
      if (!merchantId || !accessToken) return;
      try {
        setLoading(true);
        const url = `${baseURl}invoice/outstanding-transactions/${merchantId}`;
        const result = await getRequestWithOutBody(url, accessToken);
        const data = result?.data ?? result;

        // Align with actual invoice outstanding API response
        setMerchantInfo(data?.customer || data?.merchant || data?.vendor || null);
        setInvoices(data?.outstandingInvoices || data?.outstandingTransactions || data?.outstandingBills || data?.invoices || []);
        setCredits(data?.availableJournalEntries || data?.credits || data?.availableCredits || []);

        // Prefill selections
        const preInv = {};
        (data?.outstandingInvoices || data?.outstandingTransactions || data?.outstandingBills || data?.invoices || []).forEach((inv) => {
          preInv[inv.id] = { checked: false, amount: "" };
        });
        setInvoiceSelections(preInv);

        const preCr = {};
        (data?.availableJournalEntries || data?.credits || data?.availableCredits || []).forEach((c) => {
          preCr[c.id] = { checked: false, amount: "" };
        });
        setCreditSelections(preCr);
      } catch (e) {
        toast.error(e?.message || "Failed to load outstanding transactions");
      } finally {
        setLoading(false);
      }
    };
    loadOutstanding();
  }, [merchantId, accessToken]);

  const totals = useMemo(() => {
    const invoiceTotal = Object.values(invoiceSelections)
      .filter((s) => s?.checked || Number(s?.amount) > 0)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const creditTotal = Object.values(creditSelections)
      .filter((s) => s?.checked || Number(s?.amount) > 0)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    return { invoiceTotal, creditTotal, net: invoiceTotal - creditTotal };
  }, [invoiceSelections, creditSelections]);

  const validation = useMemo(() => {
    const messages = [];
    const allocationsTotal = Object.entries(invoiceSelections).reduce((s, [, sel]) => s + (Number(sel?.amount) || 0), 0);
    const creditsTotal = Object.entries(creditSelections).reduce((s, [, sel]) => s + (Number(sel?.amount) || 0), 0);

    if (!paymentDate) messages.push("Payment Date is required");

    (invoices || []).forEach((inv) => {
      const sel = invoiceSelections[inv.id];
      if (!sel) return;

      const original = Number(inv.originalAmount || inv.totalAmount || inv.amount || 0);
      const paid = Number(inv.paidAmount || inv.amountPaid || 0);
      const open = inv.outstandingBalance !== undefined && inv.outstandingBalance !== null
        ? Number(inv.outstandingBalance)
        : Math.max(0, original - paid);

      const amt = Number(sel.amount || 0);
      const label = inv.invoiceNo || inv.reference || inv.id;
      if (amt < 0) messages.push(`Invoice ${label}: amount cannot be negative`);
      if (amt > open) messages.push(`Invoice ${label}: amount exceeds open balance`);
    });

    (credits || []).forEach((c) => {
      const sel = creditSelections[c.id];
      if (!sel) return;
      const open = Number(c.availableAmount || c.openBalance || c.amount || 0);
      const amt = Number(sel.amount || 0);
      const label = c.reference || c.id;
      if (amt < 0) messages.push(`Credit ${label}: amount cannot be negative`);
      if (amt > open) messages.push(`Credit ${label}: amount exceeds available`);
    });

    if (allocationsTotal <= 0 && creditsTotal <= 0) messages.push("Select at least one invoice or credit amount");
    if (creditsTotal > allocationsTotal) messages.push("Credits cannot exceed total invoice allocations");

    return { ok: messages.length === 0, messages, allocationsTotal, creditsTotal };
  }, [paymentDate, invoices, credits, invoiceSelections, creditSelections]);

  // No strict equality required between credits and allocations; allow cash to cover the remainder
  const creditsMismatch = false;

  const filteredInvoices = useMemo(() => {
    const q = (invoiceSearch || "").toLowerCase();
    return (invoices || []).filter((inv) => {
      if (!q) return true;
      const label = String(inv.invoiceNo || inv.reference || inv.id || "").toLowerCase();
      return label.includes(q);
    });
  }, [invoices, invoiceSearch]);

  const filteredCredits = useMemo(() => {
    const q = (creditSearch || "").toLowerCase();
    return (credits || []).filter((c) => {
      if (!q) return true;
      const label = String(c.reference || c.id || "").toLowerCase();
      return label.includes(q);
    });
  }, [credits, creditSearch]);

  const handleClearPayment = async () => {
    try {
      if (!merchantId) {
        toast.error("Missing merchantId");
        return;
      }
      if (!validation.ok) {
        toast.error(validation.messages[0]);
        return;
      }
      const selectedInvoices = (invoices || []).flatMap((inv) => {
        const sel = invoiceSelections[inv.id];
        const amt = Number(sel?.amount || 0);
        return sel && (sel.checked || amt > 0) && amt > 0
          ? [{ invoiceId: inv.id, allocatedAmount: amt, discountAmount: 0, writeOffAmount: 0, notes: "" }]
          : [];
      });

      const selectedJournals = (credits || []).flatMap((c) => {
        const sel = creditSelections[c.id];
        const amt = Number(sel?.amount || 0);
        return sel && (sel.checked || amt > 0) && amt > 0
          ? [{ journalEntryId: c.id, amountApplied: amt, applicationDate: paymentDate || new Date().toISOString().slice(0, 10), notes: "" }]
          : [];
      });

      const allocationsTotal = selectedInvoices.reduce((s, a) => s + Number(a.allocatedAmount || 0), 0);
      const journalTotal = selectedJournals.reduce((s, j) => s + Number(j.amountApplied || 0), 0);
      const cashPortion = Number((allocationsTotal - journalTotal).toFixed(2));
      if (cashPortion < 0) {
        toast.error("Credits cannot exceed total invoice allocations");
        return;
      }

      const body = {
        ...(tenantId ? { tenantId } : {}),
        customerId: Number(merchantId),
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        paymentMethod: "bank_transfer",
        paymentAccountId: null,
        totalAmount: Math.max(0, cashPortion),
        invoiceAllocations: selectedInvoices,
        journalEntryApplications: selectedJournals,
        notes,
      };

      setSubmitting(true);
      const res = await postRequestWithBodyAndToken(`${baseURl}invoice-payment/`, accessToken, body);
      toast.success(res?.message || "Payment received");
      navigate(-1);
    } catch (e) {
      toast.error(e?.message || "Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={() => navigate(-1)}
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
      <DialogTitle sx={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#fff' }}>
        <Heading
          Fontweight={700}
          color={"var(--sidebar-text-primary)"}
          Heading={`Receive Payment${merchantId ? ` (Merchant #${merchantId})` : ""}`}
          Fontsize={20}
        />
      </DialogTitle>
      <DialogContent dividers>
      <Box sx={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, p: 2 }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, marginBottom: 14 }}>
          <TextField
            label="Customer"
            value={merchantInfo?.name || merchantInfo?.dbaName || merchantInfo?.legalBusinessName || merchantInfo?.companyName || merchantInfo?.email || ''}
            size="small"
            InputProps={{ readOnly: true }}
          />
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
                  sx: {
                    maxWidth: 240,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'var(--dashboard-tab-box)',
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
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
          <TextField placeholder="Find Invoice No." size="small" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} disabled={loading} />
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
            : (filteredInvoices || []).map((inv) => {
                const original = Number(inv.originalAmount || inv.totalAmount || inv.amount || 0);
                const paid = Number(inv.paidAmount || inv.amountPaid || 0);
                // Prefer a positive API-provided outstandingBalance, otherwise fall back to (original - paid)
                const apiOB = inv.outstandingBalance;
                const fallbackOB = Math.max(0, original - paid);
                const open = (apiOB === undefined || apiOB === null) ? fallbackOB : (Number(apiOB) > 0 ? Number(apiOB) : fallbackOB);

                const sel = invoiceSelections[inv.id] || { checked: false, amount: 0 };
                const label = String(inv.invoiceNo || inv.reference || inv.id || '').replace(/[}]/g, '');
                const issueLabel = formatDate(inv.issueDate || inv.date || inv.createdAt);
                const dueLabel = formatDate(inv.dueDate);

                return (
                  <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 1fr 160px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center', background: sel.checked ? 'rgba(59,130,246,0.04)' : 'white', boxSizing: 'border-box' }}>
                    <div>
                      <input type="checkbox" checked={sel.checked} onChange={(e) => setInvoiceSelections((prev) => ({ ...prev, [inv.id]: { ...sel, checked: e.target.checked } }))} disabled={loading} />
                    </div>
                    <div>
                      <div style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}>
                        {label} <span style={{ color: '#6B7280', fontWeight: 600 }}>({issueLabel})</span>
                      </div>
                    </div>
                    <div>{dueLabel || '-'}</div>
                    <div style={{ textAlign: 'right' }}>${Number(original).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ textAlign: 'right' }}>${Number(open).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <TextField
                        size="small"
                        type="number"
                        value={sel.amount === 0 ? '' : sel.amount}
                        fullWidth
                        placeholder="0"
                        inputProps={{ style: { textAlign: 'right' }, step: '0.01', min: 0 }}
                        onFocus={() => {
                          if (sel.amount === 0) {
                            setInvoiceSelections((prev) => ({ ...prev, [inv.id]: { ...sel, amount: '' } }));
                          }
                        }}
                        onChange={(e) => {
                          const raw = Number(e.target.value || 0);
                          const amt = Math.max(0, Math.min(raw, open));
                          setInvoiceSelections((prev) => ({ ...prev, [inv.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                        }}
                        onBlur={() => {
                          const amtNum = Number(sel.amount || 0);
                          const amt = Math.max(0, Math.min(amtNum, open));
                          setInvoiceSelections((prev) => ({ ...prev, [inv.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                        }}
                        sx={{ maxWidth: 150 }}
                        disabled={loading}
                      />
                    </div>
                  </div>
                );
              })}

          {!loading && (filteredInvoices || []).length === 0 && (
            <div style={{ padding: '12px', color: '#6B7280', fontWeight: 600, borderTop: '1px solid #F1F5F9' }}>
              No outstanding invoices
            </div>
          )}
        </div>

        {/* Credits / Available Journal Entries */}
        <div style={{ fontWeight: 800, margin: '12px 0 6px 0' }}>Available Journal Entries (Credits)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <TextField placeholder="Find Credit No" size="small" value={creditSearch} onChange={(e) => setCreditSearch(e.target.value)} disabled={loading} />
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
                const original = Number(c.originalAmount || c.totalAmount || c.amount || 0);
                // Prefer a positive available/open balance, otherwise fall back to original
                const apiCreditOB = (c.availableAmount ?? c.openBalance ?? c.amount);
                const open = (apiCreditOB === undefined || apiCreditOB === null) ? Number(original) : (Number(apiCreditOB) > 0 ? Number(apiCreditOB) : Number(original));
                const sel = creditSelections[c.id] || { checked: false, amount: 0 };
                const label = String(c.reference || c.id || '').replace(/[}]/g, '');

                return (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1fr 160px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', alignItems: 'center', background: sel.checked ? 'rgba(59,130,246,0.04)' : 'white', boxSizing: 'border-box' }}>
                    <div>
                      <input type="checkbox" checked={sel.checked} onChange={(e) => setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, checked: e.target.checked } }))} disabled={loading} />
                    </div>
                    <div>
                      <div style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}>{label} <span style={{ color: '#6B7280', fontWeight: 600 }}>({formatDate(c.date || c.createdAt)})</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>${Number(original).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ textAlign: 'right' }}>${Number(open).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <TextField
                        size="small"
                        type="number"
                        value={sel.amount === 0 ? '' : sel.amount}
                        fullWidth
                        placeholder="0"
                        inputProps={{ style: { textAlign: 'right' }, step: '0.01', min: 0 }}
                        onFocus={() => {
                          if (sel.amount === 0) {
                            setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, amount: '' } }));
                          }
                        }}
                        onChange={(e) => {
                          const raw = Number(e.target.value || 0);
                          const invoiceSum = Object.values(invoiceSelections).reduce((s, x) => s + (Number(x?.amount) || 0), 0);
                          const otherCredits = Object.entries(creditSelections)
                            .filter(([cid]) => String(cid) !== String(c.id))
                            .reduce((s, [, x]) => s + (Number(x?.amount) || 0), 0);
                          const maxAllowedByInvoices = Math.max(0, invoiceSum - otherCredits);
                          const cap = Math.min(Number(open || 0), maxAllowedByInvoices);
                          const amt = Math.max(0, Math.min(raw, cap));
                          setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                        }}
                        onBlur={() => {
                          const invoiceSum = Object.values(invoiceSelections).reduce((s, x) => s + (Number(x?.amount) || 0), 0);
                          const otherCredits = Object.entries(creditSelections)
                            .filter(([cid]) => String(cid) !== String(c.id))
                            .reduce((s, [, x]) => s + (Number(x?.amount) || 0), 0);
                          const maxAllowedByInvoices = Math.max(0, invoiceSum - otherCredits);
                          const cap = Math.min(Number(open || 0), maxAllowedByInvoices);
                          const amtNum = Number(sel.amount || 0);
                          const amt = Math.max(0, Math.min(amtNum, cap));
                          setCreditSelections((prev) => ({ ...prev, [c.id]: { ...sel, amount: amt, checked: amt > 0 } }));
                        }}
                        sx={{ maxWidth: 150 }}
                        disabled={loading}
                      />
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, fontWeight: 800, color: '#111827', marginTop: 12 }}>
          <div>Total Payment: ${totals.invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div>Credits: ${totals.creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div>Net: ${totals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        {/* No strict credit/payment equality warning; cash can cover the difference */}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <Button onClick={() => navigate(-1)} color="inherit" disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleClearPayment} disabled={submitting || loading}>Save and close</Button>
        </div>
      </Box>
      </DialogContent>
      <DialogActions sx={{ display: 'none' }} />
    </Dialog>
  );
}
