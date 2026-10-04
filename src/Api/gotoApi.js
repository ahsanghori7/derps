import {
  deleteRequest,
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  putRequestWithBodyAndToken,
} from './fetch';
import { baseURl } from '../Config/systemConfig';

const gotoBase = `${String(baseURl || '').replace(/\/$/, '')}/goto`;

const unwrap = (result) => {
  if (result == null) return null;
  if (result.data !== undefined) return result.data;
  return result;
};

export const parseGotoErrorMessage = (error) => {
  const raw = error?.message || error?.data?.message || '';
  if (!raw) return 'Failed to place GoTo call';

  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || parsed?.error || parsed?.data?.message || raw;
  } catch {
    if (String(raw).trim().startsWith('<')) {
      return 'Failed to place GoTo call';
    }
    return raw;
  }
};

export const isGotoLineRequiredError = (message) =>
  /default goto line|set your default/i.test(String(message || ''));

export const isGotoNotConnectedError = (message) =>
  /goto not connected|not connected/i.test(String(message || ''));

export const isGotoPermissionError = (message) =>
  /don'?t have permission|no permission to make this call/i.test(String(message || ''));

export const isGotoMissingPhoneError = (message) =>
  /no phone number/i.test(String(message || ''));

export const getGotoConnection = async (token) => {
  const result = await getRequestWithOutBody(`${gotoBase}/connection`, token);
  return unwrap(result);
};

/** Start GoTo OAuth — returns { authorizeUrl, state }. */
export const startGotoOAuth = async (token) => {
  const result = await getRequestWithOutBody(`${gotoBase}/oauth/start`, token);
  return unwrap(result);
};

export const disconnectGotoConnection = async (token) => {
  return deleteRequest(`${gotoBase}/connection`, token);
};

export const setGotoAccountKey = async (token, accountKey) => {
  const result = await putRequestWithBodyAndToken(
    `${gotoBase}/connection/account-key`,
    token,
    { accountKey: String(accountKey || '').trim() }
  );
  return unwrap(result);
};

/** Ensure GoTo call-events webhook subscription is active. */
export const ensureGotoCallEvents = async (token) => {
  const result = await postRequestWithBodyAndToken(
    `${gotoBase}/call-events/ensure`,
    token,
    {}
  );
  return unwrap(result);
};

export const getGotoLines = async (token) => {
  const result = await getRequestWithOutBody(`${gotoBase}/lines`, token);
  const data = unwrap(result);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.lines)) return data.lines;
  return [];
};

export const getMyGotoLine = async (token) => {
  const result = await getRequestWithOutBody(`${gotoBase}/me/line`, token);
  const data = unwrap(result);
  const line = data?.line && typeof data.line === 'object' ? data.line : data;
  if (!line || typeof line !== 'object') return null;
  if (!line.lineId && !line.extensionNumber) return null;
  return line;
};

export const setMyGotoLine = async (token, { lineId, extensionNumber } = {}) => {
  return putRequestWithBodyAndToken(`${gotoBase}/me/line`, token, {
    lineId,
    ...(extensionNumber ? { extensionNumber } : {}),
  });
};

export const clickToCall = async (
  token,
  { entityType, entityId, phoneNumber, subject } = {}
) => {
  const payload = {
    entityType,
    entityId: Number(entityId),
  };

  if (phoneNumber) {
    payload.phoneNumber = phoneNumber;
  }
  if (subject?.trim()) {
    payload.subject = subject.trim();
  }

  const result = await postRequestWithBodyAndToken(`${gotoBase}/calls`, token, payload);
  return unwrap(result);
};

/** Pull recent GoTo call reports into CRM activities when webhooks were missed. */
export const reconcileGotoCallEvents = async (token, { lookbackHours = 2 } = {}) => {
  const hours = Number(lookbackHours);
  const result = await postRequestWithBodyAndToken(`${gotoBase}/call-events/reconcile`, token, {
    lookbackHours: Number.isFinite(hours) && hours > 0 ? hours : 2,
  });
  return unwrap(result);
};
