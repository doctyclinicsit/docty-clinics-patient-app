import { franchiseSessionSecret, readFranchiseSession } from '../../server/franchise-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = franchiseSessionSecret();
  const session = secret ? readFranchiseSession(request.headers.cookie, secret) : undefined;
  return response.status(200).json({
    authenticated: Boolean(session),
    owner: session
      ? {
          name: session.name || '',
          mobile: session.mobile,
          role: session.ekaRole || '',
          assignedClinics: session.assignedClinics || [],
        }
      : null,
  });
}
