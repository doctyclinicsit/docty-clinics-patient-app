import { get, put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';

export interface PharmacyDeliveryLinkRecord {
  token: string;
  createdAt: string;
  expiresAt: number;
  staffMobile?: string;
  patientId?: string;
  patientName: string;
  patientMobile: string;
  submittedAt?: string;
  delivery?: {
    address: string;
    area: string;
    city: string;
    pincode: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
    prescriptionImage?: {
      name: string;
      type: string;
      data: string;
    };
  };
}

const LINK_TTL_MS = 24 * 60 * 60 * 1000;

export function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

export function deliveryLinkPath(token: string) {
  return `pharmacy-delivery-links/${token}.json`;
}

export function newDeliveryLinkToken() {
  return randomBytes(9).toString('base64url');
}

export function newDeliveryLinkRecord(input: {
  staffMobile?: string;
  patientId?: string;
  patientName: string;
  patientMobile: string;
}) {
  const token = newDeliveryLinkToken();
  return {
    token,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + LINK_TTL_MS,
    staffMobile: input.staffMobile || '',
    patientId: input.patientId || '',
    patientName: input.patientName,
    patientMobile: input.patientMobile,
  } satisfies PharmacyDeliveryLinkRecord;
}

export function publicDeliveryLinkRecord(record: PharmacyDeliveryLinkRecord) {
  return {
    token: record.token,
    expiresAt: record.expiresAt,
    patientName: record.patientName,
    patientMobileLast4: record.patientMobile.slice(-4),
    submitted: Boolean(record.submittedAt),
  };
}

export async function readDeliveryLinkRecord(tokenValue: unknown) {
  const token = String(tokenValue || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64);
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !blobToken) return null;

  const blob = await get(deliveryLinkPath(token), {
    access: 'private',
    token: blobToken,
  });
  if (!blob || blob.statusCode !== 200) return null;

  const text = await new Response(blob.stream).text();
  const record = JSON.parse(text) as PharmacyDeliveryLinkRecord;
  if (!record?.token || record.expiresAt < Date.now()) return null;
  return record;
}

export async function writeDeliveryLinkRecord(record: PharmacyDeliveryLinkRecord) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) throw new Error('Temporary pharmacy link storage is not configured.');

  await put(deliveryLinkPath(record.token), JSON.stringify(record), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken,
  });
}
