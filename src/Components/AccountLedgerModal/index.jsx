import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter, TablePagination, Button, IconButton } from '@mui/material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { downloadFileWithToken, getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import { toast } from 'react-toastify';
import Loader from '../Loader';

const formatCurrency = (value) =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '';

export default function AccountLedgerModal({ open, onClose, accountId, periodLabel, startISO, endISO }) {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null); // {account, period, openingBalance, entries, totals, pagination?}
  const [page, setPage] = useState(0); // zero-based for MUI, API will receive page+1
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hydrated, setHydrated] = useState(false);
  const navigate = useNavigate();
  const skipNextResetRef = React.useRef(false);

  const tenantId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('userDetails') || '{}');
      return u?.tenantId || u?.tenant?.id || u?.tenant?.tenantId || u?.company?.tenantId || u?.company?.id || '';
    } catch (_) {
      return '';
    }
  })();

  const buildEntriesWithRunningBalance = () => {
    if (!data || !Array.isArray(data.entries)) return [];
    const normalBalance = data?.account?.normalBalance || 'debit';
    let running =
      typeof data._pageStartBalance === 'number'
        ? data._pageStartBalance
        : (typeof data.openingBalance === 'number' ? data.openingBalance : 0);

    // Sort current page entries oldest -> newest for a stable running sequence
    const sortedEntries = data.entries
      .slice()
      .sort((a, b) => {
        const da = new Date(a.date) - new Date(b.date);
        if (da !== 0) return da;
        return (a.id || 0) - (b.id || 0);
      });

    return sortedEntries.map((e) => {
      const debit = Number(e.debit || 0);
      const credit = Number(e.credit || 0);
      if (normalBalance === 'debit') {
        running += debit - credit;
      } else {
        running += credit - debit;
      }
      return { ...e, _runningBalance: running };
    });
  };

  useEffect(() => {
    if (!open || !accountId) {
      setHydrated(false);
      return;
    }

    setHydrated(false);

    const readStored = (key) => {
      try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    };

    const context = readStored('accountLedgerContext') || readStored('balanceSheetLedgerContext');
    if (!context?.returnToLedger) return;

    const sameAccount = String(context.ledgerAccountId) === String(accountId);
    const normalizeDay = (v) => {
      if (!v) return '';
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const sameStart = normalizeDay(context.ledgerStartISO || '') === normalizeDay(startISO || '');
    const sameEnd = normalizeDay(context.ledgerEndISO || '') === normalizeDay(endISO || '');
    if (!sameAccount || !sameStart || !sameEnd) return;

    const nextRows = Number(context.ledgerRowsPerPage);
    const nextPage = Number(context.ledgerPage);

    if (Number.isFinite(nextRows) && nextRows > 0) {
      setRowsPerPage(nextRows);
    }
    if (Number.isFinite(nextPage) && nextPage >= 0) {
      setPage(nextPage);
    }

    // Prevent the filter-change reset effect from overriding the restored page
    skipNextResetRef.current = true;

    sessionStorage.removeItem('accountLedgerContext');
    sessionStorage.removeItem('balanceSheetLedgerContext');

    setHydrated(true);
  }, [open, accountId, startISO, endISO]);

  useEffect(() => {
    if (!open || !accountId) return;
    setHydrated((prev) => (prev ? true : true));
  }, [open, accountId]);

  useEffect(() => {
    const fetchLedger = async () => {
      if (!open || !accountId || !hydrated) return;
      setLoading(true); setError(''); setData(null);
      try {
        const params = new URLSearchParams({
          startDate: startISO || new Date('1900-01-01T00:00:00.000Z').toISOString(),
          endDate: endISO || new Date(new Date().toISOString().slice(0,10) + 'T23:59:59.999Z').toISOString(),
          accountId: String(accountId),
          // server-side pagination parameters for current page (sorted oldest-first like ChartOfAccountsDetail)
          paginate: 'true',
          limit: String(rowsPerPage),
          page: String(page + 1),
          orderBy: 'date',
          order: 'asc',
        });
        const url = `${baseURl}account-report/ledger/?${params.toString()}`;
        const res = await getRequestWithOutBody(url, accessToken);
        const raw = res?.data ?? res;
        const payload = raw?.data || raw;

        if (payload && (payload.entries || payload.openingBalance !== undefined || payload.account)) {
          const account = payload.account || {};
          const normalBalance = account.normalBalance || 'debit';
          const openingBalance = Number(payload.openingBalance || 0);

          let pageStartBalance = openingBalance;

          // Helper to accumulate a set of entries into pageStartBalance in chronological order
          const accumulateEntries = (entries) => {
            const sorted = (entries || [])
              .slice()
              .sort((a, b) => {
                const da = new Date(a.date) - new Date(b.date);
                if (da !== 0) return da;
                return (a.id || 0) - (b.id || 0);
              });
            for (const e of sorted) {
              const debit = Number(e.debit || 0);
              const credit = Number(e.credit || 0);
              if (normalBalance === 'debit') {
                pageStartBalance += debit - credit;
              } else {
                pageStartBalance += credit - debit;
              }
            }
          };

          // If this is not the first page, pull previous entries within the same filter window
          if (page > 0) {
            const priorParams = new URLSearchParams({
              startDate: startISO || new Date('1900-01-01T00:00:00.000Z').toISOString(),
              endDate: endISO || new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z').toISOString(),
              accountId: String(accountId),
              paginate: 'true',
              limit: String(rowsPerPage * page),
              page: '1',
              orderBy: 'date',
              order: 'asc',
            });
            const priorUrl = `${baseURl}account-report/ledger/?${priorParams.toString()}`;
            const priorRes = await getRequestWithOutBody(priorUrl, accessToken);
            const priorRaw = priorRes?.data ?? priorRes;
            const priorPayload = priorRaw?.data || priorRaw;
            accumulateEntries(priorPayload?.entries || []);
          }

          // Attach pageStartBalance so buildEntriesWithRunningBalance can use it
          const enhancedPayload = {
            ...payload,
            _pageStartBalance: pageStartBalance,
          };

          setData(enhancedPayload);
        } else {
          setError('No ledger data found');
        }
      } catch (e) {
        setError(e?.message || 'Failed to load ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [open, accountId, startISO, endISO, accessToken, page, rowsPerPage, hydrated]);

  useEffect(() => {
    // Reset to first page whenever the filter context (account/dates) changes
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    setPage(0);
  }, [accountId, startISO, endISO]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleReferenceClick = (entry) => {
    if (!entry) return;
    const journalId = entry.journalId || entry.journal_id || entry.id;
    if (!journalId) return;
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const ids = entries
      .map((e) => e.journalId || e.journal_id || e.id)
      .filter((id) => id !== undefined && id !== null);
    const index = ids.indexOf(journalId);
    
    // Store ledger context in sessionStorage for restoration when navigating back
    const ledgerContext = {
      returnToLedger: true,
      ledgerAccountId: accountId,
      ledgerStartISO: startISO,
      ledgerEndISO: endISO,
      ledgerPage: page,
      ledgerRowsPerPage: rowsPerPage,
      returnPath: window.location.pathname,
    };

    sessionStorage.setItem('accountLedgerContext', JSON.stringify(ledgerContext));
    sessionStorage.setItem('balanceSheetLedgerContext', JSON.stringify(ledgerContext));
    
    navigate(`/home/editJournalEntry/${journalId}`, { 
      state: { 
        ids, 
        index,
        returnToLedger: true,
        ledgerAccountId: accountId,
        ledgerStartISO: startISO,
        ledgerEndISO: endISO
      } 
    });
    if (onClose) onClose();
  };

  const exportPDF = async () => {
    if (!accountId) return;
    try {
      const startDate = startISO || new Date('1900-01-01T00:00:00.000Z').toISOString();
      const endDate = endISO || new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z').toISOString();
      const params = new URLSearchParams({
        type: 'pdf',
        accountId: String(accountId),
        startDate,
        endDate,
        orderBy: 'date',
        order: 'DESC',
        includeZeros: 'false',
      });
      if (tenantId) params.set('tenantId', String(tenantId));
      const url = `${baseURl}account-report/ledger/export?${params.toString()}`;
      await downloadFileWithToken(url, accessToken, `ledger_${Date.now()}.pdf`);
    } catch (e) {
      toast.error(e?.message || 'Failed to export PDF');
    }
  };

  const exportCSV = async () => {
    if (!accountId) return;
    try {
      const startDate = startISO || new Date('1900-01-01T00:00:00.000Z').toISOString();
      const endDate = endISO || new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z').toISOString();
      const params = new URLSearchParams({
        type: 'csv',
        accountId: String(accountId),
        startDate,
        endDate,
        orderBy: 'date',
        order: 'DESC',
        includeZeros: 'false',
      });
      if (tenantId) params.set('tenantId', String(tenantId));
      const url = `${baseURl}account-report/ledger/export?${params.toString()}`;
      await downloadFileWithToken(url, accessToken, `ledger_${Date.now()}.csv`);
    } catch (e) {
      toast.error(e?.message || 'Failed to export CSV');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {data?.account?.name || 'Account Ledger'}
          <div style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
          {data?.period?.startDate && data?.period?.endDate
            ? `${new Date(data.period.startDate).toLocaleDateString()} - ${new Date(data.period.endDate).toLocaleDateString()}`
            : periodLabel || ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {data && (
            <>
              <Button variant="outlined" size="small" onClick={exportPDF}>Export PDF</Button>
              <Button variant="outlined" size="small" onClick={exportCSV}>Export CSV</Button>
            </>
          )}
          <Button variant="text" size="small" onClick={onClose}>Close</Button>
        </div>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {!hydrated && <div style={{ padding: 16 }}><Loader message="Loading..." subMessage="Please wait" /></div>}
        {loading && <div style={{ padding: 16 }}><Loader message="Loading..." subMessage="Please wait" /></div>}
        {!loading && error && <div style={{ padding: 16, color: 'red' }}>{error}</div>}
        {!loading && !error && data && (
          <TableContainer
            component={Paper}
            sx={{
              maxHeight: '70vh',
              overflow: 'auto',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              backgroundColor: '#F8FAFC',
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>DATE</TableCell>
                  <TableCell>REFERENCE</TableCell>
                  <TableCell>DESCRIPTION</TableCell>
                  <TableCell align="right">DEBIT</TableCell>
                  <TableCell align="right">CREDIT</TableCell>
                  <TableCell align="right">RUNNING BALANCE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} sx={{ fontStyle: 'italic', color: '#64748B' }}>Opening Balance</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell align="right">{formatCurrency(data.openingBalance)}</TableCell>
                </TableRow>
                {buildEntriesWithRunningBalance()
                  .map((e, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{e.date ? new Date(e.date).toLocaleDateString() : ''}</TableCell>
                      <TableCell
                        sx={{ cursor: (e.journalId || e.journal_id || e.id) ? 'pointer' : 'default', color: (e.journalId || e.journal_id || e.id) ? '#2563EB' : 'inherit' }}
                        onClick={() => handleReferenceClick(e)}
                      >
                        {e.reference || ''}
                      </TableCell>
                      <TableCell>{e.entryDescription || ''}</TableCell>
                      <TableCell align="right">{e.debit ? formatCurrency(e.debit) : ''}</TableCell>
                      <TableCell align="right">{e.credit ? formatCurrency(e.credit) : ''}</TableCell>
                      <TableCell align="right">{formatCurrency(e._runningBalance)}</TableCell>
                    </TableRow>
                  ))}
                <TableRow>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, borderTop: '2px solid #94A3B8', borderBottom: '2px double #94A3B8' }}>TOTAL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #94A3B8', borderBottom: '2px double #94A3B8' }}>{formatCurrency(data?.totals?.totalDebit)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #94A3B8', borderBottom: '2px double #94A3B8' }}>{formatCurrency(data?.totals?.totalCredit)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid #94A3B8', borderBottom: '2px double #94A3B8' }}>{formatCurrency(data?.totals?.closingBalance)}</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow
                  sx={{
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: '#F1F5F9',
                    boxShadow: '0 -1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    colSpan={6}
                    count={
                      // prefer server-provided total if available, else fall back to local length
                      data?.totalEntries ??
                      data?.totalCount ??
                      data?.count ??
                      (data.entries || []).length
                    }
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    ActionsComponent={(props) => {
                      const { count, page, rowsPerPage, onPageChange } = props;
                      const totalPages = Math.ceil(count / rowsPerPage);
                      
                      return (
                        <>
                          <IconButton
                            onClick={() => onPageChange(null, 0)}
                            disabled={page === 0}
                            aria-label="first page"
                            title="First page"
                          >
                            {'<<'}
                          </IconButton>
                          <IconButton
                            onClick={(e) => onPageChange(e, page - 1)}
                            disabled={page === 0}
                            aria-label="previous page"
                            title="Previous page"
                          >
                            {'<'}
                          </IconButton>
                          <IconButton
                            onClick={(e) => onPageChange(e, page + 1)}
                            disabled={page >= totalPages - 1}
                            aria-label="next page"
                            title="Next page"
                          >
                            {'>'}
                          </IconButton>
                          <IconButton
                            onClick={() => onPageChange(null, Math.max(0, totalPages - 1))}
                            disabled={page >= totalPages - 1}
                            aria-label="last page"
                            title="Last page"
                          >
                            {'>>'}
                          </IconButton>
                        </>
                      );
                    }}
                  />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
