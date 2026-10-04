import { useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useSocket } from "./SocketContext";
import { getChats } from "../Api/chatApi";
import {
  getChatsSnapshot,
  isChatsStale,
  setChatsSnapshot,
  upsertChatFromNewMessage,
  markChatReadInStore,
  updateChatDetailsInStore,
  setChatStoreCurrentUserId,
  clearChatStore,
  subscribeToChatsSnapshot,
} from "../Stores/chatStore";
import {
  appendMessage,
  applyMemberRead,
  applyReactionUpdate,
  dispatchActiveChatMessage,
  clearMessageStore,
} from "../Stores/messageStore";
import { canAccessChat } from "../Utils/moduleAccess";

const CHAT_LIST_LIMIT = 10;
const RELOAD_DEBOUNCE_MS = 500;

function isChatMessageNotification(notification) {
  const title = (notification?.title || "").toLowerCase();
  const body = (notification?.body || "").toLowerCase();
  return (
    title.includes("new chat message") ||
    body.includes("new message") ||
    body.includes("send you a new message") ||
    body.includes("sent you a message")
  );
}

function messagePayloadFromNotification(notification) {
  const meta = notification?.meta;
  const chatId = meta?.chatId;
  if (chatId == null) return null;

  const fromUserId = meta.userId ?? meta.user?.id ?? null;
  return {
    chatId,
    fromUserId,
    data: {
      chatId,
      message: {
        id: meta.id,
        content: meta.content,
        type: meta.type || "text",
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
        userId: fromUserId,
        user: meta.user,
        attachments: meta.attachments || [],
        replyToMessageId: meta.replyToMessageId ?? null,
        isEdited: meta.isEdited,
        isDeleted: meta.isDeleted,
      },
    },
  };
}

/**
 * App-level socket sync: keeps chat/message stores fresh while off the chat route.
 * Mount once inside SocketProvider.
 */
export function ChatSocketSync() {
  const { socket, isConnected } = useSocket();
  const token =
    useSelector((state) => state.auth.accessToken) ||
  (typeof window !== "undefined" ? localStorage.getItem("accessToken") : null);
  const currentUser = useSelector((state) => state.userData?.userDetails);
  const roleTitle = useSelector((state) => state.userData?.userDetails?.roleTitle);
  const scopes = useSelector((state) => state.auth?.scopes ?? []);
  const tenantFeatures = useSelector((state) => state.auth?.tenantFeatures ?? []);

  const hasChatAccess = useMemo(
    () => canAccessChat({ tenantFeatures, scopes, roleTitle }),
    [tenantFeatures, scopes, roleTitle]
  );

  const joinedRoomsRef = useRef(new Set());
  const reloadTimeoutRef = useRef(null);

  useEffect(() => {
    setChatStoreCurrentUserId(currentUser?.id ?? null);
  }, [currentUser?.id]);

  const reloadChatsFromApi = useCallback(async () => {
    if (!token || !hasChatAccess) return;
    try {
      const response = await getChats(token, 1, CHAT_LIST_LIMIT, "");
      if (response?.data) {
        const normalized = response.data.map((chat) => ({
          ...chat,
          lastMessageAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt,
          unreadCount:
            chat.unreadCount !== undefined ? chat.unreadCount : null,
        }));
        setChatsSnapshot(normalized, {
          page: 1,
          hasMore: normalized.length >= CHAT_LIST_LIMIT,
          touchFetchedAt: true,
        });
      }
    } catch (_) {
      // silent background refresh
    }
  }, [token, hasChatAccess]);

  const scheduleReloadForUnknownChat = useCallback(() => {
    if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    reloadTimeoutRef.current = setTimeout(() => {
      reloadChatsFromApi();
    }, RELOAD_DEBOUNCE_MS);
  }, [reloadChatsFromApi]);

  // Join socket rooms for known chats (persist across route changes)
  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    const joinNewRooms = (chats) => {
      if (!Array.isArray(chats)) return;
      for (const chat of chats) {
        if (chat?.id == null) continue;
        const key = String(chat.id);
        if (joinedRoomsRef.current.has(key)) continue;
        socket.emit("chat:join", chat.id);
        joinedRoomsRef.current.add(key);
      }
    };

    joinNewRooms(getChatsSnapshot());
    return subscribeToChatsSnapshot(joinNewRooms);
  }, [socket, isConnected]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return undefined;

    const handleNewMessage = (data) => {
      console.log("message:new", data);
      if (!data?.chatId) return;

      const known = upsertChatFromNewMessage(data);

      const incoming = data.message;
      if (incoming) {
        const handledByActiveChat = dispatchActiveChatMessage(data);
        if (!handledByActiveChat) {
          appendMessage(data.chatId, incoming);
        }
      }

      if (!known) {
        scheduleReloadForUnknownChat();
      }
    };

    // User-scoped fallback: message:new only arrives after chat:join.
    // Notifications still fire when rooms aren't joined (and for unknown chats).
    const handleNewNotification = (notification) => {
      console.log("notification:new", notification);
      if (!isChatMessageNotification(notification)) return;

      const parsed = messagePayloadFromNotification(notification);
      if (!parsed) return;

      const { chatId, fromUserId, data } = parsed;
      if (
        fromUserId != null &&
        currentUser?.id != null &&
        String(fromUserId) === String(currentUser.id)
      ) {
        return;
      }

      // Update list preview when chat is known; message-id dedupe avoids double unread
      // if message:new also fires. Reload when chat isn't in the cached list yet.
      const known = upsertChatFromNewMessage(data);
      const incoming = data.message;
      if (incoming) {
        const handledByActiveChat = dispatchActiveChatMessage(data);
        if (!handledByActiveChat) {
          appendMessage(chatId, incoming);
        }
      }

      if (!known) {
        scheduleReloadForUnknownChat();
      }
    };

    const handleMarkedAsRead = (data) => {
      if (!data?.chatId) return;
      markChatReadInStore(data.chatId, data.lastReadAt);
    };

    const handleGroupUpdated = (data) => {
      if (data?.chat) {
        updateChatDetailsInStore(data.chat);
      }
    };

    const handleMemberRead = (data) => {
      if (!data?.chatId) return;
      applyMemberRead(data.chatId, data);
    };

    const handleMessageReaction = (data) => {
      if (!data?.chatId || data.messageId == null) return;
      applyReactionUpdate(data.chatId, data);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("notification:new", handleNewNotification);
    socket.on("chat:markedAsRead", handleMarkedAsRead);
    socket.on("group:updated", handleGroupUpdated);
    socket.on("chat:updated", handleGroupUpdated);
    socket.on("chat:memberRead", handleMemberRead);
    socket.on("message:reaction", handleMessageReaction);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("notification:new", handleNewNotification);
      socket.off("chat:markedAsRead", handleMarkedAsRead);
      socket.off("group:updated", handleGroupUpdated);
      socket.off("chat:updated", handleGroupUpdated);
      socket.off("chat:memberRead", handleMemberRead);
      socket.off("message:reaction", handleMessageReaction);
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [socket, isConnected, scheduleReloadForUnknownChat, currentUser?.id]);

  // Soft refetch on reconnect when cache is stale (only if chat is allowed)
  useEffect(() => {
    if (!isConnected || !token || !hasChatAccess) return;
    if (isChatsStale()) {
      reloadChatsFromApi();
    }
  }, [isConnected, token, hasChatAccess, reloadChatsFromApi]);

  // Clear stores on logout (token removed) or when chat access is revoked
  useEffect(() => {
    if (!token || !hasChatAccess) {
      clearChatStore();
      clearMessageStore();
      joinedRoomsRef.current.clear();
    }
  }, [token, hasChatAccess]);

  return null;
}
