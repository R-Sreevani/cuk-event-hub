// Calendar functionality for CUK Event Hub

document.addEventListener('DOMContentLoaded', function() {
    generateCalendar();
    setupCalendarNavigation();
});

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;
    
    // Clear previous calendar
    calendarGrid.innerHTML = '';
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Get last day of month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayIndex = firstDay.getDay();
    // Get total days in month
    const totalDays = lastDay.getDate();
    
    // Today's date
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if today
        if (isCurrentMonth && day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Add sample events (in real app, this comes from database)
        const sampleEvents = [
            { day: 15, title: 'AI Conference' },
            { day: 20, title: 'Cultural Fest' },
            { day: 25, title: 'Sports Day' }
        ];
        
        const event = sampleEvents.find(e => e.day === day);
        if (event) {
            dayElement.classList.add('event-day');
            const eventDot = document.createElement('span');
            eventDot.className = 'event-dot';
            dayElement.appendChild(document.createElement('br'));
            dayElement.appendChild(eventDot);
            dayElement.appendChild(document.createTextNode(' ' + event.title));
        }
        
        calendarGrid.appendChild(dayElement);
    }
    
    // Update month/year display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthYearElement = document.querySelector('.calendar-header h3');
    if (monthYearElement) {
        monthYearElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
}

function setupCalendarNavigation() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar();
        });
    }
    
    if (todayBtn) {
        todayBtn.addEventListener('click', function() {
            const today = new Date();
            currentMonth = today.getMonth();
            currentYear = today.getFullYear();
            generateCalendar();
        });
    }
}