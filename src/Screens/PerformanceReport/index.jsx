import Heading from "../../Components/Heading";
import { useEffect, useState, Fragment, useCallback, useMemo } from "react";
import { getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import FilterDropdown from "../../Components/FilterDropdown";
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
import { toast } from "react-toastify";
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
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

const DateRangeWrapper = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: "0 0 auto",
    flexWrap: "nowrap",
});

const DatePickerField = styled("div")({
    width: 160,
    minWidth: 140,
    flex: "0 0 auto",
    "& .MuiFormControl-root": {
        width: "100%",
    },
});

const datePickerSlotProps = {
    textField: {
        fullWidth: true,
        size: "small",
        placeholder: "MM/DD/YYYY",
        InputLabelProps: { shrink: true },
        sx: {
            width: "100%",
            "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "var(--dashboard-tab-box)",
                height: 40,
                color: "var(--dashboard-text-primary)",
            },
        },
    },
};

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

const parsePerformanceFilters = (pathname) => {
    const segs = pathname.split('/').filter(Boolean);
    const base = segs.indexOf('performanceReport');
    const result = { agent: null, project: null, startDate: '', endDate: '', page: 1, limit: 25 };
    if (base === -1) return result;
    const rest = segs.slice(base + 1);
    for (let i = 0; i + 1 < rest.length; i += 2) {
        const k = rest[i], v = rest[i + 1];
        if (k === 'agent') result.agent = idFromSlug(v);
        else if (k === 'project') result.project = idFromSlug(v);
        else if (k === 'startDate') result.startDate = v;
        else if (k === 'endDate') result.endDate = v;
        else if (k === 'page') result.page = parseInt(v) || 1;
        else if (k === 'limit') result.limit = parseInt(v) || 25;
    }
    return result;
};

const PerformanceReport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    // Update browser tab title
    usePageTitle("Project Performance Reports", location);

    const [projectList, setProjectList] = useState([]);
    const [performanceReportList, setPerformanceReportList] = useState([]);
    const [agentList, setAgentList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initialize filter state directly from URL so the path-update effect
    // never sees stale null values on the first render (avoids navigation race).
    const [initFilters] = useState(() => parsePerformanceFilters(location.pathname));
    const [selectedAgent, setSelectedAgent] = useState(initFilters.agent);
    const [selectedProject, setSelectedProject] = useState(initFilters.project);
    const [startDate, setStartDate] = useState(initFilters.startDate);
    const [endDate, setEndDate] = useState(initFilters.endDate);
    const [page, setPage] = useState(initFilters.page);
    const [rowsPerPage, setRowsPerPage] = useState(initFilters.limit);

    const [selectedTask, setSelectedTask] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const isAdminOrHr =
        userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource";

    const fetchData = () => {
        getRequestWithOutBody(`${baseURl}project`, accessToken)
            .then(result => {
                if (Array.isArray(result?.requiredFeatures) && result.requiredFeatures.length > 0) {
                    navigate('/home', { replace: true });
                    return;
                }
                setProjectList(Array.isArray(result?.data) ? result.data : []);
                getRequestWithOutBodyCached(`${baseURl}user`, accessToken)
                    .then(result => {
                        if (Array.isArray(result?.requiredFeatures) && result.requiredFeatures.length > 0) {
                            navigate('/home', { replace: true });
                            return;
                        }
                        setAgentList(result?.data?.results || []);
                    })
                    .catch(error => toast.error(error));
            })
            .catch(error => toast.error(error));
    };
    const fetchData2 = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({
            orderBy: 'createdAt',
            order: 'desc',
        });

        if (userData?.roleTitle !== 'Admin' && userData?.roleTitle !== 'Human Resource') {
            params.append('userId', String(userData?.id));
        }
        params.append('paginate', true);
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        const api = `${baseURl}task/performance-report?${params.toString()}`;

        getRequestWithOutBody(api, accessToken)
            .then(result => {
                if (Array.isArray(result?.requiredFeatures) && result.requiredFeatures.length > 0) {
                    navigate('/home', { replace: true });
                    return;
                }
                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    0;

                setPerformanceReportList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setSelectedAgent((userData?.roleTitle === 'Admin' || userData?.roleTitle === 'Human Resource') ? null : userData?.id);
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    }, [accessToken, userData?.id, userData?.roleTitle, page, rowsPerPage]);
    const fetchFilteredPerformanceReport = useCallback(() => {
        setLoading(true);
        setPerformanceReportList([]);
        setTotalCount(0);

        const params = new URLSearchParams({
            orderBy: 'createdAt',
            order: 'desc',
        });

        if (selectedAgent) params.append('userId', String(selectedAgent));
        if (selectedProject) params.append('projectId', String(selectedProject));
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        params.append('paginate', true);
        params.append('page', String(page));
        params.append('limit', String(rowsPerPage));

        const apiUrl = `${baseURl}task/performance-report?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then(result => {
                if (Array.isArray(result?.requiredFeatures) && result.requiredFeatures.length > 0) {
                    navigate('/home', { replace: true });
                    return;
                }
                const apiData = result?.data;
                const rows = apiData?.results || apiData?.data?.results || [];
                const count =
                    apiData?.totalRecords ??
                    apiData?.data?.totalRecords ??
                    0;

                setPerformanceReportList(Array.isArray(rows) ? rows : []);
                setTotalCount(Number(count) || 0);
                setLoading(false);
            })
            .catch(error => {
                setPerformanceReportList([]);
                setTotalCount(0);
                setLoading(false);
            });
    }, [accessToken, selectedAgent, selectedProject, startDate, endDate, page, rowsPerPage]);


    // Sync URL → state on browser back/forward navigation
    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(segment => segment);
        const filterSegments = pathSegments.slice(pathSegments.findIndex(seg => seg === 'performanceReport') + 1);

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
            } else if (segment === 'startDate' && nextSegment) {
                setStartDate(nextSegment);
                i += 2;
            } else if (segment === 'endDate' && nextSegment) {
                setEndDate(nextSegment);
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

    // Sync state → URL whenever filters change
    useEffect(() => {
        const pathSegments = ['/home', 'performanceReport'];

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
        if (startDate) pathSegments.push('startDate', startDate);
        if (endDate) pathSegments.push('endDate', endDate);
        if (page > 1) pathSegments.push('page', String(page));
        if (rowsPerPage !== 25) pathSegments.push('limit', String(rowsPerPage));

        const newPath = pathSegments.join('/');

        if (newPath !== location.pathname) {
            navigate(newPath, { replace: true });
        }
    }, [selectedProject, selectedAgent, startDate, endDate, page, rowsPerPage, navigate, location.pathname, projectList, agentList]);

    useEffect(() => {
        fetchData();
    }, [])

    const handleAgentChange = (value) => {
        setSelectedAgent(value);
        setPage(1); // reset to first page
    };

    const handleProjectChange = (value) => {
        setSelectedProject(value);
        setPage(1); // reset to first page
    };

    const handleClearFilters = useCallback(() => {
        setSelectedProject(null);
        setSelectedAgent(null);
        setStartDate("");
        setEndDate("");
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setPage(1);
    }, []);

    const formatFilterDate = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
        }).format(date);
    };

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
        if (startDate) chips.push({ key: "startDate", label: `From: ${formatFilterDate(startDate)}` });
        if (endDate) chips.push({ key: "endDate", label: `To: ${formatFilterDate(endDate)}` });
        return chips;
    }, [selectedProject, selectedAgent, startDate, endDate, projectList, agentList, isAdminOrHr]);

    const removeFilterChip = useCallback((key) => {
        if (key === "project") setSelectedProject(null);
        if (key === "agent") setSelectedAgent(null);
        if (key === "startDate") setStartDate("");
        if (key === "endDate") setEndDate("");
        setPage(1);
    }, []);

    useEffect(() => {
        const hasFilters = selectedAgent || selectedProject || startDate || endDate;
        if (hasFilters) {
            fetchFilteredPerformanceReport();
        } else {
            fetchData2();
        }
    }, [fetchData2, fetchFilteredPerformanceReport, selectedAgent, selectedProject, startDate, endDate, page, rowsPerPage]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    };

    const normalizeDateValue = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return null;
            if (trimmed.toLowerCase() === "n/a") return null;
            if (trimmed === "-") return null;
        }
        return value;
    };

    const parseDisplayDate = (value) => {
        const raw = normalizeDateValue(value);
        if (!raw) return null;

        // Handles API formatted dates like "Jun 14 2025" and ISO strings
        const d = new Date(raw);
        if (isNaN(d.getTime())) return null;
        return d;
    };

    const columns = [
        { id: 'Task Name', label: 'Title', align: 'center' },
        { id: 'Assignee', label: 'Assignee', align: 'center' },
        { id: 'Assigned Date', label: 'Assigned Date', align: 'center' },
        { id: 'Due Date', label: 'Due Date', align: 'center' },
        { id: 'Allowed Late Days', label: 'Late Allowed', align: 'center' },
        { id: 'Completion Date', label: 'Dev Completion Date', align: 'center' },
        { id: 'Status', label: 'Current Status', align: 'center' },
        { id: 'Delay Days', label: 'Delay Days', align: 'center' },
        { id: 'Total Days', label: 'Total Days', align: 'center' },
        { id: 'Total Points', label: 'Total Points', align: 'center' },
        { id: 'Earned Points', label: 'Earned Points', align: 'center' },
    ];

    const data = (Array.isArray(performanceReportList) ? performanceReportList : []).map((item) => {
        const completionRaw = normalizeDateValue(
            item["Dev Completion Date"] || item.devCompletionDate || item.completionDate || item["Completion Date"]
        );
        const dueRaw = normalizeDateValue(item["Due Date"] || item.endDate || item.dueDate);

        return {
            ...item,
            _raw: item,
            // Ensure keys match column ids exactly
            "Task Name": (
                <button
                    type="button"
                    // onClick={(e) => {
                    //     e.stopPropagation();
                    //     navigate('/home/taskDetail', {
                    //         state: {
                    //             itemData: item,
                    //             projectName: projectList.find(project => project.id === selectedProject)?.name,
                    //         },
                    //     });
                    // }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: '#0C79F7',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textAlign: 'center',
                    }}
                    title={item["Task Name"]}
                >
                    {item["Task Name"]}
                </button>
            ),
            Assignee: item["Assignee"] || item.assignee?.user?.name || item.assignee || "-",
            Status: item["Current Status"] || item.currentStatus || item.status || item["Status"] || "-",
            "Completion Date": (() => {
                if (!completionRaw) return "N/A";
                if (typeof completionRaw === 'string' && !completionRaw.includes('T')) return completionRaw;
                return formatDate(completionRaw);
            })(),
            "Delay Days": (() => {
                if (!dueRaw || !completionRaw) return "-";
                const allowedLate = Number(item["Allowed Late Days"] ?? item.allowedLateDays ?? 0);
                const due = parseDisplayDate(dueRaw);
                const done = parseDisplayDate(completionRaw);
                if (!due || !done || isNaN(allowedLate)) return "-";
                const diffDays = Math.ceil((done - due) / (1000 * 60 * 60 * 24));
                if (isNaN(diffDays)) return "-";
                const late = Math.max(0, diffDays - allowedLate);
                if (isNaN(late)) return "-";
                return `${late} Days`;
            })(),
        };
    });
    const calculateDuration = (start, end) => {
        if (!start || !end) return "N/A";
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = endDate - startDate; // milliseconds
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };


    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={`Project Performance Reports`}
                    Fontsize={30}
                />
            </HeaderWrapper>

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
                                {startDate && (
                                    <Chip size="small" label={`From: ${formatFilterDate(startDate)}`} variant="outlined" />
                                )}
                                {endDate && (
                                    <Chip size="small" label={`To: ${formatFilterDate(endDate)}`} variant="outlined" />
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
                            <FilterDropdown
                                value={selectedProject ?? 'all'}
                                onChange={(next) => {
                                    const effective = String(next) === 'all' ? null : next;
                                    handleProjectChange(effective);
                                }}
                                options={[
                                    { label: 'All Projects', value: 'all' },
                                    ...projectList
                                        .filter((p) => String(p?.id) !== 'all')
                                        .map((p) => ({
                                            label: p?.name || '-',
                                            value: p?.id,
                                        })),
                                ]}
                                placeholder="All Projects"
                                minWidth={180}
                                placeholderValues={["all"]}
                            />

                            {isAdminOrHr && (
                                <FilterDropdown
                                    value={selectedAgent ?? 'all'}
                                    onChange={(next) => {
                                        const effective = String(next) === 'all' ? null : next;
                                        handleAgentChange(effective);
                                    }}
                                    options={[
                                        { label: 'All Employees', value: 'all' },
                                        ...agentList
                                            .filter((a) => String(a?.id) !== 'all')
                                            .map((a) => ({
                                                label: a?.name || a?.username || '-',
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

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateRangeWrapper>
                                    <DatePickerField>
                                        <DatePicker
                                            format="MM/DD/YYYY"
                                            value={startDate ? dayjs(startDate) : null}
                                            onChange={(value) => {
                                                setStartDate(value ? dayjs(value).format("YYYY-MM-DD") : "");
                                                setPage(1);
                                            }}
                                            slotProps={datePickerSlotProps}
                                        />
                                    </DatePickerField>
                                    <DatePickerField>
                                        <DatePicker
                                            format="MM/DD/YYYY"
                                            value={endDate ? dayjs(endDate) : null}
                                            onChange={(value) => {
                                                setEndDate(value ? dayjs(value).format("YYYY-MM-DD") : "");
                                                setPage(1);
                                            }}
                                            slotProps={datePickerSlotProps}
                                        />
                                    </DatePickerField>
                                </DateRangeWrapper>
                            </LocalizationProvider>

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
                ) : (
                    <>
                        {selectedProject && (
                            <Heading
                                Fontweight={700}
                                color={'var(--fieldsTitle)'}
                                Heading={
                                    projectList.find(project => project.id === selectedProject)?.name || "Project"
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
                                rowsPerPage={rowsPerPage}
                                totalCount={totalCount}
                                onPageChange={setPage}
                                onRowsPerPageChange={(val) => { setRowsPerPage(val); setPage(1); }}
                                containerMaxHeight="70vh"
                                onRowClick={() => {}}
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
        </div>
    );
};

export default PerformanceReport;