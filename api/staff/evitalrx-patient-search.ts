import { requestEvitalRx } from '../_lib/evitalrx.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function normalizeMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function text(value: unknown) {
  return String(value || '').trim();
}

function mobileCandidates(mobile: string) {
  return Array.from(new Set([mobile, `66000${mobile.slice(5)}`, `6600${mobile.slice(4)}`]));
}

function rowsFromBody(body: any) {
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

function patientId(row: any) {
  return text(
    row?.patient_id ||
      row?.id ||
      row?.patientId ||
      row?.customer_id ||
      row?.customerId ||
      row?.user_id
  );
}

function patientName(row: any) {
  return normalizeName(
    row?.patient_name ||
      row?.full_name ||
      row?.name ||
      row?.customer_name ||
      [row?.first_name || row?.fn, row?.last_name || row?.ln].filter(Boolean).join(' ')
  );
}

function patientMobile(row: any) {
  return normalizeMobile(
    row?.mobile ||
      row?.mobile_number ||
      row?.patient_mobile ||
      row?.customer_mobile ||
      row?.phone
  );
}

function patientAddress(row: any) {
  return normalizeName(
    row?.address ||
      row?.patient_address ||
      row?.customer_address ||
      [row?.address_line1, row?.address_line2, row?.city, row?.pincode].filter(Boolean).join(', ')
  );
}

async function searchEvitalRxPatients(mobile: string) {
  const payloads = mobileCandidates(mobile).flatMap((candidate) => [
    { mobile: candidate },
    { search: candidate },
    { searchstring: candidate },
    { patient_mobile: candidate },
  ]);
  const matches = new Map<string, any>();

  for (const payload of payloads) {
    try {
      const body = await requestEvitalRx<any>({
        endpoint: 'doctor/patients/search',
        payload,
      });
      for (const row of rowsFromBody(body)) {
        const id = patientId(row);
        if (!id) continue;
        matches.set(id, row);
      }
    } catch {
      // eVitalRx may reject unsupported search keys; continue with the next known shape.
    }
  }

  return [...matches.values()].map((row) => {
    const mobileValue = patientMobile(row);
    return {
      id: patientId(row),
      name: patientName(row) || 'eVitalRx customer',
      mobileLast5: mobileValue ? mobileValue.slice(-5) : '',
      maskedMobile: mobileValue,
      address: patientAddress(row),
    };
  });
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

  const mobile = normalizeMobile(request.query?.mobile || request.query?.q);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return response.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  }

  try {
    const patients = await searchEvitalRxPatients(mobile);
    return response.status(200).json({ patients });
  } catch {
    return response.status(502).json({ message: 'eVitalRx patient search is temporarily unavailable.' });
  }
}
