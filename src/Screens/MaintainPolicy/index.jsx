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
import { deleteRequest, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useLocation, useNavigate } from "react-router-dom";
import CustomDatePicker from "../../Components/CustomDatePicker";
import RichTextEditor from "../../Components/RichEditor";
import UploadFile from "../../Components/UploadFile";
import dayjs from "dayjs";
import DeleteConfirmationModal from "../../Components/DeleteModal";

const MaintainPolicy = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();
    const location = useLocation();

    const [enabled, setEnabled] = useState(true)
    const [policySubject, setPolicySubject] = useState("")
    const [policyDate, setPolicyDate] = useState("")
    const [crossRefrence, setCrossRefrence] = useState("")
    const [HtmlContent, setHtmlContent] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [errors, setErrors] = useState({});
    const handleFileUpload = (file) => {
        setUploadedFile(file);
        clearError("uploadedFile");
    };
    const handleDeleteFile = (index) => {
        setUploadedFileName((prev) => prev.filter((_, i) => i !== index));
    };

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));
    useEffect(() => {
        if (location.state) {
            const { crossReference, date, status, description, subject } = location.state?.itemData;
            setPolicySubject(subject);
            setCrossRefrence(crossReference);
            setHtmlContent(description);
            setPolicyDate(new Date(date).toLocaleDateString('en-US'));
            setEnabled(status === 'active');
            setUploadedFileName(location.state?.itemData?.fileUrl)

        }
    }, [location.state]);

    const handlePolicySubjectChange = (e) => {
        setPolicySubject(e.target.value);
        clearError("policySubject");
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
        setPolicyDate(formattedDate);
        clearError("policyDate");
    };

    const handleMaintainPolicy = async () => {
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (policySubject.trim() === "") fieldErrors.policySubject = true;
        if (policyDate === "") fieldErrors.policyDate = true;
        if (crossRefrence.trim() === "") fieldErrors.crossRefrence = true;
        if (HtmlContent.trim() === "") fieldErrors.HtmlContent = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("All fields are required");
            return;
        }
        
        const year = dayjs(policyDate).year();
        
        if (year < 1900 || year > 2100) {
            toast.error("Please select a valid date.");
            setLoading(false);
            return;
        }
        // Ensure the date is in the correct format
        const formattedDate = new Date(policyDate).toLocaleDateString('en-US', {
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
                    formData.append("type", 'policy');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                    uploadedFiles.push({
                        url: result1?.data?.fileUrl?.url,
                        mimetype: result1?.data?.fileUrl?.mimetype,
                        originalname: result1?.data?.fileUrl?.originalname,
                    });
                }
            }
            const apiData = {
                "subject": policySubject,
                "crossReference": crossRefrence,
                "description": HtmlContent,
                "date": formattedDate,
                "status": enabled ? 'active' : 'in-active',
                "fileUrl": [...(Array.isArray(uploadedFileName) ? uploadedFileName : []), ...uploadedFiles] // Ensure uploadedUrl is an array
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}policy-forms/${location.state?.itemData?.id}`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };
    const handleDeletePolicy = async () => {
        setShowDeleteModal(true);
    };

    const confirmDeletePolicy = async () => {
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}policy-forms/${location.state?.itemData?.id}`, accessToken)
            toast.success('Form has been deleted successfully.');
            setShowDeleteModal(false);
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const cancelDeletePolicy = () => {
        setShowDeleteModal(false);
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Maintain Policy Form'}
                Fontsize={30}
            // Tailwind CSS classes
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
            <div style={{ marginTop: 10,  borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
            <div className="flex justify-between gap-3 flex-wrap">
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
                                    label="Policy Subject"
                                    inputPlaceholder="Policy Subject"
                                    inputValue={policySubject}
                                    onInputChange={handlePolicySubjectChange}
                                    meetingLink={true}
                                    error={!!errors.policySubject}
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
                                    Heading={'Policy Date'}
                                    Fontsize={10}
                                    mb={4}
                                />
                                <CustomDatePicker
                                    value={policyDate}
                                    onChange={handleMemoDateChange}
                                    label="Policy Date"
                                    supportTicket={true}
                                    fieldError={!!errors.policyDate}
                                />
                            </div>
                        </div>

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
                                />}
                            </div>
                        )}
                        {/* <div className="flex justify-start"> */}
                        {uploadedFileName && uploadedFileName.length > 0 && (
                            <div>
                                {uploadedFileName.map((file, index) => (
                                    <div
                                    key={index}
                                    className="flex items-center justify-between px-4 cursor-pointer mt-2"
                                    style={{
                                        border: '1px solid var(--sidebar-selected-bg)',
                                        fontSize: 14,
                                        borderRadius: 9,
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        paddingTop: 8,
                                        paddingBottom: 8,
                                        width: '60%',
                                        color: 'blue'
                                    }}
                                >
                                    <div onClick={() => window.open(file.url, '_blank')}>
                                        <Heading
                                            Fontweight={500}
                                            color={'blue'}
                                            Heading={file.originalname}
                                            Fontsize={10}
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
                            className={'mt-2'}
                        />
                        <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 8, }} className="h-44 w-[60%]  pt-3 flex flex-col mt-1 items-center">
                            <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                        </div>
                        <div className="mt-4 mr-5">
                            <div>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Policy Description'}
                                    Fontsize={10}
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
                            onClick={handleDeletePolicy}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleMaintainPolicy}
                        />
                    </div>
                </div>
            </div>
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Policy Form"
                subtitle="Are you sure you want to delete"
                entityName={policySubject || "this policy form"}
                warningMessage="This action cannot be undone. The policy form will be permanently removed from the system."
                onCancel={cancelDeletePolicy}
                onDelete={confirmDeletePolicy}
                isLoading={loading}
            />
        </div>
    );
};

export default MaintainPolicy;
