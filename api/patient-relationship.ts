import {
  readPatientSession,
  readPatientSelectionToken,
} from '../server/patient-session.js';

const RELATIONSHIPS = [
  'Self',
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Other Family Member',
];

export default async function handler(request: any, response: any) {
  if (request.method !== 'PATCH') {
    response.setHeader('Allow', 'PATCH');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!secret || !ekaToken) {
    return response.status(500).json({ message: 'Patient relationship update is not configured.' });
  }

  const session = readPatientSession(request.headers.cookie, secret);
  const selection = readPatientSelectionToken(request.body?.accessToken, secret);
  const relationship = String(request.body?.relationship || '').trim();

  if (!session || !selection || selection.mobile !== session.mobile) {
    return response.status(401).json({ message: 'Patient selection is invalid or expired.' });
  }
  if (!RELATIONSHIPS.includes(relationship)) {
    return response.status(400).json({ message: 'Select a valid relationship.' });
  }

  const headers = {
    Authorization: `Bearer ${ekaToken}`,
    ...(ekaClientId ? { 'client-id': ekaClientId } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    const profileResponse = await fetch(
      `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(selection.patientId)}`,
      { headers }
    );
    const profile = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      return response.status(profileResponse.status).json({
        message: profile?.message || profile?.error?.message || 'Unable to retrieve patient profile.',
      });
    }

    const updateResponse = await fetch(
      `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(selection.patientId)}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          extras: {
            ...(profile?.extras || {}),
            relationship,
          },
        }),
      }
    );
    const body = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message: body?.message || body?.error?.message || 'Unable to update relationship.',
      });
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ success: true, relationship });
  } catch {
    return response.status(502).json({ message: 'Eka relationship update is temporarily unavailable.' });
  }
}
