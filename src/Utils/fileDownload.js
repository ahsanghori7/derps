import { getInvoiceImageFetchCandidates } from "./invoiceImageResolve";
import { buildAuthHeaders } from "../Api/fetch";

const getFileFetchCandidates = (url) => {
    const candidates = [...getInvoiceImageFetchCandidates(url)];

    if (url?.startsWith("http")) {
        try {
            const pathQuery = `${new URL(url).pathname}${new URL(url).search}`;
            candidates.unshift(pathQuery);
        } catch {
            // ignore malformed URL
        }
    }

    return [...new Set(candidates.filter(Boolean))];
};

export async function fetchFileBlob(url, token) {
    const candidates = getFileFetchCandidates(url);
    let lastError;

    for (const candidate of candidates) {
        try {
            const isAbsoluteHttp = candidate.startsWith("http");
            const headers = {};
            if (!isAbsoluteHttp && token) {
                Object.assign(headers, buildAuthHeaders(token));
            }

            const response = await fetch(candidate, {
                mode: isAbsoluteHttp ? "cors" : "same-origin",
                cache: "no-store",
                credentials: isAbsoluteHttp ? "omit" : "include",
                headers,
            });

            if (response.ok) {
                return response.blob();
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (token && url) {
        try {
            const response = await fetch(url, {
                headers: buildAuthHeaders(token),
            });
            if (response.ok) {
                return response.blob();
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Failed to fetch file");
}

export async function downloadFileFromUrl(url, fileName, token) {
    const blob = await fetchFileBlob(url, token);
    const urlObject = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = urlObject;
    link.setAttribute("download", fileName || "attachment");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(urlObject), 100);
}
