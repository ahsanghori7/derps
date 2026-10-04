import { useEffect, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  postRequestWithFormData,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomDatePicker from "../../Components/CustomDatePicker";
import dayjs from "dayjs";
import { FiEdit2, FiPlusSquare } from "react-icons/fi";
import close from "../../assets/close.png";
import logo4k from "../../assets/logo4k.png";
import locationInvoice from "../../assets/locationInvoice.png";
import contactInvoice from "../../assets/contactInvoice.png";
import mailInvoice from "../../assets/mailInvoice.png";
import website from "../../assets/website.png";
import ItemTable from "../../Components/ItemTable";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import SearchInput from "../../Components/SearchInput";
import Compressor from "compressorjs";
import styled from "styled-components";
import { Button, Skeleton } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import UploadFile from "../../Components/UploadFile";
import { getTenantIdFromSession, getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";
import { applyAssignmentMetadataIfNeeded } from "../../Utils/purchaseOrderHelpers";

const parseInvoiceNumberFromApi = (response) => {
  const data = response?.data ?? response;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (typeof data === "number" && !Number.isNaN(data)) return String(data);
  const candidates = [
    data?.invoiceNumber,
    data?.invoiceNo,
    data?.number,
    response?.invoiceNumber,
    response?.invoiceNo,
  ];
  for (const value of candidates) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
};

const HeaderWrapper = styled("div")({
  position: "relative",
  display: "flex",
  alignItems: "center",
  marginBottom: "10px",
  flexWrap: "wrap",
  gap: 10,
  cursor: "pointer",
});
const HeaderWrapper2 = styled("div")({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "10px",
  flexWrap: "wrap",
  gap: 10,
  cursor: "pointer",
  "@media (max-width: 768px)": {
    flexDirection: "column",
    alignItems: "flex-start",
  },
});

const CreateInvoice = () => {
  const userData = useSelector((state) => state.userData.userDetails);
  const tenantId = getTenantIdFromSession(userData);
  const tenantLogo = useSelector((state) => state.auth.tenantLogo);
  // Get tenant logo from Redux store, fallback to default logo
  const logoSrc = tenantLogo || logo4k;
  const tenantName = userData?.tenant?.name || "Company";
  const tenantPhone = getTenantPhone(userData);
  const tenantEmail = getTenantEmail(userData);
  const tenantWebsite = getTenantWebsite(userData);
  const tenantAddress = getTenantAddress(userData);
  const [logoError, setLogoError] = useState(false);
  const showCompanyName = !tenantLogo || logoError;

  useEffect(() => {
    setLogoError(false);
  }, [tenantLogo]);

  const getErrorMessage = (error) => {
    const data = error?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    return (
      data?.message ||
      data?.error ||
      error?.message ||
      "Something went wrong"
    );
  };

  const accessToken = useSelector((state) => state.auth.accessToken);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // const userData = useSelector((state) => state.userData.userDetails);
  const mainDivRef = useRef(); // Create a reference for the main div
  const invoiceRef2 = useRef(); // Create a reference for the main div

  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceNoLoading, setInvoiceNoLoading] = useState(true);
  const [isInvoiceNoEditable, setIsInvoiceNoEditable] = useState(false);
  const [accountNumber, setAccountNumber] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [totalAmount, setTotalAmount] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [shipTo, setShipTo] = useState("")
  const [billTo, setBillTo] = useState("")
  const [loading, setLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
  const [isPlacementInvoice, setIsPlacementInvoice] = useState(false);
  const [products, setProducts] = useState([{ inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 1, rate: 0, amount: 0 }]);
  const [itemServicesList, setItemServicesList] = useState([]);
  const [agentList, setAgentList] = useState([]);
  const [selectedAgentType, setSelectedAgentType] = useState(""); // agent id
  const [selectedAgentName, setSelectedAgentName] = useState(""); // agent display name for SearchInput
  const [selectedMerchantType, setSelectedMerchantType] = useState(""); // Step 1: Define state
  const [selectedMerchantName, setSelectedMerchantName] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomerList, setFilteredCustomerList] = useState([]); // New state for filtered customers
  const [combinedProducts, setCombinedProducts] = useState([]); // New state for combined products
  const [subtotal, setSubtotal] = useState(0); // New state for subtotal
  const [taxes, setTaxes] = useState(0); // New state for taxes
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(""); // State to hold selected payment term
  const [isMerchantTaxExempt, setIsMerchantTaxExempt] = useState(false); // New state for merchant tax exemption
  const [notes, setNotes] = useState(""); // State for notes
  const [draftLoader, setDraftLoader] = useState(false); // State for notes
  const [createLoader, setCreateLoader] = useState(false); // State for create button
  const [uploadedFile, setUploadedFile] = useState(null);
  // const [showEmailModal, setShowEmailModal] = useState(false);
  // const [emailCC, setEmailCC] = useState("");
  // const [emailContent, setEmailContent] = useState("");

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountRowIndex, setDiscountRowIndex] = useState(null);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [discountTarget, setDiscountTarget] = useState("line");

  const [invoiceDiscountType, setInvoiceDiscountType] = useState(null);
  const [invoiceDiscount, setInvoiceDiscount] = useState(null);
  const [invoiceDiscountAmount, setInvoiceDiscountAmount] = useState(0);
  const [itemDiscountAmount, setItemDiscountAmount] = useState(0);
  const combinedDiscountAmount = (Number(itemDiscountAmount) || 0) + (Number(invoiceDiscountAmount) || 0);

  const limitedLineItems = combinedProducts.slice(0, 11);
  const limitedLineItems2 = combinedProducts.slice(11);

  const data = [
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
      value: "cash-on-delivery",
    },
    { title: "EOM (End Of Month)", description: "End Of Month", value: "eom" },
    {
      title: "Payment in Advance",
      description: "Payment in Advance",
      value: "advance-payment",
    },
  ];

  const handleGoBack = () => {
    navigate(-1);
  };

  const fetchData = async () => {
    try {
      const shouldShowInitialLoader = !!incomingCustomerId;
      if (shouldShowInitialLoader) setLoading(true);

      const itemsRes = await getRequestWithOutBody(
        `${baseURl}item-services`,
        accessToken,
      );
      setItemServicesList(itemsRes?.data);

      const agentsRes = await getRequestWithOutBody(`${baseURl}user?roleTitle=agent`, accessToken);
      setAgentList(agentsRes?.data?.results);

      const customersRes = await getRequestWithOutBody(
        `${baseURl}customer`,
        accessToken,
      );
      setCustomerList(customersRes?.data?.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      const shouldShowInitialLoader = !!incomingCustomerId;
      if (shouldShowInitialLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const fetchInvoiceNumber = async () => {
      if (!tenantId || !accessToken) {
        setInvoiceNoLoading(false);
        return;
      }
      setInvoiceNoLoading(true);
      try {
        const invoiceNumberRes = await getRequestWithOutBody(
          `${baseURl}invoice/invoiceNumber?tenantId=${encodeURIComponent(tenantId)}`,
          accessToken,
        );
        const generatedInvoiceNo = parseInvoiceNumberFromApi(invoiceNumberRes);
        if (generatedInvoiceNo) setInvoiceNo(generatedInvoiceNo);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setInvoiceNoLoading(false);
      }
    };
    fetchInvoiceNumber();
  }, [tenantId, accessToken]);

  useEffect(() => {
    const getCustomerAgentId = (c) =>
      c?.assigneeId ?? c?.agentId ?? c?.agent?.id;
    if (selectedAgentType) {
      const agentCustomers = customerList.filter(
        (customer) =>
          String(getCustomerAgentId(customer)) === String(selectedAgentType),
      );
      setFilteredCustomerList(
        agentCustomers.length > 0 ? agentCustomers : customerList,
      );
    } else {
      // No agent selected: show all merchants
      setFilteredCustomerList(customerList);
    }
  }, [customerList, selectedAgentType]);

  // Resolve incoming customerId from navigation state or URL (?customerId=)
  const incomingCustomerId = (() => {
    const fromState =
      location?.state &&
      (location.state.customerId ?? location.state?.customer?.id);
    const fromQuery = searchParams.get("customerId");
    // prefer state first, then query; normalize to number when possible
    const raw = fromState ?? fromQuery;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  })();


  // When customers are loaded, preselect and prefill if incomingCustomerId present
  useEffect(() => {
    if (
      !incomingCustomerId ||
      !Array.isArray(customerList) ||
      customerList.length === 0
    )
      return;
    const match = customerList.find(
      (c) => String(c?.id) === String(incomingCustomerId),
    );
    if (!match) return;
    setSelectedMerchantType(match.id);
    setSelectedMerchantName(match?.dbaName || match?.legalBusinessName || "");
    const street = match?.dbaAddress || match?.legalAddress;
    const city = match?.businessCity || match?.legalCity;
    const state = match?.businessState || match?.state || match?.legalState;
    const zip = match?.businessZipCode || match?.legalZipCode;
    const fullAddress =
      `${match?.dbaName || match?.legalBusinessName || ""}\n${[street, city, state, zip].filter(Boolean).join(", ")}`.trim();
    setShipTo(fullAddress);
    setBillTo(fullAddress);
    const resolvedAgentId = match?.agent?.id ?? match?.assigneeId;
    if (resolvedAgentId) setSelectedAgentType(resolvedAgentId);
    const resolvedAgentName = match?.agent?.name;
    if (resolvedAgentName) setSelectedAgentName(resolvedAgentName);
    setIsMerchantTaxExempt(!!match?.taxExempt);
  }, [incomingCustomerId, customerList]);

  // When agent list arrives or selectedAgentType changes, ensure selectedAgentName is reflected
  useEffect(() => {
    if (!selectedAgentType || !Array.isArray(agentList) || agentList.length === 0) return;
    if (selectedAgentName) return; // already set from customer.agent
    const a = agentList.find(a => String(a?.id) === String(selectedAgentType));
    if (a?.name) setSelectedAgentName(a.name);
  }, [selectedAgentType, agentList]);
  const handleInvoiceNoChange = (e) => {
    setInvoiceNo(e.target.value);
  };
  const handleAccountNumberChange = (e) => {
    setAccountNumber(e.target.value);
  };
  const handlePoNumberChange = (e) => {
    setPoNumber(e.target.value);
  };
  const handleAddProductClick = () => {
    setProducts([...products, { inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveProductClick = (index) => {
    const newProducts = [...products];
    newProducts.splice(index, 1);
    if (newProducts.length === 0) {
      newProducts.push({ inventoryItemId: 0, barcode: "", serialNo: "", serialNos: [], quantity: 1, rate: 0, amount: 0 });
    }
    setProducts(newProducts);
  };

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

  const applyDiscountToRow = () => {
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
      discountType === "percent"
        ? baseAmount * (1 - val / 100)
        : baseAmount - val;

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
        serialNo: product?.serialNo || "",
      };
    });
    setCombinedProducts(updatedCombinedProducts);
    closeDiscountModal();
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    if (field === "inventoryItemId") {
      const selectedItem = itemServicesList.find(
        (item) => String(item?.id) === String(value) || item?.name === value
      );
      if (!selectedItem) {
        setProducts(newProducts);
        return;
      }

      const availableSerials = Array.isArray(selectedItem?.serials) ? selectedItem.serials : [];

      const rawQty = Math.max(1, Number(newProducts[index]?.quantity) || 1);
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
      const rate = Math.max(0, Number(selectedItem?.sellingPrice) || 0);

      newProducts[index] = {
        ...newProducts[index],
        inventoryItemId: selectedItem.id,
        barcode: selectedItem?.barcode || newProducts[index]?.barcode || "",
        serialNos,
        serialNo: firstSerial || newProducts[index]?.serialNo || "",
        quantity,
        rate,
        amount: (() => {
          const base = quantity * rate;
          const dt = newProducts[index]?.discountType;
          const d = Number(newProducts[index]?.discount) || 0;
          const discounted =
            dt === "percent" ? base * (1 - d / 100) : dt === "amount" ? base - d : base;
          return Math.max(0, Number(discounted.toFixed(2)));
        })(),
        taxExempt: selectedItem.taxExempt,
        accountId: selectedItem.accountId,
      };
    } else if (field === "barcode") {
      const scanned = String(value || "").trim();
      newProducts[index] = {
        ...newProducts[index],
        barcode: scanned,
      };

      if (scanned) {
        const matchedItem = itemServicesList.find(
          (item) => String(item?.barcode || "").trim() === scanned
        );

        if (matchedItem) {
          const availableSerials = Array.isArray(matchedItem?.serials) ? matchedItem.serials : [];
          const rawQty = Math.max(1, Number(newProducts[index]?.quantity) || 1);
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
          const rate = Math.max(0, Number(matchedItem?.sellingPrice) || 0);
          newProducts[index] = {
            ...newProducts[index],
            inventoryItemId: matchedItem.id,
            barcode: String(matchedItem?.barcode || scanned),
            serialNos,
            serialNo: firstSerial || newProducts[index]?.serialNo || "",
            quantity,
            rate,
            amount: (() => {
              const base = quantity * rate;
              const dt = newProducts[index]?.discountType;
              const d = Number(newProducts[index]?.discount) || 0;
              const discounted =
                dt === "percent" ? base * (1 - d / 100) : dt === "amount" ? base - d : base;
              return Math.max(0, Number(discounted.toFixed(2)));
            })(),
            taxExempt: matchedItem.taxExempt,
            accountId: matchedItem.accountId,
          };
        }
      }
    } else if (field === "serialNos") {
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
          toast.error("This serial number is already selected");
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
      if (field === 'quantity') {
        const selectedItem = itemServicesList.find(
          (item) => String(item?.id) === String(newProducts[index]?.inventoryItemId)
        );
        const maxAllowedQty = Array.isArray(selectedItem?.serials) && selectedItem.serials.length > 0
          ? selectedItem.serials.length
          : null;
        const rawQty = Math.max(1, Number(value) || 1);
        const clampedQty = Number.isFinite(maxAllowedQty) ? Math.min(rawQty, maxAllowedQty) : rawQty;
        if (Number.isFinite(maxAllowedQty) && rawQty > clampedQty) {
          toast.error(`Quantity can't be more than ${maxAllowedQty} for this item`);
        }
        newProducts[index][field] = clampedQty;

        const availableSerials = Array.isArray(selectedItem?.serials) ? selectedItem.serials : [];
        const current = Array.isArray(newProducts[index]?.serialNos) ? [...newProducts[index].serialNos] : [];
        const nextSerialNos = current.slice(0, clampedQty);
        while (nextSerialNos.length < clampedQty) {
          const auto = String(availableSerials?.[nextSerialNos.length]?.serialNumber || '').trim();
          nextSerialNos.push(auto || '');
        }
        newProducts[index].serialNos = nextSerialNos;
        newProducts[index].serialNo = nextSerialNos?.[0] || newProducts[index]?.serialNo || "";
      } else {
        newProducts[index][field] = value;
      }
      if (field === "quantity" || field === "rate") {
        const qty = Math.max(1, Number(newProducts[index]?.quantity) || 1);
        const rate = Math.max(0, Number(newProducts[index]?.rate) || 0);
        const base = qty * rate;
        const dt = newProducts[index]?.discountType;
        const d = Number(newProducts[index]?.discount) || 0;
        const discounted =
          dt === "percent" ? base * (1 - d / 100) : dt === "amount" ? base - d : base;
        newProducts[index].amount = Math.max(0, Number(discounted.toFixed(2)));
      }
    }
    setProducts(newProducts);

    // Update combinedProducts with selected item details
    const updatedCombinedProducts = newProducts.map((product) => {
      const itemDetails = itemServicesList.find(
        (item) => item.id === product.inventoryItemId,
      );
      return {
        ...product,
        name: itemDetails ? itemDetails.name : "",
        description: itemDetails ? itemDetails.description : "",
        barcode: itemDetails ? itemDetails.barcode : "",
        serialNo: product?.serialNo || "",
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

    const updatedCombinedProducts = newProducts.map((product) => {
      const itemDetails = itemServicesList.find(
        (item) => item.id === product.inventoryItemId,
      );
      return {
        ...product,
        name: itemDetails ? itemDetails.name : "",
        description: itemDetails ? itemDetails.description : "",
        barcode: itemDetails ? itemDetails.barcode : "",
        serialNo: product?.serialNo || "",
      };
    });
    setCombinedProducts(updatedCombinedProducts);
  };

  const handleCheckboxChange = () => {
    // Add this function
    setIsChecked(!isChecked);
  };
  const handleTotalAmountChange = (e) => {
    setTotalAmount(e.target.value);
  };
  const handleDeliveryFeeChange = (e) => {
    setDeliveryFee(parseFloat(e.target.value)); // Parse the input value to a float
  };
  const handleShipToChange = (e) => {
    setShipTo(e.target.value);
  };
  const handleBillToChange = (e) => {
    setBillTo(e.target.value);
  };
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
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

  const handleAgentChange = (value) => {
    const selectedAgent = (agentList || []).find(
      (agent) =>
        agent?.name === value ||
        agent?.username === value ||
        agent?.fullName === value ||
        agent?.email === value ||
        String(agent?.id || "") === String(value),
    );
    setSelectedAgentType(selectedAgent ? selectedAgent.id : "");
    setSelectedAgentName(
      selectedAgent
        ? selectedAgent.name ||
        selectedAgent.username ||
        selectedAgent.fullName ||
        selectedAgent.email ||
        ""
        : "",
    );
    if (selectedAgent) {
      const getCustomerAgentId = (c) =>
        c?.assigneeId ?? c?.agentId ?? c?.agent?.id;
      const agentCustomers = customerList.filter(
        (customer) =>
          String(getCustomerAgentId(customer)) === String(selectedAgent.id),
      );
      setFilteredCustomerList(
        agentCustomers.length > 0 ? agentCustomers : customerList,
      );
      setIsMerchantTaxExempt(selectedAgent.taxExempt); // Set merchant tax exemption status based on agent
    } else {
      setFilteredCustomerList(customerList);
    }
  };

  //   const handleSendEmailSubmit = async () => {
  //     try {
  //       const pdf = await buildInvoicePdf();

  //       const blob = pdf.output("blob");
  //       const sanitize = (s) =>
  //         (s || "")
  //           .toString()
  //           .replace(/[\\/:*?"<>|]+/g, "")
  //           .trim();
  //       const customerNameLine = (billTo || "").split("\n")[0] || "Invoice";
  //       const fileName = `${sanitize(customerNameLine)}-${sanitize(invoiceNo || "INV")}.pdf`;

  //       const selectedMerchant = customerList.find(
  //         (c) => c.id === selectedMerchantType,
  //       );
  //       const merchantName =
  //         selectedMerchant?.dbaName ||
  //         selectedMerchant?.legalBusinessName ||
  //         customerNameLine;
  //       const email =
  //         selectedMerchant?.email || selectedMerchant?.ownerEmail || "";

  //       if (!email) {
  //         toast.error("Selected merchant has no email on file");
  //         return false;
  //       }

  //       // Create API payload with HTML content and invoiceId
  //       const emailPayload = {
  //         html: emailContent || "<p>Hello — your un-paid invoice is attached.</p>",
  //         invoiceId: invoiceNo,
  //         invoiceDate: invoiceDate || "",
  //         merchantName: merchantName || "",
  //         totalAmount: String(totalAmount ?? ""),
  //         dueDate: dueDate || "",
  //         email: email
  //       };

  //       // Add CC only if provided
  //       if (emailCC && emailCC.trim()) {
  //         emailPayload.cc = emailCC;
  //       }

  //       const form = new FormData();
  //       form.append("data", JSON.stringify(emailPayload));
  //       form.append(
  //         "file",
  //         new File([blob], fileName, { type: "application/pdf" }),
  //       );

  //       for (let [key, value] of form.entries()) {
  //       }

  //       const res = await postRequestWithFormData(
  //         `${baseURl}invoice/send`,
  //         accessToken,
  //         form,
  //       );
  //       toast.success(res?.message || "Invoice emailed successfully");
  //       setShowEmailModal(false); // Close modal after sending
  //       return true;
  //     } catch (e) {
  //       toast.error(e?.message || "Failed to email invoice");
  //       return false;
  //     }
  //   };

  //   const closeEmailModal = () => {
  //   setShowEmailModal(false);
  //   setEmailCC("");
  //   setEmailContent("");
  // };

  const handleMerchantChange = (value) => {
    const selected = customerList.find(
      (c) => c.dbaName === value || c.legalBusinessName === value,
    );
    setSelectedMerchantType(selected ? selected.id : "");
    setSelectedMerchantName(
      selected ? selected.dbaName || selected.legalBusinessName || "" : "",
    );
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
      month: "2-digit",
      day: "2-digit",
    });

    if (issueDate && new Date(formattedDate) < new Date(issueDate)) {
      toast.error("Due date cannot be before issue date.");
      return;
    }

    setDueDate(formattedDate);
  };

  // Calculate total amount whenever products, deliveryFee, or isChecked change
  useEffect(() => {
    const baseSubtotal = products.reduce((sum, product) => {
      const qty = Math.max(1, Number(product?.quantity) || 1);
      const rate = Math.max(0, Number(product?.rate) || 0);
      return sum + qty * rate;
    }, 0);

    const calculatedSubtotal = products.reduce(
      (sum, product) => sum + product.amount,
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

    // Ensure deliveryFee is a valid number, default to 0 if not
    const deliveryFeeValue = parseFloat(deliveryFee) || 0;

    const discountedSubtotal = Math.max(0, sub - cappedInvoiceDiscountAmount);
    const calculatedSubtotalWithDeliveryFee =
      discountedSubtotal + deliveryFeeValue;

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

      // Reduce taxable base proportionally by invoice-level discount
      const ratio = sub > 0 ? cappedInvoiceDiscountAmount / sub : 0;
      const taxableAfterDiscount = Math.max(0, taxableSubtotal * (1 - ratio));
      calculatedTaxes = taxableAfterDiscount * 0.1025;
    }
    setTaxes(calculatedTaxes);

    const calculatedTotalAmount =
      calculatedSubtotalWithDeliveryFee + calculatedTaxes;
    setTotalAmount(parseFloat(calculatedTotalAmount.toFixed(2))); // Ensure the total amount is formatted to 2 decimal places
  }, [products, deliveryFee, isChecked, isMerchantTaxExempt, itemServicesList, invoiceDiscountType, invoiceDiscount]);

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

  const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const resolveImageToDataURL = async (src) => {
    try {
      if (!src || typeof src !== "string") return src;
      if (src.startsWith("data:")) return src;

      const candidates = [src];
      if (src.startsWith("http")) {
        try {
          const urlObj = new URL(src);
          candidates.push(`${urlObj.pathname}${urlObj.search || ""}`);
          candidates.push(urlObj.pathname);
        } catch (e) {
          // ignore malformed URL
        }
      }

      const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));
      for (const candidate of uniqueCandidates) {
        const canAddBust =
          candidate.startsWith("http") || candidate.startsWith("/files/");
        const separator = candidate.includes("?") ? "&" : "?";
        const requestUrl = canAddBust
          ? `${candidate}${separator}cors_bust=${Date.now()}`
          : candidate;

        try {
          const res = await fetch(requestUrl, {
            mode: candidate.startsWith("http") ? "cors" : "same-origin",
            cache: "no-store",
          });
          if (!res.ok) continue;

          const contentType = String(
            res.headers.get("content-type") || "",
          ).toLowerCase();
          if (contentType && !contentType.startsWith("image/")) continue;

          const blob = await res.blob();
          if (!String(blob.type || "").toLowerCase().startsWith("image/")) {
            continue;
          }
          return await blobToDataURL(blob);
        } catch (e) {
          // try next candidate
        }
      }
      return src;
    } catch (e) {
      return src;
    }
  };

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

  // Build the PDF once; reuse for Download/Print
  const buildInvoicePdf = async () => {
    const element = mainDivRef.current;
    const hiddenElement = document.getElementById("hiddenSection");
    const hiddenElement2 = document.getElementById("hiddenSection2");
    const needsSecondPage = combinedProducts.length > 7;

    const prev1 = hiddenElement?.style.display ?? "";
    const prev2 = hiddenElement2?.style.display ?? "";

    const logoImgs = Array.from(
      document.querySelectorAll('img[data-role="invoice-logo"]'),
    );
    const prevLogoSrcs = logoImgs.map((img) => img.getAttribute("src") || "");

    try {
      const fallbackLogo = await resolveImageToDataURL(logo4k);
      hiddenElement.style.display = "block";

      const allImgs = Array.from(hiddenElement.querySelectorAll("img"));
      const prevAllSrcs = allImgs.map((img) => img.getAttribute("src") || "");

      await Promise.all(
        allImgs.map(async (img, idx) => {
          const src = prevAllSrcs[idx];
          if (src && !src.startsWith("data:")) {
            const resolved = await resolveImageToDataURL(src);
            if (resolved && resolved !== src) {
              img.setAttribute("src", resolved);
            } else if (img.dataset.role === "invoice-logo" && fallbackLogo) {
              img.setAttribute("src", fallbackLogo);
            }
          }
        })
      );

      await sleep(50);

      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(hiddenElement, {
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

        const allImgs2 = Array.from(hiddenElement2.querySelectorAll("img"));
        const prevAllSrcs2 = allImgs2.map((img) => img.getAttribute("src") || "");
        await Promise.all(
          allImgs2.map(async (img, idx) => {
            const src = prevAllSrcs2[idx];
            if (src && !src.startsWith("data:")) {
              const resolved = await resolveImageToDataURL(src);
              if (resolved && resolved !== src) {
                img.setAttribute("src", resolved);
              } else if (img.dataset.role === "invoice-logo" && fallbackLogo) {
                img.setAttribute("src", fallbackLogo);
              }
            }
          })
        );

        await sleep(100);

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
        pdf.addImage(img2, "JPEG", 0, 0, imgWidth, (canvas2.height * imgWidth) / canvas2.width);

        allImgs2.forEach((img, idx) => img.setAttribute("src", prevAllSrcs2[idx] || ""));
      }

      return pdf;
    } finally {
      logoImgs.forEach((img, idx) => {
        img.setAttribute("src", prevLogoSrcs[idx] || "");
      });
      if (hiddenElement2) hiddenElement2.style.display = prev2 || "none";
      if (hiddenElement) hiddenElement.style.display = prev1 || "none";
    }
  };
  const handleDownload = async () => {
    try {
      const pdf = await buildInvoicePdf();

      const sanitize = (s) =>
        (s || "")
          .toString()
          .replace(/[\\/:*?"<>|]+/g, "")
          .trim();
      const customerNameLine = (billTo || "").split("\n")[0] || "Invoice";
      const fileName = `${sanitize(customerNameLine)}-${sanitize(invoiceNo || "INV")}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handlePrint = async () => {
    try {
      const pdf = await buildInvoicePdf();

      // Ensure the PDF itself triggers print when opened
      if (pdf.autoPrint) pdf.autoPrint();

      // Open PDF in a new tab
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);

      const printWindow = window.open(url, "_blank");

      if (printWindow) {
        // wait a moment for the PDF to load before triggering print
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleDraft = async () => {
    const roleTitle = String(userData?.roleTitle || "").toLowerCase();
    if ((roleTitle === "admin" || roleTitle === "human resource") && !selectedAgentType) {
      toast.error("Agent is required");
      return;
    }
    setDraftLoader(true);
    const sub = Number(subtotal) || 0;
    const disc = Number(invoiceDiscountAmount) || 0;
    const deliveryFeeValue = parseFloat(deliveryFee) || 0;

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

      const ratio = sub > 0 ? disc / sub : 0;
      const taxableAfterDiscount = Math.max(0, taxableSubtotal * (1 - ratio));
      calculatedTaxes = taxableAfterDiscount * 0.1025;
    }

    // Calculate total amount including taxes (after invoice discount)
    const totalWithTax = Math.max(0, sub - disc) + deliveryFeeValue + calculatedTaxes;

    setLoading(true);

    try {
      const uploadedFiles = await uploadInvoiceFiles();
      const apiData = {
        status: "draft",
      };

      const filteredProducts = products.filter(
        (product) => product.amount !== 0,
      );
      const lineItemsWithAccounts = filteredProducts.map((p) => ({
        inventoryItemId: p.inventoryItemId,
        accountId:
          p.accountId ??
          itemServicesList.find((item) => item.id === p.inventoryItemId)
            ?.accountId,
        quantity: Number(p.quantity) || 0,
        rate: Number(p.rate) || 0,
        serialNo: p?.serialNo ? String(p.serialNo) : undefined,
        serialNumbers: Array.isArray(p?.serialNos)
          ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
          : undefined,
        itemSerialIds: (() => {
          const item = itemServicesList.find((i) => i.id === p.inventoryItemId);
          const serials = Array.isArray(item?.serials) ? item.serials : [];
          const wanted = Array.isArray(p?.serialNos)
            ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
            : [];
          const ids = wanted
            .map((sn) => serials.find((s) => String(s?.serialNumber || '').trim() === sn)?.id)
            .filter((id) => Number(id) > 0);
          return ids.length > 0 ? ids : undefined;
        })(),
        amount: Number(p.amount) || 0,
        taxExempt: !!p.taxExempt,
        discountType: p.discountType || undefined,
        discount:
          p.discount == null || p.discount === ""
            ? undefined
            : Number(p.discount),
      }));
      if (lineItemsWithAccounts.length > 0)
        apiData.lineItems = lineItemsWithAccounts;
      if (billTo) apiData.billingAddress = billTo;
      if (shipTo) apiData.shippingAddress = shipTo;
      if (issueDate) apiData.issueDate = issueDate;
      if (dueDate) apiData.dueDate = dueDate;
      if (deliveryFee) apiData.deliveryFee = deliveryFee;
      if (totalAmount)
        apiData.totalAmount = parseFloat(totalWithTax.toFixed(2));
      if (subtotal) apiData.subTotal = parseFloat(subtotal.toFixed(2));
      apiData.tax = parseFloat(calculatedTaxes.toFixed(2));
      if (selectedMerchantType) apiData.merchantId = selectedMerchantType;
      if (selectedAgentType) apiData.agentId = selectedAgentType;
      if (!selectedAgentType && roleTitle !== "admin") apiData.agentId = userData.id;
      if (invoiceNo) apiData.invoiceNo = invoiceNo;
      if (invoiceDate) apiData.invoiceDate = invoiceDate;

      // Conditionally add accountNumber, poNumber, and paymentTerms
      if (accountNumber) apiData.accountNumber = accountNumber;
      if (poNumber) apiData.poNumber = poNumber;
      if (selectedPaymentTerm) apiData.paymentTerms = selectedPaymentTerm;
      if (notes) apiData.notes = notes;
      if (uploadedFiles.length > 0) apiData.files = uploadedFiles;

      if (invoiceDiscountType) apiData.discountType = invoiceDiscountType;
      if (invoiceDiscount != null && invoiceDiscount !== "") apiData.discount = Number(invoiceDiscount);
      apiData.isPlacementInvoice = isPlacementInvoice;

      const result = await postRequestWithBodyAndToken(
        `${baseURl}invoice`,
        accessToken,
        applyAssignmentMetadataIfNeeded(apiData, lineItemsWithAccounts, userData),
      );
      toast.success(result.message);
      // Attempt to email the invoice (non-blocking to success of creation)
      await sendInvoiceEmail();
      navigate(-1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setDraftLoader(false);
    }
  };

  const handleLogin = async () => {
    const roleTitle = String(userData?.roleTitle || "").toLowerCase();
    if ((roleTitle === "admin" || roleTitle === "human resource") && !selectedAgentType) {
      toast.error("Agent is required");
      return;
    }

    if (!selectedMerchantType) {
      toast.error("Merchant is required");
      return;
    }

    if (!issueDate) {
      toast.error("Issue date is required");
      return;
    }

    if (!selectedPaymentTerm) {
      toast.error("Payment term is required");
      return;
    }

    if (!Array.isArray(products) || products.length === 0) {
      toast.error("At least one item is required");
      return;
    }

    const firstInvalidRowIndex = products.findIndex((p) => {
      if (!p) return true;
      if (Number(p?.inventoryItemId) <= 0) return true;
      const qty = Number(p?.quantity);
      if (!Number.isFinite(qty) || qty < 1) return true;
      const rate = Number(p?.rate);
      if (!Number.isFinite(rate) || rate < 0) return true;

      const item = itemServicesList.find((i) => i.id === p.inventoryItemId);
      const needsSerials = Array.isArray(item?.serials) && item.serials.length > 0;
      if (needsSerials) {
        const wantedQty = Math.max(1, Number(p?.quantity) || 1);
        const serials = Array.isArray(p?.serialNos)
          ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
          : [];
        if (serials.length < wantedQty) return true;
      }

      return false;
    });

    if (firstInvalidRowIndex !== -1) {
      const row = firstInvalidRowIndex + 1;
      const p = products[firstInvalidRowIndex];
      if (Number(p?.inventoryItemId) <= 0) {
        toast.error(`Item is required in row ${row}`);
        return;
      }
      const qty = Number(p?.quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error(`Quantity must be at least 1 in row ${row}`);
        return;
      }
      const rate = Number(p?.rate);
      if (!Number.isFinite(rate) || rate < 0) {
        toast.error(`Unit price must be a valid number in row ${row}`);
        return;
      }
      toast.error(`Please complete required fields in row ${row}`);
      return;
    }
    setCreateLoader(true);
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
      const apiData = {
        status: "un-paid",
        lineItems: products.map((p) => ({
          inventoryItemId: p.inventoryItemId,
          quantity: Number(p.quantity) || 0,
          rate: Number(p.rate) || 0,
          amount: Number(p.amount) || 0,
          serialNo: p?.serialNo ? String(p.serialNo) : undefined,
          serialNumbers: Array.isArray(p?.serialNos)
            ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
            : undefined,
          itemSerialIds: (() => {
            const item = itemServicesList.find((i) => i.id === p.inventoryItemId);
            const serials = Array.isArray(item?.serials) ? item.serials : [];
            const wanted = Array.isArray(p?.serialNos)
              ? p.serialNos.map((s) => String(s || '').trim()).filter(Boolean)
              : [];
            const ids = wanted
              .map((sn) => serials.find((s) => String(s?.serialNumber || '').trim() === sn)?.id)
              .filter((id) => Number(id) > 0);
            return ids.length > 0 ? ids : undefined;
          })(),
          taxExempt: !!p.taxExempt,
          discountType: p.discountType || undefined,
          discount:
            p.discount == null || p.discount === ""
              ? undefined
              : Number(p.discount),
          accountId: p.accountId ?? itemServicesList.find((item) => item.id === p.inventoryItemId)?.accountId,
        })),
      };
      if (invoiceDiscountType) apiData.discountType = invoiceDiscountType;
      if (invoiceDiscount != null && invoiceDiscount !== "") apiData.discount = Number(invoiceDiscount);
      if (billTo) apiData.billingAddress = billTo;
      if (shipTo) apiData.shippingAddress = shipTo;
      if (issueDate) apiData.issueDate = issueDate;
      if (dueDate) apiData.dueDate = dueDate;
      if (deliveryFee) apiData.deliveryFee = deliveryFee;
      if (totalAmount)
        apiData.totalAmount = parseFloat(totalWithTax.toFixed(2));
      if (subtotal) apiData.subTotal = parseFloat(subtotal.toFixed(2));
      apiData.tax = parseFloat(calculatedTaxes.toFixed(2));
      if (selectedMerchantType) apiData.merchantId = selectedMerchantType;
      if (selectedAgentType) apiData.agentId = selectedAgentType;
      if (!selectedAgentType && roleTitle !== "admin") apiData.agentId = userData.id;
      if (invoiceNo) apiData.invoiceNo = invoiceNo;
      if (invoiceDate) apiData.invoiceDate = invoiceDate;

      // Conditionally add accountNumber, poNumber, and paymentTerms
      if (accountNumber) apiData.accountNumber = accountNumber;
      if (poNumber) apiData.poNumber = poNumber;
      if (selectedPaymentTerm) apiData.paymentTerms = selectedPaymentTerm;
      if (notes) apiData.notes = notes;
      if (uploadedFiles.length > 0) apiData.files = uploadedFiles;
      apiData.isPlacementInvoice = isPlacementInvoice;

      const result = await postRequestWithBodyAndToken(
        `${baseURl}invoice`,
        accessToken,
        applyAssignmentMetadataIfNeeded(apiData, apiData.lineItems, userData),
      );
      toast.success(result.message);
      navigate(-1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setCreateLoader(false);
    }
  };

  const columns = [
    { id: "item", label: "ITEM", align: "center" },
    { id: "barcode", label: "BARCODE", align: "center" },
    { id: "serialNo", label: "SERIAL NO", align: "center" },
    { id: "quantity", label: "QUANTITY", align: "center" },
    { id: "rate", label: "UNIT PRICE", align: "center" },
    { id: "amount", label: "AMOUNT", align: "center" },
    { id: "delete", label: "ACTIONS", align: "center" },
  ];

  const columns2 = [
    { id: "name", label: "Item", align: "center" },
    { id: "barcode", label: "Barcode", align: "center" },
    { id: "serialNo", label: "Serial No", align: "center" },
    { id: "description", label: "Description", align: "center" },
    { id: "quantity", label: "Quantity", align: "center" },
    { id: "rate", label: "Price", align: "center" },
    { id: "amount", label: "Amount", align: "center" },
  ];

  const selectedMerchant = customerList.find(
    (c) => String(c?.id) === String(selectedMerchantType)
  );

  const email =
    selectedMerchant?.email ||
    selectedMerchant?.ownerEmail ||
    "";

  // Find description of selected payment term
  const selectedPaymentTermDescription =
    data.find((term) => term.value === selectedPaymentTerm)?.description || "";

  return (
    <div
      className="min-h-screen"
      style={{
        marginTop: -70,
        backgroundColor: "var(--dashboard-bg)",
        overflow: "auto",
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
          <HeaderWrapper2 className="">
            <HeaderWrapper>
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 16 }}
              >
                <Button
                  onClick={() => navigate(-1)}
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
                    marginTop: 4,
                  }}
                >
                  <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                  Fontweight={700}
                  color={"var(--sidebar-text-primary)"}
                  Heading={"Create Invoice"}
                  Fontsize={30}
                />
              </div>
            </HeaderWrapper>
            <div className="flex items-center gap-3 flex-wrap">
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
                  className="group relative flex h-6 w-11 cursor-pointer rounded-full bg-[#CBD5E1] p-0.5 transition-colors duration-200 ease-in-out focus:outline-none data-[checked]:bg-[#4379EE]"
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
                  {invoiceNoLoading ? (
                    <Skeleton
                      variant="text"
                      width={72}
                      height={18}
                      sx={{ bgcolor: "rgba(0, 0, 0, 0.08)" }}
                    />
                  ) : isInvoiceNoEditable ? (
                    <div className="mt-0.5 flex flex-col items-center gap-1">
                      <input
                        type="text"
                        value={invoiceNo}
                        onChange={handleInvoiceNoChange}
                        placeholder="Invoice #"
                        autoFocus
                        className="w-28 min-w-[5.5rem] rounded border border-[#4880FF] bg-[var(--dashboard-tab-box)] px-1 py-0.5 text-center text-xs font-semibold outline-none"
                        style={{ color: "var(--sidebar-text-primary)" }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsInvoiceNoEditable(false)}
                        className="text-[10px] font-medium text-[#4880FF] hover:underline"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex items-center gap-1">
                      <Heading
                        Fontweight={600}
                        color={"var(--sidebar-text-primary)"}
                        Heading={invoiceNo || "—"}
                        Fontsize={12}
                      />
                      <button
                        type="button"
                        onClick={() => setIsInvoiceNoEditable(true)}
                        title="Edit invoice number"
                        className="rounded p-0.5 text-[var(--sidebar-text-primary)] opacity-70 transition-opacity hover:bg-[rgba(72,128,255,0.12)] hover:opacity-100"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </HeaderWrapper2>
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
                    src={logoSrc}
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
                  // Tailwind CSS classessdfdsf
                  />
                  <CustomDatePicker
                    value={issueDate}
                    onChange={handleIssueDateChange}
                    label="Issue Date"
                    newCreateInvoice={true}
                  />
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={"var(--fieldsTitle)"}
                    Heading={"Invoice Date"}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  <CustomDatePicker
                    value={invoiceDate}
                    onChange={handleInvoiceDateChange}
                    label="Invoice Date"
                    newCreateInvoice={true}
                  />
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={"var(--fieldsTitle)"}
                    Heading={"Due Date"}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  <CustomDatePicker
                    value={dueDate}
                    onChange={handleDueDateChange}
                    label="Due Date"
                    newCreateInvoice={true}
                    minDate={issueDate ? dayjs(issueDate) : undefined}
                  />
                </div>



                <div className="" style={{}}>
                  <LabeledInput
                    label="Account Number"
                    inputPlaceholder="Enter Account Number"
                    inputValue={accountNumber}
                    onInputChange={handleAccountNumberChange}
                    newCreateInvoice={true}
                  />
                </div>
                <div className="" style={{}}>
                  <LabeledInput
                    label="PO Number"
                    inputPlaceholder="Enter PO Number"
                    inputValue={poNumber}
                    onInputChange={handlePoNumberChange}
                    newCreateInvoice={true}
                  />
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={(userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") ? (
                      <span>
                        Agent<span style={{ color: 'red' }}>*</span>
                      </span>
                    ) : 'Agent'}
                    Fontsize={10}
                    mb={(userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") ? 2 : 0}
                  // Tailwind CSS classes
                  />
                  {(userData.roleTitle === "Admin" || userData.roleTitle === "Human Resource") ? (
                    loading
                      ? (
                        <LabeledInput
                          inputPlaceholder="Loading..."
                          inputValue={''}
                          disabled={true}
                          newCreateInvoice={true}
                        />
                      ) : (
                        <SearchInput
                          suggestions={(agentList || []).map(a => ({ name: a?.name || a?.username || a?.fullName || a?.email || String(a?.id || '') }))}
                          onSelect={handleAgentChange}
                          selectedValue={selectedAgentName}
                        />
                      )
                  ) : (
                    <LabeledInput
                      // label="Agent"
                      inputPlaceholder="Agent"
                      inputValue={userData.username}
                      disabled={true}
                      newCreateInvoice={true}

                    />
                  )}
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={<span>Merchant<span style={{ color: 'red' }}>*</span></span>}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  {loading
                    ? (
                      <LabeledInput
                        inputPlaceholder="Loading..."
                        inputValue={''}
                        disabled={true}
                        newCreateInvoice={true}
                      />
                    ) : (filteredCustomerList && filteredCustomerList.length > 0) ? (
                      <SearchInput
                        suggestions={(filteredCustomerList || []).map(customer => ({ name: customer?.dbaName || customer?.legalBusinessName }))}
                        onSelect={handleMerchantChange}
                        selectedValue={selectedMerchantName}
                      />
                    ) : (
                      <LabeledInput
                        inputPlaceholder="No merchant found"
                        inputValue={''}
                        disabled={true}
                        newCreateInvoice={true}
                      />
                    )}

                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={<span>Payment Terms<span style={{ color: 'red' }}>*</span></span>}
                    Fontsize={10}
                    mb={2}
                  // Tailwind CSS classes
                  />
                  <DropdownMenu
                    menuItems={data.map(term => ({ name: term.title, value: term.value }))}
                    defaultText={'Select Payment Term'}
                    onSelect={(value) => {
                      setSelectedPaymentTerm(value);
                      const calculatedDueDate = calculateDueDate(value);
                      if (calculatedDueDate) {
                        setDueDate(calculatedDueDate);
                      }
                    }}
                    newCreateInvoice={true}
                  />
                </div>
              </div>
              <div className="flex flex-wrap  gap-4">
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Ship To'}
                    Fontsize={10}
                  // Tailwind CSS classes
                  />
                  <textarea
                    type="text"
                    placeholder="Ship To"
                    value={shipTo}
                    onChange={handleShipToChange}
                    className={`mt-0.5 p-1 sm:w-36 h-16`}
                    rows={4}
                    style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                  />
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Bill To'}
                    Fontsize={10}
                  // Tailwind CSS classes
                  />
                  <textarea
                    type="text"
                    placeholder="Bill To"
                    value={billTo}
                    onChange={handleBillToChange}
                    className={`mt-0.5 p-1 sm:w-36 h-16`}
                    rows={4}
                    style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                  />
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Notes'}
                    Fontsize={10}
                  />
                  <textarea
                    type="text"
                    placeholder="Add notes..."
                    value={notes}
                    onChange={handleNotesChange}
                    className={`mt-0.5 p-1 sm:w-36 h-16`}
                    rows={4}
                    style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                  />
                </div>
                <div>
                  <Heading
                    Fontweight={500}
                    color={'var(--fieldsTitle)'}
                    Heading={'Files'}
                    Fontsize={10}
                  />
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
              <ItemTable
                createInvoice={true}
                columns={columns}
                data={itemServicesList}
                leadsTable={true}
                invoiceTable={true}
                totalAmount={totalAmount} // Pass the total amount to ItemTable
                products={products} // Pass products to ItemTable
                onSelectItem={handleProductChange}
                onAddItem={handleAddProductClick} // Pass the add item handler to ItemTable
                // Pass the handler to ItemTable
                onRemoveItem={handleRemoveProductClick} // Pass the remove item handler to ItemTable
                onDiscountItem={openDiscountModal}
                onToggleTaxExempt={handleToggleProductTaxExempt}
              />
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
              <Button onClick={applyDiscountToRow} variant="contained">
                Apply Discount
              </Button>
            </DialogActions>
          </Dialog>

          <div className="flex items-center justify-between mt-2 gap-3">
            <div style={{ display: "" }} className="flex mt-10 gap-3 flex-wrap">
              <BottonCustom
                backgroundColor={"rgba(8, 226, 8, 1)"}
                width={130}
                title={"Download"}
                height={40}
                color={"var(--sidebar-text-selected)"}
                fontSize={16}
                fontWeight={500}
                onClick={handleDownload}
              />
              {/* <BottonCustom
                backgroundColor={"rgba(255, 159, 28, 1)"}
                width={130}
                title={"Send Email"}
                height={40}
                color={"var(--sidebar-text-selected)"}
                fontSize={16}
                fontWeight={500}
                onClick={() => setShowEmailModal(true)}
              /> */}
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
                backgroundColor={"rgba(62, 62, 62, 0.5)"}
                width={130}
                title={draftLoader ? "Saving..." : "Save"}
                height={40}
                disabled={draftLoader}
                color={"var(--sidebar-text-selected)"}
                fontSize={16}
                fontWeight={500}
                onClick={handleDraft}
              />
              <BottonCustom
                backgroundColor={"rgba(67, 121, 238, 1)"}
                width={130}
                title={createLoader ? "Creating..." : "Create Invoice"}
                height={40}
                color={"var(--sidebar-text-selected)"}
                fontSize={16}
                fontWeight={500}
                onClick={handleLogin}
                disabled={createLoader}
              />
            </div>
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
                  <LabeledInput
                    inputPlaceholder="Enter Shipping Fee"
                    inputValue={deliveryFee}
                    onInputChange={handleDeliveryFeeChange}
                    shippingLableInvoice={true}
                    inputType={"number"}
                  />
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
                        src={logoSrc}
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
                  {(invoiceNoLoading || invoiceNo) && (
                    <div className="pb-1 px-2 ">
                      <Heading
                        Fontweight={700}
                        color={"rgba(17, 17, 17, 1)"}
                        Heading={"Invoice #"}
                        Fontsize={10}
                      />
                      {invoiceNoLoading ? (
                        <Skeleton
                          variant="text"
                          width={64}
                          height={14}
                          sx={{ bgcolor: "rgba(0, 0, 0, 0.08)" }}
                        />
                      ) : (
                        <Heading
                          Fontweight={500}
                          color={"rgba(17, 17, 17, 1)"}
                          Heading={invoiceNo}
                          Fontsize={10}
                        />
                      )}
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
                  {!!selectedPaymentTermDescription && (
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
                        Heading={selectedPaymentTermDescription}
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
              width: "1000px",
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
      {/* {showEmailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
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
                value={email}
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
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
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={emailCC}
                onChange={(e) => setEmailCC(e.target.value)}
                placeholder="Enter CC email addresses (comma separated)"
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </div>

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
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Enter your email message here..."
                style={{ backgroundColor: '#f5f5f5' }}
              />
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
                style={{
                  backgroundColor: '#4379EE',
                  color: 'white'
                }}
              >
                Send Email
              </Button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default CreateInvoice;