import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Heading from '../../Components/Heading';
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import { IoIosArrowBack } from 'react-icons/io';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import TuneIcon from '@mui/icons-material/Tune';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { downloadFileWithToken, getRequestWithOutBody } from '../../Api/fetch';
import { baseURl } from '../../Config/systemConfig';
import { useSelector } from 'react-redux';
import AccountLedgerModal from '../../Components/AccountLedgerModal';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Loader from '../../Components/Loader';

// ────────────────────────────────────────────────────────────────
// Helper to format currency
// ────────────────────────────────────────────────────────────────
const formatCurrency = (value) =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    : '';

// Nice long date like “October 31, 2025”
const formatDateLong = (yyyyMmDdStr) => {
  if (!yyyyMmDdStr) return '';
  const d = new Date(yyyyMmDdStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const BalanceSheet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const userData = useSelector((state) => state.userData.userDetails);
  const companyName = userData?.tenant?.name || '';

  const FILTER_STORAGE_KEY = 'balanceSheet.filters.v1';

  const COLORS = {
    border: '#D1D5DC',
    text: 'var(--dashboard-text-primary)',
    subtext: 'var(--dashboard-text-secondary)',
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

  const compareOptions = [
    { value: 'pp', label: 'Previous period' },
    { value: 'py', label: 'Previous year' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'py_ytd', label: 'Previous year to date' },
  ];

  const blurActiveElement = () => {
    if (typeof document === 'undefined') return;
    const el = document.activeElement;
    if (el && typeof el.blur === 'function') el.blur();
  };

  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);

  // which rows are open/closed
  const [openMap, setOpenMap] = useState({});
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');

  // data
  const [rows, setRows] = useState([]);
  const [reportPayload, setReportPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ledger modal state
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerAccountId, setLedgerAccountId] = useState(null);
  const restoredLedgerRef = useRef(false);

  const toStartISO = (d) => {
    if (!d) return new Date('1900-01-01T00:00:00.000Z').toISOString();
    return new Date(d + 'T00:00:00.000Z').toISOString();
  };
  const toEndISO = (d) => {
    const end = d || new Date().toISOString().slice(0, 10);
    return new Date(end + 'T23:59:59.999Z').toISOString();
  };

  const openLedger = (accountId) => {
    setLedgerAccountId(accountId);
    setLedgerOpen(true);
    // Clear any stored context when opening manually
    sessionStorage.removeItem('balanceSheetLedgerContext');
  };

  const normalizeColumnsBy = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (!v || v === 'total') return 'total';
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

  const buildDatesForApi = (filters) => {
    const today = dayjs();
    const time = filters.time;

    const format = (d) => dayjs(d).format('YYYY-MM-DD');
    const toISOStart = (d) => dayjs(d).startOf('day').toISOString();

    if (time === 'custom') {
      return {
        startDate: filters.startDate ? toISOStart(filters.startDate) : '',
        endDate: filters.endDate ? toISOStart(filters.endDate) : '',
        startDateRaw: filters.startDate || '',
        endDateRaw: filters.endDate || '',
      };
    }

    let start = today.startOf('month');
    let end = today.endOf('month');

    if (time === 'thisMonth') {
      start = today.startOf('month');
      end = today.endOf('month');
    } else if (time === 'lastMonth') {
      const last = today.subtract(1, 'month');
      start = last.startOf('month');
      end = last.endOf('month');
    } else if (time === 'thisQuarter') {
      const q = Math.floor(today.month() / 3);
      start = dayjs(new Date(today.year(), q * 3, 1));
      end = start.add(3, 'month').subtract(1, 'day').endOf('day');
    } else if (time === 'lastQuarter') {
      const currentQ = Math.floor(today.month() / 3);
      const startCurrent = dayjs(new Date(today.year(), currentQ * 3, 1));
      const startLast = startCurrent.subtract(3, 'month');
      start = startLast;
      end = startLast.add(3, 'month').subtract(1, 'day').endOf('day');
    } else if (time === 'thisYear') {
      start = today.startOf('year');
      end = today.endOf('year');
    } else if (time === 'lastYear') {
      const last = today.subtract(1, 'year');
      start = last.startOf('year');
      end = last.endOf('year');
    }

    return {
      startDate: start.startOf('day').toISOString(),
      endDate: end.startOf('day').toISOString(),
      startDateRaw: format(start),
      endDateRaw: format(end),
    };
  };

  const buildAsOfDateForApi = (filters) => {
    const { endDate, endDateRaw } = buildDatesForApi(filters);
    if (endDate) return endDate;
    if (endDateRaw) return new Date(endDateRaw + 'T00:00:00.000Z').toISOString();
    return new Date().toISOString();
  };

  const handleCompareToggle = (value) => {
    setDraftFilters((prev) => {
      const exists = prev.compare.includes(value);
      const updated = exists ? prev.compare.filter((item) => item !== value) : [...prev.compare, value];
      return { ...prev, compare: updated };
    });
  };

  const fetchReport = async (filters) => {
    setLoading(true);
    setError('');
    try {
      const { startDateRaw, endDateRaw } = buildDatesForApi(filters);
      const normalizedColumnsBy = normalizeColumnsBy(filters.columnsBy);
      const normalizedDisplayColumnsBy = normalizeColumnsBy(filters.displayColumnsBy);
      const rawCompare = Array.isArray(filters.compare) ? filters.compare.join(',') : '';

      const params = new URLSearchParams({
        startDate: startDateRaw,
        endDate: endDateRaw,
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

      const url = `${baseURl}account-report/balancesheet/?${buildParamsStringWithRawCompare(params, rawCompare)}`;
      const res = await getRequestWithOutBody(url, accessToken);
      const payload = res?.data?.data ?? res?.data ?? res;
      setReportPayload(payload);

      const apiRows = payload?.accounts || payload?.rows || [];
      if (Array.isArray(apiRows) && apiRows.length) {
        setRows(apiRows);
      } else {
        setRows([]);
      }
    } catch (e) {
      setError('Failed to load balance sheet.');
      setRows([]);
      setReportPayload(null);
    } finally {
      setLoading(false);
    }
  };

  const compareKeyMap = {
    pp: 'previousPeriod',
    py: 'previousYear',
    ytd: 'yearToDate',
    py_ytd: 'previousYearToDate',
  };

  const getComparisonPayload = (compareCode) => {
    const key = compareKeyMap[compareCode];
    if (!key) return null;
    const root = reportPayload?.comparisons || reportPayload?.data?.comparisons;
    return root?.[key] || null;
  };

  const buildAmountMapByPath = (accountsTree) => {
    const map = new Map();
    const walk = (nodes, pathParts) => {
      (Array.isArray(nodes) ? nodes : []).forEach((node) => {
        const label = node?.label || node?.name || '';
        const nextPath = [...pathParts, label].filter(Boolean);
        const key = nextPath.join(' > ');
        const amt = typeof node?.total === 'number' ? node.total : (typeof node?.amount === 'number' ? node.amount : undefined);
        if (amt !== undefined) map.set(key, amt);
        if (Array.isArray(node?.children) && node.children.length) walk(node.children, nextPath);
      });
    };
    walk(accountsTree, []);
    return map;
  };

  const activeCompareColumns = Array.isArray(appliedFilters.compare)
    ? appliedFilters.compare.filter(Boolean)
    : [];

  const compareAmountMaps = activeCompareColumns.reduce((acc, code) => {
    const payload = getComparisonPayload(code);
    const accounts = payload?.accounts || payload?.rows || [];
    acc[code] = buildAmountMapByPath(accounts);
    return acc;
  }, {});

  const getAsOfLabelFromPayload = (payload) => {
    const asOf = payload?.asOfDate;
    if (typeof asOf === 'string' && asOf.length >= 10) {
      return `As of ${formatDateLong(asOf.slice(0, 10))}`;
    }
    return '';
  };

  const getPeriodRangeLabelFromPayload = (payload) => {
    const start = payload?.period?.startDate;
    const end = payload?.period?.endDate;
    if (!start && !end) return '';
    const s = start ? formatDateLong(String(start).slice(0, 10)) : '—';
    const e = end ? formatDateLong(String(end).slice(0, 10)) : '—';
    return `${s} - ${e}`;
  };

  const getMainPeriodRangeLabel = () => {
    const p = reportPayload?.period || reportPayload?.data?.period;
    const start = p?.startDate;
    const end = p?.endDate;
    if (!start && !end) return '';
    const s = start ? formatDateLong(String(start).slice(0, 10)) : '—';
    const e = end ? formatDateLong(String(end).slice(0, 10)) : '—';
    return `${s} - ${e}`;
  };

  const toggleRow = (id, currentOpen) => {
    setOpenMap((prev) => ({
      ...prev,
      // Flip resolved state so first click toggles from default too
      [id]: !(Object.prototype.hasOwnProperty.call(prev, id) ? prev[id] : currentOpen),
    }));
  };

  const toggleAllRows = (rowsData) => {
    const newState = {};
    const walk = (items, level = 0) => {
      (items || []).forEach((item, idx) => {
        const id = item?.id ?? item?.code ?? item?.label ?? item?.name ?? `row-${level}-${idx}`;
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
        const id = item?.id ?? item?.code ?? item?.label ?? item?.name ?? `row-${level}-${idx}`;
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

  const handleSort = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);

    const toNum = (n) => (typeof n === 'number' ? n : parseFloat(n || 0));
    const nodeValue = (node) => {
      const base = node?.amount ?? node?.total;
      return toNum(base);
    };

    const sortTree = (items) => {
      const list = Array.isArray(items) ? items : [];
      return list.map((item) => {
        const children = Array.isArray(item?.children) ? item.children : [];
        const sortedChildren = [...children].sort((a, b) => {
          const aVal = nodeValue(a);
          const bVal = nodeValue(b);
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

  // “As of …” label (long-form date like in screenshot)
  const getPeriodLabel = () => {
    const { endDateRaw } = buildDatesForApi(appliedFilters);
    if (endDateRaw) return `As of ${formatDateLong(endDateRaw)}`;
    const today = new Date();
    return `As of ${today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  };

  // Build table rows (single TOTAL column). Assets separate; Liabilities and Equity grouped.
  const renderRows = (rows, depth = 0) => {
    const items = [];
    const topLevel = Array.isArray(rows) ? rows : [];
    const assetsTop = topLevel.find(r => (r.name || r.label) === 'Assets');
    const liabTop = topLevel.find(r => (r.name || r.label) === 'Liabilities');
    const equityTop = topLevel.find(r => (r.name || r.label) === 'Equity');
    const totalLiabEq = (liabTop?.amount || liabTop?.total || 0) + (equityTop?.amount || equityTop?.total || 0);

    const renderSection = (row, level, parentPath = []) => {
      if (!row) return;
      const rowId = (row.id ?? row.code ?? row.label ?? row.name ?? `sec-${level}`) + '-sec';
      const isOpen = openMap[rowId] !== undefined ? openMap[rowId] : true;
      const label = row.label || row.name || '';
      const path = [...parentPath, label].filter(Boolean);
      const pathKey = path.join(' > ');
      const total = typeof row.total === 'number' ? row.total : (typeof row.amount === 'number' ? row.amount : undefined);
      // Header
      items.push(
        <TableRow key={`${rowId}-hdr`} sx={{ '& td': { borderBottom: '1px solid #D1D5DC' } }}>
          <TableCell sx={{ fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: level * 16 }}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleRow(rowId, isOpen); }} sx={{ mr: 1, color: 'var(--dashboard-text-primary)' }}>
                {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
              </IconButton>
              <span style={{ fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>{label}</span>
            </div>
          </TableCell>
          <TableCell align="right" />
          {activeCompareColumns.map((code) => (
            <TableCell key={`${rowId}-hdr-${code}`} align="right" />
          ))}
        </TableRow>
      );
      // Children
      if (isOpen) {
        const children = Array.isArray(row.children) ? row.children : [];
        children.forEach((child, idx) => {
          const hasChildren = Array.isArray(child.children) && child.children.length > 0;
          const childId = child.id ?? child.code ?? child.label ?? child.name ?? `row-${level + 1}-${idx}`;
          const childOpen = openMap[childId] !== undefined ? openMap[childId] : (child.defaultOpen ?? true);
          const label = child.label || child.name || '';
          const childPath = [...path, label].filter(Boolean);
          const childPathKey = childPath.join(' > ');
          const total = typeof child.total === 'number' ? child.total : (typeof child.amount === 'number' ? child.amount : undefined);
          // Row (header or leaf)
          items.push(
            <TableRow
              key={childId}
              sx={{ '& td': { borderBottom: '1px solid #D1D5DC' }, cursor: 'pointer' }}
              onClick={() => child.id && openLedger(child.id, label)}
            >
              <TableCell sx={{ fontWeight: hasChildren ? 600 : 400, color: 'var(--dashboard-text-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: (level + 1) * 16 }}>
                  {hasChildren && (
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleRow(childId, childOpen); }} sx={{ mr: 1, color: 'var(--dashboard-text-primary)' }}>
                      {childOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                    </IconButton>
                  )}
                  {!hasChildren && <span style={{ width: 32, display: 'inline-block' }} />}
                  <span style={{ fontWeight: hasChildren ? 600 : 400, color: 'var(--dashboard-text-primary)' }}>{label}</span>
                </div>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: hasChildren ? 600 : 400, color: 'var(--dashboard-text-primary)' }}>
                {formatCurrency(total)}
              </TableCell>
              {activeCompareColumns.map((code) => {
                const map = compareAmountMaps[code];
                const val = map?.get(childPathKey);
                return (
                  <TableCell
                    key={`${childId}-${code}`}
                    align="right"
                    sx={{ fontWeight: hasChildren ? 600 : 400, color: 'var(--dashboard-text-primary)' }}
                  >
                    {formatCurrency(val)}
                  </TableCell>
                );
              })}
            </TableRow>
          );
          // grandchildren
          if (hasChildren && childOpen) {
            (child.children || []).forEach((g, gidx) => {
              const gid = g.id ?? g.code ?? g.label ?? g.name ?? `row-${level + 2}-${gidx}`;
              const glabel = g.label || g.name || '';
              const gPathKey = [...childPath, glabel].filter(Boolean).join(' > ');
              const gt = typeof g.total === 'number' ? g.total : (typeof g.amount === 'number' ? g.amount : undefined);
              items.push(
                <TableRow
                  key={gid}
                  sx={{ '& td': { borderBottom: '1px solid #D1D5DC' }, cursor: 'pointer' }}
                  onClick={() => g.id && openLedger(g.id, g.label || g.name)}
                >
                  <TableCell sx={{ color: 'var(--dashboard-text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: (level + 2) * 16 }}>
                      <span style={{ width: 32, display: 'inline-block' }} />
                      <span style={{ color: 'var(--dashboard-text-primary)' }}>{g.label || g.name || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'var(--dashboard-text-primary)' }}>{formatCurrency(gt)}</TableCell>
                  {activeCompareColumns.map((code) => {
                    const map = compareAmountMaps[code];
                    const val = map?.get(gPathKey);
                    return (
                      <TableCell key={`${gid}-${code}`} align="right" sx={{ color: 'var(--dashboard-text-primary)' }}>
                        {formatCurrency(val)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            });
          }
        });
      }
      // Total for section
      items.push(
        <TableRow key={`${rowId}-total`}>
          <TableCell sx={{ fontWeight: 700, borderTop: '2px solid var(--dashboard-text-secondary)', borderBottom: '2px double var(--dashboard-text-secondary)', color: 'var(--dashboard-text-primary)' }}>Total {label}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, borderTop: '2px solid var(--dashboard-text-secondary)', borderBottom: '2px double var(--dashboard-text-secondary)', color: 'var(--dashboard-text-primary)' }}>{formatCurrency(total)}</TableCell>
          {activeCompareColumns.map((code) => {
            const map = compareAmountMaps[code];
            const val = map?.get(pathKey);
            return (
              <TableCell
                key={`${rowId}-total-${code}`}
                align="right"
                sx={{
                  fontWeight: 700,
                  borderTop: '2px solid var(--dashboard-text-secondary)',
                  borderBottom: '2px double var(--dashboard-text-secondary)',
                  color: 'var(--dashboard-text-primary)',
                }}
              >
                {formatCurrency(val)}
              </TableCell>
            );
          })}
        </TableRow>
      );
    };

    // 1) Assets section
    const assetsRow = topLevel.find(r => (r.name || r.label) === 'Assets');
    if (assetsRow) renderSection(assetsRow, 0, []);

    // 2) Liabilities and Equity grouped
    if (liabTop || equityTop) {
      const key = 'liab_equity_group';
      const isOpen = openMap[key] !== undefined ? openMap[key] : true;
      items.push(
        <TableRow key={`${key}-hdr`} sx={{ '& td': { borderBottom: '1px solid #D1D5DC' } }}>
          <TableCell sx={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleRow(key, isOpen); }} sx={{ mr: 1, color: 'var(--dashboard-text-primary)' }}>
                {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
              </IconButton>
              <span style={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>Liabilities and Equity</span>
            </div>
          </TableCell>
          <TableCell align="right" />
          {activeCompareColumns.map((code) => (
            <TableCell key={`${key}-hdr-${code}`} align="right" />
          ))}
        </TableRow>
      );
      if (isOpen) {
        if (liabTop) renderSection(liabTop, 1, []);
        if (equityTop) renderSection(equityTop, 1, []);
      }
      // Combined total
      items.push(
        <TableRow key={`total-liab-equity`}>
          <TableCell sx={{ fontWeight: 800, borderTop: '2px solid var(--dashboard-text-secondary)', borderBottom: '2px double var(--dashboard-text-secondary)', color: 'var(--dashboard-text-primary)' }}>Total Liabilities and Equity</TableCell>
          <TableCell align="right" sx={{ fontWeight: 800, borderTop: '2px solid var(--dashboard-text-secondary)', borderBottom: '2px double var(--dashboard-text-secondary)', color: 'var(--dashboard-text-primary)' }}>{formatCurrency(totalLiabEq)}</TableCell>
          {activeCompareColumns.map((code) => {
            const payload = getComparisonPayload(code);
            const totals = payload?.totals;
            const totalAssets = typeof totals?.totalAssets === 'number' ? totals.totalAssets : undefined;
            const totalLiabilities = typeof totals?.totalLiabilities === 'number' ? totals.totalLiabilities : undefined;
            const totalEquity = typeof totals?.totalEquity === 'number' ? totals.totalEquity : undefined;
            const val =
              typeof totalLiabilities === 'number' && typeof totalEquity === 'number'
                ? totalLiabilities + totalEquity
                : (typeof totalAssets === 'number' ? totalAssets : undefined);
            return (
              <TableCell
                key={`total-liab-equity-${code}`}
                align="right"
                sx={{
                  fontWeight: 800,
                  borderTop: '2px solid var(--dashboard-text-secondary)',
                  borderBottom: '2px double var(--dashboard-text-secondary)',
                  color: 'var(--dashboard-text-primary)',
                }}
              >
                {formatCurrency(val)}
              </TableCell>
            );
          })}
        </TableRow>
      );
    }

    return items;
  };

  const periodLabel = getPeriodLabel();

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
    if (typeof value === 'number') return formatCurrency(value);
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

  const buildExportHeaders = () => {
    const headers = ['Account', periodLabel];
    activeCompareColumns.forEach((code) => {
      const payload = getComparisonPayload(code);
      const label =
        getAsOfLabelFromPayload(payload) ||
        compareOptions.find((o) => o.value === code)?.label ||
        code;
      headers.push(label);
    });
    return headers;
  };

  const collectBalanceSheetExportRows = () => {
    const exportRows = [];
    const topLevel = Array.isArray(rows) ? rows : [];
    const liabTop = topLevel.find((r) => (r.name || r.label) === 'Liabilities');
    const equityTop = topLevel.find((r) => (r.name || r.label) === 'Equity');
    const assetsTop = topLevel.find((r) => (r.name || r.label) === 'Assets');
    const totalLiabEq = (liabTop?.amount || liabTop?.total || 0) + (equityTop?.amount || equityTop?.total || 0);

    const emptyAmounts = () => [null, ...activeCompareColumns.map(() => null)];

    const getAmounts = (pathKey, mainValue) => {
      const vals = [mainValue ?? null];
      activeCompareColumns.forEach((code) => {
        vals.push(compareAmountMaps[code]?.get(pathKey) ?? null);
      });
      return vals;
    };

    const pushRow = (label, level, bold, amounts, isTotal = false) => {
      const indent = level > 0 ? '  '.repeat(level) : '';
      exportRows.push({
        values: [`${indent}${label}`, ...amounts],
        meta: { bold, isTotal },
      });
    };

    const collectSection = (row, level, parentPath = []) => {
      if (!row) return;
      const label = row.label || row.name || '';
      const path = [...parentPath, label].filter(Boolean);
      const pathKey = path.join(' > ');
      const total =
        typeof row.total === 'number'
          ? row.total
          : typeof row.amount === 'number'
            ? row.amount
            : undefined;

      pushRow(label, level, true, emptyAmounts());

      (Array.isArray(row.children) ? row.children : []).forEach((child) => {
        const hasChildren = Array.isArray(child.children) && child.children.length > 0;
        const clabel = child.label || child.name || '';
        const childPath = [...path, clabel].filter(Boolean);
        const childPathKey = childPath.join(' > ');
        const ctotal =
          typeof child.total === 'number'
            ? child.total
            : typeof child.amount === 'number'
              ? child.amount
              : undefined;

        pushRow(clabel, level + 1, hasChildren, getAmounts(childPathKey, ctotal));

        if (hasChildren) {
          (child.children || []).forEach((g) => {
            const glabel = g.label || g.name || '';
            const gPathKey = [...childPath, glabel].filter(Boolean).join(' > ');
            const gt =
              typeof g.total === 'number'
                ? g.total
                : typeof g.amount === 'number'
                  ? g.amount
                  : undefined;
            pushRow(glabel, level + 2, false, getAmounts(gPathKey, gt));
          });
        }
      });

      pushRow(`Total ${label}`, level, true, getAmounts(pathKey, total), true);
    };

    if (assetsTop) collectSection(assetsTop, 0, []);

    if (liabTop || equityTop) {
      pushRow('Liabilities and Equity', 0, true, emptyAmounts());
      if (liabTop) collectSection(liabTop, 1, []);
      if (equityTop) collectSection(equityTop, 1, []);

      const compareTotals = activeCompareColumns.map((code) => {
        const payload = getComparisonPayload(code);
        const totals = payload?.totals;
        const totalLiabilities =
          typeof totals?.totalLiabilities === 'number' ? totals.totalLiabilities : undefined;
        const totalEquity = typeof totals?.totalEquity === 'number' ? totals.totalEquity : undefined;
        const totalAssets = typeof totals?.totalAssets === 'number' ? totals.totalAssets : undefined;
        return typeof totalLiabilities === 'number' && typeof totalEquity === 'number'
          ? totalLiabilities + totalEquity
          : typeof totalAssets === 'number'
            ? totalAssets
            : null;
      });

      pushRow('Total Liabilities and Equity', 0, true, [totalLiabEq, ...compareTotals], true);
    }

    const rootTotals = reportPayload?.totals || reportPayload?.data?.totals;
    const main = {
      totalAssets: typeof rootTotals?.totalAssets === 'number' ? rootTotals.totalAssets : undefined,
      totalLiabilities:
        typeof rootTotals?.totalLiabilities === 'number' ? rootTotals.totalLiabilities : undefined,
      totalEquity: typeof rootTotals?.totalEquity === 'number' ? rootTotals.totalEquity : undefined,
      balanceCheck: typeof rootTotals?.balanceCheck === 'number' ? rootTotals.balanceCheck : undefined,
    };
    const mainLiabEq =
      typeof main.totalLiabilities === 'number' && typeof main.totalEquity === 'number'
        ? main.totalLiabilities + main.totalEquity
        : undefined;

    const apiTotalsSpec = [
      { key: 'totalAssets', label: 'Total Assets', mainValue: main.totalAssets },
      { key: 'totalLiabilities', label: 'Total Liabilities', mainValue: main.totalLiabilities },
      { key: 'totalEquity', label: 'Total Equity', mainValue: main.totalEquity },
      { key: 'totalLiabEq', label: 'Total Liabilities + Equity', mainValue: mainLiabEq },
      { key: 'balanceCheck', label: 'Balance Check', mainValue: main.balanceCheck },
    ];

    apiTotalsSpec.forEach((spec) => {
      const compareVals = activeCompareColumns.map((code) => {
        const payload = getComparisonPayload(code);
        const totals = payload?.totals;
        const cmpTotalAssets = typeof totals?.totalAssets === 'number' ? totals.totalAssets : undefined;
        const cmpTotalLiabilities =
          typeof totals?.totalLiabilities === 'number' ? totals.totalLiabilities : undefined;
        const cmpTotalEquity = typeof totals?.totalEquity === 'number' ? totals.totalEquity : undefined;
        const cmpBalanceCheck = typeof totals?.balanceCheck === 'number' ? totals.balanceCheck : undefined;
        const cmpLiabEq =
          typeof cmpTotalLiabilities === 'number' && typeof cmpTotalEquity === 'number'
            ? cmpTotalLiabilities + cmpTotalEquity
            : undefined;

        if (spec.key === 'totalAssets') return cmpTotalAssets ?? null;
        if (spec.key === 'totalLiabilities') return cmpTotalLiabilities ?? null;
        if (spec.key === 'totalEquity') return cmpTotalEquity ?? null;
        if (spec.key === 'totalLiabEq') return cmpLiabEq ?? null;
        return cmpBalanceCheck ?? null;
      });

      pushRow(spec.label, 0, true, [spec.mainValue ?? null, ...compareVals], true);
    });

    return exportRows;
  };

  const getBalanceSheetExportPayload = () => {
    if (!rows?.length) return null;
    return {
      headers: buildExportHeaders(),
      exportRows: collectBalanceSheetExportRows(),
      companyTitle: (companyName || '').toUpperCase() || 'BALANCE SHEET REPORT',
      period: periodLabel,
    };
  };

  const buildBalanceSheetPdfDoc = async (payload) => {
    const { jsPDF } = await import('jspdf');
    const { headers, exportRows, companyTitle, period } = payload;
    const orientation = headers.length > 3 ? 'landscape' : 'portrait';
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
    doc.text('Balance Sheet', pageWidth / 2, marginTop + 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...subtextColor);
    doc.text(period, pageWidth / 2, marginTop + 36, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const accountWidth = Math.min(Math.max(contentWidth * 0.4, 160), contentWidth * 0.5);
    const dataColCount = Math.max(headers.length - 1, 0);
    const dataColWidth = dataColCount > 0 ? (contentWidth - accountWidth) / dataColCount : contentWidth;
    const colWidths = headers.map((_, idx) => (idx === 0 ? accountWidth : dataColWidth));

    const fontSize = headers.length > 5 ? 7 : headers.length > 3 ? 8 : 9;
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

  const handleExportCsv = async () => {
    try {
      const payload = getBalanceSheetExportPayload();
      if (!payload) {
        toast.error('No report data to export');
        return;
      }

      const { headers, exportRows, companyTitle, period } = payload;
      const colCount = headers.length;

      const csvLines = [
        buildCenteredTitleRow(companyTitle, colCount).map(escapeCsvCell).join(','),
        buildCenteredTitleRow('Balance Sheet', colCount).map(escapeCsvCell).join(','),
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
      link.download = `balance_sheet_${Date.now()}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      try {
        const { startDateRaw, endDateRaw } = buildDatesForApi(appliedFilters);
        const rawCompare = Array.isArray(appliedFilters.compare) ? appliedFilters.compare.join(',') : '';
        const params = new URLSearchParams({
          type: 'csv',
          startDate: startDateRaw,
          endDate: endDateRaw,
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
        const url = `${baseURl}account-report/balancesheet/export?${buildParamsStringWithRawCompare(params, rawCompare)}`;
        await downloadFileWithToken(url, accessToken, `balance_sheet_${Date.now()}.csv`);
      } catch (fallbackErr) {
        toast.error(fallbackErr?.message || e?.message || 'Failed to export CSV');
      }
    }
  };

  const handleExportPDF = async () => {
    try {
      const payload = getBalanceSheetExportPayload();
      if (!payload) {
        toast.error('No report data to export');
        return;
      }

      const doc = await buildBalanceSheetPdfDoc(payload);
      doc.save(`balance_sheet_${Date.now()}.pdf`);
    } catch (e) {
      try {
        const { startDateRaw, endDateRaw } = buildDatesForApi(appliedFilters);
        const rawCompare = Array.isArray(appliedFilters.compare) ? appliedFilters.compare.join(',') : '';
        const params = new URLSearchParams({
          type: 'pdf',
          startDate: startDateRaw,
          endDate: endDateRaw,
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
        const url = `${baseURl}account-report/balancesheet/export?${buildParamsStringWithRawCompare(params, rawCompare)}`;
        await downloadFileWithToken(url, accessToken, `balance_sheet_${Date.now()}.pdf`);
      } catch (fallbackErr) {
        toast.error(fallbackErr?.message || e?.message || 'Failed to export PDF');
      }
    }
  };

  // Totals & Balance Check
  const computeTotals = (rows) => {
    const top = Array.isArray(rows) ? rows : [];
    const getAmt = (node) => (typeof node?.total === 'number' ? node.total : (typeof node?.amount === 'number' ? node.amount : 0));
    const sumChildren = (node) => {
      if (!node) return 0;
      const children = Array.isArray(node.children) ? node.children : [];
      if (!children.length) return getAmt(node);
      return children.reduce((acc, c) => acc + sumChildren(c), 0);
    };
    const assetsTop = top.find(r => (r.name || r.label) === 'Assets');
    const liabTop = top.find(r => (r.name || r.label) === 'Liabilities');
    const equityTop = top.find(r => (r.name || r.label) === 'Equity');
    const assetsTotal = sumChildren(assetsTop);
    const liabilitiesTotal = sumChildren(liabTop);
    const equityTotal = sumChildren(equityTop);
    const liabEqTotal = liabilitiesTotal + equityTotal;
    const diff = assetsTotal - liabEqTotal;
    return { assetsTotal, liabilitiesTotal, equityTotal, liabEqTotal, diff };
  };
  const { assetsTotal, liabilitiesTotal, equityTotal, liabEqTotal, diff } = computeTotals(rows);

  const renderApiTotalsRows = () => {
    const rootTotals = reportPayload?.totals || reportPayload?.data?.totals;
    const main = {
      totalAssets: typeof rootTotals?.totalAssets === 'number' ? rootTotals.totalAssets : undefined,
      totalLiabilities: typeof rootTotals?.totalLiabilities === 'number' ? rootTotals.totalLiabilities : undefined,
      totalEquity: typeof rootTotals?.totalEquity === 'number' ? rootTotals.totalEquity : undefined,
      balanceCheck: typeof rootTotals?.balanceCheck === 'number' ? rootTotals.balanceCheck : undefined,
    };
    const mainLiabEq =
      typeof main.totalLiabilities === 'number' && typeof main.totalEquity === 'number'
        ? main.totalLiabilities + main.totalEquity
        : undefined;

    const rowsSpec = [
      { key: 'totalAssets', label: 'Total Assets', mainValue: main.totalAssets },
      { key: 'totalLiabilities', label: 'Total Liabilities', mainValue: main.totalLiabilities },
      { key: 'totalEquity', label: 'Total Equity', mainValue: main.totalEquity },
      { key: 'totalLiabEq', label: 'Total Liabilities + Equity', mainValue: mainLiabEq },
      { key: 'balanceCheck', label: 'Balance Check', mainValue: main.balanceCheck },
    ];

    return (
      <>
        {rowsSpec.map((r) => (
          <TableRow key={`api-total-${r.key}`}>
            <TableCell
              sx={{
                fontWeight: 800,
                borderTop: '2px solid var(--dashboard-text-secondary)',
                color: 'var(--dashboard-text-primary)',
              }}
            >
              {r.label}
            </TableCell>
            <TableCell
              align="right"
              sx={{
                fontWeight: 800,
                borderTop: '2px solid var(--dashboard-text-secondary)',
                color: 'var(--dashboard-text-primary)',
              }}
            >
              {formatCurrency(r.mainValue)}
            </TableCell>
            {activeCompareColumns.map((code) => {
              const payload = getComparisonPayload(code);
              const totals = payload?.totals;
              const cmpTotalAssets = typeof totals?.totalAssets === 'number' ? totals.totalAssets : undefined;
              const cmpTotalLiabilities = typeof totals?.totalLiabilities === 'number' ? totals.totalLiabilities : undefined;
              const cmpTotalEquity = typeof totals?.totalEquity === 'number' ? totals.totalEquity : undefined;
              const cmpBalanceCheck = typeof totals?.balanceCheck === 'number' ? totals.balanceCheck : undefined;
              const cmpLiabEq =
                typeof cmpTotalLiabilities === 'number' && typeof cmpTotalEquity === 'number'
                  ? cmpTotalLiabilities + cmpTotalEquity
                  : undefined;

              const val =
                r.key === 'totalAssets'
                  ? cmpTotalAssets
                  : r.key === 'totalLiabilities'
                    ? cmpTotalLiabilities
                    : r.key === 'totalEquity'
                      ? cmpTotalEquity
                      : r.key === 'totalLiabEq'
                        ? cmpLiabEq
                        : cmpBalanceCheck;

              return (
                <TableCell
                  key={`api-total-${r.key}-${code}`}
                  align="right"
                  sx={{
                    fontWeight: 800,
                    borderTop: '2px solid var(--dashboard-text-secondary)',
                    color: 'var(--dashboard-text-primary)',
                  }}
                >
                  {formatCurrency(val)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </>
    );
  };

  // Apply filters fetch
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
    } catch (_) {}

    const params = new URLSearchParams(searchParams);
    params.set('time', filters.time);
    params.set('startDate', filters.startDate || '');
    params.set('endDate', filters.endDate || '');
    params.set('accountingBasis', filters.accountingBasis);
    params.set('columnsBy', normalizeColumnsBy(filters.columnsBy));
    params.set('rowFilter', filters.rowFilter);
    params.set('includeZeros', String(filters.includeZeros));
    params.set('includeInactive', String(filters.includeInactive));
    params.set('includeCompareDeltas', String(filters.includeCompareDeltas));
    params.set('includePercentOfIncome', String(filters.includePercentOfIncome));
    if (filters.compare?.length) params.set('compare', filters.compare.join(','));
    else params.delete('compare');
    setSearchParams(params);

    fetchReport(filters);
  };

  const handleClearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (_) {}
    navigate('/home/balanceSheet', { replace: true });
    fetchReport(defaultFilters);
  };

  // Read path parameters on component mount and when URL changes
  useEffect(() => {
    try {
      const fromAccountsReports = location.state?.fromAccountsReports;
      if (fromAccountsReports) {
        try {
          localStorage.removeItem(FILTER_STORAGE_KEY);
        } catch (_) {}

        setDraftFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        fetchReport(defaultFilters);

        // Clear the state flag so refresh/back doesn't re-trigger
        window.history.replaceState({}, document.title);
        return;
      }

      const pathSegments = location.pathname.split('/').filter(segment => segment);
      const filterSegments = pathSegments.slice(pathSegments.findIndex(seg => seg === 'balanceSheet') + 1);
      
      // Parse path segments in order: time, startDate, endDate, accountingBasis, columnsBy, rowFilter, includeZeros, includeInactive, compare, includeCompareDeltas, includePercentOfIncome
      const pathFilters = {};
      let i = 0;
      while (i < filterSegments.length) {
        const segment = filterSegments[i];
        const nextSegment = filterSegments[i + 1];
        
        if (segment === 'time' && nextSegment) {
          pathFilters.time = nextSegment;
          i += 2;
        } else if (segment === 'startDate' && nextSegment) {
          pathFilters.startDate = nextSegment;
          i += 2;
        } else if (segment === 'endDate' && nextSegment) {
          pathFilters.endDate = nextSegment;
          i += 2;
        } else if (segment === 'accountingBasis' && nextSegment) {
          pathFilters.accountingBasis = nextSegment;
          i += 2;
        } else if (segment === 'columnsBy' && nextSegment) {
          pathFilters.columnsBy = nextSegment;
          i += 2;
        } else if (segment === 'rowFilter' && nextSegment) {
          pathFilters.rowFilter = nextSegment;
          i += 2;
        } else if (segment === 'includeZeros' && nextSegment) {
          pathFilters.includeZeros = nextSegment === 'true';
          i += 2;
        } else if (segment === 'includeInactive' && nextSegment) {
          pathFilters.includeInactive = nextSegment === 'true';
          i += 2;
        } else if (segment === 'compare' && nextSegment) {
          pathFilters.compare = nextSegment ? nextSegment.split(',').filter(Boolean) : defaultFilters.compare;
          i += 2;
        } else if (segment === 'includeCompareDeltas' && nextSegment) {
          pathFilters.includeCompareDeltas = nextSegment === 'true';
          i += 2;
        } else if (segment === 'includePercentOfIncome' && nextSegment) {
          pathFilters.includePercentOfIncome = nextSegment === 'true';
          i += 2;
        } else {
          i += 1; // Skip unknown segments
        }
      }
      
      // Check if we have any path filters
      const hasPathFilters = Object.keys(pathFilters).length > 0;
      
      if (hasPathFilters) {
        const urlFilters = {
          ...defaultFilters,
          ...pathFilters,
        };
        setDraftFilters(urlFilters);
        setAppliedFilters(urlFilters);
        fetchReport(urlFilters);
        return;
      }
      
      // Only use localStorage if no path params
      const saved = localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const restored = { ...defaultFilters, ...parsed };
        setDraftFilters(restored);
        setAppliedFilters(restored);
        fetchReport(restored);
      } else {
        fetchReport(appliedFilters);
      }
    } catch (_) {
      fetchReport(appliedFilters);
    }
  }, [location.pathname, location.state]); // Use pathname instead of searchParams

  // Update path when appliedFilters change (but not on initial load)
  useEffect(() => {
    // Skip if this is the initial load (prevent infinite loop)
    if (loading) return;
    
    const pathSegments = ['/home', 'balanceSheet'];
    
    // Only add segments if they differ from defaults
    if (appliedFilters.time !== defaultFilters.time) {
      pathSegments.push('time', appliedFilters.time);
    }
    if (appliedFilters.startDate !== defaultFilters.startDate) {
      pathSegments.push('startDate', appliedFilters.startDate);
    }
    if (appliedFilters.endDate !== defaultFilters.endDate) {
      pathSegments.push('endDate', appliedFilters.endDate);
    }
    if (appliedFilters.accountingBasis !== defaultFilters.accountingBasis) {
      pathSegments.push('accountingBasis', appliedFilters.accountingBasis);
    }
    if (appliedFilters.columnsBy !== defaultFilters.columnsBy) {
      pathSegments.push('columnsBy', normalizeColumnsBy(appliedFilters.columnsBy));
    }
    if (appliedFilters.rowFilter !== defaultFilters.rowFilter) {
      pathSegments.push('rowFilter', appliedFilters.rowFilter);
    }
    if (appliedFilters.includeZeros !== defaultFilters.includeZeros) {
      pathSegments.push('includeZeros', String(appliedFilters.includeZeros));
    }
    if (appliedFilters.includeInactive !== defaultFilters.includeInactive) {
      pathSegments.push('includeInactive', String(appliedFilters.includeInactive));
    }
    if (appliedFilters.includeCompareDeltas !== defaultFilters.includeCompareDeltas) {
      pathSegments.push('includeCompareDeltas', String(appliedFilters.includeCompareDeltas));
    }
    if (appliedFilters.includePercentOfIncome !== defaultFilters.includePercentOfIncome) {
      pathSegments.push('includePercentOfIncome', String(appliedFilters.includePercentOfIncome));
    }
    if (appliedFilters.compare?.length && appliedFilters.compare !== defaultFilters.compare) {
      pathSegments.push('compare', appliedFilters.compare.join(','));
    }
    
    const newPath = pathSegments.join('/');
    
    // Only update if different
    if (newPath !== location.pathname) {
      navigate(newPath, { replace: true });
    }
  }, [appliedFilters, loading, navigate, location.pathname]);

  // Restore ledger modal state when returning from navigation
  useEffect(() => {
    // First check location state (for programmatic navigation)
    const state = location.state;
    if (state?.returnToLedger && state?.ledgerAccountId && !restoredLedgerRef.current) {
      setLedgerAccountId(state.ledgerAccountId);
      setLedgerOpen(true);
      restoredLedgerRef.current = true;
      // Clear the state to prevent reopening on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    
    // Then check sessionStorage (for browser back button)
    try {
      const storedContext = sessionStorage.getItem('balanceSheetLedgerContext');
      if (storedContext && !restoredLedgerRef.current) {
        const context = JSON.parse(storedContext);
        // Only restore if we're on the balanceSheet path (flexible path matching)
        const isBalanceSheetPath = location.pathname.includes('balanceSheet') || 
                                   location.pathname.includes('balance-sheet');
        if (context.returnToLedger && context.ledgerAccountId && isBalanceSheetPath) {
          setLedgerAccountId(context.ledgerAccountId);
          setLedgerOpen(true);
          restoredLedgerRef.current = true;
          // Clear sessionStorage after restoring
          sessionStorage.removeItem('balanceSheetLedgerContext');
        }
      }
    } catch (e) {
      sessionStorage.removeItem('balanceSheetLedgerContext');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.pathname]);

  // Reset the ref when modal is closed manually
  useEffect(() => {
    if (!ledgerOpen) {
      restoredLedgerRef.current = false;
    }
  }, [ledgerOpen]);

  return (
    <div
      className="min-h-screen"
      style={{
        marginTop: -80,
        padding: 10,
        backgroundColor: 'var(--dashboard-bg)' // main screen background
      }}
    >
      <div className="gap-3 mb-1 flex-wrap items-center mt-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
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

          {/* Keep existing Heading component for page title (outside the printable card) */}
          <Heading
            Fontweight={700}
            color={'var(--sidebar-text-primary)'}
            Heading={'Balance Sheet'}
            Fontsize={30}
          />
        </div>

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
                    value={draftFilters.compare.length ? 'selected' : ''}
                    label="Compare another period"
                    renderValue={() =>
                      draftFilters.compare.length
                        ? compareOptions
                            .filter((item) => draftFilters.compare.includes(item.value))
                            .map((item) => item.label)
                            .join(', ')
                        : 'Select period'
                    }
                  >
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
                <Chip size="small" label={`Period: ${getPeriodLabel()}`} />
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
                    '&:hover': {
                      backgroundColor: '#111827',
                    },
                  }}
                >
                  Run report
                </Button>
              </Stack>
            </Box>
          </Box>
        </Paper>

        {/* Report Card styled like the screenshot */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              background: 'var(--dashboard-card-bg)',
              border: '1px solid #D1D5DC',
              borderRadius: 16,
              padding: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1,
                borderBottom: '1px solid #D1D5DC',
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
                  onClick={() => toggleAllRows(rows)}
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
                  {(companyName || '').toUpperCase() || 'BALANCE SHEET REPORT'}
                </Box>
                <Box sx={{ fontWeight: 700, mt: 0.25, color: 'var(--dashboard-text-primary)' }}>Balance Sheet</Box>
                <Box sx={{ fontSize: 12, color: 'var(--dashboard-text-secondary)' }}>{periodLabel}</Box>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExportPDF}
                  sx={{
                    borderColor: '#D1D5DC',
                    color: 'var(--dashboard-text-primary)',
                    '&:hover': {
                      borderColor: 'var(--dashboard-text-secondary)',
                      backgroundColor: 'var(--dashboard-card-bg)',
                    },
                  }}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExportCsv}
                  sx={{
                    borderColor: '#D1D5DC',
                    color: 'var(--dashboard-text-primary)',
                    '&:hover': {
                      borderColor: 'var(--dashboard-text-secondary)',
                      backgroundColor: 'var(--dashboard-card-bg)',
                    },
                  }}
                >
                  Export CSV
                </Button>
              </Stack>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} sx={{ 
              borderRadius: 0, 
              boxShadow: 'none',
              backgroundColor: 'var(--dashboard-card-bg)',
              '& .MuiTableCell-root': {
                borderColor: '#D1D5DC',
              },
            }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        backgroundColor: 'var(--dashboard-tab-box)',
                        borderBottom: '1px solid #D1D5DC',
                        fontWeight: 700,
                        width: '55%',
                      }}
                    >
                      <Heading Heading={'Assets / Liabilities & Equity'} Fontsize={14} Fontweight={700} color={'var(--dashboard-text-primary)'} />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        backgroundColor: 'var(--dashboard-tab-box)',
                        borderBottom: '1px solid #D1D5DC',
                        width: '15%',
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{periodLabel}</div>
                      <div style={{ fontSize: 11, color: 'var(--dashboard-text-secondary)', marginTop: 2 }}>
                        {getMainPeriodRangeLabel()}
                      </div>
                    </TableCell>
                    {activeCompareColumns.map((code) => {
                      const payload = getComparisonPayload(code);
                      const label = getAsOfLabelFromPayload(payload) || compareOptions.find((o) => o.value === code)?.label || '';
                      const range = getPeriodRangeLabelFromPayload(payload);
                      return (
                        <TableCell
                          key={`cmp-h-${code}`}
                          align="right"
                          sx={{
                            backgroundColor: 'var(--dashboard-tab-box)',
                            borderBottom: '1px solid #D1D5DC',
                            width: '15%',
                            fontWeight: 700,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: 'var(--dashboard-text-primary)' }}>{label}</div>
                          <div style={{ fontSize: 11, color: 'var(--dashboard-text-secondary)', marginTop: 2 }}>{range}</div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={2 + activeCompareColumns.length} align="center" style={{ color: 'var(--dashboard-text-primary)' }}>
                        <div style={{ padding: 12 }}>
                          <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && error && (
                    <TableRow>
                      <TableCell colSpan={2 + activeCompareColumns.length} align="center" style={{ color: 'var(--dashboard-text-primary)' }}>{error}</TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && rows && rows.length > 0 && (
                    <>
                      {renderRows(rows)}
                      {renderApiTotalsRows()}
                    </>
                  )}
                  {!loading && !error && (!rows || rows.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2 + activeCompareColumns.length} align="center" style={{ color: 'var(--dashboard-text-primary)' }}>No data.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer Summary: Category totals and Balance Check */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
              padding: '14px 16px',
              borderTop: '1px solid #D1D5DC',
              background: 'var(--dashboard-card-bg)'
            }}>
              <div style={{
                background: 'var(--dashboard-tab-box)', border: '1px solid #D1D5DC', borderRadius: 10, padding: 12
              }}>
                <div style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', fontWeight: 600 }}>Total Assets</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dashboard-text-primary)' }}>{formatCurrency(assetsTotal)}</div>
              </div>
              <div style={{
                background: 'var(--dashboard-tab-box)', border: '1px solid #D1D5DC', borderRadius: 10, padding: 12
              }}>
                <div style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', fontWeight: 600 }}>Total Liabilities + Equity</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dashboard-text-primary)' }}>{formatCurrency(liabEqTotal)}</div>
              </div>
              <div style={{
                background: diff === 0 ? 'var(--dashboard-card-bg)' : 'var(--dashboard-card-bg)',
                border: `1px solid ${diff === 0 ? 'var(--dashboard-text-secondary)' : 'var(--dashboard-text-secondary)'}`,
                borderRadius: 10,
                padding: 12
              }}>
                <div style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)', fontWeight: 700 }}>Balance Check</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: diff === 0 ? 'var(--dashboard-text-primary)' : 'var(--dashboard-text-primary)' }}>
                  {diff === 0 ? 'Balanced (Assets = Liabilities + Equity)' : `Out of Balance by ${formatCurrency(Math.abs(diff))}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex mt-10 gap-5 flex-wrap justify-center"></div>
        <AccountLedgerModal
          open={ledgerOpen}
          onClose={() => setLedgerOpen(false)}
          accountId={ledgerAccountId}
          startISO={toStartISO(appliedFilters.startDate)}
          endISO={toEndISO(appliedFilters.endDate)}
        />
      </div>
    </div>
  );
};

export default BalanceSheet;
