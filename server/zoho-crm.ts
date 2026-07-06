export interface ZohoLeadRecord {
  id: string;
  name: string;
  contactNumber: string;
  service: string;
  location: string;
  remarks: string;
  status: string;
  owner?: {
    id?: string;
    name?: string;
    email?: string;
  };
  createdTime?: string;
  modifiedTime?: string;
  raw: Record<string, unknown>;
}

export interface ZohoUserRecord {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  status?: string;
  profileName?: string;
  isAdmin?: boolean;
}

const DEFAULT_FIELDS = [
  'id',
  'Name',
  'Full_Name',
  'Contact_Number',
  'Mobile',
  'Phone',
  'Service',
  'Location',
  'Follow_up_Notes',
  'Remarks',
  'Description',
  'Lead_Status',
  'Status',
  'Owner',
  'Created_Time',
  'Modified_Time',
];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function zohoModuleName() {
  return text(process.env.ZOHO_CRM_LEADS_MODULE) || 'Leads';
}

export function zohoStatusField() {
  return text(process.env.ZOHO_CRM_LEAD_STATUS_FIELD) || 'Lead_Status';
}

export function zohoRemarksField() {
  return text(process.env.ZOHO_CRM_LEAD_REMARKS_FIELD) || 'Follow_up_Notes';
}

export function zohoApiDomain() {
  return (text(process.env.ZOHO_CRM_API_DOMAIN) || 'https://www.zohoapis.in').replace(/\/+$/, '');
}

function zohoAccountsDomain() {
  return (text(process.env.ZOHO_ACCOUNTS_DOMAIN) || 'https://accounts.zoho.in').replace(/\/+$/, '');
}

export function zohoLeadFields() {
  const configured = text(process.env.ZOHO_CRM_LEAD_FIELDS);
  return configured
    ? configured.split(',').map((field) => field.trim()).filter(Boolean)
    : DEFAULT_FIELDS;
}

let cachedAccessToken = '';
let cachedAccessTokenExpiresAt = 0;

async function getZohoAccessToken() {
  const refreshToken = text(process.env.ZOHO_CRM_REFRESH_TOKEN);
  const clientId = text(process.env.ZOHO_CRM_CLIENT_ID);
  const clientSecret = text(process.env.ZOHO_CRM_CLIENT_SECRET);
  if (refreshToken && clientId && clientSecret) {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60_000) {
      return cachedAccessToken;
    }

    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });
    const response = await fetch(`${zohoAccountsDomain()}/oauth/v2/token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: params,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.access_token) {
      throw new Error(body?.error || 'Unable to refresh Zoho CRM access token.');
    }
    cachedAccessToken = text(body.access_token);
    cachedAccessTokenExpiresAt = now + Math.max(300, Number(body.expires_in || 3600) - 120) * 1000;
    return cachedAccessToken;
  }

  const token = text(process.env.ZOHO_CRM_ACCESS_TOKEN || process.env.ZOHO_ACCESS_TOKEN);
  if (!token) throw new Error('Zoho CRM OAuth credentials are not configured.');
  return token;
}

async function parseZohoResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.data?.[0]?.message ||
        body?.details?.message ||
        body?.code ||
        'Zoho CRM request failed.'
    );
  }
  return body;
}

export async function zohoCrmFetch(path: string, init: RequestInit = {}) {
  const token = await getZohoAccessToken();

  return parseZohoResponse(
    await fetch(`${zohoApiDomain()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    })
  );
}

function firstText(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return '';
}

export function normalizeZohoLead(record: Record<string, unknown>): ZohoLeadRecord {
  const owner = objectValue(record.Owner);
  return {
    id: text(record.id),
    name: firstText(record, 'Name', 'Full_Name', 'Lead_Name') || 'Unnamed lead',
    contactNumber: firstText(record, 'Contact_Number', 'Mobile', 'Phone'),
    service: firstText(record, 'Service', 'Service_Category') || 'Not specified',
    location: firstText(record, 'Location', 'Clinic', 'City') || 'Not specified',
    remarks: firstText(record, 'Follow_up_Notes', 'Remarks', 'Description', 'Notes'),
    status: firstText(record, 'Lead_Status', 'Status') || 'Open',
    owner: owner
      ? {
          id: text(owner.id),
          name: text(owner.name),
          email: text(owner.email),
        }
      : undefined,
    createdTime: text(record.Created_Time),
    modifiedTime: text(record.Modified_Time),
    raw: record,
  };
}

export function normalizeZohoUser(record: Record<string, unknown>): ZohoUserRecord {
  const profile = objectValue(record.profile);
  const profileName = text(profile?.name);
  return {
    id: text(record.id),
    name: firstText(record, 'full_name', 'name', 'first_name') || text(record.email) || 'Zoho user',
    email: text(record.email),
    mobile: firstText(record, 'mobile', 'phone'),
    status: firstText(record, 'status') || profileName,
    profileName,
    isAdmin: /admin|administrator|owner|super/i.test(`${profileName} ${firstText(record, 'role', 'status')}`),
  };
}
