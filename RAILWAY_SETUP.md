# Railway Deployment Setup

## Prerequisites

- A Railway account (https://railway.app)
- A GitHub repository containing this project

## Steps

### 1. Create a new Railway project

1. Log into Railway and click "New Project"
2. Select "Deploy from GitHub repo" and connect this repository
3. Railway will auto-detect the `railway.json` configuration

### 2. Add PostgreSQL plugin

1. In your Railway project, click "+ New" → "Database" → "PostgreSQL"
2. Railway auto-injects the `DATABASE_URL` environment variable into your service

### 3. Set environment variables

In your Railway service settings, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | *(auto-injected by Railway Postgres plugin)* | Do NOT set manually |
| `JWT_SECRET` | Generate with: `openssl rand -hex 32` | Must be a long random string |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | *(auto-injected by Railway)* | Do NOT set manually |
| `SEED_MANAGER_EMAIL` | Your admin email, e.g. `admin@example.com` | Used by seed script |
| `SEED_MANAGER_PASSWORD` | A strong password | Used by seed script |

### 4. Deploy

Railway will automatically build and deploy when you push to your main branch.

The build process:
1. Installs dependencies (`npm install`)
2. Builds the client (`vite build`) and server (`tsc`)
3. Copies client build output to `packages/server/dist/public/`
4. Runs Prisma migrations (`prisma migrate deploy`)
5. Generates Prisma client (`prisma generate`)
6. Starts the server (`node packages/server/dist/server.js`)

### 5. Create the first manager account

After the first deployment succeeds, run the seed script via Railway CLI:

```bash
railway run --service <your-service-name> npx ts-node packages/server/prisma/seed.ts
```

Or use the Railway shell:
```bash
npx ts-node packages/server/prisma/seed.ts
```

This creates a manager account using `SEED_MANAGER_EMAIL` and `SEED_MANAGER_PASSWORD` env vars.

## Accessing the app

Once deployed, Railway provides a public URL (e.g., `https://your-app.up.railway.app`).

- **Drivers** log in and use Check-In / Check-Out forms
- **Fleet Managers** log in and access Inventory, Discrepancies, Reports, and Admin pages
