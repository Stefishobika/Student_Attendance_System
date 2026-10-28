# CareWell Hospital - Online Appointment Booking and Scheduling System

Node.js + Express + MongoDB (Mongoose) + Bootstrap 5, with JWT login for three roles.

## Roles
| Role | How the account is created | What they can do |
|---|---|---|
| Patient | Self-registration (`/register.html`) | Book, view and cancel their own appointments |
| Doctor | Added by the admin (login email + password set in the Doctors form) | See their own schedule, mark appointments completed / cancelled |
| Admin | Seeded from `.env` on first start | Dashboard, all appointments, add / edit / deactivate / delete doctors |

Passwords are stored as bcrypt hashes. Login returns a JWT (8 h) that the browser sends as a Bearer token; every protected API route checks the token and the role.

## Setup
1. Install Node.js 18+ and MongoDB (or use a MongoDB Atlas URI).
2. `npm install`
3. Copy `.env.example` to `.env` and set `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. `npm start`, then open http://localhost:3000

On first start the server creates the admin account, sample doctors, and a login for each doctor (password from `DEFAULT_DOCTOR_PASSWORD`; doctor emails look like `anitha.raghavan@carewell.com`).

## Structure
```
server.js               app entry, MongoDB connection, seeding
models/                 User.js, Doctor.js, Appointment.js
routes/                 auth.js, doctors.js, appointments.js
middleware/auth.js      JWT sign + requireAuth(role)
seed/doctors.js         sample doctors
public/                 login, register, book, my-appointments, doctor, admin pages + css/js
```

## Key points
- MongoDB partial unique index on (doctor + date + slot) for active bookings prevents double booking
- Validation in the browser (HTML5/Bootstrap) and on the server (express-validator + Mongoose)
- Role-based access: patients cannot open doctor/admin APIs, and doctors only see their own appointments
