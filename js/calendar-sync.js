// js/calendar-sync.js - Calendar Sync System for CUK Event Hub

class CalendarSyncSystem {
    constructor() {
        this.supportedCalendars = ['google', 'outlook', 'apple', 'ics'];
        this.userSettings = JSON.parse(localStorage.getItem('calendar_settings') || '{}');
    }
    
    // Generate ICS file for event
    generateICS(event) {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toISOString().replace(/-|:|\.\d+/g, '');
        };
        
        const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CUK Event Hub//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@cuk.ac.in
SUMMARY:${event.title}
DESCRIPTION:${event.description || 'CUK Event'}
LOCATION:${event.venue}
DTSTART:${formatDate(event.date + 'T09:00:00')}
DTEND:${formatDate(event.date + 'T17:00:00')}
DTSTAMP:${formatDate(new Date().toISOString())}
ORGANIZER;CN="CUK Event Hub":mailto:events@cuk.ac.in
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR
        `.trim();
        
        return icsContent;
    }
    
    // Download ICS file
    downloadICS(event) {
        const icsContent = this.generateICS(event);
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `CUK-Event-${event.title.replace(/\s+/g, '-')}.ics`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        // Log download
        this.logSync('download_ics', event.id);
    }
    
    // Add to Google Calendar
    addToGoogleCalendar(event) {
        const startDate = new Date(event.date);
        const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
        
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent(event.title)}` +
            `&dates=${startDate.toISOString().replace(/-|:|\.\d+/g, '')}` +
            `/${endDate.toISOString().replace(/-|:|\.\d+/g, '')}` +
            `&details=${encodeURIComponent(event.description || 'CUK Event')}` +
            `&location=${encodeURIComponent(event.venue)}` +
            `&sf=true` +
            `&output=xml`;
        
        window.open(googleCalendarUrl, '_blank');
        
        // Log sync
        this.logSync('google_calendar', event.id);
        
        return true;
    }
    
    // Add to Outlook Calendar
    addToOutlookCalendar(event) {
        const startDate = new Date(event.date);
        const endDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
        
        const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?` +
            `subject=${encodeURIComponent(event.title)}` +
            `&body=${encodeURIComponent(event.description || 'CUK Event')}` +
            `&location=${encodeURIComponent(event.venue)}` +
            `&startdt=${startDate.toISOString()}` +
            `&enddt=${endDate.toISOString()}`;
        
        window.open(outlookCalendarUrl, '_blank');
        
        // Log sync
        this.logSync('outlook_calendar', event.id);
        
        return true;
    }
    
    // Sync all registered events
    syncAllEvents(calendarType = 'ics') {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.name) {
            return { success: false, error: 'User not logged in' };
        }
        
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        
        const userEvents = registrations
            .map(reg => events.find(e => e.id === reg.eventId))
            .filter(event => event && new Date(event.date) > new Date());
        
        if (userEvents.length === 0) {
            return { success: false, error: 'No upcoming events found' };
        }
        
        switch(calendarType) {
            case 'ics':
                this.downloadCombinedICS(userEvents);
                break;
            case 'google':
                // Google doesn't support bulk add, so add first event
                this.addToGoogleCalendar(userEvents[0]);
                break;
            case 'outlook':
                this.addToOutlookCalendar(userEvents[0]);
                break;
        }
        
        this.logSync('bulk_sync', calendarType, userEvents.length);
        
        return { 
            success: true, 
            message: `Synced ${userEvents.length} events to ${calendarType}`,
            count: userEvents.length 
        };
    }
    
    // Download combined ICS for all events
    downloadCombinedICS(events) {
        let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CUK Event Hub//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;
        
        events.forEach(event => {
            icsContent += this.generateICS(event).replace('BEGIN:VCALENDAR', '').replace('END:VCALENDAR', '');
        });
        
        icsContent += 'END:VCALENDAR';
        
        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'CUK-My-Events.ics';
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Get upcoming events for calendar
    getUpcomingEventsForCalendar(days = 30) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.name) return [];
        
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        return registrations
            .map(reg => {
                const event = events.find(e => e.id === reg.eventId);
                if (!event) return null;
                
                const eventDate = new Date(event.date);
                if (eventDate >= now && eventDate <= futureDate) {
                    return {
                        ...event,
                        registrationStatus: reg.status,
                        registrationId: reg.id
                    };
                }
                return null;
            })
            .filter(event => event !== null)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    // Get calendar sync status
    getSyncStatus() {
        const syncHistory = JSON.parse(localStorage.getItem('calendar_sync_history') || '[]');
        const lastSync = syncHistory[syncHistory.length - 1];
        
        return {
            lastSync: lastSync?.timestamp || null,
            totalSyncs: syncHistory.length,
            upcomingEvents: this.getUpcomingEventsForCalendar().length,
            settings: this.userSettings
        };
    }
    
    // Log sync activity
    logSync(action, eventId, data = null) {
        const syncHistory = JSON.parse(localStorage.getItem('calendar_sync_history') || '[]');
        
        syncHistory.push({
            action: action,
            eventId: eventId,
            data: data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        // Keep only last 100 syncs
        if (syncHistory.length > 100) {
            syncHistory.shift();
        }
        
        localStorage.setItem('calendar_sync_history', JSON.stringify(syncHistory));
    }
    
    // Clear sync history
    clearSyncHistory() {
        localStorage.removeItem('calendar_sync_history');
        return true;
    }
    
    // Set user preferences
    setPreferences(preferences) {
        this.userSettings = { ...this.userSettings, ...preferences };
        localStorage.setItem('calendar_settings', JSON.stringify(this.userSettings));
        return this.userSettings;
    }
    
    // Get calendar export options HTML
    getCalendarOptionsHTML(event) {
        return `
            <div class="calendar-options">
                <h4>Add to Calendar</h4>
                <div class="calendar-buttons">
                    <button onclick="calendarSync.downloadICS(${JSON.stringify(event).replace(/"/g, '&quot;')})" 
                            class="calendar-btn">
                        <i class="fas fa-download"></i> Download .ICS
                    </button>
                    <button onclick="calendarSync.addToGoogleCalendar(${JSON.stringify(event).replace(/"/g, '&quot;')})" 
                            class="calendar-btn">
                        <i class="fab fa-google"></i> Google Calendar
                    </button>
                    <button onclick="calendarSync.addToOutlookCalendar(${JSON.stringify(event).replace(/"/g, '&quot;')})" 
                            class="calendar-btn">
                        <i class="fas fa-envelope"></i> Outlook
                    </button>
                    <button onclick="calendarSync.addToAppleCalendar(${JSON.stringify(event).replace(/"/g, '&quot;')})" 
                            class="calendar-btn">
                        <i class="fab fa-apple"></i> Apple Calendar
                    </button>
                </div>
            </div>
        `;
    }
    
    // Add to Apple Calendar (uses ICS)
    addToAppleCalendar(event) {
        this.downloadICS(event);
        this.logSync('apple_calendar', event.id);
        return true;
    }
    
    // Create calendar subscription URL
    createCalendarSubscription() {
        const baseUrl = window.location.origin;
        const userId = JSON.parse(localStorage.getItem('user') || '{}').studentId || 'guest';
        const subscriptionUrl = `${baseUrl}/api/calendar/${userId}.ics`;
        
        // In production, this would be a real endpoint
        // For demo, return a data URL
        const sampleEvents = this.getUpcomingEventsForCalendar();
        const icsContent = this.generateICS(sampleEvents[0] || {
            id: 'sample',
            title: 'Sample Event',
            date: new Date().toISOString(),
            venue: 'CUK Campus',
            description: 'Sample event for calendar subscription'
        });
        
        const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
        
        return {
            url: dataUrl,
            webcalUrl: dataUrl.replace('data:text/calendar', 'webcal'),
            instructions: 'Copy this URL and add it to your calendar app for automatic updates.'
        };
    }
}

// Global instance
const calendarSync = new CalendarSyncSystem();