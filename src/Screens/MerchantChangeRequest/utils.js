export const STATUS = {
  DRAFT: "draft",
  WAITING: "waiting_for_customer_sign",
  IN_REVIEW: "in_review",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const STATUS_META = {
  [STATUS.DRAFT]: {
    label: "Draft",
    color: "#64748B",
    bg: "rgba(100, 116, 139, 0.16)",
  },
  [STATUS.WAITING]: {
    label: "Pending E-Sign",
    color: "#FE6901",
    bg: "rgba(254, 105, 1, 0.18)",
  },
  [STATUS.IN_REVIEW]: {
    label: "In Review",
    color: "#7E57C2",
    bg: "rgba(126, 87, 194, 0.18)",
  },
  [STATUS.COMPLETED]: {
    label: "Completed",
    color: "#4AC411",
    bg: "rgba(74, 196, 17, 0.18)",
  },
  [STATUS.CANCELLED]: {
    label: "Cancelled",
    color: "#EF3826",
    bg: "rgba(239, 56, 38, 0.18)",
  },
};

export const STATUS_FILTERS = [
  {
    key: "all",
    label: "All Requests",
    subtitle: "Total change requests",
    status: null,
    color: "#0C79F7",
  },
  {
    key: STATUS.DRAFT,
    label: "Draft",
    subtitle: "Requests saved as draft",
    status: STATUS.DRAFT,
    color: "#64748B",
  },
  {
    key: STATUS.WAITING,
    label: "Pending E-Sign",
    subtitle: "Awaiting merchant signature",
    status: STATUS.WAITING,
    color: "#FE6901",
  },
  {
    key: STATUS.IN_REVIEW,
    label: "In Review",
    subtitle: "Signed, pending review",
    status: STATUS.IN_REVIEW,
    color: "#7E57C2",
  },
  {
    key: STATUS.COMPLETED,
    label: "Completed",
    subtitle: "Successfully completed",
    status: STATUS.COMPLETED,
    color: "#4AC411",
  },
  {
    key: STATUS.CANCELLED,
    label: "Cancelled",
    subtitle: "Cancelled requests",
    status: STATUS.CANCELLED,
    color: "#EF3826",
  },
];

export const getStatusMeta = (status) =>
  STATUS_META[status] || {
    label: status ? String(status) : "-",
    color: "#64748B",
    bg: "rgba(100, 116, 139, 0.16)",
  };

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const getMerchantLabel = (merchant) =>
  merchant?.dbaName ||
  merchant?.merchantName ||
  merchant?.legalBusinessName ||
  merchant?.companyName ||
  merchant?.name ||
  merchant?.ownerName ||
  "-";

export const getMerchantEmail = (merchant) =>
  merchant?.ownerEmail ||
  merchant?.email ||
  merchant?.owner_email ||
  merchant?.contactEmail ||
  "";

export const getMerchantId = (merchant) =>
  merchant?.id ?? merchant?.merchantId ?? merchant?.customerId ?? "";

export const extractFileUrl = (payload) => {
  const data = payload?.data ?? payload;
  const candidates = [
    data?.fileUrl,
    data?.["change-request"],
    data?.changeRequest,
    data?.uploadedFiles,
    data?.file,
    data?.url,
    data,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return {
        url: candidate.trim(),
        mimetype: undefined,
        originalname: undefined,
      };
    }
    if (candidate && typeof candidate === "object") {
      const url =
        typeof candidate.url === "string"
          ? candidate.url
          : typeof candidate.path === "string"
            ? candidate.path
            : null;
      if (url && String(url).trim()) {
        const id = candidate.id ?? candidate.fileId ?? data?.id ?? data?.fileId;
        return {
          url: String(url).trim(),
          mimetype: candidate.mimetype || candidate.mimeType,
          originalname:
            candidate.originalname || candidate.name || candidate.originalName,
          name: candidate.name || candidate.originalname || candidate.originalName,
          id: Number.isFinite(Number(id)) ? Number(id) : id || undefined,
        };
      }
    }
  }
  return null;
};

export const fileUrlToDisplay = (fileUrl) => {
  if (!fileUrl) return null;
  if (typeof fileUrl === "string") return fileUrl;
  return fileUrl?.url || null;
};

/** Resolve relative upload paths to absolute URLs for public pages. */
export const resolvePublicFileUrl = (fileUrl) => {
  const raw = fileUrlToDisplay(fileUrl);
  if (!raw) return null;
  const url = String(raw).trim();
  if (/^https?:\/\//i.test(url)) return url;

  let base = "";
  try {
    // Lazy import pattern — utils used widely; read from env when bundled
    base = String(
      typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_BASE_URL
        ? import.meta.env.VITE_APP_BASE_URL
        : ""
    )
      .replace(/\/api\/?$/i, "")
      .replace(/\/$/, "");
  } catch {
    base = "";
  }

  if (!base) return url;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
};

export const getFileMeta = (fileUrl) => {
  if (!fileUrl) {
    return { url: null, mimetype: "", name: "" };
  }
  if (typeof fileUrl === "object") {
    return {
      url: resolvePublicFileUrl(fileUrl),
      mimetype: fileUrl.mimetype || fileUrl.mimeType || "",
      name:
        fileUrl.originalname ||
        fileUrl.name ||
        fileUrl.originalName ||
        "",
    };
  }
  const url = resolvePublicFileUrl(fileUrl);
  const name = url ? url.split("/").pop()?.split("?")[0] || "" : "";
  return { url, mimetype: "", name };
};

export const isPdfFile = (mimetype, url, name) => {
  if (mimetype && /pdf/i.test(mimetype)) return true;
  const probe = `${name || ""} ${url || ""}`;
  return /\.pdf($|\?|#)/i.test(probe);
};

export const isChangeRequestPdf = (fileUrl, fileName = "") => {
  if (!fileUrl) return false;
  if (typeof fileUrl === "string") return isPdfFile("", fileUrl, fileName);
  return isPdfFile(
    fileUrl.mimetype || fileUrl.mimeType,
    fileUrl.url || fileUrl.path,
    fileName || fileUrl.originalname || fileUrl.name || fileUrl.originalName
  );
};

import { getInvoiceImageFetchCandidates } from "../../Utils/invoiceImageResolve";

/**
 * DELETE /api/files/by-name?name=<segment after /uploads/>
 * Keep URL encoding as returned by upload, e.g.
 * `7e8306eb-...%20-%20Sales-Module-Overview.pdf`
 */
export const getUploadedFileDeleteName = (fileUrl) => {
  const raw = fileUrlToDisplay(fileUrl);
  if (!raw) return "";
  const withoutQuery = String(raw).split("?")[0];
  const marker = "/uploads/";
  const idx = withoutQuery.toLowerCase().lastIndexOf(marker);
  const segment =
    idx !== -1
      ? withoutQuery.slice(idx + marker.length)
      : withoutQuery.split("/").filter(Boolean).pop() || "";
  return String(segment).trim();
};

export const isLocalFileUrl = (fileUrl) =>
  /^(blob:|data:)/i.test(String(fileUrlToDisplay(fileUrl) || ""));

/** Same-origin CDN proxy first (pos.gotmsolutions.com → /proxy-pos), then other fallbacks. */
export const getPdfFetchCandidates = (fileUrl) => {
  const raw = fileUrlToDisplay(fileUrl);
  if (!raw) return [];
  const url = String(raw).trim();
  if (/^(blob:|data:)/i.test(url)) return [url];
  return getInvoiceImageFetchCandidates(url);
};

export const toFetchableFileUrl = (fileUrl) =>
  getPdfFetchCandidates(fileUrl)[0] || null;

export const DEFAULT_SIGNATURE_BOX = { width: 120, height: 26 };

const newPlacementId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeSignaturePlacements = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.signaturePlacements)
      ? raw.signaturePlacements
      : [];
  return list
    .map((item, index) => {
      const pageIndex = Number(item?.pageIndex);
      const x = Number(item?.x);
      const y = Number(item?.y);
      const width = Number(item?.width) || DEFAULT_SIGNATURE_BOX.width;
      const height = Number(item?.height) || DEFAULT_SIGNATURE_BOX.height;
      if (!Number.isFinite(pageIndex) || pageIndex < 0) return null;
      if (![x, y, width, height].every(Number.isFinite)) return null;
      return {
        id: item?.id || `existing-${index}-${pageIndex}-${Math.round(x)}-${Math.round(y)}`,
        pageIndex: Math.round(pageIndex),
        x,
        y,
        width,
        height,
      };
    })
    .filter(Boolean);
};

export const serializeSignaturePlacements = (list) =>
  normalizeSignaturePlacements(list).map(({ pageIndex, x, y, width, height }) => ({
    pageIndex,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }));

export const createSignaturePlacement = (pageIndex, x, y, size = DEFAULT_SIGNATURE_BOX) => ({
  id: newPlacementId(),
  pageIndex,
  x,
  y,
  width: size.width,
  height: size.height,
});

export const parseApiError = (error) => {
  const raw = error?.message || error || "Something went wrong";
  if (typeof raw !== "string") return "Something went wrong";
  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || parsed?.error || raw;
  } catch {
    return raw.slice(0, 240);
  }
};

const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Status counts from a single change-request list API response (root-level fields). */
export const extractChangeRequestStats = (result) => {
  const empty = {
    all: 0,
    [STATUS.DRAFT]: 0,
    [STATUS.WAITING]: 0,
    [STATUS.IN_REVIEW]: 0,
    [STATUS.COMPLETED]: 0,
    [STATUS.CANCELLED]: 0,
  };

  if (!result || typeof result !== "object") {
    return empty;
  }

  const payload =
    result?.data && typeof result.data === "object" && !Array.isArray(result.data)
      ? result.data
      : {};
  const source = { ...payload, ...result };

  const draft = toCount(source.totalDraftStatusCount);
  const waiting = toCount(
    source.totalWaitingForCustomerSignStatusCount ??
      source.totalWaitingStatusCount ??
      source.totalPendingStatusCount
  );
  const inReview = toCount(
    source.totalInReviewStatusCount ?? source.totalUnderReviewStatusCount
  );
  const completed = toCount(source.totalCompletedStatusCount);
  const cancelled = toCount(source.totalCancelledStatusCount);
  const summed = draft + waiting + inReview + completed + cancelled;
  const all = toCount(source.totalRecords) || summed;

  return {
    all,
    [STATUS.DRAFT]: draft,
    [STATUS.WAITING]: waiting,
    [STATUS.IN_REVIEW]: inReview,
    [STATUS.COMPLETED]: completed,
    [STATUS.CANCELLED]: cancelled,
  };
};

export const normalizeList = (result) => {
  const apiData = result?.data ?? result;
  const rows =
    apiData?.results ??
    apiData?.data?.results ??
    (Array.isArray(apiData?.data) ? apiData.data : null) ??
    (Array.isArray(apiData) ? apiData : []);
  const count =
    apiData?.totalRecords ??
    apiData?.data?.totalRecords ??
    apiData?.pagination?.total ??
    apiData?.pagination?.totalRecords ??
    (Array.isArray(rows) ? rows.length : 0);

  return {
    rows: Array.isArray(rows) ? rows.filter(Boolean) : [],
    total: Number(count) || 0,
  };
};

export const requestNumber = (row) => {
  if (!row?.id) return "-";
  return `MCR-${String(row.id).padStart(5, "0")}`;
};

/** Timeline steps driven by current status / document presence */
export const buildTimeline = (row) => {
  const status = row?.status;
  const hasFile = Boolean(fileUrlToDisplay(row?.fileUrl));
  const signed = Boolean(row?.signedAt || row?.signatureFileUrl);
  const sent =
    status === STATUS.WAITING ||
    status === STATUS.IN_REVIEW ||
    status === STATUS.COMPLETED ||
    status === STATUS.CANCELLED;

  const steps = [
    {
      key: "created",
      label: "Request Created",
      done: true,
      active: status === STATUS.DRAFT && !hasFile,
    },
    {
      key: "uploaded",
      label: "Document Uploaded",
      done: hasFile,
      active: status === STATUS.DRAFT && hasFile,
    },
    {
      key: "sent",
      label: "Sent for E-Sign",
      done: sent || signed,
      active: status === STATUS.WAITING,
    },
    {
      key: "signed",
      label: "Merchant Signed",
      done: signed || status === STATUS.IN_REVIEW || status === STATUS.COMPLETED,
      active: status === STATUS.IN_REVIEW,
    },
    {
      key: "completed",
      label: "Completed",
      done: status === STATUS.COMPLETED,
      active: status === STATUS.COMPLETED,
    },
  ];

  if (status === STATUS.CANCELLED) {
    steps.push({
      key: "cancelled",
      label: "Cancelled",
      done: true,
      active: true,
    });
  }

  return steps;
};
