// js/integration.js - MASTER INTEGRATION FILE
// This connects ALL systems together

class CUKIntegration {
    constructor() {
        // Initialize all systems
        this.notifications = window.notificationSystem || new NotificationSystem();
        this.qr = window.qrCodeSystem || new QRCodeSystem();
        this.calendar = window.calendarSync || new CalendarSyncSystem();
        
        // User state
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.admin = JSON.parse(localStorage.getItem('admin') || '{}');
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('CUK Integration System Initialized');
        
        // Set up event listeners for cross-system communication
        this.setupGlobalListeners();
        
        // Check and update user state
        this.updateUserState();
        
        // Start background services
        this.startBackgroundServices();
    }
    
    // =============== EVENT REGISTRATION FLOW ===============
    registerForEvent(eventData) {
        console.log('Integrated Event Registration Flow Started');
        
        // 1. Check if user is logged in
        if (!this.user.name) {
            alert('Please login to register for events');
            window.location.href = 'login.html';
            return false;
        }
        
        // 2. Check event availability
        if (eventData.seats.available <= 0) {
            this.notifications.addNotification(
                'Event Full',
                `${eventData.title} is fully booked`,
                'error',
                'events.html'
            );
            return false;
        }
        
        // 3. Create registration record
        const registrationId = `CUK-REG-${Date.now()}-${eventData.id}`;
        const registration = {
            id: registrationId,
            eventId: eventData.id,
            eventTitle: eventData.title,
            date: eventData.date,
            time: eventData.time,
            venue: eventData.venue,
            userId: this.user.studentId || this.user.email,
            userName: this.user.name,
            registrationDate: new Date().toISOString(),
            status: 'confirmed',
            fee: eventData.fee || 'Free',
            qrCode: registrationId,
            notified: false
        };
        
        // 4. Save to localStorage
        let registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        registrations.push(registration);
        localStorage.setItem('myRegistrations', JSON.stringify(registrations));
        
        // 5. Update event seats
        let events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        const eventIndex = events.findIndex(e => e.id === eventData.id);
        if (eventIndex !== -1) {
            events[eventIndex].seats.registered++;
            events[eventIndex].seats.available--;
            localStorage.setItem('cuk_events', JSON.stringify(events));
        }
        
        // 6. SEND NOTIFICATIONS
        this.notifications.addNotification(
            'Registration Successful!',
            `You're registered for ${eventData.title}`,
            'success',
            `event-details.html?id=${eventData.id}`
        );
        
        // 7. ADD TO CALENDAR (if auto-sync enabled)
        const settings = JSON.parse(localStorage.getItem('calendar_settings') || '{}');
        if (settings.auto_sync) {
            this.calendar.downloadICS(eventData);
        }
        
        // 8. GENERATE QR CODE for check-in
        setTimeout(() => {
            if (document.getElementById('qr-container')) {
                this.qr.generateEventQRCode(
                    eventData.id,
                    registrationId,
                    'qr-container'
                );
            }
        }, 500);
        
        // 9. Redirect to confirmation
        setTimeout(() => {
            window.location.href = `registration-success.html?regId=${registrationId}`;
        }, 1000);
        
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
                verification.error,
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
            
            // 3. Send notification to user
            this.notifications.addNotification(
                'Check-in Successful',
                `You're checked in to ${registrations[regIndex].eventTitle}`,
                'success',
                'my-registrations.html'
            );
            
            // 4. Generate certificate (if event completed)
            setTimeout(() => {
                this.generateCertificate(data.eventId, data.registrationId);
            }, 2000);
            
            return true;
        }
        
        return false;
    }
    
    // =============== CERTIFICATE GENERATION ===============
    generateCertificate(eventId, registrationId) {
        console.log('Generating certificate...');
        
        // 1. Get event and registration data
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const registration = registrations.find(r => r.id === registrationId);
        
        const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        const event = events.find(e => e.id === eventId);
        
        if (!registration || !event) return;
        
        // 2. Create certificate
        const certificateId = `CUK-CERT-${Date.now()}-${eventId}`;
        const certificate = {
            id: certificateId,
            eventId: eventId,
            eventTitle: event.title,
            registrationId: registrationId,
            studentName: registration.userName,
            studentId: registration.userId,
            issueDate: new Date().toISOString(),
            certificateUrl: `certificate.html?id=${certificateId}`,
            qrCode: certificateId
        };
        
        // 3. Save certificate
        let certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
        certificates.push(certificate);
        localStorage.setItem('certificates', JSON.stringify(certificates));
        
        // 4. Update registration
        registration.hasCertificate = true;
        registration.certificateId = certificateId;
        localStorage.setItem('myRegistrations', JSON.stringify(registrations));
        
        // 5. Send notification
        this.notifications.addNotification(
            'Certificate Available!',
            `Download your certificate for ${event.title}`,
            'success',
            `certificate.html?id=${certificateId}`
        );
        
        return certificate;
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
                
                // Add to calendar with reminder
                if (document.getElementById('calendar-reminder-btn')) {
                    document.getElementById('calendar-reminder-btn').style.display = 'block';
                }
                
                reg.reminderSent = true;
            }
            
            // Send reminder 1 hour before (if event has time)
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
        // In real app, this would check server for new events
        // For demo, we'll simulate
        const lastCheck = localStorage.getItem('lastEventCheck') || '0';
        const now = Date.now();
        
        if (now - parseInt(lastCheck) > 2 * 60 * 60 * 1000) { // Every 2 hours
            this.notifications.addNotification(
                'New Events Available',
                'Check out newly added events',
                'info',
                'events.html'
            );
            
            localStorage.setItem('lastEventCheck', now.toString());
        }
    }
    
    autoSyncCalendar() {
        const settings = JSON.parse(localStorage.getItem('calendar_settings') || '{}');
        if (settings.auto_sync) {
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
            this.handleEventRegistration(e.detail);
        });
        
        // Listen for check-in events
        document.addEventListener('eventCheckedIn', (e) => {
            this.handleEventCheckIn(e.detail);
        });
        
        // Listen for certificate generation
        document.addEventListener('certificateGenerated', (e) => {
            this.handleCertificateGeneration(e.detail);
        });
        
        // Listen for calendar sync
        document.addEventListener('calendarSynced', (e) => {
            this.handleCalendarSync(e.detail);
        });
        
        // Listen for QR scan
        document.addEventListener('qrScanned', (e) => {
            this.handleQRScan(e.detail);
        });
    }
    
    // =============== EVENT HANDLERS ===============
    handleEventRegistration(detail) {
        console.log('Integration: Handling event registration', detail);
        
        // Update all systems
        this.notifications.addNotification(
            'Registration Complete',
            `Registered for ${detail.eventTitle}`,
            'success',
            `my-registrations.html`
        );
        
        // Generate QR code
        if (detail.generateQR) {
            setTimeout(() => {
                this.qr.generateEventQRCode(
                    detail.eventId,
                    detail.registrationId,
                    'registration-qr'
                );
            }, 500);
        }
        
        // Add to calendar if auto-sync
        const settings = JSON.parse(localStorage.getItem('calendar_settings') || '{}');
        if (settings.auto_sync) {
            this.calendar.addToGoogleCalendar(detail);
        }
    }
    
    handleEventCheckIn(detail) {
        console.log('Integration: Handling event check-in', detail);
        
        // Update notification
        this.notifications.addNotification(
            'Check-in Recorded',
            `Checked in to ${detail.eventTitle}`,
            'success',
            'my-registrations.html'
        );
        
        // Generate certificate if event completed
        if (detail.generateCertificate) {
            this.generateCertificate(detail.eventId, detail.registrationId);
        }
    }
    
    handleCertificateGeneration(detail) {
        console.log('Integration: Handling certificate generation', detail);
        
        // Send notification
        this.notifications.addNotification(
            'Certificate Ready',
            `Certificate for ${detail.eventTitle} is ready`,
            'success',
            `certificate.html?id=${detail.certificateId}`
        );
        
        // Generate QR code for certificate
        setTimeout(() => {
            this.qr.generateCertificateQRCode(
                detail.certificateId,
                'certificate-qr'
            );
        }, 500);
    }
    
    handleCalendarSync(detail) {
        console.log('Integration: Handling calendar sync', detail);
        
        this.notifications.addNotification(
            'Calendar Synced',
            `${detail.count} events added to calendar`,
            'info',
            'calendar-sync.html'
        );
    }
    
    handleQRScan(detail) {
        console.log('Integration: Handling QR scan', detail);
        
        // Different actions based on QR type
        switch(detail.type) {
            case 'event_checkin':
                this.checkInToEvent(detail.data);
                break;
            case 'certificate':
                this.verifyCertificate(detail.data.certificateId);
                break;
            case 'event_registration':
                this.showRegistrationDetails(detail.data.registrationId);
                break;
        }
    }
    
    // =============== HELPER METHODS ===============
    updateUserState() {
        // Update notification badge
        this.notifications.updateBadge();
        
        // Update calendar sync status
        if (document.getElementById('sync-status')) {
            const status = this.calendar.getSyncStatus();
            document.getElementById('sync-status').textContent = 
                `Last sync: ${status.lastSync ? new Date(status.lastSync).toLocaleDateString() : 'Never'}`;
        }
        
        // Update QR code if on registration page
        if (document.getElementById('registration-qr') && this.user.name) {
            const params = new URLSearchParams(window.location.search);
            const regId = params.get('regId');
            if (regId) {
                this.qr.generateEventQRCode(0, regId, 'registration-qr');
            }
        }
    }
    
    verifyCertificate(certificateId) {
        const certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
        const certificate = certificates.find(c => c.id === certificateId);
        
        if (certificate) {
            alert(`Certificate Verified!\n\nEvent: ${certificate.eventTitle}\nStudent: ${certificate.studentName}\nIssued: ${new Date(certificate.issueDate).toLocaleDateString()}`);
            return true;
        } else {
            alert('Invalid Certificate');
            return false;
        }
    }
    
    showRegistrationDetails(registrationId) {
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const registration = registrations.find(r => r.id === registrationId);
        
        if (registration) {
            window.location.href = `registration-details.html?id=${registrationId}`;
        }
    }
    
    // =============== PUBLIC API ===============
    // Easy-to-use methods for HTML pages
    
    static registerEvent(eventData) {
        const integration = new CUKIntegration();
        return integration.registerForEvent(eventData);
    }
    
    static scanQRCode(qrData) {
        const integration = new CUKIntegration();
        return integration.checkInToEvent(qrData);
    }
    
    static syncCalendar() {
        const integration = new CUKIntegration();
        return integration.calendar.syncAllEvents('ics');
    }
    
    static getUpcomingEvents() {
        const integration = new CUKIntegration();
        return integration.calendar.getUpcomingEventsForCalendar();
    }
    
    static sendNotification(title, message, type = 'info', link = null) {
        const integration = new CUKIntegration();
        return integration.notifications.addNotification(title, message, type, link);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    window.cukIntegration = new CUKIntegration();
    console.log('CUK Integration System Ready');
});