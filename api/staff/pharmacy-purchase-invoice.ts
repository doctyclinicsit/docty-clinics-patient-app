import { requestEvitalRx } from '../_lib/evitalrx.js';
import { safeInvoiceFilename } from '../_lib/pharmacy-invoice.js';
import { buildPharmacyReceiptPayload } from '../_lib/pharmacy-receipt-payload.js';
import { buildStaffThermalInvoicePdf } from './pharmacy-invoice-whatsapp.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });

  const orderId = String(request.query?.orderId || request.body?.orderId || '').trim();
  const patientName = String(request.query?.patientName || request.body?.patientName || 'Docty patient').trim();
  const patientMobile = String(request.query?.patientMobile || request.body?.patientMobile || '').replace(/\D/g, '').slice(-10);
  const disposition = String(request.query?.disposition || request.body?.disposition || 'inline');
  if (!orderId) return response.status(400).json({ message: 'Order ID is required.' });

  try {
    const body = await requestEvitalRx<{ data?: Record<string, unknown> }>({
      endpoint: 'doctor/orders/view',
      payload: { order_id: orderId },
    });
    const order = {
      ...(body?.data || {}),
      order_id: String((body?.data as any)?.order_id || orderId),
      id: String((body?.data as any)?.id || orderId),
    };
    const pdf = await buildStaffThermalInvoicePdf(
      buildPharmacyReceiptPayload(order, {
        patientName,
        patientMobile,
        documentStatus: 'Final',
        request,
      })
    );
    const filename = safeInvoiceFilename(order);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Length', String(pdf.length));
    response.setHeader('Content-Disposition', `${disposition === 'attachment' ? 'attachment' : 'inline'}; filename="${filename}"`);
    return response.status(200).send(pdf);
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to generate pharmacy invoice.',
    });
  }
}
