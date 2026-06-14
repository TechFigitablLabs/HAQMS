# HAQMS Video Walkthrough Script

Use this as a 5-15 minute recording guide for the assignment video.

## 1. Introduction

Say:

```text
This is HAQMS, a Hospital Appointment, Queue, and Care-Flow Management System built with Next.js, Express, PostgreSQL, Prisma, and Socket.IO.
```

Show:

- GitHub repository.
- Main README.
- UML, DFD, and Use Case diagrams.

## 2. Project Setup

Show:

- Backend terminal running on `http://localhost:5000`.
- Frontend terminal running on `http://localhost:3000`.
- PostgreSQL data using pgAdmin or Prisma Studio.

Mention:

```text
Prisma connects the backend to PostgreSQL. Staff users are stored in User, patients in Patient, doctors in Doctor, bookings in Appointment, and live queue records in QueueToken.
```

## 3. Landing Page

Show:

- Landing page.
- CTA buttons.
- Responsive and polished UI.

Mention:

```text
I improved the frontend so the project gives a clear hospital operations first impression.
```

## 4. Login And Roles

Show login page and demo accounts.

Use:

```text
admin@haqms.com
password123
```

Explain:

```text
The app is mainly for hospital staff: Admin, Doctor, and Receptionist. Patients can view the public queue but do not log in.
```

## 5. Dashboard

Show:

- Patient lookup directory.
- Patient registration.
- Appointment booking.
- Physician registry.
- System audit reports.

Mention:

```text
I fixed readability issues, dashboard styling, and a React hooks-order error that caused runtime crashes.
```

## 6. Patient History

Show:

```text
/patients/[id]/history-records
```

Mention:

```text
This was an incomplete feature. I added a real patient history route so doctors can inspect medical background records.
```

## 7. Live Queue Monitor

Open:

```text
http://localhost:3000/queue
```

Explain:

```text
The live board groups queue tokens by doctor. CALLING tokens appear under Now Calling, and WAITING tokens appear in Queue List.
```

Then show:

- Check in from dashboard.
- Queue token appearing on public monitor.
- Socket status badge.

Mention:

```text
Socket.IO sends queue:created and queue:updated events so the public board updates without manual refresh.
```

## 8. Known Issues

Mention:

```text
The original assignment intentionally had security and performance issues. I fixed major user-facing problems and documented remaining issues like localStorage auth, inconsistent API responses, missing indexes, and queue race-condition risk.
```

## 9. Closing

Say:

```text
This submission demonstrates full-stack debugging, UI improvement, PostgreSQL and Prisma usage, API workflows, and real-time queue updates with Socket.IO.
```

