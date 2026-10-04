import Heading from "../../Components/Heading"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import LabeledInput from "../../Components/LabeledInput";
import DropdownMenu from "../../Components/dropdownMenu";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { getRequestWithOutBody, getRequestWithOutBodyCached } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useSelector } from "react-redux";
import Loader from "../../Components/Loader";
import { usStates, businessTypedata, taxTypeData, ownershipTypeData } from "../../types/Data";
import ShowTaxInfoModal from "../../Components/ShowTaxInfoModal";
import { taxFormats } from "../../Utils/helper";
import CustomDatePicker from "../../Components/CustomDatePicker";
import dayjs from "dayjs";
import { isGuestSession } from "../../Utils/applicationNavigation";

// Business / legal section of the Information step (rendered by ApplicationInformation).
const BusinessInformation = forwardRef((props, ref) => {
    const location = useLocation();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);

    const isAdmin = (userData?.roleTitle || '').toLowerCase() === 'admin' || (userData?.roleTitle || '').toLowerCase() === 'human resource';
    const isGuest = isGuestSession(location);
    const tenantSlug = location.state?.tenantSlug || null;
    const applicationIds = (() => {
        if (location.state?.applicationIds?.length) return location.state.applicationIds;
        const fromApps = (location.state?.applications || [])
            .map((app) => app.applicationId || app.id)
            .filter(Boolean);
        if (fromApps.length) return fromApps;
        return [location.state?.applicationId].filter(Boolean);
    })();

    const selectedSolutions = location.state?.firstStep?.solutions
        || (location.state?.applications || []).map((app) => app.solution).filter(Boolean);

    const getApplicationPayloadFields = () => {
        if (applicationIds.length > 1) {
            return { applicationIds };
        }
        return { applicationId: applicationIds[0] || location.state?.applicationId };
    };

    const removeEmptyFields = (obj) => {
        return Object.fromEntries(
            Object.entries(obj).filter(([, value]) => {
                if (value === null || value === undefined) return false;
                if (typeof value === "string" && value.trim() === "") return false;
                return true;
            })
        );
    };

    const [legalName, setLegalName] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [businessType, setBusinessType] = useState("")
    const [taxType, setTaxType] = useState("")
    const [email, setEmail] = useState("")
    const [address, setAddress] = useState("")
    const [state, setState] = useState("")
    const [city, setCity] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [fein, setFein] = useState("")

    const [merchantAddress, setMerchantAddress] = useState("")
    const [legalAddress, setLegalAddress] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false);
    const [dbaCity, setDbaCity] = useState("")
    const [dbaState, setDbaState] = useState("")
    const [dbaZipCode, setDbaZipCode] = useState("")
    const [phone, setPhone] = useState("")
    const [website, setWebsite] = useState("")
    const [ebtFnsNumber, setEbtFnsNumber] = useState("");
    const [fetchedData, setFetchedData] = useState(null); // New state variable
    const [sameAsBusiness, setSameAsBusiness] = useState(true);
    const [ownershipType, setOwnershipType] = useState("")
    const [businessStartDate, setBusinessStartDate] = useState(null)
    const [showTaxInfo, setShowTaxInfo] = useState(false);
    const [userList, setUserList] = useState([]);
    const [selectedAgentId, setSelectedAgentId] = useState('');

    const handleSameDetailsClick = () => {
        setBusinessName(legalName); // Set Legal Name
        setAddress(legalAddress); // Set Legal Address
        setDbaCity(city); // Set Legal City
        setDbaState(state); // Set Legal State
        setDbaZipCode(zipCode); // Set Legal Zip Code
        setContactNo(phone); // Set Legal Zip Code
    };
    const fetchData = () => {
        if (isGuest) {
            // No public equivalent of `GET application/:id` is documented yet, so a
            // guest landing directly on this step (e.g. via the resume link) starts blank.
            setLoading(false);
            return;
        }
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}application/${location.state?.applicationId || applicationIds[0]}`, accessToken
        )
            .then(result => {
                const appData = result?.data || {};
                const source = location.state?.isDuplicate ? location.state?.duplicateFrom : null;
                const pick = (key) => (appData?.[key] != null && appData?.[key] !== "" ? appData[key] : source?.[key]);

                setFetchedData(source ? { ...source, ...appData } : appData);
                setLegalName(pick("legalName") || "");
                setBusinessName(pick("businessName") || "");
                setBusinessType(pick("businessType") || "");
                setEmail(pick("email") || "");
                setAddress(pick("dbaAddress") || "");
                setState(pick("legalState") || "");
                setCity(pick("legalCity") || "");
                setZipCode(pick("legalZipCode") || "");
                setFein(pick("feinNumber") || "");
                setTaxType(pick("taxType") || "");
                setDescription(pick("productsDescription") || "");
                setOwnershipType(pick("ownerShipType") || "");
                setBusinessStartDate(pick("businessStartDate") || null);

                setLegalAddress(pick("legalAddress") || "");
                setDbaCity(pick("businessCity") || "");
                setDbaZipCode(pick("businessZipCode") || "");
                setDbaState(pick("businessState") || "");
                setPhone(pick("contactNumber") || "");
                setContactNo(pick("dbaPhoneNumber") || "");
                setWebsite(pick("website") || "");
                setEbtFnsNumber(pick("ebtFnsNumber") || "");
                setSelectedAgentId(
                    appData?.agentId
                    ?? appData?.agent?.id
                    ?? source?.agentId
                    ?? source?.agent?.id
                    ?? ""
                );
                setLoading(false)
            })
            .catch(error => {
                const source = location.state?.isDuplicate ? location.state?.duplicateFrom : null;
                if (source) {
                    setFetchedData(source);
                    setLegalName(source.legalName || "");
                    setBusinessName(source.businessName || "");
                    setBusinessType(source.businessType || "");
                    setEmail(source.email || "");
                    setAddress(source.dbaAddress || "");
                    setState(source.legalState || "");
                    setCity(source.legalCity || "");
                    setZipCode(source.legalZipCode || "");
                    setFein(source.feinNumber || "");
                    setTaxType(source.taxType || "");
                    setDescription(source.productsDescription || "");
                    setOwnershipType(source.ownerShipType || "");
                    setBusinessStartDate(source.businessStartDate || null);
                    setLegalAddress(source.legalAddress || "");
                    setDbaCity(source.businessCity || "");
                    setDbaZipCode(source.businessZipCode || "");
                    setDbaState(source.businessState || "");
                    setPhone(source.contactNumber || "");
                    setContactNo(source.dbaPhoneNumber || "");
                    setWebsite(source.website || "");
                    setEbtFnsNumber(source.ebtFnsNumber || "");
                    setSelectedAgentId(source.agentId ?? source.agent?.id ?? "");
                }
                setLoading(false)
            })
    }
    const fetchData2 = () => {
        // setLoading(true); // Set loading state before fetching
        getRequestWithOutBodyCached(
            `${baseURl}user`, accessToken
        )
            .then(result => {
                const activeUsers = result?.data?.results?.filter(user => user.status === "active") || [];
                setUserList(activeUsers);
                // setLoading(false)
            })
            .catch(error => {
                // setLoading(false)
            })
    }

    useEffect(() => {
        if (!isGuest) fetchData2() // agent list only needed for the admin "Select Agent" dropdown
        fetchData()
    }, [])

    const handleEbtFnsNumberChange = (e) => {
        setEbtFnsNumber(e.target.value);
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
    };
    const handleLegalAddressChange = (e) => {
        setLegalAddress(e.target.value);
    };
    const handleMerchantAddressChange = (e) => {
        setMerchantAddress(e.target.value);
    };
    const handleLastNameChange = (e) => {
        setLastName(e.target.value);
    };
    const handleFirstNameChange = (e) => {
        setFirstName(e.target.value);
    };
    const handleAgentCodeChange = (e) => {
        setLegalName(e.target.value);
    };
    const handleBusinessNameChange = (e) => {
        setBusinessName(e.target.value);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };
    const handleAddressChange = (e) => {
        setAddress(e.target.value);
    };
    const handleDbaCityChange = (e) => {
        setDbaCity(e.target.value);
    };
    const handleDbaStateChange = (selectedState) => {
        setDbaState(selectedState);
    };
    const handleDbaZipCodeChange = async (e) => {
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
                        setDbaCity(place["place name"]);
                        setDbaState(place["state abbreviation"]);
                    }
                }
            } catch (err) {
            }
        }

        setDbaZipCode(value);
    };
    const handleStateChange = (selectedState) => {
        setState(selectedState);
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
    const handleFeinChange = (e) => {
        let value = e.target.value;

        if (!taxType || !taxFormats[taxType]) {
            setFein(value);
            return;
        }

        const { regex, maxLength, format } = taxFormats[taxType];

        // Clean digits
        value = value.replace(regex, "");

        // Enforce max length
        if (value.length > maxLength) {
            value = value.slice(0, maxLength);
        }

        // Apply format
        value = format(value);

        setFein(value);
    };

    const handleWebsiteChange = (e) => {
        setWebsite(e.target.value);
    };
    const handlePhoneChange = (e) => {
        setPhone(e.target.value);
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };

    const handleBusinessTypeChange = (year) => {
        setBusinessType(year);
    };
    const handleTaxTypeChange = (year) => {
        setTaxType(year);
    };
    const handleOwnershipTypeChange = (year) => {
        setOwnershipType(year);
    };

    const isFieldEmpty = (value) =>
        value === null || value === undefined || (typeof value === "string" && value.trim() === "");

    const getPhoneDigits = (value) => (value || "").replace(/\D/g, "");

    const validateBusinessInformation = () => {
        const missing = [];
        const addIfEmpty = (value, label) => {
            if (isFieldEmpty(value) && !missing.includes(label)) missing.push(label);
        };

        addIfEmpty(legalName, "Legal Business Name");
        addIfEmpty(legalAddress, "Legal Address");
        addIfEmpty(zipCode, "Legal Zip Code");
        addIfEmpty(city, "Legal City");
        addIfEmpty(state, "Legal State");

        if (getPhoneDigits(phone).length < 10) {
            missing.push("Legal Phone Number");
        }

        const requiresEbtFns = selectedSolutions.includes("ebt") || fetchedData?.solution === "ebt";
        if (requiresEbtFns) {
            addIfEmpty(ebtFnsNumber, "EBT FNS Number");
        }

        if (!sameAsBusiness) {
            addIfEmpty(businessName, "Business Name (DBA)");
            addIfEmpty(address, "DBA Address");
            addIfEmpty(dbaZipCode, "DBA Zip Code");
            addIfEmpty(dbaCity, "DBA City");
            addIfEmpty(dbaState, "DBA State");
            if (getPhoneDigits(contactNo).length < 10) {
                missing.push("DBA Phone Number");
            }
        }

        addIfEmpty(taxType, "Type of Tax ID");
        addIfEmpty(fein, "Tax ID");
        addIfEmpty(ownershipType, "Ownership Type");
        addIfEmpty(businessType, "Business Type");
        addIfEmpty(email, "DBA Email");
        addIfEmpty(description, "Description of products / services sold");

        if (isAdmin && !selectedAgentId) {
            missing.push("Select Agent");
        }

        if (missing.length > 0) {
            toast.error(`Please fill: ${missing.join(", ")}`);
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid DBA Email");
            return false;
        }

        return true;
    };

    const buildPayload = () => {
        // Merge legal info (if same as business)
        const finalbusinessName = sameAsBusiness ? legalName : businessName;
        const finalAddress = sameAsBusiness ? legalAddress : address;
        const finalDbaCity = sameAsBusiness ? city : dbaCity;
        const finalDbaState = sameAsBusiness ? state : dbaState;
        const finalDbaZipCode = sameAsBusiness ? zipCode : dbaZipCode;
        const finalPhone = sameAsBusiness ? phone : contactNo;

        const apiDataRaw = {
            "legalName": legalName,
            "businessName": finalbusinessName,
            "businessType": businessType,
            "email": email,
            "dbaAddress": finalAddress,
            "businessState": finalDbaState,
            "businessCity": finalDbaCity,
            "businessZipCode": finalDbaZipCode,
            "taxType": taxType,
            "feinNumber": fein,
            "productsDescription": description,
            "legalAddress": legalAddress,
            "legalState": state,
            "legalCity": city,
            "ownerShipType": ownershipType,
            "businessStartDate": businessStartDate ? dayjs(businessStartDate).format("MM/DD/YYYY") : null,
            "legalZipCode": zipCode,
            "dbaPhoneNumber": finalPhone,
            "contactNumber": phone,
            "website": website,
            ...(isGuest ? { tenantSlug } : { agentId: isAdmin ? selectedAgentId : userData?.id, source: isAdmin ? 'manual' : 'agent-portal' }),
            ...getApplicationPayloadFields(),
            "ebtFnsNumber": ebtFnsNumber,
        };
        return removeEmptyFields(apiDataRaw);
    };

    useImperativeHandle(ref, () => ({
        validate: validateBusinessInformation,
        buildPayload,
        // Live legal values for the owner section's "same as Legal Information" checkbox.
        getLegalInfo: () => ({
            legalAddress,
            legalState: state,
            legalCity: city,
            legalZipCode: zipCode,
            contactNumber: phone,
            email,
        }),
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
                Heading={'Legal Information'}
                Fontsize={20}
                mt={10}
            />
            <div className="flex flex-col gap-2 ">
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Legal Business Name'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Type legal business name"
                        inputValue={legalName}
                        onInputChange={handleAgentCodeChange}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Legal Address'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Type Legal Address"
                        inputValue={legalAddress}
                        onInputChange={handleLegalAddressChange}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Legal Zip Code'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <div>
                        <LabeledInput
                            inputPlaceholder="e.g. 12345 or 12345-6789"
                            inputValue={zipCode}
                            onInputChange={handleZipCodeChange}
                            inputType="text"
                            bussiness={true}
                        />
                        <p className="text-sm text-[var(--dashboard-text-secondary)] mt-1">
                            Enter ZIP code to auto-fill City and State
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Legal City'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Type Legal City"
                        inputValue={city}
                        onInputChange={handleCityChange}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Legal State'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>

                    <DropdownMenu
                        menuItems={usStates}
                        business={true}
                        defaultText={"Select State"}
                        onSelect={(val) => setState(val)}
                        selectedValue={state}
                    />
                </div>

                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Legal Phone Number'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="(123) 456-7890"
                        inputValue={phone}
                        onInputChange={(e) => {
                            let value = e.target.value;

                            // Remove all non-numeric characters
                            value = value.replace(/\D/g, '');

                            // Limit to 10 digits
                            if (value.length > 10) {
                                value = value.substring(0, 10);
                            }

                            // Apply formatting
                            if (value.length > 6) {
                                value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
                            } else if (value.length > 3) {
                                value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
                            } else if (value.length > 0) {
                                value = `(${value}`;
                            }

                            handlePhoneChange({ target: { value } });
                        }}
                        bussiness={true}
                    />
                </div>

                {(selectedSolutions.includes('ebt') || fetchedData?.solution === 'ebt') && (
                    <div className="flex items-center gap-x-6 flex-wrap">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'EBT FNS Number'}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <LabeledInput
                            inputPlaceholder="Type EBT FNS Number"
                            inputValue={ebtFnsNumber}
                            onInputChange={handleEbtFnsNumberChange}
                            bussiness={true}
                        />
                    </div>
                )}
                <div className="flex items-center space-x-2 mt-2 mb-1">
                    <input
                        id="sameAsBusiness"
                        type="checkbox"
                        checked={sameAsBusiness}
                        onChange={(e) => setSameAsBusiness(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <label htmlFor="sameAsBusiness" className="text-sm text-[var(--dashboard-text-secondary)]">
                        Business Information is the same as Legal Information
                    </label>
                </div>

                {!sameAsBusiness && (
                    <>
                        <Heading
                            Fontweight={700}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Business Information'}
                            Fontsize={20}
                            mt={10}
                        />
                        <div className="flex flex-col gap-2 ">
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'Business Name (DBA)'}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Type business name"
                                    inputValue={businessName}
                                    onInputChange={handleBusinessNameChange}
                                    bussiness={true}
                                />
                            </div>
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'DBA Address'}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Type DBA Address"
                                    inputValue={address}
                                    onInputChange={handleAddressChange}
                                    bussiness={true}
                                />
                            </div>
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'DBA Zip Code'}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <div>
                                    <LabeledInput
                                        inputPlaceholder="e.g. 12345 or 12345-6789"
                                        inputValue={dbaZipCode}
                                        onInputChange={handleDbaZipCodeChange}
                                        inputType="text"
                                        bussiness={true}
                                    />
                                    <p className="text-sm text-[var(--dashboard-text-secondary)] mt-1">
                                        Enter ZIP code to auto-fill City and State
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'DBA City'}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="Type DBA City"
                                    inputValue={dbaCity}
                                    onInputChange={handleDbaCityChange}
                                    bussiness={true}
                                />
                            </div>
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'DBA State'}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <DropdownMenu
                                    menuItems={usStates}
                                    business={true}
                                    defaultText={"Select State"}
                                    onSelect={handleDbaStateChange}
                                    selectedValue={dbaState}
                                />
                            </div>
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={'var(--sidebar-text-primary)'}
                                        Heading={'DBA Phone Number'}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <LabeledInput
                                    inputPlaceholder="(123) 456-7890"
                                    inputValue={contactNo}
                                    onInputChange={(e) => {
                                        let value = e.target.value;

                                        // Remove all non-numeric characters
                                        value = value.replace(/\D/g, '');

                                        // Limit to 10 digits
                                        if (value.length > 10) {
                                            value = value.substring(0, 10);
                                        }

                                        // Apply formatting
                                        if (value.length > 6) {
                                            value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
                                        } else if (value.length > 3) {
                                            value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
                                        } else if (value.length > 0) {
                                            value = `(${value}`;
                                        }

                                        handleContactNoChange({ target: { value } });
                                    }}
                                    bussiness={true}
                                />
                            </div>
                        </div>
                    </>
                )}
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Type of Tax ID'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <DropdownMenu
                        menuItems={taxTypeData}
                        business={true}
                        defaultText={"Tax Type"}
                        onSelect={handleTaxTypeChange}
                        selectedValue={taxType}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="flex items-center gap-x-2 w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={`Tax ID (${taxType})`}
                            Fontsize={16}
                            required={true}
                        />
                        <button
                            type="button"
                            className="text-[var(--dashboard-tab-active)] border border-[var(--dashboard-tab-active)] rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-[var(--dashboard-tab-inactive)]"
                            onClick={() => setShowTaxInfo(true)}
                        >
                            ?
                        </button>
                    </div>

                    <LabeledInput
                        inputPlaceholder={
                            taxType === "SSN" || taxType === "ITIN"
                                ? "XXX-XX-XXXX"
                                : taxType === "EIN"
                                    ? "XX-XXXXXXX"
                                    : "Select Tax Type First"
                        }
                        inputValue={fein}
                        onInputChange={handleFeinChange}
                        bussiness={true}
                        disabled={!taxType}   // ✅ disable if no taxType
                    />

                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Ownership Type'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <DropdownMenu
                        menuItems={ownershipTypeData}
                        businessType={true}
                        defaultText={"Ownership Type"}
                        onSelect={handleOwnershipTypeChange}
                        selectedValue={ownershipType}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Business Start Date'}
                            Fontsize={16}
                        />
                    </div>
                    <CustomDatePicker
                        value={businessStartDate}
                        onChange={setBusinessStartDate}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Business Type'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <DropdownMenu
                        menuItems={businessTypedata}
                        businessType={true}
                        defaultText={"Business Type"}
                        onSelect={handleBusinessTypeChange}
                        selectedValue={businessType}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'DBA Email'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Type DBA email"
                        inputValue={email}
                        onInputChange={handleEmailChange}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Website'}
                            Fontsize={16}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Type website"
                        inputValue={website}
                        onInputChange={handleWebsiteChange}
                        bussiness={true}
                    />
                </div>
                <div className="flex items-center gap-x-6 flex-wrap">
                    <div className="w-48">
                        <Heading
                            Fontweight={500}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Description of products / services sold'}
                            Fontsize={16}
                            required={true}
                        />
                    </div>
                    <LabeledInput
                        inputPlaceholder="Description"
                        inputValue={description}
                        onInputChange={handleDescriptionChange}
                        addressSmall={true}
                    />
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-x-6 flex-wrap" >
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Select Agent'}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <DropdownMenu
                            menuItems={userList}
                            idSet={true}
                            business={true}
                            searchable={true}
                            defaultText={"Select Agent"}
                            onSelect={(val) => setSelectedAgentId(val)}
                            selectedValue={userList?.find((u) => String(u?.id) === String(selectedAgentId))?.name || ""}
                        />
                    </div>
                )}
            </div>

            {showTaxInfo && (
                <ShowTaxInfoModal isOpen={showTaxInfo} onClose={() => setShowTaxInfo(false)} />
            )}
        </>
    );
});

export default BusinessInformation;
