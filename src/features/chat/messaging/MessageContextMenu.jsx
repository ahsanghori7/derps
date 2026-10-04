import { forwardRef } from "react";
import PropTypes from "prop-types";
import { isSystemMessage, isScheduledMessage } from "../shared/utils/chatUtility";
import {
  CheckIcon,
  CopyIcon,
  EditIcon,
  ForwardIcon,
  LinkIcon,
  ReplyIcon,
  TrashIcon,
} from "../shared/icons";

/** Right-click menu for a message bubble (Reply / Copy / Forward / Edit / Delete, as applicable). */
const MessageContextMenu = forwardRef(({ contextMenu, currentUserId = undefined, onAction }, ref) => {
  const { x, y, message } = contextMenu;
  const isOwn = message?.userId === currentUserId;
  const isSystem = isSystemMessage(message);
  const isScheduled = isScheduledMessage(message);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[180px] py-1 chat-surface rounded-lg shadow-lg border chat-border"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
        onClick={() => onAction("reply", message)}
      >
        <ReplyIcon />
        Reply
      </button>
      <button
        type="button"
        className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
        onClick={() => onAction("copy", message)}
      >
        <CopyIcon />
        Copy
      </button>
      {message?.id && !message?.clientPending && (
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
          onClick={() => onAction("copyLink", message)}
        >
          <LinkIcon className="w-4 h-4" />
          Copy link
        </button>
      )}
      {message?.id && !message?.clientPending && !isSystem && (
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
          onClick={() => onAction("forward", message)}
        >
          <ForwardIcon />
          Forward
        </button>
      )}
      {message?.id && !message?.clientPending && !isSystem && (
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
          onClick={() => onAction("select", message)}
        >
          <CheckIcon />
          Select
        </button>
      )}
      {isOwn && !message?.clientPending && !isSystem && (
        <>
          {isScheduled ? (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
              onClick={() => onAction("editSchedule", message)}
            >
              <EditIcon />
              Edit schedule
            </button>
          ) : (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm chat-text-secondary chat-hover flex items-center gap-2"
              onClick={() => onAction("edit", message)}
            >
              <EditIcon />
              Edit
            </button>
          )}
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            onClick={() => onAction("delete", message)}
          >
            <TrashIcon className="w-4 h-4" />
            {isScheduled ? "Cancel scheduled send" : "Delete"}
          </button>
        </>
      )}
      {message?.clientPending && (
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          onClick={() => onAction("cancelSend", message)}
        >
          Cancel send
        </button>
      )}
    </div>
  );
});

MessageContextMenu.displayName = "MessageContextMenu";

MessageContextMenu.propTypes = {
  contextMenu: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    message: PropTypes.object,
  }).isRequired,
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onAction: PropTypes.func.isRequired,
};

export default MessageContextMenu;
