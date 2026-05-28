 HAQMS Implementation Summary

This document records the fixes and improvements performed during setup and debugging.

 1) Environment and Runtime Setup

- Installed dependencies for workspace, backend, and frontend.
- Started PostgreSQL via Docker.
- Created backend `.env` from `.env.example`.
- Ran Prisma migration and seed for initial data.
- Started frontend (`3000`) and backend (`5000`) dev servers.

 2) Physician Registry SQL Injection Fix

 Backend
- File: `backend/src/routes/doctors.js`
- Replaced vulnerable raw SQL (`$queryRawUnsafe`) with Prisma `findMany({ where })`.
- Search now uses safe case-insensitive `contains` filtering.
- Removed SQL error detail leakage in API response.

 Frontend
- File: `frontend/src/app/dashboard/page.js`
- Removed hardcoded "SQL Vulnerability alert" block.
- Added a "SQL security fix applied" status notice.
- Updated labels/messages from SQL-centric wording to normal search behavior.

 3) Appointment Booking N+1 and Slot Conflict Fix

 Backend
- File: `backend/src/routes/appointments.js`
- Replaced manual N+1 appointment enrichment with Prisma `include` on `patient` and `doctor`.
- Responses now return appointment rows with related patient and doctor data in a single query.
- Strengthened duplicate booking prevention by blocking same-doctor bookings within a one-hour slot instead of requiring an exact millisecond match.
- Added validation for invalid appointment dates.

 Frontend
- No frontend changes required for this fix; the booking API behavior is now safer and more consistent.

 4) System Audit Report Performance Fix

 Backend
- File: `backend/src/routes/reports.js`
- Replaced sequential per-doctor query loop with parallelized aggregation (`Promise.all`).
- Removed artificial delay that slowed report generation.
- Added optimization metadata in response payload.

 Frontend
- File: `frontend/src/app/dashboard/page.js`
- Replaced old warning with fixed-status performance message.
- Updated loading and helper copy to match optimized behavior.

 4) Patient Registry Delete + Phone Validation

 Delete now works with dependent data
- File: `backend/src/routes/patients.js`
- Deletion now runs in transaction:
  1. `queueToken.deleteMany`
  2. `appointment.deleteMany`
  3. `patient.delete`
- Prevents foreign key failures during patient deletion.

 Phone validation
- Files:
  - `backend/src/routes/patients.js`
  - `frontend/src/app/dashboard/page.js`
- Added strict validation rules:
  - 7-15 digits required
  - allowed: spaces, dashes, parentheses, optional leading `+`
- Added frontend field pattern/title and backend validation response.

 UI messaging
- File: `frontend/src/app/dashboard/page.js`
- Added fixed-status note in Patient Registry describing deletion fix.

 5) Queue Check-in Reliability and Reassignment

 Duplicate check-in prevention and idempotency
- File: `backend/src/routes/queue.js`
- Added transaction and advisory lock for concurrency-safe token assignment.
- If same patient is already active for same doctor/day, existing token is reused.

 Reassignment confirmation flow
- Files:
  - `backend/src/routes/queue.js`
  - `frontend/src/app/dashboard/page.js`
- If patient already has active token under another doctor:
  - API returns `409` with reassignment requirement.
  - UI shows confirmation popup.
  - Confirming triggers forced reassignment.

 Runtime bug fixed after queue update
- File: `backend/src/routes/queue.js`
- Advisory lock query initially used `$queryRaw`, causing Prisma deserialization failure (`void` type).
- Fixed by switching to `$executeRaw`.

 6) Public Queue Monitor Improvements

 Monitor sync error fix
- Root cause: `/api/queue` was protected by auth while public monitor fetches without token.
- File: `backend/src/routes/queue.js`
- Restored public read-only access for `GET /api/queue`.

 Polling efficiency fix
- File: `frontend/src/app/queue/page.js`
- Replaced fixed 3-second interval with adaptive polling:
  - faster when queue is active
  - slower when idle
  - slowest when tab is hidden
- Added timer cleanup to prevent memory leaks on unmount.

 UI messaging
- File: `frontend/src/app/queue/page.js`
- Added fixed-status notes:
  - adaptive polling optimization
  - mention of temporary sync break after auth hardening and subsequent fix

 7) Admin Hardening and Stability Pass

 Auth and authorization hardening
- File: `backend/src/middleware/auth.js`
- Token verification now respects expiration (removed `ignoreExpiration`).
- Removed detailed token error leakage in responses.
- Enforced true admin role check in `authorizeAdminOnlyLegacy`.

 Auth route security cleanup
- File: `backend/src/routes/auth.js`
- Removed sensitive credential logging.
- Registration response no longer returns password hash.
- Reduced token expiry from `365d` to `8h`.
- Added strict email validation and normalization for login/register requests.
- Forced safe role assignment on register, preventing arbitrary role injection.
- Standardized auth responses so `/login`, `/register`, and `/me` all return the same success/data envelope.
- Removed stack/database detail leaks from responses.

 Global error response sanitization
- File: `backend/src/index.js`
- Removed stack/message leakage in global 500 response payload.

 Dashboard stability fix
- File: `frontend/src/app/dashboard/page.js`
- Fixed potential hook-order instability by avoiding early return before state hooks.
- Fixed patient history null-crash by handling missing `medicalHistory` safely.

 Missing page implementation (previous 404)
- File: `frontend/src/app/patients/[id]/history-records/page.js`
- Implemented the missing "Diagnostic Reports Details" route.
- Added authenticated patient history view with appointment records.