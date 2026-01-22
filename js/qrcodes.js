// js/qrcodes.js - QR Code System for CUK Event Hub

class QRCodeSystem {
    constructor() {
        this.qrLibrary = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        this.loadQRCodeLibrary();
    }
    
    // Load QR code library
    loadQRCodeLibrary() {
        if (!document.querySelector('script[src*="qrcode"]')) {
            const script = document.createElement('script');
            script.src = this.qrLibrary;
            script.onload = () => console.log('QR Code library loaded');
            document.head.appendChild(script);
        }
    }
    
    // Generate QR code for event registration
    generateEventQRCode(eventId, registrationId, containerId) {
        const data = {
            type: 'event_registration',
            eventId: eventId,
            registrationId: registrationId,
            timestamp: new Date().toISOString(),
            institution: 'CUK'
        };
        
        const qrData = JSON.stringify(data);
        return this.generateQRCode(qrData, containerId);
    }
    
    // Generate QR code for check-in
    generateCheckInQRCode(eventId, userId, containerId) {
        const data = {
            type: 'event_checkin',
            eventId: eventId,
            userId: userId,
            timestamp: new Date().toISOString(),
            action: 'check_in'
        };
        
        const qrData = JSON.stringify(data);
        return this.generateQRCode(qrData, containerId);
    }
    
    // Generate QR code for certificate
    generateCertificateQRCode(certificateId, containerId) {
        const data = {
            type: 'certificate',
            certificateId: certificateId,
            timestamp: new Date().toISOString(),
            verifyUrl: `${window.location.origin}/verify-certificate.html?id=${certificateId}`
        };
        
        const qrData = JSON.stringify(data);
        return this.generateQRCode(qrData, containerId);
    }
    
    // Generate generic QR code
    generateQRCode(text, containerId, options = {}) {
        if (typeof QRCode === 'undefined') {
            console.error('QR Code library not loaded');
            return null;
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return null;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Default options
        const defaultOptions = {
            width: 200,
            height: 200,
            colorDark: "#003366",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        };
        
        const qrOptions = { ...defaultOptions, ...options };
        
        // Generate QR code
        try {
            new QRCode(container, {
                text: text,
                width: qrOptions.width,
                height: qrOptions.height,
                colorDark: qrOptions.colorDark,
                colorLight: qrOptions.colorLight,
                correctLevel: qrOptions.correctLevel
            });
            
            return container.querySelector('img') || container.querySelector('canvas');
        } catch (error) {
            console.error('QR Code generation failed:', error);
            return null;
        }
    }
    
    // Generate downloadable QR code
    generateDownloadableQR(text, filename = 'cuk-qrcode.png') {
        return new Promise((resolve, reject) => {
            if (typeof QRCode === 'undefined') {
                reject('QR Code library not loaded');
                return;
            }
            
            // Create temporary container
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);
            
            // Generate QR code
            const qrcode = new QRCode(tempContainer, {
                text: text,
                width: 300,
                height: 300,
                colorDark: "#003366",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Wait for QR code to render
            setTimeout(() => {
                const canvas = tempContainer.querySelector('canvas');
                if (canvas) {
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    resolve(link.href);
                } else {
                    reject('QR Code generation failed');
                }
                
                // Clean up
                document.body.removeChild(tempContainer);
            }, 100);
        });
    }
    
    // Scan QR code (using camera)
    async scanQRCode(containerId) {
        try {
            // Check if browser supports media devices
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera not supported');
            }
            
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error('Container not found');
            }
            
            // Create video element
            const video = document.createElement('video');
            video.style.width = '100%';
            video.style.borderRadius = '10px';
            container.innerHTML = '';
            container.appendChild(video);
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            video.srcObject = stream;
            await video.play();
            
            // Create canvas for QR scanning
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Start scanning
            const scanInterval = setInterval(() => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                // Here you would use a QR code scanning library
                // For demo, we'll simulate scanning
                simulateQRScan(container, scanInterval, stream);
            }, 1000);
            
            return {
                stop: () => {
                    clearInterval(scanInterval);
                    stream.getTracks().forEach(track => track.stop());
                    container.innerHTML = '';
                }
            };
            
        } catch (error) {
            console.error('QR Scan error:', error);
            container.innerHTML = `<p style="color: #dc3545;">Error: ${error.message}</p>`;
            return null;
        }
    }
    
    // Verify QR code data
    verifyQRCodeData(qrData) {
        try {
            const data = JSON.parse(qrData);
            
            if (!data.type || !data.timestamp) {
                return { valid: false, error: 'Invalid QR code format' };
            }
            
            // Check if data is expired (older than 1 day for check-ins)
            const qrTime = new Date(data.timestamp);
            const now = new Date();
            const timeDiff = now - qrTime;
            
            if (data.type === 'event_checkin' && timeDiff > 24 * 60 * 60 * 1000) {
                return { valid: false, error: 'QR code expired' };
            }
            
            // Validate based on type
            switch (data.type) {
                case 'event_registration':
                    if (!data.eventId || !data.registrationId) {
                        return { valid: false, error: 'Missing registration data' };
                    }
                    break;
                    
                case 'event_checkin':
                    if (!data.eventId || !data.userId) {
                        return { valid: false, error: 'Missing check-in data' };
                    }
                    break;
                    
                case 'certificate':
                    if (!data.certificateId) {
                        return { valid: false, error: 'Missing certificate data' };
                    }
                    break;
                    
                default:
                    return { valid: false, error: 'Unknown QR code type' };
            }
            
            return { valid: true, data: data };
            
        } catch (error) {
            return { valid: false, error: 'Invalid QR code data' };
        }
    }
    
    // Generate admin QR code for event
    generateAdminEventQR(eventData, containerId) {
        const adminData = {
            type: 'admin_event',
            eventId: eventData.id,
            eventTitle: eventData.title,
            date: eventData.date,
            totalSeats: eventData.seats?.total || 0,
            adminUrl: `${window.location.origin}/admin-event-view.html?id=${eventData.id}`,
            timestamp: new Date().toISOString()
        };
        
        return this.generateQRCode(JSON.stringify(adminData), containerId, {
            width: 250,
            height: 250
        });
    }
}

// Helper function to simulate QR scanning
function simulateQRScan(container, interval, stream) {
    // In real app, use jsQR or similar library
    // This is just for demo
    if (Math.random() > 0.7) {
        clearInterval(interval);
        stream.getTracks().forEach(track => track.stop());
        
        const mockData = {
            type: 'event_checkin',
            eventId: 1,
            userId: 'CUK20240001',
            timestamp: new Date().toISOString(),
            action: 'check_in'
        };
        
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="color: #28a745; font-size: 48px; margin-bottom: 15px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 style="color: #003366;">QR Code Scanned Successfully!</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <div>Event: National Conference on AI</div>
                    <div>User: CUK20240001</div>
                    <div>Time: ${new Date().toLocaleTimeString()}</div>
                </div>
                <button onclick="location.reload()" style="background: #003366; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    Scan Another
                </button>
            </div>
        `;
    }
}

// Global instance
const qrCodeSystem = new QRCodeSystem();