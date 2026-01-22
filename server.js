// server.js - CUK Event Hub Backend Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cuk_event_hub', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Error:', err));

// Models
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const Notification = require('./models/Notification');
const Certificate = require('./models/Certificate');

// ==================== AUTHENTICATION ROUTES ====================

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, studentId, department, role } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { studentId }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            studentId,
            department,
            role: role || 'student'
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'cuk_event_hub_secret',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                studentId: user.studentId,
                department: user.department,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'cuk_event_hub_secret',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                studentId: user.studentId,
                department: user.department,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== EVENT ROUTES ====================

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find()
            .sort({ date: 1 })
            .populate('organizer', 'name email department');
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name email department');
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Get registration count
        const registrationCount = await Registration.countDocuments({ event: req.params.id });
        event.seats.registered = registrationCount;
        event.seats.available = event.seats.total - registrationCount;
        
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create event (Admin/Organizer only)
app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const event = new Event({
            ...req.body,
            organizer: req.user.userId
        });
        
        await event.save();
        
        // Create notification for all users
        await Notification.create({
            title: 'New Event Added!',
            message: `${event.title} has been added. Register now!`,
            type: 'success',
            link: `/event-details.html?id=${event._id}`,
            forAllUsers: true
        });
        
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== REGISTRATION ROUTES ====================

// Register for event
app.post('/api/events/:id/register', authenticateToken, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Check if already registered
        const existingRegistration = await Registration.findOne({
            event: req.params.id,
            user: req.user.userId
        });
        
        if (existingRegistration) {
            return res.status(400).json({ error: 'Already registered for this event' });
        }
        
        // Check seat availability
        const registrationCount = await Registration.countDocuments({ event: req.params.id });
        if (registrationCount >= event.seats.total) {
            return res.status(400).json({ error: 'Event is full' });
        }
        
        // Generate QR code data
        const qrData = {
            registrationId: `REG-${Date.now()}`,
            eventId: event._id,
            userId: req.user.userId,
            eventName: event.title,
            userName: req.user.name
        };
        
        // Generate QR code image
        const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
        
        // Create registration
        const registration = new Registration({
            event: req.params.id,
            user: req.user.userId,
            qrCode: qrCode,
            qrData: qrData,
            status: 'confirmed'
        });
        
        await registration.save();
        
        // Update event seats
        event.seats.registered = registrationCount + 1;
        event.seats.available = event.seats.total - (registrationCount + 1);
        await event.save();
        
        // Create notification for user
        await Notification.create({
            user: req.user.userId,
            title: 'Registration Successful!',
            message: `You are registered for ${event.title}`,
            type: 'success',
            link: `/my-registrations.html`
        });
        
        // Send email confirmation
        await sendRegistrationEmail(req.user.email, event, registration);
        
        res.status(201).json({
            message: 'Registration successful',
            registration,
            event
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user registrations
app.get('/api/my-registrations', authenticateToken, async (req, res) => {
    try {
        const registrations = await Registration.find({ user: req.user.userId })
            .populate('event')
            .sort({ createdAt: -1 });
        
        res.json(registrations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== QR CODE CHECK-IN ====================

// Check-in using QR code
app.post('/api/checkin', authenticateToken, async (req, res) => {
    try {
        const { qrData } = req.body;
        
        if (!qrData) {
            return res.status(400).json({ error: 'QR data required' });
        }
        
        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
        } catch {
            return res.status(400).json({ error: 'Invalid QR code' });
        }
        
        // Find registration
        const registration = await Registration.findOne({
            'qrData.registrationId': parsedData.registrationId
        }).populate('event').populate('user');
        
        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        
        // Check if already checked in
        if (registration.checkInTime) {
            return res.status(400).json({ error: 'Already checked in' });
        }
        
        // Update check-in
        registration.checkInTime = new Date();
        registration.status = 'checked_in';
        await registration.save();
        
        // Create certificate
        const certificate = new Certificate({
            registration: registration._id,
            user: registration.user._id,
            event: registration.event._id,
            certificateId: `CERT-${Date.now()}`,
            issuedAt: new Date()
        });
        
        await certificate.save();
        
        // Create notification
        await Notification.create({
            user: registration.user._id,
            title: 'Check-in Successful!',
            message: `You checked in to ${registration.event.title}. Certificate generated!`,
            type: 'success',
            link: `/certificates.html?id=${certificate._id}`
        });
        
        res.json({
            message: 'Check-in successful',
            registration,
            certificate
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== NOTIFICATION ROUTES ====================

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { user: req.user.userId },
                { forAllUsers: true }
            ]
        }).sort({ createdAt: -1 });
        
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );
        
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CERTIFICATE ROUTES ====================

// Get user certificates
app.get('/api/certificates', authenticateToken, async (req, res) => {
    try {
        const certificates = await Certificate.find({ user: req.user.userId })
            .populate('event')
            .populate('registration')
            .sort({ issuedAt: -1 });
        
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify certificate
app.get('/api/certificates/verify/:id', async (req, res) => {
    try {
        const certificate = await Certificate.findById(req.params.id)
            .populate('event')
            .populate('user', 'name studentId department');
        
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }
        
        res.json({
            valid: true,
            certificate,
            verificationDate: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [
            totalRegistrations,
            upcomingEvents,
            certificatesCount,
            unreadNotifications
        ] = await Promise.all([
            Registration.countDocuments({ user: userId }),
            Event.countDocuments({ date: { $gte: new Date() } }),
            Certificate.countDocuments({ user: userId }),
            Notification.countDocuments({ 
                $or: [
                    { user: userId, read: false },
                    { forAllUsers: true, read: false }
                ]
            })
        ]);
        
        res.json({
            totalRegistrations,
            upcomingEvents,
            certificatesCount,
            unreadNotifications,
            lastUpdated: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== HELPER FUNCTIONS ====================

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'cuk_event_hub_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Email sending function
async function sendRegistrationEmail(userEmail, event, registration) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Registration Confirmation: ${event.title}`,
            html: `
                <h2>Registration Confirmed!</h2>
                <p>Dear Student,</p>
                <p>Your registration for <strong>${event.title}</strong> has been confirmed.</p>
                <p><strong>Event Details:</strong></p>
                <ul>
                    <li>Date: ${new Date(event.date).toLocaleDateString()}</li>
                    <li>Time: ${event.time}</li>
                    <li>Venue: ${event.venue}</li>
                    <li>Registration ID: ${registration.qrData.registrationId}</li>
                </ul>
                <p>Please show the QR code at the event entrance for check-in.</p>
                <p>Best regards,<br>CUK Event Hub Team</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('📧 Registration email sent to:', userEmail);
    } catch (error) {
        console.error('❌ Email sending error:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
// Add this after mongoose.connect
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds
})
.then(() => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    console.log('🌐 Database: cuk_event_hub');
    console.log('👤 User: cuk_admin');
})
.catch(err => {
    console.log('❌ MongoDB Connection Failed');
    console.log('Error:', err.message);
    console.log('Check:');
    console.log('1. Is your password correct in .env?');
    console.log('2. Is IP address whitelisted in Atlas?');
    console.log('3. Are you connected to internet?');
});