import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import { getStaffModuleAccess } from '../../server/staff-access.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  if (!secret) return response.status(500).json({ message: 'Staff session is not configured.' });

  const session = readStaffSession(request.headers.cookie, secret);
  if (!session) return response.status(401).json({ authenticated: false });
  const moduleAccess = await getStaffModuleAccess(session);

  return response.status(200).json({
    authenticated: true,
    expiresAt: session.expiresAt,
    staff: {
      mobile: session.mobile,
      name: session.name || '',
      role: session.staffRole || '',
      isAdmin: Boolean(session.isAdmin),
      moduleAccess,
    },
  });
}
