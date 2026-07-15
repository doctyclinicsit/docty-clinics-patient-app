import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Activity, ArrowRight, Building2, CheckCircle2, ClipboardCheck, Copy, DollarSign, HeartPulse, Loader2, MessageCircle, Presentation, RefreshCw, Stethoscope, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Cohort = { id: string; name: string; starts_on: string; ends_on: string };
type Visit = {
  id: string; cohort_id: string; cohort_name: string; participant_type: string; participant_name: string;
  mobile: string; guardian_name?: string; external_id?: string; age?: string; gender?: string;
  token_number: string; session_token: string; journey_status: string; vitals_status: string;
  assessment_status: string; consultation_status: string; height_cm?: number; weight_kg?: number;
  bmi?: number; temperature_c?: number; pulse_bpm?: number; spo2_percent?: number;
  systolic?: number; diastolic?: number; respiratory_rate?: number; observations?: string;
  escalation_required?: boolean;
};
type QueueItem = { id: string; visit_id: string; specialty: string; room?: string; status: string; priority: number; queue_position: number; participant_name: string; token_number: string };
type Camp = { id: string; name: string; organization_name: string; organization_type: string; campus_name?: string };

const specialties = ['Paediatrics / General Medicine', 'Dental', 'Nutrition', 'Mental Wellbeing', 'Eye', 'ENT / Audiometry'];

function statusLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assessmentGroup(name: string) {
  const value = name.toLowerCase();
  if (value.includes('pre')) return 'pre-primary';
  if (value.includes('1-2') || value.includes('1–2')) return 'grades-1-2';
  if (value.includes('3-5') || value.includes('3–5')) return 'grades-3-5';
  if (value.includes('6-8') || value.includes('6–8')) return 'grades-6-8';
  return 'grades-9-12';
}

export default function CorporateCampOperationsPage() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const station = pathname.split('/').filter(Boolean)[1] || 'operations';
  const stationDesk = ['registration', 'nursing', 'hall', 'queue', 'participants'].includes(station) ? station : '';
  const [selectedDesk, setSelectedDesk] = useState(params.get('desk') || 'registration');
  const activeDesk = stationDesk || selectedDesk;
  const stationNames: Record<string, string> = {
    registration: 'Registration Desk', nursing: 'Nursing Station', hall: 'Hall 1 Assessment',
    queue: 'Consultation Queue Manager', participants: 'Participant Tracking', operations: 'Live Operations',
  };
  const stationSources: Record<string, string> = {
    registration: 'New check-ins are published to the Nursing Station.',
    nursing: 'Listening for new registrations every 2 seconds.',
    hall: 'Listening for participants cleared by the Nursing Station.',
    queue: 'Listening for cohorts completed by the Hall 1 presenter.',
    participants: 'Listening to every camp journey transition.',
  };
  const [campId, setCampId] = useState(params.get('camp') || '');
  const stationSessionKey = stationDesk && params.get('camp') ? `docty-station-session:${params.get('camp')}:${stationDesk}` : '';
  const [stationToken, setStationToken] = useState(() => stationSessionKey ? window.sessionStorage.getItem(stationSessionKey) || '' : '');
  const [authMobile, setAuthMobile] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authOtpSent, setAuthOtpSent] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [stationStaffName, setStationStaffName] = useState('');
  const [camp, setCamp] = useState<Camp | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [participantType, setParticipantType] = useState('student');
  const [vitalsVisit, setVitalsVisit] = useState<Visit | null>(null);
  const [lastRegistration, setLastRegistration] = useState<{ token: string; url: string; name: string } | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(specialties.slice(0, 4));
  const knownNursingIds = useRef<Set<string>>(new Set());
  const knownHallIds = useRef<Set<string>>(new Set());
  const knownQueueIds = useRef<Set<string>>(new Set());
  const hasLoadedStation = useRef(false);

  const loadDashboard = async (id = campId, silent = false) => {
    if (!id) return;
    if (stationDesk && !stationToken) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const stationQuery = stationDesk ? `&station=${encodeURIComponent(stationDesk)}` : '';
      const response = await fetch(`/api/camp-operations?campId=${encodeURIComponent(id)}${stationQuery}`, {
        cache: 'no-store', headers: stationToken ? { Authorization: `Bearer ${stationToken}` } : undefined,
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401 && stationDesk) {
        if (stationSessionKey) window.sessionStorage.removeItem(stationSessionKey);
        setStationToken(''); setStationStaffName(''); setAuthOtpSent(false);
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to load camp operations.');
      const nextVisits: Visit[] = body.visits || [];
      const nextQueues: QueueItem[] = body.queues || [];
      const nursingIds = new Set(nextVisits.filter((visit) => visit.vitals_status !== 'completed').map((visit) => visit.id));
      const hallIds = new Set(nextVisits.filter((visit) => visit.vitals_status === 'completed' && !visit.escalation_required && visit.assessment_status !== 'completed').map((visit) => visit.id));
      const queueIds = new Set(nextQueues.filter((item) => item.status === 'waiting').map((item) => item.id));
      if (hasLoadedStation.current && silent) {
        if (stationDesk === 'nursing') nextVisits.filter((visit) => nursingIds.has(visit.id) && !knownNursingIds.current.has(visit.id)).forEach((visit) => toast.info(`${visit.token_number} received from Registration Desk.`));
        if (stationDesk === 'hall') nextVisits.filter((visit) => hallIds.has(visit.id) && !knownHallIds.current.has(visit.id)).forEach((visit) => toast.info(`${visit.token_number} cleared by Nursing Station.`));
        if (stationDesk === 'queue') nextQueues.filter((item) => queueIds.has(item.id) && !knownQueueIds.current.has(item.id)).forEach((item) => toast.info(`${item.token_number} added to ${item.specialty}.`));
      }
      knownNursingIds.current = nursingIds;
      knownHallIds.current = hallIds;
      knownQueueIds.current = queueIds;
      hasLoadedStation.current = true;
      setCamp(body.camp); setCohorts(body.cohorts || []); setVisits(body.visits || []); setQueues(body.queues || []);
      if (body.stationSession?.staffName) setStationStaffName(body.stationSession.staffName);
      setSelectedCohort((current) => current || body.cohorts?.[0]?.id || '');
    } catch (error) { if (!silent) toast.error(error instanceof Error ? error.message : 'Unable to load camp operations.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (campId) { void loadDashboard(campId); return; }
    fetch('/api/school-camp-admin').then((response) => response.json()).then((body) => {
      const id = body?.camps?.[0]?.id || '';
      setCampId(id);
      if (id) void loadDashboard(id);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (stationDesk && stationToken && campId) void loadDashboard(campId);
  }, [campId, stationDesk, stationToken]);

  useEffect(() => {
    if (!campId || cohorts.length === 0) return;
    Promise.all(cohorts.map(async (cohort) => {
      const url = `${window.location.origin}/Corporate/operations?camp=${encodeURIComponent(campId)}&cohort=${encodeURIComponent(cohort.id)}&desk=registration`;
      return [cohort.id, await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#073b55', light: '#ffffff' } })] as const;
    })).then((items) => setQrCodes(Object.fromEntries(items))).catch(() => undefined);
  }, [campId, cohorts]);

  useEffect(() => {
    const cohort = params.get('cohort');
    if (cohort) setSelectedCohort(cohort);
  }, [params]);

  useEffect(() => {
    if (!campId || (stationDesk && !stationToken)) return undefined;
    const timer = window.setInterval(() => void loadDashboard(campId, true), stationDesk ? 2000 : 5000);
    return () => window.clearInterval(timer);
  }, [campId, stationDesk, stationToken]);

  const post = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/camp-operations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(stationToken ? { Authorization: `Bearer ${stationToken}` } : {}) }, body: JSON.stringify({ ...payload, ...(stationDesk ? { station: stationDesk } : {}) }) });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message || 'Unable to update camp operations.');
    return body;
  };

  const authenticateStation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setAuthMessage(authOtpSent ? 'Verifying OTP...' : 'Checking assignment...');
    try {
      const response = await fetch('/api/camp-station-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: authOtpSent ? 'verify-otp' : 'send-otp', campId, stationType: stationDesk, mobile: authMobile, otp: authOtp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify station access.');
      if (!authOtpSent) { setAuthOtpSent(true); setAuthMessage('OTP sent to your assigned WhatsApp number.'); return; }
      if (stationSessionKey) window.sessionStorage.setItem(stationSessionKey, body.token);
      setStationStaffName(body.staffName || ''); setStationToken(body.token); setAuthMessage('');
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Unable to verify station access.'); }
    finally { setSaving(false); }
  };

  const endStationSession = () => {
    if (stationSessionKey) window.sessionStorage.removeItem(stationSessionKey);
    setStationToken(''); setStationStaffName(''); setAuthOtp(''); setAuthOtpSent(false);
  };

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const body = await post({ action: 'register', campId, cohortId: selectedCohort, participantType, participantName: form.get('participantName'), mobile: form.get('mobile'), guardianName: form.get('guardianName'), externalId: form.get('externalId'), age: form.get('age'), gender: form.get('gender') });
      setLastRegistration({ token: body.visit.token_number, url: body.participantUrl, name: body.visit.participant_name });
      event.currentTarget.reset(); toast.success(`${body.visit.token_number} registered. Send to Nursing Station.`); await loadDashboard();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to register participant.'); }
    finally { setSaving(false); }
  };

  const saveVitals = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!vitalsVisit) return; setSaving(true);
    const form = new FormData(event.currentTarget);
    const value = (key: string) => form.get(key) || '';
    try {
      await post({ action: 'record-vitals', visitId: vitalsVisit.id, heightCm: value('heightCm'), weightKg: value('weightKg'), temperatureC: value('temperatureC'), pulseBpm: value('pulseBpm'), spo2Percent: value('spo2Percent'), systolic: value('systolic'), diastolic: value('diastolic'), respiratoryRate: value('respiratoryRate'), observations: value('observations'), escalationRequired: form.get('escalationRequired') === 'on', recordedBy: 'Nursing Station' });
      setVitalsVisit(null); toast.success('Vitals confirmed. Journey updated.'); await loadDashboard();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save vitals.'); }
    finally { setSaving(false); }
  };

  const completeCohortAssessment = async (cohortId: string) => {
    setSaving(true);
    try {
      const body = await post({ action: 'assessment-complete-cohort', cohortId, specialties: selectedSpecialties });
      toast.success(`${body.updated} participants moved to consultation waiting.`); await loadDashboard();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to complete cohort assessment.'); }
    finally { setSaving(false); }
  };

  const updateQueue = async (item: QueueItem, status: string) => {
    setSaving(true);
    try { await post({ action: 'queue-update', queueId: item.id, visitId: item.visit_id, status, room: item.room || '' }); await loadDashboard(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update queue.'); }
    finally { setSaving(false); }
  };

  const nursingQueue = visits.filter((visit) => visit.vitals_status !== 'completed');
  const hallEligible = visits.filter((visit) => visit.vitals_status === 'completed' && !visit.escalation_required && visit.assessment_status !== 'completed');
  const waitingCount = queues.filter((item) => item.status === 'waiting').length;
  const activeCount = queues.filter((item) => item.status === 'called' || item.status === 'in_progress').length;
  const queueGroups = useMemo(() => Array.from(new Set(queues.map((item) => item.specialty))), [queues]);
  const allMetrics = [
    [Users, visits.length, 'Registered', 'registration'],
    [HeartPulse, nursingQueue.length, 'Awaiting vitals', 'nursing'],
    [Presentation, hallEligible.length, 'Hall 1 eligible', 'hall'],
    [Stethoscope, waitingCount, 'Consultation waiting', 'queue'],
    [Activity, activeCount, 'Called / active', 'queue'],
  ];
  const visibleMetrics = stationDesk && stationDesk !== 'participants'
    ? allMetrics.filter((metric) => metric[3] === stationDesk)
    : allMetrics;

  if (stationDesk && !stationToken) return <main className="flex min-h-screen items-center justify-center bg-[#f3f6f8] p-4"><Card className="w-full max-w-md rounded-lg shadow-sm"><CardContent className="p-6"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-10 w-auto" /><p className="mt-6 text-xs font-bold uppercase text-sky-600">{stationNames[stationDesk]}</p><h1 className="mt-1 text-2xl font-bold">Staff session access</h1><p className="mt-2 text-sm leading-6 text-slate-500">Use the mobile number assigned to this camp station. Access ends when this browser session closes or the server session expires.</p><form className="mt-5 grid gap-4" onSubmit={(event) => void authenticateStation(event)}><div><Label>Assigned mobile</Label><Input value={authMobile} onChange={(event) => setAuthMobile(event.target.value)} inputMode="numeric" maxLength={10} required disabled={authOtpSent} /></div>{authOtpSent && <div><Label>WhatsApp OTP</Label><Input value={authOtp} onChange={(event) => setAuthOtp(event.target.value)} inputMode="numeric" maxLength={8} required autoFocus /></div>}<Button disabled={saving || !campId}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{authOtpSent ? 'Verify OTP & Start Session' : 'Send OTP'}</Button>{authMessage && <p className="text-sm text-slate-600">{authMessage}</p>}</form></CardContent></Card></main>;

  if (loading && !camp) return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-7 w-7 animate-spin text-sky-600" /></main>;

  return <main className="min-h-screen bg-[#f3f6f8] text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-7"><div className="flex items-center gap-4"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-10 w-auto" /><div className="h-8 w-px bg-slate-200" /><div><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase text-sky-600">{stationNames[station] || 'Live Operations'}</p>{stationDesk && <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live sync</span>}</div><h1 className="text-xl font-bold">{camp?.name || 'Corporate Wellness Camp'}</h1></div></div><div className="flex items-center gap-2">{stationDesk && stationStaffName && <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{stationStaffName}</span>}{stationDesk && <Button variant="outline" onClick={endStationSession}>End Session</Button>}<Button variant="outline" onClick={() => void loadDashboard()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>{!stationDesk && <Button asChild variant="outline"><Link to="/Corporate/camps"><Building2 className="mr-2 h-4 w-4" />Camp Admin</Link></Button>}</div></div></header>
    <section className="mx-auto max-w-[1500px] px-4 py-6 lg:px-7">
      <div className="mb-5"><p className="font-semibold text-slate-500">{camp?.organization_name} · {camp?.campus_name || 'Primary location'}</p><h2 className="mt-1 text-3xl font-bold">{stationDesk ? stationNames[stationDesk] : 'Camp Operations Board'}</h2>{stationDesk && <p className="mt-1 text-sm text-slate-500">{stationSources[stationDesk]}</p>}</div>
      {!stationDesk && <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{[
        ['registration', UserPlus, 'Registration Desk'], ['nursing', HeartPulse, 'Nursing Station'], ['hall', Presentation, 'Hall 1'], ['queue', Stethoscope, 'Queue Manager'], ['participants', Users, 'Participant Tracking'], ['finance', DollarSign, 'Camp Finance'],
      ].map(([path, Icon, label]) => <Button key={String(path)} asChild variant="outline" className="h-14 justify-start bg-white"><Link to={`/Corporate/${path}?camp=${encodeURIComponent(campId)}`}><Icon className="mr-2 h-5 w-5 text-sky-700" />{label as string}<ArrowRight className="ml-auto h-4 w-4" /></Link></Button>)}</div>}
      <div className={`mb-5 grid gap-3 sm:grid-cols-2 ${!stationDesk ? 'xl:grid-cols-5' : 'max-w-xl'}`}>{visibleMetrics.map(([Icon, value, label]) => <Card key={String(label)} className="rounded-lg border-slate-200 shadow-none"><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-sky-700" /><div><p className="text-2xl font-bold">{value as number}</p><p className="text-xs text-slate-500">{label as string}</p></div></CardContent></Card>)}</div>
      <Tabs value={activeDesk} onValueChange={setSelectedDesk} className="gap-4">
        {!stationDesk && <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-md border bg-white p-1"><TabsTrigger value="registration"><UserPlus />Registration</TabsTrigger><TabsTrigger value="nursing"><HeartPulse />Nursing Station</TabsTrigger><TabsTrigger value="hall"><Presentation />Hall 1</TabsTrigger><TabsTrigger value="queue"><Stethoscope />Queue Manager</TabsTrigger><TabsTrigger value="participants"><Users />Participants</TabsTrigger></TabsList>}
        <TabsContent value="registration"><div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <Card className="rounded-lg shadow-none"><CardContent className="p-5"><div className="mb-4"><h3 className="text-lg font-bold">Register participant</h3><p className="text-sm text-slate-500">Registration immediately creates the camp visit and Nursing Station token.</p></div><form className="grid gap-4" onSubmit={register}><div className="grid gap-3 md:grid-cols-2"><div><Label>Cohort</Label><Select value={selectedCohort} onValueChange={setSelectedCohort}><SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger><SelectContent>{cohorts.map((cohort) => <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Participant type</Label><Select value={participantType} onValueChange={setParticipantType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="employee">Employee</SelectItem><SelectItem value="participant">Other participant</SelectItem></SelectContent></Select></div></div><div className="grid gap-3 md:grid-cols-2"><div><Label>Name</Label><Input name="participantName" required /></div><div><Label>{participantType === 'student' ? 'Parent mobile' : 'Mobile'}</Label><Input name="mobile" inputMode="numeric" maxLength={10} required /></div></div><div className="grid gap-3 md:grid-cols-3"><div><Label>{participantType === 'student' ? 'Student ID' : 'Employee ID'}</Label><Input name="externalId" /></div><div><Label>Age</Label><Input name="age" /></div><div><Label>Gender</Label><select name="gender" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"><option value="">Select</option><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select></div></div>{participantType === 'student' && <div><Label>Parent / guardian name</Label><Input name="guardianName" /></div>}<Button disabled={saving || !selectedCohort}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Register & Check In</Button></form>{lastRegistration && <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-emerald-900">{lastRegistration.name} · {lastRegistration.token}</p><p className="mt-1 text-sm text-emerald-800">Proceed to Nursing Station.</p></div><Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${lastRegistration.url}`).then(() => toast.success('Journey link copied.'))}><Copy className="mr-2 h-4 w-4" />Copy Link</Button></div></div>}</CardContent></Card>
          <Card className="rounded-lg shadow-none"><CardContent className="p-5"><h3 className="text-lg font-bold">Cohort registration QR</h3><p className="mb-4 text-sm text-slate-500">Print or display the QR at the organization registration desk.</p><Select value={selectedCohort} onValueChange={setSelectedCohort}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cohorts.map((cohort) => <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>)}</SelectContent></Select>{qrCodes[selectedCohort] && <img src={qrCodes[selectedCohort]} alt="Cohort registration QR" className="mx-auto mt-5 h-56 w-56" />}<p className="mt-3 text-center text-sm font-semibold">{cohorts.find((item) => item.id === selectedCohort)?.name}</p></CardContent></Card>
        </div></TabsContent>
        <TabsContent value="nursing"><Card className="rounded-lg shadow-none"><CardContent className="p-0"><div className="border-b p-4"><h3 className="font-bold">Nursing Station queue</h3><p className="text-sm text-slate-500">Vitals confirmation controls admission to Hall 1.</p></div>{nursingQueue.length ? <div className="divide-y">{nursingQueue.map((visit) => <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="flex items-center gap-2"><span className="font-bold">{visit.token_number}</span><span>{visit.participant_name}</span></div><p className="text-sm text-slate-500">{visit.cohort_name} · {visit.mobile}</p></div><Button onClick={() => setVitalsVisit(visit)}><HeartPulse className="mr-2 h-4 w-4" />Record Vitals</Button></div>)}</div> : <div className="p-10 text-center text-slate-500">No participants are waiting for vitals.</div>}</CardContent></Card></TabsContent>
        <TabsContent value="hall"><div className="grid gap-4 lg:grid-cols-2">{cohorts.map((cohort) => { const eligible = hallEligible.filter((visit) => visit.cohort_id === cohort.id); return <Card key={cohort.id} className="rounded-lg shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{cohort.name}</h3><p className="text-sm text-slate-500">{eligible.length} eligible after vitals</p></div><Badge variant="outline">{visits.filter((visit) => visit.cohort_id === cohort.id && visit.assessment_status === 'completed').length} completed</Badge></div><div className="my-4 flex flex-wrap gap-2">{eligible.map((visit) => <Badge key={visit.id} variant="secondary">{visit.token_number}</Badge>)}</div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><a href={`/Corporate/camp?group=${assessmentGroup(cohort.name)}&mode=presenter&camp=${encodeURIComponent(campId)}&cohort=${encodeURIComponent(cohort.id)}&specialties=${encodeURIComponent(selectedSpecialties.join('|'))}`} target="_blank" rel="noreferrer"><Presentation className="mr-2 h-4 w-4" />Launch Presenter</a></Button><Button disabled={saving || eligible.length === 0} onClick={() => void completeCohortAssessment(cohort.id)}><CheckCircle2 className="mr-2 h-4 w-4" />Finish Cohort</Button></div><div className="mt-4 flex flex-wrap gap-2">{specialties.map((specialty) => <button key={specialty} type="button" onClick={() => setSelectedSpecialties((current) => current.includes(specialty) ? current.filter((item) => item !== specialty) : [...current, specialty])} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedSpecialties.includes(specialty) ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-500'}`}>{specialty}</button>)}</div></CardContent></Card>; })}</div></TabsContent>
        <TabsContent value="queue"><div className="grid gap-4 xl:grid-cols-2">{queueGroups.length ? queueGroups.map((specialty) => <Card key={specialty} className="rounded-lg shadow-none"><CardContent className="p-0"><div className="border-b p-4"><h3 className="font-bold">{specialty}</h3><p className="text-sm text-slate-500">Ordered by registration, with manual call controls.</p></div><div className="divide-y">{queues.filter((item) => item.specialty === specialty).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="flex items-center gap-2"><span className="font-bold">{item.token_number}</span><span>{item.participant_name}</span><Badge variant="outline">{statusLabel(item.status)}</Badge></div><p className="mt-1 text-xs text-slate-500">Position {item.queue_position}{item.room ? ` · ${item.room}` : ''}</p></div><div className="flex gap-2">{item.status === 'waiting' && <Button size="sm" onClick={() => void updateQueue(item, 'called')}>Call</Button>}{item.status === 'called' && <Button size="sm" onClick={() => void updateQueue(item, 'in_progress')}>Start</Button>}{item.status === 'in_progress' && <Button size="sm" onClick={() => void updateQueue(item, 'completed')}>Complete</Button>}{!['completed', 'declined', 'not_required'].includes(item.status) && <Button size="sm" variant="outline" onClick={() => void updateQueue(item, 'no_show')}>No Show</Button>}</div></div>)}</div></CardContent></Card>) : <Card className="rounded-lg shadow-none xl:col-span-2"><CardContent className="p-12 text-center text-slate-500">Consultation queues will appear after a cohort assessment is finished.</CardContent></Card>}</div></TabsContent>
        <TabsContent value="participants"><Card className="rounded-lg shadow-none"><CardContent className="p-0"><div className="border-b p-4"><h3 className="font-bold">Participant journey</h3><p className="text-sm text-slate-500">Live position of every registered participant.</p></div><div className="divide-y">{visits.map((visit) => <div key={visit.id} className="grid gap-3 p-4 md:grid-cols-[110px_1fr_190px_auto] md:items-center"><span className="font-bold">{visit.token_number}</span><div><p className="font-semibold">{visit.participant_name}</p><p className="text-xs text-slate-500">{visit.cohort_name}</p></div><Badge className="w-fit" variant="outline">{statusLabel(visit.journey_status)}</Badge><Button size="sm" variant="ghost" asChild><a href={`/Corporate/journey?session=${visit.session_token}`} target="_blank" rel="noreferrer">View <ArrowRight className="ml-2 h-4 w-4" /></a></Button></div>)}</div></CardContent></Card></TabsContent>
      </Tabs>
    </section>
    <Dialog open={Boolean(vitalsVisit)} onOpenChange={(open) => { if (!open) setVitalsVisit(null); }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Record vitals · {vitalsVisit?.token_number}</DialogTitle></DialogHeader>{vitalsVisit && <form className="grid gap-4" onSubmit={saveVitals}><div className="rounded-md bg-slate-50 p-3"><p className="font-bold">{vitalsVisit.participant_name}</p><p className="text-sm text-slate-500">{vitalsVisit.cohort_name}</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><Label>Height cm</Label><Input name="heightCm" type="number" step="0.1" required /></div><div><Label>Weight kg</Label><Input name="weightKg" type="number" step="0.1" required /></div><div><Label>Temperature °C</Label><Input name="temperatureC" type="number" step="0.1" /></div><div><Label>Pulse bpm</Label><Input name="pulseBpm" type="number" /></div><div><Label>SpO₂ %</Label><Input name="spo2Percent" type="number" /></div><div><Label>Systolic</Label><Input name="systolic" type="number" /></div><div><Label>Diastolic</Label><Input name="diastolic" type="number" /></div><div><Label>Respiratory rate</Label><Input name="respiratoryRate" type="number" /></div></div><div><Label>Observations</Label><Input name="observations" /></div><label className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold"><input type="checkbox" name="escalationRequired" />Clinical review required before Hall 1</label><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Vitals & Update Journey</Button></form>}</DialogContent></Dialog>
  </main>;
}
