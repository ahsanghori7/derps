import { getRequestWithOutBody } from './fetch';
import { baseURl } from '../Config/systemConfig';

// Ensure proper URL formatting
const TAX_API_BASE = `${baseURl.replace(/\/$/, '')}/account-report`;

/**
 * Get Tax Summary
 * GET account-report/tax-summary
 * Fetches tax summary data for dashboard boxes
 */
export const getTaxSummary = async (token, options = {}) => {
    const {
        startDate = '',
        endDate = ''
    } = options;

    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    const url = `${TAX_API_BASE}/tax-summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await getRequestWithOutBody(url, token);
};
