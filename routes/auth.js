
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Validate request fields
function handleErrors(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: errors.array()[0].msg,
            errors: errors.array()
        });
    }

    next();
}

// Return safe user details without the password
function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
    };
}

// REGISTER PATIENT
router.post(
    '/register',
    [
        body('name')
            .trim()
            .isLength({ min: 2, max: 60 })
            .withMessage('Name must be 2-60 characters')
            .matches(/^[A-Za-z .'-]+$/)
            .withMessage('Name can contain only letters and spaces'),

        body('email')
            .trim()
            .isEmail()
            .withMessage('Enter a valid email address')
            .normalizeEmail(),

        body('phone')
            .trim()
            .matches(/^[6-9]\d{9}$/)
            .withMessage('Enter a valid 10-digit mobile number'),

        body('password')
            .isLength({ min: 8, max: 64 })
            .withMessage('Password must be 8-64 characters')
            .matches(/[A-Za-z]/)
            .withMessage('Password must contain a letter')
            .matches(/\d/)
            .withMessage('Password must contain a number'),

        body('confirmPassword')
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Passwords do not match')
    ],
    handleErrors,
    async (req, res, next) => {
        try {
            const { name, email, phone, password } = req.body;

            const existingUser = await User.findOne({ email });

            if (existingUser) {
                return res.status(409).json({
                    message: 'An account with this email already exists'
                });
            }

            const user = await User.create({
                name,
                email,
                phone,
                password: await bcrypt.hash(password, 10),
                role: 'patient'
            });

            return res.status(201).json({
                message: 'Account created',
                token: signToken(user),
                user: publicUser(user)
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({
                    message: 'An account with this email already exists'
                });
            }

            next(error);
        }
    }
);

// LOGIN PATIENT, DOCTOR, OR ADMIN
router.post(
    '/login',
    [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Enter a valid email address')
            .normalizeEmail(),

        body('password')
            .notEmpty()
            .withMessage('Enter your password'),

        body('role')
            .isIn(['patient', 'doctor', 'admin'])
            .withMessage('Select a login type')
    ],
    handleErrors,
    async (req, res, next) => {
        try {
            const { email, password, role } = req.body;

            const user = await User.findOne({ email });

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            if (user.role !== role) {
                return res.status(403).json({
                    message: `This is not a ${role} account. Please use the correct login tab.`
                });
            }

            if (role === 'doctor') {
                const doctor = await Doctor.findById(user.doctor);

                if (!doctor || !doctor.active) {
                    return res.status(403).json({
                        message: 'Your account is deactivated. Contact the hospital admin.'
                    });
                }
            }

            return res.json({
                message: 'Login successful',
                token: signToken(user),
                user: publicUser(user)
            });
        } catch (error) {
            next(error);
        }
    }
);

// GET CURRENT LOGGED-IN USER
router.get('/me', requireAuth(), (req, res) => {
    const userId = req.user.id || req.user._id;

    User.findById(userId)
        .then(user => {
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            return res.json(publicUser(user));
        })
        .catch(next => {
            console.error(next);
            res.status(500).json({
                message: 'Could not retrieve user details'
            });
        });
});

// EXPORT EXPRESS ROUTER
module.exports = router;
