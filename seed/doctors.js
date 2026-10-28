// Sample doctors inserted the first time the server starts (days: 0=Sun ... 6=Sat)
const doctors = [
  { name: 'Anitha Raghavan', specialization: 'General Medicine', qualification: 'MBBS, MD (General Medicine)', experience: 14, fee: 400, phone: '9840011111', room: 'G-101', availableDays: [1, 2, 3, 4, 5, 6] },
  { name: 'Karthik Subramanian', specialization: 'Cardiology', qualification: 'MBBS, MD, DM (Cardiology)', experience: 18, fee: 900, phone: '9840022222', room: 'C-204', availableDays: [1, 3, 5] },
  { name: 'Meera Nair', specialization: 'Neurology', qualification: 'MBBS, MD, DM (Neurology)', experience: 12, fee: 850, phone: '9840033333', room: 'N-110', availableDays: [2, 4, 6] },
  { name: 'Rajesh Kumar', specialization: 'Orthopedics', qualification: 'MBBS, MS (Orthopaedics)', experience: 16, fee: 700, phone: '9840044444', room: 'O-105', availableDays: [1, 2, 4, 5] },
  { name: 'Priya Venkatesh', specialization: 'Pediatrics', qualification: 'MBBS, DCH, MD (Pediatrics)', experience: 10, fee: 500, phone: '9840055555', room: 'P-102', availableDays: [1, 2, 3, 4, 5, 6] },
  { name: 'Lakshmi Narayanan', specialization: 'Gynecology', qualification: 'MBBS, MS (Obstetrics & Gynaecology)', experience: 15, fee: 650, phone: '9840066666', room: 'W-201', availableDays: [1, 3, 5, 6] },
  { name: 'Arjun Mehta', specialization: 'Dermatology', qualification: 'MBBS, MD (Dermatology)', experience: 8, fee: 600, phone: '9840077777', room: 'D-108', availableDays: [2, 3, 5] },
  { name: 'Sanjay Iyer', specialization: 'ENT', qualification: 'MBBS, MS (ENT)', experience: 11, fee: 550, phone: '9840088888', room: 'E-106', availableDays: [1, 4, 6] },
  { name: 'Divya Krishnan', specialization: 'Ophthalmology', qualification: 'MBBS, MS (Ophthalmology)', experience: 9, fee: 550, phone: '9840099999', room: 'EY-107', availableDays: [2, 3, 5, 6] }
];

const emailFor = name => name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@carewell.com';
module.exports = { doctors, emailFor };
