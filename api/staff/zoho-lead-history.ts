import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import { zohoCrmFetch, zohoModuleName } from '../../server/zoho-crm.js';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanZohoId(value: unknown) {
  return text(value).replace(/[^\d]/g, '');
}

function normalizeNote(record: Record<string, unknown>) {
  const owner = record.Owner && typeof record.Owner === 'object' ? (record.Owner as Record<string, unknown>) : {};
  const createdBy = record.Created_By && typeof record.Created_By === 'object' ? (record.Created_By as Record<string, unknown>) : {};
  const modifiedBy = record.Modified_By && typeof record.Modified_By === 'object' ? (record.Modified_By as Record<string, unknown>) : {};
  return {
    id: text(record.id),
    title: text(record.Note_Title) || 'Follow-up note',
    content: text(record.Note_Content),
    createdTime: text(record.Created_Time),
    modifiedTime: text(record.Modified_Time),
    owner: text(owner.name),
    createdBy: text(createdBy.name),
    modifiedBy: text(modifiedBy.name),
  };
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const session = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!session) return response.status(401).json({ message: 'Please sign in as staff.' });

  const leadId = cleanZohoId(request.query?.leadId);
  if (!leadId) return response.status(400).json({ message: 'Lead ID is required.' });

  try {
    const moduleName = zohoModuleName();
    const body = await zohoCrmFetch(
      `/crm/v7/${encodeURIComponent(moduleName)}/${leadId}/Notes?fields=id,Note_Title,Note_Content,Owner,Created_By,Modified_By,Created_Time,Modified_Time&sort_by=Created_Time&sort_order=desc`
    );
    const history = Array.isArray(body?.data)
      ? body.data.map((record: Record<string, unknown>) => normalizeNote(record))
      : [];
    return response.status(200).json({ history });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to fetch lead history from Zoho.',
    });
  }
}
