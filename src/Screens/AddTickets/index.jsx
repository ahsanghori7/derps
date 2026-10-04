import { useEffect, useMemo, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import DropdownMenu from "../../Components/dropdownMenu";
import PriorityIcon from "../../assets/PriorityIcon.png";
import tickettypeunfillBlack from "../../assets/tickettypeunfillBlack.png";
import UploadFile from "../../Components/UploadFile";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { toast } from "react-toastify";
import { getRequestWithOutBody, getRequestWithOutBodyCached, postRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import Spinner from "../../Components/Spinner";
import SearchInput from "../../Components/SearchInput";
import { Button } from "@mui/material";
import { IoIosArrowBack } from "react-icons/io";

const getMerchantLabel = (merchant) =>
    merchant?.dbaName
    || merchant?.merchantName
    || merchant?.legalBusinessName
    || merchant?.companyName
    || merchant?.name
    || "";

const getMerchantId = (merchant) =>
    merchant?.id ?? merchant?.merchantId ?? merchant?.customerId ?? "";

const AddTickets = () => {

    const userData = useSelector((state) => state.userData.userDetails);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const roleTitle = (userData?.roleTitle || '').toLowerCase();
    const [enabled, setEnabled] = useState(false)
    const [ticketNo, setTicketNo] = useState("")
    const [selectedCategory, setSelectedCategory] = useState(""); // Step 1: Define state
    const [selectedTicketType, setSelectedTicketType] = useState(""); // Step 1: Define state
    const [selectedPriority, setSelectedPriority] = useState(""); // Step 1: Define state
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [categoryList, setCategoryList] = useState([]);
    const [ticketTypeList, setTicketTypeList] = useState([]);
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [agentList, setAgentList] = useState([]);
    const [selectedDeveloper, setSelectedDeveloper] = useState(""); // Step 1: Define state
    const [selectedDeveloperId, setSelectedDeveloperId] = useState(""); // Step 1: Define state
    const [customerList, setCustomerList] = useState([]);
    const [selectedMerchant, setSelectedMerchant] = useState("");
    const [selectedMerchantId, setSelectedMerchantId] = useState("");
    const merchantSearchTimerRef = useRef(null);
    const initialMerchantsRef = useRef([]);
    const merchantSearchRequestRef = useRef(0);
    const merchantsFetchedRef = useRef(false);
    const [errors, setErrors] = useState({ category: false, ticketType: false, priority: false, title: false, description: false });

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };
    const fetchData = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}category`, accessToken
        )
            .then(result => {
                setCategoryList(result?.data)
                // setCompanyCategoryArray(options);
                // setCompanyCategoryArray(result)setLoadin
                getRequestWithOutBody(
                    `${baseURl}ticket-type`, accessToken
                )
                    .then(result => {
                        setTicketTypeList(result?.data)
                        getRequestWithOutBodyCached(
                            `${baseURl}user`, accessToken
                        )
                            .then(result => {
                                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                                setAgentList(activeUsers);
                                // setCompanyCategoryArray(options);
                                // setCompanyCategoryArray(result)setLoadin
                                setLoading(false)
                            })
                            .catch(error => {
                                setLoading(false)
                            })
                    })
                    .catch(error => {
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

    const fetchMerchants = () => {
        if (merchantsFetchedRef.current) {
            setCustomerList(initialMerchantsRef.current);
            return;
        }
        merchantsFetchedRef.current = true;
        getRequestWithOutBody(
            `${baseURl}customer?paginate=true&page=1&limit=100&orderBy=createdAt&order=desc`,
            accessToken
        )
            .then(result => {
                const list = normalizeCustomerList(result);
                initialMerchantsRef.current = list;
                setCustomerList(list);
            })
            .catch(() => {
                merchantsFetchedRef.current = false;
                initialMerchantsRef.current = [];
                setCustomerList([]);
            });
    };

    const restoreInitialMerchants = () => {
        setCustomerList(initialMerchantsRef.current);
    };

    const handleMerchantSearch = (value) => {
        const term = String(value || "").trim();
        if (merchantSearchTimerRef.current) {
            clearTimeout(merchantSearchTimerRef.current);
        }

        if (term.length < 2) {
            merchantSearchRequestRef.current += 1;
            restoreInitialMerchants();
            return;
        }

        merchantSearchTimerRef.current = setTimeout(() => {
            const requestId = ++merchantSearchRequestRef.current;
            // Use customer keyword search (returns ids). merchant-names has no id fields,
            // so suggestions were filtered out and the dropdown stayed empty.
            getRequestWithOutBody(
                `${baseURl}customer?paginate=true&page=1&limit=30&keyword=${encodeURIComponent(term)}&orderBy=createdAt&order=desc`,
                accessToken
            )
                .then((result) => {
                    if (requestId !== merchantSearchRequestRef.current) return;
                    setCustomerList(normalizeCustomerList(result));
                })
                .catch(() => {
                    if (requestId !== merchantSearchRequestRef.current) return;
                    setCustomerList([]);
                });
        }, 350);
    };

    const merchantSuggestions = useMemo(
        () =>
            (Array.isArray(customerList) ? customerList : [])
                .map((customer) => ({
                    name: getMerchantLabel(customer),
                    id: getMerchantId(customer),
                }))
                .filter((item) => item.name && item.id !== "" && item.id != null),
        [customerList]
    );

    useEffect(() => {
        fetchData();
        fetchMerchants();
        return () => {
            if (merchantSearchTimerRef.current) {
                clearTimeout(merchantSearchTimerRef.current);
            }
        };
    }, [])
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
        if (e.target.value.trim()) setErrors(prev => ({ ...prev, description: false }));
    };
    const handleTitleChange = (e) => {
        setTitle(e.target.value);
        if (e.target.value.trim()) setErrors(prev => ({ ...prev, title: false }));
    };

    const handleCategoryChange = (value) => {
        setSelectedCategory(value);
        if (value) setErrors(prev => ({ ...prev, category: false }));
    };
    const handleTicketTypeChange = (value) => {
        setSelectedTicketType(value);
        if (value) setErrors(prev => ({ ...prev, ticketType: false }));
    };

    const handlePriorityChange = (value) => {
        setSelectedPriority(value);
        if (value) setErrors(prev => ({ ...prev, priority: false }));
    };
    const handleDeveloperIdChange = (value) => {
        if (!value) {
            setSelectedDeveloper("");
            setSelectedDeveloperId("");
            return;
        }
        setSelectedDeveloperId(value);
        const found = (Array.isArray(agentList) ? agentList : []).find(
            (u) => String(u.id) === String(value)
        );
        if (found?.name) setSelectedDeveloper(found.name);
    };
    const handleMerchantIdChange = (value) => {
        if (!value) {
            setSelectedMerchant("");
            setSelectedMerchantId("");
            return;
        }
        const selected = (Array.isArray(customerList) ? customerList : []).find(
            (merchant) => String(getMerchantId(merchant)) === String(value)
        );
        setSelectedMerchant(selected ? getMerchantLabel(selected) : "");
        setSelectedMerchantId(value);
    };

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

    const CreateTicket = async () => {
        const newErrors = {
            category: selectedCategory === "",
            ticketType: selectedTicketType === "",
            priority: selectedPriority === "",
            title: title.trim() === "",
            description: description.trim() === "",
        };
        setErrors(newErrors);

        if (Object.values(newErrors).some(Boolean)) {
            toast.error("Please fill all required fields");
            return;
        }

        // Additional validation
        if (title.trim().length < 3) {
            toast.error("Title must be at least 3 characters long");
            return;
        }

        if (title.trim().length > 100) {
            toast.error("Title must be less than 100 characters");
            return;
        }

        if (description.trim().length < 10) {
            toast.error("Description must be at least 10 characters long");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        // Proceed with ticket creation
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

            const apiData = {
                "categoryId": selectedCategory,
                "ticketTypeId": selectedTicketType,
                "priority": selectedPriority,
                "workOrder": description.trim(),
                "title": title.trim(),
                ...(selectedDeveloperId && { "assignedTo": selectedDeveloperId }),
                ...(selectedMerchantId && { "merchantId": selectedMerchantId }),
                "uploadedFiles": uploadedFileResults
            };

            // Validate payload before sending
            if (!apiData.categoryId || !apiData.ticketTypeId || !apiData.priority || !apiData.title) {
                toast.error("Invalid ticket data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}ticket`, accessToken, apiData);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            console.error('Ticket creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid ticket data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create tickets");
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
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
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
                    Heading={'Create Tickets'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                    </div>

                    <div className="flex flex-col mt-4 gap-4">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Category"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <DropdownMenu
                                menuItems={categoryList}
                                onSelect={handleCategoryChange}
                                defaultText={'--Select Category--'}
                                meetingLink={true}
                                idSet={true}
                                className="w-80"
                                border={errors.category ? '1px solid red' : undefined}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Ticket Type"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <DropdownMenu
                                icon={tickettypeunfillBlack}
                                menuItems={ticketTypeList}
                                defaultText={'--Select Ticket Type--'}
                                meetingLink={true}
                                onSelect={handleTicketTypeChange}
                                idSet={true}
                                className="w-80"
                                border={errors.ticketType ? '1px solid red' : undefined}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Priority"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <DropdownMenu
                                icon={PriorityIcon}
                                meetingLink={true}
                                menuItems={data3}
                                defaultText={'--Select Priority--'}
                                onSelect={handlePriorityChange}
                                className="w-80"
                                border={errors.priority ? '1px solid red' : undefined}
                            />
                        </div>

                        {roleTitle !== "agent" && (
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Assign To"}
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
                        )}

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Merchant"}
                                    Fontsize={16}
                                />
                            </div>
                            <SearchInput
                                selectedValue={selectedMerchant}
                                suggestions={merchantSuggestions}
                                onSelect={handleMerchantIdChange}
                                onSearchTextChange={handleMerchantSearch}
                                asyncSuggestions
                                idSet={true}
                                addTicket={true}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Title"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Title"
                                inputValue={title}
                                onInputChange={handleTitleChange}
                                addAgent={true}
                                meetingLink={true}
                                className="h-8 w-80 px-2"
                                inputStyle={{
                                    border: errors.title ? '1px solid red' : '1px solid #D1D5DC',
                                    fontSize: 12,
                                    borderRadius: 4,
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    color: 'var(--dashboard-text-primary)',
                                }}
                            />
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={"Description"}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <textarea
                            type="text"
                            placeholder="Description"
                            value={description}
                            onChange={handleDescriptionChange}
                            className={`mt-1 p-3 w-[60%]`}
                            rows={4}
                            style={{
                                border: errors.description ? '1px solid red' : '1px solid #D1D5DC',
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
                            title={loading ? <Spinner /> : 'Create'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={CreateTicket}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddTickets;