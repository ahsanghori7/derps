// Session-level in-memory store for chat list data.
// Survives route changes; updated by ChatSocketSync and ChatList.

export const CHATS_STALE_MS = 90_000;

let listState = {
  chats: [],
  page: 1,
  hasMore: true,
  fetchedAt: null,
};

let activeChatId = null;
let currentUserId = null;
let searchKeyword = "";
const listeners = new Set();

function emit() {
  for (const l of listeners) {
    try {
      l(listState.chats);
    } catch (_) {
      // ignore listener errors
    }
  }
}

function normalizeChatId(chatId) {
  if (chatId === undefined || chatId === null) return null;
  const n = typeof chatId === "string" ? parseInt(chatId, 10) : chatId;
  return Number.isFinite(n) ? n : chatId;
}

function chatIdsMatch(a, b) {
  return String(normalizeChatId(a)) === String(normalizeChatId(b));
}

export function getChatsSnapshot() {
  return listState.chats;
}

export function getChatListMeta() {
  return {
    page: listState.page,
    hasMore: listState.hasMore,
    fetchedAt: listState.fetchedAt,
  };
}

export function isChatsStale() {
  if (!listState.fetchedAt || listState.chats.length === 0) return true;
  return Date.now() - listState.fetchedAt > CHATS_STALE_MS;
}

export function setChatsSnapshot(nextChats, meta = {}) {
  listState.chats = Array.isArray(nextChats) ? nextChats : [];
  if (meta.page !== undefined) listState.page = meta.page;
  if (meta.hasMore !== undefined) listState.hasMore = meta.hasMore;
  if (meta.touchFetchedAt !== false) {
    listState.fetchedAt = Date.now();
  }
  emit();
}

export function findChatByIdInStore(chatId) {
  if (chatId == null) return null;
  return (
    listState.chats.find((c) => chatIdsMatch(c?.id, chatId)) || null
  );
}

export function setActiveChatId(chatId) {
  activeChatId = chatId != null ? chatId : null;
}

export function getActiveChatId() {
  return activeChatId;
}

export function setChatStoreCurrentUserId(userId) {
  currentUserId = userId != null ? userId : null;
}

export function getChatSearchKeyword() {
  return searchKeyword;
}

export function setChatSearchKeyword(keyword) {
  searchKeyword = keyword || "";
}

export function updateChatUnreadCount(chatId, unreadCount) {
  const targetId = normalizeChatId(chatId);
  if (targetId == null) return;

  let changed = false;
  const next = listState.chats.map((c) => {
    const cId = normalizeChatId(c?.id);
    if (cId === targetId) {
      const currentUnread = c?.unreadCount ?? 0;
      if (currentUnread !== unreadCount) changed = true;
      return { ...c, unreadCount };
    }
    return c;
  });

  if (changed) {
    listState.chats = next;
    emit();
  }
}

export function updateChatDetailsInStore(updatedChat) {
  if (!updatedChat?.id) return;

  const targetId = normalizeChatId(updatedChat.id);
  const idx = listState.chats.findIndex((c) =>
    chatIdsMatch(c?.id, targetId),
  );
  if (idx === -1) return;

  const existing = listState.chats[idx];
  const next = [...listState.chats];
  next[idx] = {
    ...existing,
    ...updatedChat,
    messages: updatedChat.messages || existing.messages,
    lastMessageAt: updatedChat.lastMessageAt || existing.lastMessageAt,
  };
  listState.chats = next;
  emit();
}

export function updateChatLastMessageInStore(
  chatId,
  messageTimestamp,
  messageContent,
  messageType = "text",
  senderUserId,
) {
  const targetId = normalizeChatId(chatId);
  const idx = listState.chats.findIndex((c) => chatIdsMatch(c?.id, targetId));
  if (idx === -1) return;

  const chat = listState.chats[idx];
  const updatedChats = [...listState.chats];
  updatedChats.splice(idx, 1);

  const updatedChat = {
    ...chat,
    messages: [
      {
        id: Date.now(),
        content: messageContent,
        type: messageType,
        createdAt: messageTimestamp,
        userId: senderUserId ?? currentUserId,
      },
    ],
    lastMessageAt: messageTimestamp,
  };

  updatedChats.unshift(updatedChat);
  listState.chats = updatedChats;
  emit();
}

export function markChatReadInStore(chatId, lastReadAt) {
  const targetId = normalizeChatId(chatId);
  let changed = false;
  const next = listState.chats.map((c) => {
    if (!chatIdsMatch(c?.id, targetId)) return c;
    changed = true;
    return {
      ...c,
      unreadCount: 0,
      currentUserLastReadAt: lastReadAt || c.currentUserLastReadAt,
      lastReadAt: lastReadAt || c.lastReadAt || new Date().toISOString(),
    };
  });
  if (changed) {
    listState.chats = next;
    emit();
  }
}

export function upsertChatFromNewMessage(data) {
  if (!data?.chatId) return false;

  const chatId = normalizeChatId(data.chatId);
  const chatIndex = listState.chats.findIndex((c) => chatIdsMatch(c?.id, chatId));

  const messageTimestamp =
    data.message?.createdAt ||
    data.message?.created_at ||
    data.createdAt ||
    data.created_at ||
    data.message?.timestamp ||
    data.timestamp ||
    new Date().toISOString();

  const messageContent = data.message?.content || data.content || "";
  const messageType = data.message?.type || data.type || "text";
  const messageUserId =
    data.message?.userId ||
    data.userId ||
    data.message?.user?.id ||
    data.user?.id;

  const messageObj = data.message || {
    id: data.messageId || data.id || Date.now(),
    content: messageContent,
    type: messageType,
    createdAt: messageTimestamp,
    userId: messageUserId,
  };

  if (chatIndex !== -1) {
    const chat = listState.chats[chatIndex];
    const incomingId = messageObj?.id;
    const existingLastId = chat.messages?.[0]?.id;
    // Same message already applied (e.g. notification + message:new) — no double unread.
    if (
      incomingId != null &&
      existingLastId != null &&
      String(incomingId) === String(existingLastId)
    ) {
      return true;
    }

    const updatedChats = [...listState.chats];
    updatedChats.splice(chatIndex, 1);

    const isChatSelected = chatIdsMatch(activeChatId, chat.id);
    const isMessageFromCurrentUser =
      currentUserId != null &&
      messageUserId != null &&
      String(messageUserId) === String(currentUserId);

    let newUnreadCount = chat.unreadCount || 0;
    if (!isChatSelected && !isMessageFromCurrentUser) {
      newUnreadCount = (newUnreadCount || 0) + 1;
    } else if (isChatSelected) {
      newUnreadCount = 0;
    }

    updatedChats.unshift({
      ...chat,
      messages: [messageObj],
      lastMessageAt: messageTimestamp,
      unreadCount: newUnreadCount,
    });

    listState.chats = updatedChats;
    emit();
    return true;
  }

  return false;
}

export function upsertChatIntoStore(chat) {
  if (!chat?.id) return;

  const targetId = normalizeChatId(chat.id);
  const idx = listState.chats.findIndex((c) => chatIdsMatch(c?.id, targetId));

  if (idx !== -1) {
    const existing = listState.chats[idx];
    const next = [...listState.chats];
    next[idx] = { ...existing, ...chat };
    listState.chats = next;
  } else {
    listState.chats = [
      {
        ...chat,
        lastMessageAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt,
        unreadCount: chat.unreadCount ?? 0,
      },
      ...listState.chats,
    ];
  }
  emit();
}

export function subscribeToChatsSnapshot(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  try {
    listener(listState.chats);
  } catch (_) {
    // ignore listener errors
  }
  return () => {
    listeners.delete(listener);
  };
}

export function clearChatStore() {
  listState = {
    chats: [],
    page: 1,
    hasMore: true,
    fetchedAt: null,
  };
  activeChatId = null;
  currentUserId = null;
  searchKeyword = "";
  emit();
}
