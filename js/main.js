// CUK Event Hub - Main JavaScript

console.log("CUK Event Hub loaded successfully!");

// Set current year in footer
document.addEventListener('DOMContentLoaded', function() {
    // Update footer year
    const yearElements = document.querySelectorAll('.footer p');
    if (yearElements.length > 0) {
        const currentYear = new Date().getFullYear();
        yearElements.forEach(el => {
            if (el.textContent.includes('2024')) {
                el.textContent = el.textContent.replace('2024', currentYear);
            }
        });
    }
    
    // Add click events to register buttons
    const registerButtons = document.querySelectorAll('.register-btn');
    registerButtons.forEach(button => {
        button.addEventListener('click', function() {
            const eventName = this.parentElement.querySelector('h3').textContent;
            alert(`Thank you for registering for:\n\n${eventName}\n\nRegistration details will be sent to your email.`);
        });
    });
    
    // Highlight current page in nav
    const currentPage = window.location.pathname.split('/').pop();
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        const buttonPage = button.getAttribute('href');
        if (buttonPage === currentPage || 
            (currentPage === '' && buttonPage === 'index.html')) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
});

// Simple event counter
let eventCount = 3;

function addEvent() {
    eventCount++;
    alert(`New event added! Total events: ${eventCount}`);
    return eventCount;
}