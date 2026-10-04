import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { getChats } from '../api/chatApi';
import { useSocket } from '@contexts/SocketContext';
import {
    getChatsSnapshot,
    getChatListMeta,
    isChatsStale,
    setChatsSnapshot,
    subscribeToChatsSnapshot,
    updateChatDetailsInStore,
    updateChatLastMessageInStore,
    markChatReadInStore,
    findChatByIdInStore,
    getChatSearchKeyword,
    setChatSearchKeyword,
} from '@stores/chatStore';
import moment from 'moment';
import { SearchBar } from '../shared/components';
import { toast } from 'react-toastify';

import { getAvatarColor, getMessagePreview, getDirectChatOtherUserId, getUserStatusStyle, isChatMutedForUser } from '../shared/utils/chatUtility';
import { getProfilePictureUrl } from '../../../Utils/profile';
import { useAuthUser } from '@hooks/useAuthUser';
import { GroupIcon, PlusIcon, VideoIcon, SettingsIcon, ClockIcon, RefreshIcon, MutedIcon } from '../shared/icons';
import { AutoReplySettingsModal } from '../settings';
import { getAutoReplySettings } from '../api/chatApi';
import '../shared/theme/ChatWindow.css';

const ChatList = ({ onSelectChat, selectedChatId, onCreateGroup, onCreateDirectChat, onChatListReady, onStartMeeting }) => {
    const initialMeta = getChatListMeta();
    const cachedChats = getChatsSnapshot();
    const [chats, setChats] = useState(() => cachedChats);
    const [loading, setLoading] = useState(() => cachedChats.length === 0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchPending, setSearchPending] = useState(false);
    const [page, setPage] = useState(() => initialMeta.page || 1);
    const [hasMore, setHasMore] = useState(() => initialMeta.hasMore ?? true);
    const [searchQuery, setSearchQuery] = useState(() => getChatSearchKeyword());
    const { token, currentUser } = useAuthUser();
    const { getUserStatus } = useSocket();
    const searchTimeoutRef = useRef(null);
    const didInitialLoadRef = useRef(false);
    const lastRequestedKeywordRef = useRef(null);
    const latestKeywordRef = useRef("");
    const baselineListRef = useRef({ chats: [], page: 1, hasMore: true });
    const hadPersistedKeywordRef = useRef(Boolean(getChatSearchKeyword()));
    const lastOpenedChatRef = useRef(null);
    const listRef = useRef(null);
    const LIMIT = 10;
    const [showAutoReplyModal, setShowAutoReplyModal] = useState(false);
    const [autoReplyActive, setAutoReplyActive] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const normalizeChats = useCallback((items) => {
        if (!Array.isArray(items)) return [];
        return items.map(chat => ({
            ...chat,
            // Ensure lastMessageAt exists
            lastMessageAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt,
            // Preserve unreadCount if provided by API
            unreadCount: chat.unreadCount !== undefined ? chat.unreadCount : null
        }));
    }, []);

    const mergeChatsById = useCallback((prev, next) => {
        const map = new Map();
        [...prev, ...next].forEach((c) => {
            if (!c || c.id === undefined || c.id === null) return;
            map.set(String(c.id), c);
        });
        return Array.from(map.values());
    }, []);

    const loadChats = useCallback(async ({ nextPage = 1, append = false, keyword, background = false } = {}) => {
        const hasCache = getChatsSnapshot().length > 0;
        try {
            if (append) setLoadingMore(true);
            else if (background && hasCache) {
                // stale-while-revalidate: keep showing cached list
            } else setLoading(true);

            const effectiveKeyword = keyword !== undefined ? keyword : (latestKeywordRef.current || "");
            const response = await getChats(token, nextPage, LIMIT, effectiveKeyword);
            if (response?.data) {
                const normalizedChats = normalizeChats(response.data);

                setChats((prev) => {
                    const merged = append ? mergeChatsById(prev, normalizedChats) : normalizedChats;
                    setChatsSnapshot(merged, {
                        page: nextPage,
                        hasMore: normalizedChats.length >= LIMIT,
                        touchFetchedAt: true,
                    });
                    return merged;
                });

                setPage(nextPage);
                setHasMore(normalizedChats.length >= LIMIT);

                if (!effectiveKeyword?.trim() && !append) {
                    baselineListRef.current = {
                        chats: normalizedChats,
                        page: nextPage,
                        hasMore: normalizedChats.length >= LIMIT,
                    };
                }

                return { ok: true, chats: normalizedChats };
            }
            return { ok: false, chats: [] };
        } catch (error) {
            toast.error('Error loading chats');
            return { ok: false, chats: [] };
        } finally {
            if (append) setLoadingMore(false);
            else setLoading(false);
            if ((keyword !== undefined ? keyword : latestKeywordRef.current)?.trim()) {
                setSearchPending(false);
            }
        }
    }, [token, normalizeChats, mergeChatsById]);

    // Function to update lastMessageAt for a specific chat
    const updateChatLastMessage = useCallback((chatId, messageTimestamp, messageContent, messageType = 'text') => {
        updateChatLastMessageInStore(
            chatId,
            messageTimestamp,
            messageContent,
            messageType,
            currentUser?.id,
        );
    }, [currentUser?.id]);

    const updateChatDetails = useCallback((updatedChat) => {
        updateChatDetailsInStore(updatedChat);
    }, []);

    const findChatById = useCallback((chatId) => {
        return findChatByIdInStore(chatId);
    }, []);

    // Expose methods to parent component
    useEffect(() => {
        if (onChatListReady) {
            onChatListReady({ 
                updateChatLastMessage,
                updateChatDetails,
                reloadChats: loadChats,
                findChatById,
                isListLoading: loading,
            });
        }
    }, [onChatListReady, updateChatLastMessage, updateChatDetails, loadChats, findChatById, loading]);

    useEffect(() => subscribeToChatsSnapshot(setChats), []);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        const loadAutoReply = async () => {
            try {
                const res = await getAutoReplySettings(token);
                const data = res?.data ?? res ?? {};
                if (!cancelled) setAutoReplyActive(Boolean(data.enabled));
            } catch {
                if (!cancelled) setAutoReplyActive(false);
            }
        };
        loadAutoReply();
        return () => { cancelled = true; };
    }, [token, showAutoReplyModal]);

    useEffect(() => {
        if (!token) return;
        didInitialLoadRef.current = true;

        const cached = getChatsSnapshot();
        if (cached.length > 0) {
            setLoading(false);
            const meta = getChatListMeta();
            setPage(meta.page || 1);
            setHasMore(meta.hasMore ?? true);
            // Only trust the cached snapshot as the unfiltered baseline when there's no
            // persisted search keyword — otherwise the cache holds filtered search results.
            if (!getChatSearchKeyword()) {
                baselineListRef.current = {
                    chats: cached,
                    page: meta.page || 1,
                    hasMore: meta.hasMore ?? true,
                };
            }
        }

        if (cached.length === 0 || isChatsStale()) {
            loadChats({
                nextPage: 1,
                append: false,
                keyword: getChatSearchKeyword(),
                background: cached.length > 0,
            });
        }
    }, [token, loadChats]);

    useEffect(() => {
        if (!token) return;
        if (!didInitialLoadRef.current) return;

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        const keyword = searchQuery?.trim() || "";
        latestKeywordRef.current = keyword;
        setChatSearchKeyword(keyword);

        // If keyword is cleared, restore baseline list (if we previously replaced it via server-search)
        if (!keyword) {
            setSearchPending(false);
            if (lastRequestedKeywordRef.current === "") return;
            lastRequestedKeywordRef.current = "";
            const baseline = baselineListRef.current;
            if (baseline?.chats?.length) {
                const opened = lastOpenedChatRef.current;
                const restored = opened ? mergeChatsById(baseline.chats, [opened]) : baseline.chats;
                setChats(restored);
                setChatsSnapshot(restored);
                setPage(baseline.page || 1);
                setHasMore(Boolean(baseline.hasMore));
            } else if (hadPersistedKeywordRef.current) {
                // Mounted directly into a persisted search (no local baseline captured yet) —
                // refetch the unfiltered list from the server now that the search is cleared.
                hadPersistedKeywordRef.current = false;
                loadChats({ nextPage: 1, append: false, keyword: "" });
            }
            return;
        }

        // If we already have matching chats in the currently loaded list, don't call the API again.
        const hasLocalMatch = chats.some((chat) => {
            try {
                const name = (() => {
                    if (!chat) return "";
                    if (chat.type === 'group') return chat.name || 'Group Chat';
                    if (chat.members && chat.members.length > 0) {
                        const otherMember = chat.members.find(m => m.userId !== currentUser?.id);
                        const baseName = otherMember?.user?.name || 'Unknown User';
                        const designation = otherMember?.user?.designation || "";
                        return designation ? `${baseName} (${designation})` : baseName;
                    }
                    return 'Direct Chat';
                })().toLowerCase();

                return name.includes(keyword.toLowerCase());
            } catch {
                return false;
            }
        });
        if (hasLocalMatch) {
            setSearchPending(false);
            return;
        }

        // If we already searched this exact keyword (even if result was empty),
        // don't show "Loading..." again.
        if (lastRequestedKeywordRef.current === keyword) {
            setSearchPending(false);
            return;
        }

        // No local matches; show a "searching" state while we debounce + fetch
        setSearchPending(true);

        searchTimeoutRef.current = setTimeout(() => {
            if (lastRequestedKeywordRef.current === keyword) {
                setSearchPending(false);
                return;
            }
            lastRequestedKeywordRef.current = keyword;
            setPage(1);
            setHasMore(true);
            loadChats({ nextPage: 1, append: false, keyword });
        }, 1000);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [token, searchQuery, loadChats, chats, currentUser?.id, mergeChatsById]);

    const handleRefresh = useCallback(async () => {
        if (!token || refreshing || loading || loadingMore) return;

        setRefreshing(true);
        try {
            const previousIds = new Set(
                getChatsSnapshot().map((chat) => String(chat.id))
            );
            const result = await loadChats({
                nextPage: 1,
                append: false,
                keyword: latestKeywordRef.current || "",
                background: true,
            });
            if (!result?.ok) return;

            const addedCount = (result.chats || []).filter(
                (chat) => !previousIds.has(String(chat.id))
            ).length;

            if (addedCount === 0) {
                toast.info('Chats are up to date');
            } else {
                toast.success(
                    addedCount === 1
                        ? '1 new chat loaded'
                        : `${addedCount} new chats loaded`
                );
            }
        } finally {
            setRefreshing(false);
        }
    }, [token, refreshing, loading, loadingMore, loadChats]);

    const loadMoreChats = useCallback(() => {
        if (!token) return;
        if (loading || loadingMore || refreshing) return;
        if (!hasMore) return;
        // Avoid weird UX while filtering; user can clear search to load more
        if (searchQuery?.trim()) return;
        loadChats({ nextPage: page + 1, append: true, keyword: "" });
    }, [token, loading, loadingMore, refreshing, hasMore, searchQuery, loadChats, page]);

    const handleScroll = useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        const thresholdPx = 120;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom <= thresholdPx) {
            loadMoreChats();
        }
    }, [loadMoreChats]);

    const getChatName = (chat) => {
        if (chat.type === 'group') {
            return chat.name || 'Group Chat';
        }
        // For direct chats, show the other person's name
        if (chat.members && chat.members.length > 0) {
            const otherMember = chat.members.find(m => m.userId !== currentUser?.id);
            const name = otherMember?.user?.name || 'Unknown User';
            const designation = getUserDesignationByUserId(otherMember?.userId, chat);
            return name + " " + designation;
        }
        return 'Direct Chat';
    };

    const getUserDesignationByUserId = (userId, chat) => {
        if (!userId || !chat?.members?.length) return "";
        const member = chat.members.find((m) => String(m?.userId) === String(userId));
        const designation = member?.user?.designation || "";
        return designation ? `(${designation})` : "";
      };

    const getChatAvatar = (chat) => {
        if (chat.type === 'group') {
            return chat.name?.charAt(0).toUpperCase() || 'G';
        }
        // For direct chats, show the other person's initial
        if (chat.members && chat.members.length > 0) {
            const otherMember = chat.members.find(m => m.userId !== currentUser?.id);
            return otherMember?.user?.name?.charAt(0).toUpperCase() || 'U';
        }
        return 'D';
    };

    const getLastMessage = (chat, maxLength = 40) => {
        // Try multiple possible fields for last message
        let lastMsg = null;

        if (chat.messages && chat.messages.length > 0) {
            lastMsg = chat.messages[0];
        } else if (chat.lastMessage) {
            lastMsg = chat.lastMessage;
        } else if (chat.message) {
            lastMsg = chat.message;
        }

        return getMessagePreview(lastMsg, maxLength);
    };

    const getUnreadCount = (chat) => {
        // First check if there's an explicit unreadCount
        if (chat.unreadCount !== undefined && chat.unreadCount !== null) {
            return chat.unreadCount;
        }
        
        // Fallback to checking lastReadAt vs lastMessageAt
        if (!chat.lastReadAt || !chat.lastMessageAt) {
            // If no lastReadAt, check if last message is not from current user
            if (chat.messages && chat.messages.length > 0) {
                const lastMsg = chat.messages[0];
                if (lastMsg.userId !== currentUser?.id) {
                    return 1;
                }
            }
            return 0;
        }
        
        const lastRead = moment(chat.lastReadAt);
        const lastMessage = moment(chat.lastMessageAt);
        if (lastMessage.isAfter(lastRead)) {
            // Count messages after lastReadAt
            if (chat.messages) {
                return chat.messages.filter(msg => 
                    moment(msg.createdAt || msg.created_at).isAfter(lastRead)
                ).length;
            }
            return 1; // At least one unread
        }
        return 0;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        try {
            // Parse UTC timestamp and convert to local timezone
            const msgTime = moment.utc(timestamp).local();
            if (!msgTime.isValid()) return '';
            
            const now = moment();
            const diffDays = now.diff(msgTime, 'days');
            
            if (diffDays === 0) {
                // Today - show time in 12-hour format with AM/PM
                return msgTime.format('hh:mm A');
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                // Within a week - show day name
                return msgTime.format('ddd');
            } else {
                return msgTime.format('MMM DD');
            }
        } catch (error) {
            toast.error('Error formatting time');
            return '';
        }
    };

    const filteredChats = chats.filter(chat => {
        const chatName = getChatName(chat).toLowerCase();
        return chatName.includes(searchQuery.toLowerCase());
    });

    const getChatAvatarColor = (chat) => getAvatarColor(chat.id);

    return (
        <div className="flex flex-col h-full chat-surface chat-divider-r w-full md:w-[400px] overflow-x-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 chat-surface p-4 chat-divider-b">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold chat-text">Chats</h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={refreshing || loading || loadingMore}
                            className="p-1.5 rounded-lg border border-[rgba(72,128,255,0.35)] text-[#4880FF] hover:bg-[rgba(72,128,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Refresh chats"
                            aria-label="Refresh chats"
                        >
                            {refreshing ? (
                                <span
                                    className="block w-5 h-5 border-2 border-[#4880FF] border-t-transparent rounded-full animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <RefreshIcon className="w-5 h-5" />
                            )}
                        </button>
                        <button
                            onClick={onCreateGroup}
                            className="p-2 chat-hover rounded-full transition-colors"
                            title="New Group"
                        >
                            <GroupIcon className="w-5 h-5 chat-text-muted" />
                        </button>
                        <button
                            onClick={onCreateDirectChat}
                            className="p-2 chat-hover rounded-full transition-colors"
                            title="New Direct Chat"
                        >
                            <PlusIcon className="w-5 h-5 chat-text-muted" />
                        </button>
                        <button
                            onClick={onStartMeeting}
                            className="p-2 chat-hover rounded-full transition-colors"
                            title="Meetings"
                        >
                            <VideoIcon className="w-5 h-5 chat-text-muted" />
                        </button>
                        <button
                            onClick={() => setShowAutoReplyModal(true)}
                            className="p-2 chat-hover rounded-full transition-colors relative"
                            title="Auto-reply settings"
                            aria-label="Auto-reply settings"
                        >
                            <SettingsIcon className="w-5 h-5 chat-text-muted" />
                            {autoReplyActive && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[var(--chat-surface)]" />
                            )}
                        </button>
                    </div>
                </div>

                {autoReplyActive && (
                    <button
                        type="button"
                        onClick={() => setShowAutoReplyModal(true)}
                        className="mb-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/25 border border-blue-200 dark:border-blue-800 text-left transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                        <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-xs text-blue-800 dark:text-blue-200 truncate">
                            Auto-replies are on
                        </span>
                    </button>
                )}
                
                {/* Search Bar */}
                <SearchBar
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    sticky={true}
                />
            </div>

            {/* Chat List */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="chat-scroll flex-1 overflow-y-auto"
            >
                {((loading && !refreshing) || (searchPending && filteredChats.length === 0)) ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="chat-text-muted">Loading chats...</div>
                    </div>
                ) : filteredChats.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="chat-text-muted text-center">
                            <p>No chats found</p>
                                <button
                                onClick={onCreateGroup}
                                className="mt-2 chat-accent-muted chat-accent"
                            >
                                Create a new chat
                            </button>
                        </div>
                    </div>
                ) : (
                    filteredChats.map((chat) => {
                        const unreadCount = getUnreadCount(chat);
                        const isSelected = selectedChatId === chat.id;
                        const isMuted = isChatMutedForUser(chat, currentUser?.id);
                        // Try multiple possible timestamp fields
                        const timestamp = chat.lastMessageAt || 
                                        chat.lastMessage?.createdAt || 
                                        chat.messages?.[0]?.createdAt ||
                                        chat.updatedAt || 
                            chat.createdAt;
                        const lastMessageTime = formatTime(timestamp);
                        const directOtherUserId =
                            chat.type === 'direct'
                                ? getDirectChatOtherUserId(chat, currentUser?.id)
                                : null;
                        const directStatusStyle = directOtherUserId
                            ? getUserStatusStyle(getUserStatus(directOtherUserId))
                            : null;
                        const directOtherUser = chat.type === 'direct'
                            ? chat.members?.find((member) => member.userId !== currentUser?.id)?.user
                            : null;
                        const directPicture = getProfilePictureUrl(directOtherUser);
                        
                        const handleChatClick = () => {
                            if (unreadCount > 0) {
                                markChatReadInStore(chat.id, new Date().toISOString());
                            }
                            lastOpenedChatRef.current = chat;
                            onSelectChat(chat);
                        };
                        
                        return (
                            <div
                                key={chat.id}
                                onClick={handleChatClick}
                                className={`flex items-center p-4 cursor-pointer chat-hover transition-colors ${
                                    isSelected ? 'chat-selected' : ''
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0 mr-3">
                                    {directPicture ? (
                                        <img
                                            src={directPicture}
                                            alt=""
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className={`w-12 h-12 ${chat.type === 'group' ? 'rounded-xl' : 'rounded-full'} ${getChatAvatarColor(chat)} flex items-center justify-center text-white font-semibold text-lg`}>
                                            {getChatAvatar(chat)}
                                        </div>
                                    )}
                                    {directStatusStyle && (
                                        <span
                                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 chat-text ${directStatusStyle.dot}`}
                                            title={directStatusStyle.title}
                                        />
                                    )}
                                    {chat.type === 'group' && (
                                        <span
                                            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full chat-surface border-2 chat-text flex items-center justify-center"
                                            title="Group chat"
                                        >
                                            <GroupIcon className="w-2.5 h-2.5 chat-accent" />
                                        </span>
                                    )}
                                </div>

                                {/* Chat Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <h3 className="text-sm font-semibold chat-text truncate">
                                                {getChatName(chat)}
                                            </h3>
                                            {isMuted && (
                                                <span title="Muted" className="flex-shrink-0">
                                                    <MutedIcon className="w-3.5 h-3.5" />
                                                </span>
                                            )}
                                        </div>
                                        {lastMessageTime && (
                                            <span className={`text-xs ml-2 flex-shrink-0 ${
                                                unreadCount > 0 ? 'chat-accent-muted' : 'chat-text-muted'
                                            }`}>
                                                {lastMessageTime}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm chat-text-muted truncate flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 30px)' }}>
                                            {getLastMessage(chat)}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="bg-blue-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {!loading && !searchQuery?.trim() && (
                    <div className="py-3 flex items-center justify-center">
                        {loadingMore ? (
                            <div className="text-xs chat-text-muted">Loading more…</div>
                        ) : hasMore ? (
                            <button
                                type="button"
                                onClick={loadMoreChats}
                                disabled={loadingMore || loading || refreshing}
                                className="px-4 py-2 text-xs font-medium chat-text-secondary chat-control chat-control disabled:opacity-60 disabled:cursor-not-allowed rounded-md transition-colors"
                            >
                                Load more
                            </button>
                        ) : (
                            <div className="text-xs chat-text-subtle">No more chats</div>
                        )}
                    </div>
                )}
            </div>

            <AutoReplySettingsModal
                open={showAutoReplyModal}
                onClose={() => setShowAutoReplyModal(false)}
                onSaved={(payload) => setAutoReplyActive(Boolean(payload?.enabled))}
            />
        </div>
    );
};

ChatList.propTypes = {
    onSelectChat: PropTypes.func,
    selectedChatId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onCreateGroup: PropTypes.func,
    onCreateDirectChat: PropTypes.func,
    onChatListReady: PropTypes.func,
    onStartMeeting: PropTypes.func,
};

export default ChatList;

