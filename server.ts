import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

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

// Maps Config Route (Provides client-safe API key for @vis.gl/react-google-maps)
app.get('/api/maps/config', (_req, res) => {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';
  res.json({ apiKey });
});

// Gmail SMTP Provider Readiness Status (no secrets exposed)
app.get('/api/email/status', (_req, res) => {
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({
    smtpConfigured,
    activeProvider: smtpConfigured ? 'smtp' : 'none',
    hasRealServerDelivery: smtpConfigured,
    senderEmail: process.env.SMTP_USER || 'farmaciademinas.marketing@gmail.com'
  });
});

// Official Registration Confirmation Email Endpoint (Gmail SMTP via Nodemailer)
app.post('/api/email/confirm-registration', async (req, res) => {
  try {
    const { to, fullName, code, subject, bodyHtml, bodyText, replyTo } = req.body;
    if (!to || !code) {
      return res.status(400).json({ error: 'E-mail do participante e código de inscrição são obrigatórios.' });
    }

    const emailSubject =
      subject || `Inscrição Confirmada [Nº ${code}] · 1º Simpósio de Saúde Mental de Carangola - SUS`;

    let deliveryProvider: 'smtp' | 'pending_provider' = 'pending_provider';
    let actuallySent = false;
    let providerMessageId: string | undefined = undefined;
    let deliveryError: string | undefined = undefined;

    // Real transactional send via Gmail SMTP (Nodemailer)
    const smtpUser = process.env.SMTP_USER || 'farmaciademinas.marketing@gmail.com';
    const smtpPass = process.env.SMTP_PASS;

    if (smtpPass) {
      try {
        const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const fromAddress =
          process.env.SMTP_FROM || `"1º Simpósio de Saúde Mental - SUS Carangola" <${smtpUser}>`;

        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          replyTo: replyTo || smtpUser,
          subject: emailSubject,
          text: bodyText,
          html: bodyHtml
        });

        deliveryProvider = 'smtp';
        actuallySent = true;
        providerMessageId = info.messageId;
      } catch (smtpErr: any) {
        deliveryError = smtpErr?.message || String(smtpErr);
        console.warn('[E-mail SUS] Falha no envio Gmail SMTP:', deliveryError);
      }
    } else {
      deliveryError = 'Gmail SMTP não configurado: defina SMTP_USER e SMTP_PASS (Senha de App de 16 caracteres) no .env.';
    }

    console.log(
      `[E-mail SUS] Registro de confirmação (Gmail SMTP, enviado=${actuallySent}) para ${to} (Participante: ${fullName}, Nº: ${code})`
    );

    const receipt = {
      id: `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      to,
      fullName,
      code,
      participantCode: code,
      certificateCode: code,
      programIncluded: Boolean(bodyHtml || bodyText),
      subject: emailSubject,
      deliveryProvider,
      actuallySent,
      providerMessageId,
      deliveryError,
      status: actuallySent ? 'delivered' : 'pending_provider',
      timestamp: new Date().toISOString()
    };

    return res.json({
      success: true,
      actuallySent,
      deliveryProvider,
      deliveryError,
      message: actuallySent
        ? `E-mail de confirmação enviado com sucesso via Gmail para ${to}.`
        : `Comprovante gerado com número de participante (${code}). Para envio automático pelo Gmail, configure SMTP_USER e SMTP_PASS (Senha de App).`,
      receipt
    });
  } catch (error: any) {
    console.error('Erro no envio do e-mail de confirmação:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar envio do e-mail de confirmação.' });
  }
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
