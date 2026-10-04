import { useEffect, useMemo, useState } from "react";
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
import PermissionsTable from "../../Components/PermissionsTable";
import CategoryTable from "../../Components/CategoryTable";
import Loader from "../../Components/Loader";
import {
    canAccessAuditLog,
    filterMenuByAuditLogAccess,
    filterMenuByTenantFeatures,
    getEnabledFeatureCodes,
} from "../../Utils/tenantFeatures";
import { GROUP_SWITCH_SCOPE } from "../../Utils/tenantGroup";

const AddRoles = () => {
    const accessToken = useSelector((state) => state.auth.accessToken);
    const tenantFeatures = useSelector((state) => state.auth.tenantFeatures ?? []);
    const auditLogModules = useSelector((state) => state.auth.auditLogModules ?? []);
    const navigate = useNavigate();
    const [permissions, setPermissions] = useState([]);
    const [agentCode, setAgentCode] = useState("")
    const [loading, setLoading] = useState(false);
    // const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const handlePermissionsChange = (updatedPermissions) => {
        setPermissions((prev) => {
            const next = Array.isArray(updatedPermissions) ? [...updatedPermissions] : [];
            if (prev.includes(GROUP_SWITCH_SCOPE) && !next.includes(GROUP_SWITCH_SCOPE)) {
                next.push(GROUP_SWITCH_SCOPE);
            }
            return next;
        });
    };
    const handleCategoriesChange = (updatedCategories) => {
        setSelectedCategories(updatedCategories);
    };
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
        {
            id: 2,
            name: "Operation",
            category: "accounting",
            subItems: [
                { id: 5, name: "Inventory", route: "allInventory", category: "inventory" },
                { id: 41, name: "Serial Number Report", route: "snReport", category: "inventory" },
                { id: 42, name: "Returns", route: "returns", category: "inventory" },
                { id: 44, name: "Shipping", route: "shipping", category: "inventory" },
                { id: 6, name: "Items & Services", route: "itemsAndServices", category: "inventory" },
            ],
        },
        {
            id: 39,
            name: "Internal Ticket Management",
            category: "system",
            subItems: [
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
            ],
        },
        {
            id: 23,
            name: "Project Management",
            category: "project",
            subItems: [
                { id: 24, name: "Project Board", route: "projectTracking", category: "project" },
                { id: 26, name: "Assigned Tasks", route: "myTask", category: "project" },
            ],
        },
        {
            id: 28,
            name: "Performance Management",
            category: "project",
            subItems: [
                { id: 30, name: "Performance Tracking Reports", route: "trackingReports", category: "project" },
                { id: 43, name: "Project Performance Reports", route: "performanceReport", category: "project" },
                { id: 31, name: "Tracker Set-up", route: "trackerSetup", category: "project" },
            ],
        },
        {
            id: 33,
            name: "Client Management/CRM",
            category: "crm",
            subItems: [
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
                    id: 41,
                    name: "Tech Installation",
                    route: "techInstallationList",
                    category: "crm",
                },
                { id: 32, name: "Support Forms", route: "support", category: "system" },
                { id: 12, name: "Support Request", route: "policy", category: "hr" },
                {
                    id: 22,
                    name: "Vendors",
                    route: "vendors",
                    category: "accounting",
                },
            ],
        },
        {
            id: 47,
            name: "Agent Management",
            category: "hr",
            subItems: [
                {
                    id: 46,
                    name: "Agents Application",
                    route: "agentManagement",
                    category: "hr",
                },
                { id: 8, name: "Agent Payout", route: "agentPayout", category: "accounting" },
            ],
        },
        {
            id: 57,
            name: "Sales Management",
            category: "sale",
            subItems: [
                { id: 21, name: "Leads", route: "leadsList", category: "crm" },
                { id: 60, name: "Opportunities", route: "opportunities", category: "sale" },
                { id: 61, name: "Quotations", route: "quotations", category: "sale" },
                { id: 62, name: "Sales Orders", route: "salesOrder", category: "sale" },
                { id: 34, name: "Sales Form Builder", route: "salesFormBuilder", category: "sale" },
            ],
        },
        {
            id: 38,
            name: "Workforce Management",
            category: "hr",
            subItems: [
                {
                    id: 34,
                    name: "Attendance Reports",
                    route: "attendanceReport",
                    category: "hr",
                },
                {
                    id: 35,
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
                    id: 10,
                    name: "Memos",
                    route: "memo",
                    category: "communication",
                },
                {
                    id: 13,
                    name: "Training & Development",
                    route: "training",
                    category: "hr",
                },
            ],
        },
        {
            id: 44,
            name: "Accounting Management",
            category: "accounting",
            subItems: [
                { id: 45, name: "Chart of Accounts", route: "chartOfAccounts", category: "accounting" },
                {
                    id: 52,
                    name: "Expenses",
                    category: "accounting",
                    subItems: [
                        { id: 5202, name: "Suppliers", route: "suppliers", category: "accounting" },
                        { id: 7, name: "Purchase", route: "purchase", category: "inventory" },
                    ],
                },
                {
                    id: 54,
                    name: "Sales",
                    category: "accounting",
                    subItems: [
                        { id: 5401, name: "Customers", route: "salesCustomers", category: "accounting" },
                        { id: 4, name: "Invoices", route: "invoices", category: "accounting" },
                    ],
                },
                {
                    id: 56,
                    name: "Reports",
                    category: "accounting",
                    subItems: [
                        { id: 51, name: "Accounts Reports", route: "accountsReports", category: "accounting" },
                        { id: 14, name: "Payout Report", route: "reports", category: "accounting" },
                    ],
                },
                { id: 48, name: "Journal Entry", route: "journalEntry", category: "accounting" },
                { id: 53, name: "Payroll", route: "payroll", category: "hr" },
            ],
        },
        {
            id: 40,
            name: "Settings",
            category: "system",
            subItems: [
                { id: 19, name: "Change Password", route: "changePassword", category: "system" },
                { id: 11, name: "Form", route: "form", category: "hr" },
                {
                    id: 72,
                    name: "Audit Log",
                    route: "auditLog",
                    category: "system",
                    skipFeatureGate: true,
                },
            ],
        },
    ]);

    const tenantFilteredMenuList = useMemo(() => {
        const enabledFeatureCodes = getEnabledFeatureCodes(tenantFeatures);
        const byTenant = filterMenuByTenantFeatures(menuList, enabledFeatureCodes);
        return filterMenuByAuditLogAccess(
            byTenant,
            canAccessAuditLog(auditLogModules, tenantFeatures)
        );
    }, [menuList, tenantFeatures, auditLogModules]);

    const handleAgentCodeChange = (e) => {
        setAgentCode(e.target.value);
    };

    const handleLogin = async () => {
        if (agentCode.trim() === ""
        ) {
            toast.error("Role is required");
            return;
        }

        // Proceed with login logic
        setLoading(true);
        try {
            const apiData = {
                "title": agentCode,
                "scopes": permissions,
                "categories": selectedCategories
            };
            const result = await postRequestWithBodyAndToken(`${baseURl}role`, accessToken, apiData)
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
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={'Add Roles'}
                Fontsize={30}
            // Tailwind CSS classes
            />

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
            <div style={{ marginTop: 10,  borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
            <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                    </div>
                    {loading ? (
                        <div className="text-center w-full mx-auto">
                            <Loader message="Loading..." subMessage="Please wait" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <div className="mt-4 ">
                                    <div className="">
                                        <LabeledInput
                                            label="Role"
                                            inputPlaceholder="Enter Role"
                                            inputValue={agentCode}
                                            onInputChange={handleAgentCodeChange}
                                            addAgent={true}
                                        />
                                    </div>
                                </div>
                                <label
                                    className="mt-4 flex items-start gap-3 cursor-pointer"
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
                                            Grants this role permission to switch into subsidiary companies.
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div className="mt-8">
                                <PermissionsTable menuList={tenantFilteredMenuList} onPermissionsChange={handlePermissionsChange} />
                            </div>

                            <div className="mt-8">
                                <CategoryTable onPermissionsChange={handleCategoriesChange} />
                            </div>
                            <div style={{ display: '' }} className="flex justify-end mt-12 mb-10 gap-3" >
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddRoles;
