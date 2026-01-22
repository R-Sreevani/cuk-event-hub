const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    registration: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    certificateId: {
        type: String,
        required: true,
        unique: true
    },
    issuedAt: {
        type: Date,
        default: Date.now
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedAt: {
        type: Date
    }
});

module.exports = mongoose.model('Certificate', certificateSchema);