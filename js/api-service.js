// js/api-service.js - Frontend-Backend Integration Service

class APIService {
    constructor() {
        this.BASE_URL = 'http://localhost:5000/api'; // Change to your server URL
        this.token = localStorage.getItem('token');
    }

    // ==================== AUTHENTICATION ====================

    async register(userData) {
        try {
            const response = await fetch(`${this.BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.setToken(data.token);
                this.setUser(data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async login(credentials) {
        try {
            const response = await fetch(`${this.BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.setToken(data.token);
                this.setUser(data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    // ==================== EVENTS ====================

    async getEvents() {
        try {
            const response = await fetch(`${this.BASE_URL}/events`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            
            const events = await response.json();
            
            // Save to localStorage for offline use
            localStorage.setItem('cuk_events', JSON.stringify(events));
            
            return { success: true, events };
        } catch (error) {
            // Fallback to localStorage if offline
            const localEvents = JSON.parse(localStorage.getItem('cuk_events') || '[]');
            return { success: false, events: localEvents, error: error.message };
        }
    }

    async getEventById(id) {
        try {
            const response = await fetch(`${this.BASE_URL}/events/${id}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch event');
            }
            
            return { success: true, event: await response.json() };
        } catch (error) {
            // Fallback to localStorage
            const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
            const event = events.find(e => e._id === id);
            return { success: !!event, event, error: event ? null : 'Event not found' };
        }
    }

    async registerForEvent(eventId) {
        try {
            const response = await fetch(`${this.BASE_URL}/events/${eventId}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local storage
                this.updateLocalRegistration(data.registration, data.event);
                
                // Trigger notification
                if (window.notificationSystem) {
                    notificationSystem.addNotification(
                        'Registration Successful!',
                        `You are registered for ${data.event.title}`,
                        'success',
                        'my-registrations.html'
                    );
                }
                
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    // ==================== REGISTRATIONS ====================

    async getMyRegistrations() {
        try {
            const response = await fetch(`${this.BASE_URL}/my-registrations`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch registrations');
            }
            
            const registrations = await response.json();
            
            // Save to localStorage
            localStorage.setItem('myRegistrations', JSON.stringify(registrations));
            
            return { success: true, registrations };
        } catch (error) {
            // Fallback to localStorage
            const localRegistrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
            return { success: false, registrations: localRegistrations, error: error.message };
        }
    }

    // ==================== CHECK-IN ====================

    async checkIn(qrData) {
        try {
            const response = await fetch(`${this.BASE_URL}/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ qrData })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local storage
                this.updateLocalCheckIn(data.registration);
                
                // Trigger notification
                if (window.notificationSystem) {
                    notificationSystem.addNotification(
                        'Check-in Successful!',
                        `You checked in to ${data.registration.event.title}`,
                        'success',
                        'my-registrations.html'
                    );
                }
                
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    // ==================== NOTIFICATIONS ====================

    async getNotifications() {
        try {
            const response = await fetch(`${this.BASE_URL}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            
            const notifications = await response.json();
            
            // Save to localStorage
            localStorage.setItem('cuk_notifications', JSON.stringify(notifications));
            
            return { success: true, notifications };
        } catch (error) {
            // Fallback to localStorage
            const localNotifications = JSON.parse(localStorage.getItem('cuk_notifications') || '[]');
            return { success: false, notifications: localNotifications, error: error.message };
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`${this.BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return { success: response.ok };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ==================== DASHBOARD ====================

    async getDashboardStats() {
        try {
            const response = await fetch(`${this.BASE_URL}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }
            
            return { success: true, stats: await response.json() };
        } catch (error) {
            // Calculate stats from localStorage
            const stats = this.getLocalStats();
            return { success: false, stats, error: error.message };
        }
    }

    // ==================== CERTIFICATES ====================

    async getCertificates() {
        try {
            const response = await fetch(`${this.BASE_URL}/certificates`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch certificates');
            }
            
            const certificates = await response.json();
            
            // Save to localStorage
            localStorage.setItem('certificates', JSON.stringify(certificates));
            
            return { success: true, certificates };
        } catch (error) {
            // Fallback to localStorage
            const localCertificates = JSON.parse(localStorage.getItem('certificates') || '[]');
            return { success: false, certificates: localCertificates, error: error.message };
        }
    }

    async verifyCertificate(certificateId) {
        try {
            const response = await fetch(`${this.BASE_URL}/certificates/verify/${certificateId}`);
            
            const data = await response.json();
            
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ==================== HELPER METHODS ====================

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    getUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // ==================== LOCAL STORAGE SYNC ====================

    updateLocalRegistration(registration, event) {
        // Update events
        const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        const eventIndex = events.findIndex(e => e._id === event._id);
        if (eventIndex !== -1) {
            events[eventIndex].seats.registered++;
            events[eventIndex].seats.available--;
            localStorage.setItem('cuk_events', JSON.stringify(events));
        }
        
        // Update registrations
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        registrations.push({
            ...registration,
            event: event
        });
        localStorage.setItem('myRegistrations', JSON.stringify(registrations));
    }

    updateLocalCheckIn(registration) {
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const regIndex = registrations.findIndex(r => r._id === registration._id);
        
        if (regIndex !== -1) {
            registrations[regIndex].checkInTime = registration.checkInTime;
            registrations[regIndex].status = 'checked_in';
            localStorage.setItem('myRegistrations', JSON.stringify(registrations));
        }
    }

    getLocalStats() {
        const registrations = JSON.parse(localStorage.getItem('myRegistrations') || '[]');
        const events = JSON.parse(localStorage.getItem('cuk_events') || '[]');
        const certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
        const notifications = JSON.parse(localStorage.getItem('cuk_notifications') || '[]');
        
        const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).length;
        const unreadNotifications = notifications.filter(n => !n.read).length;
        
        return {
            totalRegistrations: registrations.length,
            upcomingEvents,
            certificatesCount: certificates.length,
            unreadNotifications,
            lastUpdated: new Date().toISOString()
        };
    }

    // ==================== SYNC METHODS ====================

    async syncAllData() {
        if (!this.isAuthenticated()) return;
        
        const syncPromises = [
            this.getEvents(),
            this.getMyRegistrations(),
            this.getNotifications(),
            this.getCertificates()
        ];
        
        try {
            const results = await Promise.allSettled(syncPromises);
            console.log('🔄 Data sync completed:', results);
            return results;
        } catch (error) {
            console.error('❌ Sync error:', error);
            return null;
        }
    }
}

// Global instance
window.apiService = new APIService();