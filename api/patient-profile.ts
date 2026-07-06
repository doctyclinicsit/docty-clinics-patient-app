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

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function ageToDob(age: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - age);
  return date.toISOString().slice(0, 10);
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'PATCH') {
    response.setHeader('Allow', 'PATCH');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!secret || !ekaToken) {
    return response.status(500).json({ message: 'Patient profile updates are not configured.' });
  }

  const session = readPatientSession(request.headers.cookie, secret);
  const selection = readPatientSelectionToken(request.body?.accessToken, secret);
  if (!session || !selection || selection.mobile !== session.mobile) {
    return response.status(401).json({ message: 'Patient selection is invalid or expired.' });
  }

  const name = normalizeName(request.body?.name);
  const age = Number(request.body?.age);
  const gender = String(request.body?.gender || '').toUpperCase();
  const relationship = String(request.body?.relationship || '').trim();

  if (name.length < 2) {
    return response.status(400).json({ message: 'Enter the patient name.' });
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return response.status(400).json({ message: 'Enter a valid age between 1 and 120.' });
  }
  if (!['M', 'F', 'O'].includes(gender)) {
    return response.status(400).json({ message: 'Select the patient gender.' });
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
  const profileUrl =
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(selection.patientId)}`;

  try {
    const profileResponse = await fetch(profileUrl, { headers });
    const existingProfile = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      return response.status(profileResponse.status).json({
        message:
          existingProfile?.message ||
          existingProfile?.error?.message ||
          'Unable to retrieve patient profile.',
      });
    }

    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ');
    const dob = ageToDob(age);
    const updateResponse = await fetch(profileUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fn: firstName,
        ...(lastName ? { ln: lastName } : {}),
        fln: name,
        dob,
        gen: gender,
        extras: {
          ...(existingProfile?.extras || {}),
          relationship,
        },
      }),
    });
    const body = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message: body?.message || body?.error?.message || 'Unable to update patient profile.',
      });
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      profile: {
        id: selection.patientId,
        name,
        dob,
        gender,
        relation: relationship,
      },
    });
  } catch {
    return response.status(502).json({ message: 'Eka patient profile update is temporarily unavailable.' });
  }
}
