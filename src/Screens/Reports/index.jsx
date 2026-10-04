import { useEffect, useState, useCallback, useMemo } from "react";
import Heading from "../../Components/Heading";
import FilterDropdown from "../../Components/FilterDropdown";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { getRequestWithOutBody } from "../../Api/fetch";
import { toast } from "react-toastify";
import { usePageTitle } from "../../Hooks/usePageTitle";
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
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import Loader from "../../Components/Loader";

const HeaderWrapper = styled("div")({
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    flexWrap: "wrap",
    gap: 10,
});

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

const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
    const year = 2015 + i;
    return { id: year, year, value: year };
});

const REPORT_CATALOG = [
    {
        id: 1,
        title: "Agent Payout Commission Report",
        value: "Agent payout commission report",
        description: "View commission payouts for agents by month and year. Filter by a specific agent or all agents.",
    },
];

const MONTHS = [
    { id: 1, month: "January", value: "january" },
    { id: 2, month: "February", value: "february" },
    { id: 3, month: "March", value: "march" },
    { id: 4, month: "April", value: "april" },
    { id: 5, month: "May", value: "may" },
    { id: 6, month: "June", value: "june" },
    { id: 7, month: "July", value: "july" },
    { id: 8, month: "August", value: "august" },
    { id: 9, month: "September", value: "september" },
    { id: 10, month: "October", value: "october" },
    { id: 11, month: "November", value: "november" },
    { id: 12, month: "December", value: "december" },
];

const MONTH_DISPLAY_NAMES = {
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",
};

const getMonthDisplayName = (monthValue) =>
    MONTH_DISPLAY_NAMES[monthValue] || monthValue;

const Reports = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Reports", location);

    const [selectedYear, setSelectedYear] = useState(location.state?.selectedYear || "");
    const [selectedMonth, setSelectedMonth] = useState(location.state?.selectedMonth || "");
    const [agentList, setAgentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [assignedUser, setAssignedUser] = useState("");
    const [selectedReport, setSelectedReport] = useState("");
    const [errors, setErrors] = useState({});
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const fetchAgents = () => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}user?roleTitle=agent`, accessToken)
            .then((result) => {
                const allOption = { name: "All", id: "all", value: "All" };
                const formattedAgentList = result?.data?.results?.map((agent) => ({
                    ...agent,
                    value: agent.name,
                    id: agent.id,
                }));
                setAgentList([allOption, ...formattedAgentList]);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const handleAssignedChange = (agentId) => {
        setAssignedUser(agentId);
        clearError("assignedUser");
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
        clearError("selectedYear");
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
        clearError("selectedMonth");
    };

    const handleReportChange = (report) => {
        setSelectedReport(report);
        clearError("selectedReport");
    };

    const handleClearFilters = useCallback(() => {
        setSelectedYear("");
        setSelectedMonth("");
        setSelectedReport("");
        setAssignedUser("");
        setErrors({});
    }, []);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (selectedMonth) {
            chips.push({ key: "month", label: `Month: ${getMonthDisplayName(selectedMonth)}` });
        }
        if (selectedYear) {
            chips.push({ key: "year", label: `Year: ${selectedYear}` });
        }
        if (selectedReport) {
            const reportTitle =
                REPORT_CATALOG.find((r) => r.value === selectedReport)?.title || selectedReport;
            chips.push({ key: "report", label: `Report: ${reportTitle}` });
        }
        if (assignedUser) {
            const agentName =
                agentList.find((a) => String(a.id) === String(assignedUser))?.name || assignedUser;
            chips.push({ key: "agent", label: `Agent: ${agentName}` });
        }
        return chips;
    }, [selectedMonth, selectedYear, selectedReport, assignedUser, agentList]);

    const removeFilterChip = useCallback((key) => {
        if (key === "month") setSelectedMonth("");
        if (key === "year") setSelectedYear("");
        if (key === "report") setSelectedReport("");
        if (key === "agent") setAssignedUser("");
    }, []);

    const handleGenerateReport = () => {
        setErrors({});

        const fieldErrors = {};
        if (!selectedMonth) fieldErrors.selectedMonth = true;
        if (!selectedYear) fieldErrors.selectedYear = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Month and Year are required");
            return;
        }

        let url = `${baseURl}payouts/report?month=${selectedMonth}&year=${selectedYear}`;

        if (assignedUser && assignedUser !== "all") {
            url += `&agentId=${assignedUser}`;
        }

        setSearching(true);
        getRequestWithOutBody(url, accessToken)
            .then((result) => {
                if (result.data && result.data.length > 0) {
                    navigate("/home/reportDetails", {
                        state: {
                            payoutData: result.data,
                            selectedMonth,
                            selectedYear,
                            selectedAgentId: assignedUser,
                        },
                    });
                } else {
                    toast.error("No record found");
                }
            })
            .catch(() => {})
            .finally(() => setSearching(false));
    };

    const monthOptions = MONTHS.map((m) => ({ label: m.month, value: m.value }));
    const yearOptions = YEAR_OPTIONS.map((y) => ({ label: String(y.year), value: y.value }));
    const reportOptions = REPORT_CATALOG.map((r) => ({ label: r.title, value: r.value }));
    const agentOptions = agentList.map((agent) => ({
        label: agent.name,
        value: agent.id,
    }));

    return (
        <div
            className="min-h-screen"
            style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}
        >
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Reports"}
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
                        borderBottom: filtersExpanded ? "1px solid var(--dashboard-box-border)" : "none",
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
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        <TuneIcon fontSize="small" />
                        <Box sx={{ fontWeight: 700, fontSize: 14 }}>Report Filters</Box>
                        {!filtersExpanded && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                {selectedMonth && (
                                    <Chip
                                        size="small"
                                        label={`Month: ${getMonthDisplayName(selectedMonth)}`}
                                        variant="outlined"
                                    />
                                )}
                                {selectedYear && (
                                    <Chip size="small" label={`Year: ${selectedYear}`} variant="outlined" />
                                )}
                                {selectedReport && (
                                    <Chip
                                        size="small"
                                        label={
                                            REPORT_CATALOG.find((r) => r.value === selectedReport)?.title ||
                                            selectedReport
                                        }
                                        variant="outlined"
                                    />
                                )}
                                {assignedUser && (
                                    <Chip
                                        size="small"
                                        label={`Agent: ${
                                            agentList.find((a) => String(a.id) === String(assignedUser))?.name ||
                                            assignedUser
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
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <div
                            className="grid gap-3"
                            style={{
                                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            }}
                        >
                            <FilterDropdown
                                label="Month"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                options={monthOptions}
                                placeholder="Select Month"
                                minWidth={200}
                                searchable
                                searchPlaceholder="Search month..."
                            />
                            <FilterDropdown
                                label="Year"
                                value={selectedYear}
                                onChange={handleYearChange}
                                options={yearOptions}
                                placeholder="Select Year"
                                minWidth={200}
                                searchable
                                searchPlaceholder="Search year..."
                            />
                            <FilterDropdown
                                label="Report Type"
                                value={selectedReport}
                                onChange={handleReportChange}
                                options={reportOptions}
                                placeholder="All Reports"
                                minWidth={200}
                            />
                            <FilterDropdown
                                label="Agent"
                                value={assignedUser}
                                onChange={handleAssignedChange}
                                options={agentOptions}
                                placeholder="Select Agent"
                                minWidth={200}
                                searchable
                                searchPlaceholder="Search agent..."
                            />
                        </div>

                        <div className="flex gap-2 items-center justify-end mt-3 flex-wrap">
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
                                onClick={handleGenerateReport}
                                disabled={searching}
                                style={{
                                    height: 36,
                                    padding: "0 16px",
                                    borderRadius: 8,
                                    border: "none",
                                    background: searching ? "#94A3B8" : "#0C79F7",
                                    color: "#fff",
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: searching ? "not-allowed" : "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {searching ? "Generating..." : "Generate Report"}
                            </button>
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

            <div className="mt-4">
                <Box sx={{ fontWeight: 700, fontSize: 15, color: "var(--sidebar-text-primary)", mb: 1.5 }}>
                    Available Reports
                </Box>

                {loading ? (
                    <div className="text-center py-8">
                        <Loader message="Loading..." subMessage="Please wait" />
                    </div>
                ) : (
                    <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
                    >
                        {REPORT_CATALOG.map((report) => {
                            const isSelected = selectedReport === report.value;
                            return (
                                <button
                                    key={report.id}
                                    type="button"
                                    onClick={() => handleReportChange(report.value)}
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 14,
                                        padding: 16,
                                        borderRadius: 12,
                                        border: isSelected
                                            ? "2px solid #0C79F7"
                                            : "1px solid var(--dashboard-box-border)",
                                        background: isSelected
                                            ? "rgba(12, 121, 247, 0.06)"
                                            : "var(--sidebar-text-selected)",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "border-color 0.15s, background 0.15s",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 10,
                                            background: isSelected ? "#0C79F7" : "var(--chrome-filter-bar-bg)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        <AssessmentOutlinedIcon
                                            sx={{
                                                fontSize: 24,
                                                color: isSelected ? "#fff" : "#64748B",
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 14,
                                                color: "var(--sidebar-text-primary)",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {report.title}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#64748B",
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {report.description}
                                        </div>
                                        {isSelected && (
                                            <div
                                                style={{
                                                    marginTop: 8,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    color: "#0C79F7",
                                                }}
                                            >
                                                Selected
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
