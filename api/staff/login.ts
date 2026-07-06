import {
  createStaffSessionCookie,
  createStaffSessionToken,
  staffSessionSecret,
} from '../../server/staff-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const configuredCode = process.env.STAFF_ACCESS_CODE || process.env.STAFF_PASSWORD;
  const secret = staffSessionSecret();
  if (!configuredCode || !secret) {
    return response.status(500).json({ message: 'Staff login is not configured.' });
  }

  const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  const accessCode = String(body.accessCode || body.password || '').trim();
  if (!accessCode || accessCode !== configuredCode) {
    return response.status(401).json({ message: 'Invalid staff access code.' });
  }

  const session = createStaffSessionToken(secret, { mobile: 'staff' });
  response.setHeader('Set-Cookie', createStaffSessionCookie(session.token, session.maxAge));
  return response.status(200).json({ authenticated: true, expiresAt: session.expiresAt });
}
