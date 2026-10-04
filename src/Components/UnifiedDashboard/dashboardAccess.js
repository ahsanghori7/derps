import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  filterMenuByScopes,
  filterMenuByTenantFeatures,
  getEnabledFeatureCodes,
} from "../../Utils/tenantFeatures";
import { API_MODULE_META } from "./apiModules";

const EMPTY_ARRAY = [];

// Which sidebar module a dashboard widget belongs to. A widget is shown only when
// that module would be shown in the sidebar.
const TICKETS = { route: "agentsTickets" };
const PROJECTS = { route: "projectTracking" };

export const WIDGET_ACCESS = {
  overview: TICKETS,
  ticketTrends: TICKETS,
  ticketCategories: TICKETS,
  assignedUsers: TICKETS,
  chats: { route: "chat" },
  schedule: { route: "calendar" },
  projectCounts: PROJECTS,
  recentProjects: PROJECTS,
  trackingReport: { route: "trackingReports" },
  performanceReport: { route: "performanceReport" },
  attendenceReport: { route: "attendanceReport" },
  memos: { route: "memo" },
};

export const INSIGHT_WIDGET_IDS = [
  "projectCounts",
  "trackingReport",
  "performanceReport",
  "attendenceReport",
  "recentProjects",
];

/** Access target for an API module key from dashboard settings. */
export function moduleAccessTarget(key) {
  const meta = API_MODULE_META[key];
  if (!meta?.route) return null;
  return { route: meta.route, featureCode: meta.featureCode };
}

/**
 * Same rule as the sidebar: tenant feature must be enabled, and non-admin roles
 * also need the route / feature code in their scopes.
 */
export function useDashboardAccess() {
  const scopes = useSelector((state) => state?.auth?.scopes ?? EMPTY_ARRAY);
  const tenantFeatures = useSelector((state) => state?.auth?.tenantFeatures ?? EMPTY_ARRAY);
  const roleTitle = useSelector((state) => state?.userData?.userDetails?.roleTitle);
  const isAdminRole = String(roleTitle || "").trim().toLowerCase() === "admin";
  const enabledFeatureCodes = useMemo(() => getEnabledFeatureCodes(tenantFeatures), [tenantFeatures]);

  const can = useCallback(
    (target) => {
      if (!target?.route) return false;
      const item = [{ route: target.route, featureCode: target.featureCode }];
      const byTenant = filterMenuByTenantFeatures(item, enabledFeatureCodes);
      const byRole = isAdminRole ? byTenant : filterMenuByScopes(byTenant, scopes);
      return byRole.length > 0;
    },
    [enabledFeatureCodes, isAdminRole, scopes],
  );

  return useMemo(
    () => ({
      can,
      canWidget: (id) => can(WIDGET_ACCESS[id]),
      canModule: (key) => can(moduleAccessTarget(key)),
      canInsights: () => INSIGHT_WIDGET_IDS.some((id) => can(WIDGET_ACCESS[id])),
    }),
    [can],
  );
}
