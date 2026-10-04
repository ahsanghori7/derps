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
import { getRequestWithOutBody, postRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useNavigate } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";
import { FiPlusSquare } from "react-icons/fi";
import close from "../../assets/close.png";
import logo from "../../assets/logo4k.png";
import locationInvoice from "../../assets/locationInvoice.png";
import contactInvoice from "../../assets/contactInvoice.png";
import mailInvoice from "../../assets/mailInvoice.png";
import { v4 as uuidv4 } from 'uuid'; // Import UUID for unique ID generation
import ItemTable from "../../Components/ItemTable";
import { styled } from '@mui/material/styles';
import addIcon from "../../assets/addIcon.png";
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import website from "../../assets/website.png";
import Spinner from "../../Components/Spinner";
import logo4k from "../../assets/logo4k.png";
import Compressor from 'compressorjs'
import { Button } from "@mui/material";
import UploadFile from "../../Components/UploadFile";

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
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: 10
});

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

const AddPurchase = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const tenantLogo = useSelector((state) => state.auth.tenantLogo);
    const navigate = useNavigate();
    const userData = useSelector((state) => state.userData.userDetails);
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

    const mainDivRef = useRef(); // Create a reference for the main div
    const invoiceRef2 = useRef(); // Create a reference for the main div
    const [poNo, setPoNo] = useState(generateInvoiceNumber(7));
    const [accountNumber, setAccountNumber] = useState("")
    const [dueDate, setDueDate] = useState("")
    const [poDate, setPoDate] = useState("")
    const [subTotal, setSubTotal] = useState(0);
    const [tax, setTax] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [insuranceFee, setInsuranceFee] = useState(0)
    const [discount, setDiscount] = useState(0);
    const [description, setDescription] = useState("")
    const [shipTo, setShipTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
    const [products, setProducts] = useState([{ itemServiceId: 0, barcode: "", brand: "", model: "", quantity: 0, unitPrice: 0, amount: 0 }]);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [vendorList, setVendorList] = useState([]);
    const [selectedAgentType, setSelectedAgentType] = useState(""); // Step 1: Define state
    const [combinedProducts, setCombinedProducts] = useState([]); // New state for combined products
    const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(""); // State to hold selected payment term
    const [draftLoader, setDraftLoader] = useState(false); // State for notes
    const [createLoader, setCreateLoader] = useState(false);
    const [notes, setNotes] = useState(""); // State for notes
    const [uploadedFile, setUploadedFile] = useState(null);

    const [errors, setErrors] = useState({});
    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const [modelOptions, setModelOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);

    const pdfLineItems = combinedProducts.filter((p) => p?.itemServiceId);
    const limitedLineItems = pdfLineItems.slice(0, 11)
    const limitedLineItems2 = pdfLineItems.slice(11)

    const data = [
        { title: "Net 30", description: "Due 30 days", value: "net-30" },
        { title: "Net 60", description: "Due 60 days", value: "net-60" },
        { title: "Due Upon Receipt", description: "Due Upon Receipt", value: "due-receipt" },
        { title: "COD (Cash On Delivery)", description: "Cash On Delivery", value: "cash-on-delivery" },
        { title: "EOM (End Of Month)", description: "End Of Month", value: "eom" },
        { title: "Payment in Advance", description: "Payment in Advance", value: "advance-payment" }
    ];

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

    useEffect(() => {
        const computedSubTotal = products.reduce((sum, product) => sum + (Number(product.amount) || 0), 0);
        setSubTotal(computedSubTotal);
        const safeTax = Number(tax) || 0;
        const safeDeliveryFee = Number(deliveryFee) || 0;
        const safeInsuranceFee = Number(insuranceFee) || 0;
        const safeDiscount = Number(discount) || 0;
        setTotalAmount(computedSubTotal + safeTax + safeDeliveryFee - safeInsuranceFee - safeDiscount);
    }, [products, tax, deliveryFee, insuranceFee, discount]);

    useEffect(() => {
        fetchData()
        fetchSupportSetupOptions('model', setModelOptions);
        fetchSupportSetupOptions('brand', setBrandOptions);
    }, [])

    const handleAddProductClick = () => {
        setProducts([...products, { itemServiceId: 0, barcode: "", brand: "", model: "", quantity: 0, unitPrice: 0, amount: 0 }]);
    };
    const handleAccountNumberChange = (e) => {
        setAccountNumber(e.target.value);
    };
    const handleNotesChange = (e) => {
        setNotes(e.target.value);
    };

    const handleFileUpload = (file) => {
        setUploadedFile(file);
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

    const handlePoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setPoDate(formattedDate);
        clearError("poDate");

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
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        if (poDate && new Date(formattedDate) < new Date(poDate)) {
            toast.error("Due date cannot be before PO date.");
            return;
        }

        setDueDate(formattedDate);
        clearError("dueDate");
    };

    const selectedPaymentTermDescription = data.find(term => term.value === selectedPaymentTerm)?.description || "";

    const handleRemoveProductClick = (index) => {
        const newProducts = [...products];
        newProducts.splice(index, 1);
        if (newProducts.length === 0) {
            newProducts.push({ itemServiceId: 0, barcode: "", brand: "", model: "", quantity: 0, unitPrice: 0, amount: 0 });
        }
        setProducts(newProducts);

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
                accountId: selectedItem.accountId
            };
            setProducts(newProducts);
        } else if (field === "barcode") {
            const raw = String(value ?? "");
            const scanned = raw.trim();
            newProducts[index][field] = scanned;

            const matchedItem = itemServicesList.find((item) => {
                const itemBarcode = String(item?.barcode ?? "").trim();
                return itemBarcode && scanned && itemBarcode === scanned;
            });

            if (matchedItem) {
                newProducts[index] = {
                    ...newProducts[index],
                    itemServiceId: matchedItem.id,
                    barcode: String(matchedItem?.barcode || scanned),
                    quantity: Math.max(1, Number(newProducts[index]?.quantity) || 1),
                    unitPrice: matchedItem.costPrice,
                    amount: (Math.max(1, Number(newProducts[index]?.quantity) || 1)) * (Number(matchedItem.costPrice) || 0),
                    accountId: matchedItem.accountId,
                };
                setProducts(newProducts);
            } else {
                setProducts(newProducts);
            }
        } else {
            newProducts[index][field] = value;
            if (field === "quantity" || field === "unitPrice") {
                newProducts[index].amount = newProducts[index].quantity * newProducts[index].unitPrice;
            }
            setProducts(newProducts);
        }

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
    const handleInsuranceFeeChange = (e) => {
        setInsuranceFee(sanitizeDecimalInput(e.target.value));
    };
    const handleDiscountChange = (e) => {
        setDiscount(sanitizeDecimalInput(e.target.value));
    };
    const handleShipToChange = (e) => {
        setShipTo(e.target.value);
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
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

    const handleAgentChange = (value) => {
        const selectedAgent = vendorList.find(agent => agent.companyName === value);
        setSelectedAgentType(selectedAgent ? selectedAgent.id : "");
        clearError("selectedAgentType");

        if (selectedAgent) {
            setDescription(`${selectedAgent.companyName}\n${selectedAgent.email}`);

            // Set shipTo to vendor address
            const vendorAddress = [
                selectedAgent.address || '',
                selectedAgent.city || '',
                selectedAgent.state || '',
                selectedAgent.zipCode || ''
            ].filter(part => part.trim()).join(', ');

            setShipTo(vendorAddress || "");
        } else {
            // Reset to default if no vendor selected
            setShipTo("");
        }
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

        const needsSecondPage = pdfLineItems.length > 11

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

    const columns = [
        { id: 'item', label: 'ITEM', align: 'center' },
        { id: 'barcode', label: 'BARCODE', align: 'center' },
        { id: 'brand', label: 'BRAND', align: 'center' },
        { id: 'model', label: 'MODEL', align: 'center' },
        // { id: 'description', label: 'ITEM DESCRIPTION', align: 'center' },
        { id: 'quantity', label: 'QUANTITY', align: 'center' },
        { id: 'unitPrice', label: 'UNIT PRICE', align: 'center' },
        { id: 'amount', label: 'AMOUNT', align: 'center' },
        { id: 'delete', label: 'DELETE', align: 'center' },
    ];
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
    const validatePurchaseOrder = ({ isDraft = false }) => {
        const errors = [];

        // Vendor
        if (!selectedAgentType && !isDraft) {
            errors.push("Vendor is required");
        }

        // Payment terms
        if (!selectedPaymentTerm && !isDraft) {
            errors.push("Payment term is required");
        }

        // Due date
        if (!dueDate && !isDraft) {
            errors.push("Due date is required");
        }

        // PO date
        if (!poDate && !isDraft) {
            errors.push("PO date is required");
        }

        // PO Number
        // if (!poNo || poNo.trim() === "") {
        //     errors.push("PO Number is required");
        // }

        // Products
        const validProducts = products.filter(p => p.itemServiceId !== 0);

        if (!isDraft && validProducts.length === 0) {
            errors.push("At least one item is required");
        }

        validProducts.forEach((p, index) => {
            if (!p.itemServiceId) {
                errors.push(`Item is required in row ${index + 1}`);
            }
            const missingFields = [];
            if (!p.brand || String(p.brand).trim() === "") missingFields.push("Brand");
            if (!p.model || String(p.model).trim() === "") missingFields.push("Model");
            if (missingFields.length > 0) {
                errors.push(`${missingFields.join(" and ")} ${missingFields.length > 1 ? "are" : "is"} required in row ${index + 1}`);
            }
            if (!p.quantity || p.quantity <= 0) {
                errors.push(`Quantity must be greater than 0 in row ${index + 1}`);
            }
            if (!p.unitPrice || p.unitPrice <= 0) {
                errors.push(`Unit price must be greater than 0 in row ${index + 1}`);
            }
        });

        // Total
        if (!isDraft && totalAmount <= 0) {
            errors.push("Total amount must be greater than zero");
        }

        // Account number (optional format check)
        if (accountNumber && !/^[a-zA-Z0-9-_]+$/.test(accountNumber)) {
            errors.push("Account number format is invalid");
        }
        return errors;
    };

    const handleDraft = async () => {
        setDraftLoader(true);

        const fieldErrors = {};
        if (!selectedAgentType) fieldErrors.selectedAgentType = true;
        if (!poDate) fieldErrors.poDate = true;
        if (!dueDate) fieldErrors.dueDate = true;
        if (!selectedPaymentTerm) fieldErrors.selectedPaymentTerm = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Please fill all the required fields");
            setDraftLoader(false);
            return;
        }

        const validProducts = products.filter(p => p.itemServiceId !== 0);
        if (validProducts.length === 0) {
            toast.error("At least one item is required");
            setDraftLoader(false);
            return;
        }

        const productErrors = [];
        validProducts.forEach((p, index) => {
            const missing = [];
            if (!p.brand || String(p.brand).trim() === "") missing.push("Brand");
            if (!p.model || String(p.model).trim() === "") missing.push("Model");
            if (missing.length > 0) productErrors.push(`${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} required in row ${index + 1}`);
            if (!p.quantity || p.quantity <= 0) productErrors.push(`Quantity must be greater than 0 in row ${index + 1}`);
            if (!p.unitPrice || p.unitPrice <= 0) productErrors.push(`Unit price must be greater than 0 in row ${index + 1}`);
        });

        if (productErrors.length > 0) {
            productErrors.forEach(err => toast.error(err));
            setDraftLoader(false);
            return;
        }

        if (totalAmount <= 0) {
            toast.error("Total amount must be greater than zero");
            setDraftLoader(false);
            return;
        }

        if (accountNumber && !/^[a-zA-Z0-9-_]+$/.test(accountNumber)) {
            toast.error("Account number format is invalid");
            setDraftLoader(false);
            return;
        }

        setErrors({});

        if (!accessToken) {
            toast.error("Authentication token not available");
            setDraftLoader(false);
            return;
        }

        setLoading(true);

        let orderDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        try {
            const uploadedFiles = await uploadPurchaseFiles();
            const apiData = {
                status: "draft",
                orderDate: orderDate,
            };

            const filteredProducts = products.filter(product => product.amount !== 0);
            const itemsWithAccounts = filteredProducts.map(p => ({
                ...p,
                brandId: resolveSupportSetupId(brandOptions, p?.brand),
                modelId: resolveSupportSetupId(modelOptions, p?.model),
                quantity: Number.isFinite(parseInt(p.quantity, 10)) ? Math.max(1, parseInt(p.quantity, 10)) : 1,
                accountId: p.accountId ?? itemServicesList.find(item => item.id === p.itemServiceId)?.accountId,
            }));
            
            if (itemsWithAccounts.length > 0) apiData.items = itemsWithAccounts;
            if (totalAmount) apiData.totalAmount = parseFloat(totalAmount.toFixed(2));
            apiData.subTotal = parseFloat(Number(subTotal || 0).toFixed(2));
            apiData.tax = parseFloat(Number(tax || 0).toFixed(2));
            apiData.deliveryFee = parseFloat(Number(deliveryFee || 0).toFixed(2));
            apiData.insurance = parseFloat(Number(insuranceFee || 0).toFixed(2));
            apiData.discount = parseFloat(Number(discount || 0).toFixed(2));
            if (selectedAgentType) apiData.vendorId = selectedAgentType;
            if (accountNumber?.trim()) apiData.accountNumber = accountNumber.trim();
            if (dueDate) apiData.dueDate = dueDate;
            if (poNo?.trim()) apiData.poNo = poNo.trim();
            apiData.paymentTerms = selectedPaymentTerm;
            if (notes?.trim()) apiData.notes = notes.trim();
            if (poDate) apiData.poDate = poDate;
            if (uploadedFiles.length > 0) apiData.files = uploadedFiles;

            // Validate payload before sending
            if (!apiData.status || !apiData.orderDate) {
                toast.error("Invalid draft data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}purchase-order`, accessToken, apiData);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            console.error('Purchase order draft creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid draft data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create draft purchase orders");
                } else if (status === 404) {
                    toast.error("Vendor or item not found");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
            setDraftLoader(false);
        }
    };
    const handleLogin = async () => {
        setCreateLoader(true);

        const fieldErrors = {};
        if (!selectedAgentType) fieldErrors.selectedAgentType = true;
        if (!poDate) fieldErrors.poDate = true;
        if (!dueDate) fieldErrors.dueDate = true;
        if (!selectedPaymentTerm) fieldErrors.selectedPaymentTerm = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Please fill all the required fields");
            setCreateLoader(false);
            return;
        }

        const validProducts = products.filter(p => Number(p?.itemServiceId) !== 0);
        if (validProducts.length === 0) {
            toast.error("Please add at least one item to the purchase order");
            setCreateLoader(false);
            return;
        }

        const productErrors = [];
        validProducts.forEach((p, index) => {
            const missing = [];
            if (!p.brand || String(p.brand).trim() === "") missing.push("Brand");
            if (!p.model || String(p.model).trim() === "") missing.push("Model");
            if (missing.length > 0) productErrors.push(`${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} required in row ${index + 1}`);
            if (!p.quantity || p.quantity <= 0) productErrors.push(`Quantity must be greater than 0 in row ${index + 1}`);
            if (!p.unitPrice || p.unitPrice <= 0) productErrors.push(`Unit price must be greater than 0 in row ${index + 1}`);
        });

        if (productErrors.length > 0) {
            productErrors.forEach(err => toast.error(err));
            setCreateLoader(false);
            return;
        }

        if (!totalAmount || totalAmount <= 0) {
            toast.error("Total amount must be greater than 0");
            setCreateLoader(false);
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            setCreateLoader(false);
            return;
        }

        setErrors({});

        let orderDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        // Proceed with login logic
        setLoading(true);
        try {
            const uploadedFiles = await uploadPurchaseFiles();
            const filteredProducts = products.filter(p => Number(p?.itemServiceId) !== 0);
            const apiData = {
                "poNo": poNo?.trim() || null,
                "orderDate": orderDate,
                "totalAmount": parseFloat(Number(totalAmount).toFixed(2)),
                "items": filteredProducts.map(p => ({
                    ...p,
                    brandId: resolveSupportSetupId(brandOptions, p?.brand),
                    modelId: resolveSupportSetupId(modelOptions, p?.model),
                    quantity: Number.isFinite(parseInt(p.quantity, 10)) ? Math.max(1, parseInt(p.quantity, 10)) : 1,
                    accountId: p.accountId ?? itemServicesList.find(item => item.id === p.itemServiceId)?.accountId,
                })),
                "status": "active",
                "vendorId": selectedAgentType,
            };
            apiData.subTotal = parseFloat(Number(subTotal || 0).toFixed(2));
            apiData.tax = parseFloat(Number(tax || 0).toFixed(2));
            apiData.deliveryFee = parseFloat(Number(deliveryFee || 0).toFixed(2));
            apiData.insurance = parseFloat(Number(insuranceFee || 0).toFixed(2));
            apiData.discount = parseFloat(Number(discount || 0).toFixed(2));
            if (accountNumber?.trim()) apiData.accountNumber = accountNumber.trim();
            if (dueDate) apiData.dueDate = dueDate;
            if (poDate) apiData.poDate = poDate;
            apiData.paymentTerms = selectedPaymentTerm;
            if (notes?.trim()) apiData.notes = notes.trim();
            if (uploadedFiles.length > 0) apiData.files = uploadedFiles;

            // Validate payload before sending
            if (!apiData.vendorId || !apiData.items || apiData.items.length === 0) {
                toast.error("Invalid purchase order data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}purchase-order`, accessToken, apiData);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            navigate(-1);
            toast.success(result.message);
        } catch (error) {
            console.error('Purchase order creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid purchase order data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create purchase orders");
                } else if (status === 404) {
                    toast.error("Vendor or item not found");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
            setCreateLoader(false);
        }
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
                                    Heading={'Purchase Order'}
                                    Fontsize={30}
                                />
                            </div>
                            <BottonWithIcon
                                backgroundColor={'#0C79F7'}
                                icon={addIcon}
                                width={145}
                                title={'Add Vendor'}
                                height={35}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleButtonClick}
                            />
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
                                        // className={'w-[100%]'}
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
                                            <DropdownMenu
                                                menuItems={vendorList.map(customer => ({ name: customer.companyName }))}
                                                defaultText={'Select Vendor'}
                                                newCreateInvoice={true}
                                                onSelect={handleAgentChange}
                                                searchable={true}
                                                border={errors.selectedAgentType ? "1px solid #ef4444" : undefined}
                                            />
                                        </div>
                                        <div className="" >
                                            <LabeledInput
                                                label="Account Number"
                                                inputPlaceholder="Enter Account Number"
                                                inputValue={accountNumber}
                                                onInputChange={handleAccountNumberChange}
                                                newCreateInvoice={true}
                                            />
                                        </div>

                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={<span>PO Date<span style={{ color: 'red' }}>*</span></span>}
                                                Fontsize={10}
                                                mb={2}
                                            // Tailwind CSS classes
                                            />
                                            <CustomDatePicker
                                                value={poDate}
                                                onChange={handlePoDateChange}
                                                label="PO Date"
                                                newCreateInvoice={true}
                                                fieldError={!!errors.poDate}
                                            />
                                        </div>
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                // Heading={'Due Date'}
                                                Heading={<span>Due Date<span style={{ color: 'red' }}>*</span></span>}
                                                Fontsize={10}
                                                mb={2}
                                            // Tailwind CSS classes
                                            />
                                            <CustomDatePicker
                                                value={dueDate}
                                                onChange={handleDueDateChange}
                                                label="Due Date"
                                                newCreateInvoice={true}
                                                minDate={poDate ? dayjs(poDate) : undefined}
                                                fieldError={!!errors.dueDate}
                                            />
                                        </div>



                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                // Heading={'Payment Terms'}
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
                                                    clearError("selectedPaymentTerm");
                                                    const calculatedDueDate = calculateDueDate(value);
                                                    if (calculatedDueDate) {
                                                        setDueDate(calculatedDueDate);
                                                    }
                                                }}
                                                newCreateInvoice={true}
                                                border={errors.selectedPaymentTerm ? "1px solid #ef4444" : undefined}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap   gap-4">
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Vendor'}
                                                Fontsize={10}
                                            // Tailwind CSS classes
                                            />
                                            <div
                                                className={`mt-0.5 p-1 w-36 h-16`}
                                                style={{
                                                    border: '1px solid var(--sidebar-selected-bg)',
                                                    borderRadius: 4,
                                                    backgroundColor: 'var(--dashboard-tab-box)',
                                                    whiteSpace: 'pre-wrap',
                                                    height: '64px',
                                                    overflow: 'auto',
                                                    fontSize: 10,
                                                    color: 'var(--sidebar-text-primary)'
                                                }}
                                            >
                                                {description}
                                            </div>
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
                                        <div>
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Ship To'}
                                                Fontsize={10}
                                            // Tailwind CSS classes
                                            />
                                            <div
                                                className={`mt-0.5 p-1 w-36 h-16`}
                                                style={{
                                                    border: '1px solid var(--sidebar-selected-bg)',
                                                    borderRadius: 4,
                                                    backgroundColor: 'var(--dashboard-tab-box)',
                                                    whiteSpace: 'pre-wrap',
                                                    height: '64px',
                                                    overflow: 'auto',
                                                    fontSize: 10,
                                                    color: 'var(--sidebar-text-primary)'
                                                }}
                                            >
                                                {shipTo}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                        Heading={poDate || new Date().toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit'
                                        })}
                                        Fontsize={12}
                                    />
                                </div> */}
                                <div style={{ backgroundColor: 'var(--dashboard-tab-box)', borderRadius: '0 12px 12px 0' }} className="py-2 px-3 flex flex-col items-center" >
                                    <Heading
                                        Fontweight={600}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'P.O. No.'}
                                        Fontsize={12}
                                    />
                                    <Heading
                                        Fontweight={600}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={poNo || '-'}
                                        Fontsize={12}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>

                            <div className="mt-4">
                                <ItemTable
                                    columns={columns}
                                    data={itemServicesList}
                                    newCreateInvoicetable={true}
                                    leadsTable={true}
                                    PreviewPurchase={true}
                                    // invoiceTable={true}
                                    totalAmount={totalAmount} // Pass the total amount to ItemTable
                                    products={products} // Pass products to ItemTable
                                    onSelectItem={handleProductChange}
                                    onAddItem={handleAddProductClick} // Pass the add item handler to ItemTable
                                    // Pass the handler to ItemTable
                                    onRemoveItem={handleRemoveProductClick} // Pass the remove item handler to ItemTable
                                    brandOptions={brandOptions}
                                    modelOptions={modelOptions}
                                />
                            </div>

                        </div>
                    </div>
                    <div style={{ display: '' }} className="flex justify-between mt-10 p-3 gap-3 m-4" >
                        <div className="flex gap-3">
                            <BottonCustom
                                backgroundColor={'rgba(8, 226, 8, 1)'}
                                width={130}
                                title={'Download'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleDownload} // Change onClick to handleDownload
                            />
                            <BottonCustom
                                backgroundColor={'rgba(62, 62, 62, 0.5)'}
                                width={130}
                                title={draftLoader ? <Spinner /> : 'Save'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleDraft}
                                disabled={draftLoader}
                            />
                        </div>
                        <div className="flex items-end gap-3">
                            <div style={{ minWidth: 240 }}>
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
                                backgroundColor={'rgba(67, 121, 238, 1)'}
                                width={135}
                                title={createLoader ? <Spinner /> : 'Create Purchase'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                disabled={createLoader}
                                onClick={handleLogin}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div id="hiddenSection" style={{ display: "none", width: '1000px', minHeight: '100vh', overflow: 'auto', marginTop: 200 }}>
                <div className="flex justify-center  "  >
                    <div className=" " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14, width: '1000px' }} ref={mainDivRef}>
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

                            <div className="flex justify-center  pb-3 bg-[#0C79F7] ">
                                <Heading
                                    Fontweight={700}
                                    color={'white'}
                                    Heading={'Purchase Details'}
                                    Fontsize={16}
                                />
                            </div>
                            <div className="">
                                <div className="flex flex-wrap justify-between  gap-y-3 mt-5">
                                    {/* <div className="pb-1 px-2">
                                        <Heading
                                            Fontweight={700}
                                            color={'rgba(17, 17, 17, 1)'}
                                            Heading={'Date'}
                                            Fontsize={10}
                                        />
                                        <Heading
                                            Fontweight={500}
                                            color={'rgba(17, 17, 17, 1)'}
                                            Heading={new Date().toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            })}
                                            Fontsize={10}
                                        />
                                    </div> */}
                                    {!!poDate && (
                                        <div className="pb-1 px-2">
                                            <Heading
                                                Fontweight={700}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={'P.O. Date'}
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
                                                Heading={selectedPaymentTermDescription}
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
                            {pdfLineItems.length > 11 ? (
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
                                        data={pdfLineItems}
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

                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddPurchase;
