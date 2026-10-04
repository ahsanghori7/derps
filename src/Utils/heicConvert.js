import { fetchFileBlob } from './fileDownload';
import { loadHeic2Any } from './cdnLibs';

const HEIC_EXT = /\.(heic|heif)$/i;
const HEIC_MIME = /image\/(heic|heif)/i;
const HEIC_FTYP = /ftyp(heic|heif|mif1|msf1|heim|heis|heix|hevc)/i;

/** iOS (any browser) + macOS Safari can decode HEIC in <img>; Chrome/Android cannot. */
export const browserSupportsHeicInImg = () => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIOS =
        /iPad|iPhone|iPod/.test(ua)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) return true;
    const isMacSafari =
        /Macintosh/.test(ua)
        && /Safari/.test(ua)
        && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
    return isMacSafari;
};

export const isHeicLike = (fileOrUrl) => {
    if (!fileOrUrl) return false;
    if (typeof fileOrUrl === 'string') {
        try {
            const path = fileOrUrl.startsWith('blob:') || fileOrUrl.startsWith('data:')
                ? fileOrUrl
                : new URL(fileOrUrl, window.location.origin).pathname;
            return HEIC_EXT.test(path) || HEIC_EXT.test(fileOrUrl);
        } catch {
            return HEIC_EXT.test(fileOrUrl);
        }
    }
    const name = fileOrUrl.name || '';
    const type = fileOrUrl.type || '';
    return HEIC_MIME.test(type) || HEIC_EXT.test(name);
};

/** Sniff HEIC when MIME/extension are missing (common on some mobile pickers). */
export const sniffHeicBlob = async (blob) => {
    if (!blob || typeof blob.slice !== 'function') return false;
    try {
        const buf = await blob.slice(0, 24).arrayBuffer();
        const bytes = new Uint8Array(buf);
        let ascii = '';
        for (let i = 0; i < bytes.length; i += 1) ascii += String.fromCharCode(bytes[i]);
        return HEIC_FTYP.test(ascii);
    } catch {
        return false;
    }
};

export const isImageFile = (file) => {
    if (!file) return false;
    if (file.type?.startsWith('image/')) return true;
    // Empty MIME + HEIC/JPEG extension (iOS sometimes omits type)
    if (!file.type && /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(file.name || '')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(file.name || '');
};

const jpegFileFromBlob = (jpegBlob, input, fallbackName) => {
    const baseName = (input instanceof File && input.name)
        ? input.name.replace(HEIC_EXT, '.jpg')
        : String(fallbackName || 'photo.jpg').replace(HEIC_EXT, '.jpg');
    const name = /\.jpe?g$/i.test(baseName) ? baseName : `${baseName.replace(/\.[^.]+$/, '')}.jpg`;
    return new File([jpegBlob], name, { type: 'image/jpeg' });
};

/** Convert HEIC/HEIF Blob/File to a JPEG File browsers can display. */
export const convertHeicToJpegFile = async (input, fallbackName = 'photo.jpg') => {
    const blob = input instanceof Blob ? input : null;
    if (!blob) throw new Error('Invalid HEIC input');

    const heic2any = await loadHeic2Any();
    const converted = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.85,
    });
    const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
    if (!jpegBlob || !jpegBlob.size) throw new Error('HEIC conversion returned empty result');
    return jpegFileFromBlob(jpegBlob, input, fallbackName);
};

/**
 * If the file is HEIC/HEIF, convert to JPEG when the browser cannot show HEIC natively.
 * On iOS/Safari, keep the original file and object URL (native decode).
 * Returns { file, previewUrl }.
 */
export const prepareImageForPreview = async (file) => {
    if (!file) return null;

    let heic = isHeicLike(file);
    if (!heic && (!file.type || file.type === 'application/octet-stream')) {
        heic = await sniffHeicBlob(file);
    }

    if (!heic) {
        return { file, previewUrl: URL.createObjectURL(file) };
    }

    // Apple WebKit can paint HEIC in <img> — avoid heic2any (often broken on mobile Safari).
    if (browserSupportsHeicInImg()) {
        return { file, previewUrl: URL.createObjectURL(file) };
    }

    try {
        const jpeg = await convertHeicToJpegFile(file);
        return { file: jpeg, previewUrl: URL.createObjectURL(jpeg) };
    } catch (err) {
        // Last resort: still expose a preview URL (may work on some WebViews).
        console.warn('HEIC convert failed, using original file for preview', err);
        return { file, previewUrl: URL.createObjectURL(file) };
    }
};

/**
 * Resolve a displayable URL for img tags.
 * On HEIC-capable browsers, return the original URL; otherwise convert to JPEG blob URL.
 */
export const resolveDisplayableImageSrc = async (src, accessToken) => {
    if (!src || typeof src !== 'string') return src;
    if (src.startsWith('data:')) return src;
    if (!isHeicLike(src)) return src;

    if (browserSupportsHeicInImg()) return src;

    try {
        const blob = src.startsWith('blob:')
            ? await fetch(src).then((r) => r.blob())
            : await fetchFileBlob(src, accessToken);
        const jpeg = await convertHeicToJpegFile(blob, fileNameFromHeicUrl(src));
        return URL.createObjectURL(jpeg);
    } catch (err) {
        console.warn('HEIC resolve failed, falling back to original src', err);
        return src;
    }
};

const fileNameFromHeicUrl = (src) => {
    try {
        const base = decodeURIComponent(new URL(src, window.location.origin).pathname.split('/').pop() || '');
        if (base) return base.replace(HEIC_EXT, '.jpg');
    } catch { /* ignore */ }
    return 'photo.jpg';
};
