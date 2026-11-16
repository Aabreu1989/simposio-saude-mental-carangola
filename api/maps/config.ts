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

  // Only expose the public client-restricted Maps key (VITE_GOOGLE_MAPS_API_KEY)
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ apiKey });
}
