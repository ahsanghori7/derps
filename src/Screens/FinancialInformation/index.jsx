import Heading from "../../Components/Heading"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import LabeledInput from "../../Components/LabeledInput";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getRequestWithOutBody, postRequestWithFormData } from "../../Api/fetch";
import { uploadPublicApplicationFile } from "../../features/applications/api/applicationPublicApi";
import { baseURl } from "../../Config/systemConfig";
import Loader from "../../Components/Loader";
import UploadFile from "../../Components/UploadFile";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { isGuestSession } from "../../Utils/applicationNavigation";

// Bank / volume section of the Information step (rendered by ApplicationInformation).
const FinancialInformation = forwardRef((props, ref) => {
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;

    const applicationIds = (() => {
        if (location.state?.applicationIds?.length) return location.state.applicationIds;
        const fromApps = (location.state?.applications || [])
            .map((app) => app.applicationId || app.id)
            .filter(Boolean);
        if (fromApps.length) return fromApps;
        return [
            location.state?.applicationId
            || location.state?.thirdStep?.applicationId,
        ].filter(Boolean);
    })();

    const getApplicationPayloadFields = () => {
        if (applicationIds.length > 1) {
            return { applicationIds };
        }
        return {
            applicationId:
                applicationIds[0]
                || location.state?.applicationId
                || location.state?.thirdStep?.applicationId,
        };
    };

    const removeEmptyFields = (obj) => {
        return Object.fromEntries(
            Object.entries(obj).filter(([, value]) => {
                if (value === null || value === undefined) return false;
                if (typeof value === "string" && value.trim() === "") return false;
                if (Array.isArray(value) && value.length === 0) return false;
                return true;
            })
        );
    };

    const [taxCode, settaxCode] = useState("")
    const [comments, setComments] = useState("")
    const [bankName, setBankName] = useState("")
    const [accountNo, setAccountNo] = useState("")
    const [routingNo, setRoutingNo] = useState("")
    const [loading, setLoading] = useState(false);
    const [averageSale, setAverageSale] = useState("");
    const [maxSale, setMaxSale] = useState("");
    const [monthlySale, setMonthlySale] = useState("");
    const [fetchedData, setFetchedData] = useState(null); // New state variable
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedFileName, setUploadedFileName] = useState(null);
    const [showAccountNo, setShowAccountNo] = useState(false);
    const [showRoutingNo, setShowRoutingNo] = useState(false);
    const [showTaxCode, setShowTaxCode] = useState(false);

    const fetchData = () => {
        if (isGuest) {
            // No public equivalent of `GET application/:id` is documented yet, so a
            // guest landing directly on this step (e.g. via the resume link) starts blank.
            setLoading(false);
            return;
        }
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        const applicationId =
            location.state?.applicationId
            || location.state?.thirdStep?.applicationId
            || applicationIds[0];
        getRequestWithOutBody(
            `${baseURl}application/${applicationId}`, accessToken
        )
            .then(result => {
                const appData = result?.data || {};
                const source = location.state?.isDuplicate ? location.state?.duplicateFrom : null;
                const pick = (key) => (appData?.[key] != null && appData?.[key] !== "" ? appData[key] : source?.[key]);

                setBankName(pick("bankName") || "");
                setAccountNo(pick("accountNumber") || "");
                setRoutingNo(pick("routingNumber") || "");
                settaxCode(pick("taxCode") || "");
                setComments(pick("comment") || "");
                setAverageSale(pick("averageSale") || "");
                setMaxSale(pick("maxSale") || "");
                setMonthlySale(pick("monthlySale") || "");
                setFetchedData(source ? { ...source, ...appData } : appData);
                setUploadedFileName(pick("bankLetterFileUrl") || null);
                setLoading(false)
            })
            .catch(error => {
                const source = location.state?.isDuplicate ? location.state?.duplicateFrom : null;
                if (source) {
                    setBankName(source.bankName || "");
                    setAccountNo(source.accountNumber || "");
                    setRoutingNo(source.routingNumber || "");
                    settaxCode(source.taxCode || "");
                    setComments(source.comment || "");
                    setAverageSale(source.averageSale || "");
                    setMaxSale(source.maxSale || "");
                    setMonthlySale(source.monthlySale || "");
                    setFetchedData(source);
                    setUploadedFileName(source.bankLetterFileUrl || null);
                }
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
    }, [])
    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };

    const handleBankNameChange = (e) => {
        setBankName(e.target.value);
    };
    const handleAccountNoChange = (e) => {
        setAccountNo(e.target.value);
    };
    const handleRoutingNoChange = (value) => {
        setRoutingNo(value);
    };
    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };
    const handleTaxCodeChange = (e) => {
        settaxCode(e.target.value);
    };

    const saleFieldSolutions = ['ebt', 'cash-advance', 'credit-card', 'pos', 'ach-processing'];

    const resolvedSolutions = useMemo(() => {
        const fromApplications = (location.state?.applications || [])
            .map((app) => (app?.solution || "").toLowerCase())
            .filter(Boolean);
        const fetchedSolution = (fetchedData?.solution || "").toLowerCase();
        const combined = fetchedSolution ? [...fromApplications, fetchedSolution] : fromApplications;
        return Array.from(new Set(combined));
    }, [location.state?.applications, fetchedData?.solution]);

    const requiresSaleFields = () =>
        resolvedSolutions.some((solution) => saleFieldSolutions.includes(solution));

    const isFieldEmpty = (value) =>
        value === null || value === undefined || (typeof value === "string" && value.trim() === "");

    const hasUploadedBankLetter = () =>
        (uploadedFile && Array.isArray(uploadedFile) && uploadedFile.length > 0) ||
        (uploadedFileName && Array.isArray(uploadedFileName) && uploadedFileName.length > 0);

    const validateFinancialInformation = () => {
        const missing = [];
        const addIfEmpty = (value, label) => {
            if (isFieldEmpty(value) && !missing.includes(label)) missing.push(label);
        };

        addIfEmpty(accountNo, "Account Number");
        addIfEmpty(routingNo, "Routing Number");

        if (requiresSaleFields()) {
            addIfEmpty(averageSale, "Average Sale");
            addIfEmpty(maxSale, "Max Sale");
            addIfEmpty(monthlySale, "Monthly Sale");
        }

        if (!hasUploadedBankLetter()) {
            missing.push("Upload Void Check or Bank Letter");
        }

        if (missing.length > 0) {
            toast.error(`Please fill: ${missing.join(", ")}`);
            return false;
        }

        // if ((routingNo || "").replace(/\D/g, "").length !== 9) {
        //     toast.error("Routing Number must be 9 digits");
        //     return false;
        // }

        return true;
    };

    // Uploads any newly picked bank letters, then returns this section's fields for the Information save.
    const buildPayload = async () => {
        let uploadedFiles = [];
        if (uploadedFile && Array.isArray(uploadedFile)) { // Check if uploadedFile is an array
            for (const file of uploadedFile) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("type", 'application-bank-letter');

                const result1 = isGuest
                    ? await uploadPublicApplicationFile(formData, tenantSlug)
                    : await postRequestWithFormData(`${baseURl}files`, accessToken, formData);

                uploadedFiles.push({
                    url: result1?.data?.bankLetterFileUrl?.url,
                    mimetype: result1?.data?.bankLetterFileUrl?.mimetype,
                    originalname: result1?.data?.bankLetterFileUrl?.originalname,
                });
            }
        }
        const apiDataRaw = {
            "bankName": bankName,
            "accountNumber": accountNo,
            "routingNumber": routingNo,
            "taxCode": taxCode,
            "comment": comments,
            "averageSale": averageSale,
            "maxSale": maxSale,
            "monthlySale": monthlySale,
            ...(uploadedFiles.length > 0 && { bankLetterFileUrl: [...(uploadedFileName || []), ...uploadedFiles] }), // Ensure uploadedFileName is an array
            ...getApplicationPayloadFields(),
            ...(isGuest ? { tenantSlug } : { agentId: userData?.id }),
        };

        // Files are uploaded now; keep them as saved entries so a later save doesn't upload them again.
        if (uploadedFiles.length > 0) {
            setUploadedFileName([...(uploadedFileName || []), ...uploadedFiles]);
            setUploadedFile(null);
        }

        return removeEmptyFields(apiDataRaw);
    };

    useImperativeHandle(ref, () => ({
        validate: validateFinancialInformation,
        buildPayload,
    }));

    if (loading) {
        return (
            <div className="text-center w-full mx-auto my-20">
                <Loader message="Loading..." subMessage="Please wait" />
            </div>
        );
    }

    return (
        <>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Financial Information'}
                Fontsize={20}
                mt={10}
            />
            <div className="flex flex-col gap-2 ">
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Bank Name'}
                            Fontsize={16}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Bank Name"
                        inputValue={bankName}
                        onInputChange={handleBankNameChange}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Account Number'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Account Number"
                        inputValue={accountNo}
                        onInputChange={handleAccountNoChange}
                        bussiness={true}
                        inputType={showAccountNo ? "text" : "password"}
                        rightIcon={ // 👁️ Add eye button
                            <button
                                type="button"
                                onClick={() => setShowAccountNo((prev) => !prev)}
                                className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text-primary)]"
                            >
                                {showAccountNo ? <FaRegEyeSlash /> : <FaRegEye />}
                            </button>
                        }
                    />

                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Routing Number'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="_________"
                        inputValue={routingNo}
                        onInputChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 9) {
                                handleRoutingNoChange(value);
                            }
                        }}
                        bussiness={true}
                        inputType={showRoutingNo ? "text" : "password"}
                        maxLength={9}
                        rightIcon={
                            <button
                                type="button"
                                onClick={() => setShowRoutingNo((prev) => !prev)}
                                className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text-primary)]"
                            >
                                {showRoutingNo ? <FaRegEyeSlash /> : <FaRegEye />}
                            </button>
                        }
                    />


                </div>
            </div>
            <div className="flex items-start gap-x-6 flex-wrap">
                <div className="w-48">
                    <Heading
                        Fontweight={500}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Upload your Void Check or Bank Letter'}
                        Fontsize={16}
                        required={true}
                        mt={8}
                    />
                </div>
                <div>
                    <div style={{ backgroundColor: 'var(--dashboard-tab-box)', border: '1px solid var(--dashboard-box-border)', borderRadius: 7, width: 290, }} className="min-h-20 mt-4 pt-3 flex flex-col items-center">
                        <UploadFile onFileChange={handleFileUpload} />
                    </div>
                    {uploadedFileName && uploadedFileName.length > 0 && (
                        <div>
                            {uploadedFileName.map((file, index) => (
                                <div
                                    key={index}
                                    onClick={() => window.open(file.url, '_blank')} // Open the respective file URL
                                    className="px-4 cursor-pointer mt-1"
                                    style={{
                                        // border: '1px solid var(--sidebar-selected-bg)',
                                        fontSize: 14,
                                        borderRadius: 9,
                                        backgroundColor: 'var(--dashboard-tab-box)',
                                        paddingTop: 1,
                                        paddingBottom: 1,
                                        width: '70%',
                                        // color: 'blue' // Set text color to blue
                                    }}
                                >
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--dashboard-tab-active)'}
                                        Heading={file.originalname} // Display the original name of the file
                                        Fontsize={16}
                                        mb={4}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Tax Exempt Code (if applicable)'}
                            Fontsize={16}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Tax Exempt Code (if applicable)"
                        inputValue={taxCode}
                        onInputChange={handleTaxCodeChange}
                        bussiness={true}
                        inputType={showTaxCode ? "text" : "password"}
                        rightIcon={
                            <button
                                type="button"
                                onClick={() => setShowTaxCode((prev) => !prev)}
                                className="text-[var(--dashboard-text-secondary)] hover:text-[var(--dashboard-text-primary)]"
                            >
                                {showTaxCode ? <FaRegEyeSlash /> : <FaRegEye />}
                            </button>
                        }
                    />

                </div>
            </div>
            {requiresSaleFields() && (
                <>
                    <div className="flex flex-col gap-4 mt-2">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'Average Sale'}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Average Sale"
                                inputValue={averageSale}
                                onInputChange={(e) => {
                                    let value = e.target.value;

                                    // Remove non-numeric except dot
                                    value = value.replace(/[^0-9.]/g, '');

                                    // Prevent multiple decimals
                                    const parts = value.split('.');
                                    if (parts.length > 2) {
                                        value = parts[0] + '.' + parts[1];
                                    }

                                    // Limit to 2 decimal places
                                    if (parts[1]?.length > 2) {
                                        value = parts[0] + '.' + parts[1].slice(0, 2);
                                    }

                                    setAverageSale(value);
                                }}
                                showDollar={true}
                                bussiness={true}
                            />

                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'Max Sale'}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Max Sale"
                                inputValue={maxSale}
                                onInputChange={(e) => {
                                    let value = e.target.value;

                                    // Remove non-numeric except dot
                                    value = value.replace(/[^0-9.]/g, '');

                                    // Prevent multiple decimals
                                    const parts = value.split('.');
                                    if (parts.length > 2) {
                                        value = parts[0] + '.' + parts[1];
                                    }

                                    // Limit to 2 decimal places
                                    if (parts[1]?.length > 2) {
                                        value = parts[0] + '.' + parts[1].slice(0, 2);
                                    }

                                    setMaxSale(value);
                                }}
                                showDollar={true}
                                bussiness={true}
                            />
                        </div>
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={'Monthly Sale'}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Monthly Sale"
                                inputValue={monthlySale}
                                showDollar={true}
                                onInputChange={(e) => {
                                    let value = e.target.value;

                                    // Remove non-numeric except dot
                                    value = value.replace(/[^0-9.]/g, '');

                                    // Prevent multiple decimals
                                    const parts = value.split('.');
                                    if (parts.length > 2) {
                                        value = parts[0] + '.' + parts[1];
                                    }

                                    // Limit to 2 decimal places
                                    if (parts[1]?.length > 2) {
                                        value = parts[0] + '.' + parts[1].slice(0, 2);
                                    }

                                    setMonthlySale(value);
                                }}
                                bussiness={true}
                            />
                        </div>
                    </div>
                </>
            )}
            <div className="flex items-center gap-x-6 mt-3 flex-wrap">
                <div className="w-48">
                    <Heading
                        Fontweight={500}
                        color={'var(--sidebar-text-primary)'}
                        Heading={'Comments'}
                        Fontsize={16}
                    // required={true}
                    />
                </div>
                <LabeledInput
                    inputPlaceholder="Comments"
                    inputValue={comments}
                    onInputChange={handleCommentsChange}
                    addressSmall={true}
                />
            </div>
        </>
    );
});

export default FinancialInformation;
