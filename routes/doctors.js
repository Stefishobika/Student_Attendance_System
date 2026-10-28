const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { DEPARTMENTS } = Doctor;

const router = express.Router();
const admin = requireAuth('admin');

const handleErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  next();
};

const pwChecks = c => c.isLength({ min: 8, max: 64 }).withMessage('Password must be 8-64 characters')
  .matches(/[A-Za-z]/).withMessage('Password must contain a letter').matches(/\d/).withMessage('Password must contain a number');
const pwRequired = pwChecks(body('password'));
const pwOptional = pwChecks(body('password').optional({ checkFalsy: true }));

const doctorRules = [
  body('name').trim().isLength({ min: 3, max: 60 }).withMessage('Doctor name must be 3-60 characters')
    .matches(/^[A-Za-z .'-]+$/).withMessage('Doctor name can contain only letters and spaces'),
  body('specialization').isIn(DEPARTMENTS).withMessage('Select a valid department'),
  body('qualification').trim().isLength({ min: 2, max: 80 }).withMessage('Qualification is required (max 80 characters)'),
  body('experience').isInt({ min: 0, max: 60 }).withMessage('Experience must be 0-60 years').toInt(),
  body('fee').isFloat({ min: 0, max: 20000 }).withMessage('Fee must be between 0 and 20000').toFloat(),
  body('phone').trim().matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('email').trim().isEmail().withMessage('Enter a valid login email').toLowerCase(),
  body('room').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).withMessage('Room must be under 20 characters'),
  body('availableDays').isArray({ min: 1 }).withMessage('Select at least one available day'),
  body('availableDays.*').isInt({ min: 0, max: 6 }).withMessage('Invalid day').toInt(),
  body('active').optional().isBoolean().withMessage('Invalid status').toBoolean()
];

const pick = b => ({
  name: b.name, specialization: b.specialization, qualification: b.qualification,
  experience: b.experience, fee: b.fee, phone: b.phone, email: b.email,
  room: b.room || '', availableDays: [...new Set(b.availableDays)].sort(),
  ...(b.active !== undefined ? { active: b.active } : {})
});

// ---- Public (login email is not exposed) ----
router.get('/departments', (req, res) => res.json(DEPARTMENTS));

router.get('/', async (req, res, next) => {
  try {
    const filter = { active: true };
    if (req.query.specialization && DEPARTMENTS.includes(req.query.specialization)) filter.specialization = req.query.specialization;
    res.json(await Doctor.find(filter).select('-email').sort({ specialization: 1, name: 1 }));
  } catch (e) { next(e); }
});

// ---- Doctor: own profile ----
router.get('/me', requireAuth('doctor'), async (req, res, next) => {
  try {
    const doc = await Doctor.findById(req.user.doctor);
    if (!doc) return res.status(404).json({ message: 'Doctor profile not found' });
    res.json(doc);
  } catch (e) { next(e); }
});

// ---- Admin ----
router.get('/admin/all', admin, async (req, res, next) => {
  try { res.json(await Doctor.find().sort({ specialization: 1, name: 1 })); } catch (e) { next(e); }
});

router.post('/', admin, doctorRules, pwRequired, handleErrors, async (req, res, next) => {
  try {
    if (await User.findOne({ email: req.body.email })) return res.status(409).json({ message: 'This email is already registered' });
    const doc = await Doctor.create(pick(req.body));
    try {
      await User.create({ name: doc.name, email: doc.email, phone: doc.phone, role: 'doctor', doctor: doc._id,
        password: await bcrypt.hash(req.body.password, 10) });
    } catch (e) { await Doctor.findByIdAndDelete(doc._id); throw e; }
    res.status(201).json({ message: 'Doctor added with login account', doctor: doc });
  } catch (e) { next(e); }
});

router.put('/:id', admin, param('id').isMongoId().withMessage('Invalid doctor id'), doctorRules, pwOptional, handleErrors,
  async (req, res, next) => {
    try {
      const doc = await Doctor.findById(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Doctor not found' });
      const user = await User.findOne({ doctor: doc._id, role: 'doctor' });
      const clash = await User.findOne({ email: req.body.email, ...(user ? { _id: { $ne: user._id } } : {}) });
      if (clash) return res.status(409).json({ message: 'This email is already registered to another account' });
      if (!user && !req.body.password) return res.status(400).json({ message: 'Set a password to create a login for this doctor' });

      Object.assign(doc, pick(req.body));
      await doc.save();
      const hash = req.body.password ? await bcrypt.hash(req.body.password, 10) : null;
      if (user) {
        Object.assign(user, { name: doc.name, email: doc.email, phone: doc.phone });
        if (hash) user.password = hash;
        await user.save();
      } else {
        await User.create({ name: doc.name, email: doc.email, phone: doc.phone, role: 'doctor', doctor: doc._id, password: hash });
      }
      res.json({ message: 'Doctor updated successfully', doctor: doc });
    } catch (e) { next(e); }
  });

router.delete('/:id', admin, param('id').isMongoId().withMessage('Invalid doctor id'), handleErrors, async (req, res, next) => {
  try {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const upcoming = await Appointment.countDocuments({ doctor: req.params.id, status: 'Booked', date: { $gte: today } });
    if (upcoming > 0) return res.status(409).json({ message: `This doctor has ${upcoming} upcoming appointment(s). Deactivate instead of deleting.` });
    await Doctor.findByIdAndDelete(req.params.id);
    await User.deleteOne({ doctor: req.params.id, role: 'doctor' });
    res.json({ message: 'Doctor deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
