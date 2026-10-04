import { baseURl } from '../Config/systemConfig';

export const GROUP_SWITCH_SCOPE = 'group.switch';
export const ACTIVE_TENANT_STORAGE_KEY = 'activeTenantId';
export const TENANT_GROUP_STORAGE_KEY = 'tenantGroup';

export const EMPTY_TENANT_GROUP = {
    homeTenantId: null,
    activeTenantId: null,
    canSwitch: false,
    companies: [],
};

const readStorage = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeStorage = (key, value) => {
    try {
        if (value == null || value === '') {
            localStorage.removeItem(key);
            return;
        }
        localStorage.setItem(key, String(value));
    } catch {
        // ignore storage failures
    }
};

export const normalizeTenantId = (value) => {
    if (value == null || value === '') return null;
    const asString = String(value).trim();
    return asString === '' ? null : asString;
};

export const readActiveTenantId = () => normalizeTenantId(readStorage(ACTIVE_TENANT_STORAGE_KEY));

export const writeActiveTenantId = (tenantId) => {
    const normalized = normalizeTenantId(tenantId);
    writeStorage(ACTIVE_TENANT_STORAGE_KEY, normalized);
};

export const clearActiveTenantId = () => {
    writeStorage(ACTIVE_TENANT_STORAGE_KEY, null);
};

export const readStoredTenantGroup = () => {
    try {
        const raw = readStorage(TENANT_GROUP_STORAGE_KEY);
        if (!raw) return { ...EMPTY_TENANT_GROUP };
        const parsed = JSON.parse(raw);
        return normalizeTenantGroup(parsed);
    } catch {
        return { ...EMPTY_TENANT_GROUP };
    }
};

export const writeStoredTenantGroup = (group) => {
    try {
        localStorage.setItem(TENANT_GROUP_STORAGE_KEY, JSON.stringify(normalizeTenantGroup(group)));
    } catch {
        // ignore storage failures
    }
};

export const clearTenantGroupStorage = () => {
    clearActiveTenantId();
    try {
        localStorage.removeItem(TENANT_GROUP_STORAGE_KEY);
    } catch {
        // ignore
    }
};

export const normalizeTenantGroup = (group) => {
    const companies = Array.isArray(group?.companies)
        ? group.companies.map((company) => ({
            id: company?.id,
            name: company?.name || '',
            slug: company?.slug || '',
            parentTenantId: company?.parentTenantId ?? null,
            isActive: company?.isActive !== false,
        }))
        : [];

    return {
        homeTenantId: group?.homeTenantId ?? null,
        activeTenantId: group?.activeTenantId ?? group?.homeTenantId ?? null,
        canSwitch: Boolean(group?.canSwitch),
        companies,
    };
};

export const shouldSendTenantHeader = (activeTenantId, homeTenantId) => {
    const active = normalizeTenantId(activeTenantId);
    if (!active) return false;
    const home = normalizeTenantId(homeTenantId);
    if (home && active === home) return false;
    return true;
};

export const getOverrideTenantId = () => {
    const group = readStoredTenantGroup();
    const active = readActiveTenantId() || normalizeTenantId(group.activeTenantId);
    if (!shouldSendTenantHeader(active, group.homeTenantId)) return null;
    return active;
};

export const syncStoredGroupActiveTenant = (tenantId) => {
    const group = readStoredTenantGroup();
    const nextId = normalizeTenantId(tenantId) ?? group.homeTenantId;
    writeStoredTenantGroup({
        ...group,
        activeTenantId: nextId == null ? group.homeTenantId : (Number.isInteger(Number(nextId)) ? Number(nextId) : nextId),
    });
};

export const returnToHomeTenant = () => {
    const group = readStoredTenantGroup();
    clearActiveTenantId();
    writeStoredTenantGroup({
        ...group,
        activeTenantId: group.homeTenantId,
    });
};

export const getActiveTenantCacheKey = () => getOverrideTenantId() || 'home';

export const getTenantOverrideHeaders = () => {
    const activeTenantId = getOverrideTenantId();
    if (!activeTenantId) return {};
    return { 'X-Tenant-Id': String(activeTenantId) };
};

const toApiTenantId = (tenantId) => {
    const asNumber = Number(tenantId);
    return Number.isInteger(asNumber) ? asNumber : tenantId;
};

const isTenantScopedApi = (api) => {
    if (typeof api !== 'string' || !api) return false;
    const base = String(baseURl || '').replace(/\/$/, '');
    if (base && api.startsWith(base)) return true;
    return /\/api(\/|\?|$)/i.test(api);
};

export const applyTenantIdToUrl = (api) => {
    const override = getOverrideTenantId();
    if (!override || !isTenantScopedApi(api)) return api;

    try {
        const isAbsolute = /^https?:\/\//i.test(api);
        const url = isAbsolute ? new URL(api) : new URL(api, 'http://local.invalid');
        url.searchParams.set('tenantId', String(override));
        if (isAbsolute) return url.toString();
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        const separator = api.includes('?') ? '&' : '?';
        if (/[?&]tenantId=/i.test(api)) {
            return api.replace(/([?&]tenantId=)[^&]*/i, `$1${override}`);
        }
        return `${api}${separator}tenantId=${encodeURIComponent(override)}`;
    }
};

export const applyTenantIdToBody = (body) => {
    const override = getOverrideTenantId();
    if (!override || body == null || typeof body !== 'object') return body;

    if (typeof FormData !== 'undefined' && body instanceof FormData) {
        const current = body.get('tenantId') ?? body.get('tenantID') ?? body.get('tenant_id');
        if (current != null && String(current) !== '' && normalizeTenantId(current) !== override) {
            body.set('tenantId', String(override));
        }
        return body;
    }

    if (Array.isArray(body)) return body;

    const current = body.tenantId ?? body.tenantID ?? body.tenant_id;
    if (current == null || current === '' || normalizeTenantId(current) === override) {
        return body;
    }

    return {
        ...body,
        tenantId: toApiTenantId(override),
    };
};

export const persistActiveTenantFromGroup = (group) => {
    const normalized = normalizeTenantGroup(group);
    const home = normalizeTenantId(normalized.homeTenantId);
    const chosen =
        readActiveTenantId()
        || (shouldSendTenantHeader(normalized.activeTenantId, home)
            ? normalizeTenantId(normalized.activeTenantId)
            : null);

    if (chosen && chosen !== home) {
        writeActiveTenantId(chosen);
        return chosen;
    }

    clearActiveTenantId();
    return null;
};

export const applyChosenTenantToGroup = (group) => {
    const normalized = normalizeTenantGroup(group);
    const next = persistActiveTenantFromGroup(normalized);
    normalized.activeTenantId = next
        ? (Number.isInteger(Number(next)) ? Number(next) : next)
        : normalized.homeTenantId;
    return normalized;
};

export const getActiveCompany = (group) => {
    const normalized = normalizeTenantGroup(group);
    const activeId = normalizeTenantId(normalized.activeTenantId);
    if (!activeId) return null;
    return normalized.companies.find((company) => normalizeTenantId(company.id) === activeId) || null;
};

export const getHomeCompany = (group) => {
    const normalized = normalizeTenantGroup(group);
    const homeId = normalizeTenantId(normalized.homeTenantId);
    if (!homeId) return null;
    return normalized.companies.find((company) => normalizeTenantId(company.id) === homeId) || null;
};

export const isCompanySwitched = (group) => {
    const normalized = normalizeTenantGroup(group);
    const active = normalizeTenantId(normalized.activeTenantId);
    const home = normalizeTenantId(normalized.homeTenantId);
    return Boolean(active && home && active !== home);
};

export const parseApiErrorPayload = (error) => {
    const raw = error?.data || error?.response?.data || error?.message || '';
    if (raw && typeof raw === 'object') return raw;
    if (typeof raw !== 'string' || !raw.trim()) {
        return { message: error?.message || '', error: error?.error };
    }
    try {
        return JSON.parse(raw);
    } catch {
        return { message: raw };
    }
};

export const isTenantSwitchDeniedError = (error) => {
    const payload = parseApiErrorPayload(error);
    return payload?.error === 'Tenant switch not allowed';
};

export const isSwitchedTenantBlockedError = (error) => {
    const payload = parseApiErrorPayload(error);
    const message = String(payload?.message || '');
    return payload?.error === 'Tenant is blocked' && /this company has been blocked/i.test(message);
};

export const getTenantSwitchErrorMessage = (error, fallback = 'Unable to switch companies.') => {
    const payload = parseApiErrorPayload(error);
    return payload?.message || payload?.error || error?.message || fallback;
};
