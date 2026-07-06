import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function getEvitalRxPatientId(extras: Record<string, unknown>) {
  const chunks: string[] = [];
  for (let index = 1; index <= 10; index += 1) {
    const value = String(extras[`evRxPatId${String(index).padStart(2, '0')}`] || '');
    if (!value) break;
    chunks.push(value);
  }

  return (
    chunks.join('') ||
    String(extras.evitalRxPatientId || extras.evitalPatientId || extras.eVitalRxPatientId || '')
  );
}

function normalizeProfile(profile: any, mobileFallback = '') {
  const details = profile.patient_profile || profile;
  const extras = details.extras || {};
  const id = profile.patient_id || details.patient_id || details.oid;
  const name =
    profile.name ||
    details.fln ||
    [details.first_name || details.fn, details.middle_name, details.last_name || details.ln]
      .filter(Boolean)
      .join(' ')
      .trim();
  if (!id || !name) return undefined;

  const storedImage = String(extras.doctyPic || extras.doctyProfilePicture || '');
  const storedImageUrl = storedImage
    ? storedImage.startsWith('http') || storedImage.startsWith('data:')
      ? storedImage
      : `/api/staff/patient-photo?patientId=${encodeURIComponent(String(id))}`
    : '';

  return {
    id: String(id),
    name: String(name),
    mobile: String(details.mobile || profile.mobile || mobileFallback || '').slice(-10),
    imageUrl: details.pic || details.pic_small || details.photo || storedImageUrl || '',
    dob: details.dob || '',
    gender: details.gender || details.gen || '',
    relation:
      extras.relationship ||
      extras.relation ||
      details.relation ||
      details.rel ||
      '',
    createdAt: details.c_ate || profile.c_ate || '',
    updatedAt: details.u_ate || profile.u_ate || '',
    cardIssued: String(extras.cardIssued || '').toLowerCase() === 'yes',
    cardIssuedDate: String(extras.cardIssueDt || ''),
    evitalRxPatientId: getEvitalRxPatientId(extras),
    subscription: {
      subscriber: String(extras.fieldthree || '').toLowerCase() === 'yes',
      planCode: String(extras.fieldfour || ''),
      startDate: String(extras.fieldone || ''),
      endDate: String(extras.fieldtwo || ''),
    },
  };
}

function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
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

  const mobile = normalizeMobile(String(request.query?.mobile || request.query?.q || ''));
  if (!mobile) {
    return response.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  }

  try {
    const ekaResponse = await fetch(
      `https://api.eka.care/profiles/v1/patient/by-mobile/?mob=${encodeURIComponent(
        `+91${mobile}`
      )}&full_profile=true`,
      {
        headers: {
          Authorization: `Bearer ${ekaToken}`,
          'client-id': ekaClientId,
          Accept: 'application/json',
        },
      }
    );
    const body = await ekaResponse.json().catch(() => null);
    if (!ekaResponse.ok) {
      return response.status(ekaResponse.status).json({
        message:
          body?.message ||
          body?.error?.message ||
          'Unable to retrieve subscribers from Eka.',
      });
    }

    const rawProfiles =
      body?.data?.profiles ||
      body?.profiles ||
      body?.data ||
      (Array.isArray(body) ? body : body?.oid ? [body] : []);

    const subscribers = (Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles])
      .map((profile: any) => normalizeProfile(profile, mobile))
      .filter((profile: any) => profile?.subscription?.subscriber)
      .sort((a: any, b: any) => {
        const aTime = Date.parse(a.createdAt || a.updatedAt || '') || 0;
        const bTime = Date.parse(b.createdAt || b.updatedAt || '') || 0;
        return bTime - aTime;
      });

    return response.status(200).json({ subscribers });
  } catch {
    return response.status(502).json({ message: 'Eka patient directory is temporarily unavailable.' });
  }
}
