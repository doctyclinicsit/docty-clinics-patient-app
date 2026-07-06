import { requestEvitalRx } from '../_lib/evitalrx.js';
import { pharmacyOrderItems } from '../_lib/pharmacy-invoice.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateRange(query: any) {
  const now = new Date();
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query?.endDate || '')) ? String(query.endDate) : formatDate(now);
  const start = new Date(`${endDate}T00:00:00.000Z`);
  start.setUTCMonth(start.getUTCMonth() - 6);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(query?.startDate || '')) ? String(query.startDate) : formatDate(start);
  return { startDate, endDate };
}

function orderId(order: any) {
  return String(order?.order_id || order?.id || order?.order_number || order?.bill_no || order?.bill_number || '').trim();
}

function orderTimestamp(order: any) {
  const value = order?.created_date || order?.order_date || order?.created_at || order?.date || order?.updated_date || order?.updated_at;
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isDraftOrder(order: any) {
  return [order?.order_status, order?.status, order?.status_label, order?.status_name, order?.current_status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes('draft');
}

async function enrichOrder(order: any) {
  const id = orderId(order);
  if (!id) return order;
  const body = await requestEvitalRx<{ data?: Record<string, unknown> }>({
    endpoint: 'doctor/orders/view',
    payload: { order_id: id },
  }).catch(() => null);
  const details = body?.data || {};
  return {
    ...order,
    ...details,
    items: pharmacyOrderItems(details).length ? pharmacyOrderItems(details) : pharmacyOrderItems(order),
    id: String((details as any).id || order.id || id),
    order_id: String((details as any).order_id || order.order_id || id),
  };
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

  const patientId = String(request.query?.evitalRxPatientId || '').trim();
  if (!patientId) return response.status(400).json({ message: 'eVitalRx Patient ID is required to search purchases.' });

  try {
    const { startDate, endDate } = dateRange(request.query);
    const orders: any[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const body = await requestEvitalRx<{ data?: { results?: any[]; rpp?: number } }>({
        endpoint: 'doctor/orders/list',
        payload: {
          patient_id: patientId,
          start_date: startDate,
          end_date: endDate,
          page,
        },
      });
      const results = Array.isArray(body.data?.results) ? body.data.results : [];
      orders.push(...results);
      if (results.length < Number(body.data?.rpp || 20)) break;
    }

    const filtered = orders.filter((order) => !isDraftOrder(order));
    const enriched: any[] = [];
    for (let index = 0; index < filtered.length; index += 5) {
      enriched.push(...(await Promise.all(filtered.slice(index, index + 5).map(enrichOrder))));
    }

    return response.status(200).json({
      startDate,
      endDate,
      orders: enriched.filter((order) => !isDraftOrder(order)).sort((a, b) => orderTimestamp(b) - orderTimestamp(a)),
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to retrieve recent pharmacy purchases.',
    });
  }
}
