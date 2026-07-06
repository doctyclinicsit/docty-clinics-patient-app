import { readPatientSession } from '../server/patient-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  if (!secret) return response.status(500).json({ message: 'Patient session is not configured.' });

  const session = readPatientSession(request.headers.cookie, secret);
  if (!session) return response.status(401).json({ authenticated: false });

  return response.status(200).json({
    authenticated: true,
    patientId: session.patientId || null,
    expiresAt: session.expiresAt,
  });
}
