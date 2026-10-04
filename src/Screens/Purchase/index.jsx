import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import ListSearchField from "../../Components/ListSearchField";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteRequest, getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import addIcon from "../../assets/addIcon.png";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { toast } from "react-toastify";
import { Checkbox, FormControl, ListSubheader, ListItemText, MenuItem, OutlinedInput, Select, TextField } from "@mui/material";
import FilterDropdown from "../../Components/FilterDropdown";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { exportRowsToExcel } from "../../Utils/excelExport";
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
    formatPoSerialDisplay,
    getDerpsEntryDate,
    sortPurchaseOrdersBySerialDesc,
} from '../../Utils/purchaseOrderHelpers';
import { formatUsDate, formatUsDateTime } from '../../Utils/dateFormat';

const formatMoney = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '$0.00';
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PURCHASE_TABS = [
    { id: '', label: 'All Purchase Orders' },
    { id: 'received', label: 'Received' },
    { id: 'not-received', label: 'Not Received' },
    { id: 'partial', label: 'Partial Paid' },
];

const DATE_FILTER_OPTIONS = [
    { label: 'None', value: '' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'This Quarter', value: 'this_quarter' },
    { label: 'This Year', value: 'this_year' },
    { label: 'Last Week', value: 'last_week' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Last Quarter', value: 'last_quarter' },
    { label: 'Last Year', value: 'last_year' },
    { label: 'Month to Date', value: 'month_to_date' },
    { label: 'Quarter to Date', value: 'quarter_to_date' },
    { label: 'Year to Date', value: 'year_to_date' },
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
    received: { bg: 'rgba(74, 196, 17, 0.15)', color: '#4AC411' },
    notReceived: { bg: 'rgba(239, 56, 38, 0.12)', color: '#EF3826' },
    partial: { bg: 'rgba(254, 105, 1, 0.15)', color: '#FE6901' },
};

const PurchaseStatCard = ({ title, count, amount, icon, active, onClick }) => {
    const iconStyles = ICON_STYLES[icon] || ICON_STYLES.total;

    const IconComponent = {
        total: DescriptionOutlinedIcon,
        received: CheckCircleOutlineIcon,
        notReceived: HighlightOffOutlinedIcon,
        partial: AccessTimeOutlinedIcon,
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

const Purchase = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const fetchIdRef = useRef(0);

    usePageTitle("Purchase", location);

    const pathFilters = useMemo(() => {
        const pathSegments = location.pathname.replace('/home/purchase', '').split('/').filter(Boolean);
        const result = {
            tab: '',
            keyword: '',
            startDate: '',
            endDate: '',
            dateFilter: '',
            orderBy: '',
            order: '',
            cols: '',
            page: '1',
            rows: '25',
        };

        for (let i = 0; i < pathSegments.length; i += 1) {
            const key = pathSegments[i];
            const value = pathSegments[i + 1];
            if (!key || !value) continue;

            if (key === 'tab') result.tab = value;
            if (key === 'keyword') result.keyword = decodeURIComponent(value);
            if (key === 'startDate') result.startDate = value;
            if (key === 'endDate') result.endDate = value;
            if (key === 'dateFilter') result.dateFilter = value;
            if (key === 'orderBy') result.orderBy = value;
            if (key === 'order') result.order = value;
            if (key === 'cols') result.cols = value;
            if (key === 'page') result.page = value;
            if (key === 'rows') result.rows = value;
        }

        return result;
    }, [location.pathname]);

    const defaultVisibleColumnIds = useMemo(
        () => ['poSerialNo', 'derpsEntryDate', 'poNo', 'deviceName', 'vendorName', 'qtyDisplay', 'unitCost', 'createdByName', 'status'],
        []
    );

    const [purchaseList, setPurchaseList] = useState([]);
    const [purchaseStats, setPurchaseStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [selectedPurchaseIds, setSelectedPurchaseIds] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [search, setSearch] = useState(() => pathFilters.keyword || '');
    const [searchDraft, setSearchDraft] = useState(() => pathFilters.keyword || '');
    const [dateFilter, setDateFilter] = useState(() => pathFilters.dateFilter || '');
    const [orderBy, setOrderBy] = useState(() => pathFilters.orderBy || 'poSerialNo');
    const [order, setOrder] = useState(() => pathFilters.order || 'desc');
    const [startDate, setStartDate] = useState(() => pathFilters.startDate || '');
    const [endDate, setEndDate] = useState(() => pathFilters.endDate || '');
    const [page, setPage] = useState(() => Math.max(1, Number(pathFilters.page) || 1));
    const [rowsPerPage, setRowsPerPage] = useState(() => ([5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25));
    const [draftDateFilter, setDraftDateFilter] = useState(() => pathFilters.dateFilter || '');
    const [draftOrderBy, setDraftOrderBy] = useState(() => pathFilters.orderBy || 'poSerialNo');
    const [draftOrder, setDraftOrder] = useState(() => pathFilters.order || 'desc');
    const [draftStartDate, setDraftStartDate] = useState(() => pathFilters.startDate || '');
    const [draftEndDate, setDraftEndDate] = useState(() => pathFilters.endDate || '');
    const [draftVisibleColumnIds, setDraftVisibleColumnIds] = useState(() => {
        if (!pathFilters.cols) return defaultVisibleColumnIds;
        const cols = pathFilters.cols.split(',').map((s) => s.trim()).filter(Boolean);
        return cols.length > 0 ? cols : defaultVisibleColumnIds;
    });
    const [columnSearchQuery, setColumnSearchQuery] = useState('');
    const prevFiltersRef = useRef({
        dateFilter: pathFilters.dateFilter || '',
        orderBy: pathFilters.orderBy || '',
        order: pathFilters.order || '',
        startDate: pathFilters.startDate || '',
        endDate: pathFilters.endDate || '',
        tab: pathFilters.tab,
        search: pathFilters.keyword || '',
    });

    const [visibleColumnIds, setVisibleColumnIds] = useState(() => {
        if (!pathFilters.cols) return defaultVisibleColumnIds;
        const cols = pathFilters.cols.split(',').map((value) => value.trim()).filter(Boolean);
        return cols.length > 0 ? cols : defaultVisibleColumnIds;
    });

    const getErrorMessage = (error) => {
        const data = error?.response?.data;
        if (typeof data === 'string' && data.trim()) return data;
        return data?.message || data?.error || error?.message || 'Something went wrong';
    };

    const formatDateTime = (value) => formatUsDateTime(value, { empty: '' });

    const formatDate = (value) => formatUsDate(value, { empty: '' });

    const handleDraftDateFilterChange = (value) => {
        setDraftDateFilter(value);
        if (value) {
            setDraftStartDate('');
            setDraftEndDate('');
        }
    };

    const fetchData = (currentPage, currentRows) => {
        setLoading(true);
        const fetchId = ++fetchIdRef.current;
        const params = new URLSearchParams({});

        if (search) params.set('keyword', search);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (dateFilter) params.set('dateFilter', dateFilter);
        if (orderBy) params.set('orderBy', orderBy);
        if (order) params.set('order', order);

        if (pathFilters.tab === 'received') params.set('status', 'received');
        else if (pathFilters.tab === 'not-received') params.set('status', 'not-received');
        else if (pathFilters.tab === 'partial') params.set('status', 'partial');

        params.set('paginate', 'true');
        params.set('page', String(currentPage));
        params.set('limit', String(currentRows));

        getRequestWithOutBody(
            `${baseURl}purchase-order?${params.toString()}`,
            accessToken
        )
            .then((result) => {
                if (fetchId !== fetchIdRef.current) return;

                const apiData = result?.data;
                const rows = Array.isArray(apiData) ? apiData : (apiData?.results || apiData?.data || []);
                const count = result?.totalRecords ?? apiData?.totalRecords ?? 0;

                const normalizedRows = Array.isArray(rows) ? rows : [];
                const shouldClientSort = !orderBy || orderBy === 'poSerialNo';
                setPurchaseList(
                    shouldClientSort && order === 'desc'
                        ? sortPurchaseOrdersBySerialDesc(normalizedRows)
                        : normalizedRows
                );
                setTotalCount(Number(count) || 0);
                setPurchaseStats({
                    totalOrders: result?.totalOrders ?? apiData?.totalOrders,
                    totalOrderAmount: result?.totalOrderAmount ?? apiData?.totalOrderAmount,
                    totalReceived: result?.totalReceived ?? apiData?.totalReceived,
                    totalReceivedAmount: result?.totalReceivedAmount ?? apiData?.totalReceivedAmount,
                    totalNotReceived: result?.totalNotReceived ?? apiData?.totalNotReceived,
                    totalNotReceivedAmount: result?.totalNotReceivedAmount ?? apiData?.totalNotReceivedAmount,
                    totalPartialPaid: result?.totalPartialPaid ?? apiData?.totalPartialPaid,
                    totalPartialPaidAmount: result?.totalPartialPaidAmount ?? apiData?.totalPartialPaidAmount,
                });
                setLoading(false);
                setHasFetched(true);
            })
            .catch((error) => {
                if (fetchId !== fetchIdRef.current) return;
                toast.error(getErrorMessage(error));
                setLoading(false);
                setHasFetched(true);
            });
    };

    useEffect(() => {
        const prev = prevFiltersRef.current;
        const filtersChanged =
            prev.dateFilter !== dateFilter ||
            prev.orderBy !== orderBy ||
            prev.order !== order ||
            prev.startDate !== startDate ||
            prev.endDate !== endDate ||
            prev.tab !== pathFilters.tab ||
            prev.search !== search;

        prevFiltersRef.current = {
            dateFilter,
            orderBy,
            order,
            startDate,
            endDate,
            tab: pathFilters.tab,
            search,
        };

        if (filtersChanged) {
            setPage(1);
            fetchData(1, rowsPerPage);
        } else {
            fetchData(page, rowsPerPage);
        }
    }, [dateFilter, orderBy, order, startDate, endDate, pathFilters.tab, page, rowsPerPage, search]);

    const allColumns = useMemo(
        () => [
            { id: 'poSerialNo', label: 'DERPS #', align: 'center' },
            { id: 'derpsEntryDate', label: 'ENTERED INTO DERPS', align: 'center' },
            { id: 'poNo', label: 'P.O. NO.', align: 'center' },
            { id: 'deviceName', label: 'DEVICE', align: 'center' },
            { id: 'vendorName', label: 'VENDOR', align: 'center' },
            { id: 'qtyDisplay', label: 'QTY', align: 'center' },
            { id: 'unitCost', label: 'UNIT COST', align: 'center' },
            { id: 'createdByName', label: 'CREATED BY', align: 'center' },
            { id: 'postedByName', label: 'POSTED BY', align: 'center' },
            { id: 'postedAt', label: 'POSTED AT', align: 'center' },
            { id: 'createdAt', label: 'CREATED AT', align: 'center' },
            { id: 'poDate', label: 'PO DATE', align: 'center' },
            { id: 'status', label: 'STATUS', align: 'center' },
            { id: 'totalAmount', label: 'TOTAL AMOUNT', align: 'center' },
            { id: 'subTotal', label: 'SUB TOTAL', align: 'center' },
            { id: 'tax', label: 'TAX', align: 'center' },
            { id: 'discount', label: 'DISCOUNT', align: 'center' },
            { id: 'deliveryFee', label: 'DELIVERY FEE', align: 'center' },
            { id: 'balanceDue', label: 'BALANCE DUE', align: 'center' },
            { id: 'paidAmount', label: 'PAID AMOUNT', align: 'center' },
            { id: 'paymentTerms', label: 'PAYMENT TERMS', align: 'center' },
            { id: 'dueDate', label: 'DUE DATE', align: 'center' },
            { id: 'notes', label: 'NOTES', align: 'center' },
            { id: 'billNumber', label: 'BILL NUMBER', align: 'center' },
            { id: 'updatedAt', label: 'UPDATED AT', align: 'center' },
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

    const buildPath = (tabOverride) => {
        const segments = [];
        const tabValue = tabOverride !== undefined ? tabOverride : pathFilters.tab;
        if (tabValue === 'received') segments.push('tab', 'received');
        else if (tabValue === 'not-received') segments.push('tab', 'not-received');
        else if (tabValue === 'partial') segments.push('tab', 'partial');
        if (search) segments.push('keyword', encodeURIComponent(search));
        if (dateFilter) segments.push('dateFilter', dateFilter);
        if (orderBy) segments.push('orderBy', orderBy);
        if (order) segments.push('order', order);
        if (startDate) segments.push('startDate', startDate);
        if (endDate) segments.push('endDate', endDate);
        if (page > 1) segments.push('page', String(page));
        if (rowsPerPage !== 25) segments.push('rows', String(rowsPerPage));

        const defaultColsKey = defaultVisibleColumnIds.join(',');
        const currentColsKey = Array.isArray(visibleColumnIds) ? visibleColumnIds.join(',') : '';
        if (currentColsKey && currentColsKey !== defaultColsKey) {
            segments.push('cols', currentColsKey);
        }

        return segments.length > 0 ? `/home/purchase/${segments.join('/')}` : '/home/purchase';
    };

    useEffect(() => {
        const nextPath = buildPath();
        if (nextPath !== location.pathname) {
            navigate(nextPath, { replace: true });
        }
    }, [pathFilters.tab, search, dateFilter, orderBy, order, startDate, endDate, page, rowsPerPage, visibleColumnIds, navigate, location.pathname, defaultVisibleColumnIds]);

    useEffect(() => {
        const newKeyword = pathFilters.keyword || '';
        const newDateFilter = pathFilters.dateFilter || '';
        const newOrderBy = pathFilters.orderBy || 'poSerialNo';
        const newOrder = pathFilters.order || 'desc';
        const newStartDate = pathFilters.startDate || '';
        const newEndDate = pathFilters.endDate || '';
        const nextCols = (pathFilters.cols || '').split(',').map((value) => value.trim()).filter(Boolean);
        const nextVisible = nextCols.length > 0 ? nextCols : defaultVisibleColumnIds;
        const nextPage = Math.max(1, Number(pathFilters.page) || 1);
        const nextRows = [5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25;

        if (newKeyword !== search) setSearch(newKeyword);
        if (newKeyword !== searchDraft) setSearchDraft(newKeyword);
        if (newDateFilter !== dateFilter) setDateFilter(newDateFilter);
        if (newDateFilter !== draftDateFilter) setDraftDateFilter(newDateFilter);
        if (newOrderBy !== orderBy) setOrderBy(newOrderBy);
        if (newOrderBy !== draftOrderBy) setDraftOrderBy(newOrderBy);
        if (newOrder !== order) setOrder(newOrder);
        if (newOrder !== draftOrder) setDraftOrder(newOrder);
        if (newStartDate !== startDate) setStartDate(newStartDate);
        if (newStartDate !== draftStartDate) setDraftStartDate(newStartDate);
        if (newEndDate !== endDate) setEndDate(newEndDate);
        if (newEndDate !== draftEndDate) setDraftEndDate(newEndDate);
        if (nextPage !== page) setPage(nextPage);
        if (nextRows !== rowsPerPage) setRowsPerPage(nextRows);
        if (JSON.stringify(nextVisible) !== JSON.stringify(visibleColumnIds)) setVisibleColumnIds(nextVisible);
        if (JSON.stringify(nextVisible) !== JSON.stringify(draftVisibleColumnIds)) setDraftVisibleColumnIds(nextVisible);
    }, [pathFilters, defaultVisibleColumnIds]);

    useEffect(() => {
        if (!hasFetched || loading || totalCount === 0) return;
        const maxPage = Math.max(1, Math.ceil(totalCount / rowsPerPage));
        if (page > maxPage) setPage(maxPage);
    }, [hasFetched, loading, totalCount, page, rowsPerPage]);

    const statCards = useMemo(() => {
        const s = purchaseStats || {};
        return [
            {
                id: '',
                title: 'Total Purchase Orders',
                icon: 'total',
                count: pickStat(s, ['totalOrders']),
                amount: formatMoney(pickStat(s, ['totalOrderAmount'])),
            },
            {
                id: 'received',
                title: 'Received',
                icon: 'received',
                count: pickStat(s, ['totalReceived']),
                amount: formatMoney(pickStat(s, ['totalReceivedAmount'])),
            },
            {
                id: 'not-received',
                title: 'Not Received',
                icon: 'notReceived',
                count: pickStat(s, ['totalNotReceived']),
                amount: formatMoney(pickStat(s, ['totalNotReceivedAmount'])),
            },
            {
                id: 'partial',
                title: 'Partial Paid',
                icon: 'partial',
                count: pickStat(s, ['totalPartialPaid']),
                amount: formatMoney(pickStat(s, ['totalPartialPaidAmount'])),
            },
        ];
    }, [purchaseStats]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (dateFilter) {
            const label = DATE_FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label || dateFilter;
            chips.push({ key: 'dateFilter', label: `Date Filter: ${label}` });
        }
        if (orderBy) {
            const orderByLabel = ({
                poSerialNo: 'DERPS #',
                derpsEntryDate: 'Entered into DERPS',
                poDate: 'PO Date',
                createdAt: 'Created At',
            }[orderBy]) || orderBy;
            chips.push({ key: 'orderBy', label: `Order By: ${orderByLabel}` });
        }
        if (order) chips.push({ key: 'order', label: `Order: ${order.toUpperCase()}` });
        const defaultColsKey = defaultVisibleColumnIds.join(',');
        const currentColsKey = visibleColumnIds.join(',');
        if (currentColsKey && currentColsKey !== defaultColsKey) {
            const colLabels = visibleColumnIds
                .map((id) => allColumns.find((c) => c.id === id)?.label || id)
                .filter(Boolean)
                .join(', ');
            chips.push({ key: 'cols', label: `Column: ${colLabels}` });
        }
        if (startDate) chips.push({ key: 'startDate', label: `From: ${dayjs(startDate).format('MM/DD/YYYY')}` });
        if (endDate) chips.push({ key: 'endDate', label: `To: ${dayjs(endDate).format('MM/DD/YYYY')}` });
        if (search) chips.push({ key: 'search', label: `Search: ${search}` });
        return chips;
    }, [dateFilter, orderBy, order, visibleColumnIds, startDate, endDate, search, defaultVisibleColumnIds, allColumns]);

    const removeFilterChip = (key) => {
        if (key === 'dateFilter') {
            setDateFilter('');
            setDraftDateFilter('');
        } else if (key === 'orderBy') {
            setOrderBy('poSerialNo');
            setDraftOrderBy('poSerialNo');
        } else if (key === 'order') {
            setOrder('desc');
            setDraftOrder('desc');
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

    const columns = useMemo(
        () => allColumns.filter((c) => visibleColumnIds.includes(c.id)),
        [allColumns, visibleColumnIds]
    );

    const tableData = useMemo(
        () => sortPurchaseOrdersBySerialDesc(purchaseList || []).map((r) => {
            const items = Array.isArray(r?.order_items) ? r.order_items : [];
            const deviceNames = items
                .map((item) => item?.item_service?.name || item?.name || item?.brand || '')
                .filter((name) => String(name).trim().length > 0);
            const uniqueDevices = Array.from(new Set(deviceNames));
            const totalQty = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
            const receivedQty = items.reduce((sum, item) => sum + (Number(item?.receivedQty) || 0), 0);
            const firstUnitCost = items.length > 0 ? Number(items[0]?.unitPrice) : NaN;

            return {
                ...r,
                id: r.id,
                poSerialNo: formatPoSerialDisplay(r),
                derpsEntryDate: formatDate(getDerpsEntryDate(r)),
                vendorName: r?.vendor?.companyName || "",
                createdByName: r?.createdByName || r?.creator?.name || "",
                deviceName: uniqueDevices.length > 0
                    ? (uniqueDevices.length === 1 ? uniqueDevices[0] : `${uniqueDevices[0]} +${uniqueDevices.length - 1}`)
                    : "—",
                qtyDisplay: items.length > 0
                    ? `${Number.isFinite(receivedQty) ? receivedQty : 0}/${Number.isFinite(totalQty) ? totalQty : 0}`
                    : "—",
                unitCost: Number.isFinite(firstUnitCost) ? formatMoney(firstUnitCost) : "—",
                postedByName: r?.postedInfo?.postedByName || "—",
                postedAt: formatDateTime(r?.postedInfo?.postedDateTime),
                billNumber: r?.billNumber || "—",
                poDate: formatDate(r.poDate),
                dueDate: formatDate(r.dueDate),
                totalAmount: Number(r.totalAmount || 0),
                subTotal: formatMoney(r.subTotal),
                tax: formatMoney(r.tax),
                discount: formatMoney(r.discount),
                deliveryFee: formatMoney(r.deliveryFee),
                balanceDue: formatMoney(r.balanceDue),
                paidAmount: formatMoney(r.paidAmount),
                createdAt: formatDateTime(r.createdAt),
                updatedAt: formatDateTime(r.updatedAt),
            };
        }),
        [purchaseList]
    );

    const navigateToTab = (tabId) => {
        const nextPath = buildPath(tabId);
        if (nextPath !== location.pathname) navigate(nextPath, { replace: true });
    };

    const handleApplyFilters = () => {
        const nextSearch = String(searchDraft || '').trim();
        setSearch(nextSearch);
        setDateFilter(draftDateFilter);
        setOrderBy(draftOrderBy);
        setOrder(draftOrder);
        setStartDate(draftStartDate);
        setEndDate(draftEndDate);
        setVisibleColumnIds(draftVisibleColumnIds);
    };

    const handleClearFilters = () => {
        setSearch('');
        setSearchDraft('');
        setDateFilter('');
        setOrderBy('poSerialNo');
        setOrder('desc');
        setStartDate('');
        setEndDate('');
        setDraftDateFilter('');
        setDraftOrderBy('poSerialNo');
        setDraftOrder('desc');
        setDraftStartDate('');
        setDraftEndDate('');
        setDraftVisibleColumnIds(defaultVisibleColumnIds);
        setVisibleColumnIds(defaultVisibleColumnIds);
    };

    const handleExportExcel = async () => {
        try {
            const safeColumns = Array.isArray(columns) ? columns : [];
            const safeRows = Array.isArray(tableData) ? tableData : [];

            if (safeColumns.length === 0) {
                toast.error('Please select column');
                return;
            }

            const formatExcelValue = (colId, value) => {
                if (value == null) return '';

                const raw = typeof value === 'string' ? value.trim() : value;
                const key = String(colId || '').toLowerCase();
                const looksLikeDateColumn = key.includes('date') || key.includes('at');
                const parsed = dayjs(raw);

                if (looksLikeDateColumn && parsed.isValid()) {
                    return parsed.format('MM/DD/YYYY');
                }

                if (typeof raw === 'string' && /\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}/i.test(raw)) {
                    const isoParsed = dayjs(raw);
                    return isoParsed.isValid() ? isoParsed.format('MM/DD/YYYY') : raw;
                }

                return raw;
            };

            const exportRows = safeRows.map((row) => {
                const obj = {};
                safeColumns.forEach((col) => {
                    obj[col.label] = formatExcelValue(col.id, row?.[col.id]);
                });
                return obj;
            });

            const tabName = pathFilters.tab || 'all';
            const fileName = `purchase_orders_${tabName}_${dayjs().format('YYYY-MM-DD')}.xlsx`;
            await exportRowsToExcel(exportRows, 'Purchase Orders', fileName);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleButtonClick = () => {
        navigate('/home/addPurchase');
    };

    const handleSelectionChange = (selectedIds) => {
        setSelectedPurchaseIds(selectedIds);
    };

    const handleDeleteLead = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const idsToDelete = [...selectedPurchaseIds];
        setSelectedPurchaseIds([]);
        setShowDeleteModal(false);
        setLoading(true);
        try {
            for (const id of idsToDelete) {
                await deleteRequest(`${baseURl}purchase-order/${id}`, accessToken);
                toast.success(`Purchase order ${id} deleted successfully.`);
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

    const datePickerSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: 'var(--dashboard-tab-box)',
            height: 40,
        },
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 20 }}>
            <PageHeader
                title="Purchase Management"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Add Purchase"
                        onClick={handleButtonClick}
                    />
                )}
            />

            <div className="flex gap-3 flex-wrap mt-4">
                {statCards.map((card) => (
                    <PurchaseStatCard
                        key={card.id || 'all'}
                        title={card.title}
                        count={loading && !purchaseStats ? '—' : card.count}
                        amount={loading && !purchaseStats ? '—' : card.amount}
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
                {PURCHASE_TABS.map((tab) => {
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
                    placeholder="Search by PO No...."
                />

                <div className="flex justify-between items-end gap-3 flex-wrap">
                    <div className="flex justify-start items-end gap-3 flex-wrap flex-1">
                        <FilterDropdown
                            label="Date Filter"
                            value={draftDateFilter}
                            onChange={handleDraftDateFilterChange}
                            options={DATE_FILTER_OPTIONS}
                            placeholder="Date Filter"
                            minWidth={160}
                            placeholderValues={['']}
                            searchable={true}
                            searchPlaceholder="Search date filter..."
                        />

                        <FilterDropdown
                            label="Order By"
                            value={draftOrderBy}
                            onChange={setDraftOrderBy}
                            options={[
                                { label: 'DERPS #', value: 'poSerialNo' },
                                { label: 'Entered into DERPS', value: 'derpsEntryDate' },
                                { label: 'PO Date', value: 'poDate' },
                                { label: 'Created At', value: 'createdAt' },
                            ]}
                            placeholder="Order By"
                            minWidth={160}
                            placeholderValues={['']}
                        />

                        <FilterDropdown
                            label="Order"
                            value={draftOrder}
                            onChange={setDraftOrder}
                            options={[
                                { label: 'None', value: '' },
                                { label: 'ASC', value: 'asc' },
                                { label: 'DESC', value: 'desc' },
                            ]}
                            placeholder="Order"
                            minWidth={140}
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
                                        disabled={!!draftDateFilter}
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
                                        disabled={!!draftDateFilter}
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
                {selectedPurchaseIds.length > 0 && (
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
                        <NoDataFound title="No Data Found" description="No purchase orders found." />
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
                            showCheckbox={true}
                            selectedRowIds={selectedPurchaseIds}
                            onSelectionChange={handleSelectionChange}
                            purchaseTable={true}
                        />
                    )}
                </div>
            )}

            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Purchase Orders"
                subtitle="Are you sure you want to delete the selected"
                entityName={`${selectedPurchaseIds.length} purchase order${selectedPurchaseIds.length > 1 ? 's' : ''}`}
                warningMessage="This action cannot be undone. The selected purchase orders will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={loading}
            />
        </div>
    );
};

export default Purchase;
