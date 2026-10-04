import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNotifications } from '@contexts/NotificationContext';
import moment from 'moment';
import { getNotificationNavigation } from '../../utils/notificationNavigation';
import { getChatRoute } from '@features/chat/shared/utils/chatUtility';
import Loader from '@components/Loader';
import { usePageTitle } from '@hooks/usePageTitle';
import { toast } from 'react-toastify';

const Notifications = () => {
    const {
        notifications,
        loading,
        loadingMore,
        markAsRead,
        hasMore,
        loadMoreNotifications,
        totalCount,
        markAllAsRead,
        updateLastVisitTimestamp,
        refreshNotifications,
    } = useNotifications();
    const [groupedNotifications, setGroupedNotifications] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const hasMarkedAsReadRef = useRef(false);
    
    // Update browser tab title
    usePageTitle("Notifications", location);

    // Mark all unread notifications as read and update last visit timestamp when user navigates to this page
    useEffect(() => {
        // Only mark as read when we first navigate to this page (not on every render)
        if (!hasMarkedAsReadRef.current && !loading) {
            const markAllAndUpdateTimestamp = async () => {
                // First mark all as read
                await markAllAsRead();
                // Then update the last visit timestamp
                updateLastVisitTimestamp();
            };
            
            markAllAndUpdateTimestamp();
            hasMarkedAsReadRef.current = true;
        }
    }, [location.pathname, markAllAsRead, updateLastVisitTimestamp, loading]);

    // Reset the ref and borderLeft array when user navigates away from the notification page
    useEffect(() => {
        if (!location.pathname.includes('notifications')) {
            hasMarkedAsReadRef.current = false;
        }
    }, [location.pathname]);

    useEffect(() => {
        // Group notifications by date
        const grouped = notifications.reduce((acc, notification) => {
            const date = new Date(notification.createdAt);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let groupKey;
            if (date.toDateString() === today.toDateString()) {
                groupKey = 'Today!';
            } else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = 'Yesterday!';
            } else {
                groupKey = moment(date).format('MMM DD, YYYY');
            }

            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(notification);
            return acc;
        }, {});

        setGroupedNotifications(grouped);
    }, [notifications]);

    const handleRefresh = async () => {
        if (refreshing || loading || loadingMore) return;

        setRefreshing(true);
        try {
            const result = await refreshNotifications();
            if (!result?.ok) return;

            if (result.alreadySynced) {
                toast.info('No new notifications');
            } else {
                const count = result.addedCount || 0;
                toast.success(
                    count === 1
                        ? '1 new notification loaded'
                        : `${count} new notifications loaded`
                );
            }
        } finally {
            setRefreshing(false);
        }
    };

    const handleNotificationClick = (notification, e) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        
        // Navigate to the appropriate page based on notification type
        const navigation = getNotificationNavigation(notification);
        if (navigation) {
            const isModClick = e?.metaKey || e?.ctrlKey || e?.button === 1;
            if (isModClick) {
                e?.preventDefault();
                e?.stopPropagation();
                
                if (navigation.path.includes('/taskDetail')) {
                    sessionStorage.setItem(
                        'newTabTaskData',
                        JSON.stringify({
                            itemData: navigation.state?.itemData,
                            projectName: navigation.state?.projectName,
                            fromRoute: navigation.state?.fromRoute || 'myTask',
                        })
                    );
                    window.open(navigation.path, '_blank');
                } else if (navigation.path.includes('/chat')) {
                    const chatId = navigation.state?.selectedChatId || navigation.state?.selectedChat?.id;
                    const messageId = navigation.state?.selectedMessageId;
                    let url = getChatRoute(location.pathname);
                    if (chatId) {
                        url += `/${chatId}`;
                    }
                    if (messageId) {
                        url += `?messageId=${messageId}`;
                    }
                    window.open(url, '_blank');
                } else if (navigation.path.includes('/singleTicket')) {
                    const ticketId = navigation.state?.rowData?.id || navigation.path.split('/').pop();
                    const url = `/home/singleTicket?id=${ticketId}`;
                    window.open(url, '_blank');
                } else if (navigation.path.includes('/memo')) {
                    sessionStorage.setItem('newTabMemoData', JSON.stringify(navigation.state?.itemData));
                    window.open(navigation.path, '_blank');
                } else if (navigation.path.includes('/editApplication')) {
                    sessionStorage.setItem('newTabApplicationData', JSON.stringify(navigation.state?.itemData));
                    window.open(navigation.path, '_blank');
                } else {
                    window.open(navigation.path, '_blank');
                }
            } else {
                if (navigation.state) {
                    navigate(navigation.path, { state: navigation.state });
                } else {
                    navigate(navigation.path);
                }
            }
        }
    };

    if (loading && !refreshing) {
        return <Loader fullscreen message="Loading..." subMessage="Please wait" />;
    }

    return (
        <Box sx={{ 
            padding: '24px',
            backgroundColor: 'var(--dashboard-bg)',
            minHeight: 'calc(100vh - 70px)'
        }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '24px',
                }}
            >
                <Typography
                    sx={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: 'var(--dashboard-text-primary)'
                    }}
                >
                    Notifications
                </Typography>

                <Tooltip title="Refresh notifications">
                    <span>
                        <IconButton
                            onClick={handleRefresh}
                            disabled={refreshing || loading || loadingMore}
                            aria-label="Refresh notifications"
                            sx={{
                                color: '#4880FF',
                                border: '1px solid rgba(72, 128, 255, 0.35)',
                                borderRadius: '8px',
                                '&:hover': {
                                    backgroundColor: 'rgba(72, 128, 255, 0.08)',
                                },
                                '&.Mui-disabled': {
                                    color: 'var(--dashboard-tab-text-inactive)',
                                    borderColor: 'var(--sidebar-selected-bg)',
                                },
                            }}
                        >
                            {refreshing ? (
                                <CircularProgress size={18} sx={{ color: '#4880FF' }} />
                            ) : (
                                <RefreshIcon fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {Object.keys(groupedNotifications).length === 0 ? (
                <Typography sx={{ color: 'var(--dashboard-text-secondary)', textAlign: 'center', marginTop: '40px' }}>
                    No notifications yet
                </Typography>
            ) : (
                Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => (
                    <Box key={groupKey} sx={{ marginBottom: '32px' }}>
                        <Typography
                            sx={{
                                fontSize: '16px',
                                fontWeight: 600,
                                marginBottom: '16px',
                                color: 'var(--dashboard-text-secondary)'
                            }}
                        >
                            {groupKey}
                        </Typography>
                        {groupNotifications.map((notification) => {
                            // Show borderLeft if notification is unread OR if it's in the stored array
                            const shouldShowBorderLeft = !notification.isRead || !notification.id;
                            
                            return (
                            <Box
                                key={notification.id || Math.random().toString(36).substring(2, 15)}
                                onClick={(e) => handleNotificationClick(notification, e)}
                                sx={{
                                    backgroundColor: 'var(--dashboard-tab-box)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    marginBottom: '12px',
                                    cursor: 'pointer',
                                    border: '1px solid var(--sidebar-selected-bg)',
                                    borderLeft: shouldShowBorderLeft ? '3px solid #4880FF' : '1px solid var(--sidebar-selected-bg)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(72, 128, 255, 0.08)'
                                    }
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: '14px',
                                        color: 'var(--dashboard-text-primary)',
                                        fontWeight: shouldShowBorderLeft ? 600 : 400,
                                        marginBottom: '4px'
                                    }}
                                >
                                    {notification.body || notification.title}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '12px',
                                        color: 'var(--dashboard-text-secondary)'
                                    }}
                                >
                                    {moment(notification.createdAt).format('MMM DD, YYYY - h:mm A')}
                                </Typography>
                            </Box>
                            );
                        })}
                    </Box>
                ))
            )}

            {/* Load More Button */}
            {hasMore && Object.keys(groupedNotifications).length > 0 && (
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    marginTop: '32px',
                    marginBottom: '24px'
                }}>
                    <Button
                        variant="outlined"
                        onClick={loadMoreNotifications}
                        disabled={loadingMore || loading || refreshing}
                        sx={{
                            minWidth: '120px',
                            textTransform: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            borderColor: '#4880FF',
                            color: '#4880FF',
                            '&:hover': {
                                borderColor: '#4880FF',
                                backgroundColor: 'rgba(72, 128, 255, 0.08)'
                            },
                            '&:disabled': {
                                borderColor: 'var(--sidebar-selected-bg)',
                                color: 'var(--dashboard-tab-text-inactive)'
                            }
                        }}
                    >
                        {loadingMore ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CircularProgress size={16} sx={{ color: '#4880FF' }} />
                                <span>Loading...</span>
                            </Box>
                        ) : (
                            'Load More'
                        )}
                    </Button>
                </Box>
            )}

            {/* Show total count if available */}
            {totalCount > 0 && (
                <Typography 
                    sx={{ 
                        color: 'var(--dashboard-text-secondary)', 
                        textAlign: 'center', 
                        fontSize: '12px',
                        marginTop: '16px'
                    }}
                >
                    {/* Showing {notifications.length} of {totalCount} notifications */}
                </Typography>
            )}
        </Box>
    );
};

export default Notifications;
