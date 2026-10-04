import { useEffect, useMemo, useState } from 'react';
import { useIncomingCall } from '../../../Contexts/IncomingCallContext';
import { useVideoCallState } from '../../../Contexts/VideoCallContext';
import { findChatByIdInStore } from '../../../Stores/chatStore';
import { getUserStatusStyle } from '../shared/utils/chatUtility';
import { Avatar } from '../shared/components';
import { PhoneIcon, PhoneOffIcon } from '../shared/icons';
import { ChatThemeRoot } from '../shared/theme';

const RING_TOTAL_MS = 30000;

/**
 * Teams-style incoming-call banner, always mounted (see AppRouter) so it shows
 * regardless of the current route. Reads the front of IncomingCallContext's
 * ring queue and renders Accept/Decline; if the user is already on a call,
 * Accept first asks to confirm switching before actually accepting.
 */
const IncomingCallBanner = () => {
    const { currentIncomingCall, acceptCall, declineCall } = useIncomingCall();
    const { activeCall } = useVideoCallState();
    const [now, setNow] = useState(Date.now());
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [confirmSwitch, setConfirmSwitch] = useState(false);

    const callId = currentIncomingCall?.callId;

    useEffect(() => {
        setAccepting(false);
        setDeclining(false);
        setConfirmSwitch(false);
    }, [callId]);

    useEffect(() => {
        if (!callId) return undefined;
        const interval = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(interval);
    }, [callId]);

    const msRemaining = useMemo(() => {
        if (!currentIncomingCall?.expiresAt) return null;
        return Math.max(0, new Date(currentIncomingCall.expiresAt).getTime() - now);
    }, [currentIncomingCall, now]);

    if (!currentIncomingCall) return null;

    const { caller, chatId, withVideo, busy } = currentIncomingCall;
    const chat = chatId ? findChatByIdInStore(chatId) : null;
    const title = chat?.name ? `Incoming call in ${chat.name}` : 'Incoming call';
    const busyStyle = getUserStatusStyle('busy');
    const progressPct = msRemaining != null ? Math.min(100, (msRemaining / RING_TOTAL_MS) * 100) : 100;

    const doAccept = async () => {
        setAccepting(true);
        try {
            await acceptCall(callId);
        } finally {
            setAccepting(false);
        }
    };

    const handleAcceptClick = () => {
        if (activeCall) {
            setConfirmSwitch(true);
            return;
        }
        doAccept();
    };

    const handleDecline = async () => {
        setDeclining(true);
        try {
            await declineCall(callId);
        } finally {
            setDeclining(false);
        }
    };

    return (
        <ChatThemeRoot
            className="fixed top-20 right-4 chat-surface rounded-lg shadow-xl chat-border border w-80 p-4"
            style={{ zIndex: 2100 }}
        >
            {confirmSwitch ? (
                <div>
                    <p className="chat-text text-sm font-medium mb-3">
                        You&apos;re already on a call — switch to this one?
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmSwitch(false)}
                            className="px-3 py-1.5 text-sm chat-text-secondary chat-hover rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmSwitch(false);
                                doAccept();
                            }}
                            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            Switch
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar id={caller?.id} name={caller?.name} user={caller} size="lg" />
                        <div className="min-w-0 flex-1">
                            <p className="chat-text font-semibold truncate">{title}</p>
                            <p className="chat-text-muted text-sm truncate">
                                {caller?.name || 'Unknown caller'} · {withVideo ? 'Video call' : 'Audio call'}
                            </p>
                        </div>
                    </div>

                    {busy && (
                        <div className="flex items-center gap-1.5 mb-3">
                            <span className={`w-2 h-2 rounded-full ${busyStyle.dot}`} />
                            <span className={`text-xs ${busyStyle.text}`}>{busyStyle.label}</span>
                        </div>
                    )}

                    <div className="mb-3">
                        <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-200 ease-linear"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleDecline}
                            disabled={declining || accepting}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-400 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                            <PhoneOffIcon className="w-4 h-4" />
                            Decline
                        </button>
                        <button
                            type="button"
                            onClick={handleAcceptClick}
                            disabled={declining || accepting}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                        >
                            <PhoneIcon className="w-4 h-4" />
                            Accept
                        </button>
                    </div>
                </>
            )}
        </ChatThemeRoot>
    );
};

export default IncomingCallBanner;
