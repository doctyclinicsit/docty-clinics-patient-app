import { submitZohoClinicLead } from '../_lib/zoho-lead.js';
import { requestEvitalRx, requestEvitalRxMultipart } from '../_lib/evitalrx.js';

function normalizeMobile(value: unknown) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function decodePrescriptionImage(value: any) {
  if (!value?.data || !value?.name || !value?.type) return null;
  const data = String(value.data);
  const base64 = data.includes(',') ? data.split(',').pop() || '' : data;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return null;

  return {
    fieldName: 'image',
    fileName: String(value.name).replace(/[^\w.\- ]+/g, '').slice(0, 120) || 'prescription.jpg',
    contentType: String(value.type),
    buffer,
  };
}

function formatItemLine(item: any) {
  return `${String(item.name || item.id || 'Medicine').trim()} x ${Number(item.quantity) || 1}`;
}

function evitalRxPatientIdKey(index: number) {
  return `evRxPatId${String(index).padStart(2, '0')}`;
}

function getEvitalRxPatientIdFromExtras(extras: Record<string, unknown>) {
  const chunks: string[] = [];
  for (let index = 1; index <= 10; index += 1) {
    const value = String(extras[evitalRxPatientIdKey(index)] || '');
    if (!value) break;
    chunks.push(value);
  }

  return (
    chunks.join('') ||
    String(extras.evitalRxPatientId || extras.evitalPatientId || extras.eVitalRxPatientId || '')
  ).trim();
}

function setEvitalRxPatientIdExtras(extras: Record<string, unknown>, patientId: string) {
  for (let index = 1; index <= 10; index += 1) {
    delete extras[evitalRxPatientIdKey(index)];
  }
  delete extras.evitalRxPatientId;
  delete extras.evitalPatientId;
  delete extras.eVitalRxPatientId;

  for (let index = 0; index < patientId.length; index += 16) {
    extras[evitalRxPatientIdKey(index / 16 + 1)] = patientId.slice(index, index + 16);
  }
}

function normalizeName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getEkaPatientId(profile: any) {
  const details = profile?.patient_profile || profile || {};
  return String(profile?.patient_id || details.patient_id || details.oid || profile?.oid || '').trim();
}

function getEkaProfilesFromBody(body: any) {
  const rawProfiles =
    body?.data?.profiles ||
    body?.profiles ||
    body?.data ||
    (Array.isArray(body) ? body : body?.oid ? [body] : []);

  return Array.isArray(rawProfiles) ? rawProfiles : rawProfiles ? [rawProfiles] : [];
}

function getEkaPatientName(profile: any) {
  const details = profile?.patient_profile || profile || {};
  return normalizeName(
    profile?.name ||
      details.fln ||
      [details.first_name || details.fn, details.middle_name, details.last_name || details.ln]
        .filter(Boolean)
        .join(' ')
  );
}

function splitPatientName(name: string) {
  const [firstName, ...lastNameParts] = normalizeName(name).split(' ');
  return {
    firstName: firstName || 'Patient',
    lastName: lastNameParts.join(' '),
  };
}

function ekaProfileHeaders() {
  const ekaToken = process.env.EKA_AUTH_TOKEN;
  if (!ekaToken) return null;

  return {
    Authorization: `Bearer ${ekaToken}`,
    ...(process.env.EKA_CLIENT_ID ? { 'client-id': process.env.EKA_CLIENT_ID } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function getEkaPatientProfile(patientId: string, headers: Record<string, string>) {
  if (!patientId) return null;

  const profileResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(patientId)}`,
    { headers }
  );
  if (!profileResponse.ok) return null;

  return profileResponse.json().catch(() => null);
}

async function findEkaPatientByMobile(mobile: string, patientName: string, headers: Record<string, string>) {
  const profileResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/by-mobile/?mob=${encodeURIComponent(`+91${mobile}`)}&full_profile=true`,
    { headers }
  );
  const body = await profileResponse.json().catch(() => null);
  if (!profileResponse.ok) return null;

  const profiles = getEkaProfilesFromBody(body);
  if (!profiles.length) return null;

  const normalizedPatientName = normalizeName(patientName).toLowerCase();
  return (
    profiles.find((profile: any) => getEkaPatientName(profile).toLowerCase() === normalizedPatientName) ||
    profiles[0]
  );
}

async function createEkaPatient(order: any, mobile: string, headers: Record<string, string>) {
  const { firstName, lastName } = splitPatientName(order.patientName);
  const ekaResponse = await fetch('https://api.eka.care/profiles/v1/patient/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fn: firstName,
      ...(lastName ? { ln: lastName, fln: `${firstName} ${lastName}` } : {}),
      mobile: `+91${mobile}`,
      username: `DP-PHARM-${Date.now()}`,
      extras: {
        relationship: 'Self',
        source: 'patient-pharmacy-page',
      },
    }),
  });
  const body = await ekaResponse.json().catch(() => null);
  if (!ekaResponse.ok) return null;

  const patientId = String(body?.oid || body?.data?.oid || body?.patient_id || '').trim();
  return patientId ? { ...(body?.data || body), oid: patientId } : null;
}

async function resolveEkaPatient(order: any, mobile: string, headers: Record<string, string>) {
  const requestedPatientId = String(order.patientId || '').trim();
  const profileFromOrder = requestedPatientId
    ? await getEkaPatientProfile(requestedPatientId, headers)
    : null;
  if (profileFromOrder && getEkaPatientId(profileFromOrder)) return profileFromOrder;

  const profileFromMobile = await findEkaPatientByMobile(
    mobile,
    String(order.patientName || ''),
    headers
  );
  if (profileFromMobile && getEkaPatientId(profileFromMobile)) return profileFromMobile;

  return createEkaPatient(order, mobile, headers);
}

async function syncEkaPatientEvitalRxDetails({
  order,
  mobile,
  evitalRxPatientId,
}: {
  order: any;
  mobile: string;
  evitalRxPatientId?: string;
}) {
  if (!evitalRxPatientId) return null;

  const headers = ekaProfileHeaders();
  if (!headers) return null;

  const profile = await resolveEkaPatient(order, mobile, headers);
  const ekaPatientId = getEkaPatientId(profile);
  if (!ekaPatientId) return null;

  const latestProfile = await getEkaPatientProfile(ekaPatientId, headers);
  const extras = latestProfile?.extras || profile?.extras || profile?.patient_profile?.extras || {};
  const existingEvitalRxPatientId = getEvitalRxPatientIdFromExtras(extras);

  if (existingEvitalRxPatientId) {
    return { patientId: ekaPatientId, updated: false };
  }

  const updatedExtras = { ...extras };
  setEvitalRxPatientIdExtras(updatedExtras, evitalRxPatientId);
  const updateResponse = await fetch(
    `https://api.eka.care/profiles/v1/patient/${encodeURIComponent(ekaPatientId)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        extras: updatedExtras,
      }),
    }
  );

  if (!updateResponse.ok) return { patientId: ekaPatientId, updated: false };

  return { patientId: ekaPatientId, updated: true };
}

async function submitPharmacyZohoLead({
  order,
  mobile,
  items,
  prescriptionImage,
  deliveryLocation,
  deliveryAddress,
  orderReference,
  interest,
  remarks,
  source,
}: {
  order: any;
  mobile: string;
  items: any[];
  prescriptionImage: ReturnType<typeof decodePrescriptionImage>;
  deliveryLocation: Record<string, string>;
  deliveryAddress: string;
  orderReference?: string;
  interest: string;
  remarks: string[];
  source: string;
}) {
  await submitZohoClinicLead({
    type: 'pharmacy',
    patient: {
      name: String(order.patientName).trim(),
      mobile,
    },
    interest,
    serviceCategory: 'Pharmacy',
    location: deliveryAddress,
    remarks: [
      orderReference ? `Order ID: ${orderReference}` : '',
      ...remarks,
    ]
      .filter(Boolean)
      .join('\n'),
    source,
    metadata: {
      patientId: order.patientId,
      orderReference,
      items,
      prescriptionImage: prescriptionImage
        ? { fileName: prescriptionImage.fileName, contentType: prescriptionImage.contentType }
        : undefined,
      deliveryLocation,
    },
    requestedAt: new Date().toISOString(),
  });
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const order = request.body || {};
  const mobile = normalizeMobile(order.patientMobile);
  const items = Array.isArray(order.items) ? order.items : [];
  const prescriptionImage = decodePrescriptionImage(order.prescriptionImage);
  const deliveryLocation = {
    address: String(order.address || '').trim(),
    area: String(order.area || '').trim(),
    city: String(order.city || '').trim(),
    pincode: String(order.pincode || '').trim(),
    landmark: String(order.landmark || '').trim(),
  };
  const deliveryAddress = [
    deliveryLocation.address,
    deliveryLocation.area,
    deliveryLocation.city,
    deliveryLocation.pincode ? `PIN ${deliveryLocation.pincode}` : '',
    deliveryLocation.landmark,
  ]
    .filter(Boolean)
    .join(', ');

  if (
    !String(order.patientName || '').trim() ||
    !/^[6-9]\d{9}$/.test(mobile) ||
    !deliveryLocation.address ||
    !deliveryLocation.area ||
    !deliveryLocation.city ||
    !/^\d{6}$/.test(deliveryLocation.pincode) ||
    (items.length === 0 && !String(order.prescriptionNotes || '').trim() && !prescriptionImage)
  ) {
    return response.status(400).json({ message: 'Required pharmacy order details are missing.' });
  }

  try {
    const hasEvitalRxKey = Boolean(process.env.EVITALRX_API_KEY);
    const availableItems = items.filter(
      (item: any) => item.id && item.available !== false && Number(item.quantity) > 0
    );
    const nonAvailableItems = items.filter(
      (item: any) => item.available === false && Number(item.quantity) > 0
    );
    const evitalRxItems = items
      .filter((item: any) => item.id && item.available !== false && Number(item.quantity) > 0)
      .map((item: any) => ({
        medicine_id: item.id,
        quantity: Number(item.quantity),
        discount_percentage: 0,
      }));
    const evitalRxSerializedItems = JSON.stringify(evitalRxItems);

    if (hasEvitalRxKey && (evitalRxItems.length > 0 || prescriptionImage)) {
      const evitalRxPayload = {
        patient_id: '',
        patient_name: String(order.patientName).trim(),
        mobile,
        items: evitalRxSerializedItems,
        doctor_name: order.doctorName || '',
        batch_with: 'yes',
        delivery_type: 'delivery',
        remark: [
          order.prescriptionNotes,
          prescriptionImage ? `Prescription image uploaded: ${prescriptionImage.fileName}` : '',
          order.notes,
          `Delivery: ${deliveryAddress}`,
        ]
          .filter(Boolean)
          .join('\n'),
        shipping: 0,
      };
      const evitalRxResponse = prescriptionImage
        ? await requestEvitalRxMultipart<{
            data?: {
              order_id?: string;
              order_number?: string;
            };
            status_message?: string;
          }>({
            endpoint: 'doctor/orders/push_prescription',
            fields: evitalRxPayload,
            files: [prescriptionImage],
          })
        : await requestEvitalRx<{
        data?: {
          order_id?: string;
          order_number?: string;
        };
        status_message?: string;
      }>({
        endpoint: 'doctor/orders/push_prescription',
        payload: evitalRxPayload,
      });

      const orderView = evitalRxResponse.data?.order_id
        ? await requestEvitalRx<{
            data?: {
              patient_id?: string;
            };
          }>({
            endpoint: 'doctor/orders/view',
            payload: { order_id: evitalRxResponse.data.order_id },
          }).catch(() => null)
        : null;
      const evitalRxPatientId = String(orderView?.data?.patient_id || '').trim();
      const ekaSync = await syncEkaPatientEvitalRxDetails({
        order,
        mobile,
        evitalRxPatientId,
      }).catch(() => null);

      const orderReference =
        evitalRxResponse.data?.order_id || evitalRxResponse.data?.order_number;
      const zohoFollowUps = [
        nonAvailableItems.length
          ? submitPharmacyZohoLead({
              order,
              mobile,
              items: nonAvailableItems,
              prescriptionImage,
              deliveryLocation,
              deliveryAddress,
              orderReference,
              interest: `Non-Available Items Request - ${nonAvailableItems.map(formatItemLine).join(', ')}`,
              remarks: [
                `Available order items sent to eVitalRx: ${availableItems.map(formatItemLine).join(', ') || 'None'}`,
                `Requested non-available items: ${nonAvailableItems.map(formatItemLine).join(', ')}`,
                order.prescriptionNotes,
                order.notes,
              ],
              source: 'patient-pharmacy-page-non-available',
            })
          : null,
        submitPharmacyZohoLead({
          order,
          mobile,
          items: [],
          prescriptionImage: null,
          deliveryLocation,
          deliveryAddress,
          orderReference,
          interest: `Pharmacy Delivery Request${orderReference ? ` - ${orderReference}` : ''}`,
          remarks: [
            `Contact: ${String(order.patientName).trim()} - ${mobile}`,
            `Delivery: ${deliveryAddress}`,
          ],
          source: 'patient-pharmacy-page-delivery-request',
        }),
      ].filter(Boolean);

      await Promise.allSettled(zohoFollowUps);

      response.setHeader('Cache-Control', 'no-store');
      return response.status(201).json({
        message: evitalRxResponse.status_message || 'Pharmacy order placed successfully.',
        orderId: evitalRxResponse.data?.order_id,
        orderNumber: evitalRxResponse.data?.order_number,
        evitalRxPatientId: evitalRxPatientId || undefined,
        ekaPatientId: ekaSync?.patientId,
      });
    }
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to place eVitalRx order.',
    });
  }

  const fallbackOrderReference = `PHARM-${Date.now()}`;
  await submitPharmacyZohoLead({
    order,
    mobile,
    items,
    prescriptionImage,
    deliveryLocation,
    deliveryAddress,
    orderReference: fallbackOrderReference,
    interest: items.length
      ? items.map(formatItemLine).join(', ')
      : prescriptionImage
        ? 'Prescription image upload'
        : 'Prescription medicine request',
    remarks: [
      order.prescriptionNotes,
      prescriptionImage ? `Prescription image uploaded: ${prescriptionImage.fileName}` : '',
      order.notes,
      `Delivery: ${deliveryAddress}`,
    ],
    source: 'patient-pharmacy-page',
  });

  await submitPharmacyZohoLead({
    order,
    mobile,
    items: [],
    prescriptionImage: null,
    deliveryLocation,
    deliveryAddress,
    orderReference: fallbackOrderReference,
    interest: `Pharmacy Delivery Request - ${fallbackOrderReference}`,
    remarks: [
      `Contact: ${String(order.patientName).trim()} - ${mobile}`,
      `Delivery: ${deliveryAddress}`,
    ],
    source: 'patient-pharmacy-page-delivery-request',
  });

  response.setHeader('Cache-Control', 'no-store');
  return response.status(202).json({
    message: 'Pharmacy request captured. eVitalRx API key is not configured.',
    orderId: fallbackOrderReference,
  });
}
