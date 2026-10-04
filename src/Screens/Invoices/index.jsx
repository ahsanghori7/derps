import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import ListSearchField from "../../Components/ListSearchField";
import addIcon from "../../assets/addIcon.png";
import { useEffect, useMemo, useRef, useState } from "react";
import MemoTable from "../../Components/MemoTable";
import { deleteRequest, getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { toast } from "react-toastify";
import { Checkbox, FormControl, ListSubheader, ListItemText, MenuItem, OutlinedInput, Select, TextField } from "@mui/material";
import FilterDropdown from "../../Components/FilterDropdown";
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteConfirmationModal from "../../Components/DeleteModal";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { exportRowsToExcel } from '../../Utils/excelExport';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import CloseIcon from '@mui/icons-material/Close';

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPlacementInvoice = (value) => {
    if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true') return 'Yes';
    return 'No';
};

const normalizeVisibleColumnIds = (cols, defaults) => {
    const source = Array.isArray(cols) ? cols : [];
    const normalized = source
        .map((id) => (id === 'placement' ? 'isPlacementInvoice' : id))
        .filter(Boolean);
    const base = normalized.length > 0 ? normalized : [...defaults];
    defaults.forEach((id) => {
        if (!base.includes(id)) base.push(id);
    });
    return base;
};

const TYPE_OPTIONS = [
    { label: 'None', value: '' },
    { label: 'Weekly', value: 'week' },
    { label: 'Monthly', value: 'month' },
    { label: 'Yearly', value: 'year' },
];

const INVOICE_TABS = [
    { id: '', label: 'All Invoices' },
    { id: 'paid', label: 'Paid Invoices' },
    { id: 'unpaid', label: 'Un-Paid Invoices' },
    { id: 'partial', label: 'Partial Paid Invoices' },
    { id: 'placement', label: 'Placement Invoices' },
];

const pickStat = (stats, keys, fallback = 0) => {
    if (!stats) return fallback;
    for (const key of keys) {
        const val = stats[key];
        if (val !== undefined && val !== null && val !== '') return val;
    }
    return fallback;
};

const ICON_STYLES = {
    total: { bg: 'rgba(67, 121, 238, 0.12)', color: '#0C79F7' },
    paid: { bg: 'rgba(74, 196, 17, 0.15)', color: '#4AC411' },
    unpaid: { bg: 'rgba(239, 56, 38, 0.12)', color: '#EF3826' },
    partial: { bg: 'rgba(254, 105, 1, 0.15)', color: '#FE6901' },
    placement: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' },
};

const InvoiceStatCard = ({ title, count, amount, icon, active, onClick }) => {
    const iconStyles = ICON_STYLES[icon] || ICON_STYLES.total;

    const IconComponent = {
        total: DescriptionOutlinedIcon,
        paid: CheckCircleOutlineIcon,
        unpaid: HighlightOffOutlinedIcon,
        partial: AccessTimeOutlinedIcon,
        placement: BusinessCenterOutlinedIcon,
    }[icon] || DescriptionOutlinedIcon;

    return (
        <button
            type="button"
            onClick={onClick}
            className="text-left flex-1 min-w-[200px] max-w-[280px]"
            style={{
                background: 'var(--dashboard-card-bg)',
                borderRadius: 12,
                border: active ? '2px solid #0C79F7' : '1px solid var(--dashboard-box-border)',
                boxShadow: active ? '0 4px 14px rgba(67, 121, 238, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                padding: '16px 18px',
                cursor: 'pointer',
            }}
        >
            <div className="flex justify-between items-start gap-2">
                <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>{title}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--sidebar-text-primary)', marginTop: 4 }}>
                        {count}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sidebar-text-primary)', marginTop: 2 }}>
                        {amount}
                    </div>
                </div>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: iconStyles.bg,
                        color: iconStyles.color,
                    }}
                >
                    <IconComponent sx={{ fontSize: 22 }} />
                </span>
            </div>
        </button>
    );
};

const FilterChip = ({ label, onRemove }) => (
    <span
        className="inline-flex items-center gap-1"
        style={{
            background: '#0C79F7',
            color: '#fff',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
        }}
    >
        {label}
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            style={{ display: 'inline-flex', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
        >
            <CloseIcon sx={{ fontSize: 14 }} />
        </button>
    </span>
);

const Invoices = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Invoice", location);
    
    const pathFilters = useMemo(() => {
        const pathSegments = location.pathname.replace('/home/invoices', '').split('/').filter(Boolean);
        const result = {
            tab: '',
            type: '',
            keyword: '',
            startDate: '',
            endDate: '',
            cols: '',
            paginate: true,
            page: '1',
            rows: '25',
        };

        for (let i = 0; i < pathSegments.length; i += 1) {
            const key = pathSegments[i];
            const value = pathSegments[i + 1];
            if (!key || !value) continue;

            if (key === 'tab') result.tab = value;
            if (key === 'type') result.type = value;
            if (key === 'keyword') result.keyword = decodeURIComponent(value);
            if (key === 'startDate') result.startDate = value;
            if (key === 'endDate') result.endDate = value;
            if (key === 'cols') result.cols = value;
            if (key === 'page') result.page = value;
            if (key === 'paginate') result.paginate = value === 'true';
            if (key === 'rows') result.rows = value;
        }

        return result;
    }, [location.pathname]);
    
    const defaultVisibleColumnIds = useMemo(
        () => ['invoiceNo', 'agentName', 'merchantName', 'createdAt', 'dueDate', 'status', 'isPlacementInvoice', 'totalAmount'],
        []
    );

    const [invoiceList, setInvoiceList] = useState([]);
    const [invoiceStats, setInvoiceStats] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
    const fetchIdRef = useRef(0);
    const [filterType, setFilterType] = useState(() => pathFilters.type || '');
    const [startDate, setStartDate] = useState(() => pathFilters.startDate || '');
    const [endDate, setEndDate] = useState(() => pathFilters.endDate || '');
    const [page, setPage] = useState(() => Math.max(1, Number(pathFilters.page) || 1));
    const [rowsPerPage, setRowsPerPage] = useState(() => ([5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25));
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [search, setSearch] = useState(() => pathFilters.keyword || '');
    const [searchDraft, setSearchDraft] = useState(() => pathFilters.keyword || '');
    const [draftFilterType, setDraftFilterType] = useState(() => pathFilters.type || '');
    const [draftStartDate, setDraftStartDate] = useState(() => pathFilters.startDate || '');
    const [draftEndDate, setDraftEndDate] = useState(() => pathFilters.endDate || '');
    const [draftVisibleColumnIds, setDraftVisibleColumnIds] = useState(() => {
        if (!pathFilters.cols) return defaultVisibleColumnIds;
        const cols = pathFilters.cols.split(',').map((s) => s.trim()).filter(Boolean);
        return normalizeVisibleColumnIds(cols, defaultVisibleColumnIds);
    });
    const [columnSearchQuery, setColumnSearchQuery] = useState('');
    const prevFiltersRef = useRef({
        filterType: pathFilters.type || '',
        startDate: pathFilters.startDate || '',
        endDate: pathFilters.endDate || '',
        tab: pathFilters.tab,
        search: pathFilters.keyword || '',
    });

    const getErrorMessage = (error) => {
        const data = error?.response?.data;
        if (typeof data === 'string' && data.trim()) return data;
        return data?.message || data?.error || error?.message || 'Something went wrong';
    };

    const fetchData = (currentPage, currentRows) => {
        setLoading(true); // Set loading state before fetching
        const fetchId = ++fetchIdRef.current;
        const params = new URLSearchParams({
            orderBy: 'createdAt',
            order: 'desc',
            page: currentPage,
            paginate: true,
            limit: currentRows,
        });
        if (filterType) params.set('type', filterType);
        if (search) params.set('keyword', search);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (pathFilters.tab === 'paid') params.set('status', 'paid');
        else if (pathFilters.tab === 'unpaid') params.set('status', 'un-paid');
        else if (pathFilters.tab === 'partial') params.set('status', 'partial');
        else if (pathFilters.tab === 'placement') params.set('isPlacementInvoice', 'true');

        getRequestWithOutBody(
            `${baseURl}invoice?${params.toString()}`, accessToken
        )
            .then(result => {
                if (fetchId !== fetchIdRef.current) return; // Ignore stale responses
                const data = result?.data || {};
                setInvoiceList(data.results || []);
                setTotalCount(data.totalRecords ?? data.total ?? data.count ?? data.totalCount ?? 0);
                setInvoiceStats({
                    totalInvoice: data.totalInvoice,
                    totalInvoiceAmount: data.totalInvoiceAmount,
                    totalPaid: data.totalPaid,
                    totalPaidAmount: data.totalPaidAmount,
                    totalUnpaid: data.totalUnpaid,
                    totalUnpaidAmount: data.totalUnpaidAmount,
                    totalPartialPaid: data.totalPartialPaid,
                    totalPartialPaidAmount: data.totalPartialPaidAmount,
                    totalPlacementInvoice: data.totalPlacementInvoice,
                    totalPlacementInvoiceAmount: data.totalPlacementInvoiceAmount,
                });
                setLoading(false);
                setHasFetched(true);
            })
            .catch(error => {
                if (fetchId !== fetchIdRef.current) return; // Ignore stale responses
                toast.error(getErrorMessage(error));
                setLoading(false)
                setHasFetched(true)
            })
    }

    useEffect(() => {
        const prev = prevFiltersRef.current;
        const filtersChanged =
            prev.filterType !== filterType ||
            prev.startDate !== startDate ||
            prev.endDate !== endDate ||
            prev.tab !== pathFilters.tab ||
            prev.search !== search;

        prevFiltersRef.current = { filterType, startDate, endDate, tab: pathFilters.tab, search };

        if (filtersChanged) {
            setPage(1);
            fetchData(1, rowsPerPage);
        } else {
            fetchData(page, rowsPerPage);
        }
    }, [filterType, startDate, endDate, pathFilters.tab, page, rowsPerPage, search]);

    const handleStatusChange = (invoiceId, newStatus) => {
        // Update the status of the specific invoice in the state
        setInvoiceList((prevInvoiceList) =>
            prevInvoiceList.map((invoice) =>
                invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
            )
        );

    };

    const filteredInvoiceList = invoiceList;
    const handleButtonClick = () => {
        navigate('/home/createInvoice');
    };

    const handleAllInvoice = () => {
        const nextPath = buildPath('');
        if (nextPath !== location.pathname) navigate(nextPath, { replace: true });
    };

    const handlePaidInvoice = () => {
        const nextPath = buildPath('paid');
        if (nextPath !== location.pathname) navigate(nextPath, { replace: true });
    };

    const handleUnpaidInvoice = () => {
        const nextPath = buildPath('unpaid');
        if (nextPath !== location.pathname) navigate(nextPath, { replace: true });
    };

    const handlePartialInvoice = () => {
        const nextPath = buildPath('partial');
        if (nextPath !== location.pathname) navigate(nextPath, { replace: true });
    };

    const handlePlacementInvoice = () => {
        const nextPath = buildPath('placement');
        if (nextPath !== location.pathname) navigate(nextPath, { replace: true });
    };

    const navigateToTab = (tabId) => {
        if (tabId === 'paid') handlePaidInvoice();
        else if (tabId === 'unpaid') handleUnpaidInvoice();
        else if (tabId === 'partial') handlePartialInvoice();
        else if (tabId === 'placement') handlePlacementInvoice();
        else handleAllInvoice();
    };

    const handleApplyFilters = () => {
        const nextSearch = String(searchDraft || '').trim();
        setSearch(nextSearch);
        setFilterType(draftFilterType);
        setStartDate(draftStartDate);
        setEndDate(draftEndDate);
        setVisibleColumnIds(draftVisibleColumnIds);
    };

    const handleClearFilters = () => {
        setFilterType('');
        setStartDate('');
        setEndDate('');
        setSearch('');
        setSearchDraft('');
        setDraftFilterType('');
        setDraftStartDate('');
        setDraftEndDate('');
        setDraftVisibleColumnIds(defaultVisibleColumnIds);
        setVisibleColumnIds(defaultVisibleColumnIds);
    };

    const handleSelectionChange = (selectedIds) => {
        setSelectedInvoiceIds(selectedIds);
    };

    const allColumns = useMemo(
        () => [
            { id: 'invoiceNo', label: 'INVOICE NUMBER', align: 'center' },
            { id: 'agentName', label: 'AGENT', align: 'center' },
            { id: 'merchantName', label: 'MERCHANT', align: 'center' },
            { id: 'createdAt', label: 'CREATE DATE', align: 'center' },
            { id: 'issueDate', label: 'ISSUE DATE', align: 'center' },
            { id: 'dueDate', label: 'DUE DATE', align: 'center' },
            { id: 'status', label: 'STATUS', align: 'center' },
            { id: 'isPlacementInvoice', label: 'PLACEMENT', align: 'center' },
            { id: 'totalAmount', label: 'TOTAL AMOUNT', align: 'center' },
            { id: 'subTotal', label: 'SUB TOTAL', align: 'center' },
            { id: 'tax', label: 'TAX', align: 'center' },
            { id: 'discount', label: 'DISCOUNT', align: 'center' },
            { id: 'deliveryFee', label: 'DELIVERY FEE', align: 'center' },
            { id: 'paidAmount', label: 'PAID AMOUNT', align: 'center' },
            { id: 'balanceDue', label: 'BALANCE DUE', align: 'center' },
            { id: 'paymentTerms', label: 'PAYMENT TERMS', align: 'center' },
            { id: 'notes', label: 'NOTES', align: 'center' },
        ],
        []
    );

    const filteredColumns = useMemo(() => {
        if (!columnSearchQuery.trim()) return allColumns;
        const query = columnSearchQuery.trim().toLowerCase();
        return allColumns.filter((col) => 
            col.label.toLowerCase().includes(query) || 
            col.id.toLowerCase().includes(query)
        );
    }, [allColumns, columnSearchQuery]);

    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        if (!pathFilters.cols) return defaultVisibleColumnIds;

        const cols = pathFilters.cols
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        return normalizeVisibleColumnIds(cols, defaultVisibleColumnIds);
    });

    const buildPath = (tabOverride) => {
        const segments = [];
        const tabValue = tabOverride !== undefined ? tabOverride : pathFilters.tab;
        if (tabValue === 'paid') segments.push('tab', 'paid');
        else if (tabValue === 'unpaid') segments.push('tab', 'unpaid');
        else if (tabValue === 'partial') segments.push('tab', 'partial');
        else if (tabValue === 'placement') segments.push('tab', 'placement');
        if (filterType) segments.push('type', filterType);
        if (search) segments.push('keyword', encodeURIComponent(search));
        if (startDate) segments.push('startDate', startDate);
        if (endDate) segments.push('endDate', endDate);
        if (page > 1) segments.push('page', String(page));
        if (rowsPerPage !== 25) segments.push('rows', String(rowsPerPage));
        
        const defaultColsKey = defaultVisibleColumnIds.join(',');
        const currentColsKey = Array.isArray(visibleColumnIds) ? visibleColumnIds.join(',') : '';
        if (currentColsKey && currentColsKey !== defaultColsKey) {
            segments.push('cols', currentColsKey);
        }
        
        return segments.length > 0 ? `/home/invoices/${segments.join('/')}` : '/home/invoices';
    };

    useEffect(() => {
        const newPath = buildPath();
        if (newPath !== location.pathname) {
            navigate(newPath, { replace: true });
        }
    }, [pathFilters.tab, filterType, startDate, endDate, page, rowsPerPage, visibleColumnIds, navigate, location.pathname, defaultVisibleColumnIds, search]);

    // Sync state only when URL path filters change (back/forward/direct URL)
    useEffect(() => {
        const newType = pathFilters.type;
        const newKeyword = pathFilters.keyword || '';
        const newStartDate = pathFilters.startDate;
        const newEndDate = pathFilters.endDate;
        const nextCols = (pathFilters.cols || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        const nextVisible = normalizeVisibleColumnIds(nextCols, defaultVisibleColumnIds);
        
        if (newType !== filterType) {
            setFilterType(newType);
        }
        if (newType !== draftFilterType) {
            setDraftFilterType(newType);
        }
        if (newKeyword !== search) {
            setSearch(newKeyword);
        }
        if (newKeyword !== searchDraft) {
            setSearchDraft(newKeyword);
        }
        if (newStartDate !== startDate) {
            setStartDate(newStartDate || '');
        }
        if (newStartDate !== draftStartDate) {
            setDraftStartDate(newStartDate || '');
        }
        if (newEndDate !== endDate) {
            setEndDate(newEndDate || '');
        }
        if (newEndDate !== draftEndDate) {
            setDraftEndDate(newEndDate || '');
        }
        const nextPage = Math.max(1, Number(pathFilters.page) || 1);
        const nextRows = [5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25;
        if (nextPage !== page) {
            setPage(nextPage);
        }
        if (nextRows !== rowsPerPage) {
            setRowsPerPage(nextRows);
        }
        if (JSON.stringify(nextVisible) !== JSON.stringify(visibleColumnIds)) {
            setVisibleColumnIds(nextVisible);
        }
        if (JSON.stringify(nextVisible) !== JSON.stringify(draftVisibleColumnIds)) {
            setDraftVisibleColumnIds(nextVisible);
        }
    }, [pathFilters, defaultVisibleColumnIds]);

    const statCards = useMemo(() => {
        const s = invoiceStats || {};
        return [
            {
                id: '',
                title: 'Total Invoices',
                icon: 'total',
                count: pickStat(s, ['totalInvoice']),
                amount: formatMoney(pickStat(s, ['totalInvoiceAmount'])),
            },
            {
                id: 'paid',
                title: 'Paid Invoices',
                icon: 'paid',
                count: pickStat(s, ['totalPaid']),
                amount: formatMoney(pickStat(s, ['totalPaidAmount'])),
            },
            {
                id: 'unpaid',
                title: 'Un-Paid Invoices',
                icon: 'unpaid',
                count: pickStat(s, ['totalUnpaid']),
                amount: formatMoney(pickStat(s, ['totalUnpaidAmount'])),
            },
            {
                id: 'partial',
                title: 'Partial Paid Invoices',
                icon: 'partial',
                count: pickStat(s, ['totalPartialPaid']),
                amount: formatMoney(pickStat(s, ['totalPartialPaidAmount'])),
            },
            {
                id: 'placement',
                title: 'Placement Invoices',
                icon: 'placement',
                count: pickStat(s, ['totalPlacementInvoice']),
                amount: formatMoney(pickStat(s, ['totalPlacementInvoiceAmount'])),
            },
        ];
    }, [invoiceStats]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (filterType) {
            const typeLabel = TYPE_OPTIONS.find((o) => o.value === filterType)?.label || filterType;
            chips.push({ key: 'type', label: `Type: ${typeLabel}` });
        }
        const defaultColsKey = defaultVisibleColumnIds.join(',');
        const currentColsKey = visibleColumnIds.join(',');
        if (currentColsKey && currentColsKey !== defaultColsKey) {
            const colLabels = visibleColumnIds
                .map((id) => allColumns.find((c) => c.id === id)?.label || id)
                .filter(Boolean)
                .join(', ');
            chips.push({ key: 'cols', label: `Column: ${colLabels}` });
        }
        if (startDate) chips.push({ key: 'startDate', label: `From: ${dayjs(startDate).format('M/D/YYYY')}` });
        if (endDate) chips.push({ key: 'endDate', label: `To: ${dayjs(endDate).format('M/D/YYYY')}` });
        if (search) chips.push({ key: 'search', label: `Search: ${search}` });
        return chips;
    }, [filterType, visibleColumnIds, startDate, endDate, search, defaultVisibleColumnIds, allColumns]);

    const removeFilterChip = (key) => {
        if (key === 'type') {
            setFilterType('');
            setDraftFilterType('');
        } else if (key === 'cols') {
            setVisibleColumnIds(defaultVisibleColumnIds);
            setDraftVisibleColumnIds(defaultVisibleColumnIds);
        } else if (key === 'startDate') {
            setStartDate('');
            setDraftStartDate('');
        } else if (key === 'endDate') {
            setEndDate('');
            setDraftEndDate('');
        } else if (key === 'search') {
            setSearch('');
            setSearchDraft('');
        }
    };

    const datePickerSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'var(--dashboard-tab-box)',
            height: 40,
        },
    };


    const columns = useMemo(
        () => allColumns.filter((c) => visibleColumnIds.includes(c.id)),
        [allColumns, visibleColumnIds]
    );

    const tableData = useMemo(
        () => (filteredInvoiceList || []).map((inv) => ({
            ...inv,
            id: inv?.id,
            invoiceNo: inv?.invoiceNo || inv?.id,
            agentName: inv?.agentName || inv?.agent?.name || inv?.agent?.username || '-',
            merchantName: inv?.merchantName || inv?.merchant?.dbaName || inv?.merchant?.legalBusinessName || '-',
            createdAt: inv?.createdAt && dayjs(inv.createdAt).isValid() ? dayjs(inv.createdAt).format('M/D/YYYY, hh:mm A') : (inv?.createdAt || '-'),
            notes: inv?.notes || '-',
            isPlacementInvoiceRaw: inv?.isPlacementInvoice,
            isPlacementInvoice: formatPlacementInvoice(inv?.isPlacementInvoice),
            totalAmount: Number(inv?.totalAmount || 0),
            subTotal: Number(inv?.subTotal || 0),
            tax: Number(inv?.tax || 0),
            discount: Number(inv?.discount || 0),
            deliveryFee: Number(inv?.deliveryFee || 0),
            paidAmount: Number(inv?.paidAmount || 0),
            balanceDue: Number(inv?.balanceDue || 0),
            paymentTerms: inv?.paymentTerms || '-',
        })),
        [filteredInvoiceList]
    );

    const handleExportExcel = async () => {
        try {
            const safeColumns = Array.isArray(columns) ? columns : [];
            const safeRows = Array.isArray(tableData) ? tableData : [];

            const formatExcelValue = (colId, value) => {
                if (value == null) return '';

                const raw = typeof value === 'string' ? value.trim() : value;
                const looksLikeDateColumn = String(colId || '').toLowerCase().includes('date') || String(colId || '').toLowerCase().includes('at');
                const parsed = dayjs(raw);

                if (looksLikeDateColumn && parsed.isValid()) {
                    return parsed.format('M/D/YYYY');
                }

                if (typeof raw === 'string' && /\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}/i.test(raw)) {
                    const isoParsed = dayjs(raw);
                    return isoParsed.isValid() ? isoParsed.format('M/D/YYYY') : raw;
                }

                return raw;
            };

            if (safeColumns.length === 0) {
                toast.error('Please select column');
                return;
            }

            const exportRows = safeRows.map((row) => {
                const obj = {};
                safeColumns.forEach((col) => {
                    obj[col.label] = formatExcelValue(col.id, row?.[col.id]);
                });
                return obj;
            });

            const tabName = pathFilters.tab || 'all';
            const fileName = `invoices_${tabName}_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            await exportRowsToExcel(exportRows, 'Invoices', fileName);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDeleteLead = async () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const idsToDelete = [...selectedInvoiceIds];
        setSelectedInvoiceIds([]);
        setShowDeleteModal(false);
        setLoading(true);
        try {
            for (const id of idsToDelete) {
                await deleteRequest(`${baseURl}invoice/${id}`, accessToken);
                toast.success(`Invoice ${id} deleted successfully.`);
            }
            fetchData(page, rowsPerPage);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
            <PageHeader
                title="Invoice Management"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Create Invoice"
                        onClick={handleButtonClick}
                    />
                )}
            />

            <div className="flex gap-3 flex-wrap mt-4">
                {statCards.map((card) => (
                    <InvoiceStatCard
                        key={card.id || 'all'}
                        title={card.title}
                        count={loading && !invoiceStats ? '—' : card.count}
                        amount={loading && !invoiceStats ? '—' : card.amount}
                        icon={card.icon}
                        active={pathFilters.tab === card.id}
                        onClick={() => navigateToTab(card.id)}
                    />
                ))}
            </div>

            <div
                className="flex gap-6 flex-wrap mt-5"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {INVOICE_TABS.map((tab) => {
                    const isActive = pathFilters.tab === tab.id;
                    return (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => navigateToTab(tab.id)}
                            className="pb-3 px-1"
                            style={{
                                fontSize: 14,
                                fontWeight: isActive ? 700 : 600,
                                color: isActive ? '#0C79F7' : '#64748B',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? '3px solid #0C79F7' : '3px solid transparent',
                                marginBottom: -1,
                                cursor: 'pointer',
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div
                className="mt-4"
                style={{
                    background: 'var(--dashboard-card-bg)',
                    border: '1px solid var(--dashboard-box-border)',
                    borderRadius: 12,
                    padding: 16,
                }}
            >
                <ListSearchField
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onEnter={handleApplyFilters}
                    placeholder="Search by Invoice no...."
                />

                <div className="flex justify-between items-end gap-3 flex-wrap">
                    <div className="flex justify-start items-end gap-3 flex-wrap flex-1">
                        <FilterDropdown
                            label="Type"
                            value={draftFilterType}
                            onChange={setDraftFilterType}
                            options={TYPE_OPTIONS}
                            placeholder="Type"
                            minWidth={160}
                            placeholderValues={['']}
                        />

                        <div style={{ minWidth: 180 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>
                                Column
                            </label>
                            <FormControl size="small" fullWidth>
                                <Select
                                    multiple
                                    displayEmpty
                                    value={draftVisibleColumnIds}
                                    onChange={(e) => {
                                        const next = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                        setDraftVisibleColumnIds(next);
                                    }}
                                    onClose={() => {
                                        setColumnSearchQuery('');
                                    }}
                                    input={<OutlinedInput />}
                                    renderValue={() => 'Column'}
                                    MenuProps={{ 
                                        PaperProps: { sx: { maxHeight: 360 } },
                                        autoFocus: false,
                                        MenuListProps: {
                                            autoFocusItem: false,
                                        },
                                    }}
                                    sx={{
                                        height: 40,
                                        borderRadius: 2,
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                    }}
                                >
                                    <ListSubheader
                                        sx={{ backgroundColor: 'var(--dashboard-tab-box)' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <TextField
                                            size="small"
                                            placeholder="Search columns..."
                                            fullWidth
                                            value={columnSearchQuery}
                                            onChange={(e) => setColumnSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        />
                                    </ListSubheader>
                                    {filteredColumns.map((col) => (
                                        <MenuItem key={col.id} value={col.id}>
                                            <Checkbox checked={draftVisibleColumnIds.indexOf(col.id) > -1} />
                                            <ListItemText primary={col.label} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>

                        <div style={{ minWidth: 150 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>from</label>
                            <div className="mt-1">
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        format="MM/DD/YYYY"
                                        value={draftStartDate ? dayjs(draftStartDate) : null}
                                        onChange={(value) => setDraftStartDate(value ? dayjs(value).format('YYYY-MM-DD') : '')}
                                        slotProps={{ textField: { fullWidth: true, size: 'small', placeholder: 'from', sx: datePickerSx } }}
                                    />
                                </LocalizationProvider>
                            </div>
                        </div>

                        <div style={{ minWidth: 150 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--dashboard-text-primary)' }}>to</label>
                            <div className="mt-1">
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        format="MM/DD/YYYY"
                                        value={draftEndDate ? dayjs(draftEndDate) : null}
                                        onChange={(value) => setDraftEndDate(value ? dayjs(value).format('YYYY-MM-DD') : '')}
                                        slotProps={{ textField: { fullWidth: true, size: 'small', placeholder: 'to', sx: datePickerSx } }}
                                    />
                                </LocalizationProvider>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 items-center flex-wrap">
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            style={{
                                height: 40,
                                padding: '0 18px',
                                borderRadius: 8,
                                border: '1px solid var(--dashboard-box-border)',
                                background: 'var(--dashboard-card-bg2)',
                                color: 'var(--dashboard-text-primary)',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                            }}
                        >
                            Clear Filters
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyFilters}
                            style={{
                                height: 40,
                                padding: '0 18px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#24282E',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                            }}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>

                {activeFilterChips.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3 items-center">
                        {activeFilterChips.map((chip) => (
                            <FilterChip
                                key={chip.key}
                                label={chip.label}
                                onRemove={() => removeFilterChip(chip.key)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 mt-3 flex-wrap">
                {selectedInvoiceIds.length > 0 && (
                    <AppButton
                        variant="danger"
                        title="Delete"
                        onClick={handleDeleteLead}
                    />
                )}
                <AppButton
                    title="Export Excel"
                    onClick={handleExportExcel}
                />
            </div>

            {loading ? (
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : (
                <div className="mt-4">
                    {columns.length === 0 ? (
                        <div
                            style={{
                                borderRadius: 12,
                                background: 'var(--dashboard-card-bg)',
                                border: '1px solid var(--dashboard-box-border)',
                                padding: 24,
                                textAlign: 'center',
                                color: '#6B7280',
                                fontWeight: 600,
                            }}
                        >
                            Please select column
                        </div>
                    ) : (tableData?.length || 0) === 0 ? (
                        <NoDataFound title="No Data Found" description="No invoices found." />
                    ) : (
                        <MemoTable
                            columns={columns}
                            data={tableData}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onRowsPerPageChange={(next) => {
                                setRowsPerPage(next);
                                setPage(1);
                            }}
                            invoiceTable={true}
                            showCheckbox={true}
                            selectedRowIds={selectedInvoiceIds}
                            onSelectionChange={handleSelectionChange}
                            onStatusChange={handleStatusChange}
                        />
                    )}
                </div>
            )}
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Invoices"
                subtitle="Are you sure you want to delete the selected"
                entityName={`${selectedInvoiceIds.length} invoice${selectedInvoiceIds.length > 1 ? 's' : ''}`}
                warningMessage="This action cannot be undone. The selected invoices will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={loading}
            />
        </div>
    );
};

export default Invoices;