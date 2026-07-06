import {
  createPatientSessionCookie,
  PATIENT_SELECTION_PURPOSE,
  PATIENT_SESSION_PURPOSE,
  readPatientSession,
  sealValue,
} from '../server/patient-session.js';

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function ageToDob(age: number) {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - age);
  return date.toISOString().slice(0, 10);
}

const FAMILY_RELATIONSHIPS = [
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
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!secret || !ekaToken) {
    return response.status(500).json({ message: 'Patient registration is not configured.' });
  }

  const session = readPatientSession(request.headers.cookie, secret);
  if (!session) {
    return response.status(401).json({ message: 'Your verified session has expired. Please sign in again.' });
  }

  const name = normalizeName(request.body?.name);
  const age = Number(request.body?.age);
  const gender = String(request.body?.gender || '').toUpperCase();
  const email = String(request.body?.email || '').trim();
  const relationship = String(request.body?.relationship || '').trim();
  const isFamilyMember = request.body?.isFamilyMember === true;

  if (name.length < 2) {
    return response.status(400).json({ message: 'Enter the patient name.' });
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return response.status(400).json({ message: 'Enter a valid age between 1 and 120.' });
  }
  if (!['M', 'F', 'O'].includes(gender)) {
    return response.status(400).json({ message: 'Select the patient gender.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (isFamilyMember && !FAMILY_RELATIONSHIPS.includes(relationship)) {
    return response.status(400).json({ message: 'Select a valid family relationship.' });
  }

  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ');
  const mobile = `+${session.mobile}`;

  try {
    const ekaResponse = await fetch('https://api.eka.care/profiles/v1/patient/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ekaToken}`,
        ...(ekaClientId ? { 'client-id': ekaClientId } : {}),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fn: firstName,
        ...(lastName ? { ln: lastName } : {}),
        dob: ageToDob(age),
        gen: gender,
        mobile,
        ...(email ? { email } : {}),
        ...(isFamilyMember ? { extras: { relationship } } : {}),
        username: `DP${Date.now()}`,
      }),
    });
    const body = await ekaResponse.json().catch(() => null);
    const patientId = body?.oid || body?.data?.oid || body?.patient_id;

    if (!ekaResponse.ok || !patientId) {
      return response.status(ekaResponse.ok ? 502 : ekaResponse.status).json({
        message:
          body?.message ||
          body?.error?.message ||
          body?.error ||
          'Unable to register the patient.',
      });
    }

    const updatedSession = sealValue(
      { ...session, patientId: String(patientId) },
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
    return response.status(201).json({
      profile: {
        id: String(patientId),
        name,
        mobile: session.mobile.slice(-10),
        dob: ageToDob(age),
        gender,
        relation: isFamilyMember ? relationship : '',
        accessToken: sealValue(
          {
            patientId: String(patientId),
            mobile: session.mobile,
            expiresAt: session.expiresAt,
          },
          secret,
          PATIENT_SELECTION_PURPOSE
        ),
      },
    });
  } catch {
    return response.status(502).json({ message: 'Eka patient registration is temporarily unavailable.' });
  }
}
