import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import confirmRegistrationHandler from './api/email/confirm-registration.ts';
import emailStatusHandler from './api/email/status.ts';
import mapsConfigHandler from './api/maps/config.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const getCliArg = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const eqArg = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return eqArg ? eqArg.slice(flag.length + 1) : undefined;
};

const cliPort = Number(getCliArg('--port'));
const envPort = Number(process.env.PORT);
const nginxPort = Number(process.env.NGINX_PORT);
const defaultAppPort = Number(process.env.DEFAULT_APP_PORT) || 3000;
const port =
  cliPort > 0
    ? cliPort
    : envPort > 0 && envPort !== nginxPort
      ? envPort
      : defaultAppPort;
const host = getCliArg('--host') || '0.0.0.0';

app.use(express.json({ limit: '2mb' }));

// Maps Config Route (Provides client-restricted public API key for @vis.gl/react-google-maps)
app.all('/api/maps/config', (req, res) => {
  mapsConfigHandler(req, res);
});

// Gmail SMTP & Firebase Admin Readiness Status (no secrets exposed)
app.all('/api/email/status', (req, res) => {
  emailStatusHandler(req, res);
});

// Official Registration Confirmation Email Endpoint (Gmail SMTP via Nodemailer)
app.all('/api/email/confirm-registration', async (req, res) => {
  await confirmRegistrationHandler(req, res);
});

// Broadcast endpoint removido — apenas email de confirmação de inscrição é enviado automaticamente.

// Always serve Service Worker without aggressive HTTP cache so updates propagate immediately
app.get('/sw.js', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// Mount Vite in development or serve dist in production
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      allowedHosts: true,
      hmr: false,
      ws: false,
      watch: null
    },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  // Fallback to transform and serve index.html for all non-API GET routes
  app.use('*', async (req, res, next) => {
    if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
      return next();
    }
    try {
      const indexPath = path.resolve(__dirname, 'index.html');
      let template = fs.readFileSync(indexPath, 'utf-8');
      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace?.(e);
      next(e);
    }
  });
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
