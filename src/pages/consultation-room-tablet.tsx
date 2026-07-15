import { useEffect, useRef, useState } from 'react';
import { ScribeClient } from 'med-scribe-alliance-ts-sdk';
import { Link2, Mic, MicOff, Radio, ShieldCheck, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { roomChannel, type RoomSessionCommand } from '@/lib/room-consultation-channel';
import { relay } from '@/lib/consultation-relay';
import { browserId } from '@/lib/browser-id';

type State = 'setup' | 'ready' | 'starting' | 'listening' | 'processing' | 'error';
export default function ConsultationRoomTabletPage() {
  const [device, setDevice] = useState<{ id: string; name: string; room: string } | null>(() => { try { return JSON.parse(localStorage.getItem('docty-consultation-device') || 'null'); } catch { return null; } });
  const room = device?.room || '';
  const [state, setState] = useState<State>('setup'); const [session, setSession] = useState<RoomSessionCommand | null>(null);
  const [seconds, setSeconds] = useState(0); const streamRef = useRef<MediaStream | null>(null); const recorderRef = useRef<MediaRecorder | null>(null);
  const scribeRef = useRef<ScribeClient | null>(null);

  async function startMicrophone(command?: RoomSessionCommand) {
    setState('starting');
    try {
      if (command) {
        const scribe = new ScribeClient({ baseUrl: `${window.location.origin}/api/ekascribe`, debug: false });
        scribe.registerCallback('onError', (event) => toast.error(event.error.message));
        const result = await scribe.startRecording({
          templates: ['clinical_notes_template'], uploadType: 'chunked', sessionMode: 'consultation',
          languageHint: ['auto_detect'], transcriptLanguage: 'en',
          patientDetails: { name: command.patientName }, txnId: command.sessionId,
        });
        if (!result.success) throw new Error(result.error.message);
        scribeRef.current = scribe; setSession(command); setSeconds(0); setState('listening');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access requires HTTPS on this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      streamRef.current = stream; recorderRef.current = new MediaRecorder(stream); recorderRef.current.start(5000);
      setSession(command || null); setSeconds(0); setState(command ? 'listening' : 'ready');
      if (!command) { recorderRef.current.stop(); stream.getTracks().forEach((track) => track.stop()); streamRef.current = null; toast.success('Microphone permission confirmed. Tablet is ready.'); }
    } catch (error) { setState('error'); toast.error(error instanceof Error ? error.message : 'Microphone permission is required for this tablet.'); }
  }
  async function stop() {
    if (scribeRef.current) {
      setState('processing');
      const result = await scribeRef.current.endRecording();
      if (!result.success) toast.error(result.error.message); else toast.success('Audio sent to EkaScribe for processing.');
      await scribeRef.current.reset(); scribeRef.current = null;
    }
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; recorderRef.current = null; setSession(null); setSeconds(0); setState('ready');
  }

  useEffect(() => { if (device) return; const query = new URLSearchParams(window.location.search); const pairingCode = query.get('pair')?.replace(/\D/g, '').slice(0,6) || ''; const assignedRoom = query.get('room') || ''; if (pairingCode.length !== 6 || !assignedRoom) return; const paired = { id: browserId(), name: query.get('name') || 'Room Tablet', room: assignedRoom }; localStorage.setItem('docty-consultation-device', JSON.stringify(paired)); setDevice(paired); void relay('/pairing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pairingCode, room: paired.room, deviceName: paired.name, deviceId: paired.id, action: 'claim' }) }); const channel = roomChannel(); channel.postMessage({ type: 'pair-request', room: paired.room, sessionId: '', appointmentId: '', patientName: '', sentAt: Date.now(), pairingCode, deviceId: paired.id, deviceName: paired.name } satisfies RoomSessionCommand); channel.close(); window.history.replaceState({}, '', '/consultation/tablet'); toast.success(`Registered to ${paired.room}. Requesting microphone permission…`); window.setTimeout(() => void startMicrophone(), 250); }, [device]);
  useEffect(() => { const channel = roomChannel(); channel.onmessage = (event: MessageEvent<RoomSessionCommand>) => { const command = event.data; if (!device || command.room !== device.room) return; if (command.type === 'start') void startMicrophone(command); else if (command.type === 'stop' && (session?.sessionId === command.sessionId || state === 'listening')) void stop(); }; return () => channel.close(); }, [device, session?.sessionId, state]);
  useEffect(() => { if (!device) return; let lastCommand = ''; const timer = window.setInterval(() => { void relay(`/command?room=${encodeURIComponent(device.room)}`).then((command) => { if (!command?.id || command.id === lastCommand) return; lastCommand = command.id; if (command.type === 'start') void startMicrophone(command); else if (command.type === 'stop') void stop(); }).catch(() => undefined); }, 1500); return () => window.clearInterval(timer); }, [device]);
  useEffect(() => { if (state !== 'listening') return; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [state]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); void scribeRef.current?.reset(); }, []);

  const time = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  return <div className={`min-h-screen px-5 py-8 ${state === 'listening' ? 'bg-emerald-950 text-white' : 'bg-slate-950 text-white'}`}><div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col">
    <header className="flex items-center justify-between gap-4"><div><p className="font-semibold text-emerald-400">Docty Clinics</p><h1 className="text-3xl font-bold">Room Tablet</h1></div>{device && <Badge className="bg-white/10 text-white">{device.name} · {device.room}</Badge>}</header>
    <main className="flex flex-1 items-center justify-center py-10"><Card className="w-full max-w-2xl border-white/10 bg-white/10 text-white shadow-2xl"><CardContent className="flex flex-col items-center p-10 text-center">
      {state === 'listening' ? <><div className="relative mb-8 flex h-36 w-36 items-center justify-center rounded-full bg-emerald-500"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-25"/><Radio className="h-16 w-16"/></div><Badge className="mb-4 bg-red-500 text-white">EKA SCRIBE · LISTENING</Badge><h2 className="text-4xl font-bold">{session?.patientName}</h2><p className="mt-2 text-lg text-white/70">{session?.appointmentId} · {room}</p><p className="mt-8 font-mono text-5xl font-bold">{time}</p><Button className="mt-10" size="lg" variant="destructive" onClick={() => void stop()}><Square className="mr-2 h-5 w-5"/>End consultation</Button></> : !device ? <><div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/10"><Link2 className="h-12 w-12 text-emerald-400"/></div><h2 className="text-3xl font-bold">Tablet not registered</h2><p className="mt-3 max-w-md text-white/65">Ask the front desk to generate a registration QR, then scan it with this tablet to open the pairing link.</p></> : <><div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-white/10">{state === 'error' ? <MicOff className="h-12 w-12 text-red-400"/> : <Mic className="h-12 w-12 text-emerald-400"/>}</div><h2 className="text-3xl font-bold">{state === 'ready' ? `${room} is ready` : state === 'starting' ? 'Starting EkaScribe…' : state === 'processing' ? 'Processing consultation…' : `${device.name} registered`}</h2><p className="mt-3 max-w-md text-white/65">{state === 'error' && !window.isSecureContext ? 'This browser requires an HTTPS address before it can grant microphone access.' : 'Grant microphone permission once. The tablet will then wait for the front desk to start a consultation.'}</p><Button className="mt-8" size="lg" onClick={() => void startMicrophone()}><ShieldCheck className="mr-2 h-5 w-5"/>{state === 'error' ? 'Retry microphone permission' : 'Test microphone & enable'}</Button></>}
    </CardContent></Card></main>
  </div></div>;
}
