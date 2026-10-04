import { Close as CloseIcon, Notifications as BellIcon } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getNotificationNavigation } from '../../utils/notificationNavigation';

const NotificationPopup = ({ notification, onDismiss, onMarkAsRead, index = 0 }) => {
    const navigate = useNavigate();
    
    if (!notification) return null;

    // Extract status change from meta if available
    const getStatusChange = () => {
        const body = notification.body || '';
        
        // Pattern: "from X to Y." or "from X to Y"
        // Match "from" followed by status, then "to" followed by status (excluding period at end)
        const fromToMatch = body.match(/from\s+([^.]*?)\s+to\s+([^.]*?)(?:\.|$)/i);
        
        if (fromToMatch) {
            // Trim whitespace from captured groups
            const fromStatus = fromToMatch[1].trim();
            const toStatus = fromToMatch[2].trim();
            
            if (fromStatus && toStatus) {
                return {
                    from: fromStatus,
                    to: toStatus
                };
            }
        }
        
        // Fallback: Try other patterns
        const arrowMatch = body.match(/(\w+(?:\s+\w+)*)\s*→\s*(\w+(?:\s+\w+)*)/i);
        if (arrowMatch) {
            return {
                from: arrowMatch[1].trim(),
                to: arrowMatch[2].trim()
            };
        }
        
        // Fallback: Check meta status if available
        if (notification.meta?.status) {
            const metaStatusMatch = body.match(/from\s+([^.]*?)\s+to/i);
            if (metaStatusMatch) {
                return {
                    from: metaStatusMatch[1].trim(),
                    to: notification.meta.status
                };
            }
        }
        
        return null;
    };

    const statusChange = getStatusChange();
    
    const getStatusColor = (status) => {
        if (!status) return '#6c757d';
        const statusLower = status.toLowerCase();
        if (statusLower.includes('progress')) return '#007bff'; // blue
        if (statusLower.includes('api completed')) return '#3d2112'; // brown
        if (statusLower.includes('ui completed')) return '#f527d3'; // Pink
        if (statusLower.includes('completed')) return '#28a745'; // Pink
        if (statusLower.includes('pending')) return '#ffa500'; // yellow
        if (statusLower.includes('hold')) return '#FF9900'; // Orange
        return '#6c757d'; // Default grey
    };

    const handleDismiss = () => {
        if (onDismiss) onDismiss();
    };

    const handleClick = () => {
        if (!notification.isRead && onMarkAsRead) {
            onMarkAsRead(notification.id);
        }
        
        // Navigate to the appropriate page based on notification type
        const navigation = getNotificationNavigation(notification);
        if (navigation) {
            if (navigation.state) {
                navigate(navigation.path, { state: navigation.state });
            } else {
                navigate(navigation.path);
            }
        }
        
        handleDismiss();
    };

    // Calculate bottom position for stacking
    // Each notification needs space for its height (~80-100px)
    // Newer notifications (higher index) appear higher up, pushing older ones down
    const notificationHeight = 100; // Approximate height including padding and content
    const bottomOffset = 20 + (index * (notificationHeight));
    
    return (
        <Box
            onClick={handleClick}
            sx={{
                position: 'fixed',
                bottom: bottomOffset,
                right: 20,
                width: '350px',
                backgroundColor: '#2d3748', // Dark grey matching design
                borderRadius: '8px',
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 10000 + index, // Higher z-index for newer notifications
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'slideIn 0.3s ease-out',
                '@keyframes slideIn': {
                    from: {
                        transform: 'translateX(100%)',
                        opacity: 0
                    },
                    to: {
                        transform: 'translateX(0)',
                        opacity: 1
                    }
                }
            }}
        >
            {/* Bell Icon */}
            <Box sx={{ 
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
            }}>
                <BellIcon sx={{ fontSize: '20px' }} />
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    sx={{
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '1.4',
                        marginBottom: statusChange ? '8px' : 0
                    }}
                >
                    {notification.body || notification.title}
                </Typography>

                {/* Status Change Indicator */}
                {statusChange && (
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        marginTop: '4px'
                    }}>
                        <Box
                            sx={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                backgroundColor: getStatusColor(statusChange.from),
                            }}
                        />
                        <Typography
                            sx={{
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 400
                            }}
                        >
                            {statusChange.from}
                        </Typography>
                        <Typography
                            sx={{
                                color: '#9ca3af',
                                fontSize: '12px',
                                margin: '0 4px'
                            }}
                        >
                            →
                        </Typography>
                        <Box
                            sx={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                backgroundColor: getStatusColor(statusChange.to),
                            }}
                        />
                        <Typography
                            sx={{
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 400
                            }}
                        >
                            {statusChange.to}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Close Button */}
            <IconButton
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
                sx={{
                    color: '#ffffff',
                    padding: '4px',
                    flexShrink: 0,
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                }}
            >
                <CloseIcon sx={{ fontSize: '18px' }} />
            </IconButton>
        </Box>
    );
};

export default NotificationPopup;

