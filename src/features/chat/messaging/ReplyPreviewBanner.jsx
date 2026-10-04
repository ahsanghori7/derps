import PropTypes from "prop-types";
import { isSystemMessage, isEventInviteMessage } from "../shared/utils/chatUtility";
import { AutoReplyIcon, CalendarIcon, CloseIcon } from "../shared/icons";

/** Banner shown above the composer while replying to a message; lets the user cancel the reply. */
const ReplyPreviewBanner = ({ replyingTo, onCancel }) => (
  <div className="mb-2 p-3 chat-selected rounded-lg flex items-start justify-between">
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
        Replying to {replyingTo.user?.name || "User"}
        {isSystemMessage(replyingTo) && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-medium">
            {isEventInviteMessage(replyingTo) ? (
              <>
                <CalendarIcon className="w-3 h-3" />
                Event
              </>
            ) : (
              <>
                <AutoReplyIcon className="w-3 h-3" />
                Auto-reply
              </>
            )}
          </span>
        )}
      </div>
      <div className="text-sm chat-text-muted truncate max-w-full">
        {replyingTo.content?.length > 100
          ? `${replyingTo.content.substring(0, 100)}...`
          : replyingTo.content || "Message"}
      </div>
    </div>
    <button
      onClick={onCancel}
      className="ml-2 p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full transition-colors flex-shrink-0"
    >
      <CloseIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </button>
  </div>
);

ReplyPreviewBanner.propTypes = {
  replyingTo: PropTypes.shape({
    user: PropTypes.shape({ name: PropTypes.string }),
    content: PropTypes.string,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ReplyPreviewBanner;
