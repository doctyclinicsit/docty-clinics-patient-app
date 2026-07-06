import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';
import {
  listSystemLogs,
  writeSystemLog,
  type SystemLogLevel,
} from '../_lib/system-logs.js';

function normalizeLevel(value: unknown): SystemLogLevel {
  const level = String(value || 'info').toLowerCase();
  return level === 'success' || level === 'warning' || level === 'error' ? level : 'info';
}

function publicLog(row: any) {
  return {
    id: String(row.id),
    createdAt: row.created_at,
    level: row.level,
    source: row.source,
    event: row.event,
    message: row.message,
    actorName: row.actor_name || '',
    actorMobile: row.actor_mobile || '',
    metadata: row.metadata || {},
  };
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });
  if (!staffSession.isAdmin) return response.status(403).json({ message: 'System logs are available only for admin staff.' });

  try {
    if (request.method === 'GET') {
      const logs = await listSystemLogs({
        limit: Number(request.query?.limit) || 80,
        source: String(request.query?.source || ''),
        level: String(request.query?.level || ''),
        query: String(request.query?.q || ''),
      });
      return response.status(200).json({ logs: logs.map(publicLog) });
    }

    if (request.method === 'POST') {
      const message = String(request.body?.message || '').trim();
      if (!message) return response.status(400).json({ message: 'Enter a log message.' });

      const log = await writeSystemLog({
        level: normalizeLevel(request.body?.level),
        source: String(request.body?.source || 'staff-note').trim() || 'staff-note',
        event: String(request.body?.event || 'manual_note').trim() || 'manual_note',
        message,
        actorName: staffSession.name || '',
        actorMobile: staffSession.mobile || '',
        metadata: {
          enteredFrom: 'staff-system-logs',
        },
      });
      return response.status(201).json({ log: publicLog(log) });
    }

    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  } catch (error) {
    return response.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to load system logs.',
    });
  }
}
