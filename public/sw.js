// Service Worker for Push Notifications
// This handles background notifications even when the browser is minimized

self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    
    let notificationData = {
        title: 'New Notification',
        body: 'You have a new notification',
        tag: 'notification',
        requireInteraction: false,
        data: {}
    };

    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = {
                title: data.title || 'New Notification',
                body: data.body || 'You have a new notification',
                tag: data.tag || `notification-${Date.now()}`,
                requireInteraction: data.requireInteraction || false,
                data: data.data || {}
            };
            
            // Only include icon/badge if explicitly provided
            if (data.icon) {
                notificationData.icon = data.icon;
            }
            if (data.badge) {
                notificationData.badge = data.badge;
            }
        } catch (e) {
            console.error('Error parsing push data:', e);
            // If data is text, use it as body
            if (event.data.text) {
                notificationData.body = event.data.text();
            }
        }
    }

    const options = {
        body: notificationData.body,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction,
        data: notificationData.data,
        vibrate: [200, 100, 200],
        actions: [
            {
                action: 'view',
                title: 'View'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    // Only include icon/badge if they exist
    if (notificationData.icon) {
        options.icon = notificationData.icon;
    }
    if (notificationData.badge) {
        options.badge = notificationData.badge;
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');
    
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // This looks to see if the current is already open and focuses if it is
    event.waitUntil(
        clients.matchAll({
            type: 'window'
        }).then(function(clientList) {
            // Try to find an existing window
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes('/') && 'focus' in client) {
                    // If notification has a URL, navigate to it
                    if (event.notification.data && event.notification.data.url) {
                        return client.navigate(event.notification.data.url).then(() => client.focus());
                    }
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                const url = event.notification.data && event.notification.data.url 
                    ? event.notification.data.url 
                    : '/';
                return clients.openWindow(url);
            }
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
    console.log('[Service Worker] Notification closed:', event.notification.tag);
});

