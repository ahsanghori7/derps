import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import AgentTable from "../../Components/AgentTable";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import addIcon from "../../assets/addIcon.png";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
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
import Loader from "../../Components/Loader";
import UserProfileAvatar from "../../Components/UserProfileAvatar";
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

const STAFF_STATUS_FILTERS = [
    { key: 'all', title: 'All Staff', subtitle: 'Total staff members', countKey: 'total', apiStatus: null },
    { key: 'active', title: 'Active', subtitle: 'Active staff', countKey: 'active', apiStatus: 'active' },
    { key: 'inactive', title: 'Inactive', subtitle: 'Inactive staff', countKey: 'inactive', apiStatus: 'in-active' },
];

const STAFF_STATUS_TABS = STAFF_STATUS_FILTERS.map(({ key, title }) => ({
    id: key === 'all' ? '' : key,
    label: title,
}));

const toCount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const extractStaffStats = (result) => {
    if (!result || typeof result !== 'object') {
        return { total: 0, active: 0, inactive: 0 };
    }

    const payload = result?.data && typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data
        : {};
    const source = { ...payload, ...result };

    const active = toCount(source.totalActiveStatusCount);
    const inactive = toCount(source.totalInActiveStatusCount);
    const summed = active + inactive;
    const total = toCount(source.totalRecords) || summed;

    return { total, active, inactive };
};

const displayValue = (value) => {
    if (value == null || value === "") return "-";
    return String(value);
};

const formatRevenueShare = (value) => {
    if (value == null || value === "") return "-";
    const num = Number(value);
    if (Number.isFinite(num)) return `${num}%`;
    return String(value);
};

const mapAgentToTableRow = (row) => ({
    ...row,
    code: displayValue(row?.code),
    name: displayValue(row?.name),
    contact: displayValue(row?.contact ?? row?.contactNo),
    email: displayValue(row?.email),
    username: displayValue(row?.username),
    revenueShare: formatRevenueShare(row?.revenueShare),
    status: row?.status ? String(row.status).trim().toLowerCase() : "-",
});

const Agent = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Employee List", location);

    const [loading, setLoading] = useState(false);
    const [agentList, setAgentList] = useState([]);
    const [agentApiData, setAgentApiData] = useState(null);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || "");
    const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || "");
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const [totalCount, setTotalCount] = useState(0);
    const statusFromUrl = searchParams.get('status');
    const [selectedStatus, setSelectedStatus] = useState(
        !statusFromUrl || statusFromUrl === 'all' ? '' : statusFromUrl
    );

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatus(statusKey || '');
        setPage(1);
    }, []);

    const fetchData = useCallback(() => {
        if (!accessToken) return;

        setLoading(true);

        const params = new URLSearchParams();
        params.append('paginate', 'true');
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        if (search.trim()) {
            params.append('keyword', search.trim());
        }

        const selected = STAFF_STATUS_FILTERS.find((item) => {
            if (!selectedStatus) return item.key === 'all';
            return item.key === selectedStatus;
        });
        if (selected?.apiStatus) {
            params.append('status', selected.apiStatus);
        }

        const apiUrl = `${baseURl}user?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                setAgentApiData(result);

                const apiData = result?.data ?? result;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    result?.totalRecords ??
                    0;

                setAgentList(
                    Array.isArray(rows)
                        ? rows.map(mapAgentToTableRow)
                        : []
                );
                setTotalCount(toCount(count));
                setLoading(false);
            })
            .catch(() => {
                setAgentList([]);
                setAgentApiData(null);
                setTotalCount(0);
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage, search, selectedStatus]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());
        if (selectedStatus) params.set('status', selectedStatus);

        setSearchParams(params);
    }, [search, page, rowsPerPage, selectedStatus, setSearchParams]);

    const searchFromUrl = searchParams.get('search') || '';
    useEffect(() => {
        setSearch(searchFromUrl);
        setSearchDraft(searchFromUrl);
    }, [searchFromUrl]);

    const handleClearFilters = useCallback(() => {
        setSearch('');
        setSearchDraft('');
        setSelectedStatus('');
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setSearch(String(searchDraft || '').trim());
        setPage(1);
    }, [searchDraft]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (search.trim()) chips.push({ key: 'search', label: `Search: ${search.trim()}` });
        if (selectedStatus) {
            chips.push({
                key: 'status',
                label: `Status: ${
                    STAFF_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title || selectedStatus
                }`,
            });
        }
        return chips;
    }, [search, selectedStatus]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') {
            setSearch('');
            setSearchDraft('');
        }
        if (key === 'status') setSelectedStatus('');
        setPage(1);
    }, []);

    const stats = useMemo(() => extractStaffStats(agentApiData), [agentApiData]);

    const summaryCards = useMemo(() => (
        STAFF_STATUS_FILTERS.map((status) => ({
            key: status.key,
            title: status.title,
            amount: Number(stats[status.countKey] || 0).toLocaleString(),
            subtitle: status.subtitle,
            filterKey: status.key === 'all' ? '' : status.key,
            clickable: true,
        }))
    ), [stats]);

    const activeTabLabel = useMemo(
        () => STAFF_STATUS_TABS.find((tab) => tab.id === (selectedStatus || ''))?.label || 'All Staff',
        [selectedStatus]
    );

    const columns = [
        { id: 'code', label: 'CODE', align: 'center' },
        {
            id: 'name',
            label: 'STAFF MEMBER NAME',
            align: 'center',
            displayCell: (row) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <UserProfileAvatar user={row} size={28} />
                    <span>{row.name}</span>
                </span>
            ),
        },
        { id: 'contact', label: 'CONTACT NO', align: 'center' },
        { id: 'email', label: 'EMAIL', align: 'center' },
        { id: 'username', label: 'USER NAME', align: 'center' },
        { id: 'revenueShare', label: 'REVENUE SHARE', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
    ];

    const handleButtonClick = () => {
        navigate('/home/addAgent');
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handleRowsPerPageChange = (newRowsPerPage) => {
        setRowsPerPage(newRowsPerPage);
        setPage(1);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Employee List'}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Add Member'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    className="!mb-0 !mx-0"
                    onClick={handleButtonClick}
                />
            </HeaderWrapper>

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
                {STAFF_STATUS_TABS.map((tab) => {
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
                                whiteSpace: 'nowrap',
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
                                            STAFF_STATUS_FILTERS.find((s) => s.key === selectedStatus)?.title ||
                                            selectedStatus
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {search.trim() && (
                                    <Chip size="small" label={`Search: ${search.trim()}`} variant="outlined" />
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
                                    placeholder="Search by name or code..."
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
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
                ) : agentList.length === 0 ? (
                    <NoDataFound
                        title="No Data Found"
                        description={
                            search.trim()
                                ? "No staff found matching your search."
                                : `No ${activeTabLabel.toLowerCase()} found.`
                        }
                    />
                ) : (
                    <AgentTable
                        columns={columns}
                        data={agentList}
                        totalCount={totalCount}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        editAgent={true}
                        containerMaxHeight="calc(100vh - 300px)"
                    />
                )}
            </div>
        </div>
    );
};

export default Agent;
