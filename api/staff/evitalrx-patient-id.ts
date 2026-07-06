import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

const EVITALRX_PATIENT_ID_PREFIX = 'evRxPatId';
const EVITALRX_PATIENT_ID_CHUNK_SIZE = 16;

function evitalRxPatientIdKey(index: number) {
  return `${EVITALRX_PATIENT_ID_PREFIX}${String(index).padStart(2, '0')}`;
}

function clearEvitalRxPatientIdExtras(extras: Record<string, unknown>) {
  for (let index = 1; index <= 10; index += 1) {
    delete extras[evitalRxPatientIdKey(index)];
  }
  delete extras.evitalRxPatientId;
  delete extras.evitalPatientId;
  delete extras.eVitalRxPatientId;
}

function setEvitalRxPatientIdExtras(extras: Record<string, unknown>, patientId: string) {
  clearEvitalRxPatientIdExtras(extras);

  for (let index = 0; index < patientId.length; index += EVITALRX_PATIENT_ID_CHUNK_SIZE) {
    extras[evitalRxPatientIdKey(index / EVITALRX_PATIENT_ID_CHUNK_SIZE + 1)] = patientId.slice(
      index,
      index + EVITALRX_PATIENT_ID_CHUNK_SIZE
    );
  }
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });

  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!ekaToken || !ekaClientId) {
    return response.status(500).json({ message: 'Eka patient directory is not configured.' });
  }

  const patientId = String(request.body?.patientId || '').trim();
  const evitalRxPatientId = String(request.body?.evitalRxPatientId || '').trim();
  if (!patientId) {
    return response.status(400).json({ message: 'Patient ID is required.' });
  }
  if (
    evitalRxPatientId &&
    (evitalRxPatientId.length < 2 ||
      evitalRxPatientId.length > 160 ||
      /[\s"'<>]/.test(evitalRxPatientId))
  ) {
    return response.status(400).json({ message: 'Enter a valid eVitalRx patient ID.' });
  }

  const headers = {
    Authorization: `Bearer ${ekaToken}`,
    'client-id': ekaClientId,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const profileUrl = `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`;

  try {
    const profileResponse = await fetch(profileUrl, { headers });
    const profile = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
      return response.status(profileResponse.status).json({
        message:
          profile?.message ||
          profile?.error?.message ||
          'Unable to retrieve the patient profile.',
      });
    }

    const extras = { ...(profile?.extras || profile?.patient_profile?.extras || {}) };
    if (evitalRxPatientId) {
      setEvitalRxPatientIdExtras(extras, evitalRxPatientId);
    } else {
      clearEvitalRxPatientIdExtras(extras);
    }

    const updateResponse = await fetch(profileUrl, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ extras }),
    });
    const body = await updateResponse.json().catch(() => null);
    if (!updateResponse.ok) {
      return response.status(updateResponse.status).json({
        message:
          body?.message ||
          body?.error?.message ||
          'Unable to update eVitalRx patient ID.',
      });
    }

    return response.status(200).json({
      success: true,
      evitalRxPatientId,
    });
  } catch {
    return response.status(502).json({ message: 'eVitalRx patient ID update is temporarily unavailable.' });
  }
}
