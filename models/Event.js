const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['technical', 'cultural', 'sports', 'workshop', 'seminar', 'other'],
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        required: true
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seats: {
        total: {
            type: Number,
            required: true,
            min: 1
        },
        registered: {
            type: Number,
            default: 0
        },
        available: {
            type: Number
        }
    },
    image: {
        type: String,
        default: ''
    },
    requirements: [String],
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Calculate available seats before save
eventSchema.pre('save', function(next) {
    this.seats.available = this.seats.total - this.seats.registered;
    next();
});

module.exports = mongoose.model('Event', eventSchema);