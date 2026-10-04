import { useCallback, useEffect, useMemo, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
    Box,
    Button,
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
import MemoTable from "../../Components/MemoTable";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { getRequestWithOutBody } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import AssignedByCell from "../../Components/AssignedByCell";
import { styled } from "@mui/material/styles";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import FilterDropdown from "../../Components/FilterDropdown";
import returnsIcon from "../../assets/previewEye.png";
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

const SNReport = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Serial Number Report", location);

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [searchDraft, setSearchDraft] = useState(searchParams.get("search") || "");
    const [selectedItem, setSelectedItem] = useState(searchParams.get("item") || "");
    const [serialData, setSerialData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get("rowsPerPage")) || 25);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    const fetchSerialData = () => {
        setLoading(true);
        getRequestWithOutBody(`${baseURl}invoice/serials/assigned`, accessToken)
            .then((result) => {
                const mappedData = (result?.data || []).map((item, index) => ({
                    id: item.serialId || index + 1,
                    serialNumber: item.serialNo || "-",
                    hardwareItem: item.itemName || "-",
                    assignedMerchant: item?.merchantDbaName || "-",
                    assignedBy: (
                        <AssignedByCell
                            name={item?.assignedByName || item?.assignedBy?.name || "-"}
                            date={item?.assignedDate}
                            align="center"
                        />
                    ),
                }));
                setSerialData(mappedData);
                setFilteredData(mappedData);
                setLoading(false);
            })
            .catch((error) => {
                toast.error(error?.message || "Failed to fetch serial numbers");
                setSerialData([]);
                setFilteredData([]);
                setLoading(false);
            });
    };

    const fetchItemServices = () => {
        getRequestWithOutBody(`${baseURl}item-services`, accessToken)
            .then((result) => {
                const list = Array.isArray(result?.data) ? result.data : [];
                const sortedData = [...list].sort((a, b) => {
                    const idA = Number(a.id);
                    const idB = Number(b.id);

                    if (idA === 0) return 1;
                    if (idB === 0) return -1;

                    return idB - idA;
                });

                setItemServicesList(sortedData);
            })
            .catch(() => {
                setItemServicesList([]);
            });
    };

    useEffect(() => {
        fetchSerialData();
        fetchItemServices();
    }, []);

    useEffect(() => {
        let filtered = serialData;

        if (search.trim()) {
            filtered = filtered.filter((item) =>
                item.serialNumber.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (selectedItem) {
            filtered = filtered.filter((item) => item.hardwareItem === selectedItem);
        }

        setFilteredData(filtered);
    }, [serialData, search, selectedItem]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (selectedItem) params.set("item", selectedItem);
        if (page > 1) params.set("page", page.toString());
        if (rowsPerPage !== 25) params.set("rowsPerPage", rowsPerPage.toString());

        setSearchParams(params);
    }, [search, selectedItem, page, rowsPerPage, setSearchParams]);

    useEffect(() => {
        setPage(1);
    }, [search, selectedItem]);

    const itemOptions = useMemo(() => {
        const names = [
            ...itemServicesList
                .map((item) => item.name || item.itemName || item.title)
                .filter(Boolean),
            ...serialData
                .map((item) => item.hardwareItem)
                .filter((name) => name && name !== "-"),
        ];
        return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    }, [itemServicesList, serialData]);

    const columns = [
        { id: "serialNumber", label: "Serial Number", align: "center" },
        { id: "hardwareItem", label: "Hardware Item", align: "center" },
        { id: "assignedMerchant", label: "Assigned Merchant", align: "center" },
        { id: "assignedBy", label: "Assigned By", align: "center" },
    ];

    const handleBack = () => {
        navigate(-1);
    };

    const handleApplyFilters = useCallback(() => {
        setSearch(String(searchDraft || "").trim());
        setPage(1);
    }, [searchDraft]);

    const handleClearFilters = useCallback(() => {
        setSearch("");
        setSearchDraft("");
        setSelectedItem("");
        setPage(1);
    }, []);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (search) chips.push({ key: "search", label: `Search: ${search}` });
        if (selectedItem) chips.push({ key: "item", label: `Item: ${selectedItem}` });
        return chips;
    }, [search, selectedItem]);

    const removeFilterChip = useCallback((key) => {
        if (key === "search") {
            setSearch("");
            setSearchDraft("");
        }
        if (key === "item") setSelectedItem("");
        setPage(1);
    }, []);

    const handleRowClick = (row) => {
        navigate("/home/snItemDetail", { state: { serialId: row.id } });
    };

    return (
        <div
            className="min-h-screen"
            style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}
        >
            <HeaderWrapper>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Button
                        onClick={handleBack}
                        style={{
                            minWidth: 40,
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: "var(--dashboard-card-bg)",
                            border: "1px solid var(--dashboard-border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                    >
                        <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                    </Button>
                    <Heading
                        Fontweight={700}
                        color={"var(--sidebar-text-primary)"}
                        Heading={`Serial Number Report`}
                        Fontsize={30}
                    />
                </div>
                <BottonWithIcon
                    backgroundColor={"#0C79F7"}
                    icon={returnsIcon}
                    title={"View Return"}
                    height={40}
                    color={"var(--sidebar-text-selected)"}
                    fontSize={16}
                    fontWeight={500}
                    className="!mb-0 !mx-0"
                    onClick={() =>
                        navigate("/home/returns", { state: { from: "/home/snReport" } })
                    }
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
                        <Box sx={{ fontWeight: 700, fontSize: 14 }}>Filters</Box>
                        {!filtersExpanded && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                {search && (
                                    <Chip size="small" label={`Search: ${search}`} variant="outlined" />
                                )}
                                {selectedItem && (
                                    <Chip size="small" label={`Item: ${selectedItem}`} variant="outlined" />
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
                            <div
                                style={{
                                    background: "var(--chrome-filter-bar-bg)",
                                    borderRadius: 8,
                                    padding: "0 12px",
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    flex: "1 1 240px",
                                    maxWidth: 420,
                                    minWidth: 200,
                                    height: 40,
                                    boxSizing: "border-box",
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
                                        if (e.key === "Enter") handleApplyFilters();
                                    }}
                                    placeholder="Search by serial number..."
                                    style={{
                                        outline: "none",
                                        background: "transparent",
                                        width: "100%",
                                        fontSize: 13,
                                        border: "none",
                                        color: "var(--sidebar-text-primary)",
                                    }}
                                />
                            </div>

                            <FilterDropdown
                                value={selectedItem}
                                onChange={setSelectedItem}
                                options={[
                                    { label: "All Hardware Items", value: "" },
                                    ...itemOptions.map((name) => ({ label: name, value: name })),
                                ]}
                                placeholder="All Hardware Items"
                                minWidth={180}
                                placeholderValues={[""]}
                                searchable
                                searchPlaceholder="Search item..."
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
                ) : filteredData?.length === 0 ? (
                    <NoDataFound title="No Data Found" description="No serial numbers found." />
                ) : (
                    <MemoTable
                        data={filteredData}
                        columns={columns}
                        onRowClick={handleRowClick}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={(newRows) => {
                            setRowsPerPage(newRows);
                            setPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default SNReport;
