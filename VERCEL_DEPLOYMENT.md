# StudyAI Vercel Deployment Guide

This guide describes how to deploy the StudyAI application (frontend and backend) to **Vercel** as a single unified project using Serverless Functions for the Express backend and static hosting for the React/Vite frontend.

---

## ⚡ Deployment Checklist

Before initiating the deployment in Vercel, ensure you have gathered the following secrets and environment variables:

| Environment Variable | Where to find / What it is | Required for |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL database connection string (e.g., `postgresql://...`) | Database persistence |
| `JWT_ACCESS_SECRET` | A secure, random string (e.g., generated with `openssl rand -base64 32`) | Access token signing |
| `JWT_REFRESH_SECRET` | A secure, random string | Refresh token signing |
| `GEMINI_API_KEY` | Google Gemini API Key | AI Study Coach & Planner features |
| `NODE_ENV` | Set to `production` | Node.js production optimization |

---

## 🚀 Step-by-Step Vercel Setup

### 1. Import Repository
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** > **Project**.
3. Import your StudyAI GitHub repository.

### 2. Configure Project Settings
In the **Configure Project** window:
- **Framework Preset**: Select **Vite**. The checked-in `vercel.json` also sets `framework: "vite"` so Vercel does not classify the root `api/index.js` Express function as the project framework.
- **Root Directory**: Leave as the **root directory** of your repository (`./` or `/`). Do *not* select `FrontEnd` or `BackEnd` as the root, as our configuration wraps both from the project root.
- **Build and Development Settings**:
  - The checked-in `vercel.json` installs the frontend and backend dependencies, generates the Prisma Client, and builds the frontend into `dist/`.
- **Environment Variables**:
  - Add all environment variables listed in the checklist above (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`, and `NODE_ENV=production`).

### 3. Click Deploy!
Vercel will:
1. Run `npm install` at the root.
2. Run the checked-in Vercel build command, which generates the Prisma Client and builds the Vite frontend.
3. Automatically serve the built static assets from `/dist` on your custom Vercel domain.
4. Route all `/api/*` traffic to the Serverless Function at `api/index.js`, which connects to Neon PostgreSQL through Prisma and fires up the Express router.

### Prisma and database migrations

The backend uses Prisma **7.8.0** with PostgreSQL on Neon:

- `BackEnd/prisma.config.ts` supplies `DATABASE_URL` to Prisma CLI commands.
- `BackEnd/config/prisma.js` uses `@prisma/adapter-pg` with the same `DATABASE_URL` for the application client.
- Prisma Client generation runs during the backend package `postinstall` and is repeated by the root and Vercel build commands.

There is currently **no committed Prisma migration history** under `BackEnd/prisma/migrations/`. Production deployment therefore does **not** run `prisma migrate deploy` or `prisma db push`; Vercel only generates the client and builds the frontend. This avoids changing an existing Neon database based on an unverified baseline.

Before introducing the first migration, an operator must explicitly identify the intended Neon database, take an appropriate backup, and inspect it using read-only commands. From `BackEnd/`, with `DATABASE_URL` set only to that verified target, review both migration status and the schema diff:

```bash
npx prisma migrate status --config prisma.config.ts
npx prisma migrate diff \
  --config prisma.config.ts \
  --from-config-datasource \
  --to-schema=prisma/schema.prisma
```

Do not apply the generated diff automatically. If the live schema exactly matches this Prisma schema and the database has no Prisma migration history, create a reviewed baseline migration from the schema, then mark that baseline as applied with `prisma migrate resolve --applied <migration-name>`; this records history without replaying the baseline SQL against existing data. For example, after that exact-match review and explicit approval, the baseline SQL can be generated locally with:

```bash
mkdir -p prisma/migrations/00000000000000_baseline
npx prisma migrate diff \
  --config prisma.config.ts \
  --from-empty \
  --to-schema=prisma/schema.prisma \
  --script > prisma/migrations/00000000000000_baseline/migration.sql
npx prisma migrate resolve \
  --config prisma.config.ts \
  --applied 00000000000000_baseline
```

The generated SQL must be reviewed and committed, but must not be executed against the existing database as part of baselining. If the diff shows any discrepancy, reconcile it with a separately reviewed migration plan first. Never use `migrate reset`, `db push`, or an unverified `DATABASE_URL` for this process.

Once a verified baseline exists, future migrations should be created against a disposable development database, committed under `BackEnd/prisma/migrations/`, reviewed, and applied by an explicitly approved release step targeting the intended Neon environment. Do not add migration execution to the Vercel build until that baseline and target verification are complete.

---

## 🛠️ Local Testing (Optional)

If you want to test the serverless routing locally before committing changes:
1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Link the project and start the local development server:
   ```bash
   vercel dev
   ```
This will run both your static assets and serverless functions concurrently on a local port (usually `http://localhost:3000`), mirroring Vercel's production environment.
