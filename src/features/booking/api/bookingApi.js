import {
  getRequestWithOutBody,
  putRequestWithBodyAndToken,
  getPublicRequest,
  postPublicRequest,
} from '@api/fetch';
import { baseURl } from '../../../Config/systemConfig';

/**
 * Fetches the logged-in user's own booking availability (weekly hours + overrides).
 * GET /api/booking/availability
 */
export const getAvailability = (token, options = {}) => {
  if (!token) throw new Error('token is required');
  return getRequestWithOutBody(`${baseURl}booking/availability`, token, options);
};

/**
 * Saves the full booking availability schedule. Existing weekly hours and
 * date overrides for this host are replaced by the payload.
 * PUT /api/booking/availability
 */
export const saveAvailability = (token, payload) => {
  if (!token) throw new Error('token is required');
  return putRequestWithBodyAndToken(`${baseURl}booking/availability`, token, payload);
};

/**
 * Public, no-auth: lists open booking slots for a host within a date range.
 * GET /api/booking/public/slots
 */
export const getPublicSlots = ({ tenantSlug, userId, startDate, endDate }, options = {}) => {
  const params = new URLSearchParams({
    tenantSlug,
    userId: String(userId),
    startDate,
    endDate,
  });
  return getPublicRequest(`${baseURl}booking/public/slots?${params.toString()}`, options);
};

/**
 * Public, no-auth: books a guest into an open slot.
 * POST /api/booking/public/book
 */
export const createPublicBooking = (payload) => {
  return postPublicRequest(`${baseURl}booking/public/book`, payload);
};
