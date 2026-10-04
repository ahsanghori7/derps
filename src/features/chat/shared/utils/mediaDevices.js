export const MIC_INPUT_THRESHOLD = 8;

/** @typedef {'unknown' | 'ready' | 'none' | 'denied' | 'unavailable' | 'disconnected'} DeviceStatus */

export const DEVICE_STATUS = {
    UNKNOWN: 'unknown',
    READY: 'ready',
    NONE: 'none',
    DENIED: 'denied',
    UNAVAILABLE: 'unavailable',
    DISCONNECTED: 'disconnected',
};

export const getAudioInputDevices = async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
};

export const getVideoInputDevices = async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput');
};

export const stopMediaStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
};

/**
 * Browser requires at least one media type in getUserMedia constraints.
 */
export const resolveMediaConstraints = (audioEnabled, videoEnabled) => {
    const finalAudioEnabled = audioEnabled || (!audioEnabled && !videoEnabled);
    const finalVideoEnabled = videoEnabled;
    const constraints = {
        video: finalVideoEnabled
            ? { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
        audio: finalAudioEnabled,
    };
    return { finalAudioEnabled, finalVideoEnabled, constraints };
};

export const buildPermissionErrorLabel = (wantsAudio, wantsVideo) => {
    const parts = [];
    if (wantsVideo) parts.push('camera');
    if (wantsAudio) parts.push('microphone');
    return parts.join(' and ');
};

export const permissionPartForKind = (kind) => (kind === 'audio' ? 'microphone' : 'camera');

export const mergePermissionError = (prev, part) => {
    if (!part) return prev || null;
    const parts = new Set((prev || '').split(' and ').filter(Boolean));
    parts.add(part);
    if (parts.has('camera') && parts.has('microphone')) return 'camera and microphone';
    if (parts.has('microphone')) return 'microphone';
    if (parts.has('camera')) return 'camera';
    return null;
};

export const removePermissionErrorPart = (prev, part) => {
    if (!prev || !part) return prev || null;
    const remaining = prev.split(' and ').filter((p) => p !== part);
    return remaining.length ? remaining.join(' and ') : null;
};

/**
 * @param {'audio' | 'video'} kind
 * @returns {Promise<'granted' | 'denied' | 'prompt' | null>}
 */
export const queryMediaPermissionState = async (kind) => {
    if (!navigator?.permissions?.query) return null;
    const name = kind === 'audio' ? 'microphone' : 'camera';
    try {
        const result = await navigator.permissions.query({ name });
        return result.state;
    } catch {
        return null;
    }
};

/**
 * Distinguish permission revocation from a physical unplug when a track ends.
 * @param {'audio' | 'video'} kind
 */
export const resolveTrackEndStatus = async (kind) => {
    const permState = await queryMediaPermissionState(kind);
    if (permState === 'denied') {
        return {
            status: DEVICE_STATUS.DENIED,
            permissionPart: permissionPartForKind(kind),
        };
    }
    return {
        status: DEVICE_STATUS.DISCONNECTED,
        permissionPart: null,
    };
};

const isPermissionDeniedError = (error) =>
    error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';

const isNotFoundError = (error) => error?.name === 'NotFoundError';

const isUnreadableError = (error) => error?.name === 'NotReadableError';

/**
 * Map getUserMedia / media errors to structured device status for UI.
 * @param {DOMException | Error} error
 * @param {{ wantsAudio: boolean, wantsVideo: boolean }} options
 */
export const mapMediaError = (error, { wantsAudio, wantsVideo }) => {
    const result = {
        isMediaError: false,
        permissionError: null,
        micStatus: DEVICE_STATUS.UNKNOWN,
        cameraStatus: DEVICE_STATUS.UNKNOWN,
        userMessage: error?.message || 'Error accessing media devices',
    };

    if (!error?.name) return result;

    result.isMediaError = [
        'NotAllowedError',
        'PermissionDeniedError',
        'NotFoundError',
        'NotReadableError',
        'AbortError',
        'SecurityError',
    ].includes(error.name);

    if (isPermissionDeniedError(error)) {
        result.permissionError = buildPermissionErrorLabel(wantsAudio, wantsVideo);
        if (wantsAudio) result.micStatus = DEVICE_STATUS.DENIED;
        if (wantsVideo) result.cameraStatus = DEVICE_STATUS.DENIED;
        result.userMessage = `Permission denied to access your ${result.permissionError}. Please allow access and try again.`;
        return result;
    }

    if (isNotFoundError(error)) {
        if (wantsAudio) result.micStatus = DEVICE_STATUS.NONE;
        if (wantsVideo) result.cameraStatus = DEVICE_STATUS.NONE;
        result.userMessage = wantsAudio && wantsVideo
            ? 'No camera or microphone was found on this device.'
            : wantsVideo
                ? 'No camera was found on this device.'
                : 'No microphone was found on this device.';
        return result;
    }

    if (isUnreadableError(error)) {
        if (wantsAudio) result.micStatus = DEVICE_STATUS.UNAVAILABLE;
        if (wantsVideo) result.cameraStatus = DEVICE_STATUS.UNAVAILABLE;
        result.userMessage = wantsAudio && wantsVideo
            ? 'Your camera or microphone could not be accessed. They may be in use by another app or disconnected.'
            : wantsVideo
                ? 'Your camera could not be accessed. It may be in use by another app or disconnected.'
                : 'Your microphone could not be accessed. It may be in use by another app or disconnected.';
        return result;
    }

    if (wantsAudio) result.micStatus = DEVICE_STATUS.UNAVAILABLE;
    if (wantsVideo) result.cameraStatus = DEVICE_STATUS.UNAVAILABLE;
    result.userMessage = error.message || 'Error accessing media devices';
    return result;
};
