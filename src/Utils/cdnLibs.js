const pending = new Map();

const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
const HEIC2ANY_URL = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.js';

export const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

const loadScript = (src) => {
  if (pending.has(src)) return pending.get(src);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      pending.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
  pending.set(src, promise);
  return promise;
};

export const loadExcelJS = async () => {
  if (typeof window !== 'undefined' && window.ExcelJS) return window.ExcelJS;
  await loadScript(EXCELJS_URL);
  if (!window.ExcelJS) throw new Error('ExcelJS failed to load');
  return window.ExcelJS;
};

export const loadHeic2Any = async () => {
  if (typeof window !== 'undefined' && typeof window.heic2any === 'function') {
    return window.heic2any;
  }
  await loadScript(HEIC2ANY_URL);
  if (typeof window.heic2any !== 'function') throw new Error('heic2any failed to load');
  return window.heic2any;
};
