import { baseURl } from '../Config/systemConfig';
import { getTenantIdFromSession } from '../Utils/helper';
import { buildAuthHeaders } from './fetch';

const shippingBase = `${String(baseURl || '').replace(/\/$/, '')}/shipping`;

const buildHeaders = (token, tenantId, withJson = true) => {
    const extra = {};
    if (tenantId) extra['X-Tenant-Id'] = String(tenantId);
    if (withJson) extra['Content-Type'] = 'application/json';
    return buildAuthHeaders(token, extra);
};

const parseErrorMessage = async (response) => {
    const text = await response.text();
    if (!text) return `HTTP error! Status: ${response.status}`;
    try {
        const json = JSON.parse(text);
        return json.message || json.error || text;
    } catch {
        return text;
    }
};

const shippingRequest = async (path, token, tenantId, options = {}) => {
    const { method = 'GET', body } = options;
    const response = await fetch(`${shippingBase}${path}`, {
        method,
        headers: buildHeaders(token, tenantId, method !== 'GET'),
        ...(body != null ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 401) {
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const message = await parseErrorMessage(response);
        throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
};

export const getShippingTenantId = (userDetails) => getTenantIdFromSession(userDetails);

export const validateShippingAddress = (token, tenantId, address) =>
    shippingRequest('/validate-address', token, tenantId, { method: 'POST', body: { address } });

export const findShippingLocations = (token, tenantId, payload) =>
    shippingRequest('/locations', token, tenantId, { method: 'POST', body: payload });

export const calculateShippingRates = (token, tenantId, payload) =>
    shippingRequest('/rates', token, tenantId, { method: 'POST', body: payload });

export const createShipment = (token, tenantId, payload) =>
    shippingRequest('/shipments', token, tenantId, { method: 'POST', body: payload });

export const listShipments = (token, tenantId, { page = 1, limit = 25, isShipped } = {}) => {
    const params = new URLSearchParams({
        paginate: 'true',
        page: String(page),
        limit: String(limit),
    });
    if (isShipped != null && isShipped !== '') {
        params.set('isShipped', String(isShipped));
    }
    return shippingRequest(`?${params.toString()}`, token, tenantId);
};

export const getShipmentById = (token, tenantId, id) =>
    shippingRequest(`/${id}`, token, tenantId);

export const trackShipment = (token, tenantId, trackingNumber) =>
    shippingRequest(`/track/${encodeURIComponent(trackingNumber)}`, token, tenantId);

export const cancelShipment = (token, tenantId, { trackingNumber, deletionControl = 'DELETE_ALL_PACKAGES' }) =>
    shippingRequest('/shipments/cancel', token, tenantId, {
        method: 'PUT',
        body: { trackingNumber, deletionControl },
    });
