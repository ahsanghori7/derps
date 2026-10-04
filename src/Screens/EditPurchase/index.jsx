import { useEffect, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import CustomDatePicker from "../../Components/CustomDatePicker";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";
import { formatPoSerialDisplay } from "../../Utils/purchaseOrderHelpers";
import { formatUsDate, formatUsDateTime } from "../../Utils/dateFormat";
import { deleteRequest, getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useLocation, useNavigate } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";
import { FiPlusSquare } from "react-icons/fi";
import close from "../../assets/close.png";
import logo from "../../assets/logo4k.png";
import locationInvoice from "../../assets/locationInvoice.png";
import contactInvoice from "../../assets/contactInvoice.png";
import mailInvoice from "../../assets/mailInvoice.png";
import ItemTable from "../../Components/ItemTable";
import { styled } from '@mui/material/styles';
import addIcon from "../../assets/addIcon.png";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import website from "../../assets/website.png";
import logo4k from "../../assets/logo4k.png";
import Compressor from 'compressorjs'
import { Button } from "@mui/material";
import UploadFile from "../../Components/UploadFile";
import DeleteConfirmationModal from "../../Components/DeleteModal";
import UpdateConfirmationModal from "../../Components/UpdateModal";
import Skeleton from "@mui/material/Skeleton";

const generateInvoiceNumber = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const sanitizeDecimalInput = (raw) => {
    let value = String(raw ?? '').replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1]?.length > 2) {
        value = parts[0] + '.' + parts[1].slice(0, 2);
    }
    return value;
};

const HeaderWrapper = styled('div')({
    position: 'relative',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: 10
});

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
const FeeInput = styled('input')({
    width: 90,
    border: '1px solid var(--dashboard-box-border)',
    borderRadius: 6,
    padding: '2px 6px',
    background: 'white',
    textAlign: 'right',
    MozAppearance: 'textfield',
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
    },
});

const EditPurchase = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const tenantLogo = useSelector((state) => state.auth.tenantLogo);
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = location.state?.returnTo || '/home/purchase';
    const purchaseId = location.state?.itemData?.id || new URLSearchParams(location.search || '').get('id') || '';
    const logoSrc = tenantLogo || logo4k;
    const userData = useSelector((state) => state.userData.userDetails);
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

    const mainDivRef = useRef(); // Create a reference for main div
    const invoiceRef2 = useRef(); // Create a reference for the main div
console.log('location', location.state)
    const [poNo, setPoNo] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [subTotal, setSubTotal] = useState(0);
    const [tax, setTax] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [insuranceFee, setInsuranceFee] = useState(0)
    const [discount, setDiscount] = useState(0);
    const [description, setDescription] = useState("")
    const [shipTo, setShipTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
    const [products, setProducts] = useState([{ itemServiceId: 0, barcode: "", brand: "", model: "", quantity: 0, unitPrice: 0, amount: 0, name: '', id: 0 }]); // Add name field
    const [itemServicesList, setItemServicesList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [selectedAgentType, setSelectedAgentType] = useState(""); // Step 1: Define state
    const [purchsaeDetails, setPurchsaeDetails] = useState([]);
    const [vendorName, setVendorName] = useState('');
    const [deletedItems, setDeletedItems] = useState([]);
    const [combinedProducts, setCombinedProducts] = useState([]);
    const [accountNumber, setAccountNumber] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(""); // State to hold selected payment term
    const [notes, setNotes] = useState(""); // State for notes
    const [createdAt, setCreatedAt] = useState(''); // DERPS entry date
    const [poSerialNoDisplay, setPoSerialNoDisplay] = useState('—');
    const [createdBy, setCreatedBy] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [postedBy, setPostedBy] = useState('');
    const [postedAt, setPostedAt] = useState('');
    const [poDate, setPoDate] = useState("")
    const [uploadedFile, setUploadedFile] = useState(null);
    const [existingFiles, setExistingFiles] = useState([]);
    const [originalProducts, setOriginalProducts] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateModalAction, setUpdateModalAction] = useState(null);

    const [modelOptions, setModelOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);

    const purchaseStatus = location.state?.itemData?.status || purchsaeDetails?.status || '';

    const formatStatusLabel = (status) => {
        const normalized = String(status || '').trim().toLowerCase();
        if (!normalized) return '—';
        if (normalized === 'not-received' || normalized === 'not_received') return 'Not received';
        if (normalized === 'partial') return 'Partial';
        if (normalized === 'received') return 'Received';
        if (normalized === 'draft') return 'Draft';
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    const statusBadgeStyle = (() => {
        const k = String(purchaseStatus || '').trim().toLowerCase();
        if (k === 'received') return { color: '#166534', backgroundColor: 'rgba(34, 197, 94, 0.18)' };
        if (k === 'not-received' || k === 'not_received') return { color: '#991B1B', backgroundColor: 'rgba(239, 68, 68, 0.15)' };
        if (k === 'partial') return { color: '#1D4ED8', backgroundColor: 'rgba(59, 130, 246, 0.15)' };
        if (k === 'draft') return { color: '#64748B', backgroundColor: 'rgba(100, 116, 139, 0.16)' };
        return { color: '#64748B', backgroundColor: 'rgba(100, 116, 139, 0.12)' };
    })();

    const format2Decimals = (value) => {
        const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
        return Number.isFinite(n) ? n.toFixed(2) : value;
    };

    const pdfCombinedProducts = combinedProducts.map((p) => ({
        ...p,
        unitPrice: format2Decimals(p?.unitPrice),
        amount: format2Decimals(p?.amount),
    }));

    const limitedLineItems = pdfCombinedProducts.slice(0, 11)
    const limitedLineItems2 = pdfCombinedProducts.slice(11)

    const data = [
        { title: "Net 30", description: "Due 30 days", value: "net-30" },
        { title: "Net 60", description: "Due 60 days", value: "net-60" },
        { title: "Due Upon Receipt", description: "Due Upon Receipt", value: "due-receipt" },
        { title: "COD (Cash On Delivery)", description: "Cash On Delivery", value: "cash-on-delivery" },
        { title: "EOM (End Of Month)", description: "End Of Month", value: "eom" },
        { title: "Payment in Advance", description: "Payment in Advance", value: "advance-payment" }
    ];
    // New state for combined products
    // Step 1: Initialize as an array
    const fetchData = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}item-services`, accessToken
        )
            .then(result => {
                setItemServicesList(result?.data)
                getRequestWithOutBody(
                    `${baseURl}vendor`, accessToken
                )
                    .then(result => {
                        setVendorList(result?.data?.results)
                        setLoading(false)
                    })
                    .catch(error => {
                        setLoading(false)
                    })
                // setCompanyCategoryArray(options);
                // setCompanyCategoryArray(result)setLoadin
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    const fetchData2 = () => {
        if (!purchaseId) {
            toast.error("Purchase order not found");
            return;
        }
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}purchase-order/${purchaseId}`, accessToken
        )
            .then(result => {
                const data = result?.data || {}; // Use an empty object as a fallback

                setPurchsaeDetails(data);
                setAccountNumber(data.accountNumber || ''); // Default to an empty string if null
                setSubTotal(Number(data.subTotal || 0));
                setTax(Number(data.tax || 0));
                setDeliveryFee(Number(data.deliveryFee || 0));
                setInsuranceFee(Number(data.insurance || 0));
                setDiscount(Number(data.discount || 0));
                setNotes(data.notes || '');
                setDueDate(formatUsDate(data.dueDate, { empty: '' }));
                setSelectedPaymentTerm(data.paymentTerms || ''); // Default to an empty string if null
                setPoDate(formatUsDate(data.poDate, { empty: '' }));

                setExistingFiles(Array.isArray(data?.files) ? data.files : []);
                const vendorAddress = [
                    data.vendor?.address || '',
                    data.vendor?.city || '',
                    data.vendor?.state || '',
                    data.vendor?.zipCode || ''
                ].filter(part => part.trim()).join(', ');

                setShipTo(vendorAddress || "");

                setSelectedAgentType(data.vendorId || ''); // Default to an empty string if null

                const fetchedProducts = data.order_items?.map(item => ({
                    itemServiceId: item?.item_service?.id || 0, // Default to 0 if null
                    barcode: item?.barcode || item?.item_service?.barcode || "",
                    brand: item?.brand || "",
                    model: item?.model || "",
                    brandId: item?.brandId ?? null,
                    modelId: item?.modelId ?? null,
                    quantity: Number.isFinite(parseInt(item.quantity, 10)) ? Math.max(1, parseInt(item.quantity, 10)) : 1,
                    receivedQty: Number.isFinite(parseFloat(item.receivedQty)) ? Number(item.receivedQty) : 0,
                    unitPrice: item.unitPrice || 0, // Default to 0 if null
                    amount: item.amount || 0, // Default to 0 if null
                    name: item.item_service?.name || '', // Default to an empty string if null
                    id: item.id || 0, // Default to 0 if null
                    accountId: item?.item_service?.accountId || undefined,
                })) || []; // Default to an empty array if null

                setProducts(fetchedProducts);
                setOriginalProducts(JSON.parse(JSON.stringify(fetchedProducts)));

                setPoNo(data.poNo || ''); // Default to an empty string if null
                setPoSerialNoDisplay(formatPoSerialDisplay(data));
                setBillNumber(data.billNumber || '');
                setTotalAmount(Number(data.totalAmount || 0)); // Default to 0 if null
                setCreatedAt(formatUsDate(data.createdAt, { empty: '' }));
                setCreatedBy(location.state?.itemData?.createdByName || location.state?.itemData?.creator?.name || data?.createdByName || data?.creator?.name || '-');
                setPostedBy(data?.postedInfo?.postedByName || '');
                setPostedAt(formatUsDateTime(data?.postedInfo?.postedDateTime, { empty: '' }));

                setDescription(`${data.vendor?.companyName || ''}\n${data.vendor?.email || ''}`); // Default to empty strings if null
                setVendorName(data.vendor?.companyName || ''); // Default to an empty string if null

                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
            });
    }

    useEffect(() => {
        const computedSubTotal = products.reduce((sum, product) => sum + (Number(product.amount) || 0), 0);
        setSubTotal(computedSubTotal);
        const safeTax = Number(tax) || 0;
        const safeDeliveryFee = Number(deliveryFee) || 0;
        const safeInsuranceFee = Number(insuranceFee) || 0;
        const safeDiscount = Number(discount) || 0;
        setTotalAmount(computedSubTotal + safeTax + safeDeliveryFee - safeInsuranceFee - safeDiscount);
    }, [products, tax, deliveryFee, insuranceFee, discount]);

    const handleAccountNumberChange = (e) => {
        setAccountNumber(e.target.value);
    };

    const handleDueDateChange = (date) => {
        const formattedDate = formatUsDate(new Date(date), { empty: '' });

        if (poDate && new Date(formattedDate) < new Date(poDate)) {
            toast.error("Due date cannot be before PO date.");
            return;
        }

        setDueDate(formattedDate);
    };

    const handlePoDateChange = (date) => {
        const formattedDate = formatUsDate(new Date(date), { empty: '' });
        setPoDate(formattedDate);

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

    const selectedPaymentTermDescription = data.find(term => term.value === selectedPaymentTerm)?.description || "";


    useEffect(() => {
        fetchData()
        fetchData2()
        fetchSupportSetupOptions('model', setModelOptions);
        fetchSupportSetupOptions('brand', setBrandOptions);
    }, [])

    useEffect(() => {
        const newProducts = [...products];
        const updatedCombinedProducts = newProducts.map(product => {
            const itemDetails = itemServicesList.find(item => item.id === product.itemServiceId);
            return {
                ...product,
                description: itemDetails ? itemDetails.description : '' // Set description from itemServicesList
            };
        });
        setCombinedProducts(updatedCombinedProducts);
    }, [products]);

    useEffect(() => {
        if (!Array.isArray(itemServicesList) || itemServicesList.length === 0) return;
        setProducts((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) return prev;
            let didChange = false;
            const next = prev.map((p) => {
                const hasBarcode = String(p?.barcode || '').trim();
                if (hasBarcode) return p;
                const svc = itemServicesList.find((i) => String(i?.id) === String(p?.itemServiceId));
                const resolved = String(svc?.barcode || '').trim();
                if (!resolved) return p;
                didChange = true;
                return { ...p, barcode: resolved };
            });
            return didChange ? next : prev;
        });
    }, [itemServicesList, products]);

    const handleInsuranceFeeChange = (e) => {
        setInsuranceFee(sanitizeDecimalInput(e.target.value));
    };

    const handleAddProductClick = () => {
        setProducts([...products, { itemServiceId: 0, barcode: "", brand: "", model: "", quantity: 0, unitPrice: 0, amount: 0, name: '', id: 0 }]);
    };

    const handleRemoveProductClick = (index) => {
        const newProducts = [...products];
        const removedProductId = newProducts[index].id; // Get the ID of the product being removed
        newProducts.splice(index, 1);
        if (newProducts.length === 0) {
            newProducts.push({ itemServiceId: 0, barcode: "", brand: "", model: "", quantity: 0, unitPrice: 0, amount: 0, name: '', id: 0 });
        }
        setProducts(newProducts);
        setDeletedItems(prev => [...prev, removedProductId]); // Step 2: Add the removed item ID to the array
    };

    const handleProductChange = (index, field, value) => {
        const newProducts = [...products];
        if (field === "itemServiceId") {
            const selectedItem = itemServicesList.find(item => item.id === value); // Find item by ID
            newProducts[index] = {
                ...newProducts[index],
                itemServiceId: selectedItem.id,
                barcode: selectedItem?.barcode || newProducts[index]?.barcode || "",
                quantity: 1, // Set quantity to 1
                unitPrice: selectedItem.costPrice,
                amount: selectedItem.costPrice, // Set amount to selling price initially
                name: selectedItem.name, // Set name field
                accountId: selectedItem.accountId
            };
        } else if (field === "barcode") {
            const scanned = String(value || "").trim();
            newProducts[index] = {
                ...newProducts[index],
                barcode: scanned,
            };

            if (scanned) {
                const matchedItem = itemServicesList.find(
                    (item) => String(item?.barcode || "").trim() === scanned,
                );

                if (matchedItem) {
                    newProducts[index] = {
                        ...newProducts[index],
                        itemServiceId: matchedItem.id,
                        barcode: String(matchedItem?.barcode || scanned),
                        quantity: Math.max(1, Number(newProducts[index]?.quantity) || 1),
                        unitPrice: matchedItem.costPrice,
                        amount: (Math.max(1, Number(newProducts[index]?.quantity) || 1) * Number(matchedItem.costPrice || 0)),
                        name: matchedItem.name,
                        accountId: matchedItem.accountId,
                    };
                }
            }
        } else {
            newProducts[index][field] = value;
            if (field === "quantity" || field === "unitPrice") {
                newProducts[index].amount = newProducts[index].quantity * newProducts[index].unitPrice;
            }
        }
        setProducts(newProducts);
        // Update combinedProducts with selected item details
        const updatedCombinedProducts = newProducts.map(product => {
            const itemDetails = itemServicesList.find(item => item.id === product.itemServiceId);
            return {
                ...product,
                name: itemDetails ? itemDetails.name : '',
                description: itemDetails ? itemDetails.description : ''
            };
        });
        setCombinedProducts(updatedCombinedProducts);
    };
    const handleCheckboxChange = () => { // Add this function
        setIsChecked(!isChecked);
    };
    const handleTotalAmountChange = (e) => {
        setTotalAmount(e.target.value);
    };
    const handleTaxChange = (e) => {
        setTax(sanitizeDecimalInput(e.target.value));
    };
    const handleDeliveryFeeChange = (e) => {
        setDeliveryFee(sanitizeDecimalInput(e.target.value));
    };
    const handleDiscountChange = (e) => {
        setDiscount(sanitizeDecimalInput(e.target.value));
    };
    const handleShipToChange = (e) => {
        setShipTo(e.target.value);
    };
    const calculateDueDate = (paymentTerm, baseDateOverride) => {
        // Use provided base date, then PO date state, fallback to today
        const baseDate = baseDateOverride
            ? new Date(baseDateOverride)
            : poDate
                ? new Date(poDate)
                : new Date();
        const formattedDate = (date) => {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        };

        switch (paymentTerm) {
            case 'net-30':
                const net30Date = new Date(baseDate);
                net30Date.setDate(baseDate.getDate() + 30);
                return formattedDate(net30Date);

            case 'net-60':
                const net60Date = new Date(baseDate);
                net60Date.setDate(baseDate.getDate() + 60);
                return formattedDate(net60Date);

            case 'due-receipt':
                return formattedDate(baseDate);

            case 'cash-on-delivery':
                return formattedDate(baseDate);

            case 'eom':
                const lastDayOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
                return formattedDate(lastDayOfMonth);

            case 'advance-payment':
                return formattedDate(baseDate);

            default:
                return '';
        }
    };

    const calculatePoDate = () => {
        const today = new Date();
        return today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
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

    const uploadPurchaseFiles = async () => {
        const uploaded = [];
        if (Array.isArray(uploadedFile) && uploadedFile.length > 0) {
            for (const file of uploadedFile) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("type", "purchase");
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

    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };
    const handleAgentChange = (value) => {
        const selectedAgent = vendorList.find(agent => agent.companyName === value);
        setSelectedAgentType(selectedAgent ? selectedAgent.id : "");

        if (selectedAgent) {
            setDescription(`${selectedAgent.companyName}\n${selectedAgent.email}`);
            setShipTo(`${selectedAgent.address}`);
        }
    };

    const columns = [
        { id: 'item', label: 'ITEM', align: 'center' },
        { id: 'barcode', label: 'BARCODE', align: 'center' },
        { id: 'brand', label: 'BRAND', align: 'center' },
        { id: 'model', label: 'MODEL', align: 'center' },
        { id: 'quantity', label: 'QUANTITY', align: 'center' },
        { id: 'unitPrice', label: 'UNIT PRICE', align: 'center' },
        { id: 'amount', label: 'AMOUNT', align: 'center' },
        { id: 'delete', label: 'DELETE', align: 'center' },
    ];

    const fetchSupportSetupOptions = async (type, setter) => {
        try {
            const result = await getRequestWithOutBody(`${baseURl}support-setup?type=${type}`, accessToken);
            const options = (result?.data || []).map((item) => ({
                title: item?.title,
                id: item?.id,
                value: item?.title,
            }));
            setter(options);
        } catch (error) {
            setter([]);
        }
    };

    const resolveSupportSetupId = (options, value) => {
        if (!value) return null;
        const v = String(value).trim();
        if (!v) return null;
        const match = Array.isArray(options)
            ? options.find((o) => String(o?.value ?? o?.title ?? '').trim() === v)
            : null;
        return match?.id ?? null;
    };

    const handleButtonClick = () => {
        navigate('/home/addSupplier', { state: { entityLabel: 'Vendor' } });
    };

    const validatePurchaseOrder = () => {
        const errors = [];

        if (!selectedAgentType) {
            errors.push("Vendor is required");
        }
        if (!poDate) {
            errors.push("PO date is required");
        }
        if (!selectedPaymentTerm) {
            errors.push("Payment term is required");
        }
        if (!dueDate) {
            errors.push("Due date is required");
        }

        const updatedProducts = products.filter(
            (product) => Number(product?.itemServiceId) !== 0,
        );
        if (updatedProducts.length === 0) {
            errors.push("At least one item is required");
        }
        if (updatedProducts.some((product) => product.itemServiceId === 0)) {
            errors.push("All item fields are required");
        }

        return errors;
    };

    const handleLogin = async () => {
        const errors = validatePurchaseOrder();
        if (errors.length > 0) {
            errors.forEach((err) => toast.error(err));
            return;
        }
        setUpdateModalAction('save');
        setShowUpdateModal(true);
    };

    const handleCreatePurchase = async () => {
        const errors = validatePurchaseOrder();
        if (errors.length > 0) {
            errors.forEach((err) => toast.error(err));
            return;
        }
        setUpdateModalAction('create');
        setShowUpdateModal(true);
    };

    const executeSave = async () => {
        const errors = validatePurchaseOrder();
        if (errors.length > 0) {
            errors.forEach((err) => toast.error(err));
            return;
        }

        const updatedProducts = products.filter(product => Number(product?.itemServiceId) !== 0);
        
        const uploadedFiles = await uploadPurchaseFiles();
        const combinedFiles = [...(Array.isArray(existingFiles) ? existingFiles : []), ...(Array.isArray(uploadedFiles) ? uploadedFiles : [])].filter((f) => f?.url);
        const apiData = {
            "poNo": poNo,
            "orderDate": poDate, // Send PO date as orderDate
            "poDate": poDate,
            "issueDate": poDate, // Use PO date as issue date
            "dueDate": dueDate,
            "vendorId": selectedAgentType,
            "subTotal": parseFloat(Number(subTotal || 0).toFixed(2)),
            "tax": parseFloat(Number(tax || 0).toFixed(2)),
            "deliveryFee": parseFloat(Number(deliveryFee || 0).toFixed(2)),
            "insurance": parseFloat(Number(insuranceFee || 0).toFixed(2)),
            "discount": parseFloat(Number(discount || 0).toFixed(2)),
            "totalAmount": parseFloat(Number(totalAmount).toFixed(2)),
            "agentId": null, // Send null if not changed
            "billingAddress": null, // Send null if not changed
            "shippingAddress": null, // Send null if not changed
            "notes": notes || null, // Send null if empty
            "files": combinedFiles,
            "paidAmount": null, // Send null if not changed
            "balanceDue": null, // Send null if not changed
            "accountNumber": accountNumber || null,
            "poNumber": poNo || null,
            "billNumber": null, // Send null if not changed
            "billDate": null, // Send null if not changed
            "paymentTerms": selectedPaymentTerm || null,
            "status": "active",
            "deletedIds": deletedItems.length > 0 ? deletedItems : undefined,
            "items": updatedProducts.map((p) => {
                const originalProduct = originalProducts.find(orig => orig.id === p.id);
                const itemData = {
                    "id": p.id,
                    "purchaseOrderId": purchaseId,
                    "itemServiceId": p.itemServiceId,
                    "accountId": p.accountId ?? itemServicesList.find(item => item.id === p.itemServiceId)?.accountId,
                    "brandId": resolveSupportSetupId(brandOptions, p?.brand),
                    "modelId": resolveSupportSetupId(modelOptions, p?.model)
                };
                
                // Only include quantity, unitPrice, and amount if they were updated
                if (originalProduct) {
                    if (originalProduct.quantity !== p.quantity) {
                        itemData.quantity = Number.isFinite(parseInt(p.quantity, 10)) ? Math.max(1, parseInt(p.quantity, 10)) : 1;
                    }
                    if (originalProduct.unitPrice !== p.unitPrice) {
                        itemData.unitPrice = p.unitPrice;
                    }
                    if (originalProduct.amount !== p.amount) {
                        itemData.amount = p.amount;
                    }
                } else {
                    // For new items, include all fields
                    itemData.quantity = Number.isFinite(parseInt(p.quantity, 10)) ? Math.max(1, parseInt(p.quantity, 10)) : 1;
                    itemData.unitPrice = p.unitPrice;
                    itemData.amount = p.amount;
                }
                
                return itemData;
            }),
        };
        // These fields are already included in the main apiData object above
        if (accountNumber) apiData.accountNumber = accountNumber;
        if (dueDate) apiData.dueDate = dueDate;
        if (poDate) apiData.poDate = poDate;
        if (selectedPaymentTerm) apiData.paymentTerms = selectedPaymentTerm;
        if (notes) apiData.notes = notes;
        // apiData.files is already set above
        const result = await putRequestWithBodyAndToken(`${baseURl}purchase-order/${purchaseId}`, accessToken, apiData)
        toast.success(result.message);
        navigate(returnTo);
    };

    // Helper function to convert data URL to Blob
    const dataURLToBlob = (dataURL) => {
        const byteString = atob(dataURL.split(',')[1])
        const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
        }
        return new Blob([ab], { type: mimeString })
    }

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

    const handleDownload = async () => {
        const element = mainDivRef.current
        const hiddenElement = document.getElementById("hiddenSection")
        const hiddenElement2 = document.getElementById("hiddenSection2")

        const needsSecondPage = combinedProducts.length > 11

        // remember original display to restore precisely
        const prev1 = hiddenElement?.style.display ?? "";
        const prev2 = hiddenElement2?.style.display ?? "";

        const logoImgs = Array.from(
            document.querySelectorAll('img[data-role="invoice-logo"]'),
        );
        const prevLogoSrcs = logoImgs.map((img) => img.getAttribute("src") || "");

        try {
            hiddenElement.style.display = "block"
            const fallbackLogo = await resolveImageToDataURL(logo4k);

            const allImgs = Array.from(hiddenElement.querySelectorAll("img"));
            const prevAllSrcs = allImgs.map((img) => img.getAttribute("src") || "");
            await Promise.all(
                allImgs.map(async (img, idx) => {
                    const src = prevAllSrcs[idx];
                    if (!src || src.startsWith("data:")) return;
                    const resolved = await resolveImageToDataURL(src);
                    if (resolved && resolved !== src) {
                        img.setAttribute("src", resolved);
                    } else if (img.dataset.role === "invoice-logo" && fallbackLogo) {
                        img.setAttribute("src", fallbackLogo);
                    }
                }),
            );
            await sleep(50);

            const { jsPDF } = await import("jspdf");
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                allowTaint: false,
                backgroundColor: "#ffffff",
                imageTimeout: 15000,
            })

            const imgBlob = dataURLToBlob(canvas.toDataURL("image/jpeg", 1.0))
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
                        if (!src || src.startsWith("data:")) return;
                        const resolved = await resolveImageToDataURL(src);
                        if (resolved && resolved !== src) {
                            img.setAttribute("src", resolved);
                        } else if (img.dataset.role === "invoice-logo" && fallbackLogo) {
                            img.setAttribute("src", fallbackLogo);
                        }
                    }),
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

                const imgBlob2 = dataURLToBlob(canvas2.toDataURL("image/jpeg", 1.0)); // Convert second data URL to Blob
                const img2 = await compressBlobToDataURL(imgBlob2, 0.8);

                pdf.addPage();
                pdf.addImage(img2, "JPEG", 0, 0, imgWidth, (canvas2.height * imgWidth) / canvas2.width);
                pdf.save("purchase_order.pdf");
                hiddenElement2.style.display = "none";
            } else {
                pdf.save("purchase_order.pdf");
            }
        } catch (error) {
        } finally {
            logoImgs.forEach((img, idx) => {
                img.setAttribute("src", prevLogoSrcs[idx] || "");
            });
            // restore exactly what was there before
            if (hiddenElement2) hiddenElement2.style.display = prev2 || "none";
            if (hiddenElement) hiddenElement.style.display = prev1 || "none";
        }
    }

    const columns2 = [
        { id: 'name', label: 'ITEM', align: 'center' },
        { id: 'barcode', label: 'BARCODE', align: 'center' },
        { id: 'brand', label: 'BRAND', align: 'center' },
        { id: 'model', label: 'MODEL', align: 'center' },
        { id: 'description', label: 'ITEM DESCRIPTION', align: 'center' },
        { id: 'quantity', label: 'QUANTITY', align: 'center' },
        { id: 'unitPrice', label: 'UNIT PRICE', align: 'center' },
        { id: 'amount', label: 'AMOUNT', align: 'center' },
    ];

    const handleDeleteLead = async () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}purchase-order/${purchaseId}`, accessToken)
            toast.success(result.message);
            setShowDeleteModal(false);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    const handleDraft = async () => {
        setUpdateModalAction('draft');
        setShowUpdateModal(true);
    };

    const confirmUpdate = async () => {
        setLoading(true);
        
        try {
            if (updateModalAction === 'draft') {
                await executeDraft();
            } else if (updateModalAction === 'save' || updateModalAction === 'create') {
                await executeSave();
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
            setShowUpdateModal(false);
            setUpdateModalAction(null);
        }
    };

    const executeDraft = async () => {
        let orderDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })

        const uploadedFiles = await uploadPurchaseFiles();
        const combinedFiles = [...(Array.isArray(existingFiles) ? existingFiles : []), ...(Array.isArray(uploadedFiles) ? uploadedFiles : [])].filter((f) => f?.url);
        const apiData = {
            status: "draft",
            orderDate: orderDate,
        };

        const filteredProducts = products.filter(product => product.amount !== 0);
        if (filteredProducts.length > 0) {
            apiData.items = filteredProducts.map((p) => ({
                ...p,
                brandId: resolveSupportSetupId(brandOptions, p?.brand),
                modelId: resolveSupportSetupId(modelOptions, p?.model),
                quantity: Number.isFinite(parseInt(p.quantity, 10)) ? Math.max(1, parseInt(p.quantity, 10)) : 1,
                accountId: p.accountId ?? itemServicesList.find(item => item.id === p.itemServiceId)?.accountId,
            }));
        }
        if (totalAmount) apiData.totalAmount = parseFloat(totalAmount.toFixed(2));
        apiData.subTotal = parseFloat(Number(subTotal || 0).toFixed(2));
        apiData.tax = parseFloat(Number(tax || 0).toFixed(2));
        apiData.deliveryFee = parseFloat(Number(deliveryFee || 0).toFixed(2));
        apiData.insurance = parseFloat(Number(insuranceFee || 0).toFixed(2));
        apiData.discount = parseFloat(Number(discount || 0).toFixed(2));
        if (selectedAgentType) apiData.vendorId = selectedAgentType;
        if (accountNumber) apiData.accountNumber = accountNumber;
        if (dueDate) apiData.dueDate = dueDate;
        if (poDate) apiData.poDate = poDate
        if (poNo) apiData.poNo = poNo;
        if (selectedPaymentTerm) apiData.paymentTerms = selectedPaymentTerm;
        if (notes) apiData.notes = notes;
        apiData.files = combinedFiles;

        const result = await putRequestWithBodyAndToken(`${baseURl}purchase-order/${purchaseId}`, accessToken, apiData);
        toast.success(result.message);
        navigate(-1);
    };

    const cancelUpdate = () => {
        setShowUpdateModal(false);
        setUpdateModalAction(null);
    };

    // Function to get the title from the value
    const getPaymentTermTitle = (value) => {
        const term = data.find(term => term.value === value);
        return term ? term.title : 'Select Payment Term';
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -70, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div >
                    <div style={{ marginTop: 10, paddingTop: 10, borderRadius: 14 }} className="sm:m-4 p-3 pt-4 m-2" >
                        <HeaderWrapper>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                <Button
                                    onClick={() => navigate(-1)}
                                    style={{
                                        minWidth: 40,
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--dashboard-card-bg)',
                                        border: '1px solid var(--dashboard-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        marginTop: 4
                                    }}
                                >
                                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                                </Button>
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'Purchase Order Details'}
                                    Fontsize={30}
                                />
                            </div>
                            <div style={{ border: '1px solid var(--dashboard-box-border)', borderRadius: 12 }} className="flex">
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
                                        Heading={poDate}
                                        Fontsize={12}
                                    />
                                </div> */}
                                <div style={{ backgroundColor: 'var(--dashboard-tab-box)', borderRadius: purchaseStatus ? '0 0 0 0' : '12px 0 0 12px', borderRight: '1px solid var(--dashboard-box-border)' }} className="py-2 px-3 flex flex-col items-center" >
                                    <Heading
                                        Fontweight={600}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'DERPS #'}
                                        Fontsize={12}
                                    />
                                    <Heading
                                        Fontweight={600}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={poSerialNoDisplay}
                                        Fontsize={12}
                                    />
                                </div>
                                <div style={{ backgroundColor: 'var(--dashboard-tab-box)', borderRight: purchaseStatus ? '1px solid var(--dashboard-box-border)' : 'none', borderRadius: purchaseStatus ? '0 0 0 0' : '0 12px 12px 0' }} className="py-2 px-3 flex flex-col items-center" >
                                    <Heading
                                        Fontweight={600}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'P.O. No.'}
                                        Fontsize={12}
                                    />
                                    <Heading
                                        Fontweight={600}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={poNo}
                                        Fontsize={12}
                                    />
                                </div>
                                {purchaseStatus ? (
                                    <div style={{ backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '0 12px 12px 0' }} className="py-2 px-3 flex flex-col items-center justify-center">
                                        <Heading
                                            Fontweight={600}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Status'}
                                            Fontsize={12}
                                        />
                                        <span
                                            style={{
                                                marginTop: 4,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minWidth: 88,
                                                padding: '2px 10px',
                                                borderRadius: 999,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                ...statusBadgeStyle,
                                            }}
                                        >
                                            {formatStatusLabel(purchaseStatus)}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </HeaderWrapper>
                        <div className="flex justify-between gap-6 items-start">
                            <div className="flex flex-wrap lg:flex-nowrap gap-4">
                                <div style={{ borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }} className="py-1 px-4  ">
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
                                                className="max-w-28 max-h-10 w-auto h-auto object-contain object-left"
                                                data-role="invoice-logo"
                                                onError={() => setLogoError(true)}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-start gap-2 items-start mt-4 ">
                                        <img src={locationInvoice} className="w-2 h-3 mt-1" />
                                        <Heading
                                            Fontweight={400}
                                            color={'var(--sidebar-text-primary)'}
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
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={`Direct: ${tenantPhone}`}
                                            Fontsize={10}
                                        // Tailwind CSS classes
                                        />
                                    </div>
                                    <div className="flex justify-start gap-2 items-start mt-2">
                                        <img src={mailInvoice} className="w-2.5 h-2.5 mt-1" />
                                        <Heading
                                            Fontweight={400}
                                            color={'var(--sidebar-text-primary)'}
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
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={tenantWebsite}
                                            Fontsize={10}
                                            mt={2}
                                        // Tailwind CSS classes
                                        />
                                    </div>
                                    ) : null}
                                </div>
                                <div className="flex flex-col flex-wrap">
                                    <div className="flex flex-wrap gap-4">
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={<span>Vendor<span style={{ color: 'red' }}>*</span></span>}
                                                Fontsize={10}
                                                mb={2}
                                            // Tailwind CSS classes
                                            />
                                            {loading ? (
                                                <InputSkeleton width="144px" height={28} />
                                            ) : (
                                                <DropdownMenu
                                                    selectedValue={vendorName}
                                                    menuItems={vendorList.map(customer => ({ name: customer.companyName }))}
                                                    defaultText={'Select Vendor'}
                                                    newCreateInvoice={true}
                                                    searchable={true}
                                                    onSelect={handleAgentChange} />
                                            )}
                                        </div>
                                        <div className="" style={{ marginLeft: -4 }}>
                                            {loading ? (
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

                                        <div className="" style={{ marginLeft: -4 }}>
                                            {loading ? (
                                                <>
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Entered into DERPS'}
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

                                        <div className="" style={{ marginLeft: -4 }}>
                                            {loading ? (
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

                                        <div className="" style={{ marginLeft: -4 }}>
                                            {loading ? (
                                                <>
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Bill Number'}
                                                        Fontsize={10}
                                                        mb={2}
                                                    />
                                                    <InputSkeleton width="144px" height={28} />
                                                </>
                                            ) : (
                                                <LabeledInput
                                                    label="Bill Number"
                                                    inputPlaceholder=""
                                                    inputValue={billNumber || '—'}
                                                    newCreateInvoice={true}
                                                    disabled={true}
                                                />
                                            )}
                                        </div>

                                        <div className="" style={{ marginLeft: -4 }}>
                                            {loading ? (
                                                <>
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Posted By'}
                                                        Fontsize={10}
                                                        mb={2}
                                                    />
                                                    <InputSkeleton width="144px" height={28} />
                                                </>
                                            ) : (
                                                <LabeledInput
                                                    label="Posted By"
                                                    inputPlaceholder=""
                                                    inputValue={postedBy || '—'}
                                                    newCreateInvoice={true}
                                                    disabled={true}
                                                />
                                            )}
                                        </div>

                                        <div className="" style={{ marginLeft: -4 }}>
                                            {loading ? (
                                                <>
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Posted At'}
                                                        Fontsize={10}
                                                        mb={2}
                                                    />
                                                    <InputSkeleton width="144px" height={28} />
                                                </>
                                            ) : (
                                                <LabeledInput
                                                    label="Posted At"
                                                    inputPlaceholder=""
                                                    inputValue={postedAt || '—'}
                                                    newCreateInvoice={true}
                                                    disabled={true}
                                                />
                                            )}
                                        </div>

                                        {/* <div className="" style={{ marginLeft: -4 }}>
                                            <LabeledInput
                                                label="Sub Total"
                                                inputPlaceholder="0"
                                                inputValue={Number(subTotal || 0)}
                                                newCreateInvoice={true}
                                                disabled={true}
                                            />
                                        </div> */}

                                        {/* <div className="" style={{ marginLeft: -4 }}>
                                            <LabeledInput
                                                label="Tax"
                                                inputPlaceholder="0"
                                                inputValue={tax}
                                                onInputChange={handleTaxChange}
                                                newCreateInvoice={true}
                                            />
                                        </div>

                                        <div className="" style={{ marginLeft: -4 }}>
                                            <LabeledInput
                                                label="Delivery Fee"
                                                inputPlaceholder="0"
                                                inputValue={deliveryFee}
                                                onInputChange={handleDeliveryFeeChange}
                                                newCreateInvoice={true}
                                            />
                                        </div>

                                        <div className="" style={{ marginLeft: -4 }}>
                                            <LabeledInput
                                                label="Discount"
                                                inputPlaceholder="0"
                                                inputValue={discount}
                                                onInputChange={handleDiscountChange}
                                                newCreateInvoice={true}
                                            />
                                        </div> */}

                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={<span>PO Date<span style={{ color: 'red' }}>*</span></span>}
                                                Fontsize={10}
                                                mb={2}
                                            // Tailwind CSS classes
                                            />
                                            {loading ? (
                                                <InputSkeleton width="144px" height={28} isDatePicker={true} />
                                            ) : (
                                                <CustomDatePicker
                                                    value={poDate}
                                                    onChange={handlePoDateChange}
                                                    label="PO Date"
                                                    newCreateInvoice={true}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={<span>Due Date<span style={{ color: 'red' }}>*</span></span>}
                                                Fontsize={10}
                                                mb={2}
                                            // Tailwind CSS classes
                                            />
                                            {loading ? (
                                                <InputSkeleton width="144px" height={28} isDatePicker={true} />
                                            ) : (
                                                <CustomDatePicker
                                                    value={dueDate}
                                                    onChange={handleDueDateChange}
                                                    label="Due Date"
                                                    newCreateInvoice={true}
                                                    minDate={poDate ? dayjs(poDate) : undefined}
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
                                            {loading ? (
                                                <InputSkeleton width="144px" height={28} />
                                            ) : (
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
                                                    selectedValue={getPaymentTermTitle(selectedPaymentTerm)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-4">
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Vendor'}
                                                Fontsize={10}
                                            // Tailwind CSS classes
                                            />
                                            {loading ? (
                                                <InputSkeleton height={64} />
                                            ) : (
                                                <textarea
                                                    type="text"
                                                    // placeholder="Notes"
                                                    value={description}
                                                    onChange={handleDescriptionChange}
                                                    className={`mt-0.5 p-1 w-36 h-16`}
                                                    rows={4}
                                                    disabled
                                                    style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Ship To'}
                                                Fontsize={10}
                                            // Tailwind CSS classes
                                            />
                                            {loading ? (
                                                <InputSkeleton height={64} />
                                            ) : (
                                                <textarea
                                                    type="text"
                                                    // placeholder="Ship To"
                                                    value={shipTo}
                                                    // onChange={handleShipToChange}
                                                    className={`mt-0.5 p-1 w-36 h-16`}
                                                    rows={4}
                                                    disabled
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
                                            {loading ? (
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
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="mt-4">
                                {loading ? (
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
                                        columns={columns}
                                        data={itemServicesList}
                                        leadsTable={true}
                                        PreviewPurchase={true}
                                        editPurchase={true}
                                        totalAmount={totalAmount} // Pass the total amount to ItemTable
                                        products={products} // Pass products to ItemTable
                                        onSelectItem={handleProductChange}
                                        onAddItem={handleAddProductClick} // Pass the add item handler to ItemTable
                                        // Pass the handler to ItemTable
                                        onRemoveItem={handleRemoveProductClick} // Pass the remove item handler to ItemTable
                                        brandOptions={brandOptions}
                                        modelOptions={modelOptions}
                                    />
                                )}
                            </div>

                        </div>
                    </div>
                    <div style={{ display: '' }} className="flex justify-between gap-3 sm:m-8 pb-2" >
                        <div style={{ display: '' }} className="flex gap-3" >

                            <BottonCustom
                                backgroundColor={'rgba(8, 226, 8, 1)'}
                                width={130}
                                title={'Download'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleDownload}
                            />
                            {purchaseStatus === "draft" && (
                                <BottonCustom
                                    backgroundColor={'rgba(62, 62, 62, 0.5)'}
                                    width={130}
                                    title={'Save'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleDraft}
                                />
                            )}
                        </div>
                        <div className="flex items-end gap-3">
                            <div style={{ minWidth: 260 }}>
                                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                    <div>Subtotal</div>
                                    <div>${Number(subTotal || 0).toFixed(2)}</div>
                                </div>
                                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                    <div>Shipping Fee</div>
                                    <FeeInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={deliveryFee}
                                        onChange={handleDeliveryFeeChange}
                                    />
                                </div>
                                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                    <div>Insurance Fee</div>
                                    <FeeInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={insuranceFee}
                                        onChange={handleInsuranceFeeChange}
                                    />
                                </div>
                                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                    <div>Taxes</div>
                                    <FeeInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tax}
                                        onChange={handleTaxChange}
                                    />
                                </div>
                                <div className="flex items-center justify-between" style={{ fontSize: 13, color: 'var(--sidebar-text-primary)' }}>
                                    <div>Discount</div>
                                    <FeeInput
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={discount}
                                        onChange={handleDiscountChange}
                                    />
                                </div>
                                <div className="flex items-center justify-between" style={{ fontSize: 15, fontWeight: 700, color: 'var(--sidebar-text-primary)', marginTop: 6 }}>
                                    <div>Total</div>
                                    <div>${Number(totalAmount || 0).toFixed(2)}</div>
                                </div>
                            </div>
                            <BottonCustom
                                backgroundColor={''}
                                width={130}
                                title={'Delete'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                className={"bg-red-500"}
                                onClick={handleDeleteLead}
                            />
                            {purchaseStatus === "draft" && (
                                <BottonCustom
                                    backgroundColor={'rgba(67, 121, 238, 1)'}
                                    width={130}
                                    title={'Create Purchase'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleCreatePurchase}
                                />
                            )}
                            {purchaseStatus !== "draft" && (
                                <BottonCustom
                                    backgroundColor={'rgba(67, 121, 238, 1)'}
                                    width={130}
                                    title={'Save Purchase'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handleLogin}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div id="hiddenSection" style={{ display: 'none', width: '1000px', minHeight: '100vh', overflow: 'auto', marginTop: 200 }}>
                <div className="flex justify-center "  >
                    <div className="" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14, width: '1000px' }} ref={mainDivRef}>
                        <div className="flex justify-center mt-10">
                            <Heading
                                Fontweight={700}
                                color={'rgba(0, 0, 0, 1)'}
                                Heading={'Purchase Order'}
                                Fontsize={30}
                                mt={2}
                            // Tailwind CSS classes
                            />
                        </div>

                        <div style={{ margin: 20, borderRadius: 14 }} className="overflow-auto">
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

                            <div className="flex justify-center pb-3 bg-[#0C79F7] ">
                                <Heading
                                    Fontweight={700}
                                    color={'white'}
                                    Heading={'Purchase Details'}
                                    Fontsize={16}
                                />
                            </div>
                            <div className="">
                                <div className="flex flex-wrap justify-between  gap-y-3 mt-5">
                                    {!!poDate && (
                                        <div className="pb-1 px-2">
                                            <Heading
                                                Fontweight={700}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={'PO Date'}
                                                Fontsize={10}
                                            />
                                            <Heading
                                                Fontweight={500}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={poDate}
                                                Fontsize={10}
                                            />
                                        </div>
                                    )}
                                    <div className="pb-1 px-2">
                                        <Heading
                                            Fontweight={700}
                                            color={'rgba(17, 17, 17, 1)'}
                                            Heading={'P.O. No.'}
                                            Fontsize={10}
                                        />
                                        <Heading
                                            Fontweight={500}
                                            color={'rgba(17, 17, 17, 1)'}
                                            Heading={poNo ? poNo : '-'}
                                            Fontsize={10}
                                        />
                                    </div>
                                    {!!selectedPaymentTermDescription && (
                                        <div className="pb-1 px-2">
                                            <Heading
                                                Fontweight={700}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={'Terms'}
                                                Fontsize={10}
                                            />
                                            <Heading
                                                Fontweight={500}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={selectedPaymentTermDescription ? selectedPaymentTermDescription : '-'}
                                                Fontsize={10}
                                            />
                                        </div>
                                    )}
                                    {!!accountNumber && (
                                        <div className="pb-2 px-2">
                                            <Heading
                                                Fontweight={700}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={'Account'}
                                                Fontsize={10}
                                            />
                                            <Heading
                                                Fontweight={500}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={accountNumber ? accountNumber : '-'}
                                                Fontsize={10}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex  items-end mt-5 ml-3 border-t mb-4 pt-4">
                                    <div>
                                        <Heading
                                            Fontweight={700}
                                            color={'rgba(0, 0, 0, 1)'}
                                            Heading={'Vendor'}
                                            Fontsize={10}
                                        />
                                        <div
                                            className={`w-72`}
                                            style={{
                                                color: 'rgba(17, 17, 17, 1)',
                                                whiteSpace: 'pre-wrap',
                                                height: '80px',
                                                overflow: 'auto',
                                                fontSize: 10
                                            }}
                                        >
                                            {description}
                                        </div>
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={700}
                                            color={'rgba(0, 0, 0, 1)'}
                                            Heading={'Ship to'}
                                            Fontsize={10}
                                        />
                                        <div
                                            className={` w-72`}
                                            style={{
                                                color: 'rgba(17, 17, 17, 1)',
                                                whiteSpace: 'pre-wrap',
                                                height: '80px',
                                                overflow: 'auto',
                                                fontSize: 10
                                            }}
                                        >
                                            {shipTo}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {combinedProducts.length > 11 ? (
                                <>
                                    <div className="" >
                                        <AgentTicketListTable
                                            columns={columns2}
                                            data={limitedLineItems}
                                            // invoiceData={totalAmount ? totalAmount : null}
                                            PreviewPurchaseFooter={true}
                                            notes={notes}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="" >
                                    <AgentTicketListTable
                                        columns={columns2}
                                        data={pdfCombinedProducts}
                                        invoiceData={totalAmount ? totalAmount : null}
                                        PreviewPurchase={true}
                                        notes={notes}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div id="hiddenSection2" style={{ display: "none", width: "1000px", overflow: "auto" }}>
                <div className="flex justify-center  ">
                    <div
                        className=" "
                        style={{ backgroundColor: "var(--dashboard-card-bg)", borderRadius: 14, width: "1000px" }}
                        ref={invoiceRef2}
                    >
                        {" "}
                        {/* Update the ref */}
                        <div style={{ margin: 20, borderRadius: 14 }} className="overflow-auto">
                            <div className="">
                                <AgentTicketListTable
                                    columns={columns2}
                                    data={limitedLineItems2}
                                    invoiceData={totalAmount ? totalAmount : null}
                                    PreviewPurchase={true}
                                    notes={notes}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Purchase Order"
                subtitle="Are you sure you want to delete"
                entityName={poNo || "this purchase order"}
                warningMessage="This action cannot be undone. The purchase order will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={loading}
            />
            <UpdateConfirmationModal
                open={showUpdateModal}
                title={
                    updateModalAction === 'draft'
                        ? 'Save as Draft'
                        : updateModalAction === 'create'
                            ? 'Create Purchase Order'
                            : 'Update Purchase Order'
                }
                subtitle={
                    updateModalAction === 'draft'
                        ? 'Are you sure you want to save this purchase order as draft?'
                        : updateModalAction === 'create'
                            ? 'Are you sure you want to create this purchase order?'
                            : 'Are you sure you want to update this purchase order?'
                }
                entityName={poNo || "this purchase order"}
                updateMessage={
                    updateModalAction === 'draft'
                        ? 'This will save the current changes as a draft.'
                        : updateModalAction === 'create'
                            ? 'This will finalize the draft and create an active purchase order.'
                            : 'This will save all the current changes to the purchase order.'
                }
                onCancel={cancelUpdate}
                onUpdate={confirmUpdate}
                isLoading={loading}
            />
        </div>
    );
};

export default EditPurchase;
