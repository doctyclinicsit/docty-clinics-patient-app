import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import { requestEvitalRx } from '../_lib/evitalrx.js';

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

function normalizeMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function ageToDob(age: number, unit = 'years') {
  const date = new Date();
  if (unit === 'months') {
    date.setUTCMonth(date.getUTCMonth() - age);
  } else if (unit === 'days') {
    date.setUTCDate(date.getUTCDate() - age);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() - age);
  }
  return date.toISOString().slice(0, 10);
}

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
  ).trim();
}

function evitalRxPatientIdKey(index: number) {
  return `evRxPatId${String(index).padStart(2, '0')}`;
}

function setEvitalRxPatientIdExtras(extras: Record<string, unknown>, patientId: string) {
  for (let index = 1; index <= 10; index += 1) delete extras[evitalRxPatientIdKey(index)];
  delete extras.evitalRxPatientId;
  delete extras.evitalPatientId;
  delete extras.eVitalRxPatientId;

  for (let index = 0; index < patientId.length; index += 16) {
    extras[evitalRxPatientIdKey(index / 16 + 1)] = patientId.slice(index, index + 16);
  }
}

function evitalRxMobileCandidates(mobile: string) {
  return Array.from(new Set([mobile, `66000${mobile.slice(5)}`, `6600${mobile.slice(4)}`]));
}

function text(value: unknown) {
  return String(value || '').trim();
}

function evitalPatientId(patient: any) {
  return text(
    patient?.patient_id ||
      patient?.id ||
      patient?.patientId ||
      patient?.customer_id ||
      patient?.customerId ||
      patient?.user_id
  );
}

function evitalPatientName(patient: any) {
  return normalizeName(
    patient?.patient_name ||
      patient?.full_name ||
      patient?.name ||
      patient?.customer_name ||
      [patient?.first_name || patient?.fn, patient?.last_name || patient?.ln].filter(Boolean).join(' ')
  );
}

function evitalPatientMobile(patient: any) {
  return normalizeMobile(
    patient?.mobile ||
      patient?.mobile_number ||
      patient?.patient_mobile ||
      patient?.customer_mobile ||
      patient?.phone
  );
}

function evitalPatientGender(patient: any) {
  const gender = text(patient?.gender || patient?.gen).toUpperCase();
  if (['M', 'MALE'].includes(gender)) return 'M';
  if (['F', 'FEMALE'].includes(gender)) return 'F';
  return 'O';
}

function evitalPatientsFromBody(body: any) {
  const data = body?.data;
  const candidates = [
    data?.result,
    data?.results,
    data?.patients,
    data?.patient,
    data?.customers,
    data?.customer,
    data,
    body?.result,
    body?.results,
    body?.patients,
    body?.patient,
  ];
  const rows = candidates.find((candidate) => Array.isArray(candidate) || (candidate && typeof candidate === 'object'));
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
}

function evitalPatientMatches(patient: any, mobileCandidates: string[], patientName = '') {
  const candidateMobiles = new Set(mobileCandidates);
  const patientMobile = evitalPatientMobile(patient);
  const patientId = evitalPatientId(patient);
  const normalizedRequestedName = normalizeName(patientName).toLowerCase();
  const normalizedPatientName = evitalPatientName(patient).toLowerCase();
  const mobileMatches =
    (patientMobile && candidateMobiles.has(patientMobile)) ||
    mobileCandidates.some((candidate) => patientId.includes(candidate) || patientId.endsWith(candidate.slice(-5)));
  const nameMatches =
    !normalizedRequestedName ||
    !normalizedPatientName ||
    normalizedPatientName.includes(normalizedRequestedName) ||
    normalizedRequestedName.includes(normalizedPatientName);
  return mobileMatches && nameMatches;
}

async function findEvitalRxPatient(mobile: string, patientName = '') {
  const mobileCandidates = evitalRxMobileCandidates(mobile);
  const endpointPayloads = mobileCandidates.flatMap((candidate) => [
    { endpoint: 'doctor/patients/search', payload: { mobile: candidate } },
    { endpoint: 'doctor/patients/search', payload: { search: candidate } },
    { endpoint: 'doctor/patients/search', payload: { searchstring: candidate } },
    { endpoint: 'doctor/patients/search', payload: { patient_mobile: candidate } },
  ]);

  for (const request of endpointPayloads) {
    try {
      const body = await requestEvitalRx<any>(request);
      const patient = evitalPatientsFromBody(body).find((row: any) =>
        evitalPatientId(row) && evitalPatientMatches(row, mobileCandidates, patientName)
      );
      if (patient) return patient;
    } catch {
      // Some eVitalRx tenants do not expose every patient-search shape; try the next one.
    }
  }

  return null;
}

async function patchEkaPatientExtras(patientId: string, extras: Record<string, unknown>, headers: Record<string, string>) {
  const updateResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ extras }),
    }
  );
  return updateResponse.ok;
}

async function createEkaPatientFromEvital(
  evitalPatient: any,
  mobile: string,
  headers: Record<string, string>
) {
  const name = evitalPatientName(evitalPatient) || 'Pharmacy Customer';
  const evitalRxPatientId = evitalPatientId(evitalPatient);
  if (!evitalRxPatientId) return undefined;

  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ');
  const extras: Record<string, unknown> = {
    relationship: 'Self',
    source: 'staff-pharmacy-billing-evitalrx-map',
  };
  setEvitalRxPatientIdExtras(extras, evitalRxPatientId);

  const ekaResponse = await fetch('https://api.eka.care/profiles/v1/patient/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fn: firstName || 'Pharmacy',
      ...(lastName ? { ln: lastName, fln: name } : { fln: name }),
      mobile: `+91${mobile}`,
      gen: evitalPatientGender(evitalPatient),
      username: `DP-EVRX-${Date.now()}`,
      extras,
    }),
  });
  const body = await ekaResponse.json().catch(() => null);
  const patientId = text(body?.oid || body?.data?.oid || body?.patient_id);
  if (!ekaResponse.ok || !patientId) return undefined;

  return {
    id: patientId,
    name,
    mobile,
    dob: text(evitalPatient?.dob || evitalPatient?.date_of_birth),
    gender: text(evitalPatient?.gender || evitalPatient?.gen),
    relation: 'Self',
    evitalRxPatientId,
    subscription: { subscriber: false, planCode: '', startDate: '', endDate: '' },
  };
}

async function enrichWithEvitalRxPatientId(patient: any, mobile: string, headers: Record<string, string>) {
  if (patient.evitalRxPatientId) return patient;

  const evitalPatient = await findEvitalRxPatient(mobile, patient.name);
  const evitalRxPatientId = evitalPatientId(evitalPatient);
  if (!evitalRxPatientId) return patient;

  const profileResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patient.id)}`,
    { headers }
  );
  const profile = await profileResponse.json().catch(() => null);
  const details = profile?.patient_profile || profile || {};
  const extras = { ...(details.extras || {}) };
  setEvitalRxPatientIdExtras(extras, evitalRxPatientId);
  const updated = await patchEkaPatientExtras(patient.id, extras, headers);
  return updated ? { ...patient, evitalRxPatientId } : patient;
}

function normalizeProfile(profile: any, mobileFallback = '') {
  const details = profile.patient_profile || profile;
  const extras = details.extras || {};
  const id = profile.patient_id || details.patient_id || details.oid || profile.oid;
  const name = normalizeName(
    profile.name ||
      details.fln ||
      [details.first_name || details.fn, details.middle_name, details.last_name || details.ln]
        .filter(Boolean)
        .join(' ')
  );

  if (!id || !name) return undefined;

  return {
    id: String(id),
    name,
    mobile: normalizeMobile(details.mobile || profile.mobile || mobileFallback),
    dob: details.dob || '',
    gender: details.gender || details.gen || '',
    relation: extras.relationship || extras.relation || details.relation || details.rel || '',
    evitalRxPatientId: getEvitalRxPatientId(extras),
    subscription: {
      subscriber: String(extras.fieldthree || '').toLowerCase() === 'yes',
      planCode: String(extras.fieldfour || ''),
      startDate: String(extras.fieldone || ''),
      endDate: String(extras.fieldtwo || ''),
    },
  };
}

function ekaHeaders() {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  const ekaClientId = process.env.EKA_CLIENT_ID;
  if (!ekaToken) return null;

  return {
    Authorization: `Bearer ${ekaToken}`,
    ...(ekaClientId ? { 'client-id': ekaClientId } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function assertStaff(request: any, response: any) {
  const secret = staffSessionSecret();
  const session = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!session) {
    response.status(401).json({ message: 'Please sign in as staff.' });
    return false;
  }
  return true;
}

async function searchPatients(request: any, response: any) {
  const headers = ekaHeaders();
  if (!headers) return response.status(500).json({ message: 'Eka patient directory is not configured.' });

  const mobile = normalizeMobile(request.query?.mobile || request.query?.q);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return response.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  }

  const createMappedPatientFromEvital = async () => {
    const evitalPatient = await findEvitalRxPatient(mobile).catch(() => null);
    return evitalPatient
      ? createEkaPatientFromEvital(evitalPatient, mobile, headers).catch(() => undefined)
      : undefined;
  };

  try {
    const ekaResponse = await fetch(
      `https://api.eka.care/profiles/v1/patient/by-mobile/?mob=${encodeURIComponent(
        `+91${mobile}`
      )}&full_profile=true`,
      { headers }
    );
    const body = await ekaResponse.json().catch(() => null);
    if (!ekaResponse.ok) {
      const message = body?.message || body?.error?.message || body?.error || '';
      if (/not found|no patient|no profile|does not exist/i.test(message)) {
        const mappedPatient = await createMappedPatientFromEvital();
        if (mappedPatient) return response.status(200).json({ patients: [mappedPatient] });
        return response.status(200).json({ patients: [] });
      }
      return response.status(ekaResponse.status).json({
        message: message || 'Unable to retrieve patients from Eka.',
      });
    }

    const rawProfiles =
      body?.data?.profiles ||
      body?.profiles ||
      body?.data ||
      (Array.isArray(body) ? body : body?.oid ? [body] : []);
    const patients = (Array.isArray(rawProfiles) ? rawProfiles : [rawProfiles])
      .map((profile: any) => normalizeProfile(profile, mobile))
      .filter(Boolean);
    const mappedPatients = await Promise.all(
      patients.map((patient: any) => enrichWithEvitalRxPatientId(patient, mobile, headers).catch(() => patient))
    );
    if (!mappedPatients.length) {
      const mappedPatient = await createMappedPatientFromEvital();
      if (mappedPatient) return response.status(200).json({ patients: [mappedPatient] });
    }

    return response.status(200).json({ patients: mappedPatients });
  } catch {
    const mappedPatient = await createMappedPatientFromEvital();
    if (mappedPatient) return response.status(200).json({ patients: [mappedPatient] });

    return response.status(502).json({ message: 'Eka patient directory is temporarily unavailable.' });
  }
}

async function registerPatient(request: any, response: any) {
  const headers = ekaHeaders();
  if (!headers) return response.status(500).json({ message: 'Eka patient registration is not configured.' });

  const name = normalizeName(request.body?.name);
  const mobile = normalizeMobile(request.body?.mobile);
  const age = Number(request.body?.age);
  const ageUnit = String(request.body?.ageUnit || 'years').toLowerCase();
  const gender = String(request.body?.gender || '').toUpperCase();
  const email = String(request.body?.email || '').trim();
  const relationship = String(request.body?.relationship || 'Self').trim();

  if (name.length < 2) return response.status(400).json({ message: 'Enter the patient name.' });
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return response.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  }
  if (!['years', 'months', 'days'].includes(ageUnit)) {
    return response.status(400).json({ message: 'Select a valid age unit.' });
  }
  const maxAge = ageUnit === 'days' ? 43800 : ageUnit === 'months' ? 1440 : 120;
  if (!Number.isInteger(age) || age < 1 || age > maxAge) {
    return response.status(400).json({ message: 'Enter a valid age.' });
  }
  if (!['M', 'F', 'O'].includes(gender)) {
    return response.status(400).json({ message: 'Select the patient gender.' });
  }
  if (!RELATIONSHIPS.includes(relationship)) {
    return response.status(400).json({ message: 'Select a valid relationship.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: 'Enter a valid email address.' });
  }

  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ');

  try {
    const ekaResponse = await fetch('https://api.eka.care/profiles/v1/patient/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fn: firstName,
        ...(lastName ? { ln: lastName, fln: `${firstName} ${lastName}` } : {}),
        dob: ageToDob(age, ageUnit),
        gen: gender,
        mobile: `+91${mobile}`,
        ...(email ? { email } : {}),
        username: `DP-BILL-${Date.now()}`,
        extras: {
          relationship,
          source: 'staff-pharmacy-billing',
        },
      }),
    });
    const body = await ekaResponse.json().catch(() => null);
    const patientId = String(body?.oid || body?.data?.oid || body?.patient_id || '').trim();
    if (!ekaResponse.ok || !patientId) {
      return response.status(ekaResponse.ok ? 502 : ekaResponse.status).json({
        message: body?.message || body?.error?.message || body?.error || 'Unable to register the patient.',
      });
    }

    return response.status(201).json({
      patient: {
        id: patientId,
        name,
        mobile,
        dob: ageToDob(age, ageUnit),
        gender,
        relation: relationship,
        evitalRxPatientId: '',
        subscription: { subscriber: false, planCode: '', startDate: '', endDate: '' },
      },
    });
  } catch {
    return response.status(502).json({ message: 'Eka patient registration is temporarily unavailable.' });
  }
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (!assertStaff(request, response)) return;

  if (request.method === 'GET') return searchPatients(request, response);
  if (request.method === 'POST') return registerPatient(request, response);

  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ message: 'Method not allowed.' });
}
