import Heading from "../../Components/Heading";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import AgentTable from "../../Components/AgentTable";
import FilterDropdown from "../../Components/FilterDropdown";
import moment from "moment";
import dayjs from 'dayjs';
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

const parseAttendanceLogFilters = (pathname) => {
    const segs = pathname.split('/').filter(Boolean);
    const base = segs.indexOf('attendanceLog');
    const result = { agent: null, eventType: null, startDate: '', endDate: '', page: 1, limit: 50 };
    if (base === -1) return result;
    const rest = segs.slice(base + 1);
    for (let i = 0; i + 1 < rest.length; i += 2) {
        const k = rest[i], v = rest[i + 1];
        if (k === 'agent') result.agent = idFromSlug(v);
        else if (k === 'eventType') result.eventType = v === 'all' ? null : v;
        else if (k === 'startDate') result.startDate = v;
        else if (k === 'endDate') result.endDate = v;
        else if (k === 'page') result.page = parseInt(v) || 1;
        else if (k === 'limit') result.limit = parseInt(v) || 50;
    }
    return result;
};

const EVENT_TYPE_OPTIONS = [
    { label: 'All Event Types', value: 'all' },
    { label: 'Sign In', value: 'attendance_signin' },
    { label: 'Sign Out', value: 'attendance_signout' },
    { label: 'Both Sign In & Sign Out', value: 'attendance_signin,attendance_signout' },
];

const getEventTypeLabel = (value) => {
    if (!value) return 'All Event Types';
    return EVENT_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || value;
};

const AttendanceLog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    usePageTitle("Attendance Logs", location);

    const [attendanceLogList, setAttendanceLogList] = useState([]);
    const [agentList, setAgentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const [initFilters] = useState(() => parseAttendanceLogFilters(location.pathname));
    const [selectedAgent, setSelectedAgent] = useState(initFilters.agent);
    const [selectedEventType, setSelectedEventType] = useState(initFilters.eventType);
    const [startDate, setStartDate] = useState(initFilters.startDate);
    const [endDate, setEndDate] = useState(initFilters.endDate);
    const [page, setPage] = useState(initFilters.page);
    const [rowsPerPage, setRowsPerPage] = useState(initFilters.limit);

    const isAdminOrHr =
        userData?.roleTitle === "Admin" || userData?.roleTitle === "Human Resource";

    const toApiDate = (dateStr) => {
        if (!dateStr) return '';
        const m = moment(dateStr, 'YYYY-MM-DD', true);
        if (!m.isValid()) return '';
        return m.format('YYYY-MM-DD');
    };

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

    const convertUTCToLocal = (timeStr) => {
        if (!timeStr || timeStr === "---") return "---";

        const utcTime = moment.utc(timeStr, [
            "YYYY-MM-DD HH:mm:ss",
            "YYYY-MM-DD hh:mm A",
            "HH:mm:ss",
            "hh:mm A"
        ]);

        return utcTime.local().format("MMM DD, YYYY hh:mm A");
    };

    const transformAttendanceLogData = (response) => {
        let dataArray = [];

        if (response && response.data && Array.isArray(response.data.data)) {
            dataArray = response.data.data;
        } else if (response && Array.isArray(response.data)) {
            dataArray = response.data;
        } else if (Array.isArray(response)) {
            dataArray = response;
        } else {
            return [];
        }

        return dataArray.map(item => ({
            ...item,
            user: item.user?.name || item.user?.username || item.user?.email || 'Unknown User',
            formattedDate: convertUTCToLocal(item.createdAt),
            eventTypeDisplay: item.eventType === 'attendance_signin' ? 'Sign In' : 'Sign Out',
            location: item.location ? `${item.location.city || 'Unknown'}, ${item.location.region || 'Unknown'}, ${item.location.country || 'Unknown'}` : 'Not Available',
        }));
    };

    const fetchAgents = () => {
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                setAgentList(result?.data?.results || []);
            })
            .catch(() => {});
    };

    const fetchAttendanceLog = () => {
        setLoading(true);
        let query = `?page=${page}&limit=${rowsPerPage}`;
        const api = `${baseURl}user-login-log`;

        if (selectedEventType) {
            query += `&eventType=${selectedEventType}`;
        } else {
            query += `&eventType=attendance_signin,attendance_signout`;
        }

        if (selectedAgent) query += `&userId=${selectedAgent}`;
        if (startDate) query += `&startDate=${toApiDate(startDate)}`;
        if (endDate) query += `&endDate=${toApiDate(endDate)}`;

        if (startDate && !endDate && !selectedAgent && !selectedEventType) {
            query = `?date=${toApiDate(startDate)}`;
        }

        getRequestWithOutBody(`${api}${query}`, accessToken)
            .then(result => {
                const formattedData = transformAttendanceLogData(result);
                setAttendanceLogList(formattedData);
                setTotalCount(result?.data?.totalRecords || result?.totalRecords || formattedData.length || 0);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(segment => segment);
        const filterSegments = pathSegments.slice(pathSegments.findIndex(seg => seg === 'attendanceLog') + 1);

        let i = 0;
        while (i < filterSegments.length) {
            const segment = filterSegments[i];
            const nextSegment = filterSegments[i + 1];

            if (segment === 'agent' && nextSegment) {
                setSelectedAgent(idFromSlug(nextSegment));
                i += 2;
            } else if (segment === 'eventType' && nextSegment) {
                setSelectedEventType(nextSegment === 'all' || nextSegment === '' ? null : nextSegment);
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
                setRowsPerPage(parseInt(nextSegment) || 50);
                i += 2;
            } else {
                i += 1;
            }
        }
    }, [location.pathname]);

    useEffect(() => {
        const pathSegments = ['/home', 'attendanceLog'];

        if (selectedAgent) {
            const agent = agentList.find(a => a?.id == selectedAgent);
            const name = (agent?.name || agent?.username) ? slugify(agent?.name || agent?.username) : '';
            pathSegments.push('agent', name ? `${name}-${selectedAgent}` : String(selectedAgent));
        }
        if (selectedEventType) pathSegments.push('eventType', selectedEventType);
        if (startDate) pathSegments.push('startDate', startDate);
        if (endDate) pathSegments.push('endDate', endDate);
        if (page > 1) pathSegments.push('page', String(page));
        if (rowsPerPage !== 50) pathSegments.push('limit', String(rowsPerPage));

        const newPath = pathSegments.join('/');

        if (newPath !== location.pathname) {
            navigate(newPath, { replace: true });
        }
    }, [selectedAgent, selectedEventType, startDate, endDate, page, rowsPerPage, navigate, location.pathname, agentList]);

    useEffect(() => {
        if (isAdminOrHr) {
            fetchAgents();
        }
    }, [userData]);

    useEffect(() => {
        fetchAttendanceLog();
    }, [selectedAgent, selectedEventType, startDate, endDate, page, rowsPerPage]);

    const handleAgentChange = (value) => {
        setSelectedAgent(value);
        setPage(1);
    };

    const handleEventTypeChange = (value) => {
        setSelectedEventType(value);
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (newRowsPerPage) => {
        setRowsPerPage(newRowsPerPage);
        setPage(1);
    };

    const handleClearFilters = useCallback(() => {
        setSelectedAgent(null);
        setSelectedEventType(null);
        setStartDate('');
        setEndDate('');
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setPage(1);
    }, []);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (selectedAgent && isAdminOrHr) {
            const agent = agentList.find((a) => String(a?.id) === String(selectedAgent));
            const agentName = agent?.name || agent?.username || selectedAgent;
            chips.push({ key: "agent", label: `Employee: ${agentName}` });
        }
        if (selectedEventType) {
            chips.push({ key: "eventType", label: `Event: ${getEventTypeLabel(selectedEventType)}` });
        }
        if (startDate) chips.push({ key: "startDate", label: `From: ${formatFilterDate(startDate)}` });
        if (endDate) chips.push({ key: "endDate", label: `To: ${formatFilterDate(endDate)}` });
        return chips;
    }, [selectedAgent, selectedEventType, startDate, endDate, agentList, isAdminOrHr]);

    const removeFilterChip = useCallback((key) => {
        if (key === "agent") setSelectedAgent(null);
        if (key === "eventType") setSelectedEventType(null);
        if (key === "startDate") setStartDate("");
        if (key === "endDate") setEndDate("");
        setPage(1);
    }, []);

    const columns = [
        { id: 'user', label: 'Employee Name', align: 'center' },
        { id: 'formattedDate', label: 'Date & Time', align: 'center' },
        { id: 'eventTypeDisplay', label: 'Event Type', align: 'center' },
        { id: 'ipAddress', label: 'IP Address', align: 'center' },
        { id: 'location', label: 'Location', align: 'center' },
        { id: 'userAgent', label: 'Device', align: 'center' },
    ];

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Attendance Logs'}
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
                                {selectedEventType && (
                                    <Chip
                                        size="small"
                                        label={`Event: ${getEventTypeLabel(selectedEventType)}`}
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
                            {isAdminOrHr && (
                                <FilterDropdown
                                    value={selectedAgent ?? 'all'}
                                    onChange={(next) => {
                                        const effective = String(next) === 'all' ? null : next;
                                        handleAgentChange(effective);
                                    }}
                                    options={[
                                        { label: 'All Employees', value: 'all' },
                                        ...(Array.isArray(agentList) ? agentList : []).map((a) => ({
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

                            <FilterDropdown
                                value={selectedEventType ?? 'all'}
                                onChange={(next) => {
                                    const effective = String(next) === 'all' ? null : next;
                                    handleEventTypeChange(effective);
                                }}
                                options={EVENT_TYPE_OPTIONS}
                                placeholder="All Event Types"
                                minWidth={180}
                                placeholderValues={["all"]}
                            />

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DateRangeWrapper>
                                    <DatePickerField>
                                        <DatePicker
                                            format="MM/DD/YYYY"
                                            value={startDate ? dayjs(startDate) : null}
                                            onChange={(value) => {
                                                setStartDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
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
                                                setEndDate(value ? dayjs(value).format('YYYY-MM-DD') : '');
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
                ) : attendanceLogList.length > 0 ? (
                    <AgentTable
                        columns={columns}
                        data={attendanceLogList}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={handlePageChange}
                        onRowsPerPageChange={handleRowsPerPageChange}
                        containerMaxHeight="calc(100vh - 300px)"
                    />
                ) : (
                    <NoDataFound title="No Data Found" description="No attendance logs found." />
                )}
            </div>
        </div>
    );
};

export default AttendanceLog;
