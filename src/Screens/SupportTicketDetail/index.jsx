import { useEffect, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import DropdownMenu from "../../Components/dropdownMenu";
import UploadFile from "../../Components/UploadFile";
import GoBack from "../../Components/GoBack";
import { toast } from "react-toastify";
import { getRequestWithOutBody, getRequestWithOutBodyCached, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken, patchComment } from "../../Api/fetch";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import Spinner from "../../Components/Spinner";
import LabeledInput from "../../Components/LabeledInput";
import CustomDatePicker from "../../Components/CustomDatePicker";
import SearchInput from "../../Components/SearchInput";
import { Switch } from "@headlessui/react";
import dayjs from "dayjs";
import CustomTimePicker from "../../Components/CustomTimePicker";
import ProductItem from "../../Components/ProductItem";
import ProductListModal from "../../Components/ProductListModal";
import { Button } from "@mui/material";
import { IoIosArrowBack } from "react-icons/io";
import Loader from "../../Components/Loader";
import { resolveSupportTicketDetailSidebarRoute, setSupportTicketDetailSidebarRoute } from "../../Utils/supportTicketDetailSidebarRoute";
import UserProfileAvatar from "../../Components/UserProfileAvatar";
import { getPreferenceOptions, isPreferenceRequired } from "../../Utils/preferenceExtra";

function planToDropdownString(plan) {
    if (plan == null || plan === '') return '';
    if (typeof plan === 'object' && !Array.isArray(plan))
        return String(plan.name ?? plan.title ?? plan.plan ?? '');
    return String(plan);
}

const UI_TAB_STATUSES = new Set(['maintainance', 'terminal', 'deployment', 'followup']);

const SOLUTION_LABELS = {
    'credit-card': 'Credit Card Processing',
    atm: 'ATM Solutions',
    'cash-advance': 'Cash Advance',
    pos: 'Point-Of-Sale Solutions',
    ebt: 'EBT Processing',
    airvac: 'AIRVAC Systems',
    website: 'Website Services',
    'ach-processing': 'ACH Processing',
};

const getSolutionLabel = (solution) => {
    if (!solution || typeof solution !== 'string') return null;
    const normalized = solution.trim().toLowerCase();
    if (!normalized) return null;
    return SOLUTION_LABELS[normalized] || solution;
};

const getStageTitle = (status) => {
    if (status === 'maintainance') return 'Maintenance Request';
    if (status === 'terminal') return 'Terminal Programming';
    if (status === 'deployment') return 'Deployment';
    if (status === 'followup') return 'Follow-Up';
    return 'Support Ticket Detail';
};

const getStageAccent = (status) => {
    if (status === 'maintainance') {
        return { solid: '#17A2B8', soft: 'rgba(23, 162, 184, 0.12)', text: '#0E7490' };
    }
    if (status === 'terminal') {
        return { solid: '#8B5CF6', soft: 'rgba(139, 92, 246, 0.12)', text: '#6D28D9' };
    }
    if (status === 'deployment') {
        return { solid: '#F59E0B', soft: 'rgba(245, 158, 11, 0.14)', text: '#B45309' };
    }
    if (status === 'followup') {
        return { solid: '#22C55E', soft: 'rgba(34, 197, 94, 0.12)', text: '#15803D' };
    }
    return { solid: '#64748B', soft: 'rgba(100, 116, 139, 0.12)', text: '#475569' };
};

const sortByOrder = (items = []) =>
    [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
    return formNameMap[solution] || null;
};

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

const filterPreferencesForSolution = (data, solution) => {
    const formName = getFormName(solution);
    if (!formName) return [];
    return sortByOrder((data || []).filter((item) => item?.formName === formName));
};

const filterMerchantOwnedPreferencesForSolution = (data, solution) => {
    const formName = getMerchantOwnedFormName(solution);
    if (!formName) return [];
    return sortByOrder((data || []).filter((item) => item?.formName === formName));
};

const formatMerchantOwnedValue = (value) => {
    if (value == null) return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
};

const hasFilledValue = (value) => {
    if (value == null) return false;
    if (typeof value === "boolean") return true;
    if (typeof value === "number") return !Number.isNaN(value);
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return planToDropdownString(value) !== "" || Object.keys(value).length > 0;
    return false;
};

const SupportTicketDetail = () => {
    console.log('SupportTicketDetail component mounted');
    const location = useLocation();
    console.log('Location state:', location.state);
    const [searchParams] = useSearchParams();
    const ticketIdFromUrl = searchParams.get('id');
    const statusFromUrl = searchParams.get('status');
    const fromRouteFromUrl = searchParams.get('from');
    const userData = useSelector((state) => state.userData.userDetails);
    console.log('User data:', userData);
    const accessToken = useSelector((state) => state.auth.accessToken);
    console.log('Access token:', accessToken);
    const navigate = useNavigate();

    /** Memo list: `itemData.allData`. EditCustomer flat: `itemData` with applicationId + ticketId. */
    const rawItemData = location.state?.itemData ?? {};
    const applicationTicketPayload =
        rawItemData.allData != null && typeof rawItemData.allData === 'object'
            ? rawItemData.allData
            : rawItemData.applicationId != null && rawItemData.ticketId != null
                ? rawItemData
                : null;

    const isApplicationTicket =
        location.state?.status === 'application' ||
        rawItemData.ticketType === 'application' ||
        applicationTicketPayload != null ||
        ticketIdFromUrl != null;

    const applicationTicketId =
        applicationTicketPayload?.id ??
        rawItemData?.allData?.id ??
        rawItemData?.id ??
        ticketIdFromUrl;

    /** UI tab: prefer `state.status`; then URL `status`; use `itemData.status` only when it is a tab (not workflow e.g. submitted). */
    const navUiStatus = String(
        (location.state?.status != null && location.state?.status !== '')
            ? location.state.status
            : (statusFromUrl != null && statusFromUrl !== '')
                ? statusFromUrl
                : (rawItemData.status != null &&
                    UI_TAB_STATUSES.has(String(rawItemData.status).toLowerCase()))
                    ? rawItemData.status
                    : ''
    ).toLowerCase();
    const [loading, setLoading] = useState(false);
    const [agentList, setAgentList] = useState([]);
    const [selectedDeveloper, setSelectedDeveloper] = useState("");
    const [hardware, setHardware] = useState("");
    const [autoBatchTime, setAutoBatchTime] = useState("");
    const [tipAdjustments, setTipAdjustments] = useState("");
    const [pricingPlan, setPricingPlan] = useState("");
    const [processor, setProcessor] = useState("");
    const [available, setAvailable] = useState("");
    const [inStock, setInStock] = useState("");
    const [terminalType, setTerminalType] = useState("");
    const [buildFileName, setBuildFileName] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [shippingMethod, setShippingMethod] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [selectedStage, setSelectedStage] = useState("");
    const [notes, setNotes] = useState("");
    const [selectedDeveloperId, setSelectedDeveloperId] = useState("");
    const [uploadedFile, setUploadedFile] = useState(null);
    const [ticketData, setTicketData] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState(null); // Step 1: Define state
    const [comments, setComments] = useState("")
    const [formValues, setFormValues] = useState({});
    const [preferencesData, setPreferencesData] = useState(null);
    const [merchantOwnedPreferencesData, setMerchantOwnedPreferencesData] = useState([]);
    const [itemServicesList, setItemServicesList] = useState([]);
    const [selectedHardware, setSelectedHardware] = useState("");
    const [pricePlanData, setPricePlanData] = useState([]);
    const [fetchedData, setFetchedData] = useState(null);
    const [editableHardwareList, setEditableHardwareList] = useState([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [selectedHardwares, setSelectedHardwares] = useState([]);
    const saveInProgressRef = useRef(false);

    const seedFromNavigationState = () => {
        if (!isApplicationTicket || !applicationTicketPayload?.id) return;

        const supportTicket = rawItemData.ticket ?? applicationTicketPayload.ticket;
        const application = rawItemData.application ?? applicationTicketPayload.application;

        if (supportTicket) {
            if (supportTicket.assignee?.id != null) setSelectedDeveloperId(supportTicket.assignee.id);
            if (supportTicket.assignee?.name) setSelectedDeveloper(supportTicket.assignee.name);
            if (Array.isArray(supportTicket.uploadedFiles) && supportTicket.uploadedFiles.length > 0) {
                setUploadedUrl(supportTicket.uploadedFiles);
            }
            if (supportTicket.workOrder != null && supportTicket.workOrder !== '') {
                setNotes(String(supportTicket.workOrder));
            }
        }

        if (applicationTicketPayload.status != null && applicationTicketPayload.status !== '') {
            setSelectedStage(String(applicationTicketPayload.status));
        }

        if (application) {
            if (application.preferences && typeof application.preferences === 'object') {
                setFormValues({ ...application.preferences });
            }
            setPricingPlan(planToDropdownString(application.plan));
            setFetchedData(application);
            const hardwareArray = Array.isArray(application.hardware)
                ? application.hardware
                : [application.hardware].filter(Boolean);
            setSelectedHardwares(hardwareArray);
            setSelectedProductIds(hardwareArray.map(hw => hw?.itemServiceId || hw?.id));
            setSelectedHardware(application.hardware ?? (hardwareArray.length === 1 ? hardwareArray[0] : null));
        }

        setTicketData((prev) => ({
            ...(prev && typeof prev === 'object' ? prev : {}),
            id: applicationTicketPayload.id,
            status: applicationTicketPayload.status,
            ...(supportTicket ? { ticket: supportTicket } : {}),
            ...(application ? { application } : {}),
        }));
    };

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };
    const fetchData = () => {
        setLoading(true);
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                setAgentList(activeUsers);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchTicketData = () => {
        setLoading(true);

        if (!applicationTicketId) {
            setLoading(false);
            return;
        }

        getRequestWithOutBody(`${baseURl}application-ticket/${applicationTicketId}`, accessToken)
            .then(result => {
                const ticket = result?.data?.ticket;
                const application = result?.data?.application;

                setTicketData(result?.data);
                setSelectedDeveloperId(ticket?.assignee?.id || null);
                setSelectedDeveloper(ticket?.assignee?.name || '');
                setUploadedUrl(ticket?.uploadedFiles || []);
                setNotes(ticket?.workOrder || '');
                setSelectedStage(result?.data?.status || '');
                setFormValues(application?.preferences || {});
                setPricingPlan(planToDropdownString(application?.plan));
                setFetchedData(application || {});
                const hardwareData = application?.hardware;
                const hardwareArray = Array.isArray(application?.hardware) ? application?.hardware : [application?.hardware].filter(Boolean);
                setSelectedHardwares(hardwareArray);
                setSelectedProductIds(hardwareArray.map(hw => hw?.itemServiceId || hw?.id));
                setSelectedHardware(hardwareData);
            })
            .catch(error => {
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const fetchData2 = () => {
        const solution = fetchedData?.solution ?? ticketData?.application?.solution;
        const formName = getFormName(solution);
        const merchantOwnedFormName = getMerchantOwnedFormName(solution);

        if (!formName && !merchantOwnedFormName) {
            setPreferencesData([]);
            setMerchantOwnedPreferencesData([]);
            return;
        }

        setLoading(true);
        getRequestWithOutBody(`${baseURl}application-preferences`, accessToken)
            .then(result => {
                const allPreferences = result?.data || [];
                setPreferencesData(
                    formName ? filterPreferencesForSolution(allPreferences, solution) : []
                );
                setMerchantOwnedPreferencesData(
                    merchantOwnedFormName
                        ? filterMerchantOwnedPreferencesForSolution(allPreferences, solution)
                        : []
                );
                setLoading(false);
            })
            .catch(() => {
                setPreferencesData([]);
                setMerchantOwnedPreferencesData([]);
                setLoading(false);
            });
    };
    const fetchData3 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}price-plan`, accessToken
        )
            .then(result => {
                setPricePlanData(result?.data);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const fetchData4 = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}item-services`, accessToken
        )
            .then(result => {
                setItemServicesList(result?.data)
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }
    const handleProductModalSubmit = (selectedProduct) => {
        setSelectedHardware(selectedProduct);  // Update hardware
        setEditableHardwareList([{ item: selectedProduct }]);  // Update list
        setIsProductModalOpen(false);
    };


    useEffect(() => {
        seedFromNavigationState();
        fetchData();
        fetchTicketData();
    }, [applicationTicketId, isApplicationTicket]);

    useEffect(() => {
        if (fromRouteFromUrl) {
            setSupportTicketDetailSidebarRoute(fromRouteFromUrl);
        }
    }, [fromRouteFromUrl]);

    useEffect(() => {
        fetchData3();
        fetchData4();
    }, []);

    useEffect(() => {
        if (fetchedData || ticketData?.application) {
            fetchData2();
        }
    }, [fetchedData, ticketData?.application?.solution]);
    const UpdateTicketStatus = async (value) => {
        // Enhanced validation
        if (!value || value.trim() === "") {
            toast.error("Status value is required");
            return;
        }

        if (!ticketData?.id) {
            toast.error("Ticket information not available");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        if (String(ticketData.status) === value.trim()) {
            return;
        }

        try {
            const payload = {
                "status": value.trim()
            };

            // Validate payload
            if (!payload.status) {
                toast.error("Invalid status data");
                return;
            }

            const result = await putRequestWithBodyAndToken(`${baseURl}application-ticket/update-status/${ticketData.id}`, accessToken, payload);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            console.error('Ticket status update error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid status value provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to update ticket status");
                } else if (status === 404) {
                    toast.error("Ticket not found or may have been deleted");
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
        }
    }
    const handleHardwareFieldChange = (index, field, value) => {
        setEditableHardwareList(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    const handleDeveloperChange = (value) => {
        setSelectedDeveloper(value);
    };
    const handleDeveloperIdChange = (value) => {
        setSelectedDeveloperId(value);
    };
    // const handleHardwareChange = (value) => {
    //     setHardware(value);
    // };
    const handleHardwareChange = (item) => {
        setSelectedHardware(item || '');
        setEditableHardwareList([{ item }]); // this is the key!
    };

    const handleTipAdjustmentsChange = (value) => {
        setTipAdjustments(value);
    };
    const handlePricingPlanChange = (value) => {
        setPricingPlan(value);
    };
    const handleProcessorChange = (value) => {
        setProcessor(value);
    };
    const handleAvailableChange = (value) => {
        setAvailable(value);
    };
    const handleInStockChange = (value) => {
        setInStock(value);
    };
    const handleTerminalTypeChange = (value) => {
        setTerminalType(value);
    };
    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };
    const handleBuildFileNameChange = (value) => {
        setBuildFileName(value);
    };
    const handleShippingAddressChange = (value) => {
        setShippingAddress(value);
    };
    const handleShippingMethodChange = (value) => {
        setShippingMethod(value);
    };
    const handleTrackingNumberChange = (value) => {
        setTrackingNumber(value);
    };
    const handleStageChange = (value) => {
        setSelectedStage(value);
        // UpdateTicketStatus(value)
    };
    const handleNotesChange = (e) => {
        setNotes(e.target.value);
    };
    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setPickupDate(formattedDate);
    };
    const data3 = [
        {
            id: 'yes',
            text: 'Yes',
        },
        {
            id: 'no',
            text: 'No',
        },
    ]
    const shippingMethodList = [
        {
            id: 'shipping',
            text: 'Shipping',
        },
        {
            id: 'pickup',
            text: 'Pickup',
        },
    ]
    const stageList = [
        {
            id: 'new',
            text: 'Pending',
        },
        {
            id: 'submitted',
            text: 'Maintanace Terminal',
        },
        {
            id: 'signed',
            text: 'Terminal Programming',
        },
        {
            id: 'uw',
            text: 'Deployment',
        },
        {
            id: 'approved',
            text: 'Follow Up',
        },
    ]
    const statusToCategoryMap = {
        submitted: "maintainance",
        signed: "terminal",
        uw: "deployment",
        approved: "follow-up"
    };
    const getUniqueUploadedFiles = () => {
        const commentFiles = ticketData?.comments?.flatMap(comment => comment.fileUrl) || [];
        return uploadedUrl?.filter(file => file && !commentFiles.some(commentFile => commentFile && commentFile.url === file.url)) || [];
    };
    const SaveTicket = async () => {
        if (saveInProgressRef.current) return;

        // Enhanced validation
        const supportTicketId =
            ticketData?.ticket?.id ??
            applicationTicketPayload?.ticket?.id ??
            rawItemData.allData?.ticket?.id ??
            rawItemData.ticket?.id;

        if (!supportTicketId) {
            toast.error("Ticket information not available");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        // Validate comment if provided
        if (comments && comments.trim() === "") {
            toast.error("Comment cannot be empty");
            return;
        }

        if (comments && comments.trim().length < 3) {
            toast.error("Comment must be at least 3 characters long");
            return;
        }

        saveInProgressRef.current = true;
        setLoading(true);
        try {
            const uploadedFileResults = [];

            // Upload files with error handling
            if (Array.isArray(uploadedFile) && uploadedFile.length > 0) {
                for (const file of uploadedFile) {
                    if (!file) {
                        toast.error("Invalid file detected");
                        return;
                    }
                    
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'tickets');

                    try {
                        const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                        
                        if (!result1?.data?.uploadedFiles) {
                            toast.error(`Failed to upload file: ${file.name}`);
                            return;
                        }
                        
                        uploadedFileResults.push({
                            url: result1.data.uploadedFiles.url,
                            mimetype: result1.data.uploadedFiles.mimetype,
                            originalname: result1.data.uploadedFiles.originalname,
                        });
                    } catch (fileError) {
                        toast.error(`Failed to upload file: ${file.name}. ${fileError.message}`);
                        return;
                    }
                }
            }

            const commentsArray = {
                ...(comments.trim() !== "" && { message: comments.trim() }),
                ...(uploadedFileResults.length > 0 && { fileUrl: uploadedFileResults })
            };

            const currentTicket = ticketData?.ticket || applicationTicketPayload?.ticket || rawItemData.ticket || {};
            const assigneeChanged = selectedDeveloperId
                && String(selectedDeveloperId) !== String(currentTicket.assignee?.id ?? '');
            const workOrderChanged = notes
                && notes.trim() !== String(currentTicket.workOrder ?? '').trim();
            const ticketOnlyFiles = commentsArray.message ? [] : uploadedFileResults;
            const apiData = {
                ...(assigneeChanged && { assignedTo: selectedDeveloperId }),
                ...(workOrderChanged && { workOrder: notes.trim() }),
                ...(ticketOnlyFiles.length > 0 && {
                    uploadedFiles: [...(uploadedUrl || []), ...ticketOnlyFiles]
                })
            };

            // Validate payload before sending
            if (Object.keys(apiData).length === 0 && !commentsArray.message) {
                toast.error("No changes to save");
                return;
            }

            // Add comment if provided
            if (commentsArray.message && supportTicketId) {
                try {
                    await patchComment(`${baseURl}ticket/${supportTicketId}/comment`, accessToken, commentsArray.message, commentsArray.fileUrl);
                } catch (commentError) {
                    console.warn('Comment addition failed:', commentError);
                    // Continue with ticket update even if comment fails
                }
            }

            // A comment-only save must not also trigger a no-op ticket update.
            let result;
            if (Object.keys(apiData).length > 0) {
                result = await putRequestWithBodyAndToken(`${baseURl}ticket/${supportTicketId}`, accessToken, apiData);

                if (!result?.message) {
                    toast.error("Invalid response from server");
                    return;
                }
            }

            // Update application if needed
            const updatedApplicationPayload = {
                id: ticketData?.application?.id,
                agentId: ticketData?.application?.agent?.id,
                ...(Object.keys(formValues).length > 0 && { preferences: formValues }),
                ...(pricingPlan && pricingPlan?.id && { plan: pricingPlan }),
                currentStep: 6, // Submit
            };

            if (
                updatedApplicationPayload.preferences ||
                updatedApplicationPayload.plan
            ) {
                try {
                    await postRequestWithBodyAndToken(
                        `${baseURl}application`,
                        accessToken,
                        updatedApplicationPayload
                    );
                } catch (appError) {
                    console.warn('Application update failed:', appError);
                    // Continue even if application update fails
                }
            }

            toast.success(result?.message || "Comment added successfully");
            if (commentsArray.message) setComments("");
        } catch (error) {
            console.error('Ticket save error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid ticket data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to update this ticket");
                } else if (status === 404) {
                    toast.error("Ticket not found or may have been deleted");
                } else if (status === 413) {
                    toast.error("File size too large. Please upload smaller files.");
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
            saveInProgressRef.current = false;
            setLoading(false);
        }
    };
    const CancelTicket = () => {
        navigate(-1);
    }

    const businessName =
        fetchedData?.businessName ||
        ticketData?.application?.businessName ||
        rawItemData?.application?.businessName ||
        applicationTicketPayload?.application?.businessName ||
        '';
    const solutionRaw =
        fetchedData?.solution ||
        ticketData?.application?.solution ||
        rawItemData?.application?.solution ||
        applicationTicketPayload?.application?.solution ||
        '';
    const solutionLabel = getSolutionLabel(solutionRaw);
    const stageTitle = getStageTitle(navUiStatus);
    const stageAccent = getStageAccent(navUiStatus);

    return (
        <>
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'stretch',
                        gap: 16,
                        flexWrap: 'wrap',
                        marginBottom: 14,
                        padding: '14px 16px',
                        borderRadius: 14,
                        backgroundColor: 'var(--dashboard-card-bg, #fff)',
                        border: '1px solid rgba(148, 163, 184, 0.28)',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 20px rgba(15, 23, 42, 0.04)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 5,
                            backgroundColor: stageAccent.solid,
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0, flex: 1, paddingLeft: 6 }}>
                        <Button
                            onClick={() => navigate(-1)}
                            style={{
                                minWidth: 40,
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                backgroundColor: 'var(--dashboard-bg, #F8FAFC)',
                                border: '1px solid rgba(148, 163, 184, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'none',
                                flexShrink: 0,
                            }}
                        >
                            <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                        </Button>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        color: 'var(--dashboard-text-secondary, #64748B)',
                                    }}
                                >
                                    Support Ticket Detail
                                </span>
                                {applicationTicketId && (
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: '3px 8px',
                                            borderRadius: 6,
                                            backgroundColor: 'rgba(15, 23, 42, 0.06)',
                                            color: 'var(--dashboard-text-primary, #0F172A)',
                                            border: '1px solid rgba(15, 23, 42, 0.08)',
                                        }}
                                    >
                                        #{applicationTicketId}
                                    </span>
                                )}
                            </div>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={businessName || stageTitle}
                                Fontsize={24}
                            />
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
                                {solutionLabel && (
                                    <span
                                        title={solutionLabel}
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            lineHeight: 1.4,
                                            padding: '5px 12px',
                                            borderRadius: 8,
                                            backgroundColor: 'rgba(15, 23, 42, 0.08)',
                                            color: 'var(--dashboard-text-primary, #0F172A)',
                                            border: '1px solid rgba(15, 23, 42, 0.14)',
                                        }}
                                    >
                                        {solutionLabel}
                                    </span>
                                )}
                                <span
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        lineHeight: 1.4,
                                        padding: '5px 12px',
                                        borderRadius: 8,
                                        backgroundColor: stageAccent.soft,
                                        color: stageAccent.text,
                                        border: `1px solid ${stageAccent.solid}55`,
                                    }}
                                >
                                    {stageTitle}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                    {loading ?
                        <div className="text-center w-full mx-auto my-6 py-6">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                        : (
                            <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                                {/* <div className="flex justify-between gap-3 flex-wrap">
                                    <GoBack />
                                </div> */}
                                <div className="flex flex-col mt-4 gap-4">
                                    {selectedHardware && (
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between mr-6">
                                                <Heading
                                                    Fontweight={700}
                                                    color={'var(--sidebar-text-primary)'}
                                                    Heading={'Hardware'}
                                                    Fontsize={20}
                                                    mt={10}
                                                    ml={18}
                                                />
                                                {navUiStatus === "deployment" && fetchedData?.shipment?.type !== "pickup" && (
                                                    <BottonCustom
                                                        backgroundColor={'#1E1E1E'}
                                                        width={120}
                                                        title={'Label Print'}
                                                        height={36}
                                                        color={'#ffffff'}
                                                        fontSize={14}
                                                        fontWeight={500}
                                                        onClick={() => {
                                                            const fromRoute = resolveSupportTicketDetailSidebarRoute(location.state);
                                                            navigate('/home/supportTicketDetail/labelPrint', {
                                                                state: { application: fetchedData, fromRoute },
                                                            });
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-8">
                                                {!loading && (
                                                    <>
                                                        {(Array.isArray(selectedHardware)
                                                            ? selectedHardware
                                                            : [selectedHardware] // Wrap single object into array
                                                        ).map((item, index) => (
                                                            <ProductItem 
                                                            key={item.id || index} 
                                                            data={item} 
                                                            supprtTicket={true}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {navUiStatus === "maintainance" && (
                                        <div className="ml-6">
                                            <BottonCustom
                                                backgroundColor={'#3769E6'}
                                                width={130}
                                                title={'Change Hardware'}
                                                height={40}
                                                color={'#ffffff'}
                                                fontSize={13}
                                                fontWeight={500}
                                                onClick={() => setIsProductModalOpen(true)}
                                            />
                                        </div>
                                    )}

                                    {navUiStatus === "maintainance" && (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={"var(--sidebar-text-primary)"}
                                                        Heading={"Select Agent"}
                                                        Fontsize={16}
                                                    />
                                                </div>
                                                <SearchInput
                                                    selectedValue={selectedDeveloper}
                                                    suggestions={agentList}
                                                    onSelect={handleDeveloperIdChange}
                                                    addTicket={true}
                                                    idSet={true}
                                                    className="w-80"
                                                />
                                            </div>

                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={"var(--sidebar-text-primary)"}
                                                        Heading={"Pricing Plan"}
                                                        Fontsize={16}
                                                    />
                                                </div>
                                                <DropdownMenu
                                                    selectedValue={pricingPlan}
                                                    menuItems={pricePlanData
                                                        .filter(option => option?.service?.toLowerCase() === fetchedData?.solution?.toLowerCase())}
                                                    handleRoleIdChange={handlePricingPlanChange}
                                                    onSelect={handlePricingPlanChange}
                                                    defaultText={'Select'}
                                                    meetingLink={true}
                                                    className="w-80"
                                                />
                                            </div>

                                            {preferencesData?.length > 0 && (
                                                <div className="flex flex-col gap-4">
                                                    {preferencesData
                                                        .filter(item => item?.name && item?.preference)
                                                        .map((item, index) => {
                                                            // Normalize key matching: find corresponding key in formValues
                                                            const matchingKey = Object.keys(formValues).find(
                                                                key => key?.toLowerCase().trim() === item.name?.toLowerCase().trim()
                                                            );

                                                            const value = matchingKey ? formValues[matchingKey] : "";
                                                            const safeDropdownValue =
                                                                value != null && typeof value === "object" ? "" : value;
                                                            const required = isPreferenceRequired(item.extra);

                                                            switch (item.preference) {
                                                                case "textField":
                                                                    return (
                                                                        <div key={index} className="flex items-center gap-x-6 flex-wrap">
                                                                            <div className="w-48">
                                                                                <Heading
                                                                                    Fontweight={500}
                                                                                    color={"var(--sidebar-text-primary)"}
                                                                                    Heading={item.name}
                                                                                    Fontsize={16}
                                                                                    required={required}
                                                                                />
                                                                            </div>
                                                                            <LabeledInput
                                                                                inputPlaceholder={item.name}
                                                                                inputValue={value}
                                                                                onInputChange={(e) =>
                                                                                    setFormValues(prev => ({
                                                                                        ...prev,
                                                                                        [item.name]: e.target.value
                                                                                    }))
                                                                                }
                                                                                addAgent={true}
                                                                                className="h-8 w-80 px-2"
                                                                            />
                                                                        </div>
                                                                    );

                                                                case "dropdown":
                                                                    return (
                                                                        <div key={index} className="flex items-center gap-x-6 flex-wrap">
                                                                            <div className="w-48">
                                                                                <Heading
                                                                                    Fontweight={500}
                                                                                    color={"var(--sidebar-text-primary)"}
                                                                                    Heading={item.name}
                                                                                    Fontsize={16}
                                                                                    required={required}
                                                                                />
                                                                            </div>
                                                                            <DropdownMenu
                                                                                menuItems={getPreferenceOptions(item.extra)}
                                                                                meetingLink={true} 
                                                                                defaultText={item.name}
                                                                                onSelect={(selectedValue) =>
                                                                                    setFormValues(prev => ({
                                                                                        ...prev,
                                                                                        [item.name]: selectedValue
                                                                                    }))
                                                                                }
                                                                                selectedValue={safeDropdownValue}
                                                                                className="w-80"
                                                                            />
                                                                        </div>
                                                                    );

                                                                case "datePicker":
                                                                    return (
                                                                        <div key={index} className="flex items-center gap-x-6 flex-wrap">
                                                                            <div className="w-48">
                                                                                <Heading
                                                                                    Fontweight={500}
                                                                                    color={"var(--sidebar-text-primary)"}
                                                                                    Heading={item.name}
                                                                                    Fontsize={16}
                                                                                    required={required}
                                                                                />
                                                                            </div>
                                                                            <CustomDatePicker
                                                                                label={item.name}
                                                                                value={value || null}
                                                                                onChange={(selectedDate) =>
                                                                                    setFormValues(prev => ({
                                                                                        ...prev,
                                                                                        [item.name]: selectedDate
                                                                                    }))
                                                                                }
                                                                                addAgent={true}
                                                                                className="w-80"
                                                                            />
                                                                        </div>
                                                                    );

                                                                case "switch":
                                                                    return (
                                                                        <div key={index} className="flex items-center gap-x-6 flex-wrap">
                                                                            <div className="w-48">
                                                                                <Heading
                                                                                    Fontweight={500}
                                                                                    color={"var(--sidebar-text-primary)"}
                                                                                    Heading={item.name}
                                                                                    Fontsize={16}
                                                                                    required={required}
                                                                                />
                                                                            </div>
                                                                            <Switch
                                                                                checked={!!value}
                                                                                onChange={(checked) =>
                                                                                    setFormValues(prev => ({
                                                                                        ...prev,
                                                                                        [item.name]: checked
                                                                                    }))
                                                                                }
                                                                                className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                                                                            >
                                                                                <span
                                                                                    aria-hidden="true"
                                                                                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                                                                />
                                                                            </Switch>
                                                                        </div>
                                                                    );

                                                                case "timePicker":
                                                                    const timeValue = value
                                                                        ? typeof value === "string"
                                                                            ? dayjs(value.includes("T") ? value : `2000-01-01T${value}`)
                                                                            : dayjs(value)
                                                                        : null;

                                                                    return (
                                                                        <div key={index} className="flex items-center gap-x-6 flex-wrap">
                                                                            <div className="w-48">
                                                                                <Heading
                                                                                    Fontweight={500}
                                                                                    color={"var(--sidebar-text-primary)"}
                                                                                    Heading={item.name}
                                                                                    Fontsize={16}
                                                                                    required={required}
                                                                                />
                                                                            </div>
                                                                            <CustomTimePicker
                                                                                label={item.name}
                                                                                value={timeValue}
                                                                                labelFontSize={16}
                                                                                onChange={(newValue) =>
                                                                                    setFormValues((prev) => ({
                                                                                        ...prev,
                                                                                        [item.name]: dayjs(newValue).format("HH:mm"),
                                                                                    }))
                                                                                }
                                                                                meetingLink={true}
                                                                                className="w-80"
                                                                            />
                                                                        </div>
                                                                    );


                                                                default:
                                                                    return null;
                                                            }
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {navUiStatus !== "maintainance" && (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-x-6 flex-wrap">
                                                <div className="w-48">
                                                    <Heading
                                                        Fontweight={500}
                                                        color={"var(--sidebar-text-primary)"}
                                                        Heading={"Assigned"}
                                                        Fontsize={16}
                                                    />
                                                </div>
                                                <SearchInput
                                                    selectedValue={selectedDeveloper}
                                                    suggestions={agentList}
                                                    onSelect={handleDeveloperIdChange}
                                                    addTicket={true}
                                                    idSet={true}
                                                    className="w-80"
                                                />
                                            </div>

                                            {hasFilledValue(ticketData?.application?.plan) && (
                                                <div className="flex items-center gap-x-6 flex-wrap">
                                                    <div className="w-48">
                                                        <Heading
                                                            Fontweight={500}
                                                            color={"var(--sidebar-text-primary)"}
                                                            Heading={"Pricing Plan"}
                                                            Fontsize={16}
                                                        />
                                                    </div>
                                                    <LabeledInput
                                                        inputPlaceholder=""
                                                        inputValue={planToDropdownString(ticketData?.application?.plan)}
                                                        addAgent={true}
                                                        disabled={true}
                                                        className="h-8 w-80 px-2"
                                                    />
                                                </div>
                                            )}

                                            {(preferencesData?.length > 0
                                                ? preferencesData
                                                : []
                                            ).map((item, index) => {
                                                const matchingKey = Object.keys(formValues).find(
                                                    (key) => key?.toLowerCase().trim() === item.name?.toLowerCase().trim()
                                                );
                                                const value = matchingKey ? formValues[matchingKey] : "";
                                                if (!hasFilledValue(value)) return null;

                                                return (
                                                    <div key={item.id ?? index} className="flex items-center gap-x-6 flex-wrap">
                                                        <div className="w-48">
                                                            <Heading
                                                                Fontweight={500}
                                                                color={"var(--sidebar-text-primary)"}
                                                                Heading={item.name}
                                                                Fontsize={16}
                                                            />
                                                        </div>
                                                        <LabeledInput
                                                            inputPlaceholder="Value"
                                                            inputValue={value?.toString?.() ?? ""}
                                                            supportTicket={true}
                                                            addAgent={true}
                                                            disabled={true}
                                                            className="h-8 w-80 px-2"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {hasFilledValue(ticketData?.application?.shipment?.type) && (
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={"var(--sidebar-text-primary)"}
                                                    Heading={"Shipping Method"}
                                                    Fontsize={16}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder=""
                                                inputValue={
                                                    ticketData?.application?.shipment?.type === "merchantowned"
                                                        ? "Merchant-owned"
                                                        : ticketData?.application?.shipment?.type
                                                            ? ticketData?.application?.shipment?.type?.charAt(0).toUpperCase() + ticketData?.application?.shipment?.type?.slice(1)
                                                            : ""
                                                }
                                                addAgent={true}
                                                disabled={true}
                                                className="h-8 w-80 px-2"
                                            />
                                        </div>
                                    )}

                                    {ticketData?.application?.shipment?.type === 'shipping' &&
                                        hasFilledValue(ticketData?.application?.shipment?.shippingDetails?.address) && (
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={"var(--sidebar-text-primary)"}
                                                    Heading={"Shipping Address"}
                                                    Fontsize={16}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder=""
                                                inputValue={ticketData?.application?.shipment?.shippingDetails?.address}
                                                addAgent={true}
                                                disabled={true}
                                                className="h-8 w-80 px-2"
                                            />
                                        </div>
                                    )}

                                    {ticketData?.application?.shipment?.type === 'pickup' &&
                                        hasFilledValue(ticketData?.application?.shipment?.pickupDetails?.pickupLocationName) && (
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={"var(--sidebar-text-primary)"}
                                                    Heading={"Pickup Location"}
                                                    Fontsize={16}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder=""
                                                inputValue={ticketData?.application?.shipment?.pickupDetails?.pickupLocationName}
                                                addAgent={true}
                                                disabled={true}
                                                className="h-8 w-80 px-2"
                                            />
                                        </div>
                                    )}

                                    {ticketData?.application?.shipment?.type === 'merchantowned' &&
                                        ticketData?.application?.shipment?.merchantOwnedDetails && (
                                            <>
                                                {(merchantOwnedPreferencesData?.length > 0
                                                    ? merchantOwnedPreferencesData.map((item, index) => {
                                                        const details = ticketData.application.shipment.merchantOwnedDetails || {};
                                                        const matchingKey = Object.keys(details).find(
                                                            (key) => key?.toLowerCase().trim() === item.name?.toLowerCase().trim()
                                                        );
                                                        const value = matchingKey ? details[matchingKey] : "";
                                                        const displayValue = formatMerchantOwnedValue(value);
                                                        if (!hasFilledValue(displayValue)) return null;

                                                        return (
                                                            <div key={item.id ?? item.name ?? index} className="flex items-center gap-x-6 flex-wrap">
                                                                <div className="w-48">
                                                                    <Heading
                                                                        Fontweight={500}
                                                                        color={"var(--sidebar-text-primary)"}
                                                                        Heading={item.name}
                                                                        Fontsize={16}
                                                                    />
                                                                </div>
                                                                <LabeledInput
                                                                    inputPlaceholder=""
                                                                    inputValue={displayValue}
                                                                    addAgent={true}
                                                                    disabled={true}
                                                                    className="h-8 w-80 px-2"
                                                                />
                                                            </div>
                                                        );
                                                    })
                                                    : Object.entries(ticketData.application.shipment.merchantOwnedDetails || {}).map(([key, value]) => {
                                                        const displayValue = formatMerchantOwnedValue(value);
                                                        if (!hasFilledValue(displayValue)) return null;

                                                        return (
                                                            <div key={key} className="flex items-center gap-x-6 flex-wrap">
                                                                <div className="w-48">
                                                                    <Heading
                                                                        Fontweight={500}
                                                                        color={"var(--sidebar-text-primary)"}
                                                                        Heading={key}
                                                                        Fontsize={16}
                                                                    />
                                                                </div>
                                                                <LabeledInput
                                                                    inputPlaceholder=""
                                                                    inputValue={displayValue}
                                                                    addAgent={true}
                                                                    disabled={true}
                                                                    className="h-8 w-80 px-2"
                                                                />
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </>
                                        )}

                                    {/* {(navUiStatus === "deployment" || navUiStatus === "followup") && (
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={"var(--sidebar-text-primary)"}
                                                    Heading={"Pricing Plan"}
                                                    Fontsize={16}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder=""
                                                inputValue={ticketData?.application?.plan}
                                                addAgent={true}
                                                disabled={true}
                                                className="h-8 w-80 px-2"
                                            />
                                        </div>
                                    )} */}

                                    {navUiStatus === "deployment" &&
                                        ticketData?.application?.shipment?.type === 'pickup' &&
                                        hasFilledValue(ticketData?.application?.shipment?.pickupDetails?.pickupDate) && (
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={"var(--sidebar-text-primary)"}
                                                    Heading={"Pickup Location"}
                                                    Fontsize={16}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder=""
                                                inputValue={ticketData?.application?.shipment?.pickupDetails?.pickupDate}
                                                addAgent={true}
                                                disabled={true}
                                                className="h-8 w-80 px-2"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={"var(--sidebar-text-primary)"}
                                                Heading={"Stage"}
                                                Fontsize={16}
                                            />
                                        </div>
                                        <DropdownMenu
                                            selectedValue={selectedStage}
                                            menuItems={stageList}
                                            onSelect={handleStageChange}
                                            defaultText={'Select'}
                                            meetingLink={true}
                                            idSet={true}
                                            className="w-80"
                                        />
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={"var(--sidebar-text-primary)"}
                                            Heading={"Notes"}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <textarea
                                        type="text"
                                        placeholder="Notes"
                                        value={notes}
                                        onChange={handleNotesChange}
                                        className={`mt-1 p-3 w-[60%]`}
                                        rows={6}
                                        style={{
                                            border: '1px solid #D1D5DC',
                                            fontSize: 14,
                                            borderRadius: 8,
                                            backgroundColor: 'var(--dashboard-tab-box)',
                                            color: 'var(--sidebar-text-primary)'
                                        }}
                                    />
                                </div>

                                <div className="mt-2">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={"var(--sidebar-text-primary)"}
                                            Heading={"Upload Documents"}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <div style={{ 
                                        backgroundColor: 'var(--dashboard-tab-box)', 
                                        border: '1px solid #D1D5DC', 
                                        borderRadius: 8, 
                                        overflow: 'hidden',
                                        width: '60%',
                                        marginTop: 4
                                    }} className="min-h-28 p-2 flex flex-col items-center">
                                        <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                                    </div>
                                </div>
                                {uploadedUrl && uploadedUrl.length > 0 && (
                                    <div className="mx-6">
                                        <Heading
                                            Fontweight={700}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'TICKET ATTACHMENT FILES'}
                                            Fontsize={20}
                                            mt={32}
                                        />
                                        {getUniqueUploadedFiles().map((file, index) => (
                                            <div
                                                key={index}
                                                onClick={() => window.open(file.url, '_blank')}
                                                className=" cursor-pointer "
                                                style={{
                                                    fontSize: 14,
                                                    paddingTop: 8,
                                                }}
                                            >
                                                <Heading
                                                    Fontweight={500}
                                                    color={'blue'}
                                                    Heading={file.originalname} // Display the original name of the file
                                                    Fontsize={16}
                                                />
                                            </div>
                                        ))}
                                        {ticketData?.ticket?.comments?.length > 0 && (
                                            <div>
                                                {ticketData.ticket.comments.map((comment, index) => (
                                                    comment.fileUrl && comment.fileUrl.length > 0 && (
                                                        <div key={index}>
                                                            {comment.fileUrl.map((file, fileIndex) => (
                                                                <div
                                                                    key={fileIndex}
                                                                    onClick={() => window.open(file.url, '_blank')}
                                                                    className="px-4 cursor-pointer mt-3"
                                                                    style={{
                                                                        border: '1px solid #D1D5DC',
                                                                        fontSize: 14,
                                                                        borderRadius: 9,
                                                                        backgroundColor: 'var(--dashboard-tab-box)',
                                                                        paddingTop: 8,
                                                                        paddingBottom: 8,
                                                                        width: '98%',
                                                                        color: 'blue'
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-center ">

                                                                        <Heading
                                                                            Fontweight={500}
                                                                            color={'blue'}
                                                                            Heading={file.originalname}
                                                                            Fontsize={16}
                                                                            mb={4}
                                                                        />
                                                                        <div className="flex items-center gap-2">
                                                                            <UserProfileAvatar user={comment.user} size={24} />
                                                                            <div className="flex flex-col items-end">
                                                                            <span style={{ fontSize: '12px', color: 'grey' }}>{comment.user.name}</span>
                                                                            <span style={{ fontSize: '12px', color: 'grey' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="" >
                                    <Heading
                                        Fontweight={700}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'COMMENTS'}
                                        Fontsize={20}
                                        mt={32}
                                        mb={10}
                                    // Tailwind CSS classes
                                    />
                                    <div className="flex flex-col justify-center">
                                        {ticketData?.ticket?.comments?.length > 0 ? (
                                            ticketData.ticket.comments.map((comment, index) => (
                                                comment.message && comment.message.trim() !== "" && (
                                                    <div key={index} className="mt-1 p-3 w-[75%]"
                                                        style={{ border: '1px solid #D1D5DC', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                        <div className="flex justify-between">
                                                            <span className="flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>
                                                                <UserProfileAvatar user={comment.user} size={24} />
                                                                {comment.user.name}
                                                            </span>
                                                            <span style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--sidebar-text-primary)' }}>
                                                            {comment.message}
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
                                                className={`mt-1 p-3 w-[75%]`}
                                                rows={1}
                                                style={{ border: '1px solid #D1D5DC', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: '' }} className="flex justify-end mt-5 gap-3 mx-10 mb-10 pb-3" >
                                    {navUiStatus === "maintainance" ? (
                                        <BottonCustom
                                            backgroundColor={'transparent'}
                                            width={197}
                                            title={loading ? <Spinner /> : 'Send to Terminal'}
                                            height={40}
                                            color={'#1E1E1E'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={() => {
                                                UpdateTicketStatus('signed')
                                                SaveTicket()
                                            }}
                                            border={'1px solid #1E1E1E'}
                                        />
                                    ) : navUiStatus === "terminal" ? (
                                        <BottonCustom
                                            backgroundColor={'transparent'}
                                            width={197}
                                            title={loading ? <Spinner /> : 'Programmed → Deploy'}
                                            height={40}
                                            color={'#1E1E1E'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={() => {
                                                UpdateTicketStatus('uw')
                                                SaveTicket()
                                            }}
                                            border={'1px solid #1E1E1E'}

                                        />
                                    ) : navUiStatus === "deployment" ? (
                                        <BottonCustom
                                            backgroundColor={'transparent'}
                                            width={197}
                                            title={loading ? <Spinner /> : 'Mark as Shipped'}
                                            height={40}
                                            color={'#1E1E1E'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={() => {
                                                UpdateTicketStatus('approved')
                                                SaveTicket()
                                            }}
                                            border={'1px solid #1E1E1E'}

                                        />
                                    ) : (
                                        <BottonCustom
                                            backgroundColor={'transparent'}
                                            width={197}
                                            title={loading ? <Spinner /> : 'Close Batch'}
                                            height={40}
                                            color={'#1E1E1E'}
                                            fontSize={16}
                                            fontWeight={500}
                                            onClick={() => {
                                                UpdateTicketStatus('completed')
                                                SaveTicket()
                                            }}
                                            border={'1px solid #1E1E1E'}

                                        />
                                    )}
                                    <BottonCustom
                                        backgroundColor={'transparent'}
                                        width={145}
                                        title={loading ? <Spinner /> : 'Cancel'}
                                        height={40}
                                        color={'#1E1E1E'}
                                        fontSize={16}
                                        fontWeight={500}
                                        onClick={CancelTicket}
                                        border={'1px solid #1E1E1E'}

                                    />
                                    <BottonCustom
                                        backgroundColor={'#3769E6'}
                                        width={145}
                                        title={loading ? <Spinner /> : 'Save'}
                                        height={40}
                                        color={'#ffffff'}
                                        fontSize={16}
                                        fontWeight={500}
                                        onClick={() => {
                                            UpdateTicketStatus(selectedStage)
                                            SaveTicket()
                                        }}

                                    />
                                </div>
                            </div>
                        )}
                </div>

            </div>
            {isProductModalOpen && (
                <ProductListModal
                    isOpen={isProductModalOpen}
                    onClose={() => setIsProductModalOpen(false)}
                    onSubmit={handleProductModalSubmit}
                    modalTitle="Select Hardware"
                    selectedProductIds={selectedProductIds}
                    selectedHardwares={selectedHardwares}
                    application={ticketData?.application}
                    onSuccess={() => {
                        fetchTicketData();
                    }}
                />
            )}
        </>
    );
};

export default SupportTicketDetail;
