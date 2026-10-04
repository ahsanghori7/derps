import { applyTenantIdToBody, applyTenantIdToUrl, clearTenantGroupStorage, getActiveTenantCacheKey, getTenantOverrideHeaders } from '../Utils/tenantGroup';

export const buildAuthHeaders = (tokena, extra = {}) => {
    const headers = {
        ...(tokena ? { Authorization: `Bearer ${tokena}` } : {}),
        ...extra,
    };
    Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() === 'x-tenant-id') {
            delete headers[key];
        }
    });
    return {
        ...headers,
        ...getTenantOverrideHeaders(),
    };
};

export const getRequestWithOutBody = async (api, tokena, options = {}) => {
    try {
        const { signal } = options || {};
        const response = await fetch(applyTenantIdToUrl(api), {
            method: 'GET',
            cache: 'no-store',
            headers: buildAuthHeaders(tokena, {
                'Content-Type': 'application/json', // Assuming the content type is JSON
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            }),
            redirect: 'follow',
            signal,
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = await response.text();
            const err = new Error(errorText || `HTTP error! Status: ${response.status}`);
            err.status = response.status;
            throw err;
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        throw error;
    }
};

const __getCache = new Map();

export const getRequestWithOutBodyCached = async (
    api,
    tokena,
    {
        ttlMs = 2 * 60 * 1000,
        force = false,
        cacheKey,
        signal,
    } = {},
) => {
    const key = cacheKey || `${tokena || ""}::${getActiveTenantCacheKey()}::${api}`;
    const now = Date.now();
    const existing = __getCache.get(key);

    if (!force && existing) {
        if (existing.data && existing.expiresAt > now) {
            return existing.data;
        }
        if (existing.promise) {
            return existing.promise;
        }
    }

    const promise = getRequestWithOutBody(api, tokena, { signal }).then((data) => {
        __getCache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs,
            promise: null,
        });
        return data;
    }).catch((err) => {
        const current = __getCache.get(key);
        if (current && current.promise) {
            __getCache.delete(key);
        }
        throw err;
    });

    __getCache.set(key, {
        data: existing?.data,
        expiresAt: existing?.expiresAt || 0,
        promise,
    });

    return promise;
};

export const invalidateGetCache = (matcher) => {
    for (const key of __getCache.keys()) {
        if (!matcher || matcher(key)) {
            __getCache.delete(key);
        }
    }
};

export const downloadFileWithToken = async (url, tokena, fileName) => {
    try {
        const response = await fetch(applyTenantIdToUrl(url), {
            method: 'GET',
            headers: buildAuthHeaders(tokena),
            redirect: 'follow',
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! Status: ${response.status}`);
        }

        const blob = await response.blob();
        const urlObject = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObject;

        const disposition = response.headers.get('content-disposition');
        const match = disposition && disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const headerFileName = match ? decodeURIComponent(match[1] || match[2] || '') : '';

        a.download = fileName || headerFileName || `export_${Date.now()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlObject);
        return true;
    } catch (error) {
        throw error;
    }
};

export const patchRequestWithBody = async (api, data, tokena) => {
    try {
        const response = await fetch(applyTenantIdToUrl(api), {
            method: 'PATCH',
            headers: buildAuthHeaders(tokena, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(applyTenantIdToBody(data)),
            redirect: 'follow',
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        throw error;
    }
};

export const patchComment = async (url, token, message, fileUrl) => {
    const data = {
        message: message,
        fileUrl: fileUrl
    };

    try {
        const response = await fetch(applyTenantIdToUrl(url), {
            method: 'PATCH',
            headers: buildAuthHeaders(token, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(applyTenantIdToBody(data))
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Network response was not ok.');
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        throw error;
    }
};

export const postRequestWithBodyWithoutHeader = async (api, data) => {
    try {
        const response = await fetch(api, {
            method: 'POST',
            headers: {
                //     // 'Authorization': token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            redirect: 'follow',
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'An error occurred');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
};

const parsePublicError = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    let message = `HTTP error! Status: ${response.status}`;
    let payload = null;

    try {
        if (contentType.includes('application/json')) {
            payload = await response.json();
            message = payload?.message || payload?.error || message;
        } else {
            const text = await response.text();
            if (text) message = text;
        }
    } catch (_) {
        // keep default message
    }

    const err = new Error(message);
    err.status = response.status;
    if (payload) {
        err.data = payload;
        err.response = { data: payload };
    }
    return err;
};

/** Public GET — no auth header, does not trigger logout on 401 */
export const getPublicRequest = async (api, options = {}) => {
    const { signal } = options || {};
    const response = await fetch(api, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        },
        redirect: 'follow',
        signal,
    });

    if (!response.ok) {
        throw await parsePublicError(response);
    }

    return response.json();
};

/** Public POST — no auth header, does not trigger logout on 401 */
export const postPublicRequest = async (api, data = {}) => {
    const response = await fetch(api, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        redirect: 'follow',
    });

    if (!response.ok) {
        throw await parsePublicError(response);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return {};
};

/** Public PUT — no auth header, does not trigger logout on 401 */
export const putPublicRequest = async (api, data = {}) => {
    const response = await fetch(api, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        redirect: 'follow',
    });

    if (!response.ok) {
        throw await parsePublicError(response);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return {};
};

/** Public multipart POST — no auth header, does not trigger logout on 401 */
export const postPublicFormData = async (api, formData) => {
    const response = await fetch(api, {
        method: 'POST',
        body: formData,
        redirect: 'follow',
    });

    if (!response.ok) {
        throw await parsePublicError(response);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    return {};
};
// export const postRequestWithBodyAndToken = async (api, data, tokena) => {
//     const token = `Bearer ${tokena}`;

//     try {
//         const response = await fetch(api, {
//             method: 'POST',
//             headers: {
//                 'Authorization': token,
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(data),
//             // redirect: 'follow',
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.message || 'An error occurred');
//         }
//         return await response.json();
//     } catch (error) {
//         throw error;
//     }
// };

export const postRequestWithBodyAndToken = async (url, token, body, options = {}) => {
    try {
        const { signal } = options || {};
        const response = await fetch(applyTenantIdToUrl(url), {
            method: 'POST',
            headers: buildAuthHeaders(token, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(applyTenantIdToBody(body)),
            signal,
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = await response.text(); // Get the response as text
            throw new Error(errorText || 'An error occurred'); // Use the text response for the error
        }

        return await response.json(); // Return the response data
    } catch (error) {
        throw error; // Rethrow the error for further handling
    }
};

export const postProductData = async (url, data) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            credentials: 'include', // Include credentials (cookies) in the request
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;
    } catch (error) {
        throw error;
    }
};

export const postRequestWithFormData = async (url, token, body) => {
    try {
        const response = await fetch(applyTenantIdToUrl(url), {
            method: 'POST',
            headers: buildAuthHeaders(token),
            body: applyTenantIdToBody(body), // Use FormData as the body
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = await response.text(); // Get the response as text
            throw new Error(errorText || 'An error occurred'); // Use the text response for the error
        }

        return await response.json(); // Return the response data
    } catch (error) {
        throw error; // Rethrow the error for further handling
    }
};

export const patchRequestWithBodyAndToken = async (url, token, body) => {
    try {
        const response = await fetch(applyTenantIdToUrl(url), {
            method: 'PATCH',
            headers: buildAuthHeaders(token, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(applyTenantIdToBody(body)),
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = await response.text(); // Get the response as text
            throw new Error(errorText || 'An error occurred'); // Use the text response for the error
        }

        return await response.json(); // Return the response data
    } catch (error) {
        throw error; // Rethrow the error for further handling
    }
};

export const putRequestWithBodyAndToken = async (url, token, body) => {
    try {
        const response = await fetch(applyTenantIdToUrl(url), {
            method: 'PUT',
            headers: buildAuthHeaders(token, {
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(applyTenantIdToBody(body)),
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            let message = `Request failed (${response.status})`;
            let errorData = null;
            try {
                if (contentType.includes('application/json')) {
                    errorData = await response.json();
                    message = errorData.message || message;
                } else {
                    const errorText = await response.text();
                    // Ignore HTML error pages (e.g. Laravel "Whoops" 500 pages)
                    if (errorText && !errorText.trim().startsWith('<')) {
                        message = errorText;
                        errorData = { message: errorText };
                    }
                }
            } catch (_) {}
            const err = new Error(message);
            err.status = response.status;
            if (errorData) {
                err.data = errorData;
                err.response = { data: errorData };
            }
            throw err;
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const deleteRequest = async (api, tokena) => {
    const res = await fetch(applyTenantIdToUrl(api), {
        method: 'DELETE',
        headers: buildAuthHeaders(tokena),
    });
    // return await res.json();
    // return res.json();
    if (res.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
    }

    if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorData = null;
        try {
            if (contentType && contentType.includes('application/json')) {
                errorData = await res.json();
            } else {
                const errorText = await res.text();
                errorData = errorText ? { message: errorText } : null;
            }
        } catch (_) {
            errorData = null;
        }

        const error = new Error(errorData?.message || `HTTP error! Status: ${res.status}`);
        if (errorData) {
            error.response = { data: errorData };
            error.data = errorData;
        }
        error.status = res.status;
        throw error;
    }

    // Check if the response body is not empty before trying to parse JSON
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await res.json();
    } else {
        // If the response is not in JSON format, return an empty object or handle accordingly
        return {};
    }
};
export const deleteRequestWithBody = async (api, tokena, body) => {
    const res = await fetch(applyTenantIdToUrl(api), {
        method: 'DELETE',
        headers: buildAuthHeaders(tokena, {
            'Content-Type': 'application/json', // Ensure Content-Type is set
        }),
        body: JSON.stringify(applyTenantIdToBody(body)), // Ensure body is stringified
    });

    if (res.status === 401) {
        handleUnauthorized();
        throw new Error('Unauthorized');
    }

    if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorData = null;
        try {
            if (contentType && contentType.includes('application/json')) {
                errorData = await res.json();
            } else {
                const errorText = await res.text();
                errorData = errorText ? { message: errorText } : null;
            }
        } catch (_) {
            errorData = null;
        }

        const error = new Error(errorData?.message || `HTTP error! Status: ${res.status}`);
        if (errorData) {
            error.response = { data: errorData };
            error.data = errorData;
        }
        error.status = res.status;
        throw error;
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await res.json();
    } else {
        return {};
    }
};

export const putRequestWithBody = async (api, file) => {
    try {
        const response = await fetch(api, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type, // Ensure the Content-Type matches the file type
            },
            body: file,
            redirect: 'follow',
        });

        if (response.status === 401) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (response.status === 200) {
            return response.status;
        } else {
            const errorText = await response.text();
            throw new Error(`Error in PUT request: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        throw error;
    }
};


// Centralized handler for 401 Unauthorized responses
const handleUnauthorized = () => {
    try {
        // Mirror parts of Sidebar handleLogout relevant to auth cleanup
        document?.documentElement?.classList?.remove("dark");
    } catch (_) {}
    try { localStorage.setItem('theme', 'light'); } catch (_) {}
    try { localStorage.removeItem('accessToken'); } catch (_) {}
    try { localStorage.removeItem('userDetails'); } catch (_) {}
    try { clearTenantGroupStorage(); } catch (_) {}

    // Redirect to login page
    try {
        if (window.location.pathname !== '/') {
            window.location.replace('/');
        }
    } catch (_) {}
};

