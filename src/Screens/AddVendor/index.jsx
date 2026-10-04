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
import { getRequestWithOutBody, postRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useNavigate } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";
import { Button } from "@mui/material";
import { formatPhoneNumber, getPhoneDigits } from "../SalesFormBuilder/formDefinitionApi";

const AddVendor = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [directorName, setDirectorName] = useState("")
    const [directorEmail, setDirectorEmail] = useState("")
    const [city, setCity] = useState("")
    const [state, setState] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [website, setWebsite] = useState("")
    const [year, setYear] = useState("")
    const [service, setService] = useState("")
    const [email, setEmail] = useState("")
    const [description, setDescription] = useState("")
    const [address, setAddress] = useState("")
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const isValidPhone = (phone) => {
        const digits = getPhoneDigits(phone);
        return /^\d{10}$/.test(digits);
    };

    const isValidYear = (year) => {
        const currentYear = new Date().getFullYear();
        return year >= 1900 && year <= currentYear;
    };

    const isValidZip = (zip) => {
        return /^\d{5}(?:-\d{4})?$/.test(zip);
    };

    const isValidURL = (url) => {
        return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/.test(url);
    };

    const handleCompanyNameChange = (e) => {
        setCompanyName(e.target.value);
        clearError("companyName");
    };
    const handleContactNoChange = (e) => {
        setContactNo(formatPhoneNumber(e.target.value, 10));
        clearError("contactNo");
    };
    const handleDirectorNameChange = (e) => {
        setDirectorName(e.target.value);
        clearError("directorName");
    };
    const handleDirectorEmailChange = (e) => {
        setDirectorEmail(e.target.value);
        clearError("directorEmail");
    };
    const handleCityChange = (e) => {
        setCity(e.target.value);
        clearError("city");
    };
    const handleStateChange = (e) => {
        setState(e.target.value);
        clearError("state");
    };
    const handleZipCodeChange = async (e) => {
        let value = e.target.value;

        // Allow only numbers + optional dash
        value = value.replace(/[^0-9-]/g, '');

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
                // ignore zip lookup errors
            }
        }

        setZipCode(value);
        clearError("zipCode");
    };
    const handleWebsiteChange = (e) => {
        setWebsite(e.target.value);
        clearError("website");
    };
    const handleYearChange = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setYear(value);
            clearError("year");
        }
    };
    const handleAddressChange = (e) => {
        setAddress(e.target.value);
        clearError("address");
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        clearError("email");
    };

    const handleLogin = async () => {
        const fieldErrors = {};
        if (!companyName.trim()) fieldErrors.companyName = true;
        if (!email.trim()) fieldErrors.email = true;
        if (!city.trim()) fieldErrors.city = true;
        if (!state.trim()) fieldErrors.state = true;
        if (!zipCode.trim()) fieldErrors.zipCode = true;
        if (!year) fieldErrors.year = true;
        if (!directorName.trim()) fieldErrors.directorName = true;
        if (!contactNo.trim()) fieldErrors.contactNo = true;
        if (!directorEmail.trim()) fieldErrors.directorEmail = true;
        if (!address.trim()) fieldErrors.address = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Please fill all the required fields");
            return;
        }

        if (!isValidEmail(email)) {
            setErrors({ email: true });
            toast.error("Enter a valid company email");
            return;
        }

        if (!isValidEmail(directorEmail)) {
            setErrors({ directorEmail: true });
            toast.error("Enter a valid director email");
            return;
        }

        if (!isValidZip(zipCode)) {
            setErrors({ zipCode: true });
            toast.error("Enter a valid Zip Code");
            return;
        }

        if (!isValidYear(Number(year))) {
            setErrors({ year: true });
            toast.error("Enter a valid establishment year");
            return;
        }

        if (!isValidPhone(contactNo)) {
            setErrors({ contactNo: true });
            toast.error("Enter a valid contact number");
            return;
        }

        if (companyName.trim().length < 2) {
            setErrors({ companyName: true });
            toast.error("Company name must be at least 2 characters long");
            return;
        }

        if (directorName.trim().length < 2) {
            setErrors({ directorName: true });
            toast.error("Director name must be at least 2 characters long");
            return;
        }

        if (address.trim().length < 5) {
            setErrors({ address: true });
            toast.error("Address must be at least 5 characters long");
            return;
        }

        if (website && !isValidURL(website)) {
            setErrors({ website: true });
            toast.error("Enter a valid website URL");
            return;
        }

        setErrors({});

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        // Proceed with login logic
        setLoading(true);
        try {
            const apiData = {
                city: city.trim(),
                state: state.trim(),
                directorContactNo: contactNo.trim(),
                directorEmail: directorEmail.trim(),
                email: email.trim(),
                zipCode: zipCode.trim(),
                address: address.trim(),
                description: description?.trim() || null,
                directorName: directorName.trim(),
                establishmentYear: Number(year),
                website: website?.trim() || null,
                companyName: companyName.trim()
            };

            // Validate payload before sending
            if (!apiData.companyName || !apiData.email || !apiData.directorName || !apiData.directorEmail) {
                toast.error("Invalid vendor data");
                return;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}vendor`, accessToken, apiData);
            
            if (!result || !result.message) {
                toast.error("Invalid response from server");
                return;
            }
            
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            console.error('Vendor creation error:', error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || "Invalid vendor data provided");
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error("You don't have permission to create vendors");
                } else if (status === 409) {
                    toast.error("Vendor with this email already exists");
                } else if (status >= 500) {
                    toast.error("Server error. Please try again later.");
                } else {
                    toast.error(error.response.data?.message || "Something went wrong");
                }
            } else if (error.request) {
                toast.error("Network error. Please check your connection.");
            } else {
                toast.error(error.message || "Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Button
                    onClick={() => navigate(-1)}
                    style={{
                        minWidth: 40,
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'var(--dashboard-card-bg)',
                        border: '1px solid var(--dashboard-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        marginTop: 4
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={'Add Vendor'}
                    Fontsize={30}
                />
            </div>
            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    {/* <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />

                    </div> */}
                    <div>
                        <div className="flex flex-wrap  mt-4 gap-4">
                            <div className="">
                                <LabeledInput
                                    label="Company Name"
                                    inputPlaceholder="Enter Company Name"
                                    inputValue={companyName}
                                    onInputChange={handleCompanyNameChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.companyName}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Email"
                                    inputPlaceholder="Enter Email"
                                    inputValue={email}
                                    onInputChange={handleEmailChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.email}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Zip Code"
                                    inputPlaceholder="Enter Zip Code"
                                    inputValue={zipCode}
                                    onInputChange={handleZipCodeChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.zipCode}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="City"
                                    inputPlaceholder="Enter City"
                                    inputValue={city}
                                    onInputChange={handleCityChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.city}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="State"
                                    inputPlaceholder="Enter State"
                                    inputValue={state}
                                    onInputChange={handleStateChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.state}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Website"
                                    inputPlaceholder="Enter Website"
                                    inputValue={website}
                                    onInputChange={handleWebsiteChange}
                                    addAgent={true}
                                    error={!!errors.website}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Year of Establishment"
                                    inputPlaceholder="Enter Year"
                                    inputValue={year}
                                    onInputChange={handleYearChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.year}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Director's Name"
                                    inputPlaceholder="Enter Name"
                                    inputValue={directorName}
                                    onInputChange={handleDirectorNameChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.directorName}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Director's Contact No"
                                    inputPlaceholder="(123) 456-7890"
                                    inputValue={contactNo}
                                    onInputChange={handleContactNoChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.contactNo}
                                />
                            </div>
                            <div>
                                <LabeledInput
                                    label="Director's Email"
                                    inputPlaceholder="Enter Email"
                                    inputValue={directorEmail}
                                    onInputChange={handleDirectorEmailChange}
                                    addAgent={true}
                                    required
                                    error={!!errors.directorEmail}
                                />
                            </div>

                        </div>

                        <div className="mt-2">
                            <div className="flex">
                                <Heading
                                    Fontweight={500}
                                    color={'var(--fieldsTitle)'}
                                    Heading={'Address'}
                                    Fontsize={10}
                                />
                                <span style={{ color: 'red', marginBottom: -8 }}>*</span>
                            </div>
                            <textarea
                                type="text"
                                placeholder="address"
                                value={address}
                                onChange={handleAddressChange}
                                className={`mt-1 p-3 w-[80%] `}
                                rows={1}
                                style={{
                                    border: errors.address ? '1px solid #ef4444' : '1px solid #D1D5DC',
                                    // boxShadow: errors.address ? '0 0 0 2px rgba(239,68,68,0.2)' : 'none',
                                    outline: 'none',
                                    fontSize: 14,
                                    borderRadius: 8,
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    color: 'var(--sidebar-text-primary)'
                                }}
                            />
                        </div>
                        <div className="mt-2">
                            <Heading
                                Fontweight={500}
                                color={'var(--fieldsTitle)'}
                                Heading={'Description'}
                                Fontsize={10}
                            // Tailwind CSS classes
                            />
                            <textarea
                                type="text"
                                placeholder="Description"
                                value={description}
                                onChange={handleDescriptionChange}
                                className={`mt-1 p-3 w-[80%] `}
                                rows={4}
                                style={{ border: '1px solid #D1D5DC', fontSize: 14, borderRadius: 8, backgroundColor: 'var(--dashboard-tab-box)', color: 'var(--sidebar-text-primary)' }}
                            />
                        </div>

                    </div>
                    <div style={{ display: '' }} className="flex justify-end mt-10 gap-3" >
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Done'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleLogin}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddVendor;
