import http from 'node:http';
import { randomUUID } from 'node:crypto';

const pairings = new Map();
const commands = new Map();
const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  response.end(JSON.stringify(body));
};
const readBody = (request) => new Promise((resolve) => { let value = ''; request.on('data', (chunk) => value += chunk); request.on('end', () => { try { resolve(JSON.parse(value || '{}')); } catch { resolve({}); } }); });

http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  const url = new URL(request.url || '/', 'http://localhost');
  if (url.pathname === '/health') return json(response, 200, { ok: true });
  if (url.pathname === '/pairing' && request.method === 'POST') {
    const body = await readBody(request); const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return json(response, 400, { message: 'Invalid pairing code.' });
    const current = pairings.get(code) || {};
    pairings.set(code, { ...current, code, room: body.room || current.room, deviceName: body.deviceName || current.deviceName, status: body.action === 'claim' ? 'paired' : current.status || 'waiting', deviceId: body.deviceId || current.deviceId, updatedAt: Date.now() });
    return json(response, 200, pairings.get(code));
  }
  if (url.pathname === '/pairing' && request.method === 'GET') return json(response, 200, pairings.get(url.searchParams.get('code')) || null);
  if (url.pathname === '/command' && request.method === 'POST') { const body = await readBody(request); commands.set(body.room, { ...body, id: randomUUID(), sentAt: Date.now() }); return json(response, 200, commands.get(body.room)); }
  if (url.pathname === '/command' && request.method === 'GET') return json(response, 200, commands.get(url.searchParams.get('room')) || null);
  return json(response, 404, { message: 'Not found.' });
}).listen(4174, '0.0.0.0', () => console.log('Consultation relay listening on http://0.0.0.0:4174'));
