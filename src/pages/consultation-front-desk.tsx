import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { DoorOpen, Link2, Play, Square, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roomChannel, type RoomSessionCommand } from '@/lib/room-consultation-channel';
import { relay } from '@/lib/consultation-relay';
import { browserId } from '@/lib/browser-id';

export default function ConsultationFrontDeskPage() {
  const [room, setRoom] = useState('Room 1');
  const [patientName, setPatientName] = useState('Trial Patient');
  const [appointmentId, setAppointmentId] = useState('TRIAL-001');
  const [active, setActive] = useState<RoomSessionCommand | null>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingQr, setPairingQr] = useState('');
  const [deviceName, setDeviceName] = useState('Room Tablet');
  const [devices, setDevices] = useState<Array<{ id: string; name: string; room: string }>>([]);
  const rooms = useMemo(() => ['Room 1', 'Room 2', 'Room 3'], []);

  function send(type: 'start' | 'stop') {
    const command: RoomSessionCommand = {
      type, room, sessionId: active?.sessionId || browserId(),
      appointmentId: appointmentId.trim(), patientName: patientName.trim(), sentAt: Date.now(),
    };
    const channel = roomChannel(); channel.postMessage(command); channel.close();
    void relay('/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) }).catch(() => undefined);
    setActive(type === 'start' ? command : null);
    toast.success(type === 'start' ? `${room} session started.` : `${room} session stopped.`);
  }

  async function generateRegistrationQr() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const name = deviceName.trim() || 'Room Tablet';
    const url = `${window.location.origin}/consultation/tablet?pair=${code}&room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}`;
    setPairingCode(code);
    setPairingQr(await QRCode.toDataURL(url, { width: 360, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#052e2b', light: '#ffffff' } }));
    await relay('/pairing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, room, deviceName: name, action: 'create' }) });
  }
  useEffect(() => { if (!pairingCode) return; const timer = window.setInterval(() => { void relay(`/pairing?code=${pairingCode}`).then((result) => { if (result?.status !== 'paired' || !result.deviceId) return; const device = { id: result.deviceId, name: result.deviceName || 'Room Tablet', room: result.room }; setDevices((items) => [...items.filter((item) => item.room !== device.room), device]); setPairingQr(''); setPairingCode(''); toast.success(`${device.name} registered to ${device.room}.`); }).catch(() => undefined); }, 1500); return () => window.clearInterval(timer); }, [pairingCode]);
  useEffect(() => { const channel = roomChannel(); channel.onmessage = (event: MessageEvent<RoomSessionCommand>) => { const command = event.data; if (command.type !== 'pair-request' || command.pairingCode !== pairingCode || !command.deviceId) return; const device = { id: command.deviceId, name: command.deviceName || 'Room Tablet', room: command.room }; setDevices((items) => [...items.filter((item) => item.room !== device.room), device]); setPairingQr(''); setPairingCode(''); toast.success(`${device.name} registered to ${device.room}.`); }; return () => channel.close(); }, [pairingCode]);

  return <div className="min-h-screen bg-muted/30 px-4 py-8"><div className="mx-auto max-w-4xl space-y-6">
    <div><p className="font-semibold text-primary">Docty Clinics</p><h1 className="text-3xl font-bold">Consultation Control</h1><p className="text-muted-foreground">Front desk assigns the patient and starts the room tablet automatically.</p></div>
    <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5"/>Register room tablet</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <div><Label>Device name</Label><Input value={deviceName} onChange={(e) => { setDeviceName(e.target.value); setPairingQr(''); }}/></div>
      <div><Label>Assign room</Label><Select value={room} onValueChange={setRoom}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{rooms.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex items-end sm:col-span-2"><Button className="w-full" onClick={() => void generateRegistrationQr()}><Tablet className="mr-2 h-4 w-4"/>Generate registration QR</Button></div>
      {pairingQr && <div className="flex flex-col items-center rounded-xl border bg-white p-5 sm:col-span-2"><img className="h-72 w-72" src={pairingQr} alt="Front desk device registration QR code"/><p className="mt-3 font-semibold">Scan from the tablet assigned to {room}</p><p className="text-sm text-muted-foreground">Fallback code: {pairingCode.slice(0,3)} {pairingCode.slice(3)}</p></div>}
      <div className="sm:col-span-2 rounded-xl bg-muted p-4 text-sm">{devices.length ? devices.map((device) => <p key={device.id}><b>{device.room}</b> · {device.name} · Registered</p>) : 'No tablets registered in this local trial.'}</div>
    </CardContent></Card>
    <Card className="rounded-2xl"><CardHeader><CardTitle className="flex items-center gap-2"><DoorOpen className="h-5 w-5"/>Start room session</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <div><Label>Room</Label><Select value={room} onValueChange={setRoom}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{rooms.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Appointment ID</Label><Input value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}/></div>
      <div className="sm:col-span-2"><Label>Patient</Label><Input value={patientName} onChange={(e) => setPatientName(e.target.value)}/></div>
      <div className="flex gap-3 sm:col-span-2"><Button className="flex-1" disabled={!patientName.trim() || !appointmentId.trim() || Boolean(active) || !devices.some((item) => item.room === room)} onClick={() => send('start')}><Play className="mr-2 h-4 w-4"/>Start consultation</Button><Button className="flex-1" variant="destructive" disabled={!active} onClick={() => send('stop')}><Square className="mr-2 h-4 w-4"/>End consultation</Button></div>
    </CardContent></Card>
    <Card className="rounded-2xl"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Room status</p><p className="mt-1 text-xl font-bold">{active ? `${active.room} · ${active.patientName} · Listening` : 'No active consultation'}</p></CardContent></Card>
  </div></div>;
}
