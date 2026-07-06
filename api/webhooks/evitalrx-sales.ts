import { safeWriteSystemLog } from '../_lib/system-logs.js';
import { syncPharmacySaleToZohoBooks } from '../_lib/zoho-books-pharmacy-sales.js';

function isAuthorized(request: any) {
  const secret = process.env.EVITALRX_WEBHOOK_SECRET;
  if (!secret) return true;

  const authorization = String(request.headers?.authorization || '');
  const webhookSecret = String(
    request.headers?.['x-webhook-secret'] ||
      request.headers?.['x-evitalrx-secret'] ||
      request.query?.secret ||
      ''
  );
  return authorization === `Bearer ${secret}` || webhookSecret === secret;
}

function unwrapSalePayload(body: any) {
  return body?.data?.order || body?.data?.sale || body?.data || body?.order || body?.sale || body;
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ message: 'Unauthorized.' });
  }

  const dryRun = String(request.query?.dryRun ?? '0') !== '0';
  const order = unwrapSalePayload(request.body || {});

  try {
    const result = await syncPharmacySaleToZohoBooks(order, { dryRun });
    await safeWriteSystemLog({
      level: result.status === 'created' ? 'success' : 'info',
      source: 'evitalrx-sales-webhook',
      event:
        result.status === 'created'
          ? 'zoho_invoice_created'
          : result.status === 'duplicate'
            ? 'zoho_invoice_duplicate'
            : 'zoho_invoice_dry_run',
      message:
        result.status === 'created'
          ? `Zoho Books invoice created for eVitalRx sale ${result.referenceNumber}.`
          : result.status === 'duplicate'
            ? `Zoho Books invoice already exists for eVitalRx sale ${result.referenceNumber}.`
            : `Zoho Books sales webhook dry run completed for ${result.referenceNumber}.`,
      metadata: {
        referenceNumber: result.referenceNumber,
        status: result.status,
        dryRun,
      },
    });

    response.setHeader('Cache-Control', 'no-store');
    return response.status(result.status === 'duplicate' ? 200 : 201).json({
      ok: true,
      ...result,
    });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'evitalrx-sales-webhook',
      event: 'zoho_invoice_failed',
      message: error instanceof Error ? error.message : 'Unable to create Zoho Books invoice.',
      metadata: { dryRun },
    });
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to create Zoho Books invoice.',
    });
  }
}
