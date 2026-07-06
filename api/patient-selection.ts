import {
  createPatientSessionCookie,
  PATIENT_SESSION_PURPOSE,
  readPatientSession,
  readPatientSelectionToken,
  sealValue,
} from '../server/patient-session.js';

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  if (!secret) return response.status(500).json({ message: 'Patient session is not configured.' });

  const session = readPatientSession(request.headers.cookie, secret);
  const selection = readPatientSelectionToken(request.body?.accessToken, secret);

  if (!session || !selection || selection.mobile !== session.mobile) {
    return response.status(401).json({ message: 'Patient selection is invalid or expired.' });
  }

  const updatedSession = sealValue(
    { ...session, patientId: selection.patientId },
    secret,
    PATIENT_SESSION_PURPOSE
  );
  const remainingSeconds = Math.max(
    0,
    session.expiresAt - Math.floor(Date.now() / 1000)
  );
  response.setHeader(
    'Set-Cookie',
    createPatientSessionCookie(updatedSession, remainingSeconds)
  );
  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({ success: true });
}
