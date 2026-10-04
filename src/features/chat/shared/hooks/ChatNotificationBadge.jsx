import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSocket } from '@contexts/SocketContext';
import { subscribeToChatsSnapshot, updateChatUnreadCount } from '@stores/chatStore';
import { isOnChatPage } from '../utils/chatUtility';

const CHAT_UNREAD_STORAGE_KEY = 'chat_has_unread_messages';

/**
 * Custom hook to manage chat notification badge state
 * Returns { hasUnreadMessages, clearBadge }
 */
export const useChatNotification = () => {
    const location = useLocation();
    const userData = useSelector((state) => state.userData.userDetails);
    const token = useSelector((state) => state.auth.accessToken) || localStorage.getItem('accessToken');
    const { socket, isConnected } = useSocket();
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Seed from localStorage on mount (so badge can show before chats are loaded)
    useEffect(() => {
        const storedUnread = localStorage.getItem(CHAT_UNREAD_STORAGE_KEY);
        if (storedUnread === 'true') {
            setHasUnreadMessages(true);
        } else {
            setHasUnreadMessages(false);
        }
    }, []);

  // Subscribe to shared chat list data (published by ChatList) and derive unread badge.
  useEffect(() => {
    return subscribeToChatsSnapshot((chats) => {
      const hasUnread =
        Array.isArray(chats) &&
        chats.some((chat) => {
          const unreadCount =
            chat?.unreadCount !== undefined && chat?.unreadCount !== null ? chat.unreadCount : 0;
          return unreadCount > 0;
        });

      setHasUnreadMessages(!!hasUnread);
      localStorage.setItem(CHAT_UNREAD_STORAGE_KEY, hasUnread ? 'true' : 'false');
    });
  }, []);

    // Listen for new messages via socket for real-time updates
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewNotification = (notification) => {
            if (!notification) return;

            // Check if notification is about a new message
            const notificationContent = (notification.body || notification.title || '').toLowerCase();
            const isNewMessageNotification = notificationContent.includes('a new message');
            
            if (!isNewMessageNotification) return;

            // Get current path at the time of notification
            const isOnChatPageNow = isOnChatPage(location.pathname);
            
            // Extract actor ID to check if notification is from current user
            const actorId = notification.actorId;
            const isNotificationFromCurrentUser = actorId && userData?.id && 
                                                  (String(actorId) === String(userData.id));
            
            // Set badge if not on chat page and not from current user
            if (!isOnChatPageNow && !isNotificationFromCurrentUser) {
                setHasUnreadMessages(true);
                localStorage.setItem(CHAT_UNREAD_STORAGE_KEY, 'true');
            }
        };

        const handleNewMessage = (data) => {
            if (!data || !data.message) return;

            // Get current path at the time of message
            const isOnChatPageNow = isOnChatPage(location.pathname);
            
            // Check if message is from current user
            const messageUserId = data.message.userId || data.message.user?.id;
            const isMessageFromCurrentUser = messageUserId && userData?.id && 
                                            (String(messageUserId) === String(userData.id));
            
            // Set badge if not on chat page and not from current user
            if (!isOnChatPageNow && !isMessageFromCurrentUser) {
                setHasUnreadMessages(true);
                localStorage.setItem(CHAT_UNREAD_STORAGE_KEY, 'true');
            }
        };

        const handleChatMarkedAsRead = async (data) => {
      // Keep shared store in sync without refetching chats
      if (!data?.chatId) return;
      updateChatUnreadCount(data.chatId, 0);
        };

        socket.on('notification:new', handleNewNotification);
        socket.on('message:new', handleNewMessage);
        socket.on('chat:markedAsRead', handleChatMarkedAsRead);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('message:new', handleNewMessage);
            socket.off('chat:markedAsRead', handleChatMarkedAsRead);
        };
  }, [socket, isConnected, location.pathname, userData?.id, token]);

    // Expose method to clear badge when Chat menu item is clicked
    // This should also check for unread messages before clearing
    const clearBadge = useCallback(async () => {
    // Without an API call, best-effort clear: if user navigated to chat,
    // we optimistically clear badge; store subscription will re-set if needed.
    if (isOnChatPage(location.pathname)) {
      setHasUnreadMessages(false);
      localStorage.setItem(CHAT_UNREAD_STORAGE_KEY, 'false');
    }
  }, [location.pathname]);

    return { hasUnreadMessages, clearBadge };
};

