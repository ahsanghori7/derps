import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { deleteRequest, getRequestWithOutBody, getRequestWithOutBodyCached, patchComment, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomDatePicker from "../../Components/CustomDatePicker";
import CustomTimePicker from "../../Components/CustomTimePicker";
import UploadFile from "../../Components/UploadFile";
import UploadSecondFile from "../../Components/UploadSecondFile";
import dayjs from "dayjs";
import { countries } from 'countries-list';
import ProductItem from "../../Components/ProductItem";
import { applicationServiceData, businessTypedata, ownershipTypeData, platformData, usStates, taxTypeData } from "../../types/Data";
import { styled } from '@mui/material/styles';
import { formatContactNumber } from "../../Utils/helper";
import ShowTaxInfoModal from "../../Components/ShowTaxInfoModal";
import { taxFormats } from "../../Utils/helper";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import NoDataFound from "../../Components/NoDataFound";
import { getPreferenceOptions, isPreferenceRequired } from "../../Utils/preferenceExtra";

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

const HeaderWrapper2 = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    // flexWrap: 'wrap',
    overflowX: 'auto', // Add horizontal scrolling
    whiteSpace: 'nowrap', // Prevent text from wrapping
});

const getAgreementTitle = (plan) => {
    const normalized = (plan || "").toLowerCase();
    if (normalized.includes("placement")) return "ATM Placement Agreement";
    if (normalized.includes("owner")) return "ATM Owner Agreement";
    return "Subscription Agreement";
};

const getAgreementFileUrl = (doc) =>
    doc?.signedFileUrl?.url || doc?.unsignedFileUrl?.url || null;

const getAgreementDisplayName = (doc, plan) =>
    doc?.title
    || doc?.signedFileUrl?.originalname
    || doc?.unsignedFileUrl?.originalname
    || getAgreementTitle(plan);

const EditApplication = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const userData = useSelector((state) => state.userData.userDetails);
    const returnTo = location.state?.returnTo
        || ((userData?.roleTitle || '').toLowerCase() === 'agent'
            ? '/userdashboard/userApplicationList'
            : '/home/adminApplication');

    const [initialItemData] = useState(() => {
        if (location.state?.itemData) return location.state.itemData;
        const saved = sessionStorage.getItem('newTabApplicationData');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return null;
    });

    useEffect(() => {
        sessionStorage.removeItem('newTabApplicationData');
    }, []);

    const [taxCode, settaxCode] = useState("")
    const [comments, setComments] = useState("")
    const [enabled, setEnabled] = useState(false)
    const [applicationId, setApplicationId] = useState("")
    const [merchantFirstName, setMerchantFirstName] = useState("")
    const [merchantLastName, setMerchantLastName] = useState("")
    const [legalName, setLegalName] = useState("")
    const [legalAddress, setLegalAddress] = useState("")
    const [legalCity, setLegalCity] = useState("")
    const [legalState, setLegalState] = useState("")
    const [legalZipCode, setLegalZipCode] = useState("")
    const [applicationType, setApplicationType] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [email, setEmail] = useState("")
    const [agentName, setAgentName] = useState("")
    const [dbaAddress, setDbaAddress] = useState("")
    const [businessState, setBusinessState] = useState("")
    const [businessCity, setBusinessCity] = useState("")
    const [businessZipCode, setBusinessZipCode] = useState("")
    const [dbaPhoneNumber, setdbaPhoneNumber] = useState("")
    const [website, setWebsite] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [productsDescription, setProductsDescription] = useState("")
    const [feinNumber, setFeinNumber] = useState("")
    const [ownerFirstName, setOwnerFirstName] = useState("")
    const [ownerLastName, setOwnerLastName] = useState("")
    const [residentialAddress, setResidentialAddress] = useState("")
    const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("")
    const [ownerShipCity, setOwnerShipCity] = useState("")
    const [ownerShipState, setOwnerShipState] = useState("")
    const [ownerShipZip, setOwnerShipZip] = useState("")
    const [ownerEmail, setOwnerEmail] = useState("")
    const [socialSecurityNumber, setSocialSecurityNumber] = useState("")
    const [bankName, setbankName] = useState("")
    const [accountNumber, setAccountNumber] = useState("")
    const [routingNumber, setRoutingNumber] = useState("")
    const [businessType, setBusinessType] = useState("")
    const [loading, setLoading] = useState(true);
    const [agentData, setAgentData] = useState([]);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [ownershipType, setOwnershipType] = useState("")
    const [businessStartDate, setBusinessStartDate] = useState(null)
    const [plan, setPlan] = useState("")
    const [platform, setPlatform] = useState("")
    const [formDate, setFormDate] = useState("")
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedFileName, setUploadedFileName] = useState(null); // New state for uploaded file name
    const [uploadedSecondFile, setUploadedSecondFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedSecondFileName, setUploadedSecondFileName] = useState(null); // New state for uploaded file name
    const [ebtFnsNumber, setEbtFnsNumber] = useState("");
    const [fetchedData, setFetchedData] = useState(null);
    const [averageSale, setAverageSale] = useState("");
    const [maxSale, setMaxSale] = useState("");
    const [monthlySale, setMonthlySale] = useState("");
    const [fetchedData2, setFetchedData2] = useState([]); // New state variable
    const [preferencesData, setPreferencesData] = useState(null);
    const [shipmentType, setShipmentType] = useState(null);
    const [formValues, setFormValues] = useState({});
    const countryOptions = Object.entries(countries).map(([code, { name }]) => ({
        title: name,
        id: name,
        value: name,
    }));

    const statusOptions = [
        { title: 'Draft', id: 'draft', value: 'draft' },
        { title: 'Pending', id: 'pending', value: 'pending' },
        { title: 'Completed', id: 'completed', value: 'completed' },
        { title: 'In-Active', id: 'in-active', value: 'in-active' },
        { title: 'Approved', id: 'approved', value: 'approved' },
        { title: 'Declined-Rejected', id: 'declined-rejected', value: 'declined-rejected' },
        { title: 'Under-Review', id: 'under-review', value: 'under-review' },
        { title: 'On-Hold', id: 'on-hold', value: 'on-hold' },
        { title: 'Suspicious-Activity', id: 'suspicious-activity', value: 'suspicious-activity' },
        { title: 'Verification-Required', id: 'verification-required', value: 'verification-required' },
        { title: 'Incomplete', id: 'incomplete', value: 'incomplete' },
        { title: 'Cancelled', id: 'cancelled', value: 'cancelled' },
    ];
    const [activeTab, setActiveTab] = useState('businessInfo');
    const [selectedAgreementIndex, setSelectedAgreementIndex] = useState(0);
    const [selectedSummaryIndex, setSelectedSummaryIndex] = useState(0);
    const [taxType, setTaxType] = useState("")
    const [showTaxInfo, setShowTaxInfo] = useState(false);
    const [showAccountNo, setShowAccountNo] = useState(false);
    const [showRoutingNo, setShowRoutingNo] = useState(false);
    const [showTaxCode, setShowTaxCode] = useState(false);
    const [merchantOwnedPreferencesData, setMerchantOwnedPreferencesData] = useState([]);
    const [applicationStatus, setApplicationStatus] = useState("");
    const [userList, setUserList] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [source, setSource] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const isAgentEditable = ['manual', 'website'].includes(String(source || '').toLowerCase());
    const formattedSource = source ? source.charAt(0).toUpperCase() + source.slice(1) : '';

    const getFormName = (solution) => {
        const formNameMap = {
            'credit-card': 'credit-card1',
            'atm': 'atm1',
            'cash-advance': 'cash-advance1',
            'pos': 'pos1',
            'ebt': 'ebt1',
            'airvac': 'airvac1',
            'website': 'website1',
            'ach-processing': 'ach-processing1'
        };
        return formNameMap[solution] || solution || null;
    };

    const handleFileUpload = (files) => {
        setUploadedFile(files); // Update state for the first file upload
    };

    const handleSecondFileUpload = (files) => {
        setUploadedSecondFile(files); // Update state for the second file upload
    };
    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}price-plan`, accessToken
        )
            .then(result => {
                setFetchedData2(result?.data);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchData2 = (solution) => {
        const formName = getFormName(solution || applicationType);
        let api = formName
            ? `${baseURl}application-preferences?formName=${formName}`
            : `${baseURl}application-preferences`;
        setLoading(true);
        getRequestWithOutBody(
            api, accessToken
        )
            .then(result => {
                if (result.data) {
                    const filteredData = formName
                        ? (result?.data || []).filter((item) => item?.formName === formName)
                        : (result?.data || []);
                    setPreferencesData(filteredData);
                }
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchMerchantOwnedPreferences = (solution) => {
        const formName = getMerchantOwnedFormName(solution || applicationType);
        if (!formName) {
            setMerchantOwnedPreferencesData([]);
            return;
        }

        getRequestWithOutBody(
            `${baseURl}application-preferences?formName=${formName}`,
            accessToken
        )
            .then((result) => {
                const filteredData = sortByOrder(
                    (result?.data || []).filter((item) => item?.formName === formName)
                );
                setMerchantOwnedPreferencesData(filteredData);
            })
            .catch(() => {
                setMerchantOwnedPreferencesData([]);
            });
    };
    const fetchData4 = () => {
        // setLoading(true); // Set loading state before fetching
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                setUserList(activeUsers);
                // setLoading(false)
            })
            .catch(error => {
                // setLoading(false)
            })
    }

    useEffect(() => {
        const itemData = initialItemData;
        if (itemData) {
            const {
                platform,
                accountNumber,
                merchantFirstName,
                merchantLastName,
                bankName,
                businessCity,
                businessName,
                businessState,
                businessType,
                businessZipCode,
                dbaAddress,
                email,
                feinNumber,
                website,
                contactNumber,
                id,
                legalName,
                legalAddress,
                dbaPhoneNumber,
                legalState,
                legalCity,
                legalZipCode,
                ownerPhoneNumber,
                ownerFirstName,
                ownerLastName,
                ownerShipCity,
                ownerShipState,
                ownerShipType,
                ownerShipZip,
                ownerEmail,
                plan,
                productsDescription,
                residentialAddress,
                routingNumber,
                socialSecurityNumber,
                solution,
                date,
                status,
                dLFileUrl,
                bankLetterFileUrl,
                averageSale,
                maxSale,
                comment,
                monthlySale,
                ebtFnsNumber,
                preferences,
                shipment,
                agentId,
                source,
                businessStartDate
            } = itemData;
            setPlatform(platform);
            setUploadedSecondFileName(bankLetterFileUrl); // Set uploaded file name
            setUploadedFileName(dLFileUrl); // Set uploaded file name
            setAverageSale(averageSale);
            setMaxSale(maxSale);
            setMonthlySale(monthlySale);
            setOwnerEmail(ownerEmail);
            setOwnerLastName(ownerLastName);
            setOwnerFirstName(ownerFirstName);
            setOwnerPhoneNumber(formatContactNumber(ownerPhoneNumber));
            setLegalZipCode(legalZipCode);
            setLegalCity(legalCity);
            setLegalState(legalState);
            setdbaPhoneNumber(formatContactNumber(dbaPhoneNumber));
            setLegalAddress(legalAddress);
            setContactNo(formatContactNumber(contactNumber));
            setWebsite(website);
            setMerchantFirstName(merchantFirstName);
            setMerchantLastName(merchantLastName);
            setAccountNumber(accountNumber);
            setbankName(bankName);
            setBusinessCity(businessCity);
            setApplicationId(id);
            setLegalName(legalName);
            setApplicationType(solution);
            setBusinessName(businessName);
            setEmail(email);
            setDbaAddress(dbaAddress);
            setBusinessState(businessState);
            setBusinessZipCode(businessZipCode);
            setProductsDescription(productsDescription);
            setFeinNumber(feinNumber);
            // setPrincipleOwnerName(principleOwnerName);
            setResidentialAddress(residentialAddress);
            setOwnerShipCity(ownerShipCity);
            setOwnerShipState(ownerShipState);
            setOwnerShipZip(ownerShipZip);
            setSocialSecurityNumber(socialSecurityNumber);
            setRoutingNumber(routingNumber);
            setBusinessType(businessType);
            setOwnershipType(ownerShipType);
            setBusinessStartDate(businessStartDate || null);
            setPlan(plan);
            // setComments(comment);
            setFormDate(date);
            setApplicationStatus(status || 'pending');
            setFetchedData(itemData); // Store fetched data in state
            setEbtFnsNumber(ebtFnsNumber);
            setFormValues(preferences);
            setShipmentType(shipment);
            setSelectedAgentId(agentId);
            setSource(source);
            setLoading(false)

            if (id) {
                getRequestWithOutBody(`${baseURl}application/${id}`, accessToken)
                    .then((result) => {
                        if (result?.data) {
                            setFetchedData((prev) => ({ ...(prev || itemData), ...result.data }));
                        }
                    })
                    .catch(() => { });
            }
        } else {
            setLoading(false);
        }
        fetchData()
        const selectedSolution = itemData?.solution;
        fetchData2(selectedSolution)
        fetchMerchantOwnedPreferences(selectedSolution)
        fetchData4()
    }, [location.state]);

    const handleEbtFnsNumberChange = (e) => {
        setEbtFnsNumber(e.target.value);
    };
    const handleApplicationIdChange = (e) => {
        setApplicationId(e.target.value);
    };
    const handleApplicationTypeChange = (year) => {
        setApplicationType(year);
    };
    const handleMerchantFirstNameChange = (e) => {
        setMerchantFirstName(e.target.value);
    };
    const handleMerchantLastNameChange = (e) => {
        setMerchantLastName(e.target.value);
    };
    const handleLegalNameChange = (e) => {
        setLegalName(e.target.value);
    };
    const handleLegalAddressChange = (e) => {
        setLegalAddress(e.target.value);
    };
    const handleLegalCityChange = (e) => {
        setLegalCity(e.target.value);
    };
    const handleLegalStateChange = (selectedState) => {
        setLegalState(selectedState);
    };
    const handleLegalZipCodeChange = async (e) => {
        let value = e.target.value;

        // Allow only numbers + optional dash
        value = value.replace(/[^0-9-]/g, '');

        // ZIP regex (5 or ZIP+4)
        const zipRegex = /^\d{5}(?:-\d{4})?$/;

        if (zipRegex.test(value)) {
            try {
                const res = await fetch(`https://api.zippopotam.us/us/${value.slice(0, 5)}`);
                if (res.ok) {
                    const data = await res.json();
                    const place = data.places?.[0];
                    if (place) {
                        setLegalCity(place["place name"]);
                        setLegalState(place["state abbreviation"]);
                    }
                }
            } catch (err) {
            }
        }

        setLegalZipCode(value);
    };
    const handleBusinessNameChange = (e) => {
        setBusinessName(e.target.value);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };
    const handleDbaAddressChange = (e) => {
        setDbaAddress(e.target.value);
    };
    const handleBusinessStateChange = (selectedState) => {
        setBusinessState(selectedState);
    };

    const handleBusinessCityChange = (e) => {
        setBusinessCity(e.target.value);
    };
    const handleBusinessZipCodeChange = async (e) => {
        let value = e.target.value;

        // Allow only numbers + optional dash
        value = value.replace(/[^0-9-]/g, '');

        // ZIP regex (5 or ZIP+4)
        const zipRegex = /^\d{5}(?:-\d{4})?$/;

        if (zipRegex.test(value)) {
            try {
                const res = await fetch(`https://api.zippopotam.us/us/${value.slice(0, 5)}`);
                if (res.ok) {
                    const data = await res.json();
                    const place = data.places?.[0];
                    if (place) {
                        setBusinessCity(place["place name"]);
                        setBusinessState(place["state abbreviation"]);
                    }
                }
            } catch (err) {
            }
        }
        setBusinessZipCode(value);
    };
    const handleDbaPhoneNumberChange = (e) => {
        setdbaPhoneNumber(e.target.value);
    };
    const handleWebsiteChange = (e) => {
        setWebsite(e.target.value);
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
    };
    const handleFeinNumberCodeChange = (e) => {
        let value = e.target.value;

        if (!taxType || !taxFormats[taxType]) {
            setFein(value);
            return;
        }

        const { regex, maxLength, format } = taxFormats[taxType];

        // Clean digits
        value = value.replace(regex, "");

        // Enforce max length
        if (value.length > maxLength) {
            value = value.slice(0, maxLength);
        }

        // Apply format
        value = format(value);

        setFeinNumber(value);
    };
    const handleTaxTypeChange = (year) => {
        setTaxType(year);
    };
    const handleProductsDescriptionChange = (e) => {
        setProductsDescription(e.target.value);
    };
    const handleOwnerShipZipChange = async (e) => {
        let value = e.target.value;

        // Allow only numbers + optional dash
        value = value.replace(/[^0-9-]/g, '');

        // ZIP regex (5 or ZIP+4)
        const zipRegex = /^\d{5}(?:-\d{4})?$/;

        if (zipRegex.test(value)) {
            try {
                const res = await fetch(`https://api.zippopotam.us/us/${value.slice(0, 5)}`);
                if (res.ok) {
                    const data = await res.json();
                    const place = data.places?.[0];
                    if (place) {
                        setOwnerShipCity(place["place name"]);
                        setOwnerShipState(place["state abbreviation"]);
                    }
                }
            } catch (err) {
            }
        }
        setOwnerShipZip(value);
    };
    const handleOwnerFirstNameChange = (e) => {
        setOwnerFirstName(e.target.value);
    };
    const handleOwnerLastNameChange = (e) => {
        setOwnerLastName(e.target.value);
    };
    const handleOwnerShipStateChange = (selectedState) => {
        setOwnerShipState(selectedState);
    };
    const handleResidentialAddressChange = (e) => {
        setResidentialAddress(e.target.value);
    };
    const handleOwnerPhoneNumberChange = (e) => {
        setOwnerPhoneNumber(e.target.value);
    };
    const handlesetOwnerShipCityChange = (e) => {
        setOwnerShipCity(e.target.value);
    };
    const handleOwnerEmailChange = (e) => {
        setOwnerEmail(e.target.value);
    };
    const handleSocialSecurityNumberChange = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // remove non-digits
        if (value.length > 9) value = value.slice(0, 9);

        // Format as XXX-XX-XXXX
        if (value.length > 5) {
            value = value.replace(/(\d{3})(\d{2})(\d+)/, "$1-$2-$3");
        } else if (value.length > 3) {
            value = value.replace(/(\d{3})(\d+)/, "$1-$2");
        }

        setSocialSecurityNumber(value);
    };
    const handlebankNameChange = (e) => {
        setbankName(e.target.value);
    };
    const handleAccountNumberChange = (e) => {
        setAccountNumber(e.target.value);
    };
    const handleRoutingNumberChange = (value) => {
        setRoutingNumber(value);
    };
    const handleBusinessTypeChange = (year) => {
        setBusinessType(year);
    };
    const handleOwnershipTypeChange = (year) => {
        setOwnershipType(year);
    };
    const handlePlanChange = (year) => {
        setPlan(year);
    };
    const handlePlatformChange = (year) => {
        setPlatform(year);
    };
    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };
    const handleTaxCodeChange = (e) => {
        settaxCode(e.target.value);
    };
    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setFormDate(formattedDate);
    };

    const handleDuplicateApplication = () => {
        const sourceId = applicationId || fetchedData?.id || initialItemData?.id;
        if (!sourceId) {
            toast.error("Application data not found");
            return;
        }

        const duplicateState = {
            isDuplicate: true,
            sourceApplicationId: sourceId,
            duplicateFrom: fetchedData || initialItemData,
        };

        const role = (userData?.roleTitle || "").toLowerCase();
        if (role === "agent") {
            navigate("/userdashboard/userActivations", { state: duplicateState });
        } else {
            navigate("/home/userActivations", { state: duplicateState });
        }
    };

    const handleEditAgent = async () => {
        const formattedDate = new Date(formDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        // Proceed with login logic
        setLoading(true);
        try {
            let uploadedFiles = [];
            if (uploadedFile && Array.isArray(uploadedFile)) { // Check if uploadedFile is an array
                for (const file of uploadedFile) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'applications');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                    uploadedFiles.push({
                        url: result1?.data?.dLFileUrl?.url,
                        mimetype: result1?.data?.dLFileUrl?.mimetype,
                        originalname: result1?.data?.dLFileUrl?.originalname,
                    });
                }
            }
            let uploadedSecondFiles = [];
            if (uploadedSecondFile && Array.isArray(uploadedSecondFile)) { // Check if uploadedFile is an array
                for (const file of uploadedSecondFile) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'application-bank-letter');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                    uploadedSecondFiles.push({
                        url: result1?.data?.bankLetterFileUrl?.url,
                        mimetype: result1?.data?.bankLetterFileUrl?.mimetype,
                        originalname: result1?.data?.bankLetterFileUrl?.originalname,
                    });
                }
            }
            const commentsArray = {
                ...(comments.trim() !== "" && { message: comments }),
                ...(uploadedFiles.length > 0 && { fileUrl: uploadedFiles })
            };

            const apiData = {
                "applicationId": applicationId,
                "solution": applicationType,
                "legalName": legalName,
                "businessName": businessName,
                "businessType": businessType,
                "email": email,
                "dbaAddress": dbaAddress,
                "businessState": businessState,
                "businessCity": businessCity,
                "businessZipCode": businessZipCode,
                "feinNumber": feinNumber,
                "productsDescription": productsDescription,
                "ownerShipType": ownershipType,
                "businessStartDate": businessStartDate ? dayjs(businessStartDate).format("MM/DD/YYYY") : null,
                "date": formattedDate,
                "residentialAddress": residentialAddress,
                "ownerShipCity": ownerShipCity,
                "ownerShipState": ownerShipState,
                "ownerShipZip": ownerShipZip,
                "socialSecurityNumber": socialSecurityNumber,
                "bankName": bankName,
                "accountNumber": accountNumber,
                "routingNumber": routingNumber,
                "plan": plan,
                "ownerEmail": ownerEmail,
                "website": website,
                "contactNumber": contactNo,
                "ownerFirstName": ownerFirstName,
                "ownerLastName": ownerLastName,
                "merchantFirstName": merchantFirstName,
                "merchantLastName": merchantLastName,
                "legalAddress": legalAddress,
                "dbaPhoneNumber": dbaPhoneNumber,
                "ownerPhoneNumber": ownerPhoneNumber,
                "legalState": legalState,
                "legalCity": legalCity,
                "legalZipCode": legalZipCode,
                "status": applicationStatus || 'pending',
                "isCompleted": applicationStatus === 'completed' ? 1 : 0,
                // "agentId": location.state?.itemData?.agentId,
                "currentStep": 6, // Submit
                "ebtFnsNumber": ebtFnsNumber,
                "averageSale": averageSale,
                "maxSale": maxSale,
                "monthlySale": monthlySale,
                "comment": comments,
                "preferences": formValues,
                "shipment": shipmentType,
                "platform": platform,
                "agentId": selectedAgentId || location.state?.itemData?.agentId,
                "source": source,
                ...(uploadedSecondFiles.length > 0 && { bankLetterFileUrl: [...(Array.isArray(uploadedSecondFileName) ? uploadedSecondFileName : []), ...uploadedSecondFiles] }), // Ensure uploadedFileName is an array
                ...(uploadedFiles.length > 0 && { dLFileUrl: [...(Array.isArray(uploadedFileName) ? uploadedFileName : []), ...uploadedFiles] }), // Ensure uploadedFileName is an array
            };
            if (commentsArray.message) {
                const result2 = await patchComment(`${baseURl}application/${fetchedData?.id}/comment`, accessToken, commentsArray.message, commentsArray.fileUrl);
            }
            const result = await postRequestWithBodyAndToken(`${baseURl}application`, accessToken, apiData)
            toast.success(result.message);
            navigate(returnTo);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApplication = () => {
        setShowDeleteModal(true);
    };

    const proceedWithDelete = () => {
        setShowDeleteModal(false);
        deleteRequest(`${baseURl}application/${applicationId}`, accessToken)
            .then(result => {
                toast.success('Application deleted successfully');
                navigate(returnTo);
            })
            .catch(error => {
                toast.error(error?.message || 'Failed to delete application');
            });
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
    };

    useEffect(() => {
        setSelectedAgreementIndex(0);
        setSelectedSummaryIndex(0);
    }, [fetchedData?.id, fetchedData?.agreementFileUrls]);

    const agreementDocs = (fetchedData?.agreementFileUrls || [])
        .map((doc) => ({
            ...doc,
            url: getAgreementFileUrl(doc),
            displayName: getAgreementDisplayName(doc, fetchedData?.plan),
        }))
        .filter((doc) => doc.url);

    const legacyAgreementUrl = fetchedData?.subscriptionAgreementFileUrl?.url || null;
    const legacyAgreementName =
        fetchedData?.subscriptionAgreementFileUrl?.originalname || getAgreementTitle(fetchedData?.plan);

    const displayAgreements = agreementDocs.length
        ? agreementDocs
        : legacyAgreementUrl
            ? [{
                url: legacyAgreementUrl,
                displayName: legacyAgreementName,
                title: getAgreementTitle(fetchedData?.plan),
                status: null,
            }]
            : [];

    const summaryDocs = (fetchedData?.agreementFileUrls || [])
        .filter((doc) => doc?.summaryFileUrl?.url)
        .map((doc) => ({
            agreementId: doc?.agreementId,
            title: doc?.title || getAgreementDisplayName(doc, fetchedData?.plan),
            url: doc.summaryFileUrl.url,
            originalname: doc.summaryFileUrl.originalname || 'Agreement Summary',
        }));

    const hasAgreements = displayAgreements.length > 0;
    const hasSummaries = summaryDocs.length > 0;
    const selectedAgreement = displayAgreements[selectedAgreementIndex] || displayAgreements[0] || null;
    const selectedSummary = summaryDocs[selectedSummaryIndex] || summaryDocs[0] || null;

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div className="flex justify-between items-center mb-3">
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Maintain Application'}
                    Fontsize={30}
                />
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="flex items-center gap-x-4">
                        <div className="w-16">
                            <Heading
                                Fontweight={500}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Status'}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <DropdownMenu
                            menuItems={statusOptions}
                            selectedValue={applicationStatus}
                            businessType={true}
                            defaultText={'Select Status'}
                            onSelect={(value) => setApplicationStatus(value)}
                        />
                    </div>


                </div>
            </div>

            <HeaderWrapper2 className="flex space-x-4 border-b mt-2 border-gray-200">
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'businessInfo'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('businessInfo')}
                >
                    Business Info
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'ownerInfo'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('ownerInfo')}
                >
                    Owner Info
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'financialInfo'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('financialInfo')}
                >
                    Financial Info
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'plan'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('plan')}
                >
                    Plan
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'hardware'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('hardware')}
                >
                    Hardware
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'preferences'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('preferences')}
                >
                    Preferences
                </button>
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'shipmentAndPickup'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('shipmentAndPickup')}
                >
                    Shipment and Pickup
                </button>
                {hasAgreements && (
                    <button
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'agreement'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-[#0C79F7]'
                            }`}
                        onClick={() => setActiveTab('agreement')}
                    >
                        Agreement{displayAgreements.length > 1 ? `s (${displayAgreements.length})` : ''}
                    </button>
                )}
                {hasSummaries && (
                    <button
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'agreementSummary'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-[#0C79F7]'
                            }`}
                        onClick={() => setActiveTab('agreementSummary')}
                    >
                        Summary{summaryDocs.length > 1 ? ` (${summaryDocs.length})` : ''}
                    </button>
                )}
                <button
                    className={`pb-2 px-4 text-sm font-medium ${activeTab === 'platform'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-[#0C79F7]'
                        }`}
                    onClick={() => setActiveTab('platform')}
                >
                    Platform
                </button>
            </HeaderWrapper2>

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                    </div>
                    {activeTab === 'businessInfo' ? (
                        <div>
                            <div className="flex flex-col gap-2 ">
                                {!loading && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--sidebar-text-primary)'}
                                                Heading={'Application Type'}
                                                Fontsize={16}
                                                required={true}
                                            />
                                        </div>
                                        <DropdownMenu menuItems={applicationServiceData} selectedValue={applicationType} businessType={true} defaultText={'Application Type'} onSelect={handleApplicationTypeChange} />
                                    </div>
                                )}
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Select Agent'}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={userList}
                                        idSet={true}
                                        searchable={true}
                                        defaultText={'Select Agent'}
                                        selectedValue={userList?.find((u) => String(u?.id) === String(selectedAgentId))?.name || ''}
                                        disabled={!isAgentEditable}
                                        onSelect={(val) => {
                                            if (!isAgentEditable) return;
                                            setSelectedAgentId(val);
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Source'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputValue={formattedSource}
                                        bussiness={true}
                                        disabled={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Merchant First Name'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        // label="Merchant Last Name"
                                        inputPlaceholder="Enter Merchant First Name"
                                        inputValue={merchantFirstName}
                                        onInputChange={handleMerchantFirstNameChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Merchant Last Name'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        // label="Merchant Last Name"
                                        inputPlaceholder="Enter Merchant Last Name"
                                        inputValue={merchantLastName}
                                        onInputChange={handleMerchantLastNameChange}
                                        bussiness={true}
                                    />
                                </div>
                            </div>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Legal Information'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="flex flex-col gap-2 ">
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Legal Business Name'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Legal Business Name"
                                        inputValue={legalName}
                                        onInputChange={handleLegalNameChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Legal Address'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Legal Address"
                                        inputValue={legalAddress}
                                        onInputChange={handleLegalAddressChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Legal Zip Code'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            bussiness={true}
                                            inputPlaceholder="e.g. 12345 or 12345-6789"
                                            inputValue={legalZipCode}
                                            onInputChange={handleLegalZipCodeChange}
                                            inputType="text"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            Enter ZIP code to auto-fill City and State
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Legal City'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Legal City"
                                        inputValue={legalCity}
                                        onInputChange={handleLegalCityChange}
                                        bussiness={true}

                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Legal State'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={usStates}
                                        business={true}
                                        defaultText={"Legal State"}
                                        onSelect={handleLegalStateChange}
                                        selectedValue={legalState}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Contact No'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="(123) 456-7890"
                                        inputValue={contactNo}
                                        onInputChange={(e) => {
                                            let value = e.target.value;

                                            // Remove all non-numeric characters
                                            value = value.replace(/\D/g, '');

                                            // Limit to 10 digits
                                            if (value.length > 10) {
                                                value = value.substring(0, 10);
                                            }

                                            // Apply formatting
                                            if (value.length > 6) {
                                                value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
                                            } else if (value.length > 3) {
                                                value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
                                            } else if (value.length > 0) {
                                                value = `(${value}`;
                                            }

                                            handleContactNoChange({ target: { value } });
                                        }}
                                        bussiness={true}
                                    />
                                </div>
                            </div>

                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Business Information'}
                                Fontsize={20}
                                mt={15}
                            />
                            <div className="flex flex-col gap-2 ">
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Business Name (DBA)'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Business Name (DBA)"
                                        inputValue={businessName}
                                        onInputChange={handleBusinessNameChange}    
                                        // disabled={true}
                                        bussiness={true}
                                    />
                                </div>
                                {!loading && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Business Type'}
                                                Fontsize={16}
                                            // mb={2}
                                            />
                                        </div>
                                        <DropdownMenu menuItems={businessTypedata} selectedValue={businessType} businessType={true} onSelect={handleBusinessTypeChange} />
                                    </div>
                                )}
                                {!loading && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Ownership Type'}
                                                Fontsize={16}
                                                required={true}
                                            />
                                        </div>
                                        <DropdownMenu menuItems={ownershipTypeData} selectedValue={ownershipType} businessType={true} defaultText={'Ownership Type'} onSelect={handleOwnershipTypeChange} />
                                    </div>
                                )}
                                {!loading && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Business Start Date'}
                                                Fontsize={16}
                                            />
                                        </div>
                                        <CustomDatePicker
                                            value={businessStartDate}
                                            onChange={setBusinessStartDate}
                                            bussiness={true}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DBA Email'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter DBA Email"
                                        inputValue={email}
                                        onInputChange={handleEmailChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DBA Address'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter DBA Address"
                                        inputValue={dbaAddress}
                                        onInputChange={handleDbaAddressChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DBA Zip Code'}
                                            Fontsize={16}
                                            required={true}
                                        />

                                    </div>
                                    <div>
                                        <LabeledInput
                                            inputPlaceholder="e.g. 12345 or 12345-6789"
                                            inputValue={businessZipCode}
                                            onInputChange={handleBusinessZipCodeChange}
                                            inputType="text"
                                            bussiness={true}
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            Enter ZIP code to auto-fill City and State
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DBA City'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter DBA City"
                                        inputValue={businessCity}
                                        onInputChange={handleBusinessCityChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DBA State'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={usStates}
                                        business={true}
                                        defaultText={"DBA State"}
                                        onSelect={handleBusinessStateChange}
                                        selectedValue={businessState}
                                    />
                                </div>

                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DBA Phone Number'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="(123) 456-7890"
                                        inputValue={dbaPhoneNumber}
                                        onInputChange={(e) => {
                                            let value = e.target.value;

                                            // Remove all non-numeric characters
                                            value = value.replace(/\D/g, '');

                                            // Limit to 10 digits
                                            if (value.length > 10) {
                                                value = value.substring(0, 10);
                                            }

                                            // Apply formatting
                                            if (value.length > 6) {
                                                value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
                                            } else if (value.length > 3) {
                                                value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
                                            } else if (value.length > 0) {
                                                value = `(${value}`;
                                            }

                                            handleDbaPhoneNumberChange({ target: { value } });
                                        }}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Website'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Website"
                                        inputValue={website}
                                        onInputChange={handleWebsiteChange}
                                        bussiness={true}

                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Type of Tax ID'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={taxTypeData}
                                        business={true}
                                        defaultText={"Tax Type"}
                                        onSelect={handleTaxTypeChange}
                                        selectedValue={taxType}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="flex items-center gap-x-2 w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={`Tax ID (${taxType})`}
                                            Fontsize={16}
                                            required={true}
                                        />
                                        <button
                                            type="button"
                                            className="text-[#0C79F7] border border-blue-400 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-blue-100"
                                            onClick={() => setShowTaxInfo(true)}
                                        >
                                            ?
                                        </button>
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder={
                                            taxType === "SSN" || taxType === "ITIN"
                                                ? "XXX-XX-XXXX"
                                                : taxType === "EIN"
                                                    ? "XX-XXXXXXX"
                                                    : "Select Tax Type First"
                                        }
                                        inputValue={feinNumber}
                                        onInputChange={handleFeinNumberCodeChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Description'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Description"
                                        inputValue={productsDescription}
                                        onInputChange={handleProductsDescriptionChange}
                                        bussiness={true}

                                    />
                                </div>
                                {fetchedData?.solution === 'ebt' && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--sidebar-text-primary)'}
                                                Heading={'EBT FNS Number'}
                                                Fontsize={16}
                                                required={true}
                                            />
                                        </div>
                                        <LabeledInput
                                            inputPlaceholder="Enter EBT FNS Number"
                                            inputValue={ebtFnsNumber}
                                            onInputChange={handleEbtFnsNumberChange}
                                            bussiness={true}

                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'ownerInfo' ? (
                        <>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Owner Information'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="flex flex-col gap-2 ">
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Owner First Name'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Type owner first name"
                                        inputValue={ownerFirstName}
                                        onInputChange={handleOwnerFirstNameChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Owner Last Name'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Type owner last name"
                                        inputValue={ownerLastName}
                                        onInputChange={handleOwnerLastNameChange}
                                        bussiness={true}

                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Date Of Birth'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <CustomDatePicker
                                        value={formDate}
                                        onChange={handleMemoDateChange}
                                        label="Date Of Birth"
                                        ownerInfo={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Residential Address'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Residential Address"
                                        inputValue={residentialAddress}
                                        onInputChange={handleResidentialAddressChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Owner Phone Number'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="(123) 456-7890"
                                        inputValue={ownerPhoneNumber}
                                        onInputChange={(e) => {
                                            let value = e.target.value;

                                            // Remove all non-numeric characters
                                            value = value.replace(/\D/g, '');

                                            // Limit to 10 digits
                                            if (value.length > 10) {
                                                value = value.substring(0, 10);
                                            }

                                            // Apply formatting
                                            if (value.length > 6) {
                                                value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
                                            } else if (value.length > 3) {
                                                value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
                                            } else if (value.length > 0) {
                                                value = `(${value}`;
                                            }

                                            handleOwnerPhoneNumberChange({ target: { value } });
                                        }}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Ownership ZipCode'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="e.g. 12345 or 12345-6789"
                                        inputValue={ownerShipZip}
                                        onInputChange={handleOwnerShipZipChange}
                                        inputType="text"
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Ownership City'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Ownership City"
                                        inputValue={ownerShipCity}
                                        onInputChange={handlesetOwnerShipCityChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Ownership State'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={usStates}
                                        business={true}
                                        defaultText={"Select State"}
                                        onSelect={handleOwnerShipStateChange}
                                        selectedValue={ownerShipState}
                                    />
                                </div>

                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Owner Email'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Owner Email"
                                        inputValue={ownerEmail}
                                        onInputChange={handleOwnerEmailChange}
                                        business={true}

                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Social Security Number'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="XXX-XX-XXXX"
                                        inputValue={socialSecurityNumber}
                                        onInputChange={handleSocialSecurityNumberChange}
                                        business={true}

                                    />
                                </div>
                                <div className="flex items-start gap-x-6  flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'DL File'}
                                            Fontsize={16}
                                            required={true}
                                            mt={8}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid rgba(100, 153, 255, 0.9)', borderRadius: 7, width: 290, }} className="min-h-20 mt-2 pt-2 flex flex-col items-center">
                                            <UploadFile onFileChange={handleFileUpload} />
                                        </div>
                                        {uploadedFileName && uploadedFileName.length > 0 && (
                                            <div>
                                                {uploadedFileName.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => window.open(file.url, '_blank')} // Open the respective file URL
                                                        className="px-4 cursor-pointer mt-1"
                                                        style={{
                                                            // border: '1px solid var(--sidebar-selected-bg)',
                                                            fontSize: 14,
                                                            borderRadius: 9,
                                                            backgroundColor: 'var(--dashboard-tab-box)',
                                                            paddingTop: 1,
                                                            paddingBottom: 1,
                                                            width: '70%',
                                                            // color: 'blue' // Set text color to blue
                                                        }}
                                                    >
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'blue'}
                                                            Heading={file.originalname} // Display the original name of the file
                                                            Fontsize={10}
                                                        // mb={4}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'financialInfo' ? (
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Financial Information'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="flex flex-col gap-2 ">
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Bank Name'}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Bank Name"
                                        inputValue={bankName}
                                        onInputChange={handlebankNameChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Account Number'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Account Number"
                                        inputValue={accountNumber}
                                        onInputChange={handleAccountNumberChange}
                                        bussiness={true}
                                        inputType={showAccountNo ? "text" : "password"}
                                        rightIcon={ // 👁️ Add eye button
                                            <button
                                                type="button"
                                                onClick={() => setShowAccountNo((prev) => !prev)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {showAccountNo ? <FaRegEyeSlash /> : <FaRegEye />}
                                            </button>
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Routing Number'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="_________"
                                        inputValue={routingNumber}
                                        onInputChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, ''); // only digits
                                            if (value.length <= 9) {
                                                handleRoutingNumberChange(value); // pass value (string), not event
                                            }
                                        }}
                                        bussiness={true}
                                        maxLength={9}
                                        pattern="\d{9}"
                                        inputType={showRoutingNo ? "text" : "password"}
                                        rightIcon={
                                            <button
                                                type="button"
                                                onClick={() => setShowRoutingNo((prev) => !prev)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {showRoutingNo ? <FaRegEyeSlash /> : <FaRegEye />}
                                            </button>
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Tax Exempt Code (if applicable)'}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder=""
                                        inputValue={taxCode}
                                        onInputChange={handleTaxCodeChange}
                                        bussiness={true}
                                        inputType={showTaxCode ? "text" : "password"}
                                        rightIcon={
                                            <button
                                                type="button"
                                                onClick={() => setShowTaxCode((prev) => !prev)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {showTaxCode ? <FaRegEyeSlash /> : <FaRegEye />}
                                            </button>
                                        }
                                    />
                                </div>
                                {(fetchedData?.solution === 'ebt' || fetchedData?.solution === 'cash-advance' || fetchedData?.solution === 'credit-card' || fetchedData?.solution === 'pos' || fetchedData?.solution === 'ach-processing') && (
                                    <>
                                        <div className="flex flex-col gap-2 ">
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Average Sale'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Average Sale"
                                                    inputValue={averageSale}
                                                    onInputChange={(e) => {
                                                        let value = e.target.value;

                                                        // Remove non-numeric except dot
                                                        value = value.replace(/[^0-9.]/g, '');

                                                        // Prevent multiple decimals
                                                        const parts = value.split('.');
                                                        if (parts.length > 2) {
                                                            value = parts[0] + '.' + parts[1];
                                                        }

                                                        // Limit to 2 decimal places
                                                        if (parts[1]?.length > 2) {
                                                            value = parts[0] + '.' + parts[1].slice(0, 2);
                                                        }

                                                        setAverageSale(value);
                                                    }}
                                                    showDollar={true}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Max Sale'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Max Sale"
                                                    inputValue={maxSale}
                                                    onInputChange={(e) => {
                                                        let value = e.target.value;

                                                        // Remove non-numeric except dot
                                                        value = value.replace(/[^0-9.]/g, '');

                                                        // Prevent multiple decimals
                                                        const parts = value.split('.');
                                                        if (parts.length > 2) {
                                                            value = parts[0] + '.' + parts[1];
                                                        }

                                                        // Limit to 2 decimal places
                                                        if (parts[1]?.length > 2) {
                                                            value = parts[0] + '.' + parts[1].slice(0, 2);
                                                        }

                                                        setMaxSale(value);
                                                    }}
                                                    showDollar={true}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Monthly Sale'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Monthly Sale"
                                                    inputValue={monthlySale}
                                                    showDollar={true}
                                                    onInputChange={(e) => {
                                                        let value = e.target.value;

                                                        // Remove non-numeric except dot
                                                        value = value.replace(/[^0-9.]/g, '');

                                                        // Prevent multiple decimals
                                                        const parts = value.split('.');
                                                        if (parts.length > 2) {
                                                            value = parts[0] + '.' + parts[1];
                                                        }

                                                        // Limit to 2 decimal places
                                                        if (parts[1]?.length > 2) {
                                                            value = parts[0] + '.' + parts[1].slice(0, 2);
                                                        }

                                                        setMonthlySale(value);
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>

                                        </div>
                                    </>
                                )}
                                {Array.isArray(uploadedSecondFileName) && uploadedSecondFileName.length > 0 && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Void Check or Bank Letter'}
                                            Fontsize={16}
                                            mb={4}
                                        />
                                        <div>
                                            {uploadedSecondFileName.map((file, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => window.open(file.url, '_blank')} // Open the respective file URL
                                                    className="px-4 cursor-pointer"
                                                    style={{
                                                        // border: '1px solid var(--sidebar-selected-bg)',
                                                        fontSize: 14,
                                                        borderRadius: 9,
                                                        backgroundColor: 'var(--dashboard-tab-box)',
                                                        paddingTop: 8,
                                                        paddingBottom: 8,
                                                        // width: '70%',
                                                        color: 'blue' // Set text color to blue
                                                    }}
                                                >
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'blue'}
                                                        Heading={file.originalname} // Display the original name of the file
                                                        Fontsize={16}
                                                        mb={4}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className=" mt-2 " >
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'COMMENTS'}
                                    Fontsize={20}
                                    mt={10}
                                />
                                <div className="flex flex-col justify-center">
                                    {fetchedData?.comment?.trim() && (
                                        <div className="mt-1 p-3 w-[100%]"
                                            style={{
                                                border: '1px solid var(--sidebar-selected-bg)',
                                                color: 'blue',
                                                fontSize: 14,
                                                borderRadius: 8,
                                                backgroundColor: 'var(--dashboard-tab-box)',
                                            }}
                                        >
                                            <div className="flex justify-between">
                                                <span style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>
                                                    {fetchedData?.businessName}
                                                </span>
                                                <span style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>
                                                    {new Date(fetchedData?.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--sidebar-text-primary)', whiteSpace: 'pre-wrap', }}>
                                                {fetchedData.comment.replace(/\\n/g, '\n')}
                                            </div>
                                        </div>
                                    )}
                                    {fetchedData?.comments?.length > 0 ? (
                                        fetchedData.comments.map((comment, index) => (
                                            comment.message && comment.message.trim() !== "" && (
                                                <div key={index} className="mt-1 p-3 w-[100%]"
                                                    style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                    <div className="flex justify-between">
                                                        <span style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>{comment?.user?.name}</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>{new Date(comment?.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--sidebar-text-primary)', whiteSpace: 'pre-wrap', }}>
                                                        {comment.message.replace(/\\n/g, '\n')}
                                                    </div>
                                                </div>
                                            )
                                        ))
                                    ) : null}
                                </div>
                                <div className="w-[100%]">
                                    <div>
                                        <textarea
                                            type="text"
                                            placeholder="Comment"
                                            value={comments}
                                            onChange={handleCommentsChange}
                                            className={`mt-1 p-3 w-[100%]`}
                                            rows={1}
                                            style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'plan' ? (
                        <>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Plan'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="">
                                {!loading && (
                                    <div className="flex items-center gap-x-6 mt-3 flex-wrap">
                                        <div className="w-48">

                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Plan'}
                                                Fontsize={16}
                                                required={true}
                                            />
                                        </div>
                                        <DropdownMenu menuItems={fetchedData2
                                            .filter(option => option?.service?.toLowerCase() === fetchedData?.solution?.toLowerCase())} selectedValue={plan} businessType={true} defaultText={'Plan'} onSelect={handlePlanChange} />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : activeTab === 'hardware' ? (
                        <>
                            {fetchedData?.hardware && (
                                <>
                                    <Heading
                                        Fontweight={700}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'Hardware'}
                                        Fontsize={20}
                                        mt={10}
                                    // Tailwind CSS classes
                                    />
                                    <div className="flex flex-wrap  gap-8">
                                        {!loading && (
                                            <>
                                                {(Array.isArray(fetchedData.hardware)
                                                    ? fetchedData.hardware
                                                    : [fetchedData.hardware] // Wrap single object into array
                                                ).map((item, index) => (
                                                    <ProductItem key={item.id || index} data={item} />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    ) : activeTab === 'preferences' ? (
                        <>
                            {formValues && preferencesData && (
                                <>
                                    <Heading
                                        Fontweight={700}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'Preferences'}
                                        Fontsize={20}
                                        mt={10}
                                    />
                                    <div className="flex flex-col gap-2 ">
                                        {preferencesData?.map((item, index) => (
                                            item?.preference === "textField" ? (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'var(--sidebar-text-primary)'}
                                                            Heading={item?.name}
                                                            Fontsize={16}
                                                            required={isPreferenceRequired(item?.extra)}
                                                        />
                                                    </div>
                                                    <LabeledInput inputPlaceholder={item?.name}
                                                        inputValue={formValues[item.name] || ""} // <-- updated
                                                        onInputChange={(e) => {
                                                            setFormValues(prev => ({
                                                                ...prev,
                                                                [item.name]: e.target.value
                                                            }));
                                                        }}
                                                        bussiness={true}
                                                    />
                                                </div>
                                            ) : item?.preference === "dropdown" ? (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'var(--fieldsTitle)'}
                                                            Heading={item?.name}
                                                            Fontsize={16}
                                                            required={isPreferenceRequired(item?.extra)}
                                                        />
                                                    </div>
                                                    <DropdownMenu
                                                        menuItems={getPreferenceOptions(item?.extra)}
                                                        businessType={true}
                                                        defaultText={item?.name}
                                                        onSelect={(selectedValue) => {
                                                            setFormValues(prev => ({
                                                                ...prev,
                                                                [item.name]: selectedValue
                                                            }));
                                                        }}
                                                        selectedValue={formValues[item.name] || ""}
                                                    />
                                                </div>
                                            ) : item?.preference === "datePicker" ? (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'var(--fieldsTitle)'}
                                                            Heading={item?.name}
                                                            Fontsize={16}
                                                            required={isPreferenceRequired(item?.extra)}
                                                        />
                                                    </div>
                                                    <CustomDatePicker
                                                        label={item?.name}
                                                        onChange={(selectedDate) => {
                                                            setFormValues(prev => ({
                                                                ...prev,
                                                                [item.name]: selectedDate
                                                            }));
                                                        }}
                                                        value={formValues[item.name] || null}
                                                        ownerInfo={true} />
                                                </div>
                                            ) : item?.preference === "switch" ? (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'var(--fieldsTitle)'}
                                                            Heading={item?.name}
                                                            Fontsize={16}
                                                            required={isPreferenceRequired(item?.extra)}
                                                        />
                                                    </div>
                                                    <Switch
                                                        checked={formValues[item.name] || false}
                                                        onChange={(checked) => {
                                                            setFormValues(prev => ({
                                                                ...prev,
                                                                [item.name]: checked
                                                            }));
                                                        }}
                                                        className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                                        />
                                                    </Switch>
                                                </div>
                                            ) : item?.preference === "timePicker" ? (
                                                <div className="flex items-center gap-x-5 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'var(--fieldsTitle)'}
                                                            Heading={item?.name}
                                                            Fontsize={16}
                                                            required={isPreferenceRequired(item?.extra)}
                                                        />
                                                    </div>
                                                    <CustomTimePicker
                                                        // label={item?.name}
                                                        value={dayjs(formValues[item.name])}
                                                        editApplication={true}
                                                        onChange={(newValue) => setFormValues(prev => ({
                                                            ...prev,
                                                            [item.name]: newValue
                                                        }))}
                                                    />
                                                </div>
                                            ) : null
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : activeTab === 'shipmentAndPickup' ? (
                        <>
                            {shipmentType && (
                                <>
                                    <Heading
                                        Fontweight={700}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={fetchedData?.shipment?.type === 'shipping' ? 'Shipping Details' : fetchedData?.shipment?.type === 'Pickup' ? 'Pickup Details' : "Merchant-Owned Equipment Details"}
                                        Fontsize={20}
                                        mt={10}
                                    // Tailwind CSS classes
                                    />
                                    {shipmentType?.shippingDetails ? (
                                        <div className="flex flex-col gap-2 ">
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Recipient Name'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Recipient Name"
                                                    inputValue={shipmentType?.shippingDetails?.recipientName}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                recipientName: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Company Name (Optional)'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Company Name"
                                                    inputValue={shipmentType?.shippingDetails?.companyName}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                companyName: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Phone Number'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Phone Number"
                                                    inputValue={shipmentType?.shippingDetails?.phoneNumber}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                phoneNumber: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    addAgent={true}
                                                // required={true}

                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'E-mail'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="E-mail"
                                                    inputValue={shipmentType?.shippingDetails?.email}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                email: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Shipping Address'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Shipping Address"
                                                    inputValue={shipmentType?.shippingDetails?.address}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                address: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Floor/Street (Optional)'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Floor/Street"
                                                    inputValue={shipmentType?.shippingDetails?.floorStreet}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                floorStreet: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}

                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Country'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <DropdownMenu
                                                    menuItems={countryOptions}
                                                    businessType={true}
                                                    defaultText={'Country'}
                                                    onSelect={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                country: e
                                                            }
                                                        }));
                                                    }}
                                                    selectedValue={shipmentType?.shippingDetails?.country} />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'State'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <DropdownMenu
                                                    menuItems={usStates}
                                                    business={true}
                                                    defaultText={"Select State"}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                state: e
                                                            }
                                                        }));
                                                    }}
                                                    selectedValue={shipmentType?.shippingDetails?.state}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'City'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="City"
                                                    inputValue={shipmentType?.shippingDetails?.city || shipmentType?.shippingDetails?.businessCity || businessCity || ""}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                city: e.target.value,
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Zip Code'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Zip Code"
                                                    inputValue={shipmentType?.shippingDetails?.zipCode}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            shippingDetails: {
                                                                ...prev.shippingDetails,
                                                                zipCode: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                        </div>
                                    ) : shipmentType?.pickupDetails ? (
                                        <div className="flex flex-col gap-2 ">
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Pickup Location'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Pickup Location"
                                                    inputValue={shipmentType?.pickupDetails?.pickupLocationName}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            pickupDetails: {
                                                                ...prev.pickupDetails,
                                                                pickupLocationName: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--sidebar-text-primary)'}
                                                        Heading={'Contact Name'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <LabeledInput
                                                    inputPlaceholder="Contact Name"
                                                    inputValue={shipmentType?.pickupDetails?.contactName}
                                                    onInputChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            pickupDetails: {
                                                                ...prev.pickupDetails,
                                                                contactName: e.target.value
                                                            }
                                                        }));
                                                    }}
                                                    bussiness={true}
                                                />
                                            </div>
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Pickup Date'}
                                                        Fontsize={16}
                                                        required={true}
                                                    />
                                                </div>
                                                <CustomDatePicker
                                                    value={shipmentType?.pickupDetails?.pickupDate}
                                                    onChange={(e) => {
                                                        setShipmentType(prev => ({
                                                            ...prev,
                                                            pickupDetails: {
                                                                ...prev.pickupDetails,
                                                                pickupDate: e
                                                            }
                                                        }));
                                                    }}
                                                    ownerInfo={true}
                                                    minDate={dayjs()}
                                                />
                                            </div>
                                            {shipmentType?.specialInstructions?.trim() !== null && (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={'var(--sidebar-text-primary)'}
                                                            Heading={'Special Instructions'}
                                                            Fontsize={16}
                                                        />
                                                    </div>
                                                    <LabeledInput
                                                        inputPlaceholder="Special Instructions"
                                                        inputValue={shipmentType?.specialInstructions}
                                                        onInputChange={(e) => {
                                                            setShipmentType(prev => ({
                                                                ...prev,
                                                                specialInstructions: e.target.value
                                                            }));
                                                        }}
                                                        bussiness={true}
                                                    />
                                                </div>
                                            )}
                                            {fetchedData?.leaseFileUrl && (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={'var(--fieldsTitle)'}
                                                        Heading={'Lease Agreement'}
                                                        Fontsize={16}
                                                        mb={4}
                                                    />
                                                    <div>
                                                        <div
                                                            onClick={() => window.open(fetchedData?.leaseFileUrl?.url, '_blank')} // Open the respective file URL
                                                            className="px-4 cursor-pointer mt-2"
                                                            style={{
                                                                // border: '1px solid var(--sidebar-selected-bg)',
                                                                fontSize: 14,
                                                                borderRadius: 9,
                                                                backgroundColor: 'var(--dashboard-tab-box)',
                                                                paddingTop: 8,
                                                                paddingBottom: 8,
                                                                // width: '70%',
                                                                color: 'blue' // Set text color to blue
                                                            }}
                                                        >
                                                            <Heading
                                                                Fontweight={500}
                                                                color={'blue'}
                                                                Heading={fetchedData?.leaseFileUrl?.originalname} // Display the original name of the file
                                                                Fontsize={16}
                                                                mb={4}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 ">
                                            {merchantOwnedPreferencesData?.length ? (
                                                merchantOwnedPreferencesData.map((item) => (
                                                    item?.preference === "textField" ? (
                                                        <div key={item?.name} className="flex items-center gap-x-6 flex-wrap">
                                                            <div className="w-48">
                                                                <Heading
                                                                    Fontweight={500}
                                                                    color={'var(--sidebar-text-primary)'}
                                                                    Heading={item?.name}
                                                                    Fontsize={16}
                                                                    required={isPreferenceRequired(item?.extra)}
                                                                />
                                                            </div>
                                                            <LabeledInput
                                                                inputPlaceholder={item?.name}
                                                                inputValue={shipmentType?.merchantOwnedDetails?.[item.name] || ""}
                                                                onInputChange={(e) => {
                                                                    setShipmentType(prev => ({
                                                                        ...prev,
                                                                        merchantOwnedDetails: {
                                                                            ...prev.merchantOwnedDetails,
                                                                            [item.name]: e.target.value
                                                                        }
                                                                    }));
                                                                }}
                                                                bussiness={true}
                                                            />
                                                        </div>
                                                    ) : item?.preference === "dropdown" ? (
                                                        <div key={item?.name} className="flex items-center gap-x-6 flex-wrap">
                                                            <div className="w-48">
                                                                <Heading
                                                                    Fontweight={500}
                                                                    color={'var(--fieldsTitle)'}
                                                                    Heading={item?.name}
                                                                    Fontsize={16}
                                                                    required={isPreferenceRequired(item?.extra)}
                                                                />
                                                            </div>
                                                            <DropdownMenu
                                                                menuItems={getPreferenceOptions(item?.extra)}
                                                                businessType={true}
                                                                defaultText={item?.name}
                                                                onSelect={(selectedValue) => {
                                                                    setShipmentType(prev => ({
                                                                        ...prev,
                                                                        merchantOwnedDetails: {
                                                                            ...prev.merchantOwnedDetails,
                                                                            [item.name]: selectedValue
                                                                        }
                                                                    }));
                                                                }}
                                                                selectedValue={shipmentType?.merchantOwnedDetails?.[item.name] || ""}
                                                            />
                                                        </div>
                                                    ) : item?.preference === "datePicker" ? (
                                                        <div key={item?.name} className="flex items-center gap-x-6 flex-wrap">
                                                            <div className="w-48">
                                                                <Heading
                                                                    Fontweight={500}
                                                                    color={'var(--fieldsTitle)'}
                                                                    Heading={item?.name}
                                                                    Fontsize={16}
                                                                    required={isPreferenceRequired(item?.extra)}
                                                                />
                                                            </div>
                                                            <CustomDatePicker
                                                                label={item?.name}
                                                                onChange={(selectedDate) => {
                                                                    setShipmentType(prev => ({
                                                                        ...prev,
                                                                        merchantOwnedDetails: {
                                                                            ...prev.merchantOwnedDetails,
                                                                            [item.name]: selectedDate
                                                                        }
                                                                    }));
                                                                }}
                                                                value={shipmentType?.merchantOwnedDetails?.[item.name] || null}
                                                                ownerInfo={true}
                                                            />
                                                        </div>
                                                    ) : item?.preference === "switch" ? (
                                                        <div key={item?.name} className="flex items-center gap-x-6 flex-wrap">
                                                            <div className="w-48">
                                                                <Heading
                                                                    Fontweight={500}
                                                                    color={'var(--fieldsTitle)'}
                                                                    Heading={item?.name}
                                                                    Fontsize={16}
                                                                    required={isPreferenceRequired(item?.extra)}
                                                                />
                                                            </div>
                                                            <Switch
                                                                checked={shipmentType?.merchantOwnedDetails?.[item.name] || false}
                                                                onChange={(checked) => {
                                                                    setShipmentType(prev => ({
                                                                        ...prev,
                                                                        merchantOwnedDetails: {
                                                                            ...prev.merchantOwnedDetails,
                                                                            [item.name]: checked
                                                                        }
                                                                    }));
                                                                }}
                                                                className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                                                            >
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                                                />
                                                            </Switch>
                                                        </div>
                                                    ) : item?.preference === "timePicker" ? (
                                                        <div key={item?.name} className="flex items-center gap-x-5 flex-wrap">
                                                            <div className="w-48">
                                                                <Heading
                                                                    Fontweight={500}
                                                                    color={'var(--fieldsTitle)'}
                                                                    Heading={item?.name}
                                                                    Fontsize={16}
                                                                    required={isPreferenceRequired(item?.extra)}
                                                                />
                                                            </div>
                                                            <CustomTimePicker
                                                                value={shipmentType?.merchantOwnedDetails?.[item.name]
                                                                    ? dayjs(shipmentType.merchantOwnedDetails[item.name])
                                                                    : null}
                                                                editApplication={true}
                                                                onChange={(newValue) => {
                                                                    setShipmentType(prev => ({
                                                                        ...prev,
                                                                        merchantOwnedDetails: {
                                                                            ...prev.merchantOwnedDetails,
                                                                            [item.name]: newValue
                                                                        }
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    ) : null
                                                ))
                                            ) : (
                                                <NoDataFound
                                                    title="No Preference"
                                                    description="No merchant-owned preferences found for this service."
                                                />
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : activeTab === 'agreement' ? (
                        <>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={displayAgreements.length > 1 ? 'Agreements' : (selectedAgreement?.displayName || getAgreementTitle(fetchedData?.plan))}
                                Fontsize={20}
                                mt={10}
                            />
                            {selectedAgreement?.url ? (
                                <div className="mt-4">
                                    {displayAgreements.length > 1 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {displayAgreements.map((doc, index) => (
                                                <button
                                                    key={doc.agreementId || doc.url || index}
                                                    type="button"
                                                    onClick={() => setSelectedAgreementIndex(index)}
                                                    className={`px-3 py-1.5 text-sm rounded-md border ${
                                                        selectedAgreementIndex === index
                                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                            : 'border-gray-300 text-gray-700 hover:border-blue-400'
                                                    }`}
                                                >
                                                    {doc.displayName}
                                                    {doc.status === 'signed' ? ' ✓' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div
                                        onClick={() => window.open(selectedAgreement.url, '_blank')}
                                        className="px-4 cursor-pointer inline-block mb-4"
                                        style={{
                                            fontSize: 14,
                                            borderRadius: 9,
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                            paddingTop: 8,
                                            paddingBottom: 8,
                                            color: 'blue',
                                        }}
                                    >
                                        <Heading
                                            Fontweight={500}
                                            color={'blue'}
                                            Heading={selectedAgreement.displayName || 'View Agreement'}
                                            Fontsize={16}
                                            mb={4}
                                        />
                                    </div>
                                    {selectedAgreement.status && (
                                        <div className="mb-3 text-sm">
                                            <span className={selectedAgreement.status === 'signed' ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                                                Status: {selectedAgreement.status}
                                            </span>
                                            {selectedAgreement.envelopeNumber && (
                                                <span className="ml-3 text-gray-500">
                                                    Envelope: {selectedAgreement.envelopeNumber}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            border: '1px solid var(--sidebar-selected-bg)',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            height: '70vh',
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                        }}
                                    >
                                        <iframe
                                            key={selectedAgreement.agreementId || selectedAgreement.url}
                                            src={`${selectedAgreement.url}#toolbar=1&navpanes=0&view=FitH`}
                                            title={selectedAgreement.displayName || getAgreementTitle(fetchedData?.plan)}
                                            className="w-full h-full border-0"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Heading
                                    Fontweight={400}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'No agreement available for this application yet.'}
                                    Fontsize={14}
                                    mt={10}
                                />
                            )}
                        </>
                    ) : activeTab === 'agreementSummary' ? (
                        <>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={summaryDocs.length > 1 ? 'Agreement Summaries' : 'Agreement Summary'}
                                Fontsize={20}
                                mt={10}
                            />
                            {selectedSummary?.url ? (
                                <div className="mt-4">
                                    {summaryDocs.length > 1 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {summaryDocs.map((doc, index) => (
                                                <button
                                                    key={doc.agreementId || doc.url || index}
                                                    type="button"
                                                    onClick={() => setSelectedSummaryIndex(index)}
                                                    className={`px-3 py-1.5 text-sm rounded-md border ${
                                                        selectedSummaryIndex === index
                                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                            : 'border-gray-300 text-gray-700 hover:border-blue-400'
                                                    }`}
                                                >
                                                    {doc.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div
                                        onClick={() => window.open(selectedSummary.url, '_blank')}
                                        className="px-4 cursor-pointer inline-block mb-4"
                                        style={{
                                            fontSize: 14,
                                            borderRadius: 9,
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                            paddingTop: 8,
                                            paddingBottom: 8,
                                            color: 'blue',
                                        }}
                                    >
                                        <Heading
                                            Fontweight={500}
                                            color={'blue'}
                                            Heading={selectedSummary.originalname || selectedSummary.title || 'View Summary'}
                                            Fontsize={16}
                                            mb={4}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            border: '1px solid var(--sidebar-selected-bg)',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            height: '70vh',
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                        }}
                                    >
                                        <iframe
                                            key={selectedSummary.agreementId || selectedSummary.url}
                                            src={`${selectedSummary.url}#toolbar=1&navpanes=0&view=FitH`}
                                            title={selectedSummary.title || 'Agreement Summary'}
                                            className="w-full h-full border-0"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Heading
                                    Fontweight={400}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'No agreement summary available for this application yet.'}
                                    Fontsize={14}
                                    mt={10}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Platform'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="flex flex-wrap gap-8">
                                {!loading && (
                                    <div className="flex items-center gap-x-6 mt-6 flex-wrap">
                                        <div className="w-48">

                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Platform'}
                                                Fontsize={16}
                                                required={true}
                                            />
                                        </div>
                                        <DropdownMenu menuItems={platformData} selectedValue={platform} businessType={true} defaultText={'Platform'} onSelect={handlePlatformChange} />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <div style={{ display: '' }} className="flex justify-end mt-10 gap-3 mr-5" >
                        {(userData?.roleTitle?.toLowerCase() === 'admin' || userData?.roleTitle?.toLowerCase() === 'human resource' || userData?.roleTitle?.toLowerCase() === 'support' || String(applicationStatus || fetchedData?.status || '').toLowerCase() === 'draft') && (

                            <BottonCustom
                                backgroundColor={'#dc3545'}
                                width={130}
                                title={'Delete'}
                                height={40}
                                color={'white'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleDeleteApplication}
                            />
                        )}
                        <BottonCustom
                            backgroundColor={'var(--dashboard-card-bg2)'}
                            width={160}
                            title={'Duplicate'}
                            height={40}
                            color={'var(--dashboard-text-primary)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleDuplicateApplication}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleEditAgent}
                        />
                    </div>
                </div>
            </div>
            {showTaxInfo && (
                <ShowTaxInfoModal isOpen={showTaxInfo} onClose={() => setShowTaxInfo(false)} />
            )}
            {showDeleteModal && (
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
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                    }}>
                        <h3 style={{
                            margin: '0 0 15px 0',
                            color: '#333',
                            fontSize: '18px',
                            fontWeight: '600'
                        }}>
                            Confirm Delete
                        </h3>
                        <p style={{
                            margin: '0 0 20px 0',
                            color: '#666',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}>
                            Are you sure you want to delete this application? This action cannot be undone.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={cancelDelete}
                                style={{
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={proceedWithDelete}
                                style={{
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditApplication;