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
- **Framework Preset**: Select **Vite** or leave as **Other** (Vercel will auto-detect Vite inside the build outputs).
- **Root Directory**: Leave as the **root directory** of your repository (`./` or `/`). Do *not* select `FrontEnd` or `BackEnd` as the root, as our configuration wraps both from the project root.
- **Build and Development Settings**:
  - Keep default options. Vercel will automatically read the `"build"` script from the root `package.json` and output static assets to `dist/`.
- **Environment Variables**:
  - Add all environment variables listed in the checklist above (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`, and `NODE_ENV=production`).

### 3. Click Deploy!
Vercel will:
1. Run `npm install` at the root.
2. Run the root `build` script, which installs frontend/backend dependencies and builds the Vite frontend.
3. Automatically serve the built static assets from `/dist` on your custom Vercel domain.
4. Route all `/api/*` traffic to the Serverless Function at `api/index.js`, which connects to MongoDB and fires up the Express router.

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
