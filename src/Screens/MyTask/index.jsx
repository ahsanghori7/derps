import Heading from "../../Components/Heading";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { styled } from '@mui/material/styles';
import {
    Box,
    Chip,
    Collapse,
    IconButton,
    Stack,
    Tooltip,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import TaskTable from "../../Components/TaskTable";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import FilterDropdown from "../../Components/FilterDropdown";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import { usePageTitle } from "../../Hooks/usePageTitle";

const parseMyTaskPath = (pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    const myTaskIdx = segments.findIndex(seg => seg === 'myTask');
    const result = { page: 1, rowsPerPage: 25, searchText: '', statusFilter: '', projectFilter: '' };
    if (myTaskIdx === -1) return result;
    for (let i = myTaskIdx + 1; i < segments.length - 1; i += 2) {
        const key = segments[i], val = segments[i + 1];
        if (key === 'page') result.page = parseInt(val) || 1;
        else if (key === 'rowsPerPage') result.rowsPerPage = parseInt(val) || 25;
        else if (key === 'search') result.searchText = decodeURIComponent(val);
        else if (key === 'status') result.statusFilter = val === 'all' ? '' : decodeURIComponent(val);
        else if (key === 'project') result.projectFilter = val === 'all' ? '' : decodeURIComponent(val);
    }
    return result;
};

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

const TASK_STATUS_FILTERS = [
    { key: '', title: 'All Tasks', subtitle: 'All status total', countKey: 'total' },
    { key: 'Pending', title: 'Pending', subtitle: 'Pending tasks', countKey: 'pending' },
    { key: 'In Progress', title: 'In Progress', subtitle: 'In progress tasks', countKey: 'inProgress' },
    { key: 'On Hold', title: 'On Hold', subtitle: 'On hold tasks', countKey: 'onHold' },
    { key: 'Completed', title: 'Completed', subtitle: 'Completed tasks', countKey: 'completed' },
    { key: 'Cancelled', title: 'Cancelled', subtitle: 'Cancelled tasks', countKey: 'cancelled' },
    { key: 'Ready for QA', title: 'Ready for QA', subtitle: 'Ready for QA', countKey: 'readyForQA' },
    { key: 'Ready for Approval', title: 'Ready for Approval', subtitle: 'Ready for approval', countKey: 'readyApproval' },
    { key: 'UI Completed', title: 'UI Completed', subtitle: 'UI completed tasks', countKey: 'uiCompleted' },
    { key: 'API Completed', title: 'API Completed', subtitle: 'API completed tasks', countKey: 'apiCompleted' },
    { key: 'Failed QA', title: 'Failed QA', subtitle: 'Failed QA tasks', countKey: 'failedQA' },
    { key: 'QA Succeeded', title: 'QA Succeeded', subtitle: 'QA succeeded tasks', countKey: 'qaSucceed' },
    { key: 'Ready For Deployment', title: 'Ready For Deployment', subtitle: 'Ready for deployment', countKey: 'readyForDeployment' },
    { key: 'QA In Progress', title: 'QA In Progress', subtitle: 'QA in progress tasks', countKey: 'qaInProgress' },
    { key: 'Deployment Completed', title: 'Deployment Completed', subtitle: 'Deployment completed tasks', countKey: 'deploymentCompleted' },
];

const extractTaskStats = (result) => {
    if (!result || typeof result !== 'object') return null;

    const payload = result?.data && typeof result.data === 'object' ? result.data : {};
    const source = { ...payload, ...result };

    const pending = Number(source.totalPendingStatusCount) || 0;
    const inProgress = Number(source.totalInProgressStatusCount) || 0;
    const onHold = Number(source.totalOnHoldStatusCount) || 0;
    const completed = Number(source.totalCompletedStatusCount) || 0;
    const cancelled = Number(source.totalCancelledStatusCount) || 0;
    const readyForQA = Number(source.totalReadyForQAStatusCount) || 0;
    const readyApproval = Number(source.totalReadyApprovalCount) || 0;
    const uiCompleted = Number(source.totalUiCompletedStatusCount) || 0;
    const apiCompleted = Number(source.totalApiComletedCount ?? source.totalApiCompletedCount) || 0;
    const failedQA = Number(source.totalFailedQAStatusCount) || 0;
    const qaSucceed = Number(source.totalQaSucceedStatusCount) || 0;
    const readyForDeployment = Number(source.totalReadyForDeploymentCount) || 0;
    const qaInProgress = Number(source.totalQaInProgressCount) || 0;
    const deploymentCompleted = Number(source.totalDeploymentCompletedCount) || 0;

    return {
        total: pending + inProgress + onHold + completed + cancelled + readyForQA + readyApproval + uiCompleted + apiCompleted + failedQA + qaSucceed + readyForDeployment + qaInProgress + deploymentCompleted,
        pending,
        inProgress,
        onHold,
        completed,
        cancelled,
        readyForQA,
        readyApproval,
        uiCompleted,
        apiCompleted,
        failedQA,
        qaSucceed,
        readyForDeployment,
        qaInProgress,
        deploymentCompleted,
    };
};

const getTaskStatCount = (stats, countKey) => {
    if (!stats) return 0;
    return Number(stats[countKey]) || 0;
};

const MyTask = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const navigate = useNavigate();
    const location = useLocation();

    usePageTitle("Assigned Tasks", location);

    const initialPath = parseMyTaskPath(location.pathname);
    const [loading, setLoading] = useState(false);
    const [projectDetail, setProjectDetail] = useState([]);
    const [taskList, setTaskList] = useState([]);
    const [taskStats, setTaskStats] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [searchText, setSearchText] = useState(initialPath.searchText);
    const [searchDraft, setSearchDraft] = useState(initialPath.searchText);
    const [statusFilter, setStatusFilter] = useState(initialPath.statusFilter);
    const [projectFilter, setProjectFilter] = useState(initialPath.projectFilter);
    const [projects, setProjects] = useState([]);
    const [page, setPage] = useState(initialPath.page);
    const [rowsPerPage, setRowsPerPage] = useState(initialPath.rowsPerPage);
    const [totalTasks, setTotalTasks] = useState(0);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const internalNavRef = useRef(false);

    useEffect(() => {
        if (internalNavRef.current) {
            internalNavRef.current = false;
            return;
        }
        if (!location.pathname.includes('/myTask')) return;
        const parsed = parseMyTaskPath(location.pathname);
        setPage(parsed.page);
        setRowsPerPage(parsed.rowsPerPage);
        setSearchText(parsed.searchText);
        setSearchDraft(parsed.searchText);
        setStatusFilter(parsed.statusFilter);
        setProjectFilter(parsed.projectFilter);
    }, [location.pathname]);

    useEffect(() => {
        if (!location.pathname.includes('/myTask')) return;
        const pathSegments = ['/home', 'myTask'];
        pathSegments.push('page', String(page));
        pathSegments.push('rowsPerPage', String(rowsPerPage));
        if (searchText) pathSegments.push('search', searchText);
        if (statusFilter) pathSegments.push('status', statusFilter);
        if (projectFilter) pathSegments.push('project', projectFilter);
        const newPath = pathSegments.join('/');
        if (newPath !== location.pathname) {
            internalNavRef.current = true;
            navigate(newPath, { replace: true });
        }
    }, [searchText, statusFilter, projectFilter, page, rowsPerPage, location.pathname, navigate]);

    const fetchData3 = useCallback((pageNum = 1, limit = 25, overrides = {}) => {
        if (!userData?.id || !accessToken) return;

        setLoading(true);
        const keyword = overrides.keyword !== undefined ? overrides.keyword : searchText;
        const status = overrides.status !== undefined ? overrides.status : statusFilter;
        const projectId = overrides.projectId !== undefined ? overrides.projectId : projectFilter;
        const searchParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
        const statusParam = status ? `&status=${encodeURIComponent(status)}` : "";
        const projectParam = projectId ? `&projectId=${projectId}` : "";

        getRequestWithOutBody(
            `${baseURl}subtask/all/?userId=${userData.id}&paginate=true&limit=${limit}&page=${pageNum}&orderBy=createdAt&order=desc${searchParam}${statusParam}${projectParam}`,
            accessToken
        )
            .then(result => {
                setTaskStats(extractTaskStats(result));
                setTaskList(result?.data?.data || []);
                setTotalTasks(result?.data?.totalRecords || 0);
                setLoading(false);
            })
            .catch(() => {
                setTaskList([]);
                setTaskStats(null);
                setTotalTasks(0);
                setLoading(false);
            });
    }, [accessToken, userData?.id, searchText, statusFilter, projectFilter]);

    const fetchProjects = useCallback(() => {
        if (!userData?.id || !accessToken) return;

        let api = "";
        if (userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") {
            api = `${baseURl}project`;
        } else {
            api = `${baseURl}project?userId=${userData.id}`;
        }
        getRequestWithOutBody(api, accessToken)
            .then((result) => {
                setProjects(result?.data || []);
            })
            .catch(() => {
                setProjects([]);
            });
    }, [accessToken, userData?.id, userData?.roleTitle]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        fetchData3(page, rowsPerPage);
    }, [fetchData3, page, rowsPerPage, selectedTask, projectDetail]);

    const handleStatusFilter = useCallback((statusKey) => {
        setStatusFilter(statusKey || '');
        setPage(1);
    }, []);

    const handleClearFilters = useCallback(() => {
        setSearchText('');
        setSearchDraft('');
        setStatusFilter('');
        setProjectFilter('');
        setPage(1);
        fetchData3(1, rowsPerPage, { keyword: '', status: '', projectId: '' });
    }, [fetchData3, rowsPerPage]);

    const handleApplyFilters = useCallback(() => {
        setSearchText(String(searchDraft || '').trim());
        setPage(1);
    }, [searchDraft]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (searchText) chips.push({ key: 'search', label: `Search: ${searchText}` });
        if (statusFilter) {
            chips.push({
                key: 'status',
                label: `Status: ${
                    TASK_STATUS_FILTERS.find((s) => s.key === statusFilter)?.title || statusFilter
                }`,
            });
        }
        if (projectFilter) {
            const projectName =
                projects.find((p) => String(p.id) === String(projectFilter))?.name || projectFilter;
            chips.push({ key: 'project', label: `Project: ${projectName}` });
        }
        return chips;
    }, [searchText, statusFilter, projectFilter, projects]);

    const removeFilterChip = useCallback((key) => {
        if (key === 'search') {
            setSearchText('');
            setSearchDraft('');
        }
        if (key === 'status') setStatusFilter('');
        if (key === 'project') setProjectFilter('');
        setPage(1);
    }, []);

    const getStatusCount = useCallback((countKey) => {
        if (!taskStats) return '—';
        return String(getTaskStatCount(taskStats, countKey));
    }, [taskStats]);

    const visibleStatusFilters = useMemo(() => {
        return TASK_STATUS_FILTERS.filter((status) => {
            if (status.key === '') return true;
            if (!taskStats) return false;
            return getTaskStatCount(taskStats, status.countKey) > 0;
        });
    }, [taskStats]);

    const visibleStatusTabs = useMemo(
        () => visibleStatusFilters.map(({ key, title }) => ({ id: key, label: title })),
        [visibleStatusFilters]
    );

    const activeTabLabel = useMemo(
        () => TASK_STATUS_FILTERS.find((tab) => tab.key === statusFilter)?.title || 'All Tasks',
        [statusFilter]
    );

    const statusOptions = [
        { label: 'All', value: 'all' },
        { label: 'On Hold', value: 'On Hold' },
        { label: 'Pending', value: 'Pending' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' },
        { label: 'Not Completed', value: 'not-completed' },
        { label: 'Ready for QA', value: 'Ready for QA' },
        { label: 'Ready for Approval', value: 'Ready for Approval' },
        { label: 'UI Completed', value: 'UI Completed' },
        { label: 'API Completed', value: 'API Completed' },
        { label: 'Failed QA', value: 'Failed QA' },
        { label: 'QA Succeeded', value: 'QA Succeeded' },
        { label: 'Ready For Deployment', value: 'Ready For Deployment' },
        { label: 'QA In Progress', value: 'QA In Progress' },
        { label: 'Deployment Completed', value: 'Deployment Completed' },
    ];

    const columns = [
        { id: 'id', label: 'Ticket No', align: 'center' },
        { id: 'title', label: 'Title', align: 'center' },
        { id: 'project', label: 'Project', align: 'center' },
        { id: 'endDate', label: 'Due Date', align: 'center' },
        { id: 'priority', label: 'Priority', align: 'center' },
        { id: 'status', label: 'STATUS', align: 'center' },
    ];

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Welcome ${userData?.username || ''}`}
                    Fontsize={30}
                />
            </HeaderWrapper>

            <StageCardsWrapper>
                {visibleStatusFilters.map((status) => {
                    const isSelected = (statusFilter || '') === status.key;
                    return (
                        <StageCardItem
                            key={status.key || 'all'}
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
                className="flex gap-4 flex-wrap mt-2"
                style={{ borderBottom: '1px solid var(--dashboard-box-border)' }}
            >
                {visibleStatusTabs.map((tab) => {
                    const isActive = (statusFilter || '') === tab.id;
                    return (
                        <button
                            key={tab.id || 'all'}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id)}
                            className="pb-3 px-1"
                            style={{
                                fontSize: 13,
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
                                {statusFilter && (
                                    <Chip
                                        size="small"
                                        label={
                                            TASK_STATUS_FILTERS.find((s) => s.key === statusFilter)?.title ||
                                            statusFilter
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {searchText && <Chip size="small" label={`Search: ${searchText}`} variant="outlined" />}
                                {projectFilter && (
                                    <Chip
                                        size="small"
                                        label={`Project: ${
                                            projects.find((p) => String(p.id) === String(projectFilter))?.name ||
                                            projectFilter
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
                                    value={searchDraft}
                                    onChange={(e) => setSearchDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleApplyFilters();
                                        }
                                    }}
                                    placeholder="Search by title or ticket number..."
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
                                value={statusFilter || 'all'}
                                onChange={(next) => {
                                    handleStatusFilter(next === 'all' ? '' : next);
                                }}
                                options={statusOptions}
                                placeholder="All Statuses"
                                minWidth={170}
                                placeholderValues={["all"]}
                                searchable
                                searchPlaceholder="Search status..."
                            />

                            <FilterDropdown
                                value={projectFilter || 'all'}
                                onChange={(next) => {
                                    setProjectFilter(next === 'all' ? '' : next);
                                    setPage(1);
                                }}
                                options={[
                                    { label: 'All Projects', value: 'all' },
                                    ...projects.map((project) => ({
                                        label: project.name,
                                        value: project.id.toString(),
                                    })),
                                ]}
                                placeholder="All Projects"
                                minWidth={170}
                                placeholderValues={["all"]}
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
                ) : taskList && taskList.length > 0 ? (
                    <TaskTable
                        tasks={taskList}
                        columns={columns}
                        myTask={true}
                        page={page}
                        setPage={setPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalTasks={totalTasks}
                    />
                ) : (
                    <NoDataFound
                        title="No Data Found"
                        description={`No ${activeTabLabel.toLowerCase()} found.`}
                    />
                )}
            </div>
        </div>
    );
};

export default MyTask;
