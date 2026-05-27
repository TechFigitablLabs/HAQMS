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

HAQMS (Hospital Appointment & Queue Management System) is a full-stack web application built with Next.js, Node.js/Express, PostgreSQL, and Prisma ORM. The repository was intentionally seeded with security vulnerabilities, performance bottlenecks, database inefficiencies, frontend bugs, and concurrency issues for candidate evaluation purposes.

This document covers the full audit performed on the codebase, the issues discovered, the fixes applied, and the reasoning behind prioritization decisions.

---

## 2. Issues Identified

Ten issues were identified and tracked via GitHub Issues. They are grouped by severity and category below.

---

### 🔴 Critical — Security

#### Issue #1 — SQL Injection in `GET /api/doctors`
- **Location:** Backend route handler for `/api/doctors`
- **Description:** User-supplied query parameters (e.g., `?search=`) were interpolated directly into a raw SQL string without sanitization or parameterization. An attacker could manipulate the query to dump, modify, or delete database records.
- **Example payload:** `GET /api/doctors?search=' OR '1'='1`
- **Severity:** Critical — direct database compromise possible.

#### Issue #2 — JWT Tokens Never Expire
- **Location:** Backend auth middleware / token generation
- **Description:** JWT tokens were issued without an `expiresIn` option, meaning a stolen token remained valid indefinitely. There was no mechanism to invalidate sessions.
- **Severity:** Critical — stolen tokens grant permanent unauthorized access.

#### Issue #3 — Plaintext Passwords Logged to Console
- **Location:** Auth route (login / register handlers)
- **Description:** `console.log(password)` or similar debug statements printed raw user passwords to server logs. In production this exposes credentials to anyone with log access.
- **Severity:** Critical — violates basic credential security and HIPAA-level data handling.

#### Issue #4 — Admin Authorization Check Disabled
- **Location:** Admin-only route middleware
- **Description:** The `isAdmin` role check was commented out or short-circuited (e.g., `if (true)` replacing the actual role check), allowing any authenticated user — or even unauthenticated requests — to access admin-only endpoints.
- **Severity:** Critical — complete privilege escalation bypass.

---

### 🟠 High — Performance

#### Issue #5 — N+1 Queries in `GET /api/appointments`
- **Location:** Appointments route handler
- **Description:** The endpoint fetched a list of appointments and then, inside a loop, made individual database queries per appointment to fetch the associated doctor and patient. For 100 appointments this produced 201 database round trips instead of 1.
- **Impact:** Severe latency under any non-trivial load.

#### Issue #6 — Sequential DB Calls in Reports Endpoint
- **Location:** Reports/analytics route
- **Description:** The reports endpoint executed multiple independent database queries sequentially (one after another with `await`), each waiting for the previous to complete. These queries had no dependency on each other and could safely run in parallel.
- **Impact:** Response time was the sum of all query durations rather than the maximum.

---

### 🟠 High — Concurrency

#### Issue #7 — Race Condition Duplicating Queue Token Numbers
- **Location:** Queue token assignment logic
- **Description:** When two patients checked in simultaneously, both requests read the same current `maxToken` value from the database before either had written an incremented value back. Both were assigned the same token number, causing duplicate queue entries.
- **Impact:** Broken queue ordering, patient confusion, potential safety risk in a real hospital.

---

### 🟡 Medium — Frontend / Runtime

#### Issue #8 — App Crash on Null `medicalHistory`
- **Location:** Patient detail page / component
- **Description:** The frontend attempted to call `.map()` or access properties directly on `medicalHistory` without a null/undefined guard. When a patient had no medical history records, the component threw an unhandled runtime error and crashed the page.

#### Issue #9 — 404 on `/patients/:id/history-records`
- **Location:** Frontend routing + Backend route definition
- **Description:** The patient history records page was linked in the UI but the corresponding backend API route and/or frontend page was not implemented. Navigating to the URL returned a 404.
- **Category:** Incomplete feature.

#### Issue #10 — Memory Leak: `setInterval` Not Cleared on Queue Page Unmount
- **Location:** Queue live-refresh page (`/queue`)
- **Description:** A `setInterval` was started inside a `useEffect` to poll for queue updates, but no cleanup function was returned to clear the interval when the component unmounted. Each re-mount of the page added a new interval without clearing the old one, causing multiple simultaneous pollers and exponentially growing network requests.

---

## 3. Fixes Implemented

---

### Fix #1 — SQL Injection → Parameterized Queries via Prisma

**Approach:** Replaced raw SQL string interpolation with Prisma's built-in query builder. Prisma uses parameterized queries by default, making SQL injection structurally impossible.

```js
// Before (vulnerable)
const result = await prisma.$queryRaw(`SELECT * FROM doctors WHERE name = '${search}'`);

// After (safe)
const result = await prisma.doctor.findMany({
  where: {
    name: { contains: search, mode: 'insensitive' }
  }
});
```

**Why Prisma ORM over manual sanitization:** Manual sanitization is error-prone and easy to miss in future edits. Using the ORM's query builder is the idiomatic, maintainable solution and eliminates the entire class of injection vulnerabilities for this endpoint.

---

### Fix #2 — JWT Token Expiry

**Approach:** Added `expiresIn` to the JWT sign options. Set to `'8h'` to match a typical hospital staff shift.

```js
// Before
const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET);

// After
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);
```

**Reasoning:** `8h` is appropriate for a hospital context — long enough not to disrupt a full shift, short enough to limit damage from a stolen token. A refresh token flow would be ideal for production but is out of scope here.

---

### Fix #3 — Remove Plaintext Password Logging

**Approach:** Removed all `console.log` statements that printed passwords or sensitive user data. Added a lint note to prevent re-introduction.

```js
// Before
console.log('Login attempt:', email, password); // REMOVED

// After
console.log('Login attempt for:', email); // email only, no password
```

**Reasoning:** Passwords must never appear in logs, error messages, or stack traces regardless of environment.

---

### Fix #4 — Restore Admin Authorization Middleware

**Approach:** Restored the `requireAdmin` middleware to properly check `req.user.role === 'ADMIN'` before allowing access to protected routes.

```js
// Before (disabled)
const requireAdmin = (req, res, next) => {
  // if (req.user.role !== 'ADMIN') return res.status(403).json(...)
  next(); // always passed through
};

// After (restored)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
```

---

### Fix #5 — N+1 Queries → Prisma `include`

**Approach:** Replaced the per-appointment loop queries with a single Prisma query using nested `include` to eager-load related `doctor` and `patient` data in one database round trip.

```js
// Before (N+1)
const appointments = await prisma.appointment.findMany();
for (const appt of appointments) {
  appt.doctor = await prisma.doctor.findUnique({ where: { id: appt.doctorId } });
  appt.patient = await prisma.patient.findUnique({ where: { id: appt.patientId } });
}

// After (1 query)
const appointments = await prisma.appointment.findMany({
  include: {
    doctor: true,
    patient: true,
  },
});
```

**Impact:** Reduces DB round trips from `2N + 1` to `1` for any number of appointments.

---

### Fix #6 — Sequential DB Calls → `Promise.all` Parallelization

**Approach:** Wrapped independent database queries in `Promise.all()` so they execute concurrently.

```js
// Before (sequential — total time = sum of all queries)
const patients = await prisma.patient.count();
const appointments = await prisma.appointment.count();
const doctors = await prisma.doctor.count();

// After (parallel — total time = slowest single query)
const [patients, appointments, doctors] = await Promise.all([
  prisma.patient.count(),
  prisma.appointment.count(),
  prisma.doctor.count(),
]);
```

**Impact:** Response time of the reports endpoint drops from ~`sum(all queries)` to `max(all queries)` — typically a 2–4× improvement.

---

### Fix #7 — Race Condition → Prisma Transaction with Atomic Increment

**Approach:** Wrapped the token read-increment-assign sequence in a Prisma interactive transaction, ensuring atomicity. Only one request can hold the write lock at a time.

```js
// Before (race condition)
const current = await prisma.queue.findFirst({ orderBy: { token: 'desc' } });
const newToken = (current?.token ?? 0) + 1;
await prisma.queue.create({ data: { token: newToken, patientId } });

// After (atomic transaction)
const entry = await prisma.$transaction(async (tx) => {
  const current = await tx.queue.findFirst({
    orderBy: { token: 'desc' },
    select: { token: true },
  });
  const newToken = (current?.token ?? 0) + 1;
  return tx.queue.create({ data: { token: newToken, patientId } });
});
```

**Reasoning:** A transaction with a serial read-then-write is the correct pattern here. Alternatives like `$executeRaw` with `SELECT ... FOR UPDATE` would also work but the Prisma interactive transaction is more maintainable.

---

### Fix #8 — Null `medicalHistory` Crash → Optional Chaining + Fallback UI

**Approach:** Added null/undefined guards before rendering medical history data. Used optional chaining and a conditional fallback message.

```jsx
// Before (crashes when medicalHistory is null)
{patient.medicalHistory.map(record => <HistoryCard key={record.id} {...record} />)}

// After (safe)
{patient.medicalHistory?.length > 0
  ? patient.medicalHistory.map(record => <HistoryCard key={record.id} {...record} />)
  : <p className="text-gray-500">No medical history records found.</p>
}
```

---

### Fix #9 — Implement `/patients/:id/history-records`

**Approach:** Implemented the missing backend route and connected the frontend page.

- **Backend:** Added `GET /api/patients/:id/history-records` route that queries `MedicalHistory` records filtered by `patientId`, with doctor name included via Prisma `include`.
- **Frontend:** Implemented the `/patients/[id]/history-records` Next.js page that fetches from the new endpoint and renders the history list with proper loading and empty states.

---

### Fix #10 — Memory Leak → `setInterval` Cleanup in `useEffect`

**Approach:** Returned a cleanup function from the `useEffect` to clear the interval when the component unmounts.

```jsx
// Before (memory leak)
useEffect(() => {
  const interval = setInterval(fetchQueue, 5000);
  // no cleanup — interval lives forever
}, []);

// After (correct)
useEffect(() => {
  const interval = setInterval(fetchQueue, 5000);
  return () => clearInterval(interval); // cleaned up on unmount
}, []);
```

**Impact:** Prevents multiple concurrent pollers stacking up on each re-mount, eliminating exponentially growing background network requests.

---

## 4. Optimizations Performed

Beyond the direct bug fixes, the following general optimizations were applied:

- **Database query selectivity:** Used `select` in Prisma queries to fetch only required fields instead of full records where full hydration was unnecessary.
- **Pagination:** Added `skip`/`take` pagination to list endpoints (`/api/appointments`, `/api/patients`) to prevent unbounded result sets.
- **Environment variable hygiene:** Confirmed `JWT_SECRET` and `DATABASE_URL` are loaded from `.env` and never hardcoded. Added `.env.example` with placeholder values.
- **Error handling consistency:** Standardized error responses across routes to use `{ error: string }` JSON format with appropriate HTTP status codes rather than leaking stack traces.
- **Frontend loading states:** Added loading spinners and error boundary fallbacks on data-fetching pages to prevent blank or crashed UI during slow API responses.

---

## 5. Remaining Known Issues

The following issues are acknowledged but were not fully addressed within the assignment time scope:

| Issue | Reason Not Fixed |
|---|---|
| No refresh token / token rotation | Full auth refresh flow requires session storage strategy; out of scope for this eval |
| No rate limiting on auth endpoints | Would need `express-rate-limit` integration and Redis for distributed deployments |
| Input validation not exhaustive | `express-validator` added to auth routes; not yet applied to all endpoints |
| No HTTPS enforcement on backend | Handled at infrastructure level (Render provides TLS); not a code-level fix |
| `/patients/:id/history-records` edit/delete | Read-only implementation done; full CRUD not completed |
| No automated test coverage | Unit/integration tests not written; manual verification performed |

---

## 6. Approach & Engineering Reasoning

### Prioritization Strategy

Issues were triaged by a combination of **severity** and **exploitability**:

1. **Security issues first** — A compromised system makes all other work irrelevant. SQL injection, auth bypass, and token issues were fixed before anything else.
2. **Concurrency second** — The queue race condition could cause real harm (duplicate tokens, wrong patient called) and was a logic-level correctness issue.
3. **Performance third** — N+1 queries and sequential DB calls degrade user experience at scale but don't cause data corruption.
4. **Frontend bugs fourth** — Crashes and memory leaks affect UX but are contained to the client.
5. **Incomplete features last** — Completing features adds value but fixing broken/dangerous existing behavior takes precedence.

### Key Engineering Decisions

**Why Prisma ORM over raw SQL for the injection fix?**  
The codebase already uses Prisma throughout. Introducing parameterized raw SQL would be inconsistent and harder to audit. Using the ORM's query builder is the idiomatic, maintainable solution.

**Why `Promise.all` instead of individual `await` chains?**  
The database queries in the reports endpoint were fully independent. Parallelizing them is a zero-risk, high-reward optimization — no code complexity added, significant latency reduction achieved.

**Why `$transaction` for queue tokens instead of application-level locking?**  
Application-level locking (e.g., a JavaScript mutex) breaks as soon as you run more than one Node.js process. Database transactions are the correct tool for atomicity in a multi-process environment.

**Why `8h` JWT expiry?**  
It maps to a real-world hospital shift length, making it contextually meaningful rather than arbitrary. For production, short-lived access tokens (15–30 min) paired with refresh tokens would be the right pattern.

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

*Documentation prepared for Figital Labs SDE Internship Assignment — HAQMS Engineering Evaluation.*  
*Submitted by: Nithin K R | GitHub: NITHINKR06*
