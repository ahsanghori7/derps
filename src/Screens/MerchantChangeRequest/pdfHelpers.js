import { getPdfFetchCandidates } from "./utils";
import { PDFJS_WORKER_URL } from "../../Utils/cdnLibs";

export const TARGET_PAGE_WIDTH = 680;
// pdf.js AnnotationMode.ENABLE — MPA pages are mostly form appearances.
const ANNOTATION_ENABLE = 1;

let pdfjsLoader = null;

export const loadPdfjs = () => {
  if (!pdfjsLoader) {
    pdfjsLoader = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerCode = await fetch(PDFJS_WORKER_URL).then((res) => {
        if (!res.ok) throw new Error("Failed to load PDF worker");
        return res.text();
      });
      pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
        new Blob([workerCode], { type: "text/javascript" })
      );
      return pdfjs;
    })();
  }
  return pdfjsLoader;
};

export const isPdfBuffer = (buffer) => {
  if (!buffer || buffer.byteLength < 5) return false;
  const header = new TextDecoder("latin1").decode(new Uint8Array(buffer, 0, 5));
  return header === "%PDF-";
};

export const fetchPdfBytes = async (fileUrl, token) => {
  const candidates = getPdfFetchCandidates(fileUrl);
  let lastError = null;

  for (const url of candidates) {
    try {
      const isAbsoluteHttp = /^https?:\/\//i.test(url);
      const headers = {};
      if (!isAbsoluteHttp && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(url, {
        mode: isAbsoluteHttp ? "cors" : "same-origin",
        cache: "no-store",
        credentials: isAbsoluteHttp ? "omit" : "include",
        headers,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      if (!isPdfBuffer(buffer)) {
        throw new Error("Response was not a PDF");
      }
      return buffer;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not load PDF");
};

export const renderPdfPages = async (bytes, targetWidth = TARGET_PAGE_WIDTH) => {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes).slice() })
    .promise;
  const nextPages = [];
  const dpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    2
  );
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: (targetWidth / base.width) * dpr,
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx,
      viewport,
      annotationMode: ANNOTATION_ENABLE,
    }).promise;
    nextPages.push({
      pageIndex: i - 1,
      widthPt: base.width,
      heightPt: base.height,
      src: canvas.toDataURL("image/jpeg", 0.92),
    });
  }
  await doc.destroy();
  return nextPages;
};
