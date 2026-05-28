# HAQMS Deployment (Railway / Railpack)

HAQMS is a monorepo. **Do not deploy from the repo root unless you use the root `railpack.json`.** Prefer setting a **Root Directory** per service.

## Recommended: two Railway services

### 1) Backend API

| Setting | Value |
|--------|--------|
| **Root Directory** | `backend` |
| **Start command** | (auto) `node scripts/start-prod.js` via `backend/railpack.json` |

**Environment variables:**

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | PostgreSQL URL from Railway Postgres plugin, or one of `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_PRIVATE_URL`, `POSTGRESQL_URL` |
| `JWT_SECRET` | Long random string |
| `NODE_ENV` | `production` |
| `PORT` | Set by Railway (do not hardcode) |

After deploy, run seed once if needed:

```bash
npx prisma db seed
```

### 2) Frontend (Next.js)

| Setting | Value |
|--------|--------|
| **Root Directory** | `frontend` |
| **Build** | `npm run build` (Railpack detects Next.js) |
| **Start** | `npm run start` |

**Environment variables:**

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app/api` |

## Root-directory deploy (single service)

If Railway builds the **repository root**, use the root `railpack.json` (installs `backend/`, runs migrations, starts API). This deploys **backend only**, not the Next.js app.

## Fix: "No start command detected"

Railpack failed because the root `package.json` had no `start` script. Fix by either:

1. Set **Root Directory** to `backend` or `frontend`, or  
2. Use root `railpack.json` (included in this repo).

## PR vs deploy

- Your **fork branch** can be deployed anytime for demo/staging.
- **Production** tied to upstream `main` should wait for PR merge if that is your team policy.
