import { useState } from "react";
import Heading from "../../Components/Heading";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import CustomDatePicker from "../../Components/CustomDatePicker";
import RichTextEditor from "../../Components/RichEditor";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import Spinner from "../../Components/Spinner";
import { postRequestWithBodyAndToken, postRequestWithFormData } from "../../Api/fetch";
import UploadFile from "../../Components/UploadFile";
import dayjs from "dayjs";

const AddTraining = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();

    const [enabled, setEnabled] = useState(true)
    const [trainingSubject, setTrainingSubject] = useState("")
    const [trainingDate, setTrainingDate] = useState("")
    const [crossRefrence, setCrossRefrence] = useState("")
    const [HtmlContent, setHtmlContent] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [errors, setErrors] = useState({});

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const handleFileUpload = (file) => {
        setUploadedFile(file);
        clearError("uploadedFile");
    };

    const handleTrainingSubjectChange = (e) => {
        setTrainingSubject(e.target.value);
        clearError("trainingSubject");
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
        setTrainingDate(formattedDate);
        clearError("trainingDate");
    };

    const handleAddForm = async () => {
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (trainingSubject.trim() === "") fieldErrors.trainingSubject = true;
        if (trainingDate === "") fieldErrors.trainingDate = true;
        if (crossRefrence.trim() === "") fieldErrors.crossRefrence = true;
        if (HtmlContent.trim() === "") fieldErrors.HtmlContent = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("All fields are required");
            return;
        }

        const year = dayjs(trainingDate).year();

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
                    formData.append("type", 'training-form');

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
                "subject": trainingSubject,
                "crossReference": crossRefrence,
                "description": HtmlContent,
                "date": trainingDate,
                "fileUrl": uploadedFileResults,
                "status": enabled ? 'active' : 'in-active',
            };
            const result = await postRequestWithBodyAndToken(`${baseURl}training-form`, accessToken, apiData)
            toast.success(result.message);
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
                Heading={'Add Training Form'}
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
                                    label="Training Subject"
                                    inputPlaceholder="Training Subject"
                                    inputValue={trainingSubject}
                                    meetingLink={true}
                                    onInputChange={handleTrainingSubjectChange}
                                    error={!!errors.trainingSubject}
                                />
                            </div>
                            <div className="">
                                <LabeledInput
                                    label="Cross Refrence"
                                    inputPlaceholder="Cross Refrence"
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
                                    Heading={'Training Date'}
                                    Fontsize={10}
                                    mb={4}
                                // Tailwind CSS classes
                                />
                                <CustomDatePicker
                                    value={trainingDate}
                                    onChange={handleMemoDateChange}
                                    label="Training Date"
                                    supportTicket={true}
                                    fieldError={!!errors.trainingDate}
                                />
                            </div>
                        </div>
                        <div className="mx-6 mt-2 gap-x-4 gap-y-2">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Upload'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <div className="flex justify-start">
                                    <div style={{ 
                                        backgroundColor: 'var(--dashboard-tab-box)', 
                                        border: errors.uploadedFile ? '1.5px solid #ef4444' : '1px solid var(--sidebar-selected-bg)', 
                                        borderRadius: 8, 
                                    }} className="h-52 w-[60%]  pt-3 flex flex-col items-center">
                                        <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                                    </div>
                                </div>
                            </div>
                            <div className=" mx-6 mt-2 gap-x-4 gap-y-2">
                            <div>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Training Description'}
                                    Fontsize={10}
                                // Tailwind CSS classes
                                />
                                <div className="p-5" style={{
                                    border: errors.HtmlContent ? '1.5px solid #ef4444' : '1px solid var(--sidebar-selected-bg)', borderRadius: 8,
                                    backgroundColor: 'var(--dashboard-tab-box)'
                                }}>
                                    <RichTextEditor onGetContent={handleGetContent} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: '' }} className="flex justify-end mt-10 gap-3 mr-5" >

                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={loading ? <Spinner /> : 'Done'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleAddForm}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddTraining;
