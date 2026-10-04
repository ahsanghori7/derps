import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { useSelector } from "react-redux";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PageHeader from "../../Components/PageHeader";
import AppButton from "../../Components/AppButton";
import MemoTable from "../../Components/MemoTable";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import TaxDashboardBox from "../../Components/TaxDashboardBox";
import addIcon from "../../assets/addIcon.png";
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { toast } from "react-toastify";
import { getErrorMessage } from "../../Utils/errorHandler";

const StageCardsWrapper = styled("div")({
    marginTop: 16,
    marginBottom: 16,
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 8,
    "@media (max-width: 1100px)": {
        display: "flex",
        flexWrap: "wrap",
    },
});

const StageCardItem = styled("div")({
    cursor: "pointer",
    minWidth: 0,
    width: "100%",
    "@media (max-width: 1100px)": {
        flex: "1 1 140px",
        width: "auto",
        maxWidth: "calc(33.333% - 6px)",
    },
    "@media (max-width: 768px)": {
        flex: "1 1 calc(50% - 4px)",
        maxWidth: "calc(50% - 4px)",
    },
    "@media (max-width: 480px)": {
        flex: "1 1 100%",
        maxWidth: "100%",
    },
});

const SALES_ORDER_STATUS_FILTERS = [
    { key: "all", title: "All Sales Orders", subtitle: "Total sales orders value" },
    { key: "processing", title: "Processing", subtitle: "Processing orders value" },
    { key: "confirmed", title: "Confirmed", subtitle: "Confirmed orders value" },
    { key: "shipped", title: "Shipped", subtitle: "Shipped orders value" },
    { key: "delivered", title: "Delivered", subtitle: "Delivered orders value" },
    { key: "cancelled", title: "Cancelled", subtitle: "Cancelled orders value" },
];

const SALES_ORDER_TABS = SALES_ORDER_STATUS_FILTERS.map(({ key, title }) => ({
    id: key,
    label: title,
}));

const formatMoney = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const extractSalesOrderStats = (result) => {
    const payload = result?.data ?? result;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload;
};

const getSalesOrderStatCount = (stats, statusKey) => {
    if (!stats) return 0;
    if (statusKey === "all") return Number(stats.total) || 0;
    return Number(stats.byStatus?.[statusKey]) || 0;
};

const getSalesOrderStatAmount = (stats, statusKey) => {
    if (!stats) return 0;
    if (statusKey === "all") return Number(stats.totalAmount) || 0;
    return Number(stats.amountByStatus?.[statusKey]) || 0;
};

const STATUS_STYLES = {
    delivered: { color: "#D97706", backgroundColor: "#FEF3C7", icon: LocalShippingOutlinedIcon },
    confirmed: { color: "#059669", backgroundColor: "#D1FAE5", icon: CheckCircleOutlineIcon },
    cancelled: { color: "#DC2626", backgroundColor: "#FEE2E2", icon: CancelOutlinedIcon },
    shipped: { color: "#7C3AED", backgroundColor: "#EDE9FE", icon: LocalShippingOutlinedIcon },
    processing: { color: "#2563EB", backgroundColor: "#DBEAFE", icon: Inventory2OutlinedIcon },
};

const formatDateDDMMYYYY = (value) => {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const formatStatusLabel = (status) => {
    if (!status) return "-";
    return String(status)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const renderStatusBadge = (status) => {
    const key = String(status ?? "").trim().toLowerCase();
    const styles = STATUS_STYLES[key] || { color: "#64748B", backgroundColor: "#F1F5F9", icon: Inventory2OutlinedIcon };
    const Icon = styles.icon;

    return (
        <span
            style={{
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                padding: "4px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
            }}
        >
            <Icon sx={{ fontSize: 14 }} />
            {formatStatusLabel(status)}
        </span>
    );
};

const transformSalesOrderRow = (item) => ({
    ...item,
    orderNo: item.orderNo || "-",
    accountName: item.account?.name || "-",
    quotationNo:
        item.quotation?.quotationNumber ||
        item.quotation?.number ||
        item.quotation?.quotationNo ||
        "-",
    status: item.status || "-",
    total: Number(item.total) || 0,
    orderDateText: formatDateDDMMYYYY(item.orderDate),
    expectedDeliveryText: formatDateDDMMYYYY(item.deliveryDate),
});

const SalesOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const accessToken = useSelector((state) => state.auth.accessToken);

    usePageTitle("Sales Orders", location);

    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [salesOrderStats, setSalesOrderStats] = useState(null);
    const [salesOrders, setSalesOrders] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [rowsPerPage, setRowsPerPage] = useState(Number(searchParams.get("rowsPerPage")) || 25);
    const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "all");

    const fetchStats = useCallback(() => {
        if (!accessToken) return;

        setStatsLoading(true);
        getRequestWithOutBody(`${baseURl}sales-order/stats`, accessToken)
            .then((result) => {
                setSalesOrderStats(extractSalesOrderStats(result));
            })
            .catch(() => {
                setSalesOrderStats(null);
            })
            .finally(() => {
                setStatsLoading(false);
            });
    }, [accessToken]);

    const fetchSalesOrders = useCallback(() => {
        if (!accessToken) return;

        setLoading(true);

        const params = new URLSearchParams();
        params.append("paginate", "true");
        params.append("page", String(page));
        params.append("limit", String(rowsPerPage));
        if (selectedStatus && selectedStatus !== "all") {
            params.append("status", selectedStatus);
        }

        const apiUrl = `${baseURl}sales-order?${params.toString()}`;

        getRequestWithOutBody(apiUrl, accessToken)
            .then((result) => {
                const payload = result?.data ?? result;
                const rows = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                      ? payload.data
                      : payload?.results || payload?.data?.results || [];
                const count =
                    result?.totalRecords ??
                    payload?.totalRecords ??
                    rows.length;

                const transformed = (Array.isArray(rows) ? rows : []).map(transformSalesOrderRow);
                setSalesOrders(transformed);
                setTotalCount(Number(count) || 0);
            })
            .catch(() => {
                setSalesOrders([]);
                setTotalCount(0);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [accessToken, page, rowsPerPage, selectedStatus]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchSalesOrders();
    }, [fetchSalesOrders]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (page > 1) params.set("page", page.toString());
        if (rowsPerPage !== 25) params.set("rowsPerPage", rowsPerPage.toString());
        if (selectedStatus !== "all") params.set("status", selectedStatus);
        setSearchParams(params, { replace: true });
    }, [page, rowsPerPage, selectedStatus, setSearchParams]);

    const handleStatusFilter = useCallback((statusKey) => {
        setSelectedStatus(statusKey);
        setPage(1);
    }, []);

    const getStatusCount = useCallback(
        (statusKey) => {
            if (statsLoading && !salesOrderStats) return "—";
            return String(getSalesOrderStatCount(salesOrderStats, statusKey));
        },
        [salesOrderStats, statsLoading]
    );

    const getStatusAmount = useCallback(
        (statusKey) => {
            if (statsLoading && !salesOrderStats) return "—";
            return formatMoney(getSalesOrderStatAmount(salesOrderStats, statusKey));
        },
        [salesOrderStats, statsLoading]
    );

    const activeTabLabel = useMemo(
        () => SALES_ORDER_TABS.find((tab) => tab.id === selectedStatus)?.label || "All Sales Orders",
        [selectedStatus]
    );

    const columns = useMemo(
        () => [
            { id: "orderNo", label: "ORDER NO", align: "center" },
            { id: "accountName", label: "ACCOUNT", align: "center" },
            { id: "quotationNo", label: "QUOTATION", align: "center" },
            {
                id: "status",
                label: "STATUS",
                align: "center",
                format: (value) => renderStatusBadge(value),
            },
            { id: "total", label: "TOTAL", align: "center" },
            { id: "orderDateText", label: "ORDER DATE", align: "center" },
            { id: "expectedDeliveryText", label: "EXPECTED DELIVERY", align: "center" },
            {
                id: "action",
                label: "ACTION",
                align: "center",
                format: () => (
                    <span
                        style={{
                            color: "#0C79F7",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "13px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                        }}
                    >
                        View Details
                        <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                    </span>
                ),
            },
        ],
        []
    );

    const handleCreateSalesOrder = () => {
        navigate("/home/createSalesOrder");
    };

    const handleViewDetails = (event, row) => {
        const order = row ?? event;
        if (order?.id) {
            navigate(`/home/salesOrder/${order.id}`, { state: { salesOrder: order } });
        }
    };

    const handleDeleteClick = () => {
        if (selectedRowIds.length === 0) return;
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        const idsToDelete = [...selectedRowIds];
        setShowDeleteModal(false);
        setDeleting(true);
        try {
            await postRequestWithBodyAndToken(
                `${baseURl}sales-order/bulk-delete`,
                accessToken,
                { ids: idsToDelete }
            );
            setSelectedRowIds([]);
            toast.success(
                `${idsToDelete.length} sales order${idsToDelete.length > 1 ? "s" : ""} deleted successfully.`
            );
            fetchSalesOrders();
            fetchStats();
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to delete sales orders."));
        } finally {
            setDeleting(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}>
            <PageHeader
                title="Sales Orders"
                actions={(
                    <>
                        {selectedRowIds.length > 0 && (
                            <AppButton
                                variant="danger"
                                title={`Delete (${selectedRowIds.length})`}
                                onClick={handleDeleteClick}
                            />
                        )}
                        <AppButton
                            icon={addIcon}
                            title="Create Sales Order"
                            onClick={handleCreateSalesOrder}
                        />
                    </>
                )}
            />

            <StageCardsWrapper>
                {SALES_ORDER_STATUS_FILTERS.map((status) => {
                    const isSelected = selectedStatus === status.key;
                    return (
                        <StageCardItem
                            key={status.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleStatusFilter(status.key)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleStatusFilter(status.key);
                                }
                            }}
                        >
                            <TaxDashboardBox
                                compact
                                selected={isSelected}
                                title={status.title}
                                amount={getStatusCount(status.key)}
                                subtitle={getStatusAmount(status.key)}
                            />
                        </StageCardItem>
                    );
                })}
            </StageCardsWrapper>

            <div
                className="flex gap-6 flex-wrap mt-2"
                style={{ borderBottom: "1px solid var(--dashboard-box-border)" }}
            >
                {SALES_ORDER_TABS.map((tab) => {
                    const isActive = selectedStatus === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleStatusFilter(tab.id)}
                            className="pb-3 px-1"
                            style={{
                                fontSize: 14,
                                fontWeight: isActive ? 700 : 600,
                                color: isActive ? "#0C79F7" : "#64748B",
                                background: "transparent",
                                border: "none",
                                borderBottom: isActive ? "3px solid #0C79F7" : "3px solid transparent",
                                marginBottom: -1,
                                cursor: "pointer",
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="text-center w-full mx-auto py-8">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            ) : salesOrders.length === 0 ? (
                <NoDataFound
                    title="No Data Found"
                    description={`No ${activeTabLabel.toLowerCase()} found.`}
                />
            ) : (
                <div
                    className="w-[100%] mt-4"
                    style={{ backgroundColor: "var(--dashboard-card-bg)", borderRadius: 14, padding: 20 }}
                >
                    <MemoTable
                        data={salesOrders}
                        columns={columns}
                        showCheckbox
                        selectedRowIds={selectedRowIds}
                        onSelectionChange={setSelectedRowIds}
                        onActionClick={handleViewDetails}
                        onRowClick={handleViewDetails}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        totalCount={totalCount}
                        onPageChange={setPage}
                        onRowsPerPageChange={(newRows) => {
                            setRowsPerPage(newRows);
                            setPage(1);
                        }}
                    />
                </div>
            )}

            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Sales Orders"
                subtitle="Are you sure you want to delete the selected"
                entityName={`${selectedRowIds.length} sales order${selectedRowIds.length > 1 ? "s" : ""}`}
                warningMessage="This action cannot be undone. The selected sales orders will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={deleting}
            />
        </div>
    );
};

export default SalesOrder;
