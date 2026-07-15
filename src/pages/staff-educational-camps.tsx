import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, ChevronRight, ClipboardCheck, FileBarChart, GraduationCap, Loader2, MapPin, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Institution = { id: string; name: string; short_name?: string; city: string; contact_name?: string; contact_mobile?: string; logo_url?: string; organization_type?: 'school' | 'corporate_office' | 'business' | 'community' | 'centre'; status: string };
type Cohort = { id?: string; camp_id?: string; name: string; starts_on?: string; ends_on?: string; startsOn?: string; endsOn?: string; sort_order?: number };
type StationAssignment = { id: string; staff_name: string; staff_mobile: string; staff_role?: string };
type CampStation = { id: string; cohort_id: string; cohort_name: string; station_type: string; station_name: string; assignments: StationAssignment[] };
type Camp = { id: string; institution_id: string; institution_name: string; institution_short_name?: string; institution_logo_url?: string; name: string; campus_name?: string; starts_on: string; ends_on: string; status: string; camp_category?: string; grades: string[]; cohorts?: Cohort[]; stations?: CampStation[]; finance_summary?: { sales: number; expenses: number; net: number }; expected_students: number; registered_students: number; attended_students: number; passports_generated: number; report_status: string };

const sampleInstitution: Institution = { id: 'sample-sgts', name: 'Sri Gayathri Techno School', short_name: 'SGTS', city: 'Manikonda, Hyderabad', logo_url: '/sri-gayathri-techno-school-logo.png', status: 'active' };
const sampleCamp: Camp = { id: 'sample-little-champs', institution_id: sampleInstitution.id, institution_name: sampleInstitution.name, institution_short_name: 'SGTS', institution_logo_url: sampleInstitution.logo_url, name: 'Little Champs Wellness Camp', campus_name: 'Manikonda Campus', starts_on: '2026-07-18', ends_on: '2026-08-15', status: 'planning', grades: ['Pre-Primary', 'Grades 1-2', 'Grades 3-5', 'Grades 6-8', 'Grades 9-10'], expected_students: 250, registered_students: 0, attended_students: 0, passports_generated: 0, report_status: 'not_started' };

function formatDate(value: string) {
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? 'Date pending'
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}
function statusLabel(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatMoney(value?: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function organizationTypeLabel(value?: string) { return value === 'corporate_office' ? 'Corporate Office' : value === 'business' ? 'Business' : value === 'community' ? 'Community / NGO' : value === 'centre' ? 'Docty Centre' : 'School'; }
function campCategoryLabel(value?: string) { return value === 'corporate' ? 'Corporate' : value === 'community' ? 'Community' : value === 'centre' ? 'Centre Camp' : value === 'outreach' ? 'Outreach' : value === 'other' ? 'Other' : 'School'; }

export default function StaffEducationalCampsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [query, setQuery] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [campOpen, setCampOpen] = useState(false);
  const [estimateCamp, setEstimateCamp] = useState<Camp | null>(null);
  const [editInstitution, setEditInstitution] = useState<Institution | null>(null);
  const [editCamp, setEditCamp] = useState<Camp | null>(null);
  const [scheduleCamp, setScheduleCamp] = useState<Camp | null>(null);
  const [assignmentCamp, setAssignmentCamp] = useState<Camp | null>(null);
  const [cohortDraft, setCohortDraft] = useState<Array<{ id?: string; name: string; startsOn: string; endsOn: string }>>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/school-camp-admin');
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load camps.');
      setInstitutions(body.institutions || []); setCamps(body.camps || []);
    } catch (error) {
      setInstitutions([sampleInstitution]); setCamps([sampleCamp]);
      toast.warning(error instanceof Error ? `${error.message} Showing the current camp preview.` : 'Showing the current camp preview.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => camps.filter((camp) => {
    const matchesInstitution = institutionFilter === 'all' || camp.institution_id === institutionFilter;
    const haystack = `${camp.institution_name} ${camp.name} ${camp.campus_name || ''}`.toLowerCase();
    return matchesInstitution && haystack.includes(query.trim().toLowerCase());
  }), [camps, institutionFilter, query]);

  const postForm = async (event: FormEvent<HTMLFormElement>, resource: 'institution' | 'camp') => {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { resource };
    form.forEach((value, key) => { payload[key] = value; });
    if (resource === 'camp') payload.grades = String(payload.grades || '').split(',').map((item) => item.trim()).filter(Boolean);
    try {
      const response = await fetch('/api/school-camp-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to save.');
      toast.success(resource === 'camp' ? 'Camp created.' : 'Institution added.');
      setCampOpen(false); setInstitutionOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save.'); }
    finally { setSaving(false); }
  };

  const updateEstimate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!estimateCamp) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetch('/api/school-camp-admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campId: estimateCamp.id, expectedStudents: Number(form.get('expectedStudents')) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to update the estimate.');
      setCamps((current) => current.map((camp) => camp.id === estimateCamp.id ? { ...camp, expected_students: Number(body.camp.expected_students) } : camp));
      setEstimateCamp(null);
      toast.success('Estimated student count updated.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update the estimate.'); }
    finally { setSaving(false); }
  };

  const updateRecord = async (event: FormEvent<HTMLFormElement>, resource: 'institution' | 'camp') => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { resource };
    form.forEach((value, key) => { payload[key] = value; });
    if (resource === 'institution' && editInstitution) payload.institutionId = editInstitution.id;
    if (resource === 'camp' && editCamp) {
      payload.campId = editCamp.id;
      payload.expectedStudents = Number(payload.expectedStudents);
      payload.grades = String(payload.grades || '').split(',').map((item) => item.trim()).filter(Boolean);
    }
    setSaving(true);
    try {
      const response = await fetch('/api/school-camp-admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to save changes.');
      setEditInstitution(null); setEditCamp(null);
      toast.success(resource === 'institution' ? 'Institution updated.' : 'Camp updated.');
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save changes.'); }
    finally { setSaving(false); }
  };

  const openCohortSchedule = (camp: Camp) => {
    const defaultStart = camp.starts_on.slice(0, 10);
    const defaultEnd = camp.ends_on.slice(0, 10);
    const rows = camp.cohorts?.length ? camp.cohorts : (camp.grades || []).map((name) => ({ name }));
    setCohortDraft(rows.map((cohort) => ({
      id: cohort.id,
      name: cohort.name,
      startsOn: (cohort.starts_on || cohort.startsOn || defaultStart).slice(0, 10),
      endsOn: (cohort.ends_on || cohort.endsOn || defaultEnd).slice(0, 10),
    })));
    setScheduleCamp(camp);
  };

  const saveCohortSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleCamp) return;
    setSaving(true);
    try {
      const response = await fetch('/api/school-camp-admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'cohorts', campId: scheduleCamp.id, cohorts: cohortDraft }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to save cohort dates.');
      setScheduleCamp(null);
      toast.success('Cohort dates updated.');
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save cohort dates.'); }
    finally { setSaving(false); }
  };

  const assignStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await fetch('/api/school-camp-admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'station-assignment', stationId: form.get('stationId'), staffName: form.get('staffName'), staffMobile: form.get('staffMobile'), staffRole: form.get('staffRole') }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to assign staff.');
      toast.success('Staff assigned to the camp station.');
      setAssignmentCamp(null);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to assign staff.'); }
    finally { setSaving(false); }
  };

  const removeAssignment = async (assignmentId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/school-camp-admin?assignmentId=${encodeURIComponent(assignmentId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to remove assignment.');
      toast.success('Staff assignment removed.');
      setAssignmentCamp(null);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to remove assignment.'); }
    finally { setSaving(false); }
  };

  const expected = camps.reduce((sum, camp) => sum + Number(camp.expected_students || 0), 0);
  const registered = camps.reduce((sum, camp) => sum + Number(camp.registered_students || 0), 0);
  const reportsReady = camps.filter((camp) => camp.report_status === 'ready' || camp.report_status === 'submitted').length;
  const stats: Array<{ icon: LucideIcon; label: string; value: string | number; note: string }> = [
    { icon: Building2, label: 'Organizations', value: institutions.length, note: 'Active partners' },
    { icon: CalendarDays, label: 'Camps', value: camps.length, note: 'All camp editions' },
    { icon: Users, label: 'Students', value: `${registered} / ${expected}`, note: 'Registered / expected' },
    { icon: FileBarChart, label: 'Reports ready', value: reportsReady, note: 'Ready or submitted' },
  ];

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-4 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-10 w-auto" /><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div><p className="text-xs font-bold uppercase text-sky-600">Corporate Health</p><h1 className="text-xl font-bold">Corporate Wellness Camps</h1></div></div>
            <Button asChild variant="outline"><Link to="/Corporate/operations"><ShieldCheck className="mr-2 h-4 w-4" />Operations</Link></Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-4 py-6 lg:px-7">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><p className="text-sm font-semibold text-slate-500">Administration</p><h2 className="mt-1 text-3xl font-bold">Camp portfolio</h2><p className="mt-2 text-sm text-slate-600">Coordinate wellness camps across schools, workplaces, businesses and communities.</p></div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={institutionOpen} onOpenChange={setInstitutionOpen}><DialogTrigger asChild><Button variant="outline" className="bg-white"><Building2 className="mr-2 h-4 w-4" />Add Organization</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add organization</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={(event) => void postForm(event, 'institution')}><div><Label>Organization type</Label><select name="organizationType" defaultValue="school" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"><option value="school">School / Educational Institution</option><option value="corporate_office">Corporate Office</option><option value="business">Business</option><option value="community">Community / NGO / Association</option><option value="centre">Docty Centre</option></select></div><div><Label>Organization name</Label><Input name="name" required /></div><div className="grid grid-cols-2 gap-3"><div><Label>Short name</Label><Input name="shortName" /></div><div><Label>City</Label><Input name="city" required /></div></div><div><Label>Contact person</Label><Input name="contactName" /></div><div><Label>Contact mobile</Label><Input name="contactMobile" inputMode="numeric" /></div><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Organization</Button></form></DialogContent></Dialog>
            <Dialog open={campOpen} onOpenChange={setCampOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create Camp</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create wellness camp</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={(event) => void postForm(event, 'camp')}><div><Label>Organization</Label><Select name="institutionId" required><SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger><SelectContent>{institutions.filter((item) => !item.id.startsWith('sample-')).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Camp name</Label><Input name="name" placeholder="Annual Wellness Camp" required /></div><div><Label>Camp category</Label><select name="campCategory" defaultValue="school" className="h-9 w-full rounded-md border bg-white px-3 text-sm"><option value="school">School Camp</option><option value="corporate">Corporate Camp</option><option value="community">Community Camp</option><option value="centre">Centre-specific Camp</option><option value="outreach">Outreach Camp</option><option value="other">Other</option></select></div><div><Label>Campus / office / branch</Label><Input name="campusName" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Starts</Label><Input name="startsOn" type="date" required /></div><div><Label>Ends</Label><Input name="endsOn" type="date" required /></div></div><div><Label>Cohorts / participant groups</Label><Input name="grades" placeholder="Grade groups, departments, branches or shifts" /></div><div><Label>Expected participants</Label><Input name="expectedStudents" type="number" min="0" /></div><Button disabled={saving || institutions.every((item) => item.id.startsWith('sample-'))}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Camp</Button></form></DialogContent></Dialog>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, note }) => <Card key={label} className="rounded-lg border-slate-200 shadow-none"><CardContent className="flex items-center gap-4 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-50 text-sky-700"><Icon className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p><p className="text-xs text-slate-500">{note}</p></div></CardContent></Card>)}
        </div>

        <Tabs defaultValue="camps" className="gap-4">
          <TabsList className="h-11 rounded-md border border-slate-200 bg-white p-1">
            <TabsTrigger value="institutions" className="px-5"><Building2 className="h-4 w-4" />Organizations</TabsTrigger>
            <TabsTrigger value="camps" className="px-5"><CalendarDays className="h-4 w-4" />Camps</TabsTrigger>
          </TabsList>
          <TabsContent value="institutions">
            <Card className="rounded-lg border-slate-200 shadow-none"><CardContent className="p-0">
              <div className="border-b p-4"><h3 className="font-bold">Organization directory</h3><p className="text-sm text-slate-500">Schools, workplaces, businesses and community organizations participating in Docty programmes.</p></div>
              {loading ? <div className="flex min-h-44 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div> : <div className="divide-y">{institutions.map((institution) => <article key={institution.id} className="grid gap-4 p-4 md:grid-cols-[1fr_220px_auto] md:items-center"><div className="flex min-w-0 items-center gap-4">{institution.logo_url ? <img src={institution.logo_url} alt="" className="h-14 w-24 object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-md bg-sky-50 text-sky-700"><Building2 className="h-5 w-5" /></div>}<div><div className="mb-1 flex flex-wrap items-center gap-2"><h3 className="font-bold">{institution.name}</h3><Badge variant="outline">{organizationTypeLabel(institution.organization_type)}</Badge></div><p className="text-sm text-slate-500">{institution.short_name || 'No short name'} · {institution.city}</p></div></div><div><p className="text-sm font-semibold">{institution.contact_name || 'Contact not assigned'}</p><p className="text-xs text-slate-500">{institution.contact_mobile ? `+91 ${institution.contact_mobile}` : 'Mobile not provided'}</p></div><Button variant="outline" size="sm" onClick={() => setEditInstitution(institution)}><Pencil className="mr-2 h-4 w-4" />Edit</Button></article>)}</div>}
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="camps">
        <Card className="rounded-lg border-slate-200 shadow-none"><CardContent className="p-0"><div className="flex flex-col gap-3 border-b p-4 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search institution, camp or campus" /></div><Select value={institutionFilter} onValueChange={setInstitutionFilter}><SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All institutions</SelectItem>{institutions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-600" /></div> : filtered.length === 0 ? <div className="min-h-56 p-12 text-center"><GraduationCap className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-3 font-bold">No camps found</h3><p className="mt-1 text-sm text-slate-500">Create a camp or change the filters.</p></div> : <div className="divide-y">{filtered.map((camp) => { const completion = camp.expected_students ? Math.round((camp.registered_students / camp.expected_students) * 100) : 0; return <article key={camp.id} className="grid gap-4 p-4 transition-colors hover:bg-slate-50 lg:grid-cols-[minmax(260px,1.4fr)_minmax(180px,.8fr)_minmax(300px,1.2fr)_auto] lg:items-center"><div className="flex min-w-0 items-center gap-3">{camp.institution_logo_url ? <img src={camp.institution_logo_url} alt="" className="h-12 w-20 object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100"><Building2 className="h-5 w-5" /></div>}<div className="min-w-0"><p className="truncate text-sm font-semibold text-sky-700">{camp.institution_name}</p><h3 className="truncate text-base font-bold">{camp.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{camp.campus_name || 'Primary location'}</p></div></div><div><p className="text-sm font-semibold">{formatDate(camp.starts_on)} - {formatDate(camp.ends_on)}</p><div className="mt-2 flex gap-2"><Badge variant="outline">{statusLabel(camp.status)}</Badge><Badge variant="outline">{campCategoryLabel(camp.camp_category)}</Badge><Badge variant="outline">{camp.cohorts?.length || camp.grades?.length || 0} cohorts</Badge></div><p className="mt-2 text-xs font-semibold text-slate-600">Sales {formatMoney(camp.finance_summary?.sales)} · Expenses {formatMoney(camp.finance_summary?.expenses)} · Net {formatMoney(camp.finance_summary?.net)}</p></div><div className="grid grid-cols-4 gap-3"><div><p className="text-lg font-bold">{camp.registered_students}</p><p className="text-xs text-slate-500">Registered</p></div><div><p className="text-lg font-bold">{camp.attended_students}</p><p className="text-xs text-slate-500">Attended</p></div><div><p className="text-lg font-bold">{camp.passports_generated}</p><p className="text-xs text-slate-500">Reports</p></div><button type="button" onClick={() => setEstimateCamp(camp)} className="rounded-md text-left transition-colors hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400"><span className="flex items-center gap-1 text-lg font-bold">{camp.expected_students}<Pencil className="h-3 w-3 text-sky-600" /></span><span className="text-xs text-slate-500">Estimated</span></button><div className="col-span-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-sky-500" style={{ width: `${Math.min(100, completion)}%` }} /></div></div><div className="flex justify-end gap-2"><Button variant="outline" size="sm" title="Schedule cohorts" onClick={() => openCohortSchedule(camp)}><CalendarDays className="h-4 w-4" /></Button><Button variant="outline" size="sm" title="Edit camp" onClick={() => setEditCamp(camp)}><Pencil className="h-4 w-4" /></Button><Button variant="outline" size="sm" title="Assign station staff" onClick={() => setAssignmentCamp(camp)}><UserCog className="h-4 w-4" /></Button><Button variant="outline" size="sm" title="Organization report"><ClipboardCheck className="h-4 w-4" /></Button><Button size="sm" onClick={() => navigate(`/Corporate/operations?camp=${encodeURIComponent(camp.id)}`)}>Open <ChevronRight className="ml-1 h-4 w-4" /></Button></div></article>; })}</div>}
        </CardContent></Card>
          </TabsContent>
        </Tabs>
        <Dialog open={Boolean(assignmentCamp)} onOpenChange={(open) => { if (!open) setAssignmentCamp(null); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>Assign station staff</DialogTitle></DialogHeader>
            {assignmentCamp && <div className="grid gap-5">
              <div className="rounded-md bg-slate-50 p-3"><p className="font-bold">{assignmentCamp.name}</p><p className="text-sm text-slate-500">Every cohort has Registration, Nursing, Hall 1, Queue, Tracking and Camp Finance stations.</p></div>
              <form className="grid gap-3 rounded-md border p-4" onSubmit={(event) => void assignStaff(event)}>
                <div><Label>Camp station</Label><select name="stationId" className="h-9 w-full rounded-md border bg-white px-3 text-sm" required><option value="">Select cohort and station</option>{(assignmentCamp.stations || []).map((station) => <option key={station.id} value={station.id}>{station.cohort_name} / {station.station_name}</option>)}</select></div>
                <div className="grid gap-3 sm:grid-cols-2"><div><Label>Staff name</Label><Input name="staffName" required /></div><div><Label>Mobile</Label><Input name="staffMobile" inputMode="numeric" maxLength={10} required /></div></div>
                <div><Label>Role / designation</Label><Input name="staffRole" placeholder="Nurse, Presenter, Coordinator, Doctor" /></div>
                <Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Assign Staff</Button>
              </form>
              <div><h3 className="mb-2 font-bold">Current assignments</h3><div className="divide-y rounded-md border">{(assignmentCamp.stations || []).some((station) => station.assignments.length) ? (assignmentCamp.stations || []).flatMap((station) => station.assignments.map((assignment) => <div key={assignment.id} className="flex items-center justify-between gap-3 p-3"><div><p className="font-semibold">{assignment.staff_name} <span className="font-normal text-slate-500">· {assignment.staff_role || 'Camp staff'}</span></p><p className="text-xs text-slate-500">{station.cohort_name} / {station.station_name} / +91 {assignment.staff_mobile}</p></div><Button type="button" size="icon" variant="ghost" title="Remove assignment" disabled={saving} onClick={() => void removeAssignment(assignment.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>)) : <p className="p-5 text-center text-sm text-slate-500">No staff assigned yet.</p>}</div></div>
            </div>}
          </DialogContent>
        </Dialog>
        <Dialog open={Boolean(estimateCamp)} onOpenChange={(open) => { if (!open) setEstimateCamp(null); }}><DialogContent><DialogHeader><DialogTitle>Update estimated students</DialogTitle></DialogHeader>{estimateCamp && <form className="grid gap-4" onSubmit={(event) => void updateEstimate(event)}><div className="rounded-md bg-slate-50 p-3 text-sm"><p className="font-bold">{estimateCamp.name}</p><p className="text-slate-500">{estimateCamp.institution_name}</p></div><div><Label htmlFor="estimated-students">Estimated student count</Label><Input id="estimated-students" name="expectedStudents" type="number" min="0" max="100000" defaultValue={estimateCamp.expected_students} required autoFocus /><p className="mt-1 text-xs text-slate-500">This is used for registration progress and planning capacity.</p></div><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Estimate</Button></form>}</DialogContent></Dialog>
        <Dialog open={Boolean(editInstitution)} onOpenChange={(open) => { if (!open) setEditInstitution(null); }}><DialogContent><DialogHeader><DialogTitle>Edit organization</DialogTitle></DialogHeader>{editInstitution && <form className="grid gap-4" onSubmit={(event) => void updateRecord(event, 'institution')}><div><Label>Organization type</Label><select name="organizationType" defaultValue={editInstitution.organization_type || 'school'} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"><option value="school">School / Educational Institution</option><option value="corporate_office">Corporate Office</option><option value="business">Business</option><option value="community">Community / NGO / Association</option><option value="centre">Docty Centre</option></select></div><div><Label>Organization name</Label><Input name="name" defaultValue={editInstitution.name} required /></div><div className="grid grid-cols-2 gap-3"><div><Label>Short name</Label><Input name="shortName" defaultValue={editInstitution.short_name || ''} /></div><div><Label>City</Label><Input name="city" defaultValue={editInstitution.city} required /></div></div><div className="grid grid-cols-2 gap-3"><div><Label>Contact person</Label><Input name="contactName" defaultValue={editInstitution.contact_name || ''} /></div><div><Label>Contact mobile</Label><Input name="contactMobile" inputMode="numeric" defaultValue={editInstitution.contact_mobile || ''} /></div></div><div><Label>Logo path or URL</Label><Input name="logoUrl" defaultValue={editInstitution.logo_url || ''} /></div><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Organization</Button></form>}</DialogContent></Dialog>
        <Dialog open={Boolean(editCamp)} onOpenChange={(open) => { if (!open) setEditCamp(null); }}><DialogContent><DialogHeader><DialogTitle>Edit camp</DialogTitle></DialogHeader>{editCamp && <form className="grid gap-4" onSubmit={(event) => void updateRecord(event, 'camp')}><div className="rounded-md bg-slate-50 p-3 text-sm font-semibold">{editCamp.institution_name}</div><div><Label>Camp name</Label><Input name="name" defaultValue={editCamp.name} required /></div><div><Label>Camp category</Label><select name="campCategory" defaultValue={editCamp.camp_category || 'school'} className="h-9 w-full rounded-md border bg-white px-3 text-sm"><option value="school">School Camp</option><option value="corporate">Corporate Camp</option><option value="community">Community Camp</option><option value="centre">Centre-specific Camp</option><option value="outreach">Outreach Camp</option><option value="other">Other</option></select></div><div><Label>Campus</Label><Input name="campusName" defaultValue={editCamp.campus_name || ''} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Starts</Label><Input name="startsOn" type="date" defaultValue={editCamp.starts_on.slice(0, 10)} required /></div><div><Label>Ends</Label><Input name="endsOn" type="date" defaultValue={editCamp.ends_on.slice(0, 10)} required /></div></div><div><Label>Grades / cohorts</Label><Input name="grades" defaultValue={(editCamp.grades || []).join(', ')} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Estimated students</Label><Input name="expectedStudents" type="number" min="0" max="100000" defaultValue={editCamp.expected_students} required /></div><div><Label>Status</Label><select name="status" defaultValue={editCamp.status} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"><option value="planning">Planning</option><option value="registration_open">Registration Open</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></div></div><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Camp</Button></form>}</DialogContent></Dialog>
        <Dialog open={Boolean(scheduleCamp)} onOpenChange={(open) => { if (!open) setScheduleCamp(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Schedule cohorts</DialogTitle></DialogHeader>{scheduleCamp && <form className="grid gap-4" onSubmit={(event) => void saveCohortSchedule(event)}><div className="rounded-md bg-slate-50 p-3 text-sm"><p className="font-bold">{scheduleCamp.name}</p><p className="text-slate-500">Set the operating dates for each cohort.</p></div><div className="grid gap-3">{cohortDraft.map((cohort, index) => <div key={cohort.id || `new-${index}`} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_145px_145px_36px] sm:items-end"><div><Label>Cohort</Label><Input value={cohort.name} onChange={(event) => setCohortDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} required /></div><div><Label>Starts</Label><Input type="date" value={cohort.startsOn} onChange={(event) => setCohortDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startsOn: event.target.value } : item))} required /></div><div><Label>Ends</Label><Input type="date" value={cohort.endsOn} min={cohort.startsOn} onChange={(event) => setCohortDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, endsOn: event.target.value } : item))} required /></div><Button type="button" variant="ghost" size="icon" title="Remove cohort" disabled={cohortDraft.length === 1} onClick={() => setCohortDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>)}</div><Button type="button" variant="outline" onClick={() => setCohortDraft((current) => [...current, { name: '', startsOn: scheduleCamp.starts_on.slice(0, 10), endsOn: scheduleCamp.ends_on.slice(0, 10) }])}><Plus className="mr-2 h-4 w-4" />Add Cohort</Button><Button disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Cohort Dates</Button></form>}</DialogContent></Dialog>
      </section>
    </main>
  );
}
