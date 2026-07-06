import {
  generatePharmacyInvoicePdf,
  getPatientPharmacyInvoiceContext,
  safeInvoiceFilename,
} from '../_lib/pharmacy-invoice.js';

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const orderId = String(request.query?.orderId || request.body?.orderId || '').trim();
  const disposition = String(request.query?.disposition || request.body?.disposition || 'inline');
  if (!orderId) return response.status(400).json({ message: 'Order ID is required.' });

  try {
    const context = await getPatientPharmacyInvoiceContext(request, orderId);
    const pdf = await generatePharmacyInvoicePdf(context, request);
    const filename = safeInvoiceFilename(context.order);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Length', String(pdf.length));
    response.setHeader(
      'Content-Disposition',
      `${disposition === 'attachment' ? 'attachment' : 'inline'}; filename="${filename}"`
    );
    return response.status(200).send(pdf);
  } catch (error) {
    return response.status((error as any)?.statusCode || 502).json({
      message: error instanceof Error ? error.message : 'Unable to generate pharmacy invoice.',
    });
  }
}
