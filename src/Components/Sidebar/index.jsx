import * as React from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { Route, Routes, useNavigate, useLocation, Navigate, Link as RouterLink } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry as lazy } from "../../Utils/lazyWithRetry";
import ChunkErrorBoundary from "../ChunkErrorBoundary";
// import ReportDetails from "../../Screens/ReportDetails";

// Lazy load heavy components
// const Dashboard = lazy(() => import("../../Screens/Dashboard"));
const Agent = lazy(() => import("../../Screens/Agent"));
const Memo = lazy(() => import("../../Screens/Memo"));
const Form = lazy(() => import("../../Screens/Form"));
const Policy = lazy(() => import("../../Screens/Policy"));
const Training = lazy(() => import("../../Screens/Training"));
const Reports = lazy(() => import("../../Screens/Reports"));
const AgentPayout = lazy(() => import("../../Screens/AgentPayout"));
const ReportDetails = lazy(() => import("../../Screens/ReportDetails"));
const AgentPayoutReportDetail = lazy(() => import("../../Screens/AgentPayoutReportDetail"));
const EditInvoice = lazy(() => import("../../Screens/EditInvoice"));
const ProjectTracking = lazy(() => import("../../Screens/ProjectTracking"));
const Calender = lazy(() => import("../../Screens/Calender"));
const TaskDetail = lazy(() => import("../../Screens/TaskDetail"));
const MyTask = lazy(() => import("../../Screens/MyTask"));
const StorageBucket = lazy(() => import("../../Screens/StorageBucket"));
const TrackingReports = lazy(() => import("../../Screens/TrackingReports"));
const AttendanceReport = lazy(() => import("../../Screens/AttendanceReport"));
const TrackerSetupHistory = lazy(() => import("../../Screens/TrackerSetupHistory"));
const Support = lazy(() => import("../../Screens/Support"));
const ProductList = lazy(() => import("../../Screens/ProductList"));
const ShipmentAndPickup = lazy(() => import("../../Screens/ShipmentAndPickup"));
const Expenses = lazy(() => import("../../Screens/Expenses"));
const SupportSetup = lazy(() => import("../../Screens/SupportSetup"));
const MerchantSupport = lazy(() => import("../../Screens/MerchantSupport"));
const MerchantChangeRequest = lazy(() => import("../../Screens/MerchantChangeRequest"));
const MerchantChangeRequestDetail = lazy(() => import("../../Screens/MerchantChangeRequestDetail"));
const MaintananceTicket = lazy(() => import("../../Screens/MaintananceTicket"));
const SupportTicketDetail = lazy(() => import("../../Screens/SupportTicketDetail"));
import { Button, Dialog, Tooltip, useMediaQuery, useTheme, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import Heading from "../Heading";
import { SVG } from "../../assets/svg";
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useDispatch, useSelector } from "react-redux";
import { clearAccessToken, setAccessToken, setCategories, setScopes, setTenantLogo, setTenantFeatures, setAuditLogModules } from "../../Store/Reducers/authSlice";
import { clearUserDetails, setUserDetails } from "../../Store/Reducers/userDetailsSlice";
import { performLogout } from "../../Utils/logout";
import { syncSidebarCurrentWidth, clearSidebarCurrentWidth } from "../../Utils/sidebarLayout";
import { useNotifications } from "../../Contexts/NotificationContext";
import { useChatNotification } from "../../features/chat/shared/hooks/ChatNotificationBadge";
import Loader from "../Loader";
import { fetchAuditLogModules } from "../../Api/auditLogApi";
import { fetchAndApplyAuthMe } from "../../Utils/applyAuthMeSession";
import {
    getTaskDetailSidebarRoute,
    setTaskDetailSidebarRoute,
    TASK_DETAIL_PARENT_ROUTES,
} from "../../Utils/taskDetailSidebarRoute";
import {
    getSupportTicketDetailSidebarRoute,
    setSupportTicketDetailSidebarRoute,
    SUPPORT_TICKET_DETAIL_PARENT_ROUTES,
} from "../../Utils/supportTicketDetailSidebarRoute";
import {
    filterMenuByTenantFeatures,
    filterMenuByScopes,
    getEnabledFeatureCodes,
    GOTO_SALES_FEATURE_CODES,
    filterAuditModulesByTenantFeatures,
    canAccessAuditLog,
    filterMenuByAuditLogAccess,
    getAuditModuleFeatureCandidates,
} from "../../Utils/tenantFeatures";
import { getUserDisplayName } from "../../Utils/profile";
import UserMenuAvatar from "../UserMenuAvatar";

const AttendanceLog = lazy(() => import("../../Screens/AttendanceLog"));
const AuditLog = lazy(() => import("../../Screens/AuditLog"));
const Invoices = lazy(() => import("../../Screens/Invoices"));
const CustomerInvoices = lazy(() => import("../../Screens/CustomerInvoices"));
const ItemsAndServices = lazy(() => import("../../Screens/ItemsAndServices"));
const Purchase = lazy(() => import("../../Screens/Purchase"));
const AddAgent = lazy(() => import("../../Screens/AddAgent"));
const AgentsTickets = lazy(() => import("../../Screens/AgentsTickets"));
const SingleInvoice = lazy(() => import("../../Screens/SingleInvoice"));
const PreviewInvoice = lazy(() => import("../../Screens/PreviewInvoice"));
const EditItem = lazy(() => import("../../Screens/EditItem"));
const EditService = lazy(() => import("../../Screens/EditService"));
const MaintainForm = lazy(() => import("../../Screens/MaintainForm"));
const MaintainMemo = lazy(() => import("../../Screens/MaintainMemo"));
const AddForm = lazy(() => import("../../Screens/AddForm"));
const CustomerInfo = lazy(() => import("../../Screens/CustomerInfo"));
const MaintainTraining = lazy(() => import("../../Screens/MaintainTraining"));
const MaintainPolicy = lazy(() => import("../../Screens/MaintainPolicy"));
const AddMemo = lazy(() => import("../../Screens/AddMemo"));
const AddTraining = lazy(() => import("../../Screens/AddTraining"));
const AddItem = lazy(() => import("../../Screens/AddItem"));
const AddService = lazy(() => import("../../Screens/AddService"));
const AddPolicy = lazy(() => import("../../Screens/AddPolicy"));
const AgreementConfiguration = lazy(() => import("../../Screens/AgreementConfiguration"));
const Roles = lazy(() => import("../../Screens/Roles"));
const AddRoles = lazy(() => import("../../Screens/AddRoles"));
const Category = lazy(() => import("../../Screens/Category"));
const AdminApplication = lazy(() => import("../../Screens/AdminApplication"));
const EditApplication = lazy(() => import("../../Screens/EditApplication"));
const CustomerList = lazy(() => import("../../Screens/CustomerList"));
const SalesCustomers = lazy(() => import("../../Screens/SalesCustomers"));
const EditCustomer = lazy(() => import("../../Screens/EditCustomer"));
const AddTickets = lazy(() => import("../../Screens/AddTickets"));
const EditRoles = lazy(() => import("../../Screens/EditRole"));
const CreateInvoice = lazy(() => import("../../Screens/CreateInvoice"));
const EditJournalEntry = lazy(() => import("../../Screens/EditJournalEntry"));
const AllInventory = lazy(() => import("../../Screens/AllInventory"));
const AddInventory = lazy(() => import("../../Screens/AddInventory"));
const AddInventoryItem = lazy(() => import("../../Screens/AddInventoryItem"));
const SNReport = lazy(() => import("../../Screens/SNReport"));
const SNItemDetail = lazy(() => import("../../Screens/SNItemDetail"));
const EditInventory = lazy(() => import("../../Screens/EditInventoryItem"));
const TrialBalance = lazy(() => import("../../Screens/TrialBalance"));
const TicketTypes = lazy(() => import("../../Screens/TicketTypes"));
const UserActivations = lazy(() => import("../../Screens/UserActivations"));
const SubmitApplication = lazy(() => import("../../Screens/SubmitApplication"));
const SelectPlan = lazy(() => import("../../Screens/SelectPlan"));
const RequestSubmitted = lazy(() => import("../../Screens/RequestSubmitted"));
const ApplicationInformation = lazy(() => import("../../Screens/ApplicationInformation"));
const LeadsList = lazy(() => import("../../Screens/LeadsList"));
const AddLeads = lazy(() => import("../../Screens/AddLeads"));
const EditLead = lazy(() => import("../../Screens/EditLead"));
const SingleTicket = lazy(() => import("../../Screens/SingleTicket"));
const InvalidTickets = lazy(() => import("../../Screens/InvalidTickets"));
const ChangePassword = lazy(() => import("../../Screens/ChangePassword"));
const GotoSettings = lazy(() => import("../../Screens/GotoSettings"));
const AuthorizeNetSettings = lazy(() => import("../../Screens/AuthorizeNetSettings"));
const FedexSettings = lazy(() => import("../../Screens/FedexSettings"));
const ApplicationLinkSettings = lazy(() => import("../../features/applications/screens/ApplicationLinkSettings"));
const Vendors = lazy(() => import("../../Screens/Vendors"));
const EditVendor = lazy(() => import("../../Screens/EditVendor"));
const AddPurchase = lazy(() => import("../../Screens/AddPurchase"));
const EditPurchase = lazy(() => import("../../Screens/EditPurchase"));
const DashboardScreen = lazy(() => import("../../Screens/DashboardScreen"));
const TechInstallationList = lazy(() => import("../../Screens/TechInstallationList"));
const TechInstallation = lazy(() => import("../../Screens/TechInstallation"));
const TechInstallationEdit = lazy(() => import("../../Screens/TechInstallationEdit"));
const LabelPrint = lazy(() => import("../../Screens/LabelPrint"));
const AddNewTask = lazy(() => import("../../Screens/AddNewTask"));
const PerformanceReport = lazy(() => import("../../Screens/PerformanceReport"));
const ChartOfAccounts = lazy(() => import("../../Screens/ChartOfAccounts"));
const ChartOfAccountsDetail = lazy(() => import("../../Screens/ChartOfAccountsDetail"));
const Transactions = lazy(() => import("../../Screens/Transactions"));
const Reconciliation = lazy(() => import("../../Screens/Reconciliation"));
const JournalEntry = lazy(() => import("../../Screens/JournalEntry"));
const Suppliers = lazy(() => import("../../Screens/Suppliers"));
const AddSupplier = lazy(() => import("../../Screens/Suppliers/Add"));
const SupplierDetail = lazy(() => import("../../Screens/Suppliers/Detail"));
const AccountRegister = lazy(() => import("../../Screens/AccountRegister"));
const AccountsReports = lazy(() => import("../../Screens/AccountsReports"));
const ProfitLossReport = lazy(() => import("../../Screens/ProfitLossReport"));
const BalanceSheet = lazy(() => import("../../Screens/BalanceSheet"));
const TaxReports = lazy(() => import("../../Screens/TaxReports"));
const StateTax = lazy(() => import("../../Screens/TaxReports/StateTax"));
const Payroll = lazy(() => import("../../Screens/Payroll"));
const PayrollSummary = lazy(() => import("../../Screens/PayrollSummary"));
const PayrollTaxDetails = lazy(() => import("../../Screens/PayrollTaxDetails"));
const Chat = lazy(() => import("../../features/chat/screens/Chat"));
const Call = lazy(() => import("../../features/chat/screens/Call"));
const ActiveMeetingsScreen = lazy(() => import("@features/chat/meetings/ActiveMeetingsScreen"));
const MeetingRecordingsScreen = lazy(() => import("@features/chat/meetings/MeetingRecordingsScreen"));
const Notifications = lazy(() => import("../../features/notifications/screens/Notifications"));
const Profile = lazy(() => import("../../Screens/Profile"));
const NotFound = lazy(() => import("../../Screens/NotFound"));
const InvoiceReceivePayment = lazy(() => import("../../Screens/InvoiceReceivePayment"));
const Returns = lazy(() => import("../../Screens/Returns"));
const Shipping = lazy(() => import("../../Screens/Shipping"));
const CreateShipment = lazy(() => import("../../Screens/CreateShipment"));
const ShipmentDetail = lazy(() => import("../../Screens/ShipmentDetail"));
const ApplicationPreferences = lazy(() => import("../../Screens/ApplicationPreferences"));
const ExpenseReport = lazy(() => import("../../Screens/ExpenseReport"));
const SalesFormBuilder = lazy(() => import("../../Screens/SalesFormBuilder"));
const Opportunities = lazy(() => import("../../Screens/LeadInfo/Opportunities"));
const NewOpportunity = lazy(() => import("../../Screens/LeadInfo/NewOpportunity"));
const OpportunityDetail = lazy(() => import("../../Screens/LeadInfo/OpportunityDetail"));
const LeadInfo = lazy(() => import("../../Screens/LeadInfo"));
const LeadDetail = lazy(() => import("../../Screens/LeadInfo/LeadDetail"));
const Quotations = lazy(() => import("../../Screens/Quotations"));
const SalesOrder = lazy(() => import("../../Screens/SalesOrder"));
const SalesOrderDetail = lazy(() => import("../../Screens/SalesOrder/Detail"));
const CreateSalesOrder = lazy(() => import("../../Screens/CreateSalesOrder"));
const AgentManagement = lazy(() => import("../../Screens/AgentManagement"));
const AgentManagementDetail = lazy(() => import("../../Screens/AgentManagementDetail"));
const drawerWidth = 240;
const collapsedWidth = 72;

const StyledListItem = styled(ListItem, {
    shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'drawerOpen',
})(({ isSelected }) => ({
    padding: 0,
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 4,
        bottom: 4,
        width: '3px',
        borderRadius: 2,
        backgroundColor: isSelected ? 'var(--sidebarNew-border)' : 'transparent',
        zIndex: 1,
    },
}));

const StyledListItemButton = styled(ListItemButton, {
    shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'isOpen',
})(({ isSelected }) => ({
    // Only the active page/section gets highlight — open-only dropdowns stay neutral
    backgroundColor: isSelected ? 'var(--sidebarNew-open-bg)' : 'transparent',
    color: isSelected ? 'var(--sidebarNew-text-selected)' : 'var(--sidebarNew-text-primary)',
    '&:hover': {
        backgroundColor: isSelected ? 'var(--sidebarNew-open-bg)' : 'var(--sidebarNew-hover-bg)',
    },
    borderRadius: 8,
    marginBottom: 2,
    minHeight: 42,
    transition: 'background-color 0.2s, color 0.2s',
    '& .MuiListItemIcon-root': {
        color: isSelected ? 'var(--sidebarNew-icon-selected)' : 'var(--sidebarNew-icon)',
    },
}));

const StyledSubListItemButton = styled(ListItemButton, {
    shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'drawerOpen' && prop !== 'depth' && prop !== 'isNestedParent',
})(({ isSelected, drawerOpen, depth = 1, isNestedParent = false }) => ({
    backgroundColor: isSelected
        ? (isNestedParent ? 'var(--sidebarNew-open-bg)' : 'var(--sidebarNew-sub-selected-bg)')
        : 'transparent',
    color: isSelected ? 'var(--sidebarNew-text-selected)' : 'var(--sidebarNew-text-primary)',
    '&:hover': {
        backgroundColor: isSelected
            ? (isNestedParent ? 'var(--sidebarNew-open-bg)' : 'var(--sidebarNew-sub-selected-bg)')
            : 'var(--sidebarNew-hover-bg)',
    },
    borderRadius: 8,
    marginBottom: 2,
    transition: 'background-color 0.2s, color 0.2s',
    paddingLeft: drawerOpen
        ? (depth >= 2 ? 44 : isNestedParent ? 28 : 32)
        : 8,
    minHeight: depth >= 2 ? 36 : 40,
    '& .MuiListItemIcon-root': {
        color: isSelected ? 'var(--sidebarNew-icon-selected)' : 'var(--sidebarNew-icon)',
    },
}));

const SectionHeader = styled('div')(() => ({
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--sidebarNew-text-secondary)',
    padding: '10px 12px 6px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
}));

const SectionDivider = styled('div')(() => ({
    height: 1,
    margin: '10px 10px',
    backgroundColor: 'var(--sidebarNew-divider)',
}));

const StyledListItemIcon = styled(ListItemIcon)(() => ({
    minWidth: '40px',
    color: 'inherit',
    '& img': {
        width: 20,
        height: 20,
    },
    '& svg': {
        color: 'inherit',
    },
}));

const StyledListItemText = styled(ListItemText, {
    shouldForwardProp: (prop) => prop !== 'isSelected',
})(({ isSelected }) => ({
    margin: 0,
    '& .MuiListItemText-primary': {
        fontSize: 15,
        color: isSelected ? 'var(--sidebarNew-text-selected)' : 'var(--sidebarNew-text-primary)',
        fontWeight: isSelected ? 700 : 600,
        lineHeight: '20px',
    },
}));

const StyledSubListItemText = styled(ListItemText, {
    shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'isNestedParent',
})(({ isSelected, isNestedParent }) => ({
    margin: 0,
    '& .MuiListItemText-primary': {
        fontSize: isNestedParent ? 12 : 14,
        color: isSelected
            ? 'var(--sidebarNew-text-selected)'
            : isNestedParent
                ? 'var(--sidebarNew-text-secondary)'
                : 'var(--sidebarNew-text-primary)',
        fontWeight: isSelected ? 700 : isNestedParent ? 600 : 500,
        lineHeight: isNestedParent ? '16px' : '20px',
    },
}));

const ROUTE_ALIAS_MAP = {
    addRoles: 'roles',
    editRoles: 'roles',
    addAgent: 'agent',
    addTickets: 'agentsTickets',
    singleTicket: 'agentsTickets',
    addItem: 'itemsAndServices',
    editItem: 'itemsAndServices',
    createShipment: 'shipping',
    shipmentDetail: 'shipping',
    addService: 'itemsAndServices',
    editService: 'itemsAndServices',
    userActivations: 'adminApplication',
    applicationInformation: 'adminApplication',
    businessInformation: 'adminApplication',
    ownershipInformation: 'adminApplication',
    financialInformation: 'adminApplication',
    productList: 'adminApplication',
    preferences: 'adminApplication',
    shipmentAndPickup: 'adminApplication',
    selectPlan: 'adminApplication',
    submitApplication: 'adminApplication',
    requestSubmitted: 'adminApplication',
    editApplication: 'adminApplication',
    customerInfo: ['customerList', 'salesCustomers'],
    addLeads: 'leadsList',
    editLead: 'leadsList',
    techInstallation: 'techInstallationList',
    techInstallationEdit: 'techInstallationList',
    profitLossReport: 'accountsReports',
    expenseReport: 'accountsReports',
    balanceSheet: 'accountsReports',
    trialBalance: 'accountsReports',
    taxReports: 'accountsReports',
    'payroll-summary': 'payroll',
    'payroll-tax-details': 'payroll',
    reportDetails: 'reports',
    agentPayoutReportDetail: 'reports',
    addMemo: 'memo',
    maintainMemo: 'memo',
    addForm: 'form',
    maintainForm: 'form',
    addPolicy: 'policy',
    maintainPolicy: 'policy',
    editVendor: 'vendors',
    addSupplier: ['vendors', 'suppliers'],
    supplier: 'suppliers',
    leadInfo: ['leadsList', 'sales'],
    sales: ['leadsList', 'sales'],
    createInvoice: 'invoices',
    customerInvoices: 'salesCustomers',
    'invoice-receive-payment': 'invoices',
    editInvoice: 'invoices',
    singleInvoice: 'invoices',
    previewInvoice: 'invoices',
    editJournalEntry: 'journalEntry',
    'chart-of-accounts': 'chartOfAccounts',
    projectTracking: 'projectTracking',
    addNewTask: 'projectTracking',
    addInventoryItem: 'allInventory',
    addInventory: 'allInventory',
    editInventory: 'allInventory',
    snItemDetail: 'snReport',
    maintainTraining: 'training',
    call: 'chat',
    editCustomer: 'customerList',
    addCustomer: 'customerList',
    addPurchase: 'purchase',
    editPurchase: 'purchase',
    applicationPreferences: 'customerList',
    createSalesOrder: 'salesOrder',
    agreementConfiguration: 'supportSetup',
    agentManagementDetail: 'agentManagement',
};

const normalizeRoutePath = (path) => {
    if (!path) return path;
    return String(path).replace(/^\/+/, '').replace(/\/+$/, '');
};

const inferParentRouteFromPrefix = (base) => {
    const auxMatch = base.match(/^(add|edit)(.+)$/);
    if (!auxMatch || !auxMatch[2]) return null;
    return auxMatch[2].charAt(0).toLowerCase() + auxMatch[2].slice(1);
};

const safeJsonParse = (value, fallback = null) => {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const getDetailParentRouteForPath = (currentPath, fromRoute) => {
    const base = normalizeRoutePath(currentPath).split('/')[0];

    if (base === 'taskDetail') {
        const route = fromRoute || getTaskDetailSidebarRoute();
        return TASK_DETAIL_PARENT_ROUTES.includes(route) ? route : null;
    }

    if (base === 'supportTicketDetail') {
        const route = fromRoute || getSupportTicketDetailSidebarRoute();
        return SUPPORT_TICKET_DETAIL_PARENT_ROUTES.includes(route) ? route : null;
    }

    return null;
};

const pathMatchesRoute = (currentPath, route, detailParentRoute = null) => {
    const normalizedCurrentPath = normalizeRoutePath(currentPath);
    const normalizedRoute = normalizeRoutePath(route);

    if (detailParentRoute) {
        return detailParentRoute === normalizedRoute;
    }

    if (normalizedCurrentPath === normalizedRoute) return true;
    if (normalizedCurrentPath.startsWith(`${normalizedRoute}/`)) return true;
    if (normalizedCurrentPath === '' && route === 'dashboardScreen') return true;

    const base = normalizedCurrentPath.split('/')[0];

    const mapped = ROUTE_ALIAS_MAP[base];

    if (Array.isArray(mapped)) {
        if (mapped.includes(normalizedRoute)) return true;
    } else if (mapped === normalizedRoute) {
        return true;
    }

    const inferredParent = inferParentRouteFromPrefix(base);
    return inferredParent === normalizedRoute;
};

const SIDEBAR_ICON = 'var(--sidebarNew-icon)';
const SIDEBAR_ICON_SELECTED = 'var(--sidebarNew-icon-selected)';

const pngSidebarIcon = (src, isSelected) => (
    <Box
        component="span"
        sx={{
            display: 'block',
            flexShrink: 0,
            width: 16,
            height: 16,
            bgcolor: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON,
            mask: `url(${src}) center / contain no-repeat`,
            WebkitMask: `url(${src}) center / contain no-repeat`,
        }}
    />
);

const sidebarIconSx = (minWidth = 40, isSelected = false, size = 20) => ({
    minWidth,
    color: `${isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} !important`,
    '& svg': {
        width: size,
        height: size,
        color: 'inherit !important',
    },
    // Outer SVGR icons hardcode fill="white" on paths — force theme color
    '& svg path[fill], & svg circle[fill], & svg rect[fill], & svg g[fill]': {
        fill: 'currentColor !important',
    },
    // Mask/png icons only — exclude notification badge spans
    '& span:not(.sidebar-notif-dot)': {
        width: `${size}px !important`,
        height: `${size}px !important`,
        bgcolor: `${isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} !important`,
    },
});

const subItemIconSx = (minWidth = 28, isSelected = false) => sidebarIconSx(minWidth, isSelected, 16);

const notifDotStyle = {
    position: 'absolute',
    top: '-2px',
    right: '15px',
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    border: '2px solid var(--sidebarNew-bg)',
    zIndex: 1000,
};

const EMPTY_ARRAY = [];

const SIDEBAR_SECTIONS = [
    { title: null, itemIds: [1, 27, 25, 29, 30] },
    { title: 'Operations', itemIds: [2, 39, 23, 28] },
    { title: 'Business', itemIds: [33, 47, 57] },
    { title: 'Management', itemIds: [38, 44] },
    { title: 'System', itemIds: [40] },
];

const applyIconColor = (element, color) => {
    if (!React.isValidElement(element)) return element;
    const prevStyle = element.props?.style || {};
    return React.cloneElement(element, {
        fill: color,
        color,
        style: {
            ...prevStyle,
            color,
            fill: color,
            ...(prevStyle.backgroundColor != null ? { backgroundColor: color } : {}),
        },
    });
};

const renderSidebarIcon = (icon, isSelected, hoverIcon) => {
    const color = isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON;

    if (typeof icon === 'function') {
        return applyIconColor(icon(isSelected), color);
    }
    if (React.isValidElement(icon)) {
        return applyIconColor(icon, color);
    }
    if (hoverIcon) {
        return <img src={isSelected ? hoverIcon : icon} alt="" />;
    }
    return icon;
};

const groupMenuBySections = (items) => {
    const itemMap = new Map((items ?? []).map((item) => [item.id, item]));
    const usedIds = new Set();

    const sections = SIDEBAR_SECTIONS.map(({ title, itemIds }) => {
        const sectionItems = itemIds
            .map((id) => itemMap.get(id))
            .filter(Boolean);
        sectionItems.forEach((item) => usedIds.add(item.id));
        return { title, items: sectionItems };
    }).filter((section) => section.items.length > 0);

    const remainingItems = (items ?? []).filter((item) => !usedIds.has(item.id));
    if (remainingItems.length > 0) {
        sections.push({ title: 'More', items: remainingItems });
    }

    return sections;
};

export default function SideBar({ window } = {}) {
    // const { window } = props;
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [desktopDrawerOpen, setDesktopDrawerOpen] = React.useState(true); // Initially open on desktop
    const [currentRoute, setCurrentRoute] = React.useState();
    const [projectOpen, setProjectOpen] = React.useState(false);
    const [trackerOpen, setTrackerOpen] = React.useState(false);
    const [operationOpen, setOperationOpen] = React.useState(false);
    const [settingOpen, setSettingOpen] = React.useState(false);
    const [staffManagementOpen, setStaffManagementOpen] = React.useState(false);
    const [ticketOpen, setTicketOpen] = React.useState(false);
    const [supportOpen, setSupportOpen] = React.useState(false);
    const [agentManagementOpen, setAgentManagementOpen] = React.useState(false);
    const [salesFlowOpen, setSalesFlowOpen] = React.useState(false);
    const [salesCrmOpen, setSalesCrmOpen] = React.useState(false);
    const [accountingOpen, setAccountingOpen] = React.useState(false);
    const [nestedOpenKeys, setNestedOpenKeys] = React.useState(() => new Set());
    const [loading, setLoading] = React.useState(true); // Add loading state
    const [openLogoutModal, setOpenLogoutModal] = React.useState(false);

    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    React.useEffect(() => {
        syncSidebarCurrentWidth({ isDesktop, isOpen: desktopDrawerOpen, openWidth: drawerWidth, collapsedWidth });
        return () => clearSidebarCurrentWidth();
    }, [isDesktop, desktopDrawerOpen]);

    const location = useLocation();
    const dispatch = useDispatch();
    const navigation = useNavigate();
    const userData = useSelector((state) => state?.userData?.userDetails);
    // Use stable EMPTY_ARRAY fallback — inline `?? []` creates a new ref every render and can loop
    const scopes = useSelector((state) => state?.auth?.scopes ?? EMPTY_ARRAY);
    const tenantLogo = useSelector((state) => state?.auth?.tenantLogo);
    const tenantFeatures = useSelector((state) => state?.auth?.tenantFeatures ?? EMPTY_ARRAY);
    const { hasUnreadMessages = false, clearBadge } = useChatNotification() ?? {};
    const { newNotificationCount: notificationUnreadCount = 0 } = useNotifications() ?? {};

    const isAdminRole =
        String(userData?.roleTitle || '').trim().toLowerCase() === 'admin';

    const currentPath = location?.pathname?.replace("/home/", "") ?? "";
    // /join/* mounts this same Sidebar shell so meeting invite links keep the nav for logged-in users
    const isJoinRoute = Boolean(location?.pathname?.startsWith("/join"));
    const detailParentRoute = React.useMemo(
        () => getDetailParentRouteForPath(currentPath, location.state?.fromRoute),
        [currentPath, location.state?.fromRoute]
    );
    const [menuList, setMenuList] = React.useState([
        {
            id: 1,
            name: "Dashboard",
            route: "dashboardScreen",
            category: "system",
            icon: <SVG.DashboardIcon style={{ width: '20px', height: '20px' }} />,
            hoverIcon: <SVG.DashboardIcon style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 27,
            name: "Drive",
            route: "storageBucket",
            category: "files",
            icon: <SVG.StorageIcon style={{ width: '20px', height: '20px' }} />,
            hoverIcon: <SVG.StorageIcon style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 25,
            name: "Calendar",
            route: "calendar",
            category: "project",
            icon: <SVG.CalenderIcon style={{ width: '20px', height: '20px' }} />,
            hoverIcon: <SVG.CalenderIcon style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 29,
            name: "Chat",
            route: "chat",
            category: "communication",
            icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>,
            hoverIcon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>,
        },
        // {
        //     id: 50,
        //     name: "Sales",
        //     route: "sales",
        //     category: "sales",
        //     icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        //     </svg>,
        //     hoverIcon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        //     </svg>,
        //     subItems: [
        //         {
        //             id: 51, name: "Leads", route: "sales", category: "sales", icon: (isSelected) => (
        //                 <svg style={{ width: '16px', height: '16px', color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        //                 </svg>
        //             ),
        //         },
                
        //     ],
        // },
        {
            id: 30,
            name: "Notifications",
            route: "notifications",
            category: "communication",
            icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>,
            hoverIcon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>,
        },
        {
            id: 2,
            name: "Operation",
            category: 'accounting',
            icon: <SVG.OperationIcon style={{ width: '20px', height: '20px' }} />,
            subItems: [
                {
                    id: 5, name: "Inventory", route: "allInventory", category: "inventory", icon: (isSelected) => (
                        <span style={{ display: 'block', flexShrink: 0, backgroundColor: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px', WebkitMask: 'url(/inventory.png) center / contain no-repeat', mask: 'url(/inventory.png) center / contain no-repeat' }} />
                    ),
                },
                {
                    id: 41, name: "Serial Number Report", route: "snReport", category: "inventory", icon: (isSelected) => (
                        <span style={{ display: 'block', flexShrink: 0, backgroundColor: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px', WebkitMask: 'url(/snreport.svg) center / contain no-repeat', mask: 'url(/snreport.svg) center / contain no-repeat' }} />
                    ),
                },
                {
                    id: 42, name: "Returns", route: "returns", category: "inventory", icon: (isSelected) => (
                        <span style={{ display: 'block', flexShrink: 0, backgroundColor: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px', WebkitMask: 'url(/returns.svg) center / contain no-repeat', mask: 'url(/returns.svg) center / contain no-repeat' }} />
                    ),
                },
                {
                    id: 44, name: "Shipping", route: "shipping", category: "inventory", icon: (isSelected) => (
                        <SVG.Shipping fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 6, name: "Items & Services", route: "itemsAndServices", category: "inventory", icon: (isSelected) => (
                        <SVG.ItemService fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                
            ],
        },
        {
            id: 39,
            name: "Internal Ticket Management",
            category: "system",
            icon: <SVG.Ticket style={{ width: '20px', height: '20px' }} />,
            subItems: [
                {
                    id: 3, name: "Internal Tickets", category: "system", route: "agentsTickets", icon: (isSelected) => (
                        <SVG.Ticket fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 20, name: "Inactive Tickets", category: "system", route: "invalidTickets", icon: (isSelected) => pngSidebarIcon('/inactive-tickets.png', isSelected),
                },
                {
                    id: 18, name: "Ticket Types", route: "ticketTypes", category: "system", icon: (isSelected) => pngSidebarIcon('/ticket-types.png', isSelected),
                },
                {
                    id: 16, name: "Ticket Category", route: "category", category: "system", icon: (isSelected) => pngSidebarIcon('/ticket-category.png', isSelected),
                },
            ],
        },
        {
            id: 23,
            name: "Project Management",
            category: "project",
            icon: <SVG.Projects />,
            subItems: [
                {
                    id: 24, name: "Project Board", category: "project", route: "projectTracking", icon: (isSelected) => (
                        <SVG.PTIcone fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 26, name: "Assigned Tasks", category: "project", route: "myTask", icon: (isSelected) => (
                        <SVG.MyTask fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
            ],
        },
        {
            id: 28,
            name: "Performance Management",
            category: "project",
            icon: <SVG.PerformanceTrackerIcon />,
            subItems: [
                {
                    id: 30, name: "Performance Tracking Reports", category: "project", route: "trackingReports", icon: (isSelected) => (
                        <SVG.TrackerReport fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 43, name: "Project Performance Reports", category: "project", route: "performanceReport", icon: (isSelected) => pngSidebarIcon('/performance-report.png', isSelected),
                },
                {
                    id: 31, name: "Tracker Set-up", category: "project", route: "trackerSetup", icon: (isSelected) => (
                        <SVG.TrackerSetup fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
            ],
        },
        {
            id: 33,
            name: "Client Management/CRM",
            category: "crm",
            icon: <SVG.MerchantSupportIcon />,
            subItems: [
                {
                    id: 34, name: "Application", category: "crm", route: "adminApplication", icon: (isSelected) => pngSidebarIcon('/application-list.png', isSelected),
                },
                {
                    id: 35, name: "Board View", category: "crm", route: "merchantSupport", icon: (isSelected) => pngSidebarIcon('/board-view.png', isSelected),
                },
                {
                    id: 73,
                    name: "Merchant Change Request",
                    category: "crm",
                    route: "merchantChangeRequest",
                    // Show when change-requests is enabled, or when Merchant Info (customers)
                    // is available so the page is reachable during feature rollout.
                    anyFeatureCodes: ["change-requests", "change-request", "customers"],
                    icon: (isSelected) => (
                        <SVG.FormIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 36, name: "Support Setup", category: "crm", route: "supportSetup", icon: (isSelected) => pngSidebarIcon('/support-setup.png', isSelected),
                },
                {
                    id: 37, name: "Support Ticket", category: "crm", route: "maintananceTicket", icon: (isSelected) => (
                        <SVG.SupportTicketOpen fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 14, name: "Merchant Info", category: "crm", route: "customerList", icon: (isSelected) => pngSidebarIcon('/merchant-info.png', isSelected),
                },
                {
                    id: 41, name: "Tech Installation", category: "crm", route: "techInstallationList", icon: (isSelected) => pngSidebarIcon('/tech-installation.png', isSelected),
                },
                {
                    id: 32, name: "Support Forms", route: "support", category: "system", icon: (isSelected) => (
                        <SVG.Support fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 11, name: "Form List", route: "form", category: "hr", icon: (isSelected) => (
                        <SVG.FormIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 12, name: "Support Request", route: "policy", category: "hr", icon: (isSelected) => (
                        <SVG.Policy fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 22, name: "Vendors", route: "vendors", category: "accounting", icon: (isSelected) => (
                        <SVG.VendorIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
            ],
        },
        {
            id: 47,
            name: "Agent Management",
            category: "hr",
            icon: <SVG.StaffIcon style={{ width: '20px', height: '20px' }} />,
            subItems: [
                {
                    id: 46, name: "Agents Application", category: "hr", route: "agentManagement", icon: (isSelected) => pngSidebarIcon('/agent-management.png', isSelected),
                },
                {
                    id: 8, name: "Agent Payout", route: "agentPayout", category: "accounting", icon: (isSelected) => (
                        <SVG.Payout fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
            ],
        },
        {
            id: 57,
            name: "Sales Management",
            category: "sale",
            icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>,
            subItems: [
                {
                    id: 21, name: "Leads", route: "leadsList", category: "crm", icon: (isSelected) => pngSidebarIcon('/leads.png', isSelected),
                },
                {
                    id: 60, name: "Opportunities", route: "opportunities", category: "sale", icon: (isSelected) => pngSidebarIcon('/oppurtunity.png', isSelected),
                },
                {
                    id: 61, name: "Quotations", route: "quotations", category: "sale", icon: (isSelected) => pngSidebarIcon('/quotations.png', isSelected),
                },
                {
                    id: 62, name: "Sales Orders", route: "salesOrder", category: "sale", icon: (isSelected) => pngSidebarIcon('/sales-order.png', isSelected),
                },
                {
                    id: 34, name: "Sales Form Builder", category: "sale", route: "salesFormBuilder", icon: (isSelected) => (
                        <SVG.AttendanceIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
            ],
        },
        {
            id: 38,
            name: "Workforce Management",
            category: "hr",
            icon: <SVG.StaffIcon style={{ width: '20px', height: '20px' }} />,
            subItems: [
                {
                    id: 34, name: "Attendance Reports", category: "hr", route: "attendanceReport", icon: (isSelected) => pngSidebarIcon('/attendance-report.png', isSelected),
                },
                {
                    id: 35, name: "Attendance Logs", category: "hr", route: "attendanceLog", icon: (isSelected) => (
                        <SVG.AttendanceIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 9, name: "Employee List", category: "system", route: "agent", icon: (isSelected) => (
                        <SVG.StaffIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 15, name: "Roles", route: "roles", category: "system", icon: (isSelected) => (
                        <SVG.RolesICone fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 10, name: "Memos", category: "communication", route: "memo", icon: (isSelected) => (
                        <SVG.Memo fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 13, name: "Training & Development", route: "training", category: "hr", icon: (isSelected) => pngSidebarIcon('/training.png', isSelected),
                },
            ],
        },
        {
            id: 44,
            name: "Accounting Management",
            category: 'accounting',
            icon: <SVG.CreditCard style={{ width: '20px', height: '20px' }} />,
            subItems: [
                {
                    id: 45, name: "Chart of Accounts", route: "chartOfAccounts", category: 'accounting', icon: (isSelected) => (
                        <SVG.InvoiceIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 52,
                    name: "Expenses",
                    category: 'accounting',
                    icon: (isSelected) => (
                        <SVG.Purchase fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                    subItems: [
                        // { id: 5201, name: "Expenses", route: "expenses" },
                        { id: 5202, category: 'accounting', name: "Suppliers", route: "suppliers", icon: (isSelected) => pngSidebarIcon('/suppliers.png', isSelected) },
                        {
                            id: 7, name: "Purchase", route: "purchase", category: "inventory",
                            icon: (isSelected) => pngSidebarIcon('/purchase-order.png', isSelected),
                        },
                    ]
                },
                {
                    id: 54,
                    name: "Sales",
                    category: 'accounting',
                    icon: (isSelected) => (
                        <svg style={{ width: '16px', height: '16px', color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    subItems: [
                        { id: 5401, category: 'accounting', name: "Customers", route: "salesCustomers", icon: (isSelected) => pngSidebarIcon('/customers.png', isSelected) },
                        {
                            id: 4, name: "Invoices", route: "invoices", category: 'accounting',
                            icon: (isSelected) => pngSidebarIcon('/invoices.png', isSelected),
                        },
                    ]
                },
                {
                    id: 56,
                    name: "Reports",
                    category: 'accounting',
                    icon: (isSelected) => (
                        <SVG.Reports fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                    subItems: [
                        {
                            id: 51, name: "Accounts Reports", route: "accountsReports", category: 'accounting', icon: (isSelected) => pngSidebarIcon('/account-report.png', isSelected),
                        },
                        {
                            id: 14, name: "Payout Report", route: "reports", category: 'accounting', icon: (isSelected) => pngSidebarIcon('/payout-report.png', isSelected),
                        },
                    ]
                },
                // {
                //     id: 46, name: "Transactions", route: "transactions", icon: (isSelected) => (
                //         <SVG.Support fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                //     ),
                // },
                // {
                //     id: 47, name: "Reconciliation", route: "reconciliation", icon: (isSelected) => (
                //         <SVG.TrackerReport fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                //     ),
                // },
                {
                    id: 48, name: "Journal Entry", route: "journalEntry", category: 'accounting', icon: (isSelected) => (
                        <SVG.Memo fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                // {
                //     id: 50, name: "Trial Balance", route: "trialBalance", icon: (isSelected) => (
                //         <SVG.TrackerReport fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                //     ),
                // },

                {
                    id: 53, name: "Payroll", route: "payroll", category: "hr", icon: (isSelected) => (
                        <SVG.Payout fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                // {
                //     id: 49, name: "Suppliers", route: "suppliers", icon: (isSelected) => (
                //         <SVG.VendorIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                //     ),
                // },
            ],
        },
        {
            id: 40,
            name: "Settings",
            category: "system",
            icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>,
            subItems: [
                {
                    id: 19, name: "Change Password", category: "system", route: "changePassword", icon: (isSelected) => (
                        <SVG.StaffIcon fill={isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} style={{ color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON, width: '16px', height: '16px' }} />
                    ),
                },
                {
                    id: 71,
                    name: "GoTo Connect",
                    category: "system",
                    route: "gotoSettings",
                    anyFeatureCodes: GOTO_SALES_FEATURE_CODES,
                    icon: (isSelected) => (
                        <svg
                            style={{
                                width: '16px',
                                height: '16px',
                                color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                        </svg>
                    ),
                },
                {
                    id: 73,
                    name: "Authorize.Net",
                    category: "system",
                    route: "authorizeNetSettings",
                    anyFeatureCodes: ["invoices"],
                    icon: (isSelected) => (
                        <svg
                            style={{
                                width: '16px',
                                height: '16px',
                                color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                        </svg>
                    ),
                },
                {
                    id: 74,
                    name: "FedEx",
                    category: "system",
                    route: "fedexSettings",
                    anyFeatureCodes: ["inventory", "invoices"],
                    icon: (isSelected) => (
                        <svg
                            style={{
                                width: '16px',
                                height: '16px',
                                color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 17h8M5 17a2 2 0 11-4 0 2 2 0 014 0zm18 0a2 2 0 11-4 0 2 2 0 014 0zM3 17H2V7a1 1 0 011-1h9l3 4h6a1 1 0 011 1v6h-1"
                            />
                        </svg>
                    ),
                },
                {
                    id: 72,
                    name: "Audit Log",
                    category: "system",
                    route: "auditLog",
                    skipFeatureGate: true,
                    icon: (isSelected) => (
                        <svg
                            style={{
                                width: '16px',
                                height: '16px',
                                color: isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON,
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                        </svg>
                    ),
                },
            ],
        },
    ]);

    const auditLogModules = useSelector((state) => state?.auth?.auditLogModules ?? EMPTY_ARRAY);

    const accessibleAuditModules = React.useMemo(
        () => filterAuditModulesByTenantFeatures(auditLogModules, tenantFeatures),
        [auditLogModules, tenantFeatures]
    );

    const canShowAuditLog = React.useMemo(
        () => canAccessAuditLog(auditLogModules, tenantFeatures),
        [auditLogModules, tenantFeatures]
    );

    const auditLogScopeCodes = React.useMemo(() => {
        const codes = new Set(['auditlog', 'audit-log']);
        accessibleAuditModules.forEach((module) => {
            getAuditModuleFeatureCandidates(module).forEach((code) => codes.add(code));
        });
        return [...codes];
    }, [accessibleAuditModules]);

    // Admin → tenantFeatures only; other roles → tenantFeatures ∩ scopes
    // (scope alone is not enough if the tenant feature is disabled)
    // Audit Log → only when modules ∩ enabled tenant features is non-empty
    const filteredMenuList = React.useMemo(() => {
        const enabledFeatureCodes = getEnabledFeatureCodes(tenantFeatures);
        const menuWithAuditScopes = (menuList ?? []).map((item) => {
            if (item?.id !== 40 || !Array.isArray(item?.subItems)) return item;
            return {
                ...item,
                subItems: item.subItems.map((sub) =>
                    String(sub?.route || '').toLowerCase() === 'auditlog'
                        ? { ...sub, anyFeatureCodes: auditLogScopeCodes }
                        : sub
                ),
            };
        });

        const byTenant = filterMenuByTenantFeatures(menuWithAuditScopes, enabledFeatureCodes);
        const byRole = isAdminRole ? byTenant : filterMenuByScopes(byTenant, scopes);
        return filterMenuByAuditLogAccess(byRole, canShowAuditLog);
    }, [isAdminRole, tenantFeatures, scopes, menuList, canShowAuditLog, auditLogScopeCodes]);

    const firstAllowedRoute = React.useMemo(() => {
        const flatten = (items) => {
            return (items || []).reduce((acc, item) => {
                if (item?.route) acc.push(item.route);
                if (Array.isArray(item?.subItems) && item.subItems.length > 0) {
                    acc.push(...flatten(item.subItems));
                }
                return acc;
            }, []);
        };

        const routes = flatten(filteredMenuList)
            .filter(Boolean)
            .map((r) => String(r).replace(/^\/+/, ''));

        return routes.length > 0 ? routes[0] : null;
    }, [filteredMenuList]);

    const isCurrentRouteAllowed = React.useMemo(() => {
        if (isJoinRoute) return true;

        const flattenSet = (items, set) => {
            (items || []).forEach((item) => {
                if (item?.route) set.add(String(item.route).replace(/^\/+/, ''));
                if (Array.isArray(item?.subItems) && item.subItems.length > 0) {
                    flattenSet(item.subItems, set);
                }
            });
            return set;
        };

        const allowed = flattenSet(filteredMenuList, new Set());
        const alwaysAccessibleDetailRoutes = new Set([
            'profile',
            'singleInvoice',
            'editInvoice',
            'singleTicket',
            'supportTicketDetail',
            'taskDetail',
            'supplier',
            'editJournalEntry',
            'invoice-receive-payment',
            'opportunities',
            'applicationLinkSettings',
        ]);

        const resolveToAllowedRoute = (path) => {
            if (!path) return null;
            const normalized = String(path).replace(/^\/+/, '');
            if (allowed.has(normalized)) return normalized;

            const base = normalized.split('/')[0];
            // Special handling for taskDetail URLs - always allow them regardless of parent route
            if (base === 'taskDetail') return base;
            if (alwaysAccessibleDetailRoutes.has(base)) return base;
            if (allowed.has(base)) return base;

            const detailParent = getDetailParentRouteForPath(normalized, location.state?.fromRoute);
            if (detailParent && allowed.has(detailParent)) return detailParent;

            const inferredParent = inferParentRouteFromPrefix(base);
            if (inferredParent && allowed.has(inferredParent)) return inferredParent;

            const mapped = ROUTE_ALIAS_MAP[base];

            if (Array.isArray(mapped)) {
                for (const m of mapped) {
                    if (allowed.has(m)) return m;
                }
            } else if (mapped && allowed.has(mapped)) {
                return mapped;
            }
            return null;
        };

        if (!currentPath) return false;
        return Boolean(resolveToAllowedRoute(currentPath));
    }, [filteredMenuList, currentPath, location.state?.fromRoute, isJoinRoute]);

    React.useEffect(() => {
        if (loading) return;
        if (!currentPath) return;
        if (!firstAllowedRoute) return;

        if (!isCurrentRouteAllowed) {
            navigation(firstAllowedRoute, { replace: true });
        }
    }, [currentPath, firstAllowedRoute, isCurrentRouteAllowed, navigation, loading]);


    const handleDrawerToggle = () => {
        if (isDesktop) {
            setDesktopDrawerOpen(!desktopDrawerOpen);
        } else {
            setMobileOpen(!mobileOpen);
        }
    };

    const handleLogout = () => {
        setOpenLogoutModal(false);
        performLogout(dispatch, { clearAccessToken, clearUserDetails });
    };

    // Update handleLogout to handle the modal
    const confirmLogout = () => {
        setOpenLogoutModal(true);
    };


    React.useEffect(() => {
        let cancelled = false;

        const hydrateAuth = async () => {
            const accessToken = localStorage.getItem('accessToken');
            const userDetails = safeJsonParse(localStorage.getItem('userDetails'));
            const storedScopes = safeJsonParse(localStorage.getItem('scopes'), []);
            const storedTenantFeatures = safeJsonParse(localStorage.getItem('tenantFeatures'), []);
            const storedAuditLogModules = safeJsonParse(localStorage.getItem('auditLogModules'), []);
            const categories = safeJsonParse(localStorage.getItem('categories'), []);
            const tenantLogo = localStorage.getItem('tenantLogo');

            if (accessToken) {
                dispatch(setAccessToken(accessToken));
            }
            if (userDetails) {
                dispatch(setUserDetails(userDetails));
            }
            if (Array.isArray(storedScopes) && storedScopes.length > 0) {
                dispatch(setScopes(storedScopes));
            }
            if (tenantLogo) {
                dispatch(setTenantLogo(tenantLogo));
            }
            if (Array.isArray(storedTenantFeatures)) {
                dispatch(setTenantFeatures(storedTenantFeatures));
            }
            if (Array.isArray(storedAuditLogModules)) {
                dispatch(setAuditLogModules(storedAuditLogModules));
            }
            if (Array.isArray(categories) && categories.length > 0) {
                dispatch(setCategories(categories));
            }

            // Refresh scopes, features, and company group from /auth/me on every reload
            if (accessToken) {
                try {
                    await fetchAndApplyAuthMe(dispatch, accessToken);
                    if (cancelled) return;
                } catch {
                    // Keep localStorage/redux scopes & tenantFeatures if auth/me fails
                }

                // Refresh audit-log modules (used to gate Audit Log menu + dropdown)
                try {
                    const auditModules = await fetchAuditLogModules(accessToken);
                    if (!cancelled) {
                        dispatch(setAuditLogModules(auditModules));
                    }
                } catch {
                    // Keep cached modules if the request fails
                }
            }

            if (!cancelled) {
                setLoading(false);
            }
        };

        hydrateAuth();
        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    React.useEffect(() => {
        // Update the focused screen in the sidebar list based on the current location
        const currentRoute = location?.pathname?.replace("/", "") ?? "";
        setCurrentRoute(currentRoute)
    }, [location?.pathname]);

    React.useEffect(() => {
        const base = currentPath.split('/')[0];
        if (TASK_DETAIL_PARENT_ROUTES.includes(base)) {
            setTaskDetailSidebarRoute(base);
        }
        if (SUPPORT_TICKET_DETAIL_PARENT_ROUTES.includes(base)) {
            setSupportTicketDetailSidebarRoute(base);
        }
    }, [currentPath]);

    React.useEffect(() => {
        if (!detailParentRoute) return;
        const base = normalizeRoutePath(currentPath).split('/')[0];
        if (base === 'taskDetail') {
            setTaskDetailSidebarRoute(detailParentRoute);
        } else if (base === 'supportTicketDetail') {
            setSupportTicketDetailSidebarRoute(detailParentRoute);
        }
    }, [currentPath, detailParentRoute]);

    let moveScreen = (route) => {
        navigation(route);
    };

    const isRouteSelected = (route) => {
        if (!route) return false;
        return pathMatchesRoute(currentPath, route, detailParentRoute);
    };

    const hasSelectedSubItem = (subItems) => {
        return (subItems ?? []).some((sub) =>
            isRouteSelected(sub?.route) ||
            (Array.isArray(sub?.subItems) && hasSelectedSubItem(sub.subItems))
        );
    };

    React.useEffect(() => {
        if (!currentPath) return;

        const nextNestedKeys = new Set();

        (filteredMenuList ?? []).forEach((item) => {
            if (!item?.subItems || !hasSelectedSubItem(item.subItems)) return;

            switch (item?.name) {
                case 'Operation':
                    setOperationOpen(true);
                    break;
                case 'Project Management':
                    setProjectOpen(true);
                    break;
                case 'Internal Ticket Management':
                    setTicketOpen(true);
                    break;
                case 'Performance Management':
                    setTrackerOpen(true);
                    break;
                case 'Accounting Management':
                    setAccountingOpen(true);
                    (item?.subItems ?? []).forEach((sub) => {
                        if (Array.isArray(sub?.subItems) && hasSelectedSubItem(sub.subItems)) {
                            nextNestedKeys.add(`${item.name}:${sub.name}`);
                        }
                    });
                    break;
                case 'Sales':
                    setSalesCrmOpen(true);
                    break;
                case 'Client Management/CRM':
                    setSupportOpen(true);
                    break;
                case 'Agent Management':
                    setAgentManagementOpen(true);
                    break;
                case 'Sales Management':
                    setSalesFlowOpen(true);
                    break;
                case 'Workforce Management':
                    setStaffManagementOpen(true);
                    break;
                case 'Settings':
                    setSettingOpen(true);
                    break;
                default:
                    break;
            }
        });

        if (nextNestedKeys.size > 0) {
            setNestedOpenKeys((prev) => new Set([...prev, ...nextNestedKeys]));
        }
    }, [currentPath, filteredMenuList]);

    const getTopLevelOpenState = (item) => {
        switch (item?.name) {
            case 'Operation': return operationOpen;
            case 'Project Management': return projectOpen;
            case 'Internal Ticket Management': return ticketOpen;
            case 'Performance Management': return trackerOpen;
            case 'Accounting Management': return accountingOpen;
            case 'Client Management/CRM': return supportOpen;
            case 'Agent Management': return agentManagementOpen;
            case 'Sales Management': return salesFlowOpen;
            case 'Sales':
                return item?.category === 'sales' ? salesCrmOpen : false;
            case 'Workforce Management': return staffManagementOpen;
            case 'Settings': return settingOpen;
            default: return false;
        }
    };

    const toggleTopLevelOpen = (item) => {
        switch (item?.name) {
            case 'Operation': setOperationOpen((prev) => !prev); break;
            case 'Project Management': setProjectOpen((prev) => !prev); break;
            case 'Internal Ticket Management': setTicketOpen((prev) => !prev); break;
            case 'Performance Management': setTrackerOpen((prev) => !prev); break;
            case 'Accounting Management': setAccountingOpen((prev) => !prev); break;
            case 'Client Management/CRM': setSupportOpen((prev) => !prev); break;
            case 'Agent Management': setAgentManagementOpen((prev) => !prev); break;
            case 'Sales Management': setSalesFlowOpen((prev) => !prev); break;
            case 'Sales':
                if (item?.category === 'sales') setSalesCrmOpen((prev) => !prev);
                break;
            case 'Workforce Management': setStaffManagementOpen((prev) => !prev); break;
            case 'Settings': setSettingOpen((prev) => !prev); break;
            default: break;
        }
    };

    const renderSubMenuItems = (subItems, parentKey, depth = 1) => (
        (subItems ?? []).map((subItem, index) => {
            if (!subItem) return null;

            const hasNested = Array.isArray(subItem?.subItems) && subItem.subItems.length > 0;
            const isSubItemSelected = isRouteSelected(subItem?.route) ||
                (hasNested && hasSelectedSubItem(subItem.subItems));
            const nestedKey = `${parentKey}:${subItem.name}`;
            const nestedOpen = nestedOpenKeys.has(nestedKey);

            if (hasNested) {
                return (
                    <React.Fragment key={subItem?.id ?? `${nestedKey}-${index}`}>
                        <StyledListItem isSelected={isSubItemSelected} drawerOpen={desktopDrawerOpen}>
                            <StyledSubListItemButton
                                onClick={() => {
                                    setNestedOpenKeys((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(nestedKey)) next.delete(nestedKey);
                                        else next.add(nestedKey);
                                        return next;
                                    });
                                }}
                                isSelected={isSubItemSelected}
                                drawerOpen={desktopDrawerOpen}
                                depth={depth}
                                isNestedParent
                            >
                                {subItem.icon && (
                                    <StyledListItemIcon sx={subItemIconSx(32, isSubItemSelected)}>
                                        {renderSidebarIcon(subItem.icon, isSubItemSelected, subItem.hoverIcon)}
                                    </StyledListItemIcon>
                                )}
                                {desktopDrawerOpen && (
                                    <StyledSubListItemText
                                        primary={subItem.name}
                                        isSelected={isSubItemSelected}
                                        isNestedParent
                                    />
                                )}
                                {desktopDrawerOpen && (
                                    nestedOpen
                                        ? <ExpandLessIcon sx={{ color: 'var(--sidebarNew-text-secondary)', fontSize: 18 }} />
                                        : <ExpandMoreIcon sx={{ color: 'var(--sidebarNew-text-secondary)', fontSize: 18 }} />
                                )}
                            </StyledSubListItemButton>
                        </StyledListItem>
                        {nestedOpen && (
                            <List component="div" disablePadding sx={{ pl: 1.5 }}>
                                {renderSubMenuItems(subItem.subItems, nestedKey, depth + 1)}
                            </List>
                        )}
                    </React.Fragment>
                );
            }

            if (!subItem?.route) return null;

            return (
                <StyledListItem key={subItem?.id ?? index} isSelected={isSubItemSelected} drawerOpen={desktopDrawerOpen}>
                    <StyledSubListItemButton
                        component={RouterLink}
                        to={
                            subItem.route === 'projectTracking'
                                ? '/home/projectTracking/board'
                                : `/home/${subItem.route}`
                        }
                        isSelected={isSubItemSelected}
                        drawerOpen={desktopDrawerOpen}
                        depth={depth}
                    >
                        <Tooltip title={!desktopDrawerOpen ? subItem.name : ''} placement="right">
                            <StyledListItemIcon sx={subItemIconSx(depth >= 2 ? 28 : 32, isSubItemSelected)}>
                                {renderSidebarIcon(subItem.icon, isSubItemSelected, subItem.hoverIcon)}
                            </StyledListItemIcon>
                        </Tooltip>
                        {desktopDrawerOpen && (
                            <StyledSubListItemText
                                primary={subItem.name}
                                isSelected={isSubItemSelected}
                            />
                        )}
                    </StyledSubListItemButton>
                </StyledListItem>
            );
        })
    );

    const renderExpandableMenuItem = (item) => {
        const isSelected = hasSelectedSubItem(item.subItems);
        const isOpen = getTopLevelOpenState(item);

        return (
            <React.Fragment key={item?.id}>
                <StyledListItem isSelected={isSelected} drawerOpen={desktopDrawerOpen}>
                    <Tooltip title={!desktopDrawerOpen ? item?.name ?? '' : ''} placement="right">
                        <StyledListItemButton
                            onClick={() => toggleTopLevelOpen(item)}
                            isSelected={isSelected}
                            isOpen={isOpen}
                        >
                            <StyledListItemIcon sx={sidebarIconSx(40, isSelected)}>
                                {renderSidebarIcon(item.icon, isSelected, item.hoverIcon)}
                            </StyledListItemIcon>
                            {desktopDrawerOpen && (
                                <StyledListItemText primary={item.name} isSelected={isSelected} />
                            )}
                            {desktopDrawerOpen && (
                                isOpen
                                    ? <ExpandLessIcon sx={{ color: 'var(--sidebarNew-text-secondary)', fontSize: 18 }} />
                                    : <ExpandMoreIcon sx={{ color: 'var(--sidebarNew-text-secondary)', fontSize: 18 }} />
                            )}
                        </StyledListItemButton>
                    </Tooltip>
                </StyledListItem>
                {isOpen && desktopDrawerOpen && (
                    <List component="div" disablePadding sx={{ pb: 0.5, pl: 1.5 }}>
                        {renderSubMenuItems(item.subItems, item.name, 1)}
                    </List>
                )}
            </React.Fragment>
        );
    };

    const renderSimpleMenuItem = (item) => {
        const isSelected = isRouteSelected(item?.route);
        const showChatNotification = item?.route === 'chat' && hasUnreadMessages;
        const showNotificationBadge = item?.route === 'notifications' && (notificationUnreadCount ?? 0) > 0;

        if (!item?.route) return null;

        return (
            <StyledListItem key={item?.id} isSelected={isSelected} drawerOpen={desktopDrawerOpen}>
                <Tooltip title={!desktopDrawerOpen ? item?.name ?? '' : ''} placement="right">
                    <StyledListItemButton
                        component={RouterLink}
                        to={`/home/${item.route}`}
                        onClick={() => {
                            if (item?.route === 'chat') {
                                clearBadge?.();
                            }
                        }}
                        isSelected={isSelected}
                    >
                        <StyledListItemIcon sx={{ ...sidebarIconSx(40, isSelected), position: 'relative' }}>
                            {renderSidebarIcon(item.icon, isSelected, item.hoverIcon)}
                            {showChatNotification && (
                                <span className="sidebar-notif-dot" style={notifDotStyle} />
                            )}
                            {showNotificationBadge && (
                                <span className="sidebar-notif-dot" style={notifDotStyle} />
                            )}
                        </StyledListItemIcon>
                        {desktopDrawerOpen && (
                            <StyledListItemText primary={item.name} isSelected={isSelected} />
                        )}
                    </StyledListItemButton>
                </Tooltip>
            </StyledListItem>
        );
    };

    const menuSections = React.useMemo(
        () => groupMenuBySections(filteredMenuList),
        [filteredMenuList]
    );

    const cancelLogout = () => {
        setOpenLogoutModal(false);
    };

    // On mobile the temporary drawer is always expanded; on desktop respect collapse state
    const showSidebarLabels = !isDesktop || desktopDrawerOpen;

    const drawer = (
        <Box
            sx={{
                backgroundColor: 'var(--sidebarNew-bg)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <List
                disablePadding
                sx={{
                    px: 1,
                    py: 0.5,
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--chat-scrollbar-thumb, rgba(156, 163, 175, 0.55)) transparent',
                }}
            >
                {menuSections.map((section, sectionIndex) => (
                    <React.Fragment key={section.title ?? 'main'}>
                        {sectionIndex > 0 && <SectionDivider />}
                        {section.title && showSidebarLabels && (
                            <SectionHeader>{section.title}</SectionHeader>
                        )}
                        {(section.items ?? []).map((item) => {
                            if (!item) return null;
                            if (item?.subItems) return renderExpandableMenuItem(item);
                            return renderSimpleMenuItem(item);
                        })}
                    </React.Fragment>
                ))}
            </List>

            {/* Profile + Logout pinned so they stay visible on short viewports */}
            <Box
                sx={{
                    flexShrink: 0,
                    px: 1,
                    pt: 0.5,
                    pb: { xs: 2, md: 1 },
                    backgroundColor: 'var(--sidebarNew-bg)',
                    borderTop: '1px solid var(--sidebarNew-divider, rgba(0,0,0,0.08))',
                }}
            >
                <StyledListItem isSelected={isRouteSelected('profile')} drawerOpen={showSidebarLabels}>
                    <Tooltip title={!showSidebarLabels ? getUserDisplayName(userData) : ''} placement="right">
                        <StyledListItemButton
                            component={RouterLink}
                            to="/home/profile"
                            isSelected={isRouteSelected('profile')}
                        >
                            <StyledListItemIcon sx={sidebarIconSx(40, isRouteSelected('profile'))}>
                                <UserMenuAvatar user={userData} />
                            </StyledListItemIcon>
                            {showSidebarLabels && (
                                <StyledListItemText primary={getUserDisplayName(userData)} isSelected={isRouteSelected('profile')} />
                            )}
                        </StyledListItemButton>
                    </Tooltip>
                </StyledListItem>
                <Tooltip title={!showSidebarLabels ? 'Logout' : ''} placement="right">
                    <StyledListItemButton onClick={confirmLogout} isSelected={false}>
                        <StyledListItemIcon sx={sidebarIconSx(40, false)}>
                            <SVG.Logout style={{ width: '20px', height: '20px' }} />
                        </StyledListItemIcon>
                        {showSidebarLabels && (
                            <StyledListItemText primary="Logout" isSelected={false} />
                        )}
                    </StyledListItemButton>
                </Tooltip>
            </Box>
        </Box>
    );

    const container =
        window !== undefined ? () => window?.()?.document?.body : undefined;
    if (loading) {
        return <Loader fullscreen message="Loading..." subMessage="Please wait" />; // Render a loading indicator while loading
    }
    return (
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                // p: 3,
                transition: "margin 0.3s",
                marginLeft: {
                    xs: 0,
                    md: desktopDrawerOpen ? `${drawerWidth}px` : `${collapsedWidth}px`,
                },
            }}
        >
            <CssBaseline />
            <Box component="nav" sx={{ flexShrink: 0 }} aria-label="sidebar navigation">
                {/* MOBILE: Temporary Drawer */}
                <Drawer
                    variant="temporary"
                    open={!isDesktop && mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                            // Keep below navbar without overflowing past the viewport bottom
                            top: 64,
                            height: 'calc(100% - 64px)',
                            marginTop: 0,
                            overflow: 'hidden',
                            backgroundColor: 'var(--sidebarNew-bg) !important',
                            backgroundImage: 'none',
                        },
                    }}
                >
                    {drawer}
                </Drawer>

                {/* DESKTOP: Persistent Drawer */}
                <Drawer
                    variant="permanent"
                    open={desktopDrawerOpen}
                    sx={{
                        width: desktopDrawerOpen ? drawerWidth : collapsedWidth,
                        flexShrink: 0,
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': {
                            width: desktopDrawerOpen ? drawerWidth : collapsedWidth,
                            boxSizing: 'border-box',
                            overflowX: 'hidden',
                            overflowY: 'hidden',
                            paddingTop: { xs: 20, md: 8 },
                            transition: 'width 0.3s ease-in-out',
                            backgroundColor: 'var(--sidebarNew-bg) !important',
                            backgroundImage: 'none',
                            zIndex: 1750,
                        },
                    }}
                >
                    {drawer}
                </Drawer>

            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    // p: 3,

                    // width: { sm: `calc(100% - ${drawerWidth}px)` },
                }}
            >

                {!isJoinRoute && !currentPath?.startsWith('chat') && !currentPath?.startsWith('notifications') && !currentPath?.startsWith('call') && !currentPath?.startsWith('changePassword') && !currentPath?.startsWith('profile') && !currentPath?.startsWith('authorizeNetSettings') && !currentPath?.startsWith('gotoSettings') && !currentPath?.startsWith('fedexSettings') && !currentPath?.startsWith('applicationLinkSettings') && <Toolbar />}
                <ChunkErrorBoundary>
                <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /></Box>}>
                    <Routes>
                    <Route path="taskDetail/:projectName/:id" element={<TaskDetail />} />
                    <Route path="taskDetail/:id" element={<TaskDetail />} />
                    <Route path="sales/lead/:id/:stage" element={<LeadDetail />} />
                    <Route path="sales/lead/:id" element={<LeadDetail />} />
                    <Route path="leadInfo/lead/:id/:stage" element={<LeadDetail />} />
                    <Route path="leadInfo/lead/:id" element={<LeadDetail />} />
                    <Route path="opportunities/new" element={<NewOpportunity />} />
                    <Route path="opportunities/:id/:stage" element={<OpportunityDetail />} />
                    <Route path="opportunities/:id" element={<OpportunityDetail />} />
                    <Route index element={isJoinRoute ? <Call /> : (firstAllowedRoute ? <Navigate to={firstAllowedRoute} replace /> : null)} />
                    <Route path="" element={isJoinRoute ? <Call /> : (firstAllowedRoute ? <Navigate to={firstAllowedRoute} replace /> : null)} />
                    {/* <Route path="dashboard/" element={<Dashboard />} /> */}
                    <Route path="invoices/*" element={<Invoices />} />
                    <Route path="customerInvoices/" element={<CustomerInvoices />} />
                    <Route path="itemsAndServices/" element={<ItemsAndServices />} />
                    <Route path="purchase/*" element={<Purchase />} />
                    <Route path="agent/" element={<Agent />} />
                    <Route path="reports/" element={<Reports />} />
                    <Route path="agentPayout/" element={<AgentPayout />} />
                    <Route path="memo/" element={<Memo />} />
                    <Route path="form/" element={<Form />} />
                    <Route path="policy/" element={<Policy />} />
                    <Route path="training/" element={<Training />} />
                    {/* <Route path="ticketsList/" element={<TicketsList />} /> */}
                    <Route path="addAgent/" element={<AddAgent />} />
                    <Route path="agentsTickets/*" element={<AgentsTickets />} />
                    <Route path="singleInvoice/" element={<SingleInvoice />} />
                    <Route path="previewInvoice/" element={<PreviewInvoice />} />
                    <Route path="editItem/" element={<EditItem />} />
                    <Route path="editService/" element={<EditService />} />
                    <Route path="maintainForm/" element={<MaintainForm />} />
                    <Route path="maintainMemo/" element={<MaintainMemo />} />
                    <Route path="addForm/" element={<AddForm />} />
                    <Route path="customerInfo/" element={<CustomerInfo />} />
                    <Route path="maintainTraining/" element={<MaintainTraining />} />
                    <Route path="maintainPolicy/" element={<MaintainPolicy />} />
                    <Route path="addMemo/" element={<AddMemo />} />
                    <Route path="addTraining/" element={<AddTraining />} />
                    <Route path="addItem/" element={<AddItem />} />
                    <Route path="addService/" element={<AddService />} />
                    <Route path="addPolicy/" element={<AddPolicy />} />
                    <Route path="roles/" element={<Roles />} />
                    <Route path="addRoles/" element={<AddRoles />} />
                    <Route path="category/" element={<Category />} />
                    <Route path="adminApplication/*" element={<AdminApplication />} />
                    <Route path="editApplication/" element={<EditApplication />} />
                    <Route path="customerList/*" element={<CustomerList />} />
                    <Route path="salesCustomers/" element={<SalesCustomers />} />
                    <Route path="EditCustomer/" element={<EditCustomer />} />
                    <Route path="applicationPreferences/" element={<ApplicationPreferences />} />
                    <Route path="addTickets/" element={<AddTickets />} />
                    <Route path="editRoles/" element={<EditRoles />} />
                    <Route path="createInvoice/" element={<CreateInvoice />} />
                    <Route path="allInventory/" element={<AllInventory />} />
                    <Route path="addInventory/" element={<AddInventory />} />
                    <Route path="addInventoryItem/" element={<AddInventoryItem />} />
                    <Route path="snReport/" element={<SNReport />} />
                    <Route path="snItemDetail/" element={<SNItemDetail />} />
                    <Route path="editInventory/" element={<EditInventory />} />
                    <Route path="ticketTypes/" element={<TicketTypes />} />
                    <Route path="userActivations/" element={<UserActivations />} />
                    <Route path="applicationInformation/" element={<ApplicationInformation />} />
                    {/* Old per-screen Information routes (bookmarks / old links) */}
                    <Route path="businessInformation/" element={<ApplicationInformation />} />
                    <Route path="ownershipInformation/" element={<ApplicationInformation />} />
                    <Route path="financialInformation/" element={<ApplicationInformation />} />
                    <Route path="preferences/" element={<ApplicationInformation />} />
                    <Route path="selectPlan/" element={<SelectPlan />} />
                    <Route path="submitApplication/" element={<SubmitApplication />} />
                    <Route path="requestSubmitted/" element={<RequestSubmitted />} />
                    <Route path="leadsList/" element={<LeadsList />} />
                    <Route path="addLeads/" element={<AddLeads />} />
                    <Route path="editLead/" element={<EditLead />} />
                    <Route path="singleTicket/" element={<SingleTicket />} />
                    <Route path="invalidTickets/" element={<InvalidTickets />} />
                    <Route path="editJournalEntry/:id" element={<EditJournalEntry />} />
                    <Route path="changePassword/" element={<ChangePassword />} />
                    <Route path="gotoSettings/" element={<GotoSettings />} />
                    <Route path="authorizeNetSettings/" element={<AuthorizeNetSettings />} />
                    <Route path="fedexSettings/" element={<FedexSettings />} />
                    <Route path="applicationLinkSettings/" element={<ApplicationLinkSettings />} />
                    <Route path="profile/" element={<Profile />} />
                    <Route path="vendors/" element={<Vendors />} />
                    <Route path="editVendor/" element={<EditVendor />} />
                    <Route path="addPurchase/" element={<AddPurchase />} />
                    <Route path="editPurchase/" element={<EditPurchase />} />
                    <Route path="reportDetails/" element={<ReportDetails />} />
                    <Route path="agentPayoutReportDetail/" element={<AgentPayoutReportDetail />} />
                    <Route path="editInvoice/" element={<EditInvoice />} />
                    <Route path="projectTracking/" element={<ProjectTracking />} />
                    <Route path="projectTracking/:tab" element={<ProjectTracking />} />
                    <Route path="projectTracking/list/:projectSlug/:projectId" element={<ProjectTracking />} />
                    <Route path="projectTracking/list/:projectSlug/:projectId/:page" element={<ProjectTracking />} />
                    <Route path="projectTracking/list/:projectSlug/:projectId/:page/:rowsPerPage" element={<ProjectTracking />} />
                    <Route path="projectTracking/list/:projectSlug" element={<ProjectTracking />} />
                    <Route path="projectTracking/:tab/:page" element={<ProjectTracking />} />
                    <Route path="projectTracking/:tab/:page/:rowsPerPage" element={<ProjectTracking />} />
                    <Route path="calendar/" element={<Calender />} />
                    <Route path="chat/:chatId?" element={<Chat />} />
                    <Route path="call/activeMeetings" element={<ActiveMeetingsScreen />} />
                    <Route path="call/recordings" element={<MeetingRecordingsScreen />} />
                    <Route path="call/" element={<Call />} />
                    <Route path="notifications/" element={<Notifications />} />
                    <Route path="myTask/*" element={<MyTask />} />
                    <Route path="storageBucket/*" element={<StorageBucket />} />
                    <Route path="trackingReports/*" element={<TrackingReports />} />
                    <Route path="performanceReport/*" element={<PerformanceReport />} />
                    {/* <Route path="trackerSetup/" element={<TrackerSetup />} /> */}
                    <Route path="attendanceReport/*" element={<AttendanceReport />} />
                    <Route path="attendanceLog/*" element={<AttendanceLog />} />
                    <Route path="auditLog/*" element={<AuditLog />} />
                    <Route path="trackerSetup/" element={<TrackerSetupHistory />} />
                    <Route path="support/" element={<Support />} />
                    <Route path="productList/" element={<ProductList />} />
                    <Route path="shipmentAndPickup/" element={<ShipmentAndPickup />} />
                    <Route path="supportSetup/" element={<SupportSetup />} />
                    <Route path="merchantSupport/" element={<MerchantSupport />} />
                    <Route path="merchantChangeRequest" element={<MerchantChangeRequest />} />
                    <Route path="merchantChangeRequest/" element={<MerchantChangeRequest />} />
                    <Route path="merchantChangeRequest/:id" element={<MerchantChangeRequestDetail />} />
                    <Route path="maintananceTicket/" element={<MaintananceTicket />} />
                    <Route path="supportTicketDetail/" element={<SupportTicketDetail />} />
                    <Route path="supportTicketDetail/labelPrint/" element={<LabelPrint />} />
                    <Route path="dashboardScreen/" element={<DashboardScreen />} />
                    <Route path="techInstallation/" element={<TechInstallation />} />
                    <Route path="techInstallationList/" element={<TechInstallationList />} />
                    <Route path="techInstallationEdit/" element={<TechInstallationEdit />} />
                    <Route path="addNewTask/" element={<AddNewTask />} />
                    <Route path="chartOfAccounts/" element={<ChartOfAccounts />} />
                    <Route path="chart-of-accounts/:accountId" element={<ChartOfAccountsDetail />} />
                    <Route path="transactions/" element={<Transactions />} />
                    <Route path="reconciliation/" element={<Reconciliation />} />
                    <Route path="journalEntry/" element={<JournalEntry />} />
                    <Route path="expenses/" element={<Expenses />} />
                    <Route path="trialBalance/" element={<TrialBalance />} />
                    <Route path="suppliers/" element={<Suppliers />} />
                    <Route path="supplier/:id/*" element={<SupplierDetail />} />
                    <Route path="addSupplier" element={<AddSupplier />} />
                    <Route path="accountRegister/" element={<AccountRegister />} />
                    <Route path="accountsReports/" element={<AccountsReports />} />
                    <Route path="profitLossReport/" element={<ProfitLossReport />} />
                    <Route path="expenseReport/" element={<ExpenseReport />} />
                    {/* <Route path="balanceSheet/" element={<BalanceSheet />} /> */}
                    <Route path="balanceSheet/*" element={<BalanceSheet />} />
                    <Route path="taxReports/" element={<TaxReports />} />
                    <Route path="taxReports/stateTax/" element={<StateTax />} />
                    <Route path="payroll/" element={<Payroll />} />
                    <Route path="payroll-summary/" element={<PayrollSummary />} />
                    <Route path="payroll-tax-details/" element={<PayrollTaxDetails />} />
                    <Route path="invoice-receive-payment/:merchantId" element={<InvoiceReceivePayment />} />
                    <Route path="returns/" element={<Returns />} />
                    <Route path="shipping/" element={<Shipping />} />
                    <Route path="createShipment/" element={<CreateShipment />} />
                    <Route path="shipmentDetail/:id" element={<ShipmentDetail />} />
                    <Route path="salesFormBuilder/" element={<SalesFormBuilder />} />
                    <Route path="salesFormBuilder/:tab" element={<SalesFormBuilder />} />
                    <Route path="sales/" element={<LeadInfo />} />
                    <Route path="leadInfo/" element={<LeadInfo />} />
                    <Route path="opportunities/" element={<Opportunities />} />
                    <Route path="quotations/" element={<Quotations />} />
                    <Route path="salesOrder/" element={<SalesOrder />} />
                    <Route path="salesOrder/:id" element={<SalesOrderDetail />} />
                    <Route path="createSalesOrder/" element={<CreateSalesOrder />} />
                    <Route path="agreementConfiguration/" element={<AgreementConfiguration />} />
                    <Route path="agentManagementDetail/:id" element={<AgentManagementDetail />} />
                    <Route path="agentManagement" element={<AgentManagement />} />
                    <Route path="agentManagement/*" element={<AgentManagement />} />
                    {/* <Route path="bill-outstanding/:billId" element={<BillOutstandingTransactions />} /> */}
                    <Route path="*" element={isCurrentRouteAllowed ? <NotFound /> : (firstAllowedRoute ? <Navigate to={firstAllowedRoute} replace /> : <NotFound />)} />
                </Routes>
                </Suspense>
                </ChunkErrorBoundary>
            </Box>

            <IconButton
                color="inherit"
                aria-label="toggle drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                    position: "fixed",
                    top: { xs: 6, sm: 8, md: 8 },
                    left: {
                        xs: 4,
                        sm: 8,
                        md: 8,
                    },
                    zIndex: 2100,
                    width: { xs: 40, md: 48 },
                    height: { xs: 40, md: 48 },
                    borderRadius: "50%",
                    transition: "left 0.3s",
                    color: "var(--navbar-text)",
                }}
            >
                <MenuIcon />
            </IconButton>


            {/* <Dialog
                open={openLogoutModal}
                onClose={cancelLogout}
                aria-labelledby="logout-dialog-title"
                aria-describedby="logout-dialog-description"
                sx={{ '& .MuiPaper-root': { borderRadius: '27px' } }} // Custom border radius
            >
                <div className="p-7">

                    <Heading
                        Fontweight={600}
                        color={'black'}
                        Heading={'Are you sure you want to logout?'}
                        Fontsize={20}
                    // Tailwind CSS classes
                    />
                </div>
                <div className="flex items-center gap-3 justify-center pb-7">
                    <Button onClick={cancelLogout} color="primary">
                        No
                    </Button>
                    <Button onClick={handleLogout} color="primary" variant="contained">
                        Yes
                    </Button>
                </div>
            </Dialog> */}
            <Dialog
                open={openLogoutModal}
                onClose={cancelLogout}
                maxWidth="xs"
                fullWidth
                sx={{ zIndex: 99999 }}
            >
                <DialogTitle
                    sx={{
                        pb: 0.5,   // ↓ less space below heading
                        mb: 0,
                        fontWeight: 600
                    }}
                >
                    Logout
                </DialogTitle>

                <DialogContent
                    sx={{
                        pt: 0.5,   // ↓ less space above content
                        pb: 1
                    }}
                >
                    <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>
                        Are you sure you want to logout?
                    </p>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 2,     // → space from left/right (right feels better)
                        pb: 2,     // ↓ space from bottom
                        justifyContent: "flex-end",
                        gap: 1
                    }}
                >
                    <Button onClick={cancelLogout}>No</Button>
                    <Button color="primary" variant="contained" onClick={handleLogout}>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}

// AdminDashboard.propTypes = {
//     /**
//      * Injected by the documentation to work in an iframe.
//      * You won't need it on your project.
//      */
//     window: PropTypes.func,
// };
