// js/notifications.js - Notification System for CUK Event Hub (Updated for Integration)

class NotificationSystem {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem('cuk_notifications') || '[]');
        this.init();
    }
    
    init() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Check for notifications every 5 minutes
        setInterval(() => this.checkForUpdates(), 300000);
        
        // Register with integration system
        this.registerWithIntegration();
    }
    
    // Register with the master integration system
    registerWithIntegration() {
        // Make sure we're accessible globally
        window.notificationSystem = this;
        
        // Listen for integration events
        document.addEventListener('integrationReady', () => {
            console.log('📢 Notification System: Integration ready');
            this.updateBadge(); // Update badge on all pages
        });
        
        // Listen for custom notification events from integration
        document.addEventListener('sendNotification', (event) => {
            const { title, message, type, link } = event.detail;
            this.addNotification(title, message, type, link);
        });
    }
    
    // Add new notification (INTEGRATION COMPATIBLE)
    addNotification(title, message, type = 'info', link = null) {
        const notification = {
            id: Date.now(),
            title: title,
            message: message,
            type: type, // info, success, warning, error
            link: link,
            timestamp: new Date().toISOString(),
            read: false,
            source: 'integration' // Mark as from integration system
        };
        
        this.notifications.unshift(notification);
        this.saveToStorage();
        this.showBrowserNotification(notification);
        this.updateBadge();
        
        // Notify integration system about new notification
        this.triggerIntegrationEvent('notificationAdded', notification);
        
        return notification;
    }
    
    // Show browser notification
    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`CUK Event Hub: ${notification.title}`, {
                body: notification.message,
                icon: '/images/cuk-logo.png',
                tag: 'cuk-event-notification'
            });
            
            notif.onclick = function() {
                if (notification.link) {
                    window.open(notification.link, '_blank');
                }
                window.focus();
                this.close();
            };
        }
    }
    
    // Get all notifications
    getAllNotifications() {
        return this.notifications;
    }
    
    // Get unread notifications
    getUnreadNotifications() {
        return this.notifications.filter(n => !n.read);
    }
    
    // Get count for integration system
    getUnreadCount() {
        return this.getUnreadNotifications().length;
    }
    
    // Mark as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveToStorage();
            this.updateBadge();
            
            // Notify integration
            this.triggerIntegrationEvent('notificationRead', notification);
        }
    }
    
    // Mark all as read
    markAllAsRead() {
        this.notifications.forEach(n => {
            n.read = true;
        });
        this.saveToStorage();
        this.updateBadge();
        
        // Notify integration
        this.triggerIntegrationEvent('allNotificationsRead');
    }
    
    // Clear all notifications
    clearAll() {
        this.notifications = [];
        this.saveToStorage();
        this.updateBadge();
        
        // Notify integration
        this.triggerIntegrationEvent('notificationsCleared');
    }
    
    // Save to localStorage
    saveToStorage() {
        localStorage.setItem('cuk_notifications', JSON.stringify(this.notifications));
    }
    
    // Update badge count in UI (INTEGRATION COMPATIBLE)
    updateBadge() {
        const unreadCount = this.getUnreadNotifications().length;
        
        // Update badge in navbar
        const badgeElements = document.querySelectorAll('.notification-badge');
        badgeElements.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
            } else {
                badge.style.display = 'none';
            }
        });
        
        // Update title if unread
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) CUK Event Hub`;
        } else {
            document.title = 'CUK Event Hub';
        }
        
        // Store count for integration system
        localStorage.setItem('notification_count', unreadCount.toString());
        
        // Trigger update event
        this.triggerIntegrationEvent('badgeUpdated', { count: unreadCount });
    }
    
    // Check for updates (upcoming events, registration confirmations, etc.)
    async checkForUpdates() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.name) return;
        
        // Check for upcoming events (within next 24 hours)
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        registrations.forEach(reg => {
            const eventDate = new Date(reg.date);
            if (eventDate > now && eventDate < tomorrow && !reg.notified) {
                this.addNotification(
                    'Upcoming Event Tomorrow!',
                    `${reg.title} is scheduled for tomorrow at ${reg.time}`,
                    'info',
                    `event-details.html?id=${reg.eventId}`
                );
                reg.notified = true;
                
                // Update localStorage
                let allRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
                const index = allRegistrations.findIndex(r => r.id === reg.id);
                if (index !== -1) {
                    allRegistrations[index].notified = true;
                    localStorage.setItem('myRegistrations', JSON.stringify(allRegistrations));
                }
            }
        });
        
        // Check for new events added today
        const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        const today = now.toISOString().split('T')[0];
        
        const newEvents = events.filter(event => {
            const createdDate = new Date(event.createdAt || event.date).toISOString().split('T')[0];
            return createdDate === today && !event.notified;
        });
        
        newEvents.forEach(event => {
            this.addNotification(
                'New Event Added!',
                `Check out the new event: ${event.title}`,
                'success',
                `event-details.html?id=${event.id}`
            );
            
            // Mark as notified
            const eventIndex = events.findIndex(e => e.id === event.id);
            if (eventIndex !== -1) {
                events[eventIndex].notified = true;
                localStorage.setItem('cuk_events', JSON.stringify(events));
            }
        });
        
        // Check integration system for pending notifications
        this.checkIntegrationNotifications();
    }
    
    // Check for notifications from integration system
    checkIntegrationNotifications() {
        const integrationNotifications = JSON.parse(localStorage.getItem('integration_notifications') || '[]');
        
        if (integrationNotifications.length > 0) {
            integrationNotifications.forEach(notif => {
                if (!notif.processed) {
                    this.addNotification(notif.title, notif.message, notif.type, notif.link);
                    notif.processed = true;
                }
            });
            
            // Save back
            localStorage.setItem('integration_notifications', 
                JSON.stringify(integrationNotifications.filter(n => !n.processed)));
        }
    }
    
    // Generate notification HTML
    generateNotificationHTML(notification) {
        const iconMap = {
            'info': 'fas fa-info-circle',
            'success': 'fas fa-check-circle',
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle'
        };
        
        const colorMap = {
            'info': '#00509E',
            'success': '#28a745',
            'warning': '#FFCC00',
            'error': '#dc3545'
        };
        
        const timeAgo = this.getTimeAgo(notification.timestamp);
        
        return `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 data-id="${notification.id}"
                 onclick="notificationSystem.markAsRead(${notification.id}); ${notification.link ? `window.location.href='${notification.link}'` : ''}">
                <div class="notification-icon" style="color: ${colorMap[notification.type]}">
                    <i class="${iconMap[notification.type]}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${!notification.read ? '<div class="notification-dot"></div>' : ''}
            </div>
        `;
    }
    
    // Get time ago
    getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diff = now - past;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return past.toLocaleDateString();
    }
    
    // ============ INTEGRATION METHODS ============
    
    // Trigger events for integration system
    triggerIntegrationEvent(eventName, data = null) {
        const event = new CustomEvent(`notification_${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }
    
    // Method for integration system to call
    addNotificationFromIntegration(title, message, type = 'info', link = null) {
        return this.addNotification(title, message, type, link);
    }
    
    // Get notification stats for dashboard
    getNotificationStats() {
        const total = this.notifications.length;
        const unread = this.getUnreadCount();
        const today = new Date().toISOString().split('T')[0];
        const todayCount = this.notifications.filter(n => 
            new Date(n.timestamp).toISOString().split('T')[0] === today
        ).length;
        
        return {
            total,
            unread,
            today: todayCount,
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Sync with integration storage
    syncWithIntegration() {
        // Check if integration has pending notifications
        const integrationData = JSON.parse(localStorage.getItem('integration_data') || '{}');
        
        if (integrationData.pendingNotifications) {
            integrationData.pendingNotifications.forEach(notif => {
                this.addNotification(notif.title, notif.message, notif.type, notif.link);
            });
            
            // Clear processed notifications
            integrationData.pendingNotifications = [];
            localStorage.setItem('integration_data', JSON.stringify(integrationData));
        }
        
        // Update integration with our data
        localStorage.setItem('notification_stats', JSON.stringify(this.getNotificationStats()));
    }
}

// Global instance - IMPORTANT FOR INTEGRATION
window.notificationSystem = new NotificationSystem();

// Auto-update badge on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.notificationSystem) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            notificationSystem.updateBadge();
            notificationSystem.syncWithIntegration();
        }, 500);
    }
});

// Listen for integration system ready event
document.addEventListener('integrationSystemReady', function() {
    console.log('🔔 Notification System: Integration system is ready');
    if (window.notificationSystem) {
        notificationSystem.syncWithIntegration();
        notificationSystem.updateBadge();
    }
});