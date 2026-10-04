
import Heading from "../../Components/Heading";
import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import FilterDropdown from "../../Components/FilterDropdown";
import { Dialog, Transition } from "@headlessui/react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { setTaskDetailSidebarRoute } from "../../Utils/taskDetailSidebarRoute";
import { toast } from "react-toastify";
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

const HeaderWrapper = styled("div")({
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    flexWrap: "wrap",
    gap: 10,
});

const slugify = (str) =>
    String(str)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const idFromSlug = (slug) => {
    if (!slug || slug === 'all') return null;
    const parts = slug.split('-');
    const id = parts[parts.length - 1];
    return /^\d+$/.test(id) ? id : slug;
};

// Status values used in the dropdown — kept here so the URL slug map stays in sync.
const TRACKING_STATUSES = [
    'On Hold', 'Pending', 'In Progress', 'Completed', 'not-completed',
    'Ready for QA', 'Ready for Approval', 'UI Completed', 'API Completed', 'Failed QA',
    'Ready For Deployment', 'QA In Progress', 'Deployment Completed',
];
// slug → original value, e.g. 'in-progress' → 'In Progress'
const STATUS_BY_SLUG = Object.fromEntries(TRACKING_STATUSES.map(s => [slugify(s), s]));

const parseTrackingFilters = (pathname) => {
    const segs = pathname.split('/').filter(Boolean);
    const base = segs.indexOf('trackingReports');
    const result = { agent: null, project: null, status: '', page: 1, limit: 25 };
    if (base === -1) return result;
    const rest = segs.slice(base + 1);
    for (let i = 0; i + 1 < rest.length; i += 2) {
        const k = rest[i], v = rest[i + 1];
        if (k === 'agent') result.agent = idFromSlug(v);
        else if (k === 'project') result.project = idFromSlug(v);
        else if (k === 'status') result.status = v === 'all' ? '' : (STATUS_BY_SLUG[v] ?? v);
        else if (k === 'page') result.page = parseInt(v) || 1;
        else if (k === 'limit') result.limit = parseInt(v) || 25;
    }
    return result;
};

const TrackingReports = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    // Update browser tab title
    usePageTitle("Performance Tracking Reports", location);

    const [projectList, setProjectList] = useState([]);
    const [performanceReportList, setPerformanceReportList] = useState([]);
    const [agentList, setAgentList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initialize filter state directly from URL so the path-update effect
    // never sees stale null values on the first render (avoids navigation race).
    const [initFilters] = useState(() => parseTrackingFilters(location.pathname));
    const [selectedAgent, setSelectedAgent] = useState(initFilters.agent);
    const [selectedProject, setSelectedProject] = useState(initFilters.project);
    const [statusFilter, setStatusFilter] = useState(initFilters.status);
    const [page, setPage] = useState(initFilters.page);
    const [rowsPerPage, setRowsPerPage] = useState(initFilters.limit);

    const [totalCount, setTotalCount] = useState(0);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const isAdminOrHr =
        userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource";

    const handleRowClick = (task) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };


    const fetchData = () => {
        getRequestWithOutBody(`${baseURl}project`, accessToken)
            .then(result => {
                setProjectList(result?.data || []);
                getRequestWithOutBodyCached(`${baseURl}user`, accessToken)
                    .then(result => {
                        setAgentList(result?.data?.results || []);
                    })
                    .catch(error => toast.error(error?.message || 'Failed to fetch agents'));
            })
            .catch(error => toast.error(error?.message || 'Failed to fetch projects'));
    };
    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        let api = ''
        if (userData?.roleTitle === 'Admin' || userData?.roleTitle === 'Human Resource') {
            api = `${baseURl}subtask?paginate=true&page=${page}&limit=${rowsPerPage}&orderBy=createdAt&order=desc`
        } else {
            api = `${baseURl}subtask?userId=${userData?.id}&paginate=true&page=${page}&limit=${rowsPerPage}&orderBy=createdAt&order=desc`
        }
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                setPerformanceReportList(result?.data?.data)
                setTotalCount(result?.data?.totalRecords || 0);
                setSelectedAgent((userData?.roleTitle === 'Admin' || userData?.roleTitle === 'Human Resource') ? null : userData?.id)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchFilteredPerformanceReport = async () => {
        setLoading(true);

        const params = new URLSearchParams({
            paginate: "true",
            page,
            limit: rowsPerPage,
            orderBy: "createdAt",
            order: "desc",
        });

        if (selectedAgent) {
            params.append("userId", selectedAgent);
        }
        if (selectedProject) {
            params.append("projectId", selectedProject);
        }
        if (statusFilter) {
            params.append("status", statusFilter);
        }

        const apiUrl = `${baseURl}subtask?${params.toString()}`;

        try {
            const result = await getRequestWithOutBody(apiUrl, accessToken);
            setPerformanceReportList(result?.data?.data || []);
            setTotalCount(result?.data?.totalRecords || 0);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };


    // Read path parameters on component mount
    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(segment => segment);
        const filterSegments = pathSegments.slice(pathSegments.findIndex(seg => seg === 'trackingReports') + 1);

        let i = 0;
        while (i < filterSegments.length) {
            const segment = filterSegments[i];
            const nextSegment = filterSegments[i + 1];

            if (segment === 'project' && nextSegment) {
                setSelectedProject(idFromSlug(nextSegment));
                i += 2;
            } else if (segment === 'agent' && nextSegment) {
                setSelectedAgent(idFromSlug(nextSegment));
                i += 2;
            } else if (segment === 'status' && nextSegment) {
                setStatusFilter(nextSegment === 'all' || nextSegment === '' ? '' : (STATUS_BY_SLUG[nextSegment] ?? nextSegment));
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

    // Update path when filters change
    useEffect(() => {
        const pathSegments = ['/home', 'trackingReports'];

        if (selectedProject) {
            const project = projectList.find(p => p?.id == selectedProject);
            const name = project?.name ? slugify(project.name) : '';
            pathSegments.push('project', name ? `${name}-${selectedProject}` : String(selectedProject));
        }
        if (selectedAgent) {
            const agent = agentList.find(a => a?.id == selectedAgent);
            const name = (agent?.name || agent?.username) ? slugify(agent?.name || agent?.username) : '';
            pathSegments.push('agent', name ? `${name}-${selectedAgent}` : String(selectedAgent));
        }
        if (statusFilter) {
            pathSegments.push('status', slugify(statusFilter));
        }
        if (page > 1) {
            pathSegments.push('page', String(page));
        }
        if (rowsPerPage !== 25) {
            pathSegments.push('limit', String(rowsPerPage));
        }

        const newPath = pathSegments.join('/');

        if (newPath !== location.pathname) {
            navigate(newPath, { replace: true });
        }
    }, [selectedProject, selectedAgent, statusFilter, page, rowsPerPage, navigate, location.pathname, projectList, agentList]);

    useEffect(() => {
        fetchData()
    }, [])

    // --- Filter change handlers ---
    const handleAgentChange = (value) => {
        setSelectedAgent(value);
        setPage(1);
    };

    const handleProjectChange = (value) => {
        setSelectedProject(value);
        setPage(1);
    };

    const handleStatusChange = (value) => {
        setStatusFilter(value);
        setPage(1);
    };

    const handleClearFilters = useCallback(() => {
        setSelectedProject(null);
        setSelectedAgent(null);
        setStatusFilter("");
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setPage(1);
    }, []);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (selectedProject) {
            const projectName =
                projectList.find((p) => String(p?.id) === String(selectedProject))?.name ||
                selectedProject;
            chips.push({ key: "project", label: `Project: ${projectName}` });
        }
        if (selectedAgent && isAdminOrHr) {
            const agent = agentList.find((a) => String(a?.id) === String(selectedAgent));
            const agentName = agent?.name || agent?.username || selectedAgent;
            chips.push({ key: "agent", label: `Employee: ${agentName}` });
        }
        if (statusFilter) {
            chips.push({
                key: "status",
                label: `Status: ${statusFilter === "not-completed" ? "Not Completed" : statusFilter}`,
            });
        }
        return chips;
    }, [selectedProject, selectedAgent, statusFilter, projectList, agentList, isAdminOrHr]);

    const removeFilterChip = useCallback((key) => {
        if (key === "project") setSelectedProject(null);
        if (key === "agent") setSelectedAgent(null);
        if (key === "status") setStatusFilter("");
        setPage(1);
    }, []);

    // --- Core data fetching logic ---
    useEffect(() => {
        // Build query dynamically only when filters are applied
        const hasFilters =
            selectedAgent ||
            selectedProject ||
            statusFilter;

        if (hasFilters) {
            fetchFilteredPerformanceReport();
        } else {
            fetchData2();
        }
        // include pagination & filter dependencies
    }, [selectedAgent, selectedProject, statusFilter, page, rowsPerPage]);


    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const columns = [
        { id: 'title', label: 'Title', align: 'center' },
        // { id: 'Task Type', label: 'Task Type', align: 'center' },
        // { id: 'Task Level', label: 'Task Level', align: 'center' },
        { id: 'assignee', label: 'Assignee', align: 'center' },
        { id: 'project', label: 'Project', align: 'center' },
        // { id: 'Assigned Date', label: 'Assigned Date', align: 'center' },
        { id: 'endDate', label: 'Due Date', align: 'center' },
        // { id: 'Completion Date', label: 'Completion Date', align: 'center' },
        { id: 'status', label: 'Status', align: 'center' },
        // { id: 'Delay Days', label: 'Delay Days', align: 'center' },
        // { id: 'Allowed Late Days', label: 'Late Allowed', align: 'center' },
        // { id: 'Bonus / Penalty', label: 'Bonus / Penalty', align: 'center' },
        // { id: 'Total Points', label: 'Total Points', align: 'center' },
        // { id: 'Bonus Points', label: 'Bonus Points', align: 'center' },
        // { id: 'Earned Points', label: 'Earned Points', align: 'center' },
    ];

    const data = performanceReportList.map((item) => ({
        ...item,
        assignee: item.assignee?.user?.name || "-",
    }));
    const calculateDuration = (start, end) => {
        if (!start || !end) return "N/A";
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = endDate - startDate; // milliseconds
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={"var(--sidebar-text-primary)"}
                    Heading={`Performance Tracking Reports`}
                    Fontsize={30}
                />
            </HeaderWrapper>

            <div
                className="mt-4"
                style={{
                    background: "var(--dashboard-card-bg)",
                    border: "1px solid var(--dashboard-box-border)",
                    borderRadius: 12,
                    overflow: "hidden",
                }}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setFiltersExpanded((prev) => !prev);
                        }
                    }}
                    onClick={() => setFiltersExpanded((prev) => !prev)}
                    sx={{
                        px: 2,
                        py: 1,
                        borderBottom: filtersExpanded
                            ? "1px solid var(--dashboard-box-border)"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        cursor: "pointer",
                        userSelect: "none",
                        background:
                            "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.9) 100%)",
                        "&:hover": {
                            background:
                                "linear-gradient(180deg, rgba(241,245,249,0.95) 0%, rgba(248,250,252,0.95) 100%)",
                        },
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                        <TuneIcon fontSize="small" />
                        <Box sx={{ fontWeight: 700, fontSize: 14 }}>Filters</Box>
                        {!filtersExpanded && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                {selectedProject && (
                                    <Chip
                                        size="small"
                                        label={`Project: ${
                                            projectList.find((p) => String(p?.id) === String(selectedProject))?.name ||
                                            selectedProject
                                        }`}
                                        variant="outlined"
                                    />
                                )}
                                {selectedAgent && isAdminOrHr && (
                                    <Chip
                                        size="small"
                                        label={`Employee: ${
                                            agentList.find((a) => String(a?.id) === String(selectedAgent))?.name ||
                                            agentList.find((a) => String(a?.id) === String(selectedAgent))?.username ||
                                            selectedAgent
                                        }`}
                                        variant="outlined"
                                    />
                                )}
                                {statusFilter && (
                                    <Chip
                                        size="small"
                                        label={`Status: ${
                                            statusFilter === "not-completed" ? "Not Completed" : statusFilter
                                        }`}
                                        variant="outlined"
                                    />
                                )}
                            </Stack>
                        )}
                    </Box>
                    <Tooltip title={filtersExpanded ? "Hide filters" : "Show filters"}>
                        <IconButton
                            size="small"
                            aria-label={filtersExpanded ? "Hide filters" : "Show filters"}
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
                            <FilterDropdown
                                value={selectedProject || ""}
                                onChange={(next) => {
                                    handleProjectChange(next || null);
                                }}
                                options={[
                                    { label: "All Projects", value: "" },
                                    ...projectList.map((p) => ({
                                        label: p?.name || "-",
                                        value: p?.id,
                                    })),
                                ]}
                                placeholder="All Projects"
                                minWidth={180}
                                placeholderValues={[""]}
                            />

                            {isAdminOrHr && (
                                <FilterDropdown
                                    value={selectedAgent ?? "all"}
                                    onChange={(next) => {
                                        const effective = String(next) === "all" ? null : next;
                                        handleAgentChange(effective);
                                    }}
                                    options={[
                                        { label: "All Employees", value: "all" },
                                        ...agentList
                                            .filter((a) => String(a?.id) !== "all")
                                            .map((a) => ({
                                                label: a?.name || a?.username || "-",
                                                value: a?.id,
                                            })),
                                    ]}
                                    placeholder="All Employees"
                                    minWidth={180}
                                    placeholderValues={["all"]}
                                    searchable
                                    searchPlaceholder="Search employee..."
                                />
                            )}

                            <FilterDropdown
                                value={statusFilter || "all"}
                                onChange={(next) => {
                                    const effective = String(next) === "all" ? "" : next;
                                    handleStatusChange(effective);
                                }}
                                options={[
                                    { label: "All Statuses", value: "all" },
                                    ...TRACKING_STATUSES.map((s) => ({
                                        label: s === "not-completed" ? "Not Completed" : s,
                                        value: s,
                                    })),
                                ]}
                                placeholder="All Statuses"
                                minWidth={170}
                                placeholderValues={["all"]}
                            />

                            <div className="flex gap-2 items-center ml-auto">
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    style={{
                                        height: 36,
                                        padding: "0 14px",
                                        borderRadius: 8,
                                        border: "1px solid var(--dashboard-box-border)",
                                        background: 'var(--dashboard-card-bg2)',
                                        color: 'var(--dashboard-text-primary)',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Clear Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyFilters}
                                    style={{
                                        height: 36,
                                        padding: "0 14px",
                                        borderRadius: 8,
                                        border: "none",
                                        background: "#24282E",
                                        color: "#fff",
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
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
                ) : (
                    <>
                        {selectedProject && (
                            <Heading
                                Fontweight={700}
                                color={"var(--fieldsTitle)"}
                                Heading={
                                    projectList.find((project) => project.id === selectedProject)?.name ||
                                    "Project"
                                }
                                Fontsize={24}
                                mb={4}
                            />
                        )}
                        {performanceReportList.length > 0 ? (
                            <AgentTable
                                columns={columns}
                                data={data}
                                page={page}
                                performanceReport={true}
                                rowsPerPage={rowsPerPage}
                                totalCount={totalCount}
                                onPageChange={setPage}
                                onRowClick={handleRowClick}
                                onRowsPerPageChange={setRowsPerPage}
                            />
                        ) : (
                            <NoDataFound
                                title="No Data Found"
                                description="No tracking report data is available for the selected filters."
                            />
                        )}
                    </>
                )}
            </div>
            <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" style={{ zIndex: 4000 }} onClose={() => setIsModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white  text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-2xl font-semibold leading-6 text-gray-900 border-b pb-3 pl-6 pt-6">
                                        Task Details
                                    </Dialog.Title>

                                    {selectedTask && (
                                        <div className="text-sm text-gray-700 space-y-3 p-6">
                                            <div className="flex items-center gap-2 border-b pb-2"><strong>Task Name:</strong> {selectedTask.title || "N/A"}</div>
                                            <div className="flex items-center gap-2 border-b pb-2"><strong>Task Type:</strong>{" "}
                                                <span className="text-blue-600 font-semibold">{selectedTask?.taskType?.type || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Task Level:</strong>{" "}
                                                <span className="text-green-600 font-semibold">{selectedTask?.taskLevel?.level || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Project Name:</strong>{" "}
                                                <span className="text-green-600 font-semibold">{selectedTask?.project?.name || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2"><strong>Creator:</strong> {selectedTask?.creator?.name || "N/A"}</div>
                                            <div className="flex items-center gap-2 border-b pb-2"><strong>Assignee:</strong> {selectedTask.assignee || "N/A"}</div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Task Duration:</strong>{" "}
                                                {calculateDuration(selectedTask.startDate, selectedTask.endDate)} Days
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Priority:</strong>{" "}
                                                {selectedTask.priority
                                                    ? selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)
                                                    : "N/A"}
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Assigned Date:</strong> {formatDate(selectedTask.startDate)}
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Due Date:</strong> {formatDate(selectedTask.endDate)}
                                            </div>
                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Last Update Date:</strong> {formatDate(selectedTask.updatedAt)}
                                            </div>

                                            <div className="flex items-center gap-2 border-b pb-2">
                                                <strong>Status:</strong>{" "}
                                                <span
                                                    className={`ml-2 px-2 py-1 rounded text-xs ${selectedTask.status === "Completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                        }`}
                                                >
                                                    {selectedTask.status || "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-3 mr-3 flex justify-end gap-2">
                                        <button
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                            onClick={() => {
                                                setTaskDetailSidebarRoute('trackingReports');
                                                navigate(`/home/taskDetail/${selectedTask?.id}`, {
                                                    state: {
                                                        itemData: selectedTask,
                                                        projectName: selectedTask?.project?.name,
                                                        fromRoute: 'trackingReports',
                                                    },
                                                });
                                            }}
                                        >
                                            View Task
                                        </button>
                                        <button
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>


        </div>
    );
};

export default TrackingReports;
