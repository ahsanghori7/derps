import { useState, useEffect, useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import {
  getMessages,
  searchChatMessages,
  sendMessage,
  forwardMessage,
  createDirectChat,
  getChatDetails,
  uploadAttachment,
  markChatAsRead,
  deleteMessage as deleteMessageApi,
  deleteScheduledMessage as deleteScheduledMessageApi,
  updateMessage as updateMessageApi,
  updateScheduledMessage as updateScheduledMessageApi,
  addMessageReaction,
  removeMessageReaction,
} from "../api/chatApi";
import { useSelector } from "react-redux";
import { useSocket } from "@contexts/SocketContext";
import {
  getMessagesSnapshot,
  isMessagesStale,
  setMessagesSnapshot,
  prependMessages,
  mergeMessagesFromSocket,
  updateMessagesInStore,
  // removeMessage,
  replaceMessage,
  subscribeToMessages,
  setActiveChatMessageHandler,
  applyMemberRead,
} from "@stores/messageStore";
import {
  setActiveChatId,
  findChatByIdInStore,
  upsertChatIntoStore,
} from "@stores/chatStore";
import moment from "moment";
import { toast } from "react-toastify";
import { getErrorMessage } from "@utils/errorHandler";
import { getProfilePictureUrl } from "../../../Utils/profile";
import GroupInfoPanel from "../group/GroupInfoPanel";
import { UserDetailsModal } from "../shared/components";
import MentionSuggestions from "./MentionSuggestions";
import ForwardMessageModal from "./ForwardMessageModal";
import {
  getAvatarColor as getAvatarColorById,
  buildMessageDeepLink,
  getUserStatusStyle,
  isScheduledMessage,
  formatScheduledTime,
  normalizeReactions,
  toggleReactionLocally,
  MESSAGE_HIGHLIGHT_MS,
  messageIdsMatch,
} from "../shared/utils/chatUtility";
import { formatTextInTextarea, handleFormatShortcut } from "../shared/utils/textFormatting";
import { useClickOutside, useGroupActions } from "../shared/hooks";
import { ScheduleSendModal, ScheduledMessagesPanel } from "../settings";
import FormatToolbar from "./FormatToolbar";
import DropZoneOverlay from "./DropZoneOverlay";
import UploadConfirmOverlay from "./UploadConfirmOverlay";
import ReplyPreviewBanner from "./ReplyPreviewBanner";
import EmojiPickerButton from "./EmojiPickerButton";
import ChatHeader from "./ChatHeader";
import MessageContextMenu from "./MessageContextMenu";
import MessageSearchBar from "./MessageSearchBar";
import VoiceRecorderControls from "./VoiceRecorderControls";
import MessageBubble from "./MessageBubble";
import Loader from "@components/Loader";
import {
  CloseIcon,
  MicrophoneIcon,
  PaperclipIcon,
  SendIcon,
  TrashOutlineIcon,
  ClockIcon,
  ForwardIcon,
} from "../shared/icons";
import "../shared/theme/ChatWindow.css";

const VOICE_MAX_SECONDS = 300;
const FORWARD_SELECTION_LIMIT = 10;
const FILE_UPLOAD_LIMIT = 5;

const formatTime = (totalSeconds) => {
  const safeSeconds = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const ChatWindow = ({
  chat,
  selectedMessageId,
  highlightLastOnOpen = false,
  onHighlightConsumed,
  onBack,
  onChatUpdated,
  onLeftGroup,
  onOpenDirectChatWithUser,
  onNavigateToMessage,
  onStartCall,
  onJoinCall,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Track which chat the current messages belong to so we can reset instantly on switch
  const [loadedChatId, setLoadedChatId] = useState(chat?.id ?? null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSlides, setLightboxSlides] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  /** True while loading pages to jump to selectedMessageId (deep link / notification). */
  const [isLocatingSharedMessage, setIsLocatingSharedMessage] = useState(false);
  /** When set, load older pages until this message appears, then scroll + highlight (reply preview tap). */
  const [pendingScrollToReplyMessageId, setPendingScrollToReplyMessageId] =
    useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message }
  const contextMenuRef = useRef(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessages, setForwardingMessages] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [isShowingSearchContext, setIsShowingSearchContext] = useState(false);
  const [preSearchState, setPreSearchState] = useState(null);
  const loadMessagesAbortRef = useRef(null);
  const loadMessagesSeqRef = useRef(0);
  const searchContextActiveRef = useRef(false);
  /** FIFO entries for optimistic text sends; used to merge self `message:new` without duplicating */
  const textSendOutboxRef = useRef([]);
  /** In-flight optimistic temp id; cleared on HTTP success, used to remove bubble on send error */
  const pendingTextSendRef = useRef(null);

  // Mention-related state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState("");
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionSuggestionsPosition, setMentionSuggestionsPosition] = useState({
    left: 0,
    bottom: 0,
  });

  // Upload confirmation for paste / drag-drop / file pick
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showScheduledMessages, setShowScheduledMessages] = useState(false);
  const [scheduledListRefreshKey, setScheduledListRefreshKey] = useState(0);
  const [editingScheduledMessage, setEditingScheduledMessage] = useState(null);
  const [pendingUploadPreviewUrls, setPendingUploadPreviewUrls] = useState([]);

  // Selected range inside the message textarea for the inline formatting toolbar
  const [textSelection, setTextSelection] = useState(null); // { start, end } | null

  // Voice note (tap to start/stop) state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceDraftFile, setVoiceDraftFile] = useState(null); // File ready to upload
  const [voiceDraftUrl, setVoiceDraftUrl] = useState(null); // object URL for preview
  const [voiceDraftSeconds, setVoiceDraftSeconds] = useState(0);
  const voiceSecondsRef = useRef(0);
  const voicePausedRef = useRef(false);
  const autoSendVoiceOnStopRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceStreamRef = useRef(null);
  const voiceTimerRef = useRef(null);
  const voiceStoppingRef = useRef(false);
  const voiceDiscardOnStopRef = useRef(false);
  const MAX_VOICE_SECONDS = 300;

  const token =
    useSelector((state) => state.auth.accessToken) ||
    localStorage.getItem("accessToken");

  const insertEmojiIntoMessage = (emoji) => {
    const el = textareaRef.current;
    if (!el) {
      setNewMessage((prev) => `${prev || ""}${emoji}`);
      return;
    }

    const start = typeof el.selectionStart === "number" ? el.selectionStart : newMessage.length;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : start;
    const next =
      String(newMessage || "").slice(0, start) + emoji + String(newMessage || "").slice(end);
    setNewMessage(next);

    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      } catch (_) {
        // ignore
      }
    });
  };

  // Track text selection inside the message textarea to show a floating formatting toolbar.
  const handleTextareaSelect = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = typeof ta.selectionStart === "number" ? ta.selectionStart : 0;
    const end = typeof ta.selectionEnd === "number" ? ta.selectionEnd : 0;
    if (end > start) {
      setTextSelection({ start, end });
    } else {
      setTextSelection(null);
    }
  };

  /** Apply formatting in the main message composer. */
  const applyTextFormat = (type) =>
    formatTextInTextarea(
      {
        textarea: textareaRef.current,
        value: newMessage,
        setValue: setNewMessage,
        onSelectionChange: setTextSelection,
      },
      type,
    );

  /** Apply formatting in the edit-message textarea. */
  const applyEditTextFormat = (type) =>
    formatTextInTextarea(
      {
        textarea: editTextareaRef.current,
        value: editDraft,
        setValue: setEditDraft,
        onSelectionChange: setEditTextSelection,
      },
      type,
    );

  const currentUser = useSelector((state) => state.userData?.userDetails);

  const {
    isMuted: isGroupMuted,
    isMuting: isMutingGroup,
    toggleMute: toggleGroupMute,
    isLeaving: isLeavingGroup,
    leaveGroupChat,
  } = useGroupActions(chat, token, currentUser?.id, {
    onUpdated: (updatedChat) => onChatUpdated?.(updatedChat),
    onLeft: (chatId) => onLeftGroup?.(chatId),
  });

  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // Selected range inside the edit-message textarea for the formatting toolbar.
  const [editTextSelection, setEditTextSelection] = useState(null);
  const editTextareaRef = useRef(null);

  // Track text selection inside the edit-message textarea (mirrors handleTextareaSelect).
  const handleEditTextareaSelect = () => {
    const ta = editTextareaRef.current;
    if (!ta) return;
    const start = typeof ta.selectionStart === "number" ? ta.selectionStart : 0;
    const end = typeof ta.selectionEnd === "number" ? ta.selectionEnd : 0;
    if (end > start) setEditTextSelection({ start, end });
    else setEditTextSelection(null);
  };
  const {
    socket,
    isConnected,
    joinChat,
    startTyping,
    stopTyping,
    isUserOnline,
    getUserStatus,
    markChatAsRead: emitMarkAsRead,
  } = useSocket();

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasScrolledOnOpenRef = useRef(false);
  const textareaRef = useRef(null);
  const searchInputRef = useRef(null);
  const hasJumpedToSelectedMessageRef = useRef(false);
  /** Restores scroll position after prepending older messages (load more / deep link). */
  const scrollRestoreRef = useRef(null);

  useEffect(() => {
    return () => {
      pendingUploadPreviewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    };
  }, [pendingUploadPreviewUrls]);

  // Close edit mode when switching chats
  useEffect(() => {
    setEditingMessageId(null);
    setEditDraft("");
    setIsSavingEdit(false);
    setTextSelection(null);
    setEditTextSelection(null);
    setShowUserDetails(false);
    setSelectedUserDetails(null);
  }, [chat?.id]);

  // Cleanup voice recording resources on unmount/chat switch
  useEffect(() => {
    return () => {
      try {
        if (voiceTimerRef.current) {
          clearInterval(voiceTimerRef.current);
          voiceTimerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (_) {
        // 
      }
      try {
        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach((t) => t.stop());
          voiceStreamRef.current = null;
        }
      } catch (_) {
        // 
      }
      mediaRecorderRef.current = null;
      voiceChunksRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]);

  useEffect(() => {
    return () => {
      if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
    };
  }, [voiceDraftUrl]);

  useEffect(() => {
    voicePausedRef.current = isVoicePaused;
  }, [isVoicePaused]);

  // Close context menu on click outside or Escape (not on contextmenu - that would close it as soon as it opens)
  useClickOutside([contextMenuRef], () => setContextMenu(null), {
    active: !!contextMenu,
    event: "click",
    escapeKey: true,
  });

  // Keep context menu inside the viewport (flip up / clamp when near edges)
  useLayoutEffect(() => {
    if (!contextMenu || !contextMenuRef.current) return;
    const el = contextMenuRef.current;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = contextMenu.x;
    let y = contextMenu.y;

    if (x + width > vw - pad) {
      x = Math.max(pad, vw - width - pad);
    } else if (x < pad) {
      x = pad;
    }

    if (y + height > vh - pad) {
      // Not enough room below — open upward from the click point
      y = Math.max(pad, contextMenu.y - height);
    } else if (y < pad) {
      y = pad;
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, [contextMenu]);

  // Auto-resize message textarea as user types (min 40px, max 120px)
  const TEXTAREA_MIN_HEIGHT = 40;
  const TEXTAREA_MAX_HEIGHT = 120;
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const newHeight = Math.min(Math.max(ta.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT);
    ta.style.height = `${newHeight}px`;
  }, [newMessage]);

  useEffect(() => {
    if (!chat?.id) {
      setActiveChatId(null);
      return undefined;
    }
    setActiveChatId(chat.id);
    return () => setActiveChatId(null);
  }, [chat?.id]);

  // Keep local message state in sync with session cache
  useEffect(() => {
    // Instantly drop previous chat's messages so they never linger on switch
    setMessages([]);
    setPage(1);
    setHasMore(true);

    if (!chat?.id) {
      return undefined;
    }
    return subscribeToMessages(chat.id, (snap) => {
      if (searchContextActiveRef.current) return;
      setMessages(snap.messages);
      setPage(snap.page);
      setHasMore(snap.hasMore);
    });
  }, [chat?.id]);

  useEffect(() => {
    if (chat && token) {
      // Reset scroll flag when chat changes
      hasScrolledOnOpenRef.current = false;
      hasJumpedToSelectedMessageRef.current = false;
      scrollRestoreRef.current = null;
      textSendOutboxRef.current = [];
      pendingTextSendRef.current = null;
      setReplyingTo(null);
      setPendingScrollToReplyMessageId(null);
      setIsSearchOpen(false);
      setSearchKeyword("");
      setSearchResults([]);
      setIsShowingSearchContext(false);
      searchContextActiveRef.current = false;

      // Always clear + show loader immediately on chat switch
      setMessages([]);
      setLoading(true);

      const cached = getMessagesSnapshot(chat.id);
      const shouldFetch =
        !cached?.messages?.length || isMessagesStale(chat.id);

      if (cached?.messages?.length && !shouldFetch) {
        setMessages(cached.messages);
        setPage(cached.page || 1);
        setHasMore(cached.hasMore ?? true);
        setLoading(false);
      } else if (shouldFetch) {
        // Never background-load on switch so loader stays until the new chat is ready
        loadMessages(1, { background: false });
      }

      if (socket && isConnected) {
        joinChat(chat.id);
      }
    }

    return () => {
      setActiveChatMessageHandler(null, null);
      // Do NOT leaveChat here: ChatSocketSync keeps every known chat's room
      // joined for the whole session so muted chats still get message:new
      // in the background. Leaving on switch would drop that room and mute
      // would end up silencing message:new instead of just notifications.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id, token, socket, isConnected]);

  useEffect(() => {
    hasJumpedToSelectedMessageRef.current = false;
    if (selectedMessageId != null && selectedMessageId !== "") {
      setIsLocatingSharedMessage(true);
    } else {
      setIsLocatingSharedMessage(false);
    }
  }, [selectedMessageId]);

  useEffect(() => {
    if (!selectedMessageId) {
      setIsLocatingSharedMessage(false);
    }
  }, [chat?.id, selectedMessageId]);

  // Highlight the last message when we were told to but no explicit message id was provided.
  useEffect(() => {
    if (!highlightLastOnOpen || selectedMessageId || !chat) return;
    if (loading) return; // wait until messages have loaded
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    if (last && messagesContainerRef.current) {
      const el = messagesContainerRef.current.querySelector(
        `[data-message-id="${last.id}"]`,
      );
      if (el) {
        // scroll to bottom (should already be there) then visually highlight
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightMessageId(last.id);
        const t = setTimeout(() => setHighlightMessageId(null), MESSAGE_HIGHLIGHT_MS);
        // notify parent that we've consumed the request
        if (onHighlightConsumed) onHighlightConsumed();
        return () => clearTimeout(t);
      }
    }
  }, [
    highlightLastOnOpen,
    selectedMessageId,
    chat,
    loading,
    messages,
    onHighlightConsumed,
  ]);

  useEffect(() => {
    // Guard clauses: we only attempt a jump when we actually have a target ID and the
    // chat/messages context is ready.  However, even if the message isn't in our current
    // batch we want to fetch additional pages until we either find it or run out of data.
    if (!selectedMessageId || !chat || !messagesContainerRef.current) return;
    if (hasJumpedToSelectedMessageRef.current) return;

    const targetId = String(selectedMessageId);

    // If we're currently loading more messages, let that finish before trying again.
    if (loading) return;

    // don't attempt to jump until at least one page is present
    if (messages.length === 0) return;

    const el = messagesContainerRef.current.querySelector(
      `[data-message-id="${targetId}"]`,
    );

    if (el) {
      hasJumpedToSelectedMessageRef.current = true;
      setIsLocatingSharedMessage(false);
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      setHighlightMessageId(targetId);

      const t = setTimeout(() => {
        setHighlightMessageId(null);
      }, MESSAGE_HIGHLIGHT_MS);

      return () => clearTimeout(t);
    }

    if (hasMore) {
      loadMessages(page + 1);
      return;
    }

    const inMemory = messages.some((m) => messageIdsMatch(m.id, targetId));
    if (!inMemory) {
      hasJumpedToSelectedMessageRef.current = true;
      setIsLocatingSharedMessage(false);
      toast.error("Could not find this message. It may have been deleted.");
    }
  }, [selectedMessageId, chat?.id, loading, messages, hasMore, page]);

  useEffect(() => {
    if (!pendingScrollToReplyMessageId || !chat || !messagesContainerRef.current)
      return;
    if (loading) return;
    if (messages.length === 0) return;

    const targetId = String(pendingScrollToReplyMessageId);
    const el = messagesContainerRef.current.querySelector(
      `[data-message-id="${targetId}"]`,
    );

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightMessageId(targetId);
      setPendingScrollToReplyMessageId(null);
      const t = setTimeout(() => setHighlightMessageId(null), MESSAGE_HIGHLIGHT_MS);
      return () => clearTimeout(t);
    }

    if (hasMore) {
      loadMessages(page + 1);
    } else {
      toast.error(
        "Could not load the original message. It may have been deleted.",
      );
      setPendingScrollToReplyMessageId(null);
    }
  }, [
    pendingScrollToReplyMessageId,
    chat?.id,
    loading,
    messages,
    hasMore,
    page,
  ]);

  // Mark chat as read only after messages are loaded and user has viewed them
  useEffect(() => {
    // Only mark as read after:
    // 1. Chat exists
    // 2. Messages have been loaded (!loading)
    // 3. Socket is connected
    if (chat && chat?.unreadCount > 0 && token && socket && isConnected && !loading) {
      // Call REST endpoint to mark as read
      markChatAsRead(token, chat.id).catch((err) => {
        toast.error(getErrorMessage(err, 'Error marking chat as read'));
      });

      // Also emit socket event for real-time sync
      emitMarkAsRead(chat.id);

      // Update chat in parent so unreadCount becomes 0 and this effect doesn't re-trigger
      if (onChatUpdated) {
        onChatUpdated({ ...chat, unreadCount: 0 });
      }
    }
  }, [
    chat,
    token,
    socket,
    isConnected,
    emitMarkAsRead,
    loading,
    onChatUpdated,
  ]);

  // Restore scroll anchor after older messages are prepended above the viewport
  useLayoutEffect(() => {
    const restore = scrollRestoreRef.current;
    if (!restore || !messagesContainerRef.current) return;
    scrollRestoreRef.current = null;
    const container = messagesContainerRef.current;
    const heightDelta = container.scrollHeight - restore.prevScrollHeight;
    container.scrollTop = restore.prevScrollTop + heightDelta;
  }, [messages]);

  // Scroll to bottom only when chat is opened first time (skip for deep link / reply jump)
  useEffect(() => {
    if (messages?.length === 0 || hasScrolledOnOpenRef.current) return;

    const skipForTargetMessage =
      (selectedMessageId != null && selectedMessageId !== "") ||
      pendingScrollToReplyMessageId != null;

    if (skipForTargetMessage) {
      hasScrolledOnOpenRef.current = true;
      return;
    }

    scrollToBottom(true);
    hasScrolledOnOpenRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedMessageId, pendingScrollToReplyMessageId]);

  // Active-chat socket handler (optimistic reconciliation); list/cache sync is in ChatSocketSync
  useEffect(() => {
    if (!chat?.id) return undefined;

    const handleActiveMessage = (data) => {
      if (String(data.chatId) !== String(chat.id)) return;
      const incoming = data.message;
      if (!incoming) return;

      const incomingReplyTo = incoming.replyToMessageId ?? null;
      const incomingContent = (incoming.content || "").trim();
      const outboxSnapshot = Array.isArray(textSendOutboxRef.current)
        ? [...textSendOutboxRef.current]
        : [];
      const matchedTempId =
        outboxSnapshot.find(
          (e) =>
            String((e.replyToMessageId ?? null) || "") ===
              String(incomingReplyTo || "") &&
            String((e.content || "").trim()) === String(incomingContent),
        )?.tempId || null;

      mergeMessagesFromSocket(chat.id, incoming, { matchedTempId });

      if (matchedTempId) {
        textSendOutboxRef.current = outboxSnapshot.filter(
          (e) => e.tempId !== matchedTempId,
        );
        if (pendingTextSendRef.current?.tempId === matchedTempId) {
          pendingTextSendRef.current = null;
        }
      }

      if (socket && isConnected && chat) {
        emitMarkAsRead(chat.id);
      }
    };

    setActiveChatMessageHandler(chat.id, handleActiveMessage);
    return () => setActiveChatMessageHandler(null, null);
  }, [chat?.id, socket, isConnected, emitMarkAsRead]);

  // WebSocket event listeners (typing, read receipts — not message:new)
  useEffect(() => {
    if (!socket || !isConnected || !chat) return;

    const handleTypingStart = (data) => {
      if (data.chatId === chat.id && data.userId !== currentUser?.id) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      }
    };

    const handleTypingStop = (data) => {
      if (data.chatId === chat.id && data.userId !== currentUser?.id) {
        setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
      }
    };

    const handleChatJoined = (data) => {
      if (data.chatId === chat.id) {
        // user joined the chat
      }
    };

    const handleGroupMemberAdded = (data) => {
      if (data.chatId === chat.id) {
        // Reload chat details if group info modal is open
        // This will be handled by the GroupInfoPanel component
      }
    };

    const handleGroupMemberRemoved = (data) => {
      if (data.chatId === chat.id) {
        // Reload chat details if group info modal is open
      }
    };

    const handleMarkedAsRead = (data) => {
      if (data.chatId === chat.id) {
        // Update local state if needed
        // This will be handled by ChatList to clear unread badge
      }
    };

    const handleMemberRead = (data) => {
      if (data.chatId === chat.id && data.userId !== currentUser?.id) {
        applyMemberRead(chat.id, data);
      }
    };

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("chat:joined", handleChatJoined);
    socket.on("group:member-added", handleGroupMemberAdded);
    socket.on("group:member-removed", handleGroupMemberRemoved);
    socket.on("chat:markedAsRead", handleMarkedAsRead);
    socket.on("chat:memberRead", handleMemberRead);

    return () => {
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("chat:joined", handleChatJoined);
      socket.off("group:member-added", handleGroupMemberAdded);
      socket.off("group:member-removed", handleGroupMemberRemoved);
      socket.off("chat:markedAsRead", handleMarkedAsRead);
      socket.off("chat:memberRead", handleMemberRead);
    };
  }, [socket, isConnected, chat, currentUser, emitMarkAsRead]);

  // Add cleanup for mention suggestions when clicking outside
  useClickOutside(
    [textareaRef],
    () => {
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
      setMentionSelectedIndex(0);
    },
    { active: showMentionSuggestions },
  );

  // Close mention suggestions when chat changes
  useEffect(() => {
    setShowMentionSuggestions(false);
    setMentionSearchQuery("");
    setMentionSelectedIndex(0);
  }, [chat?.id]);

  useEffect(() => {
    setShowGroupInfo(false);
    setShowScheduledMessages(false);
    setShowScheduleModal(false);
    setEditingScheduledMessage(null);
  }, [chat?.id]);

  // Typing indicator is scoped to the currently open chat
  useEffect(() => {
    setTypingUsers([]);
  }, [chat?.id]);

  // Abort any in-flight message load when switching chats / unmounting
  useEffect(() => {
    return () => {
      try {
        loadMessagesAbortRef.current?.abort?.();
      } catch (_) {
        // ignore
      }
      loadMessagesAbortRef.current = null;
    };
  }, [chat?.id]);

  const loadMessages = async (pageNum = 1, { background = false } = {}) => {
    if (!chat || !token) return;

    try {
      loadMessagesAbortRef.current?.abort?.();
    } catch (_) {
      // ignore
    }
    const controller = new AbortController();
    loadMessagesAbortRef.current = controller;
    const seq = ++loadMessagesSeqRef.current;

    try {
      if (!background) setLoading(true);
      const response = await getMessages(token, chat.id, pageNum, 50, {
        signal: controller.signal,
      });
      if (seq !== loadMessagesSeqRef.current) return;
      if (response?.data) {
        const hasMoreData = response.data.length === 50;
        if (pageNum === 1) {
          setMessagesSnapshot(chat.id, response.data, {
            page: pageNum,
            hasMore: hasMoreData,
          });
        } else {
          const container = messagesContainerRef.current;
          if (container) {
            scrollRestoreRef.current = {
              prevScrollHeight: container.scrollHeight,
              prevScrollTop: container.scrollTop,
            };
          }
          prependMessages(chat.id, response.data, {
            page: pageNum,
            hasMore: hasMoreData,
          });
        }
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      if (controller?.signal?.aborted) return;
      toast.error(getErrorMessage(error, 'Error loading messages'));
    } finally {
      if (seq === loadMessagesSeqRef.current) {
        setLoading(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMessages(page + 1);
    }
  };

  const handleSendMessage = async (retry = false) => {
    if (sending || !chat) return;

    // Voice note draft send (only via Send button)
    if (voiceDraftFile) {
      if (!retry) setReplyingTo(null);
      setSending(true);
      setError(null);
      try {
        const ok = await handleVoiceUpload(voiceDraftFile, voiceDraftSeconds);
        if (ok) {
          if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
          setVoiceDraftFile(null);
          setVoiceDraftUrl(null);
          setVoiceDraftSeconds(0);
          setVoiceSeconds(0);
          voiceSecondsRef.current = 0;
        }
      } finally {
        setSending(false);
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
      return;
    }

    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    const replyToId = replyingTo?.id;
    const replySnapshot = replyingTo;

    if (!retry) {
      setNewMessage("");
      setReplyingTo(null);
    }
    // Refocus immediately so user can type the next message without waiting for API.
    setTimeout(() => textareaRef.current?.focus(), 0);
    setSending(true);
    setError(null);

    const useOptimistic = !retry && currentUser?.id != null;

    if (useOptimistic) {
      const tempId = `opt_${crypto.randomUUID()}`;
      textSendOutboxRef.current.push({
        tempId,
        content: messageContent,
        replyToMessageId: replyToId ?? null,
      });
      pendingTextSendRef.current = { tempId };

      const displayName =
        currentUser?.name ||
        currentUser?.username ||
        currentUser?.firstName ||
        "You";
      const optimisticMessage = {
        id: tempId,
        clientPending: true,
        userId: currentUser.id,
        content: messageContent,
        type: "text",
        createdAt: new Date().toISOString(),
        readBy: [],
        user: currentUser.user || { name: displayName },
        ...(replyToId && {
          replyToMessageId: replyToId,
          ...(replySnapshot && {
            replyToMessage: {
              id: replySnapshot.id,
              content: replySnapshot.content,
              userId: replySnapshot.userId,
              user: replySnapshot.user,
            },
          }),
        }),
      };

      updateMessagesInStore(chat.id, (prev) => [...prev, optimisticMessage]);
    }

    try {
      const response = await sendMessage(token, chat.id, {
        content: messageContent,
        type: "text",
        ...(replyToId && { replyToMessageId: replyToId }),
      });

      // don't append REST response to messages.
      // Our API returns an ACK (queued) object, not the message payload.
      // Text: bubble was added optimistically;
      pendingTextSendRef.current = null;
      if (response) setRetryCount(0);
    } catch (error) {
      const pending = pendingTextSendRef.current;
      pendingTextSendRef.current = null;
      if (pending?.tempId) {
        updateMessagesInStore(chat.id, (prev) =>
          prev.filter((m) => String(m.id) !== String(pending.tempId)),
        );
        textSendOutboxRef.current = textSendOutboxRef.current.filter(
          (e) => e.tempId !== pending.tempId,
        );
      }

      toast.error(getErrorMessage(error, 'Error sending message'));
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send message";
      setError(errorMessage);

      // Restore message on error
      if (!retry) {
        setNewMessage(messageContent);
        if (replyToId) setReplyingTo(replySnapshot);
      }

      // Auto-retry logic (max 2 retries)
      if (retryCount < 2 && error?.response?.status >= 500) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          handleSendMessage(true);
        }, 2000);
      }
    } finally {
      setSending(false);
    }
  };

  const getSchedulePreviewLabel = () => {
    if (voiceDraftFile) {
      return voiceDraftSeconds > 0
        ? `Voice message (${voiceDraftSeconds}s)`
        : "Voice message";
    }
    if (pendingUploadFiles.length > 1) return `${pendingUploadFiles.length} files`;
    if (pendingUploadFiles.length === 1) return pendingUploadFiles[0].name;
    if (newMessage.trim()) return newMessage.trim().slice(0, 120);
    return "";
  };

  const canScheduleCurrentDraft = () =>
    Boolean(
      voiceDraftFile ||
        pendingUploadFiles.length > 0 ||
        newMessage.trim(),
    );

  const openScheduleModal = () => {
    if (!canScheduleCurrentDraft()) {
      toast.info("Type a message, attach a file, or record a voice note to schedule");
      return;
    }
    setEditingScheduledMessage(null);
    setShowScheduleModal(true);
  };

  const bumpScheduledListRefresh = () => {
    setScheduledListRefreshKey((k) => k + 1);
  };

  const handleScheduleSend = async (scheduledAt) => {
    if (!chat || !token || !scheduledAt) return;

    const replyToId = replyingTo?.id;
    const replySnapshot = replyingTo;
    const scheduledFileCount = pendingUploadFiles.length;

    setSending(true);
    setError(null);

    try {
      if (voiceDraftFile) {
        setUploadingFile(true);
        setUploadingFileName(
          voiceDraftSeconds > 0
            ? `voice message (${voiceDraftSeconds}s)`
            : "voice message",
        );
        const uploadResponse = await uploadAttachment(token, voiceDraftFile);
        if (!uploadResponse?.data) throw new Error("Voice upload failed");
        await sendMessage(token, chat.id, {
          content: "",
          type: "audio",
          attachments: [uploadResponse.data],
          scheduledAt,
          ...(replyToId && { replyToMessageId: replyToId }),
        });
        if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
        setVoiceDraftFile(null);
        setVoiceDraftUrl(null);
        setVoiceDraftSeconds(0);
        setVoiceSeconds(0);
        voiceSecondsRef.current = 0;
      } else if (pendingUploadFiles.length > 0) {
        const files = pendingUploadFiles;
        setUploadingFile(true);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadingFileName(
            files.length > 1 ? `${file.name} (${i + 1}/${files.length})` : file.name,
          );
          const uploadResponse = await uploadAttachment(token, file);
          if (!uploadResponse?.data) throw new Error("Upload failed");
          await sendMessage(token, chat.id, {
            content: file.name,
            type: "file",
            attachments: [uploadResponse.data],
            scheduledAt,
            ...(replyToId && { replyToMessageId: replyToId }),
          });
        }
        closeUploadConfirm();
      } else if (newMessage.trim()) {
        const messageContent = newMessage.trim();
        await sendMessage(token, chat.id, {
          content: messageContent,
          type: "text",
          scheduledAt,
          ...(replyToId && { replyToMessageId: replyToId }),
        });
        setNewMessage("");
      } else {
        throw new Error("Nothing to schedule");
      }

      setReplyingTo(null);
      bumpScheduledListRefresh();
      toast.success(
        scheduledFileCount > 1
          ? `${scheduledFileCount} files scheduled for ${formatScheduledTime(scheduledAt)}`
          : `Message scheduled for ${formatScheduledTime(scheduledAt)}`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to schedule message"));
      if (!voiceDraftFile && scheduledFileCount === 0 && newMessage.trim() && replyToId) {
        setReplyingTo(replySnapshot);
      }
      throw error;
    } finally {
      setSending(false);
      setUploadingFile(false);
      setUploadingFileName(null);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleUpdateScheduledFromChat = async (scheduledAt, { content } = {}) => {
    if (!chat || !token || !editingScheduledMessage?.id || !scheduledAt) return;
    try {
      const payload = { scheduledAt };
      if (content !== undefined) payload.content = content;
      const res = await updateScheduledMessageApi(
        token,
        chat.id,
        editingScheduledMessage.id,
        payload,
      );
      const updated = res?.data ?? { ...editingScheduledMessage, ...payload };
      updateMessagesInStore(chat.id, (prev) =>
        prev.map((m) =>
          String(m.id) === String(editingScheduledMessage.id) ? { ...m, ...updated } : m,
        ),
      );
      bumpScheduledListRefresh();
      toast.success(`Updated — will send ${formatScheduledTime(scheduledAt)}`);
      setEditingScheduledMessage(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update scheduled message"));
      throw err;
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!chat || !token || !message?.id) return;
    setContextMenu(null);
    const scheduled = isScheduledMessage(message);
    const ok = window.confirm(
      scheduled ? "Cancel this scheduled message?" : "Delete this message?",
    );
    if (!ok) return;
    if (message.clientPending) {
      updateMessagesInStore(chat.id, (prev) =>
        prev.filter((m) => m.id !== message.id),
      );
      textSendOutboxRef.current = textSendOutboxRef.current.filter(
        (e) => e.tempId !== message.id,
      );
      return;
    }
    try {
      if (scheduled) {
        await deleteScheduledMessageApi(token, chat.id, message.id);
        bumpScheduledListRefresh();
      } else {
        await deleteMessageApi(token, chat.id, message.id);
      }
      updateMessagesInStore(chat.id, (prev) =>
        prev.filter((m) => m.id !== message.id),
      );
      toast.success(
        scheduled ? "Scheduled message cancelled" : "Message deleted",
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete message"));
    }
  };

  const handleToggleReaction = async (message, emoji) => {
    if (!chat || !token || !message?.id || message.clientPending) return;

    const previousReactions = message.reactions || [];
    const alreadyMine = normalizeReactions(previousReactions, currentUser?.id).some(
      (r) => r.emoji === emoji && r.reactedByMe,
    );
    const nextReactions = toggleReactionLocally(
      previousReactions,
      emoji,
      currentUser,
      !alreadyMine,
    );

    updateMessagesInStore(chat.id, (prev) =>
      prev.map((m) =>
        String(m.id) === String(message.id) ? { ...m, reactions: nextReactions } : m,
      ),
    );

    try {
      const res = alreadyMine
        ? await removeMessageReaction(token, chat.id, message.id, emoji)
        : await addMessageReaction(token, chat.id, message.id, emoji);

      const serverReactions = res?.data?.reactions || res?.reactions;
      if (Array.isArray(serverReactions)) {
        updateMessagesInStore(chat.id, (prev) =>
          prev.map((m) =>
            String(m.id) === String(message.id) ? { ...m, reactions: serverReactions } : m,
          ),
        );
      }
    } catch (err) {
      updateMessagesInStore(chat.id, (prev) =>
        prev.map((m) =>
          String(m.id) === String(message.id) ? { ...m, reactions: previousReactions } : m,
        ),
      );
      toast.error(getErrorMessage(err, "Failed to update reaction"));
    }
  };

  const copyTextToClipboard = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(successMessage);
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to copy"));
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyMessageLink = (message) => {
    if (!chat?.id || !message?.id || message.clientPending) return;
    const link = buildMessageDeepLink(chat.id, message.id);
    copyTextToClipboard(link, "Link copied to clipboard");
    setContextMenu(null);
  };

  const handleForwardDestination = async (destinations) => {
    if (forwardingMessages.length === 0 || !token) return;
    const list = Array.isArray(destinations) ? destinations : [destinations];
    if (list.length === 0) return;

    try {
      const chatIds = await Promise.all(
        list.map(async (destination) => {
          if (destination.type === "chat") {
            return destination.chatId;
          }
          if (destination.type === "user") {
            const response = await createDirectChat(token, destination.userId);
            const chatId = response?.data?.id;
            if (!chatId) {
              throw new Error("Could not create direct chat");
            }
            return chatId;
          }
          return null;
        }),
      );

      const targetChatIds = [
        ...new Set(chatIds.filter((chatId) => chatId != null).map(String)),
      ];
      if (targetChatIds.length === 0) return;

      // Forward each message in order so destinations receive them in the same sequence.
      for (const message of forwardingMessages) {
        await forwardMessage(token, {
          messageId: message.id,
          chatIds: targetChatIds,
        });
      }

      // Chats not yet in the local cache never had their socket room joined,
      // so message:new for them would otherwise go unnoticed. Pull them in now.
      const uncachedChatIds = targetChatIds.filter(
        (chatId) => !findChatByIdInStore(chatId),
      );
      uncachedChatIds.forEach(async (chatId) => {
        try {
          const detail = await getChatDetails(token, chatId);
          if (detail?.data) {
            upsertChatIntoStore(detail.data);
          }
        } catch (_) {
          // best-effort; chat will surface on next full list reload
        }
      });

      toast.success(
        forwardingMessages.length > 1
          ? `${forwardingMessages.length} messages forwarded${
              targetChatIds.length > 1 ? ` to ${targetChatIds.length} chats` : ""
            }`
          : targetChatIds.length > 1
            ? `Message forwarded to ${targetChatIds.length} chats`
            : "Message forwarded",
      );
      setForwardingMessages([]);
      setSelectionMode(false);
      setSelectedMessageIds([]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to forward message"));
      throw err;
    }
  };

  const startEditingMessage = (message) => {
    if (!message?.id) return;
    if (message.clientPending) return;
    if (message.userId !== currentUser?.id) return;
    setContextMenu(null);
    setEditingMessageId(message.id);
    setEditDraft(message.content || "");
    setTimeout(() => editTextareaRef.current?.focus(), 0);
  };

  const handleToggleReply = (message) => {
    if (!message?.id || message.clientPending) return;
    setReplyingTo((prev) =>
      prev && String(prev.id) === String(message.id) ? null : message,
    );
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const startMessageSelection = (message) => {
    if (!message?.id) return;
    setSelectionMode(true);
    setSelectedMessageIds([String(message.id)]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleToggleMessageSelection = (message) => {
    if (!message?.id) return;
    const messageId = String(message.id);
    setSelectedMessageIds((prev) => {
      if (prev.includes(messageId)) {
        return prev.filter((id) => id !== messageId);
      }
      if (prev.length >= FORWARD_SELECTION_LIMIT) {
        toast.error(`You can forward up to ${FORWARD_SELECTION_LIMIT} messages at a time`);
        return prev;
      }
      return [...prev, messageId];
    });
  };

  const handleForwardSelectedMessages = () => {
    if (selectedMessageIds.length === 0) return;
    const selectedMessages = messages.filter((m) =>
      selectedMessageIds.includes(String(m.id)),
    );
    if (selectedMessages.length === 0) return;
    setForwardingMessages(selectedMessages);
    setShowForwardModal(true);
  };

  const handleContextMenuAction = (action, message) => {
    switch (action) {
      case "reply":
        setContextMenu(null);
        setReplyingTo(message);
        setTimeout(() => textareaRef.current?.focus(), 0);
        break;
      case "copy": {
        setContextMenu(null);
        const text = message?.content || "";
        if (text) {
          navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
        }
        break;
      }
      case "copyLink":
        handleCopyMessageLink(message);
        break;
      case "forward":
        setContextMenu(null);
        setForwardingMessages([message]);
        setShowForwardModal(true);
        break;
      case "select":
        setContextMenu(null);
        startMessageSelection(message);
        break;
      case "editSchedule":
        setContextMenu(null);
        setEditingScheduledMessage(message);
        setShowScheduleModal(true);
        break;
      case "edit":
        startEditingMessage(message);
        break;
      case "delete":
      case "cancelSend":
        handleDeleteMessage(message);
        break;
      default:
        break;
    }
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditDraft("");
    setIsSavingEdit(false);
    setEditTextSelection(null);
  };

  const handleSaveEditedMessage = async (message) => {
    if (!chat || !token || !message?.id) return;
    if (message.clientPending) return;
    if (message.userId !== currentUser?.id) return;

    const nextContent = (editDraft || "").trim();
    if (!nextContent) {
      toast.error("Message cannot be empty");
      return;
    }

    // No change: just exit edit mode
    if (String(nextContent) === String(message.content || "").trim()) {
      cancelEditingMessage();
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateMessageApi(token, chat.id, message.id, {
        content: nextContent,
      });

      const serverMessage = res?.data || res;
      replaceMessage(chat.id, message.id, {
        ...(serverMessage && typeof serverMessage === "object" ? serverMessage : {}),
        content: nextContent,
        updatedAt:
          serverMessage?.updatedAt ||
          serverMessage?.data?.updatedAt ||
          new Date().toISOString(),
      });
      toast.success("Message updated");
      cancelEditingMessage();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update message"));
      setIsSavingEdit(false);
    }
  };

  const handleFileUpload = async (file, { scheduledAt, progressLabel } = {}) => {
    if (!file || !chat) return;

    setUploadingFile(true);
    setUploadingFileName(progressLabel || file.name);
    try {
      const uploadResponse = await uploadAttachment(token, file);

      if (uploadResponse?.data) {
        await sendMessage(token, chat.id, {
          content: file.name,
          type: "file",
          attachments: [uploadResponse.data],
          ...(scheduledAt && { scheduledAt }),
        });
        if (scheduledAt) {
          bumpScheduledListRefresh();
          toast.success(`File scheduled for ${formatScheduledTime(scheduledAt)}`);
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Upload failed. Please try again."));
    } finally {
      setUploadingFile(false);
      setUploadingFileName(null);
    }
  };

  const handleVoiceUpload = async (file, durationSeconds, { scheduledAt } = {}) => {
    if (!file || !chat) return;
    setUploadingFile(true);
    setUploadingFileName(
      typeof durationSeconds === "number" && durationSeconds > 0
        ? `voice message (${durationSeconds}s)`
        : "voice message",
    );
    try {
      const uploadResponse = await uploadAttachment(token, file);
      if (uploadResponse?.data) {
        // const label =
        //   typeof durationSeconds === "number" && durationSeconds > 0
        //     ? `Voice message (${durationSeconds}s)`
        //     : "Voice message";
        const messageResponse = await sendMessage(token, chat.id, {
          content: "",
          type: "audio",
          attachments: [uploadResponse.data],
          ...(scheduledAt && { scheduledAt }),
        });
        if (scheduledAt) {
          bumpScheduledListRefresh();
          toast.success(`Voice note scheduled for ${formatScheduledTime(scheduledAt)}`);
        }
        if (messageResponse) return true;
      }
    } catch (error) {
      console.log(error);
      toast.error(getErrorMessage(error, "Voice message upload failed."));
      return false;
    } finally {
      setUploadingFile(false);
      setUploadingFileName(null);
    }
    return false;
  };

  const pickSupportedAudioMimeType = () => {
    // Prefer opus in webm if supported (Chrome/Edge). Fall back gracefully.
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const mt of candidates) {
      try {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(mt)) return mt;
      } catch (_) {
        // 
      }
    }
    return "";
  };

  const cleanupVoiceCapture = () => {
    try {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    } catch (_) {
      //
    }
    try {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((t) => t.stop());
        voiceStreamRef.current = null;
      }
    } catch (_) {
      //
    }
    mediaRecorderRef.current = null;
    voiceChunksRef.current = [];
    voiceStoppingRef.current = false;
    voiceDiscardOnStopRef.current = false;
    setIsRecordingVoice(false);
    setIsVoicePaused(false);
  };

  const discardVoiceDraft = () => {
    // If currently recording, stop recorder but discard result
    if (isRecordingVoice) {
      voiceDiscardOnStopRef.current = true;
      stopVoiceRecording();
      return;
    }
    if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
    setVoiceDraftFile(null);
    setVoiceDraftUrl(null);
    setVoiceDraftSeconds(0);
    setVoiceSeconds(0);
    voiceSecondsRef.current = 0;
    setIsVoicePaused(false);
    setIsRecordingVoice(false);
    cleanupVoiceCapture();
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const togglePauseVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    try {
      if (recorder.state === "recording") {
        recorder.pause();
        setIsVoicePaused(true);
      } else if (recorder.state === "paused") {
        recorder.resume();
        setIsVoicePaused(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to toggle pause"));
    }
  };

  const startVoiceRecording = async () => {
    if (isRecordingVoice || uploadingFile || sending) return;
    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error("Microphone is not supported in this browser.");
      return;
    }

    try {
      // Clear any previous draft
      if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
      setVoiceDraftFile(null);
      setVoiceDraftUrl(null);
      setVoiceDraftSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      setVoiceSeconds(0);
      voiceSecondsRef.current = 0;
      setIsVoicePaused(false);
      voiceStoppingRef.current = false;
      voiceDiscardOnStopRef.current = false;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) voiceChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          if (voiceTimerRef.current) {
            clearInterval(voiceTimerRef.current);
            voiceTimerRef.current = null;
          }

          const seconds = voiceSecondsRef.current;
          const blobType =
            recorder.mimeType ||
            (voiceChunksRef.current[0] && voiceChunksRef.current[0].type) ||
            "audio/webm";
          const blob = new Blob(voiceChunksRef.current, { type: blobType });

          // Stop tracks to release mic ASAP
          try {
            if (voiceStreamRef.current) {
              voiceStreamRef.current.getTracks().forEach((t) => t.stop());
              voiceStreamRef.current = null;
            }
          } catch (_) {
            // 
          }

          mediaRecorderRef.current = null;
          voiceChunksRef.current = [];

          if (voiceDiscardOnStopRef.current) {
            // User discarded; do not create draft
            return;
          }

          if (!blob || blob.size === 0) {
            toast.error("Could not record audio. Please try again.");
            return;
          }

          // Avoid sending extremely short accidental recordings (< 1s)
          if (!seconds || seconds < 1) {
            toast.info("Recording too short.");
            return;
          }

          const ext = blobType.includes("ogg") ? "ogg" : "webm";
          const file = new File([blob], `voice-${Date.now()}.${ext}`, {
            type: blobType,
          });

          if (autoSendVoiceOnStopRef.current) {
            autoSendVoiceOnStopRef.current = false;
            await handleVoiceUpload(file, seconds);
            return;
          }

          const url = URL.createObjectURL(blob);
          setVoiceDraftFile(file);
          setVoiceDraftUrl(url);
          setVoiceDraftSeconds(seconds);
        } finally {
          setIsRecordingVoice(false);
          setIsVoicePaused(false);
          setVoiceSeconds(0);
        }
      };

      recorder.start();
      setIsRecordingVoice(true);
      voiceTimerRef.current = setInterval(() => {
        if (voicePausedRef.current) return;
        const next = voiceSecondsRef.current + 1;
        voiceSecondsRef.current = next;
        setVoiceSeconds(next);
        if (next >= MAX_VOICE_SECONDS && !voiceStoppingRef.current) {
          voiceStoppingRef.current = true;
          toast.info("Reached 5 minute limit. Recording stopped.");
          stopVoiceRecording();
        }
      }, 1000);
    } catch (err) {
      toast.error(getErrorMessage(err, "Microphone permission denied."));
      setIsRecordingVoice(false);
      setIsVoicePaused(false);
      setVoiceSeconds(0);
      voiceSecondsRef.current = 0;
      try {
        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach((t) => t.stop());
          voiceStreamRef.current = null;
        }
      } catch (_) {
        // 
      }
      mediaRecorderRef.current = null;
      voiceChunksRef.current = [];
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    }
  };

  const stopVoiceRecording = () => {
    if (!isRecordingVoice) return;
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        if (recorder.state === "paused") {
          try {
            recorder.resume();
          } catch (_) {
            //
          }
        }
        recorder.stop();
      } else {
        // fallback cleanup
        setIsRecordingVoice(false);
        setIsVoicePaused(false);
        setVoiceSeconds(0);
        voiceSecondsRef.current = 0;
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to stop recording"));
      setIsRecordingVoice(false);
      setIsVoicePaused(false);
      setVoiceSeconds(0);
      voiceSecondsRef.current = 0;
    }
  };

  const sendPausedVoiceRecording = () => {
    if (!isRecordingVoice || !isVoicePaused) return;
    autoSendVoiceOnStopRef.current = true;
    stopVoiceRecording();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingOver(false);
    }
  };

  const showUploadConfirm = (files) => {
    const fileList = (Array.isArray(files) ? files : [files]).filter(Boolean);
    if (fileList.length === 0 || uploadingFile || !chat) return;

    // Add to whatever's already staged rather than replacing it, so successive
    // drops/picks/pastes accumulate into one batch (capped at FILE_UPLOAD_LIMIT).
    const availableSlots = FILE_UPLOAD_LIMIT - pendingUploadFiles.length;
    if (availableSlots <= 0) {
      toast.error(`You can send up to ${FILE_UPLOAD_LIMIT} files at a time`);
      return;
    }

    const filesToAdd = fileList.slice(0, availableSlots);
    if (fileList.length > availableSlots) {
      toast.error(`You can send up to ${FILE_UPLOAD_LIMIT} files at a time`);
    }

    const newPreviewUrls = filesToAdd.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    );

    setPendingUploadFiles((prev) => [...prev, ...filesToAdd]);
    setPendingUploadPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const closeUploadConfirm = () => {
    pendingUploadPreviewUrls.forEach((url) => url && URL.revokeObjectURL(url));
    setPendingUploadFiles([]);
    setPendingUploadPreviewUrls([]);
  };

  const removePendingUploadFile = (index) => {
    const url = pendingUploadPreviewUrls[index];
    if (url) URL.revokeObjectURL(url);
    setPendingUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingUploadPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUploadSend = async () => {
    if (pendingUploadFiles.length === 0) return;
    const files = pendingUploadFiles;
    closeUploadConfirm();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await handleFileUpload(file, {
        progressLabel:
          files.length > 1 ? `${file.name} (${i + 1}/${files.length})` : undefined,
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (uploadingFile || !chat) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    showUploadConfirm(files);
  };

  const handlePaste = (e) => {
    if (!chat || uploadingFile) return;
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        e.stopPropagation();
        const file = item.getAsFile();
        if (file) {
          const ext = (file.type || "image/png").split("/")[1] || "png";
          const uniqueName = `image-${Date.now()}.${ext}`;
          const freshFile = new File([file.slice(0, file.size, file.type)], uniqueName, {
            type: file.type,
          });
          showUploadConfirm(freshFile);
        }
        return;
      }
    }

    const files = clipboardData.files;
    if (files && files.length > 0) {
      const imageFile = Array.from(files).find((f) =>
        f.type.startsWith("image/")
      );
      if (imageFile) {
        e.preventDefault();
        e.stopPropagation();
        const ext = (imageFile.type || "image/png").split("/")[1] || "png";
        const uniqueName = `pasted-image-${Date.now()}.${ext}`;
        const freshFile = new File(
          [imageFile.slice(0, imageFile.size, imageFile.type)],
          uniqueName,
          { type: imageFile.type }
        );
        showUploadConfirm(freshFile);
      }
    }
  };

  const handleTyping = () => {
    if (!chat || !socket || !isConnected) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    startTyping(chat.id);

    // Emit typing stop after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(chat.id);
    }, 3000);
  };

  const scrollToBottom = (instant = false) => {
    if (instant) {
      // Instant scroll for initial load - jump directly to bottom
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    } else {
      // Smooth scroll for subsequent scrolls (e.g., new messages)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getUserDesignationByUserId = (userId) => {
    if (!userId || !chat?.members?.length) return "";
    const member = chat.members.find((m) => String(m?.userId) === String(userId));
    const designation = member?.user?.designation || "";
    return designation ? `(${designation})` : "";
  };

  const getDirectChatOtherMember = () => {
    if (chat?.type !== "direct" || !chat?.members?.length) return null;
    return chat.members.find((m) => m.userId !== currentUser?.id) || null;
  };

  const getUserDetailsByUserId = (userId, fallbackUser) => {
    if (!userId) return null;
    const member = chat?.members?.find((m) => String(m?.userId) === String(userId));
    const user = member?.user || fallbackUser;
    const profilePicture =
      getProfilePictureUrl(user) || getProfilePictureUrl(fallbackUser) || "";
    return {
      id: userId,
      name: user?.name || fallbackUser?.name || "Unknown User",
      email: user?.email || fallbackUser?.email || "",
      designation: user?.designation || fallbackUser?.designation || "",
      profilePicture,
    };
  };

  const getUserStatusByUserId = (userId) => {
    if (!userId) return "offline";
    return typeof getUserStatus === "function"
      ? getUserStatus(userId)
      : isUserOnline(userId)
        ? "online"
        : "offline";
  };

  const handleOpenUserDetails = (userId, fallbackUser) => {
    const user = getUserDetailsByUserId(userId, fallbackUser);
    if (!user) return;
    setSelectedUserDetails({
      user,
      status: getUserStatusByUserId(userId),
    });
    setShowUserDetails(true);
  };

  const handleCloseUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUserDetails(null);
  };

  const isDirectChatWithUser = (userId) => {
    if (!userId || chat?.type !== "direct") return false;
    const otherMember = getDirectChatOtherMember();
    return otherMember && String(otherMember.userId) === String(userId);
  };

  const canMessageFromUserDetails = (userId) => {
    if (!userId || !onOpenDirectChatWithUser) return false;
    if (String(userId) === String(currentUser?.id)) return false;
    return !isDirectChatWithUser(userId);
  };

  const handleMessageUserFromDetails = (userId) => {
    if (!canMessageFromUserDetails(userId)) return;
    handleCloseUserDetails();
    onOpenDirectChatWithUser(userId);
  };

  const getChatName = () => {
    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }
    if (chat.members && chat.members.length > 0) {
      const otherMember = getDirectChatOtherMember();
      const name = otherMember?.user?.name || "Unknown User";
      const designation = getUserDesignationByUserId(otherMember?.userId);
      return name + " " + designation;
    }
    return "Direct Chat";
  };

  const getChatAvatar = () => {
    if (chat.type === "group") {
      return chat.name?.charAt(0).toUpperCase() || "G";
    }
    if (chat.members && chat.members.length > 0) {
      const otherMember = chat.members.find(
        (m) => m.userId !== currentUser?.id,
      );
      return otherMember?.user?.name?.charAt(0).toUpperCase() || "U";
    }
    return "D";
  };

  const getAvatarColor = () => getAvatarColorById(chat?.id);

  // const isOnline = () => {
  //   if (chat?.type === "group") return false;
  //   if (chat?.members && chat?.members?.length > 0) {
  //     const otherMember = chat?.members?.find(
  //       (m) => m?.userId !== currentUser?.id,
  //     );
  //     return otherMember ? isUserOnline(otherMember?.userId) : false;
  //   }
  //   return false;
  // };

  const getDirectChatUserStatus = () => {
    if (chat?.type !== "direct") return "offline";
    if (!chat?.members || chat?.members?.length === 0) return "offline";
    const otherMember = chat?.members?.find((m) => m?.userId !== currentUser?.id);
    const otherUserId = otherMember?.userId;
    if (!otherUserId) return "offline";
    return typeof getUserStatus === "function" ? getUserStatus(otherUserId) : (isUserOnline(otherUserId) ? "online" : "offline");
  };

  const directChatStatus = getDirectChatUserStatus();
  const directChatStatusStyle = getUserStatusStyle(directChatStatus);

  // Mention detection and handling functions
  const detectMention = (text, cursorPosition) => {
    if (!text || cursorPosition === undefined) return null;

    const textBeforeCursor = text.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    // Check if @ exists and is not preceded by another @ (to avoid nested mentions)
    if (atIndex === -1 || textBeforeCursor[atIndex - 1] === "@") return null;

    // Check if there's a space between @ and cursor (if so, don't show suggestions)
    const textAfterAt = textBeforeCursor.substring(atIndex + 1);
    if (textAfterAt.includes(" ")) return null;

    // Get the search query (everything after @)
    const searchQuery = textAfterAt;

    return {
      triggerPosition: atIndex,
      searchQuery: searchQuery,
    };
  };

  const handleMentionSelect = (member) => {
    if (!member || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const text = newMessage;
    const cursorPosition = textarea.selectionStart;

    // Find the @ symbol before the cursor
    const textBeforeCursor = text.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex === -1) return;

    // Find the end of the current mention (up to cursor position)
    const mentionStart = atIndex;
    const mentionEnd = cursorPosition;

    // Replace the mention (from @ to cursor) with the selected member's name
    const beforeMention = text.substring(0, mentionStart);
    const afterMention = text.substring(mentionEnd);
    const mentionText = `@${member.user.name}`;

    const newText = beforeMention + mentionText + afterMention;
    const newCursorPosition = beforeMention.length + mentionText.length;

    setNewMessage(newText);
    setShowMentionSuggestions(false);
    setMentionSearchQuery("");
    setMentionSelectedIndex(0);

    // Set cursor position after the mention
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };
  const getCaretCoordinates = (textarea, position) => {
    const div = document.createElement("div");
    const style = window.getComputedStyle(textarea);

    for (let prop of style) {
      div.style[prop] = style[prop];
    }

    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";

    div.textContent = textarea.value.substring(0, position);

    const span = document.createElement("span");
    span.textContent = textarea.value.substring(position) || ".";
    div.appendChild(span);

    document.body.appendChild(div);

    const { offsetLeft, offsetTop } = span;

    document.body.removeChild(div);

    return { left: offsetLeft, top: offsetTop };
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setNewMessage(text);
    handleTyping();

    // Only show mention suggestions for group chats
    if (chat?.type !== "group") {
      setShowMentionSuggestions(false);
      return;
    }

    const mentionInfo = detectMention(text, cursorPosition);

    if (mentionInfo) {
      setMentionSearchQuery(mentionInfo.searchQuery);
      setMentionSelectedIndex(0);

      // Calculate position for suggestions dropdown near the textarea
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        const caret = getCaretCoordinates(textarea, cursorPosition);

        const dropdownHeight = 200; // approx height of suggestions
        const spaceBelow = window.innerHeight - (rect.top + caret.top);
        const spaceAbove = rect.top + caret.top;

        let top;

        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          // Show ABOVE caret
          top = rect.top + caret.top - dropdownHeight - 8;
        } else {
          // Show BELOW caret
          top = rect.top + caret.top + 20;
        }

        setMentionSuggestionsPosition({
          left: rect.left + caret.left,
          top,
        });
      }

      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
    }
  };

  const formatMessageDate = (date) => {
    // Parse UTC timestamp and convert to browser's local timezone
    const msgDate = moment.utc(date).local();
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "day").startOf("day");

    if (msgDate.isSame(today, "day")) {
      return "Today";
    } else if (msgDate.isSame(yesterday, "day")) {
      return "Yesterday";
    } else {
      return msgDate.format("DD MMMM");
    }
  };

  const getSearchResultPreviewText = (message) => {
    const content = (message?.content || "").trim();
    if (content) return content;
    if (Array.isArray(message?.attachments) && message.attachments.length > 0) {
      const first = message.attachments[0];
      return first?.fileName || "Attachment";
    }
    return "Message";
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setSearchError("");
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const resetSearchAndRestoreChat = () => {
    setIsSearchOpen(false);
    setSearchKeyword("");
    setSearchResults([]);
    setSearchError("");
    setSearchLoading(false);
    setIsShowingSearchContext(false);

    if (preSearchState) {
      searchContextActiveRef.current = false;
      setMessagesSnapshot(chat.id, preSearchState.messages, {
        page: preSearchState.page,
        hasMore: preSearchState.hasMore,
      });
      setPreSearchState(null);
      setTimeout(() => scrollToBottom(true), 0);
    } else {
      searchContextActiveRef.current = false;
      loadMessages(1);
    }
  };

  const handleSearchMessages = async () => {
    const trimmedKeyword = searchKeyword.trim();
    if (!trimmedKeyword || !chat || !token) return;

    try {
      setSearchLoading(true);
      setSearchError("");
      setIsShowingSearchContext(false);
      const response = await searchChatMessages(token, chat.id, {
        keyword: trimmedKeyword,
        contextBefore: 5,
        contextAfter: 5,
      });
      const results = Array.isArray(response?.data) ? response.data : [];
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("No matching messages found.");
      }
    } catch (err) {
      setSearchError(getErrorMessage(err, "Failed to search messages"));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUseSearchResult = (result) => {
    if (!result) return;
    if (!preSearchState) {
      setPreSearchState({
        messages,
        page,
        hasMore,
      });
    }

    const contextMessages = Array.isArray(result.context) ? result.context : [];
    searchContextActiveRef.current = true;
    setMessages(contextMessages);
    setHasMore(false);
    setPage(1);
    setIsShowingSearchContext(true);
    setHighlightMessageId(result.anchorMessageId || result.matchedMessage?.id || null);
    setTimeout(() => {
      if (!messagesContainerRef.current) return;
      const targetId = String(result.anchorMessageId || result.matchedMessage?.id || "");
      if (!targetId) return;
      const el = messagesContainerRef.current.querySelector(
        `[data-message-id="${targetId}"]`,
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightMessageId(null), 2500);
    }, 50);
  };

  const groupMessagesByDate = (messages) => {
    const grouped = [];
    let currentDate = null;

    messages?.forEach((msg) => {
      const msgDate = formatMessageDate(msg.createdAt);
      if (msgDate !== currentDate) {
        grouped.push({ type: "date", date: msgDate });
        currentDate = msgDate;
      }
      grouped.push({ type: "message", message: msg });
    });

    return grouped;
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center chat-bg-muted">
        <div className="text-center chat-text-muted">
          <p className="text-lg">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  // Instantly clear previous chat messages + show loader when switching chats
  // (avoids one-frame flash of the old thread before effects run)
  if (String(chat.id) !== String(loadedChatId ?? "")) {
    setLoadedChatId(chat.id);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
  }

  const groupedMessages = groupMessagesByDate(
    String(chat.id) === String(loadedChatId ?? "") ? messages : [],
  );
  const showMessagesLoader =
    loading &&
    (messages.length === 0 || String(chat.id) !== String(loadedChatId ?? ""));

  const handleCloseGroupInfo = () => {
    setShowGroupInfo(false);
  };

  const handleCloseScheduledMessages = () => {
    setShowScheduledMessages(false);
  };

  const handleHeaderBack = () => {
    if (showGroupInfo) {
      handleCloseGroupInfo();
      return;
    }
    if (showScheduledMessages) {
      handleCloseScheduledMessages();
      return;
    }
    onBack?.();
  };

  const handleOpenGroupInfo = () => {
    if (isSearchOpen) {
      resetSearchAndRestoreChat();
    }
    setShowScheduledMessages(false);
    setShowGroupInfo(true);
  };

  const handleOpenScheduledMessages = () => {
    if (isSearchOpen) {
      resetSearchAndRestoreChat();
    }
    setShowGroupInfo(false);
    setShowScheduledMessages(true);
  };

  const handleOpenDirectChatUserDetails = () => {
    if (isSearchOpen) {
      resetSearchAndRestoreChat();
    }
    const otherMember = getDirectChatOtherMember();
    if (otherMember?.userId) {
      handleOpenUserDetails(otherMember.userId, otherMember.user);
    }
  };

  const isSecondaryScreen = showGroupInfo || showScheduledMessages;

  return (
    <div
      className="flex flex-col h-full chat-surface w-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Message context menu (Reply, Copy, Delete) */}
      {contextMenu && (
        <MessageContextMenu
          ref={contextMenuRef}
          contextMenu={contextMenu}
          currentUserId={currentUser?.id}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Drag overlay - drop zone */}
      {isDraggingOver && <DropZoneOverlay />}
      {/* Header */}
      <ChatHeader
        chat={chat}
        onBack={onBack}
        isSecondaryScreen={isSecondaryScreen}
        showGroupInfo={showGroupInfo}
        showScheduledMessages={showScheduledMessages}
        chatName={getChatName()}
        chatAvatar={getChatAvatar()}
        avatarUrl={getProfilePictureUrl(getDirectChatOtherMember()?.user)}
        avatarColorClass={getAvatarColor()}
        directChatStatusStyle={directChatStatusStyle}
        isSearchOpen={isSearchOpen}
        isMuted={isGroupMuted}
        isMuting={isMutingGroup}
        isLeaving={isLeavingGroup}
        onHeaderBack={handleHeaderBack}
        onToggleSearch={() => {
          if (isSearchOpen) {
            resetSearchAndRestoreChat();
          } else {
            handleOpenSearch();
          }
        }}
        onOpenScheduledMessages={handleOpenScheduledMessages}
        onOpenGroupInfo={handleOpenGroupInfo}
        onToggleMuteGroup={toggleGroupMute}
        onLeaveGroup={leaveGroupChat}
        onOpenDirectChatUserDetails={handleOpenDirectChatUserDetails}
        onOpenDirectChatName={() => {
          const otherMember = getDirectChatOtherMember();
          if (otherMember?.userId) {
            handleOpenUserDetails(otherMember.userId, otherMember.user);
          }
        }}
        onStartCall={onStartCall ? () => onStartCall(chat) : undefined}
      />

      {showGroupInfo && chat.type === "group" ? (
        <GroupInfoPanel
          chat={chat}
          onChatUpdated={(updatedChat) => {
            if (onChatUpdated && updatedChat) {
              onChatUpdated(updatedChat);
            }
          }}
          onLeftGroup={(chatId) => {
            setShowGroupInfo(false);
            onLeftGroup?.(chatId);
          }}
        />
      ) : showScheduledMessages ? (
        <ScheduledMessagesPanel
          chatId={chat?.id}
          token={token}
          refreshKey={scheduledListRefreshKey}
        />
      ) : (
        <>
      {selectionMode && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 chat-divider-b chat-surface">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exitSelectionMode}
              className="p-1 rounded-full chat-text-secondary chat-hover"
              aria-label="Cancel selection"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium chat-text">
              {selectedMessageIds.length} of {FORWARD_SELECTION_LIMIT} selected
            </span>
          </div>
          <button
            type="button"
            onClick={handleForwardSelectedMessages}
            disabled={selectedMessageIds.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <ForwardIcon className="w-4 h-4" />
            Forward
          </button>
        </div>
      )}
      {isSearchOpen && !selectionMode && (
        <MessageSearchBar
          ref={searchInputRef}
          searchKeyword={searchKeyword}
          onSearchKeywordChange={setSearchKeyword}
          onSearch={handleSearchMessages}
          onClearSearch={() => {
            setSearchKeyword("");
            setSearchResults([]);
            setSearchError("");
            setIsShowingSearchContext(false);
          }}
          searchLoading={searchLoading}
          searchError={searchError}
          isShowingSearchContext={isShowingSearchContext}
          onResetSearchContext={resetSearchAndRestoreChat}
        />
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="chat-scroll flex-1 overflow-y-auto p-4 chat-chrome-alt relative"
        onScroll={(e) => {
          if (e.target.scrollTop === 0 && hasMore && !loading) {
            handleLoadMore();
          }
        }}
      >
        {isLocatingSharedMessage && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader
              message="Loading message..."
              subMessage="Finding message in chat history"
              className="min-h-[200px]"
            />
          </div>
        )}
        {isSearchOpen && !isShowingSearchContext ? (
          <div>
            {searchLoading ? (
              <div className="flex items-center justify-center h-full min-h-[240px]">
                <div className="text-sm chat-text-muted">
                  Searching messages...
                </div>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[240px]">
                <div className="text-center chat-text-muted">
                  <p className="text-base">Search for messages</p>
                  <p className="text-sm mt-1">Results will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, idx) => {
                  const matched = result?.matchedMessage;
                  const preview = getSearchResultPreviewText(matched);
                  const hasAttachment =
                    Array.isArray(matched?.attachments) &&
                    matched.attachments.length > 0;
                  return (
                    <button
                      key={`${matched?.id || "m"}-${idx}`}
                      type="button"
                      onClick={() => handleUseSearchResult(result)}
                      className="w-full text-left rounded-lg border chat-border chat-surface chat-hover px-3 py-2 transition-colors"
                    >
                      <div className="text-xs chat-text-muted mb-1">
                        {matched?.createdAt
                          ? moment.utc(matched.createdAt).local().format("DD/MM/YYYY")
                          : ""}
                      </div>
                      <div className="text-sm chat-text line-clamp-2 break-words">
                        {preview}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {matched?.user?.name || "User"}
                        </span>
                        {hasAttachment && (
                          <span className="chat-accent-muted">
                            attachment
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : showMessagesLoader ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
              <div className="text-sm chat-text-muted">
                Loading messages...
              </div>
            </div>
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center chat-text-muted">
              <p>No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center mb-4">
                <button
                  onClick={handleLoadMore}
                  className="text-sm chat-accent-muted chat-accent"
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}
            {groupedMessages.map((item, idx) => {
              if (item.type === "date") {
                return (
                  <div key={`date-${idx}`} className="text-center my-4">
                    <span className="text-xs chat-text-muted chat-bubble-own px-3 py-1 rounded-full">
                      {item.date}
                    </span>
                  </div>
                );
              }
              // Find the previous message (skip date separators)
              let previousMessage = null;
              for (let i = idx - 1; i >= 0; i--) {
                if (groupedMessages[i].type === "message") {
                  previousMessage = groupedMessages[i].message;
                  break;
                }
              }
              // Find the next message (skip date separators)
              let nextMessage = null;
              for (let i = idx + 1; i < groupedMessages.length; i++) {
                if (groupedMessages[i].type === "message") {
                  nextMessage = groupedMessages[i].message;
                  break;
                }
              }
              return (
                <div key={`msg-${item.message.id}`}>
                  <MessageBubble
                    message={item.message}
                    previousMessage={previousMessage}
                    nextMessage={nextMessage}
                    chat={chat}
                    currentUser={currentUser}
                    token={token}
                    messages={messages}
                    avatarColorClass={getAvatarColor()}
                    highlightMessageId={highlightMessageId}
                    replyingTo={replyingTo}
                    pendingScrollToReplyMessageId={pendingScrollToReplyMessageId}
                    editingMessageId={editingMessageId}
                    editDraft={editDraft}
                    editTextSelection={editTextSelection}
                    isSavingEdit={isSavingEdit}
                    editTextareaRef={editTextareaRef}
                    messagesContainerRef={messagesContainerRef}
                    onNavigateToMessage={onNavigateToMessage}
                    onOpenUserDetails={handleOpenUserDetails}
                    getUserDesignationByUserId={getUserDesignationByUserId}
                    onContextMenu={setContextMenu}
                    onToggleReply={handleToggleReply}
                    onHighlightMessage={setHighlightMessageId}
                    onPendingScrollToReply={setPendingScrollToReplyMessageId}
                    onImageClick={(src) => {
                      setLightboxSlides([{ src }]);
                      setLightboxOpen(true);
                    }}
                    onJoinCall={onJoinCall}
                    applyEditTextFormat={applyEditTextFormat}
                    handleEditTextareaSelect={handleEditTextareaSelect}
                    onEditDraftChange={setEditDraft}
                    onEditTextSelectionChange={setEditTextSelection}
                    onCancelEdit={cancelEditingMessage}
                    onSaveEdit={handleSaveEditedMessage}
                    onToggleReaction={handleToggleReaction}
                    selectionMode={selectionMode}
                    isSelected={selectedMessageIds.includes(String(item.message.id))}
                    onToggleSelect={handleToggleMessageSelection}
                  />
                </div>
              );
            })}
            {typingUsers.length > 0 && (
              <div className="flex justify-start mb-4">
                <div className="chat-bubble-own px-4 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 chat-text-subtle bg-current rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 chat-text-subtle bg-current rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 chat-text-subtle bg-current rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            {uploadingFileName && (
              <div className="flex justify-end mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/40 px-4 py-2 rounded-lg flex items-center gap-2">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Uploading {uploadingFileName}...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex items-center justify-between">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Area - paste image support */}
      <div
        className="p-2 chat-divider-t chat-surface relative"
        onPaste={handlePaste}
      >
        {/* Mention Suggestions */}
        {showMentionSuggestions && chat?.type === "group" && (
          <MentionSuggestions
            members={chat.members || []}
            onMentionSelect={handleMentionSelect}
            searchQuery={mentionSearchQuery}
            isVisible={showMentionSuggestions}
            position={mentionSuggestionsPosition}
            selectedIndex={mentionSelectedIndex}
            onSelectedIndexChange={setMentionSelectedIndex}
          />
        )}

        {/* Reply Preview */}
        {replyingTo && (
          <ReplyPreviewBanner
            replyingTo={replyingTo}
            onCancel={() => setReplyingTo(null)}
          />
        )}
        {/* Floating formatting toolbar (only visible when text is selected in the textarea) */}
        {textSelection && !(isRecordingVoice || voiceDraftFile) && (
          <div
            data-format-toolbar="true"
            className="absolute bottom-full left-2 mb-2 z-40"
          >
            <FormatToolbar onFormat={applyTextFormat} />
          </div>
        )}
        <div className={`flex ${isRecordingVoice || voiceDraftFile ? 'items-center' : 'items-end'} gap-2 `}>
          {!(isRecordingVoice || voiceDraftFile) && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 chat-hover rounded-full transition-colors"
              disabled={uploadingFile}
            >
              <PaperclipIcon className="w-5 h-5 chat-text-muted" />
            </button>
          )}
          {!(isRecordingVoice || voiceDraftFile) && (
            <EmojiPickerButton onEmojiClick={insertEmojiIntoMessage} disabled={uploadingFile} />
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                showUploadConfirm(files);
              }
              e.target.value = ""; // Reset input
            }}
          />
          {(isRecordingVoice || voiceDraftFile) && (
            <VoiceRecorderControls
              isRecordingVoice={isRecordingVoice}
              voiceDraftFile={voiceDraftFile}
              voiceDraftUrl={voiceDraftUrl}
              sending={sending}
              uploadingFile={uploadingFile}
              hasPendingUpload={pendingUploadFiles.length > 0}
              isVoicePaused={isVoicePaused}
              voiceSeconds={voiceSeconds}
              voiceMaxSeconds={VOICE_MAX_SECONDS}
              formatTime={formatTime}
              onStartRecording={startVoiceRecording}
              onStopRecording={stopVoiceRecording}
              onTogglePause={togglePauseVoiceRecording}
              onDiscard={discardVoiceDraft}
            />
          )}
          {!(isRecordingVoice || voiceDraftFile) && (
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                handleInputChange(e);
                handleTextareaSelect();
              }}
              onSelect={handleTextareaSelect}
              onMouseUp={handleTextareaSelect}
              onKeyUp={handleTextareaSelect}
              onBlur={(e) => {
                // Keep the toolbar visible while interacting with it (it uses preventDefault on mousedown).
                // If focus moves elsewhere on the page, clear the selection state.
                const next = e.relatedTarget;
                if (!next || !next.closest?.("[data-format-toolbar]")) {
                  setTextSelection(null);
                }
              }}
              onKeyDown={(e) => {
                if (handleFormatShortcut(e, applyTextFormat)) return;

                if ((e.key === "Enter" || e.key === "NumpadEnter") && !e.shiftKey) {
                  if (e.isComposing) return;
                  e.preventDefault();
                  if (showMentionSuggestions && mentionSelectedIndex >= 0) {
                    const filteredMembers = (chat.members || []).filter((member) => {
                      if (!member.user?.name) return false;
                      return member.user.name
                        .toLowerCase()
                        .includes(mentionSearchQuery.toLowerCase());
                    });
                    if (mentionSelectedIndex < filteredMembers.length) {
                      handleMentionSelect(filteredMembers[mentionSelectedIndex]);
                    }
                    return;
                  }

                  if (
                    !sending &&
                    !uploadingFile &&
                    !isRecordingVoice &&
                    newMessage.trim()
                  ) {
                    handleSendMessage(false);
                  }
                }
              }}
              className="chat-scroll flex-1 px-4 py-2 border chat-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 chat-input-field chat-text"
              disabled={uploadingFile}
              rows={1}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
                overflowY: "auto",
              }}
            />
          )}
          {/* Action slot: voice draft shows aligned delete + send */}
          {voiceDraftFile ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={discardVoiceDraft}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full chat-hover chat-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)]"
                title="Delete voice note"
                aria-label="Delete voice note"
              >
                <TrashOutlineIcon />
              </button>
              <button
                type="button"
                onClick={() => openScheduleModal()}
                disabled={sending || uploadingFile || isRecordingVoice}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)] disabled:opacity-50"
                title="Schedule send"
                aria-label="Schedule send"
              >
                <ClockIcon />
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage(false)}
                disabled={sending || uploadingFile || isRecordingVoice}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)]"
                title="Send voice note"
                aria-label="Send voice note"
              >
                <SendIcon />
              </button>
            </div>
          ) : (newMessage.trim() || isRecordingVoice) ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              {newMessage.trim() && !isRecordingVoice && (
                <button
                  type="button"
                  onClick={() => openScheduleModal()}
                  disabled={sending || uploadingFile}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)] disabled:opacity-50"
                  title="Schedule send"
                  aria-label="Schedule send"
                >
                  <ClockIcon />
                </button>
              )}
              <button
                onClick={() => {
                  if (isRecordingVoice && isVoicePaused) {
                    sendPausedVoiceRecording();
                    return;
                  }
                  handleSendMessage(false);
                }}
                disabled={
                  sending ||
                  uploadingFile ||
                  (!newMessage.trim() && !(isRecordingVoice && isVoicePaused))
                }
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)]"
              >
                <SendIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startVoiceRecording()}
              disabled={sending || uploadingFile || pendingUploadFiles.length > 0 || !!voiceDraftFile}
              className="group inline-flex items-center justify-center w-10 h-10 rounded-full chat-hover chat-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[var(--chat-ring-offset)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              title="3Record voice message"
              aria-label="Start voice recording"
            >
              <MicrophoneIcon />
                </button>
          )}
        </div>
      </div>
        </>
      )}

      {/* Upload confirmation overlay - spans whole chat like drag overlay */}
      {pendingUploadFiles.length > 0 && (
        <UploadConfirmOverlay
          files={pendingUploadFiles}
          previewUrls={pendingUploadPreviewUrls}
          maxFiles={FILE_UPLOAD_LIMIT}
          onClose={closeUploadConfirm}
          onRemoveFile={removePendingUploadFile}
          onSchedule={() => openScheduleModal()}
          onSend={handleConfirmUploadSend}
        />
      )}

      <ForwardMessageModal
        open={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardingMessages([]);
        }}
        excludeChatId={chat?.id}
        forwarding={forwardingMessages}
        onForward={handleForwardDestination}
      />

      <ScheduleSendModal
        open={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingScheduledMessage(null);
        }}
        onSchedule={
          editingScheduledMessage
            ? handleUpdateScheduledFromChat
            : handleScheduleSend
        }
        mode={editingScheduledMessage ? "edit" : "create"}
        initialDatetime={
          editingScheduledMessage?.scheduledAt || editingScheduledMessage?.sendAt
        }
        editableContent={
          editingScheduledMessage &&
          (!editingScheduledMessage.type || editingScheduledMessage.type === "text")
            ? String(editingScheduledMessage.content || "")
            : undefined
        }
        previewLabel={
          editingScheduledMessage
            ? editingScheduledMessage.type &&
              editingScheduledMessage.type !== "text"
              ? editingScheduledMessage.type === "audio"
                ? "Voice message"
                : editingScheduledMessage.content || "File attachment"
              : undefined
            : getSchedulePreviewLabel()
        }
      />

      <UserDetailsModal
        open={showUserDetails}
        onClose={handleCloseUserDetails}
        user={selectedUserDetails?.user}
        status={selectedUserDetails?.status}
        onMessage={handleMessageUserFromDetails}
        showMessage={canMessageFromUserDetails(selectedUserDetails?.user?.id)}
      />

      {/* Full-screen image lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        plugins={[Zoom]}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />
    </div>
  );
};

ChatWindow.propTypes = {
  chat: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
    name: PropTypes.string,
    unreadCount: PropTypes.number,
    members: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        user: PropTypes.shape({
          name: PropTypes.string,
        }),
      }),
    ),
  }),
  selectedMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  highlightLastOnOpen: PropTypes.bool,
  onHighlightConsumed: PropTypes.func,
  onBack: PropTypes.func,
  onChatUpdated: PropTypes.func,
  onLeftGroup: PropTypes.func,
  onOpenDirectChatWithUser: PropTypes.func,
  onNavigateToMessage: PropTypes.func,
  onStartCall: PropTypes.func,
  onJoinCall: PropTypes.func,
};

export default ChatWindow;
