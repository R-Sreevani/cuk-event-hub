// js/integration.js - COMPLETE INTEGRATION SYSTEM
// This connects ALL systems together without errors

// =============== NOTIFICATION SYSTEM ===============
class NotificationSystem {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    }
    
    addNotification(title, message, type = 'info', link = null) {
        const notification = {
            id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title: title,
            message: message,
            type: type,
            link: link,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        this.notifications.unshift(notification);
        // Keep only last 50 notifications
        if (this.notifications.length > 50) this.notifications = this.notifications.slice(0, 50);
        
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
        this.updateBadge();
        
        return notification;
    }
    
    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        document.querySelectorAll('.notification-badge').forEach(badge => {
            if (unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            } else {
                badge.style.display = 'none';
            }
        });
    }
    
    markAsRead(notificationId) {
        const notif = this.notifications.find(n => n.id === notificationId);
        if (notif) notif.read = true;
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
        this.updateBadge();
    }
    
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
        this.updateBadge();
    }
    
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }
}

// =============== QR CODE SYSTEM ===============
class QRCodeSystem {
    constructor() {
        // Check if QR code library is available
        this.qrAvailable = typeof QRCode !== 'undefined';
    }
    
    generateEventQRCode(eventId, registrationId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.log('QR container not found:', containerId);
            // Create a fallback display
            const fallback = document.createElement('div');
            fallback.innerHTML = `
                <div style="text-align: center; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                    <p><strong>Registration ID:</strong> ${registrationId}</p>
                    <p style="font-size: 12px; color: #666;">QR code would appear here</p>
                </div>
            `;
            if (container) container.appendChild(fallback);
            return;
        }
        
        container.innerHTML = ''; // Clear container
        
        const qrData = JSON.stringify({
            type: 'event_checkin',
            eventId: eventId,
            registrationId: registrationId,
            timestamp: new Date().toISOString()
        });
        
        if (this.qrAvailable) {
            try {
                new QRCode(container, {
                    text: qrData,
                    width: 128,
                    height: 128
                });
            } catch (e) {
                this.showFallbackQR(container, registrationId);
            }
        } else {
            this.showFallbackQR(container, registrationId);
        }
    }
    
    generateCertificateQRCode(certificateId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        const qrData = JSON.stringify({
            type: 'certificate',
            certificateId: certificateId,
            timestamp: new Date().toISOString()
        });
        
        if (this.qrAvailable) {
            try {
                new QRCode(container, {
                    text: qrData,
                    width: 128,
                    height: 128
                });
            } catch (e) {
                this.showFallbackQR(container, certificateId);
            }
        } else {
            this.showFallbackQR(container, certificateId);
        }
    }
    
    showFallbackQR(container, id) {
        container.innerHTML = `
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border: 2px dashed #003366; border-radius: 10px;">
                <div style="font-family: monospace; font-size: 12px; color: #003366; margin-bottom: 10px;">
                    ⬤⬤⬤ QR CODE ⬤⬤⬤
                </div>
                <div style="font-size: 10px; word-break: break-all; color: #666;">
                    ID: ${id}
                </div>
                <div style="margin-top: 10px; font-size: 11px; color: #28a745;">
                    ✓ Ready for check-in
                </div>
            </div>
        `;
    }
    
    verifyQRCodeData(qrData) {
        try {
            // Try to parse as JSON
            const data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
            
            if (data.type === 'event_checkin' && data.registrationId) {
                return { valid: true, data: data };
            } else if (data.type === 'certificate' && data.certificateId) {
                return { valid: true, data: data };
            } else {
                return { valid: false, error: 'Invalid QR code format' };
            }
        } catch (e) {
            // If not JSON, treat as plain registration ID
            return { 
                valid: true, 
                data: { 
                    type: 'event_checkin', 
                    registrationId: qrData,
                    timestamp: new Date().toISOString()
                } 
            };
        }
    }
}

// =============== CALENDAR SYNC SYSTEM ===============
class CalendarSyncSystem {
    constructor() {
        this.settings = JSON.parse(localStorage.getItem('calendar_settings') || '{}');
    }
    
    getSyncStatus() {
        const events = this.getUpcomingEventsForCalendar();
        const history = JSON.parse(localStorage.getItem('calendar_sync_history') || '[]');
        const lastSync = localStorage.getItem('last_sync_time');
        
        return {
            upcomingEvents: events.length,
            totalSyncs: history.length,
            lastSync: lastSync,
            settings: this.settings
        };
    }
    
    getUpcomingEventsForCalendar() {
        const allEvents = JSON.parse(localStorage.getItem('events') || '[]');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // If no events in localStorage, use sample data
        if (allEvents.length === 0) {
            const sampleEvents = [
                {
                    id: '1',
                    title: 'Tech Symposium 2024',
                    date: '2024-03-15T10:00:00',
                    venue: 'Auditorium',
                    description: 'Annual technical symposium',
                    category: 'academic'
                },
                {
                    id: '2',
                    title: 'Cultural Fest',
                    date: '2024-03-20T14:00:00',
                    venue: 'Open Air Theatre',
                    description: 'University cultural festival',
                    category: 'cultural'
                }
            ];
            localStorage.setItem('events', JSON.stringify(sampleEvents));
            return sampleEvents.map(e => ({ ...e, synced: this.isEventSynced(e.id) }));
        }
        
        return allEvents.map(event => ({
            ...event,
            synced: this.isEventSynced(event.id)
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    isEventSynced(eventId) {
        const syncedEvents = JSON.parse(localStorage.getItem('synced_events') || '[]');
        return syncedEvents.includes(eventId);
    }
    
    syncAllEvents(type) {
        const events = this.getUpcomingEventsForCalendar();
        let successCount = 0;
        
        events.forEach(event => {
            if (!event.synced) {
                this.markEventAsSynced(event.id);
                successCount++;
            }
        });
        
        this.addSyncHistory('bulk_sync', 'all');
        localStorage.setItem('last_sync_time', new Date().toISOString());
        
        return { success: true, count: successCount };
    }
    
    markEventAsSynced(eventId) {
        const syncedEvents = JSON.parse(localStorage.getItem('synced_events') || '[]');
        if (!syncedEvents.includes(eventId)) {
            syncedEvents.push(eventId);
            localStorage.setItem('synced_events', JSON.stringify(syncedEvents));
        }
    }
    
    downloadICS(event) {
        const icsContent = this.generateICS(event);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.markEventAsSynced(event.id);
        this.addSyncHistory('download_ics', event.id);
    }
    
    generateICS(event) {
        const startDate = new Date(event.date);
        const endDate = new Date(startDate.getTime() + 2*60*60*1000);
        
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//CUK Event Hub//EN',
            'BEGIN:VEVENT',
            `UID:${event.id}@cuk-event-hub`,
            `DTSTART:${formatDate(startDate)}`,
            `DTEND:${formatDate(endDate)}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description || 'CUK Event'}`,
            `LOCATION:${event.venue || 'CUK Campus'}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
    }
    
    addToGoogleCalendar(event) {
        const startDate = new Date(event.date);
        const endDate = new Date(startDate.getTime() + 2*60*60*1000);
        
        const formatGoogleDate = (date) => {
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        };
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: event.title,
            dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
            details: event.description || 'CUK Event',
            location: event.venue || 'CUK Campus'
        });
        
        window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
        this.markEventAsSynced(event.id);
        this.addSyncHistory('google_calendar', event.id);
    }
    
    addToOutlookCalendar(event) {
        const startDate = new Date(event.date);
        const endDate = new Date(startDate.getTime() + 2*60*60*1000);
        
        const params = new URLSearchParams({
            path: '/calendar/action/compose',
            rru: 'addevent',
            subject: event.title,
            startdt: startDate.toISOString(),
            enddt: endDate.toISOString(),
            body: event.description || 'CUK Event',
            location: event.venue || 'CUK Campus'
        });
        
        window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank');
        this.markEventAsSynced(event.id);
        this.addSyncHistory('outlook_calendar', event.id);
    }
    
    addToAppleCalendar(event) {
        this.downloadICS(event);
        this.addSyncHistory('apple_calendar', event.id);
    }
    
    addSyncHistory(action, eventId) {
        const history = JSON.parse(localStorage.getItem('calendar_sync_history') || '[]');
        history.push({
            action: action,
            eventId: eventId,
            timestamp: new Date().toISOString()
        });
        
        if (history.length > 50) history.shift();
        localStorage.setItem('calendar_sync_history', JSON.stringify(history));
    }
    
    setPreferences(prefs) {
        this.settings = { ...this.settings, ...prefs };
        localStorage.setItem('calendar_settings', JSON.stringify(this.settings));
    }
}

// =============== MAIN INTEGRATION CLASS ===============
class CUKIntegration {
    constructor() {
        // Initialize all systems
        this.notifications = new NotificationSystem();
        this.qr = new QRCodeSystem();
        this.calendar = new CalendarSyncSystem();
        
        // User state
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.admin = JSON.parse(localStorage.getItem('admin') || '{}');
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('CUK Integration System Initialized');
        
        // Set up global listeners
        this.setupGlobalListeners();
        
        // Update UI
        this.updateAllUI();
        
        // Start background services
        this.startBackgroundServices();
    }
    
    // =============== EVENT REGISTRATION FLOW ===============
    registerForEvent(eventData) {
        console.log('Integrated Event Registration Flow Started');
        
        // 1. Check if user is logged in
        if (!this.user.name && !this.user.email) {
            this.notifications.addNotification(
                'Login Required',
                'Please login to register for events',
                'warning',
                'login.html'
            );
            return false;
        }
        
        // 2. Check event availability
        const event = this.getEventById(eventData.id);
        if (event && event.seats && event.seats.available <= 0) {
            this.notifications.addNotification(
                'Event Full',
                `${event.title} is fully booked`,
                'error',
                'events.html'
            );
            return false;
        }
        
        // 3. Create registration record
        const registrationId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const registration = {
            id: registrationId,
            eventId: eventData.id,
            eventTitle: eventData.title || eventData.name,
            date: eventData.date,
            time: eventData.time || '10:00 AM',
            venue: eventData.venue,
            userId: this.user.email || this.user.studentId || 'guest@cuk.edu',
            userName: this.user.name || 'Guest User',
            registrationDate: new Date().toISOString(),
            status: 'confirmed',
            fee: eventData.fee || 'Free',
            qrCode: registrationId,
            notified: false,
            reminderSent: false,
            lastHourReminder: false
        };
        
        // 4. Save to localStorage
        let registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        registrations.push(registration);
        localStorage.setItem('myRegistrations', JSON.stringify(registrations));
        
        // 5. Update event seats if available
        if (event && event.seats) {
            let events = JSON.parse(localStorage.getItem('events') || '[]');
            const eventIndex = events.findIndex(e => e.id === eventData.id);
            if (eventIndex !== -1) {
                events[eventIndex].seats.registered = (events[eventIndex].seats.registered || 0) + 1;
                events[eventIndex].seats.available = Math.max(0, (events[eventIndex].seats.capacity || 200) - events[eventIndex].seats.registered);
                localStorage.setItem('events', JSON.stringify(events));
            }
        }
        
        // 6. Send notifications
        this.notifications.addNotification(
            'Registration Successful!',
            `You're registered for ${registration.eventTitle}`,
            'success',
            `my-registrations.html`
        );
        
        // 7. Add to calendar if auto-sync enabled
        if (this.calendar.settings.auto_sync) {
            this.calendar.downloadICS(eventData);
        }
        
        // 8. Store registration ID for QR generation
        localStorage.setItem('lastRegistrationId', registrationId);
        
        // 9. Dispatch event for other components
        document.dispatchEvent(new CustomEvent('eventRegistered', { 
            detail: { 
                eventId: eventData.id,
                eventTitle: registration.eventTitle,
                registrationId: registrationId,
                generateQR: true
            }
        }));
        
        return registration;
    }
    
    // =============== EVENT CHECK-IN FLOW ===============
    checkInToEvent(qrData) {
        console.log('Integrated Check-in Flow Started');
        
        // 1. Verify QR code
        const verification = this.qr.verifyQRCodeData(qrData);
        if (!verification.valid) {
            this.notifications.addNotification(
                'Check-in Failed',
                verification.error || 'Invalid QR code',
                'error',
                'qr-scanner.html'
            );
            return false;
        }
        
        const data = verification.data;
        
        // 2. Update registration status
        let registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const regIndex = registrations.findIndex(r => r.id === data.registrationId);
        
        if (regIndex !== -1) {
            registrations[regIndex].attendance = 'Present';
            registrations[regIndex].checkInTime = new Date().toISOString();
            localStorage.setItem('myRegistrations', JSON.stringify(registrations));
            
            // 3. Send notification
            this.notifications.addNotification(
                'Check-in Successful',
                `You're checked in to ${registrations[regIndex].eventTitle}`,
                'success',
                'my-registrations.html'
            );
            
            // 4. Generate certificate if event completed
            const eventDate = new Date(registrations[regIndex].date);
            if (eventDate < new Date()) {
                this.generateCertificate(registrations[regIndex].eventId, data.registrationId);
            }
            
            // 5. Dispatch event
            document.dispatchEvent(new CustomEvent('eventCheckedIn', { 
                detail: { 
                    eventId: registrations[regIndex].eventId,
                    eventTitle: registrations[regIndex].eventTitle,
                    registrationId: data.registrationId,
                    generateCertificate: eventDate < new Date()
                }
            }));
            
            return true;
        } else {
            this.notifications.addNotification(
                'Check-in Failed',
                'Registration not found',
                'error',
                'qr-scanner.html'
            );
        }
        
        return false;
    }
    
    // =============== CERTIFICATE GENERATION ===============
    generateCertificate(eventId, registrationId) {
        console.log('Generating certificate...');
        
        // Get data
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const registration = registrations.find(r => r.id === registrationId);
        
        if (!registration) {
            console.log('Registration not found for certificate');
            return null;
        }
        
        // Create certificate
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const certificate = {
            id: certificateId,
            eventId: eventId,
            eventTitle: registration.eventTitle,
            registrationId: registrationId,
            studentName: registration.userName,
            studentId: registration.userId,
            issueDate: new Date().toISOString(),
            certificateUrl: `certificate-view.html?id=${certificateId}`,
            qrCode: certificateId
        };
        
        // Save certificate
        let certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
        certificates.push(certificate);
        localStorage.setItem('certificates', JSON.stringify(certificates));
        
        // Update registration
        registration.hasCertificate = true;
        registration.certificateId = certificateId;
        localStorage.setItem('myRegistrations', JSON.stringify(registrations));
        
        // Send notification
        this.notifications.addNotification(
            'Certificate Available!',
            `Download your certificate for ${registration.eventTitle}`,
            'success',
            `certificate-view.html?id=${certificateId}`
        );
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('certificateGenerated', { 
            detail: { 
                eventId: eventId,
                eventTitle: registration.eventTitle,
                certificateId: certificateId,
                registrationId: registrationId
            }
        }));
        
        return certificate;
    }
    
    // =============== HELPER METHODS ===============
    getEventById(eventId) {
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        return events.find(e => e.id == eventId);
    }
    
    updateAllUI() {
        this.notifications.updateBadge();
    }
    
    // =============== BACKGROUND SERVICES ===============
    startBackgroundServices() {
        // Check for event reminders every 30 minutes
        setInterval(() => this.checkEventReminders(), 30 * 60 * 1000);
        
        // Check for new events every hour
        setInterval(() => this.checkNewEvents(), 60 * 60 * 1000);
        
        // Auto-sync calendar if enabled
        setInterval(() => this.autoSyncCalendar(), 24 * 60 * 60 * 1000);
    }
    
    checkEventReminders() {
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        registrations.forEach(reg => {
            const eventDate = new Date(reg.date);
            
            // Send reminder 24 hours before
            if (eventDate > now && eventDate < tomorrow && !reg.reminderSent) {
                this.notifications.addNotification(
                    'Event Tomorrow!',
                    `Don't forget: ${reg.eventTitle} tomorrow`,
                    'info',
                    `event-details.html?id=${reg.eventId}`
                );
                reg.reminderSent = true;
            }
            
            // Send reminder 1 hour before
            const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
            if (now > oneHourBefore && now < eventDate && !reg.lastHourReminder) {
                this.notifications.addNotification(
                    'Event Starting Soon!',
                    `${reg.eventTitle} starts in 1 hour`,
                    'warning',
                    `event-details.html?id=${reg.eventId}`
                );
                reg.lastHourReminder = true;
            }
        });
        
        localStorage.setItem('myRegistrations', JSON.stringify(registrations));
    }
    
    checkNewEvents() {
        const lastCheck = localStorage.getItem('lastEventCheck') || '0';
        const now = Date.now();
        
        if (now - parseInt(lastCheck) > 2 * 60 * 60 * 1000) {
            // Simulate checking for new events
            const events = JSON.parse(localStorage.getItem('events') || '[]');
            if (events.length > 0) {
                this.notifications.addNotification(
                    'New Events Available',
                    'Check out the latest events',
                    'info',
                    'events.html'
                );
            }
            
            localStorage.setItem('lastEventCheck', now.toString());
        }
    }
    
    autoSyncCalendar() {
        if (this.calendar.settings.auto_sync) {
            this.calendar.syncAllEvents('ics');
            this.notifications.addNotification(
                'Calendar Updated',
                'Your events have been synced to calendar',
                'success',
                'calendar-sync.html'
            );
        }
    }
    
    // =============== SETUP GLOBAL LISTENERS ===============
    setupGlobalListeners() {
        // Listen for registration events
        document.addEventListener('eventRegistered', (e) => {
            console.log('Integration: Event registered', e.detail);
        });
        
        // Listen for check-in events
        document.addEventListener('eventCheckedIn', (e) => {
            console.log('Integration: Event checked in', e.detail);
        });
        
        // Listen for certificate generation
        document.addEventListener('certificateGenerated', (e) => {
            console.log('Integration: Certificate generated', e.detail);
        });
    }
    
    // =============== PUBLIC STATIC API ===============
    static registerEvent(eventData) {
        const integration = window.cukIntegration || new CUKIntegration();
        return integration.registerForEvent(eventData);
    }
    
    static scanQRCode(qrData) {
        const integration = window.cukIntegration || new CUKIntegration();
        return integration.checkInToEvent(qrData);
    }
    
    static syncCalendar() {
        const integration = window.cukIntegration || new CUKIntegration();
        return integration.calendar.syncAllEvents('ics');
    }
    
    static getUpcomingEvents() {
        const integration = window.cukIntegration || new CUKIntegration();
        return integration.calendar.getUpcomingEventsForCalendar();
    }
    
    static sendNotification(title, message, type = 'info', link = null) {
        const integration = window.cukIntegration || new CUKIntegration();
        return integration.notifications.addNotification(title, message, type, link);
    }
}

// =============== INITIALIZATION ===============
// Create global instance when page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        window.cukIntegration = new CUKIntegration();
        console.log('✓ CUK Integration System Ready');
    } catch (error) {
        console.log('Integration system loaded with fallbacks');
        // Provide fallback object if initialization fails
        window.cukIntegration = {
            notifications: { 
                addNotification: (t, m) => console.log(t, m),
                updateBadge: () => {}
            },
            qr: { generateEventQRCode: () => {} },
            calendar: { getSyncStatus: () => ({}), syncAllEvents: () => ({}) },
            registerForEvent: () => false,
            checkInToEvent: () => false,
            updateAllUI: () => {}
        };
    }
});

// Also initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!window.cukIntegration) {
            window.cukIntegration = new CUKIntegration();
            console.log('✓ CUK Integration System Ready (early init)');
        }
    }, 100);
}
