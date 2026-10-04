import { useEffect, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";
import { useSelector } from "react-redux";
import {
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useNavigate, useLocation } from "react-router-dom";

const AddSupplier = ({ entityLabel: entityLabelProp }) => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const navigate = useNavigate();
  const location = useLocation();
  const entityLabel = entityLabelProp || location.state?.entityLabel || "Supplier";
  const [tabValue, setTabValue] = useState(0);
  const entityLower = entityLabel.toLowerCase();

  const [companyName, setCompanyName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [website, setWebsite] = useState("");
  const [year, setYear] = useState("");
  const [service, setService] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [faxNumber, setFaxNumber] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [errors, setErrors] = useState({});

  const clearError = (field) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

  const industryOptions = [
    { id: "Technology", name: "Technology" },
    { id: "Healthcare", name: "Healthcare" },
    { id: "Finance", name: "Finance" },
    { id: "Manufacturing", name: "Manufacturing" },
    { id: "Retail", name: "Retail" },
    { id: "Construction", name: "Construction" },
    { id: "Education", name: "Education" },
    { id: "Transportation", name: "Transportation" },
  ];

  const leadStatusOptions = [
    { id: "New", name: "New" },
    { id: "Contacted", name: "Contacted" },
    { id: "Qualified", name: "Qualified" },
    { id: "Proposal Sent", name: "Proposal Sent" },
    { id: "Negotiation", name: "Negotiation" },
    { id: "Closed Won", name: "Closed Won" },
    { id: "Closed Lost", name: "Closed Lost" },
    { id: "Follow Up Required", name: "Follow Up Required" },
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleFaxNumberChange = (e) => {
    setFaxNumber(e.target.value);
  };

  const handleAnnualRevenueChange = (e) => {
    setAnnualRevenue(e.target.value);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleIndustryChange = (e) => {
    setIndustry(e.target.value);
  };

  const handleLeadStatusChange = (e) => {
    setLeadStatus(e.target.value);
  };

  const handleCompanyNameChange = (e) => {
    setCompanyName(e.target.value);
    clearError("companyName");
  };
  const handleContactNoChange = (e) => {
    if (/^\d*$/.test(e.target.value)) {
      setContactNo(e.target.value);
      clearError("contactNo");
    }
  };

  const handleMobileNumberChange = (e) => {
    setMobileNumber(e.target.value);
  };

  const handleDirectorNameChange = (e) => {
    setDirectorName(e.target.value);
    clearError("directorName");
  };
  const handleDirectorEmailChange = (e) => {
    setDirectorEmail(e.target.value);
    clearError("directorEmail");
  };

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
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
    if (/^\d*$/.test(e.target.value)) {
      setZipCode(e.target.value);
      clearError("zipCode");
    }
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
    clearError("description");
  };
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    clearError("email");
  };
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isValidPhone = (phone) => /^\d{10,15}$/.test(phone);

  const isValidZip = (zip) => /^\d{4,10}$/.test(zip);

  const isValidYear = (year) => {
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear;
  };

  const isValidURL = (url) =>
    /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/.test(url);

  const handleSaveSupplier = async () => {
        // Required field presence checks
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
        if (!description.trim()) fieldErrors.description = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            toast.error("Please fill all the required fields");
            return;
        }

        // Email validation
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

        // Zip code validation
        if (!isValidZip(zipCode)) {
            setErrors({ zipCode: true });
            toast.error("Enter a valid Zip Code");
            return;
        }

        // Year validation
        if (!isValidYear(Number(year))) {
            setErrors({ year: true });
            toast.error("Enter a valid establishment year");
            return;
        }

        // Phone validation
        if (!isValidPhone(contactNo)) {
            setErrors({ contactNo: true });
            toast.error("Enter a valid contact number");
            return;
        }

        // Additional validation
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

        // Website validation (optional)
        if (website && !isValidURL(website)) {
            setErrors({ website: true });
            toast.error("Enter a valid website URL");
            return;
        }

        if (!accessToken) {
            toast.error("Authentication token not available");
            return;
        }

        setErrors({});
 
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
                 "establishmentYear": Number(year),
                 "website": website,
                 "companyName": companyName
             };
             const result = await postRequestWithBodyAndToken(`${baseURl}vendor`, accessToken, apiData);
             toast.success(result.message);
             navigate(-1);
         } catch (error) {
             toast.error(error.message || "Something went wrong");
            console.error(`${entityLabel} creation error:`, error);
            
            // Enhanced error handling
            if (error.response) {
                const status = error.response.status;
                if (status === 400) {
                    toast.error(error.response.data?.message || `Invalid ${entityLower} data provided`);
                } else if (status === 401) {
                    toast.error("Authentication failed. Please login again.");
                } else if (status === 403) {
                    toast.error(`You don't have permission to create ${entityLower}s`);
                } else if (status === 409) {
                    toast.error(`${entityLabel} with this email already exists`);
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
    <div
      className="min-h-screen"
      style={{
        marginTop: -65,
        backgroundColor: "var(--dashboard-bg)",
        padding: 10,
      }}
    >
      <Heading
        Fontweight={700}
        color={"var(--sidebar-text-primary)"}
        Heading={`Add ${entityLabel}`}
        Fontsize={30}
      />

      <div
        className="w-[100%] "
        style={{
          backgroundColor: "var(--dashboard-card-bg)",
          borderRadius: 14,
        }}
      >
        <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
          <div className="flex justify-between gap-3 flex-wrap">
            <GoBack />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                tabValue === 0
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-[#0C79F7]"
              }`}
              onClick={() => setTabValue(0)}
            >
              Personal Details
            </button>
            {/* <button
              className={`px-4 py-2 text-sm font-medium ${
                tabValue === 1
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-[#0C79F7]"
              }`}
              onClick={() => setTabValue(1)}
            >
              Address Information
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                tabValue === 2
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-[#0C79F7]"
              }`}
              onClick={() => setTabValue(2)}
            >
              Additional Information
            </button> */}
          </div>

          {/* Tab Content */}
          {tabValue === 0 && (
            <div>
              <div className="flex flex-col  mt-4 gap-4">
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

                {/* Zip Code */}
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

                {/* Website */}
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

                {/* Year of Establishment */}
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

                {/* Director's Name */}
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

                {/* Director's Contact No */}
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

                {/* Director's Email */}
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
                    border: errors.address ? "1px solid #ef4444" : "1px solid #D1D5DC",
                    boxShadow: "none",
                    outline: "none",
                    fontSize: 14,
                    borderRadius: 8,
                    backgroundColor: "var(--dashboard-tab-box)",
                    color: "var(--sidebar-text-primary)",
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
                    border: errors.description ? "1px solid #ef4444" : "1px solid #D1D5DC",
                    boxShadow: "none",
                    outline: "none",
                    fontSize: 14,
                    borderRadius: 8,
                    backgroundColor: "var(--dashboard-tab-box)",
                    color: "var(--sidebar-text-primary)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Address Information Tab */}
          {tabValue === 1 && (
            // <div>
            //   <h1>Address Information</h1>
            //   <div>
            //     <div className="flex flex-col mt-4 gap-4">
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           Address
            //         </label>
            //         <textarea
            //           type="text"
            //           placeholder="Enter Address"
            //           value={address}
            //           onChange={(e) => setAddress(e.target.value)}
            //           className="flex-1 h-20 p-3 border border-gray-300 rounded-md"
            //           rows="3"
            //         />
            //       </div>
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           City
            //         </label>
            //         <input
            //           type="text"
            //           placeholder="Enter City"
            //           value={city}
            //           onChange={handleCityChange}
            //           className="flex-1 h-10 p-3 border border-gray-300 rounded-md"
            //           required
            //         />
            //       </div>
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           State
            //         </label>
            //         <input
            //           type="text"
            //           placeholder="Enter State"
            //           value={state}
            //           onChange={handleStateChange}
            //           className="flex-1 h-10 p-3 border border-gray-300 rounded-md"
            //           required
            //         />
            //       </div>
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           Zip Code
            //         </label>
            //         <input
            //           type="text"
            //           placeholder="Enter Zip Code"
            //           value={zipCode}
            //           onChange={handleZipCodeChange}
            //           className="flex-1 h-10 p-3 border border-gray-300 rounded-md"
            //           required
            //         />
            //       </div>
            //     </div>
            //   </div>
            // </div>
            <div>
              
            </div>
          )}

          {/* Additional Information Tab */}
          {tabValue === 2 && (
            // <div>
            //   <h1>Additional Information</h1>
            //   <div>
            //     <div className="flex flex-col mt-4 gap-4">
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           Website
            //         </label>
            //         <input
            //           type="url"
            //           placeholder="Enter Website"
            //           value={website}
            //           onChange={handleWebsiteChange}
            //           className="flex-1 h-10 p-3 border border-gray-300 rounded-md"
            //         />
            //       </div>
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           Year of Establishment
            //         </label>
            //         <input
            //           type="number"
            //           placeholder="Enter Year"
            //           value={year}
            //           onChange={handleYearChange}
            //           className="flex-1 h-10 p-3 border border-gray-300 rounded-md"
            //           required
            //         />
            //       </div>
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           Service
            //         </label>
            //         <input
            //           type="text"
            //           placeholder="Enter Service"
            //           value={service}
            //           onChange={(e) => setService(e.target.value)}
            //           className="flex-1 h-10 p-3 border border-gray-300 rounded-md"
            //         />
            //       </div>
            //       <div className="flex items-center gap-4">
            //         <label className="font-medium text-gray-700 w-32">
            //           Description
            //         </label>
            //         <textarea
            //           type="text"
            //           placeholder="Enter Description"
            //           value={description}
            //           onChange={(e) => setDescription(e.target.value)}
            //           className="flex-1 h-20 p-3 border border-gray-300 rounded-md"
            //           rows="3"
            //         />
            //       </div>
            //     </div>
            //   </div>
            // </div>

            <div></div>
          )}

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
              backgroundColor={"rgba(67, 121, 238, 1)"}
              width={130}
              title={"Save"}
              height={40}
              color={"var(--sidebar-text-selected)"}
              fontSize={16}
              fontWeight={500}
              onClick={handleSaveSupplier}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSupplier;
