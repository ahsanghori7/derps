import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Chip, Collapse, IconButton, Stack, Tooltip } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import Heading from "../../Components/Heading";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import MemoTable from "../../Components/MemoTable";
import { useSelector } from "react-redux";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import { usePageTitle } from "../../Hooks/usePageTitle";
import NewOpportunityModal from "./NewOpportunityModal";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import FilterDropdown from "../../Components/FilterDropdown";
import ViewToggle from "../../Components/ViewToggle";
import CloseIcon from '@mui/icons-material/Close';

const STAGE_FILTERS = [
    { key: 'all', title: 'All Opportunities', subtitle: 'Total opportunities in pipeline' },
    { key: 'qualification', title: 'Qualification', subtitle: 'Opportunities in qualification' },
    { key: 'proposal', title: 'Proposal', subtitle: 'Opportunities in proposal stage' },
    { key: 'quotation', title: 'Quotation', subtitle: 'Opportunities in quotation stage' },
    { key: 'negotiation', title: 'Negotiation', subtitle: 'Opportunities in negotiation' },
    { key: 'closed_won', title: 'Closed Won', subtitle: 'Successfully closed opportunities' },
    { key: 'closed_lost', title: 'Closed Lost', subtitle: 'Lost opportunities' },
];

const OPPORTUNITY_TABS = STAGE_FILTERS.map(({ key, title }) => ({
    id: key,
    label: title,
}));

const BOARD_STAGES = STAGE_FILTERS.filter((stage) => stage.key !== 'all');

const STAGE_HEADER_COLORS = {
    qualification: '#3B82F6',
    proposal: '#F59E0B',
    quotation: '#0EA5E9',
    negotiation: '#8B5CF6',
    closed_won: '#10B981',
    closed_lost: '#EF4444',
};

const STAGE_BG_COLORS = {
    qualification: 'rgba(59, 130, 246, 0.05)',
    proposal: 'rgba(245, 158, 11, 0.05)',
    quotation: 'rgba(14, 165, 233, 0.05)',
    negotiation: 'rgba(139, 92, 246, 0.05)',
    closed_won: 'rgba(16, 185, 129, 0.05)',
    closed_lost: 'rgba(239, 68, 68, 0.05)',
};

const OpportunityBoardColumn = ({ title, tasks, headerColor, backgroundColor, onTaskClick, loading }) => (
    <div
        className="shadow w-56 flex flex-col"
        style={{ backgroundColor, height: 600, minWidth: 224 }}
    >
        <div
            className="text-white font-semibold text-sm px-3 py-2 shrink-0"
            style={{ backgroundColor: headerColor, position: 'sticky', top: 0, zIndex: 1 }}
        >
            {title} ({String(tasks.length).padStart(2, '0')})
        </div>
        <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-0">
            {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="bg-[var(--dashboard-card-bg)] p-2 rounded-md shadow-sm border animate-pulse"
                        style={{ height: 88 }}
                    />
                ))
            ) : tasks.length === 0 ? (
                <p
                    className="text-center py-4"
                    style={{ fontSize: 12, color: 'var(--dashboard-text-secondary)' }}
                >
                    No opportunities
                </p>
            ) : (
                tasks.map((task) => (
                    <div
                        key={task.id}
                        className="bg-[var(--dashboard-card-bg)] p-2 cursor-pointer rounded-md shadow-sm border"
                        onClick={() => onTaskClick(task)}
                    >
                        <Heading
                            Fontweight={700}
                            color="var(--sidebar-text-primary)"
                            Heading={task.opportunityName || task.name || '-'}
                            Fontsize={14}
                        />
                        <p style={{ color: 'var(--dashboard-text-secondary)', fontSize: 12, marginTop: 4 }}>
                            {task.account || '-'}
                        </p>
                        <p style={{ color: 'var(--dashboard-text-secondary)', fontSize: 12, marginTop: 2 }}>
                            {task.contactName || '-'}
                        </p>
                        <div className="flex justify-between items-center mt-2 gap-2">
                            <span style={{ color: 'var(--sidebar-text-primary)', fontSize: 12, fontWeight: 600 }}>
                                {task.amount}
                            </span>
                            <span style={{ color: 'var(--dashboard-text-secondary)', fontSize: 11 }}>
                                {task.closeDate}
                            </span>
                        </div>
                        <p style={{ color: 'var(--dashboard-text-secondary)', fontSize: 11, marginTop: 4 }}>
                            Owner: {task.owner || '-'}
                        </p>
                    </div>
                ))
            )}
        </div>
    </div>
);

const matchesOpportunitySearch = (row, query) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const name = String(row.name || row.opportunityName || '').toLowerCase();
    const stage = String(row.stage || row.status || '').replace(/_/g, ' ').toLowerCase();
    const account = String(row.crmAccount?.name || row.account || '').toLowerCase();

    return name.includes(q) || stage.includes(q) || account.includes(q);
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

const formatCloseDate = (value) => {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
};

const formatAmount = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);
    }
    return String(value);
};

const formatContactName = (contact) => {
    if (!contact || typeof contact !== 'object') return '-';
    const fullName = [contact.firstName, contact.lastName]
        .map((part) => (part == null ? '' : String(part).trim()))
        .filter(Boolean)
        .join(' ');
    return fullName || '-';
};

const parseBoardResponse = (result) => {
    const board = result?.data ?? result;
    if (!board || typeof board !== 'object' || Array.isArray(board)) {
        return { items: [], counts: {} };
    }

    const counts = {};
    const items = Object.entries(board).flatMap(([stageKey, stageItems]) => {
        const list = Array.isArray(stageItems) ? stageItems : [];
        counts[stageKey] = list.length;
        return list;
    });

    return { items, counts };
};

const transformOpportunityRow = (item, index) => ({
    ...item,
    id: item.id ?? index + 1,
    opportunityName: item.name || '-',
    account: item.crmAccount?.name?.trim() || '-',
    contactName: formatContactName(item.contact),
    amount: formatAmount(item.amount),
    closeDate: formatCloseDate(item.closeDate),
    owner: item.agent?.name || item.owner?.name || item.ownerName || (item.ownerId ? `#${item.ownerId}` : '-'),
    status: item.stage || '-',
    action: 'View',
});

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
    flexWrap: 'wrap',
    gap: 10
});

const StageCardsWrapper = styled('div')({
    marginTop: 16,
    marginBottom: 16,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
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
        maxWidth: 'calc(25% - 6px)',
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

const Opportunities = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const authData = useSelector((state) => state.auth);
    const initialViewMode = searchParams.get('view') === 'board' ? 'board' : 'table';
    let accessToken = authData?.accessToken || localStorage.getItem("accessToken") || authData?.token;

    // Ensure token is a plain string, not JSON
    if (typeof accessToken === 'string') {
        try {
            // If it's a JSON string, parse it
            const parsed = JSON.parse(accessToken);
            accessToken = parsed.token || parsed.accessToken || accessToken;
        } catch (e) {
            // It's already a plain string, use as-is
            accessToken = accessToken;
        }
    }

    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get('rowsPerPage')) || 25);
    const [selectedStage, setSelectedStage] = useState(searchParams.get('stage') || 'all');
    const [search, setSearch] = useState(searchParams.get('keyword') || '');
    const [searchDraft, setSearchDraft] = useState(searchParams.get('keyword') || '');
    const [selectedAgent, setSelectedAgent] = useState(searchParams.get('agent') || '');
    const [draftSelectedAgent, setDraftSelectedAgent] = useState(searchParams.get('agent') || '');
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [opportunityData, setOpportunityData] = useState([]);
    const [stageCounts, setStageCounts] = useState({});
    const [isNewOpportunityModalOpen, setIsNewOpportunityModalOpen] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [viewMode, setViewMode] = useState(initialViewMode);

    usePageTitle(viewMode === 'board' ? "Board View" : "All Opportunities", location);

    const fetchOpportunities = useCallback(() => {
        if (!accessToken) return;

        setLoading(true);

        getRequestWithOutBody(`${baseURl}crm-opportunity/board`, accessToken)
            .then((result) => {
                const { items, counts } = parseBoardResponse(result);
                const transformedData = items.map(transformOpportunityRow);
                setOpportunityData(transformedData);
                setStageCounts(counts);
            })
            .catch(() => {
                setOpportunityData([]);
                setStageCounts({});
            })
            .finally(() => {
                setLoading(false);
            });
    }, [accessToken]);

    const fetchUsers = useCallback(() => {
        if (!accessToken) return;

        getRequestWithOutBody(`${baseURl}user`, accessToken)
            .then((result) => {
                const activeUsers = result?.data?.results?.filter((user) => user.status === 'active') || [];
                setUserList(activeUsers);
            })
            .catch(() => {
                setUserList([]);
            });
    }, [accessToken]);

    // Fetch data on component mount
    useEffect(() => {
        fetchOpportunities();
        fetchUsers();
    }, [fetchOpportunities, fetchUsers]);

    const agentOptions = useMemo(() => [
        { label: 'All Agents', value: '' },
        ...userList.map((user) => ({
            label: user.name,
            value: String(user.id),
        })),
    ], [userList]);

    // Update URL parameters when pagination or filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (rowsPerPage !== 25) params.set('rowsPerPage', rowsPerPage.toString());
        if (selectedStage && selectedStage !== 'all') params.set('stage', selectedStage);
        if (search) params.set('keyword', search);
        if (selectedAgent) params.set('agent', selectedAgent);
        if (viewMode === 'board') params.set('view', 'board');
        setSearchParams(params, { replace: true });
    }, [page, rowsPerPage, selectedStage, search, selectedAgent, viewMode, setSearchParams]);

    const filteredData = useMemo(() => {
        return opportunityData.filter((row) => {
            const stage = String(row.stage || row.status || '').toLowerCase();
            const matchesStage = selectedStage === 'all' || stage === selectedStage;
            const matchesAgent = !selectedAgent
                || String(row.agentId || row.ownerId || '') === String(selectedAgent);
            const matchesQuery = matchesOpportunitySearch(row, search);

            return matchesStage && matchesAgent && matchesQuery;
        });
    }, [opportunityData, selectedStage, selectedAgent, search]);

    const boardFilteredData = useMemo(() => {
        return opportunityData.filter((row) => {
            const matchesAgent = !selectedAgent
                || String(row.agentId || row.ownerId || '') === String(selectedAgent);
            const matchesQuery = matchesOpportunitySearch(row, search);
            return matchesAgent && matchesQuery;
        });
    }, [opportunityData, selectedAgent, search]);

    const tasksByStage = useMemo(() => {
        return BOARD_STAGES.reduce((acc, stage) => {
            acc[stage.key] = boardFilteredData.filter((row) => {
                const rowStage = String(row.stage || row.status || '').toLowerCase();
                return rowStage === stage.key;
            });
            return acc;
        }, {});
    }, [boardFilteredData]);

    const totalCount = filteredData.length;

    const paginatedData = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const getStageCount = useCallback((stageKey) => {
        if (stageKey === 'all') {
            return opportunityData.length;
        }
        return stageCounts[stageKey] ?? 0;
    }, [opportunityData.length, stageCounts]);

    const handleStageFilter = (stageKey) => {
        setSelectedStage(stageKey);
        setPage(1);
    };

    const handleApplyFilters = () => {
        setSearch(String(searchDraft || '').trim());
        setSelectedAgent(draftSelectedAgent);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchDraft('');
        setSearch('');
        setDraftSelectedAgent('');
        setSelectedAgent('');
        setPage(1);
    };

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (search) chips.push({ key: 'search', label: `Search: ${search}` });
        if (selectedAgent) {
            const agentName = userList.find((u) => String(u.id) === String(selectedAgent))?.name || selectedAgent;
            chips.push({ key: 'agent', label: `Agent: ${agentName}` });
        }
        return chips;
    }, [search, selectedAgent, userList]);

    const removeFilterChip = (key) => {
        if (key === 'search') {
            setSearch('');
            setSearchDraft('');
        }
        if (key === 'agent') {
            setSelectedAgent('');
            setDraftSelectedAgent('');
        }
        setPage(1);
    };

    // Table columns configuration
    const columns = [
        { id: 'opportunityName', label: 'Opportunity Name', align: 'center' },
        { id: 'account', label: 'Account', align: 'center' },
        { id: 'contactName', label: 'Name', align: 'center' },
        { id: 'amount', label: 'Amount', align: 'center' },
        { id: 'closeDate', label: 'Close Date', align: 'center' },
        { id: 'owner', label: 'Owner', align: 'center' },
        {
            id: 'status',
            label: 'Status',
            align: 'center',
            format: (value) => {
                let color = '#000000';
                let backgroundColor = '#FFFFFF';
                let fontWeight = 'normal';

                switch (value?.toLowerCase()) {
                    case 'prospecting':
                        color = '#6366F1';
                        backgroundColor = '#E0E7FF';
                        fontWeight = '600';
                        break;
                    case 'qualification':
                    case 'qualified':
                        color = '#3B82F6'; // Blue
                        backgroundColor = '#DBEAFE';
                        fontWeight = '600';
                        break;
                    case 'proposal':
                        color = '#F59E0B'; // Yellow/amber
                        backgroundColor = '#FEF3C7';
                        fontWeight = '600';
                        break;
                    case 'quotation':
                        color = '#0EA5E9';
                        backgroundColor = '#E0F2FE';
                        fontWeight = '600';
                        break;
                    case 'negotiation':
                        color = '#8B5CF6'; // Purple
                        backgroundColor = '#EDE9FE';
                        fontWeight = '600';
                        break;
                    case 'closed_won':
                        color = '#10B981'; // Green
                        backgroundColor = '#D1FAE5';
                        fontWeight = '600';
                        break;
                    case 'closed_lost':
                        color = '#EF4444'; // Red
                        backgroundColor = '#FEE2E2';
                        fontWeight = '600';
                        break;
                    case 'open':
                        color = '#6B7280'; // Gray
                        backgroundColor = '#F3F4F6';
                        fontWeight = '600';
                        break;
                    default:
                        color = '#6B7280'; // Gray for unknown
                        backgroundColor = '#F3F4F6';
                }

                return (
                    <span
                        style={{
                            color: color,
                            backgroundColor: backgroundColor,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: fontWeight,
                            display: 'inline-block',
                            textTransform: 'capitalize',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {value?.replace(/_/g, ' ') || value}
                    </span>
                );
            }
        },
        {
            id: 'action',
            label: 'Action',
            align: 'center',
            format: (value) => {
                return (
                    <span
                        style={{
                            color: '#3B82F6',
                            fontWeight: '500',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '14px'
                        }}
                    >
                        View
                    </span>
                );
            }
        },
    ];

    const handleNewOpportunity = () => {
        setIsNewOpportunityModalOpen(true);
    };

    const handleNewOpportunityNext = (recordType) => {
        setIsNewOpportunityModalOpen(false);
        navigate("/home/opportunities/new", { state: { recordType } });
    };

    const handleActionClick = (row) => {
        // Handle action click (view details)
        navigate(`/home/opportunities/${row.id}`, { state: { opportunity: row } });
    };

    const handleRowClick = (event, row) => {
        // Check for CMD/CTRL+click to open in new tab
        if (event && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            event.stopPropagation();
            const opportunityUrl = `/home/opportunities/${row.id}`;
            window.open(opportunityUrl, '_blank');
        } else {
            navigate(`/home/opportunities/${row.id}`, { state: { opportunity: row } });
        }
    };

    const handleBoardTaskClick = (row) => {
        navigate(`/home/opportunities/${row.id}`, { state: { opportunity: row } });
    };

    const handleViewModeChange = (mode) => {
        const nextMode = mode === 'grid' ? 'board' : 'table';
        setViewMode(nextMode);
        if (nextMode === 'board') {
            setSelectedStage('all');
            setPage(1);
        }
    };

    const isBoardView = viewMode === 'board';

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ flex: 1 }}>
                <HeaderWrapper>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Heading
                            Fontweight={700}
                            color={'var(--sidebar-text-primary)'}
                            Heading={`All Opportunities (${boardFilteredData.length})`}
                            Fontsize={30}
                        />
                        {/* {isBoardView && (
                            <span
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: 'var(--dashboard-text-secondary)',
                                }}
                            >
                                Total: 
                            </span>
                        )} */}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ViewToggle
                            value={isBoardView ? 'grid' : 'table'}
                            onChange={handleViewModeChange}
                        />
                        <BottonWithIcon
                            backgroundColor={'#0C79F7'}
                            icon={addIcon}
                            title={'New Opportunity'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleNewOpportunity}
                        />
                    </div>
                </HeaderWrapper>
            </div>

            {!isBoardView && (
                <StageCardsWrapper>
                    {STAGE_FILTERS.map((stage) => {
                        const isSelected = selectedStage === stage.key;
                        return (
                            <StageCardItem
                                key={stage.key}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleStageFilter(stage.key)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleStageFilter(stage.key);
                                    }
                                }}
                            >
                                <TaxDashboardBox
                                    compact
                                    selected={isSelected}
                                    title={stage.title}
                                    amount={String(getStageCount(stage.key))}
                                    subtitle={stage.subtitle}
                                />
                            </StageCardItem>
                        );
                    })}
                </StageCardsWrapper>
            )}

            {!isBoardView && (
                <div
                    className="flex gap-6 flex-wrap mt-2"
                    style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
                >
                    {OPPORTUNITY_TABS.map((tab) => {
                        const isActive = selectedStage === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleStageFilter(tab.id)}
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
            )}

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
                        background: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)',
                        '&:hover': {
                            background: 'linear-gradient(180deg, rgba(241,245,249,0.95) 0%, rgba(248,250,252,0.95) 100%)',
                        },
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <TuneIcon fontSize="small" />
                        <Box sx={{ fontWeight: 700, fontSize: 14 }}>Filters</Box>
                        {!filtersExpanded && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                {selectedStage !== 'all' && (
                                    <Chip
                                        size="small"
                                        label={STAGE_FILTERS.find((s) => s.key === selectedStage)?.title || selectedStage}
                                        variant="outlined"
                                    />
                                )}
                                {search && (
                                    <Chip size="small" label={`Search: ${search}`} variant="outlined" />
                                )}
                                {selectedAgent && (
                                    <Chip
                                        size="small"
                                        label={`Agent: ${userList.find((u) => String(u.id) === String(selectedAgent))?.name || selectedAgent}`}
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
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--chrome-search-icon)" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleApplyFilters();
                                    }}
                                    placeholder="Search by name, stage, account..."
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
                                value={draftSelectedAgent}
                                onChange={setDraftSelectedAgent}
                                options={agentOptions}
                                placeholder="All Agents"
                                minWidth={180}
                                placeholderValues={['']}
                                searchable
                                searchPlaceholder="Search agents..."
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

            <div className="w-[100%]" style={{ borderRadius: 14, padding: isBoardView ? '10px 0 0' : 20 }}>
                {isBoardView ? (
                    loading ? (
                        <div className="text-center w-full mx-auto py-8">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : boardFilteredData.length === 0 ? (
                        <NoDataFound
                            title="No Data Found"
                            description={
                                search || selectedAgent
                                    ? 'No opportunities match your filters.'
                                    : 'No opportunities found.'
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto mt-1">
                            <div className="flex pb-2 gap-4 w-max">
                                {BOARD_STAGES.map((stage) => (
                                    <OpportunityBoardColumn
                                        key={stage.key}
                                        title={stage.title}
                                        tasks={tasksByStage[stage.key] || []}
                                        headerColor={STAGE_HEADER_COLORS[stage.key]}
                                        backgroundColor={STAGE_BG_COLORS[stage.key]}
                                        onTaskClick={handleBoardTaskClick}
                                        loading={loading}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    <div>
                        {loading ? (
                            <div className="text-center w-full mx-auto py-8">
                                <Loader message="Loading..." subMessage="Please wait" />
                            </div>
                        ) : filteredData?.length === 0 ? (
                            <NoDataFound
                                title="No Data Found"
                                description={
                                    search || selectedAgent
                                        ? 'No opportunities match your filters.'
                                        : selectedStage === 'all'
                                            ? 'No opportunities found.'
                                            : `No opportunities found in ${STAGE_FILTERS.find((s) => s.key === selectedStage)?.title || selectedStage}.`
                                }
                            />
                        ) : (
                            <MemoTable
                                data={paginatedData}
                                columns={columns}
                                onActionClick={handleActionClick}
                                onRowClick={handleRowClick}
                                disableRowClick={false}
                                opportunitiesTable={true}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                totalCount={totalCount}
                                onPageChange={setPage}
                                onRowsPerPageChange={(newRows) => {
                                    setRowsPerPage(newRows);
                                    setPage(1);
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            <NewOpportunityModal
                isOpen={isNewOpportunityModalOpen}
                onClose={() => setIsNewOpportunityModalOpen(false)}
                onNext={handleNewOpportunityNext}
            />
        </div>
    );
};

export default Opportunities;
