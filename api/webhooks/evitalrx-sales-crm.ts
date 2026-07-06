import { safeWriteSystemLog } from '../_lib/system-logs.js';
import { syncPharmacySaleToZohoCrm } from '../_lib/zoho-crm-pharmacy-sales.js';

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

  const dryRun = String(request.query?.dryRun || '') === '1';
  const order = unwrapSalePayload(request.body || {});

  try {
    const result = await syncPharmacySaleToZohoCrm(order, { dryRun });
    await safeWriteSystemLog({
      level: result.status === 'created' ? 'success' : 'info',
      source: 'evitalrx-sales-crm-webhook',
      event:
        result.status === 'created'
          ? 'crm_pharmacy_sale_created'
          : result.status === 'duplicate'
            ? 'crm_pharmacy_sale_duplicate'
            : 'crm_pharmacy_sale_dry_run',
      message:
        result.status === 'created'
          ? `Zoho CRM pharmacy sale created for eVitalRx sale ${result.reference}.`
          : result.status === 'duplicate'
            ? `Zoho CRM pharmacy sale already exists for eVitalRx sale ${result.reference}.`
            : `Zoho CRM pharmacy sale dry run completed for ${result.reference}.`,
      metadata: {
        reference: result.reference,
        status: result.status,
        moduleName: result.moduleName,
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
      source: 'evitalrx-sales-crm-webhook',
      event: 'crm_pharmacy_sale_failed',
      message: error instanceof Error ? error.message : 'Unable to create Zoho CRM pharmacy sale.',
      metadata: { dryRun },
    });
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to create Zoho CRM pharmacy sale.',
    });
  }
}
