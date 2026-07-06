import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import {
  normalizeZohoLead,
  zohoCrmFetch,
  zohoLeadFields,
  zohoModuleName,
  zohoRemarksField,
  zohoStatusField,
} from '../../server/zoho-crm.js';

const ALLOWED_STATUSES = [
  'Open',
  'Attempted to Contact',
  'Contacted',
  'Follow-up Required',
  'Appointment Booked',
  'Not Interested',
  'Closed',
];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanZohoId(value: unknown) {
  return text(value).replace(/[^\d]/g, '');
}

function appendLine(lines: string[], label: string, value: string) {
  if (value) lines.push(`${label}: ${value}`);
}

function readSession(request: any) {
  const secret = staffSessionSecret();
  return secret ? readStaffSession(request.headers.cookie, secret) : undefined;
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (!['GET', 'PUT'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const session = readSession(request);
  if (!session) return response.status(401).json({ message: 'Please sign in as staff.' });

  try {
    const moduleName = zohoModuleName();
    if (request.method === 'GET') {
      const page = Math.max(1, Number(request.query?.page || 1));
      const perPage = Math.min(100, Math.max(10, Number(request.query?.perPage || 50)));
      const query = new URLSearchParams({
        fields: zohoLeadFields().join(','),
        sort_by: 'Created_Time',
        sort_order: 'desc',
        page: String(page),
        per_page: String(perPage),
      });
      const body = await zohoCrmFetch(`/crm/v7/${encodeURIComponent(moduleName)}?${query.toString()}`);
      const leads = Array.isArray(body?.data)
        ? body.data.map((record: Record<string, unknown>) => normalizeZohoLead(record))
        : [];
      return response.status(200).json({ leads, info: body?.info || {}, moduleName, supportedStatuses: ALLOWED_STATUSES });
    }

    const leadId = cleanZohoId(request.body?.leadId);
    const ownerId = cleanZohoId(request.body?.ownerId);
    const assignToAdmin = Boolean(request.body?.assignToAdmin);
    const status = text(request.body?.status);
    const remarks = text(request.body?.remarks).slice(0, 3000);
    if (!leadId) return response.status(400).json({ message: 'Lead ID is required.' });

    const data: Record<string, unknown> = { id: leadId };
    if (ownerId) data.Owner = { id: ownerId };
    if (assignToAdmin && !ownerId) {
      const usersBody = await zohoCrmFetch('/crm/v7/users?type=ActiveUsers');
      const adminUser = Array.isArray(usersBody?.users)
        ? usersBody.users.find((user: any) =>
            /admin|administrator|owner|super/i.test(
              `${user?.profile?.name || ''} ${user?.full_name || ''} ${user?.email || ''}`
            )
          )
        : undefined;
      if (!adminUser?.id) {
        return response.status(400).json({ message: 'Zoho Admin user was not found. Please select an assignee manually.' });
      }
      data.Owner = { id: String(adminUser.id) };
    }
    if (status) data[zohoStatusField()] = status;
    if (remarks) data[zohoRemarksField()] = remarks;

    const body = await zohoCrmFetch(`/crm/v7/${encodeURIComponent(moduleName)}/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: [data] }),
    });

    let historyWarning = '';
    if (remarks || status || ownerId || assignToAdmin) {
      const noteLines: string[] = [];
      appendLine(noteLines, 'Follow-up Notes', remarks);
      appendLine(noteLines, 'Status', status);
      appendLine(noteLines, 'Updated By', session.name || session.mobile);
      if (ownerId || assignToAdmin) {
        noteLines.push(ownerId ? 'Assigned to selected Zoho user.' : 'Assigned to Zoho Admin user.');
      }
      try {
        await zohoCrmFetch(`/crm/v7/${encodeURIComponent(moduleName)}/${leadId}/Notes`, {
          method: 'POST',
          body: JSON.stringify({
            data: [
              {
                Note_Title: `Lead follow-up - ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
                Note_Content: noteLines.join('\n'),
              },
            ],
          }),
        });
      } catch (error) {
        historyWarning =
          error instanceof Error
            ? error.message
            : 'Lead was updated, but history note could not be created.';
      }
    }

    return response.status(200).json({
      updated: true,
      leadId,
      response: body,
      updatedBy: session.name || session.mobile,
      historyWarning,
    });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to connect to Zoho CRM.',
    });
  }
}
