import { useLocation, useNavigate } from "react-router-dom";
import Heading from "../../Components/Heading";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import { styled } from "@mui/material/styles";
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
import FilterDropdown from "../../Components/FilterDropdown";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
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
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 8,
    '@media (max-width: 1100px)': {
        display: 'flex',
        flexWrap: 'wrap',
    },
});

const StageCardItem = styled('div')({
    cursor: 'pointer',
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
});

const AGENTS_TICKETS_FILTERS_KEY = 'agentsTickets_filters';

const TICKET_STATUS_FILTERS = [
    { key: 'all', title: 'All Tickets', subtitle: 'Total tickets', countKey: 'total' },
    { key: 'pending', title: 'Pending', subtitle: 'Pending tickets', countKey: 'pending' },
    { key: 'in-progress', title: 'In Progress', subtitle: 'In progress tickets', countKey: 'inProgress' },
    { key: 'complete', title: 'Complete', subtitle: 'Completed tickets', countKey: 'completed' },
    { key: 'active', title: 'Active', subtitle: 'Active tickets', countKey: 'active' },
    { key: 'inactive', title: 'Inactive', subtitle: 'Inactive tickets', countKey: 'inactive' },
];

const TICKET_STATUS_TABS = TICKET_STATUS_FILTERS.map(({ key, title }) => ({
    id: key,
    label: title,
}));

const extractTicketStats = (result) => {
    if (!result || typeof result !== 'object') return null;

    const payload = result?.data && typeof result.data === 'object' ? result.data : {};
    const source = { ...payload, ...result };

    const pending = Number(source.totalPendingStatusCount) || 0;
    const inProgress = Number(source.totalInProgressStatusCount) || 0;
    const completed = Number(source.totalCompletedStatusCount) || 0;
    const active = Number(source.totalActiveStatusCount) || 0;
    const inactive = Number(source.totalInActiveStatusCount) || 0;
    const total = pending + inProgress + completed + active + inactive;

    return { total, pending, inProgress, completed, active, inactive };
};

const getTicketStatCount = (stats, countKey) => {
    if (!stats) return 0;
    return Number(stats[countKey]) || 0;
};

const AgentsTickets = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Internal Tickets", location);
    const categoryScope = useSelector((state) => state.auth.categories);
    const userData = useSelector((state) => state.userData.userDetails);
    const [selectedPriority, setSelectedPriority] = useState("all");
    const [loading, setLoading] = useState(false);
    const [ticketList, setTicketList] = useState([]);
    const [ticketStats, setTicketStats] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedStatusType, setSelectedStatusType] = useState("all");
    const [selectedAgentType, setSelectedAgentType] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [agentList, setAgentList] = useState([]);
    const [categoryList, setCategoryList] = useState([]);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatusType(statusKey || 'all');
        setPage(1);
    }, []);

    const fetchData = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();

        if (selectedStatusType !== 'all') params.set('status', selectedStatusType);
        if (selectedPriority !== 'all') params.set('priority', selectedPriority);

        if (selectedAgentType !== 'all') params.set('assignedTo', String(selectedAgentType));

        params.set('paginate', true);
        params.set('page', String(page));
        params.set('limit', String(rowsPerPage));

        const q = searchQuery.trim();
        if (q) params.set('keyword', q);

        if (selectedCategory !== 'all') params.set('category', selectedCategory);

        getRequestWithOutBody(`${baseURl}ticket?${params.toString()}`, accessToken)
            .then(result => {
                setTicketStats(extractTicketStats(result));

                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.totalCount ??
                    apiData?.total ??
                    apiData?.count ??
                    apiData?.data?.totalRecords ??
                    apiData?.data?.totalCount ??
                    apiData?.data?.total ??
                    apiData?.data?.count ??
                    result?.totalRecords ??
                    0;

                setTicketList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setLoading(false);
            })
            .catch(() => {
                setTicketList([]);
                setTicketStats(null);
                setTotalCount(0);
                setLoading(false);
            });
    }, [accessToken, selectedStatusType, selectedPriority, selectedAgentType, selectedCategory, searchQuery, page, rowsPerPage]);

    const fetchData2 = useCallback(() => {
        getRequestWithOutBody(
            `${baseURl}user?roleTitle=developer`, accessToken
        )
            .then(result => {
                setAgentList(result?.data?.results);
                getRequestWithOutBody(
                    `${baseURl}category`, accessToken
                )
                    .then(result => {
                        let filteredCategories = result?.data;
                        if (userData?.roleTitle !== "Admin" && userData?.roleTitle !== "Human Resource") {
                            filteredCategories = filteredCategories.filter(category =>
                                categoryScope.includes(category.title)
                            );
                        }
                        setCategoryList(filteredCategories);
                    })
                    .catch(() => {});
            })
            .catch(() => {});
    }, [accessToken, userData?.roleTitle, categoryScope]);

    const refreshPageData = useCallback(() => {
        fetchData();
        fetchData2();
    }, [fetchData, fetchData2]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        refreshPageData();
    }, [location.key, refreshPageData]);

    useEffect(() => {
        const handleFocus = () => refreshPageData();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshPageData();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshPageData]);

    useEffect(() => {
        const safeDecode = (value) => {
            try {
                return decodeURIComponent(value);
            } catch {
                return value;
            }
        };
        const pathSegments = location.pathname.split('/').filter(segment => segment);
        const filterSegments = pathSegments.slice(pathSegments.findIndex(seg => seg === 'agentsTickets') + 1);

        let i = 0;
        while (i < filterSegments.length) {
            const segment = filterSegments[i];
            const nextSegment = filterSegments[i + 1];

            if (segment === 'status' && nextSegment) {
                setSelectedStatusType(nextSegment);
                i += 2;
            } else if (segment === 'priority' && nextSegment) {
                setSelectedPriority(nextSegment);
                i += 2;
            } else if (segment === 'category' && nextSegment) {
                setSelectedCategory(safeDecode(nextSegment));
                i += 2;
            } else if (segment === 'agent' && nextSegment) {
                setSelectedAgentType(nextSegment);
                i += 2;
            } else if (segment === 'search' && nextSegment) {
                const searchValue = safeDecode(nextSegment);
                setSearchQuery(searchValue);
                setSearchInput(searchValue);
                i += 2;
            } else if (segment === 'page' && nextSegment) {
                setPage(parseInt(nextSegment) || 1);
                i += 2;
            } else if (segment === 'limit' && nextSegment) {
                setRowsPerPage(parseInt(nextSegment) || 25);
                i += 2;
            } else {
                i += 1;
            }
        }
    }, [location.pathname]);

    useEffect(() => {
        // A link with filters in the URL (e.g. from the dashboard) wins over saved filters.
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const hasUrlFilters = pathSegments.length > pathSegments.indexOf('agentsTickets') + 1;
        if (hasUrlFilters || location.state?.heading || location.state?.category) return;
        try {
            const saved = JSON.parse(localStorage.getItem(AGENTS_TICKETS_FILTERS_KEY) || '{}');

            if (saved && typeof saved === 'object') {
                if (typeof saved.selectedPriority === 'string') setSelectedPriority(saved.selectedPriority);
                if (typeof saved.selectedStatusType === 'string') setSelectedStatusType(saved.selectedStatusType);
                if (typeof saved.selectedCategory === 'string') setSelectedCategory(saved.selectedCategory);
                if (typeof saved.selectedAgentType === 'string') setSelectedAgentType(saved.selectedAgentType);
                if (typeof saved.searchQuery === 'string') {
                    setSearchQuery(saved.searchQuery);
                    setSearchInput(saved.searchQuery);
                }
            }
        } catch (e) {
            // ignore invalid saved state
        }
        // Mount only: restore saved filters once, unless the URL already carries some.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (location.state?.heading) {
            switch (location.state.heading) {
                case "Complete Ticket":
                    setSelectedStatusType("complete");
                    break;
                case "New Ticket Request":
                    setSelectedStatusType("pending");
                    break;
                case "In Progress Ticket":
                    setSelectedStatusType("in-progress");
                    break;
                default:
                    setSelectedStatusType("all");
            }
        }

        if (location.state?.category) {
            setSelectedCategory(location.state.category.categoryTitle);
        }
    }, [location.state]);

    useEffect(() => {
        const pathSegments = ['/home', 'agentsTickets'];

        if (selectedStatusType !== 'all') pathSegments.push('status', selectedStatusType);
        if (selectedPriority !== 'all') pathSegments.push('priority', selectedPriority);
        if (selectedCategory !== 'all') pathSegments.push('category', selectedCategory);
        if (selectedAgentType !== 'all') pathSegments.push('agent', selectedAgentType);
        if (searchQuery) pathSegments.push('search', searchQuery);
        if (page > 1) pathSegments.push('page', String(page));
        if (rowsPerPage !== 25) pathSegments.push('limit', String(rowsPerPage));

        const newPath = pathSegments.join('/');

        if (newPath !== location.pathname) {
            navigate(newPath, { replace: true });
        }
    }, [selectedStatusType, selectedPriority, selectedCategory, selectedAgentType, searchQuery, page, rowsPerPage, location.pathname, navigate]);

    useEffect(() => {
        const payload = {
            selectedPriority,
            selectedStatusType,
            selectedCategory,
            selectedAgentType,
            searchQuery,
        };
        localStorage.setItem(AGENTS_TICKETS_FILTERS_KEY, JSON.stringify(payload));
    }, [selectedPriority, selectedStatusType, selectedCategory, selectedAgentType, searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [selectedPriority, selectedStatusType, selectedCategory, selectedAgentType, searchQuery]);

    const handleButtonClick = () => {
        navigate('/home/addTickets');
    };

    const handleClearFilters = () => {
        setSelectedStatusType('all');
        setSelectedPriority('all');
        setSelectedCategory('all');
        setSelectedAgentType('all');
        setSearchInput('');
        setSearchQuery('');
        setPage(1);
    };

    const handleApplyFilters = useCallback(() => {
        setSearchQuery(searchInput.trim());
        setPage(1);
    }, [searchInput]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (searchQuery) chips.push({ key: 'search', label: `Search: ${searchQuery}` });
        if (selectedStatusType && selectedStatusType !== 'all') {
            chips.push({
                key: 'status',
                label: `Status: ${
                    TICKET_STATUS_TABS.find((tab) => tab.id === selectedStatusType)?.label ||
                    selectedStatusType
                }`,
            });
        }
        if (selectedPriority && selectedPriority !== 'all') {
            chips.push({
                key: 'priority',
                label: `Priority: ${selectedPriority.charAt(0).toUpperCase()}${selectedPriority.slice(1)}`,
            });
        }
        if (selectedCategory && selectedCategory !== 'all') {
            chips.push({ key: 'category', label: `Category: ${selectedCategory}` });
        }
        if (selectedAgentType && selectedAgentType !== 'all') {
            const agent = (Array.isArray(agentList) ? agentList : []).find(
                (a) => String(a?.id) === String(selectedAgentType)
            );
            const agentLabel = agent?.name || agent?.username || selectedAgentType;
            chips.push({ key: 'agent', label: `Agent: ${agentLabel}` });
        }
        return chips;
    }, [searchQuery, selectedStatusType, selectedPriority, selectedCategory, selectedAgentType, agentList]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') {
            setSearchInput('');
            setSearchQuery('');
        }
        if (key === 'status') setSelectedStatusType('all');
        if (key === 'priority') setSelectedPriority('all');
        if (key === 'category') setSelectedCategory('all');
        if (key === 'agent') setSelectedAgentType('all');
        setPage(1);
    }, []);

    const getStatusCount = useCallback((countKey) => {
        if (!ticketStats) return '—';
        return String(getTicketStatCount(ticketStats, countKey));
    }, [ticketStats]);

    const activeTabLabel = useMemo(
        () => TICKET_STATUS_TABS.find((tab) => tab.id === selectedStatusType)?.label || 'All Tickets',
        [selectedStatusType]
    );

    const statusOptions = TICKET_STATUS_FILTERS.map((status) => ({
        label: status.title,
        value: status.key,
    }));

    const priorityOptions = [
        { label: 'All', value: 'all' },
        { label: 'Low', value: 'low' },
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' },
    ];

    const categoryOptions = [
        { label: 'All', value: 'all' },
        ...categoryList.map(category => ({
            label: category.title,
            value: category.title,
        })),
    ];

    const agentOptions = [
        { label: 'All', value: 'all' },
        ...(Array.isArray(agentList) ? agentList : []).map((a) => ({
            label: a?.name || a?.username || '-',
            value: a?.id,
        })),
    ];

    const columns = [
        { id: 'id', label: 'Ticket No', align: 'center' },
        { id: 'category.title', label: 'Category', align: 'center' },
        { id: 'title', label: 'Title', align: 'center' },
        { id: 'priority', label: 'Priority', align: 'center' },
        { id: 'assignee?.name', label: 'Assigned To', align: 'center' },
        { id: 'status', label: 'Status', align: 'center' },
        { id: 'details', label: 'Details', align: 'center' },
    ];

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Internal Tickets`}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={'#0C79F7'}
                    icon={addIcon}
                    title={'Create Tickets'}
                    height={40}
                    color={'var(--sidebar-text-selected)'}
                    fontSize={16}
                    fontWeight={500}
                    className="!mb-0 !mx-0"
                    onClick={handleButtonClick}
                />
            </HeaderWrapper>

            <StageCardsWrapper>
                {TICKET_STATUS_FILTERS.map((status) => {
                    const isSelected = selectedStatusType === status.key;
                    return (
                        <StageCardItem
                            key={status.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleStatusFilter(status.key)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleStatusFilter(status.key);
                                }
                            }}
                        >
                            <TaxDashboardBox
                                compact
                                selected={isSelected}
                                title={status.title}
                                amount={getStatusCount(status.countKey)}
                                subtitle={status.subtitle}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-6 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {TICKET_STATUS_TABS.map((tab) => {
                    const isActive = selectedStatusType === tab.id;
                    return (
                        <button
                            key={tab.id}
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
                                {selectedStatusType && selectedStatusType !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={
                                            TICKET_STATUS_TABS.find((tab) => tab.id === selectedStatusType)?.label ||
                                            selectedStatusType
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {searchQuery && <Chip size="small" label={`Search: ${searchQuery}`} variant="outlined" />}
                                {selectedPriority && selectedPriority !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`Priority: ${selectedPriority.charAt(0).toUpperCase()}${selectedPriority.slice(1)}`}
                                        variant="outlined"
                                    />
                                )}
                                {selectedCategory && selectedCategory !== 'all' && (
                                    <Chip size="small" label={`Category: ${selectedCategory}`} variant="outlined" />
                                )}
                                {selectedAgentType && selectedAgentType !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={`Agent: ${
                                            (Array.isArray(agentList) ? agentList : []).find(
                                                (a) => String(a?.id) === String(selectedAgentType)
                                            )?.name || selectedAgentType
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
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleApplyFilters();
                                        }
                                    }}
                                    placeholder="Search tickets..."
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
                                value={selectedStatusType}
                                onChange={handleStatusFilter}
                                options={statusOptions}
                                placeholder="All Statuses"
                                minWidth={160}
                                placeholderValues={["all"]}
                            />

                            <FilterDropdown
                                value={selectedPriority}
                                onChange={setSelectedPriority}
                                options={priorityOptions}
                                placeholder="All Priorities"
                                minWidth={150}
                                placeholderValues={["all"]}
                            />

                            <FilterDropdown
                                value={selectedCategory}
                                onChange={setSelectedCategory}
                                options={categoryOptions}
                                placeholder="All Categories"
                                minWidth={170}
                                placeholderValues={["all"]}
                            />

                            <FilterDropdown
                                value={selectedAgentType}
                                onChange={setSelectedAgentType}
                                options={agentOptions}
                                placeholder="All Agents"
                                minWidth={160}
                                placeholderValues={["all"]}
                                searchable
                                searchPlaceholder="Search agent..."
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
                ) : Array.isArray(ticketList) && ticketList.length === 0 ? (
                    <NoDataFound
                        title="No Data Found"
                        description={`No ${activeTabLabel.toLowerCase()} found.`}
                    />
                ) : (
                    <AgentTicketListTable
                        columns={columns}
                        data={ticketList}
                        allTickets={true}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={setPage}
                        onRowsPerPageChange={(next) => {
                            setRowsPerPage(next);
                            setPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default AgentsTickets;
