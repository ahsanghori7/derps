import { useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  BackIcon,
  BellIcon,
  BellOffIcon,
  ClockIcon,
  CloseIcon,
  InfoCircleIcon,
  LeaveGroupIcon,
  MoreVerticalIcon,
  MutedIcon,
  PhoneIcon,
  SearchIcon,
} from "../shared/icons";
import { useClickOutside } from "../shared/hooks";
import DeleteConfirmationModal from "@components/DeleteModal";

/** Chat window top bar: back button, avatar/name (or Group Info / Scheduled Messages title), and action icons. */
const ChatHeader = ({
  chat,
  onBack = undefined,
  isSecondaryScreen = false,
  showGroupInfo = false,
  showScheduledMessages = false,
  chatName = "",
  chatAvatar = null,
  avatarUrl = "",
  avatarColorClass = "",
  directChatStatusStyle = { title: "", dot: "", text: "", label: "" },
  isSearchOpen = false,
  isMuted = false,
  isMuting = false,
  isLeaving = false,
  onHeaderBack,
  onToggleSearch,
  onOpenScheduledMessages,
  onOpenGroupInfo,
  onToggleMuteGroup,
  onLeaveGroup,
  onOpenDirectChatUserDetails,
  onOpenDirectChatName,
  onStartCall,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // null | 'mute' | 'leave' | 'call'
  const [isStartingCall, setIsStartingCall] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useClickOutside([menuRef, menuButtonRef], () => setMenuOpen(false), {
    active: menuOpen,
  });

  const closeMenuAndConfirm = () => {
    setMenuOpen(false);
    setConfirmAction(null);
  };

  const handleConfirmStartCall = async () => {
    if (!onStartCall) return;
    setIsStartingCall(true);
    try {
      await onStartCall();
    } finally {
      setIsStartingCall(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="p-4 chat-divider-b flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {(onBack || isSecondaryScreen) && (
          <button
            type="button"
            onClick={onHeaderBack}
            className={`p-2 chat-hover rounded-full flex-shrink-0 ${isSecondaryScreen ? "" : "md:hidden"}`}
            aria-label={
              showGroupInfo
                ? "Back to chat"
                : showScheduledMessages
                  ? "Back to chat"
                  : "Back to chat list"
            }
          >
            <BackIcon className="w-5 h-5 chat-text" />
          </button>
        )}
        {showGroupInfo ? (
          <h3 className="font-semibold chat-text truncate">
            Group Info
          </h3>
        ) : showScheduledMessages ? (
          <h3 className="font-semibold chat-text truncate">
            Scheduled Messages
          </h3>
        ) : (
          <>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-full flex-shrink-0 ${avatarColorClass} flex items-center justify-center text-white font-semibold`}
              >
                {chatAvatar}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {chat.type === "direct" ? (
                  <button
                    type="button"
                    onClick={onOpenDirectChatName}
                    className="font-semibold chat-text chat-accent transition-colors text-left truncate"
                    title="View user details"
                  >
                    {chatName}
                  </button>
                ) : (
                  <h3 className="font-semibold chat-text truncate">
                    {chatName}
                  </h3>
                )}
                {isMuted && (
                  <span title="Muted" className="flex-shrink-0">
                    <MutedIcon className="w-3.5 h-3.5" />
                  </span>
                )}
                {chat.type === "direct" && (
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    title={directChatStatusStyle.title}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${directChatStatusStyle.dot}`}
                    ></div>
                  </div>
                )}
              </div>
              {chat.type === "direct" && (
                <p className={`text-xs ${directChatStatusStyle.text}`}>
                  {directChatStatusStyle.label}
                </p>
              )}
            </div>
          </>
        )}
      </div>
      {!isSecondaryScreen && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {onStartCall && (
            <button
              type="button"
              onClick={() => setConfirmAction("call")}
              className="p-2 chat-hover rounded-full transition-colors"
              title="Start a call"
              aria-label="Start a call"
            >
              <PhoneIcon className="w-5 h-5 chat-text-muted" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSearch}
            className="p-2 chat-hover rounded-full transition-colors"
            title={isSearchOpen ? "Close Search" : "Search Messages"}
          >
            {isSearchOpen ? (
              <CloseIcon className="w-5 h-5 chat-text-muted" />
            ) : (
              <SearchIcon className="w-5 h-5 chat-text-muted" />
            )}
          </button>

          {(chat.type === "group" || chat.type === "direct") && (
            <div className="relative">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-2 chat-hover rounded-full transition-colors"
                title="More options"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <MoreVerticalIcon className="w-5 h-5 chat-text-muted" />
              </button>

              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  className="absolute right-0 top-full mt-1 w-56 chat-popover border chat-border rounded-xl shadow-lg p-1.5 z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      if (chat.type === "group") {
                        onOpenGroupInfo();
                      } else {
                        onOpenDirectChatUserDetails();
                      }
                    }}
                    className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium chat-text chat-hover"
                  >
                    <InfoCircleIcon className="w-4 h-4 chat-text-muted" />
                    <span>{chat.type === "group" ? "Group Info" : "Info"}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenScheduledMessages();
                    }}
                    className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium chat-text chat-hover"
                  >
                    <ClockIcon className="w-4 h-4 chat-text-muted" />
                    <span>Scheduled Messages</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setConfirmAction("mute")}
                    className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium chat-text chat-hover"
                  >
                    {isMuted ? (
                      <BellIcon className="w-4 h-4 chat-text-muted" />
                    ) : (
                      <BellOffIcon className="w-4 h-4 chat-text-muted" />
                    )}
                    <span>
                      {isMuted
                        ? `Unmute ${chat.type === "group" ? "Group" : "Chat"}`
                        : `Mute ${chat.type === "group" ? "Group" : "Chat"}`}
                    </span>
                  </button>
                  {chat.type === "group" && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setConfirmAction("leave")}
                      className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LeaveGroupIcon className="w-4 h-4" />
                      <span>Leave Group</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <DeleteConfirmationModal
        open={confirmAction === "mute"}
        title={
          isMuted
            ? `Unmute ${chat.type === "group" ? "Group" : "Chat"}`
            : `Mute ${chat.type === "group" ? "Group" : "Chat"}`
        }
        subtitle={
          isMuted
            ? `You will start receiving notifications for new messages in this ${chat.type === "group" ? "group" : "chat"} again.`
            : `You won't receive notifications for new messages in this ${chat.type === "group" ? "group" : "chat"} until you unmute it.`
        }
        entityName={chatName}
        warningMessage={
          isMuted
            ? `You can mute this ${chat.type === "group" ? "group" : "chat"} again at any time.`
            : `You can unmute this ${chat.type === "group" ? "group" : "chat"} again at any time.`
        }
        confirmLabel={isMuted ? "Unmute" : "Mute"}
        onCancel={() => setConfirmAction(null)}
        onDelete={() => {
          onToggleMuteGroup();
          closeMenuAndConfirm();
        }}
        isLoading={isMuting}
      />

      <DeleteConfirmationModal
        open={confirmAction === "leave"}
        title="Leave Group"
        subtitle="Are you sure you want to leave this group?"
        entityName={chatName}
        warningMessage="You will lose access to this group's messages and will need to be re-added to rejoin."
        confirmLabel="Leave"
        onCancel={() => setConfirmAction(null)}
        onDelete={() => {
          onLeaveGroup();
          closeMenuAndConfirm();
        }}
        isLoading={isLeaving}
      />

      <DeleteConfirmationModal
        open={confirmAction === "call"}
        title="Start a Call"
        subtitle="Are you sure you want to start a call with:"
        entityName={chatName}
        warningMessage="You will be redirected to the meeting screen upon confirmation."
        hideWarningIcon
        confirmLabel="Confirm"
        onCancel={() => setConfirmAction(null)}
        onDelete={handleConfirmStartCall}
        isLoading={isStartingCall}
      />
    </div>
  );
};

ChatHeader.propTypes = {
  chat: PropTypes.shape({ type: PropTypes.string }).isRequired,
  onBack: PropTypes.func,
  isSecondaryScreen: PropTypes.bool,
  showGroupInfo: PropTypes.bool,
  showScheduledMessages: PropTypes.bool,
  chatName: PropTypes.string,
  chatAvatar: PropTypes.node,
  avatarUrl: PropTypes.string,
  avatarColorClass: PropTypes.string,
  directChatStatusStyle: PropTypes.shape({
    title: PropTypes.string,
    dot: PropTypes.string,
    text: PropTypes.string,
    label: PropTypes.string,
  }),
  isSearchOpen: PropTypes.bool,
  isMuted: PropTypes.bool,
  isMuting: PropTypes.bool,
  isLeaving: PropTypes.bool,
  onHeaderBack: PropTypes.func.isRequired,
  onToggleSearch: PropTypes.func.isRequired,
  onOpenScheduledMessages: PropTypes.func.isRequired,
  onOpenGroupInfo: PropTypes.func.isRequired,
  onToggleMuteGroup: PropTypes.func,
  onLeaveGroup: PropTypes.func,
  onOpenDirectChatUserDetails: PropTypes.func.isRequired,
  onOpenDirectChatName: PropTypes.func.isRequired,
  onStartCall: PropTypes.func,
};

export default ChatHeader;
