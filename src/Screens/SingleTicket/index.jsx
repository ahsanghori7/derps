import { useEffect, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import DropdownMenu from "../../Components/dropdownMenu";
import PriorityIcon from "../../assets/PriorityIcon.png";
import tickettypeunfillBlack from "../../assets/tickettypeunfillBlack.png";
import UploadFile from "../../Components/UploadFile";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { useSelector } from "react-redux";
import { getTenantPhone } from "../../Utils/helper";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getRequestWithOutBody, getRequestWithOutBodyCached, patchComment, patchRequestWithBody, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { fetchMerchantNames } from "../../Api/customerApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import SendEmailModal from "../../Components/SendEmailModal";
import { getErrorMessage } from "../../Utils/errorHandler";
import { getInvoiceImageFetchCandidates } from "../../Utils/invoiceImageResolve";
import { toast } from "react-toastify";
import UserProfileAvatar from "../../Components/UserProfileAvatar";
import agentIconBlack from "../../assets/agentIconBlack.png";
import CustomDatePicker from "../../Components/CustomDatePicker";
import allStatusIcon from "../../assets/allStatusIcon.png";
import MemoPopup from "../MemoPopup";
import SearchInput from "../../Components/SearchInput";
import { Button } from "@mui/material";

const getMerchantLabel = (merchant) =>
    merchant?.dbaName
    || merchant?.merchantName
    || merchant?.legalBusinessName
    || merchant?.companyName
    || merchant?.name
    || "";

const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = String(reader.result || "").split(",")[1] || "";
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const fetchFileBlob = async (url) => {
    const candidates = getInvoiceImageFetchCandidates(url);
    let lastError;
    for (const candidate of candidates) {
        try {
            const isAbsoluteHttp = candidate.startsWith("http");
            const response = await fetch(candidate, {
                mode: isAbsoluteHttp ? "cors" : "same-origin",
                cache: "no-store",
                credentials: isAbsoluteHttp ? "omit" : "include",
            });
            if (response.ok) {
                return response.blob();
            }
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("Failed to fetch file");
};

const fetchFileAsAttachment = async (file) => {
    const blob = await fetchFileBlob(file.url);
    const content = await blobToBase64(blob);
    return {
        filename: file.originalname || "attachment",
        content,
        encoding: "base64",
        contentType: file.mimetype || blob.type || "application/octet-stream",
    };
};

const escapeHtml = (value) =>
    String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const prepareTicketHtmlBody = (html) =>
    String(html || "")
        .replace(/<img[^>]*>/gi, "")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\sstyle="[^"]*"/gi, "")
        .replace(/\sclass="[^"]*"/gi, "")
        .replace(/\sdata-[a-z0-9-]+="[^"]*"/gi, "")
        .replace(/<\/?div[^>]*>/gi, "")
        .replace(/[\n\r]+/g, "")
        .trim();

const TICKET_NAVIGATION_TOAST_ID = "ticket-navigation-boundary";

const SingleTicket = () => {
   const location = useLocation();
const rowData = location.state?.rowData;

const [searchParams] = useSearchParams();
const ticketIdFromUrl = searchParams.get("id");

const ticketId = rowData?.id || ticketIdFromUrl;

    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const tenantName = userData?.tenant?.name || "Dolphin Merchant Services";
    const tenantPhone = getTenantPhone(userData);
    const navigate = useNavigate();
    const [selectedTab, setselectedTab] = useState(1)
    const [ticketNo, setTicketNo] = useState("")
    const [agentCode, setAgentCode] = useState("")
    const [agentName, setAgentName] = useState("")
    const [title, setTitle] = useState("")
    const [ticketDateAneTime, setTicketDateAneTime] = useState("")
    const [remarks, setRemarks] = useState("")
    const [statusRemarks, setStatusRemarks] = useState("")
    const [description, setDescription] = useState("")
    const [estimatedDate, setEstimatedDate] = useState(null)
    const [ticketData, setTicketData] = useState(null)
    const [selectedCategory, setSelectedCategory] = useState(""); // Step 1: Define state
    const [selectedDeveloper, setSelectedDeveloper] = useState(""); // Step 1: Define state
    const [selectedDeveloperId, setSelectedDeveloperId] = useState(""); // Step 1: Define state
    const [selectedMerchant, setSelectedMerchant] = useState(""); // Step 1: Define state
    const [selectedMerchantId, setSelectedMerchantId] = useState(""); // Step 1: Define state
    const [selectedTicketType, setSelectedTicketType] = useState(""); // Step 1: Define state
    const [selectedPriority, setSelectedPriority] = useState(""); // Step 1: Define state
    const [uploadedUrl, setUploadedUrl] = useState(null); // Step 1: Define state
    const [loading, setLoading] = useState(false);
    const [categoryList, setCategoryList] = useState([]);
    const [logs, setLogs] = useState([]);
    const [agentList, setAgentList] = useState([]);
    const [ticketStatus, setTicketStatus] = useState(""); // Step 1: Define state for ticket status
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [selectedCategoryTitle, setSelectedCategoryTitle] = useState(""); // Step 1: Define state
    const [selectedTicketTitle, setSelectedTicketTitle] = useState(""); // Step 1: Define state
    const [ticketTypeList, setTicketTypeList] = useState([]);
    const [comments, setComments] = useState("")
    const [customerList, setCustomerList] = useState([]);
    const [showMerchantDetails, setShowMerchantDetails] = useState(false); // Step 1: State for showing merchant details
    const [selectedMerchantData, setSelectedMerchantData] = useState(null); // Step 1: State for selected merchant data
    const [showDialog, setShowDialog] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const merchantSearchTimerRef = useRef(null);
    const commentSubmissionRef = useRef(false);



   useEffect(() => {
        if (rowData) {
            setTicketNo(rowData?.ticketNo || "");
            setAgentCode(rowData?.agentCode || "");
            setAgentName(rowData?.agentName || "");
            setTitle(rowData?.title || "");
            setTicketDateAneTime(rowData?.ticketDate ? new Date(rowData?.ticketDate).toLocaleString('en-US', {
                month: "short",
                day: "2-digit", 
                year: "numeric"
            }) : "");
            setDescription(rowData?.description || "");
            setStatusRemarks(rowData?.statusRemarks || "");
            setEstimatedDate(rowData?.estimatedDate || null);
        }
    }, [rowData]);



    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };
    const fetchData = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}ticket/${ticketId}`, accessToken
        )
            .then(result => {
                setTicketData(result?.data)
                setTicketNo(result?.data?.id)
                setAgentCode(result?.data?.agent?.id)
                setAgentName(result?.data?.agent?.name)
                setTicketDateAneTime(result?.data?.createdAt ? new Date(result?.data?.createdAt).toLocaleString('en-US', {
                    month: "short",
                    day: "2-digit", 
                    year: "numeric"
                }) : "")
                setDescription(result?.data?.workOrder)
                setSelectedCategoryTitle(result?.data?.category?.title)
                setSelectedDeveloperId(result?.data?.assignedTo);
                setSelectedCategory(result?.data?.categoryId);
                setSelectedTicketType(result?.data?.ticketTypeId)
                setSelectedPriority(result?.data?.priority)
                setTitle(result?.data?.title)
                setUploadedUrl(result?.data?.uploadedFiles)
                setTicketStatus(result?.data?.status); // Set the ticket status from the fetched data
                setEstimatedDate(result?.data?.estimatedCompletionDate); // Set the ticket status from the fetched data
                setSelectedMerchantId(result?.data?.merchantId);
                setSelectedMerchant(getMerchantLabel(result?.data?.merchant));
                setSelectedMerchantData(result?.data?.merchant)
                setShowMerchantDetails(result?.data?.merchant ? true : false)

                getRequestWithOutBody(
                    `${baseURl}category`, accessToken
                )
                    .then(result => {
                        setCategoryList(result?.data)
                        getRequestWithOutBodyCached(
                            `${baseURl}user`, accessToken
                        )
                            .then(result => {
                                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                                setAgentList(activeUsers);
                                getRequestWithOutBody(
                                    `${baseURl}ticket-type`, accessToken
                                )
                                    .then(result => {
                                        setTicketTypeList(result?.data)
                                        setLoading(false)
                                    })
                                    .catch(error => {
                                        setLoading(false)
                                    })
                                setLoading(false)
                            })
                            .catch(error => {
                                setLoading(false)
                            })
                    }).catch(error => {
                        setLoading(false)
                    })
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    const normalizeCustomerList = (result) => {
        const apiData = result?.data ?? result;
        const rows =
            apiData?.results
            || apiData?.data?.results
            || (Array.isArray(apiData?.data) ? apiData.data : null)
            || (Array.isArray(apiData) ? apiData : null)
            || [];
        return Array.isArray(rows) ? rows : [];
    };

    const fetchData2 = () => {
        getRequestWithOutBody(
            `${baseURl}customer?paginate=true&page=1&limit=100&orderBy=createdAt&order=desc`,
            accessToken
        )
            .then(result => {
                setCustomerList(normalizeCustomerList(result));
            })
            .catch(() => {
                setCustomerList([]);
            });
    };

    const handleMerchantSearch = (value) => {
        const term = String(value || "").trim();
        if (merchantSearchTimerRef.current) {
            clearTimeout(merchantSearchTimerRef.current);
        }

        if (term.length < 2) {
            if (!term) fetchData2();
            return;
        }

        merchantSearchTimerRef.current = setTimeout(() => {
            fetchMerchantNames(accessToken, term, { page: 1, limit: 30 })
                .then((results) => {
                    setCustomerList(Array.isArray(results) ? results : []);
                })
                .catch(() => {
                    setCustomerList([]);
                });
        }, 350);
    };

   useEffect(() => {
  if (ticketId) {
    fetchData()
    fetchData2()
  }
  return () => {
    if (merchantSearchTimerRef.current) {
      clearTimeout(merchantSearchTimerRef.current);
    }
  };
}, [ticketId])

useEffect(() => {
    if (!selectedDeveloperId) return;
    if (!Array.isArray(agentList) || agentList.length === 0) return;

    const found = agentList.find((u) => String(u.id) === String(selectedDeveloperId));
    if (found?.name) setSelectedDeveloper(found.name);
  }, [selectedDeveloperId, agentList]);

useEffect(() => {
    if (!selectedTicketType) return;
    if (!Array.isArray(ticketTypeList) || ticketTypeList.length === 0) return;

    const found = ticketTypeList.find((u) => String(u.id) === String(selectedTicketType));
    if (found?.title) setSelectedTicketTitle(found.title);
  }, [selectedTicketType, ticketTypeList]);


    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleString('en-US', {
            month: "short",
            day: "2-digit", 
            year: "numeric"
        });
        setEstimatedDate(formattedDate);
    };

    const handleButtonClick = (tabIndex) => {
        setselectedTab(tabIndex);
    };

    const handleNavigateTicket = async (direction) => {
        try {
            const result = await getRequestWithOutBody(
                `${baseURl}ticket/flip-ticket?type=${direction}&ticketId=${ticketId}`,
                accessToken
            );
            const newId = result?.data?.id || result?.data?.ticketId || result?.id;
            if (newId) {
                toast.dismiss(TICKET_NAVIGATION_TOAST_ID);
                setComments("");
                setRemarks("");
                setUploadedFile(null);
                navigate(`/home/singleTicket?id=${newId}`);
            } else {
                toast.info(
                    result?.message || (direction === 'desc' ? "No next ticket available" : "No previous ticket available"),
                    { toastId: TICKET_NAVIGATION_TOAST_ID },
                );
            }
        } catch (error) {
            const message = getErrorMessage(error, "Failed to navigate to ticket");
            const isTicketBoundary = /no more tickets|no (next|previous) ticket/i.test(message);
            if (isTicketBoundary) {
                toast.info(message, { toastId: TICKET_NAVIGATION_TOAST_ID });
            } else {
                toast.error(message, { toastId: TICKET_NAVIGATION_TOAST_ID });
            }
        }
    };
    const handleTicketStatusChange = (value) => { // Step 2: Define handler for ticket status
        setTicketStatus(value);
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };
    const handleRemarksChange = (e) => {
        setRemarks(e.target.value);
    };
    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };
    const handleCategoryTitleChange = (value) => { // Step 2: Define handler
        setSelectedCategoryTitle(value);
    };
    const handleTicketTitleChange = (value) => { // Step 2: Define handler
        setSelectedTicketTitle(value);
    };
    const handleStatusChange = (value) => { // Step 2: Define handler
        setTicketStatus(value);
    };
    const handleCategoryChange = (value) => { // Step 2: Define handler
        setSelectedCategory(value);
    };

    const handleDeveloperChange = (value) => { // Step 2: Define handler
        setSelectedDeveloper(value);
    };
    const handleDeveloperIdChange = (value) => { 
        setSelectedDeveloperId(value);
        const found = agentList.find((u) => String(u.id) === String(value));
    if (found?.name) setSelectedDeveloper(found.name);
    };
    const handleMerchantChange = (value) => { // Step 2: Define handler
        setSelectedMerchant(value);
    };
    const handleMerchantIdChange = (value) => { // Step 2: Define handler
        if (!value) {
            setSelectedMerchant("");
            setSelectedMerchantId("");
            setSelectedMerchantData(null);
            setShowMerchantDetails(false);
            return;
        }
        const selectedAgent = (Array.isArray(customerList) ? customerList : []).find(
            (agent) => getMerchantLabel(agent) === value
        );
        setSelectedMerchant(value);
        setSelectedMerchantId(selectedAgent ? selectedAgent.id : "");
        setSelectedMerchantData(selectedAgent || null);
        setShowMerchantDetails(Boolean(selectedAgent));
    };
    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };

    const handleTicketTypeChange = (value) => { // Step 2: Define handler
        setSelectedTicketType(value);
    };

    const handlePriorityChange = (value) => { // Step 2: Define handler
        setSelectedPriority(value);
    };

    // Step 2: Function to open MemoPopup
    const handleViewMerchantDetails = () => {
        setShowDialog(true); // Open the MemoPopup
    };

    // Step 1: Define handleCloseDialog to close the MemoPopup
    const handleCloseDialog = () => {
        setShowDialog(false); // Close the MemoPopup
    };

    const data2 = [
        {
            id: 1,
            text: 'Pending',
            value: 'pending'
        },
        {
            id: 2,
            text: 'In Progress',
            value: 'in-progress'
        },
        {
            id: 3,
            text: 'Complete',
            value: 'complete'
        },
        {
            id: 4,
            text: 'In-Active',
            value: 'in-active'
        },
    ]

    const data3 = [
        {
            id: 1,
            text: 'Low',
            value: 'low'
        },
        {
            id: 2,
            text: 'Normal',
            value: 'normal'
        },
        {
            id: 3,
            text: 'High',
            value: 'high'
        },
    ]

    const getUniqueUploadedFiles = () => {
        const commentFiles = ticketData?.comments?.flatMap(comment => comment.fileUrl) || [];
        return uploadedUrl?.filter(file => file && !commentFiles.some(commentFile => commentFile && commentFile.url === file.url)) || [];
    };

    const getAllTicketFiles = () => {
        const uploaded = Array.isArray(uploadedUrl) ? uploadedUrl : [];
        const commentFiles = (ticketData?.comments || []).flatMap((comment) =>
            Array.isArray(comment.fileUrl) ? comment.fileUrl : []
        );
        const all = [...uploaded, ...commentFiles].filter((file) => file?.url);
        const seen = new Set();
        return all.filter((file) => {
            if (seen.has(file.url)) return false;
            seen.add(file.url);
            return true;
        });
    };

    const getDefaultRecipientEmail = () =>
        selectedMerchantData?.email ||
        selectedMerchantData?.ownerEmail ||
        ticketData?.merchant?.email ||
        ticketData?.merchant?.ownerEmail ||
        "";

    const getDefaultEmailSubject = () => {
        const ticketLabel = ticketNo ? `Ticket #${ticketNo}` : "Ticket";
        return title ? `${ticketLabel} - ${title}` : ticketLabel;
    };

    const getDefaultTicketEmailBody = () => {
        const ticketLabel = ticketNo || ticketId || "";
        const companyName = escapeHtml(tenantName);
        return `<p>Thank you for contacting ${companyName}. Your request has been successfully received and a support ticket ${ticketLabel} has been generated.</p><p>Our team is currently reviewing your request and will provide an update within 24-48 business hours.</p><p>If you require immediate assistance, please contact our support team at ${escapeHtml(tenantPhone)}.</p><p>Thank you for choosing ${companyName}.</p>`;
    };

    const handleSendTicketEmail = async ({ to, cc, html, subject, attachments: extraAttachments = [] }) => {
        const recipientEmail = String(to || "").trim();
        if (!recipientEmail) {
            toast.error("Please enter a recipient email");
            return false;
        }

        try {
            const files = getAllTicketFiles();
            const attachments = Array.isArray(extraAttachments) ? [...extraAttachments] : [];
            for (const file of files) {
                try {
                    attachments.push(await fetchFileAsAttachment(file));
                } catch (error) {
                    console.warn("Failed to attach file", file.originalname, error);
                }
            }

            const payload = {
                recipients: [recipientEmail],
                subject: subject?.trim() || getDefaultEmailSubject(),
                htmlBody: prepareTicketHtmlBody(html),
            };

            if (cc && cc.length > 0) {
                payload.cc = cc.join(", ");
            }

            if (attachments.length > 0) {
                payload.attachments = attachments;
            }

            const res = await postRequestWithBodyAndToken(
                `${baseURl}ticket/send-email`,
                accessToken,
                payload
            );
            toast.success(res?.message || "Email sent successfully");
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to send email"));
            return false;
        }
    };

const saveCommentOnly = async () => {
  if (commentSubmissionRef.current) return;

  // 🔒 backend requires MESSAGE (files-only comments not allowed)
  if (!comments.trim()) {
    toast.error("Comment message is required");
    return;
  }

  commentSubmissionRef.current = true;
  setLoading(true);

  try {
    let uploadedFiles = [];

    if (uploadedFile && Array.isArray(uploadedFile) && uploadedFile.length > 0) {
      for (const file of uploadedFile) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "tickets");

        const result1 = await postRequestWithFormData(
          `${baseURl}files`,
          accessToken,
          formData
        );

        if (result1?.data?.uploadedFiles) {
          uploadedFiles.push({
            url: result1.data.uploadedFiles.url,
            mimetype: result1.data.uploadedFiles.mimetype,
            originalname: result1.data.uploadedFiles.originalname,
          });
        }
      }
    }

    // ✅ EXACT same logic as UpdateTicket
    const commentsArray = {
      ...(comments.trim() !== "" && { message: comments.trim() }),
      ...(uploadedFiles.length > 0 && { fileUrl: uploadedFiles }),
    };

    await patchComment(
      `${baseURl}ticket/${ticketId}/comment`,
      accessToken,
      commentsArray.message,
      commentsArray.fileUrl
    );

    toast.success("Comment added successfully");

    setComments("");
    setUploadedFile(null);

    fetchData(ticketId);

  } catch (error) {
    toast.error(error.message || "Failed to add comment");
  } finally {
    commentSubmissionRef.current = false;
    setLoading(false);
  }
};

    const UpdateTicket = async () => {
        if (!selectedCategory ||
            !selectedTicketType ||
            !selectedPriority ||
            (description && description.trim() === "") ||
            (title && title.trim() === "")
        ) {
            toast.error("All fields are required");
            return;
        }
        setLoading(true);
        try {
            let uploadedFiles = [];
            if (uploadedFile && Array.isArray(uploadedFile)) { // Check if uploadedFile is an array
                for (const file of uploadedFile) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'tickets');

                    // Upload each file and get the uploaded file details
                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                    uploadedFiles.push({
                        url: result1?.data?.uploadedFiles?.url,
                        mimetype: result1?.data?.uploadedFiles?.mimetype,
                        originalname: result1?.data?.uploadedFiles?.originalname,
                    });
                }
            }
            const apiData = {
                "categoryId": selectedCategory,
                "ticketTypeId": selectedTicketType,
                "priority": selectedPriority,
                "workOrder": description,
                "title": title,
                "estimatedCompletionDate": estimatedDate,
                ...(selectedMerchantId && { "merchantId": selectedMerchantId }),
                "status": ticketStatus,
                "remarks": remarks,
                "assignedTo": selectedDeveloperId,
                ...(uploadedFiles.length > 0 && { uploadedFiles: [...(Array.isArray(uploadedUrl) ? uploadedUrl : []), ...uploadedFiles] }), // Ensure uploadedUrl is an array
                // ...(commentsArray.length > 0 && { comments: commentsArray })
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}ticket/${ticketId}`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1)
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10, }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Ticket Details'}
                Fontsize={30}
            />

            <div className="flex items-center justify-center w-full my-3">
                <div className="flex items-center" style={{
                    border: '1px solid #d0d5dd',
                    borderRadius: 10,
                    overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    backgroundColor: 'var(--dashboard-card-bg)',
                }}>
                    <button
                        onClick={() => handleNavigateTicket('asc')}
                        style={{
                            padding: '8px 18px',
                            fontWeight: 700,
                            fontSize: 18,
                            border: 'none',
                            borderRight: '1px solid #d0d5dd',
                            backgroundColor: 'transparent',
                            color: 'var(--sidebar-text-primary)',
                            cursor: 'pointer',
                            lineHeight: 1,
                        }}
                        title="Previous Ticket"
                    >
                        ‹
                    </button>
                    <div style={{
                        padding: '6px 24px',
                        textAlign: 'center',
                        minWidth: 110,
                        backgroundColor: 'var(--dashboard-tab-box)',
                    }}>
                        <div style={{ fontSize: 10, color: 'var(--fieldsTitle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ticket No</div>
                        <div style={{ fontWeight: 700, color: 'var(--sidebar-text-primary)', fontSize: 17, marginTop: 1 }}>{ticketNo}</div>
                    </div>
                    <button
                        onClick={() => handleNavigateTicket('desc')}
                        style={{
                            padding: '8px 18px',
                            fontWeight: 700,
                            fontSize: 18,
                            border: 'none',
                            borderLeft: '1px solid #d0d5dd',
                            backgroundColor: 'transparent',
                            color: 'var(--sidebar-text-primary)',
                            cursor: 'pointer',
                            lineHeight: 1,
                        }}
                        title="Next Ticket"
                    >
                        ›
                    </button>
                </div>
            </div>

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
                    {/* <div className="flex justify-between">
                        <GoBack />
                    </div> */}
                    {loading ? (
                        <div className="text-center w-full mx-auto">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <div className="flex flex-wrap mx-6 mt-2 gap-x-4 gap-y-2">
                                    <div>
                                        <LabeledInput
                                            label="Ticket No"
                                            inputPlaceholder="Enter Revenue Share"
                                            inputValue={ticketNo}
                                            disabled={true}
                                            // onInputChange={handleRevenueShareChange}
                                            meetingLink={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Agent code"
                                            inputPlaceholder="213"
                                            inputValue={agentCode}
                                            onInputChange={setAgentCode}
                                            meetingLink={true}
                                            disabled={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Created By"
                                            inputPlaceholder="Sheraz"
                                            inputValue={agentName}
                                            onInputChange={setAgentName}
                                            meetingLink={true}
                                            disabled={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Created Date"
                                            inputPlaceholder="12/14/2023  7:12:47 PM"
                                            inputValue={ticketDateAneTime}
                                            onInputChange={setTicketDateAneTime}
                                            meetingLink={true}
                                            disabled={true}
                                        />
                                    </div>
                                    <div className="">
                                        <div className="flex">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Category*'}
                                                Fontsize={10}
                                                mb={2}
                                            />
                                        </div>
                                        <DropdownMenu
                                            icon={agentIconBlack}
                                            selectedValue={selectedCategoryTitle}
                                            menuItems={categoryList}
                                            handleRoleIdChange={handleCategoryChange}
                                            onSelect={handleCategoryTitleChange}
                                            defaultText={'Category'}
                                            meetingLink={true}
                                        />
                                    </div>
                                    <div className="">

                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Assign To'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <SearchInput
                                            selectedValue={selectedDeveloper}
                                            suggestions={agentList}
                                            onSelect={handleDeveloperIdChange}
                                            addTicket={true}
                                            idSet={true} />
                                    </div>
                                    <div className="">

                                        <div className="flex">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Priority*'}
                                                Fontsize={10}
                                                mb={2}
                                            />
                                        </div>
                                        <DropdownMenu
                                            icon={PriorityIcon}
                                            selectedValue={selectedPriority}
                                            menuItems={data3}
                                            onSelect={handlePriorityChange}
                                            defaultText={'--Select Priority--'}
                                            meetingLink={true} />

                                    </div>
                                    <div className="">

                                        <div className="flex">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--fieldsTitle)'}
                                                Heading={'Ticket Type*'}
                                                Fontsize={10}
                                                mb={2}
                                            // Tailwind CSS classes
                                            />
                                            {/* <span style={{ color: 'red' }}>*</span> */}
                                        </div>
                                        <DropdownMenu
                                            icon={tickettypeunfillBlack}
                                            selectedValue={selectedTicketTitle}
                                            onSelect={handleTicketTitleChange}
                                            handleRoleIdChange={handleTicketTypeChange}
                                            menuItems={ticketTypeList}
                                            defaultText={'--Select Ticket Type--'}
                                            meetingLink={true} />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Merchant'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <SearchInput
                                            selectedValue={selectedMerchant}
                                            suggestions={(Array.isArray(customerList) ? customerList : [])
                                                .map((customer) => ({ name: getMerchantLabel(customer) }))
                                                .filter((item) => item.name)}
                                            onSelect={handleMerchantIdChange}
                                            onSearchTextChange={handleMerchantSearch}
                                            asyncSuggestions
                                            addTicket={true} />
                                        {showMerchantDetails && (
                                            <div
                                                onClick={handleViewMerchantDetails}
                                                style={{ textDecoration: 'underline', color: 'blue', cursor: 'pointer', marginTop: '8px' }}
                                            >
                                                View Merchant Details
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Title"
                                            inputPlaceholder="Title"
                                            inputValue={title}
                                            onInputChange={handleTitleChange}
                                            meetingLink={true}
                                            disabled={true}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap mx-6 mt-2 gap-x-4 gap-y-2">
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Notes'}
                                            Fontsize={10}
                                        // Tailwind CSS classes
                                        />
                                        <textarea
                                            type="text"
                                            placeholder="Notes"
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            className={`mt-0.5 p-1 sm:w-64 h-28`}
                                            rows={6}
                                            style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Upload Documents'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 4, overflow: 'hidden' }} className="h-28 w-64  p-2 flex flex-col items-center">
                                            <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className=" mt-4 mx-6" >
                                {uploadedUrl && uploadedUrl.length > 0 && (
                                    <div>
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
                                                onClick={() => window.open(file.url, '_blank')} // Open the respective file URL
                                                className="px-4 cursor-pointer mt-2"
                                                style={{
                                                    // border: '1px solid var(--sidebar-selected-bg)',
                                                    fontSize: 14,
                                                    // borderRadius: 9,
                                                    // backgroundColor: 'var(--dashboard-tab-box)',
                                                    // paddingTop: 8,
                                                    // padding: 4
                                                    // paddingBottom: 8,
                                                    // width: '98%',
                                                    // color: 'blue' // Set text color to blue
                                                }}
                                            >
                                                <Heading
                                                    Fontweight={500}
                                                    color={'blue'}
                                                    Heading={file.originalname} // Display the original name of the file
                                                    Fontsize={16}
                                                // mb={4}
                                                />
                                            </div>
                                        ))}
                                        {ticketData?.comments?.length > 0 && (
                                            <div>
                                                {ticketData.comments.map((comment, index) => (
                                                    comment.fileUrl && comment.fileUrl.length > 0 && (
                                                        <div key={index}>
                                                            {comment.fileUrl.map((file, fileIndex) => (
                                                                <div
                                                                    key={fileIndex}
                                                                    onClick={() => window.open(file.url, '_blank')}
                                                                    className="px-4 cursor-pointer "
                                                                    style={{
                                                                        // border: '1px solid var(--sidebar-selected-bg)',
                                                                        fontSize: 14,
                                                                        // borderRadius: 9,
                                                                        // backgroundColor: 'var(--dashboard-tab-box)',
                                                                        // paddingTop: 8,
                                                                        // paddingBottom: 8,
                                                                        // padding: 4,
                                                                        // width: '98%',
                                                                        // color: 'blue'
                                                                    }}
                                                                >
                                                                    <div className="flex justify-between items-center w-[50%] ">

                                                                        <Heading
                                                                            Fontweight={500}
                                                                            color={'blue'}
                                                                            Heading={file.originalname}
                                                                            Fontsize={16}
                                                                        // mb={4}
                                                                        />
                                                                        <div className="flex items-center gap-2">
                                                                            <UserProfileAvatar user={comment.user} size={24} />
                                                                            <div className="flex flex-col items-end">
                                                                            <span style={{ fontSize: '12px', color: 'grey' }}>{comment.user.name}</span>
                                                                            <span style={{ fontSize: '12px', color: 'grey' }}>{new Date(comment.createdAt).toLocaleString('en-US', {
                                                                                month: "short",
                                                                                day: "2-digit", 
                                                                                year: "numeric",
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
                                                                                hour12: true
                                                                            })}</span>
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
                            </div>
                            <div className=" mt-4 mx-6" >
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'STATUS'}
                                    Fontsize={20}
                                    // mt={40}
                                    mb={10}
                                // Tailwind CSS classes
                                />
                                <div className="flex flex-wrap  mt-2 gap-x-4 gap-y-2">
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Estimated Completion Date'}
                                            Fontsize={10}
                                            mb={4}
                                        // Tailwind CSS classes
                                        />
                                        <CustomDatePicker
                                            value={estimatedDate}
                                            onChange={handleMemoDateChange}
                                            label="From Date"
                                            supportTicket={true}
                                        />
                                    </div>
                                    <div className="ml-1">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Ticket Status'}
                                            Fontsize={10}
                                            mb={4}
                                        // Tailwind CSS classes
                                        />
                                        <DropdownMenu icon={allStatusIcon} onSelect={handleStatusChange} selectedValue={ticketStatus} menuItems={data2} defaultText={'Select Status'} meetingLink={true} />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Remarks'}
                                            Fontsize={10}
                                            ml={4}
                                        />
                                        <LabeledInput
                                            inputPlaceholder="write your remarks here"
                                            inputValue={remarks}
                                            onInputChange={handleRemarksChange}
                                            meetingLink={true}
                                        />
                                    </div>
                                </div>
                                <div className=" mt-2 " >
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Remarks History'}
                                            Fontsize={10}
                                        />
                                        <div className="flex flex-col justify-center"> {/* Changed to flex-col for vertical stacking */}
                                            {logs?.length > 0 ? (
                                                logs.map((log, index) => (
                                                    <div key={index} className="mt-1 p-3 w-[100%]"
                                                        style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                        {`${log.user.name} updated ticket on ${new Date(log.updatedAt).toLocaleString('en-US', {
                                                            month: "short",
                                                            day: "2-digit", 
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true
                                                        })}. Remarks: ${log.action}`}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="mt-1 p-3 w-[100%] text-gray-500"
                                                    style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'var(--blueText)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                    No remarks history
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className=" mt-6 mx-6" >
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'COMMENTS'}
                                    Fontsize={20}
                                    // mt={40}
                                    mb={10}
                                // Tailwind CSS classes
                                />
                                <div className="flex flex-col justify-center"> {/* Changed to flex-col for vertical stacking */}
                                    {ticketData?.comments?.length > 0 ? (
                                        ticketData.comments.map((comment, index) => (
                                            comment.message && comment.message.trim() !== "" && (
                                                <div key={index} className="mt-1 p-3 w-[100%]"
                                                    style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                    <div className="flex justify-between">
                                                        <span className="flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>
                                                            <UserProfileAvatar user={comment.user} size={24} />
                                                            {comment.user.name}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: 'var(--fieldsTitle)' }}>{new Date(comment.createdAt).toLocaleString('en-US', {
                                                            month: "short",
                                                            day: "2-digit", 
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true
                                                        })}</span>
                                                    </div>
                                                    <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--sidebar-text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
                                            className={`mt-1 p-3 w-[100%]`}
                                            rows={1}
                                            style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-end items-center gap-3 mt-4 mb-10">
                                    <Button variant="contained" color="primary" disabled={loading} onClick={saveCommentOnly}>Comment</Button>
                                    <BottonCustom
                                        backgroundColor={"rgba(255, 159, 28, 1)"}
                                        width={130}
                                        title={"Send Email"}
                                        height={40}
                                        color={"var(--sidebar-text-selected)"}
                                        fontSize={16}
                                        fontWeight={500}
                                        onClick={() => setShowEmailModal(true)}
                                    />
                                    <BottonCustom
                                        backgroundColor={'rgba(79, 214, 15, 1)'}
                                        width={130}
                                        title={'Save'}
                                        height={40}
                                        color={'var(--sidebar-text-selected)'}
                                        fontSize={16}
                                        fontWeight={500}
                                        onClick={UpdateTicket}
                                    />
                                </div>
                            </div>
                        </>)}
                </div>
            </div>
            <SendEmailModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onSend={handleSendTicketEmail}
                title="Send Ticket Email"
                showSubject
                defaultToEmail={getDefaultRecipientEmail()}
                defaultSubject={getDefaultEmailSubject()}
                includeTermsAndConditions={false}
                showSignatureLogo={false}
                useSimpleSignature
                signatureCompanyName={tenantName}
                defaultEmailBody={getDefaultTicketEmailBody()}
                allowAttachments
            />
            {/* MemoPopup for viewing merchant details */}
            <MemoPopup
                trigger={showDialog}
                onClose={handleCloseDialog}
                rowData={selectedMerchantData} // Step 4: Pass selected merchant data to MemoPopup
                customerTable={true}
            />
        </div>
    );
};

export default SingleTicket;
