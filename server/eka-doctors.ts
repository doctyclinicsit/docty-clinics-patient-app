export interface EkaListedDoctor {
  id: string;
  firstname?: string;
  lastname?: string;
  mobile?: string;
  email?: string;
  specialisation?: string;
  clinics?: Array<{ id?: string; name?: string }>;
  partner_id?: string;
}

export function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : undefined;
}

export function doctorDisplayName(doctor: EkaListedDoctor) {
  return [doctor.firstname, doctor.lastname].filter(Boolean).join(' ').trim() || 'Doctor';
}

export async function listEkaDoctors() {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  if (!ekaToken) throw new Error('EKA_AUTH_TOKEN is not configured.');

  const ekaResponse = await fetch('https://api.eka.care/cdr/v1/doctor/', {
    headers: {
      auth: ekaToken,
      Accept: 'application/json',
    },
  });
  const body = await ekaResponse.json().catch(() => null);
  if (!ekaResponse.ok) {
    throw new Error(body?.message || body?.error || 'Unable to retrieve doctors from Eka.');
  }

  return Array.isArray(body?.doctors) ? (body.doctors as EkaListedDoctor[]) : [];
}

export async function findEkaDoctorByMobile(mobile: string) {
  const normalizedMobile = normalizeIndianMobile(mobile);
  if (!normalizedMobile) return undefined;

  const doctors = await listEkaDoctors();
  return doctors.find((doctor) => normalizeIndianMobile(doctor.mobile) === normalizedMobile);
}
