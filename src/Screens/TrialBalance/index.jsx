import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Backdrop,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Box,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  FormControlLabel,
  Chip,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import TuneIcon from '@mui/icons-material/Tune';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Heading from '../../Components/Heading';
import { IoIosArrowBack } from 'react-icons/io';
import { baseURl } from '../../Config/systemConfig';
import { downloadFileWithToken, getRequestWithOutBody } from '../../Api/fetch';
import AccountLedgerModal from '../../Components/AccountLedgerModal';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const currency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(parseFloat(n || 0));

export default function TrialBalance() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const companyName = userData?.tenant?.name || '';
  const blurActiveElement = () => {
    if (typeof document === 'undefined') return;
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') {
      el.blur();
    }
  };
  const tenantId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('userDetails') || '{}');
      return u?.tenantId || u?.tenant?.id || u?.tenant?.tenantId || u?.company?.tenantId || u?.company?.id || '';
    } catch (_) {
      return '';
    }
  })();
  const defaultFilters = {
    time: 'thisMonth',
    startDate: '',
    endDate: '',
    accountingBasis: 'accrual',
    columnsBy: 'total',
    displayColumnsBy: 'total',
    rowFilter: 'all',
    includeZeros: false,
    includeInactive: false,
    compare: [],
    includeCompareDeltas: false,
    includePercentOfIncome: false,
  };

  const FILTER_STORAGE_KEY = 'trialBalance.filters.v1';

  const COLORS = {
    border: '#e5e7eb',
    text: 'var(--dashboard-text-primary)',
    subtext: 'var(--dashboard-text-secondary)',
  };

  const compareOptions = [
    { value: 'pp', label: 'Previous period' },
    { value: 'py', label: 'Previous year' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'py_ytd', label: 'Previous year to date' },
  ];

  const [rows, setRows] = useState([]); // { id, name, debit, credit }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportMeta, setReportMeta] = useState({
    period: null,
    columns: [],
    totals: null,
    totalsByColumn: [],
    comparisons: null,
  });
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [isInitializing, setIsInitializing] = useState(true);
  const [openMap, setOpenMap] = useState({});
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState(null);
  const [ledgerStartISO, setLedgerStartISO] = useState(null);
  const [ledgerEndISO, setLedgerEndISO] = useState(null);
  const restoredLedgerRef = useRef(false);

  const handleSort = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);

    const sortTree = (items) => {
      const list = Array.isArray(items) ? items : [];
      return list.map((item) => {
        const children = Array.isArray(item?.children) ? item.children : [];
        const sortedChildren = [...children].sort((a, b) => {
          const aVal = Number(a?.debit ?? 0) + Number(a?.credit ?? 0);
          const bVal = Number(b?.debit ?? 0) + Number(b?.credit ?? 0);
          return newOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
        return {
          ...item,
          children: sortTree(sortedChildren),
        };
      });
    };

    setRows((prev) => sortTree(prev));
  };

  const toggleAllRows = (rowsData) => {
    const newState = {};
    const walk = (items, level = 0) => {
      (items || []).forEach((item, idx) => {
        const id = item?.id ?? `row-${level}-${idx}`;
        const hasChildren = Array.isArray(item?.children) && item.children.length > 0;
        if (hasChildren) {
          newState[id] = isAllCollapsed;
          walk(item.children, level + 1);
        }
      });
    };
    walk(rowsData, 0);
    setOpenMap(newState);
    setIsAllCollapsed(!isAllCollapsed);
  };

  useEffect(() => {
    if (!rows || rows.length === 0) return;

    const allIds = [];
    const walk = (items, level = 0) => {
      (items || []).forEach((item, idx) => {
        const id = item?.id ?? `row-${level}-${idx}`;
        const hasChildren = Array.isArray(item?.children) && item.children.length > 0;
        if (hasChildren) {
          allIds.push(id);
          walk(item.children, level + 1);
        }
      });
    };
    walk(rows, 0);

    const allClosed = allIds.length
      ? allIds.every((id) => {
        const open = Object.prototype.hasOwnProperty.call(openMap, id) ? openMap[id] : true;
        return open === false;
      })
      : false;

    if (allClosed !== isAllCollapsed) setIsAllCollapsed(allClosed);
  }, [rows, openMap, isAllCollapsed]);

  useEffect(() => {
    const state = location.state;
    if (state?.returnToLedger && state?.ledgerAccountId && !restoredLedgerRef.current) {
      setLedgerAccountId(state.ledgerAccountId);
      setLedgerOpen(true);
      restoredLedgerRef.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    try {
      const raw = sessionStorage.getItem('accountLedgerContext') || sessionStorage.getItem('balanceSheetLedgerContext');
      if (raw && !restoredLedgerRef.current) {
        const context = JSON.parse(raw);
        const samePath = String(context?.returnPath || '') === String(location.pathname);
        if (context?.returnToLedger && context?.ledgerAccountId && samePath) {
          setLedgerAccountId(context.ledgerAccountId);
          setLedgerOpen(true);
          restoredLedgerRef.current = true;
        }
      }
    } catch (_) {
      // ignore
    }
  }, [location.state, location.pathname, navigate]);

  const totals = useMemo(() => {
    const periodTotals = reportMeta?.totals?.period;
    if (periodTotals && (periodTotals.debit !== undefined || periodTotals.credit !== undefined)) {
      return {
        debit: parseFloat(periodTotals.debit || 0),
        credit: parseFloat(periodTotals.credit || 0),
      };
    }
    let debit = 0, credit = 0;
    const walk = (list) => {
      list.forEach((r) => {
        const hasChildren = Array.isArray(r.children) && r.children.length > 0;
        if (hasChildren) {
          walk(r.children);
        } else {
          debit += parseFloat(r.debit || 0);
          credit += parseFloat(r.credit || 0);
        }
      });
    };
    walk(rows || []);
    return { debit, credit };
  }, [rows, reportMeta?.totals]);

  const getFiltersFromURL = () => {
    const compareParam = searchParams.get('compare');
    return {
      time: searchParams.get('time') || defaultFilters.time,
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      accountingBasis: searchParams.get('accountingBasis') || defaultFilters.accountingBasis,
      columnsBy: searchParams.get('columnsBy') || defaultFilters.columnsBy,
      displayColumnsBy: searchParams.get('displayColumnsBy') || defaultFilters.displayColumnsBy,
      rowFilter: searchParams.get('rowFilter') || defaultFilters.rowFilter,
      includeZeros: searchParams.get('includeZeros')
        ? searchParams.get('includeZeros') === 'true'
        : defaultFilters.includeZeros,
      includeInactive: searchParams.get('includeInactive')
        ? searchParams.get('includeInactive') === 'true'
        : defaultFilters.includeInactive,
      compare: compareParam ? compareParam.split(',').filter(Boolean) : defaultFilters.compare,
      includeCompareDeltas: searchParams.get('includeCompareDeltas')
        ? searchParams.get('includeCompareDeltas') === 'true'
        : defaultFilters.includeCompareDeltas,
      includePercentOfIncome: searchParams.get('includePercentOfIncome')
        ? searchParams.get('includePercentOfIncome') === 'true'
        : defaultFilters.includePercentOfIncome,
    };
  };

  const updateURLWithFilters = (filters) => {
    const params = new URLSearchParams();

    if (filters.time) params.set('time', filters.time);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.accountingBasis) params.set('accountingBasis', filters.accountingBasis);
    if (filters.columnsBy) params.set('columnsBy', filters.columnsBy);
    if (filters.displayColumnsBy) params.set('displayColumnsBy', filters.displayColumnsBy);
    if (filters.rowFilter) params.set('rowFilter', filters.rowFilter);

    params.set('includeZeros', String(filters.includeZeros));
    params.set('includeInactive', String(filters.includeInactive));
    params.set('includeCompareDeltas', String(filters.includeCompareDeltas));
    params.set('includePercentOfIncome', String(filters.includePercentOfIncome));

    if (filters.compare?.length) params.set('compare', filters.compare.join(','));

    setSearchParams(params);
  };

  const clearURLParams = () => {
    setSearchParams(new URLSearchParams());
  };

  useEffect(() => {
    try {
      const fromAccountsReports = location.state?.fromAccountsReports;
      if (fromAccountsReports) {
        localStorage.removeItem(FILTER_STORAGE_KEY);
        clearURLParams();
        setDraftFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        load(defaultFilters);

        window.history.replaceState({}, document.title);
      }
    } catch (_) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const fromAccountsReports = location.state?.fromAccountsReports;

      if (fromAccountsReports) {
        // Clear all filters and use defaults when coming from AccountsReports
        localStorage.removeItem(FILTER_STORAGE_KEY);
        clearURLParams();
        setDraftFilters(defaultFilters);
        setAppliedFilters(defaultFilters);

        // Clear the state flag to avoid re-triggering on subsequent navigations
        window.history.replaceState({}, document.title);
      } else {
        const saved = localStorage.getItem(FILTER_STORAGE_KEY);
        const urlFilters = getFiltersFromURL();
        const hasURLParams = searchParams.toString().length > 0;

        if (hasURLParams) {
          setDraftFilters(urlFilters);
          setAppliedFilters(urlFilters);
        } else if (saved) {
          const parsed = JSON.parse(saved);
          const normalized = { ...defaultFilters, ...parsed };
          setDraftFilters(normalized);
          setAppliedFilters(normalized);
        } else {
          setDraftFilters(defaultFilters);
          setAppliedFilters(defaultFilters);
        }
      }
    } catch (_) {
      setDraftFilters(defaultFilters);
      setAppliedFilters(defaultFilters);
    }

    setIsInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (!isInitializing) {
      updateURLWithFilters(appliedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, isInitializing]);

  const buildDatesForApi = (filters) => {
    let { startDate, endDate, time } = filters;

    if (startDate && endDate) {
      return { startDate, endDate };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start;
    let end;

    if (time === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (time === 'lastMonth') {
      const firstThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      start = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
      end = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth(), 0);
    } else if (time === 'thisQuarter') {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), quarterStartMonth, 1);
      end = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
    } else if (time === 'lastQuarter') {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), quarterStartMonth - 3, 1);
      end = new Date(today.getFullYear(), quarterStartMonth, 0);
    } else if (time === 'thisYear') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    } else if (time === 'lastYear') {
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31);
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    const toYYYYMMDD = (dateObj) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    return {
      startDate: toYYYYMMDD(start),
      endDate: toYYYYMMDD(end),
    };
  };

  const normalizeColumnsBy = (value) => {
    if (!value) return 'total';
    const v = String(value).toLowerCase();
    if (v === 'months' || v === 'month') return 'month';
    if (v === 'quarters' || v === 'quarter') return 'quarter';
    if (v === 'years' || v === 'year') return 'year';
    if (v === 'weeks' || v === 'week') return 'week';
    if (v === 'days' || v === 'day') return 'day';
    return v;
  };

  const buildParamsStringWithRawCompare = (params, rawCompare) => {
    if (!rawCompare) return params.toString();
    const str = params.toString();
    return str.replace(/(^|&)compare=[^&]*/i, `$1compare=${rawCompare}`);
  };

  const handleCompareToggle = (value) => {
    setDraftFilters((prev) => {
      const exists = prev.compare.includes(value);
      const updated = exists
        ? prev.compare.filter((item) => item !== value)
        : [...prev.compare, value];
      return { ...prev, compare: updated };
    });
  };

  const handleApplyFilters = () => {
    const filters = { ...draftFilters };

    filters.displayColumnsBy = filters.columnsBy;

    if (filters.time !== 'custom') {
      filters.startDate = '';
      filters.endDate = '';
    }

    if ((filters.startDate && !filters.endDate) || (!filters.startDate && filters.endDate)) {
      toast.error('Please select both start date and end date, or clear both dates');
      return;
    }

    setAppliedFilters(filters);

    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch (_) { }

    load(filters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      ...defaultFilters,
      startDate: '',
      endDate: '',
      time: 'thisMonth',
    };

    setDraftFilters(clearedFilters);
    setAppliedFilters(clearedFilters);

    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (_) { }

    clearURLParams();
    load(clearedFilters);
  };

  // Single endpoint fetch: account-report/trialbalance
  const fetchTrialBalance = async (filters) => {
    const { startDate, endDate } = buildDatesForApi(filters);

    const normalizedColumnsBy = normalizeColumnsBy(filters.columnsBy);
    const normalizedDisplayColumnsBy = normalizeColumnsBy(filters.displayColumnsBy);

    const rawCompare = filters.compare.join(',');

    const params = new URLSearchParams({
      startDate,
      endDate,
      accountingBasis: filters.accountingBasis,
      columnsBy: normalizedColumnsBy,
      includeZeros: String(filters.includeZeros),
      rowFilter: filters.rowFilter,
      includeInactive: String(filters.includeInactive),
      compare: rawCompare,
      includeCompareDeltas: String(filters.includeCompareDeltas),
      includePercentOfIncome: String(filters.includePercentOfIncome),
      displayColumnsBy: normalizedDisplayColumnsBy,
    });

    if (tenantId) params.set('tenantId', String(tenantId));

    const url = `${baseURl}account-report/trialbalance?${buildParamsStringWithRawCompare(params, rawCompare)}`;
    const resp = await getRequestWithOutBody(url, accessToken);
    const payload = resp?.data ?? resp;
    const data = payload?.data ?? payload;
    const accounts = data?.accounts || [];
    const toNum = (n) => parseFloat(n || 0);
    const mapNode = (node) => ({
      id: node.id,
      label: node.name,
      code: node.code,
      byColumn: node.byColumn || {},
      comparisons: node.comparisons || null,
      debit: toNum(node.debit),
      credit: toNum(node.credit),
      children: Array.isArray(node.children) ? node.children.map(mapNode) : [],
    });
    return {
      rows: Array.isArray(accounts) ? accounts.map(mapNode) : [],
      meta: {
        period: data?.period || null,
        columns: Array.isArray(data?.columns) ? data.columns : [],
        totals: data?.totals || null,
        totalsByColumn: Array.isArray(data?.totalsByColumn) ? data.totalsByColumn : [],
        comparisons: data?.comparisons || null,
      },
    };
  };

  const load = async (filtersArg) => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try {
      const filtersToUse = filtersArg || appliedFilters;
      const { startDate, endDate } = buildDatesForApi(filtersToUse);
      if ((filtersToUse?.time === 'custom') && (!startDate || !endDate)) {
        setRows([]);
        setError('Please select both Start Date and End Date to run Trial Balance.');
        return;
      }

      const result = await fetchTrialBalance(filtersToUse);
      setRows(result?.rows || []);
      setReportMeta(result?.meta || { period: null, columns: [], totals: null, totalsByColumn: [], comparisons: null });
    } catch (e) {
      setError('Failed to build trial balance');
      setRows([]);
      setReportMeta({ period: null, columns: [], totals: null, totalsByColumn: [], comparisons: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    if (isInitializing) return;
    load(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isInitializing, appliedFilters]);

  const toggleRow = (id, currentOpen) => {
    setOpenMap((prev) => ({
      ...prev,
      [id]: !(Object.prototype.hasOwnProperty.call(prev, id) ? prev[id] : currentOpen),
    }));
  };

  const normalizePeriodDate = (dateStr) => {
    if (!dateStr) return '';
    const s = String(dateStr).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const toStartISOFromYYYYMMDD = (d) => new Date(`${normalizePeriodDate(d)}T00:00:00.000Z`).toISOString();
  const toEndISOFromYYYYMMDD = (d) => new Date(`${normalizePeriodDate(d)}T23:59:59.999Z`).toISOString();

  const getCurrentReportPeriodDates = () => buildDatesForApi(appliedFilters);

  const getComparisonPeriodDates = (apiKey) => {
    const periodData = reportMeta?.comparisons?.[apiKey]?.period;
    if (!periodData?.startDate || !periodData?.endDate) return null;
    return {
      startDate: periodData.startDate,
      endDate: periodData.endDate,
    };
  };

  const openAccountLedger = (accountId, dateRange) => {
    if (!accountId) return;
    const start = normalizePeriodDate(dateRange?.startDate);
    const end = normalizePeriodDate(dateRange?.endDate);
    if (start && end) {
      setLedgerStartISO(toStartISOFromYYYYMMDD(start));
      setLedgerEndISO(toEndISOFromYYYYMMDD(end));
    } else {
      const current = getCurrentReportPeriodDates();
      setLedgerStartISO(
        current?.startDate ? toStartISOFromYYYYMMDD(current.startDate) : null
      );
      setLedgerEndISO(
        current?.endDate ? toEndISOFromYYYYMMDD(current.endDate) : null
      );
    }
    setLedgerAccountId(accountId);
    setLedgerOpen(true);
    sessionStorage.removeItem('accountLedgerContext');
    sessionStorage.removeItem('balanceSheetLedgerContext');
  };

  const compareColumns = useMemo(() => {
    const compareKeyMap = {
      pp: 'previousPeriod',
      py: 'previousYear',
      ytd: 'yearToDate',
      py_ytd: 'previousYearToDate',
    };

    const list = Array.isArray(appliedFilters?.compare) ? appliedFilters.compare : [];
    return list
      .map((value) => {
        const opt = compareOptions.find((o) => o.value === value);
        const apiKey = compareKeyMap[value] || value;
        return {
          value,
          apiKey,
          label: opt?.label || value,
        };
      })
      .filter(Boolean);
  }, [appliedFilters?.compare, compareOptions]);

  const readComparePeriodTotals = (obj) => {
    const period = obj?.totals?.period || obj?.period || obj?.totals || obj;
    return {
      debit: parseFloat(period?.debit || 0),
      credit: parseFloat(period?.credit || 0),
    };
  };

  const filteredRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    if (appliedFilters?.rowFilter !== 'nonzero') return list;

    const columnMode = normalizeColumnsBy(appliedFilters?.columnsBy) !== 'total';

    const hasNonZeroByColumn = (byColumn) => {
      if (!byColumn || typeof byColumn !== 'object') return false;
      return Object.values(byColumn).some((v) => {
        const d = parseFloat(v?.debit || 0);
        const c = parseFloat(v?.credit || 0);
        return d !== 0 || c !== 0;
      });
    };

    const nodeHasNonZero = (node) => {
      const d = parseFloat(node?.debit || 0);
      const c = parseFloat(node?.credit || 0);
      if (d !== 0 || c !== 0) return true;
      if (columnMode && hasNonZeroByColumn(node?.byColumn)) return true;
      return false;
    };

    const filterTree = (nodes) => {
      const out = [];
      nodes.forEach((n) => {
        const children = Array.isArray(n?.children) ? n.children : [];
        const filteredChildren = filterTree(children);
        const keep = filteredChildren.length > 0 || nodeHasNonZero(n);
        if (keep) out.push({ ...n, children: filteredChildren });
      });
      return out;
    };

    return filterTree(list);
  }, [rows, appliedFilters?.rowFilter, appliedFilters?.columnsBy]);

  const isColumnMode = useMemo(() => normalizeColumnsBy(appliedFilters.columnsBy) !== 'total', [appliedFilters.columnsBy]);
  const activeColumns = useMemo(() => (isColumnMode && Array.isArray(reportMeta?.columns) ? reportMeta.columns : []), [isColumnMode, reportMeta?.columns]);

  const totalsByColumnMap = useMemo(() => {
    const map = {};
    const list = Array.isArray(reportMeta?.totalsByColumn) ? reportMeta.totalsByColumn : [];
    list.forEach((item) => {
      if (item?.key) map[item.key] = item;
    });
    return map;
  }, [reportMeta?.totalsByColumn]);

  const renderRowsWithColumns = (rowsData, depth = 0) => {
    const items = [];
    const toNum = (n) => parseFloat(n || 0);
    const walk = (list, level) => {
      list.forEach((row, index) => {
        const hasChildren = Array.isArray(row.children) && row.children.length > 0;
        const rowId = row.id ?? `row-${level}-${index}`;
        const isOpen = openMap[rowId] !== undefined ? openMap[rowId] : true;
        const label = row.label || '';
        const debit = row.debit ?? 0;
        const credit = row.credit ?? 0;
        const bold = hasChildren && level === 0;
        const rowComparisons = row?.comparisons || {};

        const clickable = !!row.id;
        const currentPeriodDates = getCurrentReportPeriodDates();
        const ledgerCellSx = clickable
          ? { cursor: 'pointer' }
          : {};
        items.push(
          <TableRow
            key={rowId}
            sx={{ '& td': { borderBottom: '1px solid #D1D5DC' }, cursor: clickable ? 'pointer' : 'default' }}
          >
            <TableCell
              onClick={(e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, currentPeriodDates);
              }}
              sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', position: 'sticky', left: 0, backgroundColor: 'var(--dashboard-card-bg)', zIndex: 1, ...ledgerCellSx }}
            >
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: level * 16 }}>
                {hasChildren && (
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleRow(rowId, isOpen); }} sx={{ mr: 1, color: 'var(--dashboard-text-primary)' }}>
                    {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                  </IconButton>
                )}
                {!hasChildren && level > 0 && <span style={{ width: 32, display: 'inline-block' }} />}
                <span style={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)' }}>{label}</span>
              </div>
            </TableCell>

            {activeColumns.map((col) => {
              const by = row?.byColumn?.[col.key] || {};
              const colDates =
                col?.startDate && col?.endDate
                  ? { startDate: col.startDate, endDate: col.endDate }
                  : currentPeriodDates;
              const openColLedger = (e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, colDates);
              };
              return (
                <React.Fragment key={col.key}>
                  <TableCell align="right" onClick={openColLedger} sx={{ color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}>{currency(toNum(by.debit))}</TableCell>
                  <TableCell align="right" onClick={openColLedger} sx={{ color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}>{currency(toNum(by.credit))}</TableCell>
                </React.Fragment>
              );
            })}

            <TableCell
              align="right"
              onClick={(e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, currentPeriodDates);
              }}
              sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}
            >
              {currency(debit)}
            </TableCell>
            <TableCell
              align="right"
              onClick={(e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, currentPeriodDates);
              }}
              sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}
            >
              {currency(credit)}
            </TableCell>
            {compareColumns.map((cc) => {
              const val = rowComparisons?.[cc.apiKey];
              const t = readComparePeriodTotals(val);
              const compareDates = getComparisonPeriodDates(cc.apiKey);
              const openCompareLedger = (e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, compareDates);
              };
              return (
                <React.Fragment key={cc.apiKey}>
                  <TableCell align="right" onClick={openCompareLedger} sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}>{currency(t.debit)}</TableCell>
                  <TableCell align="right" onClick={openCompareLedger} sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}>{currency(t.credit)}</TableCell>
                </React.Fragment>
              );
            })}
          </TableRow>
        );

        if (hasChildren && isOpen) walk(row.children, level + 1);
      });
    };

    walk(rowsData, depth);
    return items;
  };

  const renderRows = (rowsData, depth = 0) => {
    const items = [];
    const walk = (list, level) => {
      list.forEach((row, index) => {
        const hasChildren = Array.isArray(row.children) && row.children.length > 0;
        const rowId = row.id ?? `row-${level}-${index}`;
        const isOpen = openMap[rowId] !== undefined ? openMap[rowId] : true;
        const label = row.label || '';
        const debit = row.debit ?? 0;
        const credit = row.credit ?? 0;
        const bold = hasChildren && level === 0;

        // Any row with a valid account id can open the ledger modal
        const clickable = !!row.id;
        const rowComparisons = row?.comparisons || {};
        const currentPeriodDates = getCurrentReportPeriodDates();
        const ledgerCellSx = clickable
          ? { cursor: 'pointer' }
          : {};
        items.push(
          <TableRow key={rowId} sx={{ '& td': { borderBottom: '1px solid #D1D5DC' }, cursor: clickable ? 'pointer' : 'default' }}>
            <TableCell
              onClick={(e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, currentPeriodDates);
              }}
              sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}
            >
              <div style={{ display: 'flex', alignItems: 'center', paddingLeft: level * 16 }}>
                {hasChildren && (
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleRow(rowId, isOpen); }} sx={{ mr: 1, color: 'var(--dashboard-text-primary)' }}>
                    {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                  </IconButton>
                )}
                {!hasChildren && level > 0 && <span style={{ width: 32, display: 'inline-block' }} />}
                <span style={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)' }}>{label}</span>
              </div>
            </TableCell>
            <TableCell
              align="right"
              onClick={(e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, currentPeriodDates);
              }}
              sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}
            >
              {currency(debit)}
            </TableCell>
            <TableCell
              align="right"
              onClick={(e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, currentPeriodDates);
              }}
              sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}
            >
              {currency(credit)}
            </TableCell>
            {compareColumns.map((cc) => {
              const val = rowComparisons?.[cc.apiKey];
              const t = readComparePeriodTotals(val);
              const compareDates = getComparisonPeriodDates(cc.apiKey);
              const openCompareLedger = (e) => {
                if (!clickable) return;
                e.stopPropagation();
                openAccountLedger(row.id, compareDates);
              };
              return (
                <React.Fragment key={cc.apiKey}>
                  <TableCell align="right" onClick={openCompareLedger} sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}>{currency(t.debit)}</TableCell>
                  <TableCell align="right" onClick={openCompareLedger} sx={{ fontWeight: bold ? 700 : 400, color: 'var(--dashboard-text-primary)', ...ledgerCellSx }}>{currency(t.credit)}</TableCell>
                </React.Fragment>
              );
            })}
          </TableRow>
        );
        if (hasChildren && isOpen) walk(row.children, level + 1);
      });
    };
    walk(rowsData, depth);
    return items;
  };

  const getPeriodLabel = () => {
    const { endDate } = buildDatesForApi(appliedFilters);
    return endDate ? `As of ${dayjs(endDate).format('MMMM D, YYYY')}` : '';
  };

  const escapeCsvCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatCsvValue = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return value.toFixed(2);
    return value;
  };

  const formatExportCellDisplay = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return currency(value);
    return String(value);
  };

  const buildCenteredTitleRow = (title, colCount) => {
    const row = Array(Math.max(colCount, 1)).fill('');
    if (colCount <= 1) {
      row[0] = title;
      return row;
    }
    const dataColCount = colCount - 1;
    const centerIndex = 1 + Math.floor((dataColCount - 1) / 2);
    row[centerIndex] = title;
    return row;
  };

  const getCompareAmountValues = (rowComparisons) => {
    const vals = [];
    compareColumns.forEach((cc) => {
      const t = readComparePeriodTotals(rowComparisons?.[cc.apiKey]);
      vals.push(t.debit, t.credit);
    });
    return vals;
  };

  const getCompareTotalsValues = () => {
    const vals = [];
    compareColumns.forEach((cc) => {
      const t = readComparePeriodTotals(reportMeta?.comparisons?.[cc.apiKey]);
      vals.push(t.debit, t.credit);
    });
    return vals;
  };

  const buildExportHeaders = () => {
    const headers = ['Account'];
    if (isColumnMode) {
      activeColumns.forEach((col) => {
        headers.push(`${col.label} Debit`, `${col.label} Credit`);
      });
      headers.push('Total Debit', 'Total Credit');
    } else {
      headers.push('Debit', 'Credit');
    }
    compareColumns.forEach((cc) => {
      headers.push(`${cc.label} Debit`, `${cc.label} Credit`);
    });
    return headers;
  };

  const getRowAmountValues = (row) => {
    const toNum = (n) => parseFloat(n || 0);
    const vals = [];
    if (isColumnMode) {
      activeColumns.forEach((col) => {
        const by = row?.byColumn?.[col.key] || {};
        vals.push(toNum(by.debit), toNum(by.credit));
      });
      vals.push(toNum(row.debit), toNum(row.credit));
    } else {
      vals.push(toNum(row.debit), toNum(row.credit));
    }
    vals.push(...getCompareAmountValues(row?.comparisons || {}));
    return vals;
  };

  const getTotalsAmountValues = () => {
    const vals = [];
    if (isColumnMode) {
      activeColumns.forEach((col) => {
        const t = totalsByColumnMap[col.key]?.totals || totalsByColumnMap[col.key] || {};
        vals.push(parseFloat(t?.debit || 0), parseFloat(t?.credit || 0));
      });
      vals.push(totals.debit, totals.credit);
    } else {
      vals.push(totals.debit, totals.credit);
    }
    vals.push(...getCompareTotalsValues());
    return vals;
  };

  const collectTrialBalanceExportRows = () => {
    const exportRows = [];
    const walk = (list, level = 0) => {
      list.forEach((row, index) => {
        const hasChildren = Array.isArray(row.children) && row.children.length > 0;
        const bold = hasChildren && level === 0;
        const indent = level > 0 ? '  '.repeat(level) : '';
        const label = row.label || '';
        exportRows.push({
          values: [`${indent}${label}`, ...getRowAmountValues(row)],
          meta: { bold },
        });
        if (hasChildren) walk(row.children, level + 1);
      });
    };
    walk(filteredRows);
    exportRows.push({
      values: ['Total', ...getTotalsAmountValues()],
      meta: { bold: true, isTotal: true },
    });
    return exportRows;
  };

  const getTrialBalanceExportPayload = () => {
    if (!filteredRows?.length) return null;
    return {
      headers: buildExportHeaders(),
      exportRows: collectTrialBalanceExportRows(),
      companyTitle: (companyName || '').toUpperCase() || 'TRIAL BALANCE REPORT',
      period: getPeriodLabel(),
    };
  };

  const buildTrialBalancePdfDoc = async (payload) => {
    const { jsPDF } = await import('jspdf');
    const { headers, exportRows, companyTitle, period } = payload;
    const orientation = headers.length > 5 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

    const marginX = 36;
    const marginTop = 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginX * 2;
    const headerBg = [248, 250, 252];
    const borderColor = [229, 231, 235];
    const subtextColor = [100, 116, 139];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(companyTitle, pageWidth / 2, marginTop, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Trial Balance', pageWidth / 2, marginTop + 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...subtextColor);
    doc.text(period, pageWidth / 2, marginTop + 36, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const accountWidth = Math.min(Math.max(contentWidth * 0.28, 120), contentWidth * 0.4);
    const dataColCount = Math.max(headers.length - 1, 0);
    const dataColWidth = dataColCount > 0 ? (contentWidth - accountWidth) / dataColCount : contentWidth;
    const colWidths = headers.map((_, idx) => (idx === 0 ? accountWidth : dataColWidth));

    const fontSize = headers.length > 8 ? 6 : headers.length > 5 ? 7 : headers.length > 3 ? 8 : 9;
    const paddingX = 4;
    const paddingY = 4;
    const minRowHeight = 16;
    let y = marginTop + 58;

    const getColX = (colIdx) => marginX + colWidths.slice(0, colIdx).reduce((sum, w) => sum + w, 0);

    const drawTableRow = (rawValues, { isHeader = false, isBold = false } = {}) => {
      const displayValues = rawValues.map((value, idx) =>
        isHeader ? String(value ?? '') : formatExportCellDisplay(value)
      );

      doc.setFontSize(fontSize);
      const lineHeights = displayValues.map((text, colIdx) => {
        const maxWidth = colWidths[colIdx] - paddingX * 2;
        const wrapped = doc.splitTextToSize(String(text ?? ''), Math.max(maxWidth, 20));
        return Math.max(wrapped.length * (fontSize + 2) + paddingY * 2, minRowHeight);
      });
      const rowHeight = Math.max(...lineHeights, minRowHeight);

      if (y + rowHeight > pageHeight - 36) {
        doc.addPage();
        y = 36;
        drawTableRow(headers, { isHeader: true, isBold: true });
      }

      if (isHeader) {
        doc.setFillColor(...headerBg);
        doc.rect(marginX, y, contentWidth, rowHeight, 'F');
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      }

      doc.setDrawColor(...borderColor);
      doc.rect(marginX, y, contentWidth, rowHeight);

      displayValues.forEach((text, colIdx) => {
        const x = getColX(colIdx);
        const w = colWidths[colIdx];
        doc.rect(x, y, w, rowHeight);
        const maxWidth = w - paddingX * 2;
        const wrapped = doc.splitTextToSize(String(text ?? ''), Math.max(maxWidth, 20));
        const textY = y + paddingY + fontSize;

        if (colIdx === 0) {
          doc.text(wrapped, x + paddingX, textY);
        } else {
          wrapped.forEach((line, lineIdx) => {
            doc.text(line, x + w - paddingX, textY + lineIdx * (fontSize + 2), { align: 'right' });
          });
        }
      });

      y += rowHeight;
    };

    drawTableRow(headers, { isHeader: true, isBold: true });
    exportRows.forEach(({ values, meta }) => {
      drawTableRow(values, { isBold: meta.bold || meta.isTotal });
    });

    return doc;
  };

  const exportApiFallback = async (type, filename) => {
    const { startDate, endDate } = buildDatesForApi(appliedFilters);
    if (appliedFilters.time === 'custom' && (!startDate || !endDate)) {
      toast.error('Please select both Start Date and End Date');
      return;
    }
    const rawCompare = appliedFilters.compare.join(',');
    const params = new URLSearchParams({
      type,
      startDate,
      endDate,
      accountingBasis: appliedFilters.accountingBasis,
      columnsBy: normalizeColumnsBy(appliedFilters.columnsBy),
      includeZeros: String(appliedFilters.includeZeros),
      rowFilter: appliedFilters.rowFilter,
      includeInactive: String(appliedFilters.includeInactive),
      compare: rawCompare,
      includeCompareDeltas: String(appliedFilters.includeCompareDeltas),
      includePercentOfIncome: String(appliedFilters.includePercentOfIncome),
      displayColumnsBy: normalizeColumnsBy(appliedFilters.displayColumnsBy),
      orderBy: 'date',
      order: 'DESC',
    });
    if (tenantId) params.set('tenantId', String(tenantId));
    const url = `${baseURl}account-report/trialbalance/export?${buildParamsStringWithRawCompare(params, rawCompare)}`;
    await downloadFileWithToken(url, accessToken, filename);
  };

  const handleExportCsv = async () => {
    try {
      const payload = getTrialBalanceExportPayload();
      if (!payload) {
        toast.error('No report data to export');
        return;
      }

      const { headers, exportRows, companyTitle, period } = payload;
      const colCount = headers.length;

      const csvLines = [
        buildCenteredTitleRow(companyTitle, colCount).map(escapeCsvCell).join(','),
        buildCenteredTitleRow('Trial Balance', colCount).map(escapeCsvCell).join(','),
        buildCenteredTitleRow(period, colCount).map(escapeCsvCell).join(','),
        Array(colCount).fill('').join(','),
        headers.map(escapeCsvCell).join(','),
        ...exportRows.map(({ values }) =>
          values.map((cellValue) => escapeCsvCell(formatCsvValue(cellValue))).join(',')
        ),
      ];

      const blob = new Blob(['\uFEFF', csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trial_balance_${Date.now()}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      try {
        await exportApiFallback('csv', `trial_balance_${Date.now()}.csv`);
      } catch (fallbackErr) {
        toast.error(fallbackErr?.message || e?.message || 'Failed to export CSV');
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      const payload = getTrialBalanceExportPayload();
      if (!payload) {
        toast.error('No report data to export');
        return;
      }

      const doc = await buildTrialBalancePdfDoc(payload);
      doc.save(`trial_balance_${Date.now()}.pdf`);
    } catch (e) {
      try {
        await exportApiFallback('pdf', `trial_balance_${Date.now()}.pdf`);
      } catch (fallbackErr) {
        toast.error(fallbackErr?.message || e?.message || 'Failed to export PDF');
      }
    }
  };

  const periodDates = useMemo(() => buildDatesForApi(appliedFilters), [appliedFilters]);
  const defaultLedgerStartISO = useMemo(() => {
    if (!periodDates?.startDate) return null;
    return toStartISOFromYYYYMMDD(periodDates.startDate);
  }, [periodDates]);
  const defaultLedgerEndISO = useMemo(() => {
    if (!periodDates?.endDate) return null;
    return toEndISOFromYYYYMMDD(periodDates.endDate);
  }, [periodDates]);

  const isTotalModeDraft = useMemo(() => normalizeColumnsBy(draftFilters.columnsBy) === 'total', [draftFilters.columnsBy]);

  return (
    <div className="p-4" style={{ backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', marginTop: -65 }}>
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={loading}>
        <div className="flex flex-col items-center gap-3">
          <CircularProgress color="inherit" size={60} />
          <div className="text-lg font-medium">Building Trial Balance...</div>
          <div className="text-sm opacity-80">Please wait while we process your request</div>
        </div>
      </Backdrop>

      <div className="w-full max-w-[1200px] mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Button
            onClick={() => navigate('/home/accountsReports')}
            sx={{
              minWidth: 42,
              width: 42,
              height: 42,
              borderRadius: '50%',
              backgroundColor: 'var(--dashboard-card-bg)',
              border: '1px solid var(--sidebar-selected-bg)',
            }}
          >
            <IoIosArrowBack size={18} color="var(--dashboard-text-primary)" />
          </Button>
          <Heading Heading="Trial Balance" Fontsize={28} Fontweight={700} color={'var(--sidebar-text-primary)'} />
        </div>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Chip
              icon={<CalendarMonthOutlinedIcon />}
              label={appliedFilters.time === 'custom'
                ? 'Custom'
                : appliedFilters.time === 'thisMonth'
                  ? 'This Month'
                  : appliedFilters.time === 'lastMonth'
                    ? 'Last Month'
                    : appliedFilters.time === 'thisQuarter'
                      ? 'This Quarter'
                      : appliedFilters.time === 'lastQuarter'
                        ? 'Last Quarter'
                        : appliedFilters.time === 'thisYear'
                          ? 'This Year'
                          : appliedFilters.time === 'lastYear'
                            ? 'Last Year'
                            : 'Custom'}
              sx={{ fontWeight: 700, background: '#eef2ff', color: '#1d4ed8' }}
            />
            <Chip
              icon={<AssessmentOutlinedIcon />}
              label={appliedFilters.accountingBasis === 'cash' ? 'Cash basis' : 'Accrual basis'}
              sx={{ fontWeight: 600, background: '#f4f4f5' }}
            />
            {appliedFilters.compare.length ? (
              <Chip
                icon={<CompareArrowsOutlinedIcon />}
                label={`${appliedFilters.compare.length} compare selected`}
                sx={{ fontWeight: 600, background: '#f0fdf4', color: '#166534' }}
              />
            ) : null}
          </Stack>
        </Box>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            overflow: 'hidden',
            backgroundColor: 'var(--dashboard-card-bg)',
            mb: 2,
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.75,
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              background: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)',
            }}
          >
            <TuneIcon fontSize="small" />
            <Box sx={{ fontWeight: 700, fontSize: 15 }}>Report Filters</Box>
          </Box>

          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={2.2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Report period</InputLabel>
                  <Select
                    value={draftFilters.time}
                    label="Report period"
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, time: e.target.value }))}
                  >
                    <MenuItem value="custom">Custom</MenuItem>
                    <MenuItem value="thisMonth">This Month</MenuItem>
                    <MenuItem value="lastMonth">Last Month</MenuItem>
                    <MenuItem value="thisQuarter">This Quarter</MenuItem>
                    <MenuItem value="lastQuarter">Last Quarter</MenuItem>
                    <MenuItem value="thisYear">This Year</MenuItem>
                    <MenuItem value="lastYear">Last Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {draftFilters.time === 'custom' && (
                <>
                  <Grid item xs={12} md={2.2}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Start date"
                        format="MM/DD/YYYY"
                        value={draftFilters.startDate ? dayjs(draftFilters.startDate) : null}
                        onChange={(value) => {
                          setDraftFilters((prev) => ({
                            ...prev,
                            startDate: value ? dayjs(value).format('YYYY-MM-DD') : '',
                          }));
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            InputLabelProps: { shrink: true },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} md={2.2}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="End date"
                        format="MM/DD/YYYY"
                        value={draftFilters.endDate ? dayjs(draftFilters.endDate) : null}
                        onChange={(value) => {
                          setDraftFilters((prev) => ({
                            ...prev,
                            endDate: value ? dayjs(value).format('YYYY-MM-DD') : '',
                          }));
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            InputLabelProps: { shrink: true },
                          },
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={2.3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Show rows</InputLabel>
                  <Select
                    value={draftFilters.rowFilter}
                    label="Show rows"
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, rowFilter: e.target.value }))}
                  >
                    <MenuItem value="all">All rows</MenuItem>
                    <MenuItem value="active">Active only</MenuItem>
                    <MenuItem value="nonzero">Non-zero only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Columns by</InputLabel>
                  <Select
                    value={draftFilters.columnsBy}
                    label="Columns by"
                    onChange={(e) => setDraftFilters((prev) => ({ ...prev, columnsBy: e.target.value }))}
                  >
                    <MenuItem value="total">Total</MenuItem>
                    <MenuItem value="months">Months</MenuItem>
                    <MenuItem value="quarters">Quarters</MenuItem>
                    <MenuItem value="years">Years</MenuItem>
                    <MenuItem value="weeks">Weeks</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Compare another period</InputLabel>
                  <Select
                    // disabled={!isTotalModeDraft}
                    value=""
                    label="Compare another period"
                    MenuProps={{
                      disableAutoFocusItem: true,
                      disableRestoreFocus: true,
                    }}
                    onClose={blurActiveElement}
                    renderValue={() =>
                      draftFilters.compare.length
                        ? compareOptions
                          .filter((item) => draftFilters.compare.includes(item.value))
                          .map((item) => item.label)
                          .join(', ')
                        : 'Select period'
                    }
                  >
                    <MenuItem value="" sx={{ display: 'none' }} />
                    {compareOptions.map((item) => (
                      <MenuItem
                        key={item.value}
                        value={item.value}
                        onClick={(e) => {
                          e.preventDefault();
                          handleCompareToggle(item.value);
                        }}
                      >
                        <Checkbox checked={draftFilters.compare.includes(item.value)} />
                        {item.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2.3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Display Options</InputLabel>
                  <Select
                    value=""
                    open={displayOptionsOpen}
                    onOpen={() => setDisplayOptionsOpen(true)}
                    onClose={() => {
                      setDisplayOptionsOpen(false);
                      blurActiveElement();
                    }}
                    label="Display Options"
                    renderValue={() => {
                      const labels = [];
                      if (draftFilters.includeZeros) labels.push('Zeros');
                      if (draftFilters.includeInactive) labels.push('Inactive');
                      if (draftFilters.includeCompareDeltas) labels.push('Deltas');
                      if (draftFilters.includePercentOfIncome) labels.push('% Income');
                      return labels.length ? `Display Options: ${labels.join(', ')}` : 'Display Options';
                    }}
                    MenuProps={{
                      disableAutoFocusItem: true,
                      disableRestoreFocus: true,
                      keepMounted: true,
                    }}
                  >
                    <MenuItem value="" sx={{ display: 'none' }} />
                    <MenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => e.stopPropagation()}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={draftFilters.includeZeros}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              setDraftFilters((prev) => ({ ...prev, includeZeros: e.target.checked }));
                              blurActiveElement();
                            }}
                          />
                        }
                        label="Include zero rows"
                        sx={{ width: '100%' }}
                      />
                    </MenuItem>
                    <MenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => e.stopPropagation()}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={draftFilters.includeInactive}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              setDraftFilters((prev) => ({ ...prev, includeInactive: e.target.checked }));
                              blurActiveElement();
                            }}
                          />
                        }
                        label="Include inactive"
                        sx={{ width: '100%' }}
                      />
                    </MenuItem>
                    <MenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => e.stopPropagation()}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={draftFilters.includeCompareDeltas}
                            // disabled={!isTotalModeDraft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              setDraftFilters((prev) => ({ ...prev, includeCompareDeltas: e.target.checked }));
                              blurActiveElement();
                            }}
                          />
                        }
                        label="Include compare deltas"
                        sx={{ width: '100%' }}
                      />
                    </MenuItem>
                    <MenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => e.stopPropagation()}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={draftFilters.includePercentOfIncome}
                            // disabled={!isTotalModeDraft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              setDraftFilters((prev) => ({ ...prev, includePercentOfIncome: e.target.checked }));
                              blurActiveElement();
                            }}
                          />
                        }
                        label="Include % of income"
                        sx={{ width: '100%' }}
                      />
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`Period: ${appliedFilters.time}`} />
                <Chip
                  size="small"
                  label={draftFilters.accountingBasis === 'cash' ? 'Cash' : 'Accrual'}
                  color="primary"
                  variant="outlined"
                />
                <Chip size="small" label={`${draftFilters.compare.length} compare`} variant="outlined" />
              </Stack>

              <Stack direction="row" spacing={1.2} flexWrap="wrap">
                <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleClearFilters}>
                  Clear
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AssessmentOutlinedIcon />}
                  onClick={handleApplyFilters}
                  sx={{
                    backgroundColor: '#0f172a',
                    '&:hover': { backgroundColor: '#111827' },
                  }}
                >
                  Run report
                </Button>
              </Stack>
            </Box>
          </Box>
        </Paper>

        <div className="bg-[var(--dashboard-card-bg)] rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: '#D1D5DC' }}>
          <Box
            sx={{
              px: 2.5,
              py: 1,
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              flexWrap: 'wrap',
              backgroundColor: 'rgba(248,250,252,0.6)',
            }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                startIcon={isAllCollapsed ? <KeyboardArrowRightIcon /> : <KeyboardArrowDownIcon />}
                onClick={() => toggleAllRows(filteredRows)}
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--dashboard-text-secondary)',
                  textTransform: 'uppercase',
                  minWidth: 'auto',
                  px: 1,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                }}
              >
                {isAllCollapsed ? 'Expand' : 'Collapse'}
              </Button>

              <Button
                size="small"
                onClick={handleSort}
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--dashboard-text-secondary)',
                  textTransform: 'uppercase',
                  minWidth: 'auto',
                  px: 1,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                }}
              >
                Sort {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </Stack>

            <Box sx={{ textAlign: 'center', flex: 1, minWidth: 240 }}>
              <Box sx={{ fontWeight: 800, letterSpacing: 0.5, color: 'var(--dashboard-text-primary)' }}>
                {(companyName || '').toUpperCase() || 'TRIAL BALANCE REPORT'}
              </Box>
              <Box sx={{ fontWeight: 700, mt: 0.25, color: 'var(--dashboard-text-primary)' }}>Trial Balance</Box>
              <Box sx={{ fontSize: 12, color: 'var(--dashboard-text-secondary)' }}>
                {periodDates?.endDate ? `As of ${dayjs(periodDates.endDate).format('MMMM D, YYYY')}` : ''}
              </Box>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
              <Button variant="outlined" size="small" onClick={handleExportPDF} sx={{
                borderColor: '#D1D5DC',
                color: 'var(--dashboard-text-primary)',
                '&:hover': {
                  borderColor: 'var(--dashboard-text-secondary)',
                  backgroundColor: 'var(--dashboard-tab-box)',
                },
              }}>
                Export PDF
              </Button>
              <Button variant="outlined" size="small" onClick={handleExportCsv} sx={{
                borderColor: '#D1D5DC',
                color: 'var(--dashboard-text-primary)',
                '&:hover': {
                  borderColor: 'var(--dashboard-text-secondary)',
                  backgroundColor: 'var(--dashboard-tab-box)',
                },
              }}>
                Export CSV
              </Button>
            </Stack>
          </Box>
          {filteredRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--dashboard-text-primary)]">No accounts to display. Run Trial Balance to see results.</div>
          ) : (
            <TableContainer component={Paper} sx={{
              borderRadius: 0,
              boxShadow: 'none',
              backgroundColor: 'var(--dashboard-card-bg)',
              '& .MuiTableCell-root': {
                borderColor: '#D1D5DC',
              },
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  {isColumnMode ? (
                    <>
                      <TableRow>
                        <TableCell
                          rowSpan={2}
                          sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)', position: 'sticky', left: 0, zIndex: 2 }}
                        >
                          Account
                        </TableCell>
                        {activeColumns.map((col) => (
                          <TableCell key={col.key} align="center" colSpan={2} sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>
                            {col.label}
                          </TableCell>
                        ))}
                        <TableCell align="center" colSpan={2} sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>
                          Total
                        </TableCell>
                        {compareColumns.map((cc) => (
                          <TableCell key={cc.apiKey} align="center" colSpan={2} sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>
                            {cc.label}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        {activeColumns.map((col) => (
                          <React.Fragment key={col.key}>
                            <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Debit</TableCell>
                            <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Credit</TableCell>
                          </React.Fragment>
                        ))}
                        <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Debit</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Credit</TableCell>
                        {compareColumns.map((cc) => (
                          <React.Fragment key={cc.apiKey}>
                            <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Debit</TableCell>
                            <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Credit</TableCell>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    </>
                  ) : (
                    compareColumns.length ? (
                      <>
                        <TableRow>
                          <TableCell
                            rowSpan={2}
                            sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}
                          >
                            Account
                          </TableCell>
                          <TableCell align="center" colSpan={2} sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>
                            Period
                          </TableCell>
                          {compareColumns.map((cc) => (
                            <TableCell key={cc.apiKey} align="center" colSpan={2} sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>
                              {cc.label}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Debit</TableCell>
                          <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Credit</TableCell>
                          {compareColumns.map((cc) => (
                            <React.Fragment key={cc.apiKey}>
                              <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Debit</TableCell>
                              <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Credit</TableCell>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </>
                    ) : (
                      <TableRow>
                        <TableCell sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Account</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Debit</TableCell>
                        <TableCell align="right" sx={{ backgroundColor: 'var(--dashboard-tab-box)', borderBottom: '1px solid #D1D5DC', color: 'var(--dashboard-text-primary)' }}>Credit</TableCell>
                      </TableRow>
                    )
                  )}
                </TableHead>
                <TableBody>
                  {isColumnMode ? renderRowsWithColumns(filteredRows) : renderRows(filteredRows)}

                  {isColumnMode ? (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)', position: 'sticky', left: 0, backgroundColor: 'var(--dashboard-card-bg)', zIndex: 1 }}>Total</TableCell>
                      {activeColumns.map((col) => {
                        const t = totalsByColumnMap[col.key]?.totals || totalsByColumnMap[col.key] || {};
                        const d = t?.debit ?? 0;
                        const c = t?.credit ?? 0;
                        return (
                          <React.Fragment key={col.key}>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(d)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(c)}</TableCell>
                          </React.Fragment>
                        );
                      })}
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(totals.debit)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(totals.credit)}</TableCell>
                      {compareColumns.map((cc) => {
                        const val = reportMeta?.comparisons?.[cc.apiKey];
                        const t = readComparePeriodTotals(val);
                        return (
                          <React.Fragment key={cc.apiKey}>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(t.debit)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(t.credit)}</TableCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(totals.debit)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(totals.credit)}</TableCell>
                      {compareColumns.map((cc) => {
                        const val = reportMeta?.comparisons?.[cc.apiKey];
                        const t = readComparePeriodTotals(val);
                        return (
                          <React.Fragment key={cc.apiKey}>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(t.debit)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{currency(t.credit)}</TableCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
        {totals.debit !== totals.credit && filteredRows.length > 0 && (
          <div className="mt-2 text-sm text-red-400">Warning: Debits and Credits are not equal for the selected period.</div>
        )}
        {error && (
          <div className="mt-2 text-sm text-red-400">{error}</div>
        )}
      </div>
      <AccountLedgerModal
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        accountId={ledgerAccountId}
        startISO={ledgerStartISO || defaultLedgerStartISO}
        endISO={ledgerEndISO || defaultLedgerEndISO}
      />
    </div>
  );
}
