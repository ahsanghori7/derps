import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useVideoCall } from '@features/chat/shared/hooks';
import { isOnCallPage } from '@features/chat/shared/utils/chatUtility';

const VideoCallContext = createContext(null);

/**
 * When user is on another screen (not /home/call or /join), keeps playing remote call audio via hidden elements.
 * VideoCallScreen's audio elements unmount when navigating away; this keeps audio alive.
 */
function PersistentRemoteAudio() {
    const location = useLocation();
    const { activeCall, remoteStreams } = useVideoCallState();
    const audioRefs = useRef(new Map());

    const isOnCallScreen = isOnCallPage(location.pathname);
    const streams = remoteStreams ?? new Map();

    useEffect(() => {
        if (!activeCall || isOnCallScreen) return;

        const currentPeerIds = new Set(streams.keys());
        streams.forEach((remoteData, peerId) => {
            if (remoteData.screenShare || !remoteData.stream) return;
            const audioTracks = remoteData.stream.getAudioTracks();
            if (audioTracks.length === 0) return;

            let el = audioRefs.current.get(peerId);
            if (!el) {
                el = document.createElement('audio');
                el.autoplay = true;
                el.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none;';
                document.body.appendChild(el);
                audioRefs.current.set(peerId, el);
            }
            const newStream = new MediaStream(audioTracks);
            if (el.srcObject !== newStream) {
                el.srcObject = newStream;
                el.play().catch(() => {});
            }
        });

        audioRefs.current.forEach((el, peerId) => {
            if (!currentPeerIds.has(peerId)) {
                el.srcObject = null;
                if (el.parentNode) el.parentNode.removeChild(el);
                audioRefs.current.delete(peerId);
            }
        });
    // streams is derived from remoteStreams; avoid listing it to prevent extra effect runs when remoteStreams is undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCall, isOnCallScreen, remoteStreams]);

    return null;
}

export const useVideoCallState = () => {
    const context = useContext(VideoCallContext);
    if (!context) {
        throw new Error('useVideoCallState must be used within VideoCallProvider');
    }
    return context;
};

/**
 * Always wraps children so the tree structure never changes.
 * When activeCall is set, runs useVideoCall and provides merged context; otherwise no-ops (hook gets null roomId).
 * This prevents Call (and other children) from unmounting when activeCall is set, which would reset their state.
 */
function VideoCallConnection({ activeCall, baseValue, currentUserId, currentUserName, children }) {
    const roomId = activeCall?.roomId ?? null;
    const withVideo = activeCall?.withVideo ?? true;
    const withAudio = activeCall?.withAudio ?? true;
    const roomData = activeCall?.roomData ?? null;
    const recvOnly = activeCall?.recvOnly ?? false;
    const callState = useVideoCall(roomId, withVideo, withAudio, currentUserId, currentUserName, roomData, recvOnly);
    const mergedValue = { ...baseValue, ...callState };
    return (
        <VideoCallContext.Provider value={mergedValue}>
            <PersistentRemoteAudio />
            {children}
        </VideoCallContext.Provider>
    );
}

VideoCallConnection.propTypes = {
    activeCall: PropTypes.shape({
        roomId: PropTypes.string.isRequired,
        withVideo: PropTypes.bool,
        withAudio: PropTypes.bool,
        roomData: PropTypes.object,
        recvOnly: PropTypes.bool,
    }),
    baseValue: PropTypes.object.isRequired,
    currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currentUserName: PropTypes.string,
    children: PropTypes.node.isRequired
};

export const VideoCallProvider = ({ children }) => {
    const [activeCall, setActiveCall] = useState(null); // { roomId, withVideo, withAudio }
    const currentUser = useSelector((state) => state.userData?.userDetails);
    const guestInfo = JSON.parse(localStorage.getItem('guestInfo') || '{}');
    const currentUserId = useSelector((state) => state.userData?.userDetails?.id) || guestInfo?.guestId;

    const firstNonEmptyString = (...values) => {
        for (const value of values) {
            if (typeof value !== 'string') continue;
            const trimmed = value.trim();
            if (trimmed.length > 0) return trimmed;
        }
        return '';
    };

    const currentUserName = firstNonEmptyString(currentUser?.name, guestInfo?.displayName, currentUser?.username);

    const setActiveVideoCall = useCallback((roomId, withVideo = true, withAudio = true, roomData = null, recvOnly = false) => {
        setActiveCall({ roomId, withVideo, withAudio, roomData, recvOnly });
    }, []);

    const clearActiveVideoCall = useCallback(() => {
        setActiveCall(null);
    }, []);

    const baseValue = {
        activeCall,
        setActiveVideoCall,
        clearActiveVideoCall
    };

    return (
        <VideoCallContext.Provider value={baseValue}>
            <VideoCallConnection activeCall={activeCall} baseValue={baseValue} currentUserId={currentUserId} currentUserName={currentUserName}>
                {children}
            </VideoCallConnection>
        </VideoCallContext.Provider>
    );
};

VideoCallProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
