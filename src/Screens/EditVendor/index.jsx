import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { deleteRequest, getRequestWithOutBody, putRequestWithBodyAndToken } from "../../Api/fetch";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";
import { Button } from "@mui/material";
import UpdateConfirmationModal from "../../Components/UpdateModal";

const EditVendor = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth.accessToken);
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
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [errors, setErrors] = useState({});

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const handleCompanyNameChange = (e) => {
        setCompanyName(e.target.value);
        clearError("companyName");
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
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
    const handleZipCodeChange = (e) => {
        setZipCode(e.target.value);
        clearError("zipCode");
    };
    const handleWebsiteChange = (e) => {
        setWebsite(e.target.value);
        clearError("website");
    };
    const handleYearChange = (e) => {
        const value = e.target.value;
        // Allow only numeric input
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
        clearError("description");
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        clearError("email");
    };

    useEffect(() => {
        if (location.state) {
            const { city, directorContactNo, companyName, email, establishmentYear, directorName, directorEmail, address, zipCode, description, state, website } = location.state.itemData;
            setCompanyName(companyName);
            setContactNo(directorContactNo);
            setDirectorName(directorName);
            setEmail(email);
            setDirectorEmail(directorEmail);
            setAddress(address);
            setCity(city);
            setState(state);
            setZipCode(zipCode);
            setDescription(description);
            setWebsite(website);
            setYear(establishmentYear)
            setCompanyName(companyName)
            setLoading(false)
        }
    }, [location.state]);

    const handleEditAgent = async () => {
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (!companyName || companyName.trim() === "") fieldErrors.companyName = true;
        if (!email || email.trim() === "") fieldErrors.email = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Required fields are missing");
            return;
        }

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        // Show update confirmation modal instead of directly updating
        setShowUpdateModal(true);
    };

    const confirmUpdate = async () => {
        // Clear previous errors
        setErrors({});
        
        // Validation checks
        const fieldErrors = {};
        if (!companyName || companyName.trim() === "") fieldErrors.companyName = true;
        if (!email || email.trim() === "") fieldErrors.email = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Required fields are missing");
            return;
        }

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        // Proceed with update logic
        setLoading(true);
        try {
            const apiData = {
                "city": city,
                "state": state,
                "directorContactNo": contactNo,
                "directorEmail": directorEmail,
                "email": email,
                "zipCode": zipCode,
                "address": address,
                "description": description,
                "directorName": directorName,
                "establishmentYear": Number(year), // Convert year to a number
                "website": website,
                "companyName": companyName
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}vendor/${location?.state?.itemData?.id}`, accessToken, apiData)
            setShowUpdateModal(false);
            navigate(-1);
            toast.success(result.message);
        } catch (error) {
            toast.error(error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const cancelUpdate = () => {
        setShowUpdateModal(false);
    };

    const handleDeleteLead = async () => {
        // Proceed with login logic
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}vendor/${location.state?.itemData?.id}`, accessToken)
            toast.success(result.message);
            navigate(-1);
            // if (userData?.roleTitle === 'Agent') {
            //     navigate('/userdashboard/userLeadsList');
            // } else {
            //     navigate('/home/leadsList');
            // }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
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
                    Heading={'Maintain Vendor'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    {/* <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                    </div> */}

                    <div className="flex flex-col mt-4 gap-4">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Company name"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Company Name"
                                inputValue={companyName}
                                onInputChange={handleCompanyNameChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.companyName}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Email"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Email"
                                inputValue={email}
                                onInputChange={handleEmailChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.email}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"City"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter City"
                                inputValue={city}
                                onInputChange={handleCityChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.city}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"State"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter State"
                                inputValue={state}
                                onInputChange={handleStateChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.state}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Zip Code"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Zip Code"
                                inputValue={zipCode}
                                onInputChange={handleZipCodeChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.zipCode}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Website"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Website"
                                inputValue={website}
                                onInputChange={handleWebsiteChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.website}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Year of Establishment"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Year"
                                inputValue={year}
                                onInputChange={handleYearChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.year}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Director's Name"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Name"
                                inputValue={directorName}
                                onInputChange={handleDirectorNameChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.directorName}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Director's Contact No"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Contact No"
                                inputValue={contactNo}
                                onInputChange={handleContactNoChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.contactNo}
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Director's Email"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Email"
                                inputValue={directorEmail}
                                onInputChange={handleDirectorEmailChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                                error={!!errors.directorEmail}
                            />
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={"Address"}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <textarea
                            type="text"
                            placeholder="address"
                            value={address}
                            onChange={handleAddressChange}
                            className={`mt-1 p-3 w-[80%] `}
                            rows={1}
                            style={{
                                border: errors.address ? '1.5px solid #ef4444' : '1px solid #D1D5DC',
                                fontSize: 14,
                                borderRadius: 8,
                                backgroundColor: 'var(--dashboard-tab-box)',
                                color: 'var(--sidebar-text-primary)'
                            }}
                        />
                    </div>

                    <div className="mt-2">
                        <div className="w-48">
                            <Heading
                                Fontweight={500}
                                color={"var(--sidebar-text-primary)"}
                                Heading={"Description"}
                                Fontsize={16}
                                required={true}
                            />
                        </div>
                        <textarea
                            type="text"
                            placeholder="Description"
                            value={description}
                            onChange={handleDescriptionChange}
                            className={`mt-1 p-3 w-[80%] `}
                            rows={4}
                            style={{
                                border: errors.description ? '1.5px solid #ef4444' : '1px solid #D1D5DC',
                                fontSize: 14,
                                borderRadius: 8,
                                backgroundColor: 'var(--dashboard-tab-box)',
                                color: 'var(--sidebar-text-primary)'
                            }}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <BottonCustom
                            backgroundColor={"transparent"}
                            width={130}
                            title={"Cancel"}
                            height={40}
                            color={"var(--dashboard-text-primary)"}
                            fontSize={16}
                            fontWeight={500}
                            border={"1px solid var(--sidebar-selected-bg)"}
                            onClick={() => navigate(-1)}
                        />
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={'Save'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleEditAgent}
                        />
                    </div>
                </div>
            </div>
            <UpdateConfirmationModal
                open={showUpdateModal}
                title="Update Vendor"
                subtitle="Are you sure you want to update"
                entityName={companyName || "this vendor"}
                updateMessage="This action will update the vendor details and contact information with the current changes."
                onCancel={cancelUpdate}
                onUpdate={confirmUpdate}
                isLoading={loading}
            />
        </div>
    );
};

export default EditVendor;
