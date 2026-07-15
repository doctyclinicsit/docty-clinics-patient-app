import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, CheckCircle2, Clock3, HeartPulse, Loader2, MapPin, MessageCircle, RefreshCw, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Visit = {
  participant_name: string; token_number: string; journey_status: string; vitals_status: string;
  cohort_name: string; camp_name: string; organization_name: string; height_cm?: number;
  weight_kg?: number; bmi?: number; pulse_bpm?: number; spo2_percent?: number;
  systolic?: number; diastolic?: number;
};
type QueueItem = { id: string; specialty: string; room?: string; status: string; queue_position: number };
type Notification = { id: string; message: string; created_at: string };
type JourneyData = { visit: Visit; queues: QueueItem[]; notifications: Notification[] };

const journeyCopy: Record<string, { title: string; instruction: string }> = {
  registered: { title: 'Registration complete', instruction: 'Please proceed to the Nursing Station for your vital checks.' },
  hall_1_waiting: { title: 'Ready for Hall 1', instruction: 'Your vitals are confirmed. Please proceed to Hall 1 and wait for the presenter.' },
  clinical_review: { title: 'Clinical review required', instruction: 'Please remain at the Nursing Station for a clinician review.' },
  consultation_waiting: { title: 'Please remain in the waiting room', instruction: 'Your assessment is complete. We will call your token for each consultation.' },
  called_for_consultation: { title: 'Your token has been called', instruction: 'Please check the consultation below and proceed to the assigned room.' },
  consultation_in_progress: { title: 'Consultation in progress', instruction: 'Your next update will appear here automatically.' },
  report_pending: { title: 'All consultations complete', instruction: 'Thank you. Your Health Passport is being prepared and will be shared after clinical review.' },
};

function label(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (status === 'called') return 'border-rose-300 bg-rose-50 text-rose-800';
  if (status === 'in_progress') return 'border-sky-300 bg-sky-50 text-sky-800';
  if (['completed', 'declined', 'not_required'].includes(status)) return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  return 'border-slate-200 bg-white text-slate-700';
}

export default function CorporateCampJourneyPage() {
  const [params] = useSearchParams();
  const session = params.get('session') || '';
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (quiet = false) => {
    if (!session) { setError('This journey link is incomplete.'); setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/camp-operations?session=${encodeURIComponent(session)}`, { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load your camp journey.');
      setData(body); setError('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load your camp journey.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [session]);

  const currentCall = useMemo(() => data?.queues.find((item) => item.status === 'called' || item.status === 'in_progress'), [data]);
  const copy = data ? (journeyCopy[data.visit.journey_status] || journeyCopy.registered) : journeyCopy.registered;

  if (loading && !data) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-sky-600" /></main>;
  if (error && !data) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><Card className="w-full max-w-md rounded-lg shadow-none"><CardContent className="p-7 text-center"><p className="font-bold">Journey unavailable</p><p className="mt-2 text-sm text-slate-500">{error}</p><Button className="mt-5" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></CardContent></Card></main>;
  if (!data) return null;

  const { visit, queues, notifications } = data;
  const vitals = [
    ['Height', visit.height_cm, 'cm'], ['Weight', visit.weight_kg, 'kg'], ['BMI', visit.bmi, ''],
    ['Pulse', visit.pulse_bpm, 'bpm'], ['SpO2', visit.spo2_percent, '%'],
    ['BP', visit.systolic && visit.diastolic ? `${visit.systolic}/${visit.diastolic}` : null, ''],
  ];

  return <main className="min-h-screen bg-[#f2f7f9] text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-9 w-auto" /><Badge variant="outline" className="text-sm">{visit.token_number}</Badge></div></header>
    <section className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <div><p className="text-sm font-semibold text-sky-700">{visit.organization_name}</p><h1 className="mt-1 text-2xl font-bold">Hello, {visit.participant_name}</h1><p className="mt-1 text-sm text-slate-500">{visit.camp_name} / {visit.cohort_name}</p></div>
      <Card className={`overflow-hidden rounded-lg border-0 shadow-sm ${currentCall ? 'bg-rose-600' : 'bg-[#073b55]'} text-white`}><CardContent className="p-5"><div className="flex items-start gap-3">{currentCall ? <MapPin className="mt-1 h-6 w-6 shrink-0" /> : <Activity className="mt-1 h-6 w-6 shrink-0" />}<div><p className="text-xs font-bold uppercase opacity-75">Current update</p><h2 className="mt-1 text-xl font-bold">{currentCall ? `${currentCall.specialty} called` : copy.title}</h2><p className="mt-2 text-sm leading-6 opacity-90">{currentCall ? `Please proceed now${currentCall.room ? ` to ${currentCall.room}` : ''}.` : copy.instruction}</p></div></div></CardContent></Card>
      {visit.vitals_status === 'completed' && <Card className="rounded-lg shadow-none"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><HeartPulse className="h-5 w-5 text-rose-600" /><h2 className="font-bold">Vitals confirmed</h2><CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" /></div><div className="grid grid-cols-3 gap-3 text-center">{vitals.map(([name, value, unit]) => <div key={String(name)} className="rounded-md bg-slate-50 p-3"><p className="text-xs text-slate-500">{name}</p><p className="mt-1 font-bold">{value ?? '--'}{value !== null && value !== undefined && unit ? ` ${unit}` : ''}</p></div>)}</div></CardContent></Card>}
      {queues.length > 0 && <Card className="rounded-lg shadow-none"><CardContent className="p-0"><div className="flex items-center gap-2 border-b p-4"><Stethoscope className="h-5 w-5 text-sky-700" /><h2 className="font-bold">Consultations</h2></div><div className="divide-y">{queues.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{item.specialty}</p><p className="mt-1 text-xs text-slate-500">Queue position {item.queue_position}{item.room ? ` / ${item.room}` : ''}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(item.status)}`}>{label(item.status)}</span></div>)}</div></CardContent></Card>}
      <Card className="rounded-lg shadow-none"><CardContent className="p-0"><div className="flex items-center gap-2 border-b p-4"><MessageCircle className="h-5 w-5 text-sky-700" /><h2 className="font-bold">Journey updates</h2><span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />Live</span></div><div className="divide-y">{notifications.length ? notifications.map((item) => <div key={item.id} className="p-4"><p className="text-sm leading-6">{item.message}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div>) : <p className="p-4 text-sm text-slate-500">Updates will appear here throughout the camp.</p>}</div></CardContent></Card>
      <p className="pb-5 text-center text-xs text-slate-400">This page refreshes automatically. Keep it open during the camp.</p>
    </section>
  </main>;
}
