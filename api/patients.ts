import {
  PATIENT_SELECTION_PURPOSE,
  readPatientSession,
  sealValue,
} from '../server/patient-session.js';

function normalizeProfile(
  profile: any,
  mobile: string,
  expiresAt: number,
  secret: string
) {
  const details = profile.patient_profile || profile;
  const name =
    profile.name ||
    details.fln ||
    [details.first_name || details.fn, details.middle_name, details.last_name || details.ln]
      .filter(Boolean)
      .join(' ')
      .trim();
  const id = profile.patient_id || details.patient_id || details.oid;
  const extras = details.extras || {};
  const storedImage = String(extras.doctyPic || extras.doctyProfilePicture || '');
  const storedImageUrl = storedImage
    ? storedImage.startsWith('http') || storedImage.startsWith('data:')
      ? storedImage
      : `/api/patient-profile-photo?patientId=${encodeURIComponent(String(id))}`
    : '';

  if (!id || !name) return undefined;

  return {
    id: String(id),
    name: String(name),
    mobile: mobile.slice(-10),
    imageUrl:
      details.pic ||
      details.pic_small ||
      details.photo ||
      storedImageUrl ||
      '',
    dob: details.dob || '',
    gender: details.gender || details.gen || '',
    relation:
      extras.relationship ||
      extras.relation ||
      details.relation ||
      details.rel ||
      '',
    subscription: {
      subscriber: String(extras.fieldthree || '').toLowerCase() === 'yes',
      planCode: String(extras.fieldfour || ''),
      startDate: String(extras.fieldone || ''),
      endDate: String(extras.fieldtwo || ''),
    },
    accessToken: sealValue(
      { patientId: String(id), mobile, expiresAt },
      secret,
      PATIENT_SELECTION_PURPOSE
    ),
  };
}

function isNoProfileMessage(value: unknown) {
  const message = String(value || '').toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('no patient') ||
    message.includes('no profile') ||
    message.includes('profile does not exist') ||
    message.includes('patient does not exist')
  );
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const sessionSecret = process.env.PATIENT_SESSION_SECRET;
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;

  if (!sessionSecret || !ekaToken) {
    return response.status(500).json({ message: 'Patient lookup is not configured.' });
  }

  const session = readPatientSession(request.headers.cookie, sessionSecret);
  if (!session) {
    return response.status(401).json({ message: 'Your verified session has expired. Please sign in again.' });
  }

  const mobile = session.mobile.slice(-10);

  try {
    const directoryHeaders: Record<string, string> = {
      Authorization: `Bearer ${ekaToken}`,
      Accept: 'application/json',
    };
    if (ekaClientId) directoryHeaders['client-id'] = ekaClientId;

    const attempts: Array<{ url: string; headers: Record<string, string> }> = [
      {
        url: `https://api.eka.care/profiles/v1/patient/by-mobile/?mob=${encodeURIComponent(`+91${mobile}`)}&full_profile=true`,
        headers: directoryHeaders,
      },
      {
        url: `https://api.eka.care/dr/v1/business/patients/search?mobile=${encodeURIComponent(mobile)}`,
        headers: { auth: ekaToken, Accept: 'application/json' },
      },
      {
        url: `https://api.eka.care/dr/v1/business/patients/search?mobile=${encodeURIComponent(`+91${mobile}`)}`,
        headers: { auth: ekaToken, Accept: 'application/json' },
      },
    ];

    let body: any = null;
    let lastStatus = 502;
    let lastMessage = 'Unable to retrieve patient profiles.';
    let onlyNotFoundResponses = true;

    for (const attempt of attempts) {
      const ekaResponse = await fetch(attempt.url, { headers: attempt.headers });
      const attemptBody = await ekaResponse.json().catch(() => null);

      const attemptMessage =
        attemptBody?.message ||
        attemptBody?.error?.message ||
        attemptBody?.error ||
        attemptBody?.source_error?.message;

      if (ekaResponse.ok && !isNoProfileMessage(attemptMessage)) {
        body = attemptBody;
        break;
      }

      lastStatus = ekaResponse.status;
      lastMessage = attemptMessage || lastMessage;
      const isNotFound =
        ekaResponse.status === 404 ||
        isNoProfileMessage(lastMessage);
      if (!isNotFound) onlyNotFoundResponses = false;
    }

    if (!body) {
      if (onlyNotFoundResponses) {
        response.setHeader('Cache-Control', 'no-store');
        return response.status(200).json({ profiles: [] });
      }
      return response.status(lastStatus).json({ message: lastMessage });
    }

    const rawProfiles =
      body?.data?.profiles ||
      body?.profiles ||
      body?.data ||
      (Array.isArray(body) ? body : body?.oid ? [body] : []);
    const profiles = (Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles])
      .map((profile: any) =>
        normalizeProfile(
          profile,
          session.mobile,
          session.expiresAt,
          sessionSecret
        )
      )
      .filter(Boolean);

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({ profiles });
  } catch {
    return response.status(502).json({ message: 'Eka patient directory is temporarily unavailable.' });
  }
}
