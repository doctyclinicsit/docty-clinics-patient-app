import { neon } from '@neondatabase/serverless';

function cookieValue(header: string | undefined, name: string) {
  return String(header || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}
function database() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) throw new Error('Consultation database is not configured.');
  return neon(url);
}
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(request: any, response: any) {
  const token = process.env.EKA_AUTH_TOKEN || '';
  const deviceToken = cookieValue(request.headers.cookie, 'docty_consultation_device');
  if (!token) return response.status(500).json({ message: 'EkaScribe is not configured.' });
  if (!deviceToken) return response.status(401).json({ message: 'Register this tablet first.' });
  try {
    const sql = database();
    const devices = await sql`select device_id from consultation_pairings where device_token=${deviceToken} and status='paired' limit 1`;
    if (!devices[0]) return response.status(401).json({ message: 'Tablet registration is invalid.' });
    const rawPath = String(request.query?.path || '').replace(/^\/+/, '');
    if (!rawPath || rawPath.includes('..') || rawPath.includes('://')) return response.status(400).json({ message: 'Invalid EkaScribe path.' });
    const pathname = rawPath.split('/').filter(Boolean).map((value) => encodeURIComponent(value)).join('/');
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query || {})) if (key !== 'path') query.set(key, String(value));
    const upstreamUrl = `https://api.eka.care/voice/v1/${pathname}${query.size ? `?${query}` : ''}`;
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(request.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) },
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : JSON.stringify(request.body || {}),
    });
    const contentType = upstream.headers.get('content-type') || 'application/json';
    let body: any = contentType.includes('application/json') ? await upstream.json().catch(() => null) : await upstream.text();
    if (upstream.ok && pathname === '.well-known/medscribealliance' && body?.endpoints) {
      const origin = `https://${request.headers['x-forwarded-host'] || request.headers.host}`;
      body = { ...body, endpoints: { ...body.endpoints, base_url: `${origin}/api/ekascribe` } };
    }
    response.setHeader('Content-Type', contentType);
    return response.status(upstream.status).send(typeof body === 'string' ? body : JSON.stringify(body));
  } catch (error) {
    return response.status(502).json({ message: error instanceof Error ? error.message : 'EkaScribe proxy failed.' });
  }
}
