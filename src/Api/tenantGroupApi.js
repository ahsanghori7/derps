import { getRequestWithOutBody, postRequestWithBodyAndToken } from './fetch';
import { baseURl } from '../Config/systemConfig';

const extractTenantRows = (result) => {
    const rows =
        result?.data?.data ||
        result?.data?.results ||
        (Array.isArray(result?.data) ? result.data : null) ||
        (Array.isArray(result) ? result : []);
    return Array.isArray(rows) ? rows : [];
};

export const setTenantParent = async (token, tenantId, parentTenantId) => {
    if (!token) throw new Error('Access token is required');
    if (tenantId == null || tenantId === '') throw new Error('Tenant ID is required');

    const body = {
        parentTenantId:
            parentTenantId == null || parentTenantId === ''
                ? null
                : Number(parentTenantId),
    };

    return postRequestWithBodyAndToken(
        `${baseURl}tenant/${tenantId}/set-parent`,
        token,
        body,
    );
};

export const fetchTenantGroup = async (token, tenantId) => {
    if (!token) throw new Error('Access token is required');
    const path =
        tenantId == null || tenantId === ''
            ? `${baseURl}tenant/group`
            : `${baseURl}tenant/${tenantId}/group`;
    return getRequestWithOutBody(path, token);
};

export const fetchTenantsForParentPicker = async (token) => {
    if (!token) throw new Error('Access token is required');
    const result = await getRequestWithOutBody(
        `${baseURl}tenant?paginate=true&page=1&limit=200&orderBy=name&order=asc`,
        token,
    );
    return extractTenantRows(result);
};
