import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import { normalizeZohoUser, zohoCrmFetch } from '../../server/zoho-crm.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const session = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!session) return response.status(401).json({ message: 'Please sign in as staff.' });

  try {
    const body = await zohoCrmFetch('/crm/v7/users?type=ActiveUsers');
    const users = Array.isArray(body?.users)
      ? body.users.map((record: Record<string, unknown>) => normalizeZohoUser(record)).filter((user: any) => user.id)
      : [];
    const adminUser =
      users.find((user: any) => user.isAdmin) ||
      users.find((user: any) => /admin/i.test(`${user.name} ${user.email || ''}`)) ||
      null;
    return response.status(200).json({ users, adminUser });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to fetch Zoho CRM users.',
    });
  }
}
