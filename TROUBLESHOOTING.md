# HAQMS Troubleshooting

## "Everything was fixed but errors came back"

Usually **three separate problems**, not broken fixes:

### 1. Prisma version mismatch (local / Railway runtime)

**Symptom:** `PrismaClientInitializationError` / `accelerateUrl is required` / `clientVersion: '7.8.0'`

**Cause:** `package-lock.json` or `npm install` pulled **Prisma 7**, while this project uses **Prisma 5** schema and `new PrismaClient()` without adapters.

**Fix:**

```powershell
cd backend
# Stop any running node server first (releases DLL lock on Windows)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
npx prisma generate
```

`backend/package.json` pins `prisma` and `@prisma/client` to **5.22.0**. Do **not** run `npm i prisma@latest`.

---

### 2. Railway: "No start command detected"

**Cause:** Building the **repo root** (`haqms-workspace`) which has no `start` script.

**Fix (pick one):**

- **Recommended:** Railway → Service → **Root Directory** = `backend` (or `frontend` for Next.js)
- Or use root `railpack.json` in this repo (backend only)

Set env vars: `DATABASE_URL`, `JWT_SECRET`. For frontend add `NEXT_PUBLIC_API_URL`.

See [DEPLOYMENT.md](./DEPLOYMENT.md).

---

### 3. Frontend works locally but not when deployed

**Cause:** API URL still `http://localhost:5000/api`.

**Fix:** Set `NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api` on the **frontend** Railway service and redeploy.

---

## Internship code fixes are still in place

These remain fixed in `backend/src` and `frontend/src`:

- No password logging; JWT secret required; SQL injection removed from doctor search
- Admin-only patient delete; N+1 removed; parallel stats; batch reports; queue race fix
- Schema constraints/indexes; SQL pagination; queue leak fix; null-safe medical history
- History records page at `/patients/[id]/history-records`

If you see old behavior, check you are on branch `fix/haqms-security-performance` and redeployed after push.

---

## Windows: `EPERM` on `prisma generate`

Stop the backend dev server and any IDE Prisma process, then:

```powershell
npx prisma generate
```
