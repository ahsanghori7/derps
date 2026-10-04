import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import BottonCustom from "../../Components/ButtonCustom";
import DropdownMenu from "../../Components/dropdownMenu";
import PriorityIcon from "../../assets/PriorityIcon.png";
import tickettypeunfillBlack from "../../assets/tickettypeunfillBlack.png";
import UploadFile from "../../Components/UploadFile";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { getRequestWithOutBody, patchComment, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import { toast } from "react-toastify";
import MemoPopup from "../MemoPopup";

const MaintainTickets = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    const [enabled, setEnabled] = useState(false)
    const [ticketNo, setTicketNo] = useState("")
    const [selectedCategory, setSelectedCategory] = useState(""); // Step 1: Define state
    const [selectedTicketType, setSelectedTicketType] = useState(""); // Step 1: Define state
    const [selectedPriority, setSelectedPriority] = useState(""); // Step 1: Define state
    const [loading, setLoading] = useState(false);
    const [description, setDescription] = useState("")
    const [categoryList, setCategoryList] = useState([]);
    const [title, setTitle] = useState("")
    const [createdOn, setCreatedOn] = useState("")
    const [createdBy, setCreatedBy] = useState("")
    const [status, setStatus] = useState("")
    const [selectedTicketTypeTitle, setSelectedTicketTypeTitle] = useState(""); // Step 1: Add state for selected ticket type title
    const [uploadedUrl, setUploadedUrl] = useState([]); // Step 1: Define state
    const [selectedCategoryTitle, setSelectedCategoryTitle] = useState(""); // Step 1: Define state
    const [ticketTypeList, setTicketTypeList] = useState([]);
    const [ticketData, setTicketData] = useState({});
    const [uploadedFile, setUploadedFile] = useState([]); // Step 1: Change state to handle multiple files
    const [logs, setLogs] = useState([]);
    const [comments, setComments] = useState("")
    const [selectedMerchant, setSelectedMerchant] = useState(""); // Step 1: Define state
    const [selectedMerchantId, setSelectedMerchantId] = useState(""); // Step 1: Define state
    const [customerList, setCustomerList] = useState([]);
    const [showMerchantDetails, setShowMerchantDetails] = useState(false); // Step 1: State for showing merchant details
    const [selectedMerchantData, setSelectedMerchantData] = useState(null); // Step 1: State for selected merchant data
    const [showDialog, setShowDialog] = useState(false);

    const handleFileUpload = (files) => { // Update to accept multiple files
        setUploadedFile(files);
    };

    const fetchData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}category`, accessToken
        )
            .then(result => {
                setCategoryList(result?.data)

                getRequestWithOutBody(
                    `${baseURl}ticket/${location?.state?.rowData?.id}`, accessToken
                )
                    .then(result => {
                        setDescription(result?.data?.workOrder ?? "")
                        setSelectedCategoryTitle(result?.data?.category?.title ?? "")
                        setSelectedCategory(result?.data?.categoryId);
                        setSelectedTicketType(result?.data?.ticketTypeId)
                        setSelectedPriority(result?.data?.priority)
                        setTicketNo(result?.data?.id)
                        setStatus(result?.data?.status)
                        setTitle(result?.data?.title)
                        setCreatedBy(result?.data?.agent?.name ?? "")
                        setUploadedUrl(Array.isArray(result?.data?.uploadedFiles) ? result?.data?.uploadedFiles : [])
                        setTicketData(result?.data ?? {})
                        setLogs(Array.isArray(result?.data?.logs) ? result?.data?.logs : [])
                        setSelectedMerchantId(result?.data?.merchantId);
                        setSelectedMerchant(result?.data?.merchant?.dbaName ?? "");
                        setSelectedMerchantData(result?.data?.merchant ?? null)
                        setShowMerchantDetails(result?.data?.merchant ? true : false)

                        setCreatedOn(new Date(result?.data?.createdAt).toLocaleDateString('en-US'))
                        getRequestWithOutBody(
                            `${baseURl}ticket-type`, accessToken
                        )
                            .then(result1 => {
                                setTicketTypeList(result1?.data)
                                const selectedType = result1?.data.find(type => type?.id === result?.data?.ticketTypeId);
                                setSelectedTicketTypeTitle(selectedType ? selectedType?.title : "Unknown Type");
                                setLoading(false)
                            })
                            .catch(error => {
                                setLoading(false)
                            })
                        getRequestWithOutBody(
                            `${baseURl}customer`, accessToken
                        )
                            .then(result2 => {
                                setCustomerList(Array.isArray(result2?.data?.data) ? result2?.data?.data : [])
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
    }

    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}customer`, accessToken
        )
            .then(result => {
                setCustomerList(Array.isArray(result?.data?.data) ? result?.data?.data : [])
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
        fetchData2()
    }, [])

    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };

    const handleCategoryChange = (value) => { // Step 2: Define handler
        setSelectedCategory(value);
    };

    const handleCategoryTitleChange = (value) => { // Step 2: Define handler
        setSelectedCategoryTitle(value);
    };

    const handleTicketTypeChange = (value) => { // Step 2: Define handler
        setSelectedTicketType(value);
        const selectedType = ticketTypeList.find(type => type?.id === value);
        setSelectedTicketTypeTitle(selectedType ? selectedType?.title : "");
    };
    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };
    const handlePriorityChange = (value) => { // Step 2: Define handler
        setSelectedPriority(value);
    };
    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };
    const handleMerchantChange = (value) => { // Step 2: Define handler
        setSelectedMerchant(value);
    };
    const handleMerchantIdChange = (value) => { // Step 2: Define handler
        const selectedAgent = customerList?.find(agent => agent?.dbaName === value);
        setSelectedMerchantId(selectedAgent ? selectedAgent?.id : "");
        setSelectedMerchantData(selectedAgent || null); // Set selected merchant data to the entire object
        setShowMerchantDetails(selectedAgent !== undefined);
    };

    // Step 2: Function to open MemoPopup
    const handleViewMerchantDetails = () => {
        setShowDialog(true); // Open the MemoPopup
    };

    // Step 1: Define handleCloseDialog to close the MemoPopup
    const handleCloseDialog = () => {
        setShowDialog(false); // Close the MemoPopup
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
    const getUniqueUploadedFiles = () => {
        const commentFiles = ticketData?.comments?.flatMap(comment => comment?.fileUrl) || [];
        return uploadedUrl?.filter(file => file && !commentFiles.some(commentFile => commentFile && commentFile?.url === file?.url)) || [];
    };
    const EditTicket = async () => {
        if (selectedCategory === ""
            || selectedTicketType === ""
            || selectedPriority === ""
            || description === ""
        ) {
            toast.error("All fields are required");
            return;
        }
        // Proceed with login logic
        setLoading(true);
        try {
            let uploadedFiles = []; // Initialize an array for uploaded file data
            if (uploadedFile.length > 0) { // Check if there are uploaded files
                for (const file of uploadedFile) { // Loop through each file
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'tickets');

                    // Step 2: Upload each file and get the uploaded file details
                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                    uploadedFiles.push({
                        url: result1?.data?.uploadedFiles?.url,
                        mimetype: result1?.data?.uploadedFiles?.mimetype,
                        originalname: result1?.data?.uploadedFiles?.originalname,
                    });
                }
            }
            const commentsArray = {
                ...(comments.trim() !== "" && { message: comments }),
                ...(uploadedFiles.length > 0 && { fileUrl: uploadedFiles })
            };
            const apiData = {
                "categoryId": selectedCategory,
                "ticketTypeId": selectedTicketType,
                "priority": selectedPriority,
                "workOrder": description,
                "title": title,
                ...(selectedMerchantId && { "merchantId": selectedMerchantId }),
                ...(uploadedFiles.length > 0 && { uploadedFiles: [...(Array.isArray(uploadedUrl) ? uploadedUrl : []), ...uploadedFiles] }), // Ensure uploadedUrl is an array
                // ...(commentsArray.length > 0 && { comments: commentsArray }) // Include uploadedFiles if present
            };
            if (commentsArray.message) {
                const result2 = await patchComment(`${baseURl}ticket/${location?.state?.rowData?.id}/comment`, accessToken, commentsArray?.message, commentsArray?.fileUrl);
            }
            const result = await putRequestWithBodyAndToken(`${baseURl}ticket/${location?.state?.rowData?.id}`, accessToken, apiData)
            toast.success(result?.message);
            navigate(-1);
        } catch (error) {
            toast.error(error?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Maintain Ticket'}
                Fontsize={30}
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
                    <div className="flex justify-between">
                        <GoBack />
                    </div>
                    {loading ? (
                        <div className="text-center w-full mx-auto">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'TICKET DETAILS'}
                                    Fontsize={30}
                                    mt={40}
                                    ml={24}
                                // Tailwind CSS classes
                                />
                                <div className="flex flex-wrap mx-6 mt-2 gap-x-4 gap-y-2">
                                    {/* <div>
                                <LabeledInput
                                    label="Ticket No"
                                    inputPlaceholder="Enter Ticket No"
                                    inputValue={ticketNo}
                                    onInputChange={setTicketNo}
                                    customWidth={true}
                                />
                            </div> */}
                                    <div>
                                        <LabeledInput
                                            label="Ticket No"
                                            inputPlaceholder="Enter Revenue Share"
                                            inputValue={ticketNo}
                                            disabled={true}
                                            // onInputChange={handleRevenueShareChange}
                                            addAgent={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Created On"
                                            inputPlaceholder="Enter Created On"
                                            inputValue={createdOn}
                                            // onInputChange={handleRevenueShareChange}
                                            addAgent={true}
                                            disabled={true}
                                        />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Category'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <DropdownMenu
                                            selectedValue={selectedCategoryTitle}
                                            menuItems={categoryList}
                                            handleRoleIdChange={handleCategoryChange}
                                            onSelect={handleCategoryTitleChange}
                                            defaultText={'Category'}
                                            maintainTicket={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Created By"
                                            // inputPlaceholder="Enter Revenue Share"
                                            inputValue={createdBy}
                                            disabled={true}
                                            // onInputChange={handleRevenueShareChange}
                                            addAgent={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            label="Ticket Status"
                                            // inputPlaceholder="Enter Revenue Share"
                                            inputValue={status}
                                            disabled={true}
                                            // onInputChange={handleRevenueShareChange}
                                            addAgent={true}
                                        />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Ticket Type'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <DropdownMenu
                                            icon={tickettypeunfillBlack}
                                            menuItems={ticketTypeList}
                                            defaultText={'--Select Ticket Type--'}
                                            maintainTicket={true}
                                            onSelect={handleTicketTypeChange}
                                            selectedValue={selectedTicketTypeTitle}
                                            idSet={true}
                                        />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Priority'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <DropdownMenu
                                            icon={PriorityIcon}
                                            // customWidth={true}
                                            menuItems={data3}
                                            maintainTicket={true}
                                            defaultText={'--Select Priority--'}
                                            onSelect={handlePriorityChange}
                                            selectedValue={selectedPriority}
                                        />
                                    </div>
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Merchant'}
                                            Fontsize={10}
                                            mb={2}
                                        />
                                        <DropdownMenu
                                            // icon={tickettypeunfillBlack}
                                            selectedValue={selectedMerchant}
                                            onSelect={handleMerchantIdChange}
                                            // handleRoleIdChange={handleMerchantIdChange}
                                            menuItems={customerList
                                                .filter(customer => customer?.dbaName) // {{ edit_1 }}: Filter out customers without a firstName
                                                .sort((a, b) => a?.dbaName.localeCompare(b?.dbaName))
                                                .map(customer => ({ name: customer?.dbaName }))}
                                            defaultText={'Select Merchant'}
                                            maintainTicket={true}
                                        />
                                        {showMerchantDetails && (
                                            <div
                                                onClick={handleViewMerchantDetails}
                                                style={{ textDecoration: 'underline', color: 'blue', cursor: 'pointer', marginTop: '4px', fontSize: 10 }}
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
                                            addAgent={true}
                                            // disabled={true}
                                        />
                                    </div>
                                </div>


                            </div>
                            <div className=" mt-2 mx-6" >
                                <div>
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Description'}
                                        Fontsize={10}
                                    />
                                    <div className="flex justify-start">
                                        <textarea
                                            type="text"
                                            placeholder="Description"
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            className={`mt-0.5 p-1 sm:w-64 h-28`}
                                            rows={6}
                                            style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 10, borderRadius: 4, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--dashboard-text-primary)' }}
                                        />
                                    </div>
                                </div>
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'TICKET ATTACHMENT FILES'}
                                    Fontsize={18}
                                    mt={32}
                                    mb={20}
                                />
                                {uploadedUrl && uploadedUrl.length > 0 && (
                                    <div>
                                        {getUniqueUploadedFiles().map((file, index) => (
                                            <div
                                                key={index}
                                                onClick={() => window.open(file?.url, '_blank')} // Open the respective file URL
                                                className="px-4 cursor-pointer mt-3"
                                                style={{
                                                    border: '1px solid var(--sidebar-selected-bg)',
                                                    fontSize: 14,
                                                    borderRadius: 9,
                                                    backgroundColor: 'var(--dashboard-tab-box)',
                                                    paddingTop: 8,
                                                    paddingBottom: 8,
                                                    width: '98%',
                                                    color: 'blue' // Set text color to blue
                                                }}
                                            >
                                                <Heading
                                                    Fontweight={500}
                                                    color={'blue'}
                                                    Heading={file?.originalname} // Display the original name of the file
                                                    Fontsize={10}
                                                    mb={4}
                                                />
                                            </div>
                                        ))}
                                        {ticketData?.comments?.length > 0 && (
                                            <div>
                                                {ticketData?.comments?.map((comment, index) => (
                                                    comment?.fileUrl && comment?.fileUrl?.length > 0 && (
                                                        <div key={index}>
                                                            {comment?.fileUrl?.map((file, fileIndex) => (
                                                                <div
                                                                    key={fileIndex}
                                                                    onClick={() => window.open(file?.url, '_blank')}
                                                                    className="px-4 cursor-pointer mt-3"
                                                                    style={{
                                                                        border: '1px solid var(--sidebar-selected-bg)',
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
                                                                            Heading={file?.originalname}
                                                                            Fontsize={16}
                                                                            mb={4}
                                                                        />
                                                                        <div className="flex flex-col items-end">
                                                                            <span style={{ fontSize: '12px', color: 'grey' }}>{comment?.user?.name}</span>
                                                                            <span style={{ fontSize: '12px', color: 'grey' }}>{new Date(comment?.createdAt).toLocaleString()}</span>
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
                                <div className="flex justify-start">
                                    <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 8, }} className="h-52 w-[98%] mt-4 pt-3 flex flex-col items-center">
                                        <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                                    </div>
                                </div>
                            </div>
                            <div className=" mt-8 mx-6" >
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'HISTORY'}
                                    Fontsize={18}
                                    // mt={40}
                                    mb={20}
                                // Tailwind CSS classes
                                />
                                <div className=" mt-4 " >
                                    <div>
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--fieldsTitle)'}
                                            Heading={'Remarks History'}
                                            Fontsize={16}
                                        // className={'ml-1'}
                                        // Tailwind CSS classes
                                        />
                                        <div className="flex flex-col justify-center"> {/* Changed to flex-col for vertical stacking */}
                                            {logs?.length > 0 ? (
                                                logs?.map((log, index) => (
                                                    <div key={index} className="mt-1 p-3 w-[100%]"
                                                        style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                        {`${log?.user?.name || '-'} updated ticket on ${new Date(log?.updatedAt).toLocaleString()}. Remarks: ${log?.action || '-'}`}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="mt-1 p-3 w-[100%] text-gray-500"
                                                    style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                    No remarks history
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className=" mt-8 mx-6" >
                                <Heading
                                    Fontweight={700}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'COMMENTS'}
                                    Fontsize={18}
                                    // mt={40}
                                    mb={20}
                                // Tailwind CSS classes
                                />
                                <div className="flex flex-col justify-center"> {/* Changed to flex-col for vertical stacking */}
                                    {ticketData?.comments?.length > 0 ? (
                                        ticketData?.comments?.map((comment, index) => (
                                            comment?.message && comment?.message?.trim() !== "" && (
                                                <div key={index} className="mt-1 p-3 w-[100%]"
                                                    style={{ border: '1px solid var(--sidebar-selected-bg)', color: 'blue', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)' }}>
                                                    <div className="flex justify-between">
                                                        <span style={{ fontSize: '12px', color: 'grey' }}>{comment?.user?.name || '-'}</span>
                                                        <span style={{ fontSize: '12px', color: 'grey' }}>{new Date(comment?.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: '14px', marginTop: '4px', color: 'black' }}>
                                                        {comment?.message}
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
                            <div style={{ display: '' }} className="flex justify-end mt-5 gap-3 mx-8 mb-10" >
                                {/* <BottonCustom
                            // backgroundColor={'bg-red-500'}
                            width={145}
                            title={'Delete'}
                            height={48}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={20}
                            fontWeight={500}
                            className={"bg-red-500"}
                        /> */}
                                <BottonCustom
                                    backgroundColor={'rgba(79, 214, 15, 1)'}
                                    width={130}
                                    title={'Save'}
                                    height={40}
                                    color={'var(--sidebar-text-selected)'}
                                    fontSize={16}
                                    fontWeight={500}
                                    onClick={EditTicket}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <MemoPopup
                trigger={showDialog}
                onClose={handleCloseDialog}
                rowData={selectedMerchantData} // Step 4: Pass selected merchant data to MemoPopup
                customerTable={true}
            />
        </div>
    );
};

export default MaintainTickets;
