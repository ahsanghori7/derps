// Per-chat message cache that survives route changes.

export const MESSAGES_STALE_MS = 60_000;
export const MAX_MESSAGES_PER_CHAT = 200;
export const MAX_CACHED_CHATS = 30;

/** @type {Map<string, { messages: object[], page: number, hasMore: boolean, fetchedAt: number|null, lastAccessedAt: number }>} */
const buckets = new Map();
/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/** @type {string|null} */
let activeChatId = null;
/** @type {Function|null} */
let activeChatMessageHandler = null;

function bucketKey(chatId) {
  return String(chatId);
}

function touchBucket(key) {
  const bucket = buckets.get(key);
  if (bucket) bucket.lastAccessedAt = Date.now();
}

function evictIfNeeded() {
  if (buckets.size <= MAX_CACHED_CHATS) return;
  const entries = [...buckets.entries()].sort(
    (a, b) => (a[1].lastAccessedAt || 0) - (b[1].lastAccessedAt || 0),
  );
  const toRemove = entries.slice(0, entries.length - MAX_CACHED_CHATS);
  for (const [key] of toRemove) {
    if (activeChatId != null && bucketKey(activeChatId) === key) continue;
    buckets.delete(key);
    listeners.delete(key);
  }
}

function trimMessages(messages) {
  if (!Array.isArray(messages)) return [];
  if (messages.length <= MAX_MESSAGES_PER_CHAT) return messages;
  return messages.slice(messages.length - MAX_MESSAGES_PER_CHAT);
}

function emit(chatId) {
  const key = bucketKey(chatId);
  const bucket = buckets.get(key);
  const subs = listeners.get(key);
  if (!subs || !bucket) return;
  const snapshot = {
    messages: [...bucket.messages],
    page: bucket.page,
    hasMore: bucket.hasMore,
    fetchedAt: bucket.fetchedAt,
  };
  for (const fn of subs) {
    try {
      fn(snapshot);
    } catch (_) {
      // ignore
    }
  }
}

function ensureBucket(chatId) {
  const key = bucketKey(chatId);
  if (!buckets.has(key)) {
    buckets.set(key, {
      messages: [],
      page: 1,
      hasMore: true,
      fetchedAt: null,
      lastAccessedAt: Date.now(),
    });
  }
  touchBucket(key);
  return buckets.get(key);
}

export function getMessagesSnapshot(chatId) {
  const bucket = buckets.get(bucketKey(chatId));
  if (!bucket) return null;
  return {
    messages: [...bucket.messages],
    page: bucket.page,
    hasMore: bucket.hasMore,
    fetchedAt: bucket.fetchedAt,
  };
}

export function isMessagesStale(chatId) {
  const bucket = buckets.get(bucketKey(chatId));
  if (!bucket || bucket.messages.length === 0 || !bucket.fetchedAt) return true;
  return Date.now() - bucket.fetchedAt > MESSAGES_STALE_MS;
}

export function setMessagesSnapshot(chatId, messages, meta = {}) {
  const bucket = ensureBucket(chatId);
  bucket.messages = trimMessages(Array.isArray(messages) ? messages : []);
  if (meta.page !== undefined) bucket.page = meta.page;
  if (meta.hasMore !== undefined) bucket.hasMore = meta.hasMore;
  if (meta.touchFetchedAt !== false) bucket.fetchedAt = Date.now();
  evictIfNeeded();
  emit(chatId);
}

export function prependMessages(chatId, olderMessages, meta = {}) {
  const bucket = ensureBucket(chatId);
  const incoming = Array.isArray(olderMessages) ? olderMessages : [];
  bucket.messages = trimMessages([...incoming, ...bucket.messages]);
  if (meta.page !== undefined) bucket.page = meta.page;
  if (meta.hasMore !== undefined) bucket.hasMore = meta.hasMore;
  emit(chatId);
}

export function appendMessage(chatId, message) {
  if (!message) return;
  const bucket = ensureBucket(chatId);
  const exists = bucket.messages.some(
    (m) => String(m.id) === String(message.id),
  );
  if (exists) return;
  bucket.messages = trimMessages([...bucket.messages, message]);
  emit(chatId);
}

export function replaceMessage(chatId, messageId, nextMessage) {
  const bucket = buckets.get(bucketKey(chatId));
  if (!bucket) return;
  bucket.messages = bucket.messages.map((m) =>
    String(m.id) === String(messageId) ? { ...m, ...nextMessage } : m,
  );
  emit(chatId);
}

export function removeMessage(chatId, messageId) {
  const bucket = buckets.get(bucketKey(chatId));
  if (!bucket) return;
  bucket.messages = bucket.messages.filter(
    (m) => String(m.id) !== String(messageId),
  );
  emit(chatId);
}

export function mergeMessagesFromSocket(chatId, incoming, { matchedTempId } = {}) {
  if (!incoming) return;
  const bucket = ensureBucket(chatId);

  const exists = bucket.messages.some(
    (m) => String(m.id) === String(incoming.id),
  );
  if (exists) return;

  if (matchedTempId) {
    const idx = bucket.messages.findIndex(
      (m) => String(m.id) === String(matchedTempId),
    );
    if (idx >= 0) {
      const next = [...bucket.messages];
      next[idx] = incoming;
      bucket.messages = trimMessages(next);
      emit(chatId);
      return;
    }
  }

  bucket.messages = trimMessages([...bucket.messages, incoming]);
  emit(chatId);
}

export function updateMessagesInStore(chatId, updater) {
  const bucket = ensureBucket(chatId);
  const prev = bucket.messages;
  const next = typeof updater === "function" ? updater(prev) : updater;
  bucket.messages = trimMessages(Array.isArray(next) ? next : prev);
  emit(chatId);
}

export function applyMemberRead(chatId, data) {
  const bucket = buckets.get(bucketKey(chatId));
  if (!bucket || !data?.userId) return;

  bucket.messages = bucket.messages.map((message) => {
    if (
      data.lastReadMessageId &&
      message.id <= data.lastReadMessageId
    ) {
      const readBy = message.readBy || [];
      if (!readBy.includes(data.userId)) {
        return { ...message, readBy: [...readBy, data.userId] };
      }
    } else if (!data.lastReadMessageId && data.lastReadAt) {
      const messageDate = new Date(message.createdAt);
      const lastReadDate = new Date(data.lastReadAt);
      if (messageDate <= lastReadDate) {
        const readBy = message.readBy || [];
        if (!readBy.includes(data.userId)) {
          return { ...message, readBy: [...readBy, data.userId] };
        }
      }
    }
    return message;
  });
  emit(chatId);
}

export function applyReactionUpdate(chatId, data) {
  const bucket = buckets.get(bucketKey(chatId));
  if (!bucket || data?.messageId == null) return;

  bucket.messages = bucket.messages.map((message) =>
    String(message.id) === String(data.messageId)
      ? { ...message, reactions: data.reactions || [] }
      : message,
  );
  emit(chatId);
}

export function subscribeToMessages(chatId, listener) {
  if (!chatId || typeof listener !== "function") return () => {};
  const key = bucketKey(chatId);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(listener);

  const snap = getMessagesSnapshot(chatId);
  if (snap) {
    try {
      listener(snap);
    } catch (_) {
      // ignore
    }
  }

  return () => {
    const subs = listeners.get(key);
    if (subs) {
      subs.delete(listener);
      if (subs.size === 0) listeners.delete(key);
    }
  };
}

export function setActiveChatMessageHandler(chatId, handler) {
  activeChatId = chatId != null ? chatId : null;
  activeChatMessageHandler =
    chatId != null && typeof handler === "function" ? handler : null;
}

export function dispatchActiveChatMessage(data) {
  if (activeChatMessageHandler) {
    activeChatMessageHandler(data);
    return true;
  }
  return false;
}

export function clearMessageStore() {
  buckets.clear();
  listeners.clear();
  activeChatId = null;
  activeChatMessageHandler = null;
}

export function clearChatStores() {
  // re-exported from chatStore via logout - message only here
  clearMessageStore();
}
