const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^\S+@\S+\.\S+$/ },
  phone:    { type: String, default: '' },
  password: { type: String, required: true },            // bcrypt hash, never plain text
  role:     { type: String, required: true, enum: ['patient', 'doctor', 'admin'] },
  doctor:   { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' } // set for doctor accounts
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
