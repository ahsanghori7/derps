import { useRef, useState } from "react";
import PropTypes from "prop-types";
import Avatar from "../shared/components/Avatar";

/** Existing reaction pills (emoji + count) rendered below a message bubble; hover/focus a pill to see who reacted. Renders nothing if empty. */
const MessageReactions = ({ reactions = [], isOwn = false, disabled = false, currentUserId, onToggle }) => {
  const [openEmoji, setOpenEmoji] = useState(null);
  const closeTimeoutRef = useRef(null);

  if (!reactions.length) return null;

  const handleOpen = (emoji) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpenEmoji(emoji);
  };

  const handleClose = () => {
    closeTimeoutRef.current = setTimeout(() => setOpenEmoji(null), 150);
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
      onClick={(e) => e.stopPropagation()}
    >
      {reactions.map((reaction) => {
        const users = reaction.users || [];
        const names = users.map((u) => u?.name).filter(Boolean);
        const isOpen = openEmoji === reaction.emoji && users.length > 0;

        return (
          <div key={reaction.emoji} className="relative">
            <button
              type="button"
              aria-label={`${reaction.emoji} reaction${names.length ? ` from ${names.join(", ")}` : ""}, ${reaction.count} total`}
              aria-pressed={reaction.reactedByMe}
              onClick={() => onToggle(reaction.emoji)}
              onMouseEnter={() => handleOpen(reaction.emoji)}
              onMouseLeave={handleClose}
              onFocus={() => handleOpen(reaction.emoji)}
              onBlur={handleClose}
              disabled={disabled}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border leading-none transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)] focus-visible:ring-offset-1 ${
                reaction.reactedByMe
                  ? "border-[var(--chat-accent)] bg-[var(--chat-selected-bg)] chat-accent-muted shadow-sm"
                  : "chat-surface chat-border chat-hover"
              }`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span className={reaction.reactedByMe ? "font-semibold" : "chat-text-secondary"}>{reaction.count}</span>
            </button>

            {isOpen && (
              <>
                {/* Invisible bridge so the cursor can cross from the pill to the popover without it closing */}
                <div
                  className="absolute bottom-full h-2 left-0 right-0"
                  onMouseEnter={() => handleOpen(reaction.emoji)}
                  onMouseLeave={handleClose}
                  aria-hidden
                />
                <div
                  role="tooltip"
                  onMouseEnter={() => handleOpen(reaction.emoji)}
                  onMouseLeave={handleClose}
                  className={`absolute bottom-full mb-2 z-50 chat-popover rounded-lg py-2 px-2.5 shadow-lg min-w-[140px] max-w-[220px] ${
                    isOwn ? "right-0" : "left-0"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 chat-text">
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count === 1 ? "1 reaction" : `${reaction.count} reactions`}</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto chat-scroll">
                    {users.map((u, idx) => {
                      const isMe = currentUserId != null && String(u?.id) === String(currentUserId);
                      return (
                        <div key={u?.id ?? idx} className="flex items-center gap-1.5">
                          <Avatar id={u?.id} name={u?.name} user={u} size="xs" />
                          <span className="text-xs truncate chat-text-secondary">
                            {isMe ? "You" : u?.name || "Unknown"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

MessageReactions.propTypes = {
  reactions: PropTypes.array,
  isOwn: PropTypes.bool,
  disabled: PropTypes.bool,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onToggle: PropTypes.func.isRequired,
};

export default MessageReactions;
