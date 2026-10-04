const TASK_DETAIL_SIDEBAR_ROUTE_KEY = 'taskDetailSidebarRoute';

export const TASK_DETAIL_PARENT_ROUTES = ['myTask', 'projectTracking', 'trackingReports'];

export const setTaskDetailSidebarRoute = (route) => {
    if (route && TASK_DETAIL_PARENT_ROUTES.includes(route)) {
        sessionStorage.setItem(TASK_DETAIL_SIDEBAR_ROUTE_KEY, route);
    }
};

export const getTaskDetailSidebarRoute = () =>
    sessionStorage.getItem(TASK_DETAIL_SIDEBAR_ROUTE_KEY);

export const resolveTaskDetailSidebarRoute = (locationState) =>
    locationState?.fromRoute || getTaskDetailSidebarRoute() || null;
