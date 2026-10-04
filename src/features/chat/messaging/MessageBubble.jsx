import { useState } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import {
  getForwardedMessageInfo,
  isScheduledMessage,
  formatScheduledTime,
  isSystemMessage,
  isEventInviteMessage,
  parseCallMessageContent,
  normalizeReactions,
  MESSAGE_HIGHLIGHT_MS,
  messageIdsMatch,
} from "../shared/utils/chatUtility";
import { renderMessageContent } from "../shared/utils/messageContentRenderer";
import { handleFormatShortcut } from "../shared/utils/textFormatting";
import { getAttachmentUrl } from "../api/chatApi";
import AttachmentRenderer from "./AttachmentRenderer";
import FormatToolbar from "./FormatToolbar";
import ReadReceipt from "./ReadReceipt";
import MessageReactions from "./MessageReactions";
import {
  AutoReplyIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ForwardIcon,
  MicrophoneIcon,
  PhoneIcon,
  PlayFilledIcon,
  VideoIcon,
} from "../shared/icons";
import AddReactionButton from "./AddReactionButton";
import { getProfilePictureUrl } from "../../../Utils/profile";

/** A single message row: avatar, reply/forward previews, content (or edit form), timestamp/read-receipt, and reactions. */
const MessageBubble = ({
  message,
  previousMessage = null,
  nextMessage = null,
  chat,
  currentUser = null,
  token = null,
  messages,
  avatarColorClass = "",
  highlightMessageId = null,
  replyingTo = null,
  pendingScrollToReplyMessageId = null,
  editingMessageId = null,
  editDraft = "",
  editTextSelection = null,
  isSavingEdit = false,
  editTextareaRef = { current: null },
  messagesContainerRef = { current: null },
  onNavigateToMessage = undefined,
  onOpenUserDetails,
  getUserDesignationByUserId,
  onContextMenu,
  onToggleReply,
  onHighlightMessage,
  onPendingScrollToReply,
  onImageClick,
  onJoinCall,
  applyEditTextFormat,
  handleEditTextareaSelect,
  onEditDraftChange,
  onEditTextSelectionChange,
  onCancelEdit,
  onSaveEdit,
  onToggleReaction,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const isOwn = message.userId === currentUser?.id;
  // Show avatar only if:
  // 1. It's a group chat
  // 2. Message is not from current user
  // 3. Either there's no previous message, or previous message was from a different user
  const showAvatar =
    chat.type === "group" &&
    !isOwn &&
    (!previousMessage || previousMessage.userId !== message.userId);

  // Reduce spacing if next message is from the same user
  const isSameUserAsNext =
    nextMessage && nextMessage.userId === message.userId;
  const marginBottom = isSameUserAsNext ? "mb-1" : "mb-4";

  const isReplyTarget =
    replyingTo != null && String(replyingTo.id) === String(message.id);

  // Resolved from loaded pages; optional nested snapshot from API if present
  const replyToMessage = message.replyToMessageId
    ? messages.find(
        (m) => String(m.id) === String(message.replyToMessageId),
      ) ||
      (message.replyToMessage &&
      String(message.replyToMessage.id ?? "") ===
        String(message.replyToMessageId)
        ? message.replyToMessage
        : null)
    : null;

  const isLoadingThisReply =
    pendingScrollToReplyMessageId != null &&
    String(pendingScrollToReplyMessageId) ===
      String(message.replyToMessageId);

  // Show a small preview (WhatsApp-style) of the replied-to message's attachment, if any.
  const replyAttachment = replyToMessage?.attachments?.[0] || null;
  const replyAttachmentMime = replyAttachment?.mimeType || "";
  const replyIsImage = replyAttachmentMime.startsWith("image/");
  const replyIsVideo = replyAttachmentMime.startsWith("video/");
  const replyIsAudio = replyAttachmentMime.startsWith("audio/");
  const replyAttachmentUrl = replyAttachment
    ? replyAttachment.url ||
      getAttachmentUrl(replyAttachment.filePath || replyAttachment.fileName)
    : null;
  const [replyVideoThumbFailed, setReplyVideoThumbFailed] = useState(false);

  const forwardedInfo = getForwardedMessageInfo(message);
  const isAutoReply = isSystemMessage(message);
  const isEventInvite = isEventInviteMessage(message);
  const callInfo = parseCallMessageContent(message);

  const handleJoinCall = (e) => {
    e.stopPropagation();
    if (callInfo?.roomId) onJoinCall?.(callInfo.roomId);
  };

  const handleMessageContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu({ x: e.clientX, y: e.clientY, message });
  };

  const handleRowDoubleClick = (e) => {
    // Ignore double-clicks on the bubble itself so text selection still works there;
    // only the empty space alongside the message (like WhatsApp) toggles the reply.
    if (e.target.closest(`[data-message-id="${message.id}"]`)) return;
    onToggleReply(message);
  };

  const isSelectable = !!message.id && !message.clientPending && !isSystemMessage(message);

  const handleRowClick = () => {
    if (!selectionMode || !isSelectable) return;
    onToggleSelect?.(message);
  };

  const handleReplyPreviewClick = (e) => {
    e.stopPropagation();
    const targetId = String(message.replyToMessageId);
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current.querySelector(
      `[data-message-id="${targetId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      onHighlightMessage(targetId);
      setTimeout(() => onHighlightMessage(null), MESSAGE_HIGHLIGHT_MS);
    } else {
      onPendingScrollToReply(message.replyToMessageId);
    }
  };

  const handleForwardedPreviewClick = (e) => {
    e.stopPropagation();
    if (!forwardedInfo?.forwardedFromMessageId) return;

    const targetMessageId = forwardedInfo.forwardedFromMessageId;
    const targetChatId = forwardedInfo.forwardedFromChatId;

    if (
      targetChatId != null &&
      chat?.id != null &&
      String(targetChatId) !== String(chat.id)
    ) {
      onNavigateToMessage?.(targetChatId, targetMessageId);
      return;
    }

    const targetId = String(targetMessageId);
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current.querySelector(
      `[data-message-id="${targetId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      onHighlightMessage(targetId);
      setTimeout(() => onHighlightMessage(null), MESSAGE_HIGHLIGHT_MS);
    } else {
      onPendingScrollToReply(targetMessageId);
    }
  };

  return (
    <div
      key={message.id}
      className={`flex items-center ${isOwn ? "justify-end" : "justify-start"} ${marginBottom} transition-colors duration-150 ${
        isReplyTarget ? "-mx-4 px-4 py-1 rounded-md chat-reply-target" : ""
      } ${selectionMode && isSelectable ? "cursor-pointer" : ""}`}
      onDoubleClick={handleRowDoubleClick}
      onClick={handleRowClick}
    >
      {selectionMode && isSelectable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(message);
          }}
          className={`mr-2 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-blue-500 border-blue-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
          aria-label={isSelected ? "Deselect message" : "Select message"}
        >
          {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
        </button>
      )}
      <div
        className={`group flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-center max-w-[70%] min-w-0 gap-2`}
      >
        {/* Always reserve space for avatar to maintain alignment */}
        {chat.type === "group" && (
        <div
          className={`w-8 h-8 flex-shrink-0 ${showAvatar ? "" : "invisible"}`}
          >
             {showAvatar && (
              getProfilePictureUrl(message.user) ? (
                <img
                  src={getProfilePictureUrl(message.user)}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-8 h-8 rounded-full ${avatarColorClass} flex items-center justify-center text-white text-xs font-semibold`}
                >
                  {message.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )
            )}
        </div>
          )}
        <div
          className={`flex flex-col min-w-0 max-w-full ${isOwn ? "items-end" : "items-start"}`}
        >
          {showAvatar && (
            <button
              type="button"
              onClick={() => onOpenUserDetails(message.userId, message.user)}
              className="text-xs chat-text-muted mb-1 chat-accent transition-colors text-left"
              title="View user details"
            >
              {message.user?.name + " " + getUserDesignationByUserId(message.userId)}
            </button>
          )}
          <div
            data-message-id={String(message.id)}
            className={`px-4 py-2 rounded-lg hover:opacity-90 transition-opacity max-w-full min-w-0 ${
              isOwn
                ? "chat-bubble-own"
                : "bg-blue-500 text-white"
            } ${messageIdsMatch(highlightMessageId, message.id) ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-[var(--chat-ring-offset)]" : ""}`}
            onContextMenu={handleMessageContextMenu}
          >
            {isAutoReply && (
              <div
                className={`text-xs mb-1.5 px-2 py-1 rounded flex items-center gap-1.5 ${
                  isOwn
                    ? "bg-amber-100/80 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                    : "bg-amber-500/25 text-amber-50 border border-amber-300/30"
                }`}
                title={
                  isEventInvite
                    ? "Event notification"
                    : callInfo
                      ? "Call notification"
                      : "This message was sent automatically"
                }
              >
                {isEventInvite ? (
                  <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
                ) : callInfo ? (
                  <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <AutoReplyIcon className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="font-semibold">
                  {isEventInvite ? "Event" : callInfo ? "Call" : "Automatic reply"}
                </span>
              </div>
            )}
            {message.replyToMessageId && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleReplyPreviewClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleReplyPreviewClick(e);
                  }
                }}
                className={`text-xs mb-1 p-2 rounded border-l-2 cursor-pointer hover:opacity-90 transition-opacity ${
                  isOwn
                    ? "chat-bubble-reply-own border-l-2"
                    : "text-blue-100 bg-blue-600 border-blue-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {replyToMessage?.user?.name ||
                        (isLoadingThisReply ? "…" : "Original message")}
                    </div>
                    <div className="truncate">
                      {replyToMessage
                        ? replyToMessage.content?.length > 50
                          ? `${replyToMessage.content.substring(0, 50)}...`
                          : replyToMessage.content ||
                            (replyIsImage
                              ? "Photo"
                              : replyIsVideo
                                ? "Video"
                                : replyIsAudio
                                  ? "Voice message"
                                  : "Message")
                        : isLoadingThisReply
                          ? "Loading older messages…"
                          : "Tap to load the original message"}
                    </div>
                  </div>
                  {replyIsImage && replyAttachmentUrl && (
                    <img
                      src={replyAttachmentUrl}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                      draggable={false}
                    />
                  )}
                  {replyIsVideo && (
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-black flex items-center justify-center">
                      {replyAttachmentUrl && !replyVideoThumbFailed ? (
                        <>
                          <video
                            src={replyAttachmentUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                            onLoadedMetadata={(e) => {
                              try {
                                e.currentTarget.currentTime = 0.1;
                              } catch {
                                // seeking not supported; play icon still shown
                              }
                            }}
                            onError={() => setReplyVideoThumbFailed(true)}
                          />
                          <PlayFilledIcon className="absolute w-4 h-4 text-white drop-shadow" />
                        </>
                      ) : (
                        <VideoIcon className="w-5 h-5 text-white" />
                      )}
                    </div>
                  )}
                  {replyIsAudio && (
                    <div className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center">
                      <MicrophoneIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            )}
            {forwardedInfo && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleForwardedPreviewClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleForwardedPreviewClick(e);
                  }
                }}
                className={`text-xs mb-1 p-2 rounded border-l-2 flex items-center gap-1.5 max-w-[250px] cursor-pointer hover:opacity-90 transition-opacity ${
                  isOwn
                    ? "chat-bubble-reply-own border-l-2"
                    : "text-blue-100 bg-blue-600 border-blue-300"
                }`}
              >
                <ForwardIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <div className="font-semibold truncate">
                  Forwarded from {forwardedInfo.sourceLabel}
                </div>
              </div>
            )}
            {message.attachments && message.attachments.length > 0 ? (
              <div>
                {message.attachments.map((attachment, idx) => (
                  <AttachmentRenderer
                    key={idx}
                    attachment={attachment}
                    token={token}
                    onImageClick={onImageClick}
                  />
                ))}
              </div>
            ) : null}
            {editingMessageId === message.id ? (
              <div className="mt-1 relative">
                {editTextSelection && (
                  <div
                    data-format-toolbar="true"
                    className="absolute bottom-full left-0 mb-2 z-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FormatToolbar onFormat={applyEditTextFormat} />
                  </div>
                )}
                <textarea
                  ref={editTextareaRef}
                  value={editDraft}
                  onChange={(e) => {
                    onEditDraftChange(e.target.value);
                    handleEditTextareaSelect();
                  }}
                  onSelect={handleEditTextareaSelect}
                  onMouseUp={handleEditTextareaSelect}
                  onKeyUp={handleEditTextareaSelect}
                  onBlur={(e) => {
                    // Keep toolbar visible while clicking on it; otherwise clear.
                    const next = e.relatedTarget;
                    if (!next || !next.closest?.("[data-format-toolbar]")) {
                      onEditTextSelectionChange(null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (handleFormatShortcut(e, applyEditTextFormat)) return;
                    if (e.key === "Escape") {
                      e.preventDefault();
                      onCancelEdit();
                    }
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      onSaveEdit(message);
                    }
                  }}
                  rows={5}
                  className={`w-full min-w-[240px] sm:min-w-[360px] md:min-w-[480px] text-sm rounded-md p-2 border outline-none resize-y ${
                    isOwn
                      ? "chat-input-field"
                      : "bg-white/90 text-gray-900 border-blue-200"
                  }`}
                  disabled={isSavingEdit}
                  aria-label="Edit message"
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded-md border ${
                      isOwn
                        ? "border-gray-300 dark:border-gray-500 chat-text-secondary chat-hover"
                        : "border-blue-200 text-blue-900 hover:bg-blue-50"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelEdit();
                    }}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 text-xs rounded-md ${
                      isOwn
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-700 hover:bg-blue-800 text-white"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveEdit(message);
                    }}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? "Saving…" : "Save"}
                  </button>
                </div>
                <div className={`mt-1 text-[11px] opacity-70 ${isOwn ? "chat-text-muted" : "text-blue-100"}`}>
                  Tip: Ctrl+Enter to save, Esc to cancel
                </div>
              </div>
            ) : callInfo?.kind === "started" ? (
              <div className="text-sm min-w-0">
                <p className="whitespace-pre-wrap break-words">
                  {callInfo.callerName} started a call
                </p>
                {callInfo.roomId && (
                  <button
                    type="button"
                    onClick={handleJoinCall}
                    className={`mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isOwn
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-white/90 hover:bg-white text-blue-600"
                    }`}
                  >
                    <PhoneIcon className="w-3.5 h-3.5" />
                    Join call
                  </button>
                )}
              </div>
            ) : callInfo?.kind === "peopleAdded" ? (
              <div className="text-sm whitespace-pre-wrap break-words min-w-0">
                {message.content}
              </div>
            ) : message.content ? (
              <div className="text-sm whitespace-pre-wrap break-words min-w-0">
                {renderMessageContent(
                  message.content,
                  isOwn
                    ? "underline hover:opacity-90 chat-text"
                    : "underline hover:opacity-90 text-white",
                  isOwn
                    ? "font-bold text-blue-800 dark:text-blue-300 bg-blue-200 dark:bg-blue-800/50 px-1 py-0.5 rounded"
                    : "font-bold text-blue-100 bg-blue-700/50 px-1 py-0.5 rounded",
                )}
              </div>
            ) : null}
            {isScheduledMessage(message) && (
              <div
                className={`flex items-center gap-1.5 mt-1 text-xs ${
                  isOwn ? "chat-text-muted" : "text-blue-100"
                }`}
              >
                <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  Scheduled for {formatScheduledTime(message.scheduledAt)}
                </span>
              </div>
            )}
            <div
              className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <span className="text-xs opacity-70">
                {moment.utc(message.createdAt).local().format("hh:mm A")}
              </span>
              {(message?.isEdited === true ||
                (!!message?.updatedAt &&
                  !!message?.createdAt &&
                  moment(message.updatedAt).isAfter(moment(message.createdAt)))) && (
                <span className="text-xs opacity-70">(Edited)</span>
              )}
              {isOwn && (
                <ReadReceipt
                  message={message}
                  chat={chat}
                  currentUser={currentUser}
                  chatMembers={chat.members}
                />
              )}
            </div>
          </div>
          {!message.clientPending && !isScheduledMessage(message) && (
            <MessageReactions
              reactions={normalizeReactions(message.reactions, currentUser?.id)}
              isOwn={isOwn}
              currentUserId={currentUser?.id}
              onToggle={(emoji) => onToggleReaction(message, emoji)}
            />
          )}
        </div>
        {!message.clientPending && !isScheduledMessage(message) && (
          <AddReactionButton
            isOwn={isOwn}
            onPick={(emoji) => onToggleReaction(message, emoji)}
          />
        )}
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.object.isRequired,
  previousMessage: PropTypes.object,
  nextMessage: PropTypes.object,
  chat: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    type: PropTypes.string,
    members: PropTypes.array,
  }).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  token: PropTypes.string,
  messages: PropTypes.array.isRequired,
  avatarColorClass: PropTypes.string,
  highlightMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  replyingTo: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  pendingScrollToReplyMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editingMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  editDraft: PropTypes.string,
  editTextSelection: PropTypes.object,
  isSavingEdit: PropTypes.bool,
  editTextareaRef: PropTypes.object,
  messagesContainerRef: PropTypes.object,
  onNavigateToMessage: PropTypes.func,
  onOpenUserDetails: PropTypes.func.isRequired,
  getUserDesignationByUserId: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
  onToggleReply: PropTypes.func.isRequired,
  onHighlightMessage: PropTypes.func.isRequired,
  onPendingScrollToReply: PropTypes.func.isRequired,
  onImageClick: PropTypes.func.isRequired,
  onJoinCall: PropTypes.func,
  applyEditTextFormat: PropTypes.func.isRequired,
  handleEditTextareaSelect: PropTypes.func.isRequired,
  onEditDraftChange: PropTypes.func.isRequired,
  onEditTextSelectionChange: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onToggleReaction: PropTypes.func.isRequired,
  selectionMode: PropTypes.bool,
  isSelected: PropTypes.bool,
  onToggleSelect: PropTypes.func,
};

export default MessageBubble;
