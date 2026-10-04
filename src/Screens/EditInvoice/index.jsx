import { useLocation, useNavigate } from "react-router-dom";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import Heading from "../../Components/Heading";
import { forwardRef, useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import moment from "moment";
import dayjs from "dayjs";
import { styled } from "@mui/material/styles";
import CustomDatePicker from "../../Components/CustomDatePicker";
import { IoIosArrowBack } from "react-icons/io";
import logo4k from "../../assets/logo4k.png";
import website from "../../assets/website.png";
import locationInvoice from "../../assets/locationInvoice.png";
import contactInvoice from "../../assets/contactInvoice.png";
import mailInvoice from "../../assets/mailInvoice.png";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import BottonCustom from "../../Components/ButtonCustom";
import { toast } from "react-toastify";
import {
  deleteRequest,
  getRequestWithOutBody,
  getRequestWithOutBodyCached,
  putRequestWithBodyAndToken,
  postRequestWithFormData,
  postRequestWithBodyAndToken,
  buildAuthHeaders,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import { Button } from "@mui/material";
import DropdownMenu from "../../Components/dropdownMenu";
import ItemTable from "../../Components/ItemTable";
import LabeledInput from "../../Components/LabeledInput";
import SearchInput from "../../Components/SearchInput";
import Compressor from "compressorjs";
import UploadFile from "../../Components/UploadFile";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import RichEditor from "../../Components/RichEditor";
import { Chip } from "@mui/material";
import { Close } from "@mui/icons-material";
import UpdateConfirmationModal from "../../Components/UpdateModal";
import { resolveInvoiceImageToDataURL } from "../../Utils/invoiceImageResolve";
import Skeleton from "@mui/material/Skeleton";
import { getErrorMessage } from "../../Utils/errorHandler";
import { getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";
import { applyAssignmentMetadataIfNeeded } from "../../Utils/purchaseOrderHelpers";
import { Switch } from "@headlessui/react";
import {
  createInvoiceHostedPaymentLink,
  extractHostedPaymentPageUrl,
  isAuthorizeNetNotConfiguredError,
  parseAuthorizeNetErrorMessage,
} from "../../Api/authorizeNetApi";
import { getFedexErrorToast } from "../../Api/FedExApi";

const FEDEX_SERVICE_TYPE = "FEDEX_GROUND";

const buildFedexAddress = (street, city, state, zip, countryCode = "US") => {
  const streetLine = String(street || "").trim();
  const cityValue = String(city || "").trim();
  const stateValue = String(state || "").trim();
  const postalCode = String(zip || "").trim();
  if (!streetLine || !cityValue || !stateValue || !postalCode) return null;
  return {
    streetLines: [streetLine],
    city: cityValue,
    stateOrProvinceCode: stateValue,
    postalCode,
    countryCode: countryCode || "US",
  };
};

/** Parse "Name\nstreet, city, state, zip" (or a single address line) into FedEx address shape. */
const parseFedexAddressFromText = (addressText) => {
  const text = String(addressText || "").trim();
  if (!text) return null;
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const addressLine = lines.length > 1 ? lines[lines.length - 1] : lines[0];
  const zipStateMatch = addressLine.match(
    /^(.+),\s*([^,]+),\s*([A-Za-z]{2})\s*,?\s*(\d{5}(?:-\d{4})?)$/,
  );
  if (zipStateMatch) {
    return buildFedexAddress(
      zipStateMatch[1],
      zipStateMatch[2],
      zipStateMatch[3],
      zipStateMatch[4],
    );
  }
  const parts = addressLine.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const postalCode = parts[parts.length - 1];
    const state = parts[parts.length - 2];
    const city = parts[parts.length - 3];
    const street = parts.slice(0, parts.length - 3).join(", ");
    return buildFedexAddress(street, city, state, postalCode);
  }
  return null;
};

const parseShippingRateFromApi = (response) => {
  const data = response?.data ?? response;
  const candidates = [
    data?.deliveryFee,
    data?.rate,
    data?.shippingRate,
    data?.amount,
    data?.options?.[0]?.deliveryFee,
    response?.deliveryFee,
    response?.rate,
    response?.shippingRate,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
};

const isInventoryItem = (item) =>
  String(item?.type || "").toLowerCase() === "item";

const normalizeInvoicePayload = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  if (
    payload.data &&
    typeof payload.data === "object" &&
    (payload.data.id != null || payload.data.invoiceNo)
  ) {
    return payload.data;
  }
  return payload;
};

const getMerchantDisplayName = (merchant, customerFromList) => {
  if (customerFromList) {
    return (
      customerFromList.dbaName ||
      customerFromList.legalBusinessName ||
      getMerchantDisplayName(customerFromList)
    );
  }
  if (!merchant || typeof merchant !== "object") return "";
  return (
    merchant.dbaName ||
    merchant.legalBusinessName ||
    merchant.merchantName ||
    merchant.companyName ||
    [merchant.firstName, merchant.lastName].filter(Boolean).join(" ").trim() ||
    merchant.email ||
    ""
  );
};

const getAgentDisplayName = (agentId, agentObj, agentList) => {
  if (agentObj?.name) return agentObj.name;
  if (agentObj?.username) return agentObj.username;
  if (agentObj?.fullName) return agentObj.fullName;
  const fromList = (Array.isArray(agentList) ? agentList : []).find(
    (agent) => String(agent?.id) === String(agentId),
  );
  return fromList?.name || fromList?.username || fromList?.fullName || "";
};

const VALID_PAYMENT_TERMS = [
  "net-30",
  "net-60",
  "due-receipt",
  "cod",
  "eom",
  "advance-payment",
];

const normalizePaymentTerm = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const aliases = {
    "cash-on-delivery": "cod",
    "cash_on_delivery": "cod",
    "cash on delivery": "cod",
    cod: "cod",
  };
  const normalized = aliases[raw] || raw;
  return VALID_PAYMENT_TERMS.includes(normalized) ? normalized : raw;
};

const mapInvoiceLineItemToProduct = (item, itemServicesList, { includeDetails = false } = {}) => {
  const inventoryItemId = item?.inventory?.id ?? item?.inventoryItemId ?? null;
  const itemDetails = (Array.isArray(itemServicesList) ? itemServicesList : []).find(
    (service) => String(service?.id) === String(inventoryItemId),
  );
  const quantity = Math.max(1, Number(item?.quantity) || 1);
  const rate = Math.max(0, Number(item?.rate ?? item?.unitPrice) || 0);
  const amountFromApi = Number(item?.amount);
  const amount =
    Number.isFinite(amountFromApi) && amountFromApi > 0 ? amountFromApi : quantity * rate;
  const serialNos = Array.isArray(item?.serialNumbers)
    ? item.serialNumbers.map((s) => String(s || "").trim()).filter(Boolean)
    : Array.isArray(item?.serial_links)
      ? item.serial_links
        .map((link) =>
          String(link?.item_serial?.serialNumber || link?.serialNumber || "").trim(),
        )
        .filter(Boolean)
      : item?.serialNo
        ? [String(item.serialNo).trim()]
        : [];
  const firstSerial = serialNos?.[0] || "";
  const name = item?.inventory?.name ?? item?.name ?? itemDetails?.name ?? "";

  const base = {
    inventoryItemId,
    quantity,
    rate,
    unitPrice: item?.rate ?? item?.unitPrice ?? rate,
    amount,
    name,
    id: item?.id,
    accountId: item?.accountId ?? itemDetails?.accountId,
    taxExempt: !!(item?.taxExempt ?? item?.inventory?.taxExempt ?? itemDetails?.taxExempt),
    discountType: item?.discountType ?? null,
    discount:
      item?.discount == null || item?.discount === "" ? null : Number(item.discount),
    serialNos,
    serialNo: firstSerial,
  };

  if (!includeDetails) return base;

  return {
    ...base,
    description:
      item?.inventory?.description ?? item?.description ?? itemDetails?.description ?? "",
    barcode: itemDetails?.barcode || item?.inventory?.barcode || item?.barcode || "",
    discountType: item?.discountType || undefined,
    discount:
      item?.discount == null || item?.discount === "" ? undefined : Number(item.discount),
  };
};

const InputStyle = {
  border: "1px solid var(--sidebar-selected-bg)",
  borderRadius: 8,
  backgroundColor: "var(--dashboard-tab-box)",
  padding: "10px 14px",
  width: "100%",
  height: "48px", // Match the height of CustomDatePicker
  resize: "none", // Prevent resizing
};

const TextAreaStyle = {
  ...InputStyle,
  height: "120px", // Fixed height for textareas
};

const InputSkeleton = ({ width = "100%", height = 48, isDatePicker = false }) => (
  <div
    className="animate-pulse"
    style={{
      width,
      height,
      backgroundColor: "#e5e7eb",
      borderRadius: isDatePicker ? 4 : 8,
      border: "1px solid #d1d5db",
      position: "relative",
      overflow: "hidden"
    }}
  >
    <div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
      style={{
        animation: "shimmer 2s infinite"
      }}
    />
  </div>
);

const isPlacementInvoiceValue = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0" || value == null || value === "") return false;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "no") return false;
  return false;
};

const getPlacementInvoiceValue = (invoice) => {
  if (!invoice) return undefined;
  return (
    invoice.isPlacementInvoiceRaw ??
    invoice.isPlacementInvoice ??
    invoice.is_placement_invoice ??
    invoice.placementInvoice
  );
};

const getInvoiceStatusBadgeStyle = (statusValue) => {
  switch (statusValue) {
    case "paid":
      return { backgroundColor: "rgba(34, 197, 94, 0.15)", color: "rgba(22, 163, 74, 1)" };
    case "partial":
      return { backgroundColor: "rgba(234, 179, 8, 0.18)", color: "rgba(161, 98, 7, 1)" };
    case "un-paid":
    case "unpaid":
      return { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "rgba(220, 38, 38, 1)" };
    case "overdue":
      return { backgroundColor: "rgba(185, 28, 28, 0.2)", color: "rgba(153, 27, 27, 1)" };
    default:
      return { backgroundColor: "rgba(107, 114, 128, 0.15)", color: "rgba(75, 85, 99, 1)" };
  }
};

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  flexWrap: "wrap",
  gap: 8,
});

const ButtonWrapper = styled("div")({
  position: "absolute",
  right: 0,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 1,
});

const HeaderWrapper2 = styled("div")({
  position: "relative",
  display: "flex",
  alignItems: "center",
  marginBottom: "10px",
  flexWrap: "wrap",
  gap: 10,
  cursor: "pointer",
});

const EditInvoice = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const tenantLogo = useSelector((state) => state.auth.tenantLogo);
  const userData = useSelector((state) => state.userData.userDetails);
  const navigate = useNavigate();
  const location = useLocation();
  const logoSrc = tenantLogo || logo4k;
  const tenantName = userData?.tenant?.name || "Company";
  const tenantPhone = getTenantPhone(userData);
  const tenantEmail = getTenantEmail(userData);
  const tenantWebsite = getTenantWebsite(userData);
  const tenantAddress = getTenantAddress(userData);
  const [logoError, setLogoError] = useState(false);
  const showCompanyName = !tenantLogo || logoError;
  const [invoiceLogoDisplay, setInvoiceLogoDisplay] = useState(logoSrc);

  useEffect(() => {
    let cancelled = false;
    setLogoError(false);
    setInvoiceLogoDisplay(logoSrc);
    if (
      typeof logoSrc !== "string" ||
      logoSrc.startsWith("data:") ||
      !logoSrc.startsWith("http")
    ) {
      return () => {
        cancelled = true;
      };
    }
    resolveInvoiceImageToDataURL(logoSrc).then((resolved) => {
      if (!cancelled && resolved) setInvoiceLogoDisplay(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [logoSrc]);
  const [resolvedInvoiceData, setResolvedInvoiceData] = useState(
    () => normalizeInvoicePayload(location.state?.invoiceData) || null,
  );
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const invoiceData = resolvedInvoiceData;
  const mainDivRef = useRef();
  const invoiceRef2 = useRef();
  const originalInvoiceRef = useRef(null);

  const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
  const [accountNumber, setAccountNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [createdAt, setCreatedAt] = useState("")
  const [createdBy, setCreatedBy] = useState("")
  const [products, setProducts] = useState([{ inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 0, rate: 0, amount: 0, id: 0 }]);
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(() => {
    const initial = normalizeInvoicePayload(location.state?.invoiceData);
    if (!initial) return true;
    const hasLineItems = Array.isArray(initial?.lineItems);
    const hasMerchant = Boolean(initial?.merchantId || initial?.merchant?.id);
    return !hasLineItems || !hasMerchant;
  });
  const [itemServicesLoading, setItemServicesLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [shipTo, setShipTo] = useState("")
  const [billTo, setBillTo] = useState("")
  const [itemServicesList, setItemServicesList] = useState([]);
  const [agentList, setAgentList] = useState([]);
  const [selectedAgentType, setSelectedAgentType] = useState(""); // Step 1: Define state
  const [selectedMerchantType, setSelectedMerchantType] = useState(""); // Step 1: Define state
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomerList, setFilteredCustomerList] = useState([]); // New state for filtered customers
  const [combinedProducts, setCombinedProducts] = useState([]); // New state for combined products
  const [deletedItems, setDeletedItems] = useState([]); // Track deleted line item IDs
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(""); // State to hold selected payment term
  const [isMerchantTaxExempt, setIsMerchantTaxExempt] = useState(false);
  const [initializedFromInvoice, setInitializedFromInvoice] = useState(false); // prevent re-initializing after edits
  const [initializedInvoiceKey, setInitializedInvoiceKey] = useState("");
  const [lineItemsEnriched, setLineItemsEnriched] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("")
  const [agentCode, setAgentCode] = useState("")
  const [issueDate, setIssueDate] = useState(null)
  const [invoiceDate, setInvoiceDate] = useState("")
  const [dueDate, setDueDate] = useState(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [subtotal, setSubtotal] = useState(0); // New state for subtotal
  const [taxes, setTaxes] = useState(0);
  const [agentName, setAgentName] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [showFedexRateNote, setShowFedexRateNote] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [status, setStatus] = useState(""); // State to hold selected status value
  const [statusTitle, setStatusTitle] = useState(""); // State to hold selected status title
  const [isPlacementInvoice, setIsPlacementInvoice] = useState(false);
  const [notes, setNotes] = useState(""); // State for notes
  const [uploadedFile, setUploadedFile] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]);

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountRowIndex, setDiscountRowIndex] = useState(null);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountTarget, setDiscountTarget] = useState("line");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCC, setEmailCC] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailContentInitialized, setEmailContentInitialized] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [ccEmails, setCcEmails] = useState([]);
  const [ccInputValue, setCcInputValue] = useState("");
  const [hostedPaymentPageUrl, setHostedPaymentPageUrl] = useState("");
  const [isCreatingHostedPaymentLink, setIsCreatingHostedPaymentLink] = useState(false);

  const [invoiceDiscountType, setInvoiceDiscountType] = useState(null);
  const [invoiceDiscount, setInvoiceDiscount] = useState(null);
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState(0);
  const [itemDiscountAmount, setItemDiscountAmount] = useState(0);
  const combinedDiscountAmount = (Number(itemDiscountAmount) || 0) + (Number(invoiceDiscountAmount) || 0);
  const data = [
    { title: "Paid", value: "paid" },
    { title: "Unpaid", value: "un-paid" },
    { title: "Partial", value: "partial" },
    { title: "Draft", value: "draft" }, // Add Draft for display purposes
  ];

  const limitedLineItems = combinedProducts.slice(0, 11);
  const limitedLineItems2 = combinedProducts.slice(11);

  const data2 = [
    { title: "Net 30", description: "Due 30 days", value: "net-30" },
    { title: "Net 60", description: "Due 60 days", value: "net-60" },
    {
      title: "Due Upon Receipt",
      description: "Due Upon Receipt",
      value: "due-receipt",
    },
    {
      title: "COD (Cash On Delivery)",
      description: "Cash On Delivery",
      value: "cod",
    },
    { title: "EOM (End Of Month)", description: "End Of Month", value: "eom" },
    {
      title: "Payment in Advance",
      description: "Payment in Advance",
      value: "advance-payment",
    },
  ];

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    let cancelled = false;
    const fetchOptions = { signal: controller.signal };

    const loadItemServices = async () => {
      try {
        setItemServicesLoading(true);
        const res = await getRequestWithOutBodyCached(
          `${baseURl}item-services`,
          accessToken,
          fetchOptions,
        );
        if (cancelled) return;
        setItemServicesList(res?.data || []);
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) return;
        toast.error(getErrorMessage(error));
      } finally {
        if (!cancelled) setItemServicesLoading(false);
      }
    };

    const loadAgents = async () => {
      try {
        setAgentsLoading(true);
        const res = await getRequestWithOutBodyCached(
          `${baseURl}user?roleTitle=Agent`,
          accessToken,
          fetchOptions,
        );
        if (cancelled) return;
        setAgentList(res?.data?.results || []);
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) return;
        toast.error(getErrorMessage(error));
      } finally {
        if (!cancelled) setAgentsLoading(false);
      }
    };

    const loadCustomers = async () => {
      try {
        setCustomersLoading(true);
        const res = await getRequestWithOutBodyCached(
          `${baseURl}customer`,
          accessToken,
          fetchOptions,
        );
        if (cancelled) return;
        setCustomerList(res?.data?.data || res?.data || []);
      } catch (error) {
        if (error?.name === "AbortError" || controller.signal.aborted) return;
        toast.error(getErrorMessage(error));
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    };

    loadItemServices();
    loadAgents();
    loadCustomers();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;

    const normalizeInvoiceId = (value) => {
      if (value === null || value === undefined) return null;
      const str = String(value);
      const match = str.match(/(\d+)/);
      return match ? match[1] : str;
    };

    const qs = new URLSearchParams(location.search || "");
    const invoiceId = normalizeInvoiceId(
      location.state?.invoiceData?.id ||
      location.state?.invoiceId ||
      qs.get("invoiceId") ||
      qs.get("invoice_id") ||
      qs.get("id"),
    );

    const hasLineItems = Array.isArray(invoiceData?.lineItems);
    const hasMerchant = Boolean(invoiceData?.merchantId || invoiceData?.merchant?.id);
    const needsHydration = !invoiceData || !hasLineItems || !hasMerchant;

    if (!needsHydration) return;
    if (!invoiceId) return;

    (async () => {
      try {
        setInvoiceLoading(true);
        const res = await getRequestWithOutBody(
          `${baseURl}invoice/${invoiceId}`,
          accessToken,
        );
        const fullInvoice = normalizeInvoicePayload(res?.data || res);
        setResolvedInvoiceData(fullInvoice || null);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setInvoiceLoading(false);
      }
    })();
  }, [accessToken, location.search, location.state, invoiceData]);

  useEffect(() => {
    const getCustomerAgentId = (c) =>
      c?.assigneeId ?? c?.agentId ?? c?.agent?.id;
    if (selectedAgentType) {
      const agentCustomers = (
        Array.isArray(customerList) ? customerList : []
      ).filter(
        (customer) =>
          String(getCustomerAgentId(customer)) === String(selectedAgentType),
      );
      setFilteredCustomerList(
        agentCustomers.length > 0
          ? agentCustomers
          : Array.isArray(customerList)
            ? customerList
            : [],
      );
    } else {
      setFilteredCustomerList(Array.isArray(customerList) ? customerList : []);
    }
  }, [customerList, selectedAgentType]);

  const handleAccountNumberChange = (e) => {
    setAccountNumber(e.target.value);
  };
  const handlePoNumberChange = (e) => {
    setPoNumber(e.target.value);
  };
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
  };

  const handleRemoveExistingFile = (index) => {
    setExistingFiles((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [];
      next.splice(index, 1);
      return next;
    });
  };

  const uploadInvoiceFiles = async () => {
    const uploaded = [];
    if (Array.isArray(uploadedFile) && uploadedFile.length > 0) {
      for (const file of uploadedFile) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "invoice");
        const res = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
        uploaded.push({
          url: res?.data?.fileUrl?.url ?? res?.data?.uploadedFiles?.url,
          mimetype: res?.data?.fileUrl?.mimetype ?? res?.data?.uploadedFiles?.mimetype,
          originalname: res?.data?.fileUrl?.originalname ?? res?.data?.uploadedFiles?.originalname,
        });
      }
    }
    return uploaded.filter((f) => f?.url);
  };

  const handleAddProductClick = () => {
    setProducts([...products, { inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 1, rate: 0, amount: 0, id: 0 }]);
  };
  const handleAgentChange = (value) => {
    const selectedAgent = (() => {
      if (value && typeof value === "object") {
        const candidateId = value?.id ?? value?.value ?? value?.agentId;
        if (candidateId != null) {
          return (agentList || []).find((agent) => String(agent?.id) === String(candidateId));
        }

        const candidateText = value?.name ?? value?.username ?? value?.fullName ?? value?.email ?? value?.title;
        if (candidateText) {
          return (agentList || []).find((agent) => (
            agent?.name === candidateText ||
            agent?.username === candidateText ||
            agent?.fullName === candidateText ||
            agent?.email === candidateText
          ));
        }
        return null;
      }

      return (agentList || []).find((agent) => (
        agent?.name === value ||
        agent?.username === value ||
        agent?.fullName === value ||
        agent?.email === value ||
        String(agent?.id || "") === String(value)
      ));
    })();
    setSelectedAgentType(selectedAgent ? selectedAgent.id : "");
    setAgentName(selectedAgent ? (selectedAgent?.name || selectedAgent?.username || "") : "");
    if (selectedAgent) {
      const getCustomerAgentId = (c) => c?.assigneeId ?? c?.agentId ?? c?.agent?.id;
      const agentCustomers = (Array.isArray(customerList) ? customerList : []).filter(
        (customer) => String(getCustomerAgentId(customer)) === String(selectedAgent.id)
      );
      setFilteredCustomerList(agentCustomers.length > 0 ? agentCustomers : (Array.isArray(customerList) ? customerList : []));
      setIsMerchantTaxExempt(selectedAgent.taxExempt);
    } else {
      setFilteredCustomerList(Array.isArray(customerList) ? customerList : []);
    }
  };
  const handleMerchantChange = (value) => {
    const selected = (Array.isArray(customerList) ? customerList : []).find(
      c => c.dbaName === value || c.legalBusinessName === value
    );
    setSelectedMerchantType(selected ? selected.id : "");
    if (selected) {
      const street = selected.dbaAddress || selected.legalAddress || "";
      const city = selected.businessCity || selected.legalCity || "";
      const state = selected.businessState || selected.state || selected.legalState || "";
      const zip = selected.businessZipCode || selected.legalZipCode || "";
      const locationLine = [street, city, state, zip].filter(Boolean).join(", ");
      const fullAddress = `${selected.dbaName || selected.legalBusinessName || ""}\n${locationLine}`.trim();
      setShipTo(fullAddress);
      setBillTo(fullAddress);
      setIsMerchantTaxExempt(selected.taxExempt);

      // Re-fetch shipping rate for new merchant address when an inventory item
      // is already selected — no need to re-select the item.
      if (hasInventoryItemSelected()) {
        const fedexAddress = buildFedexAddress(street, city, state, zip);
        if (fedexAddress) fetchFedexShippingRate(fedexAddress);
      }
    }
  };

  const getMerchantFedexAddress = () => {
    const merchant = (Array.isArray(customerList) ? customerList : []).find(
      (c) => String(c?.id) === String(selectedMerchantType),
    );
    if (!merchant) return null;
    return buildFedexAddress(
      merchant.dbaAddress || merchant.legalAddress,
      merchant.businessCity || merchant.legalCity,
      merchant.businessState || merchant.state || merchant.legalState,
      merchant.businessZipCode || merchant.legalZipCode || merchant.ownerZipcode,
    );
  };

  /**
   * shipping-rate uses only Bill To / Ship To (or selected merchant).
   * Billing & shipping are kept the same — no tenant / dummy addresses.
   */
  const getAddressFromBillToShipTo = () => {
    const address =
      parseFedexAddressFromText(shipTo) ||
      parseFedexAddressFromText(billTo) ||
      getMerchantFedexAddress();
    if (!address) return { billingAddress: null, shippingAddress: null };
    return {
      billingAddress: address,
      shippingAddress: address,
    };
  };

  const hasInventoryItemSelected = () =>
    products.some((product) => {
      if (!product?.inventoryItemId) return false;
      const item = itemServicesList.find(
        (i) => String(i?.id) === String(product.inventoryItemId),
      );
      return isInventoryItem(item);
    });

  const fetchFedexShippingRate = async (addressOverride = null) => {
    const { billingAddress, shippingAddress } = addressOverride
      ? { billingAddress: addressOverride, shippingAddress: addressOverride }
      : getAddressFromBillToShipTo();
    if (!billingAddress || !shippingAddress) return;

    try {
      const response = await postRequestWithBodyAndToken(
        `${baseURl}invoice/shipping-rate`,
        accessToken,
        {
          billingAddress,
          shippingAddress,
          serviceType: FEDEX_SERVICE_TYPE,
        },
      );
      const rate = parseShippingRateFromApi(response);
      if (rate == null) return;
      setDeliveryFee(parseFloat(rate.toFixed(2)));
      setShowFedexRateNote(true);
    } catch (error) {
      toast.error(getFedexErrorToast(error, getErrorMessage(error)));
    }
  };
  const calculateDueDate = (paymentTerm, baseDateOverride) => {
    // Use provided base date, then issue date state, fallback to today
    const baseDate = baseDateOverride
      ? new Date(baseDateOverride)
      : issueDate
        ? new Date(issueDate)
        : new Date();
    const formattedDate = (date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };

    switch (paymentTerm) {
      case "net-30":
        const net30Date = new Date(baseDate);
        net30Date.setDate(baseDate.getDate() + 30);
        return formattedDate(net30Date);

      case "net-60":
        const net60Date = new Date(baseDate);
        net60Date.setDate(baseDate.getDate() + 60);
        return formattedDate(net60Date);

      case "due-receipt":
        return formattedDate(baseDate);

      case "cod":
      case "cash-on-delivery":
        return formattedDate(baseDate);

      case "eom":
        const lastDayOfMonth = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() + 1,
          0,
        );
        return formattedDate(lastDayOfMonth);

      case "advance-payment":
        return formattedDate(baseDate);

      default:
        return "";
    }
  };

  const getItemSerialIds = (inventoryItemId, serialValues = []) => {
    const item = itemServicesList.find((i) => String(i.id) === String(inventoryItemId));
    const serials = Array.isArray(item?.serials) ? item.serials : [];
    return Array.isArray(serialValues)
      ? serialValues
        .map((serialValue) => {
          const normalizedSerial = String(serialValue || '').trim();
          if (!normalizedSerial) return null;
          return serials.find((serial) => String(serial?.serialNumber || '').trim() === normalizedSerial)?.id || null;
        })
        .filter((id) => Number(id) > 0)
      : [];
  };

  const handleInvoiceDateChange = (date) => {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    setInvoiceDate(formattedDate);
  };

  const calculateInvoiceDate = () => {
    const today = new Date();
    return today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleIssueDateChange = (date) => {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    setIssueDate(formattedDate);

    if (selectedPaymentTerm) {
      const calculatedDueDate = calculateDueDate(selectedPaymentTerm, formattedDate);
      if (calculatedDueDate) {
        const finalDueDate =
          new Date(calculatedDueDate) < new Date(formattedDate)
            ? formattedDate
            : calculatedDueDate;
        setDueDate(finalDueDate);
      }
    } else if (dueDate && new Date(dueDate) < new Date(formattedDate)) {
      setDueDate(formattedDate);
    }
  };
  const handleDueDateChange = (date) => {
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit", // Ensure two-digit month
      day: "2-digit", // Ensure two-digit day
    });

    if (issueDate && new Date(formattedDate) < new Date(issueDate)) {
      toast.error("Due date cannot be before issue date.");
      return;
    }

    setDueDate(formattedDate);
  };

  useEffect(() => {
    const baseSubtotal = products.reduce((sum, product) => {
      const qty = Math.max(1, Number(product?.quantity) || 1);
      const rate = Math.max(0, Number(product?.rate) || 0);
      return sum + qty * rate;
    }, 0);

    const calculatedSubtotal = products.reduce(
      (sum, product) => sum + (Number(product.amount) || 0),
      0,
    );
    setSubtotal(calculatedSubtotal);

    const rawItemDiscount = Math.max(0, baseSubtotal - (Number(calculatedSubtotal) || 0));
    setItemDiscountAmount(parseFloat(rawItemDiscount.toFixed(2)));

    const sub = Number(calculatedSubtotal) || 0;
    const invDiscVal = Number(invoiceDiscount) || 0;
    const invDiscType = invoiceDiscountType;
    const rawInvoiceDiscountAmount =
      invDiscType === "percent"
        ? sub * (Math.min(100, Math.max(0, invDiscVal)) / 100)
        : invDiscType === "amount"
          ? Math.max(0, invDiscVal)
          : 0;
    const cappedInvoiceDiscountAmount = Math.min(sub, rawInvoiceDiscountAmount);
    setInvoiceDiscountAmount(parseFloat(cappedInvoiceDiscountAmount.toFixed(2)));

    const deliveryFeeValue = parseFloat(deliveryFee) || 0;
    const discountedSubtotal = Math.max(0, sub - cappedInvoiceDiscountAmount);
    const calculatedSubtotalWithDeliveryFee = discountedSubtotal + deliveryFeeValue;

    let calculatedTaxes = 0;
    if (!isChecked && !isMerchantTaxExempt) {
      const taxableSubtotal = products.reduce((sum, product) => {
        const itemDetails = itemServicesList.find(
          (item) => item.id === product.inventoryItemId,
        );
        if (product?.taxExempt) return sum;
        if (itemDetails && !itemDetails.taxExempt) return sum + (Number(product.amount) || 0);
        return sum;
      }, 0);

      const ratio = sub > 0 ? cappedInvoiceDiscountAmount / sub : 0;
      const taxableAfterDiscount = Math.max(0, taxableSubtotal * (1 - ratio));
      calculatedTaxes = taxableAfterDiscount * 0.1025;
    }
    setTaxes(calculatedTaxes);

    const calculatedTotalAmount = calculatedSubtotalWithDeliveryFee + calculatedTaxes;
    setTotalAmount(parseFloat(calculatedTotalAmount.toFixed(2)));
  }, [products, deliveryFee, isChecked, isMerchantTaxExempt, itemServicesList, invoiceDiscountType, invoiceDiscount]);

  const openDiscountModal = (index) => {
    const current = products?.[index];
    if (!current) return;
    setDiscountRowIndex(index);
    setDiscountTarget("line");
    setDiscountType(current?.discountType || "percent");
    setDiscountValue(
      current?.discount != null && current?.discount !== "" ? String(current.discount) : "",
    );
    setDiscountModalOpen(true);
  };

  const openInvoiceDiscountModal = () => {
    setDiscountRowIndex(null);
    setDiscountTarget("invoice");
    setDiscountType(invoiceDiscountType || "percent");
    setDiscountValue(invoiceDiscount != null && invoiceDiscount !== "" ? String(invoiceDiscount) : "");
    setDiscountModalOpen(true);
  };

  const closeDiscountModal = () => {
    setDiscountModalOpen(false);
    setDiscountRowIndex(null);
    setDiscountValue("");
    setDiscountType("percent");
  };

  const applyDiscount = () => {
    const raw = String(discountValue || "").trim();
    const val = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Discount must be a valid number");
      return;
    }
    if (discountType === "percent" && val > 100) {
      toast.error("Percentage discount cannot exceed 100");
      return;
    }

    if (discountTarget === "invoice") {
      setInvoiceDiscountType(discountType);
      setInvoiceDiscount(val);
      closeDiscountModal();
      return;
    }

    if (discountRowIndex == null) return;
    const newProducts = [...products];
    const qty = Math.max(1, Number(newProducts[discountRowIndex]?.quantity) || 1);
    const rate = Math.max(0, Number(newProducts[discountRowIndex]?.rate) || 0);
    const baseAmount = qty * rate;
    const discountedAmount =
      discountType === "percent" ? baseAmount * (1 - val / 100) : baseAmount - val;

    newProducts[discountRowIndex] = {
      ...newProducts[discountRowIndex],
      discountType,
      discount: val,
      amount: Math.max(0, Number(discountedAmount.toFixed(2))),
    };
    setProducts(newProducts);

    const updatedCombinedProducts = newProducts.map((product) => {
      const itemDetails = itemServicesList.find(
        (item) => item.id === product.inventoryItemId,
      );
      return {
        ...product,
        name: itemDetails ? itemDetails.name : "",
        description: itemDetails ? itemDetails.description : "",
        barcode: itemDetails ? itemDetails.barcode : "",
      };
    });
    setCombinedProducts(updatedCombinedProducts);
    closeDiscountModal();
  };

  const handleRemoveProductClick = (index) => {
    const lockedStatuses = new Set(["paid", "partial", "cancelled", "canceled"]);
    const currentStatus = String(status || invoiceData?.status || "").trim().toLowerCase();
    if (lockedStatuses.has(currentStatus)) return;

    const newProducts = [...products];
    const removedProductId = Number(newProducts[index]?.id); // capture existing line item ID if any
    newProducts.splice(index, 1);
    if (newProducts.length === 0) {
      newProducts.push({ inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 1, rate: 0, amount: 0, id: 0 });
    }
    setProducts(newProducts);
    // keep combinedProducts in sync for preview/print
    const updatedCombinedProducts = newProducts.map(product => {
      const itemDetails = itemServicesList.find(item => item.id === product.inventoryItemId);
      return {
        ...product,
        name: itemDetails ? itemDetails.name : '',
        description: itemDetails ? itemDetails.description : '',
        barcode: itemDetails ? itemDetails.barcode : '',
        serialNo: product?.serialNo || '',
        serialNos: Array.isArray(product?.serialNos) ? product.serialNos : [],
      };
    });
    setCombinedProducts(updatedCombinedProducts);
    // record deleted item IDs to inform backend to remove them
    if (removedProductId > 0) {
      setDeletedItems((prev) => (prev.includes(removedProductId) ? prev : [...prev, removedProductId]));
    }
  };

  const handleProductChange = (index, field, value) => {
    const toNumber = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const newProducts = [...products];

    if (field === "inventoryItemId") {
      const prevLineItemId = newProducts[index]?.id;
      const prevInventoryItemId = newProducts[index]?.inventoryItemId;
      const selectedItem = itemServicesList.find(item => item.name === value || String(item.id) === String(value));
      if (selectedItem) {
        const availableSerials = Array.isArray(selectedItem?.serials) ? selectedItem.serials : [];
        // If this row was an existing line item and user changed the item,
        // treat as: delete old line item + add new line item.
        if (prevLineItemId && prevInventoryItemId && String(prevInventoryItemId) !== String(selectedItem.id)) {
          const lineItemId = Number(prevLineItemId);
          if (lineItemId > 0) {
            setDeletedItems((prev) => (prev.includes(lineItemId) ? prev : [...prev, lineItemId]));
          }
        }

        const rawQty = Math.max(1, toNumber(newProducts[index]?.quantity, 1));
        const maxAllowedQty = Array.isArray(selectedItem?.serials) && selectedItem.serials.length > 0
          ? selectedItem.serials.length
          : null;
        const quantity = Number.isFinite(maxAllowedQty) ? Math.min(rawQty, maxAllowedQty) : rawQty;
        if (Number.isFinite(maxAllowedQty) && rawQty > quantity) {
          toast.error(`Quantity can't be more than ${maxAllowedQty} for this item`);
        }

        const serialNos = availableSerials
          .slice(0, quantity)
          .map((s) => String(s?.serialNumber || '').trim())
          .filter(Boolean);
        const firstSerial = serialNos?.[0] || '';

        const rate = toNumber(selectedItem.sellingPrice, 0);
        newProducts[index] = {
          ...newProducts[index],
          name: selectedItem.name,
          inventoryItemId: selectedItem.id,
          barcode: selectedItem?.barcode || newProducts[index]?.barcode || "",
          serialNos,
          serialNo: firstSerial || newProducts[index]?.serialNo || "",
          quantity,
          rate,
          unitPrice: rate,
          amount: quantity * rate,
          taxExempt: selectedItem.taxExempt,
          accountId: selectedItem.accountId
        };

        // Force this row to become a new line item if the item changed.
        // Some backends require an explicit id=0 for creation during update.
        if (prevLineItemId && prevInventoryItemId && String(prevInventoryItemId) !== String(selectedItem.id)) {
          newProducts[index].id = 0;
        }
        if (isInventoryItem(selectedItem)) {
          fetchFedexShippingRate();
        }
      }
    } else if (field === 'barcode') {
      const scanned = String(value || '').trim();
      newProducts[index] = {
        ...newProducts[index],
        barcode: scanned,
      };
      if (scanned) {
        const matchedItem = itemServicesList.find(
          (item) => String(item?.barcode || '').trim() === scanned
        );
        if (matchedItem) {
          const availableSerials = Array.isArray(matchedItem?.serials) ? matchedItem.serials : [];
          const rawQty = Math.max(1, toNumber(newProducts[index]?.quantity, 1));
          const maxAllowedQty = Array.isArray(matchedItem?.serials) && matchedItem.serials.length > 0
            ? matchedItem.serials.length
            : null;
          const quantity = Number.isFinite(maxAllowedQty) ? Math.min(rawQty, maxAllowedQty) : rawQty;
          if (Number.isFinite(maxAllowedQty) && rawQty > quantity) {
            toast.error(`Quantity can't be more than ${maxAllowedQty} for this item`);
          }
          const serialNos = availableSerials
            .slice(0, quantity)
            .map((s) => String(s?.serialNumber || '').trim())
            .filter(Boolean);
          const firstSerial = serialNos?.[0] || '';
          const rate = Math.max(0, toNumber(matchedItem?.sellingPrice, 0));
          newProducts[index] = {
            ...newProducts[index],
            inventoryItemId: matchedItem.id,
            barcode: String(matchedItem?.barcode || scanned),
            serialNos,
            serialNo: firstSerial || newProducts[index]?.serialNo || "",
            quantity,
            rate,
            unitPrice: rate,
            amount: quantity * rate,
            taxExempt: matchedItem.taxExempt,
            accountId: matchedItem.accountId,
          };
          // If this was an existing line, and we matched a new item via barcode, treat as new line
          if (Number(newProducts[index]?.id) > 0) newProducts[index].id = 0;
          if (isInventoryItem(matchedItem)) {
            fetchFedexShippingRate();
          }
        }
      }
    } else if (field === 'serialNos') {
      const serialIndex = Number(value?.serialIndex);
      const serialValue = String(value?.serialNo ?? '').trim();
      const current = Array.isArray(newProducts[index]?.serialNos)
        ? [...newProducts[index].serialNos]
        : [];
      if (serialValue) {
        const duplicateIndex = current.findIndex(
          (s, i) => i !== serialIndex && String(s || '').trim() === serialValue
        );
        if (duplicateIndex !== -1) {
          toast.error('This serial number is already selected');
          setProducts(newProducts);
          return;
        }
      }
      if (Number.isFinite(serialIndex) && serialIndex >= 0) {
        current[serialIndex] = serialValue;
      }
      newProducts[index] = {
        ...newProducts[index],
        serialNos: current,
        serialNo: current?.[0] || newProducts[index]?.serialNo || "",
      };
    } else {
      if (field === "quantity") {
        const selectedItem = itemServicesList.find(
          (item) => String(item?.id) === String(newProducts[index]?.inventoryItemId)
        );
        const maxAllowedQty = Array.isArray(selectedItem?.serials) && selectedItem.serials.length > 0
          ? selectedItem.serials.length
          : null;
        const rawQty = Math.max(1, toNumber(value, 1));
        const quantity = Number.isFinite(maxAllowedQty) ? Math.min(rawQty, maxAllowedQty) : rawQty;
        if (Number.isFinite(maxAllowedQty) && rawQty > quantity) {
          toast.error(`Quantity can't be more than ${maxAllowedQty} for this item`);
        }
        const rate = toNumber(newProducts[index]?.rate, 0);
        newProducts[index] = {
          ...newProducts[index],
          quantity,
          unitPrice: rate,
          amount: quantity * rate,
        };

        const availableSerials = Array.isArray(selectedItem?.serials) ? selectedItem.serials : [];
        const currSerials = Array.isArray(newProducts[index]?.serialNos) ? [...newProducts[index].serialNos] : [];
        const nextSerialNos = currSerials.slice(0, quantity);
        while (nextSerialNos.length < quantity) {
          const auto = String(availableSerials?.[nextSerialNos.length]?.serialNumber || '').trim();
          nextSerialNos.push(auto || '');
        }
        newProducts[index].serialNos = nextSerialNos;
        newProducts[index].serialNo = nextSerialNos?.[0] || newProducts[index]?.serialNo || "";
      } else if (field === "rate") {
        const rate = Math.max(0, toNumber(value, 0));
        const quantity = Math.max(1, toNumber(newProducts[index]?.quantity, 1));
        newProducts[index] = {
          ...newProducts[index],
          rate,
          unitPrice: rate,
          amount: quantity * rate,
        };
      } else {
        newProducts[index] = {
          ...newProducts[index],
          [field]: value,
        };
      }
    }

    setProducts(newProducts);

    const updatedCombinedProducts = newProducts.map(product => {
      const itemDetails = itemServicesList.find(item => item.id === product.inventoryItemId);
      return {
        ...product,
        name: itemDetails ? itemDetails.name : '',
        description: itemDetails ? itemDetails.description : '',
        barcode: itemDetails ? itemDetails.barcode : '',
        serialNo: product?.serialNo || '',
        serialNos: Array.isArray(product?.serialNos) ? product.serialNos : [],
      };
    });
    setCombinedProducts(updatedCombinedProducts);
  };

  const handleToggleProductTaxExempt = (index) => {
    const newProducts = [...products];
    if (!newProducts[index]) return;

    newProducts[index] = {
      ...newProducts[index],
      taxExempt: !newProducts[index]?.taxExempt,
    };

    setProducts(newProducts);

    const updatedCombinedProducts = newProducts.map(product => {
      const itemDetails = itemServicesList.find(item => item.id === product.inventoryItemId);
      return {
        ...product,
        name: itemDetails ? itemDetails.name : '',
        description: itemDetails ? itemDetails.description : '',
        barcode: itemDetails ? itemDetails.barcode : ''
      };
    });
    setCombinedProducts(updatedCombinedProducts);
  };

  const handleDeliveryFeeChange = (e) => {
    setShowFedexRateNote(false);
    const raw = e.target.value;
    if (raw === "" || raw == null) {
      setDeliveryFee("");
      return;
    }
    const parsed = parseFloat(raw);
    setDeliveryFee(Number.isFinite(parsed) ? parsed : "");
  };
  const handleShipToChange = (e) => {
    setShipTo(e.target.value);
  };
  const handleBillToChange = (e) => {
    setBillTo(e.target.value);
  };

  const handleButtonClick = () => {
    // Map over products to enrich them with details from itemServicesList
    const enrichedProducts = products.map((product) => {
      const itemDetails = itemServicesList.find(
        (item) => item.id === product.inventoryItemId,
      );
      return {
        ...product,
        inventory: {
          description: itemDetails?.description || "",
          barcode: itemDetails?.barcode || "",
          fileUrl: itemDetails?.fileUrl || [],
          id: itemDetails?.id || product.inventoryItemId,
          name: itemDetails?.name || "",
          taxExempt: itemDetails?.taxExempt || false,
        },
        createdAt: new Date().toISOString(), // Example of adding a createdAt field
        updatedAt: new Date().toISOString(), // Example of adding an updatedAt field
      };
    });

    const updatedInvoiceData = {
      shipTo,
      billTo,
      invoiceNo,
      issueDate,
      dueDate,
      subtotal,
      taxes,
      totalAmount,
      deliveryFee,
      paidAmount,
      balanceDue,
      accountNumber,
      poNumber,
      selectedPaymentTerm,
      selectedAgentType,
      agentName,
      merchantName,
      selectedMerchantType,
      notes,
      products: enrichedProducts, // Use enriched products here
      status,
      statusTitle,
      isMerchantTaxExempt,
      discountType: invoiceDiscountType || null,
      discount: invoiceDiscount != null && invoiceDiscount !== "" ? Number(invoiceDiscount) : null,
    };

    navigate("/home/previewInvoice", {
      state: { invoiceData: updatedInvoiceData },
    });
  };
  useEffect(() => {
    if (!invoiceData) return;

    const invoiceId = invoiceData?.id ?? "unknown";
    const hasLineItems = Array.isArray(invoiceData?.lineItems);
    const nextKey = `${invoiceId}:${hasLineItems ? "full" : "partial"}`;

    // Already fully initialized for this invoice
    if (initializedInvoiceKey === `${invoiceId}:full`) return;
    // Already initialized with the same partial payload
    if (initializedInvoiceKey === nextKey) return;

    originalInvoiceRef.current = {
        status: invoiceData?.status ?? '',
        billingAddress: invoiceData?.billingAddress ?? '',
        shippingAddress: invoiceData?.shippingAddress ?? '',
        issueDate: invoiceData?.issueDate ?? '',
        dueDate: invoiceData?.dueDate ?? '',
        merchantId: invoiceData?.merchantId ?? invoiceData?.merchant?.id ?? '',
        agentId: invoiceData?.agentId ?? invoiceData?.agent?.id ?? '',
        invoiceNo: invoiceData?.invoiceNo ?? '',
        accountNumber: invoiceData?.accountNumber ?? '',
        poNumber: invoiceData?.poNumber ?? '',
        paymentTerms: invoiceData?.paymentTerms ?? '',
        notes: invoiceData?.notes ?? '',
        files: Array.isArray(invoiceData?.files) ? invoiceData.files : [],

        lineItems: Array.isArray(invoiceData?.lineItems) ? invoiceData.lineItems : [],
        deliveryFee: invoiceData?.deliveryFee ?? null,
        totalAmount: invoiceData?.totalAmount ?? null,
        subTotal: invoiceData?.subTotal ?? invoiceData?.sub_total ?? null,
        tax: invoiceData?.tax ?? null,
        discountType: invoiceData?.discountType ?? null,
        discount: invoiceData?.discount ?? null,
        trackingNo: invoiceData?.trackingNo ?? invoiceData?.trackingNumber ?? '',
        isPlacementInvoice: isPlacementInvoiceValue(getPlacementInvoiceValue(invoiceData)),
      };

      setShipTo(invoiceData?.shippingAddress || "");
      setBillTo(invoiceData?.billingAddress || "");
      setInvoiceNo(invoiceData?.invoiceNo || "");
      setSubtotal(parseFloat(invoiceData?.subTotal) || 0);
      setTaxes(parseFloat(invoiceData?.tax) || 0);
      setTotalAmount(parseFloat(invoiceData?.totalAmount) || 0);
      setDeliveryFee(parseFloat(invoiceData?.deliveryFee) || 0);
      setPaidAmount(parseFloat(invoiceData?.paidAmount) || 0);
      setBalanceDue(parseFloat(invoiceData?.balanceDue) || 0);
      setIsPlacementInvoice(isPlacementInvoiceValue(getPlacementInvoiceValue(invoiceData)));
      const statusItem = data.find((item) => item.value === invoiceData?.status);
      if (statusItem) {
        setStatus(statusItem.value);
        setStatusTitle(statusItem.title);
      } else if (invoiceData?.status === "overdue") {
        setStatus("overdue");
        setStatusTitle("Overdue");
      } else {
        setStatus(invoiceData?.status || "");
        setStatusTitle(invoiceData?.status || "");
      }
      setAccountNumber(invoiceData?.accountNumber || "");
      setPoNumber(invoiceData?.poNumber || "");
      setCreatedAt(
        invoiceData?.createdAt
          ? new Date(invoiceData.createdAt).toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          : "",
      );
      setCreatedBy(invoiceData?.creator?.name || invoiceData?.postedInfo?.postedByName || "-");
      setSelectedPaymentTerm(normalizePaymentTerm(invoiceData?.paymentTerms || ""));
      setNotes(invoiceData?.notes || "");
      setTrackingNo(invoiceData?.trackingNo || invoiceData?.trackingNumber || "");

      const merchantFromList = (Array.isArray(customerList) ? customerList : []).find(
        (customer) =>
          String(customer?.id) === String(invoiceData?.merchantId ?? invoiceData?.merchant?.id),
      );
      const agentFromList = (Array.isArray(agentList) ? agentList : []).find(
        (agent) =>
          String(agent?.id) === String(invoiceData?.agentId ?? invoiceData?.agent?.id),
      );

      // If invoice has no agent, check if logged-in user is an agent and set them
      if (!invoiceData?.agentId && !invoiceData?.agent?.id && userData?.id) {
        const isUserAgent = (agentList || []).some(agent => String(agent.id) === String(userData.id));
        if (isUserAgent) {
          setSelectedAgentType(userData.id);
          setAgentName(userData.username || "");
        } else {
          setSelectedAgentType("");
          setAgentName("");
        }
      } else {
        setSelectedAgentType(invoiceData?.agentId || invoiceData?.agent?.id || "");
        setAgentName(
          getAgentDisplayName(invoiceData?.agentId || invoiceData?.agent?.id, invoiceData?.agent ?? agentFromList, agentList),
        );
      }
      setMerchantName(getMerchantDisplayName(invoiceData?.merchant, merchantFromList));
      setSelectedMerchantType(invoiceData?.merchantId || invoiceData?.merchant?.id || "");
      setIssueDate(
        invoiceData?.issueDate
          ? new Date(invoiceData?.issueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          : "",
      );
      setDueDate(
        invoiceData?.dueDate
          ? new Date(invoiceData?.dueDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          : "",
      );
      setInvoiceDate(
        (invoiceData?.invoiceDate || invoiceData?.issueDate)
          ? new Date(
            invoiceData?.invoiceDate || invoiceData?.issueDate,
          ).toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          : "",
      );

      // Set isMerchantTaxExempt based on agent or merchant tax exemption
      const agentTaxExempt = (invoiceData?.agent ?? agentFromList)?.taxExempt || false;
      const merchantTaxExempt = (merchantFromList ?? invoiceData?.merchant)?.taxExempt || false;
      setIsMerchantTaxExempt(agentTaxExempt || merchantTaxExempt);

      setInvoiceDiscountType(invoiceData?.discountType || null);
      setInvoiceDiscount(
        invoiceData?.discount != null && invoiceData?.discount !== ""
          ? Number(invoiceData.discount)
          : null,
      );

      const fetchedProducts = (invoiceData?.lineItems ?? []).map((item) =>
        mapInvoiceLineItemToProduct(item, itemServicesList),
      );

      setProducts(
        fetchedProducts.length > 0
          ? fetchedProducts
          : [{ inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 1, rate: 0, amount: 0, id: 0 }],
      );

      const fetchedProducts2 = (invoiceData?.lineItems ?? []).map((item) =>
        mapInvoiceLineItemToProduct(item, itemServicesList, { includeDetails: true }),
      );

      setCombinedProducts(fetchedProducts2);
      setDeletedItems([]);
      setExistingFiles(Array.isArray(invoiceData?.files) ? invoiceData.files : []);
      setLineItemsEnriched(Array.isArray(itemServicesList) && itemServicesList.length > 0);
      setInitializedInvoiceKey(nextKey);
      setInitializedFromInvoice(true);
  }, [
    invoiceData,
    initializedInvoiceKey,
    userData,
  ]);

  // Enrich line items once item-services finish loading (serials, barcodes, etc.)
  useEffect(() => {
    if (!initializedFromInvoice || lineItemsEnriched || itemServicesLoading) return;
    if (!Array.isArray(itemServicesList) || itemServicesList.length === 0) {
      setLineItemsEnriched(true);
      return;
    }

    const enrichProduct = (product) => {
      const details = itemServicesList.find(
        (service) => String(service?.id) === String(product?.inventoryItemId),
      );
      if (!details) return product;
      return {
        ...product,
        name: product?.name || details?.name || "",
        barcode: product?.barcode || details?.barcode || "",
        accountId: product?.accountId ?? details?.accountId,
        taxExempt: !!(product?.taxExempt || details?.taxExempt),
        description: product?.description || details?.description || "",
      };
    };

    setProducts((prev) => (Array.isArray(prev) ? prev.map(enrichProduct) : prev));
    setCombinedProducts((prev) => (Array.isArray(prev) ? prev.map(enrichProduct) : prev));
    setLineItemsEnriched(true);
  }, [
    initializedFromInvoice,
    lineItemsEnriched,
    itemServicesLoading,
    itemServicesList,
  ]);

  // Fill agent/merchant display names when their lists arrive
  useEffect(() => {
    if (!initializedFromInvoice || agentsLoading) return;
    if (!selectedAgentType) return;
    const agentExists = (agentList || []).some(
      (agent) => String(agent?.id) === String(selectedAgentType),
    );
    if (!agentExists) {
      // Keep invoice agent display if list is empty (incomplete load); otherwise clear invalid id
      if ((agentList || []).length === 0) {
        const fallbackName = getAgentDisplayName(
          selectedAgentType,
          invoiceData?.agent,
          agentList,
        );
        if (fallbackName) setAgentName(fallbackName);
        return;
      }
      setSelectedAgentType("");
      setAgentName("");
      return;
    }
    const nextName = getAgentDisplayName(selectedAgentType, invoiceData?.agent, agentList);
    if (nextName) setAgentName(nextName);
  }, [initializedFromInvoice, agentsLoading, agentList, selectedAgentType, invoiceData]);

  useEffect(() => {
    if (!initializedFromInvoice || customersLoading) return;
    if (!selectedMerchantType) return;
    const merchantFromList = (Array.isArray(customerList) ? customerList : []).find(
      (customer) => String(customer?.id) === String(selectedMerchantType),
    );
    const nextName = getMerchantDisplayName(invoiceData?.merchant, merchantFromList);
    if (nextName) setMerchantName(nextName);

    const merchantTaxExempt = (merchantFromList ?? invoiceData?.merchant)?.taxExempt || false;
    const agentTaxExempt = invoiceData?.agent?.taxExempt || false;
    setIsMerchantTaxExempt(agentTaxExempt || merchantTaxExempt);
  }, [
    initializedFromInvoice,
    customersLoading,
    customerList,
    selectedMerchantType,
    invoiceData,
  ]);

  const columns = [
    { id: "item", label: "ITEM", align: "center" },
    { id: "barcode", label: "BARCODE", align: "center" },
    { id: "serialNo", label: "SERIAL NO", align: "center" },
    { id: "quantity", label: "QUANTITY", align: "center" },
    { id: "rate", label: "UNIT PRICE", align: "center" },
    { id: "amount", label: "AMOUNT", align: "center" },
    { id: "delete", label: "ACTIONS", align: "center" },
  ];

  const canDeleteLineItems = (() => {
    const currentStatus = String(status || invoiceData?.status || "").trim().toLowerCase();
    return !["paid", "partial", "cancelled", "canceled"].includes(currentStatus);
  })();

  const showInvoiceSkeleton = !initializedFromInvoice;
  const showAgentSkeleton = agentsLoading;
  const showMerchantSkeleton = customersLoading;
  const showItemsSkeleton = itemServicesLoading || !initializedFromInvoice;

  const getDeletedLineItemIds = () =>
    [...new Set(
      (deletedItems || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )];

  const columns2 = [
    { id: "name", label: "Item", align: "center" },
    { id: "barcode", label: "Barcode", align: "center" },
    { id: "serialNo", label: "Serial No", align: "center" },
    { id: "description", label: "Description", align: "center" },
    { id: "quantity", label: "Quantity", align: "center" },
    { id: "rate", label: "Price", align: "center" },
    { id: "amount", label: "Amount", align: "center" },
  ];

  const sanitizedLineItems =
    invoiceData?.lineItems?.map((item) => ({
      ...item,
      inventory: item.inventory || {
        id: item.inventoryItemId,
        name: item.name || "",
        description: item.description || "",
        barcode: item.barcode || "",
      },
    })) || [];

  const getValidAgentIdForApi = () => {
    if (!selectedAgentType) return null;
    const agentExists = (agentList || []).some(
      (agent) => String(agent?.id) === String(selectedAgentType),
    );
    return agentExists ? selectedAgentType : null;
  };

  const validateInvoiceBeforeSave = ({ requireLines = false } = {}) => {
    const paymentTerm = normalizePaymentTerm(selectedPaymentTerm);
    if (!paymentTerm) {
      toast.error("Payment term is required");
      return false;
    }
    if (!VALID_PAYMENT_TERMS.includes(paymentTerm)) {
      toast.error(
        "Payment terms must be Net 30, Net 60, Due Upon Receipt, COD, EOM, or Payment in Advance",
      );
      return false;
    }
    if (paymentTerm !== selectedPaymentTerm) {
      setSelectedPaymentTerm(paymentTerm);
    }

    if (selectedAgentType) {
      if (agentsLoading) {
        toast.error("Please wait for agents to finish loading");
        return false;
      }
      const agentExists = (agentList || []).some(
        (agent) => String(agent?.id) === String(selectedAgentType),
      );
      if (!agentExists) {
        toast.error("Selected agent does not exist. Please choose a valid agent.");
        setSelectedAgentType("");
        setAgentName("");
        return false;
      }
    }

    if (requireLines) {
      if (
        !issueDate ||
        !shipTo ||
        !billTo ||
        products.some((product) => !product.inventoryItemId || product.inventoryItemId === 0)
      ) {
        toast.error("Please fill issue date, bill to, ship to, and all line items");
        return false;
      }
    }

    return true;
  };

  const handleDraft = async () => {
    if (!validateInvoiceBeforeSave()) return;
    // Show update confirmation modal instead of directly updating
    setShowUpdateModal(true);
  };

  const confirmUpdate = async ({ sendToCustomer = false } = {}) => {
    // Proceed with update logic
    setIsUpdating(true);
    if (sendToCustomer) setIsSendingEmail(true);
    const deliveryFeeValue = parseFloat(deliveryFee) || 0;
    const sub = Number(subtotal) || 0;
    const disc = Number(invoiceDiscountAmount) || 0;

    let calculatedTaxes = 0; // Initialize calculatedTaxes to 0

    // Calculate taxes for each product
    if (!isMerchantTaxExempt) {
      // Only calculate taxes if merchant is not tax-exempt
      products.forEach((product) => {
        const itemDetails = itemServicesList.find(
          (item) => item.id === product.inventoryItemId,
        );
        if (product?.taxExempt) return;
        if (itemDetails && !itemDetails.taxExempt) {
          calculatedTaxes += product.amount * 0.1025; // Apply tax only if not tax-exempt
        }
      });
    }

    // Check if the checkbox is checked for tax exemption
    if (isChecked) {
      calculatedTaxes = 0; // Set taxes to zero if the checkbox is checked
    }

    // Calculate total amount including taxes
    const totalWithTax = Math.max(0, sub - disc) + deliveryFeeValue + calculatedTaxes;

    setLoading(true);

    try {
      const uploadedFiles = await uploadInvoiceFiles();
      const combinedFiles = [...(Array.isArray(existingFiles) ? existingFiles : []), ...(Array.isArray(uploadedFiles) ? uploadedFiles : [])].filter((f) => f?.url);


      const filteredProducts = products.filter(product => product.inventoryItemId !== 0 && Number(product.quantity) > 0);
      const lineItemsWithAccounts = products.map((p) => {
        const quantity = Math.max(1, Number(p.quantity) || 1);
        const rate = Math.max(0, Number(p.rate) || 0);

        const serialNumbers = Array.isArray(p?.serialNos)
          ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
          : [];

        const itemSerialIds = (() => {
          const item = itemServicesList.find((i) => i.id === p.inventoryItemId);
          const serials = Array.isArray(item?.serials) ? item.serials : [];
          return serialNumbers
            .map((sn) =>
              serials.find((s) => String(s?.serialNumber || '').trim() === sn)?.id
            )
            .filter((id) => Number(id) > 0);
        })();

        return {
          id: Number(p.id) || 0,
          inventoryItemId: Number(p.inventoryItemId) || 0,
          accountId:
            p.accountId ??
            itemServicesList.find((item) => item.id === p.inventoryItemId)
              ?.accountId,
          quantity: p.quantity ?? undefined,
          unitPrice: p.unitPrice ?? undefined, // 👈 add this
          rate: p.rate ?? undefined,
          amount: p.amount ?? undefined,
          itemSerialIds: itemSerialIds.length ? itemSerialIds : undefined,
          taxExempt: !!p.taxExempt,
          discount: p.discount ?? undefined,
          discountType: p.discountType ?? undefined,
        };
      });
      const normalizeMoney = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Number(n.toFixed(2));
      };

      const normalizeDiscount = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n === 0) return null;
        return n;
      };

      const isEqualPrimitive = (a, b) => {
        if (a === b) return true;
        if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return true;
        return String(a ?? '') === String(b ?? '');
      };

      const original = originalInvoiceRef.current || {};
      // Prefer UI totalAmount (same calc as totals panel); fall back to local totalWithTax
      const currentTotalAmount =
        normalizeMoney(totalAmount) ?? normalizeMoney(totalWithTax);
      const currentDiscount = normalizeDiscount(invoiceDiscount);

      const apiData = {
        // status: "draft",
        status: status ?? "draft",
        lineItems: lineItemsWithAccounts ?? undefined,

        subTotal: subtotal ?? undefined,
        tax: taxes ?? undefined,
        deliveryFee: deliveryFee ?? undefined,
        // Always send current total so API stays in sync when line items / fees / tax change
        totalAmount: currentTotalAmount ?? undefined,

        discountType: invoiceDiscountType ?? undefined,

        billingAddress: billTo ?? undefined,
        shippingAddress: shipTo ?? undefined,

        issueDate: issueDate ?? undefined,
        dueDate: dueDate ?? undefined,

        merchantId: selectedMerchantType ?? undefined,
        agentId: getValidAgentIdForApi() ?? undefined,

        invoiceNo: invoiceNo ?? undefined,
        accountNumber: accountNumber ?? undefined,
        poNumber: poNumber ?? undefined,
        paymentTerms: normalizePaymentTerm(selectedPaymentTerm) || undefined,

        notes: notes ?? undefined,
        trackingNo: trackingNo?.trim() || undefined,
      };

      // Same as Create Invoice
      apiData.isPlacementInvoice = isPlacementInvoice;

      if (!isEqualPrimitive(normalizeDiscount(original?.discount), currentDiscount)) {
        if (currentDiscount !== null) apiData.discount = currentDiscount;
      }

      apiData.files = combinedFiles;

      if (trackingNo && trackingNo.trim()) apiData.trackingNo = trackingNo;

      const deletedIds = getDeletedLineItemIds();
      if (deletedIds.length > 0) {
        apiData.deletedIds = deletedIds;
      }

      const result = await putRequestWithBodyAndToken(
        `${baseURl}invoice/${invoiceData?.id}`,
        accessToken,
        applyAssignmentMetadataIfNeeded(apiData, lineItemsWithAccounts, userData),
      );

      if (sendToCustomer) {
        const recipientEmail = String(toEmail || getDefaultRecipientEmail() || "").trim();
        if (!recipientEmail) {
          toast.success(result.message || "Invoice updated successfully");
          toast.error("Invoice updated, but no customer email was found to send.");
          setShowUpdateModal(false);
          navigate(-1);
          return;
        }

        let paymentLinkUrl = hostedPaymentPageUrl || "";
        if (!paymentLinkUrl && canGenerateHostedPaymentLink()) {
          try {
            const { returnUrl, cancelUrl } = getPaymentRedirectUrls();
            const hostedPaymentRes = await createInvoiceHostedPaymentLink(
              accessToken,
              invoiceData?.id,
              {
                amount: Number(totalWithTax || totalAmount || 0),
                returnUrl,
                cancelUrl,
              },
            );
            paymentLinkUrl = extractHostedPaymentPageUrl(hostedPaymentRes) || "";
            if (paymentLinkUrl) setHostedPaymentPageUrl(paymentLinkUrl);
          } catch (_) {
            // Update succeeded; continue sending email without payment link
          }
        }

        const resolvedEmailLogo = (await resolveInvoiceImageToDataURL(logoSrc)) || logoSrc;
        const emailBody = getDefaultEmailBody();
        const emailBodyWithPaymentLink = paymentLinkUrl
          ? `${emailBody}<p><a href="${paymentLinkUrl}" target="_blank" rel="noopener noreferrer">Pay this invoice online</a></p>`
          : emailBody;

        const emailPayload = {
          html: composeEmailContent(emailBodyWithPaymentLink, resolvedEmailLogo),
          invoiceId: invoiceData?.id,
          to: recipientEmail,
          email: recipientEmail,
          trackingNumber: trackingNo?.trim() || undefined,
          trackingNo: trackingNo?.trim() || undefined,
          hostedPaymentPageUrl: paymentLinkUrl || undefined,
        };
        if (ccEmails && ccEmails.length > 0) {
          emailPayload.cc = ccEmails;
        }

        const emailRes = await postRequestWithBodyAndToken(
          `${baseURl}invoice/send`,
          accessToken,
          emailPayload,
        );
        toast.success(
          emailRes?.message ||
            result.message ||
            "Invoice updated and emailed to customer successfully",
        );
      } else {
        toast.success(result.message);
      }

      setShowUpdateModal(false);
      navigate(-1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setIsUpdating(false);
      setIsSendingEmail(false);
    }
  };

  const cancelUpdate = () => {
    setShowUpdateModal(false);
  };

  const handleDeleteLead = async () => {
    setLoading(true);
    try {
      const result = await deleteRequest(
        `${baseURl}invoice/${invoiceData?.id}`,
        accessToken,
      );
      toast.success(result.message);
      navigate(-1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceStatus = async () => {
    if (!validateInvoiceBeforeSave({ requireLines: true })) return;

    let calculatedTaxes = 0;

    if (!isMerchantTaxExempt) {
      products.forEach((product) => {
        const itemDetails = itemServicesList.find(
          (item) => item.id === product.inventoryItemId,
        );
        if (product?.taxExempt) return;
        if (itemDetails && !itemDetails.taxExempt) {
          calculatedTaxes += product.amount * 0.1025;
        }
      });
    }

    if (isChecked) calculatedTaxes = 0;

    const deliveryFeeValue = parseFloat(deliveryFee) || 0;

    const totalWithTax =
      Math.max(0, (Number(subtotal) || 0) - (Number(invoiceDiscountAmount) || 0)) +
      deliveryFeeValue +
      calculatedTaxes;

    setLoading(true);

    try {
      const uploadedFiles = await uploadInvoiceFiles();
      const combinedFiles = [
        ...(Array.isArray(existingFiles) ? existingFiles : []),
        ...(Array.isArray(uploadedFiles) ? uploadedFiles : []),
      ].filter((f) => f?.url);

      const filteredProducts = products.filter(
        (p) => p.inventoryItemId !== 0 && Number(p.quantity) > 0
      );

      // ✅ LINE ITEMS FIX
      const lineItems = filteredProducts.map((p) => {
        const quantity = Math.max(1, Number(p.quantity) || 1);
        const rate = Math.max(0, Number(p.rate) || 0);

        const serialNumbers = Array.isArray(p?.serialNos)
          ? p.serialNos.map((s) => String(s || "").trim()).filter(Boolean)
          : [];

        const itemSerialIds = (() => {
          const item = itemServicesList.find(
            (i) => i.id === p.inventoryItemId
          );
          const serials = Array.isArray(item?.serials) ? item.serials : [];
          return serialNumbers
            .map((sn) =>
              serials.find(
                (s) => String(s?.serialNumber || "").trim() === sn
              )?.id
            )
            .filter((id) => Number(id) > 0);
        })();

        return {
          id: Number(p.id) || 0,
          inventoryItemId: Number(p.inventoryItemId) || 0,

          quantity: p.quantity ?? null,
          unitPrice: p.unitPrice ?? null, // ✅ FIX
          rate: p.rate ?? null,
          amount: p.amount ?? null,

          serialNo: p?.serialNo ? String(p.serialNo) : null,
          serialNumbers: serialNumbers.length ? serialNumbers : null,

          itemSerialIds: itemSerialIds.length ? itemSerialIds : null, // ✅ FIX

          taxExempt: p.taxExempt ?? null,

          accountId:
            p.accountId ??
            itemServicesList.find((item) => item.id === p.inventoryItemId)
              ?.accountId ??
            null,

          discountType: p.discountType ?? null, // ✅ FIX
          discount:
            p.discount == null || p.discount === ""
              ? null
              : Number(p.discount),
        };
      });

      const normalizeMoney = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Number(n.toFixed(2));
      };

      const normalizeDiscount = (v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n === 0) return null;
        return n;
      };

      const isEqualPrimitive = (a, b) => {
        if (a === b) return true;
        if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) return true;
        return String(a ?? '') === String(b ?? '');
      };

      const normalizeFilesForCompare = (files) => {
        const list = Array.isArray(files) ? files : [];
        return list
          .map((f) => ({
            url: String(f?.url || '').trim(),
            name: String(f?.name || '').trim(),
          }))
          .filter((f) => f.url);
      };

      const normalizeLineItemsForCompare = (items) => {
        const list = Array.isArray(items) ? items : [];
        return list.map((li) => ({
          id: Number(li?.id) || 0,
          inventoryItemId: Number(li?.inventoryItemId ?? li?.inventory?.id) || 0,
          quantity: Number(li?.quantity) || 0,
          rate: normalizeMoney(li?.rate ?? li?.unitPrice) ?? 0,
          amount: normalizeMoney(li?.amount) ?? 0,
          discountType: li?.discountType ?? null,
          discount: li?.discount == null || li?.discount === '' ? null : Number(li?.discount),
          taxExempt: li?.taxExempt ?? null,
          serialNo: li?.serialNo ? String(li.serialNo) : null,
          serialNumbers: Array.isArray(li?.serialNumbers)
            ? li.serialNumbers.map((s) => String(s || '').trim()).filter(Boolean)
            : null,
        }));
      };

      const original = originalInvoiceRef.current || {};

      // Always send these keys
      const apiData = {
        status: status ?? '',
        billingAddress: billTo ?? '',
        shippingAddress: shipTo ?? '',
        issueDate: issueDate ?? '',
        dueDate: dueDate ? dueDate : null,
        merchantId: selectedMerchantType ?? '',
        agentId: getValidAgentIdForApi(),
        invoiceNo: invoiceNo ?? '',
        accountNumber: accountNumber ?? '',
        poNumber: poNumber ?? '',
        paymentTerms: normalizePaymentTerm(selectedPaymentTerm) || '',
        notes: notes ?? '',
        files: combinedFiles,
      };

      // Same as Create Invoice
      apiData.isPlacementInvoice = isPlacementInvoice;

      // Other keys: only send if changed
      const currentDeliveryFee = deliveryFee ?? null;
      const currentTotalAmount =
        normalizeMoney(totalAmount) ?? normalizeMoney(totalWithTax);
      const currentSubTotal = normalizeMoney(subtotal);
      const currentTax = normalizeMoney(calculatedTaxes);
      const currentTrackingNo = trackingNo?.trim() || '';
      const currentDiscountType = invoiceDiscountType ?? null;
      const currentDiscount = normalizeDiscount(invoiceDiscount);
      const currentLineItems = lineItems;

      const originalFiles = normalizeFilesForCompare(original?.files);
      const currentFiles = normalizeFilesForCompare(combinedFiles);
      if (JSON.stringify(originalFiles) !== JSON.stringify(currentFiles)) {
        apiData.files = combinedFiles;
      }

      if (!isEqualPrimitive(original?.trackingNo, currentTrackingNo)) {
        apiData.trackingNo = currentTrackingNo;
      }

      if (!isEqualPrimitive(normalizeMoney(original?.deliveryFee), normalizeMoney(currentDeliveryFee))) {
        apiData.deliveryFee = currentDeliveryFee;
      }

      // Always send current total so API stays in sync when amounts change
      apiData.totalAmount = currentTotalAmount;

      if (!isEqualPrimitive(normalizeMoney(original?.subTotal), currentSubTotal)) {
        apiData.subTotal = currentSubTotal;
      }

      if (!isEqualPrimitive(normalizeMoney(original?.tax), currentTax)) {
        apiData.tax = currentTax;
      }

      if (!isEqualPrimitive(original?.discountType, currentDiscountType)) {
        apiData.discountType = currentDiscountType;
      }

      if (!isEqualPrimitive(normalizeDiscount(original?.discount), currentDiscount)) {
        if (currentDiscount !== null) apiData.discount = currentDiscount;
      }

      const originalItemsNorm = normalizeLineItemsForCompare(original?.lineItems);
      const currentItemsNorm = normalizeLineItemsForCompare(currentLineItems);
      if (JSON.stringify(originalItemsNorm) !== JSON.stringify(currentItemsNorm)) {
        apiData.lineItems = currentLineItems;
      }

      if (deletedItems?.length) {
        const deletedIds = getDeletedLineItemIds();
        if (deletedIds.length > 0) apiData.deletedIds = deletedIds;
      }

      const result = await putRequestWithBodyAndToken(
        `${baseURl}invoice/${invoiceData?.id}`,
        accessToken,
        applyAssignmentMetadataIfNeeded(apiData, currentLineItems, userData),
      );

      toast.success(result.message);
      navigate(-1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  const handleCreateInvoiceStatus = async () => {
    if (!validateInvoiceBeforeSave({ requireLines: true })) return;

    let calculatedTaxes = 0; // Initialize calculatedTaxes to 0

    // Calculate taxes for each product
    if (!isMerchantTaxExempt) {
      // Only calculate taxes if merchant is not tax-exempt
      products.forEach((product) => {
        const itemDetails = itemServicesList.find(
          (item) => item.id === product.inventoryItemId,
        );
        if (product?.taxExempt) return;
        if (itemDetails && !itemDetails.taxExempt) {
          calculatedTaxes += product.amount * 0.1025; // Apply tax only if not tax-exempt
        }
      });
    }

    // Check if the checkbox is checked for tax exemption
    if (isChecked) {
      calculatedTaxes = 0; // Set taxes to zero if the checkbox is checked
    }

    const deliveryFeeValue = parseFloat(deliveryFee) || 0;
    // Calculate total amount including taxes (after invoice discount)
    const totalWithTax =
      Math.max(0, (Number(subtotal) || 0) - (Number(invoiceDiscountAmount) || 0)) +
      deliveryFeeValue +
      calculatedTaxes;
    setLoading(true);

    try {
      const uploadedFiles = await uploadInvoiceFiles();
      const combinedFiles = [...(Array.isArray(existingFiles) ? existingFiles : []), ...(Array.isArray(uploadedFiles) ? uploadedFiles : [])].filter((f) => f?.url);
      const filteredProducts = products.filter(product => product.inventoryItemId !== 0 && Number(product.quantity) > 0);
      const apiData = {
        status: "un-paid",
        lineItems: filteredProducts.map((p) => {
          const quantity = Math.max(1, Number(p.quantity) || 1);
          const rate = Math.max(0, Number(p.rate) || 0);

          const serialNumbers = Array.isArray(p?.serialNos)
            ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
            : [];
          const itemSerialIds = (() => {
            const item = itemServicesList.find((i) => i.id === p.inventoryItemId);
            const serials = Array.isArray(item?.serials) ? item.serials : [];
            const ids = serialNumbers
              .map((sn) => serials.find((s) => String(s?.serialNumber || '').trim() === sn)?.id)
              .filter((id) => Number(id) > 0);
            return ids;
          })();
          return {
            id: Number(p.id) || 0,
            inventoryItemId: Number(p.inventoryItemId) || 0,
            quantity,
            rate,
            amount: Number(p.amount) || (quantity * rate),
            serialNo: p?.serialNo ? String(p.serialNo) : undefined,
            serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
            itemSerialIds: itemSerialIds.length > 0 ? itemSerialIds : undefined,
            taxExempt: !!p.taxExempt,
            accountId: p.accountId ?? itemServicesList.find((item) => item.id === p.inventoryItemId)?.accountId,
            discountType: p.discountType || undefined,
            discount:
              p.discount == null || p.discount === ""
                ? undefined
                : Number(p.discount),
          };
        }),
      };

      if (billTo) apiData.billingAddress = billTo;
      if (shipTo) apiData.shippingAddress = shipTo;
      if (issueDate) apiData.issueDate = issueDate;
      if (dueDate) apiData.dueDate = dueDate;
      if (deliveryFee !== null && deliveryFee !== undefined) apiData.deliveryFee = deliveryFee;
      if (totalAmount !== null && totalAmount !== undefined) apiData.totalAmount = parseFloat(totalWithTax.toFixed(2));
      if (subtotal !== null && subtotal !== undefined) apiData.subTotal = parseFloat(subtotal.toFixed(2));
      apiData.tax = parseFloat(calculatedTaxes.toFixed(2));
      if (selectedMerchantType) apiData.merchantId = selectedMerchantType;
      const validAgentId = getValidAgentIdForApi();
      if (validAgentId) apiData.agentId = validAgentId;
      if (invoiceNo) apiData.invoiceNo = invoiceNo;
      if (deletedItems.length > 0) {
        const deletedIds = getDeletedLineItemIds();
        if (deletedIds.length > 0) apiData.deletedIds = deletedIds;
      }

      // Conditionally add accountNumber, poNumber, and paymentTerms
      if (accountNumber) apiData.accountNumber = accountNumber;
      if (poNumber) apiData.poNumber = poNumber;
      if (selectedPaymentTerm) apiData.paymentTerms = normalizePaymentTerm(selectedPaymentTerm);
      if (notes) apiData.notes = notes;
      if (uploadedFiles.length > 0) apiData.files = uploadedFiles;

      apiData.discountType = invoiceDiscountType ?? undefined;
      apiData.discount = invoiceDiscount != null && invoiceDiscount !== "" ? Number(invoiceDiscount) : undefined;
      if (trackingNo && trackingNo.trim()) apiData.trackingNo = trackingNo;
      // Same as Create Invoice
      apiData.isPlacementInvoice = isPlacementInvoice;

      const result = await putRequestWithBodyAndToken(
        `${baseURl}invoice/${invoiceData?.id || location?.state?.invoiceData?.id}`,
        accessToken,
        applyAssignmentMetadataIfNeeded(apiData, apiData.lineItems, userData),
      );
      toast.success("Invoice created successfully");
      navigate(-1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const selectedPaymentTermDescription =
    data.find((term) => term.value === selectedPaymentTerm)?.description || "";
  const selectedPaymentTermTitle =
    data2.find((term) => term.value === selectedPaymentTerm)?.title || "";
  const selectedMerchant = customerList.find(
    (c) => String(c?.id) === String(selectedMerchantType)
  );

  const email =
    selectedMerchant?.email ||
    selectedMerchant?.ownerEmail ||
    invoiceData?.merchant?.email ||
    invoiceData?.merchant?.ownerEmail ||
    "";
  const handleGoBack = () => {
    navigate(-1);
  };

  // Helper function to convert data URL to Blob
  const dataURLToBlob = (dataURL) => {
    const byteString = atob(dataURL.split(",")[1]);
    const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // helper: sleep
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // helper: compress a Blob -> DataURL (same Compressor flow you already use)
  const compressBlobToDataURL = (blob, quality = 0.8) =>
    new Promise((resolve, reject) => {
      new Compressor(blob, {
        quality,
        success(result) {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(result);
        },
        error: reject,
      });
    });

  const buildInvoicePdf = async () => {
    const element = mainDivRef.current;
    const hiddenElement = document.getElementById("hiddenSection");
    const hiddenElement2 = document.getElementById("hiddenSection2");
    const needsSecondPage = combinedProducts.length > 7;

    // remember original display to restore precisely
    const prev1 = hiddenElement?.style.display ?? "";
    const prev2 = hiddenElement2?.style.display ?? "";

    const logoImgs = Array.from(
      document.querySelectorAll('img[data-role="invoice-logo"]'),
    );
    const prevLogoSrcs = logoImgs.map((img) => img.getAttribute("src") || "");

    try {
      const resolvedLogo = await resolveInvoiceImageToDataURL(invoiceLogoDisplay);
      if (resolvedLogo) {
        logoImgs.forEach((img) => {
          img.setAttribute("src", resolvedLogo);
        });
        await sleep(50);
      }

      hiddenElement.style.display = "block";

      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        allowTaint: false,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
      });

      const imgBlob = dataURLToBlob(canvas.toDataURL("image/jpeg", 1.0));
      const img1 = await compressBlobToDataURL(imgBlob, 0.8);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(img1, "JPEG", 0, 0, imgWidth, imgHeight);

      if (needsSecondPage) {
        hiddenElement.style.display = "none";
        hiddenElement2.style.display = "block";
        await sleep(100); // allow layout to settle

        const canvas2 = await html2canvas(hiddenElement2, {
          scale: 3,
          useCORS: true,
          logging: false,
          allowTaint: false,
          backgroundColor: "#ffffff",
          imageTimeout: 15000,
        });

        const imgBlob2 = dataURLToBlob(canvas2.toDataURL("image/jpeg", 1.0));
        const img2 = await compressBlobToDataURL(imgBlob2, 0.8);

        pdf.addPage();
        pdf.addImage(
          img2,
          "JPEG",
          0,
          0,
          imgWidth,
          (canvas2.height * imgWidth) / canvas2.width,
        );
      }

      return pdf;
    } finally {
      logoImgs.forEach((img, idx) => {
        img.setAttribute("src", prevLogoSrcs[idx] || "");
      });
      // restore exactly what was there before
      if (hiddenElement2) hiddenElement2.style.display = prev2 || "none";
      if (hiddenElement) hiddenElement.style.display = prev1 || "none";
    }
  };

  const PAID_PAYMENT_WARRANTY_TERMS =
    "Payment has been received in full for this invoice. Please report any shortages or damages within 3 days of delivery. Returns and warranty claims require the original invoice. New equipment includes a 1-year limited warranty, while used/refurbished equipment includes a 6-month limited warranty. The warranty covers manufacturing defects only and excludes damage caused by misuse, improper installation, accidents, unauthorized repairs, or normal wear and tear. Thank you for your business.";

  const UNPAID_PAYMENT_WARRANTY_TERMS =
    "Payment is due as stated on this invoice. Warranty coverage begins only after full payment is received. Please report any shortages or damages within 3 days of delivery. Returns and warranty claims require the original invoice. Once paid in full, new equipment includes a 1-year limited warranty, and used/refurbished equipment includes a 6-month limited warranty covering manufacturing defects only. The warranty does not cover misuse, improper installation, accidents, unauthorized repairs, or normal wear and tear.";

  const buildPaymentWarrantyTermsHtml = () => {
    const terms =
      String(status || "").toLowerCase() === "paid"
        ? PAID_PAYMENT_WARRANTY_TERMS
        : UNPAID_PAYMENT_WARRANTY_TERMS;

    return `
      <div style="margin-top: 20px;">
        <div style="font-size: 14px; font-weight: 700; margin-bottom: 6px; color: #111827;">Payment &amp; Warranty Terms</div>
        <div style="font-size: 12px; line-height: 1.7; color: #374151;">
          ${terms}
        </div>
      </div>`;
  };

  const buildEmailSignature = (signatureLogoSrc) => `
      <div data-email-signature="true" class="email-signature" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #111827; font-family: Arial, sans-serif;">
        ${buildPaymentWarrantyTermsHtml()}
        <div style="font-size: 14px; font-weight: 700; margin: 18px 0 6px;">${tenantName || "Dolphin Merchant Services"}</div>
        <div style="font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
          ${tenantAddress}
        </div>
        ${tenantWebsite ? `<div style="font-size: 13px; line-height: 1.6; margin-bottom: 4px;">${tenantWebsite}</div>` : ""}
        <div style="font-size: 13px; line-height: 1.6; margin-bottom: 16px;">Direct: ${tenantPhone}</div>
        <div style="margin-top: 8px;">
          <img src="${signatureLogoSrc || logoSrc}" alt="Tenant Logo" style="max-width: 180px; max-height: 64px; width: auto; height: auto; object-fit: contain; display: block;" />
        </div>
      </div>`;

  const stripEmailSignature = (html) => {
    try {
      if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
        return String(html || '')
          .replace(/\s*<div[^>]*(data-email-signature\s*=\s*"true"|class\s*=\s*"[^"]*email-signature[^"]*")[\s\S]*/i, '')
          .trim();
      }

      const parser = new window.DOMParser();
      const doc = parser.parseFromString(String(html || ''), 'text/html');

      // Remove any existing signature blocks (multiple just in case)
      const nodes = doc.querySelectorAll('[data-email-signature="true"], .email-signature');
      nodes.forEach((n) => n.remove());

      return (doc.body?.innerHTML || '').trim();
    } catch (e) {
      return String(html || '')
        .replace(/\s*<div[^>]*(data-email-signature\s*=\s*"true"|class\s*=\s*"[^"]*email-signature[^"]*")[\s\S]*/i, '')
        .trim();
    }
  };

  const getDefaultEmailBody = () => {
    if (status === "paid") {
      return "<p>Hello — your paid invoice is attached.</p>";
    }

    if (status === "partial") {
      return "<p>Hello — your invoice is attached.</p>";
    }

    return "<p>Hello — your un-paid invoice is attached.</p>";
  };

  const composeEmailContent = (content, signatureLogoSrc = logoSrc) => {
    const baseContent = (content && String(content).trim())
      ? String(content).trim()
      : getDefaultEmailBody();

    const strippedContent = stripEmailSignature(baseContent);
    return `${strippedContent}${buildEmailSignature(signatureLogoSrc)}`;
  };

  const getDefaultRecipientEmail = () => {
    const selectedMerchant = customerList.find((c) => c.id === selectedMerchantType);
    return (
      selectedMerchant?.email ||
      selectedMerchant?.ownerEmail ||
      invoiceData?.merchant?.email ||
      invoiceData?.merchant?.ownerEmail ||
      ""
    );
  };

  const getInvoiceStatus = () =>
    String(status || invoiceData?.status || "").trim().toLowerCase();

  const canEditPlacement = (() => {
    const currentStatus = getInvoiceStatus();
    const lockedStatuses = new Set(["paid", "partial", "cancelled", "canceled"]);
    return !lockedStatuses.has(currentStatus);
  })();

  const isInvoiceOverdue = () => {
    const currentStatus = getInvoiceStatus();
    if (currentStatus === "overdue") return true;

    const due = dueDate || invoiceData?.dueDate;
    if (!due) return false;

    const payableStatuses = new Set(["un-paid", "unpaid"]);
    if (!payableStatuses.has(currentStatus)) return false;

    return dayjs(due).startOf("day").isBefore(dayjs().startOf("day"));
  };

  const getInvoiceStatusBadge = () => {
    const currentStatus = getInvoiceStatus();
    if (currentStatus === "overdue") {
      return { value: "overdue", title: "Overdue" };
    }
    if (isInvoiceOverdue() && !["paid", "draft", "partial"].includes(currentStatus)) {
      return { value: "overdue", title: "Overdue" };
    }
    if (!currentStatus) return null;
    return { value: currentStatus, title: statusTitle || currentStatus };
  };

  const invoiceStatusBadge = getInvoiceStatusBadge();

  const canGenerateHostedPaymentLink = () => {
    const currentStatus = getInvoiceStatus();
    if (!currentStatus || currentStatus === "paid" || currentStatus === "draft") {
      return false;
    }

    return (
      currentStatus === "un-paid" ||
      currentStatus === "unpaid" ||
      currentStatus === "overdue" ||
      currentStatus === "partial" ||
      isInvoiceOverdue()
    );
  };

  const getPaymentRedirectUrls = () => {
    const base = window.location.origin.replace(/\/$/, "");
    return {
      returnUrl: `${base}/payment/success`,
      cancelUrl: `${base}/payment/cancelled`,
    };
  };

  const handleCreateHostedPaymentLink = async () => {
    if (isCreatingHostedPaymentLink) return;

    if (!canGenerateHostedPaymentLink()) {
      toast.error("Payment link is only available for unpaid or overdue invoices");
      return;
    }

    const invoiceId = invoiceData?.id;
    if (!invoiceId) {
      toast.error("Invoice id missing");
      return;
    }

    const resolvedAmount = Number(totalAmount || invoiceData?.totalAmount || invoiceData?.amount || 0);
    if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
      toast.error("Invoice amount is required to generate payment link");
      return;
    }

    setIsCreatingHostedPaymentLink(true);
    try {
      const { returnUrl, cancelUrl } = getPaymentRedirectUrls();
      const hasValidRedirectUrls =
        /^https?:\/\//i.test(returnUrl) && /^https?:\/\//i.test(cancelUrl);

      if (!hasValidRedirectUrls) {
        toast.error(
          "Payment redirect URLs must start with http:// or https://.",
        );
        return;
      }

      const hostedPaymentRes = await createInvoiceHostedPaymentLink(
        accessToken,
        invoiceId,
        {
          amount: resolvedAmount,
          returnUrl,
          cancelUrl,
        },
      );

      const extractedHostedPaymentUrl = extractHostedPaymentPageUrl(hostedPaymentRes);
      if (!extractedHostedPaymentUrl) {
        throw new Error("Hosted payment page URL not found in API response");
      }

      setHostedPaymentPageUrl(extractedHostedPaymentUrl);
      toast.success(hostedPaymentRes?.message || "Hosted payment link generated");
    } catch (error) {
      const message =
        parseAuthorizeNetErrorMessage(error) ||
        getErrorMessage(error, "Failed to generate hosted payment link");
      if (isAuthorizeNetNotConfiguredError(message)) {
        toast.error(
          "Authorize.Net is not configured for this tenant. Go to Settings → Authorize.Net to save credentials.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setIsCreatingHostedPaymentLink(false);
    }
  };

  const handleSendEmailSubmit = async () => {
    if (isSendingEmail) return false;

    setIsSendingEmail(true);
    try {
      // const pdf = await buildInvoicePdf();

      // const blob = pdf.output("blob");
      // const sanitize = (s) =>
      //   (s || "")
      //     .toString()
      //     .replace(/[\\/:*?"<>|]+/g, "")
      //     .trim();
      // const customerNameLine = (billTo || "").split("\n")[0] || "Invoice";
      // const fileName = `${sanitize(customerNameLine)}-${sanitize(invoiceNo || "INV")}.pdf`;

      const recipientEmail = String(toEmail || "").trim();

      if (!recipientEmail) {
        toast.error("Please enter a recipient email");
        return false;
      }

      const resolvedEmailLogo = (await resolveInvoiceImageToDataURL(logoSrc)) || logoSrc;

      const emailBodyWithPaymentLink = hostedPaymentPageUrl
        ? `${emailContent}<p><a href="${hostedPaymentPageUrl}" target="_blank" rel="noopener noreferrer">Pay this invoice online</a></p>`
        : emailContent;

      // Create API payload with HTML content and invoiceId
      const emailPayload = {
        html: composeEmailContent(emailBodyWithPaymentLink, resolvedEmailLogo),
        invoiceId: invoiceData?.id,
        to: recipientEmail,
        email: recipientEmail,
        trackingNumber: trackingNo?.trim() || undefined,
        trackingNo: trackingNo?.trim() || undefined,
        hostedPaymentPageUrl: hostedPaymentPageUrl || undefined,
      };

      // Add CC only if provided
      if (ccEmails && ccEmails.length > 0) {
        emailPayload.cc = ccEmails;
      }

      // const form = new FormData();
      // form.append("data", JSON.stringify(emailPayload));
      // form.append(
      //   "file",
      //   new File([blob], fileName, { type: "application/pdf" }),
      // );

      // for (let [key, value] of form.entries()) {
      // }

      const res = await postRequestWithBodyAndToken(
        `${baseURl}invoice/send`,
        accessToken,
        emailPayload,
      );
      toast.success(res?.message || "Invoice emailed successfully");
      setShowEmailModal(false); // Close modal after sending
      return true;
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to email invoice"));
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setEmailCC("");
    setToEmail("");
    setEmailContent("");
    setEmailContentInitialized(false);
    setTrackingNo("");
    setCcEmails([]);
    setCcInputValue("");
    setHostedPaymentPageUrl("");
  };

  // Initialize email content only once when modal opens
  useEffect(() => {
    if (showEmailModal && !emailContentInitialized) {
      // Store body-only in state. Signature is appended only when rendering/sending.
      const initialBody = getDefaultEmailBody();
      setEmailContent(initialBody);
      setEmailContentInitialized(true);
    }
  }, [showEmailModal]);

  const handleAddCcEmail = (email) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !ccEmails.includes(trimmedEmail)) {
      setCcEmails([...ccEmails, trimmedEmail]);
      setEmailCC([...ccEmails, trimmedEmail].join(', '));
    }
    setCcInputValue("");
  };

  const handleRemoveCcEmail = (emailToRemove) => {
    const updatedEmails = ccEmails.filter(email => email !== emailToRemove);
    setCcEmails(updatedEmails);
    setEmailCC(updatedEmails.join(', '));
  };

  const handleCcInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddCcEmail(ccInputValue);
    } else if (e.key === 'Backspace' && !ccInputValue && ccEmails.length > 0) {
      // Remove last email if input is empty and backspace is pressed
      const updatedEmails = ccEmails.slice(0, -1);
      setCcEmails(updatedEmails);
      setEmailCC(updatedEmails.join(', '));
    }
  };

  const handlePrint = async () => {
    try {
      const invoiceId = invoiceData?.id;
      if (!invoiceId) {
        toast.error("Invoice id missing");
        return;
      }

      const isPaidInvoice = String(status || invoiceData?.status || '').toLowerCase() === 'paid';
      const pdfType = isPaidInvoice ? 'paid' : 'unpaid';

      const res = await fetch(`${baseURl}invoice/${invoiceId}/pdf/${pdfType}`, {
        method: 'GET',
        headers: buildAuthHeaders(accessToken),
      });

      if (!res.ok) {
        let msg = 'Failed to load PDF';
        try {
          const txt = await res.text();
          if (txt) msg = txt;
        } catch (e) {
          // ignore
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        marginTop: -70,
        backgroundColor: "var(--dashboard-bg)",
        padding: 10,
      }}
    >
      <div
        className="w-full "
        style={{
          backgroundColor: "var(--dashboard-card-bg)",
          borderRadius: 14,
        }}
      >
        <div
          style={{ marginTop: 10, padding: 10, borderRadius: 14 }}
          className="sm:m-4 p-3 pt-4  m-2"
        >
          <HeaderWrapper>
            <HeaderWrapper2>
              <div className="flex items-center gap-2" onClick={handleGoBack}>
                <IoIosArrowBack size={20} color="var(--sidebar-text-primary)" />
                <Heading
                  Fontweight={700}
                  color={"var(--sidebar-text-primary)"}
                  Heading={"Edit Invoice"}
                  Fontsize={30}
                />
                {invoiceStatusBadge && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 28,
                      padding: "0 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      ...getInvoiceStatusBadgeStyle(invoiceStatusBadge.value),
                    }}
                  >
                    {invoiceStatusBadge.title}
                  </span>
                )}
                {invoiceData && isPlacementInvoice && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 28,
                      padding: "0 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      backgroundColor: "rgba(139, 92, 246, 0.15)",
                      color: "#7C3AED",
                    }}
                  >
                    Placement
                  </span>
                )}
              </div>
            </HeaderWrapper2>
            <ButtonWrapper className="flex items-center gap-2">
              <BottonCustom
                backgroundColor={"rgba(67, 121, 238, 1)"}
                width={150}
                title={"Apply Discount"}
                height={40}
                color={"#fff"}
                fontSize={14}
                fontWeight={500}
                onClick={openInvoiceDiscountModal}
              />
              <div
                className="flex items-center gap-2"
                style={{
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--dashboard-box-border)',
                  backgroundColor: 'var(--dashboard-tab-box)',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--sidebar-text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Placement Invoice
                </span>
                <Switch
                  checked={isPlacementInvoice}
                  onChange={setIsPlacementInvoice}
                  disabled={!canEditPlacement}
                  className="group relative flex h-6 w-11 cursor-pointer rounded-full bg-[#CBD5E1] p-0.5 transition-colors duration-200 ease-in-out focus:outline-none data-[checked]:bg-[#4379EE] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white shadow transition duration-200 ease-in-out group-data-[checked]:translate-x-5"
                  />
                </Switch>
              </div>
              <div
                style={{
                  border: "1px solid var(--dashboard-box-border)",
                  borderRadius: 12,
                }}
                className="flex"
              >
                {/* <div style={{ backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '12px 0 0 12px', borderRight: '1px solid var(--dashboard-box-border)' }} className="py-2 px-3 flex flex-col items-center" >
                                <Heading
                                    Fontweight={600}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'Date'}
                                    Fontsize={12}
                                />
                                <Heading
                                    Fontweight={600}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={issueDate || new Date().toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit'
                                    })}
                                    Fontsize={12}
                                />
                            </div> */}
                <div
                  style={{
                    backgroundColor: "var(--dashboard-tab-box)",
                    borderRadius: "0 12px 12px 0",
                  }}
                  className="py-2 px-3 flex flex-col items-center"
                >
                  <Heading
                    Fontweight={600}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Invoice #"}
                    Fontsize={12}
                  />
                  <Heading
                    Fontweight={600}
                    color={"var(--sidebar-text-primary)"}
                    Heading={invoiceNo}
                    Fontsize={12}
                  />
                </div>
              </div>
            </ButtonWrapper>
          </HeaderWrapper>
          <div className="flex justify-between gap-6 items-start">
            <div
              style={{
                borderRadius: 8,
                backgroundColor: "var(--dashboard-tab-box)",
              }}
              className="py-1 px-4  "
            >
              <div className="flex justify-start">
                {showCompanyName ? (
                  <div
                    style={{
                      color: 'var(--navbar-text)',
                      maxWidth: '160px',
                      lineHeight: '1.2',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>
                      {tenantName.split(' ').slice(0, 2).join(' ')}
                    </span>
                    {tenantName.split(' ').length > 2 && (
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>
                        {tenantName.split(' ').slice(2).join(' ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    src={invoiceLogoDisplay}
                    alt="Tenant logo"
                    className="max-w-32 max-h-10 w-auto h-auto object-contain object-left"
                    data-role="invoice-logo"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
              <div className="flex justify-start gap-2 items-start mt-4 ">
                <img src={locationInvoice} className="w-2 h-3 mt-1" />
                <Heading
                  Fontweight={400}
                  color={"var(--sidebar-text-primary)"}
                  Heading={tenantAddress}
                  Fontsize={10}
                // className={'w-[70%]'}
                // Tailwind CSS classes
                />
              </div>
              <div className="flex justify-start gap-2 items-start mt-2">
                <img src={contactInvoice} className="w-2.5 h-2.5 mt-1" />
                <Heading
                  Fontweight={400}
                  color={"var(--sidebar-text-primary)"}
                  Heading={`Direct: ${tenantPhone}`}
                  Fontsize={10}
                // className={'w-[100%]'}
                // Tailwind CSS classes
                />
              </div>
              <div className="flex justify-start gap-2 items-start mt-2">
                <img src={mailInvoice} className="w-2.5 h-2.5 mt-1" />
                <Heading
                  Fontweight={400}
                  color={"var(--sidebar-text-primary)"}
                  Heading={tenantEmail}
                  Fontsize={10}
                // Tailwind CSS classes
                />
              </div>
              {tenantWebsite ? (
              <div className="flex justify-start gap-2 items-start mt-2">
                <img src={website} className="w-2.5 h-2.5 mt-1" />
                <Heading
                  Fontweight={400}
                  color={"var(--sidebar-text-primary)"}
                  Heading={tenantWebsite}
                  Fontsize={10}
                  mt={2}
                // Tailwind CSS classes
                />
              </div>
              ) : null}
            </div>
            <div>
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                <div>
                  <Heading
                    Fontweight={600}
                    color={"var(--fieldsTitle)"}
                    Heading={
                      <span>
                        Issue Date<span style={{ color: "red" }}>*</span>
                      </span>
                    }
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton width="144px" height={28} />
                  ) : (
                    <CustomDatePicker
                      value={issueDate}
                      onChange={handleIssueDateChange}
                      label="Issue Date"
                      newCreateInvoice={true}
                    />
                  )}
                </div>

                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Invoice Date'}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton width="144px" height={28} isDatePicker={true} />
                  ) : (
                    <CustomDatePicker
                      value={invoiceDate}
                      onChange={handleInvoiceDateChange}
                      label="Invoice Date"
                      newCreateInvoice={true}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Due Date'}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton width="144px" height={28} isDatePicker={true} />
                  ) : (
                    <CustomDatePicker
                      value={dueDate}
                      onChange={handleDueDateChange}
                      label="Due Date"
                      newCreateInvoice={true}
                      minDate={issueDate ? dayjs(issueDate) : undefined}
                    />
                  )}
                </div>
                <div className="" style={{}}>
                  {showInvoiceSkeleton ? (
                    <>
                      <Heading
                        Fontweight={500}
                        color={'var(--fieldsTitle)'}
                        Heading={'Account Number'}
                        Fontsize={10}
                        mb={2}
                      />
                      <InputSkeleton width="144px" height={28} />
                    </>
                  ) : (
                    <LabeledInput
                      label="Account Number"
                      inputPlaceholder="Enter Account Number"
                      inputValue={accountNumber}
                      onInputChange={handleAccountNumberChange}
                      newCreateInvoice={true}
                    />
                  )}
                </div>
                <div className="" style={{}}>
                  {showInvoiceSkeleton ? (
                    <>
                      <Heading
                        Fontweight={500}
                        color={'var(--fieldsTitle)'}
                        Heading={'Created At'}
                        Fontsize={10}
                        mb={2}
                      />
                      <InputSkeleton width="144px" height={28} />
                    </>
                  ) : (
                    <LabeledInput
                      label="Created At"
                      inputPlaceholder=""
                      inputValue={createdAt}
                      newCreateInvoice={true}
                      disabled={true}
                    />
                  )}
                </div>
                <div className="" style={{}}>
                  {showInvoiceSkeleton ? (
                    <>
                      <Heading
                        Fontweight={500}
                        color={'var(--fieldsTitle)'}
                        Heading={'Created By'}
                        Fontsize={10}
                        mb={2}
                      />
                      <InputSkeleton width="144px" height={28} />
                    </>
                  ) : (
                    <LabeledInput
                      label="Created By"
                      inputPlaceholder=""
                      inputValue={createdBy}
                      newCreateInvoice={true}
                      disabled={true}
                    />
                  )}
                </div>
                <div className="" style={{}}>
                  {showInvoiceSkeleton ? (
                    <>
                      <Heading
                        Fontweight={500}
                        color={'var(--fieldsTitle)'}
                        Heading={'PO Number'}
                        Fontsize={10}
                        mb={2}
                      />
                      <InputSkeleton width="144px" height={28} />
                    </>
                  ) : (
                    <LabeledInput
                      label="PO Number"
                      inputPlaceholder="Enter PO Number"
                      inputValue={poNumber}
                      onInputChange={handlePoNumberChange}
                      newCreateInvoice={true}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Agent'}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {showAgentSkeleton ? (
                    <InputSkeleton width="144px" height={28} />
                  ) : (
                    <SearchInput
                      selectedValue={agentName}
                      suggestions={agentList}
                      onSelect={handleAgentChange}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Merchant'}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {showMerchantSkeleton ? (
                    <InputSkeleton width="144px" height={28} />
                  ) : (
                    <SearchInput
                      selectedValue={merchantName}
                      suggestions={filteredCustomerList.map((customer) => ({
                        name: customer?.dbaName || customer?.legalBusinessName,
                      }))}
                      onSelect={handleMerchantChange}
                      disabled={true}
                    />
                  )}

                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Payment Terms'}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton width="144px" height={28} />
                  ) : (
                    <DropdownMenu
                      menuItems={data2.map(term => ({ name: term.title, value: term.value }))}
                      defaultText={'Select Payment Term'}
                      selectedValue={selectedPaymentTermTitle}
                      onSelect={(value) => {
                        setSelectedPaymentTerm(value);
                        const calculatedDueDate = calculateDueDate(value);
                        if (calculatedDueDate) {
                          setDueDate(calculatedDueDate);
                        }
                      }}
                      newCreateInvoice={true}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Status'}
                    Fontsize={10}
                    mb={2}
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton width="144px" height={28} />
                  ) : (
                    <DropdownMenu
                      menuItems={data.filter(term => term.value !== "draft").map(term => ({ name: term.title, value: term.value }))}
                      defaultText={'Select Status'}
                      selectedValue={statusTitle}
                      onSelect={(value) => {
                        const selectedStatus = data.find(item => item.value === value);
                        setStatus(selectedStatus?.value || "");
                        setStatusTitle(selectedStatus?.title || "");
                      }}
                      newCreateInvoice={true}
                    />
                  )}
                </div>
                {/* <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Placement'}
                    Fontsize={10}
                    mb={2}
                  />
                  {loading ? (
                    <InputSkeleton width="144px" height={28} />
                  ) : (
                    <div
                      className="flex h-7 w-36 items-center justify-center"
                      style={{
                        border: '1px solid var(--sidebar-selected-bg)',
                        borderRadius: 4,
                        backgroundColor: 'var(--dashboard-tab-box)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 22,
                          padding: '0 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: isPlacementInvoice
                            ? 'rgba(139, 92, 246, 0.15)'
                            : 'rgba(107, 114, 128, 0.15)',
                          color: isPlacementInvoice ? '#7C3AED' : 'rgba(75, 85, 99, 1)',
                        }}
                      >
                        {isPlacementInvoice ? 'Yes' : 'No'}
                      </span>
                    </div>
                  )}
                </div> */}
              </div>
              <div className="flex flex-wrap  gap-4">
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={<span>Ship To<span style={{ color: 'red' }}>*</span></span>}
                    Fontsize={10}
                  // Tailwind CSS classes
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton height={64} />
                  ) : (
                    <textarea
                      type="text"
                      placeholder="Ship To"
                      value={shipTo}
                      onChange={handleShipToChange}
                      className={`mt-0.5 p-1 sm:w-36 h-16`}
                      rows={4}
                      style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={<span>Bill To<span style={{ color: 'red' }}>*</span></span>}
                    Fontsize={10}
                  // Tailwind CSS classes
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton height={64} />
                  ) : (
                    <textarea
                      type="text"
                      placeholder="Bill To"
                      value={billTo}
                      onChange={handleBillToChange}
                      className={`mt-0.5 p-1 sm:w-36 h-16`}
                      rows={4}
                      style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Notes'}
                    Fontsize={10}
                  />
                  {showInvoiceSkeleton ? (
                    <InputSkeleton height={64} />
                  ) : (
                    <textarea
                      type="text"
                      placeholder="Add notes..."
                      value={notes}
                      onChange={handleNotesChange}
                      className={`mt-0.5 p-1 sm:w-36 h-16`}
                      rows={4}
                      style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Files'}
                    Fontsize={10}
                  />
                  {Array.isArray(existingFiles) && existingFiles.length > 0 && (
                    <div className="mt-1 mb-2" style={{ maxWidth: 260 }}>
                      {existingFiles.map((f, idx) => (
                        <div key={`${f?.url || ''}-${idx}`} className="flex items-center justify-between gap-2">
                          <a
                            href={f?.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] truncate"
                            style={{ color: 'var(--dashboard-text-primary)' }}
                          >
                            {f?.originalname || f?.name || 'File'}
                          </a>
                          <button
                            type="button"
                            className="text-[10px]"
                            style={{ color: 'rgba(220, 38, 38, 1)' }}
                            onClick={() => handleRemoveExistingFile(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <UploadFile
                    onFileChange={handleFileUpload}
                    droppedFiles={uploadedFile}
                  />
                </div>
                {/* </div> */}
              </div>
            </div>
          </div>
          <div>
            <div className="mt-2">
              {showItemsSkeleton ? (
                <div className="space-y-4">
                  <div
                    className="animate-pulse"
                    style={{
                      height: 60,
                      backgroundColor: "#e5e7eb",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      style={{
                        animation: "shimmer 2s infinite"
                      }}
                    />
                  </div>
                  <div
                    className="animate-pulse"
                    style={{
                      height: 200,
                      backgroundColor: "#e5e7eb",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      style={{
                        animation: "shimmer 2s infinite"
                      }}
                    />
                  </div>
                  <div
                    className="animate-pulse"
                    style={{
                      height: 60,
                      backgroundColor: "#e5e7eb",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      style={{
                        animation: "shimmer 2s infinite"
                      }}
                    />
                  </div>
                </div>
              ) : (
                <ItemTable
                  createInvoice={true}
                  editPurchase={true}
                  columns={columns}
                  data={itemServicesList}
                  leadsTable={true}
                  invoiceTable={true}
                  totalAmount={totalAmount} // Pass the total amount to ItemTable
                  products={products} // Pass products to ItemTable
                  onSelectItem={handleProductChange}
                  onAddItem={handleAddProductClick} // Pass the add item handler to ItemTable
                  // Pass the handler to ItemTable
                  onRemoveItem={canDeleteLineItems ? handleRemoveProductClick : undefined}
                  allowItemDelete={canDeleteLineItems}
                  onDiscountItem={openDiscountModal}
                  onToggleTaxExempt={handleToggleProductTaxExempt}
                  restrictExistingEdits={true}
                  allowExistingQuantityEdit={true}
                />
              )}
            </div>
          </div>

          <Dialog open={discountModalOpen} onClose={closeDiscountModal} maxWidth="sm" fullWidth>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogContent>
              <div className="flex gap-3 mt-2 flex-wrap">
                <Button
                  variant={discountType === "percent" ? "contained" : "outlined"}
                  onClick={() => setDiscountType("percent")}
                >
                  Percentage %
                </Button>
                <Button
                  variant={discountType === "amount" ? "contained" : "outlined"}
                  onClick={() => setDiscountType("amount")}
                >
                  Fixed Amount $
                </Button>
              </div>
              <div className="mt-4">
                <TextField
                  fullWidth
                  label={discountType === "percent" ? "Percentage (%)" : "Amount ($)"}
                  value={discountValue}
                  onChange={(e) => {
                    let next = e.target.value;
                    next = String(next);
                    next = next.replace(/[^0-9.]/g, "");
                    const parts = next.split(".");
                    if (parts.length > 2) next = parts[0] + "." + parts.slice(1).join("");
                    if (parts[1]?.length > 2) next = parts[0] + "." + parts[1].slice(0, 2);
                    if (discountType === "percent") {
                      const n = Number(next);
                      if (Number.isFinite(n) && n > 100) next = "100";
                    }
                    setDiscountValue(next);
                  }}
                  type="number"
                  inputProps={discountType === "percent" ? { min: 0, max: 100, step: "0.01" } : { min: 0, step: "0.01" }}
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDiscountModal}>Cancel</Button>
              <Button onClick={applyDiscount} variant="contained">
                Apply Discount
              </Button>
            </DialogActions>
          </Dialog>

          <div className="flex items-center justify-between mt-2 gap-1">
            <div
              style={{ display: "" }}
              className="flex justify-between mt-10 gap-3"
            >
              <BottonCustom
                backgroundColor={"rgba(8, 226, 8, 1)"}
                width={130}
                title={"Preview"}
                height={40}
                color={"var(--sidebar-text-selected)"}
                fontSize={16}
                fontWeight={500}
                onClick={handleButtonClick} // Change onClick to handleDownload
              />
              <BottonCustom
                backgroundColor={"rgba(43, 75, 242, 1)"}
                width={130}
                title={"Print"}
                height={40}
                color={"#fff"}
                fontSize={16}
                fontWeight={500}
                onClick={handlePrint}
              />
              <BottonCustom
                backgroundColor={"rgba(255, 159, 28, 1)"}
                width={130}
                title={"Send Email"}
                height={40}
                color={"var(--sidebar-text-selected)"}
                fontSize={16}
                fontWeight={500}
                onClick={async () => {
                  setToEmail(getDefaultRecipientEmail());
                  setHostedPaymentPageUrl("");
                  setShowEmailModal(true);
                  if (canGenerateHostedPaymentLink()) {
                    await handleCreateHostedPaymentLink();
                  }
                }}
              />
              {status === "draft" && (
                <BottonCustom
                  backgroundColor={"rgba(62, 62, 62, 0.5)"}
                  width={130}
                  title={"Save"}
                  height={40}
                  color={"var(--sidebar-text-selected)"}
                  fontSize={16}
                  fontWeight={500}
                  onClick={handleDraft}
                />
              )}
              {status !== "draft" && invoiceData?.status !== "draft" && (
                <BottonCustom
                  backgroundColor={"rgba(67, 121, 238, 1)"}
                  width={130}
                  title={"Save Invoice"}
                  height={40}
                  color={"var(--sidebar-text-selected)"}
                  fontSize={16}
                  fontWeight={500}
                  onClick={handleDraft}
                />
              )}
              {invoiceData?.status === "draft" && (
                <BottonCustom
                  backgroundColor={"rgba(67, 121, 238, 1)"}
                  width={130}
                  title={"Create Invoice"}
                  height={40}
                  color={"var(--sidebar-text-selected)"}
                  fontSize={16}
                  fontWeight={500}
                  onClick={handleCreateInvoiceStatus}
                />
              )}
            </div>
            <UpdateConfirmationModal
              open={showUpdateModal}
              title="Update Invoice"
              subtitle="Are you sure you want to update"
              entityName={invoiceNo || "this invoice"}
              updateMessage="This action will update the invoice details, line items, and financial information with the current changes."
              warnings={[
                {
                  severity: "warning",
                  title: "Accounting Impact",
                  message:
                    "Editing this invoice can also change related accounting entries. Please review totals, taxes, and line items carefully before confirming.",
                },
                {
                  severity: "info",
                  title: "Customer Email",
                  message:
                    "This invoice may already have been emailed to the customer. If yes, you should send the edited invoice again so the customer has the updated copy.",
                },
              ]}
              confirmButtonLabel="Update Only"
              sendButtonLabel="Update & Send"
              onCancel={cancelUpdate}
              onUpdate={() => confirmUpdate({ sendToCustomer: false })}
              onUpdateAndSend={() => confirmUpdate({ sendToCustomer: true })}
              isLoading={isUpdating && !isSendingEmail}
              isSending={isSendingEmail}
            />
            <div>
              <div className="">
                <div className="flex justify-between mt-2  gap-x-12">
                  <span
                    className="font-semibold  text-left"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    Subtotal
                  </span>
                  <span
                    className=" text-right"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    $
                    {subtotal
                      ? subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                      : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between mt-2  gap-x-12">
                  <span
                    className="font-semibold  text-left"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    Discount
                  </span>
                  <span
                    className=" text-right"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    -$
                    {combinedDiscountAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div
                  className="flex justify-between items-center gap-x-12"
                  style={{ marginTop: 0 }}
                >
                  <span
                    className="font-semibold  text-left"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    Shipping Fee
                  </span>
                  <div className="flex flex-col items-end">
                    <LabeledInput
                      inputPlaceholder="Enter Shipping Fee"
                      inputValue={deliveryFee}
                      onInputChange={handleDeliveryFeeChange}
                      shippingLableInvoice={true}
                      inputType={"number"}
                    />
                    {showFedexRateNote && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--fieldsTitle)",
                          marginTop: 2,
                          textAlign: "right",
                        }}
                      >
                        Note : rate calculate by Fedex
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex justify-between  gap-x-12"
                  style={{ marginTop: 0 }}
                >
                  <span
                    className="font-semibold  text-left"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    Taxes
                  </span>
                  <span
                    className="text-right"
                    style={{
                      fontSize: 16,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    {isMerchantTaxExempt
                      ? "Exempt Reseller"
                      : `$${taxes ? taxes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`}
                  </span>
                </div>
                <div
                  className="flex justify-between  gap-x-12"
                  style={{ marginTop: 0 }}
                >
                  <span
                    className="font-semibold  text-left"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    Total
                  </span>
                  <span
                    className=" text-right"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--sidebar-text-primary)",
                    }}
                  >
                    $
                    {totalAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {status === "partial" && (
                  <>
                    <div
                      className="flex justify-between  gap-x-12"
                      style={{ marginTop: 0 }}
                    >
                      <span
                        className="font-semibold  text-left"
                        style={{
                          fontSize: 16,
                          color: "var(--sidebar-text-primary)",
                        }}
                      >
                        Amount Paid
                      </span>
                      <span
                        className=" text-right"
                        style={{
                          fontSize: 16,
                          color: "var(--sidebar-text-primary)",
                        }}
                      >
                        ${Number(paidAmount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div
                      className="flex justify-between  gap-x-12"
                      style={{ marginTop: 0 }}
                    >
                      <span
                        className="font-semibold  text-left"
                        style={{
                          fontSize: 16,
                          color: "var(--sidebar-text-primary)",
                        }}
                      >
                        Balance Due
                      </span>
                      <span
                        className=" text-right"
                        style={{
                          fontSize: 16,
                          color: "var(--sidebar-text-primary)",
                        }}
                      >
                        ${Number(balanceDue || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        id="hiddenSection"
        style={{
          display: "none",
          width: "800px",
          minHeight: "100vh",
          overflow: "auto",
        }}
      >
        <div className="flex justify-center  ">
          <div
            className=" "
            style={{
              backgroundColor: "var(--dashboard-card-bg)",
              borderRadius: 14,
              width: "800px",
            }}
            ref={mainDivRef}
          >
            <div className="flex justify-center mt-10">
              <Heading
                Fontweight={700}
                color={"rgba(0, 0, 0, 1)"}
                Heading={"Invoice"}
                Fontsize={30}
                mt={2}
              // Tailwind CSS classes
              />
            </div>

            <div
              style={{ margin: 20, borderRadius: 14 }}
              className="overflow-auto"
            >
              <div className="">
                <div style={{ borderRadius: 8 }} className="py-3 px-3 mb-5">
                  <div className="flex justify-start">
                    {showCompanyName ? (
                      <div
                        style={{
                          color: 'var(--navbar-text)',
                          maxWidth: '160px',
                          lineHeight: '1.2',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '16px', fontWeight: 700 }}>
                          {tenantName.split(' ').slice(0, 2).join(' ')}
                        </span>
                        {tenantName.split(' ').length > 2 && (
                          <div style={{ fontSize: '12px', fontWeight: 500 }}>
                            {tenantName.split(' ').slice(2).join(' ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <img
                        src={invoiceLogoDisplay}
                        alt="Tenant logo"
                        className="max-w-32 max-h-16 w-auto h-auto object-contain object-left"
                        data-role="invoice-logo"
                        onError={() => setLogoError(true)}
                      />
                    )}
                  </div>
                  <div className="mt-2 w-[520px]">
                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Address:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantAddress}
                        Fontsize={10}
                      />
                    </div>

                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Phone Number:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantPhone}
                        Fontsize={10}
                      />
                    </div>

                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Email:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantEmail}
                        Fontsize={10}
                      />
                    </div>

                    {tenantWebsite ? (
                    <div className="flex items-start">
                      <div className="w-[100px]">
                        <Heading
                          Fontweight={500}
                          color={"rgba(0, 0, 0, 1)"}
                          Heading={"Website:"}
                          Fontsize={10}
                        />
                      </div>
                      <Heading
                        Fontweight={500}
                        color={"rgba(0, 0, 0, 1)"}
                        Heading={tenantWebsite}
                        Fontsize={10}
                      />
                    </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pb-4 bg-[#0C79F7] ">
                <Heading
                  Fontweight={700}
                  color={"white"}
                  Heading={"Invoice Details"}
                  Fontsize={16}
                />
              </div>
              <div className="">
                <div className="flex flex-wrap justify-between  gap-y-3 mt-5">
                  <div className="pb-1 px-2">
                    <Heading
                      Fontweight={700}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={"Date"}
                      Fontsize={10}
                    />
                    <Heading
                      Fontweight={500}
                      color={"rgba(17, 17, 17, 1)"}
                      Heading={
                        issueDate ||
                        new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      }
                      Fontsize={10}
                    />
                  </div>
                  {!!invoiceDate && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Invoice Date"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={invoiceDate}
                        Fontsize={10}
                      />
                    </div>
                  )}
                  {!!dueDate && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Due Date"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={dueDate}
                        Fontsize={10}
                      />
                    </div>
                  )}
                  {!!invoiceNo && (
                    <div className="pb-1 px-2 ">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Invoice #"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={invoiceNo}
                        Fontsize={10}
                      />
                    </div>
                  )}
                  {!!poNumber && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"P.O. No."}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={poNumber}
                        Fontsize={10}
                      />
                    </div>
                  )}
                  {!!selectedPaymentTermTitle && (
                    <div className="pb-1 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Terms"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={selectedPaymentTermTitle}
                        Fontsize={10}
                      />
                    </div>
                  )}
                  {!!accountNumber && (
                    <div className="pb-2 px-2">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Account"}
                        Fontsize={10}
                      />
                      <Heading
                        Fontweight={500}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={accountNumber}
                        Fontsize={10}
                      />
                    </div>
                  )}
                </div>
                <div className="flex  items-end mt-5 ml-3 border-t mb-4 pt-4">
                  <div>
                    <Heading
                      Fontweight={700}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={"Ship To"}
                      Fontsize={10}
                    />
                    <div
                      className={`w-72`}
                      style={{
                        color: "rgba(17, 17, 17, 1)",
                        whiteSpace: "pre-wrap",
                        height: "80px",
                        overflow: "auto",
                        fontSize: 10,
                      }}
                    >
                      {shipTo}
                    </div>
                  </div>
                  <div>
                    <Heading
                      Fontweight={700}
                      color={"rgba(0, 0, 0, 1)"}
                      Heading={"Bill to"}
                      Fontsize={10}
                    />
                    <div
                      className={` w-72`}
                      style={{
                        color: "rgba(17, 17, 17, 1)",
                        whiteSpace: "pre-wrap",
                        height: "80px",
                        overflow: "auto",
                        fontSize: 10,
                      }}
                    >
                      {billTo}
                    </div>
                  </div>
                </div>
              </div>
              {combinedProducts.length > 8 ? (
                <>
                  <div className="">
                    <AgentTicketListTable
                      columns={columns2}
                      data={limitedLineItems}
                      subtotal={subtotal ? subtotal : null}
                      discountAmount={combinedDiscountAmount}
                      taxes={taxes ? taxes : null}
                      deliveryFee={deliveryFee ? deliveryFee : null}
                      invoiceData={totalAmount ? totalAmount : null}
                      status={status}
                      paidAmount={paidAmount}
                      balanceDue={balanceDue}
                      PreviewInvoiceQuantity={true}
                      invoiceBottomMore={true}
                      isMerchantTaxExempt={isMerchantTaxExempt}
                      notes={notes}
                    />
                  </div>
                </>
              ) : (
                <div className="">
                  <AgentTicketListTable
                    columns={columns2}
                    data={combinedProducts}
                    subtotal={subtotal ? subtotal : null}
                    discountAmount={combinedDiscountAmount}
                    taxes={taxes ? taxes : null}
                    deliveryFee={deliveryFee ? deliveryFee : null}
                    invoiceData={totalAmount ? totalAmount : null}
                    status={status}
                    paidAmount={paidAmount}
                    balanceDue={balanceDue}
                    PreviewInvoiceQuantity={true}
                    invoiceBottom={true}
                    isMerchantTaxExempt={isMerchantTaxExempt}
                    notes={notes}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        id="hiddenSection2"
        style={{ display: "none", width: "800px", overflow: "auto" }}
      >
        <div className="flex justify-center  ">
          <div
            className=" "
            style={{
              backgroundColor:
                "var(--sidebar-text-selected)idebar-text-selected)",
              borderRadius: 14,
              width: "800px",
            }}
            ref={invoiceRef2}
          >
            {" "}
            {/* Update the ref */}
            <div
              style={{ margin: 20, borderRadius: 14 }}
              className="overflow-auto"
            >
              <div className="mt-3">
                <AgentTicketListTable
                  columns={columns2}
                  data={limitedLineItems2}
                  subtotal={subtotal ? subtotal : null}
                  discountAmount={combinedDiscountAmount}
                  taxes={taxes ? taxes : null}
                  deliveryFee={deliveryFee ? deliveryFee : null}
                  invoiceData={totalAmount ? totalAmount : null}
                  status={status}
                  paidAmount={paidAmount}
                  balanceDue={balanceDue}
                  PreviewInvoiceQuantity={true}
                  isMerchantTaxExempt={isMerchantTaxExempt}
                  invoiceBottom={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            width: '620px',
            maxWidth: '92vw',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#333',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Send Invoice Email
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                color: '#555',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                To Email:
              </label>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="Enter recipient email"
                style={{ backgroundColor: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                color: '#555',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                CC:
              </label>
              <div style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5',
                padding: '8px',
                minHeight: '48px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '4px',
                cursor: 'text'
              }}
                onClick={() => document.getElementById('cc-input')?.focus()}>
                {ccEmails.map((email, index) => (
                  <Chip
                    key={index}
                    label={email}
                    onDelete={() => handleRemoveCcEmail(email)}
                    deleteIcon={<Close style={{ fontSize: '16px' }} />}
                    style={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      fontSize: '12px',
                      height: '28px'
                    }}
                  />
                ))}
                <input
                  id="cc-input"
                  type="text"
                  value={ccInputValue}
                  onChange={(e) => setCcInputValue(e.target.value)}
                  onKeyDown={handleCcInputKeyDown}
                  onBlur={() => {
                    if (ccInputValue.trim()) {
                      handleAddCcEmail(ccInputValue);
                    }
                  }}
                  placeholder={ccEmails.length === 0 ? "Enter CC email addresses..." : ""}
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    minWidth: '120px',
                    fontSize: '14px',
                    backgroundColor: 'transparent',
                    padding: '4px'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                color: '#555',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Tracking Number:
              </label>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Enter tracking number (optional)"
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </div>

            {canGenerateHostedPaymentLink() && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: '#555',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Hosted Payment Link:
                </label>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={hostedPaymentPageUrl}
                  placeholder="Click Generate Link to create hosted payment URL"
                  InputProps={{ readOnly: true }}
                  style={{ backgroundColor: '#f5f5f5' }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <Button
                    onClick={handleCreateHostedPaymentLink}
                    variant="contained"
                    disabled={isCreatingHostedPaymentLink}
                    style={{
                      backgroundColor: '#2b4bf2',
                      color: 'white',
                      opacity: isCreatingHostedPaymentLink ? 0.7 : 1,
                    }}
                  >
                    {isCreatingHostedPaymentLink ? 'Generating...' : 'Generate Link'}
                  </Button>
                  {hostedPaymentPageUrl && (
                    <Button
                      onClick={() => window.open(hostedPaymentPageUrl, '_blank', 'noopener,noreferrer')}
                      variant="outlined"
                    >
                      Open Link
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                color: '#555',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Email Content:
              </label>
              <div style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                minHeight: '120px'
              }}>
                {emailContentInitialized && (
                  <RichEditor
                    key={showEmailModal ? 'email-editor-open' : 'email-editor-closed'}
                    initialContent={emailContent}
                    onGetContent={(html) => setEmailContent(html)}
                  />
                )}
              </div>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: '#f9fafb',
                marginTop: 10,
                padding: 12,
                maxHeight: 220,
                overflowY: 'auto'
              }}
                dangerouslySetInnerHTML={{ __html: buildEmailSignature(logoSrc) }} />
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <Button
                onClick={closeEmailModal}
                variant="outlined"
                style={{
                  borderColor: '#6c757d',
                  color: '#6c757d'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmailSubmit}
                variant="contained"
                disabled={isSendingEmail}
                style={{
                  backgroundColor: '#0C79F7',
                  color: 'white',
                  opacity: isSendingEmail ? 0.7 : 1,
                }}
              >
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditInvoice;
