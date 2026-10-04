import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Heading from '../../Components/Heading';
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import {
    Button,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    FormControlLabel,
    Checkbox,
    Radio,
    RadioGroup,
    Chip,
    Box,
    Stack,
    Divider,
    Collapse,
    Tooltip,
} from '@mui/material';
import { IoIosArrowBack } from 'react-icons/io';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
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

const formatCurrency = (value) => {
    const num = Number(value);
    if (value === null || value === undefined || Number.isNaN(num)) return '$0.00';
    return num.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatPercent = (value) => {
    const num = Number(value);
    if (value === null || value === undefined || Number.isNaN(num)) return '-';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

const safeNumber = (value) => {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
};

const formatMMDDYYYY = (dateStr) => {
    if (!dateStr) return '';
    const raw = String(dateStr).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        const [, y, m, d] = match;
        return `${m}/${d}/${y}`;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = String(date.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
};

const parseMMDDYYYYToYYYYMMDD = (mmddyyyy) => {
    if (!mmddyyyy) return '';
    const cleaned = String(mmddyyyy).replace(/[^\d]/g, '');
    if (cleaned.length !== 8) return '';
    const mm = cleaned.substring(0, 2);
    const dd = cleaned.substring(2, 4);
    const yyyy = cleaned.substring(4, 8);
    const monthNum = parseInt(mm, 10);
    const dayNum = parseInt(dd, 10);
    const yearNum = parseInt(yyyy, 10);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900) return '';
    return `${yyyy}-${mm}-${dd}`;
};

const formatMonYYYY = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const formatMonthYearLong = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return dateStr;
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const COMPARE_KEY_MAP = {
    pp: 'previousPeriod',
    py: 'previousYear',
    ytd: 'yearToDate',
    py_ytd: 'previousYearToDate',
};

const buildAmountMapByPath = (accountsTree) => {
    const map = new Map();
    const walk = (nodes, pathParts) => {
        (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            const label = node?.label || node?.name || '';
            const nextPath = [...pathParts, label].filter(Boolean);
            const key = nextPath.join(' > ');
            const amt =
                typeof node?.amount === 'number'
                    ? node.amount
                    : typeof node?.total === 'number'
                      ? node.total
                      : undefined;
            if (amt !== undefined) map.set(key, amt);
            if (Array.isArray(node?.children) && node.children.length) {
                walk(node.children, nextPath);
            }
        });
    };
    walk(accountsTree, []);
    return map;
};

const buildAmountMapById = (accountsTree) => {
    const map = new Map();
    const walk = (nodes) => {
        (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            if (node?.id != null) {
                const amt =
                    typeof node?.amount === 'number'
                        ? node.amount
                        : typeof node?.total === 'number'
                          ? node.total
                          : undefined;
                if (amt !== undefined) map.set(node.id, amt);
            }
            if (Array.isArray(node?.children) && node.children.length) {
                walk(node.children);
            }
        });
    };
    walk(accountsTree);
    return map;
};

const buildByColumnMapByPath = (accountsTree) => {
    const map = new Map();
    const walk = (nodes, pathParts) => {
        (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            const label = node?.label || node?.name || '';
            const nextPath = [...pathParts, label].filter(Boolean);
            const key = nextPath.join(' > ');
            if (node?.byColumn && typeof node.byColumn === 'object') {
                map.set(key, node.byColumn);
            }
            if (Array.isArray(node?.children) && node.children.length) {
                walk(node.children, nextPath);
            }
        });
    };
    walk(accountsTree, []);
    return map;
};

const buildByColumnMapById = (accountsTree) => {
    const map = new Map();
    const walk = (nodes) => {
        (Array.isArray(nodes) ? nodes : []).forEach((node) => {
            if (node?.id != null && node?.byColumn && typeof node.byColumn === 'object') {
                map.set(node.id, node.byColumn);
            }
            if (Array.isArray(node?.children) && node.children.length) {
                walk(node.children);
            }
        });
    };
    walk(accountsTree);
    return map;
};

const getPrevMonthColumnKey = (columnKey) => {
    const match = String(columnKey || '').match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    if (month <= 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, '0')}`;
};

const readByColumnAmount = (byColumn, columnKey) => {
    if (!byColumn || !columnKey) return null;
    const cell = byColumn[columnKey];
    if (cell === null || cell === undefined) return null;
    if (typeof cell === 'number') return cell;
    if (typeof cell === 'object') {
        if (typeof cell.amount === 'number') return cell.amount;
        if (typeof cell.total === 'number') return cell.total;
        if (typeof cell.value === 'number') return cell.value;
    }
    return null;
};

const pickBestPreviousMonthFromByColumn = (byColumn, currentColKey, prevMonthKey) => {
    if (!byColumn || typeof byColumn !== 'object') return null;

    const directKeys = [prevMonthKey, currentColKey].filter(Boolean);
    for (const key of directKeys) {
        const value = readByColumnAmount(byColumn, key);
        if (value !== null && value !== undefined) return value;
    }

    const monthKeys = Object.keys(byColumn)
        .filter((key) => /^\d{4}-\d{2}$/.test(key))
        .sort();

    if (monthKeys.length) {
        if (prevMonthKey && monthKeys.includes(prevMonthKey)) {
            return readByColumnAmount(byColumn, prevMonthKey);
        }
        if (currentColKey) {
            const beforeCurrent = monthKeys.filter((key) => key < currentColKey);
            if (beforeCurrent.length) {
                return readByColumnAmount(byColumn, beforeCurrent[beforeCurrent.length - 1]);
            }
        }
        return readByColumnAmount(byColumn, monthKeys[monthKeys.length - 1]);
    }

    const allKeys = Object.keys(byColumn);
    if (currentColKey) {
        const beforeCurrent = allKeys.filter((key) => key < currentColKey).sort();
        if (beforeCurrent.length) {
            return readByColumnAmount(byColumn, beforeCurrent[beforeCurrent.length - 1]);
        }
    }

    return null;
};

const mergeComparisonAccountsIntoTree = (accounts, comparisons) => {
    const compAccounts = comparisons?.previousPeriod?.accounts;
    if (!Array.isArray(accounts) || !Array.isArray(compAccounts) || !compAccounts.length) {
        return accounts;
    }

    const byId = new Map();
    const byCode = new Map();
    const walkComp = (nodes) => {
        nodes.forEach((node) => {
            if (node?.id != null) byId.set(node.id, node);
            if (node?.code) byCode.set(node.code, node);
            if (Array.isArray(node?.children) && node.children.length) {
                walkComp(node.children);
            }
        });
    };
    walkComp(compAccounts);

    const mergeNodes = (nodes) =>
        nodes.map((node) => {
            const comp =
                (node?.id != null && byId.get(node.id)) ||
                (node?.code && byCode.get(node.code)) ||
                null;

            const merged = {
                ...node,
                comparisons: {
                    ...(node?.comparisons || {}),
                    ...(comp
                        ? {
                              previousPeriod: {
                                  ...(node?.comparisons?.previousPeriod || {}),
                                  amount: comp.amount,
                                  byColumn: comp.byColumn || node?.comparisons?.previousPeriod?.byColumn,
                              },
                          }
                        : {}),
                },
            };

            if (Array.isArray(node?.children) && node.children.length) {
                merged.children = mergeNodes(node.children);
            }

            return merged;
        });

    return mergeNodes(accounts);
};

const ProfitLossReport = () => {
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

    const toStartISOFromYYYYMMDD = (d) => new Date(`${d}T00:00:00.000Z`).toISOString();
    const toEndISOFromYYYYMMDD = (d) => new Date(`${d}T23:59:59.999Z`).toISOString();

    const normalizePeriodDate = (dateStr) => {
        if (!dateStr) return '';
        const s = String(dateStr).slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
    };

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [reportMeta, setReportMeta] = useState({
        period: null,
        filters: null,
        totals: {},
        columns: [],
        totalsByColumn: [],
        comparisons: {},
        deltas: {},
    });

    const [draftFilters, setDraftFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
    const [isInitializing, setIsInitializing] = useState(true);

    const [ledgerOpen, setLedgerOpen] = useState(false);
    const [ledgerAccountId, setLedgerAccountId] = useState(null);
    const [ledgerStartISO, setLedgerStartISO] = useState(null);
    const [ledgerEndISO, setLedgerEndISO] = useState(null);
    const restoredLedgerRef = useRef(false);
    const [openMapState, setOpenMapState] = useState({});
    const [isAllCollapsed, setIsAllCollapsed] = useState(false);
    const [sortOrder, setSortOrder] = useState('asc');
    const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    useEffect(() => {
        // First check location state (for programmatic navigation)
        const state = location.state;
        if (state?.returnToLedger && state?.ledgerAccountId && !restoredLedgerRef.current) {
            setLedgerAccountId(state.ledgerAccountId);
            setLedgerOpen(true);
            restoredLedgerRef.current = true;
            navigate(location.pathname, { replace: true, state: {} });
            return;
        }

        // Then check sessionStorage (for browser back button)
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

    const reportPdfRef = useRef(null);

    const FILTER_STORAGE_KEY = 'profitLossReport.filters.v3';

    const COLORS = {
        positive: '#16a34a',
        negative: '#dc2626',
        border: '#e5e7eb',
        card: 'var(--dashboard-card-bg)',
        soft: 'var(--dashboard-tab-box)',
        text: 'var(--dashboard-text-primary)',
        subtext: 'var(--dashboard-text-secondary)',
        accent: 'var(--navbar-dropdown-hover)',
        headerBg: '#f8fafc',
        sectionBg: '#f5f7fb',
        summaryBg: '#f9fafb',
    };

    const tableHeaderCellSx = {
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        color: '#1e293b',
    };

    const compareOptions = [
        { value: 'pp', label: 'Previous period' },
        { value: 'py', label: 'Previous year' },
        { value: 'ytd', label: 'Year to date' },
        { value: 'py_ytd', label: 'Previous year to date' },
    ];

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
            // Check if coming from AccountsReports page
            const fromAccountsReports = location.state?.fromAccountsReports;
            
            if (fromAccountsReports) {
                // Clear all filters and use defaults when coming from AccountsReports
                localStorage.removeItem(FILTER_STORAGE_KEY);
                clearURLParams();
                setDraftFilters(defaultFilters);
                setAppliedFilters(defaultFilters);
                fetchReport(defaultFilters);
                
                // Clear the state flag to avoid re-triggering on subsequent navigations
                window.history.replaceState({}, document.title);
            } else {
                const saved = localStorage.getItem(FILTER_STORAGE_KEY);
                const urlFilters = getFiltersFromURL();
                const hasURLParams = searchParams.toString().length > 0;

                if (hasURLParams) {
                    setDraftFilters(urlFilters);
                    setAppliedFilters(urlFilters);
                    fetchReport(urlFilters);
                } else if (saved) {
                    const parsed = JSON.parse(saved);
                    const normalized = { ...defaultFilters, ...parsed };
                    setDraftFilters(normalized);
                    setAppliedFilters(normalized);
                    fetchReport(normalized);
                } else {
                    setDraftFilters(defaultFilters);
                    setAppliedFilters(defaultFilters);
                    fetchReport(defaultFilters);
                }
            }
        } catch (_) { }

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

    const fetchReport = async (filters) => {
        setLoading(true);
        setError('');

        try {
            const { startDate, endDate } = buildDatesForApi(filters);

            const normalizedColumnsBy = normalizeColumnsBy(filters.columnsBy);
            const normalizedDisplayColumnsBy = normalizeColumnsBy(filters.displayColumnsBy);

            const params = new URLSearchParams({
                startDate,
                endDate,
                accountingBasis: filters.accountingBasis,
                columnsBy: normalizedColumnsBy,
                includeZeros: String(filters.includeZeros),
                rowFilter: filters.rowFilter,
                includeInactive: String(filters.includeInactive),
                compare: filters.compare.join(','),
                includeCompareDeltas: String(filters.includeCompareDeltas),
                includePercentOfIncome: String(filters.includePercentOfIncome),
                displayColumnsBy: normalizedDisplayColumnsBy,
            });

            if (tenantId) params.set('tenantId', String(tenantId));

            const url = `${baseURl}account-report/profit-loss?${params.toString()}`;
            const res = await getRequestWithOutBody(url, accessToken);

            const raw = res?.data ?? res;
            const data = raw?.data ?? raw;

            const processedAccounts = mergeComparisonAccountsIntoTree(
                processAccountData(data?.accounts || []),
                data?.comparisons || {}
            );
            setRows(processedAccounts);
            setReportMeta({
                period: data?.period || null,
                filters: data?.filters || null,
                totals: data?.totals || {},
                columns: Array.isArray(data?.columns) ? data.columns : [],
                totalsByColumn: Array.isArray(data?.totalsByColumn) ? data.totalsByColumn : [],
                comparisons: data?.comparisons || {},
                deltas: data?.deltas || {},
            });
        } catch (e) {
            setError('Failed to load profit & loss report.');
            setRows([]);
            setReportMeta({
                period: null,
                filters: null,
                totals: {},
                columns: [],
                totalsByColumn: [],
                comparisons: {},
                deltas: {},
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id, currentOpen) => {
        setOpenMapState((prev) => ({
            ...prev,
            [id]: !(Object.prototype.hasOwnProperty.call(prev, id) ? prev[id] : currentOpen),
        }));
    };

    const toggleAllRows = () => {
        const newState = {};
        const walk = (items, level = 0) => {
            items.forEach((item) => {
                const id = item?.id ?? item?.code ?? item?.label ?? item?.name;
                // Keep top-level (Income/Expenses) rows visible; only collapse/expand inner rows.
                if (id) newState[id] = level === 0 ? true : isAllCollapsed;
                if (Array.isArray(item?.children) && item.children.length > 0) {
                    walk(item.children, level + 1);
                }
            });
        };
        walk(rows, 0);
        setOpenMapState(newState);
        setIsAllCollapsed(!isAllCollapsed);
    };

    const handleSort = () => {
        const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(newOrder);

        const sortTree = (items) => {
            const list = Array.isArray(items) ? items : [];
            return list.map((item) => {
                const children = Array.isArray(item?.children) ? item.children : [];
                const sortedChildren = [...children].sort((a, b) => {
                    const aVal = Number(a?.amount ?? a?.total ?? 0);
                    const bVal = Number(b?.amount ?? b?.total ?? 0);
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

    const getPeriodLabel = () => {
        const { time, startDate, endDate } = appliedFilters;

        if (time === 'custom' && (startDate || endDate)) {
            return `${startDate ? formatMMDDYYYY(startDate) : '...'} to ${endDate ? formatMMDDYYYY(endDate) : '...'}`;
        }

        if (time === 'thisMonth') return 'This Month';
        if (time === 'lastMonth') return 'Last Month';
        if (time === 'thisQuarter') return 'This Quarter';
        if (time === 'lastQuarter') return 'Last Quarter';
        if (time === 'thisYear') return 'This Year';
        if (time === 'lastYear') return 'Last Year';
        return 'Custom';
    };

    const getReportSubtitleLabel = () => {
        const { startDate, endDate } = buildDatesForApi(appliedFilters);
        const start = formatMonthYearLong(startDate);
        const end = formatMonthYearLong(endDate);
        if (start && end) return `${start} - ${end}`;
        return getPeriodLabel();
    };

    const getSummaryKeyFromRow = (row) => {
        const label = String(row?.label || row?.name || '').toLowerCase().trim();
        if (label === 'income') return 'income';
        if (label === 'cost of goods sold') return 'costOfGoodsSold';
        if (label === 'gross profit') return 'grossProfit';
        if (label === 'expenses') return 'expenses';
        if (label === 'net income' || label === 'net profit') return 'netIncome';
        return null;
    };

    const compareAmountMaps = useMemo(() => {
        const comparisons = reportMeta?.comparisons || {};
        const active = Array.isArray(appliedFilters.compare)
            ? appliedFilters.compare.filter(Boolean)
            : [];
        return active.reduce((acc, code) => {
            const payloadKey = COMPARE_KEY_MAP[code];
            const accounts = payloadKey ? comparisons?.[payloadKey]?.accounts : null;
            acc[code] = buildAmountMapByPath(Array.isArray(accounts) ? accounts : []);
            return acc;
        }, {});
    }, [reportMeta?.comparisons, appliedFilters.compare]);

    const compareAmountMapsById = useMemo(() => {
        const comparisons = reportMeta?.comparisons || {};
        const active = Array.isArray(appliedFilters.compare)
            ? appliedFilters.compare.filter(Boolean)
            : [];
        return active.reduce((acc, code) => {
            const payloadKey = COMPARE_KEY_MAP[code];
            const accounts = payloadKey ? comparisons?.[payloadKey]?.accounts : null;
            acc[code] = buildAmountMapById(Array.isArray(accounts) ? accounts : []);
            return acc;
        }, {});
    }, [reportMeta?.comparisons, appliedFilters.compare]);

    const compareByColumnMapsByPath = useMemo(() => {
        const comparisons = reportMeta?.comparisons || {};
        const active = Array.isArray(appliedFilters.compare)
            ? appliedFilters.compare.filter(Boolean)
            : [];
        return active.reduce((acc, code) => {
            const payloadKey = COMPARE_KEY_MAP[code];
            const accounts = payloadKey ? comparisons?.[payloadKey]?.accounts : null;
            acc[code] = buildByColumnMapByPath(Array.isArray(accounts) ? accounts : []);
            return acc;
        }, {});
    }, [reportMeta?.comparisons, appliedFilters.compare]);

    const compareByColumnMapsById = useMemo(() => {
        const comparisons = reportMeta?.comparisons || {};
        const active = Array.isArray(appliedFilters.compare)
            ? appliedFilters.compare.filter(Boolean)
            : [];
        return active.reduce((acc, code) => {
            const payloadKey = COMPARE_KEY_MAP[code];
            const accounts = payloadKey ? comparisons?.[payloadKey]?.accounts : null;
            acc[code] = buildByColumnMapById(Array.isArray(accounts) ? accounts : []);
            return acc;
        }, {});
    }, [reportMeta?.comparisons, appliedFilters.compare]);

    const compareTotalsByColumnMaps = useMemo(() => {
        const comparisons = reportMeta?.comparisons || {};
        const active = Array.isArray(appliedFilters.compare)
            ? appliedFilters.compare.filter(Boolean)
            : [];
        return active.reduce((acc, code) => {
            const payloadKey = COMPARE_KEY_MAP[code];
            const list = payloadKey ? comparisons?.[payloadKey]?.totalsByColumn : [];
            const map = {};
            (Array.isArray(list) ? list : []).forEach((item) => {
                if (item?.key) map[item.key] = item;
            });
            acc[code] = map;
            return acc;
        }, {});
    }, [reportMeta?.comparisons, appliedFilters.compare]);

    const getRowCompareValue = (row, compareType, pathKey) => {
        const summaryKey = getSummaryKeyFromRow(row);
        const payloadKey = COMPARE_KEY_MAP[compareType];
        if (summaryKey && payloadKey) {
            const totalVal = reportMeta?.comparisons?.[payloadKey]?.totals?.[summaryKey];
            if (totalVal !== null && totalVal !== undefined) return totalVal;
        }

        const pathMap = compareAmountMaps[compareType];
        if (pathMap && pathKey && pathMap.has(pathKey)) {
            return pathMap.get(pathKey);
        }

        const idMap = compareAmountMapsById[compareType];
        if (idMap && row?.id != null && idMap.has(row.id)) {
            return idMap.get(row.id);
        }

        return null;
    };

    const getRowDeltaPercent = (row, compareType, pathKey) => {
        const summaryKey = getSummaryKeyFromRow(row);
        const payloadKey = COMPARE_KEY_MAP[compareType];
        if (summaryKey && payloadKey) {
            const fromApi = reportMeta?.deltas?.[payloadKey]?.totals?.[summaryKey]?.percent;
            if (fromApi !== null && fromApi !== undefined) return fromApi;
        }

        const compareVal = getRowCompareValue(row, compareType, pathKey);
        if (compareVal === null || compareVal === undefined) return null;

        const current = Number(typeof row.amount === 'number' ? row.amount : row.total);
        const prev = Number(compareVal);
        if (Number.isNaN(current) || Number.isNaN(prev)) return null;
        if (current === 0 && prev === 0) return 0;
        if (prev === 0) return null;
        return ((current - prev) / Math.abs(prev)) * 100;
    };

    const resolveByColumnCompareValue = (row, compareType, columnKey) => {
        if (!row || !columnKey) return null;

        const payloadKey = COMPARE_KEY_MAP[compareType] || compareType;
        const compareData = row?.comparisons?.[payloadKey] || row?.comparisons?.[compareType];

        if (compareData?.byColumn) {
            const fromByColumn = readByColumnAmount(compareData.byColumn, columnKey);
            if (fromByColumn !== null && fromByColumn !== undefined) return fromByColumn;
        }

        if (compareData?.byColumn?.[columnKey] !== undefined && compareData?.byColumn?.[columnKey] !== null) {
            const cell = compareData.byColumn[columnKey];
            return typeof cell === 'number' ? cell : readByColumnAmount(compareData.byColumn, columnKey);
        }

        if (row?.byColumnComparisons?.[compareType]?.[columnKey] !== undefined) {
            return row.byColumnComparisons[compareType][columnKey];
        }
        if (row?.byColumnComparisons?.[payloadKey]?.[columnKey] !== undefined) {
            return row.byColumnComparisons[payloadKey][columnKey];
        }

        return null;
    };

    const resolveByColumnDeltaPercent = (row, compareType, columnKey) => {
        if (!row || !columnKey) return null;
        
        // Try to get delta percent from row's deltas data
        const deltaData = row?.deltas?.[compareType];
        if (deltaData?.byColumn?.[columnKey]?.percent !== undefined && deltaData?.byColumn?.[columnKey]?.percent !== null) {
            return deltaData.byColumn[columnKey].percent;
        }
        
        // Fallback: try direct delta field
        if (row?.byColumnDeltas?.[compareType]?.[columnKey]?.percent !== undefined) {
            return row.byColumnDeltas[compareType][columnKey].percent;
        }
        
        return null;
    };

    const getSummaryByColumnCompareValue = (row, compareType, columnKey) => {
        const summaryKey = getSummaryKeyFromRow(row);
        const payloadKey = COMPARE_KEY_MAP[compareType];
        if (!summaryKey || !payloadKey || !columnKey) return null;

        const colData = compareTotalsByColumnMaps[compareType]?.[columnKey];
        if (colData?.totals?.[summaryKey] !== null && colData?.totals?.[summaryKey] !== undefined) {
            return colData.totals[summaryKey];
        }
        if (colData?.[summaryKey] !== null && colData?.[summaryKey] !== undefined) {
            return colData[summaryKey];
        }
        return null;
    };

    const getFirstMonthCompareColumnKey = (col) => {
        const prevMonthKey = getPrevMonthColumnKey(col?.key);
        const compColumns = reportMeta?.comparisons?.previousPeriod?.columns;
        if (Array.isArray(compColumns) && compColumns.length) {
            if (prevMonthKey && compColumns.some((c) => c?.key === prevMonthKey)) {
                return prevMonthKey;
            }
            const sorted = [...compColumns].sort((a, b) =>
                String(a?.key || '').localeCompare(String(b?.key || ''))
            );
            if (col?.key) {
                const beforeCurrent = sorted.filter((c) => c?.key && c.key < col.key);
                if (beforeCurrent.length) return beforeCurrent[beforeCurrent.length - 1].key;
            }
            return sorted[sorted.length - 1]?.key || prevMonthKey;
        }
        return prevMonthKey;
    };

    const getMonthGroupedPPValue = (row, col, colIndex, pathKey, compareType = 'pp') => {
        const fromApi = resolveByColumnCompareValue(row, compareType, col.key);
        if (fromApi !== null && fromApi !== undefined) return fromApi;

        if (colIndex > 0) {
            const prevColKey = activeColumns[colIndex - 1]?.key;
            return readByColumnAmount(row?.byColumn, prevColKey);
        }

        const prevMonthKey = getFirstMonthCompareColumnKey(col);
        if (!prevMonthKey) return null;

        const payloadKey = COMPARE_KEY_MAP[compareType];
        const rowCompareData = payloadKey ? row?.comparisons?.[payloadKey] : null;

        if (rowCompareData?.byColumn) {
            const fromRowCompare = pickBestPreviousMonthFromByColumn(
                rowCompareData.byColumn,
                col.key,
                prevMonthKey
            );
            if (fromRowCompare !== null && fromRowCompare !== undefined) return fromRowCompare;
        }

        if (typeof rowCompareData?.amount === 'number') {
            return rowCompareData.amount;
        }

        const pathMap = compareByColumnMapsByPath[compareType];
        const idMap = compareByColumnMapsById[compareType];
        let compareByCol = null;
        if (pathMap?.has(pathKey)) {
            compareByCol = pathMap.get(pathKey);
        } else if (row?.id != null && idMap?.has(row.id)) {
            compareByCol = idMap.get(row.id);
        }

        if (compareByCol) {
            const fromCompareByColumn = pickBestPreviousMonthFromByColumn(
                compareByCol,
                col.key,
                prevMonthKey
            );
            if (fromCompareByColumn !== null && fromCompareByColumn !== undefined) {
                return fromCompareByColumn;
            }
        }

        const fromSummaryColumn = getSummaryByColumnCompareValue(row, compareType, prevMonthKey);
        if (fromSummaryColumn !== null && fromSummaryColumn !== undefined) {
            return fromSummaryColumn;
        }

        return getRowCompareValue(row, compareType, pathKey);
    };

    const totalIncome = safeNumber(reportMeta?.totals?.income);

    const isColumnMode = normalizeColumnsBy(appliedFilters.columnsBy) !== 'total';
    const isMonthGroupedMode = isColumnMode && normalizeColumnsBy(appliedFilters.columnsBy) === 'month';

    const activeColumns = useMemo(() => {
        if (!isColumnMode) return [];
        return Array.isArray(reportMeta?.columns) ? reportMeta.columns : [];
    }, [isColumnMode, reportMeta?.columns]);

    const totalsByColumnMap = useMemo(() => {
        const map = {};
        const list = Array.isArray(reportMeta?.totalsByColumn) ? reportMeta.totalsByColumn : [];
        list.forEach((item) => {
            if (item?.key) map[item.key] = item;
        });
        return map;
    }, [reportMeta?.totalsByColumn]);

    const selectedCompareMap = useMemo(() => {
        if (isColumnMode) return [];
        const map = [];
        if (appliedFilters.compare.includes('pp')) map.push({ key: 'pp', label: 'PP', showDelta: true });
        if (appliedFilters.compare.includes('py')) map.push({ key: 'py', label: 'PY', showDelta: true });
        if (appliedFilters.compare.includes('ytd')) map.push({ key: 'ytd', label: 'YTD', showDelta: false });
        if (appliedFilters.compare.includes('py_ytd')) map.push({ key: 'py_ytd', label: 'PY YTD', showDelta: false });
        return map;
    }, [appliedFilters.compare, isColumnMode]);

    const monthGroupedCompareItems = useMemo(() => {
        if (!isMonthGroupedMode) return [];
        const items = [];
        if (appliedFilters.compare.includes('pp')) {
            items.push({ key: 'pp', label: 'PP', showDelta: true });
        }
        return items;
    }, [isMonthGroupedMode, appliedFilters.compare]);

    const showMonthGroupedCompare = monthGroupedCompareItems.length > 0;

    const monthGroupedColsPerPeriod = useMemo(() => {
        if (!showMonthGroupedCompare) return 1;
        let cols = 1;
        cols += monthGroupedCompareItems.length;
        cols += monthGroupedCompareItems.filter((item) => item.showDelta).length;
        return cols;
    }, [showMonthGroupedCompare, monthGroupedCompareItems]);

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

        // Keep a single source of truth in the UI (columnsBy), and mirror it
        // into displayColumnsBy for API/export/backward compatibility.
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

        fetchReport(filters);
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
        fetchReport(clearedFilters);
    };

    useEffect(() => {
        if (!rows || rows.length === 0) return;
        
        const allIds = [];
        const walk = (items, level = 0) => {
            items.forEach((item) => {
                const id = item?.id ?? item?.code ?? item?.label ?? item?.name;
                // Ignore top-level section rows when computing global collapsed state.
                if (level > 0 && id && Array.isArray(item?.children) && item.children.length > 0) {
                    allIds.push(id);
                    walk(item.children, level + 1);
                } else if (Array.isArray(item?.children) && item.children.length > 0) {
                    walk(item.children, level + 1);
                }
            });
        };
        walk(rows, 0);
        
        const allClosed = allIds.every((id) => {
            const open = Object.prototype.hasOwnProperty.call(openMapState, id) ? openMapState[id] : true;
            return open === false;
        });
        
        if (allClosed !== isAllCollapsed) setIsAllCollapsed(allClosed);
    }, [rows, openMapState, isAllCollapsed]);

    const escapeCsvCell = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (/[",\n\r]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const formatCsvValue = (value, headerText) => {
        if (value === null || value === undefined || value === '') return '';
        const header = String(headerText || '').toUpperCase();
        if (typeof value === 'number') {
            if (header.includes('CHG') || header.includes('%')) {
                return `${(value * 100).toFixed(2)}%`;
            }
            return value.toFixed(2);
        }
        return value;
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

    const formatExportCellDisplay = (value, headerText) => {
        if (value === null || value === undefined || value === '') return '-';
        const header = String(headerText || '').toUpperCase();
        if (typeof value === 'number') {
            if (header.includes('CHG') || header.includes('%')) {
                return formatPercent(value * 100);
            }
            return formatCurrency(value);
        }
        return String(value);
    };

    const buildExportHeaders = () => {
        const headers = ['Account'];

        if (isMonthGroupedMode && showMonthGroupedCompare) {
            activeColumns.forEach((col, colIndex) => {
                const colLabel = col.label || formatColumnKeyLabel(col.key) || col.key;
                headers.push(`${colLabel} Current`);
                monthGroupedCompareItems.forEach((item) => {
                    const ppLabel =
                        item.key === 'pp'
                            ? getPPPeriodLabelForColumn(col.key, colIndex) || item.label
                            : item.label;
                    headers.push(`${colLabel} ${ppLabel}`);
                });
                monthGroupedCompareItems
                    .filter((item) => item.showDelta)
                    .forEach(() => headers.push(`${colLabel} % CHG`));
            });
            return headers;
        }

        if (isColumnMode) {
            activeColumns.forEach((col) => {
                headers.push(col.label || formatColumnKeyLabel(col.key) || col.key);
            });
            if (appliedFilters.includePercentOfIncome) {
                activeColumns.forEach((col) => {
                    headers.push(`${col.label || formatColumnKeyLabel(col.key) || col.key} % Income`);
                });
            }
            return headers;
        }

        headers.push('Current');
        if (appliedFilters.includePercentOfIncome) headers.push('% Income');
        selectedCompareMap.forEach((item) => {
            headers.push(getComparisonPeriodLabel(item.key));
        });
        if (appliedFilters.includeCompareDeltas) {
            selectedCompareMap
                .filter((item) => item.showDelta)
                .forEach((item) => headers.push(`% CHG ${item.label}`));
        }
        return headers;
    };

    const getExportRowAmountValues = (row, pathKey) => {
        const amount = typeof row.amount === 'number' ? row.amount : row.total;
        const percentOfIncome =
            row?.percentOfIncome !== null && row?.percentOfIncome !== undefined
                ? row.percentOfIncome
                : totalIncome !== 0
                    ? (safeNumber(amount) / totalIncome) * 100
                    : null;
        const values = [];

        if (isMonthGroupedMode && showMonthGroupedCompare) {
            activeColumns.forEach((col, colIndex) => {
                const byColValue = row?.byColumn?.[col.key];
                const ppValue = getMonthGroupedPPValue(row, col, colIndex, pathKey, 'pp');
                const resolvedDelta = resolveByColumnDeltaPercent(row, 'pp', col.key);
                const computedDelta = (() => {
                    const curr = Number(byColValue);
                    const prev = Number(ppValue);
                    if (Number.isNaN(curr) || Number.isNaN(prev)) return null;
                    if (curr === 0 && prev === 0) return 0;
                    if (prev === 0) return null;
                    return ((curr - prev) / Math.abs(prev)) * 100;
                })();
                const deltaPercent = resolvedDelta ?? computedDelta;

                values.push(byColValue ?? null);
                monthGroupedCompareItems.forEach((compareItem) => {
                    values.push(compareItem.key === 'pp' ? ppValue ?? null : null);
                });
                monthGroupedCompareItems
                    .filter((item) => item.showDelta)
                    .forEach(() => {
                        values.push(
                            deltaPercent === null || deltaPercent === undefined || Number.isNaN(Number(deltaPercent))
                                ? null
                                : Number(deltaPercent) / 100
                        );
                    });
            });
            return values;
        }

        if (isColumnMode) {
            activeColumns.forEach((col) => {
                values.push(row?.byColumn?.[col.key] ?? null);
            });
            if (appliedFilters.includePercentOfIncome) {
                activeColumns.forEach((col) => {
                    const byColValue = row?.byColumn?.[col.key];
                    const incomeForCol = safeNumber(totalsByColumnMap?.[col.key]?.totals?.income);
                    const pct = incomeForCol !== 0 ? (safeNumber(byColValue) / incomeForCol) * 100 : null;
                    values.push(pct === null ? null : pct / 100);
                });
            }
            return values;
        }

        values.push(amount ?? null);
        if (appliedFilters.includePercentOfIncome) {
            values.push(percentOfIncome === null ? null : percentOfIncome / 100);
        }
        selectedCompareMap.forEach((compareItem) => {
            const compareValue = getRowCompareValue(row, compareItem.key, pathKey);
            values.push(compareValue ?? null);
        });
        if (appliedFilters.includeCompareDeltas) {
            selectedCompareMap
                .filter((item) => item.showDelta)
                .forEach((compareItem) => {
                    const deltaPercent = getRowDeltaPercent(row, compareItem.key, pathKey);
                    values.push(
                        deltaPercent === null || deltaPercent === undefined || Number.isNaN(Number(deltaPercent))
                            ? null
                            : Number(deltaPercent) / 100
                    );
                });
        }
        return values;
    };

    const collectExportRows = (rowList, level = 0, parentPath = [], out = []) => {
        rowList.forEach((row) => {
            const label = row.label || row.name || '';
            const pathParts = [...parentPath, label].filter(Boolean);
            const pathKey = pathParts.join(' > ');
            const isSummary = !!row.isSummary;
            const isSummaryRow =
                isSummary ||
                (label &&
                    (label.includes('Gross Profit') ||
                        label.includes('Net Income') ||
                        label.includes('Net Profit') ||
                        label.toLowerCase().includes('total ')));
            const isMainHead = Array.isArray(row.children) && row.children.length > 0 && level === 0;
            const indent = level > 0 ? `${'  '.repeat(level)}` : '';

            out.push({
                values: [`${indent}${label}`, ...getExportRowAmountValues(row, pathKey)],
                meta: { level, isSummaryRow, isMainHead },
            });

            if (Array.isArray(row.children) && row.children.length > 0) {
                collectExportRows(row.children, level + 1, pathParts, out);
            }
        });
        return out;
    };

    const getProfitLossExportPayload = () => {
        if (!rows?.length) return null;
        return {
            headers: buildExportHeaders(),
            exportRows: collectExportRows(rows),
            companyTitle: (companyName || '').toUpperCase() || 'PROFIT AND LOSS REPORT',
            period: getReportSubtitleLabel(),
        };
    };

    const buildProfitLossPdfDoc = async (payload) => {
        const { jsPDF } = await import('jspdf');
        const { headers, exportRows, companyTitle, period } = payload;
        const orientation = headers.length > 4 ? 'landscape' : 'portrait';
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
        doc.text('Profit and Loss Report', pageWidth / 2, marginTop + 20, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...subtextColor);
        doc.text(period, pageWidth / 2, marginTop + 36, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        const accountWidth = Math.min(Math.max(contentWidth * 0.34, 140), contentWidth * 0.45);
        const dataColCount = Math.max(headers.length - 1, 0);
        const dataColWidth = dataColCount > 0 ? (contentWidth - accountWidth) / dataColCount : contentWidth;
        const colWidths = headers.map((_, idx) => (idx === 0 ? accountWidth : dataColWidth));

        const fontSize = headers.length > 10 ? 7 : headers.length > 6 ? 8 : 9;
        const paddingX = 4;
        const paddingY = 4;
        const minRowHeight = 16;
        let y = marginTop + 58;

        const getColX = (colIdx) => marginX + colWidths.slice(0, colIdx).reduce((sum, w) => sum + w, 0);

        const drawTableRow = (rawValues, { isHeader = false, isBold = false } = {}) => {
            const displayValues = rawValues.map((value, idx) =>
                isHeader ? String(value ?? '') : formatExportCellDisplay(value, headers[idx])
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
            drawTableRow(values, {
                isBold: meta.isMainHead || meta.isSummaryRow || meta.level === 0,
            });
        });

        return doc;
    };

    const handleExportCsv = async () => {
        try {
            const payload = getProfitLossExportPayload();
            if (!payload) {
                toast.error('No report data to export');
                return;
            }

            const { headers, exportRows, companyTitle, period } = payload;
            const colCount = headers.length;

            const csvLines = [
                buildCenteredTitleRow(companyTitle, colCount).map(escapeCsvCell).join(','),
                buildCenteredTitleRow('Profit and Loss Report', colCount).map(escapeCsvCell).join(','),
                buildCenteredTitleRow(period, colCount).map(escapeCsvCell).join(','),
                Array(colCount).fill('').join(','),
                headers.map(escapeCsvCell).join(','),
                ...exportRows.map(({ values }) =>
                    values
                        .map((cellValue, colIdx) =>
                            escapeCsvCell(formatCsvValue(cellValue, headers[colIdx]))
                        )
                        .join(',')
                ),
            ];

            const blob = new Blob(['\uFEFF', csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `profit_loss_${Date.now()}.csv`;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            try {
                const { startDate, endDate } = buildDatesForApi(appliedFilters);

                const params = new URLSearchParams({
                    type: 'csv',
                    startDate,
                    endDate,
                    accountingBasis: appliedFilters.accountingBasis,
                    columnsBy: normalizeColumnsBy(appliedFilters.columnsBy),
                    includeZeros: String(appliedFilters.includeZeros),
                    rowFilter: appliedFilters.rowFilter,
                    includeInactive: String(appliedFilters.includeInactive),
                    compare: appliedFilters.compare.join(','),
                    includeCompareDeltas: String(appliedFilters.includeCompareDeltas),
                    includePercentOfIncome: String(appliedFilters.includePercentOfIncome),
                    displayColumnsBy: normalizeColumnsBy(appliedFilters.displayColumnsBy),
                    orderBy: 'date',
                    order: 'DESC',
                });

                if (tenantId) params.set('tenantId', String(tenantId));

                const url = `${baseURl}account-report/profit-loss/export?${params.toString()}`;
                await downloadFileWithToken(url, accessToken, `profit_loss_${Date.now()}.csv`);
            } catch (fallbackErr) {
                toast.error(fallbackErr?.message || e?.message || 'Failed to export CSV');
            }
        }
    };

    const handleExportPDF = async () => {
        try {
            const payload = getProfitLossExportPayload();
            if (!payload) {
                toast.error('No report data to export');
                return;
            }

            const doc = await buildProfitLossPdfDoc(payload);
            doc.save(`profit_loss_${Date.now()}.pdf`);
        } catch (e) {
            try {
                const { startDate, endDate } = buildDatesForApi(appliedFilters);

                const params = new URLSearchParams({
                    type: 'pdf',
                    startDate,
                    endDate,
                    accountingBasis: appliedFilters.accountingBasis,
                    columnsBy: normalizeColumnsBy(appliedFilters.columnsBy),
                    includeZeros: String(appliedFilters.includeZeros),
                    rowFilter: appliedFilters.rowFilter,
                    includeInactive: String(appliedFilters.includeInactive),
                    compare: appliedFilters.compare.join(','),
                    includeCompareDeltas: String(appliedFilters.includeCompareDeltas),
                    includePercentOfIncome: String(appliedFilters.includePercentOfIncome),
                    displayColumnsBy: normalizeColumnsBy(appliedFilters.displayColumnsBy),
                    orderBy: 'date',
                    order: 'DESC',
                });

                if (tenantId) params.set('tenantId', String(tenantId));

                const url = `${baseURl}account-report/profit-loss/export?${params.toString()}`;
                await downloadFileWithToken(url, accessToken, `profit_loss_${Date.now()}.pdf`);
            } catch (fallbackErr) {
                toast.error(fallbackErr?.message || e?.message || 'Failed to export PDF');
            }
        }
    };

    const formatColumnKeyLabel = (columnKey) => {
        const match = String(columnKey || '').match(/^(\d{4})-(\d{2})$/);
        if (!match) return columnKey || '';
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(match[2], 10) - 1;
        if (monthIndex < 0 || monthIndex > 11) return columnKey;
        return `${monthNames[monthIndex]} ${match[1]}`;
    };

    const getPPPeriodLabelForColumn = (colKey, colIndex = 0) => {
        if (!colKey) return '';

        if (colIndex > 0) {
            const prevCol = activeColumns[colIndex - 1];
            return prevCol?.label || formatColumnKeyLabel(prevCol?.key);
        }

        const prevMonthKey = getFirstMonthCompareColumnKey({ key: colKey });
        if (!prevMonthKey) return '';

        const compColumns = reportMeta?.comparisons?.previousPeriod?.columns;
        if (Array.isArray(compColumns)) {
            const found = compColumns.find((c) => c.key === prevMonthKey);
            if (found?.label) return found.label;
        }

        const mainCols = reportMeta?.columns;
        if (Array.isArray(mainCols)) {
            const found = mainCols.find((c) => c.key === prevMonthKey);
            if (found?.label) return found.label;
        }

        return formatColumnKeyLabel(prevMonthKey);
    };

    const getComparisonPeriodLabel = (compareType) => {
        const comparison = reportMeta?.comparisons;
        const labelMap = {
            pp: 'PP',
            py: 'PY',
            ytd: 'YTD',
            py_ytd: 'PY YTD',
        };
        const shortLabel = labelMap?.[compareType] || String(compareType || '').toUpperCase();

        if (!comparison) return shortLabel;
        
        let periodData = null;
        if (compareType === 'pp') periodData = comparison.previousPeriod?.period;
        if (compareType === 'py') periodData = comparison.previousYear?.period;
        if (compareType === 'ytd') periodData = comparison.yearToDate?.period;
        if (compareType === 'py_ytd') periodData = comparison.previousYearToDate?.period;
        
        if (!periodData) return compareType.toUpperCase();
        
        const { startDate, endDate } = periodData;
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        };
        
        if (startDate === endDate) {
            return formatDate(startDate);
        }
        
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };

    const getCurrentReportPeriodDates = () => {
        const { startDate, endDate } = buildDatesForApi(appliedFilters);
        return { startDate, endDate };
    };

    const getComparisonPeriodDates = (compareType) => {
        const payloadKey = COMPARE_KEY_MAP[compareType];
        if (!payloadKey) return null;
        const periodData = reportMeta?.comparisons?.[payloadKey]?.period;
        if (!periodData?.startDate || !periodData?.endDate) return null;
        return {
            startDate: periodData.startDate,
            endDate: periodData.endDate,
        };
    };

    const getMonthGroupedCompareColumnDates = (col, colIndex, compareType = 'pp') => {
        if (colIndex > 0) {
            const prevCol = activeColumns[colIndex - 1];
            if (prevCol?.startDate && prevCol?.endDate) {
                return { startDate: prevCol.startDate, endDate: prevCol.endDate };
            }
        }

        const prevMonthKey = getFirstMonthCompareColumnKey(col);
        const payloadKey = COMPARE_KEY_MAP[compareType];
        const compColumns = payloadKey ? reportMeta?.comparisons?.[payloadKey]?.columns : null;
        if (Array.isArray(compColumns) && prevMonthKey) {
            const found = compColumns.find((c) => c?.key === prevMonthKey);
            if (found?.startDate && found?.endDate) {
                return { startDate: found.startDate, endDate: found.endDate };
            }
        }

        return getComparisonPeriodDates(compareType);
    };

    const openAccountLedger = (accountId, dateRange) => {
        if (!accountId) return;
        const start = normalizePeriodDate(dateRange?.startDate);
        const end = normalizePeriodDate(dateRange?.endDate);
        if (start && end) {
            setLedgerStartISO(toStartISOFromYYYYMMDD(start));
            setLedgerEndISO(toEndISOFromYYYYMMDD(end));
        } else {
            setLedgerStartISO(null);
            setLedgerEndISO(null);
        }
        setLedgerAccountId(accountId);
        setLedgerOpen(true);
    };

    const processAccountData = (accounts) => {
        if (!Array.isArray(accounts)) return [];
        
        return accounts.map(account => {
            const processedAccount = {
                ...account,
                label: account.name,
                amount: account.amount || 0,
                children: Array.isArray(account.children) ? processAccountData(account.children) : []
            };
            
            // Add special handling for summary accounts
            if (account.isSummary) {
                processedAccount.isSummary = true;
            }
            
            // Add profit/loss indicators for Net Income
            if (account.name === 'Net Income' || account.name === 'Net Profit') {
                processedAccount.isProfit = account.amount >= 0;
                processedAccount.isLoss = account.amount < 0;
            }
            
            return processedAccount;
        });
    };

    const renderRows = (rowsData, depth = 0) => {
        const items = [];

        const walk = (rowList, level, parentPath = []) => {
            rowList.forEach((row, index) => {
                const children = Array.isArray(row.children) ? row.children : [];
                const hasChildren = children.length > 0;

                const rowId = row.id ?? row.code ?? row.label ?? row.name ?? `row-${level}-${index}`;
                const isOpen =
                    openMapState[rowId] !== undefined
                        ? openMapState[rowId]
                        : row.defaultOpen !== undefined
                            ? row.defaultOpen
                            : true;

                const label = row.label || row.name || '';
                const pathParts = [...parentPath, label].filter(Boolean);
                const pathKey = pathParts.join(' > ');
                const amount = typeof row.amount === 'number' ? row.amount : row.total;

                const isSummary = !!row.isSummary;
                const isProfit = row.isProfit === true;
                const isLoss = row.isProfit === false || (label && (label.includes('Net Income') || label.includes('Net Profit')) && amount < 0);
                const isMainHead = hasChildren && level === 0;
                const isSummaryRow = isSummary || (label && (label.includes('Gross Profit') || label.includes('Net Income') || label.includes('Net Profit')));
                const clickable = !!row.id;

                const accountLabelStyles = (() => {
                    if (level === 0) {
                        return {
                            fontWeight: 700,
                            fontSize: 14,
                            textTransform: 'uppercase',
                            letterSpacing: 0.4,
                        };
                    }
                    if (level === 1 || isSummaryRow) {
                        return {
                            fontWeight: 700,
                            fontSize: 13,
                            textTransform: 'none',
                        };
                    }
                    return {
                        fontWeight: 400,
                        fontSize: 13,
                        textTransform: 'none',
                    };
                })();

                const amountCellFontWeight = level === 0 || level === 1 || isSummaryRow ? 700 : 400;

                const percentOfIncome =
                    row?.percentOfIncome !== null && row?.percentOfIncome !== undefined
                        ? row.percentOfIncome
                        : totalIncome !== 0
                            ? (safeNumber(amount) / totalIncome) * 100
                            : null;

                items.push(
                    <TableRow
                        key={rowId}
                        hover
                        sx={{
                            backgroundColor: isMainHead
                                ? COLORS.sectionBg
                                : isSummaryRow
                                    ? COLORS.summaryBg
                                    : 'transparent',
                            '&:hover': {
                                backgroundColor: clickable ? 'rgba(0,0,0,0.03)' : undefined,
                            },
                            cursor: clickable ? 'pointer' : 'default',
                        }}
                    >
                        <TableCell
                            onClick={(e) => {
                                if (!clickable) return;
                                e.stopPropagation();
                                openAccountLedger(row.id, getCurrentReportPeriodDates());
                            }}
                            sx={{
                                minWidth: 280,
                                position: 'sticky',
                                left: 0,
                                zIndex: 2,
                                backgroundColor: isMainHead
                                    ? COLORS.sectionBg
                                    : isSummaryRow
                                        ? COLORS.summaryBg
                                        : 'var(--dashboard-card-bg)',
                                borderBottom: `1px solid ${COLORS.border}`,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    pl: level * 2,
                                }}
                            >
                                {hasChildren ? (
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRow(rowId, isOpen);
                                        }}
                                        sx={{ mr: 1 }}
                                    >
                                        {isOpen ? (
                                            <KeyboardArrowDownIcon fontSize="small" />
                                        ) : (
                                            <KeyboardArrowRightIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                ) : (
                                    <Box sx={{ width: 32, mr: 1 }} />
                                )}

                                <Box>
                                    <Box
                                        sx={{
                                            ...accountLabelStyles,
                                            color: 'var(--dashboard-text-primary)',
                                        }}
                                    >
                                        {label === 'Net Income' || label === 'Net Profit' ? 'Net Profit / Net Loss' : label}
                                    </Box>
                                    {row.code ? (
                                        <Box
                                            sx={{
                                                fontSize: 11,
                                                color: 'var(--dashboard-text-secondary)',
                                                mt: 0.2,
                                            }}
                                        >
                                            {row.code}
                                        </Box>
                                    ) : null}
                                </Box>
                            </Box>
                        </TableCell>

                        {isMonthGroupedMode && showMonthGroupedCompare ? (
                            <>
                                {activeColumns.map((col, colIndex) => {
                                    const byColValue = row?.byColumn?.[col.key];
                                    const ppValue = getMonthGroupedPPValue(row, col, colIndex, pathKey, 'pp');
                                    const resolvedDelta = resolveByColumnDeltaPercent(row, 'pp', col.key);
                                    const computedDelta = (() => {
                                        const curr = Number(byColValue);
                                        const prev = Number(ppValue);

                                        if (Number.isNaN(curr) || Number.isNaN(prev)) return null;
                                        if (curr === 0 && prev === 0) return 0;
                                        if (prev === 0) return null;

                                        return ((curr - prev) / Math.abs(prev)) * 100;
                                    })();
                                    const deltaPercent = resolvedDelta ?? computedDelta;
                                    const deltaNum = Number(deltaPercent);
                                    const isNetIncomeRow = String(label || '') === 'Net Income' || String(label || '') === 'Net Profit' || String(label || '').toLowerCase().includes('net income') || String(label || '').toLowerCase().includes('net profit');
                                    const deltaColor = deltaPercent === null || deltaPercent === undefined || Number.isNaN(deltaNum)
                                        ? 'var(--dashboard-text-primary)'
                                        : deltaNum >= 0
                                            ? 'var(--dashboard-text-primary)'
                                            : COLORS.negative;

                                    const openLedgerForCurrentColumn = (e) => {
                                        e.stopPropagation();
                                        if (!clickable) return;
                                        openAccountLedger(
                                            row.id,
                                            col?.startDate && col?.endDate
                                                ? { startDate: col.startDate, endDate: col.endDate }
                                                : getCurrentReportPeriodDates()
                                        );
                                    };

                                    const openLedgerForCompareColumn = (e, compareType) => {
                                        e.stopPropagation();
                                        if (!clickable) return;
                                        openAccountLedger(
                                            row.id,
                                            getMonthGroupedCompareColumnDates(col, colIndex, compareType)
                                                || getComparisonPeriodDates(compareType)
                                        );
                                    };

                                    return (
                                        <Fragment key={`${rowId}-${col.key}`}>
                                            <TableCell
                                                key={`${rowId}-${col.key}-current`}
                                                align="right"
                                                onClick={openLedgerForCurrentColumn}
                                                sx={{
                                                    fontWeight: amountCellFontWeight,
                                                    color: isNetIncomeRow
                                                        ? Number(byColValue) < 0
                                                            ? COLORS.negative
                                                            : 'var(--dashboard-text-primary)'
                                                        : isLoss
                                                            ? COLORS.negative
                                                            : 'var(--dashboard-text-primary)',
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {formatCurrency(byColValue)}
                                            </TableCell>

                                            {monthGroupedCompareItems.map((compareItem) => (
                                                <TableCell
                                                    key={`${rowId}-${col.key}-${compareItem.key}`}
                                                    align="right"
                                                    onClick={(e) => openLedgerForCompareColumn(e, compareItem.key)}
                                                    sx={{
                                                        fontWeight: amountCellFontWeight,
                                                        color: 'var(--dashboard-text-primary)',
                                                        borderBottom: `1px solid ${COLORS.border}`,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {compareItem.key === 'pp'
                                                        ? ppValue === null
                                                            ? '-'
                                                            : formatCurrency(ppValue)
                                                        : '-'}
                                                </TableCell>
                                            ))}

                                            {monthGroupedCompareItems.map((compareItem) => {
                                                if (!compareItem.showDelta) return null;
                                                return (
                                                    <TableCell
                                                        key={`${rowId}-${col.key}-${compareItem.key}-chg`}
                                                        align="right"
                                                        onClick={(e) => openLedgerForCompareColumn(e, compareItem.key)}
                                                        sx={{
                                                            fontWeight: amountCellFontWeight,
                                                            color: deltaColor,
                                                            borderBottom: `1px solid ${COLORS.border}`,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {deltaPercent === null || deltaPercent === undefined || Number.isNaN(deltaNum)
                                                            ? '-'
                                                            : formatPercent(deltaNum)}
                                                    </TableCell>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })}
                            </>
                        ) : isColumnMode ? (
                            <>
                                {activeColumns.map((col) => {
                                    const byColValue = row?.byColumn?.[col.key];
                                    return (
                                        <TableCell
                                            key={`${rowId}-${col.key}`}
                                            align="right"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!clickable) return;
                                                openAccountLedger(
                                                    row.id,
                                                    col?.startDate && col?.endDate
                                                        ? { startDate: col.startDate, endDate: col.endDate }
                                                        : getCurrentReportPeriodDates()
                                                );
                                            }}
                                            sx={{
                                                fontWeight: amountCellFontWeight,
                                                color: isLoss ? COLORS.negative : 'var(--dashboard-text-primary)',
                                                borderBottom: `1px solid ${COLORS.border}`,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {formatCurrency(byColValue)}
                                        </TableCell>
                                    );
                                })}

                                {appliedFilters.includePercentOfIncome
                                    ? activeColumns.map((col) => {
                                          const byColValue = row?.byColumn?.[col.key];
                                          const incomeForCol = safeNumber(
                                              totalsByColumnMap?.[col.key]?.totals?.income
                                          );
                                          const pct =
                                              incomeForCol !== 0
                                                  ? (safeNumber(byColValue) / incomeForCol) * 100
                                                  : null;

                                          return (
                                              <TableCell
                                                  key={`${rowId}-${col.key}-pct`}
                                                  align="right"
                                                  sx={{
                                                      fontWeight: amountCellFontWeight,
                                                      color: 'var(--dashboard-text-primary)',
                                                      borderBottom: `1px solid ${COLORS.border}`,
                                                      whiteSpace: 'nowrap',
                                                  }}
                                              >
                                                  {pct === null ? '-' : `${pct.toFixed(2)}%`}
                                              </TableCell>
                                          );
                                      })
                                    : null}
                            </>
                        ) : (
                            <>
                                <TableCell
                                    align="right"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!clickable) return;
                                        openAccountLedger(row.id, getCurrentReportPeriodDates());
                                    }}
                                    sx={{
                                        fontWeight: amountCellFontWeight,
                                        color: isLoss ? COLORS.negative : 'var(--dashboard-text-primary)',
                                        borderBottom: `1px solid ${COLORS.border}`,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {formatCurrency(amount)}
                                </TableCell>

                                {appliedFilters.includePercentOfIncome ? (
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontWeight: amountCellFontWeight,
                                            color: 'var(--dashboard-text-primary)',
                                            borderBottom: `1px solid ${COLORS.border}`,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {percentOfIncome === null ? '-' : `${percentOfIncome.toFixed(2)}%`}
                                    </TableCell>
                                ) : null}

                                {selectedCompareMap.map((compareItem) => {
                                    const compareValue = getRowCompareValue(row, compareItem.key, pathKey);

                                    return (
                                        <TableCell
                                            key={`${rowId}-${compareItem.key}`}
                                            align="right"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!clickable) return;
                                                openAccountLedger(
                                                    row.id,
                                                    getComparisonPeriodDates(compareItem.key)
                                                );
                                            }}
                                            sx={{
                                                fontWeight: amountCellFontWeight,
                                                color: 'var(--dashboard-text-primary)',
                                                borderBottom: `1px solid ${COLORS.border}`,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {compareValue !== null && compareValue !== undefined
                                                ? formatCurrency(compareValue)
                                                : '-'}
                                        </TableCell>
                                    );
                                })}

                                {appliedFilters.includeCompareDeltas &&
                                    selectedCompareMap.map((compareItem) => {
                                        if (!compareItem.showDelta) return null;

                                        const deltaPercent = getRowDeltaPercent(row, compareItem.key, pathKey);
                                        const num = Number(deltaPercent);
                                        const color =
                                            deltaPercent === null || deltaPercent === undefined || Number.isNaN(num)
                                                ? 'var(--dashboard-text-primary)'
                                                : num >= 0
                                                    ? 'var(--dashboard-text-primary)'
                                                    : COLORS.negative;

                                        return (
                                            <TableCell
                                                key={`${rowId}-${compareItem.key}-delta`}
                                                align="right"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!clickable) return;
                                                    openAccountLedger(
                                                        row.id,
                                                        getComparisonPeriodDates(compareItem.key)
                                                    );
                                                }}
                                                sx={{
                                                    fontWeight: amountCellFontWeight,
                                                    color,
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {deltaPercent !== null && deltaPercent !== undefined
                                                    ? formatPercent(deltaPercent)
                                                    : '-'}
                                            </TableCell>
                                        );
                                    })}
                            </>
                        )}
                    </TableRow>
                );

                if (hasChildren && isOpen) {
                    walk(children, level + 1, pathParts);
                }
            });
        };

        walk(rowsData, depth, []);
        return items;
    };

    const totalColumns =
        isColumnMode
            ? isMonthGroupedMode && showMonthGroupedCompare
                ? 1 + activeColumns.length * monthGroupedColsPerPeriod
                : 1 + activeColumns.length * (1 + (appliedFilters.includePercentOfIncome ? 1 : 0))
            : 2 +
              (appliedFilters.includePercentOfIncome ? 1 : 0) +
              selectedCompareMap.length +
              (appliedFilters.includeCompareDeltas
                  ? selectedCompareMap.filter((item) => item.showDelta).length
                  : 0);

    return (
        <div
            className="min-h-screen"
            style={{
                marginTop: -80,
                padding: 16,
                backgroundColor: 'var(--dashboard-bg)',
            }}
        >
            <div className="mt-5">
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                        mb: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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

                        <Box>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Profit and Loss Report'}
                                Fontsize={28}
                            />
                            <Box sx={{ fontSize: 13, color: 'var(--dashboard-text-secondary)', mt: 0.5 }}>
                                Clean financial overview with compare periods and income ratios
                            </Box>
                        </Box>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                            icon={<CalendarMonthOutlinedIcon />}
                            label={getPeriodLabel()}
                            sx={{
                                fontWeight: 600,
                                background: '#eef4ff',
                                color: '#1d4ed8',
                            }}
                        />
                        <Chip
                            icon={<AssessmentOutlinedIcon />}
                            label={appliedFilters.accountingBasis === 'cash' ? 'Cash basis' : 'Accrual basis'}
                            sx={{
                                fontWeight: 600,
                                background: '#f4f4f5',
                            }}
                        />
                        {appliedFilters.compare.length ? (
                            <Chip
                                icon={<CompareArrowsOutlinedIcon />}
                                label={`${appliedFilters.compare.length} compare selected`}
                                sx={{
                                    fontWeight: 600,
                                    background: '#f0fdf4',
                                    color: '#166534',
                                }}
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
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setFiltersExpanded((prev) => !prev);
                            }
                        }}
                        onClick={() => setFiltersExpanded((prev) => !prev)}
                        sx={{
                            px: 2.5,
                            py: 1.75,
                            borderBottom: filtersExpanded ? `1px solid ${COLORS.border}` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            cursor: 'pointer',
                            userSelect: 'none',
                            background: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)',
                            '&:hover': {
                                background: 'linear-gradient(180deg, rgba(241,245,249,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                            <TuneIcon fontSize="small" />
                            <Box sx={{ fontWeight: 700, fontSize: 15 }}>Report Filters</Box>
                            {!filtersExpanded && (
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                    <Chip size="small" label={getPeriodLabel()} />
                                    <Chip
                                        size="small"
                                        label={draftFilters.accountingBasis === 'cash' ? 'Cash' : 'Accrual'}
                                        variant="outlined"
                                    />
                                    {draftFilters.compare.length > 0 && (
                                        <Chip
                                            size="small"
                                            label={`${draftFilters.compare.length} compare`}
                                            variant="outlined"
                                        />
                                    )}
                                </Stack>
                            )}
                        </Box>
                        <Tooltip title={filtersExpanded ? 'Hide filters' : 'Show filters'}>
                            <IconButton
                                size="small"
                                aria-label={filtersExpanded ? 'Hide filters' : 'Show filters'}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFiltersExpanded((prev) => !prev);
                                }}
                            >
                                {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Collapse in={filtersExpanded}>
                    <Box sx={{ p: 2.5 }}>
                        <Grid container spacing={2.2}>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Report period</InputLabel>
                                    <Select
                                        value={draftFilters.time}
                                        label="Report period"
                                        onChange={(e) =>
                                            setDraftFilters((prev) => ({ ...prev, time: e.target.value }))
                                        }
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
                                <Grid item xs={12} md={2}>
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

                                <Grid item xs={12} md={2}>
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

                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Show rows</InputLabel>
                                    <Select
                                        value={draftFilters.rowFilter}
                                        label="Show rows"
                                        onChange={(e) =>
                                            setDraftFilters((prev) => ({ ...prev, rowFilter: e.target.value }))
                                        }
                                    >
                                        <MenuItem value="all">All rows</MenuItem>
                                        <MenuItem value="active">Active only</MenuItem>
                                        <MenuItem value="nonzero">Non-zero only</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Columns by</InputLabel>
                                    <Select
                                        value={draftFilters.columnsBy}
                                        label="Columns by"
                                        onChange={(e) =>
                                            setDraftFilters((prev) => ({ ...prev, columnsBy: e.target.value }))
                                        }
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

                            <Grid item xs={12} md={2}>
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

                            <Grid item xs={12} md={2}>
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
                                                            setDraftFilters((prev) => ({
                                                                ...prev,
                                                                includeZeros: e.target.checked,
                                                            }));
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
                                                            setDraftFilters((prev) => ({
                                                                ...prev,
                                                                includeInactive: e.target.checked,
                                                            }));
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
                                                            setDraftFilters((prev) => ({
                                                                ...prev,
                                                                includeCompareDeltas: e.target.checked,
                                                            }));
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
                                                            setDraftFilters((prev) => ({
                                                                ...prev,
                                                                includePercentOfIncome: e.target.checked,
                                                            }));
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
                                <Chip
                                    size="small"
                                    label={`${draftFilters.compare.length} compare`}
                                    variant="outlined"
                                />
                            </Stack>

                            <Stack direction="row" spacing={1.2} flexWrap="wrap">
                                <Button
                                    variant="outlined"
                                    startIcon={<RestartAltIcon />}
                                    onClick={handleClearFilters}
                                >
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
                    </Collapse>
                </Paper>

                <Paper
                    ref={reportPdfRef}
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        border: `1px solid ${COLORS.border}`,
                        overflow: 'hidden',
                        backgroundColor: 'var(--dashboard-card-bg)',
                    }}
                >
                    <Box
                        sx={{
                            px: 2.5,
                            py: 1.8,
                            borderBottom: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                            flexWrap: 'wrap',
                            background: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)',
                        }}
                    >
                        <Box>
                            <Box sx={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>
                                Profit and Loss
                            </Box>
                            <Box sx={{ fontSize: 13, color: COLORS.subtext, mt: 0.4 }}>
                                {getPeriodLabel()}
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<FileDownloadOutlinedIcon />}
                                onClick={handleExportCsv}
                            >
                                Export CSV
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<FileDownloadOutlinedIcon />}
                                onClick={handleExportPDF}
                            >
                                Export PDF
                            </Button>
                        </Stack>
                    </Box>

                    <Box
                        sx={{
                            px: 2.5,
                            py: 1,
                            borderBottom: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flexWrap: 'wrap',
                            backgroundColor: 'rgba(248,250,252,0.6)',
                        }}
                    >
                        <Button
                            size="small"
                            startIcon={isAllCollapsed ? <KeyboardArrowRightIcon /> : <KeyboardArrowDownIcon />}
                            onClick={toggleAllRows}
                            sx={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: COLORS.subtext,
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
                                color: COLORS.subtext,
                                textTransform: 'uppercase',
                                minWidth: 'auto',
                                px: 1,
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                            }}
                        >
                            Sort {sortOrder === 'asc' ? '↑' : '↓'}
                        </Button>
                        {/* <Box sx={{ fontSize: 10, fontWeight: 700, color: COLORS.subtext, textTransform: 'uppercase', opacity: 0.5 }}>
                            Add notes
                        </Box>
                        <Box sx={{ fontSize: 10, fontWeight: 700, color: COLORS.subtext, textTransform: 'uppercase', opacity: 0.5 }}>
                            See a chart
                        </Box> */}
                    </Box>

                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            backgroundColor: 'transparent',
                            maxHeight: 'calc(100vh - 280px)',
                            overflow: 'auto',
                        }}
                    >
                        <Table
                            stickyHeader
                            size="small"
                            sx={{
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                                '& .MuiTableCell-root': {
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    borderRight: `1px solid ${COLORS.border}`,
                                },
                                '& .MuiTableHead-root .MuiTableCell-root': {
                                    ...tableHeaderCellSx,
                                },
                                '& .MuiTableRow-root .MuiTableCell-root:last-of-type': {
                                    borderRight: 'none',
                                },
                            }}
                        >
                            <TableHead>
                                {isColumnMode ? (
                                    isMonthGroupedMode && showMonthGroupedCompare ? (
                                        <>
                                            <TableRow>
                                                <TableCell
                                                    rowSpan={2}
                                                    sx={{
                                                        minWidth: 280,
                                                        fontWeight: 700,
                                                        fontSize: 11,
                                                        letterSpacing: 0.6,
                                                        textTransform: 'uppercase',
                                                        color: '#334155',
                                                        backgroundColor: '#f8fafc',
                                                        borderBottom: `1px solid ${COLORS.border}`,
                                                        position: 'sticky',
                                                        left: 0,
                                                        zIndex: 6,
                                                    }}
                                                >
                                                    Category
                                                </TableCell>

                                                {activeColumns.map((col) => (
                                                    <TableCell
                                                        key={col.key}
                                                        align="center"
                                                        colSpan={monthGroupedColsPerPeriod}
                                                        sx={{
                                                            minWidth: monthGroupedColsPerPeriod * 140,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            letterSpacing: 0.6,
                                                            textTransform: 'uppercase',
                                                            color: '#334155',
                                                            backgroundColor: '#f8fafc',
                                                            borderBottom: `1px solid ${COLORS.border}`,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {col.label || col.key}
                                                    </TableCell>
                                                ))}
                                            </TableRow>

                                            <TableRow>
                                                {activeColumns.map((col, colIndex) => (
                                                    <Fragment key={col.key}>
                                                        <TableCell
                                                            key={`${col.key}-current`}
                                                            align="right"
                                                            sx={{
                                                                minWidth: 140,
                                                                fontWeight: 700,
                                                                fontSize: 11,
                                                                letterSpacing: 0.6,
                                                                textTransform: 'uppercase',
                                                                color: '#334155',
                                                                backgroundColor: '#f8fafc',
                                                                borderBottom: `1px solid ${COLORS.border}`,
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            CURRENT
                                                        </TableCell>
                                                        {monthGroupedCompareItems.map((compareItem) => (
                                                            <TableCell
                                                                key={`${col.key}-${compareItem.key}`}
                                                                align="right"
                                                                sx={{
                                                                    minWidth: 120,
                                                                    fontWeight: 700,
                                                                    fontSize: 11,
                                                                    letterSpacing: 0.6,
                                                                    textTransform: 'uppercase',
                                                                    color: '#334155',
                                                                    backgroundColor: '#f8fafc',
                                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                {compareItem.key === 'pp'
                                                                    ? (() => {
                                                                          const ppLabel = getPPPeriodLabelForColumn(col.key, colIndex);
                                                                          return ppLabel ? `PP (${ppLabel})` : 'PP';
                                                                      })()
                                                                    : compareItem.label}
                                                            </TableCell>
                                                        ))}
                                                        {monthGroupedCompareItems.map((compareItem) => {
                                                            if (!compareItem.showDelta) return null;
                                                            return (
                                                                <TableCell
                                                                    key={`${col.key}-${compareItem.key}-chg`}
                                                                    align="right"
                                                                    sx={{
                                                                        minWidth: 120,
                                                                        fontWeight: 700,
                                                                        fontSize: 11,
                                                                        letterSpacing: 0.6,
                                                                        textTransform: 'uppercase',
                                                                        color: '#334155',
                                                                        backgroundColor: '#f8fafc',
                                                                        borderBottom: `1px solid ${COLORS.border}`,
                                                                        whiteSpace: 'nowrap',
                                                                    }}
                                                                >
                                                                    % CHG
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </Fragment>
                                                ))}
                                            </TableRow>
                                        </>
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                sx={{
                                                    minWidth: 280,
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                    letterSpacing: 0.6,
                                                    textTransform: 'uppercase',
                                                    color: '#334155',
                                                    backgroundColor: '#f8fafc',
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 5,
                                                }}
                                            >
                                                Category
                                            </TableCell>

                                            {activeColumns.map((col) => (
                                                <TableCell
                                                    key={col.key}
                                                    align="right"
                                                    sx={{
                                                        minWidth: 140,
                                                        fontWeight: 700,
                                                        fontSize: 11,
                                                        letterSpacing: 0.6,
                                                        textTransform: 'uppercase',
                                                        color: '#334155',
                                                        backgroundColor: '#f8fafc',
                                                        borderBottom: `1px solid ${COLORS.border}`,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {col.label || col.key}
                                                </TableCell>
                                            ))}

                                            {appliedFilters.includePercentOfIncome
                                                ? activeColumns.map((col) => (
                                                      <TableCell
                                                          key={`${col.key}-pct`}
                                                          align="right"
                                                          sx={{
                                                              minWidth: 110,
                                                              fontWeight: 700,
                                                              fontSize: 11,
                                                              letterSpacing: 0.6,
                                                              textTransform: 'uppercase',
                                                              color: '#334155',
                                                              backgroundColor: '#f8fafc',
                                                              borderBottom: `1px solid ${COLORS.border}`,
                                                              whiteSpace: 'nowrap',
                                                          }}
                                                      >
                                                          % Income
                                                      </TableCell>
                                                  ))
                                                : null}
                                        </TableRow>
                                    )
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            sx={{
                                                minWidth: 280,
                                                fontWeight: 700,
                                                fontSize: 11,
                                                letterSpacing: 0.6,
                                                textTransform: 'uppercase',
                                                color: '#334155',
                                                backgroundColor: '#f8fafc',
                                                borderBottom: `1px solid ${COLORS.border}`,
                                                position: 'sticky',
                                                left: 0,
                                                zIndex: 5,
                                            }}
                                        >
                                            Category
                                        </TableCell>

                                        <TableCell
                                            align="right"
                                            sx={{
                                                minWidth: 130,
                                                fontWeight: 700,
                                                fontSize: 11,
                                                letterSpacing: 0.6,
                                                textTransform: 'uppercase',
                                                color: '#334155',
                                                backgroundColor: '#f8fafc',
                                                borderBottom: `1px solid ${COLORS.border}`,
                                            }}
                                        >
                                            CURRENT
                                        </TableCell>

                                        {appliedFilters.includePercentOfIncome ? (
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    minWidth: 110,
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                    letterSpacing: 0.6,
                                                    textTransform: 'uppercase',
                                                    color: '#334155',
                                                    backgroundColor: '#f8fafc',
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                }}
                                            >
                                                % Income
                                            </TableCell>
                                        ) : null}

                                        {selectedCompareMap.map((item) => (
                                            <TableCell
                                                key={item.key}
                                                align="right"
                                                sx={{
                                                    minWidth: 130,
                                                    fontWeight: 700,
                                                    fontSize: 11,
                                                    letterSpacing: 0.6,
                                                    textTransform: 'uppercase',
                                                    color: '#334155',
                                                    backgroundColor: '#f8fafc',
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                }}
                                            >
                                                {getComparisonPeriodLabel(item.key)}
                                            </TableCell>
                                        ))}

                                        {appliedFilters.includeCompareDeltas &&
                                            selectedCompareMap.map((item) => {
                                                if (!item.showDelta) return null;
                                                return (
                                                    <TableCell
                                                        key={`${item.key}-delta`}
                                                        align="right"
                                                        sx={{
                                                            minWidth: 120,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            letterSpacing: 0.6,
                                                            textTransform: 'uppercase',
                                                            color: '#334155',
                                                            backgroundColor: '#f8fafc',
                                                            borderBottom: `1px solid ${COLORS.border}`,
                                                        }}
                                                    >
                                                        % CHG
                                                    </TableCell>
                                                );
                                            })}
                                    </TableRow>
                                )}
                            </TableHead>

                            <TableBody>
                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={totalColumns} align="center" sx={{ py: 4 }}>
                                            <Loader message="Loading..." subMessage="Please wait" />
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!loading && error && (
                                    <TableRow>
                                        <TableCell colSpan={totalColumns} align="center" sx={{ py: 4 }}>
                                            {error}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!loading && !error && rows?.length > 0 && renderRows(rows)}

                                {!loading && !error && (!rows || rows.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={totalColumns} align="center" sx={{ py: 4 }}>
                                            No data for selected period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {(() => {
                    const { startDate, endDate } = buildDatesForApi(appliedFilters);
                    return (
                        <AccountLedgerModal
                            open={ledgerOpen}
                            onClose={() => setLedgerOpen(false)}
                            accountId={ledgerAccountId}
                            startISO={ledgerStartISO || new Date(`${startDate}T00:00:00.000Z`).toISOString()}
                            endISO={ledgerEndISO || new Date(`${endDate}T23:59:59.999Z`).toISOString()}
                        />
                    );
                })()}
            </div>
        </div>
    );
};

export default ProfitLossReport;