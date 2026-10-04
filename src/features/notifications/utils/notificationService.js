// Notification Service for Browser Push Notifications
// Handles permission requests, service worker registration, and showing notifications

import { toast } from "react-toastify";

class NotificationService {
    constructor() {
        this.permission = null;
        this.serviceWorkerRegistration = null;
        this.isInitialized = false;
        this._audioContext = null;
    }

    _getAudioContext() {
        if (this._audioContext) return this._audioContext;
        if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this._audioContext = new Ctx();
        return this._audioContext;
    }

    // Browsers only allow an AudioContext to run after a user gesture on the page.
    // Notifications can arrive without one (e.g. right after login, or in a background
    // tab), so call this once on the first real interaction to unlock audio ahead of time.
    unlockAudio() {
        const ctx = this._getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    }

    async playNotificationSound() {
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;

            // Browsers may suspend AudioContext until user interaction; resume if needed
            if (ctx.state === 'suspended') {
                await ctx.resume().catch(() => {});
            }

            const now = ctx.currentTime;
            const playTone = (frequency, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = frequency;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.8, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            playTone(523.25, now, 0.08);           // C5
            playTone(659.25, now + 0.1, 0.12);     // E5
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Could not play notification sound:', e);
        }
    }

    // Check if browser supports notifications
    isSupported() {
        return 'Notification' in window && 'serviceWorker' in navigator;
    }

    // Get current permission status
    getPermission() {
        if (!this.isSupported()) {
            return 'unsupported';
        }
        return Notification.permission;
    }

    // Request notification permission
    async requestPermission() {
        if (!this.isSupported()) {
            // toast.warn('Notifications are not supported in this browser');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            return true;
        }

        if (Notification.permission === 'denied') {
            toast.warn('Notification permission was previously denied', {
                toastId: 'notification-permission-denied'
            });
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        } catch (error) {
            return false;
        }
    }

    // Register service worker
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            toast.warn('Service Workers are not supported');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            this.serviceWorkerRegistration = registration;
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            return true;
        } catch (error) {
            return false;
        }
    }

    // Show browser notification
    async showNotification(title, options = {}) {
        if (!this.isSupported()) {
            toast.warn('Notifications are not supported');
            return;
        }

        // Check permission
        if (Notification.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                toast.warn('Notification permission not granted', {
                    toastId: 'notification-permission-not-granted'
                });
                return;
            }
        }

        const defaultOptions = {
            body: '',
            tag: 'drms-notification',
            requireInteraction: false,
            vibrate: [200, 100, 200],
            ...options
        };
        
        // Remove icon and badge if not explicitly provided
        if (!options.icon) {
            delete defaultOptions.icon;
        }
        if (!options.badge) {
            delete defaultOptions.badge;
        }

        // Try to use service worker first (for background notifications)
        if (this.serviceWorkerRegistration) {
            try {
                await this.serviceWorkerRegistration.showNotification(title, defaultOptions);
                return;
            } catch (error) {
                // Fall through to regular notification API
            }
        }

        // Fallback to regular notification API
        try {
            new Notification(title, defaultOptions);
        } catch (error) {
            // do nothing
        }
    }

    // Check if page is visible/focused
    isPageVisible() {
        return !document.hidden && document.hasFocus();
    }

    // Initialize notification service
    async initialize() {
        if (!this.isSupported()) {
            toast.warn('Notifications are not supported in this browser');
            return false;
        }

        if (this.isInitialized) {
            return true;
        }

        try {
            // Register service worker
            const swRegistered = await this.registerServiceWorker();
            
            // Request permission (only if not already granted/denied)
            if (Notification.permission === 'default') {
                // Don't auto-request, let user do it manually or on first notification
            } else {
                this.permission = Notification.permission;
            }
            
            this.isInitialized = true;
            return swRegistered;
        } catch (error) {
            return false;
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();

