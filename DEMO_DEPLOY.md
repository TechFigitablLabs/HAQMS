# HAQMS — Public Demo Deployment (Vercel + Render)

This guide prepares the repository for a public demo: frontend on Vercel, backend on Render (Docker). I added a backend `Dockerfile` and entrypoint `run.sh`, and a `vercel.json` for the frontend.

What I added
- `backend/Dockerfile` — builds backend image and runs the entrypoint.
- `backend/run.sh` — generates Prisma client, runs migrations, seeds DB, and starts the server.
- `frontend/vercel.json` — minimal Vercel config for Next.js.

Recommended providers
- Frontend: Vercel (free tier, seamless Next.js support)
- Backend: Render (web service from Docker image) or Railway/Heroku. Any provider that supports Docker works.

Steps — high level

1) Push your repo to GitHub (if not already) and ensure the repo is public or accessible to the demo service.

2) Deploy backend on Render (Docker)

- Create a new Web Service → Connect your GitHub repo → Select the `backend` directory.
- Choose Dockerfile deployment (Render detects Dockerfile).
- Set the following environment variables in the Render service settings:
  - `DATABASE_URL` → e.g. `postgresql://<user>:<pass>@<host>:5432/<db>` (use managed Postgres from Render or Railway)
  - `JWT_SECRET` → choose a secret (for demo: `demo-secret`)
  - `PORT` → `5000`

- Render will build the Docker image. The container's `run.sh` will run `npx prisma generate`, `npx prisma migrate deploy`, then `node prisma/seed.js`, and finally `node src/index.js`.

3) Deploy Postgres

- Use Render managed Postgres, Railway, or Supabase. Provide the `DATABASE_URL` to the backend service.

4) Deploy frontend on Vercel

- Create a new project on Vercel → import the GitHub repo → point to the `frontend` directory.
- Set Environment Variables in Vercel project settings:
  - `NEXT_PUBLIC_API_BASE_URL` → `https://<your-backend-host>/api`

5) Verification

- Visit frontend URL (Vercel) → `/login` and sign in using seeded accounts (password: `password123`):
  - `reception1@haqms.com` (RECEPTIONIST)
  - `admin@haqms.com` (ADMIN)
  - `doctor1@haqms.com` (DOCTOR)

Notes & troubleshooting
- If migrations fail during image start because the database is not yet ready, Render will re-run the container; `run.sh` uses `|| true` to avoid hard failure on seed errors but migrations should be used carefully.
- If you prefer Render native build+deploy hooks instead of a Dockerfile, I can add a `render.yaml` with a `postdeploy` hook that runs `prisma migrate deploy` and `node prisma/seed.js`.

Would you like me to:
- Automatically add a `render.yaml` with a `postdeploy` hook? (yes/no)
- Or add CI workflow to build and push the backend image to GitHub Container Registry and then deploy?

Automated deploy via GitHub Actions (added)
- I added a GitHub Actions workflow at `.github/workflows/deploy.yml` that:
  - Builds and deploys the `frontend` to Vercel (uses `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets).
  - Builds and pushes a Docker image for the `backend` to GitHub Container Registry and triggers a Render deploy (requires `RENDER_API_KEY` and `RENDER_SERVICE_ID` secrets).

Secrets you'll need to add to your GitHub repo (Settings → Secrets → Actions):
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `RENDER_API_KEY`, `RENDER_SERVICE_ID`

Files added by this change:
- `backend/Dockerfile`, `backend/run.sh`, `backend/.dockerignore`
- `render.yaml`
- `.github/workflows/deploy.yml`
- `frontend/vercel.json`

Push & trigger
1. Commit and push your branch to GitHub (main branch recommended):

```bash
git add .
git commit -m "chore(demo): add deploy assets for Vercel+Render"
git push origin main
```

2. Ensure the required secrets (listed above) are set in the GitHub repo.
3. On push to `main`, the workflow will run and deploy your sites.

If you'd like, I can also add a `render.yaml` `postdeploy` command that runs `npx prisma migrate deploy` and `node prisma/seed.js` in Render's deploy hooks — say `add render hook` and I'll add that.
