import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Heading from "../../Components/Heading";
import { IoIosArrowBack, IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { Switch } from "@headlessui/react";
import BottonWithIcon from "../../Components/ButtonWithIcon";
import BottonCustom from "../../Components/ButtonCustom";
import GoBack from "../../Components/GoBack";
import LabeledInput from "../../Components/LabeledInput";
import { deleteRequest, getRequestWithOutBody, patchComment, postRequestWithBodyAndToken, postRequestWithFormData, putRequestWithBodyAndToken } from "../../Api/fetch";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { baseURl } from "../../Config/systemConfig";
import { toast } from "react-toastify";
import DropdownMenu from "../../Components/dropdownMenu";
import CustomTimePicker from "../../Components/CustomTimePicker";
import UploadFile from "../../Components/UploadFile";
import UploadSecondFile from "../../Components/UploadSecondFile";
import FileUpload from "../../Components/FileUpload";
import LogoUpload from "../../Components/LogoUpload";
import dayjs from "dayjs";
import { countries } from 'countries-list';
import ProductItem from "../../Components/ProductItem";
import { applicationServiceData, businessTypedata, ownershipTypeData, platformData, usStates, taxTypeData } from "../../types/Data";
import { styled } from '@mui/material/styles';
import { formatContactNumber } from "../../Utils/helper";
import { taxFormats } from "../../Utils/helper";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import Loader from "../../Components/Loader";
import { fetchTenantsForParentPicker, setTenantParent } from "../../Api/tenantGroupApi";

const FEATURE_DISPLAY_NAMES = {
    items: 'Items & Services',
    users: 'Employee List',
    tickets: 'Internal Tickets',
    projects: 'Project Board',
    tasks: 'Assigned Tasks',
    'tracker-setup': 'Tracker Set-up',
    'tracking-reports': 'Performance Tracking Reports',
    'performance-report': 'Project Performance Reports',
    memos: 'Memos',
    attendance: 'Attendance Reports',
    policy: 'Support Request',
    support: 'Support Forms',
    'agent-requests': 'Agents Application',
    // Client Management / CRM
    applications: 'Application',
    'merchant-support': 'Board View',
    'change-requests': 'Merchant Change Request',
    'support-setup': 'Support Setup',
    'maintenance-ticket': 'Support Ticket',
    customers: 'Merchant Info',
    'tech-installation': 'Tech Installation',
    vendors: 'Vendors',
};

const LEGACY_FEATURE_NAMES = {
    'Items And Services': 'Items & Services',
    'Staff List': 'Employee List',
    'S.N Report': 'Serial Number Report',
    'In-Active Tickets': 'Inactive Tickets',
    'Project List': 'Project Board',
    'My Task': 'Assigned Tasks',
    'Tracking Reports': 'Performance Tracking Reports',
    'Performance Reports': 'Project Performance Reports',
    'Tracker Setup': 'Tracker Set-up',
    Tickets: 'Internal Tickets',
    Memo: 'Memos',
    Training: 'Training & Development',
    'Attendance Report': 'Attendance Reports',
    'Attendance Log': 'Attendance Logs',
    'Agent Management': 'Agents Application',
    'Agent Requests': 'Agents Application',
    Policy: 'Support Request',
    'Customer Support': 'Support Forms',
    'Change Requests': 'Merchant Change Request',
    'Change Request': 'Merchant Change Request',
    'Merchant Change Requests': 'Merchant Change Request',
    Customers: 'Merchant Info',
    'Customer List': 'Merchant Info',
    'Board View': 'Board View',
    'Support Setup': 'Support Setup',
    'Support Ticket': 'Support Ticket',
    'Tech Installation': 'Tech Installation',
};

const MODULE_DISPLAY_NAMES = {
    tickets: 'Internal Ticket Management',
    project: 'Project Management',
    projects: 'Project Management',
    crm: 'Client Management/CRM',
    'merchant-support': 'Client Management/CRM',
    'change-requests': 'Client Management/CRM',
    sale: 'Sales Management',
    sales: 'Sales Management',
    hr: 'Workforce Management',
    staff: 'Workforce Management',
    accounting: 'Accounting Management',
    setting: 'Settings',
    settings: 'Settings',
};

const formatModuleName = (code) => {
    const key = String(code || '').trim().toLowerCase();
    if (MODULE_DISPLAY_NAMES[key]) return MODULE_DISPLAY_NAMES[key];
    return String(code || '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const displayFeatureName = (code, fallback) => {
    const key = String(code || '').trim().toLowerCase();
    if (FEATURE_DISPLAY_NAMES[key]) return FEATURE_DISPLAY_NAMES[key];
    const raw = String(fallback || '').trim();
    return LEGACY_FEATURE_NAMES[raw] || raw;
};

const normalizeIdList = (list) =>
    (Array.isArray(list) ? list : [])
        .map((id) => (typeof id === 'number' ? id : Number(id)))
        .filter((id) => !Number.isNaN(id));

const HeaderWrapper2 = styled('div')({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    // flexWrap: 'wrap',
    overflowX: 'auto', // Add horizontal scrolling
    whiteSpace: 'nowrap', // Prevent text from wrapping
});

const AddTenants = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [taxCode, settaxCode] = useState("")
    const [comments, setComments] = useState("")
    const [enabled, setEnabled] = useState(false)
    const [applicationId, setApplicationId] = useState("")
    const [merchantFirstName, setMerchantFirstName] = useState("")
    const [merchantLastName, setMerchantLastName] = useState("")
    const [leadName, setLeadName] = useState("")
    const [legalAddress, setLegalAddress] = useState("")
    const [legalCity, setLegalCity] = useState("")
    const [legalState, setLegalState] = useState("")
    const [legalZipCode, setLegalZipCode] = useState("")
    const [applicationType, setApplicationType] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [email, setEmail] = useState("")
    const [dbaAddress, setDbaAddress] = useState("")
    const [businessState, setBusinessState] = useState("")
    const [businessCity, setBusinessCity] = useState("")
    const [businessZipCode, setBusinessZipCode] = useState("")
    const [dbaPhoneNumber, setdbaPhoneNumber] = useState("")
    const [website, setWebsite] = useState("")
    const [contactNo, setContactNo] = useState("")
    const [productsDescription, setProductsDescription] = useState("")
    const [feinNumber, setFeinNumber] = useState("")
    const [ownerFirstName, setOwnerFirstName] = useState("")
    const [ownerLastName, setOwnerLastName] = useState("")
    const [residentialAddress, setResidentialAddress] = useState("")
    const [ownerPhoneNumber, setOwnerPhoneNumber] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [ownerShipCity, setOwnerShipCity] = useState("")
    const [ownerShipState, setOwnerShipState] = useState("")
    const [ownerShipZip, setOwnerShipZip] = useState("")
    const [ownerEmail, setOwnerEmail] = useState("")
    const [socialSecurityNumber, setSocialSecurityNumber] = useState("")
    const [bankName, setbankName] = useState("")
    const [accountNumber, setAccountNumber] = useState("")
    const [routingNumber, setRoutingNumber] = useState("")
    const [businessType, setBusinessType] = useState("")
    const [loading, setLoading] = useState(true);
    const [agentData, setAgentData] = useState([]);
    const accessToken = useSelector((state) => state.auth.accessToken);
    const [ownershipType, setOwnershipType] = useState("")
    const [plan, setPlan] = useState("")
    const [platform, setPlatform] = useState("")
    const [formDate, setFormDate] = useState("")
    const [uploadedFile, setUploadedFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedFileName, setUploadedFileName] = useState(null); // New state for uploaded file name
    const [uploadedSecondFile, setUploadedSecondFile] = useState(null); // Step 1: Add state for the uploaded file
    const [uploadedSecondFileName, setUploadedSecondFileName] = useState(null); // New state for uploaded file name
    const [logoFile, setLogoFile] = useState(null); // State for logo upload
    const [initialLogoUrl, setInitialLogoUrl] = useState(null); // Existing logo URL when editing
    const [ebtFnsNumber, setEbtFnsNumber] = useState("");
    const [fetchedData, setFetchedData] = useState(null);
    const [averageSale, setAverageSale] = useState("");
    const [maxSale, setMaxSale] = useState("");
    const [monthlySale, setMonthlySale] = useState("");
    const [fetchedData2, setFetchedData2] = useState([]); // New state variable
    const [preferencesData, setPreferencesData] = useState(null);
    const [shipmentType, setShipmentType] = useState(null);
    const [formValues, setFormValues] = useState({});
    const countryOptions = Object.entries(countries).map(([code, { name }]) => ({
        title: name,
        id: name,
        value: name,
    }));
    const [activeTab, setActiveTab] = useState('merchantInfo');
    const [taxType, setTaxType] = useState("")
    const [showAccountNo, setShowAccountNo] = useState(false);
    const [showRoutingNo, setShowRoutingNo] = useState(false);
    const [showTaxCode, setShowTaxCode] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("Active")
    const [createAgentRole, setCreateAgentRole] = useState(false)
    const [selectedFeatureIds, setSelectedFeatureIds] = useState([])
    const [moduleList, setModuleList] = useState([])
    const [allFeatures, setAllFeatures] = useState([])
    const [initialFeatureIds, setInitialFeatureIds] = useState([])
    const [pendingModuleCodes, setPendingModuleCodes] = useState([])
    const [expandedModules, setExpandedModules] = useState({})
    const didAutoExpandRef = useRef(false)
    const [parentTenantId, setParentTenantId] = useState('')
    const [parentTenantOptions, setParentTenantOptions] = useState([])

    const isEditMode = Boolean(applicationId);

    const fetchData2 = () => {
        setLoading(true);
        getRequestWithOutBody(
            `${baseURl}feature`, accessToken
        )
            .then(result => {
                const featureList = Array.isArray(result?.data?.data)
                    ? result.data.data
                    : Array.isArray(result?.data)
                        ? result.data
                        : [];
                const normalized = featureList
                    .filter((f) => f && (f.id !== undefined && f.id !== null))
                    .map((f) => {
                        const id = f.id;
                        const name = displayFeatureName(
                            f.code,
                            f.name || f.code || f.title || String(f.id)
                        );
                        const moduleCode =
                            f.moduleCode ??
                            f.module_code ??
                            f.module ??
                            f.category ??
                            f?.feature?.moduleCode ??
                            f?.feature?.module_code;
                        return {
                            id,
                            name,
                            value: id,
                            code: f.code,
                            moduleCode: moduleCode != null ? String(moduleCode).trim() : undefined,
                            description: f.description || '',
                        };
                    });
                if (normalized.length) setAllFeatures(normalized);
                setLoading(false)
            })
            .catch(() => {
                setLoading(false)
            })
    }
    const fetchData3 = () => {
        getRequestWithOutBody(
            `${baseURl}feature/modules`, accessToken
        )
            .then(result => {
                const modulesList = Array.isArray(result?.data?.data)
                    ? result.data.data
                    : Array.isArray(result?.data)
                        ? result.data
                        : [];
                const normalized = modulesList
                    .filter((m) => typeof m === 'string' && m.trim())
                    .map((m) => {
                        const id = m.trim();
                        return {
                            id,
                            name: formatModuleName(id),
                            value: id,
                        };
                    });
                setModuleList(normalized);
            })
            .catch(() => {})
    }

    useEffect(() => {
        fetchData2()
        fetchData3()
        if (accessToken) {
            fetchTenantsForParentPicker(accessToken)
                .then((rows) => setParentTenantOptions(Array.isArray(rows) ? rows : []))
                .catch(() => setParentTenantOptions([]));
        }
    }, [])

    // Expand moduleCodes (edit fallback) into featureIds once features are loaded
    useEffect(() => {
        if (!allFeatures.length || !pendingModuleCodes.length) return;
        if (selectedFeatureIds.length) {
            setPendingModuleCodes([]);
            return;
        }
        const codes = pendingModuleCodes.map((c) => String(c).trim()).filter(Boolean);
        const ids = allFeatures
            .filter((f) => codes.includes(String(f?.moduleCode || '').trim()))
            .map((f) => f.id);
        setSelectedFeatureIds(ids);
        setInitialFeatureIds(ids);
        setPendingModuleCodes([]);
    }, [allFeatures, pendingModuleCodes, selectedFeatureIds.length])

    const groupedModules = useMemo(() => {
        const byModule = {};
        (allFeatures || []).forEach((f) => {
            const code = String(f?.moduleCode || '').trim();
            if (!code) return;
            if (!byModule[code]) byModule[code] = [];
            byModule[code].push(f);
        });

        const order = (moduleList || []).map((m) => m.id);
        const codes = order.length
            ? [...order, ...Object.keys(byModule).filter((c) => !order.includes(c))]
            : Object.keys(byModule).sort((a, b) => a.localeCompare(b));

        return codes
            .filter((code) => byModule[code]?.length)
            .map((code) => ({
                code,
                name: moduleList.find((m) => m.id === code)?.name || formatModuleName(code),
                features: byModule[code]
                    .slice()
                    .sort((a, b) => String(a.name).localeCompare(String(b.name))),
            }));
    }, [allFeatures, moduleList]);

    const selectedIdSet = useMemo(
        () => new Set(normalizeIdList(selectedFeatureIds)),
        [selectedFeatureIds]
    );

    const featureByCode = useMemo(() => {
        const map = {};
        (allFeatures || []).forEach((f) => {
            const code = String(f?.code || '').trim().toLowerCase();
            if (code) map[code] = f;
        });
        return map;
    }, [allFeatures]);

    // If source feature is selected, each listed target feature becomes required
    const FEATURE_DEPENDENCIES = useMemo(
        () => {
            const staticDeps = [
            {
                sourceCode: 'suppliers',
                requiredCodes: ['vendors', 'purchase-orders'],
                messagesByCode: {
                    vendors: 'Suppliers selected — Vendors is required. Please check Vendors to continue.',
                    'purchase-orders': 'Suppliers selected — Purchase Orders is required. Please check Purchase Orders to continue.',
                },
                toast: 'Vendors and Purchase Orders are required when Suppliers is selected',
                requiredWhenLabel: 'Required when Suppliers is selected',
            },
            {
                sourceCode: 'invoices',
                requiredCodes: ['items', 'users', 'roles', 'customers', 'inventory'],
                messagesByCode: {
                    items: 'Invoices selected — Items & Services is required. Please check Items & Services to continue.',
                    users: 'Invoices selected — Employee List is required. Please check Employee List to continue.',
                    roles: 'Invoices selected — Roles is also required. Please check Roles to continue.',
                    customers: 'Invoices selected — Merchant Info (Customers) is required. Please check Merchant Info to continue.',
                    inventory: 'Invoices selected — Inventory is required. Please check Inventory to continue.',
                },
                toast: 'Items & Services, Employee List, Roles, Merchant Info (Customers), and Inventory are required when Invoices is selected',
                requiredWhenLabel: 'Required when Invoices is selected',
            },
            {
                sourceCode: 'items',
                requiredCodes: ['item-category', 'accounts', 'support-setup'],
                messagesByCode: {
                    'item-category': 'Items & Services selected — Item Category is required. Please check Item Category to continue.',
                    accounts: 'Items & Services selected — Chart of Accounts is required. Please check Chart of Accounts to continue.',
                    'support-setup': 'Items & Services selected — Support Setup is required. Please check Support Setup to continue.',
                },
                toast: 'Item Category, Chart of Accounts, and Support Setup are required when Items & Services is selected',
                requiredWhenLabel: 'Required when Items & Services is selected',
            },
            {
                sourceCode: 'support-setup',
                requiredCodes: ['items'],
                messagesByCode: {
                    items: 'Support Setup selected — Items & Services is required. Please check Items & Services to continue.',
                },
                toast: 'Items & Services is required when Support Setup is selected',
                requiredWhenLabel: 'Required when Support Setup is selected',
            },
            {
                sourceCode: 'tickets',
                requiredCodes: ['customers', 'users', 'ticket-types', 'ticket-categories', 'roles'],
                messagesByCode: {
                    customers: 'Internal Tickets selected — Merchant Info (Customers) is required. Please check Merchant Info to continue.',
                    users: 'Internal Tickets selected — Employee List is required. Please check Employee List to continue.',
                    'ticket-types': 'Internal Tickets selected — Ticket Types is required. Please check Ticket Types to continue.',
                    'ticket-categories': 'Internal Tickets selected — Ticket Category is required. Please check Ticket Category to continue.',
                    roles: 'Internal Tickets selected — Roles is also required. Please check Roles to continue.',
                },
                toast: 'Customers, Employee List, Ticket Types, Ticket Category, and Roles are required when Internal Tickets is selected',
                requiredWhenLabel: 'Required when Internal Tickets is selected',
            },
            {
                sourceCode: 'dashboard',
                requiredCodes: ['tickets'],
                messagesByCode: {
                    tickets: 'Dashboard selected — Internal Tickets is required. Please check Tickets to continue.',
                },
                toast: 'Internal Tickets is required when Dashboard is selected',
                requiredWhenLabel: 'Required when Dashboard is selected',
            },
            {
                sourceCode: 'change-password',
                requiredCodes: ['users', 'roles'],
                messagesByCode: {
                    users: 'Change Password selected — Employee List is required. Please check Employee List to continue.',
                    roles: 'Change Password selected — Roles is also required. Please check Roles to continue.',
                },
                toast: 'Employee List and Roles are required when Change Password is selected',
                requiredWhenLabel: 'Required when Change Password is selected',
            },
            {
                sourceCode: 'leads',
                requiredCodes: ['sales-forms', 'items', 'users', 'sales-lead-conversion', 'sales-account', 'sales-activity', 'sales-opportunity'],
                messagesByCode: {
                    'sales-forms': 'Leads selected — Sales Form Builder is required. Please check Sales Form Builder to continue.',
                    items: 'Leads selected — Items & Services is required. Please check Items & Services to continue.',
                    users: 'Leads selected — Employee List is required. Please check Employee List to continue.',
                    'sales-lead-conversion': 'Leads selected — Sales Lead Conversion is required. Please check Sales Lead Conversion to continue.',
                    'sales-account': 'Leads selected — Sales Account is required. Please check Sales Account to continue.',
                    'sales-activity': 'Leads selected — Sales Activity is required. Please check Sales Activity to continue.',
                    'sales-opportunity': 'Leads selected — Sales Opportunity is required. Please check Sales Opportunity to continue.',
                },
                toast: 'Sales Form Builder, Items & Services, Employee List, Sales Lead Conversion, Sales Account, Sales Activity, and Sales Opportunity are required when Leads is selected',
                requiredWhenLabel: 'Required when Leads is selected',
            },
            {
                sourceCode: 'sales-opportunity',
                requiredCodes: [
                    'users',
                    'roles',
                    'items',
                    'support-setup',
                    'accounts',
                    'customers',
                    'sales-forms',
                    'sales-activity',
                    'sales-account',
                ],
                messagesByCode: {
                    users: 'Sales Opportunity selected — Employee List is required. Please check Employee List to continue.',
                    roles: 'Sales Opportunity selected — Roles is required. Please check Roles to continue.',
                    items: 'Sales Opportunity selected — Items & Services is required. Please check Items & Services to continue.',
                    'support-setup': 'Sales Opportunity selected — Support Setup is required. Please check Support Setup to continue.',
                    accounts: 'Sales Opportunity selected — Chart of Accounts is required. Please check Chart of Accounts to continue.',
                    customers: 'Sales Opportunity selected — Merchant Info (Customers) is required. Please check Merchant Info to continue.',
                    'sales-forms': 'Sales Opportunity selected — Sales Form Builder is required. Please check Sales Form Builder to continue.',
                    'sales-activity': 'Sales Opportunity selected — Sales Activity is required. Please check Sales Activity to continue.',
                    'sales-account': 'Sales Opportunity selected — Sales Account is required. Please check Sales Account to continue.',
                },
                toast: 'Employee List, Roles, Items, Support Setup, Accounts, Customers, Sales Forms, Sales Activity, and Sales Account are required when Sales Opportunity is selected',
                requiredWhenLabel: 'Required when Sales Opportunity is selected',
            },
            {
                sourceCode: 'tracking-reports',
                requiredCodes: ['users', 'projects', 'subtasks'],
                messagesByCode: {
                    users: 'Performance Tracking Reports selected — Employee List is required. Please check Employee List to continue.',
                    projects: 'Performance Tracking Reports selected — Project Board is required. Please check Project Board to continue.',
                    subtasks: 'Performance Tracking Reports selected — Subtasks is required. Please check Subtasks to continue.',
                },
                toast: 'Employee List, Project Board, and Subtasks are required when Performance Tracking Reports is selected',
                requiredWhenLabel: 'Required when Performance Tracking Reports is selected',
            },
            {
                sourceCode: 'projects',
                requiredCodes: ['tasks', 'tracker-setup', 'tickets', 'files'],
                messagesByCode: {
                    tasks: 'Project Board selected — Assigned Tasks is required. Please check Assigned Tasks to continue.',
                    'tracker-setup': 'Project Board selected — Tracker Set-up is required. Please check Tracker Set-up to continue.',
                    tickets: 'Project Board selected — Internal Tickets is required. Please check Tickets to continue.',
                    files: 'Project Board selected — Files is required. Please check Files to continue.',
                },
                toast: 'Assigned Tasks, Tracker Set-up, Tickets, and Files are required when Project Board is selected',
                requiredWhenLabel: 'Required when Project Board is selected',
            },
            {
                sourceCode: 'tracker-setup',
                requiredCodes: ['tasks'],
                messagesByCode: {
                    tasks: 'Tracker Set-up selected — Assigned Tasks is required. Please check Assigned Tasks to continue.',
                },
                toast: 'Assigned Tasks is required when Tracker Set-up is selected',
                requiredWhenLabel: 'Required when Tracker Set-up is selected',
            },
            {
                sourceCode: 'tasks',
                requiredCodes: ['projects', 'subtasks'],
                messagesByCode: {
                    projects: 'Assigned Tasks selected — Project Board is required. Please check Project Board to continue.',
                    subtasks: 'Assigned Tasks selected — Subtasks is required. Please check Subtasks to continue.',
                },
                toast: 'Project Board and Subtasks are required when Assigned Tasks is selected',
                requiredWhenLabel: 'Required when Assigned Tasks is selected',
            },
            {
                sourceCode: 'subtasks',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Subtasks selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Subtasks is selected',
                requiredWhenLabel: 'Required when Subtasks is selected',
            },
            {
                sourceCode: 'performance-report',
                requiredCodes: ['projects'],
                messagesByCode: {
                    projects: 'Project Performance Reports selected — Project Board is required. Please check Project Board to continue.',
                },
                toast: 'Project Board is required when Project Performance Reports is selected',
                requiredWhenLabel: 'Required when Project Performance Reports is selected',
            },
            {
                sourceCode: 'meetings',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Calendar selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Calendar is selected',
                requiredWhenLabel: 'Required when Calendar is selected',
            },
            {
                sourceCode: 'purchase-orders',
                requiredCodes: ['vendors', 'items'],
                messagesByCode: {
                    vendors: 'Purchase selected — Vendors is required. Please check Vendors to continue.',
                    items: 'Purchase selected — Items & Services is required. Please check Items & Services to continue.',
                },
                toast: 'Vendors and Items & Services are required when Purchase is selected',
                requiredWhenLabel: 'Required when Purchase is selected',
            },
            {
                sourceCode: 'inventory',
                requiredCodes: ['purchase-orders'],
                messagesByCode: {
                    'purchase-orders': 'Inventory selected — Purchase is required. Please check Purchase to continue.',
                },
                toast: 'Purchase is required when Inventory is selected',
                requiredWhenLabel: 'Required when Inventory is selected',
            },
            {
                sourceCode: 'attendance',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Attendance Reports selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Attendance Reports is selected',
                requiredWhenLabel: 'Required when Attendance Reports is selected',
            },
            {
                sourceCode: 'agent-requests',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Agents Application selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Agents Application is selected',
                requiredWhenLabel: 'Required when Agents Application is selected',
            },
            {
                sourceCode: 'payouts',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Agent Payout selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Agent Payout is selected',
                requiredWhenLabel: 'Required when Agent Payout is selected',
            },
            {
                sourceCode: 'storage-bucket',
                requiredCodes: ['files', 'folders', 'sharing', 'users'],
                messagesByCode: {
                    files: 'Drive selected — Files is required. Please check Files to continue.',
                    folders: 'Drive selected — Folders is required. Please check Folders to continue.',
                    sharing: 'Drive selected — File Sharing is required. Please check File Sharing to continue.',
                    users: 'Drive selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Files, Folders, File Sharing, and Employee List are required when Drive is selected',
                requiredWhenLabel: 'Required when Drive is selected',
            },
            {
                sourceCode: 'tech-installation',
                requiredCodes: ['site-visits', 'items', 'customers'],
                messagesByCode: {
                    'site-visits': 'Tech Installation selected — Site Visits is required. Please check Site Visits to continue.',
                    items: 'Tech Installation selected — Items & Services is required. Please check Items & Services to continue.',
                    customers: 'Tech Installation selected — Merchant Info (Customers) is required. Please check Merchant Info to continue.',
                },
                toast: 'Site Visits, Items & Services, and Merchant Info (Customers) are required when Tech Installation is selected',
                requiredWhenLabel: 'Required when Tech Installation is selected',
            },
            {
                sourceCode: 'site-visits',
                requiredCodes: ['tech-installation'],
                messagesByCode: {
                    'tech-installation': 'Site Visits selected — Tech Installation is required. Please check Tech Installation to continue.',
                },
                toast: 'Tech Installation is required when Site Visits is selected',
                requiredWhenLabel: 'Required when Site Visits is selected',
            },
            {
                sourceCode: 'applications',
                requiredCodes: ['items', 'users'],
                messagesByCode: {
                    items: 'Applications selected — Items & Services is required. Please check Items & Services to continue.',
                    users: 'Applications selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Items & Services and Employee List are required when Applications is selected',
                requiredWhenLabel: 'Required when Applications is selected',
            },
            {
                sourceCode: 'merchant-support',
                requiredCodes: ['tickets', 'applications', 'support-setup'],
                messagesByCode: {
                    tickets: 'Board View selected — Internal Tickets is required. Please check Tickets to continue.',
                    applications: 'Board View selected — Applications is required. Please check Applications to continue.',
                    'support-setup': 'Board View selected — Support Setup is required. Please check Support Setup to continue.',
                },
                toast: 'Tickets, Applications, and Support Setup are required when Board View is selected',
                requiredWhenLabel: 'Required when Board View is selected',
            },
            {
                sourceCode: 'change-requests',
                requiredCodes: ['customers'],
                messagesByCode: {
                    customers:
                        'Merchant Change Request selected — Merchant Info is required. Please check Merchant Info to continue.',
                },
                toast: 'Merchant Info is required when Merchant Change Request is selected',
                requiredWhenLabel: 'Required when Merchant Change Request is selected',
            },
            {
                sourceCode: 'memos',
                requiredCodes: ['users', 'roles'],
                messagesByCode: {
                    users: 'Memos selected — Employee List is required. Please check Employee List to continue.',
                    roles: 'Memos selected — Roles is also required with Employee List. Please check Roles to continue.',
                },
                toast: 'Employee List and Roles are required when Memos is selected',
                requiredWhenLabel: 'Required when Memos is selected',
            },
            {
                sourceCode: 'customers',
                requiredCodes: ['users', 'roles'],
                messagesByCode: {
                    users: 'Customers selected — Employee List is required. Please check Employee List to continue.',
                    roles: 'Customers selected — Roles is also required. Please check Roles to continue.',
                },
                toast: 'Employee List and Roles are required when Customers is selected',
                requiredWhenLabel: 'Required when Customers is selected',
            },
            {
                sourceCode: 'sales-customers',
                requiredCodes: ['users', 'roles', 'invoices', 'journal'],
                messagesByCode: {
                    users: 'Customers selected — Employee List is required. Please check Employee List to continue.',
                    roles: 'Customers selected — Roles is also required. Please check Roles to continue.',
                    invoices: 'Customers selected — Invoices is required. Please check Invoices to continue.',
                    journal: 'Customers selected — Journal Entry is required. Please check Journal Entry to continue.',
                },
                toast: 'Employee List, Roles, Invoices, and Journal Entry are required when Customers is selected',
                requiredWhenLabel: 'Required when Customers is selected',
            },
            {
                sourceCode: 'users',
                requiredCodes: ['roles'],
                messagesByCode: {
                    roles: 'Employee List selected — Roles is required. Please check Roles to continue.',
                },
                toast: 'Roles is required when Employee List is selected',
                requiredWhenLabel: 'Required when Employee List is selected',
            },
            {
                sourceCode: 'chat',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Chat selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Chat is selected',
                requiredWhenLabel: 'Required when Chat is selected',
            },
            {
                sourceCode: 'reports',
                requiredCodes: ['users', 'payouts'],
                messagesByCode: {
                    users: 'Reports selected — Employee List is required. Please check Employee List to continue.',
                    payouts: 'Reports selected — Agent Payout is required. Please check Agent Payout to continue.',
                },
                toast: 'Employee List and Agent Payout are required when Reports is selected',
                requiredWhenLabel: 'Required when Reports is selected',
            },
            {
                sourceCode: 'payroll',
                requiredCodes: ['users'],
                messagesByCode: {
                    users: 'Payroll selected — Employee List is required. Please check Employee List to continue.',
                },
                toast: 'Employee List is required when Payroll is selected',
                requiredWhenLabel: 'Required when Payroll is selected',
            },
            {
                sourceCode: 'account-reports',
                requiredCodes: ['journal'],
                messagesByCode: {
                    journal: 'Accounting Reports selected — Journal Entry is required. Please check Journal Entry to continue.',
                },
                toast: 'Journal Entry is required when Accounting Reports is selected',
                requiredWhenLabel: 'Required when Accounting Reports is selected',
            },
            ];

            // Any Accounting module feature (except Chart of Accounts itself) requires accounts
            const accountingAccountDeps = (allFeatures || [])
                .filter((f) => String(f?.moduleCode || '').trim().toLowerCase() === 'accounting')
                .map((f) => ({
                    code: String(f?.code || '').trim().toLowerCase(),
                    name: f?.name,
                }))
                .filter(({ code }) => code && code !== 'accounts')
                .map(({ code, name }) => {
                    const label = name || formatModuleName(code);
                    return {
                        sourceCode: code,
                        requiredCodes: ['accounts'],
                        messagesByCode: {
                            accounts: `${label} selected — Chart of Accounts is required. Please check Chart of Accounts to continue.`,
                        },
                        toast: 'Chart of Accounts is required when any Accounting feature is selected',
                        requiredWhenLabel: 'Required when any Accounting feature is selected',
                    };
                });

            return [...staticDeps, ...accountingAccountDeps];
        },
        [allFeatures]
    );

    const unmetFeatureDependencies = useMemo(() => {
        return FEATURE_DEPENDENCIES.flatMap((dep) => {
            const source = featureByCode[dep.sourceCode];
            if (!source) return [];
            const sourceId = Number(source.id);
            if (!selectedIdSet.has(sourceId) && !selectedIdSet.has(source.id)) return [];

            return dep.requiredCodes
                .map((code) => {
                    const required = featureByCode[code];
                    if (!required) return null;
                    const requiredId = Number(required.id);
                    if (selectedIdSet.has(requiredId) || selectedIdSet.has(required.id)) return null;
                    return {
                        ...dep,
                        requiredCode: code,
                        requiredFeature: required,
                        message:
                            dep.messagesByCode?.[code] ||
                            dep.message ||
                            `${required.name || code} is required`,
                    };
                })
                .filter(Boolean);
        });
    }, [FEATURE_DEPENDENCIES, featureByCode, selectedIdSet]);

    const requiredFeatureMetaByCode = useMemo(() => {
        const map = {};
        // Prefer earlier deps (e.g. Memos) so Roles shows "Required when Memos..." immediately
        unmetFeatureDependencies.forEach((dep) => {
            if (!map[dep.requiredCode]) {
                map[dep.requiredCode] = dep;
            }
        });
        return map;
    }, [unmetFeatureDependencies]);

    const dependencyWarningMessages = useMemo(() => {
        const seen = new Set();
        return unmetFeatureDependencies
            .map((dep) => dep.message)
            .filter((msg) => {
                if (!msg || seen.has(msg)) return false;
                seen.add(msg);
                return true;
            });
    }, [unmetFeatureDependencies]);

    // Expand modules that contain currently-required dependency features
    useEffect(() => {
        if (!unmetFeatureDependencies.length) return;
        setExpandedModules((prev) => {
            const next = { ...prev };
            let changed = false;
            unmetFeatureDependencies.forEach((dep) => {
                const moduleCode = String(dep.requiredFeature?.moduleCode || '').trim();
                if (moduleCode && !next[moduleCode]) {
                    next[moduleCode] = true;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [unmetFeatureDependencies]);

    // Invoices / Tickets require createAgentRole=true
    const isFeatureCodeSelected = useCallback(
        (code) => {
            const feature = featureByCode[code];
            if (!feature) return false;
            const id = Number(feature.id);
            return selectedIdSet.has(id) || selectedIdSet.has(feature.id);
        },
        [featureByCode, selectedIdSet]
    );

    const isInvoicesSelected = isFeatureCodeSelected('invoices');
    const isTicketsSelected = isFeatureCodeSelected('tickets');
    const isAgentRequestsSelected = isFeatureCodeSelected('agent-requests');
    const isAgentPayoutSelected = isFeatureCodeSelected('payouts');
    const isApplicationsSelected = isFeatureCodeSelected('applications');
    const isSalesGotoRelevant =
        isFeatureCodeSelected('leads') ||
        isFeatureCodeSelected('sales-activity') ||
        isFeatureCodeSelected('sales-opportunity');
    const requiresCreateAgentRole =
        isInvoicesSelected ||
        isTicketsSelected ||
        isAgentRequestsSelected ||
        isAgentPayoutSelected ||
        isApplicationsSelected;

    // Always treat as true while agent-required features are selected (UI + API)
    const effectiveCreateAgentRole = requiresCreateAgentRole ? true : Boolean(createAgentRole);

    useEffect(() => {
        if (requiresCreateAgentRole && !createAgentRole) {
            setCreateAgentRole(true);
        }
    }, [requiresCreateAgentRole, createAgentRole]);

    const validateFeatureSelection = () => {
        if (!normalizeIdList(selectedFeatureIds).length) {
            toast.error('Please select at least one feature');
            return false;
        }
        if (unmetFeatureDependencies.length) {
            toast.error(unmetFeatureDependencies[0].toast);
            return false;
        }
        if (requiresCreateAgentRole && !effectiveCreateAgentRole) {
            toast.error(
                'Create Agent role is required when Invoices, Internal Tickets, Agents Application, Agent Payout, or Applications is selected'
            );
            return false;
        }
        return true;
    };

    // Expand modules with selected features once (edit / prefill only)
    useEffect(() => {
        if (didAutoExpandRef.current) return;
        if (!groupedModules.length || !selectedFeatureIds.length) return;
        const next = {};
        let hasAny = false;
        groupedModules.forEach((mod) => {
            const hasSelected = mod.features.some((f) =>
                selectedIdSet.has(Number(f.id))
            );
            if (hasSelected) {
                next[mod.code] = true;
                hasAny = true;
            }
        });
        if (hasAny) {
            setExpandedModules((prev) => ({ ...prev, ...next }));
            didAutoExpandRef.current = true;
        }
    }, [groupedModules, selectedFeatureIds.length, selectedIdSet]);

    const toggleFeature = (featureId) => {
        const invoicesId = featureByCode.invoices ? Number(featureByCode.invoices.id) : null;
        const ticketsId = featureByCode.tickets ? Number(featureByCode.tickets.id) : null;
        const agentRequestsId = featureByCode['agent-requests']
            ? Number(featureByCode['agent-requests'].id)
            : null;
        const payoutsId = featureByCode.payouts ? Number(featureByCode.payouts.id) : null;
        const applicationsId = featureByCode.applications
            ? Number(featureByCode.applications.id)
            : null;
        setSelectedFeatureIds((prev) => {
            const normalized = normalizeIdList(prev);
            if (normalized.includes(featureId)) {
                return normalized.filter((id) => id !== featureId);
            }
            const idNum = Number(featureId);
            if (
                (invoicesId != null && idNum === invoicesId) ||
                (ticketsId != null && idNum === ticketsId) ||
                (agentRequestsId != null && idNum === agentRequestsId) ||
                (payoutsId != null && idNum === payoutsId) ||
                (applicationsId != null && idNum === applicationsId)
            ) {
                setCreateAgentRole(true);
            }
            return [...normalized, featureId];
        });
    };

    const toggleModule = (moduleFeatures) => {
        const ids = (moduleFeatures || []).map((f) => Number(f.id));
        if (!ids.length) return;
        const invoicesId = featureByCode.invoices ? Number(featureByCode.invoices.id) : null;
        const ticketsId = featureByCode.tickets ? Number(featureByCode.tickets.id) : null;
        const agentRequestsId = featureByCode['agent-requests']
            ? Number(featureByCode['agent-requests'].id)
            : null;
        const payoutsId = featureByCode.payouts ? Number(featureByCode.payouts.id) : null;
        const applicationsId = featureByCode.applications
            ? Number(featureByCode.applications.id)
            : null;
        setSelectedFeatureIds((prev) => {
            const normalized = normalizeIdList(prev);
            const allSelected = ids.every((id) => normalized.includes(id));
            if (allSelected) {
                return normalized.filter((id) => !ids.includes(id));
            }
            if (
                (invoicesId != null && ids.includes(invoicesId)) ||
                (ticketsId != null && ids.includes(ticketsId)) ||
                (agentRequestsId != null && ids.includes(agentRequestsId)) ||
                (payoutsId != null && ids.includes(payoutsId)) ||
                (applicationsId != null && ids.includes(applicationsId))
            ) {
                setCreateAgentRole(true);
            }
            return [...new Set([...normalized, ...ids])];
        });
    };

    const selectAllFeatures = () => {
        setSelectedFeatureIds(allFeatures.map((f) => f.id));
        if (
            featureByCode.invoices ||
            featureByCode.tickets ||
            featureByCode['agent-requests'] ||
            featureByCode.payouts ||
            featureByCode.applications
        ) {
            setCreateAgentRole(true);
        }
    };

    const clearAllFeatures = () => {
        setSelectedFeatureIds([]);
    };

    const toggleModuleExpanded = (code) => {
        setExpandedModules((prev) => ({
            ...prev,
            [code]: !prev[code],
        }));
    };

    useEffect(() => {
        if (location.state) {
            setLoading(true)
            try {
            const {
                platform,
                accountNumber,
                merchantFirstName,
                merchantLastName,
                bankName,
                businessCity,
                businessName,
                businessState,
                businessType,
                businessZipCode,
                dbaAddress,
                email,
                feinNumber,
                website,
                contactNumber,
                id,
                leadName,
                legalAddress,
                dbaPhoneNumber,
                legalState,
                legalCity,
                legalZipCode,
                ownerPhoneNumber,
                ownerFirstName,
                ownerLastName,
                ownerShipCity,
                ownerShipState,
                ownerShipType,
                ownerShipZip,
                ownerEmail,
                plan,
                productsDescription,
                residentialAddress,
                routingNumber,
                socialSecurityNumber,
                solution,
                date,
                status,
                dLFileUrl,
                bankLetterFileUrl,
                averageSale,
                maxSale,
                comment,
                monthlySale,
                ebtFnsNumber,
                preferences,
                shipment
            } = location.state?.itemData;

            // Support both old "application" shaped data and new "tenant list row" shaped data
            const safeId = location.state?.itemData?.id;
            const safeName = location.state?.itemData?.name;
            const safeEmail = location.state?.itemData?.email;
            const safeIsActive = location.state?.itemData?.isActive;
            const safeFeatureIds = location.state?.itemData?.featureIds;
            const safeModuleCodes = location.state?.itemData?.moduleCodes;

            setPlatform(platform);
            setUploadedSecondFileName(bankLetterFileUrl); // Set uploaded file name
            setUploadedFileName(dLFileUrl); // Set uploaded file name
            setLogoFile(dLFileUrl); // Set logo file if exists
            // Also check if there's a specific logo field
            if (location.state?.itemData?.logo) {
                setLogoFile(location.state.itemData.logo);
                setInitialLogoUrl(location.state.itemData.logo);
            } else if (typeof dLFileUrl === 'string' && dLFileUrl) {
                setInitialLogoUrl(dLFileUrl);
            }
            setAverageSale(averageSale);
            setMaxSale(maxSale);
            setMonthlySale(monthlySale);
            setOwnerEmail(ownerEmail);
            setOwnerLastName(ownerLastName);
            setOwnerFirstName(ownerFirstName);
            setOwnerPhoneNumber(formatContactNumber(ownerPhoneNumber));
            setLegalZipCode(legalZipCode);
            setLegalCity(legalCity);
            setLegalState(legalState);
            setdbaPhoneNumber(formatContactNumber(dbaPhoneNumber));
            setLegalAddress(legalAddress);
            setContactNo(formatContactNumber(contactNumber));
            setWebsite(website);
            setMerchantFirstName(merchantFirstName);
            setMerchantLastName(merchantLastName);
            setAccountNumber(accountNumber);
            setbankName(bankName);
            setBusinessCity(businessCity);
            setApplicationId(id);
            setLeadName(leadName);
            setApplicationType(solution);
            setBusinessName(businessName || safeName || '');
            const incomingParentId =
                location.state?.itemData?.parentTenantId
                ?? location.state?.itemData?.parent?.id
                ?? '';
            setParentTenantId(incomingParentId === null || incomingParentId === undefined ? '' : incomingParentId);
            setEmail(email || safeEmail || '');
            setDbaAddress(dbaAddress);
            setBusinessState(businessState);
            setBusinessZipCode(businessZipCode);
            setProductsDescription(productsDescription);
            setFeinNumber(feinNumber);
            // setPrincipleOwnerName(principleOwnerName);
            setResidentialAddress(residentialAddress);
            setOwnerShipCity(ownerShipCity);
            setOwnerShipState(ownerShipState);
            setOwnerShipZip(ownerShipZip);
            setSocialSecurityNumber(socialSecurityNumber);
            setRoutingNumber(routingNumber);
            setBusinessType(businessType);
            setOwnershipType(ownerShipType);
            setPlan(plan);
            // setComments(comment);
            setFormDate(date);
            setSelectedStatus(
                status === "Active" || status === "In Active"
                    ? status
                    : status
                        ? "Active"
                        : "In Active"
            )

            if ((safeIsActive === true || safeIsActive === false) && !status) {
                setSelectedStatus(safeIsActive ? 'Active' : 'In Active');
            }

            if (safeId && !id) {
                setApplicationId(safeId);
            }

            if (safeId || id) {
                setActiveTab('merchantInfo');
            }

            if (Array.isArray(safeFeatureIds) && safeFeatureIds.length) {
                const ids = normalizeIdList(safeFeatureIds);
                setSelectedFeatureIds(ids);
                setInitialFeatureIds(ids);
            } else if (Array.isArray(safeModuleCodes) && safeModuleCodes.length) {
                setPendingModuleCodes(
                    safeModuleCodes.map((c) => String(c).trim()).filter(Boolean)
                );
            }

            setFetchedData(location.state?.itemData); // Store fetched data in state
            setEbtFnsNumber(ebtFnsNumber);
            setFormValues(preferences);
            setShipmentType(shipment);
            } finally {
                setLoading(false)
            }
        }
    }, [location.state]);

    useEffect(() => {
        const fetchTenantById = async () => {
            if (!applicationId || !accessToken) return;
            setLoading(true);
            try {
                const result = await getRequestWithOutBody(`${baseURl}tenant/${applicationId}`, accessToken);
                const tenantData = result?.data?.data || result?.data || result;
                if (!tenantData) return;

                const normalizedName = tenantData?.name || '';
                const normalizedEmail = tenantData?.email || '';
                const normalizedIsActive = tenantData?.isActive;
                const enabledFeatureIds = Array.isArray(tenantData?.tenant_features)
                    ? tenantData.tenant_features
                        .filter((tf) => tf && tf.isEnabled === true)
                        .map((tf) => tf?.featureId ?? tf?.feature?.id ?? tf?.feature_id)
                        .filter((id) => id !== null && id !== undefined)
                    : [];

                const payloadFeatureIds = Array.isArray(tenantData?.featureIds)
                    ? tenantData.featureIds
                    : [];

                const resolvedFeatureIds = normalizeIdList(
                    enabledFeatureIds.length ? enabledFeatureIds : payloadFeatureIds
                );

                const normalizedModuleCodes = Array.isArray(tenantData?.moduleCodes)
                    ? tenantData.moduleCodes
                        .map((c) => String(c).trim())
                        .filter(Boolean)
                    : Array.isArray(tenantData?.tenant_features)
                        ? [
                            ...new Set(
                                tenantData.tenant_features
                                    .filter((tf) => tf && tf.isEnabled === true)
                                    .map((tf) => tf?.feature?.moduleCode)
                                    .filter(Boolean)
                                    .map((c) => String(c).trim())
                            ),
                        ]
                        : [];

                if (normalizedName) setBusinessName(normalizedName);
                if (tenantData?.parentTenantId != null) {
                    setParentTenantId(tenantData.parentTenantId);
                } else if (tenantData?.parent?.id != null) {
                    setParentTenantId(tenantData.parent.id);
                } else {
                    setParentTenantId('');
                }
                if (normalizedEmail) setEmail(normalizedEmail);

                if (tenantData?.phone) setContactNo(tenantData.phone);
                if (tenantData?.website !== undefined) setWebsite(tenantData.website || '');
                if (tenantData?.businessType) setBusinessType(tenantData.businessType);
                if (tenantData?.logo) {
                    setLogoFile(tenantData.logo);
                    setInitialLogoUrl(tenantData.logo);
                }

                if (tenantData?.address) {
                    setLegalAddress(tenantData.address.street || '');
                    setLegalCity(tenantData.address.city || '');
                    setLegalState(tenantData.address.state || '');
                    setLegalZipCode(tenantData.address.zip || '');
                }

                if (normalizedIsActive === true || normalizedIsActive === false) {
                    setSelectedStatus(normalizedIsActive ? 'Active' : 'In Active');
                }

                if (resolvedFeatureIds.length) {
                    setSelectedFeatureIds(resolvedFeatureIds);
                    setInitialFeatureIds(resolvedFeatureIds);
                } else if (normalizedModuleCodes.length) {
                    setPendingModuleCodes(normalizedModuleCodes);
                }

                // For update payload compatibility, keep disableFeatureCodes on fetchedData
                const disableFeatureCodes = Array.isArray(tenantData?.tenant_features)
                    ? tenantData.tenant_features
                        .filter((tf) => tf && tf.isEnabled === false)
                        .map((tf) => tf?.feature?.code)
                        .filter(Boolean)
                    : [];

                setFetchedData({
                    ...tenantData,
                    disableFeatureCodes,
                });
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };

        fetchTenantById();
    }, [applicationId, accessToken]);

    const handleLeadNameChange = (e) => {
        setLeadName(e.target.value);
    };
    const handleLegalAddressChange = (e) => {
        setLegalAddress(e.target.value);
    };
    const handleLegalCityChange = (e) => {
        setLegalCity(e.target.value);
    };
    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
    };
    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };
    const handleLegalStateChange = (e) => {
        setLegalState(e);
    };
    const handleLegalZipCodeChange = async (e) => {
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
                        setLegalCity(place["place name"]);
                        setLegalState(place["state abbreviation"]);
                    }
                }
            } catch (err) {
            }
        }

        setLegalZipCode(value);
    };
    const handleBusinessNameChange = (e) => {
        setBusinessName(e.target.value);
    };
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };
    const handleContactNoChange = (e) => {
        setContactNo(e.target.value);
    };
    const handleOwnerFirstNameChange = (e) => {
        setOwnerFirstName(e.target.value);
    };
    const handleOwnerLastNameChange = (e) => {
        setOwnerLastName(e.target.value);
    };

    const handleLogoFileUpload = (file) => {
        setLogoFile(file);
    };

    const handleEditAgent = async () => {
        setLoading(true);
        try {
            const name = (businessName || '').trim();
            const tenantEmail = (email || '').trim();

            if (!name || !tenantEmail) {
                toast.error('Name and Email are required');
                return;
            }

            // Feature-level selection
            const featureIds = normalizeIdList(selectedFeatureIds);

            if (!featureIds.length) {
                toast.error('Please select at least one feature');
                return;
            }
            if (unmetFeatureDependencies.length) {
                toast.error(unmetFeatureDependencies[0].toast);
                return;
            }

            const initialIds = normalizeIdList(initialFeatureIds);
            const selectedIdLookup = new Set(featureIds);
            const disableFeatureIds = initialIds.filter((id) => !selectedIdLookup.has(id));

            // Handle logo upload / remove
            let logoUrl = undefined;
            if (Array.isArray(logoFile) && logoFile.length > 0) {
                for (const file of logoFile) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("type", 'tenant');

                    const result1 = await postRequestWithFormData(`${baseURl}files`, accessToken, formData);
                    logoUrl = result1?.data?.logo?.url;
                }
            } else if (logoFile === null && initialLogoUrl) {
                // User removed existing logo
                logoUrl = null;
            }

            const tenantPayload = {
                name,
                email: tenantEmail,
                phone: contactNo,
                website,
                businessType: businessType || name,
                address: {
                    street: legalAddress,
                    city: legalCity,
                    state: legalState,
                    zip: legalZipCode,
                },
                isActive: selectedStatus === 'Active',
                featureIds,
                createAgentRole: Boolean(effectiveCreateAgentRole),
            };

            if (applicationId && disableFeatureIds.length) {
                tenantPayload.disableFeatureIds = disableFeatureIds;
            }

            // New upload URL, or explicit null when removed
            if (logoUrl !== undefined) {
                tenantPayload.logo = logoUrl;
            }

            if (applicationId) {
                const result = await putRequestWithBodyAndToken(`${baseURl}tenant/${applicationId}`, accessToken, tenantPayload);
                await setTenantParent(accessToken, applicationId, parentTenantId || null);
                toast.success(result.message);
                navigate('/masterDashboard/tenantsList');
                return;
            }

            // fallback: keep existing create behavior (POST) for add mode
            if (!username?.trim() || !password) {
                toast.error('Username and Password are required');
                setActiveTab('adminInfo');
                return;
            }

            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            if (!slug) {
                toast.error('Slug is required');
                return;
            }

            const createPayload = {
                tenant: {
                    name,
                    slug,
                    email: tenantEmail,
                    phone: contactNo,
                    website,
                    businessType: businessName,
                    taxId: feinNumber,
                    address: {
                        street: legalAddress,
                        city: legalCity,
                        state: legalState,
                        zip: legalZipCode,
                    },
                    featureIds,
                    isActive: selectedStatus === 'Active',
                    createAgentRole: Boolean(effectiveCreateAgentRole),
                },
                owner: {
                    name: ownerFirstName || ownerLastName ? `${ownerFirstName} ${ownerLastName}`.trim() : '',
                    username,
                    email: ownerEmail || tenantEmail,
                    password,
                },
            };

            if (logoUrl) {
                createPayload.tenant.logo = logoUrl;
            }

            const result = await postRequestWithBodyAndToken(`${baseURl}tenant`, accessToken, createPayload);
            const createdId =
                result?.data?.id
                ?? result?.data?.tenant?.id
                ?? result?.data?.data?.id
                ?? result?.id;
            if (createdId && parentTenantId) {
                await setTenantParent(accessToken, createdId, parentTenantId);
            }
            toast.success(result.message);
            navigate('/masterDashboard/tenantsList');
        } catch (error) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const statusOptions = [
        { id: "Active", name: "active" },
        { id: "In Active", name: "in-active" },
    ]

    if (loading) {
        return (
            <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
                <div className="text-center w-full mx-auto mt-10">
                    <Loader message="Loading..." subMessage="Please wait" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ marginTop: -65, backgroundColor: 'var(--dashboard-bg)', padding: 10 }}>
            <Heading
                Fontweight={700}
                color={'var(--sidebar-text-primary)'}
                Heading={isEditMode ? 'Edit Merchant' : 'Maintain Application'}
                Fontsize={30}
            />

            {!isEditMode && (
                <HeaderWrapper2 className="flex space-x-4 border-b mt-2 border-gray-200">
                    <button
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'merchantInfo'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-[#0C79F7]'
                            }`}
                        onClick={() => setActiveTab('merchantInfo')}
                    >
                        Merchant Information
                    </button>
                    <button
                        className={`pb-2 px-4 text-sm font-medium ${activeTab === 'adminInfo'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-[#0C79F7]'
                            }`}
                        onClick={() => setActiveTab('adminInfo')}
                    >
                        Derps Admin Information
                    </button>
                </HeaderWrapper2>
            )}

            <div className="w-full " style={{ backgroundColor: 'var(--dashboard-card-bg)', borderRadius: 14 }}>
                <div style={{ marginTop: 10, borderRadius: 14 }} className="sm:m-8 p-3 pt-4  m-2">
                    <div className="flex justify-between gap-3 flex-wrap">
                        <GoBack />
                    </div>
                    {activeTab === 'merchantInfo' ? (
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Merchant Information'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="flex flex-col gap-2 ">
                                {isEditMode && (
                                    <div className="flex items-center gap-x-6 flex-wrap">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--sidebar-text-primary)'}
                                                Heading={'Business Logo'}
                                                Fontsize={16}
                                            />
                                        </div>
                                        <LogoUpload 
                                            onLogoChange={handleLogoFileUpload} 
                                            currentLogo={typeof logoFile === 'string' ? logoFile : null}
                                            size={120}
                                        />
                                    </div>
                                )}
                                {!isEditMode && (
                                    <>
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={'var(--sidebar-text-primary)'}
                                                    Heading={'Business Logo'}
                                                    Fontsize={16}
                                                />
                                            </div>
                                            <LogoUpload 
                                                onLogoChange={handleLogoFileUpload} 
                                                currentLogo={typeof logoFile === 'string' ? logoFile : null}
                                                size={120}
                                            />
                                        </div>
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={'var(--sidebar-text-primary)'}
                                                    Heading={'Lead Owner'}
                                                    Fontsize={16}
                                                    required={true}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder="Enter Lead Name"
                                                inputValue={leadName}
                                                onInputChange={handleLeadNameChange}
                                                bussiness={true}
                                            />
                                        </div>
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={'var(--sidebar-text-primary)'}
                                                    Heading={'First Name'}
                                                    Fontsize={16}
                                                    required={true}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder="Type owner first name"
                                                inputValue={ownerFirstName}
                                                onInputChange={handleOwnerFirstNameChange}
                                                bussiness={true}
                                            />
                                        </div>
                                        <div className="flex items-center gap-x-6 flex-wrap">
                                            <div className="w-48">
                                                <Heading
                                                    Fontweight={500}
                                                    color={'var(--sidebar-text-primary)'}
                                                    Heading={'Last Name'}
                                                    Fontsize={16}
                                                    required={true}
                                                />
                                            </div>
                                            <LabeledInput
                                                inputPlaceholder="Type owner last name"
                                                inputValue={ownerLastName}
                                                onInputChange={handleOwnerLastNameChange}
                                                bussiness={true}

                                            />
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Business Name'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Type Business Name"
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
                                            Heading={'Parent Company'}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={[
                                            { id: '', name: 'None (Top-level)' },
                                            ...parentTenantOptions.filter((tenant) => String(tenant?.id) !== String(applicationId)),
                                        ]}
                                        searchable
                                        idSet
                                        businessType={true}
                                        defaultText="None (Top-level)"
                                        selectedValue={
                                            parentTenantId
                                                ? (parentTenantOptions.find((tenant) => String(tenant.id) === String(parentTenantId))?.name || 'Parent Company')
                                                : 'None (Top-level)'
                                        }
                                        onSelect={(id) => setParentTenantId(id || '')}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Email'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Email"
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
                                            Heading={'Address'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Address"
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
                                            Heading={'Zip Code'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <LabeledInput
                                            bussiness={true}
                                            inputPlaceholder="e.g. 12345 or 12345-6789"
                                            inputValue={legalZipCode}
                                            onInputChange={handleLegalZipCodeChange}
                                            inputType="text"
                                        />
                                        <p className="text-sm text-gray-500 mt-1">
                                            Enter ZIP code to auto-fill City and State
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'City'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter City"
                                        inputValue={legalCity}
                                        onInputChange={handleLegalCityChange}
                                        bussiness={true}

                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'State'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <DropdownMenu
                                        menuItems={usStates}
                                        business={true}
                                        defaultText={"State"}
                                        onSelect={handleLegalStateChange}
                                        selectedValue={legalState}
                                    />
                                </div>
                                


                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Phone Number'}
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
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Status'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <DropdownMenu
                                        label="Status"
                                        menuItems={statusOptions}
                                        defaultText="--select status--"
                                        onSelect={setSelectedStatus}
                                        addAgent={true}
                                        idSet={true}
                                        selectedValue={selectedStatus}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Agent Role'}
                                            Fontsize={16}
                                        />
                                    </div>
                                    <label
                                        className="flex items-start gap-2 max-w-xl"
                                        style={{
                                            color: requiresCreateAgentRole ? '#b91c1c' : 'var(--sidebar-text-primary)',
                                            cursor: requiresCreateAgentRole ? 'default' : 'pointer',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={effectiveCreateAgentRole}
                                            readOnly={requiresCreateAgentRole}
                                            onChange={(e) => {
                                                if (requiresCreateAgentRole) {
                                                    setCreateAgentRole(true);
                                                    return;
                                                }
                                                setCreateAgentRole(e.target.checked);
                                            }}
                                            className="mt-1 h-4 w-4 accent-blue-600"
                                            style={{ cursor: requiresCreateAgentRole ? 'default' : 'pointer' }}
                                        />
                                        <span className="text-sm">
                                            <span className="font-medium">
                                                Create Agent role
                                                {requiresCreateAgentRole ? ' (Required)' : ''}
                                            </span>
                                            <span
                                                className="block text-xs mt-0.5"
                                                style={{ opacity: 0.7 }}
                                            >
                                                {requiresCreateAgentRole
                                                    ? `Required when ${[
                                                          isInvoicesSelected && 'Invoices',
                                                          isTicketsSelected && 'Internal Tickets',
                                                          isAgentRequestsSelected && 'Agents Application',
                                                          isAgentPayoutSelected && 'Agent Payout',
                                                          isApplicationsSelected && 'Applications',
                                                      ]
                                                          .filter(Boolean)
                                                          .join(' / ')} is selected — Agent role will be created automatically.`
                                                    : 'Automatically creates an "Agent" role for this tenant when enabled.'}
                                            </span>
                                        </span>
                                    </label>
                                </div>
                                <div className="flex flex-col gap-3 mt-2">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="w-48">
                                            <Heading
                                                Fontweight={500}
                                                color={'var(--sidebar-text-primary)'}
                                                Heading={'Module Access'}
                                                Fontsize={16}
                                                required={true}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className="text-sm"
                                                style={{ color: 'var(--sidebar-text-primary)', opacity: 0.75 }}
                                            >
                                                {selectedFeatureIds.length} of {allFeatures.length} features selected
                                            </span>
                                            <button
                                                type="button"
                                                onClick={selectAllFeatures}
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
                                                onClick={clearAllFeatures}
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

                                    {dependencyWarningMessages.length > 0 && (
                                        <div className="flex flex-col gap-2 w-full max-w-4xl">
                                            {dependencyWarningMessages.map((message) => (
                                                <div
                                                    key={message}
                                                    className="text-sm px-3 py-2.5 rounded-lg"
                                                    style={{
                                                        backgroundColor: 'rgba(220, 38, 38, 0.08)',
                                                        border: '1px solid rgba(220, 38, 38, 0.35)',
                                                        color: '#b91c1c',
                                                    }}
                                                >
                                                    {message}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {isSalesGotoRelevant && (
                                        <div
                                            className="text-sm px-3 py-2.5 rounded-lg w-full max-w-4xl"
                                            style={{
                                                backgroundColor: 'rgba(67, 121, 238, 0.08)',
                                                border: '1px solid rgba(67, 121, 238, 0.35)',
                                                color: 'rgba(37, 99, 235, 1)',
                                            }}
                                        >
                                            Sales access is selected — after saving, the tenant Admin should open{' '}
                                            <strong>Settings → GoTo Connect</strong> to connect the company GoTo
                                            account, set the account key, and ensure call events. Each sales agent
                                            then picks their own GoTo line before click-to-call works.
                                        </div>
                                    )}

                                    {isInvoicesSelected && (
                                        <div
                                            className="text-sm px-3 py-2.5 rounded-lg w-full max-w-4xl"
                                            style={{
                                                backgroundColor: 'rgba(67, 121, 238, 0.08)',
                                                border: '1px solid rgba(67, 121, 238, 0.35)',
                                                color: 'rgba(37, 99, 235, 1)',
                                            }}
                                        >
                                            Invoices is selected — after saving, the tenant Admin should open{' '}
                                            <strong>Settings → Authorize.Net</strong> to save this merchant&apos;s
                                            API Login ID, Transaction Key, and Signature Key, then register the
                                            webhook URL in Authorize.Net. Card charges and invoice hosted payment
                                            links will fail until credentials are configured.
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-2 w-full max-w-4xl">
                                        {groupedModules.length === 0 ? (
                                            <div
                                                className="text-sm py-4 px-3 rounded-lg"
                                                style={{
                                                    backgroundColor: 'var(--dashboard-tab-box)',
                                                    color: 'var(--sidebar-text-primary)',
                                                    opacity: 0.7,
                                                }}
                                            >
                                                No modules/features available.
                                            </div>
                                        ) : (
                                            groupedModules.map((mod) => {
                                                const featureIds = mod.features.map((f) => Number(f.id));
                                                const selectedCount = featureIds.filter((id) =>
                                                    selectedIdSet.has(id)
                                                ).length;
                                                const allSelected =
                                                    featureIds.length > 0 && selectedCount === featureIds.length;
                                                const someSelected =
                                                    selectedCount > 0 && selectedCount < featureIds.length;
                                                const isExpanded = Boolean(expandedModules[mod.code]);

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
                                                                onChange={() => toggleModule(mod.features)}
                                                                className="h-4 w-4 cursor-pointer accent-blue-600"
                                                                aria-label={`Select all ${mod.name} features`}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="flex-1 flex items-center justify-between gap-2 text-left"
                                                                onClick={() => toggleModuleExpanded(mod.code)}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    {isExpanded ? (
                                                                        <IoIosArrowDown size={16} />
                                                                    ) : (
                                                                        <IoIosArrowForward size={16} />
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
                                                                    {selectedCount}/{featureIds.length}
                                                                </span>
                                                            </button>
                                                        </div>

                                                        {isExpanded && (
                                                            <div
                                                                className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 pb-3 pt-1"
                                                                style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
                                                            >
                                                                {mod.features.map((feature) => {
                                                                    const checked = selectedIdSet.has(Number(feature.id));
                                                                    const featureCode = String(feature?.code || '').trim().toLowerCase();
                                                                    const requiredMeta = requiredFeatureMetaByCode[featureCode];
                                                                    const highlightRequired = Boolean(requiredMeta);
                                                                    return (
                                                                        <label
                                                                            key={feature.id}
                                                                            className="flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer"
                                                                            style={{
                                                                                backgroundColor: highlightRequired
                                                                                    ? 'rgba(220, 38, 38, 0.1)'
                                                                                    : checked
                                                                                        ? 'rgba(67, 121, 238, 0.08)'
                                                                                        : 'transparent',
                                                                                border: highlightRequired
                                                                                    ? '1px solid rgba(220, 38, 38, 0.45)'
                                                                                    : '1px solid transparent',
                                                                                boxShadow: highlightRequired
                                                                                    ? '0 0 0 2px rgba(220, 38, 38, 0.12)'
                                                                                    : 'none',
                                                                            }}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => toggleFeature(Number(feature.id))}
                                                                                className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
                                                                            />
                                                                            <span className="min-w-0">
                                                                                <span
                                                                                    className="block text-sm font-medium"
                                                                                    style={{
                                                                                        color: highlightRequired
                                                                                            ? '#b91c1c'
                                                                                            : 'var(--sidebar-text-primary)',
                                                                                    }}
                                                                                >
                                                                                    {feature.name}
                                                                                    {highlightRequired ? ' (Required)' : ''}
                                                                                </span>
                                                                                {highlightRequired ? (
                                                                                    <span
                                                                                        className="block text-xs mt-0.5"
                                                                                        style={{ color: '#b91c1c' }}
                                                                                    >
                                                                                        {requiredMeta.requiredWhenLabel}
                                                                                    </span>
                                                                                ) : feature.description ? (
                                                                                    <span
                                                                                        className="block text-xs mt-0.5"
                                                                                        style={{
                                                                                            color: 'var(--sidebar-text-primary)',
                                                                                            opacity: 0.65,
                                                                                        }}
                                                                                    >
                                                                                        {feature.description}
                                                                                    </span>
                                                                                ) : null}
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
                            </div>


                        </div>
                    ) : activeTab === 'adminInfo' ? (
                        <>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Derps Admin Information'}
                                Fontsize={20}
                                mt={10}
                            />
                            <div className="flex flex-col gap-2 ">
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Username'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Username"
                                        inputValue={username}
                                        onInputChange={handleUsernameChange}
                                        bussiness={true}
                                    />
                                </div>
                                <div className="flex items-center gap-x-6 flex-wrap">
                                    <div className="w-48">
                                        <Heading
                                            Fontweight={500}
                                            color={'var(--sidebar-text-primary)'}
                                            Heading={'Password'}
                                            Fontsize={16}
                                            required={true}
                                        />
                                    </div>
                                    <LabeledInput
                                        inputPlaceholder="Enter Password"
                                        inputValue={password}
                                        onInputChange={handlePasswordChange}
                                        bussiness={true}
                                    />
                                </div>

                            </div>
                        </>
                    ) : (
                        <div>
                            <Heading
                                Fontweight={700}
                                color={'var(--sidebar-text-primary)'}
                                Heading={'Derps Admin Information'}
                                Fontsize={20}
                                mt={10}
                            />
                        </div>
                    )}
                    <div style={{ display: '' }} className="flex justify-end mt-10 gap-3 mr-5" >

                        <BottonCustom
                        backgroundColor={'rgba(67, 121, 238, 1)'}
                        width={130}
                        title={isEditMode ? 'Update' : (activeTab === 'merchantInfo' ? 'Next' : 'Save')}
                        height={40}
                        color={'var(--sidebar-text-selected)'}
                        fontSize={16}
                        fontWeight={500}
                        onClick={() => {
                            if (isEditMode) {
                                if (!validateFeatureSelection()) return;
                                handleEditAgent();
                                return;
                            }
                            if (activeTab === 'merchantInfo') {
                                if (!validateFeatureSelection()) return;
                                setActiveTab('adminInfo');
                                return;
                            }
                            if (!validateFeatureSelection()) return;
                            handleEditAgent();
                        }}
                    />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddTenants;
