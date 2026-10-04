import { useState, useEffect } from "react";
import Heading from "../../Components/Heading";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import CustomDatePicker from "../../Components/CustomDatePicker";
import { postRequestWithBodyAndToken, postRequestWithFormData, getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import Spinner from "../../Components/Spinner";
import UploadFile from "../../Components/UploadFile";
import dayjs from "dayjs";
import MultiSelectDropdown from "../../Components/MultiSelectDropdown"
import RichTextEditor from "../../Components/RichEditor";
import "./style.css";

const AddMemo = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();

    const [enabled, setEnabled] = useState(true)
    const [memoDate, setMemoDate] = useState("")
    const [memoSubject, setMemoSubject] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [userList, setUserList] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [HtmlContent, setHtmlContent] = useState("")
    const [title, setTitle] = useState("")
    const [errors, setErrors] = useState({});

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
        clearError("title");
    };

    const fetchData2 = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                setUserList(activeUsers);
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData2()
    }, [])

    const handleFileUpload = (file) => {
        setUploadedFile(file);
        clearError("uploadedFile");
    };
    const handleGetContent = (html) => {
        setHtmlContent(html);
        clearError("HtmlContent");
    };
    const handleSelectionChange = (items) => {
        setSelectedItems(items);
        clearError("selectedItems");
    };

    const handleMemoSubjectChange = (e) => {
        setMemoSubject(e.target.value);
        clearError("memoSubject");
    };

    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setMemoDate(formattedDate);
        clearError("memoDate");
    };

    const handleCreateMemo = async () => {
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (memoDate.trim() === "") fieldErrors.memoDate = true;
        if (title.trim() === "") fieldErrors.title = true;
        if (HtmlContent.trim() === "") fieldErrors.HtmlContent = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("All fields are required");
            return;
        }
        const year = dayjs(memoDate).year();

        if (year < 1900 || year > 2100) {
            toast.error("Please select a valid date.");
            setLoading(false);
            return;
        }

        // Proceed with login logic
        setLoading(true);
        try {
            const uploadedFileResults = []; // Step 3: Array to hold results of uploaded files

            // Check if uploadedFile is an array and has files
            if (Array.isArray(uploadedFile) && uploadedFile.length > 0) { // {{ edit_1 }}
                for (const file of uploadedFile) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'memos');

                    // formData.forEach((value, key) => {
                    // });
                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData)
                    // Step 1: Extract the uploaded file details
                    uploadedFileResults.push({
                        url: result1?.data?.fileUrl?.url,
                        mimetype: result1?.data?.fileUrl?.mimetype,
                        originalname: result1?.data?.fileUrl?.originalname,
                    });
                }
            }
            const apiData = {
                "subject": HtmlContent,
                "date": memoDate,
                // "fileUrl": uploadedFileResults,
                "title": title, // Using the title from state
                "userIds": selectedItems.map(item => item?.id),
                "status": enabled ? 'active' : 'in-active',
            };
            const result = await postRequestWithBodyAndToken(`${baseURl}memo`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-memo-page" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Create Memo'}
                Fontsize={30}
            // Tailwind CSS classes
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
                    <div className="flex justify-between">
                        <GoBack />
                        <div className="flex items-center gap-4">
                            {enabled ?
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'Active'}
                                    Fontsize={20}
                                // Tailwind CSS classes
                                /> :
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'In-Active'}
                                    Fontsize={20}
                                // Tailwind CSS classes
                                />
                            }
                            <Switch
                                checked={enabled}
                                onChange={setEnabled}
                                className="group relative flex h-7 w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-7"
                                />
                            </Switch>
                        </div>
                    </div>
                    <div>
                        <div className="mt-4 mr-5">
                            <div className="flex gap-4 flex-wrap items-start">
                                <div className="w-64 memo-field">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Memo Date'}
                                        Fontsize={10}
                                        mb={2}
                                    // Tailwind CSS classes
                                    />
                                    <CustomDatePicker
                                        value={memoDate}
                                        supportTicket={true}
                                        onChange={handleMemoDateChange}
                                        placeholder="MM/DD/YYYY"
                                        fieldError={!!errors.memoDate}
                                    />
                                </div>
                                <div className="w-64 memo-field">
                                    <Heading Fontweight={500} color={"var(--fieldsTitle)"} Heading={"Notify Employees"} Fontsize={10} mb={2} />
                                    <MultiSelectDropdown
                                        label="Select Employees"
                                        menuItems={userList}
                                        defaultText="--select employees--"
                                        onChange={handleSelectionChange}
                                        meetingLink={true}
                                        idSet={true}
                                        error={!!errors.selectedItems}
                                    />
                                </div>
                                <div className="w-64 memo-field mt-0.5">
                                    <LabeledInput
                                        label="Title"
                                        inputPlaceholder="Enter Title"
                                        inputValue={title}
                                        meetingLink={true}
                                        onInputChange={handleTitleChange}
                                        error={!!errors.title}
                                        className="memo-input"
                                    />
                                </div>
                            </div>
                            {/* <div className="mt-2">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Memo Subject'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <textarea
                                    type="text"
                                    placeholder="Memo Subject"
                                    value={memoSubject}
                                    onChange={handleMemoSubjectChange}
                                    className={`mt-1 p-3 w-[60%] `}
                                    rows={4}
                                    style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                                />
                            </div> */}
                            <div className="mt-4 ">
                                <div>
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--fieldsTitle)'}
                                        Heading={'Memo Description'}
                                        Fontsize={10}
                                    // Tailwind CSS classes
                                    />
                                    <div style={{
                                        border: errors.HtmlContent ? '1.5px solid #ef4444' : '1px solid var(--sidebar-selected-bg)', 
                                        borderRadius: 8,
                                        backgroundColor: 'var(--dashboard-tab-box)'
                                    }}>
                                        <RichTextEditor onGetContent={handleGetContent} />
                                    </div>
                                </div>
                            </div>
                            {/* <div className="mt-2">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Upload'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <div className="flex justify-start">
                                    <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 8, }} className="h-52 w-[60%]  pt-3 flex flex-col items-center">
                                        <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                                    </div>
                                </div>
                            </div> */}
                        </div>
                        {/* <div className="flex mt-4 gap-8">
                            <div className="">
                                <LabeledInput
                                    label="Memo No"
                                    inputPlaceholder="Enter Memo No"
                                    inputValue={memoNo}
                                    onInputChange={setMemoNo}
                                />
                            </div>
                            
                        </div> */}
                    </div>
                    <div style={{ display: '' }} className="flex justify-end mt-20 gap-3 mr-5" >
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={loading ? <Spinner /> : 'Done'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleCreateMemo}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMemo;
