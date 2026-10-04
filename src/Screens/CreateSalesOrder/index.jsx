import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { styled } from "@mui/material/styles";
import { Button } from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { IoIosArrowBack } from "react-icons/io";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomDatePicker from "../../Components/CustomDatePicker";
import LabeledInput from "../../Components/LabeledInput";
import addIcon from "../../assets/addIcon.png";
import Loader from "../../Components/Loader";
import { getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { getTenantIdFromSession } from "../../Utils/helper";
import { usePageTitle } from "../../Hooks/usePageTitle";
import { toast } from "react-toastify";

const SALES_ORDER_TAX_RATE = 10.25;

const STEPS = [
    { id: "order-details", label: "Order Details", icon: AssignmentOutlinedIcon },
    { id: "line-items", label: "Line Items", icon: Inventory2OutlinedIcon },
    { id: "review", label: "Review & Create", icon: CheckCircleOutlineIcon },
];

const StepperWrapper = styled("div")(({ theme }) => ({
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    width: "100%",
    gap: 0,
    padding: "8px 0 28px",
    flexWrap: "nowrap",
    [theme.breakpoints.down("sm")]: {
        padding: "8px 0 20px",
    },
}));

const StepConnector = styled("div", {
    shouldForwardProp: (prop) => prop !== "completed",
})(({ theme, completed }) => ({
    flex: "1 1 0",
    minWidth: 12,
    maxWidth: 120,
    height: 2,
    backgroundColor: completed ? "#10B981" : "#E5E7EB",
    margin: "0 4px",
    marginTop: 21,
    flexShrink: 1,
    [theme.breakpoints.down("sm")]: {
        minWidth: 8,
        maxWidth: 56,
        margin: "0 2px",
        marginTop: 17,
    },
}));

const StepItem = styled("button", {
    shouldForwardProp: (prop) => prop !== "active" && prop !== "completed",
})(({ theme, completed }) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: "none",
    cursor: completed ? "pointer" : "default",
    padding: "0 6px",
    minWidth: 0,
    flex: "0 1 auto",
    maxWidth: 140,
    [theme.breakpoints.down("md")]: {
        maxWidth: 110,
        padding: "0 4px",
        gap: 6,
    },
    [theme.breakpoints.down("sm")]: {
        maxWidth: 88,
        gap: 4,
    },
}));

const StepCircle = styled("span", {
    shouldForwardProp: (prop) => prop !== "active" && prop !== "completed",
})(({ theme, active, completed }) => ({
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: completed ? "#10B981" : active ? "#0C79F7" : "#FFFFFF",
    border: completed ? "2px solid #10B981" : active ? "2px solid #0C79F7" : "2px solid #D1D5DB",
    color: completed || active ? "#FFFFFF" : "#9CA3AF",
    boxShadow: active ? "0 0 0 4px rgba(67, 121, 238, 0.18)" : "none",
    [theme.breakpoints.down("sm")]: {
        width: 36,
        height: 36,
        boxShadow: active ? "0 0 0 3px rgba(67, 121, 238, 0.18)" : "none",
    },
}));

const StepLabel = styled("span", {
    shouldForwardProp: (prop) => prop !== "active" && prop !== "completed",
})(({ theme, active, completed }) => ({
    fontSize: 14,
    fontWeight: active || completed ? 600 : 500,
    color: completed ? "#10B981" : active ? "#4379EE" : "#9CA3AF",
    textAlign: "center",
    lineHeight: 1.25,
    width: "100%",
    [theme.breakpoints.down("md")]: {
        fontSize: 12,
    },
    [theme.breakpoints.down("sm")]: {
        fontSize: 10,
        lineHeight: 1.2,
    },
}));

const TableScrollWrapper = styled("div")({
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
});

const FooterActions = styled("div", {
    shouldForwardProp: (prop) => prop !== "hasBack",
})(({ theme, hasBack }) => ({
    display: "flex",
    justifyContent: hasBack ? "space-between" : "flex-end",
    alignItems: "center",
    marginTop: 28,
    paddingTop: 4,
    gap: 12,
    flexWrap: "wrap",
    [theme.breakpoints.down("sm")]: {
        flexDirection: hasBack ? "column-reverse" : "column",
        alignItems: "stretch",
        "& > button": {
            width: "100%",
            justifyContent: "center",
        },
        "& .footer-next-btn": {
            width: "100%",
        },
        "& .footer-next-btn button": {
            width: "100% !important",
        },
    },
}));

const LineItemsCard = styled("div")({
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "var(--dashboard-card-bg)",
});

const LINE_TABLE_MIN_WIDTH = 640;

const TableHeader = styled("div")(({ theme }) => ({
    display: "grid",
    gridTemplateColumns: "2.2fr 0.55fr 0.9fr 0.65fr 0.9fr 0.45fr",
    gap: 8,
    minWidth: LINE_TABLE_MIN_WIDTH,
    padding: "10px 16px",
    backgroundColor: "#0C79F7",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    [theme.breakpoints.down("sm")]: {
        fontSize: 10,
        padding: "8px 12px",
    },
}));

const TableRow = styled("div")(({ theme }) => ({
    display: "grid",
    gridTemplateColumns: "2.2fr 0.55fr 0.9fr 0.65fr 0.9fr 0.45fr",
    gap: 8,
    minWidth: LINE_TABLE_MIN_WIDTH,
    padding: "10px 16px",
    alignItems: "start",
    borderBottom: "1px solid #E2E8F0",
    backgroundColor: "var(--dashboard-tab-box)",
    "&:last-of-type": {
        borderBottom: "none",
    },
    [theme.breakpoints.down("sm")]: {
        padding: "8px 12px",
    },
}));

const LineInput = styled("input")(({ error }) => ({
    width: "100%",
    height: 34,
    padding: "4px 8px",
    fontSize: 13,
    borderRadius: 6,
    border: error ? "1px solid #ef4444" : "1px solid var(--sidebar-selected-bg)",
    backgroundColor: "var(--dashboard-tab-box)",
    color: "var(--dashboard-text-primary)",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "center",
}));

const TotalReadonly = styled("div")({
    width: "100%",
    height: 34,
    padding: "4px 8px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid var(--sidebar-selected-bg)",
    backgroundColor: "var(--dashboard-tab-box)",
    color: "var(--dashboard-text-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    fontWeight: 600,
});

const ReviewSummaryCard = styled("div")({
    border: "1px solid #BFDBFE",
    borderRadius: 10,
    padding: "14px 16px",
    backgroundColor: "#FFFFFF",
});

const REVIEW_TABLE_MIN_WIDTH = 480;

const ReviewTableHeader = styled("div")(({ theme }) => ({
    display: "grid",
    gridTemplateColumns: "2fr 0.7fr 1fr 1fr",
    gap: 8,
    minWidth: REVIEW_TABLE_MIN_WIDTH,
    padding: "10px 16px",
    backgroundColor: "#0C79F7",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    [theme.breakpoints.down("sm")]: {
        fontSize: 10,
        padding: "8px 12px",
    },
}));

const ReviewTableRow = styled("div")(({ theme }) => ({
    display: "grid",
    gridTemplateColumns: "2fr 0.7fr 1fr 1fr",
    gap: 8,
    minWidth: REVIEW_TABLE_MIN_WIDTH,
    padding: "12px 16px",
    alignItems: "center",
    borderBottom: "1px solid #E2E8F0",
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: "var(--sidebar-text-primary)",
    [theme.breakpoints.down("sm")]: {
        fontSize: 13,
        padding: "10px 12px",
    },
}));

const ReviewTableFooter = styled("div")({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "rgba(67, 121, 238, 0.08)",
    fontSize: 14,
    fontWeight: 700,
    color: "#0C79F7",
});

const FormRow = ({ label, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-x-6">
        <div className="w-full sm:w-48 shrink-0">
            <Heading
                Fontweight={500}
                color="var(--sidebar-text-primary)"
                Heading={label}
                Fontsize={16}
            />
        </div>
        <div className="w-full sm:w-80 min-w-0">{children}</div>
    </div>
);

const STATUS_OPTIONS = [
    { name: "Processing", value: "processing" },
    { name: "Confirmed", value: "confirmed" },
    { name: "Shipped", value: "shipped" },
    { name: "Delivered", value: "delivered" },
    { name: "Cancelled", value: "cancelled" },
];

const createEmptyLineItem = () => ({
    id: crypto.randomUUID(),
    inventoryItemId: "",
    qty: 1,
    unitPrice: 0,
    taxPercent: SALES_ORDER_TAX_RATE,
});

const hasLineItemProduct = (line) =>
    line?.inventoryItemId != null && line.inventoryItemId !== "";

const getPopulatedLineItems = (lines = []) => lines.filter(hasLineItemProduct);

const pruneEmptyLineItems = (lines = []) => {
    const populated = getPopulatedLineItems(lines);
    return populated.length > 0 ? populated : [createEmptyLineItem()];
};

const resolveItemUnitPrice = (item) =>
    Math.max(
        0,
        Number(item?.sellingPrice ?? item?.rate ?? item?.unitPrice ?? item?.price) || 0
    );

const isLineUnitPriceInvalid = (line) => {
    const unitPrice = Number(line?.unitPrice);
    return !Number.isFinite(unitPrice) || unitPrice <= 0;
};

const isInventoryItemUsedInOtherLines = (lineItems, itemId, currentIndex) =>
    lineItems.some(
        (line, index) =>
            index !== currentIndex &&
            line.inventoryItemId != null &&
            line.inventoryItemId !== "" &&
            String(line.inventoryItemId) === String(itemId)
    );

const getAvailableItemServices = (allItems, lineItems, currentIndex, currentItemId) => {
    const usedInOtherLines = new Set(
        lineItems
            .filter((_, index) => index !== currentIndex)
            .map((line) => line.inventoryItemId)
            .filter((id) => id != null && id !== "")
            .map(String)
    );

    return (allItems || []).filter((item) => {
        const itemId = String(item.id);
        return !usedInOtherLines.has(itemId) || String(currentItemId) === itemId;
    });
};

const getErrorMessage = (error) => {
    try {
        const parsed = JSON.parse(error?.message || "");
        if (typeof parsed === "string" && parsed.trim()) return parsed;
        return parsed?.message || parsed?.error || error?.message || "Something went wrong";
    } catch {
        return error?.message || "Something went wrong";
    }
};

const getListItemLabel = (list, id) => {
    if (id == null || id === "") return "";
    const item = (list || []).find((entry) => String(entry.id) === String(id));
    return item?.name || item?.dbaName || item?.legalBusinessName || "";
};

const formatApiDate = (value) => {
    if (!value) return "";
    if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [month, day, year] = value.split("/");
        return `${year}-${month}-${day}`;
    }
    const formatted = formatReviewDate(value);
    return formatted === "-" ? "" : formatted;
};

const apiDateToPicker = (value) => {
    if (!value) return null;
    let dateValue = value;
    if (typeof dateValue === "string" && dateValue.includes("T")) {
        dateValue = dateValue.split("T")[0];
    }
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        const [year, month, day] = dateValue.split("-");
        return `${month}/${day}/${year}`;
    }
    if (typeof dateValue === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
        return dateValue;
    }
    return formatReviewDate(dateValue) !== "-" ? formatReviewDate(dateValue) : null;
};

const mapSalesOrderLineItems = (salesOrder) => {
    const items = salesOrder?.orderItems || salesOrder?.lineItems || [];
    if (!Array.isArray(items) || items.length === 0) {
        return [createEmptyLineItem()];
    }

    return items.map((item) => {
        const qty = Number(item.quantity ?? item.qty) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const taxAmount = Number(item.taxAmount) || 0;
        const lineSubtotal = qty * unitPrice;
        const taxPercent =
            lineSubtotal > 0
                ? Number(((taxAmount / lineSubtotal) * 100).toFixed(2))
                : SALES_ORDER_TAX_RATE;

        return {
            id: crypto.randomUUID(),
            inventoryItemId: item.inventoryItemId || item.item?.id || "",
            qty,
            unitPrice,
            taxPercent: taxPercent || SALES_ORDER_TAX_RATE,
        };
    });
};

const mapSalesOrderToForm = (salesOrder) => ({
    accountId: salesOrder?.accountId || salesOrder?.account?.id || "",
    poReference: salesOrder?.poReference || salesOrder?.poReferenceNo || "",
    orderOwner: salesOrder?.orderOwnerId || salesOrder?.orderOwner || "",
    orderDate: apiDateToPicker(salesOrder?.orderDate),
    expectedDelivery: apiDateToPicker(salesOrder?.deliveryDate || salesOrder?.expectedDelivery),
    orderStatus: salesOrder?.status || "",
    purchaseOrderId: salesOrder?.purchaseOrderId || "",
});

const parseSalesOrderNumber = (response) => {
    const data = response?.data ?? response;
    return (
        data?.orderNo ||
        data?.orderNumber ||
        data?.number ||
        response?.orderNo ||
        ""
    );
};

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

const computeLineTotal = (line) => getLineSubtotal(line) + getLineTaxAmount(line);

const formatReviewDate = (value) => {
    if (!value) return "-";
    if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [month, day, year] = value.split("/");
        return `${year}-${month}-${day}`;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getLineItemLabel = (itemServicesList, inventoryItemId) =>
    getListItemLabel(itemServicesList, inventoryItemId) || "-";

const getLineSubtotal = (line) => {
    const qty = Math.max(0, Number(line.qty) || 0);
    const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
    return qty * unitPrice;
};

const getLineTaxAmount = (line) => {
    if (!line?.inventoryItemId) return 0;
    const subtotal = getLineSubtotal(line);
    return subtotal * (SALES_ORDER_TAX_RATE / 100);
};

const showSalesOrderUpdatedToast = (orderNo, accountName) => {
    toast.success(
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                }}
            >
                <CheckIcon sx={{ fontSize: 14, color: "#FFFFFF" }} />
            </div>
            <div>
                <div style={{ fontWeight: 700, color: "#059669", fontSize: 15, lineHeight: 1.3 }}>
                    Sales Order Updated!
                </div>
                <div style={{ color: "#047857", fontSize: 13, marginTop: 4, lineHeight: 1.3 }}>
                    {orderNo} · {accountName}
                </div>
            </div>
        </div>,
        {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: true,
            closeOnClick: true,
            icon: false,
            style: {
                backgroundColor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 12,
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                padding: "14px 16px",
                minWidth: 300,
            },
            bodyStyle: {
                padding: 0,
                margin: 0,
            },
        }
    );
};

const showSalesOrderCreatedToast = (orderNo, accountName) => {
    toast.success(
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div
                style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                }}
            >
                <CheckIcon sx={{ fontSize: 14, color: "#FFFFFF" }} />
            </div>
            <div>
                <div style={{ fontWeight: 700, color: "#059669", fontSize: 15, lineHeight: 1.3 }}>
                    Sales Order Created!
                </div>
                <div style={{ color: "#047857", fontSize: 13, marginTop: 4, lineHeight: 1.3 }}>
                    {orderNo} · {accountName}
                </div>
            </div>
        </div>,
        {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: true,
            closeOnClick: true,
            icon: false,
            style: {
                backgroundColor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 12,
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                padding: "14px 16px",
                minWidth: 300,
            },
            bodyStyle: {
                padding: 0,
                margin: 0,
            },
        }
    );
};

const SalesOrderStepper = ({ activeStep, onStepClick }) => (
    <StepperWrapper>
        {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === activeStep;
            const isCompleted = index < activeStep;

            return (
                <Fragment key={step.id}>
                    <StepItem
                        type="button"
                        active={isActive}
                        completed={isCompleted}
                        onClick={() => isCompleted && onStepClick(index)}
                    >
                        <StepCircle active={isActive} completed={isCompleted}>
                            {isCompleted ? (
                                <CheckIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                            ) : (
                                <Icon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                            )}
                        </StepCircle>
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: isActive || isCompleted ? 600 : 500,
                                color: isCompleted ? "#10B981" : isActive ? "#0C79F7" : "#9CA3AF",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {step.label}
                        </span>
                    </StepItem>
                    {index < STEPS.length - 1 && (
                        <StepConnector completed={index < activeStep} />
                    )}
                </Fragment>
            );
        })}
    </StepperWrapper>
);

const CreateSalesOrder = () => {
    const navigate = useNavigate();
    const location = useLocation();
    console.log("location", location);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const tenantId = getTenantIdFromSession(userData);

    const editSalesOrder = location.state?.salesOrder;
    const isEditMode = location.state?.mode === "edit" && Boolean(editSalesOrder?.id);
    const editSalesOrderId = editSalesOrder?.id;
    const pageTitle = isEditMode ? "Edit Sales Order" : "Create Sales Order";

    usePageTitle(pageTitle, location);
    const editInitializedRef = useRef(false);

    const [activeStep, setActiveStep] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [accountList, setAccountList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [form, setForm] = useState({
        accountId: "",
        poReference: "",
        orderOwner: "",
        orderDate: null,
        expectedDelivery: null,
        orderStatus: "",
        purchaseOrderId: location.state?.purchaseOrderId || "",
    });
    const [lineItems, setLineItems] = useState([createEmptyLineItem()]);
    const [fieldErrors, setFieldErrors] = useState({});
    const [lineItemsShowErrors, setLineItemsShowErrors] = useState(false);

    const fetchReferenceData = useCallback(async () => {
        if (!accessToken) {
            setPageLoading(false);
            return;
        }

        setPageLoading(true);
        try {
            const accountParams = new URLSearchParams({ page: "1", limit: "200" });
            const [accountsRes, customersRes, itemsRes] = await Promise.all([
                getRequestWithOutBody(`${baseURl}account/?${accountParams.toString()}`, accessToken),
                getRequestWithOutBody(`${baseURl}customer`, accessToken),
                getRequestWithOutBody(`${baseURl}item-services`, accessToken),
            ]);

            const accountsRaw = accountsRes?.data?.data || accountsRes?.data || [];
            const accounts = (Array.isArray(accountsRaw) ? accountsRaw : []).map((account) => ({
                id: account.id,
                name: account.name || account.accountName || `Account #${account.id}`,
            }));
            setAccountList(accounts);

            const customersRaw = customersRes?.data?.data || customersRes?.data || [];
            const customers = (Array.isArray(customersRaw) ? customersRaw : []).map((customer) => ({
                id: customer.id,
                name:
                    customer.dbaName ||
                    customer.legalBusinessName ||
                    customer.name ||
                    `Customer #${customer.id}`,
            }));
            setCustomerList(customers);

            const itemsRaw = itemsRes?.data?.data || itemsRes?.data || itemsRes || [];
            setItemServicesList(Array.isArray(itemsRaw) ? itemsRaw : []);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setPageLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchReferenceData();
    }, [fetchReferenceData]);

    useEffect(() => {
        if (!isEditMode || !editSalesOrder || pageLoading || editInitializedRef.current) return;

        editInitializedRef.current = true;
        setForm(mapSalesOrderToForm(editSalesOrder));
        setLineItems(mapSalesOrderLineItems(editSalesOrder));
    }, [isEditMode, editSalesOrder, pageLoading]);

    const accountLabel = useMemo(
        () => getListItemLabel(accountList, form.accountId) || "--select--",
        [accountList, form.accountId]
    );
    const ownerLabel = useMemo(
        () => getListItemLabel(customerList, form.orderOwner) || "--select--",
        [customerList, form.orderOwner]
    );
    const statusLabel = useMemo(
        () => STATUS_OPTIONS.find((item) => item.value === form.orderStatus)?.name || "--select--",
        [form.orderStatus]
    );

    const lineTotals = useMemo(
        () => lineItems.map((line) => computeLineTotal(line)),
        [lineItems]
    );

    const summary = useMemo(() => {
        const subtotal = lineItems.reduce((sum, line) => sum + getLineSubtotal(line), 0);
        const tax = lineItems.reduce((sum, line) => sum + getLineTaxAmount(line), 0);
        const grandTotal = subtotal + tax;

        return { subtotal, tax, grandTotal };
    }, [lineItems]);

    const ORDER_FIELD_KEYS = ["accountId", "orderOwner", "orderDate", "expectedDelivery", "orderStatus"];

    const clearFieldError = (key) => {
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const showValidationErrors = (messages) => {
        toast.error(
            <div>
                Please fix the following errors:
                <ul className="list-disc pl-4 mt-1">
                    {messages.map((message) => (
                        <li key={message}>{message}</li>
                    ))}
                </ul>
            </div>
        );
    };

    const handleLineItemChange = (index, field, value) => {
        if (field === "inventoryItemId") clearFieldError(`line_${index}_product`);
        if (field === "qty") clearFieldError(`line_${index}_qty`);
        if (field === "unitPrice") clearFieldError(`line_${index}_unitPrice`);

        if (
            field === "inventoryItemId" &&
            value != null &&
            value !== "" &&
            isInventoryItemUsedInOtherLines(lineItems, value, index)
        ) {
            toast.error("This product or service is already added in another line");
            return;
        }

        setLineItems((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;

                if (field === "inventoryItemId") {
                    const selected = itemServicesList.find(
                        (item) => String(item.id) === String(value)
                    );
                    if (!selected) {
                        return { ...line, inventoryItemId: value };
                    }

                    const qty = Math.max(1, Number(line.qty) || 1);
                    const unitPrice = resolveItemUnitPrice(selected);

                    return {
                        ...line,
                        inventoryItemId: selected.id,
                        qty,
                        unitPrice,
                        taxPercent: SALES_ORDER_TAX_RATE,
                    };
                }

                const nextLine = { ...line, [field]: value };

                if (field === "qty") {
                    nextLine.qty = Math.max(0, Number(value) || 0);
                }

                if (field === "unitPrice") {
                    nextLine.unitPrice = Math.max(0, Number(value) || 0);
                }

                return nextLine;
            })
        );
    };

    const validateOrderDetails = () => {
        const nextErrors = {};
        const messages = [];

        if (!form.accountId) {
            nextErrors.accountId = true;
            messages.push("Account is required");
        }
        if (!form.orderOwner) {
            nextErrors.orderOwner = true;
            messages.push("Order owner is required");
        }
        if (!form.orderDate) {
            nextErrors.orderDate = true;
            messages.push("Order date is required");
        }
        if (!form.expectedDelivery) {
            nextErrors.expectedDelivery = true;
            messages.push("Expected delivery date is required");
        }
        if (!form.orderStatus) {
            nextErrors.orderStatus = true;
            messages.push("Order status is required");
        }

        setFieldErrors((prev) => {
            const next = { ...prev };
            ORDER_FIELD_KEYS.forEach((key) => delete next[key]);
            return { ...next, ...nextErrors };
        });

        if (messages.length > 0) {
            showValidationErrors(messages);
            return false;
        }
        return true;
    };

    const validateLineItems = (items = lineItems) => {
        const nextErrors = {};
        let hasValidLine = false;
        let hasInvalidUnitPrice = false;
        const populatedItems = getPopulatedLineItems(items);

        populatedItems.forEach((line, index) => {
            const hasQty = Number(line.qty) > 0;
            const hasValidUnitPrice = !isLineUnitPriceInvalid(line);

            if (hasQty && hasValidUnitPrice) {
                hasValidLine = true;
            }

            if (!hasQty) nextErrors[`line_${index}_qty`] = true;
            if (!hasValidUnitPrice) {
                nextErrors[`line_${index}_unitPrice`] = true;
                hasInvalidUnitPrice = true;
            }
        });

        setFieldErrors((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (key.startsWith("line_")) delete next[key];
            });
            return { ...next, ...nextErrors };
        });

        if (hasInvalidUnitPrice) {
            showValidationErrors(["Unit price must be greater than 0 for each line item"]);
            return false;
        }

        if (!hasValidLine) {
            showValidationErrors([
                "Add at least one line item with a product, quantity, and unit price greater than 0",
            ]);
            return false;
        }

        return true;
    };

    const handleAddLine = () => {
        setLineItems((prev) => [...prev, createEmptyLineItem()]);
    };

    const handleRemoveLine = (index) => {
        setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
        clearFieldError(`line_${index}_product`);
        clearFieldError(`line_${index}_qty`);
        clearFieldError(`line_${index}_unitPrice`);
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep((prev) => prev - 1);
            return;
        }
        if (isEditMode && editSalesOrderId) {
            navigate(`/home/salesOrder/${editSalesOrderId}`, {
                state: { salesOrder: editSalesOrder },
            });
            return;
        }
        navigate("/home/salesOrder");
    };

    const handleNext = () => {
        if (activeStep === 0) {
            if (!validateOrderDetails()) return;
        } else if (activeStep === 1) {
            const prunedLineItems = pruneEmptyLineItems(lineItems);
            setLineItems(prunedLineItems);
            const isValid = validateLineItems(prunedLineItems);
            setLineItemsShowErrors(!isValid);
            if (!isValid) return;
        }

        if (activeStep < STEPS.length - 1) {
            setActiveStep((prev) => prev + 1);
        }
    };

    const buildCreatePayload = () => {
        const payload = {
            accountId: Number(form.accountId),
            poReference: form.poReference?.trim() || undefined,
            orderOwnerId: Number(form.orderOwner),
            orderDate: formatApiDate(form.orderDate),
            deliveryDate: formatApiDate(form.expectedDelivery),
            status: form.orderStatus,
            subtotal: Number(summary.subtotal.toFixed(2)),
            tax: Number(summary.tax.toFixed(2)),
            total: Number(summary.grandTotal.toFixed(2)),
            items: getPopulatedLineItems(lineItems)
                .filter(
                    (line) =>
                        Number(line.qty) > 0 &&
                        !isLineUnitPriceInvalid(line)
                )
                .map((line) => {
                    const lineSubtotal = getLineSubtotal(line);
                    const taxAmount = getLineTaxAmount(line);
                    return {
                        inventoryItemId: Number(line.inventoryItemId),
                        quantity: Number(line.qty),
                        unitPrice: Number(line.unitPrice) || 0,
                        amount: Number((lineSubtotal + taxAmount).toFixed(2)),
                        taxAmount: Number(taxAmount.toFixed(2)),
                    };
                }),
        };

        if (tenantId) payload.tenantId = Number(tenantId);
        if (form.purchaseOrderId) payload.purchaseOrderId = Number(form.purchaseOrderId);

        return payload;
    };

    const handleSubmit = async () => {
        const orderValid = validateOrderDetails();
        const prunedLineItems = pruneEmptyLineItems(lineItems);
        setLineItems(prunedLineItems);
        const lineItemsValid = validateLineItems(prunedLineItems);

        if (!orderValid) {
            setActiveStep(0);
            return;
        }
        if (!lineItemsValid) {
            setLineItemsShowErrors(true);
            setActiveStep(1);
            return;
        }

        setLineItemsShowErrors(false);

        // Enhanced validation checks
        if (!validateOrderDetails() || !validateLineItems()) return;
        
        if (!accessToken) {
            toast.error("You are not authenticated");
            return;
        }

        // Additional validation for critical fields
        if (!form.accountId) {
            toast.error("Account selection is required");
            return;
        }

        if (!lineItems || lineItems.length === 0) {
            toast.error("At least one line item is required");
            return;
        }
console.log("lineItems", lineItems);
        // Validate line items have valid data
        const invalidLineItems = lineItems.filter(item => 
            !item.qty || !item.unitPrice || item.qty <= 0 || item.unitPrice <= 0
        );
        
        if (invalidLineItems.length > 0) {
            toast.error("All line items must have valid name, quantity, and unit price");
            return;
        }

        setSubmitting(true);
        try {
            const payload = buildCreatePayload();
            
            // Validate payload before sending
            if (!payload || !payload.accountId) {
                toast.error("Invalid order data");
                return;
            }

            const result = isEditMode
                ? await putRequestWithBodyAndToken(
                      `${baseURl}sales-order/${editSalesOrderId}`,
                      accessToken,
                      payload
                  )
                : await postRequestWithBodyAndToken(
                      `${baseURl}sales-order`,
                      accessToken,
                      payload
                  );

            if (!result) {
                toast.error("Invalid response from server");
                return;
            }

            const orderNo =
                parseSalesOrderNumber(result) ||
                editSalesOrder?.orderNo ||
                "Sales Order";
            const accountName = accountLabel !== "--select--" ? accountLabel : "Account";

            if (isEditMode) {
                showSalesOrderUpdatedToast(orderNo, accountName);

                const updatedSalesOrder = {
                    ...editSalesOrder,
                    ...payload,
                    id: editSalesOrderId,
                    orderNo,
                    poReferenceNo: payload.poReference,
                    deliveryDate: payload.deliveryDate,
                    subTotal: payload.subtotal,
                };

                window.setTimeout(() => {
                    navigate(`/home/salesOrder/${editSalesOrderId}`, {
                        state: { salesOrder: updatedSalesOrder },
                    });
                }, 1500);
            } else {
                showSalesOrderCreatedToast(orderNo, accountName);

                window.setTimeout(() => {
                    navigate("/home/salesOrder");
                }, 1500);
            }
        } catch (error) {
            console.error('Sales order creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid sales order data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create sales orders");
                } else if (status === 404) {
                    toast.error("Account or product not found");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(getErrorMessage(error) || "Something went wrong");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const renderOrderDetails = () => (
        <div className="flex flex-col gap-5">
            <Heading
                Fontweight={600}
                color="var(--sidebar-text-primary)"
                Heading="Order Details:"
                Fontsize={18}
            />

            <FormRow label="Account Name">
                <DropdownMenu
                    menuItems={accountList}
                    idSet
                    searchable
                    defaultText="--select--"
                    selectedValue={accountLabel}
                    fullWidth
                    error={Boolean(fieldErrors.accountId)}
                    onSelect={(value) => {
                        setForm((prev) => ({ ...prev, accountId: value }));
                        clearFieldError("accountId");
                    }}
                />
            </FormRow>

            <FormRow label="PO Reference">
                <LabeledInput
                    inputPlaceholder="e.g PO 2026-001"
                    inputValue={form.poReference}
                    onInputChange={(e) =>
                        setForm((prev) => ({ ...prev, poReference: e.target.value }))
                    }
                    eventScreen={true}
                />
            </FormRow>

            <FormRow label="Order Owner">
                <DropdownMenu
                    menuItems={customerList}
                    idSet
                    searchable
                    defaultText="--select--"
                    selectedValue={ownerLabel}
                    fullWidth
                    error={Boolean(fieldErrors.orderOwner)}
                    onSelect={(value) => {
                        setForm((prev) => ({ ...prev, orderOwner: value }));
                        clearFieldError("orderOwner");
                    }}
                />
            </FormRow>

            <FormRow label="Order Date">
                <CustomDatePicker
                    value={form.orderDate}
                    fieldError={Boolean(fieldErrors.orderDate)}
                    onChange={(value) => {
                        setForm((prev) => ({ ...prev, orderDate: value }));
                        clearFieldError("orderDate");
                    }}
                    fullWidth
                />
            </FormRow>

            <FormRow label="Expected Delivery">
                <CustomDatePicker
                    value={form.expectedDelivery}
                    fieldError={Boolean(fieldErrors.expectedDelivery)}
                    onChange={(value) => {
                        setForm((prev) => ({ ...prev, expectedDelivery: value }));
                        clearFieldError("expectedDelivery");
                    }}
                    fullWidth
                />
            </FormRow>

            <FormRow label="Order Status">
                <DropdownMenu
                    menuItems={STATUS_OPTIONS}
                    defaultText="--select--"
                    selectedValue={statusLabel}
                    fullWidth
                    error={Boolean(fieldErrors.orderStatus)}
                    onSelect={(value) => {
                        setForm((prev) => ({ ...prev, orderStatus: value }));
                        clearFieldError("orderStatus");
                    }}
                />
            </FormRow>
        </div>
    );

    const renderLineItems = () => (
        <LineItemsCard>
            <div
                className="flex flex-wrap items-center justify-between gap-3"
                style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0" }}
            >
                <Heading
                    Fontweight={600}
                    color="var(--sidebar-text-primary)"
                    Heading="Line Items"
                    Fontsize={16}
                />
                <div className="flex items-center gap-3 flex-wrap">
                    <BottonWithIcon
                        backgroundColor="#0C79F7"
                        icon={addIcon}
                        title="Add Line"
                        height={40}
                        color="#FFFFFF"
                        fontSize={14}
                        fontWeight={500}
                        onClick={handleAddLine}
                    />
                </div>
            </div>

            <TableScrollWrapper>
                <TableHeader>
                    <span>Product / Service</span>
                    <span style={{ textAlign: "center" }}>Qty</span>
                    <span style={{ textAlign: "center" }}>Unit Price</span>
                    <span style={{ textAlign: "center" }}>Tax %</span>
                    <span style={{ textAlign: "center" }}>Total</span>
                    <span style={{ textAlign: "center" }}>Action</span>
                </TableHeader>

                {lineItemsShowErrors ? (
                    <div
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "#FEF2F2",
                            color: "#B91C1C",
                            fontSize: 13,
                            fontWeight: 500,
                            borderBottom: "1px solid #FECACA",
                        }}
                    >
                        Each line requires a product or service and a unit price greater than 0.
                    </div>
                ) : null}

                {lineItems.map((line, index) => {
                    const productLabel =
                        getListItemLabel(itemServicesList, line.inventoryItemId) || "--select--";
                    const showProductError =
                        lineItemsShowErrors && Boolean(fieldErrors[`line_${index}_product`]);
                    const showQtyError =
                        lineItemsShowErrors && Boolean(fieldErrors[`line_${index}_qty`]);
                    const showUnitPriceError =
                        lineItemsShowErrors &&
                        (Boolean(fieldErrors[`line_${index}_unitPrice`]) ||
                            (Boolean(line.inventoryItemId) && isLineUnitPriceInvalid(line)));

                    return (
                        <TableRow key={line.id}>
                            <DropdownMenu
                                menuItems={getAvailableItemServices(
                                    itemServicesList,
                                    lineItems,
                                    index,
                                    line.inventoryItemId
                                ).map((item) => ({
                                    id: item.id,
                                    name: item.name,
                                }))}
                                idSet
                                searchable
                                defaultText="--select--"
                                selectedValue={productLabel}
                                error={showProductError}
                                onSelect={(value) => handleLineItemChange(index, "inventoryItemId", value)}
                                newCreateInvoicetable
                            />
                            <LineInput
                                type="number"
                                min={0}
                                value={line.qty}
                                error={showQtyError}
                                onChange={(e) => handleLineItemChange(index, "qty", e.target.value)}
                            />
                            <div style={{ minWidth: 0 }}>
                                <LineInput
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    value={line.unitPrice}
                                    error={showUnitPriceError}
                                    onChange={(e) =>
                                        handleLineItemChange(index, "unitPrice", e.target.value)
                                    }
                                />
                                {showUnitPriceError ? (
                                    <span
                                        style={{
                                            display: "block",
                                            marginTop: 4,
                                            fontSize: 11,
                                            color: "#EF4444",
                                            fontWeight: 500,
                                            textAlign: "center",
                                        }}
                                    >
                                        Must be greater than 0
                                    </span>
                                ) : null}
                            </div>
                            <TotalReadonly>
                                {line.inventoryItemId ? SALES_ORDER_TAX_RATE : 0}
                            </TotalReadonly>
                            <TotalReadonly>{formatCurrency(lineTotals[index])}</TotalReadonly>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: 34,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLine(index)}
                                    disabled={lineItems.length <= 1}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: lineItems.length <= 1 ? "not-allowed" : "pointer",
                                        opacity: lineItems.length <= 1 ? 0.4 : 1,
                                        padding: 4,
                                    }}
                                    aria-label="Remove line"
                                >
                                    <DeleteOutlineIcon sx={{ color: "#EF4444", fontSize: 22 }} />
                                </button>
                            </div>
                        </TableRow>
                    );
                })}
            </TableScrollWrapper>

            <div
                style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "flex-end",
                    borderTop: "1px solid #E2E8F0",
                }}
            >
                <div className="w-full sm:w-auto" style={{ minWidth: 0, maxWidth: 280 }}>
                    <div
                        className="flex justify-between mb-2"
                        style={{ fontSize: 14, color: "#374151" }}
                    >
                        <span>Subtotal</span>
                        <span>{formatCurrency(summary.subtotal)}</span>
                    </div>
                    <div
                        className="flex justify-between mb-2"
                        style={{ fontSize: 14, color: "#374151" }}
                    >
                        <span>Tax</span>
                        <span style={{ color: "#16A34A" }}>+{formatCurrency(summary.tax)}</span>
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
                        <span>{formatCurrency(summary.grandTotal)}</span>
                    </div>
                </div>
            </div>
        </LineItemsCard>
    );

    const renderReview = () => {
        const reviewAccount = form.accountId ? accountLabel : "-";
        const reviewOwner = form.orderOwner ? ownerLabel : "-";
        const reviewOrderDate = form.orderDate ? formatReviewDate(form.orderDate) : "-";
        const reviewExpectedDelivery = form.expectedDelivery
            ? formatReviewDate(form.expectedDelivery)
            : "-";
        const reviewStatus = form.orderStatus ? statusLabel : "-";
        const orderTotal = summary.grandTotal;
        const reviewLineItems = getPopulatedLineItems(lineItems);

        const summaryFields = [
            { label: "Account", value: reviewAccount },
            { label: "Order Owner", value: reviewOwner },
            { label: "Order Date", value: reviewOrderDate },
            { label: "Expected Delivery", value: reviewExpectedDelivery },
            { label: "Status", value: reviewStatus },
            { label: "Inventory", value: "Available" },
        ];

        return (
            <div className="flex flex-col gap-6">
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "14px 16px",
                        borderRadius: 10,
                        backgroundColor: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                    }}
                >
                    <CheckCircleOutlineIcon sx={{ color: "#10B981", fontSize: 22, marginTop: "2px" }} />
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#059669" }}>
                            Ready to create
                        </div>
                        <div style={{ fontSize: 13, color: "#047857", marginTop: 2 }}>
                            Review the details below before confirming.
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {summaryFields.map((item) => (
                        <ReviewSummaryCard key={item.label}>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#64748B",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    marginBottom: 6,
                                }}
                            >
                                {item.label}
                            </div>
                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: "var(--sidebar-text-primary)",
                                }}
                            >
                                {item.value}
                            </div>
                        </ReviewSummaryCard>
                    ))}
                </div>

                <div>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--sidebar-text-primary)",
                            marginBottom: 12,
                            letterSpacing: "0.03em",
                        }}
                    >
                        LINE ITEMS ({reviewLineItems.length})
                    </div>

                    <LineItemsCard>
                        <TableScrollWrapper>
                            <ReviewTableHeader>
                                <span>Product</span>
                                <span style={{ textAlign: "center" }}>Qty</span>
                                <span style={{ textAlign: "center" }}>Unit Price</span>
                                <span style={{ textAlign: "center" }}>Total</span>
                            </ReviewTableHeader>

                            {reviewLineItems.map((line) => (
                                <ReviewTableRow key={line.id}>
                                    <span>{getLineItemLabel(itemServicesList, line.inventoryItemId)}</span>
                                    <span style={{ textAlign: "center" }}>{line.qty}</span>
                                    <span style={{ textAlign: "center" }}>
                                        {formatCurrency(Number(line.unitPrice) || 0)}
                                    </span>
                                    <span style={{ textAlign: "center", fontWeight: 700 }}>
                                        {formatCurrency(computeLineTotal(line))}
                                    </span>
                                </ReviewTableRow>
                            ))}
                        </TableScrollWrapper>

                        <ReviewTableFooter>
                            <span>Order Total</span>
                            <span>{formatCurrency(orderTotal)}</span>
                        </ReviewTableFooter>
                    </LineItemsCard>
                </div>
            </div>
        );
    };

    const stepContent = [renderOrderDetails, renderLineItems, renderReview][activeStep];

    const nextLabel =
        activeStep === 0
            ? "Next: Line Items →"
            : activeStep === 1
                ? isEditMode
                    ? "Next: Review & Update →"
                    : "Next: Review & Create →"
                : isEditMode
                    ? "Update Sales Order"
                    : "Create Sales Order";

    if (pageLoading) {
        return (
            <div
                className="min-h-screen px-2 sm:px-[10px] flex items-center justify-center"
                style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", paddingTop: 10, paddingBottom: 10 }}
            >
                <Loader message="Loading..." subMessage="Please wait" />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen px-2 sm:px-[10px]"
            style={{ marginTop: -65, backgroundColor: "var(--dashboard-bg)", paddingTop: 10, paddingBottom: 10 }}
        >
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
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
                        flexShrink: 0,
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color="var(--sidebar-text-primary)"
                    Heading={pageTitle}
                    className="!text-xl sm:!text-2xl md:!text-[30px] leading-tight"
                />
            </div>

            <div
                className="w-full mx-auto p-4 sm:p-6 md:px-7 md:py-7"
                style={{
                    backgroundColor: "var(--dashboard-card-bg)",
                    borderRadius: 14,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
            >
                <SalesOrderStepper activeStep={activeStep} onStepClick={setActiveStep} />
                {stepContent()}

                <FooterActions hasBack={activeStep > 0 && activeStep < 3}>
                    {activeStep > 0 && activeStep < 3 && (
                        <button
                            type="button"
                            onClick={() => setActiveStep((prev) => prev - 1)}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                height: 40,
                                padding: "0 18px",
                                borderRadius: 8,
                                border: "1px solid #D1D5DB",
                                backgroundColor: "#FFFFFF",
                                color: "#374151",
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: "pointer",
                            }}
                        >
                            ← Back
                        </button>
                    )}

                    {activeStep === 2 ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                height: 44,
                                padding: "0 24px",
                                borderRadius: 8,
                                border: "none",
                                backgroundColor: submitting ? "#6EE7B7" : "#10B981",
                                color: "#FFFFFF",
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: submitting ? "not-allowed" : "pointer",
                                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                            }}
                        >
                            <CheckIcon sx={{ fontSize: 20 }} />
                            {submitting
                                ? isEditMode
                                    ? "Updating..."
                                    : "Creating..."
                                : isEditMode
                                    ? "Update Sales Order"
                                    : "Create Sales Order"}
                        </button>
                    ) : (
                        <div
                            className={`footer-next-btn w-full ${activeStep === 1 ? "sm:w-[230px]" : "sm:w-[210px]"}`}
                        >
                            <BottonCustom
                                backgroundColor="#4379EE"
                                width="100%"
                                title={nextLabel}
                                height={40}
                                color="#FFFFFF"
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleNext}
                            />
                        </div>
                    )}
                </FooterActions>
            </div>
        </div>
    );
};

export default CreateSalesOrder;
