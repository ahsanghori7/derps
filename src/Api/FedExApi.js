import {
  deleteRequest,
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  putRequestWithBodyAndToken,
} from './fetch';
import { baseURl } from '../Config/systemConfig';
import { toast } from 'react-toastify';

const apiRoot = String(baseURl || '').replace(/\/$/, '');
const fedexBase = `${apiRoot}/fedex`;

export const FEDEX_NOT_CONFIGURED_MESSAGE =
  'FedEx is not configured for this tenant. Go to Settings → FedEx to save credentials.';

export const FEDEX_AUTH_FAILED_MESSAGE =
  'FedEx rejected this tenant’s API credentials. Open Settings → FedEx, re-save Client ID, Client Secret, and Account Number, and match Environment to those keys (Sandbox vs Production).';

const unwrap = (result) => {
  if (result == null) return null;
  if (result.data !== undefined) return result.data;
  return result;
};

export const parseFedexErrorMessage = (error) => {
  const raw = error?.message || error?.data?.message || '';
  if (!raw) return 'FedEx request failed';

  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || parsed?.error || parsed?.data?.message || raw;
  } catch {
    if (String(raw).trim().startsWith('<')) {
      return 'FedEx request failed';
    }
    return raw;
  }
};

export const isFedexNotConfiguredError = (message) =>
  /fedex is not configured/i.test(String(message || ''));

export const isFedexAuthError = (message) =>
  /could not authenticate your credentials|authenticate your credentials/i.test(
    String(message || '')
  );

export const getFedexErrorToast = (error, fallback = 'FedEx request failed') => {
  const message = parseFedexErrorMessage(error) || fallback;
  if (isFedexNotConfiguredError(message)) return FEDEX_NOT_CONFIGURED_MESSAGE;
  if (isFedexAuthError(message)) return FEDEX_AUTH_FAILED_MESSAGE;
  return message;
};

export const getFedexConnection = async (token) => {
  const result = await getRequestWithOutBody(`${fedexBase}/connection`, token);
  return unwrap(result);
};

/**
 * Create or update per-tenant FedEx credentials.
 * @param {string} token
 * @param {{
 *   clientId: string,
 *   clientSecret: string,
 *   accountNumber: string,
 *   environment?: 'sandbox'|'production',
 *   senderName?: string,
 *   senderPhone?: string,
 *   senderAddress1?: string,
 *   senderCity?: string,
 *   senderState?: string,
 *   senderZip?: string,
 * }} payload
 */
export const saveFedexConnection = async (token, payload) => {
  const body = {
    clientId: String(payload?.clientId || '').trim(),
    clientSecret: String(payload?.clientSecret || '').trim(),
    accountNumber: String(payload?.accountNumber || '').trim(),
    environment: payload?.environment === 'production' ? 'production' : 'sandbox',
  };

  const optionalSender = [
    'senderName',
    'senderPhone',
    'senderAddress1',
    'senderCity',
    'senderState',
    'senderZip',
  ];
  optionalSender.forEach((field) => {
    const value = String(payload?.[field] || '').trim();
    if (value) body[field] = value;
  });

  const result = await putRequestWithBodyAndToken(`${fedexBase}/connection`, token, body);
  return unwrap(result) ?? result;
};

export const deleteFedexConnection = async (token) => {
  return deleteRequest(`${fedexBase}/connection`, token);
};

/**
 * Generate Shipping Label
 * Calls the real FedEx API endpoint to generate a shipping label
 *
 * @param {string} token - Authentication token
 * @param {string} applicationId - Application ID
 * @returns {Promise<{labelImage: string, trackingNumber: string}>}
 */
export const generateShippingLabel = async (token, applicationId) => {
  if (!applicationId) {
    throw new Error('Application ID is required');
  }

  const url = `${apiRoot}/application/${applicationId}/generate-label`;

  try {
    const response = await postRequestWithBodyAndToken(url, token, {});

    const trackingNumber = response?.data?.trackingNumber || null;
    const encodedLabel =
      response?.data?.fedExResponse?.output?.transactionShipments?.[0]
        ?.pieceResponses?.[0]?.packageDocuments?.[0]?.encodedLabel || null;

    if (!encodedLabel) {
      throw new Error('No label image found in response');
    }

    const labelImage = `data:image/png;base64,${encodedLabel}`;

    return {
      labelImage,
      trackingNumber,
    };
  } catch (error) {
    toast.error(getFedexErrorToast(error, 'Error generating shipping label'));
    throw error;
  }
};
