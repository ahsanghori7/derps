import { getRequestWithOutBody } from './fetch';
import { baseURl } from '../Config/systemConfig';

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.modules)) return payload.modules;
  return [];
};

const normalizeModules = (payload) => {
  const list = normalizeList(payload);
  return list
    .map((item) => {
      if (typeof item === 'string') {
        return { value: item, label: item };
      }
      const value =
        item?.value
        ?? item?.code
        ?? item?.module
        ?? item?.name
        ?? item?.key
        ?? null;
      if (!value) return null;
      return {
        value: String(value),
        label: String(item?.label ?? item?.name ?? item?.title ?? value),
      };
    })
    .filter(Boolean);
};

/**
 * GET /api/audit-log/modules
 */
export const fetchAuditLogModules = async (token) => {
  if (!token) throw new Error('Access token is required');

  const result = await getRequestWithOutBody(`${baseURl}audit-log/modules`, token);
  const payload = result?.data ?? result;
  return normalizeModules(payload);
};

/**
 * GET /api/audit-log?...
 * Supports: module, action, entityId, startDate, endDate, page, limit
 */
export const fetchAuditLogs = async (token, filters = {}) => {
  if (!token) throw new Error('Access token is required');

  const params = new URLSearchParams();
  const {
    module,
    action,
    entityId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  if (module) {
    const moduleValue = Array.isArray(module) ? module.filter(Boolean).join(',') : module;
    if (moduleValue) params.set('module', String(moduleValue));
  }
  if (action) params.set('action', String(action));
  if (entityId) params.set('entityId', String(entityId));
  if (startDate) params.set('startDate', String(startDate));
  if (endDate) params.set('endDate', String(endDate));
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));

  const query = params.toString();
  const result = await getRequestWithOutBody(
    `${baseURl}audit-log${query ? `?${query}` : ''}`,
    token
  );

  const payload = result?.data ?? result;
  const logs = normalizeList(payload);
  const totalCount =
    payload?.totalRecords
    ?? payload?.total
    ?? payload?.count
    ?? result?.totalRecords
    ?? result?.total
    ?? logs.length;

  return {
    logs,
    totalCount: Number(totalCount) || 0,
    page: Number(payload?.page ?? page) || 1,
    limit: Number(payload?.limit ?? limit) || 20,
  };
};
