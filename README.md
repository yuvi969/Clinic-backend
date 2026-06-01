# Clinic Management System

A full-stack Clinic Management System built using React, Node.js, Express, PostgreSQL, Socket.IO, and JWT Authentication.

The system allows patients to book appointments, doctors to manage queues and create prescriptions, and provides automated email notifications and appointment reminders.

## Features

### Authentication & Security
- JWT Authentication
- Role-Based Access Control (Doctor / Patient)
- Protected Routes
- HTTP-only Cookies

### Patient Features
- Register & Login
- Book Appointments
- View Appointment History
- View Prescriptions
- Receive Email Notifications

### Doctor Features
- Manage Profile
- Generate Appointment Slots
- View Queue
- Call Next Patient
- Create Prescriptions

### Real-Time Features
- Live Queue Updates using Socket.IO

### Notifications
- Appointment Confirmation Emails
- Prescription Available Emails
- Appointment Reminder Emails

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: Neon PostgreSQL

## Tech Stack

Frontend:
- React
- React Router
- Axios

Backend:
- Node.js
- Express.js
- PostgreSQL
- Socket.IO
- Nodemailer
- Node Cron

Authentication:
- JWT
- Cookies

Deployment:
- Vercel
- Render
- Neon