/**
 * Tenant invoice logos are often on POS CDN (pos.gotmsolutions.com). Browsers block
 * reading cross-origin pixels (html2canvas / canvas) without CORS. Dev uses Vite
 * proxy /proxy-pos; production needs the same path on nginx (see deploy/nginx-proxy-pos.conf).
 */
import { baseURl } from "../Config/systemConfig";

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** @deprecated use getInvoiceImageFetchCandidates */
export function getProxiedImageFetchUrl(src) {
  const candidates = getInvoiceImageFetchCandidates(src);
  return candidates[0] ?? null;
}

/** Same-origin fetch URLs to try before cross-origin (avoids CORS). */
export function getInvoiceImageFetchCandidates(src) {
  if (!src || typeof src !== "string") return [];
  if (src.startsWith("data:")) return [src];

  const candidates = [];

  if (!src.startsWith("http")) {
    candidates.push(src);
    if (src.startsWith("/") && typeof baseURl === "string" && baseURl) {
      const trimmedBase = baseURl.replace(/\/+$/, "");
      candidates.push(`${trimmedBase}${src}`);
    }
    return [...new Set(candidates)];
  }

  try {
    const u = new URL(src);
    const pathQuery = `${u.pathname}${u.search}`;
    const host = u.hostname.toLowerCase();

    if (host === "pos.gotmsolutions.com") {
      candidates.push(`/proxy-pos${pathQuery}`);
    }

    if (u.pathname.startsWith("/files/")) {
      candidates.push(pathQuery);
    }

    if (typeof baseURl === "string" && baseURl) {
      const apiOrigin = baseURl.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
      if (apiOrigin && apiOrigin !== u.origin) {
        candidates.push(`${apiOrigin}${pathQuery}`);
      }
    }

    candidates.push(src);
  } catch {
    candidates.push(src);
  }

  return [...new Set(candidates.filter(Boolean))];
}

async function fetchImageAsDataURL(url) {
  const isAbsoluteHttp = url.startsWith("http");
  const res = await fetch(url, {
    mode: isAbsoluteHttp ? "cors" : "same-origin",
    cache: "no-store",
    credentials: isAbsoluteHttp ? "omit" : "include",
  });
  if (!res.ok) return null;

  const contentType = String(res.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("image/")) return null;

  const blob = await res.blob();
  if (!String(blob.type || "").toLowerCase().startsWith("image/")) return null;

  return blobToDataURL(blob);
}

export function isInvoiceImageDataURL(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

export function waitForImageElements(imgs, timeoutMs = 12000) {
  const list = Array.from(imgs || []).filter(Boolean);
  if (!list.length) return Promise.resolve();

  return Promise.all(
    list.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };
          img.addEventListener("load", done);
          img.addEventListener("error", done);
          setTimeout(done, timeoutMs);
        }),
    ),
  );
}

/**
 * Resolve remote logo to data URL for <img> + html2canvas (needs non-tainted canvas).
 * Returns a data:image/* URL on success, or the original src when resolution is not possible.
 */
export async function resolveInvoiceImageToDataURL(src) {
  if (!src || typeof src !== "string") return src;
  if (src.startsWith("data:")) return src;

  const candidates = getInvoiceImageFetchCandidates(src);

  for (const candidate of candidates) {
    if (candidate.startsWith("data:")) return candidate;
    try {
      const data = await fetchImageAsDataURL(candidate);
      if (isInvoiceImageDataURL(data)) return data;
    } catch {
      // try next candidate
    }
  }

  if (!src.startsWith("http")) {
    try {
      const data = await fetchImageAsDataURL(src);
      if (isInvoiceImageDataURL(data)) return data;
    } catch {
      // fall through
    }
  }

  return src;
}
