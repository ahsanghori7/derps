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
import { Route, Routes, useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry as lazy } from "../../Utils/lazyWithRetry";
import ChunkErrorBoundary from "../ChunkErrorBoundary";
import MyAccountBlack from "../../assets/MyAccountBlack.png";
import ResourcesBlack from "../../assets/ResourcesBlack.png";
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useDispatch, useSelector } from "react-redux";
import { clearAccessToken, setAccessToken } from "../../Store/Reducers/authSlice";
import { clearUserDetails, setUserDetails } from "../../Store/Reducers/userDetailsSlice";
import { performLogout } from "../../Utils/logout";
import { syncSidebarCurrentWidth, clearSidebarCurrentWidth } from "../../Utils/sidebarLayout";
import { Button, Dialog, Tooltip, useMediaQuery, useTheme, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { SVG } from "../../assets/svg";
import { getUserDisplayName } from "../../Utils/profile";
import UserMenuAvatar from "../UserMenuAvatar";
import { useChatNotification } from "../../features/chat/shared/hooks/ChatNotificationBadge";
import { fetchAndApplyAuthMe } from "../../Utils/applyAuthMeSession";

const UserMemo = lazy(() => import("../../Screens/UserMemo"));
const UserProfile = lazy(() => import("../../Screens/Profile"));
const StorageBucket = lazy(() => import("../../Screens/StorageBucket"));
const UserPayout = lazy(() => import("../../Screens/UserPayout"));
const UserCustomer = lazy(() => import("../../Screens/UserCustomer"));
const UserTickets = lazy(() => import("../../Screens/UserTickets"));
const UserActivations = lazy(() => import("../../Screens/UserActivations"));
const MaintainTickets = lazy(() => import("../../Screens/MaintainTickets"));
const UserForm = lazy(() => import("../../Screens/UserForm"));
const UserPolicy = lazy(() => import("../../Screens/UserPolicy"));
const UserTraining = lazy(() => import("../../Screens/UserTraining"));
const AddTickets = lazy(() => import("../../Screens/AddTickets"));
const ApplicationInformation = lazy(() => import("../../Screens/ApplicationInformation"));
const SelectPlan = lazy(() => import("../../Screens/SelectPlan"));
const SubmitApplication = lazy(() => import("../../Screens/SubmitApplication"));
const RequestSubmitted = lazy(() => import("../../Screens/RequestSubmitted"));
const ChangePassword = lazy(() => import("../../Screens/ChangePassword"));
const UserApplicationList = lazy(() => import("../../Screens/UserApplicationList"));
const UserInvoice = lazy(() => import("../../Screens/UserInvoice"));
const CreateInvoice = lazy(() => import("../../Screens/CreateInvoice"));
const PayoutDetails = lazy(() => import("../../Screens/PayoutDetails"));
const AddLeads = lazy(() => import("../../Screens/AddLeads"));
const EditLead = lazy(() => import("../../Screens/EditLead"));
const UserLeadsList = lazy(() => import("../../Screens/UserLeadList"));
const ProductList = lazy(() => import("../../Screens/ProductList"));
const ShipmentAndPickup = lazy(() => import("../../Screens/ShipmentAndPickup"));
const EditApplication = lazy(() => import("../../Screens/EditApplication"));
const Chat = lazy(() => import("../../features/chat/screens/Chat"));
const Call = lazy(() => import("../../features/chat/screens/Call"));
const ActiveMeetingsScreen = lazy(() => import("@features/chat/meetings/ActiveMeetingsScreen"));
const MeetingRecordingsScreen = lazy(() => import("@features/chat/meetings/MeetingRecordingsScreen"));

const drawerWidth = 240;
const collapsedWidth = 72;

const safeJsonParse = (value, fallback = null) => {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const normalizeRoutePath = (path) => {
    if (!path) return path;
    return String(path).replace(/^\/+/, '').replace(/\/+$/, '');
};

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
    '& svg path[fill], & svg circle[fill], & svg rect[fill], & svg g[fill]': {
        fill: 'currentColor !important',
    },
    '& span:not(.sidebar-notif-dot)': {
        width: `${size}px !important`,
        height: `${size}px !important`,
        bgcolor: `${isSelected ? SIDEBAR_ICON_SELECTED : SIDEBAR_ICON} !important`,
    },
});

const subItemIconSx = (minWidth = 28, isSelected = false) => sidebarIconSx(minWidth, isSelected, 16);

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
    if (typeof icon === 'string') {
        return pngSidebarIcon(icon, isSelected);
    }
    if (hoverIcon) {
        return <img src={isSelected ? hoverIcon : icon} alt="" />;
    }
    return icon;
};

const ROUTE_ALIAS_MAP = {
    addTickets: 'userTickets',
    maintainTickets: 'userTickets',
    createInvoice: 'userInvoice',
    payoutDetails: 'userPayout',
    addLeads: 'userLeadsList',
    editLead: 'userLeadsList',
    applicationInformation: 'userApplicationList',
    businessInformation: 'userApplicationList',
    ownershipInformation: 'userApplicationList',
    financialInformation: 'userApplicationList',
    selectPlan: 'userApplicationList',
    submitApplication: 'userApplicationList',
    requestSubmitted: 'userApplicationList',
    productList: 'userApplicationList',
    preferences: 'userApplicationList',
    shipmentAndPickup: 'userApplicationList',
    userActivations: 'userApplicationList',
    editApplication: 'userApplicationList',
    call: 'chat',
};

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

export default function UserSideBar() {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [myAccountOpen, setMyAccountOpen] = React.useState(false);
    const [resourcesOpen, setResourcesOpen] = React.useState(false);
    const [desktopDrawerOpen, setDesktopDrawerOpen] = React.useState(true);
    const [openLogoutModal, setOpenLogoutModal] = React.useState(false);

    const location = useLocation();
    const dispatch = useDispatch();
    const navigation = useNavigate();
    const userData = useSelector((state) => state?.userData?.userDetails);
    const { hasUnreadMessages = false, clearBadge } = useChatNotification() ?? {};
    const currentPath = normalizeRoutePath(
        location?.pathname?.replace(/^\/userDashboard\/?/i, '') ?? ''
    );

    const theme = useTheme();
    const isDesktop = useMediaQuery(theme?.breakpoints?.up('md') ?? false);

    React.useEffect(() => {
        syncSidebarCurrentWidth({ isDesktop, isOpen: desktopDrawerOpen, openWidth: drawerWidth, collapsedWidth });
        return () => clearSidebarCurrentWidth();
    }, [isDesktop, desktopDrawerOpen]);

    const [menuList] = React.useState([
        {
            id: 1,
            name: "Memos",
            route: "userMemo",
            icon: <SVG.Memo style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 27,
            name: "Drive",
            route: "storageBucket",
            icon: <SVG.StorageIcon style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 29,
            name: "Chat",
            route: "chat",
            icon: <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>,
        },
        {
            id: 2,
            name: "My Account",
            icon: (isSelected) => pngSidebarIcon(MyAccountBlack, isSelected),
            subItems: [
                {
                    id: 3,
                    name: "Profile",
                    route: "userProfile",
                    icon: <SVG.StaffIcon style={{ width: '20px', height: '20px' }} />,
                },
                {
                    id: 4,
                    name: "Payout",
                    route: "userPayout",
                    icon: <SVG.Payout style={{ width: '20px', height: '20px' }} />,
                },
            ],
        },
        // {
        //     id: 5,
        //     name: "Resources",
        //     icon: (isSelected) => pngSidebarIcon(ResourcesBlack, isSelected),
        //     subItems: [
        //         {
        //             id: 6,
        //             name: "Form",
        //             route: "userForm",
        //             icon: <SVG.FormIcon style={{ width: '20px', height: '20px' }} />,
        //         },
        //         {
        //             id: 7,
        //             name: "Policy",
        //             route: "userPolicy",
        //             icon: <SVG.Policy style={{ width: '20px', height: '20px' }} />,
        //         },
        //     ],
        // },
        {
            id: 16,
            name: "Invoices",
            route: "userInvoice",
            icon: <SVG.InvoiceIcon style={{ width: '20px', height: '20px' }} />,
        },
        // {
        //     id: 10,
        //     name: "Training & Development",
        //     route: "userTraining",
        //     icon: <SVG.Training style={{ width: '20px', height: '20px' }} />,
        // },
        {
            id: 11,
            name: "Merchant",
            route: "userCustomer",
            icon: <SVG.MerchantInfo style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 17,
            name: "Leads",
            route: "userLeadsList",
            icon: <SVG.LeadsIcon style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 12,
            name: "Tickets",
            route: "userTickets",
            icon: <SVG.Ticket style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 14,
            name: "Application",
            route: "userApplicationList",
            icon: <SVG.TrackerSetup style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 15,
            name: "Change Password",
            route: "changePassword",
            icon: <SVG.StaffIcon style={{ width: '20px', height: '20px' }} />,
        },
    ]);

    const handleDrawerToggle = () => {
        if (isDesktop) {
            setDesktopDrawerOpen(!desktopDrawerOpen);
        } else {
            setMobileOpen(!mobileOpen);
        }
    };

    React.useEffect(() => {
        if (!currentPath) {
            navigation("userMemo", { replace: true });
        }
        const accessToken = localStorage.getItem('accessToken');
        const userDetails = safeJsonParse(localStorage.getItem('userDetails'));

        if (accessToken) {
            dispatch(setAccessToken(accessToken));
        }
        if (userDetails) {
            dispatch(setUserDetails(userDetails));
        }
        if (accessToken) {
            fetchAndApplyAuthMe(dispatch, accessToken).catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        setOpenLogoutModal(false);
        performLogout(dispatch, { clearAccessToken, clearUserDetails });
    };

    const confirmLogout = () => {
        setOpenLogoutModal(true);
    };

    const isRouteSelected = (route) => {
        if (!route) return false;
        const base = currentPath.split('/')[0] || '';
        if (!base && route === 'userMemo') return true;
        if (base === route || currentPath === route || currentPath.startsWith(`${route}/`)) return true;
        return ROUTE_ALIAS_MAP[base] === route;
    };

    const hasSelectedSubItem = (subItems) =>
        (subItems ?? []).some((sub) => isRouteSelected(sub?.route));

    React.useEffect(() => {
        if (hasSelectedSubItem(menuList.find((item) => item.name === 'My Account')?.subItems)) {
            setMyAccountOpen(true);
        }
        if (hasSelectedSubItem(menuList.find((item) => item.name === 'Resources')?.subItems)) {
            setResourcesOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPath]);

    const cancelLogout = () => {
        setOpenLogoutModal(false);
    };

    const renderSubMenuItems = (subItems) =>
        (subItems ?? []).map((subItem, index) => {
            if (!subItem?.route) return null;
            const isSubItemSelected = isRouteSelected(subItem?.route);

            return (
                <StyledListItem key={subItem?.id ?? index} isSelected={isSubItemSelected} drawerOpen={desktopDrawerOpen}>
                    <StyledSubListItemButton
                        component={RouterLink}
                        to={`/userDashboard/${subItem.route}`}
                        isSelected={isSubItemSelected}
                        drawerOpen={desktopDrawerOpen}
                        depth={1}
                    >
                        <Tooltip title={!desktopDrawerOpen ? subItem.name : ''} placement="right">
                            <StyledListItemIcon sx={subItemIconSx(32, isSubItemSelected)}>
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
        });

    const renderExpandableMenuItem = (item) => {
        const isSelected = hasSelectedSubItem(item.subItems);
        const isOpen = item?.name === "My Account" ? myAccountOpen : resourcesOpen;
        const handleClick = item?.name === "My Account"
            ? () => setMyAccountOpen((prev) => !prev)
            : () => setResourcesOpen((prev) => !prev);

        return (
            <React.Fragment key={item?.id}>
                <StyledListItem isSelected={isSelected} drawerOpen={desktopDrawerOpen}>
                    <Tooltip title={!desktopDrawerOpen ? item?.name ?? '' : ''} placement="right">
                        <StyledListItemButton
                            onClick={handleClick}
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
                        {renderSubMenuItems(item.subItems)}
                    </List>
                )}
            </React.Fragment>
        );
    };

    const renderSimpleMenuItem = (item) => {
        const isSelected = isRouteSelected(item?.route);
        const showChatNotification = item?.route === 'chat' && hasUnreadMessages;
        if (!item?.route) return null;

        return (
            <StyledListItem key={item?.id} isSelected={isSelected} drawerOpen={desktopDrawerOpen}>
                <Tooltip title={!desktopDrawerOpen ? item?.name ?? '' : ''} placement="right">
                    <StyledListItemButton
                        component={RouterLink}
                        to={`/userDashboard/${item.route}`}
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
                        </StyledListItemIcon>
                        {desktopDrawerOpen && (
                            <StyledListItemText primary={item.name} isSelected={isSelected} />
                        )}
                    </StyledListItemButton>
                </Tooltip>
            </StyledListItem>
        );
    };

    const drawer = (
        <div style={{ backgroundColor: 'var(--sidebarNew-bg)', minHeight: '100%', height: '100%', paddingBottom: mobileOpen && '50px' }}>
            <List disablePadding sx={{ px: 1, py: 0.5, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
                {(menuList ?? []).map((item) => {
                    if (!item) return null;
                    if (item?.subItems) return renderExpandableMenuItem(item);
                    return renderSimpleMenuItem(item);
                })}

                <Box sx={{ mt: 'auto' }}>
                    <SectionDivider />
                    <StyledListItem isSelected={isRouteSelected('userProfile')} drawerOpen={desktopDrawerOpen}>
                        <Tooltip title={!desktopDrawerOpen ? getUserDisplayName(userData) : ''} placement="right">
                            <StyledListItemButton
                                component={RouterLink}
                                to="/userDashboard/userProfile"
                                isSelected={isRouteSelected('userProfile')}
                            >
                                <StyledListItemIcon sx={sidebarIconSx(40, isRouteSelected('userProfile'))}>
                                    <UserMenuAvatar user={userData} />
                                </StyledListItemIcon>
                                {desktopDrawerOpen && (
                                    <StyledListItemText primary={getUserDisplayName(userData)} isSelected={isRouteSelected('userProfile')} />
                                )}
                            </StyledListItemButton>
                        </Tooltip>
                    </StyledListItem>
                    <Tooltip title={!desktopDrawerOpen ? 'Logout' : ''} placement="right">
                        <StyledListItemButton onClick={confirmLogout} isSelected={false}>
                            <StyledListItemIcon sx={sidebarIconSx(40, false)}>
                                {SVG?.Logout ? <SVG.Logout style={{ width: '20px', height: '20px' }} /> : null}
                            </StyledListItemIcon>
                            {desktopDrawerOpen && (
                                <StyledListItemText primary="Logout" isSelected={false} />
                            )}
                        </StyledListItemButton>
                    </Tooltip>
                </Box>
            </List>
        </div>
    );

    return (
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                transition: "margin 0.3s",
                marginLeft: {
                    xs: 0,
                    md: desktopDrawerOpen ? `${drawerWidth}px` : `${collapsedWidth}px`,
                },
                backgroundColor: 'var(--dashboard-bg)',
            }}
        >
            <CssBaseline />
            <Box component="nav" sx={{ flexShrink: 0 }} aria-label="sidebar navigation">
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
                            marginTop: 8,
                            backgroundColor: 'var(--sidebarNew-bg) !important',
                            backgroundImage: 'none',
                        },
                    }}
                >
                    {drawer}
                </Drawer>

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
                }}
            >
                {!currentPath?.startsWith('chat') && !currentPath?.startsWith('call') && !currentPath?.startsWith('changePassword') && !currentPath?.startsWith('userProfile') && <Toolbar />}
                <ChunkErrorBoundary>
                <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /></Box>}>
                    <Routes>
                        <Route path="userMemo/" element={<UserMemo />} />
                        <Route path="userProfile/" element={<UserProfile />} />
                        <Route path="userPayout/" element={<UserPayout />} />
                        <Route path="userForm/" element={<UserForm />} />
                        <Route path="userCustomer/" element={<UserCustomer />} />
                        <Route path="userTickets/" element={<UserTickets />} />
                        <Route path="userActivations/" element={<UserActivations />} />
                        <Route path="maintainTickets/" element={<MaintainTickets />} />
                        <Route path="userPolicy/" element={<UserPolicy />} />
                        <Route path="userTraining/" element={<UserTraining />} />
                        <Route path="addTickets/" element={<AddTickets />} />
                        <Route path="applicationInformation/" element={<ApplicationInformation />} />
                        {/* Old per-screen Information routes (bookmarks / old links) */}
                        <Route path="businessInformation/" element={<ApplicationInformation />} />
                        <Route path="ownershipInformation/" element={<ApplicationInformation />} />
                        <Route path="financialInformation/" element={<ApplicationInformation />} />
                        <Route path="preferences/" element={<ApplicationInformation />} />
                        <Route path="selectPlan/" element={<SelectPlan />} />
                        <Route path="submitApplication/" element={<SubmitApplication />} />
                        <Route path="requestSubmitted/" element={<RequestSubmitted />} />
                        <Route path="changePassword/" element={<ChangePassword />} />
                        <Route path="userApplicationList/" element={<UserApplicationList />} />
                        <Route path="editApplication/" element={<EditApplication />} />
                        <Route path="userInvoice/" element={<UserInvoice />} />
                        <Route path="createInvoice/" element={<CreateInvoice />} />
                        <Route path="payoutDetails/" element={<PayoutDetails />} />
                        <Route path="userLeadsList/" element={<UserLeadsList />} />
                        <Route path="addLeads/" element={<AddLeads />} />
                        <Route path="editLead/" element={<EditLead />} />
                        <Route path="productList/" element={<ProductList />} />
                        <Route path="shipmentAndPickup/" element={<ShipmentAndPickup />} />
                        <Route path="storageBucket/*" element={<StorageBucket />} />
                        <Route path="chat/:chatId?" element={<Chat />} />
                        <Route path="call/activeMeetings" element={<ActiveMeetingsScreen />} />
                        <Route path="call/recordings" element={<MeetingRecordingsScreen />} />
                        <Route path="call/" element={<Call />} />
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

            <Dialog
                open={openLogoutModal}
                onClose={cancelLogout}
                maxWidth="xs"
                fullWidth
                sx={{ zIndex: 99999 }}
            >
                <DialogTitle
                    sx={{
                        pb: 0.5,
                        mb: 0,
                        fontWeight: 600
                    }}
                >
                    Logout
                </DialogTitle>

                <DialogContent
                    sx={{
                        pt: 0.5,
                        pb: 1
                    }}
                >
                    <p style={{ color: '#334155', fontSize: 14, margin: 0 }}>
                        Are you sure you want to logout?
                    </p>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 2,
                        pb: 2,
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
