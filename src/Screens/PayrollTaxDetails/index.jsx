import React, { useEffect, useMemo, useState } from "react";
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Accordion, AccordionSummary, AccordionDetails, InputAdornment, Backdrop, CircularProgress, FormControl, Select, MenuItem } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLocation, useNavigate } from "react-router-dom";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";

export default function PayrollTaxDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state?.row;
  const request = location.state?.request;

  const TAX_CATALOG = [
    { key: 'federal', label: 'Federal' },
    { key: 'income', label: 'Income Tax' },
    { key: 'medicare', label: 'Medicare Tax' },
    { key: 'ss', label: 'Social Security' },
    { key: 'tax', label: 'Tax' },
    { key: 'state', label: 'State Income' },
    { key: 'local', label: 'Local Tax' },
    { key: 'na', label: 'Not Applicable' },
  ];
  const [taxLines, setTaxLines] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [paidFrom, setPaidFrom] = useState('Account Name');
  const [bootLoading, setBootLoading] = useState(true);
  const [bankBootLoading, setBankBootLoading] = useState(false);
  const [noTaxes, setNoTaxes] = useState(false);
  const [taxOptions, setTaxOptions] = useState([]);
  const [taxOptionsLoading, setTaxOptionsLoading] = useState(false);

  const accessToken = useSelector((state) => state.auth.accessToken);

  useEffect(() => {
    const existingTaxes = Array.isArray(row?.taxDetails) ? row.taxDetails : [];
    const prefills = Array.isArray(row?.taxPrefill) ? row.taxPrefill : [];
    const prefillsByKey = new Map(prefills.map(x => [String(x.key), Number(x.amount) || 0]));
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const prefillsByLabel = new Map(prefills.map(x => [norm(x.label || x.key), Number(x.amount) || 0]));
    const applyLines = (arr) => {
      // If we have previously saved taxes for this employee, show those
      const existingWithAmounts = (existingTaxes || []).filter(x => x && (x.accountId != null || Number(x.amount) > 0));
      if (existingWithAmounts.length) {
        setNoTaxes(false);
        setTaxLines(existingWithAmounts.map((x, i) => ({ key: `saved_${i}`, label: '--select account--', accountId: x.accountId, value: Number(x.amount) || 0 })));
        return;
      }
      // Otherwise, always start with a single empty selectable line
      setNoTaxes(false);
      setTaxLines([{ key: 'custom_1', label: '--select account--', accountId: '', value: 0 }]);
    };

    if (Array.isArray(row?.taxAccount)) {
      applyLines(row.taxAccount);
      setBootLoading(false);
      return;
    }

    // Fallback: fetch employee to read taxAccount
    (async () => {
      try {
        if (!row?.id) { applyLines(null); setBootLoading(false); return; }
        const res = await getRequestWithOutBody(`${baseURl}user/${row.id}`, accessToken);
        const taxes = res?.data?.taxAccount || res?.data?.taxAccounts || [];
        setEmployee(res?.data || null);
        applyLines(taxes);
      } catch (e) {
        applyLines(null);
      } finally {
        setBootLoading(false);
      }
    })();
  }, [row, accessToken]);

  // Load tax account options for dropdown
  useEffect(() => {
    (async () => {
      try {
        setTaxOptionsLoading(true);
        const url = `${baseURl}account/categories/`;
        const res = await getRequestWithOutBody(url, accessToken);
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        const mapped = list.map(a => ({ id: a.id, name: a.name || a.label || '-', code: a.code, type: a.type, subType: a.subType }));
        setTaxOptions(mapped);
      } catch (e) {
        setTaxOptions([]);
      } finally {
        setTaxOptionsLoading(false);
      }
    })();
  }, [accessToken]);

  // Fetch Paid From bank name based on request.bankAccountId
  useEffect(() => {
    const id = Number(request?.bankAccountId);
    if (!id) return;
    setBankBootLoading(true);
    (async () => {
      try {
        const url = `${baseURl}account/categories/?type=assets&subType=bank`;
        const res = await getRequestWithOutBody(url, accessToken);
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        const found = list.find(b => Number(b.id) === id);
        if (found?.name) setPaidFrom(`${found.name}${found.code ? ` (${found.code})` : ''}`);
      } catch (e) {
        // ignore
      } finally {
        setBankBootLoading(false);
      }
    })();
  }, [accessToken, request?.bankAccountId]);

  const totalTaxes = useMemo(() => taxLines.reduce((s, t) => s + (Number(t.value) || 0), 0), [taxLines]);
  const netPay = useMemo(() => {
    const gross = Number(row?.gross || 0);
    const deductions = Number(row?.deductions || 0);
    return gross - totalTaxes - deductions;
  }, [row, totalTaxes]);

  const updateLineAmount = (key, v) => {
    setTaxLines(prev => prev.map(t => t.key === key ? { ...t, value: Number(v) || 0 } : t));
  };

  const updateLineAccount = (key, accountId) => {
    const opt = taxOptions.find(o => String(o.id) === String(accountId));
    setTaxLines(prev => prev.map(t => t.key === key ? { ...t, accountId, label: opt?.name || t.label } : t));
  };

  const addTaxLine = () => {
    const idx = taxLines.length + 1;
    setTaxLines(prev => [...prev, { key: `custom_${idx}`, label: '--select account--', accountId: '', value: 0 }]);
  };

  const handleSave = () => {
    // Build taxes breakdown for this employee
    const taxes = taxLines
      .filter(t => Number(t.value) > 0)
      .map(t => ({ accountId: t.accountId, amount: Number(t.value) }));
    const taxPrefill = taxLines
      .filter(t => Number(t.value) > 0)
      .map(t => ({ key: t.key, label: t.label, amount: Number(t.value) }));

    // Update the originating rows: set taxes total and attach taxDetails
    const incomingRows = Array.isArray(location.state?.rows) ? location.state.rows : [];
    const updatedRows = incomingRows.map(r => {
      if (String(r.id) !== String(row?.id)) return r;
      const total = taxes.reduce((s, x) => s + Number(x.amount || 0), 0);
      return { ...r, taxes: total, taxDetails: taxes, taxPrefill };
    });

    // Navigate back to summary with updated rows and the original request
    navigate('/home/payroll-summary/', { state: { rows: updatedRows, request } });
  };

  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
      <Backdrop open={bootLoading || bankBootLoading} sx={{ position: 'fixed', inset: 0, color: '#fff', zIndex: (theme) => theme.zIndex.modal + 3, backdropFilter: 'blur(2px)', backgroundColor: 'rgba(17,24,39,0.35)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <CircularProgress color="inherit" />
          <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>Loading…</div>
        </div>
      </Backdrop>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Button
          onClick={() => navigate(-1)}
          style={{
            minWidth: 40, width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--dashboard-card-bg)',
            border: '1px solid var(--dashboard-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: 4,
          }}
        >
          <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
        </Button>
        <div>
          <Heading Fontweight={700} color={'var(--sidebar-text-primary)'} Heading={row?.name || 'Employee'} Fontsize={30} />
          <p style={{ color: '#00000099', fontSize: 14, marginTop: 4 }}>
            Configure employer taxes for this payroll
          </p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', boxShadow: '0 6px 10px rgba(0,0,0,0.06)', marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', rowGap: 10, columnGap: 28 }}>
          <div style={{ fontSize: 14 }}><b>✉ Email</b><div>{employee?.email || '-'}</div></div>
          <div style={{ fontSize: 14 }}><b>🏦 Paid From</b><div>{paidFrom}</div></div>
          <div style={{ fontSize: 14 }}><b>🗓 Paid Period</b><div>--</div></div>
          <div style={{ fontSize: 14 }}><b>📍 Address</b><div>{employee?.address || '-'}</div></div>
          <div style={{ fontSize: 14 }}><b>📅 Paid Date</b><div>{request?.payrollDate || '-'}</div></div>
          <div style={{ fontSize: 14 }}><b>ⓘ Paid by</b><div>Check (${netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })})</div></div>
        </div>
      </div>

      <div style={{ maxWidth: 360, marginBottom: 14 }}>
        <div style={{ background: '#E6F3FF', borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 10px rgba(0,0,0,0.08)' }}>
          <div style={{ background: '#7DC6FF', padding: '6px 12px', fontWeight: 600 }}>Net Pay</div>
          <div style={{ padding: '16px 14px 14px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>${netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 12, opacity: .75, fontWeight: 600, marginTop: 4 }}>Net Amount</div>
          </div>
        </div>
      </div>

      <Accordion defaultExpanded sx={{ borderRadius: 2, overflow: 'hidden', background: 'white' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ background: '#E8F0FF', fontWeight: 700 }}>
          Employer Taxes
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Current</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {noTaxes ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" style={{ color: '#6B7280', fontStyle: 'italic' }}>
                      No taxes applied to this member
                    </TableCell>
                  </TableRow>
                ) : (
                  taxLines.map(t => (
                    <TableRow key={t.key}>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={t.accountId ?? ''}
                            onChange={(e) => updateLineAccount(t.key, e.target.value)}
                            displayEmpty
                          >
                            <MenuItem value="">--select account--</MenuItem>
                            {taxOptions.map(opt => (
                              <MenuItem key={opt.id} value={opt.id}>{opt.name}{opt.code ? ` (${opt.code})` : ''}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={t.value}
                          onChange={(e) => updateLineAmount(t.key, e.target.value)}
                          onBlur={(e) => updateLineAmount(t.key, Number(e.target.value || 0).toFixed(2))}
                          inputProps={{ style: { textAlign: 'right' } }}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Inline add button directly under the last line */}
                <TableRow>
                  <TableCell colSpan={1}>
                    <Button variant="outlined" size="small" onClick={addTaxLine} disabled={taxOptionsLoading} sx={{ textTransform: 'none' }}>
                      Add Employer Tax
                    </Button>
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow sx={{ background: '#F3F4F6' }}>
                  <TableCell><b>Total</b></TableCell>
                  <TableCell align="right"><b>${totalTaxes.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <Button variant="contained" color="success" onClick={handleSave} sx={{ textTransform: 'none' }}>
          Save
        </Button>
      </div>
    </div>
  );
}
