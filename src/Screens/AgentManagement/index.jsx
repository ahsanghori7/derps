import Heading from "../../Components/Heading";
import MemoTable from "../../Components/MemoTable";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined';
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import FilterDropdown from "../../Components/FilterDropdown";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
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

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
    gap: 10
});

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
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

const AGENT_REQUEST_STATUS_FILTERS = [
    { key: 'all', title: 'All', subtitle: 'All requests', countKey: 'total', apiStatus: null },
    { key: 'pending', title: 'Pending', subtitle: 'Pending requests', countKey: 'pending', apiStatus: 'pending' },
    { key: 'followed-up', title: 'Followed Up', subtitle: 'Followed up requests', countKey: 'followedUp', apiStatus: 'followed-up' },
    { key: 'approved', title: 'Approved', subtitle: 'Approved requests', countKey: 'approved', apiStatus: 'approved' },
    { key: 'rejected', title: 'Rejected', subtitle: 'Rejected requests', countKey: 'rejected', apiStatus: 'rejected' },
];

const AGENT_REQUEST_STATUS_TABS = AGENT_REQUEST_STATUS_FILTERS.map(({ key, title }) => ({
    id: key === 'all' ? '' : key,
    label: title,
}));

const ALLOWED_STATUSES = new Set(['pending', 'followed-up', 'approved', 'rejected']);

const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const extractAgentRequestStats = (result) => {
    if (!result || typeof result !== 'object') {
        return { total: 0, pending: 0, followedUp: 0, approved: 0, rejected: 0 };
    }

    return {
        total: toCount(result.totalCount),
        pending: toCount(result.totalPendingCount),
        followedUp: toCount(result.totalFollowedUpCount),
        approved: toCount(result.totalApprovedCount),
        rejected: toCount(result.totalRejectedCount),
    };
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

const STATUS_BADGE_STYLES = {
    approved: { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.16)', icon: CheckCircleOutlineIcon },
    pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', icon: PendingOutlinedIcon },
    'followed-up': { color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)', icon: PendingOutlinedIcon },
    rejected: { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.12)', icon: CancelOutlinedIcon },
};

const formatStatusLabel = (status) => {
    if (!status) return '-';
    return String(status)
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const renderStatusBadge = (status) => {
    const key = String(status || '').trim().toLowerCase();
    const styles = STATUS_BADGE_STYLES[key] || {
        color: '#334155',
        bg: 'rgba(148, 163, 184, 0.12)',
        icon: PendingOutlinedIcon,
    };
    const Icon = styles.icon;

    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 12px',
                    borderRadius: 999,
                    backgroundColor: styles.bg,
                    color: styles.color,
                    fontSize: 12,
                    fontWeight: 600,
                    minWidth: 110,
                    textTransform: 'none',
                    letterSpacing: 0.2,
                    gap: 6,
                }}
            >
                {Icon && <Icon sx={{ fontSize: 14 }} />}
                {formatStatusLabel(status)}
            </span>
        </div>
    );
};

const getAgentDisplayName = (row) => {
    if (!row || typeof row !== 'object') return '-';
    return (
        row?.name ||
        row?.agent?.username ||
        row?.agent?.name ||
        row?.username ||
        row?.fullName ||
        row?.email ||
        '-'
    );
};

const AgentManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();

    usePageTitle("Agents Application", location);
    const pathFilters = useMemo(() => {
        const segments = location.pathname.replace('/home/agentManagement', '').split('/').filter(Boolean);
        const result = {
            status: '',
            keyword: '',
            page: '1',
            rows: '25',
        };

        for (let i = 0; i < segments.length; i += 1) {
            const key = segments[i];
            const value = segments[i + 1];
            if (!key || !value) continue;

            if (key === 'status') result.status = value;
            if (key === 'keyword') result.keyword = decodeURIComponent(value);
            if (key === 'page') result.page = value;
            if (key === 'rows') result.rows = value;
        }

        return result;
    }, [location.pathname]);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [agentRequestList, setAgentRequestList] = useState([]);
    const [agentRequestApiData, setAgentRequestApiData] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const selectedStatus = ALLOWED_STATUSES.has(pathFilters.status) ? pathFilters.status : 'all';
    const searchText = pathFilters.keyword || '';
    const [keywordDraft, setKeywordDraft] = useState(searchText);
    const page = Math.max(1, Number(pathFilters.page) || 1);
    const rowsPerPage = [5, 10, 25, 50].includes(Number(pathFilters.rows)) ? Number(pathFilters.rows) : 25;

    const statusFilterOptions = AGENT_REQUEST_STATUS_FILTERS.map((status) => ({
        label: status.title === 'All' ? 'All Statuses' : status.title,
        value: status.key,
    }));

    useEffect(() => {
        setKeywordDraft(searchText);
    }, [searchText, location.pathname]);

    const fetchData = useCallback(() => {
        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        if (ALLOWED_STATUSES.has(selectedStatus)) {
            params.append('status', selectedStatus);
        }
        if (searchText && searchText.trim()) {
            params.append('keyword', searchText.trim());
        }

        const apiUrl = `${baseURl}agent-request?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                setAgentRequestApiData(result);

                const rows = result?.data?.results || [];
                const count = result?.data?.totalRecords ?? 0;

                setAgentRequestList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setLoading(false);
                setHasFetched(true);
            })
            .catch(() => {
                setAgentRequestApiData(null);
                setAgentRequestList([]);
                setTotalCount(0);
                setLoading(false);
                setHasFetched(true);
            });
    }, [accessToken, page, rowsPerPage, selectedStatus, searchText]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const navigateWithFilters = (updates = {}) => {
        const next = {
            status: selectedStatus,
            keyword: searchText,
            page,
            rows: rowsPerPage,
            ...updates,
        };

        const normalizedStatus = String(next.status || 'all');
        const normalizedSearch = String(next.keyword || '').trim();
        const normalizedPage = Math.max(1, Number(next.page) || 1);
        const normalizedRows = [5, 10, 25, 50].includes(Number(next.rows)) ? Number(next.rows) : 25;

        const segments = [];
        if (normalizedStatus && normalizedStatus !== 'all' && ALLOWED_STATUSES.has(normalizedStatus)) {
            segments.push('status', normalizedStatus);
        }
        if (normalizedSearch) segments.push('keyword', encodeURIComponent(normalizedSearch));
        if (normalizedPage > 1) segments.push('page', String(normalizedPage));
        if (normalizedRows !== 25) segments.push('rows', String(normalizedRows));

        const nextPath = segments.length > 0 ? `/home/agentManagement/${segments.join('/')}` : '/home/agentManagement';
        if (nextPath !== location.pathname) {
            navigate(nextPath, { replace: true });
        }
    };

    const handleStatusFilter = (statusKey) => {
        navigateWithFilters({ status: statusKey || 'all', page: 1 });
    };

    const handleClearFilters = useCallback(() => {
        navigateWithFilters({ status: 'all', keyword: '', page: 1 });
    }, [navigateWithFilters]);

    const handleApplyFilters = useCallback(() => {
        navigateWithFilters({ keyword: keywordDraft, page: 1 });
    }, [navigateWithFilters, keywordDraft]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (searchText.trim()) chips.push({ key: 'search', label: `Search: ${searchText.trim()}` });
        if (selectedStatus !== 'all') {
            chips.push({
                key: 'status',
                label: `Status: ${
                    AGENT_REQUEST_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title || selectedStatus
                }`,
            });
        }
        return chips;
    }, [searchText, selectedStatus]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') navigateWithFilters({ keyword: '', page: 1 });
        if (key === 'status') navigateWithFilters({ status: 'all', page: 1 });
    }, [navigateWithFilters]);

    const stats = useMemo(() => extractAgentRequestStats(agentRequestApiData), [agentRequestApiData]);

    const summaryCards = useMemo(() => (
        AGENT_REQUEST_STATUS_FILTERS.map((status) => ({
            key: status.key,
            title: status.title,
            amount: Number(stats[status.countKey] || 0).toLocaleString(),
            subtitle: status.subtitle,
            filterKey: status.key === 'all' ? '' : status.key,
            clickable: true,
        }))
    ), [stats]);

    useEffect(() => {
        if (!hasFetched || loading || totalCount === 0) return;
        const maxPage = Math.max(1, Math.ceil(totalCount / rowsPerPage));
        if (page > maxPage) {
            navigateWithFilters({ page: maxPage });
        }
    }, [hasFetched, loading, totalCount, page, rowsPerPage]);

    const columns = [
        { id: 'id', label: 'Request No', align: 'center' },
        {
            id: 'name',
            label: 'Agent',
            align: 'center',
            format: (_value, row) => getAgentDisplayName(row),
        },
        { id: 'email', label: 'Email', align: 'center' },
        {
            id: 'phoneNumber',
            label: 'Phone',
            align: 'center',
            format: (value) => value || '-',
        },
        {
            id: 'createdAt',
            label: 'CREATED AT',
            align: 'center',
            format: (value) => formatDateTime(value),
        },
        { id: 'status', label: 'Status', align: 'center', format: renderStatusBadge },
        { id: 'edit', label: 'Edit', align: 'center' },
    ];

    const handleRowClick = (event, row) => {
        if (!row?.id) return;
        const detailPath = `/home/agentManagementDetail/${row.id}`;
        if (event?.metaKey || event?.ctrlKey) {
            window.open(detailPath, '_blank');
            return;
        }
        navigate(detailPath, {
            state: { itemData: row, returnTo: location.pathname },
        });
    };

    const selectedStatusKey = selectedStatus === 'all' ? '' : selectedStatus;

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Agents Application'}
                    Fontsize={30}
                />
            </HeaderWrapper>

            <StageCardsWrapper>
                {summaryCards.map((card) => {
                    const isSelected = (card.filterKey || '') === (selectedStatusKey || '');

                    return (
                        <StageCardItem
                            key={card.key}
                            clickable={card.clickable}
                            role={card.clickable ? 'button' : undefined}
                            tabIndex={card.clickable ? 0 : undefined}
                            onClick={() => {
                                if (card.clickable) handleStatusFilter(card.filterKey || 'all');
                            }}
                            onKeyDown={(event) => {
                                if (!card.clickable) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStatusFilter(card.filterKey || 'all');
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
                {AGENT_REQUEST_STATUS_TABS.map((tab) => {
                    const isActive = (selectedStatusKey || '') === tab.id;
                    return (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id || 'all')}
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
                                {selectedStatus !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={
                                            AGENT_REQUEST_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title ||
                                            selectedStatus
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {searchText.trim() && (
                                    <Chip size="small" label={`Search: ${searchText.trim()}`} variant="outlined" />
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
                            <div
                                style={{
                                    background: 'var(--chrome-filter-bar-bg)',
                                    borderRadius: 8,
                                    padding: '0 12px',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'center',
                                    flex: '1 1 240px',
                                    maxWidth: 420,
                                    minWidth: 200,
                                    height: 40,
                                    boxSizing: 'border-box',
                                }}
                            >
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="var(--chrome-search-icon)"
                                    strokeWidth="2"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name or keyword..."
                                    value={keywordDraft}
                                    onChange={(e) => setKeywordDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        handleApplyFilters();
                                    }}
                                    style={{
                                        outline: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        fontSize: 13,
                                        border: 'none',
                                        color: 'var(--sidebar-text-primary)',
                                    }}
                                />
                            </div>

                            <FilterDropdown
                                value={selectedStatus}
                                onChange={(next) => {
                                    navigateWithFilters({ status: next, page: 1 });
                                }}
                                options={statusFilterOptions}
                                placeholder="All Statuses"
                                minWidth={180}
                                placeholderValues={["all"]}
                                searchable
                                searchPlaceholder="Search status..."
                            />

                            <div className="flex gap-2 items-center ml-auto">
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
                ) : Array.isArray(agentRequestList) && agentRequestList.length > 0 ? (
                    <MemoTable
                        columns={columns}
                        data={agentRequestList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={(nextPage) => navigateWithFilters({ page: nextPage })}
                        onRowsPerPageChange={(next) => {
                            navigateWithFilters({ rows: next, page: 1 });
                        }}
                        adminApplication={true}
                        onRowClick={handleRowClick}
                    />
                ) : (
                    <NoDataFound title="No Data Found" description="No data found." />
                )}
            </div>
        </div>
    );
};

export default AgentManagement;
