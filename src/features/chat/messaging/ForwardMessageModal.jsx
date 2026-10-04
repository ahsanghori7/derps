import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { SearchBar, ChatModalShell, UserListItem, EmptyState } from "../shared/components";
import { useChatUsers } from "../shared/hooks";
import {
  getChatsSnapshot,
  subscribeToChatsSnapshot,
} from "@stores/chatStore";
import { getAvatarColor, getMessagePreview } from "../shared/utils/chatUtility";
import { useAuthUser } from "@hooks/useAuthUser";
import { CheckIcon } from "../shared/icons";

const getChatDisplayName = (chat, currentUserId) => {
  if (!chat) return "Chat";
  if (chat.type === "group") return chat.name || "Group Chat";
  const other = chat.members?.find(
    (m) => String(m.userId) !== String(currentUserId),
  );
  return other?.user?.name || "Direct Chat";
};

const ForwardMessageModal = ({
  open,
  onClose,
  onForward,
  excludeChatId,
  forwarding = [],
}) => {
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState(() => getChatsSnapshot());
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { currentUser } = useAuthUser();
  const { filteredUsers, loading: usersLoading } = useChatUsers({
    enabled: open && tab === "users",
  });

  useEffect(() => {
    if (!open) return undefined;
    return subscribeToChatsSnapshot(setChats);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTab("chats");
      setSearch("");
      setSelected([]);
      setSubmitting(false);
    }
  }, [open]);

  const filteredChats = useMemo(() => {
    const q = search.toLowerCase().trim();
    return chats.filter((chat) => {
      if (
        excludeChatId != null &&
        String(chat.id) === String(excludeChatId)
      ) {
        return false;
      }
      const name = getChatDisplayName(chat, currentUser?.id).toLowerCase();
      return !q || name.includes(q);
    });
  }, [chats, search, excludeChatId, currentUser?.id]);

  const filteredUsersList = useMemo(() => {
    const q = search.toLowerCase().trim();
    return filteredUsers.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      return !q || name.includes(q) || email.includes(q);
    });
  }, [filteredUsers, search]);

  const isChatSelected = (chatId) =>
    selected.some(
      (item) => item.type === "chat" && String(item.chatId) === String(chatId),
    );

  const isUserSelected = (userId) =>
    selected.some(
      (item) => item.type === "user" && String(item.userId) === String(userId),
    );

  const toggleChat = (chatId) => {
    setSelected((prev) =>
      isChatSelected(chatId)
        ? prev.filter(
            (item) =>
              !(item.type === "chat" && String(item.chatId) === String(chatId)),
          )
        : [...prev, { type: "chat", chatId }],
    );
  };

  const toggleUser = (userId) => {
    setSelected((prev) =>
      isUserSelected(userId)
        ? prev.filter(
            (item) =>
              !(item.type === "user" && String(item.userId) === String(userId)),
          )
        : [...prev, { type: "user", userId }],
    );
  };

  const handleConfirm = async () => {
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onForward(selected);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="px-4 py-2 chat-text-secondary chat-hover rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected.length === 0 || submitting}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {submitting
          ? "Forwarding…"
          : selected.length > 0
            ? `Forward (${selected.length})`
            : "Forward"}
      </button>
    </>
  );

  return (
    <ChatModalShell
      open={open}
      title="Forward message"
      onClose={onClose}
      maxWidth="md"
      footer={footer}
    >
      {forwarding.length > 0 && (
        <div className="px-4 pt-3 pb-1 chat-divider-b">
          <p className="text-xs chat-text-muted mb-1">
            {forwarding.length > 1
              ? `${forwarding.length} messages selected`
              : "Message preview"}
          </p>
          {forwarding.length > 1 ? (
            <ul className="space-y-1 max-h-24 overflow-y-auto">
              {forwarding.map((msg) => (
                <li key={msg.id} className="text-sm chat-text line-clamp-1">
                  {getMessagePreview(msg, 80)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm chat-text line-clamp-2">
              {getMessagePreview(forwarding[0], 120)}
            </p>
          )}
        </div>
      )}

      <div className="flex chat-divider-b">
        <button
          type="button"
          onClick={() => {
            setTab("chats");
            setSearch("");
          }}
          className={`flex-1 py-2 text-sm font-medium ${
            tab === "chats"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
              : "chat-text-muted"
          }`}
        >
          Chats
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("users");
            setSearch("");
          }}
          className={`flex-1 py-2 text-sm font-medium ${
            tab === "users"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
              : "chat-text-muted"
          }`}
        >
          Users
        </button>
      </div>

      <div className="p-4">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          sticky={true}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-[200px] max-h-[40vh]">
        {tab === "chats" ? (
          filteredChats.length === 0 ? (
            <EmptyState>No chats found</EmptyState>
          ) : (
            <div className="space-y-1 mt-1">
              {filteredChats.map((chat) => {
                const isSelected = isChatSelected(chat.id);
                const name = getChatDisplayName(chat, currentUser?.id);
                const initial =
                  chat.type === "group"
                    ? name.charAt(0).toUpperCase()
                    : name.charAt(0).toUpperCase();
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => toggleChat(chat.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500"
                        : "chat-hover"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${getAvatarColor(chat.id)} flex items-center justify-center text-white font-semibold flex-shrink-0`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium chat-text truncate">
                        {name}
                      </p>
                      <p className="text-xs chat-text-muted capitalize">
                        {chat.type === "group" ? "Group" : "Direct"}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 border-2 rounded flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      } flex items-center justify-center`}
                    >
                      {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : usersLoading ? (
          <EmptyState>Loading users...</EmptyState>
        ) : filteredUsersList.length === 0 ? (
          <EmptyState>No users found</EmptyState>
        ) : (
          <div className="space-y-1 mt-1">
            {filteredUsersList.map((user) => {
              const isSelected = isUserSelected(user.id);
              return (
                <UserListItem
                  key={user.id}
                  user={user}
                  variant="selectable"
                  selected={isSelected}
                  onClick={() => toggleUser(user.id)}
                  containerClassName={
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500"
                      : ""
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </ChatModalShell>
  );
};

ForwardMessageModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onForward: PropTypes.func.isRequired,
  excludeChatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  forwarding: PropTypes.arrayOf(PropTypes.object),
};

export default ForwardMessageModal;
