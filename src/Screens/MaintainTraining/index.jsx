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

const MaintainTraining = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const location = useLocation();
    const navigate = useNavigate();

    const [enabled, setEnabled] = useState(true)
    const [trainingSubject, setTrainingSubject] = useState("")
    const [trainingDate, setTrainingDate] = useState("")
    const [crossRefrence, setCrossRefrence] = useState("")
    const [HtmlContent, setHtmlContent] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [errors, setErrors] = useState({});
    const handleFileUpload = (file) => {
        setUploadedFile(file);
        clearError("uploadedFile");
    };
    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    useEffect(() => {
        if (location.state) {
            const { crossReference, date, status, description, subject } = location.state?.itemData;
            setTrainingSubject(subject);
            setCrossRefrence(crossReference);
            setHtmlContent(description);
            setTrainingDate(new Date(date).toLocaleDateString('en-US'));
            setEnabled(status === 'active');
            setUploadedFileName(location.state?.itemData?.fileUrl)

        }
    }, [location.state]);

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

    const handleEditTraining = async () => {
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
        // Ensure the date is in the correct format
        const formattedDate = new Date(trainingDate).toLocaleDateString('en-US', {
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
                    formData.append("type", 'training-form');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                    uploadedFiles.push({
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
                "date": formattedDate,
                "status": enabled ? 'active' : 'in-active',
                ...(uploadedFiles.length > 0 && { fileUrl: [...(Array.isArray(uploadedFileName) ? uploadedFileName : []), ...uploadedFiles] }), // Ensure uploadedUrl is an array
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}training-form/${location.state?.itemData?.id}`, accessToken, apiData)
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
            const result = await deleteRequest(`${baseURl}training-form/${location.state?.itemData?.id}`, accessToken)
            toast.success('Form has been deleted successfully.');
            navigate(-1);
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Maintain Training Form'}
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
                                    label="Training Subject"
                                    inputPlaceholder="Training Subject"
                                    inputValue={trainingSubject}
                                    onInputChange={handleTrainingSubjectChange}
                                    meetingLink={true}
                                    error={!!errors.trainingSubject}
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
                                    Heading={'Training Date'}
                                    Fontsize={10}
                                    mb={4}
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
                                        Fontsize={10}
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
                                            onClick={() => window.open(file.url, '_blank')} // Open the respective file URL
                                            className="px-4 cursor-pointer mt-2"
                                            style={{
                                                border: '1px solid var(--sidebar-selected-bg)',
                                                fontSize: 14,
                                                borderRadius: 9,
                                                backgroundColor: 'var(--dashboard-tab-box)',
                                                paddingTop: 8,
                                                paddingBottom: 8,
                                                width: '60%',
                                                color: 'blue' // Set text color to blue
                                            }}
                                        >
                                            <Heading
                                                Fontweight={500}
                                                color={'blue'}
                                                Heading={file.originalname} // Display the original name of the file
                                                Fontsize={10}
                                                mb={4}
                                            />
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
                            />
                            <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--sidebar-selected-bg)', borderRadius: 8, }} className="h-44 w-[60%]  pt-3 flex flex-col mt-2 items-center">
                                <UploadFile backgroundColor={'var(--scroll-thumb)'} addTicket={true} onFileChange={handleFileUpload} />
                            </div>
                            {/* </div> */}
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
                                    <RichTextEditor onGetContent={handleGetContent}
                                        initialContent={HtmlContent} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: '' }} className="flex justify-end mt-10 gap-3" >
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
                            onClick={handleEditTraining}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintainTraining;
