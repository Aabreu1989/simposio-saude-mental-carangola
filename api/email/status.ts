import type { IncomingMessage, ServerResponse } from 'http';

interface ExtendedResponse extends ServerResponse {
  status: (statusCode: number) => ExtendedResponse;
  json: (data: unknown) => void;
}

export default function handler(req: IncomingMessage, res: ExtendedResponse) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido. Utilize GET.' });
  }

  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const firebaseAdminConfigured = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      ((process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL) &&
        (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY))
  );

  const credentialsConfigured = smtpConfigured && firebaseAdminConfigured;

  return res.status(200).json({
    smtpConfigured,
    firebaseAdminConfigured,
    credentialsConfigured,
    activeProvider: credentialsConfigured ? 'smtp' : 'none',
    hasRealServerDelivery: credentialsConfigured,
    deliverySemantics: 'configuration_only_requires_smtp_and_admin_auth',
    senderConfigured: Boolean(process.env.SMTP_USER)
  });
}
