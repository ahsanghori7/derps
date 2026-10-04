import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import CustomDatePicker from "../../Components/CustomDatePicker";
import RichTextEditor from "../../Components/RichEditor";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { deleteRequest, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import UploadFile from "../../Components/UploadFile";
import dayjs from "dayjs";
import DeleteConfirmationModal from "../../Components/DeleteModal";

const MaintainForm = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();
    const [uploadedUrl, setUploadedUrl] = useState(null);

    const [enabled, setEnabled] = useState(false)
    const [formSubject, setFormSubject] = useState("")
    const [formDate, setFormDate] = useState("")
    const [crossRefrence, setCrossRefrence] = useState("")
    const [HtmlContent, setHtmlContent] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    // const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [fileToDeleteIndex, setFileToDeleteIndex] = useState(null);
    const [errors, setErrors] = useState({});
    
    const handleFileUpload = (file) => {
        setUploadedFile(file);
        clearError("uploadedFile");
    };
    const handleDeleteFile = (index) => {
        setFileToDeleteIndex(index);
        setShowDeleteModal(true);
    };

    const confirmDeleteFile = () => {
        setUploadedFileName((prev) => prev.filter((_, i) => i !== fileToDeleteIndex));
        setShowDeleteModal(false);
        setFileToDeleteIndex(null);
    };

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const cancelDeleteFile = () => {
        setShowDeleteModal(false);
        setFileToDeleteIndex(null);
    };

    useEffect(() => {
        if (location.state) {
            const { crossReference, date, status, description, subject } = location.state?.itemData;
            setFormSubject(subject);
            setCrossRefrence(crossReference);
            setHtmlContent(description);
            setFormDate(new Date(date).toLocaleDateString('en-US'));
            setUploadedFileName(location.state?.itemData?.fileUrl)
            setEnabled(status === 'active');
        }
    }, [location.state]);

    const handleFormSubjectChange = (e) => {
        setFormSubject(e.target.value);
        clearError("formSubject");
    };
    const handleCrossRefrenceChange = (e) => {
        setCrossRefrence(e.target.value);
        clearError("crossRefrence");
    };

    const handleGetContent = (html) => {
        setHtmlContent(html);
        clearError("HtmlContent");
        // setLanguage(lang); // Set the language received from RichNewsEditor
    };

    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setFormDate(formattedDate);
        clearError("formDate");
    };

    const handleMaintainForm = async () => {
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (formSubject.trim() === "") fieldErrors.formSubject = true;
        if (formDate === "") fieldErrors.formDate = true;
        if (crossRefrence.trim() === "") fieldErrors.crossRefrence = true;
        if (HtmlContent.trim() === "") fieldErrors.HtmlContent = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("All fields are required");
            return;
        }

        const year = dayjs(formDate).year();
        
        if (year < 1900 || year > 2100) {
            toast.error("Please select a valid date.");
            setLoading(false);
            return;
        }
        // Ensure the date is in the correct format
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
                    formData.append("type", 'form');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                    uploadedFiles.push({
                        url: result1?.data?.fileUrl?.url,
                        mimetype: result1?.data?.fileUrl?.mimetype,
                        originalname: result1?.data?.fileUrl?.originalname,
                    });
                }
            }
            const apiData = {
                "subject": formSubject,
                "crossReference": crossRefrence,
                "description": HtmlContent,
                "date": formattedDate,
                "status": enabled ? 'active' : 'in-active',
                fileUrl: [...(Array.isArray(uploadedFileName) ? uploadedFileName : []), ...uploadedFiles] // Ensure uploadedUrl is an array
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}form/${location.state?.itemData?.id}`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };
    const handleDeleteForm = async () => {
        
        // Proceed with login logic
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}form/${location.state?.itemData?.id}`, accessToken)
            toast.success('Form has been deleted successfully.');
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', minHeight: '100vh', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Maintain Form'}
                Fontsize={30}
            // Tailwind CSS classes
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
            <div style={{ marginTop: 10,  borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
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
                    <div className="flex flex-wrap mx-6 mt-2 gap-x-4 gap-y-2">
                            <div>
                                <LabeledInput
                                    label="Form Subject"
                                    inputPlaceholder="Enter Form Subject"
                                    inputValue={formSubject}
                                    onInputChange={handleFormSubjectChange}
                                    meetingLink={true}
                                    error={!!errors.formSubject}
                                />
                            </div>
                            <div className="">
                                <LabeledInput
                                    label="Cross Refrence"
                                    inputPlaceholder="Enter Cross Refrence"
                                    inputValue={crossRefrence}
                                    onInputChange={handleCrossRefrenceChange}
                                    meetingLink={true}
                                    error={!!errors.crossRefrence}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap mx-6 mt-2 gap-x-4 gap-y-2">
                            <div>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Form Date'}
                                    Fontsize={10}
                                    mb={4}
                                // Tailwind CSS classes
                                />
                                <CustomDatePicker
                                    value={formDate}
                                    onChange={handleMemoDateChange}
                                    label="Form Date"
                                    supportTicket={true}
                                    fieldError={!!errors.formDate}
                                />
                            </div>
                        </div>
                    <div className=" mx-6 mt-2 gap-x-4 gap-y-2">
                        {uploadedUrl && uploadedUrl.length > 0 && (
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
                                        Fontsize={16}
                                        mb={4}
                                    // Tailwind CSS classes
                                    />}
                                </div>
                            )}
                            {/* <div className="flex justify-start"> */}
                            {uploadedFileName && uploadedFileName.length > 0 && (
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
                                                Fontsize={16}
                                                mb={4}
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
                            )}
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Upload File'}
                                Fontsize={10}
                                mt={10}
                            // Tailwind CSS classes
                            />
                            <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 8, }} className="h-52 w-[60%]  pt-3 flex flex-col mt-2 items-center">
                                

                                <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                            </div>
                            {/* </div> */}
                        </div>
                    <div className=" mx-6 mt-2 gap-x-4 gap-y-2">
                            <div>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Form Description'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <div className="p-5" style={{
                                    border: errors.HtmlContent ? '1.5px solid #ef4444' : '1px solid var(--sidebar-selected-bg)', borderRadius: 8,
                                    backgroundColor: 'var(--dashboard-tab-box)'
                                }}>
                                    <RichTextEditor onGetContent={handleGetContent}
                                        initialContent={HtmlContent} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: '' }} className="flex justify-end mt-10 gap-3 mr-5" >
                        <BottonCustom
                            backgroundColor={''}
                            width={130}
                            title={'Delete'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"bg-red-500"}
                            onClick={handleDeleteForm}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleMaintainForm}
                        />
                    </div>
                </div>
            </div>
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete File"
                subtitle="Are you sure you want to delete"
                entityName={uploadedFileName?.[fileToDeleteIndex]?.originalname || "this file"}
                warningMessage="This action cannot be undone. The file will be permanently removed from the form."
                onCancel={cancelDeleteFile}
                onDelete={confirmDeleteFile}
                isLoading={false}
            />
        </div>
    );
};

export default MaintainForm;
