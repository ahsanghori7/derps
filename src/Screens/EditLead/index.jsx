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
import DeleteConfirmationModal from "../../Components/DeleteModal";
import UpdateConfirmationModal from "../../Components/UpdateModal";

const EditLead = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const accessToken = useSelector((state) => state.auth.accessToken);
    const userData = useSelector((state) => state.userData.userDetails);
    const [fullName, setFullName] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [designation, setDesignation] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [website, setWebsite] = useState("")
    const [service, setService] = useState("")
    const [email, setEmail] = useState("")
    const [comment, setComment] = useState("")
    const [address, setAddress] = useState("")
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const handleFullNameChange = (e) => {
        setFullName(e.target.value);
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
    };
    const handleDesignationChange = (e) => {
        setDesignation(e.target.value);
    };
    const handleBusinessNameChange = (e) => {
        setBusinessName(e.target.value);
    };
    const handleWebsiteChange = (e) => {
        setWebsite(e.target.value);
    };
    const handleAddressChange = (e) => {
        setAddress(e.target.value);
    };
    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };
    const handleRoleChange = (month) => {
        setService(month);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };

    const data = [
        {
            id: 1,
            text: 'ATM Solutions',
            value: 'atm'
        },
        {
            id: 2,
            text: 'Credit Card Processing',
            value: 'credit-card'
        },
        {
            id: 3,
            text: 'Cash Advance',
            value: 'cash-advance'
        },
        {
            id: 4,
            text: 'Point-Of-Sale Solutions',
            value: 'pos'
        },
        {
            id: 5,
            text: 'EBT Processing',
            value: 'ebt'
        },
        {
            id: 6,
            text: 'AIRVAC Systems',
            value: 'airvac'
        },
        {
            id: 7,
            text: 'Website Services',
            value: 'website'
        },
        {
            id: 8,
            text: 'ACH Processing',
            value: 'ach-processing'
        },
    ];

    useEffect(() => {
        if (location.state) {
            const { fullName, phoneNumber, email, services, comments, address, businessName, designation, website } = location.state.itemData;
            setFullName(fullName);
            setContactNo(phoneNumber);
            setService(services);
            setEmail(email);
            setComment(comments);
            setAddress(address);
            setBusinessName(businessName);
            setDesignation(designation);
            setWebsite(website);
            setLoading(false)
        }
    }, [location.state]);

    const handleEditAgent = async () => {
        // Debug logs
        const errors = [];

        if (!fullName || fullName.toString().trim() === '') {
            errors.push("Full Name field is required");
        }
        if (!service || service.toString().trim() === '') {
            errors.push("Services field is required");
        }
        if (!comment || comment.toString().trim() === '') {
            errors.push("Comments field is required");
        }
        if (!email || email.toString().trim() === '') {
            errors.push("Email field is required");
        } else {
            // Email validation regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errors.push("Please enter a valid email address");
            }
        }
    
        // If there are any errors, show them all in one toast
        if (errors.length > 0) {
            toast.error(
                <div>
                    Please fix the following errors:
                    <ul className="list-disc pl-4 mt-1">
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            );
            return;
        }
        // Show update confirmation modal instead of directly updating
        setShowUpdateModal(true);
    };

    const confirmUpdate = async () => {
        // Proceed with update logic
        setLoading(true);
        try {
            const apiData = {
                "fullName": fullName,
                "comments": comment,
                "phoneNumber": contactNo,
                "email": email,
                "services": service,
                "address": address,
                "businessName": businessName,
                "designation": designation,
                "website": website,
            };
            const result = await putRequestWithBodyAndToken(`${baseURl}lead/${location?.state?.itemData?.id}`, accessToken, apiData)
            setShowUpdateModal(false);
            // New navigation logic based on user role
            if ((userData?.roleTitle || '').toLowerCase() === 'agent') {
                navigate('/userdashboard/userLeadsList');
            } else {
                navigate('/home/leadsList');
            }
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
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}lead/${location.state?.itemData?.id}`, accessToken)
            toast.success(result.message);
            setShowDeleteModal(false);
            // navigate(-1);
            if ((userData?.roleTitle || '').toLowerCase() === 'agent') {
                navigate('/userdashboard/userLeadsList');
            } else {
                navigate('/home/leadsList');
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
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
                    Heading={'Maintain Lead'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        {/* <GoBack /> */}
                    </div>

                    <div className="flex flex-col mt-4 gap-4">
                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Full Name"}
                                    Fontsize={16}
                                    required={true}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Full Name"
                                inputValue={fullName}
                                onInputChange={handleFullNameChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Designation"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Designation"
                                inputValue={designation}
                                onInputChange={handleDesignationChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        <div className="flex items-center gap-x-6 flex-wrap">
                            <div className="w-48">
                                <Heading
                                    Fontweight={500}
                                    color={"var(--sidebar-text-primary)"}
                                    Heading={"Business Name"}
                                    Fontsize={16}
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Business Name"
                                inputValue={businessName}
                                onInputChange={handleBusinessNameChange}
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
                                />
                            </div>
                            <LabeledInput
                                inputPlaceholder="Enter Website"
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
                                inputPlaceholder="Enter Contact No"
                                inputValue={contactNo}
                                onInputChange={handleContactNoChange}
                                addAgent={true}
                                className="h-8 w-80 px-2"
                            />
                        </div>

                        {!loading && (
                            <div className="flex items-center gap-x-6 flex-wrap">
                                <div className="w-48">
                                    <Heading
                                        Fontweight={500}
                                        color={"var(--sidebar-text-primary)"}
                                        Heading={"Service"}
                                        Fontsize={16}
                                        required={true}
                                    />
                                </div>
                                <DropdownMenu menuItems={data} selectedValue={service} addAgent={true} defaultText={'Select Service'} onSelect={handleRoleChange} className="w-80" />
                            </div>
                        )}

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
                            />
                        </div>
                        <textarea
                            type="text"
                            placeholder="Address"
                            value={address}
                            onChange={handleAddressChange}
                            className={`mt-1 p-3 w-[60%]`}
                            rows={2}
                            style={{
                                border: '1px solid var(--sidebar-selected-bg)',
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
                                Heading={"Comment"}
                                Fontsize={16}
                            />
                        </div>
                        <textarea
                            type="text"
                            placeholder="Comment"
                            value={comment}
                            onChange={handleCommentChange}
                            className={`mt-1 p-3 w-[60%]`}
                            rows={4}
                            style={{
                                border: '1px solid var(--sidebar-selected-bg)',
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
                            backgroundColor={''}
                            width={130}
                            title={'Delete'}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            className={"bg-red-500"}
                            onClick={handleDeleteLead}
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
            <DeleteConfirmationModal
                open={showDeleteModal}
                title="Delete Lead"
                subtitle="Are you sure you want to delete"
                entityName={fullName || "this lead"}
                warningMessage="This action cannot be undone. The lead will be permanently removed from the system."
                onCancel={cancelDelete}
                onDelete={confirmDelete}
                isLoading={loading}
            />
            <UpdateConfirmationModal
                open={showUpdateModal}
                title="Update Lead"
                subtitle="Are you sure you want to update"
                entityName={fullName || "this lead"}
                updateMessage="This action will update the lead details with the current changes."
                onCancel={cancelUpdate}
                onUpdate={confirmUpdate}
                isLoading={loading}
            />
        </div>
    );
};

export default EditLead;
