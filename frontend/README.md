# HAQMS Frontend

This frontend is the Next.js user interface for the HAQMS hospital operations platform. It contains the public landing page, login page, dashboard, patient history screen, and live queue monitor.

## Responsibilities

- Present the HAQMS landing page and calls to action.
- Allow staff users to log in.
- Show dashboard data for hospital staff.
- Display patient medical history records.
- Display the public live queue monitor.
- Listen to Socket.IO events for live queue updates.
- Provide responsive layouts for desktop and mobile users.

## Tech Stack

- Next.js
- React
- CSS
- Lucide React
- Socket.IO Client

## Install And Run

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Main Pages

```text
/                         Landing page
/login                    Staff login
/dashboard                Staff dashboard
/queue                    Public live queue monitor
/patients/[id]/history-records  Patient medical history
```

## Live Queue Flow

The queue page connects to the backend Socket.IO server at:

```text
http://localhost:5000
```

It listens for:

```text
queue:created
queue:updated
queue:changed
```

When one of these events arrives, the queue data is refetched and the screen updates.

## Styling Notes

The UI uses a custom hospital-focused visual design:

- full-screen landing page
- rotating healthcare background images
- responsive dashboard layout
- improved navigation bar
- mobile-friendly sections
- accessible button and card contrast
