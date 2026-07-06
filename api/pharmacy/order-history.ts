import { requestEvitalRx } from '../_lib/evitalrx.js';
import {
  readPatientSelectionToken,
  readPatientSession,
} from '../../server/patient-session.js';

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(query: any) {
  const now = new Date();
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query?.endDate || ''))
    ? String(query.endDate)
    : formatDate(now);
  const defaultStart = new Date(`${endDate}T00:00:00.000Z`);
  defaultStart.setUTCFullYear(defaultStart.getUTCFullYear() - 1);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query?.startDate || ''))
    ? String(query.startDate)
    : formatDate(defaultStart);

  return { startDate, endDate };
}

function orderTimestamp(order: any) {
  const value =
    order?.created_date ||
    order?.order_delivery_datetime ||
    order?.created_at ||
    order?.order_date ||
    order?.date ||
    order?.created ||
    order?.updated_date ||
    order?.updated_at;
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function orderId(order: any) {
  return String(
    order?.order_id ||
      order?.id ||
      order?.orderId ||
      order?.bill_no ||
      order?.bill_number ||
      order?.order_number ||
      ''
  ).trim();
}

function isDraftOrder(order: any) {
  const status = [
    order?.order_status,
    order?.status,
    order?.status_label,
    order?.status_name,
    order?.current_status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return status.includes('draft');
}

async function enrichOrderDetails(order: any) {
  const id = orderId(order);
  if (!id) return order;

  const body = await requestEvitalRx<{ data?: Record<string, unknown> }>({
    endpoint: 'doctor/orders/view',
    payload: { order_id: id },
  }).catch(() => null);
  const details = body?.data || {};
  const mergedOrder: any = { ...order, ...details };
  delete mergedOrder.print_url;

  return {
    ...mergedOrder,
    id: String((details as any).id || order.id || id),
    order_id: String((details as any).order_id || order.order_id || id),
    has_invoice: Boolean(id),
  };
}

function ekaHeaders() {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  if (!ekaToken) return null;

  return {
    Authorization: `Bearer ${ekaToken}`,
    ...(process.env.EKA_CLIENT_ID ? { 'client-id': process.env.EKA_CLIENT_ID } : {}),
    Accept: 'application/json',
  };
}

async function getEkaProfile(patientId: string) {
  const headers = ekaHeaders();
  if (!headers) throw new Error('Eka patient directory is not configured.');

  const profileResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`,
    { headers }
  );
  const body = await profileResponse.json().catch(() => null);
  if (!profileResponse.ok) {
    throw new Error(body?.message || body?.error?.message || 'Unable to retrieve Eka patient profile.');
  }

  return body;
}

function getEvitalRxPatientId(profile: any) {
  const extras = profile?.extras || profile?.patient_profile?.extras || {};
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

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = process.env.PATIENT_SESSION_SECRET;
  if (!secret) return response.status(500).json({ message: 'Patient session is not configured.' });

  const session = readPatientSession(request.headers.cookie, secret);
  const selection = readPatientSelectionToken(String(request.query?.accessToken || ''), secret);
  const patientId = selection?.patientId || session?.patientId;
  if (!session || !patientId || (selection && selection.mobile !== session.mobile)) {
    return response.status(401).json({ message: 'Patient selection is invalid or expired.' });
  }

  try {
    const ekaProfile = await getEkaProfile(patientId);
    const evitalRxPatientId = getEvitalRxPatientId(ekaProfile);
    if (!evitalRxPatientId) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(200).json({
        orders: [],
        evitalRxPatientId: '',
        hasEvitalRxPatientId: false,
        message: 'No eVitalRx patient ID is linked to this patient profile.',
      });
    }

    const { startDate, endDate } = getDateRange(request.query);
    const orders: any[] = [];

    for (let page = 1; page <= 10; page += 1) {
      const body = await requestEvitalRx<{
        data?: {
          results?: any[];
          current_page?: number;
          rpp?: number;
        };
      }>({
        endpoint: 'doctor/orders/list',
        payload: {
          patient_id: evitalRxPatientId,
          start_date: startDate,
          end_date: endDate,
          page,
        },
      });
      const results = Array.isArray(body.data?.results) ? body.data.results : [];
      orders.push(...results);
      if (results.length < Number(body.data?.rpp || 20)) break;
    }

    const nonDraftOrders = orders.filter((order) => !isDraftOrder(order));
    const enrichedOrders: any[] = [];
    for (let index = 0; index < nonDraftOrders.length; index += 5) {
      const batch = nonDraftOrders.slice(index, index + 5);
      const results = await Promise.all(batch.map(enrichOrderDetails));
      enrichedOrders.push(...results.filter((order) => !isDraftOrder(order)));
    }

    response.setHeader('Cache-Control', 'no-store');
    return response.status(200).json({
      evitalRxPatientId,
      hasEvitalRxPatientId: true,
      startDate,
      endDate,
      orders: enrichedOrders.sort((first, second) => orderTimestamp(second) - orderTimestamp(first)),
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to retrieve pharmacy order history.',
    });
  }
}
