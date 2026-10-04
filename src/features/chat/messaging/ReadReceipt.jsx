import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { ReadCheckCircleIcon, UnreadClockIcon } from "../shared/icons";

/** Read/delivered indicator for own messages: checkmarks + (group chats) a "who's read it" tooltip. */
const ReadReceipt = ({ message, chat, currentUser, chatMembers }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    },
    [],
  );

  if (!message || message.userId !== currentUser?.id) {
    // Only show read receipts for own messages
    return null;
  }

  const readBy = message.readBy || [];
  const isDirectChat = chat?.type === "direct";
  const totalMembers = chat?.members?.length || 0;
  const otherMembers =
    chat?.members?.filter((m) => m.userId !== currentUser?.id) || [];

  // For direct chat: show if the other person has read it
  if (isDirectChat) {
    const otherMemberId = otherMembers[0]?.userId;
    const isRead = otherMemberId && readBy.includes(otherMemberId);

    return (
      <span
        className="text-xs inline-flex items-center ml-1"
        title={isRead ? "Read" : "Delivered"}
      >
        {isRead ? (
          <span className="chat-accent-muted font-semibold">
            ✓✓
          </span>
        ) : (
          <span className="chat-text-muted font-semibold">
            ✓✓
          </span>
        )}
      </span>
    );
  }

  // For group chat: show count and tooltip with names
  // Exclude sender from readBy array
  const senderId = message.userId || currentUser?.id;
  const readByOthers = readBy.filter((userId) => userId !== senderId);
  const readCount = readByOthers.length;
  const unreadCount = totalMembers - readCount - 1; // -1 for the sender

  // Get names of users who read the message (excluding sender)
  const readers = readByOthers
    .map((userId) => {
      const member = chatMembers?.find((m) => m.userId === userId);
      return member?.user?.name || `User ${userId}`;
    })
    .filter(Boolean);

  // Get unread user IDs: all members except sender, minus those in readBy
  const allOtherMemberIds = (chatMembers || [])
    .filter((m) => m.userId !== senderId)
    .map((m) => m.userId);
  const unreadUserIds = allOtherMemberIds.filter(
    (userId) => !readBy.includes(userId),
  );
  const unreadNames = unreadUserIds
    .map((userId) => {
      const member = chatMembers?.find((m) => m.userId === userId);
      return member?.user?.name || `User ${userId}`;
    })
    .filter(Boolean);

  const handleOpen = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setShowTooltip(true);
  };

  const handleClose = () => {
    leaveTimeoutRef.current = setTimeout(() => setShowTooltip(false), 200);
  };

  return (
    <div className="relative inline-flex items-center">
      <span
        className="text-xs inline-flex items-center cursor-pointer ml-1"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        title={`Read by ${readCount} of ${totalMembers - 1}`}
      >
        {readCount >= totalMembers - 1 ? (
          <span className="chat-accent-muted font-semibold">
            ✓✓
          </span>
        ) : (
          <span className="chat-text-muted font-semibold">
            ✓✓
          </span>
        )}
        {readCount > 0 && (
          <span className="ml-1 text-xs chat-text-muted">
            {readCount}/{totalMembers - 1}
          </span>
        )}
      </span>

      {/* Invisible bridge so cursor can move from trigger to tooltip without closing */}
      {showTooltip && (readCount > 0 || unreadCount > 0) && (
        <div
          className="absolute bottom-full left-[-120px] right-[-20px] h-[320px] z-40"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          aria-hidden
        />
      )}

      {/* Tooltip showing who read / who hasn't read the message */}
      {showTooltip && (readCount > 0 || unreadCount > 0) && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full mb-2 left-0 chat-popover text-xs rounded-lg py-2 px-3 shadow-lg z-50 min-w-[150px] max-w-[200px]"
          style={{ left: "-100px" }}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {readCount > 0 && (
            <>
              <div className="font-semibold mb-1 chat-text">Read by:</div>
              <div className="chat-read-receipt-scroll space-y-1 max-h-32 overflow-y-auto">
                {readers.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <ReadCheckCircleIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {unreadCount > 0 && (
            <div className="mt-2 pt-2 chat-divider-t chat-text-muted">
              <div className="font-semibold mb-1 chat-text-muted">Unread:</div>
              <div className="chat-read-receipt-scroll space-y-1 max-h-32 overflow-y-auto">
                {unreadNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <UnreadClockIcon className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ReadReceipt.propTypes = {
  message: PropTypes.shape({
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    readBy: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ),
  }),
  chat: PropTypes.shape({
    type: PropTypes.string,
    members: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        user: PropTypes.shape({
          name: PropTypes.string,
        }),
      }),
    ),
  }),
  currentUser: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  chatMembers: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      user: PropTypes.shape({
        name: PropTypes.string,
      }),
    }),
  ),
};

export default ReadReceipt;
