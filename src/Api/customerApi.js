import { getRequestWithOutBody } from './fetch';
import { baseURl } from '../Config/systemConfig';

const normalizeMerchantList = (response) => {
    const apiData = response?.data ?? response;
    const rows =
        (Array.isArray(apiData?.data) ? apiData.data : null)
        || apiData?.results
        || apiData?.data?.results
        || (Array.isArray(apiData) ? apiData : null)
        || [];
    return Array.isArray(rows) ? rows : [];
};

export const fetchMerchantNames = async (token, merchantName, { page = 1, limit = 20 } = {}) => {
    const name = String(merchantName || '').trim();
    if (!name) return [];

    const params = new URLSearchParams({
        merchantName: name,
        page: String(page),
        limit: String(limit),
    });

    const response = await getRequestWithOutBody(
        `${baseURl}customer/merchant-names?${params.toString()}`,
        token,
    );

    return normalizeMerchantList(response);
};
