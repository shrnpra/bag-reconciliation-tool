import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/authRouter';
import { driversRouter } from './routes/driversRouter';
import { storesRouter } from './routes/storesRouter';
import { visitsRouter } from './routes/visitsRouter';
import { discrepanciesRouter } from './routes/discrepanciesRouter';
import { bagsRouter } from './routes/bagsRouter';
import { dashboardRouter } from './routes/dashboardRouter';

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors());

// Request logging
app.use(requestLogger);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', authRouter);

// Driver and store routes (Req 1.1–1.6)
app.use('/api/drivers', driversRouter);
app.use('/api/stores', storesRouter);

// Visit routes (Req 2.x, 3.x)
app.use('/api/visits', visitsRouter);

// Discrepancy routes (Req 6.x)
app.use('/api/discrepancies', discrepanciesRouter);

// Bag tracking routes (bag-tracking-v2)
app.use('/api/bags', bagsRouter);
app.use('/api/dashboard', dashboardRouter);

// ─── Static file serving (Vite build output) ──────────────────────────────────
import path from 'path';

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Error handler — must be last
app.use(errorHandler);

// SPA catch-all — serves index.html for any non-API route (client-side routing)
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

export default app;
