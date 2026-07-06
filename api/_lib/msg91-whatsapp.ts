const MSG91_WHATSAPP_ENDPOINT =
  'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : undefined;
}

export async function sendLeadWhatsAppConfirmation(mobileValue: unknown) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const mobile = normalizeIndianMobile(mobileValue);

  if (!authKey) {
    throw new Error('MSG91 WhatsApp service is not configured.');
  }
  if (!mobile) {
    throw new Error('Enter a valid Indian mobile number.');
  }

  const msg91Response = await fetch(MSG91_WHATSAPP_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify({
      integrated_number:
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '919989804888',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: process.env.MSG91_WHATSAPP_TEMPLATE_NAME || 'service_booked',
          language: {
            code: process.env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
            policy: 'deterministic',
          },
          namespace:
            process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE ||
            '8927373b_b8c5_4598_9329_24a60b011b08',
          to_and_components: [
            {
              to: [mobile],
              components: {},
            },
          ],
        },
      },
    }),
  });
  const body = await msg91Response.json().catch(() => null);

  if (!msg91Response.ok || body?.type === 'error' || body?.status === 'error') {
    throw new Error(
      body?.message ||
        body?.error ||
        'MSG91 could not send the WhatsApp confirmation.'
    );
  }

  return body;
}

export async function sendSubscriptionCardWhatsApp({
  mobileValue,
  documentUrl,
  filename,
}: {
  mobileValue: unknown;
  documentUrl: string;
  filename: string;
}) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const mobile = normalizeIndianMobile(mobileValue);

  if (!authKey) {
    throw new Error('MSG91 WhatsApp service is not configured.');
  }
  if (!mobile) {
    throw new Error('Enter a valid Indian mobile number.');
  }
  if (!/^https:\/\//i.test(documentUrl)) {
    throw new Error('A secure public card PDF URL is required for WhatsApp sharing.');
  }

  const components: Record<string, { type: string; value: string; filename?: string }> = {
    header_1: {
      type: 'document',
      value: documentUrl,
      filename,
    },
  };

  const msg91Response = await fetch(MSG91_WHATSAPP_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify({
      integrated_number:
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '919989804888',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name:
            process.env.MSG91_WHATSAPP_CARD_TEMPLATE_NAME ||
            'docty_subscription_card',
          language: {
            code: process.env.MSG91_WHATSAPP_CARD_TEMPLATE_LANGUAGE || 'en_US',
            policy: 'deterministic',
          },
          namespace:
            process.env.MSG91_WHATSAPP_CARD_TEMPLATE_NAMESPACE ||
            process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE ||
            '8927373b_b8c5_4598_9329_24a60b011b08',
          to_and_components: [
            {
              to: [mobile],
              components,
            },
          ],
        },
      },
    }),
  });
  const body = await msg91Response.json().catch(() => null);

  if (!msg91Response.ok || body?.type === 'error' || body?.status === 'error') {
    throw new Error(
      body?.message ||
        body?.error ||
        'MSG91 could not send the subscription card.'
    );
  }

  return body;
}

export async function sendPharmacyReceiptWhatsApp({
  mobileValue,
  documentUrl,
  filename,
  patientName,
  billNo,
  billDate,
  billAmount,
  paymentMethod,
}: {
  mobileValue: unknown;
  documentUrl: string;
  filename: string;
  patientName: string;
  billNo: string;
  billDate: string;
  billAmount: string;
  paymentMethod: string;
}) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const mobile = normalizeIndianMobile(mobileValue);

  if (!authKey) {
    throw new Error('MSG91 WhatsApp service is not configured.');
  }
  if (!mobile) {
    throw new Error('Enter a valid Indian mobile number.');
  }
  if (!/^https:\/\//i.test(documentUrl)) {
    throw new Error('A secure public invoice PDF URL is required for WhatsApp sharing.');
  }

  const components: Record<string, { type: string; value: string; filename?: string }> = {
    header_1: {
      type: 'document',
      value: documentUrl,
      filename,
    },
    body_1: { type: 'text', value: patientName },
    body_2: { type: 'text', value: billNo },
    body_3: { type: 'text', value: billDate },
    body_4: { type: 'text', value: billAmount },
    body_5: { type: 'text', value: paymentMethod },
  };

  const msg91Response = await fetch(MSG91_WHATSAPP_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify({
      integrated_number:
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '919989804888',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name:
            process.env.MSG91_WHATSAPP_PHARMACY_RECEIPT_TEMPLATE_NAME ||
            'docty_pharmacy_receipt',
          language: {
            code:
              process.env.MSG91_WHATSAPP_PHARMACY_RECEIPT_TEMPLATE_LANGUAGE ||
              'en_US',
            policy: 'deterministic',
          },
          namespace:
            process.env.MSG91_WHATSAPP_PHARMACY_RECEIPT_TEMPLATE_NAMESPACE ||
            process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE ||
            '8927373b_b8c5_4598_9329_24a60b011b08',
          to_and_components: [
            {
              to: [mobile],
              components,
            },
          ],
        },
      },
    }),
  });
  const body = await msg91Response.json().catch(() => null);

  if (!msg91Response.ok || body?.type === 'error' || body?.status === 'error') {
    const detail =
      typeof body?.message === 'string'
        ? body.message
        : typeof body?.error === 'string'
          ? body.error
          : body
            ? JSON.stringify(body).slice(0, 500)
            : '';
    throw new Error(
      detail
        ? `MSG91 could not send the pharmacy invoice: ${detail}`
        : 'MSG91 could not send the pharmacy invoice.'
    );
  }

  return body;
}

export async function sendPharmacyDeliveryLinkWhatsApp({
  mobileValue,
  patientName,
  deliveryLink,
}: {
  mobileValue: unknown;
  patientName: string;
  deliveryLink: string;
}) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const mobile = normalizeIndianMobile(mobileValue);

  if (!authKey) {
    throw new Error('MSG91 WhatsApp service is not configured.');
  }
  if (!mobile) {
    throw new Error('Enter a valid Indian mobile number.');
  }
  if (!/^https:\/\//i.test(deliveryLink)) {
    throw new Error('A secure public delivery link is required for WhatsApp sharing.');
  }

  const components: Record<string, { type: string; value: string }> = {
    body_1: { type: 'text', value: patientName || 'Patient' },
    body_2: { type: 'text', value: deliveryLink },
  };

  const msg91Response = await fetch(MSG91_WHATSAPP_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify({
      integrated_number:
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '919989804888',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name:
            process.env.MSG91_WHATSAPP_PHARMACY_DELIVERY_TEMPLATE_NAME ||
            'docty_pharmacy_delivery_link',
          language: {
            code:
              process.env.MSG91_WHATSAPP_PHARMACY_DELIVERY_TEMPLATE_LANGUAGE ||
              'en_US',
            policy: 'deterministic',
          },
          namespace:
            process.env.MSG91_WHATSAPP_PHARMACY_DELIVERY_TEMPLATE_NAMESPACE ||
            process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE ||
            '8927373b_b8c5_4598_9329_24a60b011b08',
          to_and_components: [
            {
              to: [mobile],
              components,
            },
          ],
        },
      },
    }),
  });
  const body = await msg91Response.json().catch(() => null);

  if (!msg91Response.ok || body?.type === 'error' || body?.status === 'error') {
    throw new Error(
      body?.message ||
        body?.error ||
        'MSG91 could not send the pharmacy delivery link.'
    );
  }

  return body;
}

export async function sendPhysicalCardIssuedWhatsApp(mobileValue: unknown) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const mobile = normalizeIndianMobile(mobileValue);

  if (!authKey) {
    throw new Error('MSG91 WhatsApp service is not configured.');
  }
  if (!mobile) {
    throw new Error('Enter a valid Indian mobile number.');
  }

  const msg91Response = await fetch(MSG91_WHATSAPP_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify({
      integrated_number:
        process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '919989804888',
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name:
            process.env.MSG91_WHATSAPP_CARD_ISSUED_TEMPLATE_NAME ||
            'docty_card_issued',
          language: {
            code:
              process.env.MSG91_WHATSAPP_CARD_ISSUED_TEMPLATE_LANGUAGE ||
              'en_US',
            policy: 'deterministic',
          },
          namespace:
            process.env.MSG91_WHATSAPP_CARD_ISSUED_TEMPLATE_NAMESPACE ||
            process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE ||
            '8927373b_b8c5_4598_9329_24a60b011b08',
          to_and_components: [
            {
              to: [mobile],
              components: {},
            },
          ],
        },
      },
    }),
  });
  const body = await msg91Response.json().catch(() => null);

  if (!msg91Response.ok || body?.type === 'error' || body?.status === 'error') {
    throw new Error(
      body?.message ||
        body?.error ||
        'MSG91 could not send the card issued notification.'
    );
  }

  return body;
}
