import { get } from '@vercel/blob';
import { doctorSessionSecret, readDoctorSession } from '../../server/doctor-session.js';

interface PayoutLedgerEntry {
  id: string;
  doctorId: string;
  doctorName?: string;
  doctorMobile?: string;
  clinicId?: string;
  clinicName?: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  paidAmount: number;
  tdsAmount: number;
  reference?: string;
  remarks?: string;
  createdAt: string;
  createdBy?: string;
}

const LEDGER_PATH = 'doctor-payout/ledger.json';

function parseDate(value: unknown) {
  const date = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function overlapsSelectedRange(entry: PayoutLedgerEntry, periodStart: string, periodEnd: string) {
  return entry.periodStart <= periodEnd && entry.periodEnd >= periodStart;
}

function normalizeMobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function belongsToDoctor(entry: PayoutLedgerEntry, session: { doctorId: string; mobile: string; name: string }) {
  if (entry.doctorId === session.doctorId) return true;
  const entryMobile = normalizeMobile(entry.doctorMobile);
  if (entryMobile && entryMobile === normalizeMobile(session.mobile)) return true;
  const entryName = normalizeName(entry.doctorName);
  if (entryName && entryName === normalizeName(session.name)) return true;

  const legacyCreatedByMobile = normalizeMobile(entry.createdBy);
  return Boolean(
    !entry.doctorMobile &&
      !entry.doctorName &&
      legacyCreatedByMobile &&
      legacyCreatedByMobile === normalizeMobile(session.mobile)
  );
}

async function readLedger(token: string) {
  try {
    const blob = await get(LEDGER_PATH, { access: 'private', token });
    if (!blob || blob.statusCode !== 200) return [];
    const text = await new Response(blob.stream).text();
    const body = JSON.parse(text || '[]');
    return Array.isArray(body) ? (body as PayoutLedgerEntry[]) : [];
  } catch {
    return [];
  }
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = doctorSessionSecret();
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const session = secret ? readDoctorSession(request.headers.cookie, secret) : undefined;
  if (!session) return response.status(401).json({ message: 'Please sign in as doctor.' });
  if (!blobToken) return response.status(500).json({ message: 'Doctor payout ledger is not configured.' });

  const periodStart = parseDate(request.query?.periodStart);
  const periodEnd = parseDate(request.query?.periodEnd);
  if (!periodStart || !periodEnd) {
    return response.status(400).json({ message: 'Payout period is required.' });
  }

  const ledger = await readLedger(blobToken);
  const entries = ledger
    .filter((entry) =>
      belongsToDoctor(entry, session) &&
      overlapsSelectedRange(entry, periodStart, periodEnd)
    )
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt));

  return response.status(200).json({ entries });
}
