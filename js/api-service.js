// js/api-service.js - Updated for GitHub Pages
class APIService {
    constructor() {
        // Check if we're on GitHub Pages
        this.isGitHubPages = window.location.hostname.includes('github.io');
        
        // Use different URLs for local vs GitHub Pages
        if (this.isGitHubPages) {
            this.BASE_URL = ''; // No backend on GitHub Pages
            console.log('🌐 Running on GitHub Pages - Using demo mode');
        } else {
            this.BASE_URL = 'http://localhost:5000/api';
            console.log('💻 Running locally - Using backend API');
        }
        
        this.token = localStorage.getItem('token');
        this.useDemoMode = this.isGitHubPages;
    }
    
    // Modified methods to use localStorage when on GitHub Pages
    async getEvents() {
        if (this.useDemoMode) {
            // Use demo data for GitHub Pages
            return this.getDemoEvents();
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/events`);
            const events = await response.json();
            localStorage.setItem('cuk_events', JSON.stringify(events));
            return { success: true, events };
        } catch (error) {
            return this.getDemoEvents();
        }
    }
    
    getDemoEvents() {
        const demoEvents = [
            {
                id: '1',
                title: 'Tech Fest 2024',
                description: 'Annual technical festival with competitions and workshops',
                date: '2024-03-15',
                time: '10:00 AM',
                venue: 'Main Auditorium',
                category: 'technical',
                image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d',
                seats: { total: 100, registered: 45, available: 55 }
            },
            {
                id: '2',
                title: 'Cultural Night',
                description: 'Music and dance performances by talented students',
                date: '2024-03-20',
                time: '6:00 PM',
                venue: 'Open Air Theater',
                category: 'cultural',
                image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622',
                seats: { total: 200, registered: 120, available: 80 }
            },
            {
                id: '3',
                title: 'AI Workshop',
                description: 'Hands-on workshop on Artificial Intelligence',
                date: '2024-03-25',
                time: '2:00 PM',
                venue: 'Computer Lab 3',
                category: 'workshop',
                image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b',
                seats: { total: 50, registered: 30, available: 20 }
            }
        ];
        
        // Save to localStorage
        localStorage.setItem('cuk_events', JSON.stringify(demoEvents));
        
        return { 
            success: false, 
            events: demoEvents, 
            message: 'Using demo data (GitHub Pages mode)' 
        };
    }
    
    // Add other methods with similar fallbacks...
}
