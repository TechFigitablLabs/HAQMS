# HAQMS Engineering Audit — Nithin K R

## Overview

Full audit of the Hospital Appointment and Queue Management System (HAQMS). All five challenge categories addressed across 12 files changed.

---

## Issues Identified & Fixes Implemented

### Challenge 1 — Security

#### 1. Plaintext Password Logging
**File:** `backend/src/routes/auth.js`  
**Bug:** Both `/register` and `/login` logged raw passwords via `console.log` — any log aggregator (Datadog, CloudWatch) would store them in plaintext.  
**Fix:** Removed all sensitive `console.log` calls. Server logs now only record the event type, never credentials.

#### 2. JWT Never Expires
**File:** `backend/src/middleware/auth.js`, `backend/src/routes/auth.js`  
**Bug:** Tokens signed with `expiresIn: '365d'`. Middleware used `{ ignoreExpiration: true }` — meaning a stolen token was valid indefinitely.  
**Fix:** Token TTL reduced to `8h`. `ignoreExpiration: true` removed. `TokenExpiredError` now returns a clean 401 with no internal details.

#### 3. Password Hash Returned in Register Response
**File:** `backend/src/routes/auth.js`  
**Bug:** `prisma.user.create()` result returned directly, including the bcrypt hash.  
**Fix:** Response now explicitly selects only `{ id, email, name, role }`.

#### 4. SQL Injection in Doctor Search
**File:** `backend/src/routes/doctors.js`  
**Bug:** `$queryRawUnsafe` with string interpolation. Exploit: `search=x' UNION SELECT id,email,password...--`  
**Fix:** Replaced with Prisma `findMany({ where: { name: { contains: search, mode: 'insensitive' } } })`. No raw SQL.

#### 5. Bypassed Admin Authorization
**File:** `backend/src/middleware/auth.js`, `backend/src/routes/patients.js`  
**Bug:** `authorizeAdminOnlyLegacy` had the actual role check commented out. Any authenticated user (receptionist, doctor) could DELETE patients.  
**Fix:** Replaced with `authorizeAdminOnly` that actually checks `req.user.role !== 'ADMIN'`.

#### 6. Error Responses Leaking Internals
**Files:** Multiple routes, `index.js`  
**Bug:** Error responses returned `databaseError`, `sqlMessage`, `errorStack`, full `err.stack`.  
**Fix:** All error handlers return a generic message. Stack traces only in `NODE_ENV !== 'production'`.

#### 7. Broad CORS + Missing JWT_SECRET Guard
**File:** `backend/src/index.js`  
**Fix:** CORS restricted to `CORS_ORIGINS` env var (defaults to `localhost:3000`). App crashes at startup if `JWT_SECRET` is not set.

#### 8. Input Validation Gaps
**Files:** `auth.js`, `patients.js`  
**Fix:** Added email regex, minimum password length (8), phone number format regex (`/^[\d\s\-+().]{7,20}$/`), age range check.

---

### Challenge 2 — Backend Performance & Concurrency

#### 9. N+1 Query in Appointments
**File:** `backend/src/routes/appointments.js`  
**Bug:** For every appointment in the list, 2 extra queries fired (`patient` + `doctor` lookup). 50 appointments = 101 DB round-trips.  
**Fix:** Single `prisma.appointment.findMany({ include: { patient, doctor } })` — one query with JOIN.

#### 10. Sequential Async Queries in Doctor Stats
**File:** `backend/src/routes/doctors.js`  
**Bug:** 4 independent `await prisma.*` calls ran one-after-the-other, blocking the event loop.  
**Fix:** `Promise.all([count, count, aggregate, aggregate])` — all run in parallel.

#### 11. Slow Nested Loop in Reports
**File:** `backend/src/routes/reports.js`  
**Bug:** For each doctor: 5 separate DB calls + `80ms` artificial sleep. With 10 doctors = 50 queries + 800ms minimum latency.  
**Fix:** 3 parallel queries using `Promise.all` — `findMany` for doctors, `groupBy` for appointment status counts, `groupBy` for today's queue. Results merged in memory. O(n) → O(1) DB round-trips.

#### 12. Race Condition in Queue Check-in
**File:** `backend/src/routes/queue.js`  
**Bug:** Read max token → `setTimeout(350ms)` → write new token. The sleep intentionally widened the race window. Concurrent requests read the same max and both wrote the same token number.  
**Fix:** Wrapped in `prisma.$transaction()`. The aggregate + create are now atomic at the DB level. Also removed the artificial sleep entirely.

---

### Challenge 3 — Database & Schema

#### 13. In-Memory Pagination
**File:** `backend/src/routes/patients.js`  
**Bug:** `prisma.patient.findMany()` fetched **all** patients, then `Array.slice()` was used for pagination. With 10,000 patients this loads all of them into RAM on every request.  
**Fix:** `prisma.patient.findMany({ skip, take })` with `prisma.patient.count()` via `Promise.all` — database does the work.

#### 14. Appointment Double-booking
**File:** `backend/src/routes/appointments.js`  
**Bug:** Duplicate check only blocked exact millisecond matches. Two bookings 1 second apart were treated as unique.  
**Fix:** Window-based check: blocks any booking within ±30 minutes of an existing non-cancelled appointment for the same doctor.

---

### Challenge 4 — Frontend

#### 15. Memory Leak in Queue Monitor
**File:** `frontend/src/app/queue/page.js`  
**Bug:** `setInterval` in `useEffect` had no cleanup return. Every mount of the page created a new 3-second poll that ran forever — including after unmount, causing `setState` on unmounted components and server hammering.  
**Fix:** Added `return () => clearInterval(intervalId)` to the effect. One interval per mount, cleaned up on unmount.

#### 16. App Crash on Null Medical History
**File:** `frontend/src/app/dashboard/page.js`  
**Bug:** `selectedPatientHistory.medicalHistory.toUpperCase()` — `medicalHistory` is nullable in the schema. Patients like "Bruce Wayne" had `null`, which threw `Cannot read properties of null (reading 'toUpperCase')` and crashed the entire React tree.  
**Fix:** `selectedPatientHistory.medicalHistory?.toUpperCase() ?? <span>No medical history</span>`

#### 17. Keystroke-triggered API Calls (Search Re-render)
**File:** `frontend/src/app/dashboard/page.js`  
**Bug:** `useEffect` depended directly on `patientSearch`, so every character typed fired a fetch.  
**Fix:** Added debounced state (`debouncedSearch`) using `useRef` + `setTimeout(350ms)`. Fetch only fires 350ms after the user stops typing.

#### 18. Missing Link Import + AuthContext Response Shape
**Files:** `dashboard/page.js`, `AuthContext.js`  
**Bug:** `Link` was used in JSX but never imported (would crash at render). Login response expected `data.data.token` but backend was fixed to return flat `{ token, user }`.  
**Fix:** Added `import Link from 'next/link'`. Updated AuthContext to read `data.token`.

---

### Challenge 5 — Incomplete Feature

#### 19. Missing Patient History Records Page
**File:** `frontend/src/app/patients/[id]/history-records/page.js` (new)  
**Bug:** Route didn't exist — clicking "View Diagnostic Reports Details" returned a 404.  
**Built:**
- Auth-gated page using `useAuth` context
- Fetches patient via `GET /api/patients/:id` (includes appointments relation)
- Renders patient profile header (name, contact, age, gender)
- Clinical history section with null-safe rendering
- Full appointment history table sorted newest-first, with status badges
- Handles loading, error, and empty states cleanly

---

## Remaining Known Issues

These were noted but not fixed (out of prioritization scope):

- **AuthContext stores token in `localStorage`** — vulnerable to XSS. Production fix: `httpOnly` cookies via an auth endpoint.
- **`NEXT_PUBLIC_API_URL` hardcoded** in queue page and AuthContext — should be env var in `.env.local`.
- **No rate limiting** on auth endpoints — brute-force login still possible.
- **No unique DB index** on `(doctorId, appointmentDate)` — the window check in code is better, but a DB constraint would be the definitive guard.
- **Appointment status PATCH has no authorization** — any authenticated user can flip any appointment to COMPLETED/CANCELLED. Should be role-restricted.

---

## Approach & Prioritization Rationale

**Priority order: Security → Correctness → Performance → UX**

The SQL injection and bypassed admin check were fixed first because they represent full data compromise. Credential logging was next because it silently violates compliance (HIPAA-adjacent for healthcare). JWT misconfiguration third because it makes credential theft permanent.

The N+1 and sequential queries were next — these are correctness issues masquerading as performance ones; under load they'd bring down the service. The race condition was treated as correctness too (wrong data is worse than slow data).

Frontend crash and memory leak were fixed because they're user-facing breakages. The history-records page was built last as it was purely additive.

I chose not to add rate limiting or DB index constraints — they'd require schema migrations and a proper Redis setup which goes beyond what can be validated in a local evaluation environment. The notes above document exactly what would be needed.
