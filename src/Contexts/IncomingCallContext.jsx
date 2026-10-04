import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSocket } from './SocketContext';
import { useRingtone } from '../features/chat/calls/useRingtone';

const IncomingCallContext = createContext(null);

export const useIncomingCall = () => {
    const context = useContext(IncomingCallContext);
    if (!context) {
        throw new Error('useIncomingCall must be used within IncomingCallProvider');
    }
    return context;
};

/**
 * Global "Teams-style" ringing state: listens for video:incomingCall regardless
 * of the current route, queues concurrent rings (rendered one at a time, oldest
 * first), and drives the ringtone. Deliberately separate from VideoCallContext —
 * this is a pre-join notification concern, not a media-session concern.
 */
export const IncomingCallProvider = ({ children }) => {
    const [incomingCalls, setIncomingCalls] = useState([]);
    const { socket } = useSocket();
    const navigate = useNavigate();
    const { start: startRingtone, stop: stopRingtone } = useRingtone();

    const incomingCallsRef = useRef([]);
    const acceptedByMeRef = useRef(new Set());
    const timeoutsRef = useRef(new Map());

    useEffect(() => {
        incomingCallsRef.current = incomingCalls;
    }, [incomingCalls]);

    const clearExpiryTimer = useCallback((callId) => {
        const timeoutId = timeoutsRef.current.get(callId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutsRef.current.delete(callId);
        }
    }, []);

    const removeCall = useCallback((callId) => {
        clearExpiryTimer(callId);
        setIncomingCalls((prev) => prev.filter((c) => c.callId !== callId));
    }, [clearExpiryTimer]);

    const scheduleExpiry = useCallback((callId, expiresAt) => {
        clearExpiryTimer(callId);
        const msRemaining = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;
        // Client-side safety net only — never emits anything. The server's
        // video:call:missed event is authoritative; this just cleans up the UI
        // if that event is lost or delayed.
        const timeoutId = setTimeout(() => removeCall(callId), Math.max(msRemaining, 0));
        timeoutsRef.current.set(callId, timeoutId);
    }, [clearExpiryTimer, removeCall]);

    // Guests never start/answer these calls; the provider tree already excludes
    // guest sessions structurally (see AppRouter), this is a defensive no-op.
    const isGuestSession = useCallback(() => {
        try {
            const guestInfo = JSON.parse(localStorage.getItem('guestInfo') || '{}');
            return Boolean(guestInfo?.guestId);
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        if (!socket || isGuestSession()) return undefined;

        const handleIncomingCall = (payload) => {
            if (!payload?.callId) return;
            setIncomingCalls((prev) => {
                if (prev.some((c) => c.callId === payload.callId)) return prev;
                return [...prev, { ...payload, receivedAt: Date.now() }];
            });
            scheduleExpiry(payload.callId, payload.expiresAt);
        };

        const handleResolved = (payload) => {
            if (!payload?.callId) return;
            removeCall(payload.callId);
        };

        const handleCancelled = (payload) => {
            if (!payload?.callId) return;
            if (payload.reason === 'accepted_on_another_device' && acceptedByMeRef.current.has(payload.callId)) {
                // This device is the one that accepted — it already left the
                // ringing state via acceptCall, ignore the echo.
                return;
            }
            removeCall(payload.callId);
        };

        socket.on('video:incomingCall', handleIncomingCall);
        socket.on('video:call:accepted', handleResolved);
        socket.on('video:call:declined', handleResolved);
        socket.on('video:call:missed', handleResolved);
        socket.on('video:call:cancelled', handleCancelled);

        return () => {
            socket.off('video:incomingCall', handleIncomingCall);
            socket.off('video:call:accepted', handleResolved);
            socket.off('video:call:declined', handleResolved);
            socket.off('video:call:missed', handleResolved);
            socket.off('video:call:cancelled', handleCancelled);
        };
    }, [socket, isGuestSession, scheduleExpiry, removeCall]);

    const currentIncomingCall = incomingCalls[0] ?? null;

    useEffect(() => {
        if (currentIncomingCall) {
            startRingtone();
        } else {
            stopRingtone();
        }
    }, [currentIncomingCall?.callId, startRingtone, stopRingtone]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => stopRingtone(), [stopRingtone]);

    const acceptCall = useCallback((callId) => {
        const call = incomingCallsRef.current.find((c) => c.callId === callId);
        if (!call) return Promise.resolve();

        acceptedByMeRef.current.add(callId);
        clearExpiryTimer(callId);

        if (!socket) {
            toast.error('Not connected. Please check your internet connection.');
            removeCall(callId);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            socket.emit('video:call:accept', { callId }, (ack) => {
                if (!ack?.success) {
                    toast.error(ack?.error || 'Could not join the call');
                    removeCall(callId);
                    resolve();
                    return;
                }
                removeCall(callId);
                // const withVideo = call.withVideo ? 'true' : 'false';
                navigate(`/join/?meeting=${encodeURIComponent(ack.roomId)}&autoJoin=true&video=false&audio=false`);
                resolve();
            });
        });
    }, [socket, navigate, removeCall, clearExpiryTimer]);

    const declineCall = useCallback((callId) => {
        clearExpiryTimer(callId);

        if (!socket) {
            removeCall(callId);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            socket.emit('video:call:decline', { callId }, (ack) => {
                if (!ack?.success) {
                    toast.error(ack?.error || 'Could not decline the call');
                }
                removeCall(callId);
                resolve();
            });
        });
    }, [socket, removeCall, clearExpiryTimer]);

    const value = {
        incomingCalls,
        currentIncomingCall,
        acceptCall,
        declineCall,
    };

    return (
        <IncomingCallContext.Provider value={value}>
            {children}
        </IncomingCallContext.Provider>
    );
};

IncomingCallProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
