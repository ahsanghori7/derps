import { useCallback, useEffect, useMemo, useState } from "react";
import Heading from "../../Components/Heading";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import addIcon from "../../assets/addIcon.png";
import AgentTable from "../../Components/AgentTable";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import { styled } from "@mui/material/styles";
import {
    Alert,
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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { toast } from "react-toastify";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { listShipments, cancelShipment, getShippingTenantId } from "../../Api/shippingApi";
import { getFedexConnection, getFedexErrorToast } from "../../Api/FedExApi";
import {
    formatShipmentStatus,
    formatShipmentTypeLabel,
    getRecipientLabelFromShipment,
    getServiceLabel,
    isDraftShipment,
    parseShipmentListResponse,
} from "../../Utils/shippingConstants";
import editIcon from "../../assets/edit.png";

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
    zIndex: 2,
});

const formatDate = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
};

const copyToClipboard = async (text) => {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(String(text));
        toast.success("Tracking ID copied");
    } catch {
        toast.error("Failed to copy");
    }
};

const Shipping = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userDetails = useSelector((state) => state.userData?.userDetails);
    const tenantId = getShippingTenantId(userDetails);

    usePageTitle("Shipments", location);
    const [loading, setLoading] = useState(false);
    const [shipments, setShipments] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get("rowsPerPage")) || 25);
    const [totalCount, setTotalCount] = useState(0);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [filtersExpanded, setFiltersExpanded] = useState(true);
    const [fedexConfigured, setFedexConfigured] = useState(null);

    const fetchData = () => {
        if (!accessToken) return;
        setLoading(true);
        listShipments(accessToken, tenantId, { page, limit: rowsPerPage })
            .then((result) => {
                const { list, totalCount: total } = parseShipmentListResponse(result);
                setShipments(list);
                setTotalCount(total);
            })
            .catch((err) => {
                toast.error(err.message || "Failed to load shipments");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!accessToken) return undefined;
        let cancelled = false;
        getFedexConnection(accessToken)
            .then((data) => {
                if (!cancelled) setFedexConfigured(Boolean(data?.configured));
            })
            .catch(() => {
                if (!cancelled) setFedexConfigured(null);
            });
        return () => {
            cancelled = true;
        };
    }, [accessToken]);

    useEffect(() => {
        fetchData();
    }, [page, rowsPerPage, accessToken]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (page > 1) params.set("page", page.toString());
        if (rowsPerPage !== 25) params.set("rowsPerPage", rowsPerPage.toString());
        setSearchParams(params);
    }, [searchQuery, page, rowsPerPage, setSearchParams]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const filteredShipments = useMemo(() => {
        const term = searchQuery.toLowerCase().trim();
        if (!term) return shipments;

        return shipments.filter((row) => {
            const tracking = String(row?.trackingNumber || "").toLowerCase();
            const recipient = getRecipientLabelFromShipment(row).toLowerCase();
            const contactName = String(row?.contactName || "").toLowerCase();
            const reference = String(row?.reference || "").toLowerCase();
            const service = getServiceLabel(row?.serviceType).toLowerCase();
            const typeLabel = formatShipmentTypeLabel(row).toLowerCase();
            return (
                tracking.includes(term) ||
                recipient.includes(term) ||
                contactName.includes(term) ||
                reference.includes(term) ||
                service.includes(term) ||
                typeLabel.includes(term)
            );
        });
    }, [shipments, searchQuery]);

    const handleClearFilters = useCallback(() => {
        setSearchQuery("");
        setPage(1);
    }, []);

    const handleApplyFilters = useCallback(() => {
        setPage(1);
    }, []);

    const activeFilterChips = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return [{ key: "search", label: `Search: ${searchQuery.trim()}` }];
    }, [searchQuery]);

    const removeFilterChip = useCallback((key) => {
        if (key === "search") setSearchQuery("");
        setPage(1);
    }, []);

    const openShipment = useCallback((row) => {
        if (isDraftShipment(row)) {
            navigate("/home/createShipment", { state: { editDraft: row } });
            return;
        }
        navigate(`/home/shipmentDetail/${row.id}`, { state: { shipment: row } });
    }, [navigate]);

    const columns = [
        {
            id: "checkbox",
            label: "",
            align: "center",
            renderCell: (row) => {
                const rowId = row.id ?? row.trackingNumber;
                const checked = selectedIds.includes(rowId);
                return (
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                            const nextChecked = e.target.checked;
                            setSelectedIds((prev) =>
                                nextChecked
                                    ? Array.from(new Set([...prev, rowId]))
                                    : prev.filter((x) => x !== rowId)
                            );
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            },
        },
        {
            id: "shipDate",
            label: "SHIP DATE",
            align: "center",
            renderCell: (row) => formatDate(row?.shipDate || row?.createdAt),
        },
        {
            id: "recipient",
            label: "RECIPIENT",
            align: "center",
            renderCell: (row) => getRecipientLabelFromShipment(row),
        },
        {
            id: "status",
            label: "STATUS",
            align: "center",
            renderCell: (row) => formatShipmentStatus(row),
        },
        {
            id: "trackingNumber",
            label: "TRACKING ID",
            align: "center",
            renderCell: (row) => {
                const tracking = row?.trackingNumber;
                if (!tracking) return "-";
                return (
                    <span
                        className="inline-flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span
                            style={{ color: "#0C79F7", cursor: "pointer" }}
                            onClick={() => openShipment(row)}
                        >
                            {tracking}
                        </span>
                        <Tooltip title="Copy">
                            <IconButton size="small" onClick={() => copyToClipboard(tracking)}>
                                <ContentCopyIcon sx={{ fontSize: 14, color: "#0C79F7" }} />
                            </IconButton>
                        </Tooltip>
                    </span>
                );
            },
        },
        {
            id: "shipmentType",
            label: "SHIPMENT TYPE",
            align: "center",
            renderCell: (row) => formatShipmentTypeLabel(row),
        },
        {
            id: "serviceType",
            label: "SERVICE",
            align: "center",
            renderCell: (row) => getServiceLabel(row?.serviceType),
        },
        {
            id: "packagingType",
            label: "PACKAGING",
            align: "center",
            renderCell: (row) => row?.packagingType?.replace(/_/g, " ") || "-",
        },
        {
            id: "actions",
            label: "VIEW",
            align: "center",
            renderCell: (row) => {
                const isDraft = isDraftShipment(row);
                return (
                    <Tooltip title={isDraft ? "Edit draft" : "View"}>
                        <IconButton
                            size="small"
                            onClick={() => openShipment(row)}
                            aria-label={isDraft ? "Edit draft" : "View shipment"}
                        >
                            {isDraft ? (
                                <img src={editIcon} alt="edit" style={{ width: 20, height: 20 }} />
                            ) : (
                                <VisibilityOutlinedIcon sx={{ fontSize: 20, color: "#0C79F7" }} />
                            )}
                        </IconButton>
                    </Tooltip>
                );
            },
        },
    ];

    const handleCreateShipment = () => navigate("/home/createShipment");

    const handlePageChange = (newPage) => setPage(newPage);

    const handleRowsPerPageChange = (newRowsPerPage) => {
        setRowsPerPage(newRowsPerPage);
        setPage(1);
    };

    const openCancelModal = (row) => {
        setCancelTarget(row);
        setShowCancelModal(true);
    };

    const confirmCancel = async () => {
        if (!cancelTarget?.trackingNumber) {
            toast.error("No tracking number found");
            return;
        }
        setLoading(true);
        try {
            await cancelShipment(accessToken, tenantId, {
                trackingNumber: cancelTarget.trackingNumber,
            });
            toast.success("Shipment cancelled successfully");
            setShowCancelModal(false);
            setCancelTarget(null);
            setSelectedIds([]);
            fetchData();
        } catch (err) {
            toast.error(getFedexErrorToast(err, "Failed to cancel shipment"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen"
            style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}
        >
            <HeaderWrapper>
                <Heading
                    Fontweight={700}
                    color={"var(--sidebar-text-primary)"}
                    Heading={`Shipments`}
                    Fontsize={30}
                />
                <BottonWithIcon
                    backgroundColor={"#0C79F7"}
                    icon={addIcon}
                    title={"Create Shipment"}
                    height={40}
                    color={"var(--sidebar-text-selected)"}
                    fontSize={16}
                    fontWeight={500}
                    className="!mb-0 !mx-0"
                    onClick={handleCreateShipment}
                />
            </HeaderWrapper>

            {fedexConfigured === false ? (
                <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => navigate("/home/fedexSettings")}>
                            Open FedEx settings
                        </Button>
                    }
                >
                    FedEx is not configured for this tenant. Save credentials in Settings → FedEx
                    before creating shipments or labels.
                </Alert>
            ) : null}

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
                        {!filtersExpanded && searchQuery.trim() && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ ml: 1 }}>
                                <Chip
                                    size="small"
                                    label={`Search: ${searchQuery.trim()}`}
                                    variant="outlined"
                                />
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
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by tracking ID, recipient, reference or service..."
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

                            <div className="flex gap-2 items-center ml-auto">
                                {selectedIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const row = shipments.find(
                                                (s) =>
                                                    (s.id ?? s.trackingNumber) === selectedIds[0]
                                            );
                                            if (row) openCancelModal(row);
                                        }}
                                        style={{
                                            height: 36,
                                            padding: "0 14px",
                                            borderRadius: 8,
                                            border: "none",
                                            background: "#EF4444",
                                            color: "#fff",
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Cancel Selected
                                    </button>
                                )}
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
                ) : filteredShipments.length === 0 ? (
                    <NoDataFound
                        title="No Shipments Found"
                        description={
                            searchQuery.trim()
                                ? "No shipments match your search"
                                : "Create your first shipment to get started."
                        }
                    />
                ) : (
                    <>
                        <div style={{ fontSize: 12, color: "var(--Gray)", marginBottom: 8 }}>
                            Viewing {filteredShipments.length} of {totalCount} shipments
                        </div>
                        <AgentTable
                            columns={columns}
                            data={filteredShipments}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={handlePageChange}
                            onRowsPerPageChange={handleRowsPerPageChange}
                            onRowClick={openShipment}
                            containerMaxHeight="calc(100vh - 300px)"
                        />
                    </>
                )}
            </div>

            <DeleteConfirmationModal
                open={showCancelModal}
                title="Cancel Shipment"
                subtitle="Are you sure you want to cancel shipment"
                entityName={cancelTarget?.trackingNumber || ""}
                warningMessage="This will cancel the shipment with FedEx. This action cannot be undone."
                onCancel={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                }}
                onDelete={confirmCancel}
                isLoading={loading}
            />
        </div>
    );
};

export default Shipping;
