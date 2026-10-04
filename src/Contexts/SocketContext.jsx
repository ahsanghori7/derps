import { createContext, useContext, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { baseURl } from '../Config/systemConfig';
import { toast } from 'react-toastify';

const SocketContext = createContext(null);
const GUEST_TOKEN_KEY = 'guestAccessToken';

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [awayUsers, setAwayUsers] = useState(new Set());
    const [busyUsers, setBusyUsers] = useState(new Set());
    const authToken = useSelector((state) => state.auth.accessToken);
    const [localStorageToken, setLocalStorageToken] = useState(() => {
        // Prefer authenticated token; fallback to guest token for public call joins.
        return localStorage.getItem('accessToken') || localStorage.getItem(GUEST_TOKEN_KEY);
    });
    const token = authToken || localStorageToken;
    const socketRef = useRef(null);
    const tokenRef = useRef(null);
    const disconnectTimerRef = useRef(null);

    // React to guest token being written after the app has already mounted.
    // localStorage writes in the same tab do NOT trigger the native 'storage' event,
    // so GuestCallEntry dispatches 'guest-token-changed' to force a re-check.
    useEffect(() => {
        const syncTokenFromStorage = () => {
            setLocalStorageToken(localStorage.getItem('accessToken') || localStorage.getItem(GUEST_TOKEN_KEY));
        };

        window.addEventListener('storage', syncTokenFromStorage);
        window.addEventListener('guest-token-changed', syncTokenFromStorage);
        return () => {
            window.removeEventListener('storage', syncTokenFromStorage);
            window.removeEventListener('guest-token-changed', syncTokenFromStorage);
        };
    }, []);

    useEffect(() => {
        if (!token) {
            return;
        }

        if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
        }

        if (socketRef.current && tokenRef.current === token) {
            setSocket(socketRef.current);
            return;
        }

        if (socketRef.current && tokenRef.current !== token) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            tokenRef.current = null;
        }

        // Get base URL without /api
        const socketUrl = baseURl.replace('/api', '').replace(/\/$/, '');
        
        // Initialize socket connection
        const newSocket = io(socketUrl, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling']
        });

        socketRef.current = newSocket;
        tokenRef.current = token;

        // Connection events
        newSocket.on('connect', () => {
            setSocket(socketRef.current);
            setIsConnected(true);
        });

        newSocket.on('connect_error', (error) => {
            setIsConnected(false);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        const removeUserFromBusy = (userId) => {
            setBusyUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        };

        // User status events
        newSocket.on('user:online', (data) => {
            setOnlineUsers(prev => new Set([...prev, data.userId]));
            setAwayUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.userId);
                return newSet;
            });
            removeUserFromBusy(data.userId);
        });

        newSocket.on('user:offline', (data) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.userId);
                return newSet;
            });
            setAwayUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.userId);
                return newSet;
            });
            removeUserFromBusy(data.userId);
        });

        newSocket.on('user:away', (data) => {
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.userId);
                return newSet;
            });
            setAwayUsers(prev => new Set([...prev, data.userId]));
            removeUserFromBusy(data.userId);
        });

        newSocket.on('user:busy', ({ userId, roomId, status }) => {
            if (!userId) return;

            const leavingBusy = status === 'online' || status === 'available' || status === 'away' || status === 'offline';

            if (leavingBusy) {
                removeUserFromBusy(userId);
                return;
            }

            setBusyUsers(prev => new Set([...prev, userId]));
            setOnlineUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
            setAwayUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        newSocket.on('user:left_meeting', ({ userId }) => {
            if (!userId) return;

            removeUserFromBusy(userId);
            setOnlineUsers(prev => new Set([...prev, userId]));
            setAwayUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            if (newSocket) {
                // In React 18 StrictMode (dev), effects mount/unmount twice.
                // Debounce disconnect to avoid tearing down a socket that is immediately re-created.
                disconnectTimerRef.current = setTimeout(() => {
                    newSocket.removeAllListeners();
                    newSocket.disconnect();
                    if (socketRef.current === newSocket) {
                        socketRef.current = null;
                        tokenRef.current = null;
                    }
                    disconnectTimerRef.current = null;
                }, 250);
            }
        };
    }, [token]);

    // Emit visibility status to server when browser tab visibility changes
    useEffect(() => {
        // Only run in browser environments when socket is available
        if (!socket || typeof document === 'undefined') return;

        const handleVisibilityChange = () => {
            const isVisible = !document.hidden;

            if (socket && isConnected) {
                socket.emit('user:visibility', { isVisible: isVisible });
            }
        };

        // Best-effort: when the tab is being closed/navigated away, tell server we're offline.
        // (Server should still treat disconnect as authoritative, but this helps update presence faster.)
        const handlePageHide = () => {
            if (socket && isConnected) {
                socket.emit('user:offline');
            }
        };

        // Handle user activity (typing, clicking, moving mouse)
        const handleUserActivity = () => {
            // Only emit if tab is visible
            if (!document.hidden && socket && isConnected) {
                socket.emit('user:visibility', { isVisible: true });
            }
        };

        // Throttle activity handler to avoid too many emissions
        let activityTimeout = null;
        const throttledActivityHandler = () => {
            if (activityTimeout) return;
            
            handleUserActivity();
            
            // Set a timeout to allow next emission after 5 seconds
            activityTimeout = setTimeout(() => {
                activityTimeout = null;
            }, 5000);
        };

        // Register visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        // Register activity listeners
        const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.addEventListener(event, throttledActivityHandler, { passive: true });
        });

        // Send current visibility state immediately after listener is registered
        handleVisibilityChange();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            activityEvents.forEach(event => {
                document.removeEventListener(event, throttledActivityHandler);
            });
            if (activityTimeout) {
                clearTimeout(activityTimeout);
            }
        };
    }, [socket, isConnected]);

    // Helper functions
    const joinChat = (chatId) => {
        if (socket && isConnected) {
            socket.emit('chat:join', chatId);
        }
    };

    const leaveChat = (chatId) => {
        if (socket && isConnected) {
            socket.emit('chat:leave', chatId);
        }
    };

    const startTyping = (chatId) => {
        if (socket && isConnected) {
            socket.emit('typing:start', { chatId });
        }
    };

    const stopTyping = (chatId) => {
        if (socket && isConnected) {
            socket.emit('typing:stop', { chatId });
        }
    };

    const isUserOnline = (userId) => {
        return onlineUsers.has(userId);
    };

    const isUserAway = (userId) => {
        return awayUsers.has(userId);
    };

    const isUserBusy = (userId) => {
        return busyUsers.has(userId);
    };

    const getUserStatus = (userId) => {
        if (busyUsers.has(userId)) return 'busy';
        if (onlineUsers.has(userId)) return 'online';
        if (awayUsers.has(userId)) return 'away';
        return 'offline';
    };

    const markChatAsRead = (chatId) => {
        if (socket && isConnected) {
            socket.emit('chat:markAsRead', { chatId });
        }
    };

    const markNotificationAsRead = (notificationId) => {
        if (socket && isConnected) {
            socket.emit('notification:markAsRead', { notificationId });
        } else {
            toast.error('Socket disconnected. Please check your internet connection and try again.');
        }
    };

    const value = {
        socket,
        isConnected,
        onlineUsers,
        awayUsers,
        busyUsers,
        joinChat,
        leaveChat,
        startTyping,
        stopTyping,
        isUserOnline,
        isUserAway,
        isUserBusy,
        getUserStatus,
        markChatAsRead,
        markNotificationAsRead
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

SocketProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
