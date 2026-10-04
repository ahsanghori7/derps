import {
  getEnabledFeatureCodes,
  getFeatureCodeForRoute,
} from './tenantFeatures';

/**
 * Admin → tenantFeatures; other roles → scopes (route / feature codes).
 */
export function canAccessModule(
  { route, featureCode },
  { tenantFeatures, scopes, roleTitle }
) {
  const isAdminRole = String(roleTitle || '').trim().toLowerCase() === 'admin';

  if (isAdminRole) {
    const enabledFeatureCodes = getEnabledFeatureCodes(tenantFeatures);
    const code = getFeatureCodeForRoute(route, featureCode);
    if (!code) return false;
    return enabledFeatureCodes.includes(code);
  }

  const allowed = new Set(
    (Array.isArray(scopes) ? scopes : [])
      .filter(Boolean)
      .map((c) => String(c).trim().toLowerCase())
  );
  if (!route) return false;
  const r = String(route).trim().toLowerCase();
  if (allowed.has(r)) return true;
  const code = getFeatureCodeForRoute(route, featureCode);
  return Boolean(code && allowed.has(code));
}

/** Convenience: chat feature access (Admin = tenantFeatures, else scopes). */
export function canAccessChat(auth) {
  return canAccessModule({ route: 'chat' }, auth);
}

/** Convenience: notifications feature access. */
export function canAccessNotifications(auth) {
  return canAccessModule({ route: 'notifications' }, auth);
}
