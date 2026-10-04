import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { Button, Menu, MenuItem } from "@mui/material";
import { useSelector } from "react-redux";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { IoIosArrowBack } from "react-icons/io";
import { toast } from "react-toastify";
import Heading from "../../Components/Heading";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import { deleteRequest, getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { getErrorMessage } from "../../Utils/errorHandler";
import { usePageTitle } from "../../Hooks/usePageTitle";

const ORDER_STATUS_STEPS = ["Processing", "Confirmed", "Shipped", "Delivered"];

const ORDER_STATUS_OPTIONS = [
    { value: "delivered", label: "Delivered" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "shipped", label: "Shipped" },
    { value: "processing", label: "Processing" },
];

const formatStatusLabel = (status) => {
    const key = String(status ?? "").trim().toLowerCase();
    const match = ORDER_STATUS_OPTIONS.find((option) => option.value === key);
    if (match) return match.label;
    return key ? key.charAt(0).toUpperCase() + key.slice(1) : "-";
};

const STATUS_DROPDOWN_OPTIONS = {
    processing: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
};

const getAvailableStatusOptions = (status) => {
    const key = String(status ?? "").trim().toLowerCase();
    const allowedValues = STATUS_DROPDOWN_OPTIONS[key];

    if (!allowedValues?.length) return [];

    return allowedValues
        .map((value) => ORDER_STATUS_OPTIONS.find((option) => option.value === value))
        .filter(Boolean);
};

const STATUS_BADGE_STYLES = {
    confirmed: { color: "#059669", backgroundColor: "#D1FAE5" },
    processing: { color: "#2563EB", backgroundColor: "#DBEAFE" },
    shipped: { color: "#7C3AED", backgroundColor: "#EDE9FE" },
    delivered: { color: "#D97706", backgroundColor: "#FEF3C7" },
    cancelled: { color: "#DC2626", backgroundColor: "#FEE2E2" },
};

const SummaryCard = styled("div")({
    backgroundColor: "var(--dashboard-card-bg)",
    border: "1px solid #E2E8F0",
    borderRadius: 14,
    padding: "20px 24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
});

const ItemsCard = styled("div")({
    backgroundColor: "var(--dashboard-card-bg)",
    border: "1px solid #E2E8F0",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
});

const ItemsTableHeader = styled("div")({
    display: "grid",
    gridTemplateColumns: "2fr 0.5fr 0.9fr 0.55fr 0.9fr",
    gap: 8,
    padding: "10px 16px",
    backgroundColor: "#0C79F7",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 10,
    textTransform: "uppercase",
});

const ItemsTableRow = styled("div")({
    display: "grid",
    gridTemplateColumns: "2fr 0.5fr 0.9fr 0.55fr 0.9fr",
    gap: 8,
    padding: "12px 16px",
    alignItems: "center",
    borderBottom: "1px solid #E2E8F0",
    fontSize: 13,
    color: "var(--sidebar-text-primary)",
    backgroundColor: "#FFFFFF",
});

const NotesCard = styled("div")({
    backgroundColor: "#FFFBEB",
    border: "1px solid #FDE68A",
    borderRadius: 12,
    padding: "16px 18px",
    minHeight: 120,
});

const HeaderWrapper = styled("div")({
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 16,
    zIndex: 100,
});

const HeaderLeft = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: 16,
    zIndex: 101,
});

const HeaderActions = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    position: "relative",
    zIndex: 101,
});

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

const formatDateDisplay = (value) => {
    if (!value) return "-";

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return "-";
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        const year = value.getFullYear();
        return `${month}-${day}-${year}`;
    }

    if (typeof value === "string") {
        const datePart = value.includes("T") ? value.split("T")[0] : value;
        const parts = datePart.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
            const [year, month, day] = parts;
            return `${month}-${day}-${year}`;
        }
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
    }

    return String(value);
};

const MOCK_ORDER_DETAILS = {
    1: {
        orderNo: "SO-2026-001",
        status: "confirmed",
        total: 123912,
        account: "Global Solutions",
        quotation: "QUO-2026-003",
        poReference: "PO-GS-2026-034",
        owner: "Sarah Jenkins",
        orderDate: "2026-07-26",
        expectedDelivery: "2026-07-01",
        notes: "Priority implementation. Client has hard deadline for board presentation.",
        lineItems: [
            {
                id: 1,
                product: "Enterprise CRM Platform",
                qty: 50,
                unitPrice: 1800,
                discPercent: 10,
                taxPercent: 8,
                total: 87480,
            },
            {
                id: 2,
                product: "Mobile App Package",
                qty: 1,
                unitPrice: 15000,
                discPercent: 5,
                taxPercent: 8,
                total: 15390,
            },
            {
                id: 3,
                product: "Implementation & Training",
                qty: 1,
                unitPrice: 12000,
                discPercent: null,
                taxPercent: 8,
                total: 12000,
            },
        ],
        subtotal: 126000,
        discount: 10350,
        tax: 8262,
        grandTotal: 123912,
    },
};

const getAccountLabel = (row) => {
    if (row?.accountName) return row.accountName;
    if (typeof row?.account === "string") return row.account;
    if (row?.account?.name) return row.account.name;
    return "-";
};

const getQuotationLabel = (row) => {
    if (!row?.quotation) {
        if (row?.quotationId) return `QUOT-${String(row.quotationId).padStart(6, "0")}`;
        return row?.quotationNo || "-";
    }
    if (typeof row?.quotation === "string") return row.quotation;
    return (
        row.quotation?.quotationNumber
        || row.quotation?.number
        || row.quotation?.quotationNo
        || row?.quotationNo
        || (row.quotation?.id ? `QUOT-${String(row.quotation.id).padStart(6, "0")}` : "-")
    );
};

const getOwnerLabel = (row) => {
    if (typeof row?.owner === "string") return row.owner;
    if (row?.owner && typeof row.owner === "object") {
        if (row.owner.dbaName) return row.owner.dbaName;
        if (row.owner.legalBusinessName) return row.owner.legalBusinessName;
        const firstName = row.owner.firstName || row.owner.name || "";
        const lastName = row.owner.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) return fullName;
    }
    if (row?.orderOwner?.dbaName) return row.orderOwner.dbaName;
    if (row?.orderOwner?.legalBusinessName) return row.orderOwner.legalBusinessName;
    if (row?.orderOwner?.name) return row.orderOwner.name;
    if (typeof row?.orderOwner === "string") return row.orderOwner;
    if (row?.orderOwnerName) return row.orderOwnerName;
    if (typeof row?.orderOwner === "number" && row?.orderOwnerName) return row.orderOwnerName;
    if (typeof row?.orderOwner === "number") return `Customer #${row.orderOwner}`;
    if (row?.orderOwnerId) return `Customer #${row.orderOwnerId}`;
    return "-";
};

const extractSalesOrderResponse = (result) => result?.data?.data ?? result?.data ?? result;

const mapOrderItems = (orderItems = []) =>
    (Array.isArray(orderItems) ? orderItems : []).map((item) => {
        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const amount = Number(item.amount) || 0;
        const taxAmount = Number(item.taxAmount) || 0;
        const lineSubtotal = qty * unitPrice;
        const taxPercent =
            lineSubtotal > 0 ? Number(((taxAmount / lineSubtotal) * 100).toFixed(2)) : 0;

        return {
            id: item.id,
            product: item.item?.name || item.product || item.productName || "-",
            qty,
            unitPrice,
            discPercent: item.discPercent ?? item.discountPercent ?? null,
            taxPercent: taxPercent || "-",
            total: amount,
        };
    });

const normalizeSalesOrderDetail = (row) => {
    if (!row) return getDefaultDetail();

    const lineItems =
        row.lineItems?.length > 0
            ? row.lineItems
            : mapOrderItems(row.orderItems);

    return {
        orderNo: row.orderNo || "-",
        status: row.status || "processing",
        total: Number(row.total) || 0,
        grandTotal: Number(row.total) || 0,
        account: getAccountLabel(row),
        quotation: getQuotationLabel(row),
        poReference: row.poReference || row.poReferenceNo || row.purchaseOrder?.poNo || "-",
        owner: getOwnerLabel(row),
        orderDate: row.orderDate || row.orderDateText || "-",
        expectedDelivery: row.deliveryDate || row.expectedDelivery || row.expectedDeliveryText || "-",
        notes: row.notes || row.note || "-",
        lineItems,
        subtotal: Number(row.subtotal ?? row.subTotal) || 0,
        discount: Number(row.discount) || 0,
        tax: Number(row.tax) || 0,
    };
};

const getDefaultDetail = (row) => ({
    orderNo: row?.orderNo || "SO-2026-001",
    status: row?.status || "confirmed",
    total: row?.total ?? 123912,
    account: getAccountLabel(row) || "Global Solutions",
    quotation: getQuotationLabel(row) || "QUO-2026-003",
    poReference: row?.poReference || row?.poReferenceNo || "PO-GS-2026-034",
    owner: getOwnerLabel(row) || "Sarah Jenkins",
    orderDate: row?.orderDate || row?.orderDateText || "2026-07-26",
    expectedDelivery: row?.deliveryDate || row?.expectedDelivery || row?.expectedDeliveryText || "2026-07-01",
    notes: row?.notes || row?.note || "Priority implementation. Client has hard deadline for board presentation.",
    lineItems: row?.orderItems?.length ? mapOrderItems(row.orderItems) : MOCK_ORDER_DETAILS[1].lineItems,
    subtotal: Number(row?.subtotal ?? row?.subTotal) || 126000,
    discount: Number(row?.discount) || 10350,
    tax: Number(row?.tax) || 8262,
    grandTotal: Number(row?.total) || 123912,
});

const OrderStatusStepper = ({ currentStatus }) => {
    const normalized = String(currentStatus || "confirmed").toLowerCase();

    if (normalized === "cancelled") {
        return (
            <div
                style={{
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: "1px solid #E2E8F0",
                    fontSize: 14,
                    fontWeight: 600,
                    color: STATUS_BADGE_STYLES.cancelled.color,
                    textAlign: "center",
                }}
            >
                This order has been cancelled.
            </div>
        );
    }

    const activeIndex = Math.max(
        0,
        ORDER_STATUS_STEPS.findIndex((step) => step.toLowerCase() === normalized)
    );

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0,
                flexWrap: "wrap",
                marginTop: 20,
                paddingTop: 20,
                borderTop: "1px solid #E2E8F0",
                width: "100%",
            }}
        >
            {ORDER_STATUS_STEPS.map((step, index) => {
                const isCompleted = index < activeIndex;
                const isActive = index === activeIndex;

                return (
                    <div key={step} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 90 }}>
                            <span
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: isCompleted ? "#10B981" : isActive ? "#0C79F7" : "#FFFFFF",
                                    border: isCompleted
                                        ? "2px solid #10B981"
                                        : isActive
                                            ? "2px solid #0C79F7"
                                            : "2px solid #D1D5DB",
                                    color: isCompleted || isActive ? "#FFFFFF" : "#9CA3AF",
                                    fontSize: 13,
                                    fontWeight: 700,
                                }}
                            >
                                {isCompleted ? <CheckIcon sx={{ fontSize: 18 }} /> : index + 1}
                            </span>
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: isActive || isCompleted ? 600 : 500,
                                    color: isCompleted ? "#10B981" : isActive ? "#0C79F7" : "#9CA3AF",
                                }}
                            >
                                {step}
                            </span>
                        </div>
                        {index < ORDER_STATUS_STEPS.length - 1 && (
                            <div
                                style={{
                                    width: 72,
                                    height: 2,
                                    backgroundColor: index < activeIndex ? "#10B981" : "#E5E7EB",
                                    margin: "0 8px 24px",
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const SalesOrderDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const accessToken = useSelector((state) => state.auth.accessToken);

    const [salesOrderRaw, setSalesOrderRaw] = useState(location.state?.salesOrder || null);
    const [loading, setLoading] = useState(true);

    const fetchSalesOrderDetail = useCallback(async () => {
        if (!id || !accessToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const result = await getRequestWithOutBody(`${baseURl}sales-order/${id}`, accessToken);
            const data = extractSalesOrderResponse(result);

            if (data && typeof data === "object") {
                setSalesOrderRaw(data);
            } else if (!location.state?.salesOrder) {
                setSalesOrderRaw(null);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load sales order"));
            if (!location.state?.salesOrder) {
                setSalesOrderRaw(null);
            }
        } finally {
            setLoading(false);
        }
    }, [id, accessToken, location.state?.salesOrder]);

    useEffect(() => {
        fetchSalesOrderDetail();
    }, [fetchSalesOrderDetail]);

    useEffect(() => {
        setJustConverted(false);
    }, [id]);

    const order = useMemo(() => {
        if (salesOrderRaw) return normalizeSalesOrderDetail(salesOrderRaw);

        const mock = MOCK_ORDER_DETAILS[id] || MOCK_ORDER_DETAILS[1];
        return normalizeSalesOrderDetail({ ...mock, ...getDefaultDetail() });
    }, [id, salesOrderRaw]);

    usePageTitle("Sale Order Details", location);

    const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [convertingToInvoice, setConvertingToInvoice] = useState(false);
    const [justConverted, setJustConverted] = useState(false);
    const statusKey = String(order.status || "confirmed").toLowerCase();
    const badgeStyle = STATUS_BADGE_STYLES[statusKey] || STATUS_BADGE_STYLES.confirmed;

    const availableStatusOptions = useMemo(
        () => getAvailableStatusOptions(statusKey),
        [statusKey]
    );

    const handleStatusUpdate = async (newStatus) => {
        setStatusMenuAnchor(null);

        if (!salesOrderRaw?.id || !accessToken) {
            toast.error("Unable to update status");
            return;
        }

        setStatusUpdating(true);
        try {
            await putRequestWithBodyAndToken(
                `${baseURl}sales-order/${salesOrderRaw.id}`,
                accessToken,
                { status: newStatus }
            );

            setSalesOrderRaw((prev) => (prev ? { ...prev, status: newStatus } : prev));
            toast.success(`Status updated to ${formatStatusLabel(newStatus)}`);
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to update status"));
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    const handleConvertToInvoice = async () => {
        if (!salesOrderRaw?.id || !accessToken || convertingToInvoice || justConverted) return;

        setConvertingToInvoice(true);
        try {
            const result = await postRequestWithBodyAndToken(
                `${baseURl}sales-order/${salesOrderRaw.id}/convert-to-invoice`,
                accessToken,
                {}
            );
            toast.success("Converted to invoice successfully");

            // Mark converted locally right away so the button hides even if id
            // extraction/navigation below fails — prevents a second invoice.
            setJustConverted(true);

            const invoiceId =
                result?.data?.data?.id
                ?? result?.data?.data?.invoiceId
                ?? result?.data?.id
                ?? result?.data?.invoiceId
                ?? result?.id
                ?? result?.invoiceId
                ?? null;
            const invoiceData = extractSalesOrderResponse(result);

            if (invoiceId) {
                navigate("/home/editInvoice", {
                    state: { invoiceData: { ...invoiceData, id: invoiceId } },
                });
            } else {
                // Couldn't resolve the new invoice id from the response — refetch
                // the order so any authoritative status change still hides the button.
                await fetchSalesOrderDetail();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to convert to invoice"));
        } finally {
            setConvertingToInvoice(false);
        }
    };

    const confirmDelete = async () => {
        if (!salesOrderRaw?.id || !accessToken) {
            toast.error("Unable to delete sales order");
            return;
        }

        setDeleting(true);
        try {
            await putRequestWithBodyAndToken(
                `${baseURl}sales-order/${salesOrderRaw.id}`,
                accessToken,
                { status: "cancelled" }
            );
            await deleteRequest(`${baseURl}sales-order/${salesOrderRaw.id}`, accessToken);
            setShowDeleteModal(false);
            toast.success("Sales order deleted successfully");
            navigate("/home/salesOrder");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to delete sales order"));
        } finally {
            setDeleting(false);
        }
    };

    const metaFields = [
        { label: "Account", value: order.account },
        { label: "Source Quotation", value: order.quotation },
        { label: "PO Reference", value: order.poReference },
        { label: "Owner", value: order.owner },
        { label: "Order Date", value: formatDateDisplay(order.orderDate) },
        { label: "Expected Delivery", value: formatDateDisplay(order.expectedDelivery) },
    ];

    if (loading && !salesOrderRaw) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}
            >
                <Loader message="Loading..." subMessage="Please wait" />
            </div>
        );
    }

    if (!loading && !salesOrderRaw) {
        return (
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}>
                <HeaderWrapper>
                    <HeaderLeft>
                        <Button
                            onClick={() => navigate("/home/salesOrder")}
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
                            color="var(--sidebar-text-primary)"
                            Heading="Sale Order Details"
                            Fontsize={30}
                        />
                    </HeaderLeft>
                </HeaderWrapper>
                <NoDataFound
                    title="Sales Order Not Found"
                    description="Unable to load this sales order. Please go back and try again."
                    actionLabel="Back to Sales Orders"
                    onAction={() => navigate("/home/salesOrder")}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", padding: 10 }}>
            <HeaderWrapper>
                <HeaderLeft>
                    <Button
                        onClick={() => navigate("/home/salesOrder")}
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
                        color="var(--sidebar-text-primary)"
                        Heading="Sale Order Details"
                        Fontsize={30}
                    />
                </HeaderLeft>

                <HeaderActions>
                    {salesOrderRaw?.id && (
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/home/createSalesOrder", {
                                        state: { mode: "edit", salesOrder: salesOrderRaw },
                                    })
                                }
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    height: 40,
                                    padding: "0 16px",
                                    borderRadius: 8,
                                    border: "1px solid #BFDBFE",
                                    backgroundColor: "#FFFFFF",
                                    color: "#4379EE",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                <EditOutlinedIcon sx={{ fontSize: 18 }} />
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteClick}
                                disabled={deleting}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    height: 40,
                                    padding: "0 16px",
                                    borderRadius: 8,
                                    border: "1px solid #FECACA",
                                    backgroundColor: "#FFFFFF",
                                    color: "#DC2626",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: deleting ? "not-allowed" : "pointer",
                                    opacity: deleting ? 0.7 : 1,
                                }}
                            >
                                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
                                Delete
                            </button>
                        </>
                    )}
                    {availableStatusOptions.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                                disabled={statusUpdating}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    height: 40,
                                    padding: "0 16px",
                                    borderRadius: 8,
                                    border: "1px solid #D1D5DB",
                                    backgroundColor: "#FFFFFF",
                                    color: "var(--sidebar-text-primary)",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: statusUpdating ? "not-allowed" : "pointer",
                                    opacity: statusUpdating ? 0.7 : 1,
                                }}
                            >
                                {statusUpdating ? "Updating..." : "Update Status"}
                                <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                            </button>
                            <Menu
                                anchorEl={statusMenuAnchor}
                                open={Boolean(statusMenuAnchor)}
                                onClose={() => setStatusMenuAnchor(null)}
                            >
                                {availableStatusOptions.map((option) => (
                                    <MenuItem
                                        key={option.value}
                                        disabled={statusUpdating}
                                        onClick={() => handleStatusUpdate(option.value)}
                                    >
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Menu>
                        </>
                    )}

                    {statusKey === "confirmed" && !justConverted && salesOrderRaw?.id && (
                        <button
                            type="button"
                            onClick={handleConvertToInvoice}
                            disabled={convertingToInvoice}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                height: 40,
                                padding: "0 18px",
                                borderRadius: 8,
                                border: "none",
                                backgroundColor: "#10B981",
                                color: "#FFFFFF",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: convertingToInvoice ? "not-allowed" : "pointer",
                                opacity: convertingToInvoice ? 0.7 : 1,
                                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)",
                            }}
                        >
                            <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
                            {convertingToInvoice ? "Converting..." : "Convert to Invoice"}
                        </button>
                    )}
                </HeaderActions>
            </HeaderWrapper>

            <SummaryCard style={{ marginBottom: 20 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: "var(--sidebar-text-primary)" }}>
                            {order.orderNo}
                        </span>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                                color: badgeStyle.color,
                                backgroundColor: badgeStyle.backgroundColor,
                            }}
                        >
                            <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                            {formatStatusLabel(statusKey)}
                        </span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "var(--sidebar-text-primary)" }}>
                        {formatCurrency(order.grandTotal ?? order.total)}
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 20,
                        marginTop: 20,
                    }}
                >
                    {metaFields.map((field) => (
                        <div key={field.label}>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#64748B",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    marginBottom: 4,
                                }}
                            >
                                {field.label}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--sidebar-text-primary)" }}>
                                {field.value}
                            </div>
                        </div>
                    ))}
                </div>

                <OrderStatusStepper currentStatus={order.status} />
            </SummaryCard>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 280px",
                    gap: 20,
                    alignItems: "start",
                }}
                className="sales-order-detail-grid"
            >
                <ItemsCard>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid #E2E8F0" }}>
                        <Heading
                            Fontweight={600}
                            color="var(--sidebar-text-primary)"
                            Heading="Order Items"
                            Fontsize={16}
                        />
                    </div>

                    <ItemsTableHeader>
                        <span>Product / Service</span>
                        <span style={{ textAlign: "center" }}>Qty</span>
                        <span style={{ textAlign: "center" }}>Unit Price</span>
                        <span style={{ textAlign: "center" }}>Tax %</span>
                        <span style={{ textAlign: "center" }}>Total</span>
                    </ItemsTableHeader>

                    {(order.lineItems || []).map((item, index) => (
                        <ItemsTableRow key={item.id ?? index}>
                            <span>{item.product}</span>
                            <span style={{ textAlign: "center" }}>{item.qty}</span>
                            <span style={{ textAlign: "center" }}>{formatCurrency(item.unitPrice)}</span>
                            <span style={{ textAlign: "center" }}>
                                {item.taxPercent === "-" ? "-" : `${item.taxPercent}%`}
                            </span>
                            <span style={{ textAlign: "center", fontWeight: 700 }}>
                                {formatCurrency(item.total)}
                            </span>
                        </ItemsTableRow>
                    ))}

                    <div
                        style={{
                            padding: "16px 20px",
                            display: "flex",
                            justifyContent: "flex-end",
                            borderTop: "1px solid #E2E8F0",
                            backgroundColor: "#FFFFFF",
                        }}
                    >
                        <div style={{ minWidth: 240 }}>
                            <div className="flex justify-between mb-2" style={{ fontSize: 14, color: "#374151" }}>
                                <span>Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between mb-2" style={{ fontSize: 14, color: "#374151" }}>
                                <span>Discount</span>
                                <span style={{ color: "#EF4444" }}>-{formatCurrency(order.discount)}</span>
                            </div>
                            <div className="flex justify-between mb-2" style={{ fontSize: 14, color: "#374151" }}>
                                <span>Tax</span>
                                <span style={{ color: "#16A34A" }}>+{formatCurrency(order.tax)}</span>
                            </div>
                            <div
                                className="flex justify-between pt-2"
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "var(--sidebar-text-primary)",
                                    borderTop: "1px solid #E2E8F0",
                                }}
                            >
                                <span>Grand Total</span>
                                <span>{formatCurrency(order.grandTotal ?? order.total)}</span>
                            </div>
                        </div>
                    </div>
                </ItemsCard>

                <NotesCard>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#B45309",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 10,
                        }}
                    >
                        Notes
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "#92400E" }}>{order.notes}</div>
                </NotesCard>
            </div>

            <style>{`
                @media (max-width: 960px) {
                    .sales-order-detail-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Sales Order"
                subtitle="Are you sure you want to delete"
                entityName={order.orderNo}
                warningMessage="This order will be cancelled and permanently removed from the system. This action cannot be undone."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={deleting}
            />
        </div>
    );
};

export default SalesOrderDetail;
