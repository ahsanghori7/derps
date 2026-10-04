import { useNavigate, useLocation } from "react-router-dom";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import ListSearchField from "../../Components/ListSearchField";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadFileWithToken, getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import {
    Box,
    Chip,
    Collapse,
    IconButton,
    Stack,
    Tooltip,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import addIcon from "../../assets/addIcon.png";
import downloadPdf from "../../assets/downloadPdf.png";
import { toast } from "react-toastify";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import FilterDropdown from "../../Components/FilterDropdown";
import { usePageTitle } from "../../Hooks/usePageTitle";

const FilterChip = ({ label, onRemove }) => (
    <span
        className="inline-flex items-center gap-1"
        style={{
            background: "#0C79F7",
            color: "#fff",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
        }}
    >
        {label}
        <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            style={{
                display: "inline-flex",
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: 0,
            }}
        >
            <CloseIcon sx={{ fontSize: 14 }} />
        </button>
    </span>
);

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
    '@media (max-width: 1100px)': {
        display: 'flex',
        flexWrap: 'wrap',
    },
});

const StageCardItem = styled('div', {
    shouldForwardProp: (prop) => prop !== 'clickable',
})(({ clickable }) => ({
    cursor: clickable ? 'pointer' : 'default',
    minWidth: 0,
    width: '100%',
    '@media (max-width: 1100px)': {
        flex: '1 1 140px',
        width: 'auto',
        maxWidth: 'calc(33.333% - 6px)',
    },
    '@media (max-width: 768px)': {
        flex: '1 1 calc(50% - 4px)',
        maxWidth: 'calc(50% - 4px)',
    },
    '@media (max-width: 480px)': {
        flex: '1 1 100%',
        maxWidth: '100%',
    },
}));

const MERCHANT_STATUS_FILTERS = [
    { key: 'all', title: 'All Merchants', subtitle: 'Total merchants', countKey: 'total', apiStatus: null },
    { key: 'new', title: 'New', subtitle: 'New merchants', countKey: 'new', apiStatus: 'new' },
    { key: 'active', title: 'Active', subtitle: 'Active merchants', countKey: 'active', apiStatus: 'active' },
];

const MERCHANT_STATUS_TABS = MERCHANT_STATUS_FILTERS.map(({ key, title }) => ({
    id: key === 'all' ? '' : key,
    label: title,
}));

const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const extractMerchantStats = (result) => {
    if (!result || typeof result !== 'object') {
        return { total: 0, new: 0, active: 0 };
    }

    const payload = result?.data && typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data
        : {};
    const source = { ...payload, ...result };

    const newCount = toCount(source.totalNewStatusCount);
    const active = toCount(source.totalActiveStatusCount);
    const summed = newCount + active;
    const total = toCount(source.totalRecords) || summed;

    return { total, new: newCount, active };
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const CustomerList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Update browser tab title
    usePageTitle("Merchant Info", location);
    
    const pathFilters = useMemo(() => {
        const segments = location.pathname.replace('/home/customerList', '').split('/').filter(Boolean);
        const result = { agent: null, keyword: '', status: '', page: '1', rows: '25' };

        for (let i = 0; i < segments.length; i += 1) {
            const key = segments[i];
            const value = segments[i + 1];
            if (key === 'agent' && value) result.agent = decodeURIComponent(value);
            if (key === 'keyword' && value) result.keyword = decodeURIComponent(value);
            if (key === 'status' && value) {
                const decoded = decodeURIComponent(value);
                result.status = ['new', 'active'].includes(decoded) ? decoded : '';
            }
            if (key === 'page' && value) result.page = value;
            if (key === 'rows' && value) result.rows = value;
        }

        return result;
    }, [location.pathname]);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [customerList, setCustomerList] = useState([]);
    const [customerApiData, setCustomerApiData] = useState(null);
    const [agentList, setAgentList] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const selectedAgent = pathFilters.agent || null;
    const searchText = pathFilters.keyword || '';
    const selectedStatus = pathFilters.status || '';
    const [draftKeyword, setDraftKeyword] = useState(searchText);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const page = Math.max(1, Number(pathFilters.page) || 1);
    const rowsPerPage = [5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25;

    useEffect(() => {
        setDraftKeyword(searchText);
    }, [searchText]);

    const fetchData = () => {
        setLoading(true);

        const params = new URLSearchParams();
        params.set('paginate', 'true');
        params.set('page', String(page));
        params.set('limit', String(rowsPerPage));
        params.set('orderBy', 'createdAt');
        params.set('order', 'desc');
        if (selectedAgent) params.set('agentId', String(selectedAgent));
        if (String(searchText || '').trim()) params.set('keyword', String(searchText || '').trim());
        if (selectedStatus) params.set('status', selectedStatus);

        getRequestWithOutBody(`${baseURl}customer?${params.toString()}`, accessToken)
            .then(result => {
                setCustomerApiData(result);

                const apiData = result?.data ?? result;
                const rows = apiData?.results || apiData?.data?.results || apiData?.data || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    apiData?.pagination?.total ??
                    apiData?.pagination?.totalRecords ??
                    0;

                setCustomerList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setLoading(false);
                setHasFetched(true);
            })
            .catch(error => {
                setCustomerList([]);
                setCustomerApiData(null);
                setTotalCount(0);
                setLoading(false);
                setHasFetched(true);
            })
    };

    const fetchAgents = () => {
        getRequestWithOutBody(`${baseURl}user?roleTitle=agent`, accessToken)
            .then((result) => {
                setAgentList(result?.data?.results || []);
            })
            .catch((error) => {
            });
    };

    useEffect(() => {
        fetchAgents();
    }, [])

    useEffect(() => {
        fetchData();
    }, [accessToken, page, rowsPerPage, selectedAgent, searchText, selectedStatus]);

    const navigateWithFilters = (updates = {}) => {
        const next = {
            agent: selectedAgent,
            keyword: searchText,
            status: selectedStatus,
            page,
            rows: rowsPerPage,
            ...updates,
        };
        const segments = [];
        if (next.agent) segments.push('agent', encodeURIComponent(next.agent));
        const normalizedSearch = String(next.keyword || '').trim();
        if (normalizedSearch) segments.push('keyword', encodeURIComponent(normalizedSearch));
        if (next.status && ['new', 'active'].includes(next.status)) {
            segments.push('status', encodeURIComponent(next.status));
        }
        if ((Number(next.page) || 1) > 1) segments.push('page', String(Number(next.page) || 1));
        const nextRows = [5, 10, 25, 50].includes(Number(next.rows)) ? Number(next.rows) : 25;
        if (nextRows !== 25) segments.push('rows', String(nextRows));
        const nextPath = segments.length > 0 ? `/home/customerList/${segments.join('/')}` : '/home/customerList';

        if (nextPath !== location.pathname) {
            navigate(nextPath, { replace: true });
        }
    };

    const handleStatusFilter = (statusKey) => {
        navigateWithFilters({ status: statusKey || '', page: 1 });
    };

    const handleClearFilters = useCallback(() => {
        navigateWithFilters({ agent: null, keyword: '', status: '', page: 1 });
    }, [navigateWithFilters]);

    const handleApplyFilters = useCallback(() => {
        navigateWithFilters({ keyword: draftKeyword, page: 1 });
    }, [navigateWithFilters, draftKeyword]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (searchText.trim()) chips.push({ key: 'search', label: `Search: ${searchText.trim()}` });
        if (selectedStatus) {
            chips.push({
                key: 'status',
                label: `Status: ${
                    MERCHANT_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title || selectedStatus
                }`,
            });
        }
        if (selectedAgent) {
            const agent = (Array.isArray(agentList) ? agentList : []).find(
                (a) => String(a?.id) === String(selectedAgent)
            );
            chips.push({
                key: 'agent',
                label: `Agent: ${agent?.name || agent?.username || selectedAgent}`,
            });
        }
        return chips;
    }, [searchText, selectedStatus, selectedAgent, agentList]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') navigateWithFilters({ keyword: '', page: 1 });
        if (key === 'status') navigateWithFilters({ status: '', page: 1 });
        if (key === 'agent') navigateWithFilters({ agent: null, page: 1 });
    }, [navigateWithFilters]);

    const stats = useMemo(() => extractMerchantStats(customerApiData), [customerApiData]);

    const summaryCards = useMemo(() => (
        MERCHANT_STATUS_FILTERS.map((status) => ({
            key: status.key,
            title: status.title,
            amount: Number(stats[status.countKey] || 0).toLocaleString(),
            subtitle: status.subtitle,
            filterKey: status.key === 'all' ? '' : status.key,
            clickable: true,
        }))
    ), [stats]);

    const columns = [
        { id: 'merchantIds', label: 'MERCHANT ID', align: 'center' },
        { id: 'legalBusinessName', label: 'LEGAL NAME', align: 'center' },
        { id: 'dbaName', label: 'DBA NAME', align: 'center' },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            renderCell: (row) => formatDateTime(row?.createdAt),
        },
        { id: 'merchantStatus', label: 'STATUS', align: 'center' },
    ];
    const handleButtonClick = () => {
        navigate('/home/customerInfo');
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (selectedAgent) params.set('agentId', String(selectedAgent));
            if (selectedStatus) params.set('status', selectedStatus);
            const query = params.toString();
            const url = `${baseURl}customer/export${query ? `?${query}` : ''}`;
            await downloadFileWithToken(url, accessToken, `merchants_export_${Date.now()}.xlsx`);
            toast.success('Export downloaded successfully');
        } catch (error) {
            toast.error(error?.message || 'Failed to export merchants');
        } finally {
            setExporting(false);
        }
    };

    const showNoData = hasFetched && !loading && String(searchText || '').trim() && (customerList?.length || 0) === 0;

    useEffect(() => {
        if (!hasFetched || loading) return;
        const maxPage = Math.max(1, Math.ceil((Number(totalCount) || 0) / rowsPerPage));
        if (page > maxPage) navigateWithFilters({ page: maxPage });
    }, [hasFetched, loading, totalCount, page, rowsPerPage]);
    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <PageHeader
                title="Merchant"
                actions={(
                    <AppButton
                        icon={addIcon}
                        title="Add Merchant"
                        onClick={handleButtonClick}
                    />
                )}
            />

            <StageCardsWrapper>
                {summaryCards.map((card) => {
                    const isSelected = (card.filterKey || '') === (selectedStatus || '');

                    return (
                        <StageCardItem
                            key={card.key}
                            clickable={card.clickable}
                            role={card.clickable ? 'button' : undefined}
                            tabIndex={card.clickable ? 0 : undefined}
                            onClick={() => {
                                if (card.clickable) handleStatusFilter(card.filterKey || '');
                            }}
                            onKeyDown={(event) => {
                                if (!card.clickable) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStatusFilter(card.filterKey || '');
                                }
                            }}
                        >
                            <TaxDashboardBox
                                compact
                                selected={isSelected}
                                title={card.title}
                                amount={card.amount}
                                subtitle={card.subtitle}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-6 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {MERCHANT_STATUS_TABS.map((tab) => {
                    const isActive = (selectedStatus || '') === tab.id;
                    return (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id)}
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
                    overflow: 'hidden',
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
                        px: 2,
                        py: 1,
                        borderBottom: filtersExpanded ? '1px solid var(--dashboard-box-border)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        cursor: 'pointer',
                        userSelect: 'none',
                        background:
                            'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)',
                        '&:hover': {
                            background:
                                'linear-gradient(180deg, rgba(241,245,249,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                        },
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <TuneIcon fontSize="small" />
                        <Box sx={{ fontWeight: 700, fontSize: 14 }}>Filters</Box>
                        {!filtersExpanded && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                {selectedStatus && (
                                    <Chip
                                        size="small"
                                        label={
                                            MERCHANT_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title ||
                                            selectedStatus
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {searchText.trim() && (
                                    <Chip size="small" label={`Search: ${searchText.trim()}`} variant="outlined" />
                                )}
                                {selectedAgent && (
                                    <Chip
                                        size="small"
                                        label={`Agent: ${
                                            (Array.isArray(agentList) ? agentList : []).find(
                                                (a) => String(a?.id) === String(selectedAgent)
                                            )?.name || selectedAgent
                                        }`}
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
                    <Box sx={{ px: 2, py: 1.25 }}>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <ListSearchField
                                layout="inline"
                                placeholder="Search merchants..."
                                value={draftKeyword}
                                onChange={(e) => setDraftKeyword(e.target.value)}
                                onEnter={handleApplyFilters}
                            />

                            <FilterDropdown
                                value={selectedAgent ?? 'all'}
                                onChange={(next) => {
                                    const effective = String(next) === 'all' ? null : next;
                                    navigateWithFilters({ agent: effective, page: 1 });
                                }}
                                options={[
                                    { label: 'All Agents', value: 'all' },
                                    ...(Array.isArray(agentList) ? agentList : []).map((a) => ({
                                        label: a?.name || a?.username || '-',
                                        value: a?.id,
                                    })),
                                ]}
                                placeholder="All Agents"
                                minWidth={180}
                                placeholderValues={["all"]}
                                searchable
                            />

                            <div className="flex gap-2 items-center ml-auto">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={exporting || loading}
                                    style={{
                                        height: 36,
                                        padding: '0 14px',
                                        borderRadius: 8,
                                        border: '1px solid var(--dashboard-box-border)',
                                        background: 'var(--dashboard-card-bg2)',
                                        color: 'var(--dashboard-text-primary)',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: exporting || loading ? 'not-allowed' : 'pointer',
                                        whiteSpace: 'nowrap',
                                        opacity: exporting || loading ? 0.6 : 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <img src={downloadPdf} alt="export" style={{ width: 16, height: 16 }} />
                                    {exporting ? 'Exporting...' : 'Export'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    style={{
                                        height: 36,
                                        padding: '0 14px',
                                        borderRadius: 8,
                                        border: '1px solid var(--dashboard-box-border)',
                                        background: 'var(--dashboard-card-bg2)',
                                        color: 'var(--dashboard-text-primary)',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Clear Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    style={{
                                        height: 36,
                                        padding: '0 14px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: '#24282E',
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>

                        {activeFilterChips.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2 items-center">
                                {activeFilterChips.map((chip) => (
                                    <FilterChip
                                        key={chip.key}
                                        label={chip.label}
                                        onRemove={() => removeFilterChip(chip.key)}
                                    />
                                ))}
                            </div>
                        )}
                    </Box>
                </Collapse>
            </div>

            <div className="w-[100%]" style={{ borderRadius: 14, padding: 20 }}>
                {loading ? (
                    <div className="text-center w-full mx-auto py-8">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : showNoData ? (
                    <NoDataFound title="No Data Found" description="No data found for your search." />
                ) : (
                    <MemoTable
                        columns={columns}
                        data={customerList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={(nextPage) => navigateWithFilters({ page: nextPage })}
                        onRowsPerPageChange={(next) => {
                            navigateWithFilters({ rows: next, page: 1 });
                        }}
                        adminCustomerTable={true}
                    />
                )}
            </div>
        </div>
    );
};

export default CustomerList;
