
const mongoose = require('mongoose');

const SLOTS = [
    '09:00', '09:30',
    '10:00', '10:30',
    '11:00', '11:30',
    '12:00', '12:30',
    '14:00', '14:30',
    '15:00', '15:30',
    '16:00', '16:30'
];

const appointmentSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        patientName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 60
        },

        age: {
            type: Number,
            required: true,
            min: 0,
            max: 120
        },

        gender: {
            type: String,
            required: true,
            enum: ['Male', 'Female', 'Other']
        },

        phone: {
            type: String,
            required: true,
            match: /^[6-9]\d{9}$/
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: /^\S+@\S+\.\S+$/
        },

        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true
        },

        date: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD
        },

        timeSlot: {
            type: String,
            required: true,
            enum: SLOTS
        },

        reason: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ''
        },

        status: {
            type: String,
            enum: ['Booked', 'Cancelled', 'Completed'],
            default: 'Booked'
        }
    },
    {
        timestamps: true
    }
);

// Prevent two active bookings for the same doctor, date and time slot.
appointmentSchema.index(
    {
        doctor: 1,
        date: 1,
        timeSlot: 1
    },
    {
        unique: true,
        partialFilterExpression: {
            status: 'Booked'
        }
    }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
module.exports.SLOTS = SLOTS;
