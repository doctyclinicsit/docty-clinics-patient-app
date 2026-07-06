import {
  publicDeliveryLinkRecord,
  readDeliveryLinkRecord,
  writeDeliveryLinkRecord,
} from '../_lib/pharmacy-delivery-link-store.js';

const MAX_IMAGE_LENGTH = 6_800_000;
const SUPPORTED_IMAGE_PATTERN = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

function text(value: unknown) {
  return String(value || '').trim();
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const token = request.method === 'GET' ? request.query?.token : request.body?.token;
  const record = await readDeliveryLinkRecord(token).catch(() => null);
  if (!record) return response.status(404).json({ message: 'This delivery link is invalid or expired.' });
  if (record.submittedAt) {
    return response.status(410).json({ message: 'This delivery link has already been used. Please ask the pharmacy team for a new link.' });
  }

  if (request.method === 'GET') {
    return response.status(200).json({ link: publicDeliveryLinkRecord(record) });
  }

  const address = text(request.body?.address);
  const area = text(request.body?.area);
  const city = text(request.body?.city || 'Hyderabad');
  const pincode = text(request.body?.pincode).replace(/\D/g, '').slice(0, 6);
  const landmark = text(request.body?.landmark);
  const prescriptionImage = request.body?.prescriptionImage;

  if (!address || !area || !city || !/^\d{6}$/.test(pincode)) {
    return response.status(400).json({ message: 'Enter complete delivery address and 6-digit pincode.' });
  }
  if (
    prescriptionImage &&
    (!prescriptionImage.name ||
      !prescriptionImage.type ||
      !prescriptionImage.data ||
      String(prescriptionImage.data).length > MAX_IMAGE_LENGTH ||
      !SUPPORTED_IMAGE_PATTERN.test(String(prescriptionImage.data)))
  ) {
    return response.status(400).json({ message: 'Upload a JPG, PNG, or WebP prescription image smaller than 5 MB.' });
  }

  try {
    record.submittedAt = new Date().toISOString();
    record.delivery = {
      address,
      area,
      city,
      pincode,
      ...(landmark ? { landmark } : {}),
      ...(typeof request.body?.latitude !== 'undefined'
        ? { latitude: numberOrUndefined(request.body.latitude) }
        : {}),
      ...(typeof request.body?.longitude !== 'undefined'
        ? { longitude: numberOrUndefined(request.body.longitude) }
        : {}),
      ...(prescriptionImage
        ? {
            prescriptionImage: {
              name: String(prescriptionImage.name).slice(0, 120),
              type: String(prescriptionImage.type),
              data: String(prescriptionImage.data),
            },
          }
        : {}),
    };
    await writeDeliveryLinkRecord(record);
    return response.status(200).json({ success: true, message: 'Delivery details submitted.' });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to save delivery details.',
    });
  }
}
