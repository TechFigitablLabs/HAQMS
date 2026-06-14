# HAQMS Final Assignment Documentation

This document summarizes the engineering work completed for the Figital Labs Full Stack Web Development Internship Assignment.

## Objective

The assignment required improving an existing hospital management system that intentionally contained security vulnerabilities, frontend issues, performance bottlenecks, database inefficiencies, concurrency problems, and incomplete features.

The goal was not to fix every issue, but to demonstrate debugging ability, prioritization, code understanding, and practical full-stack improvements.

## Issues Identified

### Frontend Issues

- Some pages had poor text contrast, making dashboard, physician cards, reports, and queue monitor sections hard to read.
- The dashboard had a React hooks-order error caused by returning before all hooks were executed.
- The patient medical history route was incomplete and caused a 404-style page.
- The landing page looked too empty and did not provide a strong first impression.
- The public queue monitor did not clearly explain or display live queue state.
- Some UI sections were not responsive enough for smaller screens.

### Backend Issues

- The public queue endpoint originally required authentication, which prevented the public monitor from loading correctly.
- Queue mutations did not send real-time updates to the frontend.
- Some API responses are inconsistent across routes.
- Some routes still contain intentionally vulnerable or inefficient code from the original assignment, such as weak validation and legacy authorization behavior.

### Database And Prisma Issues

- The project required PostgreSQL setup through Prisma.
- Prisma schema uses `DATABASE_URL`, so local environment configuration must be correct.
- Some schema comments identify missing indexes and constraints.
- Queue token generation has a known race-condition risk because it calculates the next token number through a read-then-create flow.

### Git And Submission Issues

- Generated folders like `.next` and `node_modules` were accidentally tracked.
- GitHub rejected the push because some generated files were larger than 100 MB.
- `.env` needed to stay local and not be committed.

## Fixes Implemented

### Frontend Improvements

- Rebuilt the landing page with a polished hospital operations design.
- Added rotating healthcare imagery and stronger call-to-action sections.
- Improved dashboard readability with a dedicated `dashboard-readable` style layer.
- Restyled physician registry cards with a professional light clinical palette.
- Restyled admin audit report KPI cards and table for better readability.
- Restyled the live queue monitor so headings, doctor names, idle state, and token pills are visible.
- Added a patient history route at:

```text
/patients/[id]/history-records
```

- Fixed the dashboard React hooks-order error by ensuring all hooks run before any conditional return.
- Improved responsive layout behavior for dashboard and landing sections.

### Backend Improvements

- Added Socket.IO server support on top of the Express server.
- Added queue event emission for queue creation and updates.
- Made the public queue read endpoint accessible without login.
- Kept protected routes for queue mutation actions such as check-in and status updates.

### Live Queue Improvements

- Added Socket.IO client support on the frontend queue page.
- The queue page now listens for:

```text
queue:created
queue:updated
queue:changed
```

- Added fallback polling so the queue still refreshes if WebSocket connection fails.
- Queue tokens are grouped by doctor.
- `CALLING` tokens appear in the "Now Calling" area.
- `WAITING` tokens appear in the "Queue List" area.

### Database Setup

- Configured PostgreSQL through Prisma using:

```text
DATABASE_URL
```

- Added `backend/.env.example` for safe environment setup.
- Added `backend/prisma/init.sql` as a manual SQL setup fallback.
- Preserved seeded demo users, doctors, patients, appointments, and queue tokens.

### GitHub Submission Fixes

- Added `.gitignore`.
- Removed `.next`, `node_modules`, and `.env` from Git tracking.
- Kept generated files local only.
- Successfully pushed the cleaned project to the `alok` branch.

## Optimizations Performed

- Improved frontend rendering stability by fixing the hooks-order bug.
- Added WebSocket updates to reduce dependency on manual refresh.
- Added fallback polling for reliability.
- Improved user experience through clearer navigation, higher contrast, and better page structure.
- Added documentation and diagrams so reviewers can understand the system quickly.

## Remaining Known Issues

These are intentionally documented because the assignment states that fixing everything is not required.

- Frontend still has some hardcoded local API fallbacks for development.
- Some backend routes still return inconsistent response shapes.
- Auth tokens are stored in `localStorage`; production systems should prefer a more secure cookie-based approach.
- Some backend routes contain intentionally weak validation from the original assignment.
- Queue token generation can still create duplicate token numbers under concurrent check-ins.
- Prisma schema comments identify missing indexes and missing uniqueness constraints.
- Full production deployment configuration still needs environment variables for hosted frontend and backend URLs.

## Major Engineering Decisions

### Prioritized User-Visible Stability

The first priority was making the app runnable and demonstrable. Broken pages, unreadable UI, missing routes, and queue access issues were fixed before deeper backend refactors.

### Preserved Assignment Intent

The original project intentionally contained vulnerable and inefficient areas. Instead of hiding every issue, the project now documents remaining risks clearly while improving enough features to demonstrate strong full-stack understanding.

### Added Real-Time Queue Updates

Socket.IO was added because the hospital queue monitor is naturally a real-time feature. This demonstrates backend events, frontend subscriptions, and state synchronization.

### Kept Demo Accounts Visible

Seeded login accounts are visible in the UI so evaluators can quickly test Admin, Doctor, and Receptionist workflows without database inspection.

## How To Verify

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

Backend:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

### Database

Check data in Prisma Studio:

```bash
cd backend
npx prisma studio
```

Important tables:

```text
User
Doctor
Patient
Appointment
QueueToken
```

### Live Queue

1. Open:

```text
http://localhost:3000/queue
```

2. Login to the dashboard in another tab.
3. Check in a patient or update a token status.
4. The public queue page should update through Socket.IO.

## Submission Checklist

- GitHub repository updated.
- Documentation prepared.
- Video walkthrough should be recorded.
- Deployed application URL still needs to be added after deployment.
- Documentation link can point to this file or the GitHub README.

