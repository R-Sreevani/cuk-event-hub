const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    qrCode: {
        type: String,
        required: true
    },
    qrData: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'checked_in', 'cancelled'],
        default: 'confirmed'
    },
    checkInTime: {
        type: Date
    },
    certificateGenerated: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Registration', registrationSchema);