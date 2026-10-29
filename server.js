
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const User = require('./models/User');
const { doctors: seedDoctors, emailFor } = require('./seed/doctors');

const app = express();
const PORT = process.env.PORT || 3000;

// Use MongoDB Atlas in production.
const MONGO_URI = process.env.MONGO_URI;

// Require secrets in production.
if (process.env.NODE_ENV === 'production') {
  if (!MONGO_URI) {
    console.error('Startup failed: MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error('Startup failed: JWT_SECRET is missing in environment variables.');
    process.exit(1);
  }
} else if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Configure it before logging in.');
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load and validate Express routers.
function loadRouter(routePath) {
  const router = require(routePath);

  if (typeof router !== 'function') {
    throw new TypeError(
      `${routePath} must export an Express router using module.exports = router`
    );
  }

  return router;
}

// API routes
app.use('/api/auth', loadRouter('./routes/auth'));
app.use('/api/doctors', loadRouter('./routes/doctors'));
app.use('/api/appointments', loadRouter('./routes/appointments'));

// Handle unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong on the server.'
        : err.message || 'Something went wrong on the server.'
  });
});

// Prepare database and default accounts.
async function prepareDatabase() {
  // Remove old appointments without a patient reference.
  const old = await Appointment.deleteMany({
    patient: { $exists: false }
  });

  if (old.deletedCount) {
    console.log(
      `Removed ${old.deletedCount} old appointment(s) from a previous version`
    );
  }

  await Appointment.syncIndexes();

  // Seed doctors if the collection is empty.
  if ((await Doctor.countDocuments()) === 0) {
    await Doctor.insertMany(
      seedDoctors.map((doctor) => ({
        ...doctor,
        email: emailFor(doctor.name)
      }))
    );

    console.log('Sample doctors added');
  }

  // Add login emails to older doctor records that do not have one.
  const doctorsWithoutEmail = await Doctor.find({
    $or: [{ email: '' }, { email: { $exists: false } }]
  });

  for (const doctor of doctorsWithoutEmail) {
    await Doctor.updateOne(
      { _id: doctor._id },
      { $set: { email: emailFor(doctor.name) } }
    );
  }

  // Create doctor login accounts where missing.
  const doctorPassword = process.env.DEFAULT_DOCTOR_PASSWORD;

  if (!doctorPassword && process.env.NODE_ENV === 'production') {
    throw new Error(
      'DEFAULT_DOCTOR_PASSWORD is missing from environment variables.'
    );
  }

  for (const doctor of await Doctor.find()) {
    const existingUser = await User.findOne({
      doctor: doctor._id,
      role: 'doctor'
    });

    if (existingUser) continue;

    try {
      await User.create({
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        role: 'doctor',
        doctor: doctor._id,
        password: await bcrypt.hash(
          doctorPassword || 'Doctor@123',
          10
        )
      });

      console.log(`Doctor login created: ${doctor.email}`);
    } catch (error) {
      console.warn(
        `Could not create login for Dr. ${doctor.name}: ${error.message}`
      );
    }
  }

  // Create the administrator account if one does not exist.
  const existingAdmin = await User.findOne({ role: 'admin' });

  if (!existingAdmin) {
    const adminEmail = (
      process.env.ADMIN_EMAIL || 'admin@carewell.com'
    ).toLowerCase();

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword && process.env.NODE_ENV === 'production') {
      throw new Error(
        'ADMIN_PASSWORD is missing from environment variables.'
      );
    }

    await User.create({
      name: 'Administrator',
      email: adminEmail,
      role: 'admin',
      password: await bcrypt.hash(
        adminPassword || 'Admin@123',
        10
      )
    });

    console.log(`Admin account created: ${adminEmail}`);
  }
}

// Connect to MongoDB and start the server.
async function startServer() {
  try {
    if (!MONGO_URI) {
      throw new Error(
        'MONGO_URI is missing. Add your MongoDB Atlas connection string to the environment.'
      );
    }

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    });

    console.log('MongoDB Atlas connected successfully');

    await User.init();
    await prepareDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
