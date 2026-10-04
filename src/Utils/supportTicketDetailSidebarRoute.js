const SUPPORT_TICKET_DETAIL_SIDEBAR_ROUTE_KEY = 'supportTicketDetailSidebarRoute';

export const SUPPORT_TICKET_DETAIL_PARENT_ROUTES = ['merchantSupport', 'maintananceTicket'];

export const setSupportTicketDetailSidebarRoute = (route) => {
    if (route && SUPPORT_TICKET_DETAIL_PARENT_ROUTES.includes(route)) {
        sessionStorage.setItem(SUPPORT_TICKET_DETAIL_SIDEBAR_ROUTE_KEY, route);
    }
};

export const getSupportTicketDetailSidebarRoute = () =>
    sessionStorage.getItem(SUPPORT_TICKET_DETAIL_SIDEBAR_ROUTE_KEY);

export const clearSupportTicketDetailSidebarRoute = () => {
    sessionStorage.removeItem(SUPPORT_TICKET_DETAIL_SIDEBAR_ROUTE_KEY);
};

export const resolveSupportTicketDetailSidebarRoute = (locationState) =>
    locationState?.fromRoute || getSupportTicketDetailSidebarRoute() || null;
