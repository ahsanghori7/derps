import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button, Card, CardContent, Typography, Chip, TextField, MenuItem, Box, Grid, FormControl, InputLabel, Select, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import { IoIosArrowBack } from 'react-icons/io';
import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import { getRequestWithOutBody, deleteRequest } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import SearchTicket from "../../Components/SearchTicket";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Resolve debit/credit for the viewed account. The API may return journals for an
// account while entries only contain counterparty lines (different accountId).
const getJournalAmountsForAccount = (journal, targetAccountId) => {
  const entries = journal?.entries || [];
  const targetId = Number(targetAccountId);
  let matched = entries.filter((e) => Number(e.accountId) === targetId);
  if (!matched.length && entries.length > 0) {
    matched = entries;
  }
  const debit = matched.reduce((sum, e) => sum + parseFloat(e?.debit || 0), 0);
  const credit = matched.reduce((sum, e) => sum + parseFloat(e?.credit || 0), 0);
  return { debit, credit };
};

const getJournalDescriptionForAccount = (journal, targetAccountId) => {
  const entries = journal?.entries || [];
  const targetId = Number(targetAccountId);
  let matched = entries.filter((e) => Number(e.accountId) === targetId);
  if (!matched.length && entries.length > 0) {
    matched = entries;
  }
  const fromEntry = matched
    .map((e) => e.DESCRIPTION || e.description || '')
    .find((d) => String(d).trim());
  return fromEntry || journal.description || journal.memo || journal.note || '';
};

// Loading skeleton component for account detail
const LoadingAccountDetail = () => {
  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--dashboard-card-bg)',
        border: '1px solid var(--dashboard-box-border)',
        marginBottom: 24
      }}>
        {/* Loading Header */}
        <div style={{
          padding: 20,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: 'rgba(59, 130, 246, 0.05)'
        }}>
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #3B82F6',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '14px' }}>
            Loading account details...
          </span>
        </div>

        {/* Account Info Skeleton */}
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              height: '24px',
              width: '200px',
              backgroundColor: '#E5E7EB',
              borderRadius: '6px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
            <div style={{
              height: '20px',
              width: '80px',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} style={{
                padding: 16,
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8
              }}>
                <div style={{
                  height: '12px',
                  width: '80px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '3px',
                  marginBottom: 8,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <div style={{
                  height: '18px',
                  width: '120px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '4px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default function ChartOfAccountsDetail() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = useSelector((state) => state.auth.accessToken);

  const getFiltersFromURL = () => ({
    tenantId: searchParams.get('tenantId') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    reference: searchParams.get('reference') || '',
    source: searchParams.get('source') || '',
  });

  const getSearchFromURL = () => searchParams.get('search') || '';

  const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const [accountData, setAccountData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [sortedTransactions, setSortedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [error, setError] = useState("");
  const [editableRowId, setEditableRowId] = useState(null);
  const [draft, setDraft] = useState({});
  // Filter and pagination state
  const initialFilters = getFiltersFromURL();
  const initialSearch = getSearchFromURL();
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [draftSearchText, setDraftSearchText] = useState(initialSearch);
  const [appliedSearchText, setAppliedSearchText] = useState(initialSearch);
  const [pageNum, setPageNum] = useState(() => parsePositiveInt(searchParams.get('page'), 1));
  const [rowsPerPage, setRowsPerPage] = useState(() => parsePositiveInt(searchParams.get('rowsPerPage'), 100));
  const [totalCount, setTotalCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewEndingBalance, setViewEndingBalance] = useState(null);
  const [sortConfig, setSortConfig] = useState({ field: 'date', direction: 'asc' });
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const pagesLoadedRef = useRef(new Set());
  const STORAGE_SCROLL_KEY = `coa_detail_scroll_${accountId}`;
  const STORAGE_LAST_ENTRY_KEY = `coa_detail_last_entry_${accountId}`;
  const [pendingScrollToId, setPendingScrollToId] = useState(null);
  const [highlightEntryId, setHighlightEntryId] = useState(null);

  // URL parameter management
  const updateURLParams = (filters, searchText, page, rows) => {
    const params = new URLSearchParams();
    
    // Add filters if they have values
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    
    // Add search text
    if (searchText) params.set('search', searchText);
    
    // Add pagination
    params.set('page', (page || pageNum).toString());
    params.set('rowsPerPage', (rows || rowsPerPage).toString());
    
    setSearchParams(params);
  };

  const clearURLParams = () => {
    setSearchParams(new URLSearchParams());
  };

  // Filtered balance for header according to End Date
  const [filteredCurrentBalance, setFilteredCurrentBalance] = useState(null);
  const [computingFiltered, setComputingFiltered] = useState(false);
  const [rowDeletingId, setRowDeletingId] = useState(null);
  const [rowConfirmOpen, setRowConfirmOpen] = useState(false);
  const [rowToDeleteId, setRowToDeleteId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleSearchChange = (text) => {
    setDraftSearchText(text);
  };

  // Initialize filters from URL on mount and update when URL changes
  useEffect(() => {
    const urlFilters = getFiltersFromURL();
    const urlSearch = getSearchFromURL();
    const urlPage = searchParams.get('page');
    const urlRowsPerPage = searchParams.get('rowsPerPage');
    
    // Only set state if URL params are different from current state
    if (JSON.stringify(urlFilters) !== JSON.stringify(appliedFilters)) {
      setDraftFilters(urlFilters);
      setAppliedFilters(urlFilters);
    }
    if (urlSearch !== appliedSearchText) {
      setDraftSearchText(urlSearch);
      setAppliedSearchText(urlSearch);
    }
    
    // Set pagination from URL
    if (urlPage && parseInt(urlPage) !== pageNum) {
      setPageNum(parseInt(urlPage) || 1);
    }
    if (urlRowsPerPage && parseInt(urlRowsPerPage) !== rowsPerPage) {
      setRowsPerPage(parseInt(urlRowsPerPage) || 100);
    }
  }, [location.search]); // Only depend on location.search

  // Compute numeric filtered balance for the header card according to selected end date (and other filters)
  const computeFilteredBalance = async () => {
    const normalBalance = accountData?.normalBalance || 'debit';
    const openingBalance = parseFloat(accountData?.openingBalance || 0);

    const baseParams = () => {
      const p = new URLSearchParams({ paginate: 'true', limit: rowsPerPage.toString(), page: '1', sortBy: 'date', order: 'asc' });
      if (appliedSearchText) p.append('keyword', appliedSearchText);
      if (appliedFilters.tenantId) p.append('tenantId', appliedFilters.tenantId);
      if (appliedFilters.startDate) p.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) p.append('endDate', appliedFilters.endDate);
      if (appliedFilters.reference) p.append('reference', appliedFilters.reference);
      if (appliedFilters.source) p.append('source', appliedFilters.source);
      return p;
    };

    const collectAll = async (params) => {
      let page = 1; let all = []; let total = null;
      while (true) {
        params.set('page', String(page));
        const url = `${baseURl}account/${accountId}?${params.toString()}`;
        const resp = await getRequestWithOutBody(url, accessToken);
        const list = resp?.data?.journals || [];
        if (total == null) total = resp?.data?.count || list.length;
        all = all.concat(list);
        if (list.length < rowsPerPage || all.length >= total) break;
        page += 1;
      }
      return all
        .slice()
        .sort((a, b) => {
          const da = new Date(a.date) - new Date(b.date);
          if (da !== 0) return da;
          const pa = new Date(a.postedAt || a.createdAt || 0) - new Date(b.postedAt || b.createdAt || 0);
          if (pa !== 0) return pa;
          return (a.id || 0) - (b.id || 0);
        });
    };

    // pre-startDate adjustment
    let startBalance = openingBalance;
    if (appliedFilters.startDate) {
      const d = new Date(appliedFilters.startDate);
      const prior = new Date(d); prior.setDate(d.getDate() - 1);
      const priorParams = new URLSearchParams({ paginate: 'true', limit: rowsPerPage.toString(), page: '1', sortBy: 'date', order: 'asc', endDate: prior.toISOString().slice(0,10) });
      if (appliedSearchText) priorParams.append('keyword', appliedSearchText);
      if (appliedFilters.tenantId) priorParams.append('tenantId', appliedFilters.tenantId);
      if (appliedFilters.reference) priorParams.append('reference', appliedFilters.reference);
      if (appliedFilters.source) priorParams.append('source', appliedFilters.source);
      const priorJournals = await collectAll(priorParams);
      for (const j of priorJournals) {
        const { debit, credit } = getJournalAmountsForAccount(j, accountId);
        startBalance += (normalBalance === 'debit') ? (debit - credit) : (credit - debit);
      }
    }

    const filteredJournals = await collectAll(baseParams());
    let running = startBalance;
    for (const j of filteredJournals) {
      const { debit, credit } = getJournalAmountsForAccount(j, accountId);
      running += (normalBalance === 'debit') ? (debit - credit) : (credit - debit);
    }
    return running;
  };

  // Recompute filtered balance whenever filters change (only if endDate is applied as per requirement)
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!accessToken || !accountId || accountId === 'undefined') return;
      if (!appliedFilters.endDate) { setFilteredCurrentBalance(null); return; }
      try {
        setComputingFiltered(true);
        const val = await computeFilteredBalance();
        if (active) setFilteredCurrentBalance(val);
      } catch (_) {
        if (active) setFilteredCurrentBalance(null);
      } finally {
        if (active) setComputingFiltered(false);
      }
    };
    run();
    return () => { active = false; };
  }, [accountId, accessToken, appliedFilters, appliedSearchText]);

  const applySort = (rows) => rows || [];

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        const nextDirection = prev.direction === 'asc' ? 'desc' : 'asc';
        return { field, direction: nextDirection };
      }
      return { field, direction: 'asc' };
    });
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  // Helper function to get account type badge color
  const getTypeColor = (type) => {
    const colors = {
      'assets': '#3B82F6',
      'liability': '#F59E0B',
      'capital': '#8B5CF6',
      'expenses': '#EF4444',
      'income': '#10B981',
      'other': '#6B7280'
    };
    return colors[type?.toLowerCase()] || '#6B7280';
  };

  // Helper function to get balance color
  const getBalanceColor = (balance, normalBalance) => {
    const amount = parseFloat(balance || 0);
    if (amount === 0) return '#748092';

    const isAssetOrExpense = normalBalance === 'debit';

    if (isAssetOrExpense) {
      return amount > 0 ? '#10B981' : '#EF4444';
    } else {
      return amount > 0 ? '#EF4444' : '#10B981';
    }
  };

  // Fetch account details
  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!accountId || accountId === 'undefined' || !accessToken) return;

      setLoading(true);
      setError("");

      try {
        // Build query parameters for filtering and pagination
        const queryParams = new URLSearchParams({
          paginate: 'true',
          limit: rowsPerPage.toString(),
          page: '1',
          sortBy: 'date',
          order: 'asc'
        });

        // Add search parameter like in MyTask
        if (appliedSearchText) queryParams.append('keyword', appliedSearchText);

        // Add applied filters if they have values
        if (appliedFilters.tenantId) queryParams.append('tenantId', appliedFilters.tenantId);
        if (appliedFilters.startDate) queryParams.append('startDate', appliedFilters.startDate);
        if (appliedFilters.endDate) queryParams.append('endDate', appliedFilters.endDate);
        if (appliedFilters.reference) queryParams.append('reference', appliedFilters.reference);
        if (appliedFilters.source) queryParams.append('source', appliedFilters.source);

        const url = `${baseURl}account/${accountId}?${queryParams.toString()}`;
        const response = await getRequestWithOutBody(url, accessToken);

        if (response?.data) {
          // Set account data from API response
          setAccountData(response.data.account);

          // Set total count for pagination
          setTotalCount(response.data.count || 0);

          // Prepare to compute running balance with page-aware starting balance
          const normalBalance = response.data.account.normalBalance;
          const openingBalance = parseFloat(response.data.account.openingBalance || 0);
          const hasActiveFilters = Boolean(
            appliedSearchText ||
            appliedFilters.startDate || appliedFilters.endDate || appliedFilters.tenantId ||
            appliedFilters.reference || appliedFilters.source
          );

          // Compute starting balance for current view (for table running)
          // For period view: if any filter is applied, the table's running balance should start from 0
          // otherwise start from opening balance plus all prior activity.
          let pageStartBalance = openingBalance;

          // Helper: accumulate a list of journals into the balance
          const accumulateJournals = (journals) => {
            const sorted = (journals || [])
              .slice()
              .sort((a, b) => {
                const da = new Date(a.date) - new Date(b.date);
                if (da !== 0) return da;
                const pa = new Date(a.postedAt || a.createdAt || 0) - new Date(b.postedAt || b.createdAt || 0);
                if (pa !== 0) return pa;
                return (a.id || 0) - (b.id || 0);
              });
            for (const j of sorted) {
              const { debit, credit } = getJournalAmountsForAccount(j, accountId);
              if (normalBalance === 'debit') pageStartBalance += debit - credit;
              else pageStartBalance += credit - debit;
            }
          };

          // If startDate is applied, first accumulate all journals BEFORE startDate (as-of balance)
          if (appliedFilters.startDate) {
            const startDate = new Date(appliedFilters.startDate);
            const dayBefore = new Date(startDate);
            dayBefore.setDate(startDate.getDate() - 1);
            const endForPrior = dayBefore.toISOString().slice(0, 10);

            const priorToStartParams = new URLSearchParams({
              paginate: 'true',
              limit: '1000', // reasonable upper bound; adjust if needed
              page: '1',
              sortBy: 'date',
              order: 'asc',
              endDate: endForPrior
            });
            if (appliedSearchText) priorToStartParams.append('keyword', encodeURIComponent(appliedSearchText));
            if (appliedFilters.tenantId) priorToStartParams.append('tenantId', appliedFilters.tenantId);
            if (appliedFilters.reference) priorToStartParams.append('reference', appliedFilters.reference);
            if (appliedFilters.source) priorToStartParams.append('source', appliedFilters.source);

            const priorToStartUrl = `${baseURl}account/${accountId}?${priorToStartParams.toString()}`;
            const priorToStartResp = await getRequestWithOutBody(priorToStartUrl, accessToken);
            accumulateJournals(priorToStartResp?.data?.journals || []);
          }

          // If pageNum > 1, accumulate previous page journals within the current filtered window
          if (pageNum > 1) {
            const priorParams = new URLSearchParams({
              paginate: 'true',
              limit: String(rowsPerPage * (pageNum - 1)),
              page: '1',
              sortBy: 'date',
              order: 'asc'
            });
            if (appliedSearchText) priorParams.append('keyword', encodeURIComponent(appliedSearchText));
            if (appliedFilters.tenantId) priorParams.append('tenantId', appliedFilters.tenantId);
            if (appliedFilters.startDate) priorParams.append('startDate', appliedFilters.startDate);
            if (appliedFilters.endDate) priorParams.append('endDate', appliedFilters.endDate);
            if (appliedFilters.reference) priorParams.append('reference', appliedFilters.reference);
            if (appliedFilters.source) priorParams.append('source', appliedFilters.source);

            const priorUrl = `${baseURl}account/${accountId}?${priorParams.toString()}`;
            const priorResp = await getRequestWithOutBody(priorUrl, accessToken);
            accumulateJournals(priorResp?.data?.journals || []);
          }

          // Transform only current page journals, sorted oldest -> newest
          // Start from 0 for period running when any filter is applied; else from pageStartBalance
          let runningBalance = hasActiveFilters ? 0 : pageStartBalance;
          const pageJournals = (response.data.journals || [])
            .slice()
            .sort((a, b) => {
              const da = new Date(a.date) - new Date(b.date);
              if (da !== 0) return da;
              const pa = new Date(a.postedAt || a.createdAt || 0) - new Date(b.postedAt || b.createdAt || 0);
              if (pa !== 0) return pa;
              return (a.id || 0) - (b.id || 0);
            });

          const transformedTransactions = pageJournals.map((journal) => {
            const { debit: debitAmount, credit: creditAmount } = getJournalAmountsForAccount(journal, accountId);

            if (normalBalance === 'debit') {
              runningBalance += debitAmount - creditAmount;
            } else {
              runningBalance += creditAmount - debitAmount;
            }

            return {
              id: journal.id,
              date: new Date(journal.date).toLocaleDateString('en-US'),
              ref: journal.reference,
              description: getJournalDescriptionForAccount(journal, accountId),
              classLocation: `${journal.status.charAt(0).toUpperCase() + journal.status.slice(1)} • ${journal.currency}`,
              payment: debitAmount > 0 ? formatCurrency(debitAmount) : '-',
              deposit: creditAmount > 0 ? formatCurrency(creditAmount) : '-',
              balance: formatCurrency(runningBalance)
            };
          });

          setTransactions(transformedTransactions);
          setViewEndingBalance(runningBalance);
          setSortedTransactions(transformedTransactions);
          setPageNum(1);
          const firstPageSize = (response.data.journals || []).length;
          setHasMore(firstPageSize >= rowsPerPage && (response.data.count || 0) > firstPageSize);
        }
      } catch (err) {
        setError('Failed to load account details. Please try again.');
      } finally {
        setLoading(false);
        setFirstLoadDone(true);
      }
    };

    fetchAccountDetails().then(() => {
      // mark first page as loaded
      pagesLoadedRef.current = new Set([1]);
    });
  }, [accountId, accessToken, appliedFilters, rowsPerPage, appliedSearchText, sortConfig, refreshTick]);

  useEffect(() => {
    // Preserve insertion order to keep running balance consistent
    setSortedTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    // update hasMore whenever totalCount or transactions change
    setHasMore((transactions?.length || 0) < (totalCount || 0));
  }, [transactions, totalCount]);

  const loadMoreTransactions = async () => {
    if (isFetchingMore || !hasMore) return;
    if (!accountId || accountId === 'undefined' || !accessToken) return;
    setIsFetchingMore(true);
    try {
      const nextPage = pageNum + 1;
      if (pagesLoadedRef.current.has(nextPage)) {
        setIsFetchingMore(false);
        return;
      }
      const queryParams = new URLSearchParams({
        paginate: 'true',
        limit: rowsPerPage.toString(),
        page: nextPage.toString(),
        sortBy: 'date',
        order: 'asc'
      });
      if (appliedSearchText) queryParams.append('keyword', appliedSearchText);
      if (appliedFilters.tenantId) queryParams.append('tenantId', appliedFilters.tenantId);
      if (appliedFilters.startDate) queryParams.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) queryParams.append('endDate', appliedFilters.endDate);
      if (appliedFilters.reference) queryParams.append('reference', appliedFilters.reference);
      if (appliedFilters.source) queryParams.append('source', appliedFilters.source);

      const url = `${baseURl}account/${accountId}?${queryParams.toString()}`;
      const response = await getRequestWithOutBody(url, accessToken);
      const pageJournalsRaw = (response?.data?.journals || []);
      const pageJournals = pageJournalsRaw
        .slice()
        .sort((a, b) => {
          const da = new Date(a.date) - new Date(b.date);
          if (da !== 0) return da;
          const pa = new Date(a.postedAt || a.createdAt || 0) - new Date(b.postedAt || b.createdAt || 0);
          if (pa !== 0) return pa;
          return (a.id || 0) - (b.id || 0);
        });
      const normalBalance = (accountData && accountData.normalBalance) || 'debit';
      const hasActiveFilters = Boolean(
        appliedSearchText ||
        appliedFilters.startDate || appliedFilters.endDate || appliedFilters.tenantId ||
        appliedFilters.reference || appliedFilters.source
      );
      let running = typeof viewEndingBalance === 'number'
        ? viewEndingBalance
        : (hasActiveFilters ? 0 : parseFloat(accountData?.openingBalance || 0));
      const newRows = pageJournals.map((journal) => {
        const { debit: debitAmount, credit: creditAmount } = getJournalAmountsForAccount(journal, accountId);
        if (normalBalance === 'debit') running += debitAmount - creditAmount; else running += creditAmount - debitAmount;
        return {
          id: journal.id,
          date: new Date(journal.date).toLocaleDateString('en-US'),
          ref: journal.reference,
          description: getJournalDescriptionForAccount(journal, accountId),
          classLocation: `${journal.status.charAt(0).toUpperCase() + journal.status.slice(1)} • ${journal.currency}`,
          payment: debitAmount > 0 ? formatCurrency(debitAmount) : '-',
          deposit: creditAmount > 0 ? formatCurrency(creditAmount) : '-',
          balance: formatCurrency(running)
        };
      });
      setTransactions(prev => [...prev, ...newRows]);
      setViewEndingBalance(running);
      setTotalCount(response?.data?.count || totalCount);
      setPageNum(nextPage);
      pagesLoadedRef.current.add(nextPage);
      if (pageJournalsRaw.length < rowsPerPage) {
        setHasMore(false);
      }
    } catch (e) {
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleScrollContainer = (e) => {
    const el = e.currentTarget;
    const threshold = 200;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
      loadMoreTransactions();
    }
  };

  // Table columns configuration (kept for reference but not used in custom table)
  const columns = useMemo(() => [
    {
      id: "date",
      label: (
        <span
          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          onClick={() => handleSort('date')}
        >
          DATE
          {sortConfig.field === 'date' && (
            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
          )}
        </span>
      ),
      align: "center"
    },
    { id: "ref", label: "REFERENCE", align: "center" },
    { id: "description", label: "DESCRIPTION", align: "left" },
    { id: "classLocation", label: "STATUS / CURRENCY", align: "center" },
    { id: "payment", label: "DEBIT", align: "right" },
    { id: "deposit", label: "CREDIT", align: "right" },
    { id: "balance", label: "RUNNING BALANCE", align: "right" }
  ], [sortConfig]);

  // Table row click handler -> navigate to Edit Journal Entry
  const handleRowClick = (row) => {
    try {
      if (row && row.id) {
        const ids = transactions.map(t => t.id);
        const index = ids.indexOf(row.id);
        // persist current scroll position only
        try {
          const top = scrollRef.current ? scrollRef.current.scrollTop : 0;
          sessionStorage.setItem(STORAGE_SCROLL_KEY, String(top));
          sessionStorage.setItem(STORAGE_LAST_ENTRY_KEY, String(row.id));
        } catch (_) {}
        navigate(`/home/editJournalEntry/${row.id}`, { state: { ids, index } });
      } else {
        setEditableRowId(row?.id || null);
      }
    } catch (_) {
      setEditableRowId(row?.id || null);
    }
  };

  // After transactions load, restore scrollTop if saved
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_SCROLL_KEY);
      if (saved != null && scrollRef.current) {
        scrollRef.current.scrollTop = parseInt(saved) || 0;
        sessionStorage.removeItem(STORAGE_SCROLL_KEY);
      }
    } catch (_) {}
  }, [transactions.length]);

  // On mount, check if we should scroll to a specific entry id
  useEffect(() => {
    try {
      const lastId = sessionStorage.getItem(STORAGE_LAST_ENTRY_KEY);
      if (lastId) setPendingScrollToId(parseInt(lastId));
    } catch (_) {}
  }, [accountId]);

  // Ensure the specific entry is loaded and then scroll into view and highlight
  useEffect(() => {
    if (!pendingScrollToId) return;
    const exists = transactions.some(t => t.id === pendingScrollToId);
    if (!exists) {
      if (hasMore && !isFetchingMore) {
        loadMoreTransactions();
      }
      return;
    }
    // Scroll to element
    const container = scrollRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-entry-id="${pendingScrollToId}"]`);
    if (el) {
      try { el.scrollIntoView({ block: 'center' }); } catch (_) {}
      setHighlightEntryId(pendingScrollToId);
      setTimeout(() => setHighlightEntryId(null), 2000);
      try { sessionStorage.removeItem(STORAGE_LAST_ENTRY_KEY); } catch (_) {}
      setPendingScrollToId(null);
    }
  }, [transactions, pendingScrollToId, hasMore, isFetchingMore]);

  // Editable cell renderer
  const renderEditableCell = (row, column) => {
    return (
      <input
        value={draft[`${row.id}_${column.id}`] || row[column.id] || ''}
        onChange={(e) => setDraft(prev => ({
          ...prev,
          [`${row.id}_${column.id}`]: e.target.value
        }))}
        style={{
          width: '100%',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '14px'
        }}
      />
    );
  };

  // Cancel draft changes
  const cancelDraft = () => {
    setEditableRowId(null);
    setDraft({});
  };

  const handleDeleteJournal = async (jid) => {
    if (!jid) return;
    try {
      setRowDeletingId(jid);
      // Preserve current scroll position so screen doesn't jump after refresh
      try {
        const top = scrollRef.current ? scrollRef.current.scrollTop : 0;
        sessionStorage.setItem(STORAGE_SCROLL_KEY, String(top));
      } catch (_) {}
      await deleteRequest(`${baseURl}journal/${jid}`, accessToken);
      // Refresh list to recompute running balances accurately
      setTransactions([]);
      setSortedTransactions([]);
      setViewEndingBalance(null);
      setPageNum(1);
      setHasMore(true);
      pagesLoadedRef.current = new Set();
      // Trigger refetch immediately
      setRefreshTick((t) => t + 1);
    } catch (e) {
      setInfoTitle('Delete Failed');
      setInfoMessage('The journal could not be deleted at this time. Please try again later.');
      setInfoOpen(true);
    } finally {
      setRowDeletingId(null);
      setRowToDeleteId(null);
      setRowConfirmOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (totalCount > 0) {
      setInfoTitle('Cannot Delete Account');
      setInfoMessage('This account cannot be deleted because it has recorded transactions or activities.');
      setInfoOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const proceedDelete = async () => {
    try {
      setDeleting(true);
      await deleteRequest(`${baseURl}account/${accountId}`, accessToken);
      navigate('/home/chartOfAccounts/');
    } catch (err) {
      setInfoTitle('Delete Failed');
      setInfoMessage('The account could not be deleted at this time. Please try again later.');
      setInfoOpen(true);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (loading && !firstLoadDone) {
    return (
      <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
        <LoadingAccountDetail />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
        <div style={{ padding: 20, color: '#d32f2f', textAlign: 'center' }}>
          <h3>Error Loading Account</h3>
          <p>{error}</p>
          <Button variant="outlined" onClick={() => navigate('/home/chartOfAccounts/')}>
            Back to Chart of Accounts
          </Button>
        </div>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
        <div style={{ padding: 20, color: '#748092', textAlign: 'center' }}>
          <h3>Account Not Found</h3>
          <p>The requested account could not be found.</p>
          <Button variant="outlined" onClick={() => navigate('/home/chartOfAccounts/')}>
            Back to Chart of Accounts
          </Button>
        </div>
      </div>
    );
  }

  const typeColor = getTypeColor(accountData.type);
  const balanceColor = getBalanceColor(viewEndingBalance ?? accountData.currentBalance, accountData.normalBalance);

  // Build the full ledger rows for export (fetches all pages and computes running balance)
  const buildFullLedgerRows = async () => {
    const normalBalance = accountData?.normalBalance || 'debit';
    const openingBalance = parseFloat(accountData?.openingBalance || 0);

    const baseParams = () => {
      const p = new URLSearchParams({ paginate: 'true', limit: rowsPerPage.toString(), page: '1', sortBy: 'date', order: 'asc' });
      if (appliedSearchText) p.append('keyword', appliedSearchText);
      if (appliedFilters.tenantId) p.append('tenantId', appliedFilters.tenantId);
      if (appliedFilters.startDate) p.append('startDate', appliedFilters.startDate);
      if (appliedFilters.endDate) p.append('endDate', appliedFilters.endDate);
      if (appliedFilters.reference) p.append('reference', appliedFilters.reference);
      if (appliedFilters.source) p.append('source', appliedFilters.source);
      return p;
    };

    // fetch all filtered journals
    const collectAll = async (params) => {
      let page = 1;
      let all = [];
      let total = null;
      while (true) {
        params.set('page', String(page));
        const url = `${baseURl}account/${accountId}?${params.toString()}`;
        const resp = await getRequestWithOutBody(url, accessToken);
        const list = resp?.data?.journals || [];
        if (total == null) total = resp?.data?.count || list.length;
        all = all.concat(list);
        if (list.length < rowsPerPage || all.length >= total) break;
        page += 1;
      }
      return all
        .slice()
        .sort((a, b) => {
          const da = new Date(a.date) - new Date(b.date);
          if (da !== 0) return da;
          const pa = new Date(a.postedAt || a.createdAt || 0) - new Date(b.postedAt || b.createdAt || 0);
          if (pa !== 0) return pa;
          return (a.id || 0) - (b.id || 0);
        });
    };

    // If startDate, compute pre-start balance
    let startBalance = openingBalance;
    if (appliedFilters.startDate) {
      const d = new Date(appliedFilters.startDate);
      const dayBefore = new Date(d);
      dayBefore.setDate(d.getDate() - 1);
      const priorParams = new URLSearchParams();
      priorParams.set('paginate', 'true');
      priorParams.set('limit', rowsPerPage.toString());
      priorParams.set('page', '1');
      priorParams.set('sortBy', 'date');
      priorParams.set('order', 'asc');
      priorParams.set('endDate', dayBefore.toISOString().slice(0,10));
      if (appliedSearchText) priorParams.append('keyword', appliedSearchText);
      if (appliedFilters.tenantId) priorParams.append('tenantId', appliedFilters.tenantId);
      if (appliedFilters.reference) priorParams.append('reference', appliedFilters.reference);
      if (appliedFilters.source) priorParams.append('source', appliedFilters.source);
      const priorJournals = await collectAll(priorParams);
      for (const j of priorJournals) {
        const { debit, credit } = getJournalAmountsForAccount(j, accountId);
        startBalance += (normalBalance === 'debit') ? (debit - credit) : (credit - debit);
      }
    }

    const filteredJournals = await collectAll(baseParams());
    let running = startBalance;
    const rows = filteredJournals.map((journal) => {
      const { debit, credit } = getJournalAmountsForAccount(journal, accountId);
      running += (normalBalance === 'debit') ? (debit - credit) : (credit - debit);
      return {
        date: new Date(journal.date).toLocaleDateString('en-US'),
        ref: journal.reference,
        description: getJournalDescriptionForAccount(journal, accountId),
        classLocation: `${journal.status?.charAt(0)?.toUpperCase() + journal.status?.slice(1)} • ${journal.currency}`,
        payment: debit > 0 ? formatCurrency(debit) : '-',
        deposit: credit > 0 ? formatCurrency(credit) : '-',
        balance: formatCurrency(running)
      };
    });
    return rows;
  };

  const exportTableHTML = async () => {
    const headers = ['DATE', 'REFERENCE', 'DESCRIPTION', 'STATUS / CURRENCY', 'DEBIT', 'CREDIT', 'RUNNING BALANCE'];
    const allRows = await buildFullLedgerRows();
    const rowsHtml = (allRows || []).map(r => {
      const safeDesc = (r.description || '')
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `
    <tr>
      <td>${r.date || ''}</td>
      <td>${r.ref || ''}</td>
      <td>${safeDesc}</td>
      <td>${r.classLocation || ''}</td>
      <td style="text-align:right">${r.payment || ''}</td>
      <td style="text-align:right">${r.deposit || ''}</td>
      <td style="text-align:right">${r.balance || ''}</td>
    </tr>`;
    }).join('');

    const filterParts = [
      appliedFilters.startDate && `Start: ${appliedFilters.startDate}`,
      appliedFilters.endDate && `End: ${appliedFilters.endDate}`,
      appliedSearchText && `Search: ${appliedSearchText}`,
      appliedFilters.source && `Source: ${appliedFilters.source}`,
      appliedFilters.reference && `Ref: ${appliedFilters.reference}`
    ].filter(Boolean);
    const filtersHtml = filterParts.length > 0 ? `<div>Filters: ${filterParts.join(' | ')}</div>` : '';
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ledger - ${accountData?.name || ''}</title>
          <style>
            table{border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px}
            th,td{border:1px solid #ddd;padding:8px}
            th{background:#f1f5f9;text-align:left}
          </style>
        </head>
        <body>
          <h2>Ledger - ${accountData?.name || ''}</h2>
          ${filtersHtml}
          <br/>
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`;
  };

  const exportPDF = async () => {
    const html = await exportTableHTML();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const exportXLS = async () => {
    const headers = ['DATE', 'REFERENCE', 'DESCRIPTION', 'STATUS / CURRENCY', 'DEBIT', 'CREDIT', 'RUNNING BALANCE'];
    const rows = await buildFullLedgerRows();
    const esc = (v) => {
      const s = (v ?? '').toString().replace(/"/g, '""');
      return `"${s}"`;
    };
    const csv = [
      headers.map(esc).join(','),
      ...rows.map(r => [r.date, r.ref, r.description, r.classLocation, r.payment, r.deposit, r.balance].map(esc).join(','))
    ].join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${accountData?.name || 'account'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10, }}>
      {/* Header Section */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <Button
            onClick={() => navigate('/home/chartOfAccounts/')}
            style={{
              minWidth: 40,
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'var(--dashboard-card-bg)',
              border: '1px solid var(--dashboard-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginTop: 4
            }}
          >
            <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{
                fontSize: 30,
                fontWeight: 700,
                color: 'var(--sidebar-text-primary)',
                margin: 0
              }}>
                {accountData.name}
              </h1>
              <span style={{
                backgroundColor: accountData.isActive ? '#10B981' : '#EF4444',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                {accountData.isActive ? 'Active' : 'Inactive'}
              </span>
              <span style={{
                backgroundColor: '#3B82F6',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                {accountData.type || 'Assets'}
              </span>
            </div>
            <p style={{ color: '#00000099', fontSize: '14px', }}>
              {accountData.description || 'Money owed to suppliers'}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </div>

      {/* Balance Summary Cards - Two-tone Design Matching Main Page */}
      <div className="flex gap-3 flex-wrap" style={{ marginBottom: 24 }}>
        {/* Current Balance Card */}
        <TaxDashboardBox
          title="Current Balance"
          amount={formatCurrency(accountData?.calculatedBalance)}
          subtitle="Total Balance After Recent Transactions"
        />

        {/* Opening Balance Card */}
        <TaxDashboardBox
          title="Opening Balance"
          amount={formatCurrency(accountData.openingBalance)}
          subtitle="Starting Amount Before New Transactions"
        />
      </div>

      {/* Real-time Filter Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
        }} className="gap-3"
      >
        {/* Search Bar */}
        {/* <div> */}
        <SearchTicket handleInputChangeParent={handleSearchChange} ChartOfAccountsDetails={true} />
        {/* </div> */}

        {/* Real-time Filter Controls */}
        {/* <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}> */}
        <div>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Start Date"
              format="MM/DD/YYYY"
              value={draftFilters.startDate ? dayjs(draftFilters.startDate) : null}
              onChange={(value) => setDraftFilters({ ...draftFilters, startDate: value ? dayjs(value).format('YYYY-MM-DD') : '' })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  InputLabelProps: { shrink: true },
                  sx: {
                    width: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'var(--dashboard-tab-box)'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </div>
        <div>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="End Date"
              format="MM/DD/YYYY"
              value={draftFilters.endDate ? dayjs(draftFilters.endDate) : null}
              onChange={(value) => setDraftFilters({ ...draftFilters, endDate: value ? dayjs(value).format('YYYY-MM-DD') : '' })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  InputLabelProps: { shrink: true },
                  sx: {
                    width: '200px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'var(--dashboard-tab-box)'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </div>
        <div>
          <TextField
            fullWidth
            label="Tenant ID"
            value={draftFilters.tenantId}
            onChange={(e) => setDraftFilters({ ...draftFilters, tenantId: e.target.value })}
            size="small"
            sx={{
              width: '200px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: 'var(--dashboard-tab-box)'
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
            }}
          />
        </div>
        <div>
          <TextField
            fullWidth
            label="Reference"
            value={draftFilters.reference}
            onChange={(e) => setDraftFilters({ ...draftFilters, reference: e.target.value })}
            size="small"
            sx={{
              width: '200px',
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: 'var(--dashboard-tab-box)'
              }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },

            }}
          />
        </div>
        <div>
          <FormControl fullWidth size="small">
            <InputLabel>Sources</InputLabel>
            <Select
              value={draftFilters.source}
              label="Sources"
              onChange={(e) => setDraftFilters({ ...draftFilters, source: e.target.value })}
              sx={{
                width: '200px',
                borderRadius: '8px',
                backgroundColor: 'var(--dashboard-tab-box)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(100, 153, 255, 1)' },
              }}
            >
              <MenuItem value="">All Sources</MenuItem>
              <MenuItem value="manual">Manual</MenuItem>
              <MenuItem value="automatic">Automatic</MenuItem>
              <MenuItem value="import">Import</MenuItem>
            </Select>
          </FormControl>
        </div>
        {/* </Grid> */}

        {/* Filter Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', }}>
          <Button
            variant="outlined"
            onClick={() => {
              const clearedFilters = {
                tenantId: '',
                startDate: '',
                endDate: '',
                reference: '',
                source: ''
              };
              setDraftFilters(clearedFilters);
              setDraftSearchText('');
              setAppliedFilters(clearedFilters);
              setAppliedSearchText('');
              setTransactions([]);
              setSortedTransactions([]);
              setViewEndingBalance(null);
              setPageNum(1);
              setHasMore(true);
              pagesLoadedRef.current = new Set();
              
              // Clear URL parameters
              clearURLParams();
            }}
            sx={{
              // borderColor: '#E2E8F0',
              color: 'black',
              backgroundColor: '#D0D0D0',
              // '&:hover': {
              // borderColor: '#CBD5E1',
              // }
            }}
          >
            Clear Filters
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // Check if filters actually changed before updating
              const filtersChanged = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters) || 
                                   draftSearchText !== appliedSearchText;
              
              // reset list, then apply filters; effect will fetch page 1
              setTransactions([]);
              setSortedTransactions([]);
              setViewEndingBalance(null);
              setAppliedFilters(draftFilters);
              setAppliedSearchText(draftSearchText);
              setPageNum(1);
              setHasMore(true);
              pagesLoadedRef.current = new Set();
              
              // Only update URL if filters actually changed
              if (filtersChanged) {
                updateURLParams(draftFilters, draftSearchText, 1, rowsPerPage);
              }
            }}
            sx={{
              color: 'var(--sidebar-text-selected)',
              backgroundColor: 'rgba(67, 121, 238, 1)',
            }}
          >
            Apply Filters
          </Button>
        </div>
        </div>
      <div style={{
        backgroundColor: 'var(--dashboard-card-bg)',
        borderRadius: 16,
        border: '1px solid var(--dashboard-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--dashboard-border)',
          backgroundColor: 'var(--dashboard-card-bg2)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--dashboard-text-primary)',
            margin: 0
          }}>
            Account Transactions
          </h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button variant="outlined" size="small" onClick={exportPDF}>Export PDF</Button>
            <Button variant="outlined" size="small" onClick={exportXLS}>Export XLS</Button>
          </div>
        </div>

        {/* Transactions List (infinite scroll) */}
        <div
          ref={scrollRef}
          onScroll={handleScrollContainer}
          style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'auto' }}
        >
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 140px 1fr 160px 140px 140px 180px 120px',
            minWidth: '1120px',
            padding: '10px 16px',
            background: 'var(--dashboard-card-bg2)',
            color: 'var(--dashboard-text-secondary)',
            fontWeight: 600,
            fontSize: 12,
            position: 'sticky',
            top: 0,
            zIndex: 1
          }}>
            <div>DATE</div>
            <div>REFERENCE</div>
            <div>DESCRIPTION</div>
            <div style={{ textAlign: 'center' }}>STATUS / CURRENCY</div>
            <div style={{ textAlign: 'right' }}>DEBIT</div>
            <div style={{ textAlign: 'right' }}>CREDIT</div>
            <div style={{ textAlign: 'right' }}>RUNNING BALANCE</div>
          <div style={{ textAlign: 'center' }}>ACTION</div>
          </div>

          {loading && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <CircularProgress size={20} thickness={4} />
            </div>
          )}

          {(sortedTransactions || []).map((r, idx) => (
            <div
              key={`${r.id}-${idx}`}
              data-entry-id={r.id}
              onClick={() => handleRowClick(r)}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 140px 1fr 160px 140px 140px 180px 120px',
                minWidth: '1120px',
                padding: '12px 16px',
                borderTop: '1px solid var(--dashboard-border)',
                cursor: 'pointer',
                color: 'var(--table-cell-text)',
                background: highlightEntryId === r.id
                  ? 'rgba(12, 121, 247, 0.18)'
                  : (idx % 2 === 0 ? 'var(--table-cell-bg)' : 'var(--table-cell-alt-bg)')
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--table-cell-text)', textAlign: 'left' }}>{r.date}</div>
              <div style={{ fontSize: 13, color: 'var(--table-cell-text)', textAlign: 'left' }}>{r.ref}</div>
              <div
                title={r.description || ''}
                style={{
                  fontSize: 13,
                  color: 'var(--table-cell-text)',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal'
                }}
              >
                {r.description}
              </div>
              <div style={{ fontSize: 13, color: 'var(--dashboard-text-secondary)', textAlign: 'center' }}>{r.classLocation}</div>
              <div style={{ fontSize: 13, color: 'var(--table-cell-text)', textAlign: 'right' }}>{r.payment}</div>
              <div style={{ fontSize: 13, color: 'var(--table-cell-text)', textAlign: 'right' }}>{r.deposit}</div>
              <div style={{ fontSize: 13, color: 'var(--table-cell-text)', textAlign: 'right' }}>{r.balance}</div>
              <div style={{ textAlign: 'center' }}>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={(e) => { e.stopPropagation(); setRowToDeleteId(r.id); setRowConfirmOpen(true); }}
                  disabled={rowDeletingId === r.id}
                >
                  {rowDeletingId === r.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}

          {/* Load more indicator */}
          {isFetchingMore && (
            <div style={{ padding: 12, textAlign: 'center' }}>
              <CircularProgress size={18} thickness={4} />
            </div>
          )}
          {!hasMore && (
            <div style={{ padding: 12, textAlign: 'center', color: '#64748B' }}>End of results</div>
          )}
        </div>
        {/* Previous table implementation commented out as requested */}
        {/**
        <div style={{ padding: 0 }}>
          <MemoTable ... />
        </div>
        **/}
      </div>

      {/* Info Dialog */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="xs" fullWidth sx={{ zIndex: 99999 }}>
        <DialogTitle sx={{
          pb: 0.5,   // ↓ less space below heading
          mb: 0,
          fontWeight: 600
        }}>{infoTitle}</DialogTitle>
        <DialogContent sx={{
          pt: 0.5,   // ↓ less space above content
          pb: 1
        }}>
          <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>{infoMessage}</p>
        </DialogContent>
        <DialogActions sx={{
          px: 2,     // → space from left/right (right feels better)
          pb: 2,     // ↓ space from bottom
          justifyContent: "flex-end",
          gap: 1
        }}>
          <Button onClick={() => setInfoOpen(false)}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth sx={{ zIndex: 99999 }}>
        <DialogTitle sx={{
          pb: 0.5,   // ↓ less space below heading
          mb: 0,
          fontWeight: 600
        }}>Delete Account</DialogTitle>
        <DialogContent sx={{
          pt: 0.5,   // ↓ less space above content
          pb: 1
        }}>
          <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>Are you sure you want to delete this account? This action cannot be undone.</p>
        </DialogContent>
        <DialogActions sx={{
          px: 2,     // → space from left/right (right feels better)
          pb: 2,     // ↓ space from bottom
          justifyContent: "flex-end",
          gap: 1
        }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="error" variant="contained" onClick={proceedDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      {/* Row Journal Delete Dialog */}
      <Dialog open={rowConfirmOpen} onClose={() => !rowDeletingId && setRowConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0.5, fontWeight: 600 }}>Delete Journal</DialogTitle>
        <DialogContent sx={{ pt: 0.5, pb: 1 }}>
          <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>
            Are you sure you want to delete this journal? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setRowConfirmOpen(false)} disabled={!!rowDeletingId}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => handleDeleteJournal(rowToDeleteId)} disabled={!rowToDeleteId || !!rowDeletingId}>
            {rowDeletingId ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
