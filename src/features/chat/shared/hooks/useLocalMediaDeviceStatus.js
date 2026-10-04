import { useState, useEffect, useRef, useCallback } from 'react';
import {
    DEVICE_STATUS,
    MIC_INPUT_THRESHOLD,
    getAudioInputDevices,
    getVideoInputDevices,
    mapMediaError,
    mergePermissionError,
    removePermissionErrorPart,
    resolveTrackEndStatus,
    queryMediaPermissionState,
} from '../utils/mediaDevices';

/**
 * Monitors local mic/camera health for pre-join and in-call UIs.
 * Pass the active MediaStream from the caller (PreJoin or VideoCall context).
 */
export const useLocalMediaDeviceStatus = ({
    stream = null,
    audioEnabled = false,
    videoEnabled = false,
    enableMicLevel = false,
}) => {
    const [micStatus, setMicStatus] = useState(DEVICE_STATUS.UNKNOWN);
    const [cameraStatus, setCameraStatus] = useState(DEVICE_STATUS.UNKNOWN);
    const [permissionError, setPermissionError] = useState(null);
    const [micLabel, setMicLabel] = useState('');
    const [cameraLabel, setCameraLabel] = useState('');
    const [micLevel, setMicLevel] = useState(0);
    const [micInputDetected, setMicInputDetected] = useState(false);

    const isMountedRef = useRef(true);
    const micStatusRef = useRef(micStatus);
    const cameraStatusRef = useRef(cameraStatus);
    const streamRef = useRef(stream);
    const audioEnabledRef = useRef(audioEnabled);
    const videoEnabledRef = useRef(videoEnabled);

    useEffect(() => {
        streamRef.current = stream;
    }, [stream]);

    useEffect(() => {
        audioEnabledRef.current = audioEnabled;
    }, [audioEnabled]);

    useEffect(() => {
        videoEnabledRef.current = videoEnabled;
    }, [videoEnabled]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        micStatusRef.current = micStatus;
    }, [micStatus]);

    useEffect(() => {
        cameraStatusRef.current = cameraStatus;
    }, [cameraStatus]);

    const reportMediaError = useCallback((error, { wantsAudio, wantsVideo }) => {
        const mapped = mapMediaError(error, { wantsAudio, wantsVideo });
        setPermissionError(mapped.permissionError);
        if (wantsAudio && mapped.micStatus !== DEVICE_STATUS.UNKNOWN) {
            setMicStatus(mapped.micStatus);
        }
        if (wantsVideo && mapped.cameraStatus !== DEVICE_STATUS.UNKNOWN) {
            setCameraStatus(mapped.cameraStatus);
        }
        return mapped;
    }, []);

    const applyTrackStatus = useCallback(async (kind, track) => {
        const enabled = kind === 'audio' ? audioEnabledRef.current : videoEnabledRef.current;
        const setStatus = kind === 'audio' ? setMicStatus : setCameraStatus;
        const setLabel = kind === 'audio' ? setMicLabel : setCameraLabel;
        const permissionPart = kind === 'audio' ? 'microphone' : 'camera';

        if (!enabled) return;

        if (!track) return;

        if (track.readyState === 'live') {
            setPermissionError((prev) => removePermissionErrorPart(prev, permissionPart));
            setStatus(DEVICE_STATUS.READY);
            setLabel(track.label || (kind === 'audio' ? 'Microphone' : 'Camera'));
            return;
        }

        if (track.readyState !== 'ended') return;

        const { status, permissionPart: deniedPart } = await resolveTrackEndStatus(kind);
        if (!isMountedRef.current) return;

        setStatus(status);
        setLabel(track.label || (kind === 'audio' ? 'Microphone' : 'Camera'));
        if (deniedPart) {
            setPermissionError((prev) => mergePermissionError(prev, deniedPart));
        }
    }, []);

    const syncStatusFromStream = useCallback(async () => {
        const activeStream = streamRef.current;
        if (!activeStream) return;

        await Promise.all([
            audioEnabledRef.current
                ? applyTrackStatus('audio', activeStream.getAudioTracks()[0])
                : Promise.resolve(),
            videoEnabledRef.current
                ? applyTrackStatus('video', activeStream.getVideoTracks()[0])
                : Promise.resolve(),
        ]);
    }, [applyTrackStatus]);

    const refreshEnumeratedDevices = useCallback(async () => {
        try {
            const [mics, cameras] = await Promise.all([
                getAudioInputDevices(),
                getVideoInputDevices(),
            ]);
            if (!isMountedRef.current) return;

            const activeStream = streamRef.current;
            const hasLiveAudio = activeStream?.getAudioTracks?.()?.some(
                (track) => track.readyState === 'live'
            );
            const hasLiveVideo = activeStream?.getVideoTracks?.()?.some(
                (track) => track.readyState === 'live'
            );

            if (hasLiveVideo && videoEnabledRef.current) {
                setCameraStatus(DEVICE_STATUS.READY);
            }
            if (hasLiveAudio && audioEnabledRef.current) {
                setMicStatus(DEVICE_STATUS.READY);
            }

            const [micPerm, cameraPerm] = await Promise.all([
                queryMediaPermissionState('audio'),
                queryMediaPermissionState('video'),
            ]);
            if (!isMountedRef.current) return;

            if (
                audioEnabledRef.current
                && micPerm === 'denied'
                && !hasLiveAudio
            ) {
                setMicStatus(DEVICE_STATUS.DENIED);
                setPermissionError((prev) => mergePermissionError(prev, 'microphone'));
            }
            if (
                videoEnabledRef.current
                && cameraPerm === 'denied'
                && !hasLiveVideo
            ) {
                setCameraStatus(DEVICE_STATUS.DENIED);
                setPermissionError((prev) => mergePermissionError(prev, 'camera'));
            }

            if (
                audioEnabledRef.current
                && mics.length === 0
                && !hasLiveAudio
                && micPerm !== 'denied'
                && micStatusRef.current !== DEVICE_STATUS.DENIED
            ) {
                setMicStatus(DEVICE_STATUS.NONE);
            }
            if (
                videoEnabledRef.current
                && cameras.length === 0
                && !hasLiveVideo
                && cameraPerm !== 'denied'
                && cameraStatusRef.current !== DEVICE_STATUS.DENIED
            ) {
                setCameraStatus(DEVICE_STATUS.NONE);
            }
        } catch {
            // ignore enumeration errors
        }
    }, []);

    const refreshDeviceHealth = useCallback(async () => {
        await syncStatusFromStream();
        await refreshEnumeratedDevices();
    }, [syncStatusFromStream, refreshEnumeratedDevices]);

    useEffect(() => {
        if (!audioEnabled) {
            setMicStatus(DEVICE_STATUS.UNKNOWN);
            setMicLabel('');
            setMicLevel(0);
            setMicInputDetected(false);
            setPermissionError((prev) => removePermissionErrorPart(prev, 'microphone'));
            return undefined;
        }

        const audioTrack = stream?.getAudioTracks?.()?.[0];
        if (!audioTrack) return undefined;

        const handleEnded = () => {
            applyTrackStatus('audio', audioTrack);
        };

        applyTrackStatus('audio', audioTrack);
        audioTrack.addEventListener('ended', handleEnded);
        return () => {
            audioTrack.removeEventListener('ended', handleEnded);
        };
    }, [stream, audioEnabled, applyTrackStatus]);

    useEffect(() => {
        if (!videoEnabled) {
            setCameraStatus(DEVICE_STATUS.UNKNOWN);
            setCameraLabel('');
            setPermissionError((prev) => removePermissionErrorPart(prev, 'camera'));
            return undefined;
        }

        const videoTrack = stream?.getVideoTracks?.()?.[0];
        if (!videoTrack) return undefined;

        const handleEnded = () => {
            applyTrackStatus('video', videoTrack);
        };

        applyTrackStatus('video', videoTrack);
        videoTrack.addEventListener('ended', handleEnded);
        return () => {
            videoTrack.removeEventListener('ended', handleEnded);
        };
    }, [stream, videoEnabled, applyTrackStatus]);

    useEffect(() => {
        refreshDeviceHealth();
        const mediaDevices = navigator.mediaDevices;
        if (!mediaDevices?.addEventListener) return undefined;

        mediaDevices.addEventListener('devicechange', refreshDeviceHealth);
        return () => {
            mediaDevices.removeEventListener('devicechange', refreshDeviceHealth);
        };
    }, [refreshDeviceHealth]);

    useEffect(() => {
        if (!navigator?.permissions?.query) return undefined;

        let micPermission;
        let cameraPermission;
        let cancelled = false;

        const attachPermissionListener = (permissionStatus) => {
            if (!permissionStatus) return;
            permissionStatus.onchange = () => {
                if (!cancelled) refreshDeviceHealth();
            };
        };

        (async () => {
            try {
                [micPermission, cameraPermission] = await Promise.all([
                    navigator.permissions.query({ name: 'microphone' }),
                    navigator.permissions.query({ name: 'camera' }),
                ]);
                if (cancelled) return;
                attachPermissionListener(micPermission);
                attachPermissionListener(cameraPermission);
                refreshDeviceHealth();
            } catch {
                // Permissions API unsupported for these names
            }
        })();

        return () => {
            cancelled = true;
            if (micPermission) micPermission.onchange = null;
            if (cameraPermission) cameraPermission.onchange = null;
        };
    }, [refreshDeviceHealth]);

    useEffect(() => {
        if (!enableMicLevel || !audioEnabled || !stream) {
            setMicLevel(0);
            return undefined;
        }

        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled || audioTrack.readyState !== 'live') {
            setMicLevel(0);
            return undefined;
        }

        let rafId = null;
        let audioContext = null;
        let source = null;

        const startAnalyser = async () => {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;

                audioContext = new AudioContextClass();
                await audioContext.resume();
                source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                source.connect(analyser);

                const data = new Uint8Array(analyser.frequencyBinCount);

                const tick = () => {
                    analyser.getByteFrequencyData(data);
                    const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
                    const level = Math.min(100, (avg / 128) * 100);

                    if (isMountedRef.current) {
                        setMicLevel(level);
                        if (level > MIC_INPUT_THRESHOLD) {
                            setMicInputDetected(true);
                        }
                    }
                    rafId = requestAnimationFrame(tick);
                };
                tick();
            } catch {
                // analyser is optional
            }
        };

        startAnalyser();

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            source?.disconnect();
            if (audioContext?.state !== 'closed') {
                audioContext?.close?.();
            }
        };
    }, [enableMicLevel, audioEnabled, stream]);

    const clearMicInputDetected = useCallback(() => {
        setMicInputDetected(false);
        setMicLevel(0);
    }, []);

    const clearMediaErrors = useCallback(() => {
        setPermissionError(null);
    }, []);

    return {
        micStatus,
        cameraStatus,
        permissionError,
        micLabel,
        cameraLabel,
        micLevel,
        micInputDetected,
        reportMediaError,
        refreshEnumeratedDevices: refreshDeviceHealth,
        clearMicInputDetected,
        clearMediaErrors,
    };
};
