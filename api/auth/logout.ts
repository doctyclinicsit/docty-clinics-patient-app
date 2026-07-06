import { clearPatientSessionCookie } from '../../server/patient-session.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  response.setHeader(
    'Set-Cookie',
    clearPatientSessionCookie()
  );
  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({ success: true });
}
