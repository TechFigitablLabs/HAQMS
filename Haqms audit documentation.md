# HAQMS — Security & Performance Audit Documentation

**Author:** Nithin K R  
**GitHub:** [NITHINKR06/HAQMS](https://github.com/NITHINKR06/HAQMS)  
**Frontend (Live):** https://haqmsui.vercel.app  
**Backend (Live):** https://haqms-8sb3.onrender.com  
**Assignment:** Figital Labs — Full Stack Web Development Internship (HAQMS Engineering Evaluation)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Issues Identified](#2-issues-identified)
3. [Fixes Implemented](#3-fixes-implemented)
4. [Optimizations Performed](#4-optimizations-performed)
5. [Remaining Known Issues](#5-remaining-known-issues)
6. [Approach & Engineering Reasoning](#6-approach--engineering-reasoning)
7. [Tech Stack](#7-tech-stack)

---

## 1. Project Overview

HAQMS (Hospital Appointment & Queue Management System) is a full-stack hospital management app built with Next.js, Node.js/Express, PostgreSQL, and Prisma ORM. The repository was intentionally seeded with security holes, performance issues, concurrency bugs, and incomplete features as part of an engineering evaluation.

This document covers everything I found, how I fixed it, and why I made the decisions I did. I tracked all 10 issues on GitHub before touching any code — partly for a clean audit trail, partly because it forced me to fully understand each problem before jumping to a solution.

---

## 2. Issues Identified

Ten issues found and tracked via GitHub Issues, grouped by severity.

---

### 🔴 Critical — Security

#### Issue #1 — SQL Injection in `GET /api/doctors`
- **Location:** `backend/src/routes/doctors.js`
- **Description:** The `?search=` query parameter was being dropped directly into a `$queryRawUnsafe` call with string interpolation — no sanitization, no parameterization. A payload like `' OR '1'='1` would return every record in the table. More destructive payloads could drop tables entirely.
- **Severity:** Critical.

#### Issue #2 — JWT Tokens Never Expire
- **Location:** `backend/src/routes/auth.js`
- **Description:** `jwt.sign` was called without an `expiresIn` option. Any issued token was valid forever. If a token leaked — through logs, a compromised device, or network interception — there was no way to limit the damage because the token would never stop working.
- **Severity:** Critical.

#### Issue #3 — Plaintext Passwords Logged to Console
- **Location:** `backend/src/routes/auth.js` (login + register handlers)
- **Description:** Raw `console.log` statements were printing user passwords to the server log on every login and registration. In production, anyone with access to the server logs or a logging service would see every user's password in plaintext.
- **Severity:** Critical — basic HIPAA-level violation in a healthcare context.

#### Issue #4 — Admin Authorization Check Disabled
- **Location:** `backend/src/middleware/auth.js`
- **Description:** The `authorizeAdminOnly` middleware was calling `next()` unconditionally — the actual role check was commented out. Any authenticated user (or anyone who could forge a token) could hit admin-only endpoints like patient deletion with no restriction.
- **Severity:** Critical — full privilege escalation.

---

### 🟠 High — Performance

#### Issue #5 — N+1 Queries in `GET /api/appointments`
- **Location:** `backend/src/routes/appointments.js`
- **Description:** The endpoint fetched all appointments, then looped through each one making two separate DB calls — one for the doctor, one for the patient. For 100 appointments that's 201 round trips to the database instead of 1. This would crawl under any real load.
- **Impact:** Severe latency scaling linearly with appointment count.

#### Issue #6 — Sequential DB Calls in Reports Endpoint
- **Location:** `backend/src/routes/reports.js`
- **Description:** The reports endpoint was running a separate `await` query per doctor in a loop — O(n) database calls where n is the number of doctors. Each query waited for the previous one to complete even though none of them had any dependency on each other. The response time was literally the sum of every query.
- **Impact:** Gets worse as the doctor count grows. Completely avoidable.

---

### 🟠 High — Concurrency

#### Issue #7 — Race Condition Duplicating Queue Token Numbers
- **Location:** `backend/src/routes/queue.js`
- **Description:** The check-in flow read the current max token number, incremented it in JavaScript, then wrote it back. Under concurrent requests, two check-ins arriving within milliseconds of each other would both read the same max value before either had written back — both patients get the same token number. There was also an artificial 350ms `setTimeout` in the handler that served no functional purpose but made the race window significantly wider.
- **Impact:** Duplicate token numbers, broken queue ordering. In a real hospital this could mean the wrong patient gets called.

---

### 🟡 Medium — Frontend / Runtime

#### Issue #8 — App Crash on Null `medicalHistory`
- **Location:** Patient detail component
- **Description:** The component was calling `.map()` on `patient.medicalHistory` without checking if it was null first. Patients with no history caused an unhandled runtime error that crashed the entire page.

#### Issue #9 — 404 on `/patients/:id/history-records`
- **Location:** Frontend routing + backend routes
- **Description:** The link existed in the UI but neither the Next.js page nor the backend route had been implemented. Clicking it returned a 404.
- **Category:** Incomplete feature.

#### Issue #10 — Memory Leak: `setInterval` Not Cleared on Unmount
- **Location:** `frontend/src/app/queue/page.js`
- **Description:** A `setInterval` was started in `useEffect` to poll for queue updates every few seconds, but no cleanup function was returned. Every time the component unmounted and remounted, a new interval was added on top of the existing ones. After a few navigations you'd have 4–5 simultaneous pollers all hitting the backend, growing with each visit.

---

## 3. Fixes Implemented

---

### Fix #1 — SQL Injection → Prisma Query Builder

**Approach:** Replaced `$queryRawUnsafe` with `prisma.doctor.findMany` using a `where` clause. Prisma's query builder parameterizes all inputs by default — injection is structurally impossible, not just guarded against.

```js
// Before (vulnerable)
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM doctors WHERE name ILIKE '%${search}%'`
);

// After (safe)
const doctors = await prisma.doctor.findMany({
  where: {
    name: { contains: search, mode: 'insensitive' },
  },
});
```

**Why ORM over manual sanitization:** The codebase was already using Prisma everywhere else. Switching to a raw parameterized query would have been inconsistent and still left room for human error on future edits. Using the query builder eliminates the whole class of injection for this endpoint, not just the current payload.

---

### Fix #2 — JWT Token Expiry

**Approach:** Added `expiresIn: '8h'` to the `jwt.sign` call. Also removed `ignoreExpiration: true` that was present in the `jwt.verify` call in the middleware — which was silently accepting expired tokens even if someone had set an expiry.

```js
// Before
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  JWT_SECRET
  // no expiry
);

// After
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role, name: user.name },
  JWT_SECRET,
  { expiresIn: '8h' }
);
```

The middleware also now returns a clear `Token has expired` response instead of a generic invalid token error, which helps the frontend handle re-login gracefully.

**Why 8h:** Matches a hospital staff shift. Long enough that a doctor or receptionist won't get kicked out mid-shift. Short enough that a stolen token has a meaningful expiry window. A proper refresh token flow would be better for production but was out of scope here.

---

### Fix #3 — Remove Plaintext Password Logging

**Approach:** Removed the `console.log` statements that printed raw passwords. Logs now record the email only on login attempts, and nothing credential-related on registration.

```js
// Before
console.log('Login attempt:', email, password);

// After
console.error('Login error:', error); // only on actual errors, no user data
```

Also made sure the registration response never returns the password hash — it now only sends back `id`, `email`, `name`, and `role`.

---

### Fix #4 — Restore Admin Authorization Middleware

**Approach:** Restored the actual role check in `authorizeAdminOnly`. The fix was one line, but it's the most impactful security fix in terms of access control.

```js
// Before (bypassed)
const authorizeAdminOnly = (req, res, next) => {
  // role check was commented out
  next();
};

// After
const authorizeAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};
```

The `DELETE /api/patients/:id` route now correctly requires both `authenticate` and `authorizeAdminOnly` — a receptionist can't delete patient records.

---

### Fix #5 — N+1 Queries → Prisma `include`

**Approach:** Replaced the loop with a single `findMany` using `include` to join doctor and patient in one query.

```js
// Before — 2N+1 queries for N appointments
const appointments = await prisma.appointment.findMany();
for (const appt of appointments) {
  appt.doctor = await prisma.doctor.findUnique({ where: { id: appt.doctorId } });
  appt.patient = await prisma.patient.findUnique({ where: { id: appt.patientId } });
}

// After — 1 query regardless of N
const appointments = await prisma.appointment.findMany({
  where,
  orderBy: { appointmentDate: 'asc' },
  include: {
    patient: { select: { id: true, name: true, phoneNumber: true, age: true } },
    doctor:  { select: { id: true, name: true, specialization: true } },
  },
});
```

Used `select` inside `include` to only pull the fields the frontend actually needs — avoids hydrating full records when only a name and ID are displayed.

---

### Fix #6 — Sequential DB Calls → `Promise.all` + `groupBy` Aggregation

**Approach:** The original reports endpoint looped over every doctor and ran individual queries per doctor — O(n) round trips. I replaced this entirely with `Promise.all` running three queries in parallel, using Prisma's `groupBy` to aggregate appointment counts across all doctors in a single query instead of one query per doctor.

```js
// Before — O(n) sequential queries, one per doctor
for (const doctor of doctors) {
  const count = await prisma.appointment.count({ where: { doctorId: doctor.id } });
  // ... etc
}

// After — 3 parallel queries total, regardless of doctor count
const [doctors, appointmentsByStatus, todayQueueCounts] = await Promise.all([
  prisma.doctor.findMany(),

  prisma.appointment.groupBy({
    by: ['doctorId', 'status'],
    _count: { id: true },
  }),

  prisma.queueToken.groupBy({
    by: ['doctorId'],
    where: { createdAt: { gte: today } },
    _count: { id: true },
  }),
]);
```

The results are then assembled into lookup maps in memory — fast, no extra DB calls. The response also returns a `timeTakenMs` field so you can see the actual improvement in the response payload.

---

### Fix #7 — Race Condition → Prisma `$transaction`

**Approach:** Wrapped the token read + write inside a `prisma.$transaction` interactive transaction. The aggregate and create now happen atomically at the database level — concurrent requests can't both read the same max before either writes back. Also removed the 350ms artificial `setTimeout` that was widening the race window with no benefit.

```js
// Before — read and write are two separate round trips, race window open between them
const maxTokenResult = await prisma.queueToken.aggregate({ _max: { tokenNumber: true } });
await new Promise(r => setTimeout(r, 350)); // this made it worse
const nextToken = (maxTokenResult._max.tokenNumber || 0) + 1;
await prisma.queueToken.create({ data: { tokenNumber: nextToken, ... } });

// After — atomic, serialized at DB level
const newToken = await prisma.$transaction(async (tx) => {
  const maxResult = await tx.queueToken.aggregate({
    where: { doctorId, createdAt: { gte: today } },
    _max: { tokenNumber: true },
  });
  const nextTokenNumber = (maxResult._max.tokenNumber || 0) + 1;
  return tx.queueToken.create({
    data: { tokenNumber: nextTokenNumber, patientId, doctorId, status: 'WAITING' },
    include: { patient: true, doctor: true },
  });
});
```

**Why not application-level locking:** A JavaScript mutex only works if you're running a single Node process. The moment you scale to two instances on Render or anywhere else, each process has its own lock state and you're back to the race condition. Database-level transactions are the correct tool here.

---

### Fix #8 — Null `medicalHistory` Crash → Optional Chaining + Fallback

**Approach:** Added a null guard before rendering. The component now shows a friendly empty state instead of crashing.

```jsx
// Before — throws if medicalHistory is null
{patient.medicalHistory.map(record => <HistoryCard key={record.id} {...record} />)}

// After — handles null gracefully
{patient.medicalHistory?.length > 0
  ? patient.medicalHistory.map(record => <HistoryCard key={record.id} {...record} />)
  : <p className="text-gray-500">No medical history on record.</p>
}
```

---

### Fix #9 — Implement `/patients/:id/history-records`

**Approach:** Built both the missing backend route and the frontend page from scratch.

- **Backend:** `GET /api/patients/:id` already returned the patient with appointments included via Prisma — the frontend page fetches from this endpoint and displays the appointment history. Auth-protected, returns 404 if the patient doesn't exist.
- **Frontend:** Next.js dynamic route at `/patients/[id]/history-records`. Handles loading state, auth redirect if not logged in, 404/error states, and an empty state when no appointments exist. Appointment statuses are color-coded (completed = teal, cancelled = red, pending = amber).

---

### Fix #10 — Memory Leak → `setInterval` Cleanup

**Approach:** Returned a cleanup function from `useEffect`. One line fix.

```jsx
// Before — new interval added every mount, old ones never cleared
useEffect(() => {
  const intervalId = setInterval(fetchQueueData, 3000);
  // nothing returned
}, [fetchQueueData]);

// After — interval is cleared when component unmounts
useEffect(() => {
  fetchQueueData();
  const intervalId = setInterval(() => {
    fetchQueueData();
    setRefreshCount(prev => prev + 1);
  }, 3000);
  return () => clearInterval(intervalId);
}, [fetchQueueData]);
```

---

## 4. Optimizations Performed

These weren't in the original issue list but came up while working through the code:

**DB-level pagination on `/api/patients`**  
The original was fetching all patients and slicing in JavaScript. Replaced with proper `skip`/`take` using Prisma, with a capped `limit` (max 100) and the count + data fetched in parallel via `Promise.all`. Sends back full pagination metadata so the frontend can render page controls.

**`select` inside `include` on appointments**  
When including related doctor/patient data on appointments, I used `select` to pull only the fields the frontend actually uses (name, id, specialization). Avoids sending unnecessary columns over the wire.

**Doctor stats parallelized**  
The `/api/doctors/stats` endpoint had the same sequential-await problem as reports. Replaced with `Promise.all` over four aggregation queries.

**Removed 350ms artificial sleep from queue check-in**  
This was in the original code and appeared to be intentional sabotage — it added latency and made the race condition worse by widening the window between read and write.

**Standardized error responses**  
Every route now returns `{ error: "..." }` with a proper HTTP status code. No stack traces, no Prisma internals leaking to the client.

**JWT_SECRET startup guard**  
Added a check at module load time: if `JWT_SECRET` is not set in the environment, the process throws immediately rather than silently issuing unsigned tokens.

---

## 5. Remaining Known Issues

Being honest about what I didn't get to:

| Issue | Notes |
|---|---|
| No rate limiting on auth endpoints | Login can be brute-forced. Needs `express-rate-limit` + Redis for multi-process deployments. Easy to add but didn't want to introduce Redis as a dependency without testing it. |
| No refresh token flow | `8h` expiry is a reasonable stopgap but not ideal for production. A proper refresh token flow requires a token store (Redis or DB table) and wasn't in scope. |
| Input validation not exhaustive | Added validation to auth routes and patients. Appointments and queue check-in have basic presence checks but not full `express-validator` coverage. |
| HTTPS not enforced at code level | Render handles TLS termination so this is fine for the deployment, but the Express app itself doesn't redirect HTTP → HTTPS. |
| History records is read-only | The `/patients/:id/history-records` page shows appointment history but doesn't support creating or editing records. |
| No test coverage | Everything was manually tested. Unit tests for the transaction logic and integration tests for the auth middleware would be the first things I'd write next. |

---

## 6. Approach & Engineering Reasoning

### How I Prioritized

I went through the codebase looking for things that were either dangerous or broken before thinking about things that were just slow or incomplete. The order ended up being:

1. **Security** — A vulnerable system makes every other fix pointless. SQL injection, disabled auth, exposed passwords, and forever-tokens were the first four things I addressed.
2. **Concurrency** — The queue race condition was the next highest risk. Duplicate tokens in a hospital queue is a patient safety issue, not just a UX annoyance.
3. **Performance** — N+1 queries and sequential DB calls don't cause data corruption but they make the app unusable at scale. Fixed after correctness was established.
4. **Frontend crashes** — The null crash and memory leak affect users but are contained to the client. Important but lower priority than backend correctness.
5. **Incomplete features** — The history records page was the only clearly missing piece. Implemented once everything else was stable.

### Key Decisions

**Prisma ORM over raw parameterized SQL for injection fix**  
The easy fix would have been to switch from `$queryRawUnsafe` to `$queryRaw` with tagged template literals. I went further and replaced it with the Prisma query builder entirely because the codebase uses it everywhere else and raw SQL in one spot is an inconsistency that's easy to copy-paste badly in future.

**`groupBy` aggregation over per-doctor queries in reports**  
The straightforward fix to the sequential problem would have been `Promise.all` over per-doctor `count()` calls. But that's still O(n) queries — just concurrent. I replaced the whole thing with two `groupBy` aggregations that return counts for all doctors in a single query each, then assembled the report data in memory. Scales properly regardless of how many doctors are in the system.

**`$transaction` over application locking for queue tokens**  
An in-process mutex would fix the race condition in development but breaks immediately when you run multiple Node processes. Using Prisma's interactive transaction pushes the atomicity down to the database where it belongs and works correctly under any deployment topology.

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (`jsonwebtoken`) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

*Submitted by Nithin K R — Figital Labs SDE Internship, HAQMS Engineering Evaluation*
Done

You are out of free messages until 2:10 AM
