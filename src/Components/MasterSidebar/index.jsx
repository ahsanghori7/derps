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
import { Route, Routes, useLocation, Link as RouterLink } from "react-router-dom";
import { Button, Dialog, Tooltip, useMediaQuery, useTheme, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { SVG } from "../../assets/svg";
import { styled } from '@mui/material/styles';
import { useDispatch, useSelector } from "react-redux";
import { clearAccessToken, setAccessToken, setCategories, setScopes } from "../../Store/Reducers/authSlice";
import { clearUserDetails, setUserDetails } from "../../Store/Reducers/userDetailsSlice";
import { performLogout } from "../../Utils/logout";
import TenantsDashboard from "../../Screens/TenantsDashbaord";
import TenantsList from "../../Screens/TenantsList";
import AddTenants from "../../Screens/AddTenants";
import Loader from "../Loader";
import Profile from "../../Screens/Profile";
import { getUserDisplayName } from "../../Utils/profile";
import UserMenuAvatar from "../UserMenuAvatar";
import { fetchAndApplyAuthMe } from "../../Utils/applyAuthMeSession";
import { syncSidebarCurrentWidth, clearSidebarCurrentWidth } from "../../Utils/sidebarLayout";

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

const SIDEBAR_ICON = 'var(--sidebarNew-icon)';
const SIDEBAR_ICON_SELECTED = 'var(--sidebarNew-icon-selected)';

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

const ROUTE_ALIAS_MAP = {
    addTenants: 'tenantsList',
};

const normalizeRoutePath = (path) => {
    if (!path) return path;
    return String(path).replace(/^\/+/, '').replace(/\/+$/, '');
};

const safeJsonParse = (value, fallback = null) => {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

export default function MasterSideBar() {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [desktopDrawerOpen, setDesktopDrawerOpen] = React.useState(true);
    const [loading, setLoading] = React.useState(true);
    const [openLogoutModal, setOpenLogoutModal] = React.useState(false);

    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    React.useEffect(() => {
        syncSidebarCurrentWidth({ isDesktop, isOpen: desktopDrawerOpen, openWidth: drawerWidth, collapsedWidth });
        return () => clearSidebarCurrentWidth();
    }, [isDesktop, desktopDrawerOpen]);

    const location = useLocation();
    const dispatch = useDispatch();
    const userData = useSelector((state) => state?.userData?.userDetails);

    const currentPath = normalizeRoutePath(
        location.pathname.replace(/^\/masterDashboard\/?/, '')
    );

    const [menuList] = React.useState([
        {
            id: 1,
            name: "Dashboard",
            route: "tenantsDashboard",
            icon: <SVG.DashboardIcon style={{ width: '20px', height: '20px' }} />,
            hoverIcon: <SVG.DashboardIcon style={{ width: '20px', height: '20px' }} />,
        },
        {
            id: 2,
            name: "Merchant",
            route: "tenantsList",
            icon: <SVG.MerchantInfo style={{ width: '20px', height: '20px' }} />,
            hoverIcon: <SVG.MerchantInfo style={{ width: '20px', height: '20px' }} />,
        },
    ]);

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

    const confirmLogout = () => {
        setOpenLogoutModal(true);
    };

    React.useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        const userDetails = safeJsonParse(localStorage.getItem('userDetails'));
        const scopes = safeJsonParse(localStorage.getItem('scopes'));
        const categories = safeJsonParse(localStorage.getItem('categories'));

        if (accessToken) {
            dispatch(setAccessToken(accessToken));
        }
        if (userDetails) {
            dispatch(setUserDetails(userDetails));
        }
        if (scopes) {
            dispatch(setScopes(scopes));
        }
        if (categories) {
            dispatch(setCategories(categories));
        }
        if (accessToken) {
            fetchAndApplyAuthMe(dispatch, accessToken).catch(() => {
                setLoading(false);
            }).then(() => {
                setLoading(false);
            });
            return;
        }
        setLoading(false);
    }, [dispatch]);

    const isRouteSelected = (route) => {
        const base = currentPath.split('/')[0] || '';
        if (!base && route === 'tenantsDashboard') return true;
        if (base === route) return true;
        const aliased = ROUTE_ALIAS_MAP[base];
        return aliased === route;
    };

    const cancelLogout = () => {
        setOpenLogoutModal(false);
    };

    const renderSimpleMenuItem = (item) => {
        const isSelected = isRouteSelected(item?.route);
        if (!item?.route) return null;

        return (
            <StyledListItem key={item?.id} isSelected={isSelected} drawerOpen={desktopDrawerOpen}>
                <Tooltip title={!desktopDrawerOpen ? item?.name ?? '' : ''} placement="right">
                    <StyledListItemButton
                        component={RouterLink}
                        to={`/masterDashboard/${item.route}`}
                        isSelected={isSelected}
                    >
                        <StyledListItemIcon sx={{ ...sidebarIconSx(40, isSelected), position: 'relative' }}>
                            {renderSidebarIcon(item.icon, isSelected, item.hoverIcon)}
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
                {menuList.map((item) => renderSimpleMenuItem(item))}

                <Box sx={{ mt: 'auto' }}>
                    <SectionDivider />
                    <StyledListItem isSelected={isRouteSelected('profile')} drawerOpen={desktopDrawerOpen}>
                        <Tooltip title={!desktopDrawerOpen ? getUserDisplayName(userData) : ''} placement="right">
                            <StyledListItemButton
                                component={RouterLink}
                                to="/masterDashboard/profile"
                                isSelected={isRouteSelected('profile')}
                            >
                                <StyledListItemIcon sx={sidebarIconSx(40, isRouteSelected('profile'))}>
                                    <UserMenuAvatar user={userData} />
                                </StyledListItemIcon>
                                {desktopDrawerOpen && (
                                    <StyledListItemText primary={getUserDisplayName(userData)} isSelected={isRouteSelected('profile')} />
                                )}
                            </StyledListItemButton>
                        </Tooltip>
                    </StyledListItem>
                    <Tooltip title={!desktopDrawerOpen ? 'Logout' : ''} placement="right">
                        <StyledListItemButton onClick={confirmLogout} isSelected={false}>
                            <StyledListItemIcon sx={sidebarIconSx(40, false)}>
                                <SVG.Logout style={{ width: '20px', height: '20px' }} />
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

    if (loading) {
        return <Loader fullscreen message="Loading..." subMessage="Please wait" />;
    }

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
                {!currentPath?.startsWith('profile') && <Toolbar />}
                <Routes>
                    <Route path="tenantsDashboard/" element={<TenantsDashboard />} />
                    <Route path="tenantsList/" element={<TenantsList />} />
                    <Route path="addTenants/" element={<AddTenants />} />
                    <Route path="profile/" element={<Profile />} />
                </Routes>
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
