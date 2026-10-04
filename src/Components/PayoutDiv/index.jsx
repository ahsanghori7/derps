import Heading from "../Heading";
import DropdownMenu from "../dropdownMenu";
import BottonCustom from "../ButtonCustom";
import UploadFile from "../UploadFile";
import { useState } from "react";
import { toast } from "react-toastify";
import { postRequestWithFormData } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import UploadPayoutFile from "../UploadPayoutFile";
import ErrorModal from "../ErrorModal";

const PayoutDiv = (props) => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const { title, upload } = props;
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [loading, setLoading] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [uploadErrors, setUploadErrors] = useState([]);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleFileUpload = (file) => {
        if (!file) return;

        const allowedMimeTypes = new Set([
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ]);

        const fileName = String(file?.name || '').toLowerCase();
        const hasAllowedExtension =
            fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        const isAllowed = allowedMimeTypes.has(file.type) || hasAllowedExtension;

        if (isAllowed) {
            setUploadedFile(file);
            setFieldErrors((prev) => ({ ...prev, file: false }));
        } else {
            toast.error('Invalid file type. Please upload a CSV or Excel file.');
        }
    };
    const handleYearChange = (year) => {
        setSelectedYear(year);
        setFieldErrors((prev) => ({ ...prev, year: false }));
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
        setFieldErrors((prev) => ({ ...prev, month: false }));
    };


    const data = [
        { id: 1, year: 2015, value: 2015 },
        { id: 2, year: 2016, value: 2016 }, // Added value
        { id: 3, year: 2017, value: 2017 }, // Added value
        { id: 4, year: 2018, value: 2018 }, // Added value
        { id: 5, year: 2019, value: 2019 }, // Added value
        { id: 6, year: 2020, value: 2020 }, // Added value
        { id: 7, year: 2021, value: 2021 }, // Added value
        { id: 8, year: 2022, value: 2022 }, // Added value
        { id: 9, year: 2023, value: 2023 }, // Added value
        { id: 10, year: 2024, value: 2024 }, // Added value
        { id: 11, year: 2025, value: 2025 }, // Added value
        { id: 12, year: 2026, value: 2026 }  // Added value
    ];

    const months = [
        { id: 1, month: 'January', value: 'january' },
        { id: 2, month: 'February', value: 'february' }, // Added value
        { id: 3, month: 'March', value: 'march' },       // Added value
        { id: 4, month: 'April', value: 'april' },       // Added value
        { id: 5, month: 'May', value: 'may' },           // Added value
        { id: 6, month: 'June', value: 'june' },         // Added value
        { id: 7, month: 'July', value: 'july' },         // Added value
        { id: 8, month: 'August', value: 'august' },     // Added value
        { id: 9, month: 'September', value: 'september' }, // Added value
        { id: 10, month: 'October', value: 'october' },   // Added value
        { id: 11, month: 'November', value: 'november' }, // Added value
        { id: 12, month: 'December', value: 'december' }  // Added value
    ];

    const UploadPayout = async () => {
        const errors = {
            year: selectedYear === "",
            month: selectedMonth === "",
            file: !uploadedFile,
        };
        setFieldErrors(errors);

        if (Object.values(errors).some(Boolean)) {
            toast.error("All fields are required");
            return;
        }
        // Proceed with login logic
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", uploadedFile);
            formData.append("year", selectedYear);
            formData.append("month", selectedMonth);

            // formData.forEach((value, key) => {
            // });
            const result1 = await postRequestWithFormData(`${baseURl}payouts`, accessToken, formData)
            // Step 1: Extract the uploaded file details

            toast.success(result1.message);
        } catch (error) {
            
            // Parse the error message to extract errors array
            try {
                let errorData;
                if (typeof error.message === 'string' && error.message.includes('{')) {
                    // Try to parse JSON from error message
                    errorData = JSON.parse(error.message);
                } else if (error.data) {
                    errorData = error.data;
                } else if (error.response?.data) {
                    errorData = error.response.data;
                }
                
                // Check if we have a structured error with errors array
                if (errorData?.errors && Array.isArray(errorData.errors)) {
                    setUploadErrors(errorData.errors);
                    setErrorModalOpen(true);
                    toast.error(`File upload failed with ${errorData.errors.length} errors. See details.`);
                } else {
                    toast.error(error.message || "Something went wrong");
                }
            } catch (parseError) {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div>
                <div style={{ backgroundColor: 'var(--navbar-dropdown-hover)', borderTopLeftRadius: 12, borderTopRightRadius: 12, }} className="mt-4 py-1 w-[90%] xl:w-[60%]">
                    <Heading
                        Fontweight={600}
                        color={'var(--sidebar-text-selected)'}
                        Heading={title}
                        Fontsize={20}
                        ml={30}
                    // Tailwind CSS classes
                    />
                </div>
                <div style={{ backgroundColor: 'var(--scroll-thumb)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, }} className=" py-2 w-[90%] xl:w-[60%]">
                    <div style={{}} className="flex justify-center flex-wrap gap-4 mx-2 mt-4">
                        <div>
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Select Month'}
                                Fontsize={10}
                                mb={4}
                            // Tailwind CSS classes
                            />
                            <DropdownMenu menuItems={months} meetingLink={true} defaultText={'Select Month'} onSelect={handleMonthChange} error={fieldErrors.month} />
                        </div>
                        <div>
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Select Year'}
                                Fontsize={10}
                                mb={4}
                            // Tailwind CSS classes
                            />
                            <DropdownMenu menuItems={data} meetingLink={true} defaultText={'Select Year'} onSelect={handleYearChange} error={fieldErrors.year} />
                        </div>
                    </div>

                    <div className="flex justify-center flex-wrap gap-10 mx-4 md:flex-nowrap md:justify-center md:gap-14 lg:gap-24 mb-8">
                        <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: fieldErrors.file ? '1px solid #ef4444' : '1px solid rgba(100, 153, 255, 0.9)', borderRadius: 7, width: 300, }} className="h-40 mt-4 pt-3 flex flex-col items-center">
                            <UploadPayoutFile onFileChange={handleFileUpload} />
                        </div>
                        <div className="flex justify-end items-end gap-3">
                            <BottonCustom
                                backgroundColor={'rgba(67, 121, 238, 1)'}
                                width={130}
                                title={'Upload'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={600}
                                onClick={UploadPayout}
                            />
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Error Modal */}
            <ErrorModal
                isOpen={errorModalOpen}
                onClose={() => setErrorModalOpen(false)}
                errors={uploadErrors}
                fileName={uploadedFile?.name || 'payout_file'}
            />
        </>
    );
};

export default PayoutDiv;
