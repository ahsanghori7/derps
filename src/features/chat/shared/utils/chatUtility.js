/**
 * Chat utilities. Shared helpers for chat-related features (formatting,
 * previews, etc.). Add new chat-related helpers here so both `ChatWindow`
 * and `ChatList` (and any future surface) stay in sync.
 */

// Match http/https URLs
export const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

// Match @mentions (e.g., @username)
export const MENTION_REGEX = /@(\w+)/g;

// How long a jumped-to/replied-to message stays highlighted (ms).
export const MESSAGE_HIGHLIGHT_MS = 2500;

const USER_DASHBOARD_PREFIX = '/userDashboard';
const HOME_PREFIX = '/home';

export const getAppBasePath = (pathname) => {
  const path =
    pathname ||
    (typeof window !== 'undefined' ? window.location?.pathname : '') ||
    '';
  if (path.startsWith(USER_DASHBOARD_PREFIX)) return USER_DASHBOARD_PREFIX;
  return HOME_PREFIX;
};

export const getChatRoute = (pathname, chatId) => {
  const base = getAppBasePath(pathname);
  if (chatId !== undefined && chatId !== null && chatId !== '') {
    return `${base}/chat/${chatId}`;
  }
  return `${base}/chat`;
};

export const getCallRoute = (pathname, suffix = '') => {
  const base = getAppBasePath(pathname);
  return suffix ? `${base}/call/${suffix}` : `${base}/call`;
};

export const isOnChatPage = (pathname = '') =>
  String(pathname)
    .replace(/^\/(home|userDashboard)\/?/i, '')
    .startsWith('chat');

export const isOnCallPage = (pathname = '') => {
  const path = String(pathname);
  return (
    path.startsWith(`${HOME_PREFIX}/call`) ||
    path.startsWith(`${USER_DASHBOARD_PREFIX}/call`) ||
    path.startsWith('/join')
  );
};

/** Loose id match for highlight/scroll (URL query ids are strings). */
export const messageIdsMatch = (a, b) =>
  a != null && b != null && String(a) === String(b);

/**
 * Shared avatar color palette used across chat surfaces. Deterministic by
 * numeric id so the same user/chat always gets the same color.
 */
export const AVATAR_COLORS = [
  'bg-yellow-500',
  'bg-purple-500',
  'bg-blue-500',
  'bg-pink-500',
  'bg-green-500',
  'bg-indigo-500',
];

const AVATAR_COLOR_HEX = [
  '#eab308',
  '#a855f7',
  '#3b82f6',
  '#ec4899',
  '#22c55e',
  '#6366f1',
];

export const getAvatarColor = (id) => {
  const n = Number(id);
  const safe = Number.isFinite(n) ? Math.abs(n) : 0;
  return AVATAR_COLORS[safe % AVATAR_COLORS.length];
};

export const getAvatarSpeakingColors = (id) => {
  const n = Number(id);
  const safe = Number.isFinite(n) ? Math.abs(n) : 0;
  const hex = AVATAR_COLOR_HEX[safe % AVATAR_COLOR_HEX.length];
  const channel = hex.slice(1);
  const r = parseInt(channel.slice(0, 2), 16);
  const g = parseInt(channel.slice(2, 4), 16);
  const b = parseInt(channel.slice(4, 6), 16);
  return {
    ring: hex,
    glow: `rgba(${r}, ${g}, ${b}, 0.55)`,
  };
};

/**
 * Returns the first uppercase letter of a name, or a fallback.
 */
export const getInitial = (name, fallback = 'U') =>
  (name && String(name).trim().charAt(0).toUpperCase()) || fallback;

/**
 * Parses inline formatting marks into a tree of nodes.
 * Recognised marks:
 *   - `code`            -> { type: 'code', value }
 *   - **bold**          -> { type: 'bold', children }
 *   - ~~strikethrough~~ -> { type: 'strikethrough', children }
 *   - _italic_          -> { type: 'italic', children }
 * Inline code is a leaf (no further parsing inside it).
 */
export const parseInlineFormatting = (text) => {
  const out = [];
  let buf = "";
  let i = 0;

  const flushBuf = () => {
    if (buf) {
      out.push({ type: "text", value: buf });
      buf = "";
    }
  };

  const findClose = (mark, from) => {
    let k = from;
    while (k <= text.length - mark.length) {
      if (text.startsWith(mark, k)) return k;
      k++;
    }
    return -1;
  };

  while (i < text.length) {
    // Inline code first (no nesting inside)
    if (text[i] === "`") {
      const close = findClose("`", i + 1);
      if (close > i + 1) {
        flushBuf();
        out.push({ type: "code", value: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }
    // Bold (**)
    if (text.startsWith("**", i)) {
      const close = findClose("**", i + 2);
      if (close > i + 2) {
        flushBuf();
        out.push({
          type: "bold",
          children: parseInlineFormatting(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    }
    // Strikethrough (~~)
    if (text.startsWith("~~", i)) {
      const close = findClose("~~", i + 2);
      if (close > i + 2) {
        flushBuf();
        out.push({
          type: "strikethrough",
          children: parseInlineFormatting(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    }
    // Italic (_..._). Underscores must wrap a non-empty, non-whitespace span and
    // must not sit inside a word (so identifiers like snake_case stay intact).
    if (text[i] === "_") {
      const prev = i === 0 ? "" : text[i - 1];
      const nextChar = text[i + 1];
      const isWordChar = (c) => /[A-Za-z0-9]/.test(c || "");
      const openOk =
        nextChar &&
        nextChar !== "_" &&
        nextChar !== " " &&
        !isWordChar(prev);
      if (openOk) {
        let close = -1;
        let k = i + 1;
        while (k < text.length) {
          if (text[k] === "_") {
            const before = text[k - 1];
            const after = text[k + 1] || "";
            if (before !== " " && before !== "_" && !isWordChar(after)) {
              close = k;
              break;
            }
          }
          k++;
        }
        if (close > i + 1) {
          flushBuf();
          out.push({
            type: "italic",
            children: parseInlineFormatting(text.slice(i + 1, close)),
          });
          i = close + 1;
          continue;
        }
      }
    }
    buf += text[i];
    i++;
  }

  flushBuf();
  return out;
};

/**
 * Splits a message into block-level groups for renderers.
 * Each group is one of:
 *   { kind: 'ol' | 'ul' | 'quote' | 'plain', items: string[] }
 * The block prefixes ("1. ", "- ", "> ") are stripped from items.
 */
export const groupMessageBlocks = (text) => {
  if (!text || typeof text !== "string") return [];
  const lines = text.split("\n");
  const groups = [];
  const pushTo = (kind, content) => {
    const last = groups[groups.length - 1];
    if (last && last.kind === kind) last.items.push(content);
    else groups.push({ kind, items: [content] });
  };

  for (const line of lines) {
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (numbered) pushTo("ol", numbered[1]);
    else if (bullet) pushTo("ul", bullet[1]);
    else if (quote) pushTo("quote", quote[1]);
    else pushTo("plain", line);
  }
  return groups;
};

/** Flattens a parsed inline-formatting tree into a plain string. */
const inlineNodesToText = (nodes) =>
  nodes
    .map((n) => {
      if (n.type === "text") return n.value;
      if (n.type === "code") return n.value;
      return inlineNodesToText(n.children || []);
    })
    .join("");

/**
 * Strips all formatting markers (block + inline) and returns clean plain text
 * suitable for previews (e.g. ChatList last-message line, notifications, etc.).
 * Collapses newlines into single spaces and trims excess whitespace.
 */
export const messageToPlainText = (text) => {
  if (!text || typeof text !== "string") return "";
  const groups = groupMessageBlocks(text);
  const flat = groups
    .flatMap((g) => g.items.map((item) => inlineNodesToText(parseInlineFormatting(item))))
    .join(" ");
  return flat.replace(/\s+/g, " ").trim();
};

/**
 * Returns forwarded-message metadata when present on API message fields.
 */
export const getForwardedMessageInfo = (message) => {
  const forwardedFromMessageId =
    message?.forwardedFromMessageId ?? message?.forwardedFrom?.messageId ?? null;
  if (!forwardedFromMessageId) return null;

  return {
    sourceLabel:
      message?.forwardedFromChatName?.trim() ||
      message?.forwardedFrom?.chatName?.trim() ||
      "Chat",
    forwardedFromMessageId,
    forwardedFromChatId:
      message?.forwardedFromChatId ?? message?.forwardedFrom?.chatId ?? null,
  };
};

/** True when a message was auto-generated (e.g. scheduled auto-reply). */
export const isSystemMessage = (message) =>
  message?.type === "system";

/**
 * True when a system message is an event/meeting invitation.
 * The backend always includes these markers for event notifications;
 * other system messages (e.g. auto-replies) won't have all of them.
 */
export const isEventInviteMessage = (message) => {
  if (!isSystemMessage(message)) return false;
  const content = message?.content || "";
  return (
    content.includes("Meeting Invitation:") &&
    content.includes("Organizer:") &&
    content.includes("Date:") &&
    content.includes("Time:")
  );
};

const CALL_STARTED_PATTERN = /^(.*) started a call\nJoin: (\S+)\s*$/s;
const CALL_PEOPLE_ADDED_PATTERN = / added people to the call\s*$/;

/** Pulls the roomId out of a meeting link, whichever shape it's in (bare "/<roomId>" or "/join/?meeting=<roomId>"). */
const extractRoomIdFromMeetingLink = (link) => {
  if (!link) return null;
  try {
    const url = new URL(link);
    const meetingParam = url.searchParams.get("meeting");
    if (meetingParam) return meetingParam;
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.length ? segments[segments.length - 1] : null;
  } catch {
    return null;
  }
};

/**
 * Parses the ringing-call system messages posted by the backend (see
 * docs/call-ringing-invite.txt): "{name} started a call\nJoin: {link}" and
 * "{name} added people to the call". Returns null for any other message.
 */
export const parseCallMessageContent = (message) => {
  if (!isSystemMessage(message)) return null;
  const content = message?.content || "";

  const startedMatch = content.match(CALL_STARTED_PATTERN);
  if (startedMatch) {
    const meetingLink = startedMatch[2];
    return {
      kind: "started",
      callerName: startedMatch[1],
      meetingLink,
      roomId: extractRoomIdFromMeetingLink(meetingLink),
    };
  }

  if (CALL_PEOPLE_ADDED_PATTERN.test(content)) {
    return { kind: "peopleAdded" };
  }

  return null;
};

/** True for any system message generated by the call-ringing feature. */
export const isCallMessage = (message) => parseCallMessageContent(message) !== null;

/**
 * Returns a short, human-friendly preview string for a chat message.
 * Handles plain text, attachments (image/video/audio/file), and truncates.
 */
export const getMessagePreview = (message, maxLength = 40) => {
  if (!message) return "";

  // Attachments: prefer an icon + type label
  const attachment =
    Array.isArray(message.attachments) && message.attachments.length > 0
      ? message.attachments[0]
      : null;
  if (attachment) {
    const mime = attachment.mimeType || "";
    if (mime.startsWith("image/")) return "🖼 Photo";
    if (mime.startsWith("video/")) return "🎬 Video";
    if (mime.startsWith("audio/")) return "🎤 Voice message";
    return `📎 ${attachment.fileName || "Attachment"}`;
  }

  // Legacy/file-type messages
  if (message.type === "file") return "📎 File attachment";

  const callInfo = parseCallMessageContent(message);
  if (callInfo) {
    return callInfo.kind === "started"
      ? `📞 ${callInfo.callerName} started a call`
      : "📞 Added people to the call";
  }

  const plain = messageToPlainText(message.content || "");
  if (isSystemMessage(message)) {
    const label = isEventInviteMessage(message) ? "Event" : "Auto-reply";
    const body =
      plain.length > maxLength - 12
        ? `${plain.slice(0, maxLength - 12).trim()}…`
        : plain;
    return body ? `${label}: ${body}` : label;
  }
  if (plain.length > maxLength) return `${plain.slice(0, maxLength).trim()}…`;
  return plain;
};

/**
 * Builds a shareable URL that opens a chat and scrolls to a specific message.
 */
export const buildMessageDeepLink = (chatId, messageId) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  const pathname =
    typeof window !== "undefined" ? window.location?.pathname : "";
  return `${origin}${getChatRoute(pathname, chatId)}?messageId=${encodeURIComponent(messageId)}`;
};

/** @typedef {'online' | 'away' | 'busy' | 'offline'} UserPresenceStatus */

export const USER_STATUS_STYLES = {
  online: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    label: "Active Now",
    title: "Active Now",
  },
  away: {
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    label: "Away",
    title: "Away",
  },
  busy: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    label: "In meeting",
    title: "In meeting",
  },
  offline: {
    dot: "bg-gray-400 dark:bg-gray-500",
    text: "chat-text-muted",
    label: "Offline",
    title: "Offline",
  },
};

export const getUserStatusStyle = (status) =>
  USER_STATUS_STYLES[status] || USER_STATUS_STYLES.offline;

export const getDirectChatOtherUserId = (chat, currentUserId) => {
  if (!chat || chat.type !== "direct" || !Array.isArray(chat.members)) return null;
  const otherMember = chat.members.find(
    (m) => String(m?.userId) !== String(currentUserId),
  );
  return otherMember?.userId ?? null;
};

/** True when the current user has muted notifications for this chat. */
export const isChatMutedForUser = (chat, currentUserId) => {
  if (!Array.isArray(chat?.members)) return false;
  const member = chat.members.find(
    (m) => String(m?.userId) === String(currentUserId),
  );
  return Boolean(member?.isMuted);
};

/** True when a message is queued for future delivery. */
export const isScheduledMessage = (message) => {
  if (!message) return false;
  if (message.status === "scheduled" || message.isScheduled) return true;
  if (!message.scheduledAt) return false;
  const scheduled = new Date(message.scheduledAt);
  return !Number.isNaN(scheduled.getTime()) && scheduled.getTime() > Date.now();
};

/** Human-readable scheduled send time (local). */
export const formatScheduledTime = (scheduledAt) => {
  if (!scheduledAt) return "";
  try {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/**
 * Normalizes a message's raw `reactions` payload for rendering: fills in
 * `count` and `reactedByMe` when the server omits them, and drops empty pills.
 */
export const normalizeReactions = (reactions, currentUserId) => {
  if (!Array.isArray(reactions)) return [];
  return reactions
    .map((reaction) => {
      const users = Array.isArray(reaction.users) ? reaction.users : [];
      const reactedByMe =
        typeof reaction.reactedByMe === "boolean"
          ? reaction.reactedByMe
          : users.some((u) => String(u.id) === String(currentUserId));
      const count = typeof reaction.count === "number" ? reaction.count : users.length;
      return { ...reaction, users, count, reactedByMe };
    })
    .filter((reaction) => reaction.count > 0);
};

/**
 * Immutably adds/removes `user` from the `emoji` pill within `reactions`,
 * used for optimistic UI updates before the API/socket confirmation lands.
 */
export const toggleReactionLocally = (reactions, emoji, user, adding) => {
  const list = Array.isArray(reactions) ? reactions : [];
  const idx = list.findIndex((r) => r.emoji === emoji);
  const userId = user?.id;

  if (adding) {
    if (idx === -1) {
      return [
        ...list,
        {
          emoji,
          count: 1,
          users: [{ id: userId, name: user?.name, avatar: user?.avatar }],
          reactedByMe: true,
        },
      ];
    }
    const existing = list[idx];
    if ((existing.users || []).some((u) => String(u.id) === String(userId))) {
      return list;
    }
    const nextUsers = [
      ...(existing.users || []),
      { id: userId, name: user?.name, avatar: user?.avatar },
    ];
    return list.map((r, i) =>
      i === idx ? { ...existing, users: nextUsers, count: nextUsers.length, reactedByMe: true } : r,
    );
  }

  if (idx === -1) return list;
  const existing = list[idx];
  const nextUsers = (existing.users || []).filter((u) => String(u.id) !== String(userId));
  if (nextUsers.length === 0) {
    return list.filter((_, i) => i !== idx);
  }
  return list.map((r, i) =>
    i === idx ? { ...existing, users: nextUsers, count: nextUsers.length, reactedByMe: false } : r,
  );
};
