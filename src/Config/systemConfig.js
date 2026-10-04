export const baseURl = import.meta.env.VITE_APP_BASE_URL;

export const frontendBaseUrl =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : String(baseURl || "")
        .replace(/\/api\/?$/i, "")
        .replace(/\/$/, "");