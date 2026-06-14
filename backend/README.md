# HAQMS Backend

This backend powers the HAQMS hospital operations platform. It exposes REST APIs for authentication, patients, doctors, appointments, queue tokens, and reports. It also runs the Socket.IO server used for live queue updates.

## Responsibilities

- Authenticate staff users with JWT.
- Store hospital data in PostgreSQL through Prisma.
- Manage patients, doctors, appointments, and queue tokens.
- Emit real-time queue updates through Socket.IO.
- Provide report endpoints for admin dashboard views.

## Tech Stack

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT
- bcryptjs

## Environment Setup

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/haqms?schema=public"
PORT=5000
CLIENT_URL="http://localhost:3000"
JWT_SECRET="replace-with-a-strong-secret"
```

Do not commit the real `.env` file.

## Install And Run

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

Backend URL:

```text
http://localhost:5000
```

## Main Routes

```text
POST   /api/auth/login
POST   /api/auth/register
GET    /api/patients
POST   /api/patients
GET    /api/doctors
POST   /api/doctors
GET    /api/appointments
POST   /api/appointments
GET    /api/queue
POST   /api/queue
PATCH  /api/queue/:id
GET    /api/reports
```

## Socket.IO Events

The backend emits these queue events:

```text
queue:created
queue:updated
queue:changed
```

The frontend listens to these events to refresh the queue page without manual reload.

## Database Files

- `prisma/schema.prisma`: Prisma models and enums.
- `prisma/seed.js`: demo users and sample data.
- `prisma/init.sql`: manual SQL setup fallback.
