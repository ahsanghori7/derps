import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import CustomDatePicker from "../../Components/CustomDatePicker";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { deleteRequest, postRequestWithFormData, putRequestWithBodyAndToken, getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import UploadFile from "../../Components/UploadFile";
import dayjs from "dayjs";
import MultiSelectDropdown from "../../Components/MultiSelectDropdown"
import RichTextEditor from "../../Components/RichEditor";
import LabeledInput from "../../Components/LabeledInput";
import DeleteConfirmationModal from "../../Components/DeleteModal";

const MaintainMemo = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();

    const [enabled, setEnabled] = useState(false)
    const [memoDate, setMemoDate] = useState("")
    const [memoSubject, setMemoSubject] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [userList, setUserList] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [HtmlContent, setHtmlContent] = useState("")
    const [title, setTitle] = useState("")
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

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

    const fetchMemoDetails = (memoId) => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}memo/${memoId}`, accessToken
        )
            .then(result => {
                if (result?.data) {
                    const memoData = result.data;
                    setHtmlContent(memoData.subject);
                    setTitle(memoData.title);
                    setMemoDate(new Date(memoData.date).toLocaleDateString('en-US'));
                    setEnabled(memoData.status === 'active');
                    // Use selectedUsers if available (contains full user objects), otherwise fall back to userIds
                    if (memoData.selectedUsers && Array.isArray(memoData.selectedUsers)) {
                        setSelectedItems(memoData.selectedUsers);
                    } else if (memoData.userIds && Array.isArray(memoData.userIds)) {
                        const selectedUsers = memoData.userIds.map(userId => ({ id: userId }));
                        setSelectedItems(selectedUsers);
                    }
                }
                setLoading(false);
            })
            .catch(error => {
                setLoading(false);
                toast.error("Failed to load memo details");
            })
    }

    useEffect(() => {
        fetchData2()
    }, [])

    useEffect(() => {
        if (location.state?.itemData?.id) {
            fetchMemoDetails(location.state.itemData.id);
        }
    }, [location.state?.itemData?.id, accessToken]);

    const handleGetContent = (html) => {
        setHtmlContent(html);
    };
    const handleSelectionChange = (items) => {
        setSelectedItems(items);
    };

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };
    const handleDeleteFile = (index) => {
        setUploadedFileName((prev) => prev.filter((_, i) => i !== index));
    };

    const handleMemoSubjectChange = (e) => {
        setMemoSubject(e.target.value);
    };
    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setMemoDate(formattedDate);
    };

    const handleEditMemo = async () => {
        if (
            memoDate === ""
            // || memoSubject.trim() === ""
            // || title.trim() === ""
            // || HtmlContent.trim() === ""
        ) {
            toast.error("All fields are required");
            return;
        }

        const year = dayjs(memoDate).year();

        if (year < 1900 || year > 2100) {
            toast.error("Please select a valid date.");
            setLoading(false);
            return;
        }
        const formattedDate = new Date(memoDate).toLocaleDateString('en-US', {
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
                    formData.append("type", 'memos');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                    uploadedFiles.push({
                        url: result1?.data?.fileUrl?.url,
                        mimetype: result1?.data?.fileUrl?.mimetype,
                        originalname: result1?.data?.fileUrl?.originalname,
                    });
                }
            }
            const apiData = {
                "subject": HtmlContent,
                "title": title, // Using the title from state
                "userIds": selectedItems.map(item => item?.id),
                "date": formattedDate,
                "status": enabled ? 'active' : 'in-active',
                // ...(uploadedFiles && { "fileUrl": [...uploadedUrl, ...uploadedFiles] }),
                fileUrl: [...(Array.isArray(uploadedFileName) ? uploadedFileName : []), ...uploadedFiles] // Ensure uploadedUrl is an array
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}memo/${location.state?.itemData?.id}`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };
    const handleDeleteMemo = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteRequest(`${baseURl}memo/${location.state?.itemData?.id}`, accessToken)
            toast.success(result.message);
            setIsDeleteModalOpen(false);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Maintain Memo'}
                Fontsize={30}
            // Tailwind CSS classes
            />

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, borderRadius: 14 }} className="sm:m-8 p-3 pt-4 m-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <GoBack />
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                            {enabled ?
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'Active'}
                                    Fontsize={16}
                                    smFontsize={20}
                                // Tailwind CSS classes
                                /> :
                                <Heading
                                    Fontweight={500}
                                    color={'var(--Gray)'}
                                    Heading={'In-Active'}
                                    Fontsize={16}
                                    smFontsize={20}
                                // Tailwind CSS classes
                                />
                            }
                            <Switch
                                checked={enabled}
                                onChange={setEnabled}
                                className="group relative flex h-6 w-12 sm:h-7 sm:w-14 cursor-pointer rounded-full bg-[#A7ABAD] p-1 transition-colors duration-200 ease-in-out focus:outline-none data-[focus]:outline-1 data-[focus]:outline-[#0FA958] data-[checked]:bg-[#0FA958]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none inline-block size-4 sm:size-5 translate-x-0 rounded-full bg-white ring-0 shadow-lg transition duration-200 ease-in-out group-data-[checked]:translate-x-6 sm:group-data-[checked]:translate-x-7"
                                />
                            </Switch>
                        </div>
                    </div>
                    <div>
                        <div className="mt-4 mr-0 sm:mr-5">
                            <div className="flex flex-col sm:flex-row sm:gap-4 gap-3">
                                <div className="w-full sm:w-auto">
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
                                        onChange={handleMemoDateChange}
                                        label="Form Date"
                                        supportTicket={true}
                                    />
                                </div>
                                <div className="w-full sm:w-auto">
                                    <Heading Fontweight={600} color={"var(--fieldsTitle)"} Heading={"Notify Employees"} Fontsize={10} mb={2} />
                                    <MultiSelectDropdown
                                        label="Select Employees"
                                        menuItems={userList}
                                        defaultText="--select employees--"
                                        onChange={handleSelectionChange}
                                        meetingLink={true}
                                        idSet={true}
                                        selectedValue={selectedItems}
                                    />
                                </div>
                                <div className="w-full sm:w-auto">
                                    <LabeledInput
                                        label="Title"
                                        inputPlaceholder="Enter Title"
                                        inputValue={title}
                                        meetingLink={true}
                                        onInputChange={handleTitleChange}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-2">
                            {/* <div>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Memo Subject'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <textarea
                                    type="text"
                                    placeholder="All agent's please check in with our backoffice support for TLS 1.2 update required by feb 15, 2018 to certain terminals"
                                    value={memoSubject}
                                    onChange={handleMemoSubjectChange}
                                    className={`mt-1 p-3 w-[60%] `}
                                    rows={4}
                                    style={{ border: '1px solid var(--sidebar-selected-bg)', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                                />
                            </div> */}
                            <div>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Memo Description'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <div>
                                    <RichTextEditor onGetContent={handleGetContent} initialContent={HtmlContent} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-2">
                            {/* {uploadedUrl && uploadedUrl.length > 0 && (
                                <div
                                    onClick={() => window.open(uploadedUrl[0]?.url, '_blank')} // Open the first file URL
                                    className="px-4 cursor-pointer mb-3 w-full sm:w-[60%]"
                                    style={{
                                        border: '1px solid var(--sidebar-selected-bg)',
                                        fontSize: 14,
                                        borderRadius: 9,
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        paddingTop: 8,
                                        paddingBottom: 8,
                                        // width: '100%',
                                        color: 'red' // Set text color to blue
                                    }}
                                >
                                    {uploadedUrl && <Heading
                                        Fontweight={500}
                                        color={'blue'}
                                        Heading={uploadedUrl.map(file => file.originalname).join(', ')} // Join names with a comma
                                        Fontsize={10}
                                        mb={2}
                                    // Tailwind CSS classes
                                    />}
                                </div>
                            )} */}
                            {/* <div className="flex justify-start"> */}
                            {/* {uploadedFileName && uploadedFileName.length > 0 && (
                                <div>
                                    {uploadedFileName.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between px-4 cursor-pointer mb-3 w-full sm:w-[60%]"
                                            style={{
                                                border: '1px solid var(--sidebar-selected-bg)',
                                                fontSize: 14,
                                                borderRadius: 9,
                                                backgroundColor: 'var(--dashboard-tab-box)',
                                                paddingTop: 8,
                                                paddingBottom: 8,
                                                color: 'blue'
                                            }}
                                        >
                                            <div onClick={() => window.open(file.url, '_blank')}>
                                                <Heading
                                                    Fontweight={500}
                                                    color={'blue'}
                                                    Heading={file.originalname}
                                                    Fontsize={10}
                                                    mb={2}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFile(index)}
                                                className="text-red-500"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )} */}
                            {/* <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Upload File'}
                                Fontsize={10}
                            // Tailwind CSS classes
                            />
                            <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 8, }} className="h-52 w-[60%]  pt-3 flex flex-col mt-2 items-center">


                                <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                            </div> */}
                            {/* </div> */}
                        </div>

                    </div>
                    <div style={{ display: '' }} className="flex flex-col sm:flex-row sm:justify-end mt-4 gap-3 mr-0 sm:mr-5" >
                        <BottonCustom
                            backgroundColor={''}
                            width={130}
                            title={'Delete'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"bg-red-500 w-full sm:w-auto"}
                            onClick={() => setIsDeleteModalOpen(true)}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"w-full sm:w-auto"}
                            onClick={handleEditMemo}
                        />
                    </div>
                </div>
            </div>

            <DeleteConfirmationModal
                open={isDeleteModalOpen}
                title="Delete Memo"
                subtitle="Are you sure you want to delete this memo?"
                entityName={title || "Untitled Memo"}
                warningMessage="This action cannot be undone. The memo will be permanently deleted."
                onCancel={() => setIsDeleteModalOpen(false)}
                onDelete={handleDeleteMemo}
                isLoading={isDeleting}
            />
        </div>
    );
};

export default MaintainMemo;
