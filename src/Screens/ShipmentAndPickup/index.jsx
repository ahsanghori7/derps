import Heading from "../../Components/Heading"
import Stepper from "../../Components/Stepper";
import { useEffect, useMemo, useRef, useState } from "react";
import LabeledInput from "../../Components/LabeledInput";
import BottonCustom from "../../Components/ButtonCustom";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getRequestWithOutBody, postRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch";
import {
    getPublicApplicationPreferences,
    getPublicItemCategories,
    submitPublicApplicationStep,
    uploadPublicApplicationFile,
} from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import {
    isAuthorizeNetNotConfiguredError,
    parseAuthorizeNetErrorMessage,
} from "../../Api/authorizeNetApi";
import Loader from "../../Components/Loader";
import NoDataFound from "../../Components/NoDataFound";
import UploadFile from "../../Components/UploadFile";
import Checkbox from '@mui/material/Checkbox'; // Import Checkbox
import { Radio } from "@mui/material";
import { SVG } from "../../assets/svg";
import DropdownMenu from "../../Components/dropdownMenu";
import { countries } from 'countries-list';
import CustomDatePicker from "../../Components/CustomDatePicker";
import CustomTimePicker from "../../Components/CustomTimePicker";
import { Switch } from "@headlessui/react";
import dayjs from "dayjs";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import AgentTicketListTable from "../../Components/AgentsTicketListTable";
import logo4k from "../../assets/logo4k.png";
import locationInvoice from "../../assets/locationInvoice.png";
import contactInvoice from "../../assets/contactInvoice.png";
import mailInvoice from "../../assets/mailInvoice.png";
import website from "../../assets/website.png";
import Compressor from 'compressorjs'
import SmallTable from "../../Components/SmallTable";
import { usStates } from "../../types/Data";
import { getTenantPhone, getTenantEmail, getTenantWebsite, getTenantAddress } from "../../Utils/helper";
import { APPLICATION_STEPS, goToPreviousWizardStep, isGuestSession } from "../../Utils/applicationNavigation";
import { writePublicApplicationDraft } from "../../features/applications/screens/PublicApplication";
import { getPreferenceOptions, getMissingRequiredPreferences, isPreferenceRequired, isPreferenceValueFilled } from "../../Utils/preferenceExtra";



const MERCHANT_OWNED_FORM_NAMES = {
    'atm': 'merchantOwnedAtm',
    'credit-card': 'merchantOwnedCreditCard',
    'cash-advance': 'merchantOwnedCashAdvance',
    'pos': 'merchantOwnedPos',
    'ebt': 'merchantOwnedEbt',
    'airvac': 'merchantOwnedAirvac',
    'website': 'merchantOwnedWebsite',
    'ach-processing': 'merchantOwnedAchProcessing',
};

const getMerchantOwnedFormName = (solution) =>
    MERCHANT_OWNED_FORM_NAMES[(solution || "").toLowerCase()] || null;

const sortByOrder = (items = []) =>
    [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const createDefaultShipmentForm = () => ({
    shipmentType: 'Shipping',
    paymentType: 'Pay Now',
    shippingAddress: "",
    pickupLocation: "",
    email: "",
    recipientName: "",
    pickupLocationName: "",
    companyName: "",
    recipientPhone: "",
    floorStreet: "",
    city: "",
    country: "United States",
    state: "",
    zipCode: "",
    contactName: "",
    specialInstructions: "",
    pickupDate: "",
    merchantOwnedPreferences: {},
    nameOnCard: "",
    expiryDate: "",
    cardNumber: "",
    cvv: "",
    address: "",
    leaseTerm: "",
    monthlyPayment: "",
    startDate: "",
    billingAddress: "",
});

const generateInvoiceNumber = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const isItemInStock = (item) => item?.isStock === true || item?.inStock === true;

const getItemPayableAmount = (item, isMerchantTaxExempt) => {
    const itemSubtotal = (item?.price ?? 0) * (item?.quantity ?? 0);
    const itemTax =
        !item?.product?.taxExempt && !isMerchantTaxExempt
            ? itemSubtotal * 0.1025
            : 0;
    return itemSubtotal + itemTax;
};

const getInStockPaymentAmount = (items, isMerchantTaxExempt) => {
    if (!items?.length) return 0;
    const total = items
        .filter(isItemInStock)
        .reduce((sum, item) => sum + getItemPayableAmount(item, isMerchantTaxExempt), 0);
    return parseFloat(total.toFixed(2));
};

const isValidLuhnCardNumber = (cardNumber) => {
    const digits = String(cardNumber).replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let digit = parseInt(digits[i], 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
};

const getAuthorizeExpirationDate = (rawExpiryDate) => {
    if (!rawExpiryDate || rawExpiryDate === 'Invalid Date') return "";

    const parsed = dayjs(rawExpiryDate, ['MM/YYYY', 'MM/YY', 'MMYY', 'YYYY-MM'], true);
    if (parsed.isValid()) {
        return parsed.format('MMYY');
    }

    const parts = String(rawExpiryDate).split('/');
    if (parts.length === 2) {
        const month = parts[0].padStart(2, '0');
        let year = parts[1].trim();
        if (year.length === 4) year = year.slice(-2);
        if (/^\d{2}$/.test(month) && /^\d{2}$/.test(year)) {
            return `${month}${year}`;
        }
    }

    return "";
};

const buildAuthorizeNetPayment = ({ cardNumber, expiryDate, cvv, amount }) => ({
    amount: parseFloat(Number(amount || 0).toFixed(2)),
    card: {
        cardNumber: String(cardNumber || '').replace(/\s/g, ''),
        expirationDate: getAuthorizeExpirationDate(expiryDate),
        cardCode: String(cvv || '').trim(),
    },
});

const hasMeaningfulMerchantOwnedDetails = (details) => {
    if (!details || typeof details !== 'object') return false;
    return Object.values(details).some((value) => {
        if (value === null || value === undefined || value === '') return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
    });
};

const buildShipmentFormFromAppData = (data, isOwnHardware) => {
    const form = createDefaultShipmentForm();
    const shipment = data?.shipment;
    const purchasedHardware = (Array.isArray(data?.hardware) ? data.hardware : data?.hardware ? [data.hardware] : [])
        .filter((hw) => hw && !hw.isDeleted);
    const hasPurchasedHardware = !isOwnHardware && purchasedHardware.length > 0;
    const isMerchantOwned =
        isOwnHardware
        || (
            !hasPurchasedHardware
            && (
                shipment?.type === 'MerchantOwned'
                || shipment?.type === 'merchantowned'
                || hasMeaningfulMerchantOwnedDetails(shipment?.merchantOwnedDetails)
            )
        );

    if (isMerchantOwned) {
        form.shipmentType = 'MerchantOwned';
        form.paymentType = '';
        form.merchantOwnedPreferences = {
            ...(shipment?.merchantOwnedDetails || {}),
        };
        return form;
    }

    if (shipment?.shippingDetails) {
        form.shipmentType = 'Shipping';
        form.email = shipment.shippingDetails?.email || "";
        form.recipientName = shipment.shippingDetails?.recipientName || "";
        form.recipientPhone = shipment.shippingDetails?.phoneNumber || "";
        form.shippingAddress = shipment.shippingDetails?.address || "";
        form.floorStreet = shipment.shippingDetails?.floorStreet || "";
        form.city = shipment.shippingDetails?.city || data?.businessCity || "";
        form.country = shipment.shippingDetails?.country || "United States";
        form.state = shipment.shippingDetails?.state || "";
        form.zipCode = shipment.shippingDetails?.zipCode || "";
        form.companyName = shipment.shippingDetails?.companyName || "";
    } else if (shipment?.pickupDetails) {
        form.specialInstructions = shipment.specialInstructions || "";
        form.shipmentType = 'Pickup';
        form.contactName = shipment.pickupDetails?.contactName || "";
        form.pickupLocationName = shipment.pickupDetails?.pickupLocationName || "";
        form.pickupDate = shipment.pickupDetails?.pickupDate || "";
    } else {
        form.shipmentType = 'Shipping';
        form.email = data?.email || "";
        form.recipientName = data?.businessName || "";
        form.recipientPhone = data?.dbaPhoneNumber || "";
        form.shippingAddress = data?.dbaAddress || "";
        form.city = data?.businessCity || "";
        form.country = "United States";
        form.state = data?.businessState || "";
        form.zipCode = data?.businessZipCode || "";
        form.contactName = data?.dbaPhoneNumber || "";
        form.pickupLocationName = data?.businessName || "";
    }

    const hardwareItems = (Array.isArray(data?.hardware) ? data.hardware : [data?.hardware]).filter(Boolean);
    const hasInStockItem = hardwareItems.some(isItemInStock);
    const paymentTypeValue = data?.paymentMethod;

    if (paymentTypeValue === 'card') {
        form.paymentType = hasInStockItem ? "Pay Now" : "Pay Later";
        if (hasInStockItem) {
            form.nameOnCard = data.cardDetails?.nameOnCard || data?.businessName || "";
            form.cardNumber = data.cardDetails?.cardNumber || "";
            form.expiryDate = data.cardDetails?.expiryDate || "";
            form.cvv = data.cardDetails?.cvv || "";
            form.address = data.cardDetails?.billingAddress || data.dbaAddress || "";
        }
    } else if (paymentTypeValue === 'paylater') {
        form.paymentType = "Pay Later";
    } else if (paymentTypeValue === 'lease') {
        form.paymentType = "Lease";
        form.leaseTerm = data.leaseDetails?.leaseTerm || "";
        form.monthlyPayment = data.leaseDetails?.monthlyPayment || "";
        form.startDate = data.leaseDetails?.startDate || "";
        form.billingAddress = data.leaseDetails?.billingAddress || data.dbaAddress || "";
    } else {
        form.paymentType = hasInStockItem ? "Pay Now" : "Pay Later";
    }

    return form;
};

const ShipmentAndPickup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const tenantPhone = getTenantPhone(userData);
    const tenantEmail = getTenantEmail(userData);
    const tenantWebsite = getTenantWebsite(userData);
    const tenantAddress = getTenantAddress(userData);
    const roleTitleNormalized = (userData?.roleTitle || "").toLowerCase();
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;
    const mainDivRef = useRef();
    const hasOwnHardwareByApp = location.state?.hasOwnHardwareByApp || {};

    const applicationIds = (() => {
        if (location.state?.applicationIds?.length) return location.state.applicationIds;
        const fromApps = (location.state?.applications || [])
            .map((app) => app.applicationId || app.id)
            .filter(Boolean);
        if (fromApps.length) return fromApps;
        return [
            location.state?.applicationId
            || location.state?.seventhStep?.applicationId,
        ].filter(Boolean);
    })();

    const applications = useMemo(() => {
        const fromState = location.state?.applications || [];
        if (fromState.length > 0) {
            return fromState.filter((app) => app?.applicationId && app?.solution);
        }
        return [];
    }, [location.state?.applications]);

    const getApplicationPayloadFields = (applicationId) => {
        if (applicationIds.length > 1) {
            return { applicationIds };
        }
        return {
            applicationId:
                applicationId
                || applicationIds[0]
                || location.state?.applicationId
                || location.state?.seventhStep?.applicationId,
        };
    };

    const [invoiceNo, setInvoiceNo] = useState(generateInvoiceNumber(7));
    const [loading, setLoading] = useState(false);
    const [fetchedData, setFetchedData] = useState(null);
    const [fetchedDataByApp, setFetchedDataByApp] = useState({});
    const [shipmentFormByApp, setShipmentFormByApp] = useState({});
    const [lineItemsByApp, setLineItemsByApp] = useState({});
    const [totalsByApp, setTotalsByApp] = useState({});
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const countryOptions = Object.entries(countries)
        .map(([code, { name }]) => ({
            title: name,
            id: name,
            value: name,
        }))
        .sort((a, b) => a.title.localeCompare(b.title));
    const [pdfUrl, setPdfUrl] = useState(null);
    const [merchantId, setMerchantId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const signatureRef = useRef();
    const [signatureDataUrl, setSignatureDataUrl] = useState(null);
    const [isSigned, setIsSigned] = useState(false); // tracks whether signature was submitted
    const [finalPdfBlob, setFinalPdfBlob] = useState(null); // or useRef if preferred
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [merchantOwnedPreferenceDefs, setMerchantOwnedPreferenceDefs] = useState([]);
    const [showRequiredErrors, setShowRequiredErrors] = useState(false);
    const [serviceOptions, setServiceOptions] = useState([]);

    const getServiceMeta = (solution) => {
        const normalizedSolution = (solution || "").toLowerCase();
        return serviceOptions.find((option) => option.value === normalizedSolution) || null;
    };

    const getServiceLabel = (solution) => getServiceMeta(solution)?.text || solution;

    const getServiceDescription = (solution) => {
        const meta = getServiceMeta(solution);
        if (meta?.description) return meta.description;
        const label = getServiceLabel(solution);
        return `Choose shipping, pickup, or merchant-owned equipment for ${label}.`;
    };

    const resolvedApplications = useMemo(() => {
        if (applications.length > 0) {
            return applications;
        }

        const fallbackId =
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.seventhStep?.applicationId;

        const fallbackSolution =
            location.state?.seventhStep?.solution
            || Object.values(fetchedDataByApp)[0]?.solution;

        if (fallbackId && fallbackSolution) {
            return [{ applicationId: fallbackId, solution: fallbackSolution }];
        }

        return [];
    }, [applications, applicationIds, location.state?.applicationId, location.state?.seventhStep, fetchedDataByApp]);

    // Keep the same application sequence across every wizard step (by applicationIds).
    const sortedApplications = useMemo(() => {
        if (!resolvedApplications.length) return [];
        if (!applicationIds.length) return resolvedApplications;

        const byId = new Map(
            resolvedApplications.map((app) => [String(app.applicationId), app])
        );
        const ordered = [];
        const seen = new Set();

        applicationIds.forEach((id) => {
            const key = String(id);
            const app = byId.get(key);
            if (app && !seen.has(key)) {
                ordered.push(app);
                seen.add(key);
            }
        });

        resolvedApplications.forEach((app) => {
            const key = String(app.applicationId);
            if (!seen.has(key)) {
                ordered.push(app);
                seen.add(key);
            }
        });

        return ordered;
    }, [resolvedApplications, applicationIds]);

    const getShipmentForm = (applicationId) =>
        shipmentFormByApp[applicationId] || createDefaultShipmentForm();

    const updateShipmentForm = (applicationId, updates) => {
        setShipmentFormByApp((prev) => ({
            ...prev,
            [applicationId]: {
                ...(prev[applicationId] || createDefaultShipmentForm()),
                ...updates,
            },
        }));
    };

    const updateMerchantOwnedPreference = (applicationId, fieldName, value) => {
        const form = getShipmentForm(applicationId);
        updateShipmentForm(applicationId, {
            merchantOwnedPreferences: {
                ...(form.merchantOwnedPreferences || {}),
                [fieldName]: value,
            },
        });
    };

    const getMerchantOwnedPreferencesForSolution = (solution) => {
        const formName = getMerchantOwnedFormName(solution);
        if (!formName) return [];
        return sortByOrder(
            merchantOwnedPreferenceDefs.filter((item) => item.formName === formName)
        );
    };

    const getHasOwnHardwareFromState = (applicationId) => {
        if (!hasOwnHardwareByApp || typeof hasOwnHardwareByApp !== 'object') return undefined;
        if (Object.prototype.hasOwnProperty.call(hasOwnHardwareByApp, applicationId)) {
            return Boolean(hasOwnHardwareByApp[applicationId]);
        }
        if (Object.prototype.hasOwnProperty.call(hasOwnHardwareByApp, String(applicationId))) {
            return Boolean(hasOwnHardwareByApp[String(applicationId)]);
        }
        return undefined;
    };

    const resolveOwnHardwareFlag = (applicationId, data, hardwareList) => {
        const fromState = getHasOwnHardwareFromState(applicationId);
        if (fromState !== undefined) return fromState;

        if (
            location.state?.hasOwnHardware === true
            || location.state?.sixthStep?.hasOwnHardware === true
            || location.state?.seventhStep?.hasOwnHardware === true
        ) {
            return true;
        }

        const activeHardware = dedupeHardwareByItemServiceId(hardwareList ?? data?.hardware);
        if (activeHardware.length > 0) return false;

        if (
            location.state?.hasOwnHardware === false
            || location.state?.sixthStep?.hasOwnHardware === false
            || location.state?.seventhStep?.hasOwnHardware === false
        ) {
            return false;
        }

        return data?.hasOwnHardware === true;
    };

    const appHasOwnHardware = (applicationId) =>
        resolveOwnHardwareFlag(applicationId, fetchedDataByApp[applicationId]);

    const getShipmentFormField = (applicationId, field) =>
        getShipmentForm(applicationId)[field];

    const getActiveHardware = (hardware) => {
        const list = Array.isArray(hardware) ? hardware : hardware ? [hardware] : [];
        return list.filter((item) => item && !item?.isDeleted);
    };

    const dedupeHardwareByItemServiceId = (hardware) => {
        const grouped = new Map();

        getActiveHardware(hardware).forEach((item) => {
            const key = String(item?.itemServiceId ?? item?.id);
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(item);
        });

        return Array.from(grouped.values()).map((records) => {
            const sorted = [...records].sort((a, b) => (b.id || 0) - (a.id || 0));
            return sorted[0];
        });
    };

    const recalculateTotals = (applicationId, hardwareItems, taxCode, fee = deliveryFee) => {
        const items = dedupeHardwareByItemServiceId(hardwareItems);
        let subtotalAmount = 0;
        let taxAmount = 0;

        const computedLineItems = items.map(item => {
            const itemSubtotal = (item.price || 0) * (item.quantity || 0);
            const itemTax =
                !item.product?.taxExempt && !taxCode
                    ? itemSubtotal * 0.1025
                    : 0;
            const itemTotal = itemSubtotal + itemTax;

            subtotalAmount += itemSubtotal;
            taxAmount += itemTax;

            return {
                ...item,
                amount: itemSubtotal,
                tax: itemTax,
                total: itemTotal,
                description: item.product?.description,
                accountId: item.product?.accountId,
            };
        });

        setLineItemsByApp((prev) => ({ ...prev, [applicationId]: computedLineItems }));
        setTotalsByApp((prev) => ({
            ...prev,
            [applicationId]: {
                subtotal: subtotalAmount,
                taxes: taxAmount,
                totalAmount: parseFloat((subtotalAmount + taxAmount + fee).toFixed(2)),
                isMerchantTaxExempt: Boolean(taxCode),
            },
        }));
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const idsToFetch = applicationIds.length
                ? applicationIds
                : [location.state?.applicationId || location.state?.seventhStep?.applicationId].filter(Boolean);

            const [preferencesResult, itemCategoryResult, ...applicationResults] = await Promise.all([
                isGuest
                    ? getPublicApplicationPreferences({ tenantSlug })
                    : getRequestWithOutBody(`${baseURl}application-preferences`, accessToken),
                isGuest
                    ? getPublicItemCategories({ tenantSlug })
                    : getRequestWithOutBody(`${baseURl}item-category/`, accessToken),
                // No public equivalent of `GET application/:id` is documented yet, so a
                // guest landing directly on this step starts with blank prefill data.
                ...idsToFetch.map((id) => (
                    isGuest
                        ? Promise.resolve(null)
                        : getRequestWithOutBody(`${baseURl}application/${id}`, accessToken)
                )),
            ]);

            const allPreferences = sortByOrder(
                Array.isArray(preferencesResult?.data) ? preferencesResult.data : []
            );
            setMerchantOwnedPreferenceDefs(
                allPreferences.filter((item) =>
                    Object.values(MERCHANT_OWNED_FORM_NAMES).includes(item.formName)
                )
            );
            setServiceOptions(
                (itemCategoryResult?.data || []).map((item) => ({
                    id: item.id,
                    text: item.title || item.name,
                    value: item.solution,
                    description: item.description || "",
                }))
            );

            const dataByApp = {};
            const initialForms = {};
            const initialLineItems = {};
            const initialTotals = {};

            applicationResults.forEach((result, index) => {
                const appId = idsToFetch[index];
                const data = result?.data;
                if (!data) return;

                const activeHardware = dedupeHardwareByItemServiceId(data?.hardware);
                const isOwnHardware = resolveOwnHardwareFlag(appId, data, activeHardware);
                const hardwareForApp = isOwnHardware ? [] : activeHardware;
                const normalizedData = { ...data, hardware: hardwareForApp, hasOwnHardware: isOwnHardware };
                dataByApp[appId] = normalizedData;

                initialForms[appId] = buildShipmentFormFromAppData(
                    { ...data, hardware: hardwareForApp },
                    isOwnHardware
                );

                const items = hardwareForApp;
                let subtotalAmount = 0;
                let taxAmount = 0;
                const computedLineItems = items.map((item) => {
                    const itemSubtotal = (item.price || 0) * (item.quantity || 0);
                    const itemTax =
                        !item.product?.taxExempt && !data?.taxCode
                            ? itemSubtotal * 0.1025
                            : 0;
                    subtotalAmount += itemSubtotal;
                    taxAmount += itemTax;
                    return {
                        ...item,
                        amount: itemSubtotal,
                        tax: itemTax,
                        total: itemSubtotal + itemTax,
                        description: item.product?.description,
                        accountId: item.product?.accountId,
                    };
                });
                initialLineItems[appId] = computedLineItems;
                initialTotals[appId] = {
                    subtotal: subtotalAmount,
                    taxes: taxAmount,
                    totalAmount: parseFloat((subtotalAmount + taxAmount).toFixed(2)),
                    isMerchantTaxExempt: Boolean(data?.taxCode),
                };

                const cmid = data?.createdMerchantId;
                if (cmid && index === 0) {
                    setMerchantId(cmid);
                    try { sessionStorage.setItem('MerchantId', String(cmid)); } catch { }
                }
            });

            setFetchedDataByApp(dataByApp);
            setShipmentFormByApp(initialForms);
            setLineItemsByApp(initialLineItems);
            setTotalsByApp(initialTotals);

            const primaryId = idsToFetch[0];
            const primaryData = primaryId ? dataByApp[primaryId] : null;
            setFetchedData(primaryData);
        } catch (error) {
            // keep UI usable even if one fetch fails
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [accessToken, applicationIds, location.state?.applicationId, location.state?.seventhStep?.applicationId]);

    const appShowPayNowOption = (applicationId) => {
        if (appHasOwnHardware(applicationId)) return false;
        const items = lineItemsByApp[applicationId] || [];
        return items.some(isItemInStock);
    };

    const getInStockPaymentAmountForApp = (applicationId) => {
        const form = getShipmentForm(applicationId);
        const shippingFeeForPayment = form.shipmentType === 'Shipping'
            ? parseFloat(Number(deliveryFee || 0).toFixed(2))
            : 0;
        const items = lineItemsByApp[applicationId] || [];
        const taxExempt = totalsByApp[applicationId]?.isMerchantTaxExempt;
        return parseFloat(
            (getInStockPaymentAmount(items, taxExempt) + shippingFeeForPayment).toFixed(2)
        );
    };

    const getLeaseBillingAddressForPdf = () => {
        for (const app of sortedApplications) {
            const form = getShipmentForm(app.applicationId);
            if (form.paymentType === 'Lease' && form.billingAddress) {
                return form.billingAddress;
            }
        }
        return fetchedDataByApp[sortedApplications[0]?.applicationId]?.dbaAddress || fetchedData?.dbaAddress || '';
    };

    const anyAppHasLeasePayment = () =>
        sortedApplications.some((app) => {
            if (appHasOwnHardware(app.applicationId)) return false;
            const form = getShipmentForm(app.applicationId);
            return form.shipmentType !== 'MerchantOwned' && form.paymentType === 'Lease';
        });

    useEffect(() => {
        setShipmentFormByApp((prev) => {
            let changed = false;
            const next = { ...prev };
            sortedApplications.forEach((app) => {
                if (appHasOwnHardware(app.applicationId)) return;
                const form = next[app.applicationId] || createDefaultShipmentForm();
                if (!appShowPayNowOption(app.applicationId) && form.paymentType === 'Pay Now') {
                    next[app.applicationId] = { ...form, paymentType: 'Pay Later' };
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [lineItemsByApp, sortedApplications]);

    const generateAndShowAgreementPDF = async (signatureImageParam) => {
        const response = await fetch('/SubscriptionAgreement.pdf');
        const arrayBuffer = await response.arrayBuffer();

        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 8;
        const color = rgb(0, 0, 0);

        // Inject values - Adjust coordinates as needed
        firstPage.drawText(`${fetchedData?.businessName}`, {
            x: 137, y: height - 104, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessName}`, {
            x: 350, y: height - 104, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.dbaAddress}`, {
            x: 112, y: height - 122, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessCity}`, {
            x: 215, y: height - 122, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessState}`, {
            x: 338, y: height - 122, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessType}`, {
            x: 110, y: height - 144, size: fontSize, font, color,
        });
        firstPage.drawText(`${getLeaseBillingAddressForPdf()}`, {
            x: 194, y: height - 166, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessCity}`, {
            x: 328, y: height - 167, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.bankName}`, {
            x: 90, y: height - 203, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.routingNumber}`, {
            x: 261, y: height - 203, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.accountNumber}`, {
            x: 377, y: height - 203, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.hardware?.name}`, {
            x: 300, y: height - 230, size: fontSize, font, color,
        });
        if (signatureImageParam) {
            const signatureImageBytes = await fetch(signatureImageParam).then(res => res.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(signatureImageBytes);

            firstPage.drawImage(pngImage, {
                x: 40,
                y: height - 520,
                width: 100,
                height: 50
            });
        }
        const pdfBytes = await pdfDoc.save();

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setPdfUrl(url);
        setIsModalOpen(true);
    };
    const downloadPDF = async (signatureImage) => {
        const response = await fetch('/SubscriptionAgreement.pdf');
        const arrayBuffer = await response.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 8;
        const color = rgb(0, 0, 0);

        firstPage.drawText(`${fetchedData?.businessName}`, {
            x: 137, y: height - 104, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessName}`, {
            x: 350, y: height - 104, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.dbaAddress}`, {
            x: 112, y: height - 122, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessCity}`, {
            x: 215, y: height - 122, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessState}`, {
            x: 338, y: height - 122, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessType}`, {
            x: 110, y: height - 144, size: fontSize, font, color,
        });
        firstPage.drawText(`${getLeaseBillingAddressForPdf()}`, {
            x: 194, y: height - 166, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.businessCity}`, {
            x: 328, y: height - 167, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.bankName}`, {
            x: 90, y: height - 203, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.routingNumber}`, {
            x: 261, y: height - 203, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.accountNumber}`, {
            x: 377, y: height - 203, size: fontSize, font, color,
        });
        firstPage.drawText(`${fetchedData?.hardware?.name}`, {
            x: 300, y: height - 230, size: fontSize, font, color,
        });

        if (signatureDataUrl) {
            const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
            const pngImage = await pdfDoc.embedPng(signatureImageBytes);

            firstPage.drawImage(pngImage, {
                x: 40,
                y: height - 520,
                width: 100,
                height: 50
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        // Trigger local download
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = 'Signed-Agreement.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Upload to backend
        const formData = new FormData();
        formData.append("file", blob, "Signed-Agreement.pdf"); // Use generated blob here
        formData.append("type", "applications");

        try {
            const result1 = isGuest
                ? await uploadPublicApplicationFile(formData, tenantSlug)
                : await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

            // Save uploaded file metadata
            setFinalPdfBlob({
                url: result1?.data?.dLFileUrl?.url,
                mimetype: result1?.data?.dLFileUrl?.mimetype,
                originalname: result1?.data?.dLFileUrl?.originalname,
            });
        } catch (error) {
        }
    };

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

    const handleDownload = async () => {
        const element = mainDivRef.current
        const hiddenElement = document.getElementById("hiddenSection")

        const needsSecondPage = allLineItems.length > 11

        try {
            hiddenElement.style.display = "block"

            const { jsPDF } = await import("jspdf");
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                allowTaint: true,
            })

            const imgData = canvas.toDataURL("image/jpeg", 1.0)

            const imgBlob = dataURLToBlob(imgData) // Convert data URL to Blob

            new Compressor(imgBlob, {
                quality: 0.8,
                success: async (result) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(result);
                    reader.onloadend = async () => {
                        const pdf = new jsPDF({
                            orientation: "portrait",
                            unit: "pt",
                            format: "a4",
                        });

                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const imgWidth = pageWidth;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;

                        pdf.addImage(reader.result, "JPEG", 0, 0, imgWidth, imgHeight);

                        if (needsSecondPage) {
                            hiddenElement.style.display = "none";

                            await new Promise((resolve) => setTimeout(resolve, 100));

                            const canvas2 = await html2canvas(element, {
                                scale: 3,
                                useCORS: true,
                                logging: false,
                                allowTaint: true,
                            });

                            const imgData2 = canvas2.toDataURL("image/jpeg", 1.0);
                            const imgBlob2 = dataURLToBlob(imgData2); // Convert second data URL to Blob

                            new Compressor(imgBlob2, {
                                quality: 0.8,
                                success(result2) {
                                    const reader2 = new FileReader();
                                    reader2.readAsDataURL(result2);
                                    reader2.onloadend = () => {
                                        pdf.addPage();
                                        pdf.addImage(reader2.result, "JPEG", 0, 0, imgWidth, (canvas2.height * imgWidth) / canvas2.width);
                                        pdf.save("invoice.pdf");
                                    };
                                },
                                error(err) {
                                }
                            });
                        } else {
                            pdf.save("invoice.pdf");
                        }
                    };
                },
                error(err) {
                }
            });
        } catch (error) {
        } finally {
            hiddenElement.style.display = "none";
        }
    }

    useEffect(() => {
        if (finalPdfBlob) {
            processTransaction();
        }
    }, [finalPdfBlob]);

    const columns2 = [
        { id: 'name', label: 'Item', align: 'center' },
        { id: 'description', label: 'Description', align: 'center' },
        { id: 'quantity', label: 'Quantity', align: 'center' },
        { id: 'price', label: 'Rate', align: 'center' },
        { id: 'amount', label: 'Amount', align: 'center' },
    ];
    const columns = [
        { id: 'name', label: 'Item', align: 'center' },
        { id: 'quantity', label: 'Quantity', align: 'center' },
        { id: 'price', label: 'Rate', align: 'center' },
        { id: 'amount', label: 'Amount', align: 'center' },
        { id: 'delete', label: 'Action', align: 'center' },
    ];

    const getTableDataForApp = (applicationId) =>
        dedupeHardwareByItemServiceId(fetchedDataByApp[applicationId]?.hardware)?.map((item) => ({
            id: item?.id,
            name: item?.name,
            description: item?.product?.description,
            quantity: item?.quantity,
            price: item?.price,
            amount: item?.price * item?.quantity,
        })) || [];

    const handleDeleteHardware = async (applicationId, row) => {
        if (!row?.id) return;
        if (appHasOwnHardware(applicationId)) return;

        const appData = fetchedDataByApp[applicationId] || fetchedData;
        const remainingItems = dedupeHardwareByItemServiceId(appData?.hardware);
        if (remainingItems.length <= 1) {
            toast.error('At least one product is required');
            return;
        }

        const allExisting = Array.isArray(appData?.hardware) ? appData.hardware : [];
        const deletedItemServiceId = allExisting.find((hw) => String(hw.id) === String(row.id))?.itemServiceId;

        setLoading(true);
        try {
            const updatedHardwares = allExisting.map((hw) => ({
                applicationId,
                itemServiceId: hw?.itemServiceId,
                pictureUrl: hw?.pictureUrl,
                name: hw?.name,
                price: hw?.price,
                quantity: hw?.quantity,
                inStock: hw?.inStock,
                id: hw?.id,
                ...(String(hw.itemServiceId) === String(deletedItemServiceId) ? { isDeleted: true } : {}),
            }));

            const apiData = {
                currentStep: appData?.currentStep || APPLICATION_STEPS.HARDWARE,
                hardware: updatedHardwares,
                ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                applicationId,
            };

            if (isGuest) {
                await submitPublicApplicationStep(apiData);
            } else {
                await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
            }

            const remainingHardware = allExisting.filter(
                (hw) => String(hw.itemServiceId) !== String(deletedItemServiceId)
            );
            setFetchedDataByApp((prev) => ({
                ...prev,
                [applicationId]: { ...appData, hardware: remainingHardware },
            }));
            if (fetchedData && applicationId === resolvedApplications[0]?.applicationId) {
                setFetchedData((prev) => ({ ...prev, hardware: remainingHardware }));
            }
            recalculateTotals(applicationId, remainingHardware, appData?.taxCode);
            toast.success('Product removed successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to remove product');
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousClick = () => {
        goToPreviousWizardStep(navigate, {
            pathname: location.pathname,
            roleTitle: userData?.roleTitle,
            state: location.state,
        });
    };

    const formatCardNumber = (value) => {
        return value
            .replace(/\D/g, '')
            .replace(/(.{4})/g, '$1 ')
            .trim();
    };

    const handleZipCodeChange = async (applicationId, e) => {
        let value = e.target.value;
        value = value.replace(/[^0-9-]/g, '');
        const zipRegex = /^\d{5}(?:-\d{4})?$/;

        if (zipRegex.test(value)) {
            try {
                const res = await fetch(`https://api.zippopotam.us/us/${value.slice(0, 5)}`);
                if (res.ok) {
                    const data = await res.json();
                    const place = data.places?.[0];
                    if (place) {
                        updateShipmentForm(applicationId, {
                            city: place["place name"] || "",
                            country: data?.country || "United States",
                            state: place["state abbreviation"],
                            zipCode: value,
                        });
                        return;
                    }
                }
            } catch (err) {
            }
        }

        updateShipmentForm(applicationId, { zipCode: value });
    };

    const handlePickupDateChange = (applicationId, date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        updateShipmentForm(applicationId, { pickupDate: formattedDate });
    };

    const buildShipmentPayload = (applicationId, form, includePaymentDetails = false) => {
        const shipment = {
            applicationId,
            type: form.shipmentType === 'Shipping' ? 'shipping' : form.shipmentType,
        };

        if (form.shipmentType === 'MerchantOwned') {
            shipment.merchantOwnedDetails = {
                ...(form.merchantOwnedPreferences || {}),
            };
        }

        if (form.shipmentType === 'Shipping') {
            shipment.shippingDetails = {
                recipientName: form.recipientName,
                phoneNumber: form.recipientPhone,
                address: form.shippingAddress,
                city: form.city,
                state: form.state,
                zipCode: form.zipCode,
                country: form.country || "United States",
                email: form.email,
            };
            if (form.companyName) shipment.shippingDetails.companyName = form.companyName;
            if (form.floorStreet) shipment.shippingDetails.floorStreet = form.floorStreet;
        }

        if (form.shipmentType === 'Pickup') {
            shipment.pickupDetails = {
                pickupLocationName: form.pickupLocationName,
                contactName: form.contactName,
                pickupDate: form.pickupDate,
            };
            if (form.specialInstructions) shipment.specialInstructions = form.specialInstructions;
        }

        if (includePaymentDetails && form.shipmentType !== 'MerchantOwned' && form.paymentType === 'Pay Now') {
            shipment.cardDetails = {
                nameOnCard: form.nameOnCard,
                expiryDate: getAuthorizeExpirationDate(form.expiryDate),
                cardNumber: form.cardNumber.replace(/\s/g, ''),
                cvv: String(form.cvv).trim(),
                billingAddress: form.address,
            };
        }

        if (includePaymentDetails && form.shipmentType !== 'MerchantOwned' && form.paymentType === 'Lease') {
            shipment.leaseDetails = {
                leaseTerm: form.leaseTerm,
                monthlyPayment: form.monthlyPayment,
                startDate: form.startDate,
                billingAddress: form.billingAddress,
            };
        }

        return shipment;
    };

    const validateAppForm = (applicationId, solution) => {
        const form = getShipmentForm(applicationId);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const now = new Date();
        const serviceLabel = getServiceLabel(solution);

        if (form.shipmentType === 'Shipping') {
            if (!form.recipientName.trim()) {
                toast.error(`Recipient Name is required for ${serviceLabel}`);
                return false;
            }
            if (!form.recipientPhone.trim()) {
                toast.error(`Phone Number is required for ${serviceLabel}`);
                return false;
            }
            if (!form.email.trim()) {
                toast.error(`E-mail is required for ${serviceLabel}`);
                return false;
            }
            if (!emailRegex.test(form.email)) {
                toast.error(`Invalid email format for ${serviceLabel}`);
                return false;
            }
            if (!form.shippingAddress.trim()) {
                toast.error(`Shipping Address is required for ${serviceLabel}`);
                return false;
            }
            if (!form.city.trim()) {
                toast.error(`City is required for ${serviceLabel}`);
                return false;
            }
            if (!form.country) {
                toast.error(`Country is required for ${serviceLabel}`);
                return false;
            }
            if (!form.state.trim()) {
                toast.error(`State is required for ${serviceLabel}`);
                return false;
            }
            if (!form.zipCode.trim()) {
                toast.error(`Zip Code is required for ${serviceLabel}`);
                return false;
            }
        } else if (form.shipmentType === 'Pickup') {
            if (!form.pickupLocationName.trim()) {
                toast.error(`Pickup Location is required for ${serviceLabel}`);
                return false;
            }
            if (!form.contactName.trim()) {
                toast.error(`Contact Name is required for ${serviceLabel}`);
                return false;
            }
            if (!form.pickupDate) {
                toast.error(`Pickup Date is required for ${serviceLabel}`);
                return false;
            }
            if (new Date(form.pickupDate) <= now) {
                toast.error(`Pickup Date must be in the future for ${serviceLabel}`);
                return false;
            }
        }

        return true;
    };

    const validateAppPaymentForm = (applicationId, solution) => {
        const form = getShipmentForm(applicationId);
        const serviceLabel = getServiceLabel(solution);
        const cvvRegex = /^[0-9]{3,4}$/;
        const now = new Date();

        if (appHasOwnHardware(applicationId) || form.shipmentType === 'MerchantOwned') {
            return true;
        }

        if (form.paymentType === 'Pay Now') {
            const inStockAmount = getInStockPaymentAmountForApp(applicationId);
            if (inStockAmount <= 0) {
                toast.error(`No in-stock items available for Pay Now payment (${serviceLabel})`);
                return false;
            }
            if (!form.nameOnCard.trim()) {
                toast.error(`Name on Card is required for ${serviceLabel}`);
                return false;
            }
            if (!form.expiryDate) {
                toast.error(`Expiry Date is required for ${serviceLabel}`);
                return false;
            }
            const expiry = dayjs(form.expiryDate, 'MM/YYYY', true);
            if (!expiry.isValid()) {
                toast.error(`Invalid expiry date for ${serviceLabel}`);
                return false;
            }
            if (expiry.endOf('month').isBefore(dayjs(), 'day')) {
                toast.error(`Expiry Date must be in the future for ${serviceLabel}`);
                return false;
            }
            if (!form.cardNumber.trim()) {
                toast.error(`Card Number is required for ${serviceLabel}`);
                return false;
            }
            const cleanCardNumber = form.cardNumber.replace(/\s/g, '');
            if (!/^\d{13,19}$/.test(cleanCardNumber)) {
                toast.error(`Card number must be 13 to 19 digits for ${serviceLabel}`);
                return false;
            }
            if (!isValidLuhnCardNumber(cleanCardNumber)) {
                toast.error(`Invalid card number for ${serviceLabel}`);
                return false;
            }
            const authorizeExpirationDate = getAuthorizeExpirationDate(form.expiryDate);
            if (!/^\d{4}$/.test(authorizeExpirationDate)) {
                toast.error(`Invalid card expiry date for ${serviceLabel} (use MM/YYYY)`);
                return false;
            }
            if (!form.cvv.trim()) {
                toast.error(`CVV is required for ${serviceLabel}`);
                return false;
            }
            if (!cvvRegex.test(form.cvv)) {
                toast.error(`CVV must be 3 or 4 digits for ${serviceLabel}`);
                return false;
            }
            if (!form.address.trim()) {
                toast.error(`Address is required for ${serviceLabel}`);
                return false;
            }
        } else if (form.paymentType === 'Lease') {
            if (!form.leaseTerm.trim()) {
                toast.error(`Lease Term is required for ${serviceLabel}`);
                return false;
            }
            if (!form.monthlyPayment.trim()) {
                toast.error(`Monthly Payment is required for ${serviceLabel}`);
                return false;
            }
            if (!form.startDate) {
                toast.error(`Start Date is required for ${serviceLabel}`);
                return false;
            }
            if (new Date(form.startDate) <= now) {
                toast.error(`Start Date must be in the future for ${serviceLabel}`);
                return false;
            }
            if (!form.billingAddress.trim()) {
                toast.error(`Billing Address is required for ${serviceLabel}`);
                return false;
            }
        }

        return true;
    };

    const validateMerchantOwnedPreferences = (applicationId, solution) => {
        const form = getShipmentForm(applicationId);
        const shipmentType = appHasOwnHardware(applicationId) ? 'MerchantOwned' : form.shipmentType;
        if (shipmentType !== 'MerchantOwned') return true;

        const missing = getMissingRequiredPreferences(
            getMerchantOwnedPreferencesForSolution(solution),
            form.merchantOwnedPreferences || {}
        );
        if (missing.length) {
            setShowRequiredErrors(true);
            toast.error(
                `Please fill required field${missing.length > 1 ? 's' : ''} for ${getServiceLabel(solution)}: ${missing.join(', ')}`
            );
            return false;
        }
        return true;
    };

    const validateForm = () => {
        for (const { applicationId, solution } of sortedApplications) {
            if (!validateMerchantOwnedPreferences(applicationId, solution)) return false;
            if (appHasOwnHardware(applicationId)) continue;
            if (!validateAppForm(applicationId, solution)) return false;
            if (!validateAppPaymentForm(applicationId, solution)) return false;
        }
        return true;
    };

    const buildApiDataForApp = (applicationId, includePaymentDetails = false) => {
        const form = getShipmentForm(applicationId);
        const appData = fetchedDataByApp[applicationId] || fetchedData;
        const isMerchantOwned = form.shipmentType === 'MerchantOwned' || appHasOwnHardware(applicationId);
        const appTotals = totalsByApp[applicationId] || {};

        const apiData = {
            currentStep: APPLICATION_STEPS.SHIPMENT,
            paymentMethod: isMerchantOwned
                ? 'merchantowned'
                : form.paymentType === 'Lease'
                    ? 'lease'
                    : form.paymentType === 'Pay Later'
                        ? 'pay-later'
                        : 'card',
            shipment: buildShipmentPayload(applicationId, form, includePaymentDetails),
            leaseFileUrl: finalPdfBlob,
            ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
            applicationId,
        };

        if (!isMerchantOwned) {
            apiData.tax = parseFloat((appTotals.taxes || 0).toFixed(2));
            apiData.deliveryFee = parseFloat(Number(deliveryFee || 0).toFixed(2));
        }
        if (form.paymentType === 'Pay Later') {
            apiData.payLater = true;
        }
        if (form.paymentType === 'Pay Now' && includePaymentDetails && !isMerchantOwned) {
            apiData.payLater = false;
            apiData.authorizeNetPayment = buildAuthorizeNetPayment({
                cardNumber: form.cardNumber,
                expiryDate: form.expiryDate,
                cvv: form.cvv,
                amount: getInStockPaymentAmountForApp(applicationId),
            });
        }

        return apiData;
    };

    const saveShipment = async (includePaymentDetails = false) => {
        if (resolvedApplications.length > 1) {
            await Promise.all(
                resolvedApplications.map((app) => {
                    const apiData = buildApiDataForApp(app.applicationId, includePaymentDetails);
                    return isGuest
                        ? submitPublicApplicationStep(apiData)
                        : postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
                })
            );
            return {
                currentStep: APPLICATION_STEPS.SHIPMENT,
                hasOwnHardwareByApp,
                hasOwnHardware: resolvedApplications.every((app) => appHasOwnHardware(app.applicationId)),
                ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
                applicationIds,
                merchantId: merchantId || fetchedData?.createdMerchantId || sessionStorage.getItem('MerchantId'),
                message: "Shipment saved successfully",
            };
        }

        const primaryApp = resolvedApplications[0];
        const applicationId =
            primaryApp?.applicationId
            || applicationIds[0]
            || location.state?.seventhStep?.applicationId;

        const apiData = {
            ...buildApiDataForApp(applicationId, includePaymentDetails),
            ...getApplicationPayloadFields(applicationId),
        };
        const result = isGuest
            ? await submitPublicApplicationStep(apiData)
            : await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData);
        return {
            ...apiData,
            message: result.message,
            merchantId: merchantId || fetchedData?.createdMerchantId || sessionStorage.getItem('MerchantId'),
        };
    };

    const getNavigationState = (apiData) => ({
        firstStep: location.state?.firstStep,
        secondStep: location.state?.secondStep,
        thirdStep: location.state?.thirdStep,
        fourthStep: location.state?.fourthStep,
        fifthStep: location.state?.fifthStep,
        sixthStep: location.state?.sixthStep,
        seventhStep: location.state?.seventhStep,
        eighthStep: apiData,
        hasOwnHardware: apiData.hasOwnHardware ?? location.state?.hasOwnHardware,
        hasOwnHardwareByApp,
        applications: sortedApplications,
        applicationIds,
        applicationId:
            applicationIds[0]
            || location.state?.applicationId
            || location.state?.seventhStep?.applicationId,
        isDuplicate: location.state?.isDuplicate,
        sourceApplicationId: location.state?.sourceApplicationId,
        duplicateFrom: location.state?.duplicateFrom,
        ...(isGuest && { tenantSlug }),
    });

    const processTransaction = async () => {
        setLoading(true);
        try {
            const apiData = await saveShipment(true);
            toast.success(apiData.message || "Saved successfully");
            const navigationState = getNavigationState(apiData);
            if (isGuest) {
                writePublicApplicationDraft({
                    tenantSlug,
                    applicationId: navigationState.applicationId,
                    applicationIds: navigationState.applicationIds,
                });
                navigate(`/apply/${tenantSlug}/submitApplication`, { state: navigationState });
            } else if (userData?.roleTitle === "Agent") {
                navigate('/userdashboard/submitApplication', { state: navigationState });
            } else {
                navigate('/home/submitApplication', { state: navigationState });
            }
        } catch (error) {
            const message = parseAuthorizeNetErrorMessage(error) || error.message || "Something went wrong";
            if (isAuthorizeNetNotConfiguredError(message)) {
                toast.error(
                    "Authorize.Net is not configured for this tenant. Go to Settings → Authorize.Net to save credentials."
                );
            } else {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleButtonClick = async () => {
        if (!validateForm()) return;
        if (anyAppHasLeasePayment()) {
            generateAndShowAgreementPDF();
        } else {
            processTransaction();
        }
    };

    const handleSaveClick = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const apiData = await saveShipment(true);
            toast.success(apiData.message || 'Save in draft');
        } catch (error) {
            const message = parseAuthorizeNetErrorMessage(error) || error.message || "Something went wrong";
            if (isAuthorizeNetNotConfiguredError(message)) {
                toast.error(
                    "Authorize.Net is not configured for this tenant. Go to Settings → Authorize.Net to save credentials."
                );
            } else {
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const allLineItems = useMemo(
        () => Object.values(lineItemsByApp).flat(),
        [lineItemsByApp]
    );

    const combinedTotals = useMemo(() => {
        return Object.values(totalsByApp).reduce(
            (acc, totals) => ({
                subtotal: acc.subtotal + (totals?.subtotal || 0),
                taxes: acc.taxes + (totals?.taxes || 0),
                totalAmount: acc.totalAmount + (totals?.totalAmount || 0),
            }),
            { subtotal: 0, taxes: 0, totalAmount: 0 }
        );
    }, [totalsByApp]);

    const primaryApplicationId = sortedApplications[0]?.applicationId;
    const primaryAppData = fetchedDataByApp[primaryApplicationId] || fetchedData;
    const shipTo = primaryAppData
        ? `${primaryAppData?.businessName}\n${primaryAppData?.dbaAddress}, ${primaryAppData?.businessCity}, ${primaryAppData?.businessState}, ${primaryAppData?.businessZipCode}`
        : "";
    const isMerchantTaxExempt = Object.values(totalsByApp).some((totals) => totals?.isMerchantTaxExempt);

    const handleExpiryDateChange = (applicationId, date) => {
        if (!date) {
            updateShipmentForm(applicationId, { expiryDate: "" });
            return;
        }
        if (typeof date === 'string') {
            updateShipmentForm(applicationId, { expiryDate: date });
            return;
        }
        if (dayjs.isDayjs(date) && date.isValid()) {
            updateShipmentForm(applicationId, { expiryDate: date.format('MM/YYYY') });
            return;
        }
        const parsed = dayjs(date);
        updateShipmentForm(applicationId, {
            expiryDate: parsed.isValid() ? parsed.format('MM/YYYY') : "",
        });
    };

    const handleStartDateChange = (applicationId, date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        updateShipmentForm(applicationId, { startDate: formattedDate });
    };

    const renderPaymentSection = (applicationId) => {
        const form = getShipmentForm(applicationId);
        const showPayNow = appShowPayNowOption(applicationId);
        const inStockAmount = getInStockPaymentAmountForApp(applicationId);

                return (
            <div className="mt-8 border-t border-[var(--dashboard-border)] pt-6">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Payment Transaction'}
                    Fontsize={20}
                />
                                                <div className="mt-4 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
                    {showPayNow && (
                        <label
                                                                                    className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${form.paymentType === 'Pay Now' ? 'border-[var(--dashboard-tab-active)] bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-tab-active)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-tab-text-inactive)]'}`}
                            onClick={() => updateShipmentForm(applicationId, { paymentType: 'Pay Now' })}
                        >
                            <Radio
                                type="radio"
                                name={`paymentType-${applicationId}`}
                                value="Pay Now"
                                checked={form.paymentType === 'Pay Now'}
                                sx={{
                                    color: 'var(--dashboard-tab-text-inactive)',
                                    '&.Mui-checked': { color: 'var(--dashboard-tab-active)' },
                                }}
                            />
                            Pay Now
                            <SVG.CreditCard style={{ color: form.paymentType === 'Pay Now' ? 'var(--dashboard-tab-active)' : 'var(--dashboard-tab-text-inactive)' }} />
                        </label>
                    )}

                    <label
                                                                        className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${form.paymentType === 'Lease' ? 'border-[var(--dashboard-tab-active)] bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-tab-active)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-tab-text-inactive)]'}`}
                        onClick={() => updateShipmentForm(applicationId, { paymentType: 'Lease' })}
                    >
                        <Radio
                            type="radio"
                            name={`paymentType-${applicationId}`}
                            value="Lease"
                            checked={form.paymentType === 'Lease'}
                            sx={{
                                color: 'var(--dashboard-tab-text-inactive)',
                                '&.Mui-checked': { color: 'var(--dashboard-tab-active)' },
                            }}
                        />
                        Lease
                        <SVG.Lease style={{ color: form.paymentType === 'Lease' ? 'var(--dashboard-tab-active)' : 'var(--dashboard-tab-text-inactive)' }} />
                    </label>

                    <label
                                                                        className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${form.paymentType === 'Pay Later' ? 'border-[var(--dashboard-tab-active)] bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-tab-active)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-tab-text-inactive)]'}`}
                        onClick={() => updateShipmentForm(applicationId, { paymentType: 'Pay Later' })}
                    >
                        <Radio
                            type="radio"
                            name={`paymentType-${applicationId}`}
                            value="Pay Later"
                            checked={form.paymentType === 'Pay Later'}
                            sx={{
                                color: 'var(--dashboard-tab-text-inactive)',
                                '&.Mui-checked': { color: 'var(--dashboard-tab-active)' },
                            }}
                        />
                        Pay Later
                    </label>
                </div>

                {form.paymentType === 'Pay Now' ? (
                                        <div className="mt-6 flex flex-col gap-2">
                        <div
                            className="mt-4 max-w-[720px] rounded-lg px-4 py-3"
                            style={{
                                borderRadius: 8,
                                backgroundColor: 'var(--dashboard-badge-bg)',
                                border: '1px solid var(--sidebar-border)',
                                maxWidth: 720,
                            }}
                        >
                            <Heading
                                Fontweight={600}
                                color={'var(--dashboard-text-primary)'}
                                Heading={`Amount to pay now: $${inStockAmount.toFixed(2)} (in-stock items only)`}
                                Fontsize={14}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Name on card'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Name on card"
                                inputValue={form.nameOnCard}
                                onInputChange={(e) => updateShipmentForm(applicationId, { nameOnCard: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--fieldsTitle)'} Heading={'Expiry Date'} Fontsize={16} required={true} />
                            </div>
                            <CustomDatePicker
                                value={form.expiryDate}
                                onChange={(date) => handleExpiryDateChange(applicationId, date)}
                                label="Expiry Date"
                                monthYearOnly={true}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Card Number'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Card Number"
                                inputValue={form.cardNumber}
                                onInputChange={(e) => updateShipmentForm(applicationId, { cardNumber: formatCardNumber(e.target.value) })}
                                bussiness={true}
                                maxLength={19}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'CVV'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="CVV"
                                inputValue={form.cvv}
                                onInputChange={(e) => updateShipmentForm(applicationId, { cvv: e.target.value })}
                                bussiness={true}
                                maxLength={4}
                                inputType={'number'}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Address'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Address"
                                inputValue={form.address}
                                onInputChange={(e) => updateShipmentForm(applicationId, { address: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                    </div>
                ) : form.paymentType === 'Lease' ? (
                                        <div className="mt-6 flex flex-col gap-2">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Lease Term'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Lease Term"
                                inputValue={form.leaseTerm}
                                onInputChange={(e) => updateShipmentForm(applicationId, { leaseTerm: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Monthly Payment ($)'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Monthly Payment ($)"
                                inputValue={form.monthlyPayment}
                                onInputChange={(e) => {
                                    let value = e.target.value.replace(/[^0-9.]/g, '');
                                    const parts = value.split('.');
                                    if (parts.length > 2) value = parts[0] + '.' + parts[1];
                                    if (parts[1]?.length > 2) value = parts[0] + '.' + parts[1].slice(0, 2);
                                    updateShipmentForm(applicationId, { monthlyPayment: value });
                                }}
                                bussiness={true}
                                showDollar={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--fieldsTitle)'} Heading={'Start Date'} Fontsize={16} required={true} />
                            </div>
                            <CustomDatePicker
                                value={form.startDate}
                                onChange={(date) => handleStartDateChange(applicationId, date)}
                                label="Start Date"
                                bussiness={true}
                                minDate={dayjs()}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Billing Address'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Billing Address"
                                inputValue={form.billingAddress}
                                onInputChange={(e) => updateShipmentForm(applicationId, { billingAddress: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                    </div>
                ) : form.paymentType === 'Pay Later' ? (
                    <div
                        className="mt-4 max-w-[720px] rounded-lg px-4 py-3"
                        style={{
                            borderRadius: 8,
                            backgroundColor: 'var(--dashboard-badge-bg)',
                            border: '1px solid var(--sidebar-border)',
                            maxWidth: 720,
                        }}
                    >
                        <Heading
                            Fontweight={500}
                            color={'var(--dashboard-text-primary)'}
                            Heading={'Payment will be collected later. Complete this step now; you can pay when your invoice is due.'}
                            Fontsize={14}
                        />
                    </div>
                ) : null}
            </div>
        );
    };

    const renderMerchantOwnedPreferenceField = (applicationId, item) => {
        const formValues = getShipmentForm(applicationId).merchantOwnedPreferences || {};
        const required = isPreferenceRequired(item?.extra);
        const fieldError = showRequiredErrors
            && required
            && !isPreferenceValueFilled(item?.preference, formValues[item.name]);

        if (item?.preference === "textField") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder={item?.name}
                        inputValue={formValues[item.name] || ""}
                        onInputChange={(e) => updateMerchantOwnedPreference(applicationId, item.name, e.target.value)}
                        bussiness={true}
                        error={fieldError}
                    />
                </div>
            );
        }

        if (item?.preference === "dropdown") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <DropdownMenu
                        menuItems={getPreferenceOptions(item?.extra)}
                        businessType={true}
                        defaultText={item?.name}
                        onSelect={(selectedValue) => updateMerchantOwnedPreference(applicationId, item.name, selectedValue)}
                        selectedValue={formValues[item.name] || ""}
                        error={fieldError}
                    />
                </div>
            );
        }

        if (item?.preference === "datePicker") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <CustomDatePicker
                        label={item?.name}
                        onChange={(selectedDate) => updateMerchantOwnedPreference(applicationId, item.name, selectedDate)}
                        value={formValues[item.name] || null}
                        bussiness={true}
                        error={fieldError}
                    />
                </div>
            );
        }

        if (item?.preference === "timePicker") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <div className="w-44 sm:w-80">
                        <CustomTimePicker
                            value={formValues[item.name] ? dayjs(formValues[item.name]) : null}
                            fullWidth={true}
                            onChange={(newValue) => updateMerchantOwnedPreference(applicationId, item.name, newValue)}
                            error={fieldError}
                        />
                    </div>
                </div>
            );
        }

        if (item?.preference === "switch") {
            return (
                <div key={`${applicationId}-${item.name}`} className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--fieldsTitle)'}
                            Heading={item?.name}
                            Fontsize={16}
                            required={required}
                        />
                    </div>
                    <Switch
                        checked={formValues[item.name] || false}
                        onChange={(checked) => updateMerchantOwnedPreference(applicationId, item.name, checked)}
                        className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[var(--dashboard-tab-inactive)] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                    >
                        <span
                            aria-hidden="true"
                            className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-[var(--sidebar-text-selected)] ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                        />
                    </Switch>
                </div>
            );
        }

        return null;
    };

    const renderApplicationShipmentSection = (applicationId, solution) => {
        const form = getShipmentForm(applicationId);
        const ownHardware = appHasOwnHardware(applicationId);
        const shipmentType = ownHardware ? 'MerchantOwned' : form.shipmentType;
        const tableData = getTableDataForApp(applicationId);
        const appTotals = totalsByApp[applicationId] || {};
        const serviceLabel = getServiceLabel(solution);
        const serviceDescription = getServiceDescription(solution);

        return (
            <div key={applicationId} className="mb-10">
                <h2
                    style={{
                        fontWeight: 700,
                        fontSize: 22,
                        color: 'var(--sidebar-text-primary)',
                        marginBottom: 4,
                        fontFamily: 'Nunito',
                    }}
                >
                    {serviceLabel}
                </h2>
                <p
                    style={{
                        fontWeight: 400,
                        fontSize: 14,
                        color: 'var(--dashboard-text-secondary)',
                        fontFamily: 'Nunito',
                        marginBottom: 16,
                        lineHeight: 1.45,
                    }}
                >
                    {serviceDescription}
                </p>

                {!ownHardware && (
                    <div className="mt-3 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
                        <label
                                                                                    className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${shipmentType === 'Shipping' ? 'border-[var(--dashboard-tab-active)] bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-tab-active)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-tab-text-inactive)]'}`}
                            onClick={() => updateShipmentForm(applicationId, { shipmentType: 'Shipping' })}
                        >
                            <Radio
                                type="radio"
                                name={`shipmentType-${applicationId}`}
                                value="Shipping"
                                checked={shipmentType === 'Shipping'}
                                sx={{
                                    color: 'var(--dashboard-tab-text-inactive)',
                                    '&.Mui-checked': { color: 'var(--dashboard-tab-active)' },
                                }}
                            />
                            Shipping
                            <SVG.Shipping style={{ color: shipmentType === 'Shipping' ? 'var(--dashboard-tab-active)' : 'var(--dashboard-tab-text-inactive)' }} />
                        </label>

                        <label
                                                                                    className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${shipmentType === 'Pickup' ? 'border-[var(--dashboard-tab-active)] bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-tab-active)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-tab-text-inactive)]'}`}
                            onClick={() => updateShipmentForm(applicationId, { shipmentType: 'Pickup' })}
                        >
                            <Radio
                                type="radio"
                                name={`shipmentType-${applicationId}`}
                                value="Pickup"
                                checked={shipmentType === 'Pickup'}
                                sx={{
                                    color: 'var(--dashboard-tab-text-inactive)',
                                    '&.Mui-checked': { color: 'var(--dashboard-tab-active)' },
                                }}
                            />
                            Pickup
                            <SVG.Pickup style={{ color: shipmentType === 'Pickup' ? 'var(--dashboard-tab-active)' : 'var(--dashboard-tab-text-inactive)' }} />
                        </label>

                        <label
                                                                                    className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${shipmentType === 'MerchantOwned' ? 'border-[var(--dashboard-tab-active)] bg-[var(--dashboard-badge-bg)] text-[var(--dashboard-tab-active)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-tab-box)] text-[var(--dashboard-tab-text-inactive)]'}`}
                            onClick={() => updateShipmentForm(applicationId, { shipmentType: 'MerchantOwned' })}
                        >
                            <Radio
                                type="radio"
                                name={`shipmentType-${applicationId}`}
                                value="MerchantOwned"
                                checked={shipmentType === 'MerchantOwned'}
                                sx={{
                                    color: 'var(--dashboard-tab-text-inactive)',
                                    '&.Mui-checked': { color: 'var(--dashboard-tab-active)' },
                                }}
                            />
                            Merchant-Owned Equipment
                            <SVG.Lease style={{ color: shipmentType === 'MerchantOwned' ? 'var(--dashboard-tab-active)' : 'var(--dashboard-tab-text-inactive)' }} />
                        </label>
                    </div>
                )}

                {shipmentType === 'MerchantOwned' ? (
                    <div className="flex flex-col gap-2 mt-6">
                        {(() => {
                            const preferenceFields = getMerchantOwnedPreferencesForSolution(solution);
                            if (!preferenceFields.length) {
                                return (
                                    <NoDataFound
                                        title="No Preference"
                                        description="No merchant-owned preferences found for this service."
                                    />
                                );
                            }
                            return preferenceFields.map((item) =>
                                renderMerchantOwnedPreferenceField(applicationId, item)
                            );
                        })()}
                    </div>
                ) : shipmentType === 'Shipping' ? (
                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Recipient Name'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Recipient Name"
                                inputValue={form.recipientName}
                                onInputChange={(e) => updateShipmentForm(applicationId, { recipientName: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Company Name (Optional)'} Fontsize={16} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Company Name"
                                inputValue={form.companyName}
                                onInputChange={(e) => updateShipmentForm(applicationId, { companyName: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Phone Number'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="(123) 456-7890"
                                inputValue={form.recipientPhone}
                                onInputChange={(e) => {
                                    let value = e.target.value.replace(/\D/g, '');
                                    if (value.length > 10) value = value.substring(0, 10);
                                    if (value.length > 6) {
                                        value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
                                    } else if (value.length > 3) {
                                        value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
                                    } else if (value.length > 0) {
                                        value = `(${value}`;
                                    }
                                    updateShipmentForm(applicationId, { recipientPhone: value });
                                }}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'E-mail'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="E-mail"
                                inputValue={form.email}
                                onInputChange={(e) => updateShipmentForm(applicationId, { email: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Shipping Address'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Shipping Address"
                                inputValue={form.shippingAddress}
                                onInputChange={(e) => updateShipmentForm(applicationId, { shippingAddress: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Floor/Street (Optional)'} Fontsize={16} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Floor/Street"
                                inputValue={form.floorStreet}
                                onInputChange={(e) => updateShipmentForm(applicationId, { floorStreet: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Zip Code'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="e.g. 12345 or 12345-6789"
                                inputValue={form.zipCode}
                                onInputChange={(e) => handleZipCodeChange(applicationId, e)}
                                inputType="text"
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--fieldsTitle)'} Heading={'Country'} Fontsize={16} required={true} />
                            </div>
                            <DropdownMenu
                                menuItems={countryOptions}
                                businessType={true}
                                defaultText={'Country'}
                                onSelect={(value) => updateShipmentForm(applicationId, { country: value })}
                                selectedValue={form.country}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'State'} Fontsize={16} required={true} />
                            </div>
                            <DropdownMenu
                                menuItems={usStates}
                                business={true}
                                defaultText={"Select State"}
                                onSelect={(value) => updateShipmentForm(applicationId, { state: value })}
                                selectedValue={form.state}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'City'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="City"
                                inputValue={form.city}
                                onInputChange={(e) => updateShipmentForm(applicationId, { city: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Pickup Location'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Pickup Location"
                                inputValue={form.pickupLocationName}
                                onInputChange={(e) => updateShipmentForm(applicationId, { pickupLocationName: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Contact Name'} Fontsize={16} required={true} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Contact Name"
                                inputValue={form.contactName}
                                onInputChange={(e) => updateShipmentForm(applicationId, { contactName: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--fieldsTitle)'} Heading={'Pickup Date'} Fontsize={16} required={true} />
                            </div>
                            <CustomDatePicker
                                value={form.pickupDate}
                                onChange={(date) => handlePickupDateChange(applicationId, date)}
                                label="Pickup Date"
                                bussiness={true}
                                minDate={dayjs()}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading Fontweight={500} color={'var(--sidebar-text-primary)'} Heading={'Special Instructions'} Fontsize={16} />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Special Instructions"
                                inputValue={form.specialInstructions}
                                onInputChange={(e) => updateShipmentForm(applicationId, { specialInstructions: e.target.value })}
                                bussiness={true}
                            />
                        </div>
                    </div>
                )}

                {shipmentType !== 'MerchantOwned' && tableData?.length > 0 && (
                    <div className="mt-8 w-full xl:w-[60%] lg:w-[90%]">
                        <Heading
                            Fontweight={700}
                            color={'var(--fieldsTitle)'}
                            Heading={'Product Summary'}
                            Fontsize={20}
                            mb={6}
                        />
                        <SmallTable
                            columns={tableData.length > 1 ? columns : columns.filter((column) => column.id !== 'delete')}
                            data={tableData}
                            shipmentDetails={true}
                            subtotal={appTotals.subtotal}
                            deliveryFee={deliveryFee}
                            taxes={appTotals.taxes}
                            isMerchantTaxExempt={appTotals.isMerchantTaxExempt}
                            totalAmount={appTotals.totalAmount ? appTotals.totalAmount : null}
                            onDeleteItem={tableData.length > 1 ? (row) => handleDeleteHardware(applicationId, row) : undefined}
                        />
                    </div>
                )}

                {shipmentType !== 'MerchantOwned' && renderPaymentSection(applicationId)}
            </div>
        );
    };

    return (
        <div className="min-h-screen -mt-[65px] bg-[var(--dashboard-bg)] p-2.5">
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Application'}
                Fontsize={30}
            />

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, paddingTop: 40, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 sm:p-2 m-2">
                    <Stepper activeStep={APPLICATION_STEPS.SHIPMENT - 1} />
                    {loading ? (
                        <div className="text-center w-full mx-auto my-20">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            {!sortedApplications.length ? (
                                <NoDataFound title="No Application" description="No applications found for shipment and pickup." />
                            ) : (
                                <div className="mt-10 mx-2 sm:mx-8">
                                    <Heading
                                        Fontweight={700}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'Shipment and Pickup'}
                                        Fontsize={22}
                                    />
                                    <p
                                        style={{
                                            fontWeight: 400,
                                            fontSize: 14,
                                            color: 'var(--dashboard-text-secondary)',
                                            fontFamily: 'Nunito',
                                            marginTop: 4,
                                            marginBottom: 20,
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        Set shipping, pickup, or merchant-owned details for each selected service.
                                    </p>

                                    <div className="flex flex-col gap-8">
                                        {sortedApplications.map(({ applicationId, solution }) =>
                                            renderApplicationShipmentSection(applicationId, solution)
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between mx-2 sm:mx-8 mt-16 flex-wrap gap-3">
                                <BottonCustom
                                    backgroundColor={'var(--dashboard-card-bg2)'}
                                    width={130}
                                    title={'Previous'}
                                    height={40}
                                    color={'var(--dashboard-text-primary)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={handlePreviousClick}
                                />
                                <div className="flex gap-2 flex-row flex-wrap">
                                    {!isGuest && (
                                        <BottonCustom
                                            backgroundColor={'var(--sidebar-selected-bg)'}
                                            width={130}
                                            title={'Save'}
                                            height={40}
                                            color={'var(--sidebar-text-selected)'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={handleSaveClick}
                                        />
                                    )}
                                    <BottonCustom
                                        backgroundColor={'var(--sidebar-selected-bg)'}
                                        width={130}
                                        title={'Next'}
                                        height={40}
                                        color={'var(--sidebar-text-selected)'}
                                        fontSize={16}
                                        fontWeight={500}
                                        onClick={handleButtonClick}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                {isModalOpen && pdfUrl && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50" style={{ zIndex: 10000 }}>
                        <div className="bg-[var(--dashboard-card-bg)] border border-[var(--dashboard-border)] w-[38%] h-[90%] relative rounded-lg p-4 flex flex-col text-[var(--dashboard-text-primary)]">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-0 right-1 text-lg text-red-500"
                            >✕</button>

                            {/* PDF Viewer */}
                            <div className="flex-grow">
                                <iframe
                                    src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
                                    title="Agreement PDF"
                                    className="w-full h-full border"
                                />
                            </div>

                            {/* Signature Trigger Button */}
                            <div className="text-right mt-2">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setShowSignatureModal(true);
                                    }}
                                    className="bg-[var(--sidebar-selected-bg)] text-sm text-[var(--sidebar-text-selected)] px-2 py-1 rounded"
                                >
                                    Sign Agreement
                                </button>
                                {isSigned && (
                                    <button
                                        onClick={() => {
                                            downloadPDF(signatureDataUrl);
                                        }}
                                        className="bg-green-600 text-sm ml-1 text-white px-3 py-1 rounded"
                                    >
                                        Submit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showSignatureModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[10000]">
                        <div className="bg-[var(--dashboard-card-bg)] border border-[var(--dashboard-border)] p-4 rounded w-[90%] max-w-md">
                            <h2 className="text-lg font-semibold mb-2 text-[var(--dashboard-text-primary)]">Please Sign Below</h2>
                            <SignatureCanvas
                                penColor="black"
                                canvasProps={{ width: 400, height: 150, className: "border border-[var(--dashboard-border)] bg-white" }}
                                ref={signatureRef}
                            />
                            <div className="flex justify-between mt-4">
                                <button
                                    onClick={() => signatureRef.current.clear()}
                                    className="px-4 py-2 bg-[var(--dashboard-card-bg2)] text-[var(--dashboard-text-primary)] rounded"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={() => {
                                        if (!signatureRef.current.isEmpty()) {
                                            const dataUrl = signatureRef.current.toDataURL();
                                            setSignatureDataUrl(dataUrl);
                                            generateAndShowAgreementPDF(dataUrl); // pass signature
                                            setShowSignatureModal(false);
                                            setIsSigned(true);
                                        }
                                    }}
                                    className="px-4 py-2 bg-[var(--dashboard-tab-active)] text-[var(--sidebar-text-selected)] rounded"
                                >
                                    Submit Signature
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div id="hiddenSection" style={{ display: 'none', width: '1000px', minHeight: '100vh', overflow: 'auto' }}>
                    <div className="flex justify-center  "  >
                        <div className=" " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14, width: '1000px' }} ref={mainDivRef}>
                            <div style={{ margin: 20, borderRadius: 14 }} className="overflow-auto">
                                <div className="flex justify-between items-start">
                                    <div style={{ borderRadius: 8, backgroundColor: 'rgba(43, 75, 242, 0.06)' }} className="py-3 px-3">
                                        <div className="flex justify-start">
                                            <img src={logo4k} alt="Tenant logo" className="max-w-32 max-h-12 w-auto h-auto object-contain object-left" />
                                        </div>
                                        <div className="flex justify-start gap-2 items-start mt-1 w-36">
                                            <img src={locationInvoice} className="w-3 h-4 mt-2" />
                                            <Heading
                                                Fontweight={400}
                                                color={'rgba(0, 0, 0, 1)'}
                                                Heading={tenantAddress}
                                                Fontsize={12}
                                            />
                                        </div>
                                        <div className="flex justify-start gap-2 items-start ">
                                            <img src={contactInvoice} className="w-3 h-3 mt-2" />
                                            <Heading
                                                Fontweight={400}
                                                color={'rgba(0, 0, 0, 1)'}
                                                Heading={`Direct: ${tenantPhone}`}
                                                Fontsize={12}
                                            />
                                        </div>
                                        <div className="flex justify-start gap-2 items-start ">
                                            <img src={mailInvoice} className="w-3 h-3 mt-3" />
                                            <Heading
                                                Fontweight={400}
                                                color={'rgba(0, 0, 0, 1)'}
                                                Heading={tenantEmail}
                                                Fontsize={12}
                                                mt={2}
                                            />
                                        </div>
                                        {tenantWebsite ? (
                                        <div className="flex justify-start gap-2 items-start ">
                                            <img src={website} className="w-3 h-3 mt-3" />
                                            <Heading
                                                Fontweight={400}
                                                color={'rgba(0, 0, 0, 1)'}
                                                Heading={tenantWebsite}
                                                Fontsize={12}
                                                mt={2}
                                            />
                                        </div>
                                        ) : null}
                                    </div>
                                    <div className="">
                                        <div className="flex justify-between items-center px-1 " style={{ marginTop: -15 }}>
                                            <Heading
                                                Fontweight={700}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={'Invoice Details'}
                                                Fontsize={30}
                                            />
                                        </div>
                                        <div className="pb-1 mt-1 px-2 flex justify-between items-center">
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'Date'} Fontsize={14} />
                                            <Heading
                                                Fontweight={500}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={new Date().toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit'
                                                })}
                                                Fontsize={14}
                                            />
                                        </div>
                                        <div className="pb-1 px-2 flex justify-between gap-x-12 items-center">
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'Invoice #'} Fontsize={14} />
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={invoiceNo ? invoiceNo : '-'} Fontsize={14} />
                                        </div>
                                        <div className="pb-1 px-2 flex justify-between gap-x-12 items-center">
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'P.O. No.'} Fontsize={14} />
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'-'} Fontsize={14} />
                                        </div>
                                        <div className="pb-1 px-2 flex justify-between gap-x-12 items-center">
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'Terms'} Fontsize={14} />
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'-'} Fontsize={14} />
                                        </div>
                                        <div className="pb-2 px-2 flex justify-between gap-x-12 items-center">
                                            <Heading Fontweight={500} color={'rgba(17, 17, 17, 1)'} Heading={'Account'} Fontsize={14} />
                                            <Heading
                                                Fontweight={500}
                                                color={'rgba(17, 17, 17, 1)'}
                                                Heading={fetchedData?.accountNumber ? fetchedData?.accountNumber : '-'}
                                                Fontsize={14}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <div className="flex gap-4 items-end mt-1">
                                        <div>
                                            <Heading Fontweight={600} color={'rgba(0, 0, 0, 1)'} Heading={'Ship To'} Fontsize={14} />
                                            <div
                                                className="mt-2 px-3 w-72"
                                                style={{
                                                    border: '1px solid rgba(100, 153, 255, 1)',
                                                    borderRadius: 8,
                                                    backgroundColor: 'rgba(43, 75, 242, 0.06)',
                                                    whiteSpace: 'pre-wrap',
                                                    height: '110px',
                                                    overflow: 'auto',
                                                    fontSize: 12
                                                }}
                                            >
                                                {shipTo}
                                            </div>
                                        </div>
                                        <div>
                                            <Heading Fontweight={600} color={'rgba(0, 0, 0, 1)'} Heading={'Bill to'} Fontsize={14} />
                                            <div
                                                className="mt-2 px-3 w-72"
                                                style={{
                                                    border: '1px solid rgba(100, 153, 255, 1)',
                                                    borderRadius: 8,
                                                    backgroundColor: 'rgba(43, 75, 242, 0.06)',
                                                    whiteSpace: 'pre-wrap',
                                                    height: '110px',
                                                    overflow: 'auto',
                                                    fontSize: 12
                                                }}
                                            >
                                                {shipTo}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <AgentTicketListTable
                                        columns={columns2}
                                        data={allLineItems}
                                        subtotal={combinedTotals.subtotal ? combinedTotals.subtotal : null}
                                        taxes={combinedTotals.taxes ? combinedTotals.taxes : null}
                                        deliveryFee={deliveryFee ? deliveryFee : null}
                                        invoiceData={combinedTotals.totalAmount ? combinedTotals.totalAmount : null}
                                        PreviewInvoiceQuantity={true}
                                        invoiceBottom={true}
                                        isMerchantTaxExempt={isMerchantTaxExempt}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShipmentAndPickup;

