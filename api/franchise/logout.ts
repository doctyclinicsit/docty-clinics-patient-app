import { clearFranchiseSessionCookie } from '../../server/franchise-session.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  response.setHeader('Set-Cookie', clearFranchiseSessionCookie());
  return response.status(200).json({ success: true });
}
