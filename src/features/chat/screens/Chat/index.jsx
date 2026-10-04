import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import { usePageTitle } from '@hooks/usePageTitle';
import {
  ChatList,
  ChatWindow,
  NewGroupModal,
  DirectChatModal,
  StartMeetingModal,
  MeetingLinkModal,
  ChatThemeRoot,
  isAdminOrHR,
  getChatRoute,
} from "@features/chat";
import { useSelector } from "react-redux";
import { createDirectChat, getChatDetails } from "../../api/chatApi";
import { getChatsSnapshot } from "@stores/chatStore";
import { toast } from "react-toastify";
import { createVideoRoom, startCall, generateMeetingRoomId } from "@api/videoRoomApi";

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { chatId } = useParams();

  // Update browser tab title
  usePageTitle("Chat", location);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  // flag used when we navigated from a notification that had no message id; in
  // that case we still want to visually draw attention to the most recent message.
  const [highlightLastOnOpen, setHighlightLastOnOpen] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showDirectChatModal, setShowDirectChatModal] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  const [chatListMethods, setChatListMethods] = useState(null);
  const resolvingChatRef = useRef(null);

  const openChat = useCallback(
    (chat, { replace = false, state: navState } = {}) => {
      if (!chat?.id) return;
      setSelectedChat(chat);
      setShowChatList(false);
      const navOptions = replace || navState ? { ...(replace ? { replace: true } : {}), ...(navState ? { state: navState } : {}) } : undefined;
      navigate(getChatRoute(location.pathname, chat.id), navOptions);
    },
    [navigate, location.pathname],
  );

  const reloadChatList = useCallback(() => {
    if (chatListMethods?.reloadChats) {
      chatListMethods.reloadChats();
    }
  }, [chatListMethods]);

  // Meeting states
  const [showStartMeetingModal, setShowStartMeetingModal] = useState(false);
  const [showMeetingLinkModal, setShowMeetingLinkModal] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");

  const token =
    useSelector((state) => state.auth.accessToken) ||
    localStorage.getItem("accessToken");
  const currentUser = useSelector((state) => state.userData?.userDetails);
  const canViewActiveMeetings = isAdminOrHR(currentUser);

  // Check if there's a meeting param in URL and redirect to /call
  useEffect(() => {
    const meetingParam = searchParams.get("meeting");
    if (meetingParam) {
      // Redirect to /call route with meeting param
      navigate(
        `/join/?meeting=${encodeURIComponent(meetingParam)}&autoJoin=${searchParams.get("autoJoin") || "false"}`,
        { replace: true },
      );
    }
  }, [searchParams, navigate]);

  // Deep link: messageId from URL query (shared group message links)
  useEffect(() => {
    const messageIdParam = searchParams.get("messageId");
    if (messageIdParam) {
      setSelectedMessageId(messageIdParam);
    }
  }, [searchParams]);

  // Open or create a direct chat by user id (?userId= or navigation state)
  useEffect(() => {
    const userIdParam =
      searchParams.get("userId") || location.state?.selectedUserId;
    if (!userIdParam || chatId || !token) return;

    let cancelled = false;

    const startDirectChat = async () => {
      try {
        const response = await createDirectChat(token, userIdParam);
        if (cancelled || !response?.data?.id) return;
        openChat(response.data, { replace: true, state: location.state });
        reloadChatList();
      } catch {
        if (!cancelled) {
          toast.error("Could not start direct chat.");
        }
      }
    };

    startDirectChat();
    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    location.state,
    chatId,
    token,
    openChat,
    reloadChatList,
  ]);

  // Handle notification state for chat selection
  useEffect(() => {
    const state = location.state;
    if (state) {
      const {
        selectedChatId,
        selectedChat,
        selectedMessageId: notificationMessageId,
      } = state;

      if (notificationMessageId !== undefined) {
        setSelectedMessageId(notificationMessageId);
      } else if (
        notificationMessageId === undefined &&
        (selectedChatId || selectedChat)
      ) {
        // we arrived via a notification but the server did not include a message
        // id.  remember this so we can highlight the last message after the
        // conversation loads; scrolling to bottom already happens by default.
        setHighlightLastOnOpen(true);
      }

      if (selectedChat) {
        openChat(selectedChat, { replace: true, state });
      } else if (selectedChatId) {
        // Navigate to the chat URL; resolver below will load from list or API
        navigate(getChatRoute(location.pathname, selectedChatId), { replace: true, state });
      }
    }
  }, [location.state, location.pathname, navigate, openChat]);

  // Resolve chat from URL param (direct navigation, refresh, deep links)
  useEffect(() => {
    if (!chatId) {
      setSelectedChat(null);
      setShowChatList(true);
      resolvingChatRef.current = null;
      return;
    }

    if (!token || !chatListMethods?.findChatById) return;
    if (chatListMethods.isListLoading && getChatsSnapshot().length === 0) return;

    const numericChatId = Number(chatId);
    const resolvedId = Number.isFinite(numericChatId) ? numericChatId : chatId;
    const resolvedKey = String(resolvedId);

    if (
      selectedChat?.id != null &&
      String(selectedChat.id) === resolvedKey
    ) {
      setShowChatList(false);
      return;
    }

    const localChat = chatListMethods.findChatById(resolvedId);
    if (localChat) {
      resolvingChatRef.current = null;
      setSelectedChat(localChat);
      setShowChatList(false);
      return;
    }

    const stateChat = location.state?.selectedChat;
    if (
      stateChat?.id != null &&
      String(stateChat.id) === resolvedKey
    ) {
      resolvingChatRef.current = null;
      setSelectedChat(stateChat);
      setShowChatList(false);
      return;
    }

    if (resolvingChatRef.current === resolvedKey) return;
    resolvingChatRef.current = resolvedKey;

    let cancelled = false;

    const resolveChatFromApi = async () => {
      try {
        const response = await getChatDetails(token, resolvedId);
        if (cancelled) return;

        if (response?.data) {
          resolvingChatRef.current = null;
          setSelectedChat(response.data);
          setShowChatList(false);
          reloadChatList();
          return;
        }
      } catch (error) {
        if (cancelled) return;
        resolvingChatRef.current = null;

        const status = error?.status;
        const message =
          status === 403 || status === 401
            ? "You don't have access to this chat."
            : "The given link is invalid. Please check the link and try again.";

        setSelectedChat(null);
        setSelectedMessageId(null);
        setShowChatList(true);
        navigate(getChatRoute(location.pathname), { replace: true });
        toast.info(message);
      }
    };

    resolveChatFromApi();

    return () => {
      cancelled = true;
    };
  }, [
    chatId,
    token,
    chatListMethods,
    location.state,
    navigate,
    reloadChatList,
    selectedChat?.id,
  ]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setShowChatList(false); // Hide chat list on mobile when chat is selected
    if (chat?.id !== undefined && chat?.id !== null) {
      navigate(getChatRoute(location.pathname, chat.id));
    }
  };

  const handleBack = () => {
    setShowChatList(true);
    setSelectedChat(null);
    setSelectedMessageId(null);
    navigate(getChatRoute(location.pathname));
  };

  const handleNavigateToMessage = useCallback(
    (targetChatId, targetMessageId) => {
      if (targetChatId == null || targetMessageId == null) return;

      setSelectedMessageId(targetMessageId);

      if (
        selectedChat?.id != null &&
        String(selectedChat.id) === String(targetChatId)
      ) {
        return;
      }

      const localChat = chatListMethods?.findChatById?.(targetChatId);
      if (localChat) {
        openChat(localChat);
      }

      navigate(
        `${getChatRoute(location.pathname, targetChatId)}?messageId=${encodeURIComponent(targetMessageId)}`,
      );
    },
    [selectedChat?.id, chatListMethods, openChat, navigate, location.pathname],
  );

  const handleCreateGroup = () => {
    setShowNewGroupModal(true);
  };

  const handleGroupCreated = (newChat) => {
    setSelectedChat(newChat);
    setShowChatList(false);
    if (newChat?.id !== undefined && newChat?.id !== null) {
      navigate(getChatRoute(location.pathname, newChat.id));
    }
    // Reload chat list to show the new group
    if (chatListMethods?.reloadChats) {
      chatListMethods.reloadChats();
    }
  };

  const handleOpenDirectChat = () => {
    setShowDirectChatModal(true);
  };

  const handleDirectChatUserSelected = async (userId) => {
    try {
      const response = await createDirectChat(token, userId);
      if (response?.data) {
        openChat(response.data);
        reloadChatList();
      }
    } catch {
      toast.error("Error creating direct chat");
    }
  };

  // Meeting handlers
  const handleStartMeeting = () => {
    setShowStartMeetingModal(true);
  };

  const handleGetMeetingLink = async ({ isOpenCall = false } = {}) => {
    if (!token) {
      toast.error("Please sign in to create a meeting.");
      throw new Error("No token");
    }
    const roomId = generateMeetingRoomId();
    const { roomId: finalRoomId } = await createVideoRoom(token, {
      roomId,
      status: "scheduled",
      isOpenCall,
    });
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join/?meeting=${encodeURIComponent(finalRoomId)}`;
    setMeetingLink(link);
    setShowMeetingLinkModal(true);
  };

  const handleInstantMeeting = async ({ isOpenCall = false } = {}) => {
    if (!token) {
      toast.error("Please sign in to start a meeting.");
      throw new Error("No token");
    }
    const roomId = generateMeetingRoomId();
    const { roomId: finalRoomId } = await createVideoRoom(token, {
      roomId,
      status: "scheduled",
      isOpenCall,
    });
    navigate(`/join/?meeting=${encodeURIComponent(finalRoomId)}`);
  };

  const handleGroupMeeting = async (memberIds, { isOpenCall = false } = {}) => {
    if (!token) {
      toast.error("Please sign in to start a meeting.");
      throw new Error("No token");
    }
    const roomId = generateMeetingRoomId();
    const { roomId: finalRoomId } = await createVideoRoom(token, {
      roomId,
      status: "scheduled",
      isOpenCall,
    });
    navigate(`/join/?meeting=${encodeURIComponent(finalRoomId)}`);
    void memberIds;
  };

  // "Join call" button on a "started a call" system message — reuses the same
  // autoJoin flow as everything else; the room may have ended by now, which
  // Call/index.jsx already handles (shows "This Meeting Link has expired").
  const handleJoinCall = (roomId) => {
    if (!roomId) return;
    navigate(`/join/?meeting=${encodeURIComponent(roomId)}&autoJoin=true&video=false&audio=false`);
  };

  // Rings every active member of the given chat, then joins the caller straight
  // in as host (no ring for self) — see docs/call-ringing-invite.txt.
  const handleStartCallForChat = async (chat) => {
    if (!token) {
      toast.error("Please sign in to start a call.");
      return;
    }
    if (!chat?.id) return;
    try {
      const result = await startCall(token, { chatId: chat.id, withVideo: true });
      navigate(`/join/?meeting=${encodeURIComponent(result.roomId)}&autoJoin=true&video=false&audio=false`);
    } catch (error) {
      toast.error(error?.message || "Could not start the call");
    }
  };

  return (
    <ChatThemeRoot
      className="flex w-full overflow-x-hidden chat-bg p-4"
      style={{ height: "calc(100vh - 70px)" }}
    >
      {/* Chat List - Show on desktop always, toggle on mobile; full width on mobile */}
      <div
        className={`${
          showChatList ? "flex" : "hidden"
        } md:flex flex-shrink-0 min-w-0 w-full md:w-auto`}
      >
        <ChatList
          onSelectChat={handleSelectChat}
          selectedChatId={selectedChat?.id}
          onCreateGroup={handleCreateGroup}
          onCreateDirectChat={handleOpenDirectChat}
          onChatListReady={setChatListMethods}
          onStartMeeting={handleStartMeeting}
        />
      </div>

      {/* Chat Window - Show when chat is selected */}
      <div
        className={`${selectedChat ? "flex" : "hidden"} md:flex flex-1 min-w-0`}
      >
        <ChatWindow
          chat={selectedChat}
          selectedMessageId={selectedMessageId}
          highlightLastOnOpen={highlightLastOnOpen}
          onHighlightConsumed={() => setHighlightLastOnOpen(false)}
          onBack={handleBack}
          onNavigateToMessage={handleNavigateToMessage}
          onOpenDirectChatWithUser={handleDirectChatUserSelected}
          onStartCall={handleStartCallForChat}
          onJoinCall={handleJoinCall}
          onChatUpdated={(updatedChat) => {
            // Update selected chat when group details are modified
            setSelectedChat(updatedChat);
            // Update chat list to reflect the changes (e.g., group name)
            if (chatListMethods?.updateChatDetails) {
              chatListMethods.updateChatDetails(updatedChat);
            }
          }}
          onLeftGroup={() => {
            handleBack();
            reloadChatList();
          }}
          onMessageSent={(
            chatId,
            messageTimestamp,
            messageContent,
            messageType,
          ) => {
            // Update chat list when message is sent
            if (chatListMethods?.updateChatLastMessage) {
              chatListMethods.updateChatLastMessage(
                chatId,
                messageTimestamp,
                messageContent,
                messageType,
              );
            }
          }}
        />
      </div>

      {/* New Group Modal */}
      <NewGroupModal
        open={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Direct Chat Modal */}
      <DirectChatModal
        open={showDirectChatModal}
        onClose={() => setShowDirectChatModal(false)}
        onUserSelected={handleDirectChatUserSelected}
      />

      {/* Start Meeting Modal */}
      <StartMeetingModal
        open={showStartMeetingModal}
        onClose={() => setShowStartMeetingModal(false)}
        onGetLink={handleGetMeetingLink}
        onInstantMeeting={handleInstantMeeting}
        onGroupMeeting={handleGroupMeeting}
        canViewActiveMeetings={canViewActiveMeetings}
      />

      {/* Meeting Link Modal */}
      <MeetingLinkModal
        open={showMeetingLinkModal}
        onClose={() => setShowMeetingLinkModal(false)}
        meetingLink={meetingLink}
      />
    </ChatThemeRoot>
  );
};

export default Chat;
