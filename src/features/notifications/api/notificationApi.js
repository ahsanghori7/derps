import { 
    getRequestWithOutBody, 
    postRequestWithBodyAndToken
} from '@api/fetch';
import { baseURl } from '../../../Config/systemConfig';

// Ensure proper URL formatting
const NOTIFICATION_API_BASE = `${baseURl.replace(/\/$/, '')}/notifications`;

/**
 * Notification API Service
 * Following the documentation in chat.txt (lines 1198-1308)
 */

/**
 * Get Notifications
 * GET api/notifications
 * Query Parameters: limit, page, paginate, orderBy, order
 */
export const getNotifications = async (token, options = {}) => {
    const {
        limit = 10,
        page = 1,
        paginate = true,
        tenantId = '',
        orderBy = 'createdAt',
        order = 'desc'
    } = options;

    const queryParams = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
        paginate: paginate.toString(),
        tenantId: tenantId.toString(),
        orderBy,
        order
    });

    const url = `${NOTIFICATION_API_BASE}?${queryParams.toString()}`;
    return await getRequestWithOutBody(url, token);
};

/**
 * Mark Notification as Read (Fallback API)
 * POST api/notifications/:id/read
 * This endpoint acts as a fallback in case the socket connection is disconnected.
 */
export const markNotificationAsRead = async (token, notificationId) => {
    const url = `${NOTIFICATION_API_BASE}/${notificationId}/read`;
    const body = {
        notificationId: notificationId
    };
    return await postRequestWithBodyAndToken(url, token, body);
};

