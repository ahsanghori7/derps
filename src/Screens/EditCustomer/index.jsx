import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { getRequestWithOutBody, postRequestWithBodyAndToken, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { downloadFileFromUrl } from "../../Utils/fileDownload";
import { useLocation, useNavigate } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";
import { Button, Chip, Modal, Box, Typography } from "@mui/material";
import AgentTable from "../../Components/AgentTable";
import AssignedByCell from "../../Components/AssignedByCell";
import MemoTable from "../../Components/MemoTable";
import UpdateConfirmationModal from "../../Components/UpdateModal";
import { clearSupportTicketDetailSidebarRoute } from "../../Utils/supportTicketDetailSidebarRoute";
import { getTenantIdFromSession } from "../../Utils/helper";

const solutionData = [
    { value: 'atm', text: 'ATM Solutions' },
    { value: 'credit-card', text: 'Credit Card Processing' },
    { value: 'cash-advance', text: 'Cash Advance' },
    { value: 'pos', text: 'Point-Of-Sale Solutions' },
    { value: 'ebt', text: 'EBT Processing' },
    { value: 'airvac', text: 'AIRVAC Systems' },
    { value: 'website', text: 'Website Services' },
    { value: 'ach-processing', text: 'ACH Processing' },
];

const getSolutionText = (value) => {
    const solution = solutionData.find(s => s.value === value);
    return solution ? solution.text : value;
};

const getAgentDisplayName = (agent) =>
    agent?.name || agent?.username || agent?.fullName || '';

const EDIT_CUSTOMER_TABS = ['merchantInfo', 'hardware', 'processingInfo', 'tickets', 'attachments'];
const isEditCustomerTab = (t) => EDIT_CUSTOMER_TABS.includes(t);

const getCustomerDisplayName = (customer) => {
    if (customer?.firstName && customer?.lastName) {
        return `${customer.firstName} ${customer.lastName}`.trim();
    }
    return 'Unknown';
};

const pushFileAttachment = (attachments, { file, id, category, createdAt, uploadedBy, applicationId, ticketId }) => {
    if (!file?.url) return;

    attachments.push({
        id,
        fileName: file.originalname || file.fileName || file.name || 'Attachment',
        fileType: file.mimetype || file.fileType || 'Unknown',
        fileSize: file.fileSize ?? file.size ?? null,
        url: file.url,
        createdAt: createdAt || null,
        uploadedBy: uploadedBy || 'Unknown',
        category,
        applicationId: applicationId || null,
        ticketId: ticketId || null,
    });
};

const pushFileList = (attachments, files, opts) => {
    if (!files) return;

    const list = Array.isArray(files) ? files : (files?.url ? [files] : []);
    list.forEach((file, index) => {
        pushFileAttachment(attachments, {
            ...opts,
            file,
            id: opts.idPrefix ? `${opts.idPrefix}-${index}` : `file-${index}`,
        });
    });
};

const extractAttachmentsFromCustomer = (customerData) => {
    const attachments = [];
    if (!customerData) return attachments;

    const uploadedBy = getCustomerDisplayName(customerData);
    const createdAt = customerData.createdAt;

    pushFileList(attachments, customerData.dLFileUrl, {
        idPrefix: 'dl',
        category: 'Driver License',
        createdAt,
        uploadedBy,
    });

    pushFileList(attachments, customerData.bankLetterFileUrl, {
        idPrefix: 'bank',
        category: 'Bank Letter',
        createdAt,
        uploadedBy,
    });

    pushFileList(attachments, customerData.agreement, {
        idPrefix: 'agreement',
        category: 'Agreement',
        createdAt,
        uploadedBy,
    });

    pushFileList(attachments, customerData.summary, {
        idPrefix: 'summary',
        category: 'Summary',
        createdAt,
        uploadedBy,
    });

    if (Array.isArray(customerData.applications)) {
        customerData.applications.forEach((app, appIndex) => {
            const appCreatedAt = app.createdAt || createdAt;

            pushFileList(attachments, app.dLFileUrl, {
                idPrefix: `app-${appIndex}-dl`,
                category: 'Application - Driver License',
                createdAt: appCreatedAt,
                uploadedBy,
                applicationId: app.id,
            });

            pushFileList(attachments, app.leaseFileUrl, {
                idPrefix: `app-${appIndex}-lease`,
                category: 'Application - Lease',
                createdAt: appCreatedAt,
                uploadedBy,
                applicationId: app.id,
            });

            pushFileList(attachments, app.subscriptionAgreementFileUrl, {
                idPrefix: `app-${appIndex}-sub`,
                category: 'Application - Subscription Agreement',
                createdAt: appCreatedAt,
                uploadedBy,
                applicationId: app.id,
            });

            pushFileList(attachments, app.bankLetterFileUrl, {
                idPrefix: `app-${appIndex}-bank`,
                category: 'Application - Bank Letter',
                createdAt: appCreatedAt,
                uploadedBy,
                applicationId: app.id,
            });

            pushFileList(attachments, app.agreement, {
                idPrefix: `app-${appIndex}-agreement`,
                category: 'Application - Agreement',
                createdAt: appCreatedAt,
                uploadedBy,
                applicationId: app.id,
            });

            pushFileList(attachments, app.summary, {
                idPrefix: `app-${appIndex}-summary`,
                category: 'Application - Summary',
                createdAt: appCreatedAt,
                uploadedBy,
                applicationId: app.id,
            });
        });
    }

    if (Array.isArray(customerData.tickets)) {
        customerData.tickets.forEach((ticket, ticketIndex) => {
            pushFileList(attachments, ticket.uploadedFiles, {
                idPrefix: `ticket-${ticket.id ?? ticketIndex}`,
                category: ticket.title ? `Ticket - ${ticket.title}` : 'Ticket',
                createdAt: ticket.createdAt || createdAt,
                uploadedBy,
                ticketId: ticket.id,
            });
        });
    }

    return attachments;
};

const isCustomerRecord = (item) =>
    item &&
    typeof item === 'object' &&
    (item.dLFileUrl !== undefined ||
        item.bankLetterFileUrl !== undefined ||
        Array.isArray(item.applications) ||
        Array.isArray(item.tickets));

const mapFlatAttachment = (item, index) => ({
    id: item?.id ?? item?._id ?? `attachment-${index}`,
    fileName: item?.fileName || item?.originalname || item?.name || `Attachment ${index + 1}`,
    fileType: item?.fileType || item?.mimetype || 'Unknown',
    fileSize: item?.fileSize ?? item?.size ?? null,
    url: item?.url || item?.fileUrl || item?.path || '',
    createdAt: item?.createdAt || item?.uploadedAt || null,
    uploadedBy:
        item?.uploadedBy ||
        item?.uploadedByName ||
        (item?.uploader
            ? `${item.uploader.firstName || ''} ${item.uploader.lastName || ''}`.trim()
            : '') ||
        null,
    category: item?.category || item?.fileType || 'Unknown',
    applicationId: item?.applicationId || null,
});

const normalizeAttachmentsResponse = (result, customerId = null) => {
    const raw =
        result?.data?.attachments ??
        result?.data?.results ??
        result?.data ??
        result?.attachments ??
        [];

    if (!Array.isArray(raw)) {
        if (isCustomerRecord(raw)) {
            return extractAttachmentsFromCustomer(raw);
        }
        return [];
    }

    if (raw.length > 0 && isCustomerRecord(raw[0])) {
        const customers = customerId
            ? raw.filter((customer) => String(customer?.id) === String(customerId))
            : raw;

        return customers.flatMap((customer) => extractAttachmentsFromCustomer(customer));
    }

    return raw.map(mapFlatAttachment).filter((attachment) => attachment.url);
};

const EditCustomer = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const navigate = useNavigate();
    const location = useLocation();
    const customerId =
        location.state?.itemData?.id ||
        new URLSearchParams(location.search || '').get('id') ||
        '';

    const [businessName, setBusinessName] = useState("")
    const [firstName, setFirstName] = useState("")
    const [dbaName, setDbaName] = useState("")
    const [lastName, setLastName] = useState("")
    const [assignedUser, setAssignedUser] = useState(() => location.state?.itemData?.assigneeId || "");
    const [address, setAddress] = useState("")
    const [legalAddress, setLegalAddress] = useState("")
    const [legalCity, setLegalCity] = useState("")
    const [state, setState] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [dbaAddress, setDbaAddress] = useState("")
    const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("")
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [agentList, setAgentList] = useState([]);
    const [assignedUserName, setAssignedUserName] = useState(() =>
        getAgentDisplayName(location.state?.itemData?.agent) ||
        getAgentDisplayName(location.state?.itemData?.assignee) ||
        ""
    );
    const [legalZipCode, setLegalZipCode] = useState("")
    const [dbaCity, setDbaCity] = useState("")
    const [dbaState, setDbaState] = useState("")
    const [dbaZipCode, setDbaZipCode] = useState("")
    const [ownerFirstName, setOwnerFirstName] = useState("")
    const [ownerLastName, setOwnerLastName] = useState("")
    const [ownerAddress, setOwnerAddress] = useState("")
    const [ownerCity, setOwnerCity] = useState("")
    const [ownerState, setOwnerState] = useState("")
    const [ownerZipCode, setOwnerZipCode] = useState("")
    const [ownerEmail, setOwnerEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [website, setWebsite] = useState("")
    const [comments, setComments] = useState("")
    const [taxCode, settaxCode] = useState("")
    const [merchantIdsString, setMerchantIdsString] = useState(""); // New state
    const [newMerchantId, setNewMerchantId] = useState(""); // New state
    const [isAddMerchantIdDisabled, setIsAddMerchantIdDisabled] = useState(false); // New state
    const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
    const [modelOptions, setModelOptions] = useState([]);
    const [brandOptions, setBrandOptions] = useState([]);
    const [encryptionOptions, setEncryptionOptions] = useState([]);
    const [processorOptions, setProcessorOptions] = useState([]);
    const [selectedModel, setSelectedModel] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedEncryption, setSelectedEncryption] = useState("");
    const [selectedProcessor, setSelectedProcessor] = useState("");
    const [serialNo, setSerialNo] = useState("");
    const [activeTab, setActiveTab] = useState(() =>
        isEditCustomerTab(location.state?.activeTab) ? location.state.activeTab : 'merchantInfo'
    );
    const [hardwareData, setHardwareData] = useState([]);
    const [hardwareLoading, setHardwareLoading] = useState(false);
    const [searchSerialNumber, setSearchSerialNumber] = useState("");
    const [customerData, setCustomerData] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState(null);
    const [pdfLoadError, setPdfLoadError] = useState(false);

    const merchantStatus = location.state?.itemData?.status || customerData?.status || '';
    const resolvedItemData = customerData || location.state?.itemData || null;

    /** Keeps current tab in router state so inner-page → back returns to the same tab. */
    const setActiveTabPersist = (tab) => {
        const next = isEditCustomerTab(tab) ? tab : 'merchantInfo';
        setActiveTab(next);
        if (location.state != null && typeof location.state === 'object') {
            navigate('.', { replace: true, state: { ...location.state, activeTab: next } });
        }
    };

    useEffect(() => {
        if (location.state?.itemData) {
            const { legalBusinessName, merchantIds, website, comment, taxExempt, taxCode, ownerEmail, ownerZipcode, ownerCity, ownerState, ownerAddress, ownerLastName, ownerFirstName, businessZipCode, businessCity, businessState, legalZipCode, dbaPhoneNumber, legalCity, legalAddress, firstName, dbaName, ownerPhoneNumber, lastName, address, state, dbaAddress, phoneNumber, fax, companyName, email, taxId } = location.state.itemData;
            const merchantIdsArr = Array.isArray(merchantIds) ? merchantIds : [];
            setBusinessName(legalBusinessName);
            setFirstName(firstName);
            setDbaName(dbaName);
            setLastName(lastName);
            // setAddress(address);
            setState(state);
            setContactNo(dbaPhoneNumber);
            setLegalAddress(legalAddress);
            setEmail(email);
            setDbaAddress(dbaAddress);
            setLegalCity(legalCity);
            setOwnerPhoneNumber(ownerPhoneNumber);
            setLegalZipCode(legalZipCode);
            setDbaCity(businessCity);
            setDbaState(businessState);
            setDbaZipCode(businessZipCode);
            setOwnerFirstName(ownerFirstName);
            setOwnerLastName(ownerLastName);
            setOwnerAddress(ownerAddress);
            setOwnerCity(ownerCity);
            setOwnerState(ownerState);
            setOwnerZipCode(ownerZipcode);
            setOwnerEmail(ownerEmail);
            setPhone(phoneNumber);
            setWebsite(website);
            setComments(comment);
            settaxCode(taxCode);
            setMerchantIdsString(merchantIdsArr.map(id => id.merchantId).join(", ")); // Set comma-separated string
            setAssignedUser(location.state?.itemData?.assigneeId);
            setAssignedUserName(
                getAgentDisplayName(location.state?.itemData?.agent) ||
                getAgentDisplayName(location.state?.itemData?.assignee)
            );
            setIsChecked(taxExempt);

            setSelectedModel(
                location.state?.itemData?.model ||
                location.state?.itemData?.hardwareDetails?.model ||
                location.state?.itemData?.merchantOwnedDetails?.model ||
                ""
            );
            setSelectedBrand(
                location.state?.itemData?.brand ||
                location.state?.itemData?.hardwareDetails?.brand ||
                location.state?.itemData?.merchantOwnedDetails?.brand ||
                ""
            );
            setSelectedEncryption(
                location.state?.itemData?.encryption ||
                location.state?.itemData?.hardwareDetails?.encryption ||
                ""
            );
            setSelectedProcessor(
                location.state?.itemData?.processor ||
                location.state?.itemData?.hardwareDetails?.processor ||
                ""
            );
            setSerialNo(
                location.state?.itemData?.serialNo ||
                location.state?.itemData?.hardwareDetails?.serialNo ||
                location.state?.itemData?.merchantOwnedDetails?.serialNo ||
                ""
            );
        }
    }, [location.state?.itemData]);

    useEffect(() => {
        const t = location.state?.activeTab;
        if (isEditCustomerTab(t)) setActiveTab(t);
    }, [location.state?.activeTab]);

    const fetchCustomerData = async () => {
        if (!customerId) return;

        setLoading(true);
        try {
            const result = await getRequestWithOutBody(
                `${baseURl}customer/${customerId}`,
                accessToken
            );
            if (result?.data) {
                // Update state with fetched customer data
                const data = result.data;
                setCustomerData(data); // Store complete customer data including tickets
                const merchantIdsArr = Array.isArray(data.merchantIds) ? data.merchantIds : [];

                setBusinessName(data.legalBusinessName || "");
                setFirstName(data.firstName || "");
                setDbaName(data.dbaName || "");
                setLastName(data.lastName || "");
                setState(data.state || "");
                setContactNo(data.dbaPhoneNumber || "");
                setLegalAddress(data.legalAddress || "");
                setEmail(data.email || "");
                setDbaAddress(data.dbaAddress || "");
                setLegalCity(data.legalCity || "");
                setOwnerPhoneNumber(data.ownerPhoneNumber || "");
                setLegalZipCode(data.legalZipCode || "");
                setDbaCity(data.businessCity || "");
                setDbaState(data.businessState || "");
                setDbaZipCode(data.businessZipCode || "");
                setOwnerFirstName(data.ownerFirstName || "");
                setOwnerLastName(data.ownerLastName || "");
                setOwnerAddress(data.ownerAddress || "");
                setOwnerCity(data.ownerCity || "");
                setOwnerState(data.ownerState || "");
                setOwnerZipCode(data.ownerZipcode || "");
                setOwnerEmail(data.ownerEmail || "");
                setPhone(data.phoneNumber || "");
                setWebsite(data.website || "");
                setComments(data.comment || "");
                settaxCode(data.taxCode || "");
                setMerchantIdsString(merchantIdsArr.map(id => id.merchantId).join(", "));
                setAssignedUser(data.assigneeId || "");
                const agentName =
                    getAgentDisplayName(data.agent) ||
                    getAgentDisplayName(data.assignee);
                setAssignedUserName((prev) => agentName || prev);
                setIsChecked(data.taxExempt || false);

                setSelectedModel(
                    data.model ||
                    data.hardwareDetails?.model ||
                    data.merchantOwnedDetails?.model ||
                    ""
                );
                setSelectedBrand(
                    data.brand ||
                    data.hardwareDetails?.brand ||
                    data.merchantOwnedDetails?.brand ||
                    ""
                );
                setSelectedEncryption(
                    data.encryption ||
                    data.hardwareDetails?.encryption ||
                    ""
                );
                setSelectedProcessor(
                    data.processor ||
                    data.hardwareDetails?.processor ||
                    ""
                );
                setSerialNo(
                    data.serialNo ||
                    data.hardwareDetails?.serialNo ||
                    data.merchantOwnedDetails?.serialNo ||
                    ""
                );
            }
        } catch (error) {
            toast.error("Failed to fetch customer data");
        } finally {
            setLoading(false);
        }
    };

    const fetchData = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}user?roleTitle=agent`, accessToken
        )
            .then(result => {
                setAgentList(result?.data?.results)
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

    const fetchHardwareData = async (merchantId) => {
        if (!merchantId) return;

        setHardwareLoading(true);
        try {
            const result = await getRequestWithOutBody(`${baseURl}invoice/serials/assigned?merchantId=${merchantId}`, accessToken);
            setHardwareData(result?.data || []);
        } catch (error) {
            setHardwareData([]);
        } finally {
            setHardwareLoading(false);
        }
    };

    const fetchAttachments = async () => {
        const tenantId = getTenantIdFromSession(userData);

        if (!tenantId || !customerId) {
            setAttachments([]);
            return;
        }

        setAttachmentsLoading(true);
        try {
            const params = new URLSearchParams({
                tenantId: String(tenantId),
                merchantId: String(customerId),
            });
            const result = await getRequestWithOutBody(
                `${baseURl}customer/attachments?${params.toString()}`,
                accessToken
            );
            setAttachments(normalizeAttachmentsResponse(result, customerId));
        } catch (error) {
            setAttachments([]);
            toast.error("Failed to fetch attachments");
        } finally {
            setAttachmentsLoading(false);
        }
    };

    useEffect(() => {
        fetchData()
        if (customerId) {
            fetchCustomerData()
        }
        fetchSupportSetupOptions('model', setModelOptions);
        fetchSupportSetupOptions('brand', setBrandOptions);
        fetchSupportSetupOptions('encryption', setEncryptionOptions);
        fetchSupportSetupOptions('processor', setProcessorOptions);
    }, [customerId, accessToken])

    useEffect(() => {
        if (!assignedUser || !Array.isArray(agentList) || agentList.length === 0) return;

        const found = agentList.find((agent) => String(agent.id) === String(assignedUser));
        const name = getAgentDisplayName(found);
        if (name) setAssignedUserName((prev) => prev || name);
    }, [assignedUser, agentList]);

    useEffect(() => {
        if (activeTab === 'hardware' && customerId) {
            fetchHardwareData(customerId);
        }
    }, [activeTab, customerId])

    useEffect(() => {
        if (activeTab === 'attachments') {
            fetchAttachments();
        }
    }, [activeTab, customerId, userData, accessToken])

    const handlePreviewAttachment = (attachment) => {
        console.log('Preview attachment:', attachment);
        setPreviewAttachment(attachment);
        setPdfLoadError(false);
        setPreviewModalOpen(true);
    };

    const handleClosePreviewModal = () => {
        setPreviewModalOpen(false);
        setPreviewAttachment(null);
        setPdfLoadError(false);
    };

    const handleDownloadAttachment = async (attachment, event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        if (!attachment?.url) {
            toast.info('Download link not available');
            return;
        }

        try {
            await downloadFileFromUrl(
                attachment.url,
                attachment.fileName || 'attachment',
                accessToken
            );
        } catch {
            toast.error('Failed to download attachment');
        }
    };

    const handleMerchantIdChange = (e) => {
        setMerchantIdsString(e.target.value);
    };
    const handleBusinessNameChange = (e) => {
        setBusinessName(e.target.value);
    };
    const handleFirstNameChange = (e) => {
        setFirstName(e.target.value);
    };
    const handleDbaNameChange = (e) => {
        setDbaName(e.target.value);
    };
    const handleLastNameChange = (e) => {
        setLastName(e.target.value);
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
    };
    const handleLegalAddressChange = (e) => {
        setLegalAddress(e.target.value);
    };
    const handleLegalCityChange = (e) => {
        setLegalCity(e.target.value);
    };
    const handleLegalZipCodeChange = (e) => {
        setLegalZipCode(e.target.value);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };
    const handleStateChange = (e) => {
        setState(e.target.value);
    };
    const handleDbaAddressChange = (e) => {
        setDbaAddress(e.target.value);
    };
    const handleDbaCityChange = (e) => {
        setDbaCity(e.target.value);
    };
    const handleDbaStateChange = (e) => {
        setDbaState(e.target.value);
    };
    const handleDbaZipCodeChange = (e) => {
        setDbaZipCode(e.target.value);
    };

    const handleWebsiteChange = (e) => {
        setWebsite(e.target.value);
    };
    const handlePhoneChange = (e) => {
        setPhone(e.target.value);
    };
    const handleAddressChange = (e) => {
        setAddress(e.target.value);
    };
    const handleOwnerPhoneNumberChange = (e) => {
        setOwnerPhoneNumber(e.target.value);
    };
    const handleCategoryTitleChange = (value) => { // Step 2: Define handler
        setAssignedUserName(value);
    };
    const handleOwnerFirstNameChange = (e) => {
        setOwnerFirstName(e.target.value);
    };
    const handleOwnerLastNameChange = (e) => {
        setOwnerLastName(e.target.value);
    };
    const handleOwnerAddressChange = (e) => {
        setOwnerAddress(e.target.value);
    };
    const handleOwnerCityChange = (e) => {
        setOwnerCity(e.target.value);
    };
    const handleOwnerStateChange = (e) => {
        setOwnerState(e.target.value);
    };
    const handleOwnerEmailChange = (e) => {
        setOwnerEmail(e.target.value);
    };
    const handleOwnerZipCodeChange = (e) => {
        setOwnerZipCode(e.target.value);
    };
    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };
    const handleTaxCodeChange = (e) => {
        settaxCode(e.target.value);
    };
    const handleNewMerchantIdChange = (e) => {
        setNewMerchantId(e.target.value);
    };
    const handleAssignedChange = (value) => {
        setAssignedUser(value);
        const selectedAgent = agentList.find((agent) => String(agent.id) === String(value));
        setAssignedUserName(getAgentDisplayName(selectedAgent));
    };
    const handleAddProductClick = () => {
        setIsAddMerchantIdDisabled(true);
    };
    const handleCheckboxChange = () => { // Add this function
        setIsChecked(!isChecked);
    };
    const handleSearchSerialNumberChange = (e) => {
        setSearchSerialNumber(e.target.value);
    };


    const validateMerchantInfo = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const zipRegex = /^\d{5}(?:-\d{4})?$/;

        if (email && !emailRegex.test(email)) {
            toast.error("Please enter a valid Business email address");
            return false;
        }
        if (ownerEmail && !emailRegex.test(ownerEmail)) {
            toast.error("Please enter a valid Owner email address");
            return false;
        }
        if (contactNo && contactNo.length < 10) {
            toast.error("DBA phone number must be at least 10 characters long");
            return false;
        }
        if (phone && phone.length < 10) {
            toast.error("Contact No must be at least 10 characters long");
            return false;
        }
        if (ownerPhoneNumber && ownerPhoneNumber.length < 10) {
            toast.error("Owner phone number must be at least 10 characters long");
            return false;
        }
        if (legalZipCode && !zipRegex.test(legalZipCode)) {
            toast.error("Please enter a valid Legal ZIP Code");
            return false;
        }
        if (dbaZipCode && !zipRegex.test(dbaZipCode)) {
            toast.error("Please enter a valid DBA ZIP Code");
            return false;
        }
        if (ownerZipCode && !zipRegex.test(ownerZipCode)) {
            toast.error("Please enter a valid Owner ZIP Code");
            return false;
        }

        return true;
    };

    const handleLogin = () => {
        if (!validateMerchantInfo()) return;

        // Show update confirmation modal instead of directly updating
        setShowUpdateModal(true);
    };

    const confirmUpdate = async () => {
        // Proceed with update logic
        setIsUpdating(true);
        // Prepare merchant IDs array
        const merchantIdsArray = [
            ...(merchantIdsString || '')
                .split(',')
                .map((id) => String(id || '').trim())
                .filter(Boolean)
                .map((merchantId) => ({ merchantId })),
            ...(String(newMerchantId || '').trim()
                ? [{ merchantId: String(newMerchantId || '').trim() }]
                : []),
        ];
        // Proceed with login logic
        setLoading(true);
        try {
            const currentValues = {
                "firstName": firstName,
                "legalAddress": legalAddress,
                "lastName": lastName,
                "state": state,
                "phoneNumber": phone,
                "dbaName": dbaName,
                "dbaPhoneNumber": contactNo,
                "legalBusinessName": businessName,
                "email": email,
                "assigneeId": assignedUser,
                "dbaAddress": dbaAddress,
                "ownerPhoneNumber": ownerPhoneNumber,
                "legalCity": legalCity,
                "businessState": dbaState,
                "businessCity": dbaCity,
                "businessZipCode": dbaZipCode,
                "ownerFirstName": ownerFirstName,
                "ownerLastName": ownerLastName,
                "ownerAddress": ownerAddress,
                "ownerState": ownerState,
                "ownerCity": ownerCity,
                "ownerZipcode": ownerZipCode,
                "ownerEmail": ownerEmail,
                "taxCode": taxCode,
                "comment": comments,
                "website": website,
                "merchantIds": merchantIdsArray, // Updated line
                "taxExempt": isChecked,
            };

            if (selectedModel) currentValues.model = selectedModel;
            if (selectedBrand) currentValues.brand = selectedBrand;
            if (selectedEncryption) currentValues.encryption = selectedEncryption;
            if (selectedProcessor) currentValues.processor = selectedProcessor;
            if (serialNo) currentValues.serialNo = serialNo;

            const original = customerData || location.state?.itemData || {};
            const originalValues = {
                ...original,
                merchantIds: Array.isArray(original.merchantIds)
                    ? original.merchantIds.map(({ merchantId }) => ({ merchantId }))
                    : [],
                taxExempt: Boolean(original.taxExempt),
                model: original.model || original.hardwareDetails?.model || original.merchantOwnedDetails?.model || "",
                brand: original.brand || original.hardwareDetails?.brand || original.merchantOwnedDetails?.brand || "",
                encryption: original.encryption || original.hardwareDetails?.encryption || "",
                processor: original.processor || original.hardwareDetails?.processor || "",
                serialNo: original.serialNo || original.hardwareDetails?.serialNo || original.merchantOwnedDetails?.serialNo || "",
            };
            const apiData = Object.fromEntries(
                Object.entries(currentValues).filter(([key, value]) =>
                    JSON.stringify(value ?? "") !== JSON.stringify(originalValues[key] ?? "")
                )
            );

            if (Object.keys(apiData).length === 0) {
                setShowUpdateModal(false);
                toast.info("No merchant information was changed");
                return;
            }

            const result = await putRequestWithBodyAndToken(`${baseURl}customer/${customerId}`, accessToken, apiData)
            setShowUpdateModal(false);
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
            setIsUpdating(false);
        }
    };

    const cancelUpdate = () => {
        setShowUpdateModal(false);
    };

    const handleSameDetailsClick = () => {
        setDbaName(businessName); // Set DBA Name
        setDbaAddress(legalAddress); // Set DBA Address
        setDbaCity(legalCity); // Set DBA City
        setDbaState(state); // Set DBA State
        setDbaZipCode(legalZipCode); // Set DBA Zip Code
    };

    const handleBackClick = () => {
        if (activeTab !== 'merchantInfo') {
            setActiveTabPersist('merchantInfo');
            return;
        }
        navigate(-1);
    };
    /** Maps API application-ticket status → SupportTicketDetail `location.state.status` (same strings as MemoTable). */
    const applicationTicketStatusToNavStatus = {
        submitted: "maintainance",
        signed: "terminal",
        uw: "deployment",
        approved: "follow-up"
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Button
                    onClick={handleBackClick}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Heading
                        Fontweight={700}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Edit Merchant Information'}
                        Fontsize={30}
                    />
                    <Chip
                        label={merchantStatus ? String(merchantStatus).toUpperCase() : '-'}
                        color={String(merchantStatus).toLowerCase() === 'active' ? 'success' : 'warning'}
                        variant="filled"
                        sx={{ fontWeight: 700, letterSpacing: '0.6px' }}
                    />
                </div>
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        {/* <GoBack /> */}
                    </div>

                    <div className="flex space-x-4 border-b mt-3 border-gray-200">
                        <button
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'merchantInfo'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTabPersist('merchantInfo')}
                        >
                            Merchant Info
                        </button>
                        <button
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'hardware'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTabPersist('hardware')}
                        >
                            Hardware Details
                        </button>
                        <button
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'processingInfo'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTabPersist('processingInfo')}
                        >
                            Processing Information
                        </button>
                        <button
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'tickets'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTabPersist('tickets')}
                        >
                            Tickets
                        </button>
                        <button
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === 'attachments'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTabPersist('attachments')}
                        >
                            Attachments
                        </button>
                    </div>

                    {activeTab === 'merchantInfo' && (
                        <div className="flex flex-col mt-4 gap-4">
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Merchant IDs"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Merchant IDs"
                                    inputValue={merchantIdsString}
                                    onInputChange={handleMerchantIdChange}
                                    addAgent={true}
                                    disabled={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            {!isAddMerchantIdDisabled && (
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48" />
                                    <Button
                                        variant="contained"
                                        onClick={handleAddProductClick}
                                        sx={{
                                            height: 32,
                                            fontSize: 12,
                                            textTransform: 'none',
                                            backgroundColor: 'rgba(67, 121, 238, 1)',
                                            '&:hover': { backgroundColor: 'rgba(67, 121, 238, 0.9)' },
                                        }}
                                    >
                                        Add New Merchant Id
                                    </Button>
                                </div>
                            )}

                            {isAddMerchantIdDisabled && (
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={"var(--sidebar-text-primary)"}
                                            Heading={"Add New Merchant Id"}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Add New Merchant Id"
                                        inputValue={newMerchantId}
                                        onInputChange={handleNewMerchantIdChange}
                                        addAgent={true}
                                        className="h-8 w-80 px-2"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"First Name"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="First Name"
                                    inputValue={firstName}
                                    onInputChange={handleFirstNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Last Name"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Last Name"
                                    inputValue={lastName}
                                    onInputChange={handleLastNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Legal Business Name"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Legal Business Name"
                                    inputValue={businessName}
                                    onInputChange={handleBusinessNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Legal Address"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Legal Address"
                                    inputValue={legalAddress}
                                    onInputChange={handleLegalAddressChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Legal City"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Legal City"
                                    inputValue={legalCity}
                                    onInputChange={handleLegalCityChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Legal State"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Legal State"
                                    inputValue={state}
                                    onInputChange={handleStateChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Legal Zip Code"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Legal Zip Code"
                                    inputValue={legalZipCode}
                                    onInputChange={handleLegalZipCodeChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Business Email"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Business Email"
                                    inputValue={email}
                                    onInputChange={handleEmailChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"DBA Name"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="DBA Name"
                                    inputValue={dbaName}
                                    onInputChange={handleDbaNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"DBA Address"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="DBA Address"
                                    inputValue={dbaAddress}
                                    onInputChange={handleDbaAddressChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"DBA City"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="DBA City"
                                    inputValue={dbaCity}
                                    onInputChange={handleDbaCityChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"DBA State"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="DBA State"
                                    inputValue={dbaState}
                                    onInputChange={handleDbaStateChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"DBA Zip Code"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="DBA Zip Code"
                                    inputValue={dbaZipCode}
                                    onInputChange={handleDbaZipCodeChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"DBA Phone Number"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="DBA Phone Number"
                                    inputValue={contactNo}
                                    onInputChange={handleContactNoChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Website"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Website"
                                    inputValue={website}
                                    onInputChange={handleWebsiteChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Contact No"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Contact No"
                                    inputValue={phone}
                                    onInputChange={handlePhoneChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Assign To"}
                                        Fontsize={16}
                                    />
                                </div>
                                <DropdownMenu
                                    menuItems={agentList.map(agent => ({
                                        text: getAgentDisplayName(agent),
                                        value: agent.id
                                    }))}
                                    addAgent={true}
                                    selectedValue={
                                        assignedUserName ||
                                        getAgentDisplayName(resolvedItemData?.agent) ||
                                        getAgentDisplayName(resolvedItemData?.assignee) ||
                                        getAgentDisplayName(
                                            agentList.find((a) => String(a.id) === String(assignedUser))
                                        )
                                    }
                                    defaultText={'Select Agent'}
                                    onSelect={handleAssignedChange}
                                    className="w-80"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner First Name"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner First Name"
                                    inputValue={ownerFirstName}
                                    onInputChange={handleOwnerFirstNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner Last Name"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner Last Name"
                                    inputValue={ownerLastName}
                                    onInputChange={handleOwnerLastNameChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner Address"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner Address"
                                    inputValue={ownerAddress}
                                    onInputChange={handleOwnerAddressChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner City"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner City"
                                    inputValue={ownerCity}
                                    onInputChange={handleOwnerCityChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner State"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner State"
                                    inputValue={ownerState}
                                    onInputChange={handleOwnerStateChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner Zip Code"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner Zip Code"
                                    inputValue={ownerZipCode}
                                    onInputChange={handleOwnerZipCodeChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner Phone Number"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner Phone Number"
                                    inputValue={ownerPhoneNumber}
                                    onInputChange={handleOwnerPhoneNumberChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Owner Email"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Owner Email"
                                    inputValue={ownerEmail}
                                    onInputChange={handleOwnerEmailChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Tax Exempt Code (if applicable)"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder=""
                                    inputValue={taxCode}
                                    onInputChange={handleTaxCodeChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div>

                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Tax Exempt"}
                                        Fontsize={16}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id='remember'
                                        outline='none'
                                        backgroundColor='transparent'
                                        checked={isChecked}
                                        onChange={handleCheckboxChange}
                                        className={'ml-2'}
                                        style={{ transform: 'scale(1.5)' }}
                                    />
                                    <label style={{ color: 'var(--Gray)', fontSize: 16 }} className="ml-4">Tax Exempt on Payment</label>
                                </div>
                            </div>

                            <div className="mt-2">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Comments"}
                                        Fontsize={16}
                                    />
                                </div>
                                <textarea
                                    type="text"
                                    placeholder="Comments"
                                    value={comments}
                                    onChange={handleCommentsChange}
                                    className={`mt-1 p-3 w-[80%]`}
                                    rows={4}
                                    style={{
                                        border: '1px solid #D1D5DC',
                                        fontSize: 14,
                                        borderRadius: 8,
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        color: 'var(--sidebar-text-primary)'
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'hardware' && (
                        <div className="mt-6">
                            {hardwareLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="text-gray-500">Loading hardware details...</div>
                                </div>
                            ) : hardwareData.length > 0 ? (
                                <AgentTable
                                    data={hardwareData.map(hardware => ({
                                        ...hardware,
                                        merchant: hardware.merchantFirstName && hardware.merchantLastName
                                            ? `${hardware.merchantFirstName} ${hardware.merchantLastName}`
                                            : hardware.merchantDbaName || '-',
                                        assignedBy: (
                                            <AssignedByCell
                                                name={hardware.assignedByName || hardware.assignedBy?.name || '-'}
                                                date={hardware.assignedDate}
                                                align="center"
                                            />
                                        ),
                                    }))}
                                    columns={[
                                        // { id: 'serialNo', label: 'Serial No', align: 'center' },
                                        { id: 'itemName', label: 'Item Name', align: 'center' },
                                        // { id: 'itemId', label: 'Item ID', align: 'center' },
                                        { id: 'serialNo', label: 'Serial ID', align: 'center' },
                                        { id: 'assignedBy', label: 'Assigned By', align: 'center' },
                                        { id: 'merchantDbaName', label: 'Merchant', align: 'center' }
                                    ]}
                                    onRowClick={(hardware) => navigate('/home/snItemDetail/', { state: { serialId: hardware.serialId } })}
                                    containerMaxHeight={false}
                                />
                            ) : (
                                <div className="text-center py-8">
                                    <div className="text-gray-500">No hardware details found for this merchant.</div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'processingInfo' && (
                        <div className="flex flex-col mt-4 gap-4">
                            {/* <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Search by Serial Number"}
                                        Fontsize={16}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Search by serial number"
                                    inputValue={searchSerialNumber}
                                    onInputChange={handleSearchSerialNumberChange}
                                    addAgent={true}
                                    className="h-8 w-80 px-2"
                                />
                            </div> */}

                            <div className="mt-6">
                                <AgentTable
                                    columns={[
                                        { id: 'id', label: 'Application ID', align: 'center' },
                                        { id: 'solution', label: 'Solution', align: 'center' },
                                        { id: 'plan', label: 'Plan', align: 'center' },
                                        { id: 'platform', label: 'Platform', align: 'center' },
                                        { id: 'merchantID', label: 'Merchant ID', align: 'center' },
                                        // { id: 'fein', label: 'TAX ID', align: 'center' },
                                        { id: 'status', label: 'Status', align: 'center' }
                                    ]}
                                    data={(resolvedItemData?.applications || []).map(app => ({
                                        id: app.id,
                                        solution: getSolutionText(app.solution),
                                        solutionValue: app.solution,
                                        plan: app.plan || '-',
                                        platform: app.platform || '-',
                                        merchantID: app.applicationProcessing?.find(p => p.fieldName === 'merchantID')?.fieldValue || '-',
                                        fein: app.fein || '-',
                                        status: app.status,
                                        application: app
                                    }))}
                                    onRowClick={(row) => {
                                        navigate('/home/applicationPreferences', { state: { application: { ...row, solution: row.solutionValue }, merchant: resolvedItemData } });
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'tickets' && (
                        <div className="flex flex-col mt-4 gap-4">
                            {loading ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="text-gray-500">Loading tickets...</div>
                                </div>
                            ) : !customerData ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="text-gray-500">Loading customer data...</div>
                                </div>
                            ) : (
                                <>
                                    {(!customerData?.tickets?.length && !customerData?.applicationTickets?.length) ? (
                                        <div className="flex justify-center items-center py-8">
                                            <div className="text-gray-500">No tickets found for this customer.</div>
                                        </div>
                                    ) : (
                                        <MemoTable
                                            customerTable
                                            data={(() => {
                                                const ticketData = [];

                                                // Process normal tickets
                                                if (customerData?.tickets && Array.isArray(customerData.tickets)) {
                                                    customerData.tickets.forEach(ticket => {
                                                        if (ticket && typeof ticket === 'object') {
                                                            ticketData.push({
                                                                id: typeof ticket.id === 'number' || typeof ticket.id === 'string' ? String(ticket.id) : '',
                                                                ticketType: 'normal',
                                                                displayName: typeof ticket.title === 'string' && ticket.title ? String(ticket.title) : '-',
                                                                categoryName: ticket.category && typeof ticket.category === 'object' && typeof ticket.category.title === 'string' ? String(ticket.category.title) : '-',
                                                                typeName: ticket.ticketType && typeof ticket.ticketType === 'object' && typeof ticket.ticketType.title === 'string' ? String(ticket.ticketType.title) : '-',
                                                                priority: typeof ticket.priority === 'string' && ticket.priority ? String(ticket.priority) : '-',
                                                                status: typeof ticket.status === 'string' && ticket.status ? String(ticket.status) : '-',
                                                                createdAt: ticket.createdAt && !isNaN(new Date(ticket.createdAt).getTime()) ? new Date(ticket.createdAt).toLocaleString("en-US", {
                                                                    month: "short",
                                                                    day: "2-digit",
                                                                    year: "numeric"
                                                                }) : '-',
                                                                agentName: ticket.agent && typeof ticket.agent === 'object' && typeof ticket.agent.name === 'string' ? String(ticket.agent.name) : '-',
                                                                assigneeName: ticket.assignee && typeof ticket.assignee === 'object' && typeof ticket.assignee.name === 'string' ? String(ticket.assignee.name) : '-',
                                                                // Store original objects for navigation
                                                                _originalTicket: ticket
                                                            });
                                                        }
                                                    });
                                                }

                                                // Process application tickets
                                                if (customerData?.applicationTickets && Array.isArray(customerData.applicationTickets)) {
                                                    customerData.applicationTickets.forEach(appTicket => {
                                                        if (appTicket && typeof appTicket === 'object') {
                                                            const application = appTicket.application;
                                                            let displayName = '-';

                                                            if (application && typeof application === 'object') {
                                                                const businessName = typeof application.businessName === 'string' ? application.businessName : null;
                                                                const firstName = typeof application.merchantFirstName === 'string' ? application.merchantFirstName : null;
                                                                const lastName = typeof application.merchantLastName === 'string' ? application.merchantLastName : null;

                                                                if (businessName) {
                                                                    displayName = String(businessName);
                                                                } else if (firstName || lastName) {
                                                                    displayName = String(`${firstName || ''} ${lastName || ''}`.trim() || '-');
                                                                }
                                                            }

                                                            ticketData.push({
                                                                id: typeof appTicket.id === 'number' || typeof appTicket.id === 'string' ? String(appTicket.id) : '',
                                                                ticketType: 'application',
                                                                displayName: displayName,
                                                                categoryName: 'Application',
                                                                typeName: 'Application Ticket',
                                                                priority: 'medium',
                                                                status: typeof appTicket.status === 'string' && appTicket.status ? String(appTicket.status) : '-',
                                                                createdAt: appTicket.createdAt && !isNaN(new Date(appTicket.createdAt).getTime()) ? new Date(appTicket.createdAt).toLocaleString("en-US", {
                                                                    month: "short",
                                                                    day: "2-digit",
                                                                    year: "numeric"
                                                                }) : '-',
                                                                applicationId: typeof appTicket.applicationId === 'number' || typeof appTicket.applicationId === 'string' ? String(appTicket.applicationId) : '',
                                                                ticketId: typeof appTicket.ticketId === 'number' || typeof appTicket.ticketId === 'string' ? String(appTicket.ticketId) : '',
                                                                solution: application && typeof application.solution === 'string' ? String(application.solution) : '-',
                                                                platform: application && typeof application.platform === 'string' ? String(application.platform) : '-',
                                                                // Store complete application object for navigation
                                                                _originalAppTicket: appTicket,
                                                                _application: application // Store the complete application object
                                                            });
                                                        }
                                                    });
                                                }

                                                return ticketData;
                                            })()}
                                            columns={[
                                                { id: 'displayName', label: 'Ticket Title', align: 'center' },
                                                { id: 'categoryName', label: 'Category', align: 'center' },
                                                { id: 'typeName', label: 'Type', align: 'center' },
                                                { id: 'priority', label: 'Priority', align: 'center' },
                                                { id: 'status', label: 'Status', align: 'center' },
                                                { id: 'createdAt', label: 'Created Date', align: 'center' }
                                            ]}
                                            onRowClick={(event, row) => {
                                                console.log('Ticket row clicked:', row);
                                                if (row.ticketType === 'normal') {
                                                    // Use the stored complete ticket object
                                                    const originalTicket = row._originalTicket;
                                                    console.log('Navigating to singleTicket with:', originalTicket);
                                                    navigate('/home/singleTicket', {
                                                        state: {
                                                            rowData: originalTicket
                                                        }
                                                    });
                                                } else if (row.ticketType === 'application') {
                                                    console.log('Application ticket clicked:', row);
                                                    const appTicket = row._originalAppTicket;
                                                    const apiStatus = String(appTicket?.status || row.status || '').toLowerCase();
                                                    const navStatus = applicationTicketStatusToNavStatus[apiStatus] || 'maintainance';
                                                    console.log('Navigating to supportTicketDetail with status:', navStatus, 'and data:', appTicket);
                                                    const ticketIdNum = appTicket?.ticketId != null ? Number(appTicket.ticketId) : null;
                                                    const linkedSupportTicket = customerData?.tickets?.find(
                                                        t => t.id === ticketIdNum || String(t.id) === String(appTicket?.ticketId)
                                                    );
                                                    const fullApplication =
                                                        customerData?.applications?.find(
                                                            a => a.id === appTicket?.applicationId || String(a.id) === String(row.applicationId)
                                                        ) || row._application;

                                                    clearSupportTicketDetailSidebarRoute();
                                                    navigate('/home/supportTicketDetail', {
                                                        state: {
                                                            status: navStatus,
                                                            itemData: appTicket,
                                                            fromRoute: 'customerList',
                                                            // {
                                                                // ticketType: 'application',
                                                                // allData: appTicket,
                                                                // ticket: linkedSupportTicket || (appTicket?.ticketId != null
                                                                //     ? { id: appTicket.ticketId }
                                                                //     : undefined),
                                                                // application: fullApplication
                                                            // }
                                                        }
                                                    });
                                                }
                                            }}
                                            containerMaxHeight={false}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'attachments' && (
                        <div className="flex flex-col mt-4 gap-4">
                            {attachmentsLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="text-gray-500">Loading attachments...</div>
                                </div>
                            ) : !attachments.length ? (
                                <div className="flex justify-center items-center py-8">
                                    <div className="text-gray-500">No attachments found for this customer.</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {attachments.map((attachment, index) => (
                                        <div
                                            key={index}
                                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                                            style={{
                                                backgroundColor: 'var(--dashboard-card-bg)',
                                                borderColor: 'var(--dashboard-border)'
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-3 min-w-0">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <div className="w-10 h-10 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                        <h3
                                                            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                                                            style={{ color: 'var(--dashboard-text-primary)' }}
                                                            title={attachment.fileName || attachment.name || `Attachment ${index + 1}`}
                                                        >
                                                            {attachment.fileName || attachment.name || `Attachment ${index + 1}`}
                                                        </h3>
                                                        <p
                                                            className="text-xs text-gray-500 dark:text-gray-400 truncate"
                                                            style={{ color: 'var(--dashboard-text-secondary)' }}
                                                            title={attachment.category || attachment.fileType || 'Unknown file'}
                                                        >
                                                            {attachment.category || attachment.fileType || 'Unknown file'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400" style={{ color: 'var(--dashboard-text-secondary)' }}>Category:</span>
                                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100" style={{ color: 'var(--dashboard-text-primary)' }}>
                                                        {attachment.category || 'Unknown'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400" style={{ color: 'var(--dashboard-text-secondary)' }}>File Type:</span>
                                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100" style={{ color: 'var(--dashboard-text-primary)' }}>
                                                        {attachment.fileType || 'Unknown'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400" style={{ color: 'var(--dashboard-text-secondary)' }}>Size:</span>
                                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100" style={{ color: 'var(--dashboard-text-primary)' }}>
                                                        {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : 'Unknown'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400" style={{ color: 'var(--dashboard-text-secondary)' }}>Uploaded:</span>
                                                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100" style={{ color: 'var(--dashboard-text-primary)' }}>
                                                        {attachment.createdAt ? new Date(attachment.createdAt).toLocaleDateString() : 'Unknown'}
                                                    </span>
                                                </div>
                                                
                                                {attachment.uploadedBy && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400" style={{ color: 'var(--dashboard-text-secondary)' }}>By:</span>
                                                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100" style={{ color: 'var(--dashboard-text-primary)' }}>
                                                            {attachment.uploadedBy}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {attachment.applicationId && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400" style={{ color: 'var(--dashboard-text-secondary)' }}>Application ID:</span>
                                                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100" style={{ color: 'var(--dashboard-text-primary)' }}>
                                                            #{attachment.applicationId}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700" style={{ borderColor: 'var(--dashboard-border)' }}>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="flex-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-2 px-3 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        onClick={() => handlePreviewAttachment(attachment)}
                                                    >
                                                        Preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="flex-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors py-2 px-3 border border-green-600 dark:border-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        onClick={(event) => handleDownloadAttachment(attachment, event)}
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'merchantInfo' && (
                        <div className="flex justify-end gap-3 mt-6">
                            <BottonCustom
                                backgroundColor={"transparent"}
                                width={130}
                                title={"Cancel"}
                                height={40}
                                color={"var(--dashboard-text-primary)"}
                                fontSize={16}
                                fontWeight={500}
                                border={"1px solid var(--sidebar-selected-bg)"}
                                onClick={() => navigate(-1)}
                            />
                            <BottonCustom
                                backgroundColor={'rgba(67, 121, 238, 1)'}
                                width={130}
                                title={'Save'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                onClick={handleLogin}
                            />
                        </div>
                    )}
                </div>
            </div>
            <UpdateConfirmationModal
                open={showUpdateModal}
                title="Update Customer"
                subtitle="Are you sure you want to update"
                entityName={businessName || "this customer"}
                updateMessage="This action will update customer details, contact information, and merchant data with the current changes."
                onCancel={cancelUpdate}
                onUpdate={confirmUpdate}
                isLoading={isUpdating}
            />
            
            {/* Attachment Preview Modal */}
            <Modal
                open={previewModalOpen}
                onClose={handleClosePreviewModal}
                aria-labelledby="attachment-preview-modal"
                aria-describedby="attachment-preview-description"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiBackdrop-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)'
                    }
                }}
            >
                <Box
                    sx={{
                        backgroundColor: 'var(--dashboard-card-bg)',
                        borderRadius: 2,
                        boxShadow: 24,
                        maxWidth: "98vw",
                        maxHeight: "95vh",
                        width: "95vw",
                        height: "90vh",
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid var(--dashboard-border)'
                    }}
                >
                    {/* Modal Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            borderBottom: '1px solid var(--dashboard-border)'
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'var(--sidebar-text-primary)',
                                    fontWeight: 600,
                                    fontSize: '18px'
                                }}
                            >
                                {previewAttachment?.fileName || 'Attachment Preview'}
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'var(--dashboard-text-secondary)',
                                    fontSize: '14px',
                                    mt: 0.5
                                }}
                            >
                                {previewAttachment?.category || 'Document'} • {previewAttachment?.fileType || 'Unknown file'}
                            </Typography>
                        </Box>
                        <Button
                            onClick={handleClosePreviewModal}
                            sx={{
                                minWidth: 'auto',
                                p: 1,
                                color: 'var(--dashboard-text-secondary)',
                                '&:hover': {
                                    backgroundColor: 'var(--dashboard-border)'
                                }
                            }}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            ✕
                        </Button>
                    </Box>
                    
                    {/* Modal Content */}
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            p: 2,
                            overflow: 'hidden'
                        }}
                    >
                        {(() => {
                            // Check file extension FIRST, then MIME type - prioritize actual file extension
                            const isPdf = previewAttachment?.fileName?.endsWith('.pdf');
                            const isImage = previewAttachment?.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            
                            if (isPdf) {
                                return pdfLoadError ? (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            gap: 2
                                        }}
                                    >
                                        <Box
                                            component="svg"
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                color: '#ef4444'
                                            }}
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: 'var(--dashboard-text-secondary)',
                                                textAlign: 'center'
                                            }}
                                        >
                                            PDF Preview Unavailable
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: 'var(--dashboard-text-secondary)',
                                                fontSize: '12px',
                                                textAlign: 'center',
                                                maxWidth: '80%'
                                            }}
                                        >
                                            Click to open in new tab
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'center' }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => window.open(previewAttachment?.url || "#", '_blank')}
                                                sx={{
                                                    borderColor: 'var(--dashboard-primary)',
                                                    color: 'var(--dashboard-primary)',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--dashboard-primary)',
                                                        color: 'white'
                                                    }
                                                }}
                                            >
                                                Open in New Tab
                                            </Button>
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={() => {
                                                    setPdfLoadError(false);
                                                }}
                                                sx={{
                                                    color: 'var(--dashboard-primary)',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--dashboard-primary)',
                                                        color: 'white'
                                                    }
                                                }}
                                            >
                                                Retry Preview
                                            </Button>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            position: "relative",
                                            overflow: 'hidden',
                                            borderRadius: 1,
                                            border: '1px solid var(--dashboard-border)',
                                            backgroundColor: '#fff',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => window.open(previewAttachment?.url || "#", '_blank')}
                                    >
                                        <iframe
                                            src={`${previewAttachment?.url || "#"}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&zoom=auto&view=FitH`}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                border: 'none',
                                                display: 'block'
                                            }}
                                            onError={(e) => {
                                                console.log('PDF iframe error:', e);
                                                setPdfLoadError(true);
                                            }}
                                            onLoad={() => {
                                                console.log('PDF iframe loaded successfully');
                                                setPdfLoadError(false);
                                            }}
                                        />
                                    </Box>
                                );
                            } else if (isImage) {
                                return (
                                    // Image preview - exactly like storage bucket
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            p: 2,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => window.open(previewAttachment?.url || "#", '_blank')}
                                    >
                                        <Box
                                            component="img"
                                            src={previewAttachment?.url || "#"}
                                            alt={previewAttachment?.fileName || "Unknown"}
                                            sx={{
                                                maxWidth: '100%',
                                                maxHeight: '80%',
                                                objectFit: 'contain',
                                                borderRadius: 1,
                                                border: '1px solid var(--dashboard-border)'
                                            }}
                                            onError={(e) => {
                                                console.log('Image load error:', e);
                                                e.target.style.display = 'none';
                                                // Show fallback
                                                const fallback = e.target.parentElement.querySelector('.image-fallback');
                                                if (fallback) fallback.style.display = 'flex';
                                            }}
                                            onLoad={() => {
                                                console.log('Image loaded successfully');
                                            }}
                                        />
                                        <Box
                                            className="image-fallback"
                                            sx={{
                                                display: 'none',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                height: '100%',
                                                gap: 2
                                            }}
                                        >
                                            <Box
                                                component="svg"
                                                sx={{
                                                    width: 64,
                                                    height: 64,
                                                    color: 'var(--dashboard-text-secondary)'
                                                }}
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                            >
                                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                            </Box>
                                            <Typography
                                                sx={{
                                                    color: 'var(--dashboard-text-secondary)',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                Image Preview Unavailable
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => window.open(previewAttachment?.url || "#", '_blank')}
                                                sx={{
                                                    borderColor: 'var(--dashboard-primary)',
                                                    color: 'var(--dashboard-primary)',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--dashboard-primary)',
                                                        color: 'white'
                                                    }
                                                }}
                                            >
                                                Open in New Tab
                                            </Button>
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: 'var(--dashboard-text-secondary)',
                                                textAlign: 'center',
                                                mt: 2
                                            }}
                                        >
                                            {previewAttachment?.fileName || "Unknown"}
                                        </Typography>
                                    </Box>
                                );
                            } else {
                                return (
                                    // Other file types - exactly like storage bucket
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            gap: 2,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => window.open(previewAttachment?.url || "#", '_blank')}
                                    >
                                        <Box
                                            component="svg"
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                color: 'var(--dashboard-text-secondary)'
                                            }}
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                        >
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: 'var(--dashboard-text-secondary)',
                                                textAlign: 'center'
                                            }}
                                        >
                                            Preview not available for this file type
                                        </Typography>
                                        <Typography
                                            sx={{
                                                color: 'var(--dashboard-text-secondary)',
                                                fontSize: '12px',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {previewAttachment?.fileName || "Unknown"} ({previewAttachment?.fileType || "Unknown"})
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => window.open(previewAttachment?.url || "#", '_blank')}
                                            sx={{
                                                borderColor: 'var(--dashboard-primary)',
                                                color: 'var(--dashboard-primary)',
                                                '&:hover': {
                                                    backgroundColor: 'var(--dashboard-primary)',
                                                    color: 'white'
                                                }
                                            }}
                                        >
                                            Open in New Tab
                                        </Button>
                                    </Box>
                                );
                            }
                        })()}
                    </Box>
                    
                    {/* Modal Footer */}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            borderTop: '1px solid var(--dashboard-border)',
                            gap: 2
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 2
                            }}
                        >
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={(event) => handleDownloadAttachment(previewAttachment, event)}
                                sx={{
                                    borderColor: 'var(--dashboard-primary)',
                                    color: 'var(--dashboard-primary)',
                                    '&:hover': {
                                        backgroundColor: 'var(--dashboard-primary)',
                                        color: 'white'
                                    }
                                }}
                            >
                                Download
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    if (previewAttachment?.url) {
                                        window.open(previewAttachment?.url || "#", '_blank');
                                    }
                                }}
                                sx={{
                                    borderColor: 'var(--dashboard-primary)',
                                    color: 'var(--dashboard-primary)',
                                    '&:hover': {
                                        backgroundColor: 'var(--dashboard-primary)',
                                        color: 'white'
                                    }
                                }}
                            >
                                Open in New Tab
                            </Button>
                        </Box>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleClosePreviewModal}
                            sx={{
                                backgroundColor: '#1976d2',
                                color: 'white',
                                '&:hover': {
                                    backgroundColor: '#1565c0'
                                }
                            }}
                        >
                            Close
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </div>
    );
};

export default EditCustomer;
