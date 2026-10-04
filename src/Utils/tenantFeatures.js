/**
 * Maps sidebar/app routes to /api/feature `code` values.
 * Used to gate menu items from login `tenantFeatures`.
 */
export const ROUTE_TO_FEATURE_CODE = {
  dashboardScreen: 'dashboard',
  storageBucket: 'storage-bucket',
  calendar: 'meetings',
  chat: 'chat',
  notifications: 'notifications',
  allInventory: 'inventory',
  snReport: 'inventory',
  returns: 'inventory',
  shipping: 'inventory',
  itemsAndServices: 'items',
  agentPayout: 'payouts',
  agentsTickets: 'tickets',
  invalidTickets: 'tickets',
  ticketTypes: 'ticket-types',
  category: 'ticket-categories',
  projectTracking: 'projects',
  myTask: 'tasks',
  trackingReports: 'tracking-reports',
  performanceReport: 'performance-report',
  trackerSetup: 'tracker-setup',
  adminApplication: 'applications',
  merchantSupport: 'merchant-support',
  // Primary feature code from API docs; aliases handled via sidebar anyFeatureCodes
  merchantChangeRequest: 'change-requests',
  supportSetup: 'support-setup',
  maintananceTicket: 'maintenance-ticket',
  customerList: 'customers',
  techInstallationList: 'tech-installation',
  agentManagement: 'agent-requests',
  attendanceReport: 'attendance',
  attendanceLog: 'attendance',
  agent: 'users',
  roles: 'roles',
  training: 'training',
  salesFormBuilder: 'sales-forms',
  leadsList: 'leads',
  opportunities: 'sales-opportunity',
  quotations: 'sales-opportunity',
  salesOrder: 'sales-opportunity',
  chartOfAccounts: 'accounts',
  suppliers: 'suppliers',
  purchase: 'purchase-orders',
  salesCustomers: 'sales-customers',
  invoices: 'invoices',
  accountsReports: 'account-reports',
  reports: 'reports',
  journalEntry: 'journal',
  payroll: 'payroll',
  vendors: 'vendors',
  support: 'support',
  changePassword: 'change-password',
  gotoSettings: 'leads',
  authorizeNetSettings: 'invoices',
  fedexSettings: 'inventory',
  applicationLinkSettings: 'applications',
  memo: 'memos',
  form: 'forms',
  policy: 'policy',
  expenses: 'expenses',
  reconciliation: 'reconciliation',
  bills: 'bills',
  settings: 'settings',
};

/** Sales features that unlock GoTo Connect (click-to-call). */
export const GOTO_SALES_FEATURE_CODES = [
  'leads',
  'sales-activity',
  'sales-opportunity',
];

/**
 * Maps audit-log module keys (from GET /audit-log/modules) to tenant feature codes.
 * Direct matches (module === feature code) also work without this map.
 */
export const AUDIT_MODULE_TO_FEATURE_CODE = {
  invoice: 'invoices',
  invoices: 'invoices',
  purchase: 'purchase-orders',
  'purchase-order': 'purchase-orders',
  'purchase-orders': 'purchase-orders',
  bill: 'bills',
  bills: 'bills',
  expense: 'expenses',
  expenses: 'expenses',
  lead: 'leads',
  leads: 'leads',
  opportunity: 'sales-opportunity',
  opportunities: 'sales-opportunity',
  'sales-opportunity': 'sales-opportunity',
  quotation: 'sales-opportunity',
  quotations: 'sales-opportunity',
  'sales-order': 'sales-opportunity',
  'sales-orders': 'sales-opportunity',
  customer: 'customers',
  customers: 'customers',
  'sales-customer': 'sales-customers',
  'sales-customers': 'sales-customers',
  inventory: 'inventory',
  supplier: 'suppliers',
  suppliers: 'suppliers',
  payroll: 'payroll',
  journal: 'journal',
  account: 'accounts',
  accounts: 'accounts',
  vendor: 'vendors',
  vendors: 'vendors',
  task: 'tasks',
  tasks: 'tasks',
  project: 'projects',
  projects: 'projects',
  ticket: 'tickets',
  tickets: 'tickets',
  memo: 'memos',
  memos: 'memos',
  form: 'forms',
  forms: 'forms',
  user: 'users',
  users: 'users',
  role: 'roles',
  roles: 'roles',
  item: 'items',
  items: 'items',
  payout: 'payouts',
  payouts: 'payouts',
};

const isFeatureEnabled = (tf) =>
  tf && (tf.isEnabled === true || tf.isEnabled === 1 || tf.isEnabled === '1');

/** @returns {string[]} lowercase enabled feature codes */
export function getEnabledFeatureCodes(tenantFeatures) {
  if (!Array.isArray(tenantFeatures)) return [];
  return [
    ...new Set(
      tenantFeatures
        .filter(isFeatureEnabled)
        .map((tf) => tf?.feature?.code ?? tf?.code ?? tf?.featureCode)
        .filter(Boolean)
        .map((c) => String(c).trim().toLowerCase())
    ),
  ];
}

const normalizeCode = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

/** Feature-code candidates for a single audit-log module entry. */
export function getAuditModuleFeatureCandidates(module) {
  if (!module) return [];
  if (typeof module === 'string') {
    const key = normalizeCode(module);
    return [...new Set([key, AUDIT_MODULE_TO_FEATURE_CODE[key]].filter(Boolean))];
  }

  const rawValue = module?.value ?? module?.code ?? module?.module ?? module?.name ?? module?.key;
  const key = normalizeCode(rawValue);
  const candidates = [
    module?.featureCode,
    module?.feature?.code,
    rawValue,
    key,
    AUDIT_MODULE_TO_FEATURE_CODE[key],
  ]
    .filter(Boolean)
    .map(normalizeCode);

  return [...new Set(candidates)];
}

/**
 * Keep only audit modules whose feature code is enabled on the tenant.
 */
export function filterAuditModulesByTenantFeatures(modules, tenantFeatures) {
  const enabled = new Set(
    getEnabledFeatureCodes(tenantFeatures).map((code) => normalizeCode(code))
  );
  if (enabled.size === 0) return [];

  return (Array.isArray(modules) ? modules : []).filter((module) =>
    getAuditModuleFeatureCandidates(module).some((code) => enabled.has(code))
  );
}

/** True when at least one audit module is allowed by tenant features. */
export function canAccessAuditLog(auditLogModules, tenantFeatures) {
  return filterAuditModulesByTenantFeatures(auditLogModules, tenantFeatures).length > 0;
}

/** Remove Audit Log menu entries when the tenant has no accessible audit modules. */
export function filterMenuByAuditLogAccess(items, canShowAuditLog) {
  const walk = (list) =>
    (list || []).reduce((acc, item) => {
      if (!item) return acc;
      const next = { ...item };

      if (Array.isArray(item.subItems) && item.subItems.length > 0) {
        next.subItems = walk(item.subItems);
      }

      const hasVisibleChildren =
        Array.isArray(next.subItems) && next.subItems.length > 0;
      const isAuditLogRoute =
        String(item?.route || '')
          .trim()
          .toLowerCase() === 'auditlog';

      if (isAuditLogRoute && !canShowAuditLog) {
        return acc;
      }

      if (!item.route) {
        if (hasVisibleChildren) acc.push(next);
        return acc;
      }

      acc.push(next);
      return acc;
    }, []);

  return walk(items);
}

export function getFeatureCodeForRoute(route, explicitCode) {
  if (explicitCode) return String(explicitCode).trim().toLowerCase();
  if (!route) return null;
  const mapped = ROUTE_TO_FEATURE_CODE[String(route).trim()];
  return mapped ? String(mapped).trim().toLowerCase() : null;
}

const itemMatchesAllowedFeatures = (item, allowed) => {
  // Audit Log is gated later via accessible audit modules ∩ tenantFeatures.
  if (item?.skipFeatureGate || String(item?.route || '').trim().toLowerCase() === 'auditlog') {
    return true;
  }
  const anyCodes = Array.isArray(item?.anyFeatureCodes)
    ? item.anyFeatureCodes
        .filter(Boolean)
        .map((c) => String(c).trim().toLowerCase())
    : [];
  if (anyCodes.length > 0) {
    return anyCodes.some((code) => allowed.has(code));
  }
  const featureCode = getFeatureCodeForRoute(item?.route, item?.featureCode);
  return featureCode ? allowed.has(featureCode) : false;
};

/**
 * Recursively keep only menu items allowed by enabled tenant feature codes.
 * Parent folders (no route) stay visible when they have visible children.
 * Menu items may set `anyFeatureCodes` for OR matching (e.g. GoTo + sales).
 */
export function filterMenuByTenantFeatures(items, enabledFeatureCodes) {
  const allowed = new Set(
    (Array.isArray(enabledFeatureCodes) ? enabledFeatureCodes : [])
      .filter(Boolean)
      .map((c) => String(c).trim().toLowerCase())
  );

  const walk = (list) =>
    (list || []).reduce((acc, item) => {
      if (!item) return acc;
      const next = { ...item };

      if (Array.isArray(item.subItems) && item.subItems.length > 0) {
        next.subItems = walk(item.subItems);
      }

      const hasVisibleChildren =
        Array.isArray(next.subItems) && next.subItems.length > 0;

      if (!item.route) {
        if (hasVisibleChildren) acc.push(next);
        return acc;
      }

      const hasOwn = itemMatchesAllowedFeatures(item, allowed);

      if (hasOwn || hasVisibleChildren) {
        acc.push(next);
      }
      return acc;
    }, []);

  return walk(items);
}

/**
 * Recursively keep only menu items allowed by role scopes (route names / feature codes).
 * Used for non-Admin roles.
 */
export function filterMenuByScopes(items, scopes) {
  const allowed = new Set(
    (Array.isArray(scopes) ? scopes : [])
      .filter(Boolean)
      .map((c) => String(c).trim().toLowerCase())
  );

  const hasScopeForRoute = (route, explicitCode, anyFeatureCodes) => {
    if (!route) return false;
    const r = String(route).trim().toLowerCase();
    if (allowed.has(r)) return true;

    const anyCodes = Array.isArray(anyFeatureCodes)
      ? anyFeatureCodes
          .filter(Boolean)
          .map((c) => String(c).trim().toLowerCase())
      : [];
    if (anyCodes.length > 0) {
      return anyCodes.some((code) => allowed.has(code));
    }

    const featureCode = getFeatureCodeForRoute(route, explicitCode);
    if (featureCode && allowed.has(featureCode)) return true;
    return false;
  };

  const walk = (list) =>
    (list || []).reduce((acc, item) => {
      if (!item) return acc;
      const next = { ...item };

      if (Array.isArray(item.subItems) && item.subItems.length > 0) {
        next.subItems = walk(item.subItems);
      }

      const hasVisibleChildren =
        Array.isArray(next.subItems) && next.subItems.length > 0;

      if (!item.route) {
        if (hasVisibleChildren) acc.push(next);
        return acc;
      }

      const hasOwn = hasScopeForRoute(
        item.route,
        item.featureCode,
        item.anyFeatureCodes
      );
      if (hasOwn || hasVisibleChildren) {
        acc.push(next);
      }
      return acc;
    }, []);

  return walk(items);
}
