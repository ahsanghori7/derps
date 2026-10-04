import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@contexts/SocketContext';
import { getDeviceType } from '../utils/deviceType';
import { notificationService } from '@features/notifications/utils/notificationService';
import { toast } from 'react-toastify';
import { mapMediaError } from '../utils/mediaDevices';
import { updateVideoRoom } from '@api/videoRoomApi';
import { getErrorMessage } from '@utils/errorHandler';
import { getProfilePictureUrl } from '@utils/profile';

let mediasoupModulePromise = null;
const createMediasoupDevice = async () => {
    if (!mediasoupModulePromise) {
        mediasoupModulePromise = import('mediasoup-client');
    }
    const { Device } = await mediasoupModulePromise;
    return new Device();
};

const readPeerProfilePicture = (peer) =>
    getProfilePictureUrl(peer) || getProfilePictureUrl(peer?.user) || null;

const resolveMediaAccessErrorMessage = (err, wantsAudio, wantsVideo) => {
    const mapped = mapMediaError(err, { wantsAudio, wantsVideo });
    return mapped.isMediaError
        ? mapped.userMessage
        : (err?.message || 'Error accessing media devices');
};

const hasRaisedHand = (map, userId) => {
    if (userId == null || !map) return false;
    if (map.has(userId)) return true;
    for (const key of map.keys()) {
        if (String(key) === String(userId)) return true;
    }
    return false;
};

export const useVideoCall = (roomId, withVideo = true, withAudio = true, currentUserId = null, currentUserName = null, roomData = null, recvOnly = false) => {
    const { socket, isConnected } = useSocket();
    const [, setDevice] = useState(null);
    const [sendTransport, setSendTransport] = useState(null);
    const [recvTransport, setRecvTransport] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [producers, setProducers] = useState({ audio: null, video: null, screen: null });
    const [consumers, setConsumers] = useState(new Map());
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const [isInRoom, setIsInRoom] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(withVideo);
    const [audioEnabled, setAudioEnabled] = useState(withAudio);
    const [screenShareEnabled, setScreenShareEnabled] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [remoteParticipantStates, setRemoteParticipantStates] = useState(new Map()); // userId -> { videoEnabled, audioEnabled }
    const [isHost, setIsHost] = useState(false);
    const [hostId, setHostId] = useState(null);
    const [isLobby, setIsLobby] = useState(false);
    const [joinRequestedList, setJoinRequestedList] = useState([]);
    /** When true, joiners skip host approval (open meeting). */
    const [isOpenCall, setIsOpenCall] = useState(() => !!roomData?.isOpenCall);
    const [isUpdatingOpenCall, setIsUpdatingOpenCall] = useState(false);
    const [mutedByHost, setMutedByHost] = useState(false);
    /** Server paused outbound video due to poor connectivity; audio stays active. */
    const [videoConnectivityDegraded, setVideoConnectivityDegraded] = useState(false);
    const [meetingEndedReason, setMeetingEndedReason] = useState(null); // ended | removed | null
    const [videoChatMessages, setVideoChatMessages] = useState([]);
    /** userId -> { userId, userName, peerId } for participants with hand raised */
    const [raisedHands, setRaisedHands] = useState(new Map());
    /** 'connected' | 'reconnecting' | 'failed' — SFU/socket session health while in a call */
    const [callConnectionStatus, setCallConnectionStatus] = useState('connected');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState(null);
    const [recordingStartedAt, setRecordingStartedAt] = useState(null);
    const [isTogglingRecording, setIsTogglingRecording] = useState(false);

    const producersRef = useRef({ audio: null, video: null, screen: null });
    const consumersRef = useRef(new Map());
    const remoteStreamsRef = useRef(new Map());
    const recvTransportRef = useRef(null);
    const isJoiningRef = useRef(false);
    const videoEnabledRef = useRef(videoEnabled);
    const screenStreamRef = useRef(null);
    const pendingJoinPrefsRef = useRef({ video: true, audio: true });
    const joinDeniedRef = useRef(false);
    const meetingEndedRef = useRef(false);
    /** After user leaves the lobby (cancel), block effect-driven auto join for this roomId until explicit join or room change. */
    const cancelledLobbyForRoomIdRef = useRef(null);
    const sendTransportRef = useRef(null);
    const localStreamRef = useRef(null);
    const lastPeerJoinSoundAtRef = useRef(0);
    const isHostRef = useRef(false);
    const participantsRef = useRef([]);
    const audioEnabledRef = useRef(withAudio);
    const deviceRef = useRef(null);
    const wasInCallRef = useRef(false);
    const isReconnectingRef = useRef(false);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectScheduleAttemptRef = useRef(0);
    const socketRef = useRef(null);
    const callConnectionStatusRef = useRef('connected');
    const ACK_TIMEOUT_MS = 15000;
    const RECONNECT_MAX_ATTEMPTS = 5;
    const RECONNECT_BASE_DELAY_MS = 1200;
    const RECONNECT_SOCKET_WAIT_MS = 15000;
    const RECONNECT_SCHEDULE_MAX = 20;
    const CONSUME_RETRY_DELAYS_MS = [400, 800, 1500, 2500, 4000, 6000, 9000];
    const POST_RECONNECT_CATCHUP_DELAYS_MS = [2000, 5000, 9000];
    /** How long a transport may sit in 'disconnected' before we treat it as failed and reconnect. */
    const TRANSPORT_DISCONNECT_GRACE_MS = 5000;
    /** How long a remote track may stay muted (no RTP arriving) before we re-consume it. */
    const TRACK_MUTE_RECOVERY_GRACE_MS = 4000;

    const pendingConsumeRetriesRef = useRef(new Map());
    const lastJoinExistingPeersRef = useRef([]);
    const postReconnectCatchupTimersRef = useRef([]);
    const roomIdRef = useRef(roomId);
    const scheduleConsumeRetryRef = useRef(null);
    const schedulePostReconnectConsumeCatchupRef = useRef(null);
    const applyResyncPeersPayloadRef = useRef(null);
    const refreshRoomPeersFromServerRef = useRef(null);
    const lastRoomPeersRefreshAtRef = useRef(0);
    const reconnectJoinPrefsRef = useRef({ video: true, audio: true });
    const raisedHandsRef = useRef(new Map());
    const joinRequestedListRef = useRef([]);

    useEffect(() => {
        joinRequestedListRef.current = joinRequestedList;
    }, [joinRequestedList]);

    // Seed open-call flag from room metadata (GET video-room) when the call starts.
    useEffect(() => {
        if (roomData && typeof roomData.isOpenCall === 'boolean') {
            setIsOpenCall(roomData.isOpenCall);
        }
    }, [roomId, roomData?.isOpenCall]);

    const applyHandRaisedState = useCallback((userId, raised, meta = {}) => {
        if (userId == null) return;
        setRaisedHands((prev) => {
            const next = new Map(prev);
            if (raised) {
                next.set(userId, {
                    userId,
                    userName: meta.userName ?? prev.get(userId)?.userName ?? '',
                    peerId: meta.peerId ?? prev.get(userId)?.peerId ?? null,
                });
            } else {
                next.delete(userId);
            }
            raisedHandsRef.current = next;
            return next;
        });
    }, []);

    const seedRaisedHandsFromPeers = useCallback((peers) => {
        setRaisedHands(() => {
            const next = new Map();
            (peers ?? []).forEach((peer) => {
                if (peer?.userId != null && peer.handRaised) {
                    next.set(peer.userId, {
                        userId: peer.userId,
                        userName: peer.userName || peer.username || '',
                        peerId: peer.peerId ?? null,
                    });
                }
            });
            raisedHandsRef.current = next;
            return next;
        });
    }, []);

    const clearPostReconnectCatchupTimers = () => {
        postReconnectCatchupTimersRef.current.forEach((id) => clearTimeout(id));
        postReconnectCatchupTimersRef.current = [];
    };

    const clearPendingConsumeRetries = () => {
        pendingConsumeRetriesRef.current.clear();
    };

    const isServerSessionError = (message) => {
        const msg = String(message || '').toLowerCase();
        return msg.includes('peer not found') || msg.includes('room not found') || msg.includes('transport not found');
    };

    const isFatalReconnectError = (message) => {
        const msg = String(message || '').toLowerCase();
        return msg.includes('room not found') || msg.includes('meeting has ended') || msg.includes('host denied');
    };

    const isRetryableConsumeError = (message) => {
        const msg = String(message || '').toLowerCase();
        if (!msg || isFatalReconnectError(message)) return false;
        if (isServerSessionError(message) && !msg.includes('producer not found')) return false;
        return (
            msg.includes('producer not found')
            || msg.includes('peer not found')
            || msg.includes('transport not found')
            || msg.includes('cannot consume')
            || msg.includes('not found')
            || msg.includes('invalid')
        );
    };

    const getRemoteStreamMapKey = (userId, screenShare = false) => {
        if (userId == null) return null;
        return screenShare ? `${String(userId)}-screen` : String(userId);
    };

    const isRecvTransportUsable = (transport) => {
        if (!transport) return false;
        try {
            if (transport.closed === true) return false;
            const state = transport.connectionState;
            return state !== 'closed' && state !== 'failed';
        } catch (_) {
            return false;
        }
    };

    const waitForRecvTransportReady = (transport, timeoutMs = 10000) => new Promise((resolve) => {
        if (!transport || transport.closed) {
            resolve(false);
            return;
        }
        if (transport.connectionState === 'connected') {
            resolve(true);
            return;
        }
        let settled = false;
        const done = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { transport.off('connectionstatechange', onState); } catch (_) { /* ignore */ }
            resolve(ok);
        };
        const onState = (state) => {
            reconnectLog('waitForRecvTransportReady:state', {
                transportId: transport.id,
                state,
            });
            if (state === 'connected') done(true);
            if (state === 'failed' || state === 'closed') done(false);
        };
        transport.on('connectionstatechange', onState);
        const timer = setTimeout(() => {
            done(transport.connectionState === 'connected');
        }, timeoutMs);
    });

    /** Structured reconnect logs — filter console with `[video][log]` */
    const reconnectLog = useCallback((step, details = {}) => {
        const payload = {
            step,
            roomId: roomIdRef.current ?? roomId ?? null,
            socketId: socketRef.current?.id ?? null,
            socketConnected: !!socketRef.current?.connected,
            wasInCall: wasInCallRef.current,
            isReconnecting: isReconnectingRef.current,
            callConnectionStatus: callConnectionStatusRef.current,
            reconnectAttempt: reconnectAttemptRef.current,
            reconnectScheduleAttempt: reconnectScheduleAttemptRef.current,
            videoEnabled: videoEnabledRef.current,
            audioEnabled: audioEnabledRef.current,
            ...details,
        };
        if (import.meta.env.DEV) {
            console.log('[video][log]', payload);
        }
    }, [roomId]);

    const summarizeMediaStream = (stream) => {
        if (!stream) return { hasStream: false };
        const tracks = stream.getTracks?.() ?? [];
        return {
            hasStream: true,
            trackCount: tracks.length,
            tracks: tracks.map((t) => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
                muted: t.muted,
                label: t.label?.slice?.(0, 40),
            })),
        };
    };

    const summarizeTransport = (transport, label) => {
        if (!transport) return { [label]: null };
        try {
            return {
                [label]: {
                    id: transport.id,
                    closed: transport.closed,
                    connectionState: transport.connectionState,
                },
            };
        } catch (e) {
            return { [label]: { error: e?.message } };
        }
    };

    const summarizeProducers = () => {
        const p = producersRef.current;
        const describe = (producer, kind) => {
            if (!producer) return null;
            try {
                return {
                    id: producer.id,
                    kind: producer.kind ?? kind,
                    paused: producer.paused,
                    closed: producer.closed,
                    track: producer.track
                        ? {
                            enabled: producer.track.enabled,
                            readyState: producer.track.readyState,
                            muted: producer.track.muted,
                        }
                        : null,
                };
            } catch (e) {
                return { error: e?.message };
            }
        };
        return {
            audio: describe(p.audio, 'audio'),
            video: describe(p.video, 'video'),
            screen: describe(p.screen, 'video'),
        };
    };

    const summarizeConsumers = () => {
        const list = Array.from(consumersRef.current.values()).map((c) => ({
            id: c?.id,
            producerId: c?.producerId,
            peerId: c?.peerId,
            userId: c?.userId,
            kind: c?.kind,
            paused: c?.paused,
            closed: c?.closed,
        }));
        return { count: list.length, consumers: list };
    };

    // Virtual background (camera track processing)
    const [virtualBackground, setVirtualBackground] = useState({
        mode: 'none', // 'none' | 'blur' | 'color'
        blur: 8,
        color: '#2196f3' // gray-800
    });
    const virtualBgModuleRef = useRef(null);
    const rawCameraVideoTrackRef = useRef(null);
    const processedCameraVideoTrackRef = useRef(null);
    const virtualBgInputTrackRef = useRef(null); // cloned input track fed to processor
    const lastVirtualBgOptionsRef = useRef({ mode: 'none', blur: 8, color: '#2196f3' });
    const virtualBgInitPromiseRef = useRef(null);
    const virtualBgInitFailedAtRef = useRef(0);

    const createSolidColorDataUrl = (hexColor) => {
        try {
            const c = document.createElement('canvas');
            c.width = 16;
            c.height = 16;
            const ctx = c.getContext('2d');
            if (!ctx) return null;
            ctx.fillStyle = hexColor || '#000000';
            ctx.fillRect(0, 0, c.width, c.height);
            return c.toDataURL('image/png');
        } catch (_) {
            return null;
        }
    };

    const createSolidColorImageBitmap = async (hexColor) => {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = hexColor || '#000000';
        ctx.fillRect(0, 0, c.width, c.height);
        try {
            // createImageBitmap(canvas) is widely supported in Chromium; this path avoids the library's backgroundUrl
            // async loader that briefly falls back to DEFAULT_BG_COLOR between swaps.
            return await createImageBitmap(c);
        } catch (_) {
            return null;
        }
    };

    const loadVirtualBackgroundModule = useCallback(async () => {
        if (virtualBgModuleRef.current) return virtualBgModuleRef.current;
        const mod = await import('@vpalmisano/virtual-background');
        virtualBgModuleRef.current = mod;
        return mod;
    }, []);

    const ensureRawCameraVideoTrack = useCallback(async () => {
        const stream = localStreamRef.current;
        let raw = rawCameraVideoTrackRef.current || stream?.getVideoTracks?.()?.[0] || null;
        if (raw && raw.readyState === 'live') return raw;

        // Raw track ended (or missing): reacquire camera track so we can revert safely.
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false
            });
            const nextRaw = videoStream.getVideoTracks()[0] || null;
            if (!nextRaw) return raw;
            // Stop any extra tracks from the helper stream besides the video track we keep.
            videoStream.getTracks().forEach(t => {
                if (t !== nextRaw) {
                    try { t.stop(); } catch (_) { /* ignore */ }
                }
            });
            rawCameraVideoTrackRef.current = nextRaw;
            return nextRaw;
        } catch (e) {
            // toast.error('Failed to reacquire camera track', e);
            console.error('Failed to reacquire camera track:', e);
            return raw;
        }
    }, []);

    const applyVirtualBackground = useCallback(async (next = {}) => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const raw = await ensureRawCameraVideoTrack();
        if (!raw) return;

        const merged = {
            mode: next.mode ?? virtualBackground.mode,
            blur: typeof next.blur === 'number' ? next.blur : virtualBackground.blur,
            color: typeof next.color === 'string' ? next.color : virtualBackground.color
        };

        // Persist state for UI immediately.
        setVirtualBackground(merged);
        lastVirtualBgOptionsRef.current = merged;

        // If user chose "none", revert to raw track.
        if (merged.mode === 'none') {
            const processed = processedCameraVideoTrackRef.current;
            const inputClone = virtualBgInputTrackRef.current;
            if (processed && processed !== raw) {
                try {
                    stream.removeTrack(processed);
                } catch (_) { /* ignore */ }
            }
            const currentVideo = stream.getVideoTracks()[0];
            if (currentVideo && currentVideo !== raw) {
                try {
                    stream.removeTrack(currentVideo);
                } catch (_) { /* ignore */ }
            }
            if (!stream.getVideoTracks().includes(raw)) {
                try {
                    stream.addTrack(raw);
                } catch (_) { /* ignore */ }
            }
            const videoProducer = producersRef.current.video;
            if (videoProducer && typeof videoProducer.replaceTrack === 'function') {
                try {
                    await videoProducer.replaceTrack({ track: raw });
                } catch (e) {
                    // toast.error('Failed to replace producer track (revert raw)', e);
                    console.error('Failed to replace producer track (revert raw):', e);
                }
            }
            // Stop processed and cloned input (never stop the real raw camera track here).
            if (processed && processed !== raw) try { processed.stop(); } catch (_) { /* ignore */ }
            if (inputClone) try { inputClone.stop(); } catch (_) { /* ignore */ }
            processedCameraVideoTrackRef.current = null;
            virtualBgInputTrackRef.current = null;
            return;
        }

        // Ensure module is loaded and options are applied. If we already have a processed track,
        // updating options is enough (no need to recreate the track).
        let mod;
        try {
            mod = await loadVirtualBackgroundModule();
        } catch (e) {
            // toast.error('Failed to load virtual background module', e);
            console.error('Failed to load virtual background module:', e);
            return;
        }

        const VirtualBackground = mod?.VirtualBackground ?? mod?.default ?? mod;
        if (!VirtualBackground || typeof VirtualBackground.processVideoTrack !== 'function') {
            // toast.error('VirtualBackground export not found or invalid');
            console.error('VirtualBackground export not found or invalid');
            return;
        }

        try {
            // Apply live options (library reads from VirtualBackground.options)
            if (VirtualBackground.options) {
                // IMPORTANT:
                // In SPA routes like `/join`, relative URLs resolve under that path.
                // The library's default wasm path can become `.../join/mediapipe/...` and 404 in Vite dev.
                // Clearing these forces the library to fall back to its CDN loader paths.
                if ('wasmLoaderPath' in VirtualBackground.options) VirtualBackground.options.wasmLoaderPath = undefined;
                if ('wasmBinaryPath' in VirtualBackground.options) VirtualBackground.options.wasmBinaryPath = undefined;
                if ('modelPath' in VirtualBackground.options) VirtualBackground.options.modelPath = undefined;

                VirtualBackground.options.blur = merged.mode === 'blur' ? Math.max(0, merged.blur || 0) : 0;
                // Background blur (the "virtual background blur" effect) is controlled by bgBlur/bgBlurRadius.
                if ('bgBlur' in VirtualBackground.options) {
                    VirtualBackground.options.bgBlur = merged.mode === 'blur' ? Math.max(0, merged.blur || 0) : 0;
                }
                if ('bgBlurRadius' in VirtualBackground.options) {
                    // Library default is 30; keep it stable and just vary intensity.
                    VirtualBackground.options.bgBlurRadius = 30;
                }
                if (merged.mode === 'color') {
                    // Avoid the "flash" to DEFAULT_BG_COLOR by setting backgroundSource directly (no async backgroundUrl load).
                    const bmp = await createSolidColorImageBitmap(merged.color);
                    if (bmp && 'backgroundSource' in VirtualBackground.options) {
                        VirtualBackground.options.backgroundSource = {
                            type: 'image',
                            media: bmp,
                            url: `color:${merged.color}`,
                        };
                    } else if ('backgroundUrl' in VirtualBackground.options) {
                        // Fallback to backgroundUrl if ImageBitmap is unavailable.
                        const url = createSolidColorDataUrl(merged.color);
                        if (url) VirtualBackground.options.backgroundUrl = url;
                    }
                } else {
                    // Ensure we are not keeping an old background when switching away from color mode.
                    if ('backgroundSource' in VirtualBackground.options) VirtualBackground.options.backgroundSource = undefined;
                    if ('backgroundUrl' in VirtualBackground.options) VirtualBackground.options.backgroundUrl = '';
                }
            }
        } catch (e) {
            // toast.error('Failed to set VirtualBackground.options', e);
            console.error('Failed to set VirtualBackground.options:', e);
        }

        // If we already swapped the track once, keep it and only update options.
        if (processedCameraVideoTrackRef.current) return;

        // Avoid repeatedly creating WebGL contexts when multiple UI events fire (slider, double-click, etc),
        // especially if initialization failed (e.g., wasm asset 404).
        if (virtualBgInitPromiseRef.current) {
            try {
                await virtualBgInitPromiseRef.current;
            } catch (_) { /* ignore */ }
            return;
        }
        const lastFailedAt = Number(virtualBgInitFailedAtRef.current || 0);
        if (Date.now() - lastFailedAt < 1500) return;

        let newTrack;
        // Feed the processor a clone so any internal stop/cleanup won't end our actual camera track.
        const processorInput = raw.clone();
        virtualBgInputTrackRef.current = processorInput;
        virtualBgInitPromiseRef.current = (async () => {
            try {
                newTrack = await VirtualBackground.processVideoTrack(processorInput);
            } catch (e) {
                virtualBgInitFailedAtRef.current = Date.now();
                throw e;
            }
        })();
        try {
            await virtualBgInitPromiseRef.current;
        } catch (e) {
            // toast.error('processVideoTrack failed', e);
            console.error('processVideoTrack failed:', e);
            try { processorInput.stop(); } catch (_) { /* ignore */ }
            virtualBgInputTrackRef.current = null;
            virtualBgInitPromiseRef.current = null;
            return;
        } finally {
            virtualBgInitPromiseRef.current = null;
        }
        if (!newTrack) return;

        rawCameraVideoTrackRef.current = raw;
        processedCameraVideoTrackRef.current = newTrack;

        // Replace the video track inside the local stream (for local preview)
        const currentVideo = stream.getVideoTracks()[0];
        if (currentVideo && currentVideo !== raw) {
            try { stream.removeTrack(currentVideo); } catch (_) { /* ignore */ }
        }
        if (stream.getVideoTracks().includes(raw)) {
            try { stream.removeTrack(raw); } catch (_) { /* ignore */ }
        }
        try { stream.addTrack(newTrack); } catch (_) { /* ignore */ }

        // Replace the track being sent to mediasoup (for remote participants)
        const videoProducer = producersRef.current.video;
        if (videoProducer && typeof videoProducer.replaceTrack === 'function') {
            try {
                await videoProducer.replaceTrack({ track: newTrack });
            } catch (e) {
                toast.warn(' Failed to apply virtual background. Please check your internet connection and try again.');
                console.error(' Failed to apply virtual background:', e);
            }
        }
    }, [ensureRawCameraVideoTrack, loadVirtualBackgroundModule, virtualBackground.mode, virtualBackground.blur, virtualBackground.color]);

    const emitWithAckTimeout = useCallback((eventName, payload, timeoutMs = ACK_TIMEOUT_MS) => {
        return new Promise((resolve, reject) => {
            const activeSocket = socketRef.current;
            if (!activeSocket?.connected) {
                reject(new Error(`Socket unavailable for ${eventName}`));
                return;
            }
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject(new Error(`${eventName} timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            const ack = (response) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (response?.error) reject(new Error(response.error));
                else resolve(response);
            };
            try {
                if (payload === undefined) activeSocket.emit(eventName, ack);
                else activeSocket.emit(eventName, payload, ack);
            } catch (e) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(e);
            }
        });
    }, []);

    const waitForActiveSocket = useCallback(async (maxWaitMs = RECONNECT_SOCKET_WAIT_MS) => {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            const activeSocket = socketRef.current;
            if (activeSocket?.connected) return activeSocket;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return null;
    }, []);

    const commitProducers = useCallback((patch) => {
        setProducers((prev) => {
            const next = { ...prev, ...patch };
            producersRef.current = next;
            return next;
        });
    }, []);

    const waitForTrackLive = useCallback(async (track, timeoutMs = 2000) => {
        if (!track || track.readyState === 'live') return;
        await new Promise((resolve) => {
            let resolved = false;
            const checkReady = () => {
                if (track.readyState === 'live') {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                } else {
                    setTimeout(checkReady, 50);
                }
            };
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, timeoutMs);
            checkReady();
        });
    }, []);

    const notifyServerMediaToggles = useCallback(async (videoOn, audioOn) => {
        reconnectLog('notifyServerMediaToggles:start', { videoOn: !!videoOn, audioOn: !!audioOn });
        if (!roomId || !socketRef.current?.connected) {
            reconnectLog('notifyServerMediaToggles:skipped', { reason: 'no room or socket' });
            return;
        }
        try {
            await emitWithAckTimeout('video:toggleVideo', { roomId, enabled: !!videoOn }, 8000);
            reconnectLog('notifyServerMediaToggles:videoOk', { enabled: !!videoOn });
        } catch (err) {
            reconnectLog('notifyServerMediaToggles:videoFailed', { error: err?.message || String(err) });
            console.warn('[video] toggleVideo sync failed', err?.message || err);
        }
        try {
            await emitWithAckTimeout('video:toggleAudio', { roomId, enabled: !!audioOn }, 8000);
            reconnectLog('notifyServerMediaToggles:audioOk', { enabled: !!audioOn });
        } catch (err) {
            reconnectLog('notifyServerMediaToggles:audioFailed', { error: err?.message || String(err) });
            console.warn('[video] toggleAudio sync failed', err?.message || err);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- emitWithAckTimeout is stable (empty deps)
    }, [roomId, reconnectLog]);

    // Update refs when state changes
    useEffect(() => {
        roomIdRef.current = roomId;
    }, [roomId]);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    useEffect(() => {
        callConnectionStatusRef.current = callConnectionStatus;
    }, [callConnectionStatus]);

    useEffect(() => {
        producersRef.current = producers;
        consumersRef.current = consumers;
        remoteStreamsRef.current = remoteStreams;
        recvTransportRef.current = recvTransport;
        videoEnabledRef.current = videoEnabled;
        audioEnabledRef.current = audioEnabled;
        screenStreamRef.current = screenStream;
        sendTransportRef.current = sendTransport;
        localStreamRef.current = localStream;
        isHostRef.current = isHost;
        participantsRef.current = participants;
        raisedHandsRef.current = raisedHands;
    }, [producers, consumers, remoteStreams, recvTransport, sendTransport, videoEnabled, audioEnabled, screenStream, localStream, isHost, participants, raisedHands]);

    /** Drop lobby entries for users who are already in the room (incl. self). */
    const filterStaleJoinRequests = useCallback((list, peers) => {
        const participantPeers = peers ?? participantsRef.current ?? [];
        const inRoomUserIds = new Set(
            participantPeers
                .map((p) => p?.userId)
                .filter((id) => id != null)
                .map((id) => String(id))
        );
        if (currentUserId != null) inRoomUserIds.add(String(currentUserId));
        return (Array.isArray(list) ? list : []).filter((req) => {
            if (req?.userId != null && inRoomUserIds.has(String(req.userId))) return false;
            return true;
        });
    }, [currentUserId]);

    const removeJoinRequestForPeer = useCallback((list, data) => {
        let next = Array.isArray(list) ? list : [];
        const socketId = data?.socketId;
        const userId = data?.userId;
        if (socketId != null) {
            next = next.filter((r) => r.socketId !== socketId);
        }
        if (userId != null) {
            next = next.filter((r) => String(r.userId) !== String(userId));
        }
        return next;
    }, []);

    useEffect(() => {
        if (!isHost) return;
        setJoinRequestedList((prev) => {
            const next = filterStaleJoinRequests(prev);
            return next.length === prev.length ? prev : next;
        });
    }, [participants, isHost, filterStaleJoinRequests]);

    /** Close mediasoup session without stopping camera/mic or leaving the call UI. */
    const teardownMediasoupSession = useCallback(() => {
        reconnectLog('teardownMediasoupSession', {
            producersBefore: summarizeProducers(),
            consumersBefore: summarizeConsumers(),
            ...summarizeTransport(sendTransportRef.current, 'sendTransport'),
            ...summarizeTransport(recvTransportRef.current, 'recvTransport'),
        });
        const currentProducers = producersRef.current;
        ['audio', 'video', 'screen'].forEach((key) => {
            try { currentProducers[key]?.close?.(); } catch (_) { /* ignore */ }
        });

        const screen = screenStreamRef.current;
        if (screen) {
            screen.getTracks().forEach((t) => {
                try { t.stop(); } catch (_) { /* ignore */ }
            });
        }

        const send = sendTransportRef.current;
        const recv = recvTransportRef.current;
        if (send) try { send.close(); } catch (_) { /* ignore */ }
        if (recv) try { recv.close(); } catch (_) { /* ignore */ }

        consumersRef.current.forEach((consumer) => {
            try { consumer.close?.(); } catch (_) { /* ignore */ }
        });

        setSendTransport(null);
        setRecvTransport(null);
        const emptyProducers = { audio: null, video: null, screen: null };
        producersRef.current = emptyProducers;
        setProducers(emptyProducers);
        setConsumers(new Map());
        consumersRef.current = new Map();
        setRemoteStreams(new Map());
        remoteStreamsRef.current = new Map();
        setScreenStream(null);
        setScreenShareEnabled(false);
        deviceRef.current = null;
        setDevice(null);
        clearPostReconnectCatchupTimers();
        clearPendingConsumeRetries();
        reconnectLog('teardownMediasoupSession:done', { localStream: summarizeMediaStream(localStreamRef.current) });
    }, [reconnectLog]);

    const removeVideoSocketHandlers = useCallback(() => {
        reconnectLog('removeVideoSocketHandlers');
        const activeSocket = socketRef.current;
        if (!activeSocket) return;
        activeSocket.off('video:peerJoined');
        activeSocket.off('video:peerLeft');
        activeSocket.off('video:newProducer');
        activeSocket.off('video:resyncPeers');
        activeSocket.off('video:screenShareStarted');
        activeSocket.off('video:screenShareStopped');
        activeSocket.off('video:videoToggled');
        activeSocket.off('video:connectivityDegraded');
        activeSocket.off('video:audioToggled');
        activeSocket.off('video:meetingEnded');
        activeSocket.off('video:removedByHost');
        activeSocket.off('video:mutedByHost');
        activeSocket.off('video:hostTransferred');
        activeSocket.off('video:joinRequested');
        activeSocket.off('video:joinRequestCancelled');
        activeSocket.off('video:chat:message');
        activeSocket.off('video:handRaised');
        activeSocket.off('video:handLowered');
        activeSocket.off('video:recordingStarted');
        activeSocket.off('video:recordingStopped');
        activeSocket.off('video:recordingError');
    }, []);

    const consumeExistingPeers = useCallback(async (deviceInstance, existingPeers, recvTransportInstance) => {
        reconnectLog('consumeExistingPeers:start', {
            peerCount: existingPeers?.length ?? 0,
            ...summarizeTransport(recvTransportInstance, 'recvTransport'),
            peers: (existingPeers ?? []).map((p) => ({
                peerId: p.peerId,
                userId: p.userId,
                videoEnabled: p.videoEnabled,
                audioEnabled: p.audioEnabled,
                producers: (p.producers ?? []).map((pr) => ({
                    id: pr.id,
                    kind: pr.kind,
                    screenShare: pr.appData?.source === 'screen',
                })),
            })),
        });
        if (!existingPeers?.length) {
            reconnectLog('consumeExistingPeers:skipped', { reason: 'no existing peers' });
            return;
        }

        await waitForRecvTransportReady(recvTransportInstance, 10000);

        const existingParticipants = existingPeers.map(peer => ({
            peerId: peer.peerId,
            userId: peer.userId,
            userName: peer.userName || peer.username || '',
            deviceType: peer.deviceType || 'desktop',
            profilePicture: readPeerProfilePicture(peer),
        }));
        setParticipants(existingParticipants);
        seedRaisedHandsFromPeers(existingPeers);

        for (const peer of existingPeers) {
            if (currentUserId != null && peer?.userId != null && String(peer.userId) === String(currentUserId)) {
                reconnectLog('consumeExistingPeers:skipSelf', { peerId: peer.peerId });
                continue;
            }
            setRemoteParticipantStates(prev => {
                const newMap = new Map(prev);
                newMap.set(peer.userId, {
                    videoEnabled: peer.videoEnabled,
                    audioEnabled: peer.audioEnabled
                });
                return newMap;
            });
            for (const producer of peer.producers || []) {
                reconnectLog('consumeExistingPeers:consume', {
                    peerId: peer.peerId,
                    userId: peer.userId,
                    producerId: producer.id,
                    kind: producer.kind,
                });
                await consumeProducer(deviceInstance, {
                    peerId: peer.peerId,
                    userId: peer.userId,
                    producerId: producer.id,
                    kind: producer.kind,
                    screenShare: producer.appData?.source === 'screen',
                }, recvTransportInstance);
                await new Promise((r) => setTimeout(r, 120));
            }
        }
        reconnectLog('consumeExistingPeers:done', {
            consumersAfter: summarizeConsumers(),
            remoteStreamKeys: Array.from(remoteStreamsRef.current.keys()),
        });
    // consumeProducer is a stable hook-scoped function defined below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reconnectLog]);

    const ensureLocalStreamForReconnect = useCallback(async (wantVideo, wantAudio) => {
        reconnectLog('ensureLocalStream:start', { wantVideo, wantAudio });
        let stream = localStreamRef.current;
        const videoTrack = stream?.getVideoTracks?.()?.[0];
        const audioTrack = stream?.getAudioTracks?.()?.[0];
        const videoLive = videoTrack?.readyState === 'live';
        const audioLive = audioTrack?.readyState === 'live';

        const needVideo = wantVideo && !videoLive;
        const needAudio = wantAudio && !audioLive;

        if (!needVideo && !needAudio && stream) {
            reconnectLog('ensureLocalStream:reuseExisting', summarizeMediaStream(stream));
            if (wantVideo && videoTrack && !videoTrack.enabled) videoTrack.enabled = true;
            if (wantAudio && audioTrack && !audioTrack.enabled) audioTrack.enabled = true;
            if (!wantVideo && videoTrack) videoTrack.enabled = false;
            if (!wantAudio && audioTrack) audioTrack.enabled = false;
            return stream;
        }

        const constraints = {
            audio: wantAudio || (!wantAudio && !wantVideo),
            video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        };
        reconnectLog('ensureLocalStream:getUserMedia', { constraints });
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (wantVideo) {
            rawCameraVideoTrackRef.current = newStream.getVideoTracks()[0] || null;
        }
        if (!wantAudio && newStream.getAudioTracks().length > 0) {
            newStream.getAudioTracks().forEach(t => { t.enabled = false; });
        }
        if (!wantVideo && newStream.getVideoTracks().length > 0) {
            newStream.getVideoTracks().forEach(t => { t.enabled = false; });
        }
        setLocalStream(newStream);
        reconnectLog('ensureLocalStream:gotNewStream', summarizeMediaStream(newStream));
        return newStream;
    }, [reconnectLog]);

    const reconnectToRoom = useCallback(async () => {
        reconnectLog('reconnectToRoom:enter', {
            isJoining: isJoiningRef.current,
            meetingEnded: meetingEndedRef.current,
        });
        if (!roomId || !wasInCallRef.current) {
            reconnectLog('reconnectToRoom:aborted', { reason: '!roomId || !wasInCall' });
            return;
        }
        if (isReconnectingRef.current || isJoiningRef.current) {
            reconnectLog('reconnectToRoom:aborted', { reason: 'already reconnecting or joining' });
            return;
        }
        if (meetingEndedRef.current) {
            reconnectLog('reconnectToRoom:aborted', { reason: 'meeting ended' });
            return;
        }

        const activeSocket = await waitForActiveSocket(RECONNECT_SOCKET_WAIT_MS);
        if (!activeSocket?.connected) {
            reconnectLog('reconnectToRoom:aborted', { reason: 'socket not ready after wait' });
            console.warn('[video] reconnect skipped: socket not ready');
            return;
        }

        isReconnectingRef.current = true;
        setCallConnectionStatus('reconnecting');
        setError(null);
        reconnectLog('reconnectToRoom:start', { producersBefore: summarizeProducers() });

        try {
            removeVideoSocketHandlers();
            teardownMediasoupSession();

            // Soft reconnect: do not leave the room — leaving drops other peers' view of us and
            // existingPeers on re-join often lists stale producer IDs from ghost sessions.
            reconnectLog('reconnectToRoom:video:leave:skipped', { reason: 'soft reconnect' });

            reconnectLog('reconnectToRoom:getRtpCapabilities');
            const rtpCapabilitiesResponse = await emitWithAckTimeout('video:getRtpCapabilities');
            const deviceInstance = await createMediasoupDevice();
            await deviceInstance.load({ routerRtpCapabilities: rtpCapabilitiesResponse.rtpCapabilities });
            deviceRef.current = deviceInstance;
            setDevice(deviceInstance);

            const joinVideo = !!videoEnabledRef.current;
            const joinAudio = !!audioEnabledRef.current;
            reconnectJoinPrefsRef.current = { video: joinVideo, audio: joinAudio };
            const deviceType = getDeviceType();
            const normalizedUserName = typeof currentUserName === 'string' ? currentUserName.trim() : '';
            const joinPayload = {
                roomId,
                videoRoomId: roomId,
                withVideo: joinVideo,
                withAudio: joinAudio,
                deviceType,
                ...(normalizedUserName ? { userName: normalizedUserName } : {})
            };
            reconnectLog('reconnectToRoom:video:join', { joinPayload });
            const joinResponse = await emitWithAckTimeout('video:join', joinPayload);
            reconnectLog('reconnectToRoom:video:join:ok', {
                isHost: joinResponse.isHost,
                hostId: joinResponse.hostId,
                existingPeerCount: joinResponse.existingPeers?.length ?? 0,
            });

            if (joinResponse.pending === true) {
                throw new Error('Reconnect requires host approval. Please leave and rejoin the meeting.');
            }

            setIsInRoom(true);
            wasInCallRef.current = true;
            if (joinResponse.isHost !== undefined) setIsHost(!!joinResponse.isHost);
            if (joinResponse.hostId != null) setHostId(joinResponse.hostId);
            if (joinResponse.isOpenCall !== undefined) setIsOpenCall(!!joinResponse.isOpenCall);
            if (joinResponse.recording) {
                setIsRecording(true);
                setRecordingId(joinResponse.recording.recordingId ?? null);
                setRecordingStartedAt(joinResponse.recording.startedAt ?? null);
            } else {
                setIsRecording(false);
                setRecordingId(null);
                setRecordingStartedAt(null);
            }

            reconnectLog('reconnectToRoom:createRecvTransport');
            const recvTransportInstance = await createRecvTransport(deviceInstance, roomId);

            if (recvOnly) {
                reconnectLog('reconnectToRoom:transportsCreated', {
                    ...summarizeTransport(recvTransportInstance, 'recvTransport'),
                });
                setupSocketHandlers(deviceInstance);
            } else {
                const stream = await ensureLocalStreamForReconnect(joinVideo, joinAudio);
                reconnectLog('reconnectToRoom:createSendTransport');
                const sendTransportInstance = await createSendTransport(deviceInstance, roomId);
                reconnectLog('reconnectToRoom:transportsCreated', {
                    ...summarizeTransport(sendTransportInstance, 'sendTransport'),
                    ...summarizeTransport(recvTransportInstance, 'recvTransport'),
                });

                // Handlers before publish so peer newProducer events are not missed.
                setupSocketHandlers(deviceInstance);

                reconnectLog('reconnectToRoom:publishLocalMedia', { joinAudio, joinVideo });
                await publishLocalMedia(deviceInstance, stream, sendTransportInstance, {
                    audio: joinAudio,
                    video: joinVideo
                });
                reconnectLog('reconnectToRoom:publishLocalMedia:done', { producersAfter: summarizeProducers() });

                await notifyServerMediaToggles(joinVideo, joinAudio);
            }

            lastJoinExistingPeersRef.current = joinResponse.existingPeers ?? [];
            await consumeExistingPeers(deviceInstance, joinResponse.existingPeers, recvTransportInstance);
            await refreshRoomPeersFromServerRef.current?.(deviceInstance);
            schedulePostReconnectConsumeCatchupRef.current?.(deviceInstance);

            // reconnectAttemptRef is intentionally NOT reset here: the post-reconnect catchup
            // below can still fail (stale server-side peer/transport state) and re-trigger
            // scheduleReconnect. It's only reset once that catchup window proves stable.
            reconnectScheduleAttemptRef.current = 0;
            setCallConnectionStatus('connected');
            reconnectLog('reconnectToRoom:success', {
                producers: summarizeProducers(),
                consumers: summarizeConsumers(),
                remoteStreamKeys: Array.from(remoteStreamsRef.current.keys()),
            });
            toast.success('Reconnected to the meeting', { autoClose: 2500 });
        } catch (err) {
            reconnectLog('reconnectToRoom:error', {
                error: err?.message || String(err),
                stack: err?.stack,
                fatal: isFatalReconnectError(err?.message),
                attempt: reconnectAttemptRef.current + 1,
            });
            console.warn('[video] reconnect failed', err);
            const errMsg = err?.message || String(err);
            if (isFatalReconnectError(errMsg)) {
                setCallConnectionStatus('failed');
                setError(errMsg.includes('room not found')
                    ? 'This meeting is no longer active on the server. Please leave and start or join a new meeting.'
                    : errMsg);
                toast.error('Could not restore the meeting session. Please leave and rejoin.', { autoClose: 6000 });
                isReconnectingRef.current = false;
                return;
            }
            reconnectAttemptRef.current += 1;
            if (reconnectAttemptRef.current < RECONNECT_MAX_ATTEMPTS) {
                const delay = RECONNECT_BASE_DELAY_MS * reconnectAttemptRef.current;
                reconnectLog('reconnectToRoom:retryScheduled', { delayMs: delay, attempt: reconnectAttemptRef.current });
                isReconnectingRef.current = false;
                if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(async () => {
                    reconnectTimerRef.current = null;
                    if (!wasInCallRef.current) return;
                    const ready = await waitForActiveSocket(RECONNECT_SOCKET_WAIT_MS);
                    if (ready?.connected) reconnectToRoom();
                    else scheduleReconnect();
                }, delay);
                return;
            }
            setCallConnectionStatus('failed');
            setError(err?.message || 'Could not reconnect to the meeting. Please leave and rejoin.');
            reconnectLog('reconnectToRoom:failedMaxAttempts');
            toast.error('Connection lost. Please leave the meeting and join again.', { autoClose: 5000 });
        } finally {
            isReconnectingRef.current = false;
            reconnectLog('reconnectToRoom:finally', { isReconnecting: false });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, currentUserName, teardownMediasoupSession, ensureLocalStreamForReconnect, consumeExistingPeers, waitForActiveSocket, removeVideoSocketHandlers, reconnectLog, recvOnly]);

    const scheduleReconnect = useCallback(() => {
        if (!wasInCallRef.current || !roomId) {
            reconnectLog('scheduleReconnect:skipped', { reason: '!wasInCall || !roomId' });
            return;
        }
        if (isReconnectingRef.current) {
            reconnectLog('scheduleReconnect:skipped', { reason: 'already reconnecting' });
            return;
        }
        reconnectAttemptRef.current += 1;
        if (reconnectAttemptRef.current >= RECONNECT_MAX_ATTEMPTS) {
            reconnectLog('scheduleReconnect:failedMaxAttempts', { attempt: reconnectAttemptRef.current });
            setCallConnectionStatus('failed');
            setError('Unable to restore the connection. Please leave and rejoin the meeting.');
            return;
        }
        reconnectLog('scheduleReconnect:timerSet', { delayMs: RECONNECT_BASE_DELAY_MS, attempt: reconnectAttemptRef.current });
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(async () => {
            reconnectTimerRef.current = null;
            if (!wasInCallRef.current) return;
            reconnectLog('scheduleReconnect:timerFired');
            const ready = await waitForActiveSocket(RECONNECT_SOCKET_WAIT_MS);
            if (ready?.connected) {
                reconnectScheduleAttemptRef.current = 0;
                reconnectToRoom();
                return;
            }
            reconnectScheduleAttemptRef.current += 1;
            reconnectLog('scheduleReconnect:socketNotReady', { scheduleAttempt: reconnectScheduleAttemptRef.current });
            if (reconnectScheduleAttemptRef.current < RECONNECT_SCHEDULE_MAX && callConnectionStatusRef.current !== 'failed') {
                scheduleReconnect();
                return;
            }
            setCallConnectionStatus('failed');
            setError('Unable to restore the connection. Please leave and rejoin the meeting.');
            reconnectLog('scheduleReconnect:failedMaxScheduleAttempts');
        }, RECONNECT_BASE_DELAY_MS);
    }, [roomId, reconnectToRoom, waitForActiveSocket, reconnectLog]);

    const retryReconnect = useCallback(() => {
        reconnectLog('retryReconnect:manual');
        reconnectAttemptRef.current = 0;
        reconnectScheduleAttemptRef.current = 0;
        setCallConnectionStatus('reconnecting');
        scheduleReconnect();
    }, [scheduleReconnect, reconnectLog]);

    const handleConnectionLost = useCallback(() => {
        reconnectLog('handleConnectionLost', {
            wasInCall: wasInCallRef.current,
            localStream: summarizeMediaStream(localStreamRef.current),
        });
        if (!wasInCallRef.current) return;
        setCallConnectionStatus('reconnecting');
        removeVideoSocketHandlers();
        teardownMediasoupSession();
    }, [teardownMediasoupSession, removeVideoSocketHandlers, reconnectLog]);

    const joinRoom = useCallback(async (preferredVideo = undefined, preferredAudio = undefined, options = {}) => {
        const fromAutoRetry = options.fromAutoRetry === true;
        // Use preferred args when starting a join (e.g. from PreJoin); otherwise use state (can be stale when hook was mounted with roomId=null)
        const joinVideo = preferredVideo !== undefined ? preferredVideo : videoEnabled;
        const joinAudio = preferredAudio !== undefined ? preferredAudio : audioEnabled;
        if (fromAutoRetry && roomId && cancelledLobbyForRoomIdRef.current === roomId) {
            return;
        }
        if (!fromAutoRetry) {
            cancelledLobbyForRoomIdRef.current = null;
        }

        joinDeniedRef.current = false;
        meetingEndedRef.current = false;
        
        // Prevent multiple simultaneous joins
        if (isJoiningRef.current || isInRoom || isConnecting) {
            return;
        }
        
        if (!socket || !isConnected || !roomId) {
            const errorMsg = `Socket not connected. socket: ${!!socket}, isConnected: ${isConnected}, roomId: ${roomId}`;
            toast.warn(' Connection not established. Please check your internet connection and try again.');
            console.error(' Connection not established:', errorMsg);
            // Only set error if socket doesn't exist or roomId is missing
            // If socket exists but not connected yet, don't show error (will retry automatically)
            if (!socket || !roomId) {
                setError(errorMsg);
            } else {
                // Socket exists but not connected yet - clear any previous error and wait
                setError(null);
            }
            return;
        }

        try {
            isJoiningRef.current = true;
            setIsConnecting(true);
            setError(null);
            setMeetingEndedReason(null);

            if (recvOnly) console.log(`[recorder] joinRoom:start roomId=${roomId}`);

            // Get RTP capabilities
            const rtpCapabilitiesResponse = await emitWithAckTimeout('video:getRtpCapabilities');
            if (recvOnly) console.log('[recorder] joinRoom:gotRtpCapabilities');

            // Initialize device
            const newDevice = await createMediasoupDevice();
            if (recvOnly) console.log('[recorder] joinRoom:deviceCreated');
            await newDevice.load({ routerRtpCapabilities: rtpCapabilitiesResponse.rtpCapabilities });
            if (recvOnly) console.log('[recorder] joinRoom:deviceLoaded');
            setDevice(newDevice);

            // Join room (use join preferences so PreJoin choices are respected)
            const deviceType = getDeviceType();
            const normalizedUserName = typeof currentUserName === 'string' ? currentUserName.trim() : '';
            const joinPayload = {
                roomId,
                videoRoomId: roomId,
                withVideo: joinVideo,
                withAudio: joinAudio,
                deviceType,
                ...(normalizedUserName ? { userName: normalizedUserName } : {})
            };
            if (recvOnly) console.log(`[recorder] joinRoom:emittingVideoJoin ${JSON.stringify(joinPayload)}`);
            const joinResponse = await emitWithAckTimeout('video:join', joinPayload);
            if (recvOnly) console.log(`[recorder] joinRoom:videoJoinAcked success=${joinResponse?.success} pending=${joinResponse?.pending} existingPeers=${joinResponse?.existingPeers?.length ?? 0} isRecorder=${joinResponse?.isRecorder}`);
            if (joinResponse.pending === true) {
                pendingJoinPrefsRef.current = { video: joinVideo, audio: joinAudio };
                setIsLobby(true);
                setIsConnecting(false);
                isJoiningRef.current = false;
                const onJoinApproved = (payload) => {
                    if (payload.roomId !== roomId) return;
                    socket.off('video:joinApproved', onJoinApproved);
                    socket.off('video:joinDenied', onJoinDenied);
                    completePostJoinFromApproval(payload);
                };
                const onJoinDenied = () => {
                    socket.off('video:joinApproved', onJoinApproved);
                    socket.off('video:joinDenied', onJoinDenied);
                    joinDeniedRef.current = true;
                    setError('Host denied your request');
                    setIsLobby(false);
                    setIsConnecting(false);
                    isJoiningRef.current = false;
                    socket.emit('video:leave', { roomId }, () => {});
                };
                socket.on('video:joinApproved', onJoinApproved);
                socket.on('video:joinDenied', onJoinDenied);
                return;
            }

            setIsInRoom(true);
            if (joinResponse.isHost !== undefined) setIsHost(!!joinResponse.isHost);
            if (joinResponse.hostId != null) setHostId(joinResponse.hostId);
            if (joinResponse.isOpenCall !== undefined) setIsOpenCall(!!joinResponse.isOpenCall);
            if (joinResponse.recording) {
                setIsRecording(true);
                setRecordingId(joinResponse.recording.recordingId ?? null);
                setRecordingStartedAt(joinResponse.recording.startedAt ?? null);
            } else {
                setIsRecording(false);
                setRecordingId(null);
                setRecordingStartedAt(null);
            }
            setVideoEnabled(joinVideo);
            setAudioEnabled(joinAudio);
            videoEnabledRef.current = joinVideo;

            let recvTransportInstance;

            if (recvOnly) {
                // Recorder/consume-only session: no local media, no send transport
                // (the backend rejects non-recv transports for recorder peers).
                console.log('[recorder] joinRoom:creatingRecvTransport');
                recvTransportInstance = await createRecvTransport(newDevice, roomId);
                console.log('[recorder] joinRoom:recvTransportCreated');
                reconnectJoinPrefsRef.current = { video: false, audio: false };
                setupSocketHandlers(newDevice);
                console.log('[recorder] joinRoom:socketHandlersReady');
            } else {
                // Get user media (use join preferences)
                // Ensure at least one media type is requested (browser requirement)
                // If both are false, default to audio-only
                const finalAudioEnabled = joinAudio || (!joinAudio && !joinVideo);
                const finalVideoEnabled = joinVideo;

                const constraints = {
                    audio: finalAudioEnabled,
                    video: finalVideoEnabled ? {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    } : false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                // Cache the raw camera video track (even if we later replace it in the stream).
                rawCameraVideoTrackRef.current = stream.getVideoTracks()[0] || null;

                // Disable tracks if they were requested but shouldn't be enabled
                if (!joinAudio && stream.getAudioTracks().length > 0) {
                    stream.getAudioTracks().forEach(track => {
                        track.enabled = false;
                    });
                }
                if (!joinVideo && stream.getVideoTracks().length > 0) {
                    stream.getVideoTracks().forEach(track => {
                        track.enabled = false;
                    });
                }

                // Create transports BEFORE setting the stream
                // This ensures transports are ready when we set the stream
                const sendTransportInstance = await createSendTransport(newDevice, roomId);
                recvTransportInstance = await createRecvTransport(newDevice, roomId);

                reconnectJoinPrefsRef.current = { video: joinVideo, audio: joinAudio };
                setupSocketHandlers(newDevice);

                await publishLocalMedia(newDevice, stream, sendTransportInstance, {
                    audio: joinAudio,
                    video: joinVideo
                });
                await notifyServerMediaToggles(joinVideo, joinAudio);

                // Set the stream AFTER producers are created and tracks are ready
                // This ensures the video element receives a fully ready stream
                setLocalStream(stream);
            }

            if (recvOnly) {
                // Temporary diagnostic: DERPSBackend's ui-recorder-launcher.js forwards
                // this session's console output into its own server log, so this line
                // tells us whether the recorder actually received the room's existing
                // peers/producers at join time.
                const existingPeersSummary = (joinResponse.existingPeers ?? []).map(p => ({ peerId: p.peerId, userId: p.userId, producers: p.producers?.length ?? 0 }));
                console.log(`[recorder] video:join existingPeers=${joinResponse.existingPeers?.length ?? 0} ${JSON.stringify(existingPeersSummary)}`);
            }

            // Add existing peers to participants list
            if (joinResponse.existingPeers && joinResponse.existingPeers.length > 0) {
                const existingParticipants = joinResponse.existingPeers.map(peer => ({
                    peerId: peer.peerId,
                    userId: peer.userId,
                    userName: peer.userName || peer.username || ``,
                    deviceType: peer.deviceType || 'desktop',
                    profilePicture: readPeerProfilePicture(peer),
                }));
                setParticipants(existingParticipants);
            }

            seedRaisedHandsFromPeers(joinResponse.existingPeers);

            lastJoinExistingPeersRef.current = joinResponse.existingPeers ?? [];

            // Consume existing producers
            if (joinResponse.existingPeers && joinResponse.existingPeers.length > 0) {
                await waitForRecvTransportReady(recvTransportInstance, 10000);
                for (const peer of joinResponse.existingPeers) {
                    // Set initial state for this peer
                    setRemoteParticipantStates(prev => {
                        const newMap = new Map(prev);
                        newMap.set(peer.userId, {
                            videoEnabled: peer.videoEnabled,
                            audioEnabled: peer.audioEnabled
                        });
                        return newMap;
                    });
                    
                    // Now consume the producers (this will also update state, but we've already set it)
                    for (const producer of peer.producers) {
                        if (recvOnly) {
                            console.log(`[recorder] consuming producer kind=${producer.kind} peerId=${peer.peerId} userId=${peer.userId}`);
                        }
                        await consumeProducer(newDevice, {
                            peerId: peer.peerId,
                            userId: peer.userId,
                            producerId: producer.id,
                            kind: producer.kind,
                            screenShare: producer.appData?.source === 'screen',
                        }, recvTransportInstance);
                        await new Promise((r) => setTimeout(r, 120));
                    }
                }
            }

            deviceRef.current = newDevice;
            wasInCallRef.current = true;
            setCallConnectionStatus('connected');
            reconnectAttemptRef.current = 0;
            reconnectLog('joinRoom:success', {
                producers: summarizeProducers(),
                consumers: summarizeConsumers(),
            });
            isJoiningRef.current = false;
        } catch (err) {
            console.log('joinRoom error', err);
            const finalAudioEnabled = joinAudio || (!joinAudio && !joinVideo);
            setError(resolveMediaAccessErrorMessage(
                err,
                finalAudioEnabled && joinAudio,
                joinVideo
            ));
            isJoiningRef.current = false;
        } finally {
            setIsConnecting(false);
        }
    // This callback intentionally uses refs (e.g., producersRef/localStreamRef) to avoid an ever-growing dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, isConnected, roomId, videoEnabled, audioEnabled, isInRoom, isConnecting, currentUserName, recvOnly]);

    const completePostJoinFromApproval = useCallback(async (payload) => {
        const joinVideo = pendingJoinPrefsRef.current.video;
        const joinAudio = pendingJoinPrefsRef.current.audio;
        const currentRoomId = payload.roomId || roomId;
        try {
            setIsConnecting(true);
            setError(null);
            const rtpCapabilitiesResponse = await emitWithAckTimeout('video:getRtpCapabilities');
            const deviceInstance = await createMediasoupDevice();
            await deviceInstance.load({ routerRtpCapabilities: rtpCapabilitiesResponse.rtpCapabilities });

            let recvTransportInstance;
            if (recvOnly) {
                recvTransportInstance = await createRecvTransport(deviceInstance, currentRoomId);
            } else {
                const finalAudioEnabled = joinAudio || (!joinAudio && !joinVideo);
                const finalVideoEnabled = joinVideo;
                const constraints = {
                    audio: finalAudioEnabled,
                    video: finalVideoEnabled ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (!joinAudio && stream.getAudioTracks().length > 0) stream.getAudioTracks().forEach(t => { t.enabled = false; });
                if (!joinVideo && stream.getVideoTracks().length > 0) stream.getVideoTracks().forEach(t => { t.enabled = false; });
                const sendTransportInstance = await createSendTransport(deviceInstance, currentRoomId);
                recvTransportInstance = await createRecvTransport(deviceInstance, currentRoomId);
                await publishLocalMedia(deviceInstance, stream, sendTransportInstance, {
                    audio: joinAudio,
                    video: joinVideo
                });
                await notifyServerMediaToggles(joinVideo, joinAudio);
                setLocalStream(stream);
            }
            setIsInRoom(true);
            setIsLobby(false);
            setIsHost(!!payload.isHost);
            setHostId(payload.hostId ?? null);
            if (payload.isOpenCall !== undefined) setIsOpenCall(!!payload.isOpenCall);
            if (payload.recording) {
                setIsRecording(true);
                setRecordingId(payload.recording.recordingId ?? null);
                setRecordingStartedAt(payload.recording.startedAt ?? null);
            } else {
                setIsRecording(false);
                setRecordingId(null);
                setRecordingStartedAt(null);
            }
            setVideoEnabled(joinVideo);
            setAudioEnabled(joinAudio);
            videoEnabledRef.current = joinVideo;
            lastJoinExistingPeersRef.current = payload.existingPeers ?? [];
            setupSocketHandlers(deviceInstance);
            seedRaisedHandsFromPeers(payload.existingPeers);
            if (payload.existingPeers && payload.existingPeers.length > 0) {
                setParticipants(payload.existingPeers.map(peer => ({
                    peerId: peer.peerId,
                    userId: peer.userId,
                    userName: peer.userName || peer.username || 'User', // TODO: add default user name
                    deviceType: peer.deviceType || 'desktop',
                    profilePicture: readPeerProfilePicture(peer),
                })));
                await new Promise((r) => setTimeout(r, 350));
                for (const peer of payload.existingPeers) {
                    setRemoteParticipantStates(prev => {
                        const newMap = new Map(prev);
                        newMap.set(peer.userId, { videoEnabled: peer.videoEnabled, audioEnabled: peer.audioEnabled });
                        return newMap;
                    });
                    for (const producer of peer.producers || []) {
                        await consumeProducer(deviceInstance, {
                            peerId: peer.peerId,
                            userId: peer.userId,
                            producerId: producer.id,
                            kind: producer.kind,
                            screenShare: producer.appData?.source === 'screen',
                        }, recvTransportInstance);
                        await new Promise((r) => setTimeout(r, 120));
                    }
                }
            }
            deviceRef.current = deviceInstance;
            wasInCallRef.current = true;
            setCallConnectionStatus('connected');
            reconnectAttemptRef.current = 0;
            isJoiningRef.current = false;
        } catch (err) {
            console.log('completePostJoinFromApproval error', err);
            const finalAudioEnabled = joinAudio || (!joinAudio && !joinVideo);
            setError(resolveMediaAccessErrorMessage(
                err,
                finalAudioEnabled && joinAudio,
                joinVideo
            ));
            setIsLobby(false);
            isJoiningRef.current = false;
        } finally {
            setIsConnecting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, roomId, recvOnly]);

    const doCleanup = useCallback((emitLeave = true, preserveMeetingEndedReason = false) => {
        wasInCallRef.current = false;
        isReconnectingRef.current = false;
        reconnectAttemptRef.current = 0;
        reconnectScheduleAttemptRef.current = 0;
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        setCallConnectionStatus('connected');
        if (emitLeave && socket && roomId) socket.emit('video:leave', { roomId }, () => {});
        joinDeniedRef.current = false;
        const stream = localStreamRef.current;
        const screen = screenStreamRef.current;
        const rawVideo = rawCameraVideoTrackRef.current;
        const processedVideo = processedCameraVideoTrackRef.current;
        const inputClone = virtualBgInputTrackRef.current;
        const send = sendTransportRef.current;
        const recv = recvTransportRef.current;
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (screen) screen.getTracks().forEach(t => t.stop());
        if (processedVideo && processedVideo !== rawVideo) {
            try { processedVideo.stop(); } catch (_) { /* ignore */ }
        }
        if (inputClone) {
            try { inputClone.stop(); } catch (_) { /* ignore */ }
        }
        // If we replaced the stream's video track, raw might not be in stream tracks; stop it too.
        if (rawVideo && (!stream || !stream.getTracks().includes(rawVideo))) {
            try { rawVideo.stop(); } catch (_) { /* ignore */ }
        }
        rawCameraVideoTrackRef.current = null;
        processedCameraVideoTrackRef.current = null;
        virtualBgInputTrackRef.current = null;
        if (send) try { send.close(); } catch (_) { /* ignore */ }
        if (recv) try { recv.close(); } catch (_) { /* ignore */ }
        deviceRef.current = null;
        setLocalStream(null);
        setScreenStream(null);
        setSendTransport(null);
        setRecvTransport(null);
        setProducers({ audio: null, video: null, screen: null });
        setConsumers(new Map());
        setRemoteStreams(new Map());
        setParticipants([]);
        setRemoteParticipantStates(new Map());
        setIsInRoom(false);
        setIsHost(false);
        setHostId(null);
        setJoinRequestedList([]);
        setIsOpenCall(false);
        setIsUpdatingOpenCall(false);
        setMutedByHost(false);
        setVideoConnectivityDegraded(false);
        setVideoChatMessages([]);
        setRaisedHands(new Map());
        raisedHandsRef.current = new Map();
        if (!preserveMeetingEndedReason) setMeetingEndedReason(null);
        setDevice(null);
        setVirtualBackground({ mode: 'none', blur: 8, color: '#2196f3' });
        lastVirtualBgOptionsRef.current = { mode: 'none', blur: 8, color: '#2196f3' };
        isJoiningRef.current = false;
        clearPostReconnectCatchupTimers();
        clearPendingConsumeRetries();
    }, [socket, roomId]);

    const lastRoomIdRef = useRef(null);
    
    // Auto-retry joining when socket connects (only if not already joining from component)
    // Pass withVideo/withAudio so PreJoin choices are used (hook state can be stale when roomId was null on mount)
    useEffect(() => {
        // Reset joining flag if roomId changed
        if (lastRoomIdRef.current !== roomId) {
            isJoiningRef.current = false;
            lastRoomIdRef.current = roomId;
            cancelledLobbyForRoomIdRef.current = null;
            // Reset meeting-ended guard when moving to a new room (or clearing activeCall)
            meetingEndedRef.current = false;
        }
        
        if (recvOnly) {
            console.log(`[recorder] autoJoinEffect hasSocket=${!!socket} isConnected=${isConnected} roomId=${roomId} isInRoom=${isInRoom} isLobby=${isLobby} isConnecting=${isConnecting} isJoining=${isJoiningRef.current} joinDenied=${joinDeniedRef.current} meetingEnded=${meetingEndedRef.current} wasInCall=${wasInCallRef.current}`);
        }

        // Only auto-retry if not already joining and conditions are met
        if (socket && isConnected && roomId && !isInRoom && !isLobby && !isConnecting && !isJoiningRef.current && !joinDeniedRef.current && !meetingEndedRef.current && !wasInCallRef.current) {
            joinRoom(withVideo, withAudio, { fromAutoRetry: true });
        }
    }, [socket, isConnected, roomId, isInRoom, isLobby, isConnecting, joinRoom, withVideo, withAudio, recvOnly]);

    // Reconnect SFU session when the socket reconnects while user is still in the call UI
    useEffect(() => {
        if (!socket) return undefined;

        const onDisconnect = (reason) => {
            reconnectLog('socket:disconnect', { reason });
            if (wasInCallRef.current) handleConnectionLost();
        };

        const onConnect = () => {
            reconnectLog('socket:connect', {
                willScheduleReconnect: wasInCallRef.current && callConnectionStatusRef.current !== 'connected',
            });
            if (!wasInCallRef.current) return;
            if (callConnectionStatusRef.current === 'connected') return;
            scheduleReconnect();
        };

        socket.on('disconnect', onDisconnect);
        socket.on('connect', onConnect);
        return () => {
            socket.off('disconnect', onDisconnect);
            socket.off('connect', onConnect);
        };
    }, [socket, handleConnectionLost, scheduleReconnect, reconnectLog]);

    /** React to a transport's ICE/DTLS connection dying after it was established: 'failed' reconnects
     * immediately, 'disconnected' gets a short grace period since it can be a transient blip. */
    const attachTransportRecovery = (transport, label) => {
        let graceTimer = null;
        const clearGraceTimer = () => {
            if (graceTimer) {
                clearTimeout(graceTimer);
                graceTimer = null;
            }
        };
        transport.on('connectionstatechange', (state) => {
            reconnectLog(`${label}:connectionstatechange`, { transportId: transport.id, state });
            if (state === 'connected') {
                clearGraceTimer();
                return;
            }
            if (state === 'failed') {
                clearGraceTimer();
                scheduleReconnect();
                return;
            }
            if (state === 'disconnected' && !graceTimer) {
                graceTimer = setTimeout(() => {
                    graceTimer = null;
                    if (transport.connectionState === 'disconnected') scheduleReconnect();
                }, TRANSPORT_DISCONNECT_GRACE_MS);
            }
        });
    };

    const createSendTransport = async (deviceInstance, currentRoomId) => {
        const transportResponse = await emitWithAckTimeout('video:createTransport', {
            roomId: currentRoomId,
            direction: 'send'
        });
        console.log('transportResponse', transportResponse);
        const iceServers = transportResponse.iceServers || transportResponse.params?.iceServers || [];
        const transport = deviceInstance.createSendTransport({ ...transportResponse.params, iceServers });

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            reconnectLog('sendTransport:connect', { transportId: transport.id });
            try {
                await emitWithAckTimeout('video:connectTransport', {
                    roomId: currentRoomId,
                    transportId: transport.id,
                    dtlsParameters
                });
                reconnectLog('sendTransport:connect:ok', { transportId: transport.id });
                callback();
            } catch (error) {
                reconnectLog('sendTransport:connect:failed', { transportId: transport.id, error: error?.message });
                errback(error);
            }
        });

        attachTransportRecovery(transport, 'sendTransport');

        transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
            reconnectLog('sendTransport:produce', { transportId: transport.id, kind, appData });
            try {
                const currentVideoEnabled = kind === 'video' ? videoEnabledRef.current : false;
                const response = await emitWithAckTimeout('video:produce', {
                    roomId: currentRoomId,
                    transportId: transport.id,
                    kind,
                    rtpParameters,
                    withVideo: currentVideoEnabled,
                    appData: appData || {}
                });
                reconnectLog('sendTransport:produce:ok', { kind, producerId: response.id });
                callback({ id: response.id });
            } catch (error) {
                reconnectLog('sendTransport:produce:failed', { kind, error: error?.message });
                console.log('createSendTransport error', error);
                errback(error);
            }
        });

        setSendTransport(transport);
        return transport;
    };

    const createRecvTransport = async (deviceInstance, currentRoomId) => {
        const transportResponse = await emitWithAckTimeout('video:createTransport', {
            roomId: currentRoomId,
            direction: 'recv'
        });
        const iceServers = transportResponse.iceServers || transportResponse.params?.iceServers || [];
        const transport = deviceInstance.createRecvTransport({ ...transportResponse.params, iceServers });

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            reconnectLog('recvTransport:connect', { transportId: transport.id });
            try {
                await emitWithAckTimeout('video:connectTransport', {
                    roomId: currentRoomId,
                    transportId: transport.id,
                    dtlsParameters
                });
                reconnectLog('recvTransport:connect:ok', { transportId: transport.id });
                callback();
            } catch (error) {
                reconnectLog('recvTransport:connect:failed', { transportId: transport.id, error: error?.message });
                console.log('createRecvTransport error', error);
                errback(error);
            }
        });

        attachTransportRecovery(transport, 'recvTransport');

        setRecvTransport(transport);
        return transport;
    };

    const produceAudio = async (deviceInstance, stream, transportInstance = null) => {
        const transport = transportInstance || sendTransport;
        if (!transport || !stream) {
            toast.warn(' Connection not established. Please check your internet connection and try again.');
            return;
        }
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) {
            toast.warn(' No audio track found in stream. Please check your microphone and try again.');
            return;
        }

        const producer = await transport.produce({ track: audioTrack });
        commitProducers({ audio: producer });
        reconnectLog('produceAudio:ok', { producerId: producer?.id, paused: producer?.paused });
    };

    const produceVideo = async (deviceInstance, stream, transportInstance = null) => {
        const transport = transportInstance || sendTransport;
        if (!transport || !stream) {
            toast.warn(' Connection not established. Please check your internet connection and try again.');
            return;
        }
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
            toast.warn(' No video track found in stream. Please check your camera and try again.');
            return;
        }

        const producer = await transport.produce({ track: videoTrack });
        commitProducers({ video: producer });
        reconnectLog('produceVideo:ok', { producerId: producer?.id, paused: producer?.paused });
    };

    const publishLocalMedia = async (deviceInstance, stream, sendTransportInstance, { audio, video }) => {
        reconnectLog('publishLocalMedia:start', {
            audio,
            video,
            stream: summarizeMediaStream(stream),
            ...summarizeTransport(sendTransportInstance, 'sendTransport'),
        });
        if (!sendTransportInstance || !stream) {
            reconnectLog('publishLocalMedia:skipped', { reason: '!sendTransport || !stream' });
            return;
        }

        if (audio && stream.getAudioTracks().length > 0) {
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack.enabled) audioTrack.enabled = true;
            await waitForTrackLive(audioTrack);
            await produceAudio(deviceInstance, stream, sendTransportInstance);
            const audioProducer = producersRef.current.audio;
            reconnectLog('publishLocalMedia:audioProduced', {
                producerId: audioProducer?.id,
                paused: audioProducer?.paused,
            });
            if (audioProducer?.paused) {
                try { await audioProducer.resume(); } catch (e) {
                    reconnectLog('publishLocalMedia:audioResumeFailed', { error: e?.message });
                }
            }
        } else {
            reconnectLog('publishLocalMedia:audioSkipped', { audio, trackCount: stream.getAudioTracks().length });
        }

        if (video && stream.getVideoTracks().length > 0) {
            const videoTrack = stream.getVideoTracks()[0];
            if (!videoTrack.enabled) videoTrack.enabled = true;
            await waitForTrackLive(videoTrack);
            await produceVideo(deviceInstance, stream, sendTransportInstance);
            if (lastVirtualBgOptionsRef.current.mode !== 'none') {
                await applyVirtualBackground(lastVirtualBgOptionsRef.current);
            }
            const videoProducer = producersRef.current.video;
            reconnectLog('publishLocalMedia:videoProduced', {
                producerId: videoProducer?.id,
                paused: videoProducer?.paused,
                virtualBg: lastVirtualBgOptionsRef.current.mode,
            });
            if (videoProducer?.paused) {
                try { await videoProducer.resume(); } catch (e) {
                    reconnectLog('publishLocalMedia:videoResumeFailed', { error: e?.message });
                }
            }
        } else {
            reconnectLog('publishLocalMedia:videoSkipped', { video, trackCount: stream.getVideoTracks().length });
        }
        reconnectLog('publishLocalMedia:done', { producers: summarizeProducers() });
    };

    const consumeProducer = async (deviceInstance, data, transportInstance = null, options = {}) => {
        if (currentUserId != null && data?.userId != null && String(data.userId) === String(currentUserId)) {
            reconnectLog('consumeProducer:skippedSelf', { producerId: data?.producerId });
            return;
        }

        const producerId = data?.producerId;
        if (producerId) {
            const alreadyHave = Array.from(consumersRef.current.values()).some(
                (c) => c?.producerId === producerId
            );
            if (alreadyHave) {
                reconnectLog('consumeProducer:skippedDuplicate', { producerId, peerId: data.peerId });
                return;
            }
        }

        const transport = transportInstance || recvTransportRef.current;
        if (!isRecvTransportUsable(transport)) {
            reconnectLog('consumeProducer:skippedBadTransport', {
                producerId,
                peerId: data?.peerId,
                userId: data?.userId,
                kind: data?.kind,
                ...summarizeTransport(transport, 'recvTransport'),
            });
            return;
        }
        reconnectLog('consumeProducer:start', {
            producerId,
            peerId: data?.peerId,
            userId: data?.userId,
            kind: data?.kind,
            screenShare: data?.screenShare,
        });

        let consumeResponse;
        try {
            consumeResponse = await emitWithAckTimeout('video:consume', {
                roomId,
                producerId: data.producerId,
                rtpCapabilities: deviceInstance.rtpCapabilities
            });
        } catch (err) {
            const errMsg = err?.message || String(err);
            reconnectLog('consumeProducer:consumeRequestFailed', {
                producerId,
                error: errMsg,
                fromRetry: !!options.fromRetry,
            });
            if (isRetryableConsumeError(errMsg)) {
                scheduleConsumeRetryRef.current?.(deviceInstance, data);
            } else if (isServerSessionError(errMsg)) {
                scheduleReconnect();
            }
            return;
        }

        let consumer;
        try {
            consumer = await transport.consume({
                id: consumeResponse.params.id,
                producerId: consumeResponse.params.producerId,
                kind: consumeResponse.params.kind,
                rtpParameters: consumeResponse.params.rtpParameters
            });
        } catch (err) {
            reconnectLog('consumeProducer:transportConsumeFailed', { producerId, error: err?.message });
            console.warn('[video] consume failed (transport may be closed)', err);
            return;
        }

        if (consumer.paused) {
            reconnectLog('consumeProducer:resumingConsumer', { consumerId: consumer.id });
            await emitWithAckTimeout('video:resumeConsumer', {
                roomId,
                consumerId: consumer.id
            });
        }

        if (consumer.track) {
            const track = consumer.track;
            let muteGraceTimer = null;
            track.onunmute = () => {
                reconnectLog('consumeProducer:trackUnmuted', { consumerId: consumer.id, producerId });
                if (muteGraceTimer) {
                    clearTimeout(muteGraceTimer);
                    muteGraceTimer = null;
                }
            };
            track.onmute = () => {
                reconnectLog('consumeProducer:trackMuted', { consumerId: consumer.id, producerId });
                if (muteGraceTimer) clearTimeout(muteGraceTimer);
                muteGraceTimer = setTimeout(() => {
                    muteGraceTimer = null;
                    if (!track.muted || track.readyState === 'ended' || consumer.closed) return;
                    reconnectLog('consumeProducer:staleMediaRecovery', { consumerId: consumer.id, producerId });
                    try { consumer.close?.(); } catch (_) { /* ignore */ }
                    setConsumers(prev => {
                        if (!prev.has(consumer.id)) return prev;
                        const next = new Map(prev);
                        next.delete(consumer.id);
                        consumersRef.current = next;
                        return next;
                    });
                    scheduleConsumeRetryRef.current?.(deviceInstance, data);
                }, TRACK_MUTE_RECOVERY_GRACE_MS);
            };
        }

        const streamMapKey = getRemoteStreamMapKey(data.userId, data.screenShare);
        reconnectLog('consumeProducer:success', {
            consumerId: consumer.id,
            producerId,
            streamMapKey,
            peerId: data.peerId,
            trackKind: consumer.track?.kind,
            trackEnabled: consumer.track?.enabled,
            trackReadyState: consumer.track?.readyState,
        });

        if (producerId) pendingConsumeRetriesRef.current.delete(producerId);

        setConsumers(prev => {
            const newMap = new Map(prev);
            newMap.set(consumer.id, {
                ...consumer,
                peerId: data.peerId,
                userId: data.userId,
                producerId: data.producerId,
                screenShare: data.screenShare || false
            });
            consumersRef.current = newMap;
            return newMap;
        });

        // Combine audio and video tracks from the same user (peerId can change on reconnect)
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            if (!streamMapKey) return prev;

            // Drop legacy peerId-keyed entries for this user so UI does not bind to stale keys
            newMap.forEach((remoteData, key) => {
                if (key === streamMapKey) return;
                if (data.screenShare) {
                    if (remoteData?.screenShare && String(remoteData.userId) === String(data.userId)) {
                        newMap.delete(key);
                    }
                } else if (!String(key).endsWith('-screen') && remoteData?.userId != null
                    && String(remoteData.userId) === String(data.userId)) {
                    newMap.delete(key);
                }
            });

            const existingStreamData = newMap.get(streamMapKey);
            let stream;
            if (existingStreamData?.stream) {
                stream = existingStreamData.stream;
                existingStreamData.stream.getTracks().forEach((track) => {
                    if (track.kind === consumer.track.kind) stream.removeTrack(track);
                });
                stream.addTrack(consumer.track);
            } else {
                stream = new MediaStream([consumer.track]);
            }

            newMap.set(streamMapKey, {
                stream,
                userId: data.userId,
                peerId: data.peerId,
                screenShare: data.screenShare || false,
                kind: data.kind || consumer.track.kind,
            });
            remoteStreamsRef.current = newMap;
            return newMap;
        });

        if (data.userId != null && !data.screenShare) {
            setParticipants((prev) => {
                const uid = String(data.userId);
                const found = prev.some((p) => String(p.userId) === uid);
                if (!found) {
                    return [...prev, {
                        peerId: data.peerId,
                        userId: data.userId,
                        userName: data.userName || '',
                        deviceType: data.deviceType || 'desktop',
                        profilePicture: readPeerProfilePicture(data),
                    }];
                }
                return prev.map((p) => (String(p.userId) === uid ? { ...p, peerId: data.peerId } : p));
            });
        }
    };

    scheduleConsumeRetryRef.current = (deviceInstance, data) => {
        const producerId = data?.producerId;
        if (!producerId || !wasInCallRef.current) return;

        const prev = pendingConsumeRetriesRef.current.get(producerId) || { attempt: 0 };
        const attemptIndex = prev.attempt;
        if (attemptIndex >= CONSUME_RETRY_DELAYS_MS.length) {
            reconnectLog('scheduleConsumeRetry:exhausted', { producerId, attempts: attemptIndex });
            pendingConsumeRetriesRef.current.delete(producerId);
            const device = deviceInstance || deviceRef.current;
            if (device) {
                setTimeout(() => refreshRoomPeersFromServerRef.current?.(device), 600);
            }
            return;
        }

        const delayMs = CONSUME_RETRY_DELAYS_MS[attemptIndex];
        pendingConsumeRetriesRef.current.set(producerId, {
            data,
            deviceInstance: deviceInstance || deviceRef.current,
            attempt: attemptIndex + 1,
        });
        reconnectLog('scheduleConsumeRetry:scheduled', { producerId, delayMs, attempt: attemptIndex + 1 });

        setTimeout(async () => {
            const pending = pendingConsumeRetriesRef.current.get(producerId);
            if (!pending || !wasInCallRef.current) return;
            const device = pending.deviceInstance || deviceRef.current;
            if (!device) return;
            reconnectLog('scheduleConsumeRetry:fire', { producerId, attempt: pending.attempt });
            await consumeProducer(device, pending.data, recvTransportRef.current, { fromRetry: true });
        }, delayMs);
    };

    applyResyncPeersPayloadRef.current = async (deviceInstance, payload) => {
        const existingPeers = Array.isArray(payload?.existingPeers) ? payload.existingPeers : [];
        const nextHostId = payload?.hostId ?? payload?.hostUserId ?? null;
        reconnectLog('applyResyncPeersPayload', { peerCount: existingPeers.length, hostId: nextHostId });

        if (nextHostId != null) setHostId(nextHostId);
        lastJoinExistingPeersRef.current = existingPeers;

        setParticipants(existingPeers.map(peer => ({
            peerId: peer.peerId,
            userId: peer.userId,
            userName: peer.userName || peer.username || 'User',
            deviceType: peer.deviceType || 'desktop',
            profilePicture: readPeerProfilePicture(peer),
        })));
        seedRaisedHandsFromPeers(existingPeers);

        setRemoteParticipantStates(() => {
            const m = new Map();
            existingPeers.forEach(peer => {
                m.set(peer.userId, { videoEnabled: !!peer.videoEnabled, audioEnabled: !!peer.audioEnabled });
            });
            return m;
        });

        const validProducerIds = new Set();
        existingPeers.forEach(peer => {
            (peer.producers || []).forEach(p => {
                if (p?.id) validProducerIds.add(p.id);
            });
        });

        setConsumers(prev => {
            const next = new Map(prev);
            next.forEach((consumer, consumerId) => {
                const pid = consumer?.producerId;
                if (pid && !validProducerIds.has(pid)) {
                    try { consumer.close?.(); } catch (_) { /* ignore */ }
                    next.delete(consumerId);
                }
            });
            consumersRef.current = next;
            return next;
        });

        setRemoteStreams(prev => {
            const next = new Map(prev);
            const validUserIds = new Set(
                existingPeers.map(p => p?.userId).filter(v => v != null).map(v => String(v))
            );
            if (currentUserId != null) validUserIds.delete(String(currentUserId));
            next.forEach((remoteData, key) => {
                if (remoteData?.screenShare) return;
                const byUser = remoteData?.userId != null && validUserIds.has(String(remoteData.userId));
                if (!byUser) {
                    try {
                        remoteData?.stream?.getTracks?.()?.forEach?.((t) => {
                            try { t.stop(); } catch (_) { /* ignore */ }
                        });
                    } catch (_) { /* ignore */ }
                    next.delete(key);
                }
            });
            remoteStreamsRef.current = next;
            return next;
        });

        const currentRecvTransport = recvTransportRef.current;
        if (!isRecvTransportUsable(currentRecvTransport)) {
            reconnectLog('applyResyncPeersPayload:skipNoRecv', summarizeTransport(currentRecvTransport, 'recvTransport'));
            return;
        }
        await waitForRecvTransportReady(currentRecvTransport, 8000);

        for (const peer of existingPeers) {
            if (currentUserId != null && peer?.userId != null && String(peer.userId) === String(currentUserId)) {
                continue;
            }
            for (const producer of peer.producers || []) {
                const producerId = producer?.id;
                if (!producerId) continue;
                const alreadyHave = Array.from(consumersRef.current.values()).some(c => c?.producerId === producerId);
                if (alreadyHave) continue;
                await consumeProducer(deviceInstance, {
                    peerId: peer.peerId,
                    userId: peer.userId,
                    producerId,
                    kind: producer.kind,
                    screenShare: producer.appData?.source === 'screen',
                }, currentRecvTransport);
                await new Promise((r) => setTimeout(r, 120));
            }
        }
        reconnectLog('applyResyncPeersPayload:done', {
            consumers: summarizeConsumers(),
            remoteStreamKeys: Array.from(remoteStreamsRef.current.keys()),
        });
    };

    refreshRoomPeersFromServerRef.current = async (deviceInstance) => {
        if (!roomIdRef.current || !wasInCallRef.current || !deviceInstance) return;
        const now = Date.now();
        if (now - lastRoomPeersRefreshAtRef.current < 1200) {
            reconnectLog('refreshRoomPeers:debounced');
            return;
        }
        lastRoomPeersRefreshAtRef.current = now;

        const { video: joinVideo, audio: joinAudio } = reconnectJoinPrefsRef.current;
        const deviceType = getDeviceType();
        const normalizedUserName = typeof currentUserName === 'string' ? currentUserName.trim() : '';
        const joinPayload = {
            roomId: roomIdRef.current,
            videoRoomId: roomIdRef.current,
            withVideo: !!joinVideo,
            withAudio: !!joinAudio,
            deviceType,
            ...(normalizedUserName ? { userName: normalizedUserName } : {})
        };

        // Prefer the dedicated resync events: they only fetch peer/producer state and don't
        // re-run 'video:join', which can reset the server's peer/transport bookkeeping and
        // invalidate the transports we just (re)built, triggering another reconnect loop.
        for (const eventName of ['video:resync', 'video:requestResync', 'video:getPeers']) {
            try {
                const res = await emitWithAckTimeout(eventName, { roomId: roomIdRef.current }, 5000);
                const peers = res?.existingPeers ?? res?.peers;
                if (!Array.isArray(peers)) continue;
                reconnectLog('refreshRoomPeers:ok', { event: eventName, peerCount: peers.length });
                if (res?.hostId != null) setHostId(res.hostId);
                await applyResyncPeersPayloadRef.current?.(deviceInstance, {
                    existingPeers: peers,
                    hostId: res?.hostId,
                });
                return;
            } catch (_) { /* try next event name */ }
        }

        try {
            reconnectLog('refreshRoomPeers:video:join');
            const joinResponse = await emitWithAckTimeout('video:join', joinPayload, 10000);
            const peers = joinResponse?.existingPeers ?? [];
            reconnectLog('refreshRoomPeers:video:join:ok', { peerCount: peers.length });
            if (joinResponse?.hostId != null) setHostId(joinResponse.hostId);
            await applyResyncPeersPayloadRef.current?.(deviceInstance, {
                existingPeers: peers,
                hostId: joinResponse?.hostId,
            });
            return;
        } catch (err) {
            reconnectLog('refreshRoomPeers:video:join:failed', { error: err?.message || String(err) });
        }
        reconnectLog('refreshRoomPeers:noSource');
    };

    schedulePostReconnectConsumeCatchupRef.current = (deviceInstance) => {
        clearPostReconnectCatchupTimers();
        const lastIndex = POST_RECONNECT_CATCHUP_DELAYS_MS.length - 1;
        POST_RECONNECT_CATCHUP_DELAYS_MS.forEach((delayMs, index) => {
            const timerId = setTimeout(async () => {
                if (!wasInCallRef.current || callConnectionStatusRef.current !== 'connected') return;
                reconnectLog('postReconnectCatchup:run', { delayMs });
                await refreshRoomPeersFromServerRef.current?.(deviceInstance);
                reconnectLog('postReconnectCatchup:done', {
                    delayMs,
                    consumers: summarizeConsumers(),
                    remoteStreamKeys: Array.from(remoteStreamsRef.current.keys()),
                });
                // The catchup window ran to completion without another reconnect being
                // triggered in between — the session is stable, so it's safe to reset
                // the attempt counter for the next time a real disconnect happens.
                if (index === lastIndex && callConnectionStatusRef.current === 'connected') {
                    reconnectAttemptRef.current = 0;
                    reconnectLog('postReconnectCatchup:stabilized');
                }
            }, delayMs);
            postReconnectCatchupTimersRef.current.push(timerId);
        });
    };

    const setupSocketHandlers = (deviceInstance) => {
        const activeSocket = socketRef.current;
        if (!activeSocket) return;

        removeVideoSocketHandlers();

        const toMs = (value) => {
            if (value == null) return NaN;
            if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
            if (value instanceof Date) return value.getTime();
            if (typeof value === 'string') {
                const asNum = Number(value);
                if (Number.isFinite(asNum)) return asNum;
                const parsed = Date.parse(value);
                return Number.isFinite(parsed) ? parsed : NaN;
            }
            return NaN;
        };

        const normalizeVideoChatMessage = (incoming) => {
            const base = incoming?.message ?? incoming ?? {};
            const msgRoomId = incoming?.roomId ?? base.roomId ?? roomId;
            const msgUserId =
                base.userId ??
                base.senderId ??
                base.fromUserId ??
                base.user?.id ??
                incoming?.userId ??
                incoming?.senderId;
            const msgText = base.text ?? base.message ?? base.body ?? '';
            const rawCreatedAt = base.createdAt ?? base.timestamp ?? base.time ?? null;
            const msgCreatedAt = Number.isFinite(toMs(rawCreatedAt)) ? toMs(rawCreatedAt) : Date.now();
            const msgId =
                base.id ??
                base.messageId ??
                base._id ??
                `${String(msgUserId)}-${String(msgCreatedAt)}-${String(msgText).slice(0, 24)}`;

            return {
                id: msgId,
                roomId: msgRoomId,
                userId: msgUserId,
                text: String(msgText),
                createdAt: msgCreatedAt,
                userName: base.userName || `User ${msgUserId}`,
            };
        };

        const pushVideoChatMessage = (incoming) => {
            if (!incoming) return;
            const msg = normalizeVideoChatMessage(incoming);
            if (!msg?.roomId || String(msg.roomId) !== String(roomId)) return;
            if (msg.userId == null) return;

            setVideoChatMessages(prev => {
                // Dedupe by id where possible
                if (prev.some(m => m.id === msg.id)) return prev;

                // If this matches an optimistic local message, drop the optimistic one
                const msgTs = toMs(msg.createdAt);
                const maybeOptimistic = prev.find(m => {
                    if (!m?.optimistic) return false;
                    if (String(m.userId) !== String(msg.userId)) return false;
                    if (m.text !== msg.text) return false;
                    const prevTs = toMs(m.createdAt);
                    // Prefer timestamp match, but fall back to "recent optimistic with same text"
                    if (Number.isFinite(prevTs) && Number.isFinite(msgTs)) {
                        return Math.abs(prevTs - msgTs) <= 5000;
                    }
                    // If the server doesn't send a usable createdAt, we still want to avoid double-echo.
                    // Our optimistic createdAt is always ms, so we can match based on recency.
                    if (Number.isFinite(prevTs)) {
                        return Math.abs(prevTs - Date.now()) <= 15000;
                    }
                    return false;
                });

                const next = maybeOptimistic ? prev.filter(m => m.id !== maybeOptimistic.id) : prev;
                return [...next, msg].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
            });
        };

        // Realtime video-room chat messages
        activeSocket.on('video:chat:message', (payload) => pushVideoChatMessage(payload));
        
        activeSocket.on('video:peerJoined', (data) => {
            console.log('video:peerJoined', data);
            // Audio notification (throttled): avoid spamming during reconnect storms / rapid joins.
            try {
                const isLocal = currentUserId != null && data?.userId != null && String(data.userId) === String(currentUserId);
                if (!isLocal) {
                    const now = Date.now();
                    if (now - Number(lastPeerJoinSoundAtRef.current || 0) >= 1000) {
                        lastPeerJoinSoundAtRef.current = now;
                        notificationService.playNotificationSound();
                    }
                }
            } catch (_) {
                // ignore sound errors
            }
            setParticipants(prev => {
                // Check if participant already exists to avoid duplicates
                const exists = prev.some(p => p.userId === data.userId);
                if (exists) return prev;
                return [...prev, {
                    peerId: data.peerId,
                    userId: data.userId,
                    userName: data.userName || '',
                    deviceType: data.deviceType || 'desktop',
                    profilePicture: readPeerProfilePicture(data),
                }];
            });

            setRemoteParticipantStates(prev => {
                const newMap = new Map(prev);
                newMap.set(data.userId, {
                    videoEnabled: data.withVideo,
                    audioEnabled: data.withAudio ?? false // Server should now include this since we send it on join
                });
                return newMap;
            });

            setJoinRequestedList((prev) => removeJoinRequestForPeer(prev, data));

            if (data.handRaised && data.userId != null) {
                applyHandRaisedState(data.userId, true, {
                    userName: data.userName,
                    peerId: data.peerId,
                });
            }

            const peerProducers = Array.isArray(data?.producers) ? data.producers : [];
            if (peerProducers.length > 0) {
                reconnectLog('event:peerJoined:consumeProducers', {
                    peerId: data.peerId,
                    userId: data.userId,
                    count: peerProducers.length,
                });
                (async () => {
                    const recv = recvTransportRef.current;
                    if (!isRecvTransportUsable(recv)) return;
                    for (const producer of peerProducers) {
                        await consumeProducer(deviceInstance, {
                            peerId: data.peerId,
                            userId: data.userId,
                            producerId: producer.id ?? producer.producerId,
                            kind: producer.kind,
                            screenShare: producer.appData?.source === 'screen',
                        }, recv);
                        await new Promise((r) => setTimeout(r, 120));
                    }
                })();
            }
        });

        activeSocket.on('video:peerLeft', (data) => {
            console.log('video:peerLeft', data);
            const peerId = data?.peerId;
            const userId = data?.userId;
            setParticipants(prev => prev.filter(p => p.userId !== userId));

            // Always clear both normal and screen-share streams for the peer.
            // Unexpected disconnects can miss explicit screen-share stop events.
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                // Defensive cleanup:
                // - Prefer removing by peerId keys when available (fast path)
                // - Also remove by userId because peerId can change on reconnects, leaving stale entries behind
                const keysToDelete = new Set();
                if (userId != null) {
                    keysToDelete.add(String(userId));
                    keysToDelete.add(`${String(userId)}-screen`);
                }
                if (peerId) {
                    keysToDelete.add(peerId);
                    keysToDelete.add(`${peerId}-screen`);
                }

                newMap.forEach((remoteData, key) => {
                    if (userId != null && remoteData?.userId != null && String(remoteData.userId) === String(userId)) {
                        keysToDelete.add(key);
                    }
                });

                keysToDelete.forEach((key) => {
                    const remoteData = newMap.get(key);
                    try {
                        // Stop tracks to prevent any lingering playback in <video> elements.
                        remoteData?.stream?.getTracks?.()?.forEach?.((t) => {
                            try { t.stop(); } catch (_) { /* ignore */ }
                        });
                    } catch (_) { /* ignore */ }
                    newMap.delete(key);
                });
                return newMap;
            });

            // Remove all consumers linked to this peer (including screen share consumers).
            setConsumers(prev => {
                const newMap = new Map(prev);
                newMap.forEach((consumer, consumerId) => {
                    const byPeer = peerId && consumer?.peerId === peerId;
                    const byUser = userId != null && consumer?.userId != null && String(consumer.userId) === String(userId);
                    if (byPeer || byUser) {
                        newMap.delete(consumerId);
                    }
                });
                return newMap;
            });

            // Remove participant state when they leave
            setRemoteParticipantStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(userId);
                return newMap;
            });

            if (userId != null) {
                applyHandRaisedState(userId, false);
            }
        });

        activeSocket.on('video:newProducer', async (data) => {
            if (currentUserId != null && data?.userId != null && String(data.userId) === String(currentUserId)) {
                reconnectLog('event:newProducer:skippedSelf', { producerId: data?.producerId });
                return;
            }
            reconnectLog('event:newProducer', {
                peerId: data?.peerId,
                userId: data?.userId,
                producerId: data?.producerId,
                kind: data?.kind,
            });
            // A producer that starts after this peer already joined (e.g. camera turned on
            // mid-call, having joined with it off) never went through the initial existingPeers
            // snapshot — reflect it here too, or the tile keeps showing "camera/mic off" forever
            // even once the track is actually being consumed.
            if (data?.userId != null && !data?.screenShare) {
                if (data.kind === 'video') {
                    setRemoteParticipantStates(prev => {
                        const newMap = new Map(prev);
                        const current = newMap.get(data.userId) || { videoEnabled: true, audioEnabled: true };
                        newMap.set(data.userId, { ...current, videoEnabled: true });
                        return newMap;
                    });
                } else if (data.kind === 'audio') {
                    setRemoteParticipantStates(prev => {
                        const newMap = new Map(prev);
                        const current = newMap.get(data.userId) || { videoEnabled: true, audioEnabled: true };
                        newMap.set(data.userId, { ...current, audioEnabled: true });
                        return newMap;
                    });
                }
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            const currentRecvTransport = recvTransportRef.current;
            if (!isRecvTransportUsable(currentRecvTransport)) {
                reconnectLog('event:newProducer:skippedBadTransport', summarizeTransport(currentRecvTransport, 'recvTransport'));
                return;
            }
            try {
                await consumeProducer(deviceInstance, {
                    ...data,
                    producerId: data.producerId
                }, currentRecvTransport);
            } catch (err) {
                console.warn('[video] newProducer consume error', err);
            }
        });

        // Backend indicates a producer was closed/removed. Clean up any consumer + stream tied to it.
        // socket.on('video:producerClosed', (payload) => {
        //     const peerId = payload?.peerId;
        //     const producerId = payload?.producerId;
        //     const userId = payload?.userId;
        //     if (!producerId) return;

        //     console.log('[video][producerClosed]', { peerId, producerId, userId, roomId, socketId: socket?.id });

        //     // Close + remove any consumers for this producerId
        //     setConsumers(prev => {
        //         const next = new Map(prev);
        //         next.forEach((consumer, consumerId) => {
        //             if (consumer?.producerId === producerId) {
        //                 try { consumer.close?.(); } catch (_) { /* ignore */ }
        //                 next.delete(consumerId);
        //             }
        //         });
        //         return next;
        //     });

        //     // Remove remote streams belonging to this peer/user (best-effort; we don't store producerId in remoteStreams)
        //     setRemoteStreams(prev => {
        //         const next = new Map(prev);
        //         if (peerId) {
        //             next.delete(peerId);
        //             next.delete(`${peerId}-screen`);
        //         }
        //         if (userId != null) {
        //             next.forEach((remoteData, key) => {
        //                 if (remoteData?.userId != null && String(remoteData.userId) === String(userId)) {
        //                     next.delete(key);
        //                 }
        //             });
        //         }
        //         return next;
        //     });
        // });

        activeSocket.on('video:resyncPeers', async (payload) => {
            try {
                reconnectLog('event:resyncPeers', {
                    peerCount: payload?.existingPeers?.length ?? 0,
                });
                await applyResyncPeersPayloadRef.current?.(deviceInstance, payload);
            } catch (e) {
                console.warn('[video][resyncPeers] error', e);
            }
        });

        activeSocket.on('video:screenShareStarted', async (data) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            const currentRecvTransport = recvTransportRef.current;
            if (!isRecvTransportUsable(currentRecvTransport)) return;
            try {
                await consumeProducer(deviceInstance, {
                    ...data,
                    kind: 'video',
                    screenShare: true,
                    producerId: data.producerId
                }, currentRecvTransport);
            } catch (err) {
                console.warn('[video] screenShareStarted consume error', err);
            }
        });

        activeSocket.on('video:screenShareStopped', (data) => {
            data.producerIds.forEach(producerId => {
                const consumer = Array.from(consumersRef.current.values()).find(c => c.producerId === producerId);
                if (consumer) {
                    const screenKey = getRemoteStreamMapKey(consumer.userId, true);
                    setRemoteStreams(prev => {
                        const newMap = new Map(prev);
                        if (screenKey) newMap.delete(screenKey);
                        return newMap;
                    });
                    setConsumers(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(consumer.id);
                        return newMap;
                    });
                }
            });
        });

        activeSocket.on('video:videoToggled', (data) => {
            const isLocalUser = currentUserId != null && data?.userId != null
                && String(data.userId) === String(currentUserId);
            const isConnectivityToggle = data?.reason === 'connectivity';

            if (!(isLocalUser && isConnectivityToggle)) {
                setRemoteParticipantStates(prev => {
                    const newMap = new Map(prev);
                    const current = newMap.get(data.userId) || { videoEnabled: true, audioEnabled: true };
                    newMap.set(data.userId, {
                        ...current,
                        videoEnabled: data.enabled,
                        videoOffReason: isConnectivityToggle && !data.enabled ? 'connectivity' : null,
                    });
                    return newMap;
                });
            }

            if (isLocalUser && isConnectivityToggle) {
                const degraded = !data.enabled;
                setVideoConnectivityDegraded(degraded);
                const stream = localStreamRef.current;
                if (stream) {
                    stream.getVideoTracks().forEach((track) => {
                        track.enabled = !degraded && videoEnabledRef.current;
                    });
                }
                return;
            }

            // If host disabled/enabled the local user's video, update local UI/state too.
            if (data?.byHost === true && currentUserId != null && data?.userId != null) {
                const isLocal = String(data.userId) === String(currentUserId);
                if (isLocal) {
                    const enabled = Boolean(data.enabled);
                    setVideoEnabled(enabled);
                    videoEnabledRef.current = enabled;

                    const stream = localStreamRef.current;
                    if (stream) {
                        stream.getVideoTracks().forEach(t => { t.enabled = enabled; });
                    }

                    try {
                        const localVideoProducer = producersRef.current?.video;
                        if (localVideoProducer) {
                            if (enabled) localVideoProducer.resume?.();
                            else localVideoProducer.pause?.();
                        }
                    } catch (_) {
                        // ignore
                    }
                }
            }
        });

        activeSocket.on('video:connectivityDegraded', (data) => {
            const degraded = typeof data?.degraded === 'boolean'
                ? data.degraded
                : typeof data?.enabled === 'boolean'
                    ? !data.enabled
                    : true;
            setVideoConnectivityDegraded(degraded);

            const stream = localStreamRef.current;
            if (stream) {
                stream.getVideoTracks().forEach((track) => {
                    track.enabled = !degraded && videoEnabledRef.current;
                });
            }
        });

        activeSocket.on('video:audioToggled', (data) => {
            setRemoteParticipantStates(prev => {
                const newMap = new Map(prev);
                const current = newMap.get(data.userId) || { videoEnabled: true, audioEnabled: true };
                newMap.set(data.userId, { ...current, audioEnabled: data.enabled });
                return newMap;
            });
        });

        activeSocket.on('video:meetingEnded', () => {
            meetingEndedRef.current = true;
            setMeetingEndedReason('ended');
            doCleanup(false, true);
        });

        activeSocket.on('video:removedByHost', () => {
            meetingEndedRef.current = true;
            setMeetingEndedReason('removed');
            doCleanup(false, true);
        });

        activeSocket.on('video:mutedByHost', () => {
            setMutedByHost(true);
            // Ensure UI reflects the mute (the mic toggle uses audioEnabled state).
            setAudioEnabled(false);

            // Pause server-side producer (if available) and disable local audio tracks.
            try {
                producersRef.current?.audio?.pause?.();
            } catch (e) {
                // Not fatal; track.enabled should still mute locally.
            }

            const stream = localStreamRef.current;
            if (stream) {
                stream.getAudioTracks().forEach(t => { t.enabled = false; });
                // stream.getVideoTracks().forEach(t => { t.enabled = false; });
            }
        });

        activeSocket.on('video:hostTransferred', (data) => {
            const newHostId = data.newHostId ?? data.newHostUserId;
            const becameHost = newHostId != null && String(newHostId) === String(currentUserId);
            if (newHostId != null) {
                setHostId(newHostId);
                setIsHost(becameHost);
                isHostRef.current = becameHost;
            } else {
                setIsHost(false);
                isHostRef.current = false;
            }
            if (becameHost) {
                const pending = Array.isArray(data.pendingJoinRequests) ? data.pendingJoinRequests : null;
                setJoinRequestedList((prev) => {
                    const base = pending ?? prev;
                    return filterStaleJoinRequests(base);
                });
            } else {
                setJoinRequestedList([]);
            }
        });

        activeSocket.on('video:joinRequested', (data) => {
            console.log('video:joinRequested', data);
            if (data.roomId !== roomId) return;
            if (!isHostRef.current) return;
            if (data.userId != null) {
                const alreadyInRoom = participantsRef.current.some(
                    (p) => p.userId != null && String(p.userId) === String(data.userId)
                );
                if (alreadyInRoom) return;
                if (currentUserId != null && String(data.userId) === String(currentUserId)) return;
            }
            setJoinRequestedList((prev) => {
                const exists = prev.some((r) => r.userId === data.userId);
                if (exists) return prev;
                return filterStaleJoinRequests([...prev, data]);
            });
        });

        activeSocket.on('video:joinRequestCancelled', (data) => {
            console.log('video:joinRequestCancelled', data);
            if (data.roomId !== roomId) return;
            const targetSocketId = data.socketId ?? data.requesterSocketId;
            setJoinRequestedList(prev => {
                if (targetSocketId != null) {
                    return prev.filter(r => r.socketId !== targetSocketId);
                }
                if (data.userId != null) {
                    return prev.filter(r => String(r.userId) !== String(data.userId));
                }
                return prev;
            });
        });

        activeSocket.on('video:recordingStarted', (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            setIsRecording(true);
            setRecordingId(data?.recordingId ?? null);
            setRecordingStartedAt(data?.startedAt ?? null);
            setIsTogglingRecording(false);
        });

        activeSocket.on('video:recordingStopped', (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            setIsRecording(false);
            setRecordingId(null);
            setRecordingStartedAt(null);
            setIsTogglingRecording(false);
        });

        activeSocket.on('video:recordingError', (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            setIsRecording(false);
            setRecordingId(null);
            setRecordingStartedAt(null);
            setIsTogglingRecording(false);
            toast.error(data?.message || 'Recording failed');
        });

        activeSocket.on('video:handRaised', (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            if (data?.userId == null) return;
            applyHandRaisedState(data.userId, true, {
                userName: data.userName,
                peerId: data.peerId,
            });
        });

        activeSocket.on('video:handLowered', (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            if (data?.userId == null) return;
            applyHandRaisedState(data.userId, false);
        });
    };

    const toggleVideo = async () => {
        if (!isInRoom) {
            toast.warn(' Cannot toggle video. Please check your internet connection and try again.');
            return;
        }
        if (callConnectionStatus === 'reconnecting') {
            toast.info('Reconnecting to the meeting…');
            return;
        }
        if (callConnectionStatus === 'failed') {
            toast.warn('Connection lost. Use "Try again" or leave and rejoin the meeting.');
            return;
        }

        const newVideoEnabled = !videoEnabled;
        setVideoEnabled(newVideoEnabled);
        videoEnabledRef.current = newVideoEnabled; // Update ref immediately for produce handler

        // If enabling video but no producer exists, create one
        if (newVideoEnabled && !producersRef.current.video) {
            try {
                // Get user media with video enabled
                const constraints = {
                    audio: false, // Don't request audio again if we already have it
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    }
                };

                const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
                const videoTrack = videoStream.getVideoTracks()[0];
                
                if (!videoTrack) {
                    toast.error('Failed to get video track in stream. Please check your camera and try again.');
                    // Stop all tracks from the stream we just got
                    videoStream.getTracks().forEach(track => track.stop());
                    setVideoEnabled(false);
                    videoEnabledRef.current = false;
                    return;
                }

                // Add video track to existing local stream or create new stream
                if (localStream) {
                    // Check if stream already has a video track and remove it first
                    const existingVideoTracks = localStream.getVideoTracks();
                    existingVideoTracks.forEach(track => {
                        localStream.removeTrack(track);
                        track.stop();
                    });
                    localStream.addTrack(videoTrack);
                } else {
                    // If no local stream exists, create one with just the video track
                    const newStream = new MediaStream([videoTrack]);
                    setLocalStream(newStream);
                }

                // Stop other tracks from the temporary stream (we only need the video track)
                videoStream.getTracks().forEach(track => {
                    if (track !== videoTrack) {
                        track.stop();
                    }
                });

                const transport = sendTransportRef.current;
                if (!transport) {
                    console.error('Failed to toggle video. No transport available.');
                    videoTrack.stop();
                    if (localStream) {
                        localStream.removeTrack(videoTrack);
                    }
                    setVideoEnabled(false);
                    videoEnabledRef.current = false;
                    scheduleReconnect();
                    return;
                }

                // Create video producer
                // The transport's 'produce' event handler will automatically notify the server
                // Note: The handler uses videoEnabled from closure, but we've already updated state
                const producer = await transport.produce({ 
                    track: videoTrack,
                    appData: {}
                });
                commitProducers({ video: producer });

            } catch (error) {
                console.error('Error creating video producer:', error);
                const mapped = mapMediaError(error, { wantsAudio: false, wantsVideo: true });
                toast.error(mapped.userMessage);
                if (localStream) {
                    const videoTrack = localStream.getVideoTracks()[0];
                    if (videoTrack) {
                        localStream.removeTrack(videoTrack);
                        videoTrack.stop();
                    }
                }
                setVideoEnabled(false);
                videoEnabledRef.current = false;
                if (isServerSessionError(error?.message)) scheduleReconnect();
                return;
            }
        } else if (newVideoEnabled && producersRef.current.video) {
            // Video already enabled and producer exists, just resume
            if (localStreamRef.current) {
                const videoTrack = localStreamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = true;
                }
            }
            try {
                await producersRef.current.video.resume();
            } catch (e) {
                console.warn('[video] resume video producer failed', e);
            }
        } else if (!newVideoEnabled && producersRef.current.video) {
            // Disabling video
            if (localStreamRef.current) {
                const videoTrack = localStreamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = false;
                }
            }
            try {
                await producersRef.current.video.pause();
            } catch (e) {
                console.warn('[video] pause video producer failed', e);
            }
        }

        try {
            await notifyServerMediaToggles(newVideoEnabled, audioEnabledRef.current);
        } catch (error) {
            console.error(' Error notifying server of video toggle:', error?.message || error);
            if (isServerSessionError(error?.message)) scheduleReconnect();
        }
    };

    const toggleAudio = async () => {
        if (!isInRoom) {
            toast.warn(' Cannot toggle audio. Please check your internet connection and try again.');
            return;
        }
        if (callConnectionStatus === 'reconnecting') {
            toast.info('Reconnecting to the meeting…');
            return;
        }
        if (callConnectionStatus === 'failed') {
            toast.warn('Connection lost. Use "Try again" or leave and rejoin the meeting.');
            return;
        }
        // Allow user to attempt re-enabling audio even if host previously muted them.

        const newAudioEnabled = !audioEnabled;
        setAudioEnabled(newAudioEnabled);

        // If enabling audio but no producer exists, create one
        if (newAudioEnabled && !producersRef.current.audio) {
            try {
                // Get user media with audio enabled
                const constraints = {
                    audio: true,
                    video: false // Don't request video again if we already have it
                };

                const audioStream = await navigator.mediaDevices.getUserMedia(constraints);
                const audioTrack = audioStream.getAudioTracks()[0];
                
                if (!audioTrack) {
                    toast.error('Failed to get audio track in stream. Please check your microphone and try again.');
                    // Stop all tracks from the stream we just got
                    audioStream.getTracks().forEach(track => track.stop());
                    setAudioEnabled(false);
                    return;
                }

                // Add audio track to existing local stream or create new stream
                if (localStream) {
                    // Check if stream already has an audio track and remove it first
                    const existingAudioTracks = localStream.getAudioTracks();
                    existingAudioTracks.forEach(track => {
                        localStream.removeTrack(track);
                        track.stop();
                    });
                    localStream.addTrack(audioTrack);
                } else {
                    // If no local stream exists, create one with just the audio track
                    const newStream = new MediaStream([audioTrack]);
                    setLocalStream(newStream);
                }

                // Stop other tracks from the temporary stream (we only need the audio track)
                audioStream.getTracks().forEach(track => {
                    if (track !== audioTrack) {
                        track.stop();
                    }
                });

                const transport = sendTransportRef.current;
                if (!transport) {
                    console.error('Failed to toggle audio. No transport available.');
                    audioTrack.stop();
                    if (localStream) {
                        localStream.removeTrack(audioTrack);
                    }
                    setAudioEnabled(false);
                    scheduleReconnect();
                    return;
                }

                // Create audio producer
                // The transport's 'produce' event handler will automatically notify the server
                const producer = await transport.produce({ 
                    track: audioTrack,
                    appData: {}
                });
                commitProducers({ audio: producer });

            } catch (error) {
                console.error('Error creating audio producer:', error);
                const mapped = mapMediaError(error, { wantsAudio: true, wantsVideo: false });
                toast.error(mapped.userMessage);
                if (localStream) {
                    const audioTrack = localStream.getAudioTracks()[0];
                    if (audioTrack) {
                        localStream.removeTrack(audioTrack);
                        audioTrack.stop();
                    }
                }
                setAudioEnabled(false);
                if (isServerSessionError(error?.message)) scheduleReconnect();
                return;
            }
        } else if (newAudioEnabled && producersRef.current.audio) {
            // Audio already enabled and producer exists, just resume
            if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = true;
                }
            }
            try {
                await producersRef.current.audio.resume();
            } catch (e) {
                console.warn('[video] resume audio producer failed', e);
            }
        } else if (!newAudioEnabled && producersRef.current.audio) {
            // Disabling audio
            if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = false;
                }
            }
            try {
                await producersRef.current.audio.pause();
            } catch (e) {
                console.warn('[video] pause audio producer failed', e);
            }
        }

        try {
            await notifyServerMediaToggles(videoEnabledRef.current, newAudioEnabled);
        } catch (error) {
            console.error(' Error notifying server of audio toggle:', error?.message || error);
            if (isServerSessionError(error?.message)) scheduleReconnect();
        }
    };

    const stopScreenShare = useCallback(async () => {
        
        // Use refs to get current values to avoid stale closures
        const currentProducers = producersRef.current;
        const currentScreenStream = screenStreamRef.current;
        
        // Close producer if it exists
        if (currentProducers.screen) {
            try {
                currentProducers.screen.close();
            } catch (error) {
                toast.warn(' Error closing screen share. Please check your internet connection and try again.');
                console.error(' Error closing screen share:', error);
            }
        }
        
        // Stop all tracks in the screen stream
        if (currentScreenStream) {
            currentScreenStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (error) {
                    toast.warn(' Error stopping screen share. Please check your internet connection and try again.');
                    console.error(' Error stopping screen share:', error);
                }
            });
        }

        // Notify server
        try {
            await new Promise((resolve, reject) => {
                socket.emit('video:stopScreenShare', {
                    roomId
                }, (response) => {
                    if (response.error) reject(new Error(response.error));
                    else resolve(response);
                });
            });
        } catch (error) {
            toast.warn(' Screen share stop handler error. Please check your internet connection and try again.');
            console.error(' Screen share stop handler error:', error);
        }

        // Update state
        setScreenStream(null);
        commitProducers({ screen: null });
        setScreenShareEnabled(false);
    }, [socket, roomId, commitProducers]);

    const toggleScreenShare = async () => {
        if (!isInRoom) {
            toast.warn(' Cannot toggle screen share. Please check your internet connection and try again.');
            return;
        }
        if (callConnectionStatus === 'reconnecting' || callConnectionStatus === 'failed') {
            toast.info(callConnectionStatus === 'failed'
                ? 'Connection lost. Use "Try again" or leave and rejoin.'
                : 'Reconnecting to the meeting…');
            return;
        }

        if (!screenShareEnabled) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });

                const videoTrack = stream.getVideoTracks()[0];
                
                // Set up handler for when browser's native "Stop sharing" is clicked
                videoTrack.onended = () => {
                    stopScreenShare();
                };

                const transport = sendTransportRef.current;
                if (!transport) {
                    stream.getTracks().forEach(t => t.stop());
                    scheduleReconnect();
                    return;
                }
                const producer = await transport.produce({
                    track: videoTrack,
                    appData: { source: 'screen' }
                });

                setScreenStream(stream);
                commitProducers({ screen: producer });
                setScreenShareEnabled(true);
            } catch (error) {
                if (error.message.toLowerCase().includes('permission denied')) { 
                    toast.error('Permission denied to access screen share. Please allow access and try again.');
                    return;
                }
                toast.error('Error starting screen share. Please check your internet connection and try again.');
                console.error('Error starting screen share:', error);
                // If user cancels the share dialog, don't treat it as an error
                if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
                    toast.error('Unexpected error. Please check your internet connection and try again.');
                    console.error('Unexpected error:', error);
                }
            }
        } else {
            // Manual stop via custom button
            await stopScreenShare();
        }
    };

    const leaveRoom = useCallback(async () => {
        if (isLobby) {
            if (roomId) {
                cancelledLobbyForRoomIdRef.current = roomId;
            }
            if (socket && roomId) {
                socket.emit('video:cancelJoinRequest', { roomId });
                socket.emit('video:leave', { roomId }, () => {});
            }
            socket?.off('video:joinApproved');
            socket?.off('video:joinDenied');
            joinDeniedRef.current = false;
            meetingEndedRef.current = false;
            setIsLobby(false);
            setError(null);
            isJoiningRef.current = false;
            return;
        }
        if (!isInRoom) {
            return;
        }

        removeVideoSocketHandlers();
        if (socketRef.current) {
            const s = socketRef.current;
            s.off('video:chat:received');
            s.off('video:chat:newMessage');
            s.off('video:chat:messageReceived');
            s.off('video:chat:receive');
        }

        try {
            await new Promise((resolve, reject) => {
                console.log('leaving room', roomId);
                socket.emit('video:leave', { roomId }, (response) => {
                    if (response.error) reject(new Error(response.error));
                    else resolve(response);
                });
            });
        } catch (error) {
            // toast.error('Error leaving room:', error);
        }

        doCleanup(false); // already emitted leave above
    }, [isInRoom, isLobby, roomId, socket, doCleanup, removeVideoSocketHandlers]);

    const endMeeting = useCallback(() => {
        if (!isHost || !socket || !roomId) return;
        socket.emit('video:endMeeting', { roomId });
        doCleanup(false);
    }, [isHost, socket, roomId, doCleanup]);

    const removeParticipant = useCallback((peerId, userId) => {
        if (!isHost || !socket || !roomId) return;
        if (!peerId || userId == null) return;
        socket.emit('video:removeParticipant', { roomId: roomId, targetPeerId: peerId, targetUserId: Number(userId) });
    }, [isHost, socket, roomId]);

    const muteParticipant = useCallback((peerId, userId) => {
        if (!isHost || !socket || !roomId) return;
        if (!peerId || userId == null) return;
        socket.emit('video:muteParticipant', { roomId: roomId, targetPeerId: peerId, targetUserId: Number(userId) });
    }, [isHost, socket, roomId]);

    const muteAllParticipants = useCallback(async () => {
        if (!isHost || !socket || !roomId) return null;
        try {
            return await emitWithAckTimeout('video:muteAllParticipants', { roomId });
        } catch (error) {
            toast.warn(' Failed to mute all participants. Please check your internet connection and try again.');
            console.error(' Failed to mute all participants:', error?.message || error);
            return null;
        }
    }, [isHost, socket, roomId, emitWithAckTimeout]);

    const startRecording = useCallback(async () => {
        if (!isHost || !socket || !roomId) return null;
        setIsTogglingRecording(true);
        try {
            // UI-mode recording launches Xvfb + Puppeteer + a real browser navigation and
            // waits up to RECORDING_UI_READY_TIMEOUT_MS (default 60s) before the backend acks —
            // the default ack timeout is far too short and causes a false "failed" toast even
            // when the recording goes on to start successfully.
            const ack = await emitWithAckTimeout('video:startRecording', { roomId }, 120000);
            if (!ack?.success) {
                toast.warn(ack?.error || 'Failed to start recording.');
                setIsTogglingRecording(false);
                return ack;
            }
            setIsRecording(true);
            setRecordingId(ack.recordingId ?? null);
            setIsTogglingRecording(false);
            return ack;
        } catch (error) {
            toast.warn('Failed to start recording. Please check your internet connection and try again.');
            console.error('Failed to start recording:', error?.message || error);
            setIsTogglingRecording(false);
            return null;
        }
    }, [isHost, socket, roomId, emitWithAckTimeout]);

    const stopRecording = useCallback(async () => {
        if (!isHost || !socket || !roomId) return null;
        setIsTogglingRecording(true);
        try {
            // Stop waits for ffmpeg to finalize (WebM/staging -> MP4) before acking,
            // which can take a while for longer recordings — same reasoning as startRecording.
            const ack = await emitWithAckTimeout('video:stopRecording', { roomId }, 60000);
            if (!ack?.success) {
                toast.warn(ack?.error || 'Failed to stop recording.');
                setIsTogglingRecording(false);
                return ack;
            }
            setIsRecording(false);
            setRecordingId(null);
            setRecordingStartedAt(null);
            setIsTogglingRecording(false);
            return ack;
        } catch (error) {
            toast.warn('Failed to stop recording. Please check your internet connection and try again.');
            console.error('Failed to stop recording:', error?.message || error);
            setIsTogglingRecording(false);
            return null;
        }
    }, [isHost, socket, roomId, emitWithAckTimeout]);

    const disableAllParticipantsVideo = useCallback(async () => {
        if (!isHost || !socket || !roomId) return null;
        try {
            return await emitWithAckTimeout('video:disableAllParticipantsVideo', { roomId });
        } catch (error) {
            toast.warn(' Failed to disable all participants video. Please check your internet connection and try again.');
            console.error(' Failed to disable all participants video:', error?.message || error);
            return null;
        }
    }, [isHost, socket, roomId, emitWithAckTimeout]);

    const disableParticipantVideo = useCallback(async (peerId, userId) => {
        if (!isHost || !socket || !roomId) return null;
        if (!peerId || userId == null) return null;

        // Cannot target the host.
        if (currentUserId != null && String(userId) === String(currentUserId)) return null;

        try {
            return await emitWithAckTimeout('video:disableParticipantVideo', {
                roomId,
                targetPeerId: peerId,
                targetUserId: Number(userId),
            });
        } catch (error) {
            toast.warn(' Failed to disable participant video. Please check your internet connection and try again.');
            console.error(' Failed to disable participant video:', error?.message || error);
            return null;
        }
    }, [isHost, socket, roomId, currentUserId, emitWithAckTimeout]);

    const transferHost = useCallback((peerId, userId) => {
        if (!isHost || !socket || !roomId) return;
        if (!peerId || userId == null) return;
        const nextHostUserId = Number(userId);
        socket.emit('video:transferHost', { roomId: roomId, newHostUserId: Number(userId), targetPeerId: peerId });
        setIsHost(false);
        isHostRef.current = false;
        setHostId(nextHostUserId);
        setJoinRequestedList([]);
    }, [isHost, socket, roomId]);

    const approveJoinRequest = useCallback((socketId, approve) => {
        if (!isHost || !socket || !roomId) return;
        socket.emit('video:approveJoinRequest', { roomId, socketId, approve });
        setJoinRequestedList(prev => prev.filter(r => r.socketId !== socketId));
    }, [isHost, socket, roomId]);

    /**
     * Host: open the call so joiners skip approval, or require approval again.
     * PUT /api/video-room/:roomId { isOpenCall }
     */
    const setOpenCall = useCallback(async (open) => {
        if (!isHost || !roomId) return false;
        const token = localStorage.getItem('accessToken');
        if (!token) {
            toast.error('Please sign in to update meeting settings.');
            return false;
        }
        const nextOpen = !!open;
        setIsUpdatingOpenCall(true);
        try {
            await updateVideoRoom(token, roomId, { isOpenCall: nextOpen });
            setIsOpenCall(nextOpen);
            if (nextOpen && socket) {
                const pending = joinRequestedListRef.current;
                pending.forEach((req) => {
                    if (req?.socketId) {
                        socket.emit('video:approveJoinRequest', {
                            roomId,
                            socketId: req.socketId,
                            approve: true,
                        });
                    }
                });
                if (pending.length > 0) setJoinRequestedList([]);
            }
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update open-call setting'));
            return false;
        } finally {
            setIsUpdatingOpenCall(false);
        }
    }, [isHost, roomId, socket]);

    const toggleHandRaise = useCallback(async () => {
        if (!isInRoom || !socket || !roomId) return;
        if (callConnectionStatus === 'reconnecting') {
            toast.info('Reconnecting to the meeting…');
            return;
        }
        if (callConnectionStatus === 'failed') {
            toast.warn('Connection lost. Use "Try again" or leave and rejoin the meeting.');
            return;
        }

        const currentlyRaised = currentUserId != null && raisedHandsRef.current.has(currentUserId);
        const eventName = currentlyRaised ? 'video:lowerHand' : 'video:raiseHand';

        try {
            await emitWithAckTimeout(eventName, { roomId }, 8000);
        } catch (error) {
            toast.warn('Failed to update hand raise. Please check your internet connection and try again.');
            console.error('Failed to update hand raise:', error?.message || error);
        }
    }, [isInRoom, socket, roomId, currentUserId, callConnectionStatus, emitWithAckTimeout]);

    const sendVideoChatMessage = useCallback(async (text) => {
        const trimmed = String(text ?? '').trim();
        if (!trimmed) return null;
        if (!socket || !roomId || !isInRoom) return null;

        const now = Date.now();
        const tempId = `local-${String(currentUserId)}-${now}-${Math.random().toString(16).slice(2)}`;
        const optimistic = {
            id: tempId,
            roomId,
            userId: currentUserId,
            text: trimmed,
            createdAt: now,
            optimistic: true,
        };

        setVideoChatMessages(prev => [...prev, optimistic]);

        return new Promise((resolve, reject) => {
            const ackTimeout = setTimeout(() => {
                setVideoChatMessages(prev => prev.filter(m => m.id !== tempId));
                reject(new Error('Message send timeout'));
            }, ACK_TIMEOUT_MS);

            try {
                socket.emit('video:chat:send', { roomId, text: trimmed }, (response) => {
                    clearTimeout(ackTimeout);
                    if (response?.error) {
                        setVideoChatMessages(prev => prev.filter(m => m.id !== tempId));
                        reject(new Error(String(response.error)));
                        return;
                    }

                    const serverMsg = response?.message ?? response?.data?.message ?? null;
                    if (serverMsg) {
                        setVideoChatMessages(prev => {
                            const normalized = {
                                id: serverMsg.id ?? serverMsg.messageId ?? serverMsg._id ?? tempId,
                                roomId: serverMsg.roomId ?? roomId,
                                userId: serverMsg.userId ?? serverMsg.senderId ?? currentUserId,
                                text: serverMsg.text ?? serverMsg.message ?? trimmed,
                                createdAt: serverMsg.createdAt ?? serverMsg.timestamp ?? now,
                            };
                            const filtered = prev.filter(m => m.id !== tempId);
                            if (filtered.some(m => m.id === normalized.id)) return filtered;
                            return [...filtered, normalized].sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
                        });
                    } else {
                        setVideoChatMessages(prev => prev.map(m => (m.id === tempId ? { ...m, optimistic: false } : m)));
                    }

                    resolve(response);
                });
            } catch (err) {
                clearTimeout(ackTimeout);
                setVideoChatMessages(prev => prev.filter(m => m.id !== tempId));
                reject(err);
            }
        });
    }, [socket, roomId, currentUserId, isInRoom]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            leaveRoom();
        };
    }, [leaveRoom]);

    return {
        joinRoom,
        leaveRoom,
        toggleVideo,
        toggleAudio,
        toggleScreenShare,
        virtualBackground,
        applyVirtualBackground,
        localStream,
        remoteStreams,
        isInRoom,
        isConnecting,
        videoEnabled,
        audioEnabled,
        screenShareEnabled,
        participants,
        remoteParticipantStates,
        error,
        isHost,
        hostId,
        isLobby,
        joinRequestedList,
        isOpenCall,
        isUpdatingOpenCall,
        mutedByHost,
        videoConnectivityDegraded,
        meetingEndedReason,
        isRecording,
        recordingId,
        recordingStartedAt,
        isTogglingRecording,
        startRecording,
        stopRecording,
        recvOnly,
        endMeeting,
        removeParticipant,
        muteParticipant,
        muteAllParticipants,
        disableAllParticipantsVideo,
        disableParticipantVideo,
        transferHost,
        approveJoinRequest,
        setOpenCall,
        videoChatMessages,
        sendVideoChatMessage,
        callConnectionStatus,
        retryReconnect,
        raisedHands,
        handRaised: hasRaisedHand(raisedHands, currentUserId),
        toggleHandRaise,
    };
};

