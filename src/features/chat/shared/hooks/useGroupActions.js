import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { muteGroupChat, leaveGroup } from '../../api/chatApi';
import { getErrorMessage } from '@utils/errorHandler';
import { isChatMutedForUser } from '../utils/chatUtility';

/**
 * Mute/leave actions for a group chat, shared between the Group Info panel
 * and the chat header's quick-actions menu so both stay in sync without
 * duplicating the API calls.
 *
 * `chat` only needs `id` and `members` (either the chat list/header's `chat`
 * prop or Group Info's own `chatDetails` both satisfy this). On success the
 * member's `isMuted` is patched in place (no refetch needed) and handed to
 * `onUpdated`; a successful leave is handed to `onLeft`.
 */
export const useGroupActions = (chat, token, currentUserId, { onUpdated, onLeft } = {}) => {
    const [isMuting, setIsMuting] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const isMuted = isChatMutedForUser(chat, currentUserId);

    const toggleMute = useCallback(async () => {
        if (!chat?.id || isMuting) return;
        const nextMuted = !isMuted;
        setIsMuting(true);
        try {
            await muteGroupChat(token, chat.id, nextMuted);
            toast.success(nextMuted ? 'Notifications muted' : 'Notifications unmuted');
            const updatedMembers = (chat.members || []).map((m) =>
                String(m.userId) === String(currentUserId) ? { ...m, isMuted: nextMuted } : m
            );
            onUpdated?.({ ...chat, members: updatedMembers });
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error updating notification settings'));
        } finally {
            setIsMuting(false);
        }
    }, [chat, token, currentUserId, isMuted, isMuting, onUpdated]);

    const leaveGroupChat = useCallback(async () => {
        if (!chat?.id || isLeaving) return;
        setIsLeaving(true);
        try {
            await leaveGroup(token, chat.id);
            toast.success('You left the group');
            onLeft?.(chat.id);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error leaving group'));
        } finally {
            setIsLeaving(false);
        }
    }, [chat, token, isLeaving, onLeft]);

    return { isMuted, isMuting, toggleMute, isLeaving, leaveGroupChat };
};

export default useGroupActions;
