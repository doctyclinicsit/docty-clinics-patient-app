import { get, put } from '@vercel/blob';
import { readAdminStaffSession } from '../../server/staff-admin.js';
import { SUPER_ADMIN_MOBILE } from '../../server/eka-staff.js';

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

function cleanAmount(value: unknown) {
  const number = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : undefined;
}

function overlapsSelectedRange(entry: PayoutLedgerEntry, periodStart: string, periodEnd: string) {
  return entry.periodStart <= periodEnd && entry.periodEnd >= periodStart;
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

async function writeLedger(entries: PayoutLedgerEntry[], token: string) {
  await put(LEDGER_PATH, JSON.stringify(entries, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });
}

function filterLedger(entries: PayoutLedgerEntry[], doctorId: string, periodStart: string, periodEnd: string) {
  return entries.filter((entry) =>
    entry.doctorId === doctorId &&
    overlapsSelectedRange(entry, periodStart, periodEnd)
  );
}

async function verifySuperAdminOtp(otp: string, authKey: string) {
  const query = new URLSearchParams({ mobile: `91${SUPER_ADMIN_MOBILE}`, otp });
  const msg91Response = await fetch(
    `https://control.msg91.com/api/v5/otp/verify?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        authkey: authKey,
        Accept: 'application/json',
      },
    }
  );
  const body = await msg91Response.json().catch(() => null);
  if (!msg91Response.ok || body?.type === 'error') {
    throw new Error(body?.message || 'The Super Admin OTP is incorrect or has expired.');
  }
}

export default async function handler(request: any, response: any) {
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST, DELETE');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const adminSession = readAdminStaffSession(request.headers.cookie);
  if (adminSession.status !== 200) return response.status(adminSession.status).json({ message: adminSession.message });
  const staffSession = adminSession.session!;
  if (!blobToken) return response.status(500).json({ message: 'Doctor payout ledger is not configured.' });

  if (request.method === 'GET') {
    const doctorId = String(request.query?.doctorId || '');
    const doctorName = String(request.query?.doctorName || '').trim().slice(0, 120);
    const doctorMobile = String(request.query?.doctorMobile || '').replace(/\D/g, '').slice(-10);
    const periodStart = parseDate(request.query?.periodStart);
    const periodEnd = parseDate(request.query?.periodEnd);
    if (!doctorId || !periodStart || !periodEnd) {
      return response.status(400).json({ message: 'Doctor and payout period are required.' });
    }

    const ledger = await readLedger(blobToken);
    let changed = false;
    ledger.forEach((entry) => {
      if (entry.doctorId !== doctorId) return;
      if (doctorName && !entry.doctorName) {
        entry.doctorName = doctorName;
        changed = true;
      }
      if (doctorMobile && !entry.doctorMobile) {
        entry.doctorMobile = doctorMobile;
        changed = true;
      }
    });
    if (changed) await writeLedger(ledger, blobToken);

    const entries = filterLedger(ledger, doctorId, periodStart, periodEnd)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate) || b.createdAt.localeCompare(a.createdAt));
    return response.status(200).json({ entries });
  }

  if (request.method === 'DELETE') {
    const authKey = process.env.MSG91_AUTH_KEY;
    const entryId = String(request.body?.entryId || '');
    const superAdminOtp = String(request.body?.superAdminOtp || '').replace(/\D/g, '');
    if (!authKey) return response.status(500).json({ message: 'Super Admin OTP verification is not configured.' });
    if (!entryId || !/^\d{4,8}$/.test(superAdminOtp)) {
      return response.status(400).json({ message: 'Select a payment and enter the Super Admin OTP.' });
    }

    try {
      await verifySuperAdminOtp(superAdminOtp, authKey);
    } catch (error) {
      return response.status(401).json({
        message: error instanceof Error ? error.message : 'The Super Admin OTP is incorrect or has expired.',
      });
    }

    const ledger = await readLedger(blobToken);
    const entry = ledger.find((item) => item.id === entryId);
    if (!entry) return response.status(404).json({ message: 'Payment entry was not found.' });
    const updatedLedger = ledger.filter((item) => item.id !== entryId);
    await writeLedger(updatedLedger, blobToken);
    return response.status(200).json({
      deleted: true,
      entryId,
      deletedBy: staffSession.name || staffSession.mobile,
    });
  }

  const doctorId = String(request.body?.doctorId || '');
  const doctorName = String(request.body?.doctorName || '').trim().slice(0, 120);
  const doctorMobile = String(request.body?.doctorMobile || '').replace(/\D/g, '').slice(-10);
  const clinicId = String(request.body?.clinicId || '').trim().slice(0, 80);
  const clinicName = String(request.body?.clinicName || '').trim().slice(0, 120);
  const periodStart = parseDate(request.body?.periodStart);
  const periodEnd = parseDate(request.body?.periodEnd);
  const paymentDate = parseDate(request.body?.paymentDate);
  const paidAmount = cleanAmount(request.body?.paidAmount);
  const tdsAmount = cleanAmount(request.body?.tdsAmount);
  const reference = String(request.body?.reference || '').trim().slice(0, 80);
  const remarks = String(request.body?.remarks || '').trim().slice(0, 180);
  if (!doctorId || !clinicId || !periodStart || !periodEnd || !paymentDate || paidAmount === undefined || tdsAmount === undefined) {
    return response.status(400).json({ message: 'Select clinic and enter valid payment date, paid amount, and TDS amount.' });
  }

  const ledger = await readLedger(blobToken);
  const entry: PayoutLedgerEntry = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    doctorId,
    doctorName,
    doctorMobile,
    clinicId,
    clinicName,
    periodStart,
    periodEnd,
    paymentDate,
    paidAmount,
    tdsAmount,
    reference,
    remarks,
    createdAt: new Date().toISOString(),
    createdBy: staffSession.name || staffSession.mobile,
  };
  ledger.push(entry);
  await writeLedger(ledger, blobToken);

  return response.status(200).json({ entry });
}
