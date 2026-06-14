# HAQMS Deployment Guide

This project is best deployed as two services:

1. Backend API on Railway or Heroku.
2. Frontend Next.js app on Vercel.

## Important URLs

After deployment you will have:

```text
Backend URL:  https://your-backend-service.up.railway.app
Frontend URL: https://your-frontend-project.vercel.app
```

The frontend must know the backend URL, and the backend must allow the frontend URL through CORS.

## Backend Deployment: Railway Recommended

Railway is simpler for this project because it can host the Express backend and PostgreSQL database in the same Railway project.

### Railway Settings

Create a new Railway project from your GitHub repository.

Use these service settings:

```text
Service root directory: backend
Build command: npm install
Start command: npm start
```

Add a PostgreSQL database service in Railway.

### Backend Environment Variables

Set these in Railway backend service variables:

```env
DATABASE_URL=<Railway PostgreSQL DATABASE_URL>
JWT_SECRET=<strong-secret-value>
NODE_ENV=production
CLIENT_URL=https://your-frontend-project.vercel.app
```

If you want to allow local frontend and deployed frontend together:

```env
CLIENT_URL=http://localhost:3000,https://your-frontend-project.vercel.app
```

### Railway Database Setup

After the backend deploys, run migrations and seed data from Railway shell or locally against the Railway `DATABASE_URL`:

```bash
cd backend
npx prisma migrate deploy
node prisma/seed.js
```

If migrations are not available, run the SQL from:

```text
backend/prisma/init.sql
```

## Backend Deployment: Heroku Alternative

Use Heroku if you prefer its dashboard and add-ons.

### Heroku Settings

Deploy the `backend` folder as the Node.js app root.

This backend includes:

```text
backend/Procfile
```

with:

```text
web: npm start
```

### Heroku Environment Variables

Set these config vars:

```env
DATABASE_URL=<Heroku Postgres database URL>
JWT_SECRET=<strong-secret-value>
NODE_ENV=production
CLIENT_URL=https://your-frontend-project.vercel.app
```

Heroku Postgres may require SSL. If Prisma connection fails on Heroku, use a `DATABASE_URL` with:

```text
?sslmode=require
```

## Frontend Deployment: Vercel

Import the same GitHub repository into Vercel.

Set the Vercel project root directory to:

```text
frontend
```

Vercel should auto-detect Next.js.

Use these settings:

```text
Install command: npm install
Build command: npm run build
Output directory: .next
```

### Frontend Environment Variables

Set these in Vercel project environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend-service.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-service.up.railway.app
```

For Heroku backend:

```env
NEXT_PUBLIC_API_URL=https://your-heroku-app.herokuapp.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-heroku-app.herokuapp.com
```

After adding environment variables, redeploy the frontend.

## Deployment Verification

### Backend Health Check

Open:

```text
https://your-backend-url/
```

Expected response:

```json
{
  "message": "Hospital Appointment and Queue Management System (HAQMS) Backend API",
  "status": "Running"
}
```

### Frontend Check

Open:

```text
https://your-frontend-url/
```

Then test:

1. Login with a seeded demo account.
2. Open dashboard.
3. Open public queue page.
4. Check browser DevTools Network tab and filter by `WS`.
5. Confirm Socket.IO connects to the deployed backend.

## Common Problems

### CORS Error

Make sure backend `CLIENT_URL` exactly matches the Vercel frontend URL.

For multiple URLs:

```env
CLIENT_URL=http://localhost:3000,https://your-frontend-project.vercel.app
```

### Frontend Still Calls Localhost

Set Vercel environment variables:

```env
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SOCKET_URL
```

Then redeploy.

### Prisma Client Error

The backend has:

```json
"postinstall": "prisma generate"
```

If it still fails, run:

```bash
npx prisma generate
```

on the deployed service shell.

