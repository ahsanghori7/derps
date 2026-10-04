import PropTypes from "prop-types";
import ChatModalShell from "./ChatModalShell";
import Avatar from "./Avatar";
import { MessageIcon, UserIcon, MailIcon, BriefcaseIcon } from "../icons";
import { getUserStatusStyle } from "../utils/chatUtility";

const DetailRow = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg chat-bg-muted">
    <div className="flex-shrink-0 w-9 h-9 rounded-lg chat-surface flex items-center justify-center chat-text-muted">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide chat-text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium chat-text break-words">
        {value || "—"}
      </p>
    </div>
  </div>
);

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  icon: PropTypes.node,
};

const UserDetailsModal = ({ open, onClose, user, status, onMessage, showMessage = true }) => {
  if (!user) return null;

  const statusStyle = getUserStatusStyle(status);
  const canMessage = showMessage && Boolean(onMessage) && Boolean(user.id);

  const handleMessageClick = () => {
    if (!canMessage) return;
    onMessage(user.id);
    onClose();
  };

  return (
    <ChatModalShell open={open} title="User Details" onClose={onClose} maxWidth="sm">
      <div className="p-6 overflow-y-auto">
        <div className="flex flex-col items-center text-center pb-6 chat-divider-b">
          <Avatar id={user.id} name={user.name} user={user} size="lg" className="!w-20 !h-20 !text-2xl" />
          <h3 className="mt-4 text-xl font-semibold chat-text">
            {user.name || "Unknown User"}
          </h3>
          {status && (
            <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${statusStyle.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </div>
          )}
          {canMessage && (
            <button
              type="button"
              onClick={handleMessageClick}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <MessageIcon className="w-5 h-5" />
              Message
            </button>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <DetailRow
            label="Name"
            value={user.name}
            icon={<UserIcon />}
          />
          <DetailRow
            label="Email"
            value={user.email}
            icon={<MailIcon />}
          />
          <DetailRow
            label="Designation"
            value={user.designation}
            icon={<BriefcaseIcon />}
          />
        </div>
      </div>
    </ChatModalShell>
  );
};

UserDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    email: PropTypes.string,
    designation: PropTypes.string,
    profilePicture: PropTypes.string,
  }),
  status: PropTypes.oneOf(["online", "away", "busy", "offline"]),
  onMessage: PropTypes.func,
  showMessage: PropTypes.bool,
};

export default UserDetailsModal;
