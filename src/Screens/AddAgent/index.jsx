import { useEffect, useMemo, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack, IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonCustom from "../../Components/ButtonCustom";
import LabeledInput from "../../Components/LabeledInput";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { deleteRequest, getRequestWithOutBody, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { baseURl } from "../../Config/systemConfig";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import DropdownMenu from "../../Components/dropdownMenu";
import MultiSelectDropdown from "../../Components/MultiSelectDropdown";
import { countries } from "../../Config/countries";
import UpdateConfirmationModal from "../../Components/UpdateModal";
import {
    canAccessAuditLog,
    filterMenuByAuditLogAccess,
    filterMenuByTenantFeatures,
    getEnabledFeatureCodes,
} from "../../Utils/tenantFeatures";
import {
    getStaffSaveErrorMessage,
    getStaffSaveFieldErrors,
    normalizePayFrequency,
    PAY_FREQUENCY_OPTIONS,
} from "./validation";
import { GROUP_SWITCH_SCOPE } from "../../Utils/tenantGroup";
import LogoUpload from "../../Components/LogoUpload";
import {
    extractUploadedProfilePicture,
    getProfilePictureUrl,
    isProfileImageFile,
    PROFILE_PICTURE_FILE_TYPE,
} from "../../Utils/profile";

const STAFF_TABS = {
    details: "details",
    permissions: "permissions",
};

const CATEGORY_DISPLAY_NAMES = {
    system: "System",
    files: "Files",
    project: "Project",
    communication: "Communication",
    inventory: "Inventory",
    accounting: "Accounting",
    crm: "CRM",
    hr: "HR",
    sale: "Sales",
};

const formatCategoryName = (category) =>
    CATEGORY_DISPLAY_NAMES[category] ||
    String(category || "Other")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

const fieldRowClass = "flex items-center gap-x-6 flex-wrap";
const fieldControlClass = "w-full sm:w-80 min-w-0";

const FieldLabel = ({ label, required = false }) => (
    <div className="w-48 shrink-0">
        <Heading
            Fontweight={500}
            color={"var(--sidebar-text-primary)"}
            Heading={label}
            Fontsize={16}
            required={required}
        />
    </div>
);

const AddAgent = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const tenantFeatures = useSelector((state) => state.auth.tenantFeatures ?? []);
    const auditLogModules = useSelector((state) => state.auth.auditLogModules ?? []);
    const navigate = useNavigate();
    const location = useLocation();
    const id = location?.state?.rowData?.id;
    const isEdit = useMemo(() => !!id, [id]);

    const [enabled, setEnabled] = useState(!isEdit)
    const [agentCode, setAgentCode] = useState("")
    const [revenueShare, setRevenueShare] = useState("")
    const [basis, setBasis] = useState("")
    const [agentName, setAgentName] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [email, setEmail] = useState("")
    const [userName, setUserName] = useState("")
    const [designation, setDesignation] = useState("")
    const [password, setPassword] = useState("")
    const [address, setAddress] = useState("")
    const [role, setRole] = useState("")
    const [roleId, setRoleId] = useState("")
    const [loading, setLoading] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [agentData, setAgentData] = useState([]);
    const [roleList, setRoleList] = useState([]);
    const [isChecked, setIsChecked] = useState(false); // Add state for checkbox
    const [workLocation, setWorkLocation] = useState("");
    const [commission, setCommission] = useState("");
    const [totalHours, setTotalHours] = useState("");
    const [grossPay, setGrossPay] = useState("");
    const [employeeType, setEmployeeType] = useState("");
    const [payFrequency, setPayFrequency] = useState("");
    const [daysOff, setDaysOff] = useState([]);
    const [taxAccounts, setTaxAccounts] = useState([]);
    const [assignPermissions, setAssignPermissions] = useState(false);
    const [permissions, setPermissions] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [activeTab, setActiveTab] = useState(STAFF_TABS.details);
    const [errors, setErrors] = useState({});
    const [profilePicture, setProfilePicture] = useState(null);
    const [initialProfilePicture, setInitialProfilePicture] = useState(null);

    const clearError = (field) =>
        setErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev));

    const [menuList, setMenuList] = useState([
        {
            id: 1,
            name: "Dashboard",
            route: "dashboardScreen",
            category: "system",
        },
        {
            id: 27,
            name: "Drive",
            route: "storageBucket",
            category: "files",
        },
        {
            id: 25,
            name: "Calendar",
            route: "calendar",
            category: "project",
        },
        {
            id: 29,
            name: "Chat",
            route: "chat",
            category: "communication",
        },
        {
            id: 30,
            name: "Notifications",
            route: "notifications",
            category: "communication",
        },
        { id: 5, name: "Inventory", route: "allInventory", category: "inventory" },
        { id: 41, name: "Serial Number Report", route: "snReport", category: "inventory" },
        { id: 42, name: "Returns", route: "returns", category: "inventory" },
        { id: 44, name: "Shipping", route: "shipping", category: "inventory" },
        { id: 6, name: "Items & Services", route: "itemsAndServices", category: "inventory" },
        { id: 8, name: "Agent Payout", route: "agentPayout", category: "accounting" },
        { id: 3, name: "Internal Tickets", route: "agentsTickets", category: "system" },
        { id: 20, name: "Inactive Tickets", route: "invalidTickets", category: "system" },
        {
            id: 18,
            name: "Ticket Types",
            route: "ticketTypes",
            category: "system",
        },
        {
            id: 16,
            name: "Ticket Category",
            route: "category",
            category: "system",
        },
        { id: 24, name: "Project Board", route: "projectTracking", category: "project" },
        { id: 26, name: "Assigned Tasks", route: "myTask", category: "project" },
        { id: 63, name: "Performance Tracking Reports", route: "trackingReports", category: "project" },
        { id: 43, name: "Project Performance Reports", route: "performanceReport", category: "project" },
        { id: 31, name: "Tracker Set-up", route: "trackerSetup", category: "project" },
        { id: 34, name: "Application", route: "adminApplication", category: "crm" },
        { id: 35, name: "Board View", route: "merchantSupport", category: "crm" },
        { id: 73, name: "Merchant Change Request", route: "merchantChangeRequest", category: "crm", anyFeatureCodes: ["change-requests", "change-request", "customers"] },
        { id: 36, name: "Support Setup", route: "supportSetup", category: "crm" },
        { id: 37, name: "Support Ticket", route: "maintananceTicket", category: "crm" },
        {
            id: 14,
            name: "Merchant Info",
            route: "customerList",
            category: "crm",
        },
        {
            id: 64,
            name: "Tech Installation",
            route: "techInstallationList",
            category: "crm",
        },
        { id: 32, name: "Support Forms", route: "support", category: "system" },
        { id: 12, name: "Support Request", route: "policy", category: "hr" },
        {
            id: 46,
            name: "Agents Application",
            route: "agentManagement",
            category: "hr",
        },
        {
            id: 65,
            name: "Attendance Reports",
            route: "attendanceReport",
            category: "hr",
        },
        {
            id: 66,
            name: "Attendance Logs",
            route: "attendanceLog",
            category: "hr",
        },
        {
            id: 9,
            name: "Employee List",
            route: "agent",
            category: "system",
        },
        {
            id: 15,
            name: "Roles",
            route: "roles",
            category: "system",
        },
        {
            id: 13,
            name: "Training & Development",
            route: "training",
            category: "hr",
        },
        { id: 67, name: "Sales Form Builder", route: "salesFormBuilder", category: "sale" },
        {
            id: 21,
            name: "Leads",
            route: "leadsList",
            category: "crm",
        },
        { id: 60, name: "Opportunities", route: "opportunities", category: "sale" },
        { id: 61, name: "Quotations", route: "quotations", category: "sale" },
        { id: 62, name: "Sales Orders", route: "salesOrder", category: "sale" },
        { id: 45, name: "Chart of Accounts", route: "chartOfAccounts", category: "accounting" },
        { id: 5202, name: "Suppliers", route: "suppliers", category: "accounting" },
        { id: 7, name: "Purchase", route: "purchase", category: "inventory" },
        { id: 5401, name: "Customers", route: "salesCustomers", category: "accounting" },
        { id: 4, name: "Invoices", route: "invoices", category: "accounting" },
        { id: 51, name: "Accounts Reports", route: "accountsReports", category: "accounting" },
        { id: 68, name: "Payout Report", route: "reports", category: "accounting" },
        { id: 48, name: "Journal Entry", route: "journalEntry", category: "accounting" },
        { id: 53, name: "Payroll", route: "payroll", category: "hr" },
        { id: 22, name: "Vendors", route: "vendors", category: "accounting" },
        { id: 19, name: "Change Password", route: "changePassword", category: "system" },
        {
            id: 72,
            name: "Audit Log",
            route: "auditLog",
            category: "system",
            skipFeatureGate: true,
        },
        { id: 10, name: "Memos", route: "memo", category: "communication" },
        { id: 11, name: "Form", route: "form", category: "hr" },
    ]);

    const tenantFilteredMenuList = useMemo(() => {
        const enabledFeatureCodes = getEnabledFeatureCodes(tenantFeatures);
        const byTenant = filterMenuByTenantFeatures(menuList, enabledFeatureCodes);
        return filterMenuByAuditLogAccess(
            byTenant,
            canAccessAuditLog(auditLogModules, tenantFeatures)
        );
    }, [menuList, tenantFeatures, auditLogModules]);

    const groupedPermissionCategories = useMemo(() => {
        const byCategory = {};
        (tenantFilteredMenuList || []).forEach((item) => {
            if (!item?.route) return;
            const code = String(item.category || "other").trim() || "other";
            if (!byCategory[code]) byCategory[code] = [];
            byCategory[code].push(item);
        });
        const preferredOrder = [
            "system",
            "crm",
            "sale",
            "inventory",
            "accounting",
            "project",
            "hr",
            "communication",
            "files",
        ];
        const codes = Object.keys(byCategory).sort((a, b) => {
            const ai = preferredOrder.indexOf(a);
            const bi = preferredOrder.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        return codes.map((code) => ({
            code,
            name: formatCategoryName(code),
            permissions: byCategory[code],
        }));
    }, [tenantFilteredMenuList]);

    const selectedPermissionSet = useMemo(
        () => new Set(permissions || []),
        [permissions]
    );

    useEffect(() => {
        if (!permissions.length || !groupedPermissionCategories.length) return;
        setExpandedCategories((prev) => {
            const next = { ...prev };
            let changed = false;
            groupedPermissionCategories.forEach((mod) => {
                const hasSelected = mod.permissions.some((p) =>
                    permissions.includes(p.route)
                );
                if (hasSelected && !next[mod.code]) {
                    next[mod.code] = true;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [permissions, groupedPermissionCategories]);

    const fetchRoles = () => {
        // setLoading(true)
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}role`, accessToken
        )
            .then(result => {
                setRoleList(result?.data || [])
                // setCompanyCategoryArray(options);
                // setCompanyCategoryArray(result)setLoadin
                setLoading(false)
            })
            .catch(error => {
                setLoading(false)
            })
    }

    const fetchAgentData = () => {
        setLoading(true); // Set loading state before fetching
        getRequestWithOutBody(
            `${baseURl}user/${id}`, accessToken
        )
            .then(result => {
                const data = result?.data;
                setAgentData(data)
                setAgentCode(data?.code)
                setRevenueShare(data?.revenueShare)
                setBasis(data?.basis)
                setAgentName(data?.name)
                setContactNo(data?.contact)
                setEmail(data?.email)
                setUserName(data?.username)
                setAddress(data?.address)
                setRole(data?.roleTitle)
                setRoleId(data?.roleId)
                setIsChecked(data?.taxExempt);
                setEnabled(data?.status === "active"); // Set enabled based on status
                setWorkLocation(data?.workLocations || "")
                setCommission(data?.commission ?? "")
                setTotalHours(data?.totalHours ?? "")
                setGrossPay(data?.grossPay ?? "")
                setDesignation(data?.designation || "")
                // New payroll fields
                setEmployeeType(data?.employeeType || "")
                setPayFrequency(data?.payFrequency || "")
                setDaysOff(Array.isArray(data?.daysOff) ? data.daysOff.map((d, i) => ({ name: d, id: i + 1 })) : [])
                setPermissions(
                    Array.isArray(data?.permissions)
                        ? [
                            ...data.permissions.filter((route) =>
                                tenantFilteredMenuList.some((m) => m.route === route)
                            ),
                            ...(data.permissions.includes(GROUP_SWITCH_SCOPE) ? [GROUP_SWITCH_SCOPE] : []),
                        ]
                        : []
                );
                setTaxAccounts(Array.isArray(data?.taxAccount) ? data.taxAccount.map((t, i) => ({ name: t, id: i + 1 })) : [])
                setAssignPermissions((data?.permissions || []).length > 0 ? true : false);
                const existingPicture = getProfilePictureUrl(data);
                setProfilePicture(existingPicture || null);
                setInitialProfilePicture(existingPicture || null);
                // Fetch roles independently
                fetchRoles()
            })
            .catch(error => {
                // Even if user fetch fails, try to fetch roles
                fetchRoles()
            })
    }

    useEffect(() => {
        if (isEdit && id) {
            fetchAgentData()
        } else {
            fetchRoles()
        }
    }, [])
    const handleAgentCodeChange = (e) => {
        setAgentCode(e.target.value);
        clearError("agentCode");
    };
    const handleRevenueShareChange = (e) => {
        setRevenueShare(e.target.value);
        clearError("revenueShare");
    };
    const handleBasisChange = (e) => {
        setBasis(e.target.value);
        clearError("basis");
    };
    const handleAgentNameChange = (e) => {
        setAgentName(e.target.value);
        clearError("agentName");
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
        clearError("contactNo");
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        clearError("email");
    };
    const handleUserNameChange = (e) => {
        setUserName(e.target.value);
        clearError("userName");
    };
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        clearError("password");
    };
    const handleAddressChange = (e) => {
        setAddress(e.target.value);
        clearError("address");
    };
    const handleRoleChange = (month) => {
        setRole(month);
        clearError("role");
    };
    const handleRoleIdChange = (month) => {
        setRoleId(month);
    };
    const handleCheckboxChange = () => { // Add this function
        setIsChecked(!isChecked);
    };
    const handleWorkLocationChange = (val) => {
        setWorkLocation(val);
        clearError("workLocation");
    };
    const handleEmployeeTypeChange = (val) => {
        setEmployeeType(val);
        clearError("employeeType");
    };
    const handlePayFrequencyChange = (val) => {
        setPayFrequency(val);
        clearError("payFrequency");
    };
    const handleCommissionChange = (e) => {
        setCommission(e.target.value);
        clearError("commission");
    };
    const handleTotalHoursChange = (e) => {
        setTotalHours(e.target.value);
        clearError("totalHours");
    };
    const handleGrossPayChange = (e) => {
        setGrossPay(e.target.value);
        clearError("grossPay");
    };
    const handleDesignationChange = (e) => {
        setDesignation(e.target.value);
        clearError("designation");
    };
    const isEmpty = (value) =>
        value === null || value === undefined || String(value).trim() === "";

    const resolveProfilePicturePayload = async () => {
        if (Array.isArray(profilePicture) && profilePicture[0]) {
            const file = profilePicture[0];
            if (!isProfileImageFile(file)) {
                throw new Error("Please choose an image file");
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("type", PROFILE_PICTURE_FILE_TYPE);
            const result = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
            const uploadedUrl = extractUploadedProfilePicture(result);
            if (!uploadedUrl) {
                throw new Error("Failed to upload profile picture");
            }
            return uploadedUrl;
        }

        if (profilePicture === null && initialProfilePicture) {
            return null;
        }

        return undefined;
    };

    const handleSave = async () => {
        setErrors({});

        const fieldErrors = {};
        if (isEmpty(agentCode)) fieldErrors.agentCode = true;
        if (isEmpty(revenueShare)) fieldErrors.revenueShare = true;
        if (isEmpty(basis)) fieldErrors.basis = true;
        if (isEmpty(agentName)) fieldErrors.agentName = true;
        if (isEmpty(contactNo)) fieldErrors.contactNo = true;
        if (isEmpty(email)) fieldErrors.email = true;
        if (isEmpty(userName)) fieldErrors.userName = true;
        if (isEmpty(address)) fieldErrors.address = true;
        if (isEmpty(role)) fieldErrors.role = true;
        if (!isEdit && isEmpty(password)) fieldErrors.password = true;

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            const fieldLabels = {
                agentCode: "Agent Code",
                revenueShare: "Revenue Share",
                basis: "By Rate (%)",
                agentName: "Agent Name",
                contactNo: "Contact No",
                email: "Email",
                userName: "User Name",
                address: "Address",
                role: "Role",
                password: "Password",
            };
            const missingFields = Object.keys(fieldErrors)
                .map((key) => fieldLabels[key])
                .filter(Boolean);
            toast.error(
                missingFields.length === 1
                    ? `${missingFields[0]} is required`
                    : `Please fill required fields: ${missingFields.join(", ")}`
            );
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        if (String(contactNo).length < 10) {
            toast.error("Contact number must be at least 10 characters long");
            return;
        }

        if (isEdit) {
            setShowUpdateModal(true);
            return;
        }

        if (password.length < 4) {
            toast.error("Password must be at least 4 characters long");
            return;
        }

        setLoading(true);
        try {
            const selectedDaysOff = (daysOff || [])
                .filter(i => !(i?.user?.isDeleted))
                .map(i => i?.name || i?.title || i?.value);
            const selectedTaxAccounts = (taxAccounts || [])
                .filter(i => !(i?.user?.isDeleted))
                .map(i => i?.name || i?.title || i?.value);
            const normalizedPayFrequency = normalizePayFrequency(payFrequency);
            const apiData = {
                "code": agentCode,
                "name": agentName,
                "contact": contactNo,
                "email": email,
                "revenueShare": parseFloat(revenueShare),
                "basis": parseFloat(basis),
                "address": address,
                "username": userName,
                "designation": designation,
                "password": password,
                "isActive": enabled,
                "roleTitle": role,
                "taxExempt": isChecked,
                "workLocations": workLocation || null,
                "commission": commission !== "" ? parseFloat(commission) : null,
                "totalHours": totalHours !== "" ? parseInt(totalHours) : null,
                "grossPay": grossPay !== "" ? parseFloat(grossPay) : null,
                "payFrequency": normalizedPayFrequency,
                "daysOff": selectedDaysOff && selectedDaysOff.length ? selectedDaysOff : [],
                "taxAccount": selectedTaxAccounts && selectedTaxAccounts.length ? selectedTaxAccounts : [],
                "employeeType": employeeType || null,
                permissions: assignPermissions ? permissions : [],
            };
            const profilePictureValue = await resolveProfilePicturePayload();
            if (profilePictureValue !== undefined) {
                apiData.profilePicture = profilePictureValue;
            }
            const result = await postRequestWithBodyAndToken(`${baseURl}user`, accessToken, apiData)
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            const apiFieldErrors = getStaffSaveFieldErrors(error);
            if (Object.keys(apiFieldErrors).length > 0) {
                setErrors((prev) => ({ ...prev, ...apiFieldErrors }));
            }
            toast.error(getStaffSaveErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const confirmUpdate = async () => {
        // Proceed with update logic
        setLoading(true);
        try {
            const selectedDaysOff = (daysOff || [])
                .filter(i => !(i?.user?.isDeleted))
                .map(i => i?.name || i?.title || i?.value);
            const selectedTaxAccounts = (taxAccounts || [])
                .filter(i => !(i?.user?.isDeleted))
                .map(i => i?.name || i?.title || i?.value);
            const normalizedPayFrequency = normalizePayFrequency(payFrequency);
            const apiData = {
                "code": agentCode,
                "name": agentName,
                "contact": contactNo,
                "email": email,
                "revenueShare": parseFloat(revenueShare),
                "basis": parseFloat(basis),
                "address": address,
                "username": userName,
                "designation": designation,
                "status": enabled ? 'active' : 'in-active',
                "roleTitle": role,
                "roleId": roleId,
                "taxExempt": isChecked,
                "workLocations": workLocation || null,
                "commission": commission !== "" ? parseFloat(commission) : null,
                "totalHours": totalHours !== "" ? parseInt(totalHours) : null,
                "grossPay": grossPay !== "" ? parseFloat(grossPay) : null,
                "payFrequency": normalizedPayFrequency,
                "daysOff": selectedDaysOff && selectedDaysOff.length ? selectedDaysOff : [],
                "taxAccount": selectedTaxAccounts && selectedTaxAccounts.length ? selectedTaxAccounts : [],
                "employeeType": employeeType || null,
                permissions: assignPermissions ? permissions : [],
            };
            const profilePictureValue = await resolveProfilePicturePayload();
            if (profilePictureValue !== undefined) {
                apiData.profilePicture = profilePictureValue;
            }
            const result = await putRequestWithBodyAndToken(`${baseURl}user/${id}`, accessToken, apiData)
            setShowUpdateModal(false);
            toast.success(result.message);
            navigate(-1);
        } catch (error) {
            const apiFieldErrors = getStaffSaveFieldErrors(error);
            if (Object.keys(apiFieldErrors).length > 0) {
                setErrors((prev) => ({ ...prev, ...apiFieldErrors }));
            }
            toast.error(getStaffSaveErrorMessage(error));
            setShowUpdateModal(false);
        } finally {
            setLoading(false);
        }
    };

    const cancelUpdate = () => {
        setShowUpdateModal(false);
    };

    const togglePermission = (route) => {
        setPermissions((prev) => {
            const next = prev.includes(route)
                ? prev.filter((r) => r !== route)
                : [...prev, route];
            return next;
        });
        setAssignPermissions(true);
    };

    const toggleCategoryPermissions = (categoryPermissions) => {
        const routes = (categoryPermissions || []).map((p) => p.route).filter(Boolean);
        setPermissions((prev) => {
            const allSelected = routes.every((route) => prev.includes(route));
            return allSelected
                ? prev.filter((route) => !routes.includes(route))
                : Array.from(new Set([...prev, ...routes]));
        });
        setAssignPermissions(true);
    };

    const toggleCategoryExpanded = (code) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [code]: !prev[code],
        }));
    };

    const selectAllPermissions = () => {
        const allRoutes = (tenantFilteredMenuList || [])
            .map((item) => item.route)
            .filter(Boolean);
        setPermissions((prev) => (
            prev.includes(GROUP_SWITCH_SCOPE)
                ? [...allRoutes, GROUP_SWITCH_SCOPE]
                : allRoutes
        ));
        setAssignPermissions(true);
    };

    const clearAllPermissions = () => {
        setPermissions((prev) => (
            prev.includes(GROUP_SWITCH_SCOPE) ? [GROUP_SWITCH_SCOPE] : []
        ));
    };

    const handleDeleteAgent = async () => {
        // Proceed with delete logic
        setLoading(true);
        try {
            const result = await deleteRequest(`${baseURl}user/${id}`, accessToken)
            toast.success(result.message);
            navigate(-1);
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
                        marginTop: 4,
                    }}
                >
                    <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
                </Button>
                <Heading
                    Fontweight={700}
                    color={'var(--sidebar-text-primary)'}
                    Heading={isEdit ? 'Maintain Staff Member' : 'Add Staff Member'}
                    Fontsize={30}
                />
            </div>

            <div className="w-full" style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ borderRadius: 14 }} className="sm:m-2 p-3 sm:p-4 m-2">
                    <div className="flex space-x-4 border-b mt-1 border-gray-200">
                        <button
                            type="button"
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === STAFF_TABS.details
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTab(STAFF_TABS.details)}
                        >
                            Staff Details
                        </button>
                        <button
                            type="button"
                            className={`pb-2 px-4 text-sm font-medium ${activeTab === STAFF_TABS.permissions
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-[#0C79F7]'
                                }`}
                            onClick={() => setActiveTab(STAFF_TABS.permissions)}
                        >
                            Permissions
                        </button>
                    </div>

                    {activeTab === STAFF_TABS.details && (
                    <>
                    <div className="flex flex-col gap-4 mb-6 mt-4">
                        <Heading
                            Fontweight={600}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Personal Details:'}
                            Fontsize={18}
                        />

                        <div className={fieldRowClass}>
                            <FieldLabel label="Profile Picture" />
                            <div className={fieldControlClass}>
                                <LogoUpload
                                    onLogoChange={setProfilePicture}
                                    currentLogo={typeof profilePicture === 'string' ? profilePicture : null}
                                    label=""
                                    emptyText="Click to upload photo"
                                    removeLabel="Remove Photo"
                                    size={96}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Status" />
                            <div className={`flex items-center gap-3 ${fieldControlClass}`}>
                                <Heading
                                    Fontweight={500}
                                    color={'var(--sidebar-text-primary)'}
                                    Heading={enabled ? 'Active' : 'In-Active'}
                                    Fontsize={16}
                                />
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

                        <div className={fieldRowClass}>
                            <FieldLabel label="Agent Code" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Agent Code"
                                    inputValue={agentCode}
                                    onInputChange={handleAgentCodeChange}
                                    eventScreen={true}
                                    error={!!errors.agentCode}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Revenue Share" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Revenue Share"
                                    inputValue={revenueShare}
                                    onInputChange={handleRevenueShareChange}
                                    eventScreen={true}
                                    error={!!errors.revenueShare}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="By Rate (%)" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter By Rate (%)"
                                    inputValue={basis}
                                    onInputChange={handleBasisChange}
                                    eventScreen={true}
                                    error={!!errors.basis}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Agent Name" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Agent Name"
                                    inputValue={agentName}
                                    onInputChange={handleAgentNameChange}
                                    eventScreen={true}
                                    error={!!errors.agentName}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Contact No" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Contact No"
                                    inputValue={contactNo}
                                    onInputChange={handleContactNoChange}
                                    eventScreen={true}
                                    error={!!errors.contactNo}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Email" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Email"
                                    inputValue={email}
                                    onInputChange={handleEmailChange}
                                    eventScreen={true}
                                    error={!!errors.email}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="User Name" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter User Name"
                                    inputValue={userName}
                                    onInputChange={handleUserNameChange}
                                    eventScreen={true}
                                    error={!!errors.userName}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Designation" />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Designation"
                                    inputValue={designation}
                                    onInputChange={handleDesignationChange}
                                    eventScreen={true}
                                    error={!!errors.designation}
                                />
                            </div>
                        </div>

                        {!isEdit && (
                            <div className={fieldRowClass}>
                                <FieldLabel label="Password" required />
                                <div className={fieldControlClass}>
                                    <LabeledInput
                                        inputPlaceholder="Enter Password"
                                        inputValue={password}
                                        onInputChange={handlePasswordChange}
                                        eventScreen={true}
                                        inputType="password"
                                        error={!!errors.password}
                                    />
                                </div>
                            </div>
                        )}

                        <div className={fieldRowClass}>
                            <FieldLabel label="Role" required />
                            <div className={fieldControlClass}>
                                <DropdownMenu
                                    menuItems={roleList}
                                    selectedValue={role}
                                    handleRoleIdChange={handleRoleIdChange}
                                    defaultText={'Select Role'}
                                    onSelect={handleRoleChange}
                                    fullWidth={true}
                                    error={!!errors.role}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Tax Exempt" />
                            <label className={`flex items-center gap-2 text-sm ${fieldControlClass}`}>
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={isChecked}
                                    onChange={handleCheckboxChange}
                                />
                                Tax Exempt on Payment
                            </label>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Address" required />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Address"
                                    inputValue={address}
                                    onInputChange={handleAddressChange}
                                    eventScreen={true}
                                    error={!!errors.address}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mb-6">
                        <Heading
                            Fontweight={600}
                            color={'var(--sidebar-text-primary)'}
                            Heading={'Payroll Info:'}
                            Fontsize={18}
                        />

                        <div className={fieldRowClass}>
                            <FieldLabel label="Employee Type" />
                            <div className={fieldControlClass}>
                                <DropdownMenu
                                    menuItems={[{ name: 'Full Time' }, { name: 'Part Time' }, { name: '1099 Contractor' }, { name: 'W2 Employee' }]}
                                    selectedValue={employeeType || ''}
                                    defaultText={'--select--'}
                                    onSelect={handleEmployeeTypeChange}
                                    fullWidth={true}
                                    error={!!errors.employeeType}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Work Location" />
                            <div className={fieldControlClass}>
                                <DropdownMenu
                                    menuItems={countries}
                                    selectedValue={workLocation || ''}
                                    defaultText={'--select--'}
                                    onSelect={handleWorkLocationChange}
                                    fullWidth={true}
                                    error={!!errors.workLocation}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Commission" />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Commission"
                                    inputValue={commission}
                                    onInputChange={handleCommissionChange}
                                    eventScreen={true}
                                    error={!!errors.commission}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Total Hours" />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Total Hours"
                                    inputValue={totalHours}
                                    onInputChange={handleTotalHoursChange}
                                    eventScreen={true}
                                    error={!!errors.totalHours}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Pay Frequency" />
                            <div className={fieldControlClass}>
                                <DropdownMenu
                                    menuItems={PAY_FREQUENCY_OPTIONS}
                                    selectedValue={payFrequency ? payFrequency.replace(/\b\w/g, c => c.toUpperCase()).replace('-', '-') : '--select --'}
                                    defaultText={payFrequency ? payFrequency : '--select --'}
                                    onSelect={handlePayFrequencyChange}
                                    fullWidth={true}
                                    error={!!errors.payFrequency}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Days Off" />
                            <div className={fieldControlClass}>
                                <MultiSelectDropdown
                                    menuItems={[
                                        { name: 'Monday', id: 1 },
                                        { name: 'Tuesday', id: 2 },
                                        { name: 'Wednesday', id: 3 },
                                        { name: 'Thursday', id: 4 },
                                        { name: 'Friday', id: 5 },
                                        { name: 'Saturday', id: 6 },
                                        { name: 'Sunday', id: 7 },
                                    ]}
                                    selectedValue={daysOff}
                                    onChange={setDaysOff}
                                    fullWidth={true}
                                    formField={true}
                                    defaultText={'--select day--'}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Gross Pay" />
                            <div className={fieldControlClass}>
                                <LabeledInput
                                    inputPlaceholder="Enter Gross Pay"
                                    inputValue={grossPay}
                                    onInputChange={handleGrossPayChange}
                                    eventScreen={true}
                                    error={!!errors.grossPay}
                                />
                            </div>
                        </div>

                        <div className={fieldRowClass}>
                            <FieldLabel label="Tax Account" />
                            <div className={fieldControlClass}>
                                <MultiSelectDropdown
                                    menuItems={[
                                        { name: 'Federal', id: 'federal' },
                                        { name: 'Income Tax', id: 'income' },
                                        { name: 'Medicare Tax', id: 'medicare' },
                                        { name: 'Social Security', id: 'ss' },
                                        { name: 'State Income', id: 'state' },
                                        { name: 'Tax', id: 'tax' },
                                        { name: 'Local Tax', id: 'local' },
                                        { name: 'Not Applicable', id: 'na' },
                                    ]}
                                    selectedValue={taxAccounts}
                                    onChange={setTaxAccounts}
                                    fullWidth={true}
                                    formField={true}
                                    defaultText={'--select --'}
                                />
                            </div>
                        </div>
                    </div>
                    </>
                    )}

                    {activeTab === STAFF_TABS.permissions && (
                    <div className="flex flex-col gap-4 mt-4">
                        <div className={fieldRowClass}>
                            <FieldLabel label="Custom Permissions" />
                            <label className={`flex items-center gap-2 text-sm ${fieldControlClass}`}>
                                <input
                                    type="checkbox"
                                    checked={assignPermissions}
                                    onChange={() => setAssignPermissions(!assignPermissions)}
                                    className="h-4 w-4 cursor-pointer accent-blue-600"
                                />
                                Assign Custom Permissions
                            </label>
                        </div>

                        {assignPermissions ? (
                            <div className="flex flex-col gap-3 mt-2">
                                <label
                                    className="flex items-start gap-3 cursor-pointer"
                                    style={{ color: 'var(--sidebar-text-primary)' }}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 cursor-pointer accent-blue-600"
                                        checked={permissions.includes(GROUP_SWITCH_SCOPE)}
                                        onChange={() => {
                                            setPermissions((prev) => (
                                                prev.includes(GROUP_SWITCH_SCOPE)
                                                    ? prev.filter((scope) => scope !== GROUP_SWITCH_SCOPE)
                                                    : [...prev, GROUP_SWITCH_SCOPE]
                                            ));
                                        }}
                                    />
                                    <span>
                                        <span className="block text-sm font-semibold">Allow company switching</span>
                                        <span className="block text-xs mt-0.5" style={{ color: 'var(--dashboard-text-secondary)' }}>
                                            Grants this employee permission to switch into subsidiary companies.
                                        </span>
                                    </span>
                                </label>
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Module Access'}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className="text-sm"
                                            style={{ color: 'var(--sidebar-text-primary)', opacity: 0.75 }}
                                        >
                                            {permissions.filter((route) => route !== GROUP_SWITCH_SCOPE).length} of {tenantFilteredMenuList.length} permissions selected
                                        </span>
                                        <button
                                            type="button"
                                            onClick={selectAllPermissions}
                                            className="text-sm px-3 py-1.5 rounded-md border"
                                            style={{
                                                borderColor: 'rgba(67, 121, 238, 0.35)',
                                                color: 'rgba(67, 121, 238, 1)',
                                                backgroundColor: 'transparent',
                                            }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearAllPermissions}
                                            className="text-sm px-3 py-1.5 rounded-md border"
                                            style={{
                                                borderColor: 'rgba(0,0,0,0.12)',
                                                color: 'var(--sidebar-text-primary)',
                                                backgroundColor: 'transparent',
                                            }}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full max-w-4xl">
                                    {groupedPermissionCategories.length === 0 ? (
                                        <div
                                            className="text-sm py-4 px-3 rounded-lg"
                                            style={{
                                                backgroundColor: 'var(--dashboard-tab-box)',
                                                color: 'var(--sidebar-text-primary)',
                                                opacity: 0.7,
                                            }}
                                        >
                                            No permissions available.
                                        </div>
                                    ) : (
                                        groupedPermissionCategories.map((mod) => {
                                            const routes = mod.permissions.map((p) => p.route);
                                            const selectedCount = routes.filter((route) =>
                                                selectedPermissionSet.has(route)
                                            ).length;
                                            const allSelected =
                                                routes.length > 0 && selectedCount === routes.length;
                                            const someSelected =
                                                selectedCount > 0 && selectedCount < routes.length;
                                            const isExpanded = !!expandedCategories[mod.code];

                                            return (
                                                <div
                                                    key={mod.code}
                                                    className="rounded-xl overflow-hidden"
                                                    style={{
                                                        border: '1px solid rgba(0,0,0,0.08)',
                                                        backgroundColor: 'var(--dashboard-tab-box)',
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 px-3 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={allSelected}
                                                            ref={(el) => {
                                                                if (el) el.indeterminate = someSelected;
                                                            }}
                                                            onChange={() =>
                                                                toggleCategoryPermissions(mod.permissions)
                                                            }
                                                            className="h-4 w-4 cursor-pointer accent-blue-600"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="flex-1 flex items-center justify-between gap-2 text-left"
                                                            onClick={() => toggleCategoryExpanded(mod.code)}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                {isExpanded ? (
                                                                    <IoIosArrowDown size={16} color="var(--sidebar-text-primary)" />
                                                                ) : (
                                                                    <IoIosArrowForward size={16} color="var(--sidebar-text-primary)" />
                                                                )}
                                                                <span
                                                                    className="font-semibold truncate"
                                                                    style={{ color: 'var(--sidebar-text-primary)' }}
                                                                >
                                                                    {mod.name}
                                                                </span>
                                                            </div>
                                                            <span
                                                                className="text-xs whitespace-nowrap px-2 py-0.5 rounded-full"
                                                                style={{
                                                                    backgroundColor: selectedCount
                                                                        ? 'rgba(67, 121, 238, 0.12)'
                                                                        : 'rgba(0,0,0,0.06)',
                                                                    color: selectedCount
                                                                        ? 'rgba(67, 121, 238, 1)'
                                                                        : 'var(--sidebar-text-primary)',
                                                                }}
                                                            >
                                                                {selectedCount}/{routes.length}
                                                            </span>
                                                        </button>
                                                    </div>

                                                    {isExpanded && (
                                                        <div
                                                            className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 pb-3 pt-1"
                                                            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
                                                        >
                                                            {mod.permissions.map((item) => {
                                                                const checked = selectedPermissionSet.has(item.route);
                                                                return (
                                                                    <label
                                                                        key={item.route}
                                                                        className="flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer"
                                                                        style={{
                                                                            backgroundColor: checked
                                                                                ? 'rgba(67, 121, 238, 0.08)'
                                                                                : 'transparent',
                                                                            border: '1px solid transparent',
                                                                        }}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() => togglePermission(item.route)}
                                                                            className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
                                                                        />
                                                                        <span className="min-w-0">
                                                                            <span
                                                                                className="block text-sm font-medium"
                                                                                style={{ color: 'var(--sidebar-text-primary)' }}
                                                                            >
                                                                                {item.name}
                                                                            </span>
                                                                        </span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p
                                className="text-sm"
                                style={{ color: 'var(--sidebar-text-primary)', opacity: 0.7 }}
                            >
                                Enable custom permissions to review and select access for this employee. Without custom permissions, access is based on their assigned role.
                            </p>
                        )}
                    </div>
                    )}

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                        <BottonCustom
                            backgroundColor={'transparent'}
                            width={130}
                            title={'Cancel'}
                            height={40}
                            color={'var(--dashboard-text-primary)'}
                            fontSize={16}
                            fontWeight={500}
                            border={'1px solid var(--sidebar-selected-bg)'}
                            onClick={() => navigate(-1)}
                        />
                        {isEdit && (
                            <BottonCustom
                                backgroundColor={''}
                                width={130}
                                title={'Delete'}
                                height={40}
                                color={'var(--sidebar-text-selected)'}
                                fontSize={16}
                                fontWeight={500}
                                className={"bg-red-500"}
                                onClick={handleDeleteAgent}
                                disabled={loading}
                            />
                        )}
                        <BottonCustom
                            backgroundColor={'rgba(67, 121, 238, 1)'}
                            width={130}
                            title={loading ? 'Saving...' : (isEdit ? 'Update' : 'Save')}
                            height={40}
                            color={'var(--sidebar-text-selected)'}
                            fontSize={16}
                            fontWeight={500}
                            onClick={handleSave}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>
            <UpdateConfirmationModal
                open={showUpdateModal}
                title="Update Staff Member"
                subtitle="Are you sure you want to update"
                entityName={agentName || "this staff member"}
                updateMessage="This action will update the staff member details, payroll information, and permissions with the current changes."
                onCancel={cancelUpdate}
                onUpdate={confirmUpdate}
                isLoading={loading}
            />
        </div>
    );
};

export default AddAgent;
