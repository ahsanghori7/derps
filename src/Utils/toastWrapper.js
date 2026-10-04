// Thin wrapper around react-toastify that prevents duplicate text toasts
// by assigning a deterministic toastId to each call.
// Any existing `import { toast } from "react-toastify"` will now use this wrapper
// via the Vite alias in vite.config.js.

import { toast as baseToast, ToastContainer } from "react-toastify/dist/react-toastify.esm.mjs";

const DEDUP_TYPES = ["success", "error", "info", "warning", "default"];

const getToastId = (type, content, options) => {
  if (options?.toastId) return options.toastId;
  if (typeof content !== "string") return undefined;
  // Stable id so the same message doesn't stack multiple toasts.
  return `${type}:${content}`;
};

const wrapMethod = (type, fn) => (content, options) =>
  fn(content, { ...options, toastId: getToastId(type, content, options) });

function toast(content, options) {
  return wrapMethod("default", baseToast)(content, options);
}

DEDUP_TYPES.forEach((type) => {
  if (typeof baseToast[type] === "function") {
    toast[type] = wrapMethod(type, baseToast[type]);
  }
});

// `warn` is an alias for `warning`; keep the same id for both.
if (typeof baseToast.warn === "function") {
  toast.warn = toast.warning;
}

// Re-export other helpers (dismiss, update, promise, loading, etc.) unchanged.
Object.keys(baseToast).forEach((key) => {
  if (!(key in toast)) {
    toast[key] = baseToast[key];
  }
});

export { toast, ToastContainer };
