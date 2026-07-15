import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

let ensured = false;
function client() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!url) throw new Error('Consultation relay database is not configured.');
  return neon(url);
}
async function ensure(sql: any) {
  if (ensured) return;
  await sql`create table if not exists consultation_pairings (code text primary key, room text not null, device_name text not null, device_id text, status text not null default 'waiting', expires_at timestamptz not null, updated_at timestamptz not null default now())`;
  await sql`alter table consultation_pairings add column if not exists device_token text`;
  await sql`create table if not exists consultation_room_commands (room text primary key, command_id text not null, payload jsonb not null, updated_at timestamptz not null default now())`;
  ensured = true;
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'no-store');
  const resource = String(request.query?.resource || request.body?.resource || '');
  try {
    const sql = client(); await ensure(sql);
    if (resource === 'pairing' && request.method === 'POST') {
      const code = String(request.body?.code || '').replace(/\D/g, '').slice(0, 6);
      if (code.length !== 6) return response.status(400).json({ message: 'Invalid pairing code.' });
      if (request.body?.action === 'claim') {
        const deviceToken = randomUUID();
        const rows = await sql`update consultation_pairings set status='paired', device_id=${String(request.body?.deviceId || '')}, device_token=${deviceToken}, updated_at=now() where code=${code} and expires_at > now() returning *`;
        if (rows[0]) response.setHeader('Set-Cookie', `docty_consultation_device=${deviceToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
        return rows[0] ? response.status(200).json(rows[0]) : response.status(404).json({ message: 'Pairing request expired.' });
      }
      const rows = await sql`insert into consultation_pairings (code, room, device_name, status, expires_at) values (${code}, ${String(request.body?.room || '')}, ${String(request.body?.deviceName || 'Room Tablet')}, 'waiting', now() + interval '10 minutes') on conflict (code) do update set room=excluded.room, device_name=excluded.device_name, device_id=null, status='waiting', expires_at=excluded.expires_at, updated_at=now() returning *`;
      return response.status(200).json(rows[0]);
    }
    if (resource === 'pairing' && request.method === 'GET') {
      const code = String(request.query?.code || '').replace(/\D/g, '').slice(0, 6);
      const rows = await sql`select code, room, device_name, device_id, status, expires_at, updated_at from consultation_pairings where code=${code} and expires_at > now() limit 1`;
      return response.status(200).json(rows[0] || null);
    }
    if (resource === 'command' && request.method === 'POST') {
      const room = String(request.body?.room || ''); const commandId = randomUUID(); const payload = JSON.stringify({ ...request.body, id: commandId, sentAt: Date.now() });
      const rows = await sql`insert into consultation_room_commands (room, command_id, payload) values (${room}, ${commandId}, ${payload}::jsonb) on conflict (room) do update set command_id=excluded.command_id, payload=excluded.payload, updated_at=now() returning payload`;
      return response.status(200).json(rows[0]?.payload || null);
    }
    if (resource === 'command' && request.method === 'GET') {
      const rows = await sql`select payload from consultation_room_commands where room=${String(request.query?.room || '')} limit 1`;
      return response.status(200).json(rows[0]?.payload || null);
    }
    return response.status(404).json({ message: 'Unknown relay resource.' });
  } catch (error) {
    return response.status(500).json({ message: error instanceof Error ? error.message : 'Consultation relay failed.' });
  }
}
