# HAQMS Fix Summary

This document summarizes the issues identified, fixes implemented, optimizations performed, and remaining known risks after the audit.

## Issues, Fixes, And Reasoning

| # | Area | Issue Identified | Fix Implemented | Reasoning |
|---|------|------------------|-----------------|-----------|
| 1 | Patient History | Dashboard crashed when `medicalHistory` was `null`. | Added a fallback before rendering medical history. | The database allows empty history, so the UI must handle it safely. |
| 2 | Queue Page | Polling continued after leaving the queue page. | Added `clearInterval()` cleanup in the effect. | Timers must be cleaned up to prevent memory leaks and duplicate API calls. |
| 3 | Doctor Search | User input was inserted directly into raw SQL. | Replaced `$queryRawUnsafe` with parameterized `$queryRaw`. | Parameterized queries prevent SQL injection while keeping raw SQL support. |
| 4 | Authorization | Patient deletion was allowed for any authenticated user. | Added `ADMIN` role enforcement with `authorize('ADMIN')`. | Authentication proves identity; authorization controls permissions. |
| 5 | Prisma Schema | Common filters and relations had missing indexes. | Added indexes for doctors, appointments, and queue tokens. | Indexes improve performance for filtering, reports, and relation lookups. |
| 6 | Appointments API | Patient and doctor details were queried inside a loop. | Replaced per-row lookups with Prisma `include`. | Avoids N+1 queries and reduces database load. |
| 7 | Patient Records Page | Dashboard linked to a route that did not exist. | Added `/patients/[id]/history-records` page. | Fixes the 404 and completes the patient history workflow. |

## Optimizations Performed

| Area | Optimization |
|------|--------------|
| Appointments API | Reduced many per-row queries into one relational Prisma query. |
| Database | Added indexes based on actual backend query patterns. |
| Security | Removed unsafe SQL interpolation from doctor search. |
| Queue Page | Stopped duplicate background polling after page unmount. |
| Code Reuse | Reused existing auth middleware and patient API instead of adding duplicate logic. |

## Remaining Known Issues

| Area | Remaining Issue |
|------|-----------------|
| Frontend | Full lint still reports pre-existing React hook issues. |
| Auth | JWT verification still ignores token expiration. |
| Auth | JWT secret still has a hardcoded fallback. |
| API Errors | Some endpoints still expose internal error details. |
| Patients API | Filtering and pagination are still handled in memory. |
| Reports API | Report aggregation still performs sequential database work. |
| Appointments | Double-booking still needs a database-level unique constraint. |

## Approach

| Decision | Reason |
|----------|--------|
| Fixed security issues first. | SQL injection and authorization bugs have the highest risk. |
| Kept changes focused. | Smaller changes reduce regression risk and are easier to review. |
| Used existing project patterns. | Prisma relations, auth middleware, and Next.js App Router already fit the app. |
| Preserved response shapes where possible. | Avoids unnecessary frontend changes and keeps behavior stable. |
