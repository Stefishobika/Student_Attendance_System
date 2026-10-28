
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');

const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { requireAuth } = require('../middleware/auth');

const { SLOTS } = Appointment;
const router = express.Router();

const patientOnly = requireAuth('patient');
const doctorOnly = requireAuth('doctor');
const adminOnly = requireAuth('admin');

const pad = n => String(n).padStart(2, '0');

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nowHHMM = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const dayOf = s => new Date(s + 'T00:00:00').getDay();

const DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
];

const validDate = value => {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        isNaN(new Date(value + 'T00:00:00')) ||
        new Date(value + 'T00:00:00').toISOString().slice(0, 10) !== value
    ) {
        throw new Error('Enter a valid date');
    }

    if (value < todayStr()) {
        throw new Error('Date cannot be in the past');
    }

    const max = new Date();
    max.setDate(max.getDate() + 90);

    const maxDate =
        `${max.getFullYear()}-${pad(max.getMonth() + 1)}-${pad(max.getDate())}`;

    if (value > maxDate) {
        throw new Error('Bookings are open for the next 90 days only');
    }

    return true;
};

const handleErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: errors.array()[0].msg,
            errors: errors.array()
        });
    }

    next();
};

// Consistent user ID handling for JWT payloads.
const getUserId = req => req.user?.id || req.user?._id;

async function getBookableDoctor(id, date) {
    const doc = await Doctor.findById(id);

    if (!doc || !doc.active) {
        return { error: 'Doctor not found or not available' };
    }

    const day = dayOf(date);

    if (!doc.availableDays.includes(day)) {
        return {
            error: `Dr. ${doc.name} is not available on ${DAY_NAMES[day]}s`
        };
    }

    return { doc };
}

const withDoctor = q => q.populate('doctor', 'name specialization room');

// Public configuration
router.get('/config', (req, res) => {
    res.json({ slots: SLOTS });
});

// Get available slots
router.get(
    '/slots',
    [
        query('doctorId').isMongoId().withMessage('Select a doctor'),
        query('date').custom(validDate)
    ],
    handleErrors,
    async (req, res, next) => {
        try {
            const { doc, error } = await getBookableDoctor(
                req.query.doctorId,
                req.query.date
            );

            if (error) {
                return res.status(400).json({ message: error });
            }

            const booked = await Appointment.find({
                doctor: doc._id,
                date: req.query.date,
                status: 'Booked'
            }).select('timeSlot');

            const taken = booked.map(b => b.timeSlot);

            let available = SLOTS.filter(slot => !taken.includes(slot));

            if (req.query.date === todayStr()) {
                available = available.filter(slot => slot > nowHHMM());
            }

            res.json({
                date: req.query.date,
                available
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// PATIENT: BOOK AN APPOINTMENT
// ==========================================
router.post(
    '/',
    patientOnly,
    [
        body('patientName')
            .trim()
            .isLength({ min: 2, max: 60 })
            .withMessage('Patient name must be 2-60 characters')
            .matches(/^[A-Za-z .'-]+$/)
            .withMessage('Patient name can contain only letters and spaces'),

        body('age')
            .isInt({ min: 0, max: 120 })
            .withMessage('Enter a valid age (0-120)')
            .toInt(),

        body('gender')
            .isIn(['Male', 'Female', 'Other'])
            .withMessage('Select gender'),

        body('phone')
            .trim()
            .matches(/^[6-9]\d{9}$/)
            .withMessage('Enter a valid 10-digit mobile number'),

        body('doctorId')
            .isMongoId()
            .withMessage('Select a doctor'),

        body('date').custom(validDate),

        body('timeSlot')
            .isIn(SLOTS)
            .withMessage('Select a valid time slot'),

        body('reason')
            .optional()
            .trim()
            .isLength({ max: 300 })
            .withMessage('Reason must be under 300 characters')
    ],
    handleErrors,
    async (req, res, next) => {
        try {
            const {
                patientName,
                age,
                gender,
                phone,
                doctorId,
                date,
                timeSlot,
                reason
            } = req.body;

            const patientId = getUserId(req);

            if (!patientId) {
                return res.status(401).json({
                    message: 'User ID missing. Please log in again.'
                });
            }

            const { doc, error } = await getBookableDoctor(doctorId, date);

            if (error) {
                return res.status(400).json({ message: error });
            }

            if (date === todayStr() && timeSlot <= nowHHMM()) {
                return res.status(400).json({
                    message: 'That time has already passed. Pick a later slot.'
                });
            }

            const appt = await Appointment.create({
                patient: patientId,
                email: req.user.email,
                patientName,
                age,
                gender,
                phone,
                doctor: doc._id,
                date,
                timeSlot,
                reason
            });

            await appt.populate('doctor', 'name specialization room');

            res.status(201).json({
                message: 'Appointment booked successfully!',
                appointment: appt
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: 'That slot was just taken. Please pick another.'
                });
            }

            next(error);
        }
    }
);

// ==========================================
// PATIENT: GET MY APPOINTMENTS
// ==========================================
router.get('/', patientOnly, async (req, res, next) => {
    try {
        const patientId = getUserId(req);

        if (!patientId) {
            return res.status(401).json({
                message: 'User ID missing. Please log in again.'
            });
        }

        const appointments = await Appointment.find({
            patient: patientId
        })
            .populate('doctor', 'name specialization room')
            .sort({ date: 1, timeSlot: 1 });

        res.json(appointments);
    } catch (error) {
        next(error);
    }
});

// ==========================================
// PATIENT: CANCEL MY APPOINTMENT
// ==========================================
router.patch(
    '/:id/cancel',
    patientOnly,
    param('id').isMongoId().withMessage('Invalid appointment id'),
    handleErrors,
    async (req, res, next) => {
        try {
            const patientId = getUserId(req);

            const appt = await Appointment.findOne({
                _id: req.params.id,
                patient: patientId
            });

            if (!appt) {
                return res.status(404).json({
                    message: 'Appointment not found'
                });
            }

            if (appt.status !== 'Booked') {
                return res.status(400).json({
                    message: `Already ${appt.status}`
                });
            }

            appt.status = 'Cancelled';
            await appt.save();

            res.json({
                message: 'Appointment cancelled',
                appointment: appt
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// DOCTOR: GET THEIR APPOINTMENTS
// ==========================================
router.get('/doctor/mine', doctorOnly, async (req, res, next) => {
    try {
        if (!req.user.doctor) {
            return res.status(400).json({
                message: 'No doctor profile is linked to this account.'
            });
        }

        const appointments = await Appointment.find({
            doctor: req.user.doctor
        })
            .populate('patient', 'name email phone')
            .sort({ date: 1, timeSlot: 1 });

        res.json(appointments);
    } catch (error) {
        next(error);
    }
});

// Doctor: update appointment status
router.patch(
    '/doctor/:id/status',
    doctorOnly,
    param('id').isMongoId().withMessage('Invalid appointment id'),
    body('status')
        .isIn(['Completed', 'Cancelled'])
        .withMessage('Invalid status'),
    handleErrors,
    async (req, res, next) => {
        try {
            const appt = await Appointment.findOne({
                _id: req.params.id,
                doctor: req.user.doctor
            });

            if (!appt) {
                return res.status(404).json({
                    message: 'Appointment not found'
                });
            }

            if (appt.status !== 'Booked') {
                return res.status(400).json({
                    message: `Already ${appt.status}`
                });
            }

            appt.status = req.body.status;
            await appt.save();

            res.json({
                message: `Marked as ${appt.status}`,
                appointment: appt
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// ADMIN: GET ALL APPOINTMENTS
// ==========================================
router.get('/admin/all', adminOnly, async (req, res, next) => {
    try {
        const appointments = await Appointment.find()
            .populate('doctor', 'name specialization room')
            .populate('patient', 'name email phone')
            .sort({ date: 1, timeSlot: 1 });

        res.json(appointments);
    } catch (error) {
        next(error);
    }
});

// Admin: update appointment status
router.patch(
    '/admin/:id/status',
    adminOnly,
    param('id').isMongoId().withMessage('Invalid appointment id'),
    body('status')
        .isIn(['Booked', 'Cancelled', 'Completed'])
        .withMessage('Invalid status'),
    handleErrors,
    async (req, res, next) => {
        try {
            const appt = await Appointment.findById(req.params.id);

            if (!appt) {
                return res.status(404).json({
                    message: 'Appointment not found'
                });
            }

            appt.status = req.body.status;
            await appt.save();

            res.json({
                message: 'Status updated',
                appointment: appt
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: 'Slot already booked by someone else'
                });
            }

            next(error);
        }
    }
);

// Admin: delete appointment
router.delete(
    '/admin/:id',
    adminOnly,
    param('id').isMongoId().withMessage('Invalid appointment id'),
    handleErrors,
    async (req, res, next) => {
        try {
            const appt = await Appointment.findByIdAndDelete(req.params.id);

            if (!appt) {
                return res.status(404).json({
                    message: 'Appointment not found'
                });
            }

            res.json({ message: 'Appointment deleted' });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
