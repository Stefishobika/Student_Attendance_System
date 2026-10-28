const mongoose = require('mongoose');

const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics',
  'Gynecology', 'Dermatology', 'ENT', 'Ophthalmology'];

const doctorSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, minlength: 3, maxlength: 60 },
  specialization: { type: String, required: true, enum: DEPARTMENTS },
  qualification:  { type: String, required: true, trim: true, maxlength: 80 },
  experience:     { type: Number, required: true, min: 0, max: 60 },
  fee:            { type: Number, required: true, min: 0, max: 20000 },
  phone:          { type: String, required: true, match: /^[6-9]\d{9}$/ },
  email:          { type: String, required: true, trim: true, lowercase: true, match: /^\S+@\S+\.\S+$/ }, // also the doctor's login
  room:           { type: String, trim: true, maxlength: 20, default: '' },
  availableDays:  {
    type: [Number],
    validate: { validator: v => v.length > 0 && v.every(d => Number.isInteger(d) && d >= 0 && d <= 6),
                message: 'Select at least one available day' }
  },
  active:         { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
module.exports.DEPARTMENTS = DEPARTMENTS;
