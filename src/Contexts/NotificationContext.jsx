import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from './SocketContext';
import { getNotifications, markNotificationAsRead as markReadAPI } from '../features/notifications/api/notificationApi';
import { notificationService } from '../features/notifications/utils/notificationService';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../Utils/errorHandler';
import { canAccessNotifications } from '../Utils/moduleAccess';

const NotificationContext = createContext(null);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeNotifications, setActiveNotifications] = useState([]); // Array of active popup notifications
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [lastNotificationPageVisit, setLastNotificationPageVisit] = useState(null); // Timestamp of last visit to notification page
    const { socket, isConnected, markNotificationAsRead: markReadSocket } = useSocket();
    const token = useSelector((state) => state.auth.accessToken) || localStorage.getItem('accessToken');
    const homeTenantId = useSelector((state) => state.userData.userDetails.tenantId);
    const activeTenantId = useSelector((state) => state.auth?.tenantGroup?.activeTenantId);
    const tenantId = activeTenantId || homeTenantId;
    const roleTitle = useSelector((state) => state.userData?.userDetails?.roleTitle);
    const scopes = useSelector((state) => state.auth?.scopes ?? []);
    const tenantFeatures = useSelector((state) => state.auth?.tenantFeatures ?? []);
    const notificationsRef = useRef([]);
    const currentPageRef = useRef(1);

    const hasNotificationsAccess = useMemo(
        () => canAccessNotifications({ tenantFeatures, scopes, roleTitle }),
        [tenantFeatures, scopes, roleTitle]
    );

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async (options = {}) => {
        if (!token || !hasNotificationsAccess) {
            return { ok: false, addedCount: 0, alreadySynced: false };
        }
        
        const isAppending = options.append === true;
        const isBackground = options.background === true;
        const pageToFetch = options.page || (isAppending ? currentPageRef.current + 1 : 1);
        const previousIds = new Set(
            notificationsRef.current
                .map((n) => n?.id)
                .filter((id) => id != null)
                .map(String)
        );
        
        if (isAppending) {
            setLoadingMore(true);
        } else if (!isBackground) {
            setLoading(true);
        }
        
        try {
            const { append, background, page, ...requestOptions } = options;
            const response = await getNotifications(token, {
                limit: 100,
                page: pageToFetch,
                tenantId: tenantId,
                ...requestOptions
            });

            // Handle paginated response structure
            // Response can be: { data: { data: [...], totalRecords: X } } or { data: [...] } or [...]
            let notificationList = [];
            let total = 0;
            
            if (response?.data?.data && Array.isArray(response.data.data)) {
                // Paginated response structure
                notificationList = response.data.data;
                total = response.data.totalRecords || response.data.total || 0;
            } else if (response?.data && Array.isArray(response.data)) {
                // Direct array in data
                notificationList = response.data;
                total = response.totalRecords || response.total || notificationList.length;
            } else if (Array.isArray(response)) {
                // Direct array response
                notificationList = response;
                total = notificationList.length;
            }

            const addedCount = notificationList.filter(
                (n) => n?.id != null && !previousIds.has(String(n.id))
            ).length;
            
            // Update notifications and calculate hasMore
            setNotifications(prev => {
                const updatedList = isAppending ? [...prev, ...notificationList] : notificationList;
                const loadedCount = updatedList.length;
                // Check if there's more data to load
                setHasMore(loadedCount < total && notificationList.length === 10);
                return updatedList;
            });
            
            setTotalCount(total);
            
            // Update unread count and page
            if (isAppending) {
                const newUnread = notificationList.filter(n => !n.isRead).length;
                setUnreadCount(prev => prev + newUnread);
                setCurrentPage(pageToFetch);
            } else {
                const unread = notificationList.filter(n => !n.isRead).length;
                setUnreadCount(unread);
                setCurrentPage(1)
            }

            return {
                ok: true,
                addedCount,
                alreadySynced: !isAppending && addedCount === 0,
            };
            
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error fetching notifications'));
            return { ok: false, addedCount: 0, alreadySynced: false };
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [token, tenantId, hasNotificationsAccess]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId) => {
        try {
            if (isConnected && socket) {
                markReadSocket(notificationId);
            } else {
                await markReadAPI(token, notificationId);
            }
            
            setNotifications(prev => 
                prev.map(n => 
                    n.id === notificationId ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error marking notification as read'));
        }
    }, [token, socket, isConnected, markReadSocket]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        if (!notifications || notifications.length === 0) return;

        const unreadNotifications = notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) return;

        try {
            if (isConnected && socket) {
                // Use socket for all notifications
                unreadNotifications.forEach(notification => {
                    markReadSocket(notification.id);
                });
            } else {
                // Use REST API for all notifications
                const promises = unreadNotifications.map(notification => 
                    markReadAPI(token, notification.id)
                );
                await Promise.all(promises);
            }
            
            // Update all notifications to read state
            setNotifications(prev => 
                prev.map(n => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Error marking all notifications as read'));
        }
    }, [notifications, token, socket, isConnected, markReadSocket]);

    // Show notification popup
    const showNotification = useCallback((notification) => {
        // Create unique popupId to handle duplicate notifications
        // Use timestamp + notification ID to ensure uniqueness
        const notificationId = notification.id || 'temp';
        const popupId = `${notificationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notificationWithId = { ...notification, popupId };
        
        setActiveNotifications(prev => [...prev, notificationWithId]);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setActiveNotifications(prev => prev.filter(n => n.popupId !== popupId));
        }, 5000);
    }, []);

    // Dismiss notification popup by ID
    const dismissNotification = useCallback((popupId) => {
        setActiveNotifications(prev => prev.filter(n => n.popupId !== popupId));
    }, []);

    // Listen for new notifications via socket
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification) => {
            setNotifications(prev => [notification, ...prev]);
            if (!notification.isRead) {
                setUnreadCount(prev => prev + 1);
            }
            // Show popup for new notifications
            showNotification(notification);

            // Play notification sound so user knows a new notification arrived
            notificationService.playNotificationSound();

            // Show browser notification (works even when minimized or tab not focused)
            // Only show if page is not visible or not focused.
            // Web Locks: only one tab shows a desktop notification per notification id.
            if (document.hidden || !document.hasFocus()) {
                const title = notification.title || 'New Notification';
                const options = {
                    body: notification.body || notification.content || 'You have a new notification',
                    tag: `notification-${notification.id ?? 'unknown'}`,
                    data: {
                        notificationId: notification.id,
                        url: notification.url || '/home/notifications'
                    }
                };
                const show = () =>
                    notificationService.showNotification(title, options).catch((err) => {
                        toast.error(getErrorMessage(err, 'Error showing browser notification'));
                    });

                if (navigator.locks?.request) {
                    void navigator.locks
                        .request(`browser-notification:${notification.id ?? 'general'}`, { ifAvailable: true }, (lock) => {
                            if (lock == null) return;
                            return show();
                        })
                        .catch((err) => {
                            toast.error(getErrorMessage(err, 'Error showing browser notification'));
                        });
                } else {
                    show();
                }
            }
        };

        const handleNotificationRead = (data) => {
            setNotifications(prev => 
                prev.map(n => 
                    n.id === data.id ? { ...n, isRead: true, readAt: data.readAt } : n
                )
            );
        };

        socket.on('notification:new', handleNewNotification);
        socket.on('notification:read', handleNotificationRead);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('notification:read', handleNotificationRead);
        };
    }, [socket, showNotification]);

    // Initial fetch — only when notifications feature is allowed
    useEffect(() => {
        if (token && hasNotificationsAccess) {
            fetchNotifications({ page: 1 });
        }
    }, [token, hasNotificationsAccess]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load more notifications
    const loadMoreNotifications = useCallback(() => {
        if (!loadingMore && hasMore && !loading) {
            fetchNotifications({ append: true });
        }
    }, [loadingMore, hasMore, loading, fetchNotifications]);

    // Update last notification page visit timestamp
    const updateLastVisitTimestamp = useCallback(() => {
        const now = new Date().toISOString();
        setLastNotificationPageVisit(now);
    }, []);

    // Calculate new notification count (notifications that arrived after last visit)
    // This is used for the badge display
    const newNotificationCount = useMemo(() => {
        if (typeof window === 'undefined') return unreadCount;

        const currentPathCheck = window.location.pathname.replace("/home/", "");
        const isOnNotificationPage = currentPathCheck.startsWith('notifications');

        if (isOnNotificationPage) {
            return 0;
        }

        if (!lastNotificationPageVisit) {
            // If never visited, show all unread notifications
            return unreadCount;
        }
        // Count notifications that arrived after last visit and are unread
        return notifications.filter(n => {
            if (n.isRead) return false;
            const notificationTime = new Date(n.createdAt).toISOString();
            return notificationTime > lastNotificationPageVisit;
        }).length;
    }, [notifications, lastNotificationPageVisit, unreadCount]);

    const value = {
        notifications,
        unreadCount,
        newNotificationCount, // Count of notifications that arrived after last visit
        loading,
        loadingMore,
        activeNotifications,
        totalCount,
        hasMore,
        fetchNotifications,
        loadMoreNotifications,
        markAsRead,
        markAllAsRead,
        showNotification,
        dismissNotification,
        updateLastVisitTimestamp, // Function to update last visit timestamp
        refreshNotifications: async () => {
            setCurrentPage(1);
            setHasMore(true);
            return fetchNotifications({ page: 1, background: true });
        }
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

