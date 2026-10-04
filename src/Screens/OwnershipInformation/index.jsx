import Heading from "../../Components/Heading"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomDatePicker from "../../Components/CustomDatePicker";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { baseURl } from "../../Config/systemConfig";
import { getRequestWithOutBody, postRequestWithFormData } from "../../Api/fetch";
import { uploadPublicApplicationFile } from "../../features/applications/api/applicationPublicApi";
import Loader from "../../Components/Loader";
import dayjs from "dayjs";
import { usStates } from "../../types/Data";
import { isGuestSession } from "../../Utils/applicationNavigation";

// Owner section of the Information step (rendered by ApplicationInformation).
const OwnershipInformation = forwardRef(({ getLegalInfo }, ref) => {
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
            || location.state?.secondStep?.applicationId,
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
                || location.state?.secondStep?.applicationId,
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

    const [merchantFirstName, setmerchantFirstName] = useState("")
    const [merchantLastName, setmerchantLastName] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [formDate, setFormDate] = useState("")
    const [address, setAddress] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [state, setState] = useState("")
    const [city, setCity] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [ssNo, setSsNo] = useState("")
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedFileName, setUploadedFileName] = useState(null); // New state for uploaded file name
    const [sameAsBusiness, setSameAsBusiness] = useState(false);
    const [fetchedData, setFetchedData] = useState(null); // New state variable

    const handleSameDetailsClick = () => {
        const newValue = !sameAsBusiness;
        setSameAsBusiness(newValue);
      
        if (newValue) {
          // Checkbox is checked → copy legal details. The business section on the same
          // page is the live source; fall back to the saved application for blanks.
          const legalInfo = getLegalInfo?.() || {};
          setAddress(legalInfo.legalAddress || fetchedData?.legalAddress || "");
          setState(legalInfo.legalState || fetchedData?.legalState || "");
          setCity(legalInfo.legalCity || fetchedData?.legalCity || "");
          setZipCode(legalInfo.legalZipCode || fetchedData?.legalZipCode || "");
          setPhoneNumber(legalInfo.contactNumber || fetchedData?.contactNumber || "");
          setEmail(legalInfo.email || fetchedData?.email || "");
        } else {
          // Checkbox is unchecked → clear fields for manual entry
          setAddress("");
          setState("");
          setCity("");
          setZipCode("");
          setPhoneNumber("");
          setEmail("");
        }
      };
      

    const handleFileUpload = (file) => {
        setUploadedFile(file);
    };

    const fetchData = () => {
        if (isGuest) {
            // No public equivalent of `GET application/:id` is documented yet, so a
            // guest landing directly on this step (e.g. via the resume link) starts blank.
            setLoading(false);
            return;
        }
        setLoading(true); // Set loading state before fetching
        const applicationId =
            location.state?.applicationId
            || location.state?.secondStep?.applicationId
            || applicationIds[0];
        getRequestWithOutBody(
            `${baseURl}application/${applicationId}`, accessToken
        )
            .then(result => {
                const appData = result?.data || {};
                const source = location.state?.isDuplicate ? location.state?.duplicateFrom : null;
                const pick = (key) => (appData?.[key] != null && appData?.[key] !== "" ? appData[key] : source?.[key]);

                setFetchedData(source ? { ...source, ...appData } : appData);
                setFirstName(pick("ownerFirstName") || "");
                setLastName(pick("ownerLastName") || "");
                setFormDate(pick("date") || "");
                setAddress(pick("residentialAddress") || "");
                setState(pick("ownerShipState") || "");
                setCity(pick("ownerShipCity") || "");
                setSsNo(pick("socialSecurityNumber") || "");
                setZipCode(pick("ownerShipZip") || "");
                setEmail(pick("ownerEmail") || "");
                setPhoneNumber(pick("ownerPhoneNumber") || "");
                setUploadedFileName(pick("dLFileUrl") || null);
                setLoading(false)
            })
            .catch(error => {
                const source = location.state?.isDuplicate ? location.state?.duplicateFrom : null;
                if (source) {
                    setFetchedData(source);
                    setFirstName(source.ownerFirstName || "");
                    setLastName(source.ownerLastName || "");
                    setFormDate(source.date || "");
                    setAddress(source.residentialAddress || "");
                    setState(source.ownerShipState || "");
                    setCity(source.ownerShipCity || "");
                    setSsNo(source.socialSecurityNumber || "");
                    setZipCode(source.ownerShipZip || "");
                    setEmail(source.ownerEmail || "");
                    setPhoneNumber(source.ownerPhoneNumber || "");
                    setUploadedFileName(source.dLFileUrl || null);
                }
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchData()
    }, [])
    const handleMerchantFirstNameChange = (e) => {
        setmerchantFirstName(e.target.value);
    };
    const handleMerchantLastNameChange = (e) => {
        setmerchantLastName(e.target.value);
    };
    const handleFirstNameChange = (e) => {
        setFirstName(e.target.value);
    };
    const handleLastNameChange = (e) => {
        setLastName(e.target.value);
    };
    const handleMemoDateChange = (date) => {
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        setFormDate(formattedDate);
    };
    const handleBusinessNameChange = (e) => {
        setBusinessName(e.target.value);
    };
    const handleAddressChange = (e) => {
        setAddress(e.target.value);
    };
    const handleStateChange = (selectedState) => {
        setState(selectedState);
    };
    const handlePhoneNumberChange = (e) => {
        setPhoneNumber(e.target.value);
    };
    const handleCityChange = (e) => {
        setCity(e.target.value);
    };
    const handleZipCodeChange = async (e) => {
        let value = e.target.value;

        // Allow only numbers + optional dash
        value = value.replace(/[^0-9-]/g, '');

        // ZIP regex (5 or ZIP+4)
        const zipRegex = /^\d{5}(?:-\d{4})?$/;

        if (zipRegex.test(value)) {
            try {
                const res = await fetch(`https://api.zippopotam.us/us/${value.slice(0, 5)}`);
                if (res.ok) {
                    const data = await res.json();
                    const place = data.places?.[0];
                    if (place) {
                        setCity(place["place name"]);
                        setState(place["state abbreviation"]);
                    }
                }
            } catch (err) {
            }
        }

        setZipCode(value);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };
    const handleSsNoChange = (e) => {
        let value = e.target.value.replace(/\D/g, ""); // remove non-digits
        if (value.length > 9) value = value.slice(0, 9);

        // Format as XXX-XX-XXXX
        if (value.length > 5) {
            value = value.replace(/(\d{3})(\d{2})(\d+)/, "$1-$2-$3");
        } else if (value.length > 3) {
            value = value.replace(/(\d{3})(\d+)/, "$1-$2");
        }

        setSsNo(value);
    };

    const isFieldEmpty = (value) =>
        value === null || value === undefined || (typeof value === "string" && value.trim() === "");

    const getPhoneDigits = (value) => (value || "").replace(/\D/g, "");
    const getSsDigits = (value) => (value || "").replace(/\D/g, "");

    const hasUploadedDlFile = () =>
        (uploadedFile && Array.isArray(uploadedFile) && uploadedFile.length > 0) ||
        (uploadedFileName && Array.isArray(uploadedFileName) && uploadedFileName.length > 0);

    const validateOwnershipInformation = () => {
        const missing = [];
        const addIfEmpty = (value, label) => {
            if (isFieldEmpty(value) && !missing.includes(label)) missing.push(label);
        };

        addIfEmpty(firstName, "Owner First Name");
        addIfEmpty(lastName, "Owner Last Name");
        addIfEmpty(formDate, "Date of Birth");
        addIfEmpty(address, "Residential Address");
        addIfEmpty(zipCode, "Zip Code");
        addIfEmpty(city, "City");
        addIfEmpty(state, "State");
        addIfEmpty(email, "Email");

        if (getSsDigits(ssNo).length < 9) {
            missing.push("Social Security Number");
        }

        if (getPhoneDigits(phoneNumber).length < 10) {
            missing.push("Owner Phone Number");
        }

        if (!hasUploadedDlFile()) {
            missing.push("Upload DL/ID");
        }

        if (missing.length > 0) {
            toast.error(`Please fill: ${missing.join(", ")}`);
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid Email");
            return false;
        }

        const year = dayjs(formDate).year();
        if (year < 1900 || year > 2100) {
            toast.error("Please select a valid Date of Birth");
            return false;
        }

        return true;
    };

    // Uploads any newly picked DL files, then returns this section's fields for the Information save.
    const buildPayload = async () => {
        const formattedDate = new Date(formDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        let uploadedFiles = [];

        if (uploadedFile && Array.isArray(uploadedFile)) {
            for (const file of uploadedFile) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("type", 'applications');

                const result1 = isGuest
                    ? await uploadPublicApplicationFile(formData, tenantSlug)
                    : await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                uploadedFiles.push({
                    url: result1?.data?.dLFileUrl?.url,
                    name: file?.name,
                });
            }
        }

        const apiDataRaw = {
            "merchantFirstName": firstName,
            "merchantLastName": lastName,
            "ownerFirstName": firstName,
            "ownerLastName": lastName,
            "date": formattedDate,
            "residentialAddress": address,
            "ownerShipState": state,
            "ownerShipCity": city,
            "ownerShipZip": zipCode,
            "socialSecurityNumber": ssNo,
            "ownerEmail": email,
            "ownerPhoneNumber": phoneNumber,
            ...(uploadedFiles.length > 0 && { dLFileUrl: [...(uploadedFileName || []), ...uploadedFiles] }),
            ...(uploadedFiles.length === 0 && uploadedFileName && uploadedFileName.length > 0 && { dLFileUrl: [...uploadedFileName] }),
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
        validate: validateOwnershipInformation,
        buildPayload,
    }));

    const inputStyle = {
        width: '100%',
        height: '36px',
        borderRadius: '8px',
        border: '1px solid var(--dashboard-box-border)',
        backgroundColor: 'var(--dashboard-tab-box)',
        padding: '12px',
        fontSize: '14px',
        color: 'var(--dashboard-text-primary)',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease',
    };

    const handleFocus = (e) => {
        e.target.style.borderColor = 'var(--dashboard-tab-active)';
    };

    const handleBlur = (e) => {
        e.target.style.borderColor = 'var(--dashboard-box-border)';
    };

    const CloudUploadSVG = () => (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--dashboard-tab-active)" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '8px' }}>
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
        </svg>
    );

    const triggerFileInput = () => {
        document.getElementById('dl-file-upload').click();
    };

    const handleFileChangeLocal = (e) => {
        const filesList = Array.from(e.target.files);
        if (filesList.length > 0) {
            setUploadedFile(filesList);
            handleFileUpload(filesList);
        }
    };

    const handleDropLocal = (e) => {
        e.preventDefault();
        const filesList = Array.from(e.dataTransfer.files);
        if (filesList.length > 0) {
            setUploadedFile(filesList);
            handleFileUpload(filesList);
        }
    };

    const renderRow = (label, required, content) => (
        <div className="flex items-center gap-x-6 flex-wrap">
            <div className="w-48">
                <Heading
                    Fontweight={500}
                    color={'var(--sidebar-text-primary)'}
                    Heading={label}
                    Fontsize={16}
                    required={required}
                />
            </div>
            <div className="w-44 sm:w-80">
                {content}
            </div>
        </div>
    );

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
                Heading={'Owner Details :'}
                Fontsize={20}
                mt={10}
            />

            <div className="flex flex-col gap-2">
                {renderRow("Owner Name", true, (
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={handleFirstNameChange}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={handleLastNameChange}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                    </div>
                ))}

                {renderRow("Date Of Birth", true, (
                    <div style={{ width: '100%' }}>
                        <CustomDatePicker
                            value={formDate}
                            onChange={handleMemoDateChange}
                            bussiness={true}
                        />
                    </div>
                ))}

                {/* Same As Business Checkbox */}
                <div className="flex items-center gap-x-6 flex-wrap mt-2 mb-1">
                    <div className="w-48 hidden sm:block" />
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            id="ownerSameAsLegal"
                            type="checkbox"
                            checked={sameAsBusiness}
                            onChange={handleSameDetailsClick}
                            style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }}
                        />
                        <label htmlFor="ownerSameAsLegal" style={{ fontSize: '13px', color: 'var(--dashboard-text-secondary)', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: '500' }}>
                            Owner Information is the same as Legal Information
                        </label>
                    </div>
                </div>

                {renderRow("Residential Address", true, (
                    <input
                        type="text"
                        placeholder="e.g 12345"
                        value={address}
                        onChange={handleAddressChange}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                ))}

                {renderRow("Zip Code", true, (
                    <div style={{ width: '100%' }}>
                        <input
                            type="text"
                            placeholder="e.g. 12345"
                            value={zipCode}
                            onChange={handleZipCodeChange}
                            style={inputStyle}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--dashboard-text-secondary)', marginTop: '4px', display: 'block', fontFamily: 'Nunito, sans-serif' }}>
                            Enter ZIP code to auto-fill City and State
                        </span>
                    </div>
                ))}

                {renderRow("City", true, (
                    <input
                        type="text"
                        placeholder="enter city"
                        value={city}
                        onChange={handleCityChange}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                ))}

                {renderRow("State", true, (
                    <div style={{ width: '100%' }}>
                        <DropdownMenu
                            menuItems={usStates}
                            business={true}
                            defaultText={"-- select state --"}
                            onSelect={handleStateChange}
                            selectedValue={state}
                        />
                    </div>
                ))}

                {renderRow("Phone Number", true, (
                    <input
                        type="text"
                        placeholder="(123) 456-7890"
                        value={phoneNumber}
                        onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 10) val = val.substring(0, 10);
                            if (val.length > 6) {
                                val = `(${val.substring(0, 3)}) ${val.substring(3, 6)}-${val.substring(6)}`;
                            } else if (val.length > 3) {
                                val = `(${val.substring(0, 3)}) ${val.substring(3)}`;
                            } else if (val.length > 0) {
                                val = `(${val}`;
                            }
                            handlePhoneNumberChange({ target: { value: val } });
                        }}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                ))}

                {renderRow("Email", true, (
                    <input
                        type="text"
                        placeholder="e.g business@gmail.com"
                        value={email}
                        onChange={handleEmailChange}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                ))}

                {renderRow("Social Security No", true, (
                    <input
                        type="text"
                        placeholder="e.g 123-45-6789"
                        value={ssNo}
                        onChange={handleSsNoChange}
                        style={inputStyle}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                    />
                ))}

                {renderRow("DL File", true, (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div
                            onDrop={handleDropLocal}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={triggerFileInput}
                            style={{
                                width: '100%',
                                minHeight: '130px',
                                borderRadius: '8px',
                                border: '1.5px dashed var(--dashboard-box-border)',
                                backgroundColor: 'var(--dashboard-tab-box)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: '20px',
                                transition: 'all 0.2s ease',
                                boxSizing: 'border-box',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--dashboard-card-bg2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--dashboard-tab-box)'; }}
                        >
                            <input
                                type="file"
                                id="dl-file-upload"
                                onChange={handleFileChangeLocal}
                                style={{ display: 'none' }}
                                multiple
                            />
                            <CloudUploadSVG />
                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: '700', color: 'var(--dashboard-text-primary)', marginTop: '8px' }}>
                                Upload File
                            </span>
                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: 'var(--dashboard-text-secondary)', marginTop: '4px' }}>
                                Click to browse or drag and drop
                            </span>
                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '10px', color: 'var(--dashboard-text-secondary)', marginTop: '2px' }}>
                                PNG, JPG up to 10MB
                            </span>
                        </div>

                        {/* Display uploaded files */}
                        {((uploadedFile && uploadedFile.length > 0) || (uploadedFileName && uploadedFileName.length > 0)) && (
                            <div style={{ marginTop: '12px', width: '100%' }}>
                                {uploadedFile && Array.from(uploadedFile).map((file, idx) => (
                                    <div key={`local-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--dashboard-card-bg2)', borderRadius: '6px', marginBottom: '6px', fontSize: '12px', color: 'var(--dashboard-text-primary)' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>{file.name}</span>
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newFiles = [...uploadedFile];
                                                newFiles.splice(idx, 1);
                                                setUploadedFile(newFiles);
                                            }}
                                            style={{ color: '#EF4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: '0 4px' }}
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                                {uploadedFileName && Array.isArray(uploadedFileName) && uploadedFileName.map((file, idx) => (
                                    <div key={`remote-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--dashboard-card-bg2)', borderRadius: '6px', marginBottom: '6px', fontSize: '12px', color: 'var(--dashboard-text-primary)' }}>
                                        <span 
                                            onClick={() => window.open(file.url, '_blank')}
                                            style={{ color: 'var(--dashboard-tab-active)', cursor: 'pointer', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}
                                        >
                                            {file.originalname || file.name || "DL_File"}
                                        </span>
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newFiles = [...uploadedFileName];
                                                newFiles.splice(idx, 1);
                                                setUploadedFileName(newFiles);
                                            }}
                                            style={{ color: '#EF4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: '0 4px' }}
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

            </div>

        </>
    );
});

export default OwnershipInformation;
