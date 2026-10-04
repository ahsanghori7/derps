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
import {
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
} from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useNavigate } from "react-router-dom";
import DropdownMenu from "../../Components/dropdownMenu";

const CustomerInfo = () => {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dbaName, setDbaName] = useState("");
  const [lastName, setLastName] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [address, setAddress] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [legalCity, setLegalCity] = useState("");
  const [state, setState] = useState("");
  const [legalZipCode, setLegalZipCode] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [dbaAddress, setDbaAddress] = useState("");
  const [dbaCity, setDbaCity] = useState("");
  const [dbaState, setDbaState] = useState("");
  const [dbaZipCode, setDbaZipCode] = useState("");
  const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerCity, setOwnerCity] = useState("");
  const [ownerState, setOwnerState] = useState("");
  const [legalState, setLegalState] = useState("");
  const [ownerZipCode, setOwnerZipCode] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [comments, setComments] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [taxCode, settaxCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentList, setAgentList] = useState([]);
  const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
  const [errors, setErrors] = useState({});

  const clearError = (field) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

  const fetchData = () => {
    // setLoading(true)
    setLoading(true); // Set loading state before fetching
    getRequestWithOutBody(`${baseURl}user?roleTitle=agent`, accessToken)
      .then((result) => {
        setAgentList(result?.data?.results || []);
        // setCompanyCategoryArray(options);
        // setCompanyCategoryArray(result)setLoadin
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);
  const handleMerchantIdChange = (e) => {
    setMerchantId(e.target.value);
  };
  const handleBusinessNameChange = (e) => {
    setBusinessName(e.target.value);
    clearError("businessName");
  };
  const handleFirstNameChange = (e) => {
    setFirstName(e.target.value);
  };
  const handleDbaNameChange = (e) => {
    setDbaName(e.target.value);
  };
  const handleLastNameChange = (e) => {
    setLastName(e.target.value);
  };
  const handleContactNoChange = (e) => {
    setContactNo(e.target.value);
  };
  const handleLegalAddressChange = (e) => {
    setLegalAddress(e.target.value);
    clearError("legalAddress");
  };
  const handleLegalCityChange = (e) => {
    setLegalCity(e.target.value);
    clearError("legalCity");
  };
  const handleLegalZipCodeChange = async (e) => {
    let value = e.target.value;

    // Allow only numbers + optional dash
    value = value.replace(/[^0-9-]/g, "");

    // ZIP regex (5 or ZIP+4)
    const zipRegex = /^\d{5}(?:-\d{4})?$/;

    if (zipRegex.test(value)) {
      try {
        const res = await fetch(
          `https://api.zippopotam.us/us/${value.slice(0, 5)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const place = data.places?.[0];
          if (place) {
            setLegalCity(place["place name"]);
            setLegalState(place["state abbreviation"]);
          }
        }
      } catch (err) {
      }
    }

    setLegalZipCode(value);
    clearError("legalZipCode");
  };
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    clearError("email");
  };
  const handleStateChange = (e) => {
    setState(e.target.value);
    clearError("state");
  };
  const handleDbaAddressChange = (e) => {
    setDbaAddress(e.target.value);
  };
  const handleDbaCityChange = (e) => {
    setDbaCity(e.target.value);
  };
  const handleDbaStateChange = (e) => {
    setDbaState(e.target.value);
  };
  const handleDbaZipCodeChange = (e) => {
    setDbaZipCode(e.target.value);
  };

  const handleWebsiteChange = (e) => {
    setWebsite(e.target.value);
  };
  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    clearError("phone");
  };
  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };
  const handleOwnerPhoneNumberChange = (e) => {
    setOwnerPhoneNumber(e.target.value);
    clearError("ownerPhoneNumber");
  };
  const handleOwnerFirstNameChange = (e) => {
    setOwnerFirstName(e.target.value);
    clearError("ownerFirstName");
  };
  const handleOwnerLastNameChange = (e) => {
    setOwnerLastName(e.target.value);
    clearError("ownerLastName");
  };
  const handleOwnerAddressChange = (e) => {
    setOwnerAddress(e.target.value);
  };
  const handleOwnerCityChange = (e) => {
    setOwnerCity(e.target.value);
  };
  const handleOwnerStateChange = (e) => {
    setOwnerState(e.target.value);
  };
  const handleOwnerEmailChange = (e) => {
    setOwnerEmail(e.target.value);
    clearError("ownerEmail");
  };
  const handleOwnerZipCodeChange = (e) => {
    setOwnerZipCode(e.target.value);
    clearError("ownerZipCode");
  };
  const handleCommentsChange = (e) => {
    setComments(e.target.value);
  };
  const handleTaxCodeChange = (e) => {
    settaxCode(e.target.value);
  };
  const handleAssignedChange = (year) => {
    setAssignedUser(year);
    clearError("assignedUser");
  };
  const handleCheckboxChange = () => {
    // Add this function
    setIsChecked(!isChecked);
  };


  const handleLogin = async () => {
    const fieldErrors = {};
    const requiredFields = [
      ["businessName", businessName, "Legal Business Name"],
      ["legalAddress", legalAddress, "Legal Address"],
      ["legalCity", legalCity, "Legal City"],
      ["state", state, "Legal State"],
      ["legalZipCode", legalZipCode, "Legal Zip Code"],
      ["email", email, "Business Email"],
      ["phone", phone, "Contact No"],
      ["assignedUser", assignedUser, "Assign To"],
      ["ownerFirstName", ownerFirstName, "Owner First Name"],
      ["ownerLastName", ownerLastName, "Owner Last Name"],
      ["ownerPhoneNumber", ownerPhoneNumber, "Owner Phone Number"],
      ["ownerEmail", ownerEmail, "Owner Email"],
    ];

    requiredFields.forEach(([field, value]) => {
      if (!String(value || "").trim()) fieldErrors[field] = true;
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      const missingFields = requiredFields
        .filter(([field]) => fieldErrors[field])
        .map(([, , label]) => label);
      toast.error(`Please complete: ${missingFields.join(", ")}`);
      return;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrors({ email: true });
      toast.error("Please enter a valid business email");
      return;
    }

    if (!emailRegex.test(ownerEmail)) {
      setErrors({ ownerEmail: true });
      toast.error("Please enter a valid owner email");
      return;
    }

    // ZIP validation (US ZIP)
    const zipRegex = /^\d{5}(?:-\d{4})?$/;

    if (!zipRegex.test(legalZipCode)) {
      setErrors({ legalZipCode: true });
      toast.error("Please enter a valid Legal ZIP Code");
      return;
    }

    if (ownerZipCode && !zipRegex.test(ownerZipCode)) {
      setErrors({ ownerZipCode: true });
      toast.error("Please enter a valid Owner ZIP Code");
      return;
    }

    // Phone validation (basic numeric check)
    const phoneRegex = /^[0-9()+-\s]{7,20}$/;

    if (!phoneRegex.test(phone)) {
      setErrors({ phone: true });
      toast.error("Please enter a valid Contact number");
      return;
    }

    if (!phoneRegex.test(ownerPhoneNumber)) {
      setErrors({ ownerPhoneNumber: true });
      toast.error("Please enter a valid owner phone number");
      return;
    }

    // Additional validation
    if (businessName.trim().length < 2) {
      setErrors({ businessName: true });
      toast.error("Business Name must be at least 2 characters long");
      return;
    }

    if (ownerFirstName.trim().length < 2) {
      setErrors({ ownerFirstName: true });
      toast.error("Owner First Name must be at least 2 characters long");
      return;
    }

    if (ownerLastName.trim().length < 2) {
      setErrors({ ownerLastName: true });
      toast.error("Owner Last Name must be at least 2 characters long");
      return;
    }

    setErrors({});

    if (!accessToken) {
      toast.error("Authentication token not available");
      return;
    }

    setLoading(true);
    try {
      const apiData = {
        taxExempt: isChecked,
        // Required fields (already validated above)
        legalBusinessName: businessName.trim(),
        legalAddress: legalAddress.trim(),
        legalCity: legalCity.trim(),
        state: state.trim(),
        legalZipCode: legalZipCode.trim(),
        email: email.trim(),
        phoneNumber: phone.trim(),
        assigneeId: assignedUser,
        ownerFirstName: ownerFirstName.trim(),
        ownerLastName: ownerLastName.trim(),
        ownerPhoneNumber: ownerPhoneNumber.trim(),
        ownerEmail: ownerEmail.trim(),
      };

      // Optional fields
      if (firstName.trim()) apiData.firstName = firstName.trim();
      if (lastName.trim()) apiData.lastName = lastName.trim();
      if (dbaName.trim()) apiData.dbaName = dbaName.trim();
      if (contactNo.trim()) apiData.dbaPhoneNumber = contactNo.trim();
      if (dbaAddress.trim()) apiData.dbaAddress = dbaAddress.trim();
      if (dbaState.trim()) apiData.businessState = dbaState.trim();
      if (dbaCity.trim()) apiData.businessCity = dbaCity.trim();
      if (dbaZipCode.trim()) apiData.businessZipCode = dbaZipCode.trim();
      if (ownerAddress.trim()) apiData.ownerAddress = ownerAddress.trim();
      if (ownerState.trim()) apiData.ownerState = ownerState.trim();
      if (ownerCity.trim()) apiData.ownerCity = ownerCity.trim();
      if (ownerZipCode.trim()) apiData.ownerZipcode = ownerZipCode.trim();
      if (taxCode.trim()) apiData.taxCode = taxCode.trim();
      if (comments.trim()) apiData.comment = comments.trim();
      if (website.trim()) apiData.website = website.trim();
      if (merchantId.trim()) {
        apiData.merchantIds = [{ merchantId: merchantId.trim() }];
      }

      // Validate payload before sending
      if (!apiData.legalBusinessName || !apiData.legalAddress || !apiData.email || !apiData.assigneeId) {
        toast.error("Invalid customer data");
        return;
      }

      const result = await postRequestWithBodyAndToken(
        `${baseURl}customer`,
        accessToken,
        apiData,
      );
      
      if (!result || !result.message) {
        toast.error("Invalid response from server");
        return;
      }
      
      toast.success(result.message);
      navigate(-1);
    } catch (error) {
      console.error('Customer creation error:', error);
      
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          toast.error(error.response.data?.message || "Invalid customer data provided");
        } else if (status === 401) {
          toast.error("Authentication failed. Please login again.");
        } else if (status === 403) {
          toast.error("You don't have permission to create customers");
        } else if (status === 409) {
          toast.error("Customer with this email already exists");
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

  const handleSameDetailsClick = () => {
    setDbaName(businessName); // Set DBA Name
    setDbaAddress(legalAddress); // Set DBA Address
    setDbaCity(legalCity); // Set DBA City
    setDbaState(state); // Set DBA State
    setDbaZipCode(legalZipCode); // Set DBA Zip Code
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
        Heading={"Merchant Information Form"}
        Fontsize={30}
      // Tailwind CSS classes
      />

      <div
        className="w-full "
        style={{
          backgroundColor: "var(--dashboard-card-bg)",
          borderRadius: 14,
        }}
      >
        <div
          style={{ marginTop: 10, borderRadius: 14 }}
          className="sm:m-8 p-3 pt-4  m-2"
        >
          <div className="flex justify-between gap-3 flex-wrap">
            <GoBack />
          </div>
          <div>
            <Heading
              Fontweight={700}
              color={"var(--sidebar-text-primary)"}
              Heading={"Business Information"}
              Fontsize={20}
              mt={20}
            // Tailwind CSS classes
            />
            <div className="flex flex-col mt-2 gap-x-4 gap-y-2">
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Merchant ID"}
                    Fontsize={16}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Merchant ID"
                  inputValue={merchantId}
                  onInputChange={handleMerchantIdChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"First Name"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  //   label="First Name"
                  inputPlaceholder="First Name"
                  inputValue={firstName}
                  onInputChange={handleFirstNameChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              {/* <div>
                <LabeledInput
                  label="Last Name"
                  inputPlaceholder="Last Name"
                  inputValue={lastName}
                  onInputChange={handleLastNameChange}
                  addAgent={true}
                />
              </div> */}

              {/* <div>
                                <LabeledInput
                                    label="Merchant Address"
                                    inputPlaceholder="Merchant Address"
                                    inputValue={address}
                                    onInputChange={handleAddressChange}
                                    addAgent={true}

                                />
                            </div> */}
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Last Name"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Last Name"
                  inputValue={lastName}
                  onInputChange={handleLastNameChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Legal Business Name"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Legal Business Name"
                  inputValue={businessName}
                  onInputChange={handleBusinessNameChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.businessName}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Legal Address"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Legal Address"
                  inputValue={legalAddress}
                  onInputChange={handleLegalAddressChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.legalAddress}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Legal City"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Legal City"
                  inputValue={legalCity}
                  onInputChange={handleLegalCityChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.legalCity}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Legal State"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Legal State"
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
                    Heading={"Legal Zip Code"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Legal Zip Code"
                  inputValue={legalZipCode}
                  onInputChange={handleLegalZipCodeChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.legalZipCode}
                />
              </div>

              <div className="flex items-end my-4">
                <BottonCustom
                  backgroundColor={"rgba(67, 121, 238, 1)"}
                  // width={125}
                  title={"Same Business & Legal Details"}
                  height={40}
                  color={"var(--sidebar-text-selected)"}
                  fontSize={16}
                  fontWeight={500}
                  // onClick={handleLogin}
                  onClick={handleSameDetailsClick}
                />
              </div>
            </div>
            <div className="flex flex-col mt-2 gap-x-4 gap-y-2">
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"DBA Name"}
                    Fontsize={16}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="DBA Name"
                  inputValue={dbaName}
                  onInputChange={handleDbaNameChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"DBA Address"}
                    Fontsize={16}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="DBA Address"
                  inputValue={dbaAddress}
                  onInputChange={handleDbaAddressChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"DBA City"}
                    Fontsize={16}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="DBA City"
                  inputValue={dbaCity}
                  onInputChange={handleDbaCityChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"DBA State"}
                    Fontsize={16}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="DBA State"
                  inputValue={dbaState}
                  onInputChange={handleDbaStateChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"DBA Zip Code"}
                    Fontsize={16}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="DBA Zip Code"
                  inputValue={dbaZipCode}
                  onInputChange={handleDbaZipCodeChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Business Email"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Business Email"
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
                    Heading={"DBA Phone Number"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="DBA Phone Number"
                  inputValue={contactNo}
                  onInputChange={handleContactNoChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Website"}
                    Fontsize={16}
                    required={false}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Website"
                  inputValue={website}
                  onInputChange={handleWebsiteChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Contact No"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Contact No"
                  inputValue={phone}
                  onInputChange={handlePhoneChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.phone}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Assign To"}
                    Fontsize={16}
                    required={true}

                  // Tailwind CSS classes
                  />
                </div>
                <DropdownMenu
                  menuItems={agentList.map((agent) => ({
                    text: agent.name,
                    value: agent.id,
                  }))}
                  addAgent={true}
                  defaultText={"Select Agent"}
                  onSelect={handleAssignedChange}
                  searchable={true}
                  border={errors.assignedUser ? "1px solid #ef4444" : undefined}
                />
              </div>
            </div>

            <Heading
              Fontweight={700}
              color={"var(--sidebar-text-primary)"}
              Heading={"Owner Information"}
              Fontsize={20}
              mt={20}
            // Tailwind CSS classes
            />
            <div className="flex flex-col mt-2 gap-x-4 gap-y-2">
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner First Name"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner First Name"
                  inputValue={ownerFirstName}
                  onInputChange={handleOwnerFirstNameChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.ownerFirstName}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner Last Name"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner Last Name"
                  inputValue={ownerLastName}
                  onInputChange={handleOwnerLastNameChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.ownerLastName}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner Address"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner Address"
                  inputValue={ownerAddress}
                  onInputChange={handleOwnerAddressChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner City"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner City"
                  inputValue={ownerCity}
                  onInputChange={handleOwnerCityChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner State"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner State"
                  inputValue={ownerState}
                  onInputChange={handleOwnerStateChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner Zip Code"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner Zip Code"
                  inputValue={ownerZipCode}
                  onInputChange={handleOwnerZipCodeChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.ownerZipCode}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner Phone Number"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner Phone Number"
                  inputValue={ownerPhoneNumber}
                  onInputChange={handleOwnerPhoneNumberChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.ownerPhoneNumber}
                />
              </div>

              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Owner Email"}
                    Fontsize={16}
                    required={true}
                  />
                </div>
                <LabeledInput
                  inputPlaceholder="Owner Email"
                  inputValue={ownerEmail}
                  onInputChange={handleOwnerEmailChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                  error={!!errors.ownerEmail}
                />
              </div>
            </div>
            <div className="flex flex-col mt-2 gap-x-4 gap-y-2">
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Tax Exempt Code (if applicable)"}
                    Fontsize={16}
                  // required={true}
                  />
                </div>
                <LabeledInput
                  //   label="Tax Exempt Code (if applicable)"
                  inputPlaceholder=""
                  inputValue={taxCode}
                  onInputChange={handleTaxCodeChange}
                  addAgent={true}
                  className="h-8 w-80 px-2"
                />
              </div>
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Tax Exempt"}
                    Fontsize={16}
                  //   mb={0}
                  />
                </div>

                <div className="flex items-center flex-1">
                  <input
                    type="checkbox"
                    id="taxExempt"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    className="mr-2"
                    style={{ transform: "scale(1.5)" }}
                  />
                  <label
                    htmlFor="taxExempt"
                    style={{ color: "var(--Gray)", fontSize: 10 }}
                  >
                    Tax Exempt on Payment
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 w-[95%]">
              <div className="flex items-center gap-x-6 flex-wrap">
                <div className="w-48">
                  <Heading
                    Fontweight={500}
                    color={"var(--sidebar-text-primary)"}
                    Heading={"Comments"}
                    Fontsize={16}
                  //   mb={0}
                  />
                </div>

                <LabeledInput
                  //   label="Comments"
                  inputPlaceholder="Comments"
                  inputValue={comments}
                  onInputChange={handleCommentsChange}
                  address={true}
                />
              </div>
            </div>
          </div>
          <div style={{ display: "" }} className="flex justify-end mt-10 gap-3">
            <BottonCustom
              backgroundColor={"rgba(67, 121, 238, 1)"}
              width={130}
              title={"Save"}
              height={40}
              color={"var(--sidebar-text-selected)"}
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

export default CustomerInfo;
