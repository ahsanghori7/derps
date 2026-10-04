import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useVideoCallState } from '@contexts/VideoCallContext';
import { useSocket } from '@contexts/SocketContext';
import { useAuthUser } from '@hooks/useAuthUser';
import { getCall, inviteToCall, cancelCall } from '@api/videoRoomApi';
import { getDeviceType } from '../shared/utils/deviceType';
import { toast } from "react-toastify";
import { getErrorMessage } from '@utils/errorHandler';
import { getAvatarColor, getAvatarSpeakingColors } from '../shared/utils/chatUtility';
import { getProfilePictureUrl } from '../../../Utils/profile';
import { DEVICE_STATUS } from '../shared/utils/mediaDevices';
import { useLocalMediaDeviceStatus, useAudioActivity } from '../shared/hooks';
import MediaDeviceAlerts from './MediaDeviceAlerts';
import InviteToCallModal from './InviteToCallModal';
import { useRingtone } from '../calls/useRingtone';
import '../shared/theme/ChatWindow.css';
import {
    BackgroundEffectsIcon,
    CheckIcon,
    ClockIcon,
    CloseFilledIcon,
    CloseIcon,
    CrownIcon,
    DeviceIcon,
    FullscreenCompressIcon,
    FullscreenExpandIcon,
    FullscreenLayoutIcon,
    GroupIcon,
    HandRaisedBadge,
    InfoCircleIcon,
    LeaveCallIcon,
    LinkIcon,
    MessageIcon,
    MicOffIcon,
    MicToggleIcon,
    MoreVerticalIcon,
    PhoneIcon,
    PlusIcon,
    RaisedHandIcon,
    RecordIcon,
    ScreenShareIcon,
    SendIcon,
    SpeakerToggleIcon,
    TrashOutlineIcon,
    VideoCamOffIcon,
    VideoIcon,
    VideoToggleIcon,
} from '../shared/icons';

const INVITE_STATUS_STYLES = {
    ringing: { text: 'text-gray-500 dark:text-gray-400', label: 'Ringing…' },
    busy: { text: 'text-red-500 dark:text-red-400', label: 'Busy' },
    accepted: { text: 'text-green-600 dark:text-green-400', label: 'Joining…' },
    declined: { text: 'text-red-500 dark:text-red-400', label: 'Declined' },
    missed: { text: 'text-gray-400 dark:text-gray-500', label: 'No answer' },
    cancelled: { text: 'text-gray-400 dark:text-gray-500', label: 'Cancelled' },
};

const formatMeetingElapsed = (createdAt) => {
    const startMs = new Date(createdAt).getTime();
    if (Number.isNaN(startMs)) return '';

    const totalSeconds = Math.floor(Math.max(0, Date.now() - startMs) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Mic on/off badge in the participants list. Speaking is shown on the video
// tile, not on this row.
const ParticipantMicIndicator = ({ audioEnabled, className = '' }) => (
    <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-shadow ${
            audioEnabled ? 'chat-call-media-on' : 'chat-call-media-off'
        } ${className}`}
        title={audioEnabled ? 'Mic on' : 'Mic off'}
    >
        <MicToggleIcon enabled={audioEnabled} className="w-3.5 h-3.5" />
    </span>
);

ParticipantMicIndicator.propTypes = {
    audioEnabled: PropTypes.bool,
    className: PropTypes.string,
};

const CALL_SIDE_PANEL_WIDTH = 'min(20rem, calc(100vw - 5.75rem))';

const CallSidebarTab = ({ id, label, icon, active, onClick, badge = null }) => (
    <button
        type="button"
        id={`${id}-tab`}
        aria-expanded={active}
        aria-controls="call-sidebar-panel"
        onClick={onClick}
        title={label}
        className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center text-[10px] font-semibold leading-tight transition-colors ${
            active
                ? 'bg-[#0C79F7]/10 text-[#0C79F7] shadow-[inset_0_0_0_1px_rgba(12,121,247,0.45)]'
                : 'chat-text-muted chat-hover'
        }`}
    >
        <span className="relative inline-flex">
            {icon}
            {badge}
        </span>
        <span className="max-w-full">{label}</span>
    </button>
);

CallSidebarTab.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    active: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    badge: PropTypes.node,
};

// Frame around a video tile. The speaking ring sits on this element, outside
// the overflow:hidden tile. Camera-off uses the same getAvatarColor() class
// as the letter avatar. Camera-on uses the Meet blue ring from CSS.
const SpeakingTileFrame = ({ speaking, cameraOff, userId, children }) => {
    const avatarSpeaking = speaking && cameraOff ? getAvatarSpeakingColors(userId) : null;
    const glowStyle = avatarSpeaking
        ? {
            '--speaking-ring': avatarSpeaking.ring,
            '--speaking-glow': avatarSpeaking.glow,
        }
        : undefined;

    return (
        <div
            className={`chat-video-tile-frame relative rounded-lg${
                speaking ? ' chat-video-tile-speaking' : ''
            }${speaking && cameraOff ? ' chat-video-tile-speaking-avatar' : ''}`}
            style={glowStyle}
        >
            <div className="relative chat-video-tile rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {children}
            </div>
        </div>
    );
};

SpeakingTileFrame.propTypes = {
    speaking: PropTypes.bool,
    cameraOff: PropTypes.bool,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    children: PropTypes.node,
};

// Avatar shown in a video tile when the camera is off. The tile ring uses
// this same avatar background color while the person is speaking.
const SpeakingAvatar = ({ isSpeaking = false, colorClass, initial, sizeClass, textSizeClass, imageUrl }) => {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [imageUrl]);

    if (imageUrl && !failed) {
        return (
            <img
                src={imageUrl}
                alt=""
                onError={() => setFailed(true)}
                className={`${sizeClass} rounded-full object-cover mx-auto mb-2 ${
                    isSpeaking ? 'chat-speaking-ring' : ''
                }`}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} rounded-full ${colorClass} flex items-center justify-center text-white ${textSizeClass} font-semibold mx-auto mb-2 ${
                isSpeaking ? 'chat-speaking-ring' : ''
            }`}
        >
            {initial}
        </div>
    );
};

SpeakingAvatar.propTypes = {
    isSpeaking: PropTypes.bool,
    colorClass: PropTypes.string,
    initial: PropTypes.string,
    sizeClass: PropTypes.string,
    textSizeClass: PropTypes.string,
    imageUrl: PropTypes.string,
};

// Renders nothing — tracks each participant's mic with useAudioActivity and
// reports into activeSpeakingSet. That set drives the video-tile ring and
// (when the recorder grid is capped) who stays on screen.
const SpeakingProbe = ({ userId, stream, audioEnabled, onSpeakingChange }) => {
    const isSpeaking = useAudioActivity(stream, audioEnabled);
    useEffect(() => {
        onSpeakingChange(userId, isSpeaking);
    }, [userId, isSpeaking, onSpeakingChange]);
    return null;
};

SpeakingProbe.propTypes = {
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    stream: PropTypes.instanceOf(typeof MediaStream !== 'undefined' ? MediaStream : Object),
    audioEnabled: PropTypes.bool,
    onSpeakingChange: PropTypes.func.isRequired,
};

const VideoCallScreen = ({ roomId, onLeave, withVideo = true, withAudio = true }) => {
    void (withVideo, withAudio);
    // Call state comes from context (persists when navigating away so the call stays connected)
    const {
        leaveRoom,
        toggleVideo,
        toggleAudio,
        toggleScreenShare,
        virtualBackground,
        applyVirtualBackground,
        localStream,
        remoteStreams,
        isConnecting,
        videoEnabled,
        audioEnabled,
        screenShareEnabled,
        participants,
        remoteParticipantStates,
        error,
        clearActiveVideoCall,
        activeCall,
        isHost,
        hostId,
        isLobby,
        joinRequestedList,
        isOpenCall,
        isUpdatingOpenCall,
        mutedByHost,
        videoConnectivityDegraded,
        meetingEndedReason,
        removeParticipant,
        muteParticipant,
        disableParticipantVideo,
        muteAllParticipants,
        disableAllParticipantsVideo,
        transferHost,
        approveJoinRequest,
        setOpenCall,
        isInRoom,
        videoChatMessages,
        sendVideoChatMessage,
        callConnectionStatus,
        retryReconnect,
        raisedHands,
        handRaised,
        toggleHandRaise,
        isRecording,
        isTogglingRecording,
        startRecording,
        stopRecording,
        recvOnly,
    } = useVideoCallState();

    const {
        micStatus,
        cameraStatus,
        permissionError,
    } = useLocalMediaDeviceStatus({
        stream: localStream,
        audioEnabled,
        videoEnabled,
    });

    const prevMicStatusRef = useRef(null);
    const prevCameraStatusRef = useRef(null);

    const localVideoRef = useRef(null);
    const remoteVideoRefs = useRef(new Map());
    const remoteAudioRefs = useRef(new Map());
    const localStreamSetRef = useRef(false);
    const localStreamKeyRef = useRef(0);
    const callContainerRef = useRef(null);
    const screenShareContainerRef = useRef(null);
    const mutedToastShownRef = useRef(false);
    const connectivityToastShownRef = useRef(false);

    const currentUser = useSelector((state) => state.userData?.userDetails);
    const guestInfo = JSON.parse(localStorage.getItem('guestInfo') || '{}');
    const currentUserId = useSelector((state) => state.userData?.userDetails?.id) || guestInfo?.guestId;
    const [displayName] = useState(currentUser?.name || guestInfo?.displayName);

    // const accessToken = useSelector((state) => state.auth.accessToken) || localStorage.getItem('accessToken');
    const [copied, setCopied] = useState(false);
    const [chatText, setChatText] = useState('');
    const [activeSidebarPanel, setActiveSidebarPanel] = useState(null);
    const [sidebarPanelContent, setSidebarPanelContent] = useState('chat');
    const toggleSidebarSection = useCallback((section) => {
        setSidebarPanelContent(section);
        setActiveSidebarPanel((prev) => (prev === section ? null : section));
    }, []);
    const chatMessagesEndRef = useRef(null);
    const chatTextareaRef = useRef(null);
    const [screenShareFullscreen, setScreenShareFullscreen] = useState(false); // Fullscreen mode for screen share
    const [callFullscreen, setCallFullscreen] = useState(false);
    const callTopChromeRef = useRef(null);
    const [callTopChromeHeight, setCallTopChromeHeight] = useState(64);
    const [showCallOptionsMenu, setShowCallOptionsMenu] = useState(false);
    const [showVirtualBgMenu, setShowVirtualBgMenu] = useState(false);

    // Recorder-only: cap the grid to a legible number of tiles instead of the
    // scrollable full gallery (there's no way to "scroll" a fixed recording
    // frame), prioritizing whoever's currently/most-recently speaking — same
    // approach Meet/Zoom recordings use. Everyone still gets their audio mixed
    // in regardless of whether they have a visible tile.
    const [activeSpeakingSet, setActiveSpeakingSet] = useState(() => new Set());
    const lastActiveAtRef = useRef(new Map());
    const handleSpeakingChange = useCallback((userId, isSpeaking) => {
        if (isSpeaking) lastActiveAtRef.current.set(userId, Date.now());
        setActiveSpeakingSet(prev => {
            if (prev.has(userId) === isSpeaking) return prev;
            const next = new Set(prev);
            if (isSpeaking) next.add(userId);
            else next.delete(userId);
            return next;
        });
    }, []);

    // Ringing-call invite status (only set when this room was started via the
    // call-ringing flow — see docs/call-ringing-invite.txt). Absent for plain
    // link-shared meetings, which have no callId.
    const { token } = useAuthUser();
    const { socket } = useSocket();
    const callId = activeCall?.roomData?.callId ?? null;
    const [invitees, setInvitees] = useState([]);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [invitingToCall, setInvitingToCall] = useState(false);
    const [cancelingRing, setCancelingRing] = useState(false);
    const [reinvitingUserId, setReinvitingUserId] = useState(null);
    const [ringbackMuted, setRingbackMuted] = useState(false);
    const { start: startRingback, stop: stopRingback } = useRingtone();

    // Seed invitee status from the call record once (covers a page refresh /
    // late mount); live updates come from the socket listener below.
    useEffect(() => {
        if (!callId || !token) return;
        let cancelled = false;
        (async () => {
            try {
                const data = await getCall(token, callId);
                if (!cancelled && Array.isArray(data?.invitees)) {
                    setInvitees(data.invitees);
                }
            } catch {
                // Best-effort only — invitee status is a convenience, not required to be on the call.
            }
        })();
        return () => { cancelled = true; };
    }, [callId, token]);

    useEffect(() => {
        if (!socket || !callId) return undefined;

        const applyStatus = (status) => (payload) => {
            if (!payload || String(payload.callId) !== String(callId)) return;
            setInvitees((prev) => prev.map((inv) =>
                String(inv.userId) === String(payload.userId) ? { ...inv, status } : inv
            ));
        };

        const handleAccepted = applyStatus('accepted');
        const handleDeclined = applyStatus('declined');
        const handleMissed = applyStatus('missed');
        const handleCancelled = (payload) => {
            if (!payload || String(payload.callId) !== String(callId)) return;
            if (payload.userId) {
                setInvitees((prev) => prev.map((inv) =>
                    String(inv.userId) === String(payload.userId) ? { ...inv, status: 'cancelled' } : inv
                ));
            } else {
                setInvitees((prev) => prev.map((inv) =>
                    (inv.status === 'ringing' || inv.status === 'busy') ? { ...inv, status: 'cancelled' } : inv
                ));
            }
        };

        socket.on('video:call:accepted', handleAccepted);
        socket.on('video:call:declined', handleDeclined);
        socket.on('video:call:missed', handleMissed);
        socket.on('video:call:cancelled', handleCancelled);

        return () => {
            socket.off('video:call:accepted', handleAccepted);
            socket.off('video:call:declined', handleDeclined);
            socket.off('video:call:missed', handleMissed);
            socket.off('video:call:cancelled', handleCancelled);
        };
    }, [socket, callId]);

    // Merges the invitees[] returned by startCall/inviteToCall into local state:
    // updates a userId's row in place if it's already there (e.g. re-inviting a
    // declined/missed person resets their status to ringing), otherwise appends it.
    const mergeInviteesResult = (result) => {
        const returnedInvitees = Array.isArray(result?.invitees) ? result.invitees : [];
        if (!returnedInvitees.length) return;
        setInvitees((prev) => {
            const byUserId = new Map(prev.map((inv) => [String(inv.userId), inv]));
            returnedInvitees.forEach((inv) => {
                byUserId.set(String(inv.userId), { ...byUserId.get(String(inv.userId)), ...inv });
            });
            return Array.from(byUserId.values());
        });
    };

    const handleInviteToCall = async (userIds) => {
        if (!callId || !token) return;
        setInvitingToCall(true);
        try {
            const result = await inviteToCall(token, callId, { userIds });
            mergeInviteesResult(result);
            setShowInviteModal(false);
            toast.success('Invite sent');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not invite people'));
        } finally {
            setInvitingToCall(false);
        }
    };

    // Quick "call again" action for a declined/missed/cancelled invitee row.
    const handleReinvite = async (userId) => {
        if (!callId || !token) return;
        setReinvitingUserId(userId);
        try {
            const result = await inviteToCall(token, callId, { userIds: [userId] });
            mergeInviteesResult(result);
            toast.success('Calling again…');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not call this person again'));
        } finally {
            setReinvitingUserId(null);
        }
    };

    const handleCancelRinging = async () => {
        if (!callId) return;
        setCancelingRing(true);
        try {
            if (socket?.connected) {
                await new Promise((resolve, reject) => {
                    socket.emit('video:call:cancel', { callId }, (ack) => {
                        if (!ack?.success) {
                            reject(new Error(ack?.error || 'Could not cancel ringing'));
                            return;
                        }
                        resolve();
                    });
                });
            } else {
                await cancelCall(token, callId);
            }
            toast.success('Ringing cancelled');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not cancel ringing'));
        } finally {
            setCancelingRing(false);
        }
    };
    const meetingCreatedAt = activeCall?.roomData?.createdAt;
    const [meetingElapsed, setMeetingElapsed] = useState('');

    useEffect(() => {
        if (!isInRoom) {
            prevMicStatusRef.current = null;
            prevCameraStatusRef.current = null;
            return undefined;
        }

        const notifyDeviceChange = (prev, next, enabled, messages) => {
            if (!enabled || prev === next || prev === null) return;
            if (next === DEVICE_STATUS.DENIED) return;
            if (next === DEVICE_STATUS.DISCONNECTED) toast.warn(messages.disconnected);
            else if (next === DEVICE_STATUS.UNAVAILABLE) toast.warn(messages.unavailable);
            else if (next === DEVICE_STATUS.NONE) toast.warn(messages.none);
        };

        notifyDeviceChange(prevMicStatusRef.current, micStatus, audioEnabled, {
            disconnected: 'Your microphone was disconnected.',
            unavailable: 'Your microphone is unavailable.',
            none: 'No microphone detected.',
        });
        prevMicStatusRef.current = micStatus;

        notifyDeviceChange(prevCameraStatusRef.current, cameraStatus, videoEnabled, {
            disconnected: 'Your camera was disconnected.',
            unavailable: 'Your camera is unavailable.',
            none: 'No camera detected.',
        });
        prevCameraStatusRef.current = cameraStatus;

        return undefined;
    }, [isInRoom, audioEnabled, videoEnabled, micStatus, cameraStatus]);

    useEffect(() => {
        if (!meetingCreatedAt) {
            setMeetingElapsed('');
            return undefined;
        }

        const updateElapsed = () => {
            setMeetingElapsed(formatMeetingElapsed(meetingCreatedAt));
        };

        updateElapsed();
        const intervalId = setInterval(updateElapsed, 1000);
        return () => clearInterval(intervalId);
    }, [meetingCreatedAt]);

    // Auto-resize video chat textarea as user types (min 40px, max 120px)
    const VIDEO_CHAT_TEXTAREA_MIN_HEIGHT = 40;
    const VIDEO_CHAT_TEXTAREA_MAX_HEIGHT = 120;
    const resizeVideoChatTextarea = useCallback(() => {
        const ta = chatTextareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        const next = Math.min(
            Math.max(ta.scrollHeight, VIDEO_CHAT_TEXTAREA_MIN_HEIGHT),
            VIDEO_CHAT_TEXTAREA_MAX_HEIGHT
        );
        ta.style.height = `${next}px`;
    }, []);

    // Fullscreen API helpers with browser prefix support
    const getFullscreenElement = () => {
        return document.fullscreenElement || 
               document.webkitFullscreenElement || 
               document.mozFullScreenElement || 
               document.msFullscreenElement;
    };

    const requestFullscreen = (element) => {
        if (element.requestFullscreen) {
            return element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            return element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            return element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            return element.msRequestFullscreen();
        }
        return Promise.reject(new Error('Fullscreen API is not supported'));
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            return document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }
        return Promise.reject(new Error('Fullscreen API is not supported'));
    };

    const handleToggleFullscreen = async () => {
        if (!screenShareContainerRef.current) return;

        try {
            if (getFullscreenElement()) {
                await exitFullscreen();
                setScreenShareFullscreen(false);
            } else {
                await requestFullscreen(screenShareContainerRef.current);
                setScreenShareFullscreen(true);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error toggling fullscreen'));
        }
    };

    const handleToggleCallFullscreen = async () => {
        if (!callContainerRef.current) return;

        try {
            const el = getFullscreenElement();
            if (el === callContainerRef.current) {
                await exitFullscreen();
                setCallFullscreen(false);
                return;
            }

            // If something else is fullscreen (e.g. screen share), exit first then request call fullscreen.
            if (el) {
                await exitFullscreen();
            }
            await requestFullscreen(callContainerRef.current);
            setCallFullscreen(true);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error toggling call fullscreen'));
        }
    };

    // Listen to fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const el = getFullscreenElement();
            setScreenShareFullscreen(!!el && el === screenShareContainerRef.current);
            setCallFullscreen(!!el && el === callContainerRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Reset fullscreen when screen share ends
    useEffect(() => {
        const streams = remoteStreams ?? new Map();
        const hasScreenShare = Array.from(streams.values()).some(remoteData => remoteData.screenShare);
        if (!hasScreenShare && getFullscreenElement() === screenShareContainerRef.current) {
            exitFullscreen().catch(err => toast.error(getErrorMessage(err, 'Error exiting fullscreen')));
            setScreenShareFullscreen(false);
        }
    }, [remoteStreams]);

    // When meeting is ended or we're removed by host, redirect to chat after a short delay
    useEffect(() => {
        if (!meetingEndedReason) return;
        const t = setTimeout(() => {
            clearActiveVideoCall();
            if (onLeave) onLeave();
        }, 1500);
        return () => clearTimeout(t);
    }, [meetingEndedReason, clearActiveVideoCall, onLeave]);

    // Show a short toast when the host mutes the local user.
    useEffect(() => {
        if (mutedByHost) {
            if (!mutedToastShownRef.current) {
                toast.warn("You have been muted by the host", { autoClose: 3000 });
                mutedToastShownRef.current = true;
            }
        } else {
            mutedToastShownRef.current = false;
        }
    }, [mutedByHost]);

    useEffect(() => {
        if (videoConnectivityDegraded && videoEnabled) {
            if (!connectivityToastShownRef.current) {
                toast.warn('Video paused due to low connectivity. Audio is still active.', { autoClose: 4000 });
                connectivityToastShownRef.current = true;
            }
        } else {
            connectivityToastShownRef.current = false;
        }
    }, [videoConnectivityDegraded, videoEnabled]);

    useEffect(() => {
        const el = callTopChromeRef.current;
        if (!el) return undefined;
        const updateHeight = () => setCallTopChromeHeight(64);
        // const updateHeight = () => setCallTopChromeHeight(el.offsetHeight);
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(el);
        return () => observer.disconnect();
    }, [callConnectionStatus, roomId]);

    const isParticipantHandRaised = useCallback((userId) => {
        if (userId == null || !raisedHands) return false;
        if (raisedHands.has(userId)) return true;
        for (const key of raisedHands.keys()) {
            if (String(key) === String(userId)) return true;
        }
        return false;
    }, [raisedHands]);

    const raisedHandsList = useMemo(() => {
        if (!raisedHands?.size) return [];
        return Array.from(raisedHands.values());
    }, [raisedHands]);

    // Combine current user with participants list and apply name mapping
    // Also include participants from remoteStreams as fallback
    const allParticipants = useMemo(() => {
        const safeParticipants = participants ?? [];
        const safeRemoteStreams = remoteStreams ?? new Map();

        // Get participants from remoteStreams (these are definitely in the room)
        const participantsFromStreams = new Map();
        safeRemoteStreams.forEach((remoteData) => {
            if (remoteData.userId && !participantsFromStreams.has(remoteData.userId)) {
                const state = remoteParticipantStates?.get(remoteData.userId);
                participantsFromStreams.set(remoteData.userId, {
                    peerId: remoteData.peerId,
                    userId: remoteData.userId,
                    userName: remoteData.userName || '',
                    audioEnabled: typeof state?.audioEnabled === 'boolean' ? state.audioEnabled : true,
                    videoEnabled: typeof state?.videoEnabled === 'boolean' ? state.videoEnabled : true,
                    handRaised: isParticipantHandRaised(remoteData.userId),
                });
            }
        });

        // Combine participants from hook and from streams
        const allParticipantsSet = new Map();
        
        // Add participants from hook
        safeParticipants.forEach(p => {
            const state = remoteParticipantStates?.get(p.userId);
            allParticipantsSet.set(p.userId, {
                peerId: p.peerId,
                userId: p.userId,
                userName: p.userName || '',
                profilePicture: p.profilePicture ?? p.user?.profilePicture ?? p.profileImage ?? null,
                deviceType: p.deviceType || 'desktop',
                audioEnabled: typeof state?.audioEnabled === 'boolean' ? state.audioEnabled : true,
                videoEnabled: typeof state?.videoEnabled === 'boolean' ? state.videoEnabled : true,
                handRaised: isParticipantHandRaised(p.userId),
            });
        });

        // Add participants from streams (will overwrite with hook data if exists, but that's fine)
        participantsFromStreams.forEach((p, userId) => {
            if (!allParticipantsSet.has(userId)) {
                allParticipantsSet.set(userId, p);
            }
        });

        const mappedParticipants = Array.from(allParticipantsSet.values());

        const currentUserParticipant = currentUserId ? {
            userId: currentUserId,
            userName: displayName || 'You',
            profilePicture: getProfilePictureUrl(currentUser) || null,
            deviceType: getDeviceType(),
            audioEnabled,
            videoEnabled,
            handRaised,
        } : null;

        
        const otherParticipants = mappedParticipants.filter(p => 
            currentUserId ? p.userId !== currentUserId : true
        );
        
        return currentUserParticipant 
            ? [currentUserParticipant, ...otherParticipants]
            : otherParticipants;
    }, [participants, currentUserId, currentUser, remoteStreams, remoteParticipantStates, audioEnabled, videoEnabled, displayName, handRaised, isParticipantHandRaised]);

    // Once an invitee has actually joined the room (they show up in
    // allParticipants), drop them from the "Invited" list for good — otherwise
    // if they later leave, they'd fall out of allParticipants and the stale
    // "Joining…" row would reappear from the leftover invitee state.
    useEffect(() => {
        if (!allParticipants.length) return;
        const joinedUserIds = new Set(allParticipants.map((p) => String(p.userId)));
        setInvitees((prev) => {
            const filtered = prev.filter((inv) => !joinedUserIds.has(String(inv.userId)));
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [allParticipants]);

    const pendingInvitees = invitees.filter((inv) => inv.status === 'ringing' || inv.status === 'busy');

    // Caller-side ringback: mirrors what the invitee hears while their phone is
    // ringing, so the host isn't waiting in silence. Local-only mute toggle
    // (see the speaker icon next to "Cancel ringing") does not affect the
    // actual ring session, only whether this device plays the sound.
    useEffect(() => {
        if (pendingInvitees.length > 0 && !ringbackMuted) {
            startRingback();
        } else {
            stopRingback();
        }
    }, [pendingInvitees.length, ringbackMuted, startRingback, stopRingback]);

    useEffect(() => () => stopRingback(), [stopRingback]);

    const handleCopyMeetingLink = async () => {
        if (!roomId) return;
        
        const baseUrl = window.location.origin;
        const meetingLink = `${baseUrl}/join/?meeting=${encodeURIComponent(roomId)}`;
        
        try {
            await navigator.clipboard.writeText(meetingLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to copy link'));
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = meetingLink;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                toast.error(getErrorMessage(err, 'Fallback copy failed'));
            }
            document.body.removeChild(textArea);
        }
    };

    // Keep chat pinned to the bottom when new messages arrive or the panel opens
    useEffect(() => {
        if (activeSidebarPanel !== 'chat' || !chatMessagesEndRef.current) return;
        chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [videoChatMessages, activeSidebarPanel]);

    useEffect(() => {
        if (activeSidebarPanel !== 'chat') return;
        resizeVideoChatTextarea();
    }, [chatText, activeSidebarPanel, resizeVideoChatTextarea]);

    useEffect(() => {
        if (!isHost) {
            setActiveSidebarPanel((prev) => (prev === 'host' ? null : prev));
        }
    }, [isHost]);

    const handleSendVideoChat = async () => {
        if (!sendVideoChatMessage || !isInRoom) return;
        const trimmed = String(chatText ?? '').trim();
        if (!trimmed) return;

        const currentText = trimmed;
        setChatText('');
        // Reset height immediately so the input collapses after send
        if (chatTextareaRef.current) {
            chatTextareaRef.current.style.height = `${VIDEO_CHAT_TEXTAREA_MIN_HEIGHT}px`;
        }

        try {
            await sendVideoChatMessage(currentText);
        } catch (err) {
            // Put text back so user doesn't lose it when send fails
            setChatText(currentText);
            toast.error(err?.message ? String(err.message) : 'Failed to send message');
        }
    };

    const hasExplicitlyLeftRef = useRef(false);

    // Reset the stream set flag and increment key when stream changes
    useEffect(() => {
        if (localStream) {
            localStreamSetRef.current = false;
            localStreamKeyRef.current += 1;
        }
    }, [localStream]);

    useEffect(() => {
        if (localVideoRef.current && localStream && videoEnabled) {
            const videoTracks = localStream.getVideoTracks();
            
            // Ensure video tracks are enabled if videoEnabled is true
            if (videoTracks.length > 0) {
                videoTracks.forEach(track => {
                    if (!track.enabled) {
                        track.enabled = true;
                    }
                });
            }
            
            // Wait for tracks to be ready before setting srcObject
            const setupVideo = async () => {
                if (!localVideoRef.current || !localStream) return;
                
                // Check if tracks are ready (live state)
                const tracks = localStream.getVideoTracks();
                const tracksReady = tracks.length > 0 && 
                    tracks.every(track => track.readyState === 'live' || track.readyState === 'ended');
                
                if (tracksReady || tracks.length === 0) {
                    // Tracks are ready or no video tracks (audio only)
                    // Always force a refresh on initial load to fix blank screen issue
                    const isInitialLoad = !localStreamSetRef.current;
                    
                    if (isInitialLoad || localVideoRef.current.srcObject !== localStream) {
                        // Clear first to ensure clean state
                        localVideoRef.current.srcObject = null;
                        // Small delay to ensure cleanup
                        await new Promise(resolve => setTimeout(resolve, 100));
                        // Set the stream
                        localVideoRef.current.srcObject = localStream;
                        localStreamSetRef.current = true;
                        
                        // Try to play immediately
                        try {
                            await localVideoRef.current.play();
                        } catch (err) {
                            // toast.warn(getErrorMessage(err, 'Error playing local video, will retry'));
                            // Retry after a short delay
                            setTimeout(async () => {
                                if (localVideoRef.current && localVideoRef.current.srcObject === localStream) {
                                    try {
                                        await localVideoRef.current.play();
                                    } catch (retryErr) {
                                        // toast.error(getErrorMessage(retryErr, 'Failed to play local video after retry'));
                                    }
                                }
                            }, 300);
                        }
                    }
                } else {
                    // Tracks not ready yet, wait and retry
                    const checkInterval = setInterval(() => {
                        if (!localVideoRef.current || !localStream) {
                            clearInterval(checkInterval);
                            return;
                        }
                        
                        const currentTracks = localStream.getVideoTracks();
                        const ready = currentTracks.length > 0 && 
                            currentTracks.every(track => track.readyState === 'live' || track.readyState === 'ended');
                        
                        if (ready) {
                            clearInterval(checkInterval);
                            setupVideo(); // Retry setup
                        }
                    }, 100);
                    
                    // Timeout after 2 seconds
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        // Set srcObject anyway and try to play
                        if (localVideoRef.current && localStream) {
                            localVideoRef.current.srcObject = null;
                            setTimeout(() => {
                                if (localVideoRef.current && localStream) {
                                    localVideoRef.current.srcObject = localStream;
                                    localVideoRef.current.play().catch(err => {
                                        // toast.error(getErrorMessage(err, 'Error playing local video after timeout'));
                                    });
                                }
                            }, 100);
                        }
                    }, 2000);
                }
            };
            
            setupVideo();
        } else if (localVideoRef.current && !localStream) {
            // Clear the video if stream is removed
            localVideoRef.current.srcObject = null;
            localStreamSetRef.current = false;
        }
    }, [localStream, videoEnabled]);

    // Define helper functions before they're used in useEffect
    const getRemoteVideoEnabled = useCallback((userId) => {
        const state = remoteParticipantStates?.get(userId);
        return state?.videoEnabled !== false; // Default to true if not set
    }, [remoteParticipantStates]);

    const getRemoteAudioEnabled = useCallback((userId) => {
        const state = remoteParticipantStates?.get(userId);
        return state?.audioEnabled !== false; // Default to true if not set
    }, [remoteParticipantStates]);

    const getRemoteVideoOffReason = useCallback((userId) => {
        const state = remoteParticipantStates?.get(userId);
        return state?.videoOffReason ?? null;
    }, [remoteParticipantStates]);

    const hasVideoTrack = (stream) => {
        if (!stream) return false;
        const videoTracks = stream.getVideoTracks();
        // Check if there's a video track that is enabled and live
        const hasTrack = videoTracks.length > 0 && videoTracks[0].enabled && videoTracks[0].readyState === 'live';
        return hasTrack;
    };

    // Handle remote video elements via useEffect to prevent ref callback issues
    useEffect(() => {
        const streams = remoteStreams ?? new Map();
        streams.forEach((remoteData, mapKey) => {
            if (remoteData.screenShare) return;
            let videoElement = remoteVideoRefs.current.get(mapKey);
            if (videoElement && remoteData.stream) {
                const videoEnabledState = getRemoteVideoEnabled(remoteData.userId);
                const shouldShowVideo = !remoteData.screenShare && (hasVideoTrack(remoteData.stream) && videoEnabledState !== false);
                
                // Only update if the stream has changed OR if video was just re-enabled
                const streamChanged = videoElement.srcObject !== remoteData.stream;
                const needsReinit = !streamChanged && videoElement.srcObject && shouldShowVideo && videoElement.paused;
                
                if (streamChanged || needsReinit) {
                    if (streamChanged) {
                        videoElement.srcObject = remoteData.stream;
                    }
                    
                    // Play after a small delay to ensure stream is ready
                    setTimeout(() => {
                        if (videoElement && videoElement.srcObject === remoteData.stream) {
                            videoElement.play().catch(err => {
                                // Ignore AbortError - it's expected if srcObject changes
                                if (err.name !== 'AbortError') {
                                    // ignore abort error
                                }
                            });
                        }
                    }, 100);
                }
            }
        });

        // Sync remote audio elements (dedicated audio so it keeps playing when video is toggled off)
        streams.forEach((remoteData, mapKey) => {
            if (remoteData.screenShare) return;
            const audioEl = remoteAudioRefs.current.get(mapKey);
            if (audioEl && remoteData.stream && remoteData.stream.getAudioTracks().length > 0) {
                const newTracks = remoteData.stream.getAudioTracks();
                const currentTracks = audioEl.srcObject ? audioEl.srcObject.getAudioTracks() : [];
                const sameTrack = currentTracks[0] === newTracks[0];
                if (!sameTrack || !audioEl.srcObject) {
                    audioEl.srcObject = new MediaStream(newTracks);
                    audioEl.play().catch((err) => {
                        // if (err.name !== 'AbortError') toast.error(getErrorMessage(err, 'Error playing remote audio'));
                    });
                }
            }
        });

        // Remove video and audio elements for peers that left
        const currentPeerIds = new Set(streams.keys());
        remoteVideoRefs.current.forEach((videoElement, peerId) => {
            if (!currentPeerIds.has(peerId)) {
                if (videoElement && videoElement.srcObject) videoElement.srcObject = null;
                remoteVideoRefs.current.delete(peerId);
            }
        });
        remoteAudioRefs.current.forEach((audioElement, peerId) => {
            if (!currentPeerIds.has(peerId)) {
                if (audioElement && audioElement.srcObject) audioElement.srcObject = null;
                remoteAudioRefs.current.delete(peerId);
            }
        });
    }, [remoteStreams, remoteParticipantStates, getRemoteVideoEnabled]);

    const handleLeave = async () => {
        hasExplicitlyLeftRef.current = true;
        // Leave room first: notify server (so others see you leave) and stop camera/mic
        if (typeof leaveRoom === 'function') {
            await leaveRoom();
        }
        clearActiveVideoCall();
        if (onLeave) {
            onLeave();
        }
    };


    const getParticipantName = (userId) => {
        const participant = allParticipants.find(p => p.userId === userId);
        return participant?.userName || '';
    };

    const canUseVirtualBackground = !!localStream && (localStream.getVideoTracks?.().length ?? 0) > 0;
    const vbMode = virtualBackground?.mode || 'none';
    const vbBlur = typeof virtualBackground?.blur === 'number' ? virtualBackground.blur : 8;
    const vbColor = typeof virtualBackground?.color === 'string' ? virtualBackground.color : '#2196f3';

    if (typeof leaveRoom !== 'function') {
        return (
            <div className="fixed chat-fullscreen flex items-center justify-center z-50" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
                <p className="chat-text text-lg">Connecting to call...</p>
            </div>
        );
    }

    if (meetingEndedReason) {
        const message = meetingEndedReason === 'removed'
            ? 'You were removed by the host'
            : 'Meeting has ended by the host';
        return (
            <div className="fixed chat-fullscreen flex items-center justify-center z-50" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
                <div className="text-center px-4 max-w-md">
                    <div className="animate-pulse rounded-full w-16 h-16 bg-red-500/20 mx-auto mb-6 flex items-center justify-center">
                        <InfoCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold chat-text mb-2">{message}</h2>
                    <p className="chat-text-muted text-sm">Redirecting you to chat…</p>
                </div>
            </div>
        );
    }

    if (isConnecting) {
        return (
            <div className="fixed chat-fullscreen flex items-center justify-center z-50" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
                <div className="text-center px-4">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                    <p className="chat-text text-base sm:text-lg">Connecting...</p>
                </div>
            </div>
        );
    }

    if (error) {
        const errorMessage = error;
        const isJoinDenied = errorMessage === 'Host denied your request';
        return (
            <div className="fixed chat-fullscreen flex items-center justify-center z-50" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
                <div className="text-center px-4">
                    <p className="text-red-500 text-base sm:text-lg mb-4">{errorMessage}</p>
                    <button
                        onClick={handleLeave}
                        className={isJoinDenied ? 'px-4 py-2 sm:px-6 sm:py-3 chat-call-btn-secondary rounded-lg font-semibold transition-colors text-sm sm:text-base' : 'px-4 py-2 sm:px-6 sm:py-3 chat-call-btn-danger rounded-lg font-semibold transition-colors text-sm sm:text-base'}
                    >
                        {isJoinDenied ? 'Cancel request' : 'Leave Meeting'}
                    </button>
                </div>
            </div>
        );
    }

    if (isLobby) {
        return (
            <div className="fixed chat-fullscreen flex items-center justify-center z-50" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
                <div className="text-center px-4 max-w-md">
                    <div className="animate-pulse rounded-full w-16 h-16 bg-blue-500/30 mx-auto mb-6 flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-semibold chat-text mb-2">Waiting for host to let you in</h2>
                    <p className="chat-text-muted text-sm mb-6">The host will approve your request to join the meeting.</p>
                    <button
                        onClick={handleLeave}
                        className="px-4 py-2 sm:px-6 sm:py-3 chat-call-btn-secondary rounded-lg font-semibold transition-colors text-sm sm:text-base"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    const remoteStreamsArray = Array.from((remoteStreams ?? new Map()).entries());
    
    // Separate screen shares from regular videos
    const screenShareStreams = remoteStreamsArray.filter(([, remoteData]) => remoteData.screenShare);
    const hasScreenShare = screenShareStreams.length > 0;
    const activeScreenShare = hasScreenShare ? screenShareStreams[0] : null;
    
    // Create a map of userId -> stream data for easy lookup (excluding screen shares)
    const remoteStreamsByUserId = new Map();
    const liveTrackScore = (remoteData) => {
        const tracks = remoteData?.stream?.getTracks?.() ?? [];
        return tracks.filter((t) => t.readyState === 'live').length;
    };
    remoteStreamsArray.forEach(([mapKey, remoteData]) => {
        if (remoteData.screenShare || remoteData.userId == null) return;
        const uid = remoteData.userId;
        const existing = remoteStreamsByUserId.get(uid);
        if (!existing || liveTrackScore(remoteData) >= liveTrackScore(existing)) {
            remoteStreamsByUserId.set(uid, { mapKey, peerId: remoteData.peerId, ...remoteData });
        }
    });
    
    // Get all remote participants (excluding current user) to show in grid
    const remoteParticipantsForGrid = allParticipants.filter(p =>
        currentUserId ? p.userId !== currentUserId : true
    );

    // Leaves room for the local tile + a "+N" indicator tile alongside the capped set.
    const RECORDER_GRID_REMOTE_CAP = 8;
    const isRecorderGridCapped = recvOnly && remoteParticipantsForGrid.length > RECORDER_GRID_REMOTE_CAP;
    const visibleRemoteParticipants = isRecorderGridCapped
        ? remoteParticipantsForGrid
            .map((participant, index) => ({
                participant,
                index,
                speaking: activeSpeakingSet.has(participant.userId),
                lastActive: lastActiveAtRef.current.get(participant.userId) ?? 0,
            }))
            .sort((a, b) => {
                if (a.speaking !== b.speaking) return a.speaking ? -1 : 1;
                if (a.lastActive !== b.lastActive) return b.lastActive - a.lastActive;
                return a.index - b.index;
            })
            .slice(0, RECORDER_GRID_REMOTE_CAP)
            .map(({ participant }) => participant)
        : remoteParticipantsForGrid;
    const hiddenParticipantCount = remoteParticipantsForGrid.length - visibleRemoteParticipants.length;
    const gridTileCount = 1 + visibleRemoteParticipants.length + (hiddenParticipantCount > 0 ? 1 : 0);

    const isCallReconnecting = callConnectionStatus === 'reconnecting';
    const isCallReconnectFailed = callConnectionStatus === 'failed';
    const showConnectionBanner = isCallReconnecting || isCallReconnectFailed;
    const isPreparingRecording = isTogglingRecording && !isRecording;
    const isStoppingRecording = isTogglingRecording && isRecording;
    const showRecordingBanner = isRecording || isTogglingRecording;
    const callControlsDisabled = showConnectionBanner;
    const showDeviceAlerts = isInRoom && (
        permissionError
        || (audioEnabled && [DEVICE_STATUS.NONE, DEVICE_STATUS.UNAVAILABLE, DEVICE_STATUS.DISCONNECTED, DEVICE_STATUS.DENIED].includes(micStatus))
        || (videoEnabled && [DEVICE_STATUS.NONE, DEVICE_STATUS.UNAVAILABLE, DEVICE_STATUS.DISCONNECTED, DEVICE_STATUS.DENIED].includes(cameraStatus))
    );

    const isActivelySpeaking = (userId) => {
        if (userId == null || activeSpeakingSet.size === 0) return false;
        if (activeSpeakingSet.has(userId)) return true;
        const key = String(userId);
        for (const id of activeSpeakingSet) {
            if (String(id) === key) return true;
        }
        return false;
    };
    const localSpeaking = isActivelySpeaking(currentUserId);

    return (
        <div ref={callContainerRef} className="fixed chat-fullscreen flex flex-col z-50 overflow-hidden" style={{ height: 'calc(100dvh - 70px)', width: '-webkit-fill-available' }}>
            {/* Banner + header: sidebar anchors below this block */}
            <div ref={callTopChromeRef} className="shrink-0">
                {showConnectionBanner && (
                    <div
                        className={`flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium ${
                            isCallReconnectFailed
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-500 text-gray-900'
                        }`}
                        role="status"
                        aria-live="polite"
                    >
                        {isCallReconnecting ? (
                            <>
                                <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-900/30 border-t-gray-900 animate-spin" aria-hidden />
                                <span>Connection lost. Reconnecting to the meeting…</span>
                            </>
                        ) : (
                            <>
                                <span>Could not reconnect. Leave and rejoin, or try again.</span>
                                <button
                                    type="button"
                                    onClick={() => retryReconnect?.()}
                                    className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
                                >
                                    Try again
                                </button>
                            </>
                        )}
                    </div>
                )}
                {showDeviceAlerts && (
                    <MediaDeviceAlerts
                        permissionError={permissionError}
                        micStatus={micStatus}
                        cameraStatus={cameraStatus}
                        audioEnabled={audioEnabled}
                        videoEnabled={videoEnabled}
                        variant="incall"
                    />
                )}
                {/* Header */}
                <div className="chat-chrome-alt p-2 sm:p-4 flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        
                        {meetingElapsed && (
                            <div
                                className="flex items-center gap-1.5 sm:gap-2 min-w-0 px-2 sm:px-2.5 py-1 rounded-lg chat-timer-badge"
                                title="Time since meeting started"
                            >
                                <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 chat-text-muted" />
                                <span className="hidden sm:inline text-xs font-medium chat-text-muted">
                                    Meeting time
                                </span>
                                <span
                                    className="font-mono text-xs sm:text-sm font-semibold chat-text tabular-nums"
                                    aria-live="polite"
                                    aria-label={`Meeting time ${meetingElapsed}`}
                                >
                                    {meetingElapsed}
                                </span>
                            </div>
                        )}
                        {showRecordingBanner && (
                            <div
                                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400"
                                title={
                                    isPreparingRecording
                                        ? 'Preparing to record the meeting'
                                        : isStoppingRecording
                                            ? 'Stopping the recording'
                                            : 'This meeting is being recorded'
                                }
                            >
                                {isTogglingRecording ? (
                                    <span
                                        className="inline-block h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-red-600/30 border-t-red-600 dark:border-red-400/30 dark:border-t-red-400 animate-spin"
                                        aria-hidden
                                    />
                                ) : (
                                    <RecordIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                )}
                                <span className="text-xs font-semibold">
                                    {isPreparingRecording
                                        ? 'Preparing to record'
                                        : isStoppingRecording
                                            ? 'Stopping recording'
                                            : 'Recording'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline chat-text text-sm font-medium">Share Link</span>
                        <button
                            onClick={handleCopyMeetingLink}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                                copied 
                                    ? 'chat-call-btn-success' 
                                    : 'chat-call-btn-primary'
                            }`}
                            title="Copy meeting link"
                        >
                            <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="font-mono text-xs sm:text-sm">{roomId}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div
                className="flex flex-1 min-h-0 min-w-0"
                style={{ '--call-top-chrome': `${callTopChromeHeight}px` }}
            >
            {/* Video Grid */}
            <div className="chat-scroll flex-1 min-h-0 min-w-0 p-2 sm:p-4 overflow-auto">
                {/* Screen Share Section */}
                {hasScreenShare && activeScreenShare && (
                    <div className="mb-2 sm:mb-4">
                        <div 
                            ref={screenShareContainerRef}
                            className="relative bg-black rounded-lg overflow-hidden screen-share-container" 
                            style={{ aspectRatio: '16/9' }}
                        >
                            <video
                                key={activeScreenShare[0]}
                                ref={(el) => {
                                    if (el) {
                                        remoteVideoRefs.current.set(activeScreenShare[0], el);
                                        if (activeScreenShare[1].stream) {
                                            if (el.srcObject !== activeScreenShare[1].stream) {
                                                el.srcObject = activeScreenShare[1].stream;
                                            }
                                            setTimeout(() => {
                                                if (el && el.srcObject === activeScreenShare[1].stream && el.paused) {
                                                    el.play().catch(err => {
                                                        if (err.name !== 'AbortError') {
                                                            // toast.error(getErrorMessage(err, 'Error playing screen share'));
                                                        }
                                                    });
                                                }
                                            }, 100);
                                        }
                                    } else {
                                        remoteVideoRefs.current.delete(activeScreenShare[0]);
                                    }
                                }}
                                autoPlay
                                playsInline
                                muted={false}
                                className="w-full h-full object-contain"
                                onLoadedMetadata={() => {
                                    const el = remoteVideoRefs.current.get(activeScreenShare[0]);
                                    if (el && el.srcObject) {
                                        el.play().catch(err => {
                                            if (err.name !== 'AbortError') {
                                                // toast.error(getErrorMessage(err, 'Error playing screen share after metadata'));
                                            }
                                        });
                                    }
                                }}
                            />
                            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-black dark:bg-black bg-opacity-70 dark:bg-opacity-70 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm">
                                <span className="hidden sm:inline">{getParticipantName(activeScreenShare[1].userId)} - </span>Screen Share
                            </div>
                            {/* Fullscreen Toggle Button */}
                            <button
                                onClick={handleToggleFullscreen}
                                className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-black dark:bg-black bg-opacity-70 dark:bg-opacity-70 text-white p-1.5 sm:p-2 rounded hover:bg-opacity-90 z-10 cursor-pointer"
                                title={screenShareFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                            >
                                {screenShareFullscreen ? (
                                    <FullscreenCompressIcon />
                                ) : (
                                    <FullscreenExpandIcon />
                                )}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Regular Video Grid */}
                <div className={`grid gap-2 sm:gap-4 ${
                    gridTileCount === 1 ? 'grid-cols-1' :
                    gridTileCount === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                    gridTileCount <= 4 ? 'grid-cols-1 sm:grid-cols-2' :
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                    {currentUserId != null && (
                        <SpeakingProbe
                            key="probe-local"
                            userId={currentUserId}
                            stream={localStream}
                            audioEnabled={audioEnabled}
                            onSpeakingChange={handleSpeakingChange}
                        />
                    )}
                    {remoteParticipantsForGrid.map((participant) => (
                        <SpeakingProbe
                            key={`probe-${participant.userId}`}
                            userId={participant.userId}
                            stream={remoteStreamsByUserId.get(participant.userId)?.stream}
                            audioEnabled={getRemoteAudioEnabled(participant.userId)}
                            onSpeakingChange={handleSpeakingChange}
                        />
                    ))}
                    {/* Local Video */}
                    <SpeakingTileFrame speaking={localSpeaking} cameraOff={!videoEnabled} userId={currentUserId}>
                        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
                            <DeviceIcon deviceType={getDeviceType()} />
                        </div>
                        {handRaised && (
                            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20">
                                <HandRaisedBadge className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                        )}
                        {videoEnabled && videoConnectivityDegraded ? (
                            <div className="w-full h-full flex items-center justify-center bg-black">
                                <div className="text-center px-4">
                                    <VideoCamOffIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-white text-sm sm:text-base font-medium">
                                        Video paused due to low connectivity
                                    </p>
                                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                                        Audio is still active
                                    </p>
                                </div>
                            </div>
                        ) : videoEnabled ? (
                            <video
                                ref={(el) => {
                                    localVideoRef.current = el;
                                    // Immediately set up video when element is mounted and stream is available
                                    if (el && localStream && videoEnabled) {
                                        const videoTracks = localStream.getVideoTracks();
                                        if (videoTracks.length > 0 && el.srcObject !== localStream) {
                                            // Ensure tracks are enabled
                                            videoTracks.forEach(track => {
                                                if (!track.enabled) {
                                                    track.enabled = true;
                                                }
                                            });
                                            // Set stream and play
                                            el.srcObject = localStream;
                                            el.play().catch(err => {
                                                // toast.warn(getErrorMessage(err, 'Error playing in ref callback'));
                                            });
                                        }
                                    }
                                }}
                                key={localStream ? `local-video-${localStreamKeyRef.current}` : 'local-video-no-stream'}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                onLoadedMetadata={() => {
                                    if (localVideoRef.current) {
                                        if (localVideoRef.current.paused) {
                                            localVideoRef.current.play().catch(err => {
                                                // toast.error(getErrorMessage(err, 'Error playing local video'));
                                            });
                                        }
                                    }
                                }}
                                onPlay={() => {
                                    // local video started playing
                                }}
                                onError={(e) => {
                                    // toast.error(getErrorMessage(e, 'Failed to play local video'));
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center chat-chrome-alt">
                                <div className="text-center flex flex-col items-center justify-center">
                                    <SpeakingAvatar
                                        isSpeaking={localSpeaking}
                                        colorClass={getAvatarColor(currentUserId)}
                                        initial={displayName?.charAt(0).toUpperCase() || 'U'}
                                        imageUrl={getProfilePictureUrl(currentUser)}
                                        sizeClass="w-12 h-12 sm:w-16 sm:h-16"
                                        textSizeClass="text-xl sm:text-2xl"
                                    />
                                    <p className="chat-text-muted text-sm sm:text-base">{displayName || 'You'}</p>
                                </div>
                            </div>
                        )}
                        {videoEnabled && (
                        <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black dark:bg-black bg-opacity-70 dark:bg-opacity-70 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm">
                            {displayName || 'You'}
                        </div>
                        )}
                    </SpeakingTileFrame>

                    {/* Remote Videos (excluding screen shares) */}
                    {visibleRemoteParticipants.map((participant) => {
                        const participantName = participant.userName || getParticipantName(participant.userId);
                        const speaking = isActivelySpeaking(participant.userId);
                        const remoteData = remoteStreamsByUserId.get(participant.userId);
                        const hasStream = !!remoteData;
                        const videoEnabledState = getRemoteVideoEnabled(participant.userId);
                        const audioEnabledState = getRemoteAudioEnabled(participant.userId);
                        const videoOffReason = getRemoteVideoOffReason(participant.userId);
                        const streamHasVideo = hasStream && remoteData && hasVideoTrack(remoteData.stream);
                        const streamHasAudio = hasStream && remoteData && remoteData.stream && remoteData.stream.getAudioTracks().length > 0;
                        const hasStateInfo = remoteParticipantStates?.has(participant.userId);
                        // Show placeholder overlay if: no stream, no video track, OR we have state info saying video is disabled
                        const showPlaceholder = !hasStream || !streamHasVideo || (hasStateInfo && videoEnabledState === false);
                        // Always render video element if there's a stream (for audio playback), even if no video track
                        const shouldRenderVideo = hasStream && (streamHasVideo || streamHasAudio);

                        // Remote streams are keyed by userId (peerId changes on socket reconnect).
                        const streamRefKey = hasStream ? String(participant.userId) : `no-stream-${participant.userId}`;

                        return (
                            <SpeakingTileFrame key={participant.userId} speaking={speaking} cameraOff={showPlaceholder} userId={participant.userId}>
                                <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
                                    <DeviceIcon deviceType={participant.deviceType} />
                                </div>
                                {isParticipantHandRaised(participant.userId) && (
                                    <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-20">
                                        <HandRaisedBadge className="w-7 h-7 sm:w-8 sm:h-8" />
                                    </div>
                                )}
                                {showPlaceholder && (
                                    <div className="absolute inset-0 w-full h-full flex items-center justify-center chat-chrome-alt z-10">
                                        <div className="text-center flex flex-col items-center justify-center">
                                            <SpeakingAvatar
                                                isSpeaking={speaking}
                                                colorClass={getAvatarColor(participant.userId)}
                                                initial={participantName?.charAt(0).toUpperCase() || 'U'}
                                                imageUrl={getProfilePictureUrl(participant)}
                                                sizeClass="w-12 h-12 sm:w-16 sm:h-16"
                                                textSizeClass="text-xl sm:text-2xl"
                                            />
                                            <p className="chat-text-muted text-sm sm:text-base">{participantName}</p>
                                            {videoOffReason === 'connectivity' && (
                                                <p className="text-amber-500 text-xs sm:text-sm mt-1 px-2">
                                                    Poor connection
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Dedicated audio element so remote audio keeps playing when they toggle video off */}
                                {shouldRenderVideo && streamHasAudio && !remoteData.screenShare && (
                                    <audio
                                        ref={(el) => {
                                            if (el) {
                                                remoteAudioRefs.current.set(streamRefKey, el);
                                                if (remoteData.stream && remoteData.stream.getAudioTracks().length > 0) {
                                                    el.srcObject = new MediaStream(remoteData.stream.getAudioTracks());
                                                    el.play().catch(err => {
                                                        // if (err.name !== 'AbortError') toast.error(getErrorMessage(err, 'Error playing remote audio in ref'));
                                                    });
                                                }
                                            } else {
                                                remoteAudioRefs.current.delete(streamRefKey);
                                            }
                                        }}
                                        autoPlay
                                        muted={false}
                                        className="hidden"
                                        aria-hidden
                                    />
                                )}
                                {shouldRenderVideo && (
                                    <video
                                        key={streamRefKey}
                                        ref={(el) => {
                                            if (el) {
                                                remoteVideoRefs.current.set(streamRefKey, el);
                                                if (remoteData.stream) {
                                                    if (el.srcObject !== remoteData.stream) {
                                                        el.srcObject = remoteData.stream;
                                                    }
                                                    if (el.paused) {
                                                        setTimeout(() => {
                                                            if (el && el.srcObject === remoteData.stream && el.paused) {
                                                                el.play().catch(err => {
                                                                    // if (err.name !== 'AbortError') toast.error(getErrorMessage(err, 'Error playing remote stream in ref'));
                                                                });
                                                            }
                                                        }, 100);
                                                    }
                                                }
                                            } else {
                                                remoteVideoRefs.current.delete(streamRefKey);
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                        muted={false}
                                        className="w-full h-full object-cover"
                                        onLoadedMetadata={() => {
                                            const el = remoteVideoRefs.current.get(streamRefKey);
                                            if (el && el.srcObject) {
                                                el.play().catch(err => {
                                                    // Ignore AbortError - it's expected if srcObject changes
                                                    if (err.name !== 'AbortError') {
                                                        // toast.error(getErrorMessage(err, 'Error playing remote stream after metadata'));
                                                    }
                                                });
                                            }
                                        }}
                                        onPlay={() => {
                                            // remote stream started playing
                                        }}
                                        onPause={() => {
                                            // remote stream paused
                                        }}
                                        onError={(e) => {
                                            // toast.error(getErrorMessage(e, 'Failed to play remote stream'));
                                        }}
                                    />
                                )}
                                {videoEnabledState && (
                                <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black dark:bg-black bg-opacity-70 dark:bg-opacity-70 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm z-20">
                                    {participantName}
                                </div>
                                )}
                                <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
                                    <div className={`p-1.5 sm:p-2 rounded-lg ${
                                        videoEnabledState 
                                            ? 'chat-call-media-on' 
                                            : 'chat-call-media-off'
                                    }`}>
                                        <VideoToggleIcon enabled={videoEnabledState} className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </div>
                                    <div className={`p-1.5 sm:p-2 rounded-lg ${
                                        audioEnabledState 
                                            ? 'chat-call-media-on' 
                                            : 'chat-call-media-off'
                                    }`}>
                                        <MicToggleIcon enabled={audioEnabledState} className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </div>
                                </div>
                            </SpeakingTileFrame>
                        );
                    })}
                    {hiddenParticipantCount > 0 && (
                        <div className="relative chat-video-tile rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                            <div className="text-center">
                                <p className="text-2xl sm:text-3xl font-semibold chat-text">+{hiddenParticipantCount}</p>
                                <p className="chat-text-muted text-xs sm:text-sm mt-1">more participant{hiddenParticipantCount === 1 ? '' : 's'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right sidebar: icon rail, with one content panel that opens horizontally */}
            <aside className="relative z-40 flex h-full min-h-0 shrink-0">
                {activeSidebarPanel && (
                    <button
                        type="button"
                        className="lg:hidden fixed inset-0 z-30 bg-black/50"
                        aria-label="Close side panel"
                        onClick={() => setActiveSidebarPanel(null)}
                    />
                )}

                <div
                    id="call-sidebar-panel"
                    role="region"
                    aria-labelledby="call-sidebar-panel-title"
                    aria-hidden={activeSidebarPanel ? undefined : true}
                    className={`z-40 h-full min-w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-out max-lg:absolute max-lg:bottom-0 max-lg:right-full max-lg:top-0 ${
                        activeSidebarPanel ? '' : 'pointer-events-none'
                    }`}
                    style={{ width: activeSidebarPanel ? CALL_SIDE_PANEL_WIDTH : 0 }}
                >
                    <div
                        className="flex h-full flex-col chat-surface chat-divider-l"
                        style={{ width: CALL_SIDE_PANEL_WIDTH }}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 chat-chrome-alt chat-divider-b">
                            <h2 id="call-sidebar-panel-title" className="min-w-0 truncate text-sm font-semibold chat-text">
                                {sidebarPanelContent === 'host' && 'Host'}
                                {sidebarPanelContent === 'participants' && `Participants (${allParticipants?.length ?? 0})`}
                                {sidebarPanelContent === 'chat' && 'Chat'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setActiveSidebarPanel(null)}
                                className="p-1 chat-text-muted hover:text-[#0C79F7]"
                                title="Close"
                                aria-label="Close side panel"
                            >
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {sidebarPanelContent === 'host' && isHost && (
                        <div className="chat-scroll flex-1 min-h-0 overflow-y-auto">
                            {isHost && joinRequestedList?.length > 0 && (
                                <div className="p-3 sm:p-4 chat-divider-b">
                                    <h3 className="chat-text font-semibold text-sm sm:text-base mb-2">Waiting to join</h3>
                                    <div className="space-y-2">
                                        {joinRequestedList.map((req) => (
                                            <div key={req.socketId} className="flex items-center justify-between gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                                                <div className="min-w-0 flex-1">
                                                    <p className="chat-text text-sm truncate">{req.userName || 'Guest'}</p>
                                                    <p className="chat-text-muted text-xs truncate">
                                                        {String(req.deviceType).charAt(0).toUpperCase() + String(req.deviceType).slice(1) || 'Desktop'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => approveJoinRequest(req.socketId, true)} className="p-1.5 rounded chat-call-btn-success" title="Approve">
                                                        <CheckIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => approveJoinRequest(req.socketId, false)} className="p-1.5 rounded chat-call-btn-danger" title="Deny">
                                                        <CloseIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isHost && currentUserId ? (
                                <div className="p-3 sm:p-4">
                                    <h3 className="chat-text font-semibold text-sm sm:text-base mb-3">Host Controls</h3>
                                    <div className="flex flex-col gap-2">
                                        <div>
                                            <button
                                                type="button"
                                                disabled={isUpdatingOpenCall}
                                                onClick={async () => {
                                                    const next = !isOpenCall;
                                                    const ok = await setOpenCall?.(next);
                                                    if (ok) {
                                                        toast.success(
                                                            next
                                                                ? 'Call is open - anyone can join without approval'
                                                                : 'Call requires host approval to join'
                                                        );
                                                    }
                                                }}
                                                className="w-full px-3 py-2 rounded-xl chat-call-btn-primary font-medium text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                                title={isOpenCall ? 'Require host approval to join' : 'Anyone can join without asking for permission'}
                                            >
                                                <GroupIcon className="w-5 h-5" />
                                                {isUpdatingOpenCall
                                                    ? 'Updating…'
                                                    : isOpenCall
                                                        ? 'Require Host Approval'
                                                        : 'Open Meeting'}
                                            </button>
                                            <span className="block chat-text-muted text-xs mt-1.5 px-0.5">
                                                {isOpenCall
                                                    ? 'Make this meeting require host approval before anyone can join'
                                                    : 'Make this meeting open so anyone can join without needing host approval'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const res = await muteAllParticipants?.();
                                                if (res?.success) toast.success(`Muted ${res?.mutedCount ?? 'participants'} participants`);
                                                else toast.error(res?.error ? String(res.error) : 'Failed to mute participants');
                                            }}
                                            className="w-full px-3 py-2 rounded-xl chat-call-media-on font-medium text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                            title="Mute everyone except host"
                                        >
                                            <MicOffIcon className="w-5 h-5" />
                                            Mute all
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const res = await disableAllParticipantsVideo?.();
                                                if (res?.success) toast.success(`Disabled video for ${res?.disabledCount ?? 'participants'} participants`);
                                                else toast.error(res?.error ? String(res.error) : 'Failed to disable participant cameras');
                                            }}
                                            className="w-full px-3 py-2 rounded-xl chat-call-btn-primary font-medium text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                            title="Disable cameras for everyone except host"
                                        >
                                            <VideoCamOffIcon className="w-5 h-5" />
                                            Disable all camera
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 sm:p-4">
                                    <p className="chat-text-muted text-sm">Host tab is only available for the host.</p>
                                </div>
                            )}
                        </div>
                        )}
                        {sidebarPanelContent === 'participants' && (
                        <div className="chat-scroll flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="chat-text font-semibold text-sm sm:text-base">Participants ({allParticipants?.length ?? 0})</h3>
                                {callId && (
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(true)}
                                        className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Add people
                                    </button>
                                )}
                            </div>
                            {invitees.length > 0 && (
                                <div className="mb-4 p-3 rounded-lg chat-border border">
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <p className="chat-text-muted text-xs font-semibold uppercase tracking-wide">
                                            Invited ({invitees.length})
                                        </p>
                                        {pendingInvitees.length > 0 && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setRingbackMuted((prev) => !prev)}
                                                    className="p-1 rounded-full chat-hover chat-text-muted"
                                                    title={ringbackMuted ? 'Unmute ringing sound' : 'Mute ringing sound'}
                                                    aria-label={ringbackMuted ? 'Unmute ringing sound' : 'Mute ringing sound'}
                                                >
                                                    <SpeakerToggleIcon enabled={!ringbackMuted} className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelRinging}
                                                    disabled={cancelingRing}
                                                    className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                                                >
                                                    {cancelingRing ? 'Cancelling…' : 'Cancel ringing'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {invitees.map((inv) => {
                                            const style = INVITE_STATUS_STYLES[inv.status] || INVITE_STATUS_STYLES.ringing;
                                            const reinvitable = ['declined', 'missed', 'cancelled'].includes(inv.status);
                                            return (
                                                <div key={inv.userId} className="flex items-center justify-between gap-2 text-sm">
                                                    <span className="chat-text truncate">{inv.name || 'User'}</span>
                                                    <span className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`text-xs ${style.text}`}>{style.label}</span>
                                                        {reinvitable && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReinvite(inv.userId)}
                                                                disabled={reinvitingUserId === inv.userId}
                                                                className="p-1 rounded-full chat-hover text-blue-600 dark:text-blue-400 disabled:opacity-50"
                                                                title="Call again"
                                                                aria-label={`Call ${inv.name || 'user'} again`}
                                                            >
                                                                <PhoneIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {raisedHandsList.length > 0 && (
                                <div className="mb-4 p-3 rounded-lg bg-[#FBBC04]/10 dark:bg-[#FBBC04]/15 border border-[#FBBC04]/35 dark:border-[#FBBC04]/40">
                                    <p className="text-[#B06000] dark:text-[#FBBC04] text-xs font-semibold uppercase tracking-wide mb-2">
                                        Raised hands ({raisedHandsList.length})
                                    </p>
                                    <div className="space-y-1">
                                        {raisedHandsList.map((entry) => (
                                            <div key={entry.userId} className="flex items-center gap-2 text-sm chat-text">
                                                <HandRaisedBadge className="w-5 h-5" />
                                                <span className="truncate">
                                                    {String(entry.userId) === String(currentUserId)
                                                        ? 'You'
                                                        : (entry.userName || getParticipantName(entry.userId))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                {allParticipants.length > 0 ? (
                                    allParticipants.map(participant => {
                                        const isSelf = String(participant.userId) === String(currentUserId);
                                        const showHostActions = isHost && currentUserId && !isSelf;
                                        return (
                                            <div
                                                key={participant.peerId || participant.userId || Math.random().toString(36).substring(2, 15)}
                                                className="group flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors chat-hover/70"
                                            >
                                                {getProfilePictureUrl(participant) ? (
                                                    <img
                                                        src={getProfilePictureUrl(participant)}
                                                        alt=""
                                                        className="w-8 h-8 rounded-full object-cover shrink-0"
                                                    />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full shrink-0 ${getAvatarColor(participant.userId)} flex items-center justify-center text-white text-xs font-semibold`}>
                                                        {participant.userName?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-sm font-medium chat-text truncate">
                                                        {participant.userName || 'User'}
                                                    </span>
                                                    {participant.handRaised && (
                                                        <HandRaisedBadge className="w-4 h-4 shrink-0" />
                                                    )}
                                                </div>
                                                {hostId != null && String(participant.userId) === String(hostId) && (
                                                    <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
                                                        <CrownIcon className="w-2.5 h-2.5" />
                                                        Meeting Host
                                                    </span>
                                                )}
                                            </div>
                                            <div className="shrink-0 flex items-center justify-end">
                                                <ParticipantMicIndicator
                                                    audioEnabled={participant.audioEnabled !== false}
                                                    className={showHostActions ? 'hidden sm:flex sm:group-hover:hidden' : ''}
                                                />
                                                {showHostActions && (
                                                    <div
                                                        className="flex sm:hidden sm:group-hover:flex items-center gap-1 sm:gap-0.5 rounded-full chat-participant-actions chat-surface px-1.5 py-1 sm:px-1 sm:py-0.5 shadow-sm"
                                                        role="toolbar"
                                                        aria-label={`Host controls for ${participant.userName || 'participant'}`}
                                                    >
                                                        {participant.audioEnabled !== false && (
                                                            <button
                                                                type="button"
                                                                onClick={() => muteParticipant(participant.peerId, participant.userId)}
                                                                className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-1.5 rounded-full chat-text-muted chat-text chat-hover transition-colors"
                                                                title="Mute"
                                                                aria-label="Mute"
                                                            >
                                                                <MicOffIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                                                            </button>
                                                        )}
                                                        {participant.videoEnabled !== false && (
                                                            <button
                                                                type="button"
                                                                onClick={() => disableParticipantVideo(participant.peerId, participant.userId)}
                                                                className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-1.5 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                                                title="Turn off camera"
                                                                aria-label="Turn off camera"
                                                            >
                                                                <VideoCamOffIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => transferHost(participant.peerId, participant.userId)}
                                                            className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-1.5 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                                                            title="Make host"
                                                            aria-label="Make host"
                                                        >
                                                            <CrownIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeParticipant(participant.peerId, participant.userId)}
                                                            className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2.5 sm:p-1.5 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                                            title="Remove from call"
                                                            aria-label="Remove from call"
                                                        >
                                                            <TrashOutlineIcon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })
                                ) : (
                                    <p className="chat-text-muted text-sm">No participants yet</p>
                                )}
                            </div>
                        </div>
                        )}
                        {sidebarPanelContent === 'chat' && (
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <div className="chat-scroll flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 chat-surface">
                                {videoChatMessages?.length > 0 ? (
                                    videoChatMessages.map((msg) => {
                                        const isMine = currentUserId && String(msg.userId) === String(currentUserId);
                                        const senderName = isMine ? 'You' : msg.userName;

                                        return (
                                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm border ${
                                                        isMine
                                                            ? 'bg-blue-600 text-white border-blue-600/40'
                                                            : 'chat-control chat-text border-gray-300 dark:border-gray-600/40'
                                                    }`}
                                                >
                                                    <div className={`text-[10px] mb-1 opacity-80 ${isMine ? 'text-blue-100' : 'chat-text-muted'}`}>
                                                        {senderName}
                                                    </div>
                                                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="chat-text-muted text-sm">No messages yet</p>
                                )}

                                <div ref={chatMessagesEndRef} />
                            </div>

                            <div className="p-3 sm:p-4 chat-divider-t chat-chrome-alt">
                                <div className="flex gap-2 items-end">
                                    <textarea
                                        ref={chatTextareaRef}
                                        value={chatText}
                                        onChange={(e) => {
                                            setChatText(e.target.value);
                                            // Let React update the value first, then measure scrollHeight
                                            requestAnimationFrame(resizeVideoChatTextarea);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendVideoChat();
                                            }
                                        }}
                                        placeholder={isInRoom ? 'Type a message...' : 'Connecting...'}
                                        className="chat-scroll flex-1 p-2 rounded-lg chat-input-field resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                        rows={1}
                                        style={{
                                            minHeight: `${VIDEO_CHAT_TEXTAREA_MIN_HEIGHT}px`,
                                            maxHeight: `${VIDEO_CHAT_TEXTAREA_MAX_HEIGHT}px`,
                                            overflowY: 'auto',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSendVideoChat}
                                        disabled={!isInRoom || !String(chatText ?? '').trim()}
                                        className="p-2 rounded-lg chat-call-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                        title="Send message"
                                        aria-label="Send message"
                                    >
                                        <SendIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        )}
                        </div>
                    </div>
                </div>

                <nav
                    aria-label="Meeting panels"
                    className="relative z-40 flex h-full w-[5.75rem] shrink-0 flex-col gap-1 overflow-y-auto chat-surface chat-divider-l px-1.5 py-2"
                >
                    {isHost && (
                        <CallSidebarTab
                            id="call-sidebar-host"
                            label="Host"
                            icon={<CrownIcon className="w-5 h-5" />}
                            active={activeSidebarPanel === 'host'}
                            onClick={() => toggleSidebarSection('host')}
                            badge={(joinRequestedList?.length ?? 0) > 0 ? (
                                <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                                    {joinRequestedList.length}
                                </span>
                            ) : null}
                        />
                    )}
                    <CallSidebarTab
                        id="call-sidebar-participants"
                        label="Participants"
                        icon={<GroupIcon className="w-5 h-5" />}
                        active={activeSidebarPanel === 'participants'}
                        onClick={() => toggleSidebarSection('participants')}
                        badge={(allParticipants?.length ?? 0) > 0 ? (
                            <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0C79F7] px-1 text-[10px] text-white">
                                {allParticipants.length}
                            </span>
                        ) : null}
                    />
                    <CallSidebarTab
                        id="call-sidebar-chat"
                        label="Chat"
                        icon={<MessageIcon className="w-5 h-5" />}
                        active={activeSidebarPanel === 'chat'}
                        onClick={() => toggleSidebarSection('chat')}
                    />
                </nav>
            </aside>
            </div>

            {/* Bottom Controls */}
            <div className="shrink-0 chat-chrome-alt p-2 sm:p-4 flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                {/* {isHost && (
                    <button
                        onClick={endMeeting}
                        className="px-3 py-2 sm:py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium text-sm"
                        title="End meeting for everyone"
                    >
                        End meeting
                    </button>
                )} */}
                <button
                    type="button"
                    onClick={toggleVideo}
                    disabled={callControlsDisabled}
                    className={`p-2 sm:p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                        videoEnabled 
                            ? 'chat-call-media-on' 
                            : 'chat-call-media-off'
                    }`}
                    title={
                        callControlsDisabled
                            ? 'Reconnecting…'
                            : videoConnectivityDegraded && videoEnabled
                                ? 'Video paused due to low connectivity'
                                : (videoEnabled ? 'Turn Off Video' : 'Turn On Video')
                    }
                >
                    <VideoToggleIcon enabled={videoEnabled} />
                </button>
                <button
                    type="button"
                    onClick={toggleAudio}
                    disabled={callControlsDisabled}
                    className={`p-2 sm:p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                        audioEnabled 
                            ? 'chat-call-media-on' 
                            : 'chat-call-media-off'
                    }`}
                    title={
                        callControlsDisabled
                            ? 'Reconnecting…'
                            : mutedByHost
                                ? (audioEnabled ? 'Mute' : 'Muted by host')
                                : (audioEnabled ? 'Mute' : 'Unmute')
                    }
                >
                    <MicToggleIcon enabled={audioEnabled} />
                </button>
                <button
                    type="button"
                    onClick={toggleScreenShare}
                    disabled={callControlsDisabled}
                    className={`p-2 sm:p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                        screenShareEnabled 
                            ? 'chat-call-btn-primary' 
                            : 'chat-call-btn-muted'
                    }`}
                    title={callControlsDisabled ? 'Reconnecting…' : 'Share Screen'}
                >
                    <ScreenShareIcon />
                </button>
                <button
                    type="button"
                    onClick={toggleHandRaise}
                    disabled={callControlsDisabled}
                    className={`p-2 sm:p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                        handRaised
                            ? 'chat-call-btn-active-yellow'
                            : 'chat-call-media-on'
                    }`}
                    title={callControlsDisabled ? 'Reconnecting…' : (handRaised ? 'Lower hand' : 'Raise hand')}
                    aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
                >
                    <RaisedHandIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                {/* Call options (More) */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowCallOptionsMenu((v) => !v);
                            setShowVirtualBgMenu(false);
                        }}
                        className="w-8 h-10 sm:w-8 sm:h-12 grid place-items-center rounded-2xl chat-call-btn-muted"
                        title="More options"
                    >
                        <MoreVerticalIcon />
                    </button>

                    {showCallOptionsMenu && (
                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-72 chat-fullscreen border chat-border rounded-xl shadow-xl p-2 z-50">
                            {/* {isHost && (
                                <button
                                    onClick={() => {
                                        setShowCallOptionsMenu(false);
                                        isRecording ? stopRecording?.() : startRecording?.();
                                    }}
                                    disabled={callControlsDisabled || isTogglingRecording}
                                    className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium chat-text chat-hover disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    <RecordIcon
                                        className={`w-5 h-5 flex-shrink-0 ${
                                            isRecording ? 'text-red-600 dark:text-red-400' : 'chat-text-secondary'
                                        }`}
                                    />
                                    <span className={isRecording ? 'text-red-600 dark:text-red-400' : ''}>
                                        {callControlsDisabled
                                            ? 'Reconnecting…'
                                            : isTogglingRecording
                                                ? (isRecording ? 'Stopping…' : 'Starting…')
                                                : (isRecording ? 'Stop recording' : 'Start recording')}
                                    </span>
                                </button>
                            )} */}
                            <button
                                onClick={() => {
                                    setShowCallOptionsMenu(false);
                                    setShowVirtualBgMenu(true);
                                }}
                                disabled={!canUseVirtualBackground || typeof applyVirtualBackground !== 'function'}
                                className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium chat-text chat-hover disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <BackgroundEffectsIcon />
                                <span>Background Effects</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowCallOptionsMenu(false);
                                    handleToggleCallFullscreen();
                                }}
                                className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium chat-text chat-hover"
                            >
                                <FullscreenLayoutIcon />
                                <span>{callFullscreen ? 'Exit full screen' : 'Full screen'}</span>
                            </button>
                        </div>
                    )}

                    {showVirtualBgMenu && (
                        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-72 sm:w-80 chat-fullscreen border chat-border rounded-xl shadow-xl p-3 z-50">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold chat-text">Background Effects</p>
                                <button
                                    onClick={() => setShowVirtualBgMenu(false)}
                                    className="chat-text-muted chat-text-secondary"
                                    title="Close"
                                >
                                    <CloseFilledIcon />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <button
                                    onClick={() => applyVirtualBackground({ mode: 'none' })}
                                    className={`px-2 py-2 rounded-lg text-xs font-semibold border ${
                                        vbMode === 'none'
                                            ? 'chat-call-btn-primary border-transparent'
                                            : 'bg-transparent chat-text border chat-border chat-hover'
                                    }`}
                                >
                                    None
                                </button>
                                <button
                                    onClick={() => applyVirtualBackground({ mode: 'blur', blur: vbBlur })}
                                    className={`px-2 py-2 rounded-lg text-xs font-semibold border ${
                                        vbMode === 'blur'
                                            ? 'chat-call-btn-primary border-transparent'
                                            : 'bg-transparent chat-text border chat-border chat-hover'
                                    }`}
                                >
                                    Blur
                                </button>
                                <button
                                    onClick={() => applyVirtualBackground({ mode: 'color', color: vbColor })}
                                    className={`px-2 py-2 rounded-lg text-xs font-semibold border ${
                                        vbMode === 'color'
                                            ? 'chat-call-btn-primary border-transparent'
                                            : 'bg-transparent chat-text border chat-border chat-hover'
                                    }`}
                                >
                                    Color
                                </button>
                            </div>

                            {vbMode === 'blur' && (
                                <div className="mb-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-medium chat-text-secondary">Blur intensity</p>
                                        <p className="text-xs chat-text-muted">{Math.round(vbBlur)}</p>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={20}
                                        step={1}
                                        value={vbBlur}
                                        onChange={(e) => {
                                            const next = Number(e.target.value);
                                            applyVirtualBackground({ mode: 'blur', blur: next });
                                        }}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {vbMode === 'color' && (
                                <div>
                                    <p className="text-xs font-medium chat-text-secondary mb-2">Background color</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {[
                                            { hex: '#2196f3', name: 'Light Blue' }, // library DEFAULT_BG_COLOR
                                            { hex: '#000000', name: 'Black' },
                                            { hex: '#8c95a3', name: 'Gray' },
                                            { hex: '#0f766e', name: 'Teal' },
                                            { hex: '#1d4ed8', name: 'Blue' },
                                            { hex: '#7c3aed', name: 'Violet' },
                                            { hex: '#b91c1c', name: 'Red' },
                                        ].map(({ hex, name }) => (
                                            <button
                                                key={hex}
                                                onClick={() => applyVirtualBackground({ mode: 'color', color: hex })}
                                                className={`w-7 h-7 rounded-full border ${
                                                    vbColor === hex
                                                        ? 'border-blue-500 ring-2 ring-blue-500'
                                                        : 'border-gray-300 dark:border-gray-700'
                                                }`}
                                                style={{ backgroundColor: hex }}
                                                title={name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleLeave}
                    className="px-4 sm:px-5 py-2 sm:py-3 rounded-full chat-call-btn-danger"
                    title="Leave Meeting"
                >
                    <LeaveCallIcon />
                </button>
                {/* <button
                    className="p-3 rounded-full chat-control chat-text chat-control"
                    title="Settings"
                >
                    <SettingsIcon />
                </button> */}
            </div>

            {showInviteModal && (
                <InviteToCallModal
                    open={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    onInvite={handleInviteToCall}
                    inviting={invitingToCall}
                    excludeIds={[
                        ...allParticipants.map((p) => p.userId),
                        ...invitees
                            .filter((inv) => inv.status === 'ringing' || inv.status === 'busy' || inv.status === 'accepted')
                            .map((inv) => inv.userId),
                    ]}
                />
            )}
        </div>
    );
};

VideoCallScreen.propTypes = {
    roomId: PropTypes.string,
    onLeave: PropTypes.func,
    withVideo: PropTypes.bool,
    withAudio: PropTypes.bool,
};

export default VideoCallScreen;

