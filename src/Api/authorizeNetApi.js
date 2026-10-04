import {
  deleteRequest,
  getRequestWithOutBody,
  postRequestWithBodyAndToken,
  putRequestWithBodyAndToken,
} from './fetch';
import { baseURl } from '../Config/systemConfig';

const apiRoot = String(baseURl || '').replace(/\/$/, '');
const authorizeNetBase = `${apiRoot}/authorize-net`;

const unwrap = (result) => {
  if (result == null) return null;
  if (result.data !== undefined) return result.data;
  return result;
};

export const parseAuthorizeNetErrorMessage = (error) => {
  const raw = error?.message || error?.data?.message || '';
  if (!raw) return 'Authorize.Net request failed';

  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || parsed?.error || parsed?.data?.message || raw;
  } catch {
    if (String(raw).trim().startsWith('<')) {
      return 'Authorize.Net request failed';
    }
    return raw;
  }
};

export const isAuthorizeNetNotConfiguredError = (message) =>
  /authorize\.?net is not configured|not configured for this tenant/i.test(
    String(message || '')
  );

/** Build the webhook URL tenants should register in Authorize.Net. */
export const getAuthorizeNetWebhookUrl = (tenantId) => {
  if (tenantId == null || String(tenantId).trim() === '') return '';
  return `${authorizeNetBase}/webhook/${encodeURIComponent(String(tenantId).trim())}`;
};

export const getAuthorizeNetConnection = async (token) => {
  const result = await getRequestWithOutBody(`${authorizeNetBase}/connection`, token);
  return unwrap(result);
};

/**
 * Create or update per-tenant Authorize.Net credentials.
 * @param {string} token
 * @param {{ apiLoginId: string, transactionKey: string, signatureKey?: string, environment?: 'sandbox'|'production' }} payload
 */
export const saveAuthorizeNetConnection = async (token, payload) => {
  const body = {
    apiLoginId: String(payload?.apiLoginId || '').trim(),
    transactionKey: String(payload?.transactionKey || '').trim(),
    environment:
      payload?.environment === 'production' ? 'production' : 'sandbox',
  };
  const signatureKey = String(payload?.signatureKey || '').trim();
  if (signatureKey) {
    body.signatureKey = signatureKey;
  }

  const result = await putRequestWithBodyAndToken(
    `${authorizeNetBase}/connection`,
    token,
    body
  );
  return unwrap(result) ?? result;
};

export const deleteAuthorizeNetConnection = async (token) => {
  return deleteRequest(`${authorizeNetBase}/connection`, token);
};

/**
 * Generate a hosted payment link for an invoice.
 * @returns {{ browserPaymentUrl?: string, paymentUrl?: string, token?: string, amount?: number, ... }}
 */
export const createInvoiceHostedPaymentLink = async (
  token,
  invoiceId,
  { amount, returnUrl, cancelUrl } = {}
) => {
  const body = {};
  if (amount != null && amount !== '') {
    body.amount = Number(amount);
  }
  if (returnUrl) body.returnUrl = returnUrl;
  if (cancelUrl) body.cancelUrl = cancelUrl;

  const result = await postRequestWithBodyAndToken(
    `${apiRoot}/invoice/${encodeURIComponent(invoiceId)}/authorize-net/hosted-payment-link`,
    token,
    body
  );
  const data = unwrap(result);
  if (data && typeof data === 'object' && result?.message && !data.message) {
    return { ...data, message: result.message };
  }
  return data ?? result;
};

/** Prefer browserPaymentUrl (HTML redirect page) from the hosted-link response. */
export const extractHostedPaymentPageUrl = (responseData) => {
  if (!responseData) return '';

  const directCandidates = [
    responseData?.browserPaymentUrl,
    responseData?.hostedPaymentPageUrl,
    responseData?.hostedPaymentLink,
    responseData?.paymentUrl,
    responseData?.url,
    responseData?.data?.browserPaymentUrl,
    responseData?.data?.hostedPaymentPageUrl,
    responseData?.data?.hostedPaymentLink,
    responseData?.data?.paymentUrl,
    responseData?.data?.url,
    responseData?.result?.browserPaymentUrl,
    responseData?.result?.hostedPaymentPageUrl,
    responseData?.result?.url,
  ];

  const directMatch = directCandidates.find(
    (value) =>
      typeof value === 'string' &&
      value.includes('/api/invoice/authorize-net/hosted-payment-page?token=')
  );
  if (directMatch) return directMatch;

  const serialized = JSON.stringify(responseData);
  const absoluteMatch = serialized.match(
    /https?:\/\/[^\s"']*\/api\/invoice\/authorize-net\/hosted-payment-page\?token=[^"'\s]+/i
  );
  if (absoluteMatch?.[0]) return absoluteMatch[0];

  const relativeMatch = serialized.match(
    /\/api\/invoice\/authorize-net\/hosted-payment-page\?token=[^"'\s]+/i
  );
  if (relativeMatch?.[0]) {
    const origin = String(apiRoot).replace(/\/api$/i, '');
    return `${origin}${relativeMatch[0]}`;
  }

  // Fallback: any browserPaymentUrl / paymentUrl string
  const fallback = directCandidates.find(
    (value) => typeof value === 'string' && /^https?:\/\//i.test(value)
  );
  return fallback || '';
};
