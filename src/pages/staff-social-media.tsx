import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, FileText, LayoutDashboard, Lightbulb, List, Loader2, MapPin, Megaphone, MessageSquare,
  MonitorPlay, RefreshCw, Search, Send, ShieldCheck, Sparkles, SquarePen, WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type Location = 'Manikonda' | 'Lanco Hills' | 'Combined';
type CalendarView = 'month' | 'week' | 'list';

interface ContentItem {
  id: string; scheduledFor: string; location: Location; channels: string[]; format: string; theme: string;
  headline: string; contentDirection: string; callToAction: string; pillar: string; productionNote: string;
  caption: string; googleBusinessCopy: string; reelScript: string; hashtags: string[]; ledHeadline: string;
  ledSupportingLine: string; status: string; requiresClinicalReview: boolean; updatedAt: string;
}

interface Comment { id:string; contentId:string; body:string; authorName?:string; authorRole?:string; createdAt:string }
interface Approval { id:string; contentId:string; stage:string; decision:string; note?:string; actorName?:string; actorRole?:string; createdAt:string }
interface KeywordCluster { id:string; location:Location; clusterName:string; intent:string; keywords:string[]; source:string }

interface Workspace {
  items: ContentItem[]; comments: Comment[]; approvals: Approval[]; keywords: KeywordCluster[];
  integrations: { publishingEnabled:boolean; metaConnected:boolean; googleConnected:boolean; healthcareAutoPublish:boolean };
  currentUser: { name:string; mobile:string; role:string; permissions:{ create:boolean; contentReview:boolean; clinicalReview:boolean; managementReview:boolean; publish:boolean } };
}

const statusLabel: Record<string,string> = {
  draft:'Draft', content_review:'Content review', clinical_review:'Clinical review', management_review:'Management approval',
  approved:'Approved', scheduled:'Scheduled', published:'Published', failed:'Publish failed',
};

const statusStyle: Record<string,string> = {
  draft:'border-slate-200 bg-slate-50 text-slate-700', content_review:'border-sky-200 bg-sky-50 text-sky-700',
  clinical_review:'border-violet-200 bg-violet-50 text-violet-700', management_review:'border-amber-200 bg-amber-50 text-amber-700',
  approved:'border-emerald-200 bg-emerald-50 text-emerald-700', scheduled:'border-cyan-200 bg-cyan-50 text-cyan-700',
  published:'border-emerald-200 bg-emerald-50 text-emerald-700', failed:'border-red-200 bg-red-50 text-red-700',
};

const locationStyle: Record<Location,string> = {
  Manikonda:'border-pink-200 bg-pink-50 text-pink-700', 'Lanco Hills':'border-sky-200 bg-sky-50 text-sky-700', Combined:'border-teal-200 bg-teal-50 text-teal-700',
};

function formatDate(value:string, options: Intl.DateTimeFormatOptions = { day:'2-digit', month:'short' }) {
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(`${value}T00:00:00`));
}

function dateRange(start:string, days:number) {
  const first = new Date(`${start}T00:00:00`);
  return Array.from({length:days},(_,index)=>{
    const date = new Date(first); date.setDate(first.getDate()+index); return date.toISOString().slice(0,10);
  });
}

function ContentBadges({ item }: { item:ContentItem }) {
  return <div className="flex flex-wrap gap-1.5">
    <Badge variant="outline" className={locationStyle[item.location]}><MapPin className="mr-1 h-3 w-3" />{item.location}</Badge>
    <Badge variant="outline" className={statusStyle[item.status] || statusStyle.draft}>{statusLabel[item.status] || item.status}</Badge>
    {item.requiresClinicalReview && <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700"><ShieldCheck className="mr-1 h-3 w-3" />Clinical</Badge>}
  </div>;
}

export default function StaffSocialMediaPage() {
  const [workspace,setWorkspace] = useState<Workspace|null>(null);
  const [loading,setLoading] = useState(true);
  const [unauthorised,setUnauthorised] = useState(false);
  const [location,setLocation] = useState('all');
  const [channel,setChannel] = useState('all');
  const [status,setStatus] = useState('all');
  const [query,setQuery] = useState('');
  const [view,setView] = useState<CalendarView>('month');
  const [weekStart,setWeekStart] = useState('2026-07-14');
  const [selectedId,setSelectedId] = useState('');
  const [comment,setComment] = useState('');
  const [busy,setBusy] = useState(false);
  const [draft,setDraft] = useState<any>(null);
  const [form,setForm] = useState({ scheduledFor:'2026-07-31', location:'Combined' as Location, format:'Instagram Static + Google Business', topic:'Preventive healthcare', service:'General Physician', pillar:'Education' });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff/social-media',{headers:{Accept:'application/json'}});
      const body = await response.json().catch(()=>null);
      if (response.status === 401) { setUnauthorised(true); return; }
      if (!response.ok) throw new Error(body?.message || 'Unable to load the social media workspace.');
      setWorkspace(body); setSelectedId((current)=>current || body.items?.[0]?.id || '');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load workspace.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ void load(); },[]);

  const filtered = useMemo(()=>(workspace?.items || []).filter((item)=>
    (location==='all' || item.location===location) &&
    (status==='all' || item.status===status) &&
    (channel==='all' || item.channels.some((value)=>value.toLowerCase().includes(channel.toLowerCase())) || item.format.toLowerCase().includes(channel.toLowerCase())) &&
    (!query.trim() || `${item.headline} ${item.theme} ${item.pillar}`.toLowerCase().includes(query.trim().toLowerCase()))
  ),[workspace,location,status,channel,query]);
  const selected = workspace?.items.find((item)=>item.id===selectedId) || filtered[0];
  const selectedComments = (workspace?.comments || []).filter((entry)=>entry.contentId===selected?.id);
  const selectedApprovals = (workspace?.approvals || []).filter((entry)=>entry.contentId===selected?.id);
  const weekDates = dateRange(weekStart,7);

  const callAction = async (payload:any, success?:string) => {
    setBusy(true);
    try {
      const response = await fetch('/api/staff/social-media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const body = await response.json().catch(()=>null);
      if (!response.ok) throw new Error(body?.message || 'Action failed.');
      if (success) toast.success(success);
      await load(); return body;
    } catch(error) { toast.error(error instanceof Error ? error.message : 'Action failed.'); return null; }
    finally { setBusy(false); }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/staff/social-media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generate',...form})});
      const body=await response.json().catch(()=>null); if(!response.ok) throw new Error(body?.message || 'Unable to generate draft.');
      setDraft(body.draft); toast.success('AI-assisted channel drafts prepared for review.');
    } catch(error) { toast.error(error instanceof Error ? error.message : 'Unable to generate draft.'); }
    finally { setBusy(false); }
  };

  const saveDraft = async (event:FormEvent) => {
    event.preventDefault(); if(!draft) return;
    await callAction({action:'create',...form,...draft,channels:['Instagram','Google Business Profile','LED']},'Draft saved to the July calendar.');
  };

  if (loading && !workspace) return <main className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></main>;
  if (unauthorised) return <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4"><Card className="max-w-md"><CardContent className="p-6 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-primary"/><h1 className="mt-4 text-2xl font-bold">Staff sign-in required</h1><p className="mt-2 text-sm text-muted-foreground">Open the staff application and sign in before managing social content.</p><Button asChild className="mt-5 rounded-full"><Link to="/staff">Open Staff Application</Link></Button></CardContent></Card></main>;
  if (!workspace) return null;

  const counts = {
    drafts: workspace.items.filter((item)=>item.status==='draft').length,
    approvals: workspace.items.filter((item)=>['content_review','clinical_review','management_review'].includes(item.status)).length,
    scheduled: workspace.items.filter((item)=>item.status==='scheduled').length,
    failures: workspace.items.filter((item)=>item.status==='failed').length,
  };

  return <main className="min-h-screen bg-slate-50/80">
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" className="rounded-full bg-white"><Link to="/staff"><ArrowLeft className="mr-2 h-4 w-4"/>Staff</Link></Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={workspace.integrations.publishingEnabled?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-amber-200 bg-amber-50 text-amber-800'}>
              {workspace.integrations.publishingEnabled?'Publishing enabled':'Publishing disabled'}
            </Badge>
            <Badge variant="outline">{workspace.currentUser.role.replace(/_/g,' ')}</Badge>
            <Button variant="outline" size="sm" className="rounded-full" onClick={()=>void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</Button>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Megaphone className="h-4 w-4"/>Docty Social</div><h1 className="text-3xl font-bold">Social Media Management</h1><p className="mt-2 max-w-3xl text-muted-foreground">Plan, create and approve content for Manikonda, Lanco Hills and both locations. Every healthcare post remains human-reviewed.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[[counts.drafts,'Drafts'],[counts.approvals,'In approval'],[counts.scheduled,'Scheduled'],[counts.failures,'Failures']].map(([value,label])=><div key={String(label)} className="rounded-lg border bg-white px-4 py-2 text-center"><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
          </div>
        </div>
      </div>
    </header>

    <section className="container mx-auto px-4 py-6">
      <Card className="mb-5 shadow-sm"><CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_170px_180px_180px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search campaign, topic or pillar" className="pl-9"/></div>
        <Select value={location} onValueChange={setLocation}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem><SelectItem value="Manikonda">Manikonda</SelectItem><SelectItem value="Lanco Hills">Lanco Hills</SelectItem><SelectItem value="Combined">Both locations</SelectItem></SelectContent></Select>
        <Select value={channel} onValueChange={setChannel}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All channels</SelectItem><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="google">Google Business</SelectItem><SelectItem value="led">LED</SelectItem></SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(statusLabel).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
      </CardContent></Card>

      <Tabs defaultValue="dashboard" className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto bg-white p-1 shadow-sm">
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4"/>Dashboard</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4"/>Calendar</TabsTrigger>
          <TabsTrigger value="studio"><WandSparkles className="mr-2 h-4 w-4"/>Content Studio</TabsTrigger>
          <TabsTrigger value="approvals"><ShieldCheck className="mr-2 h-4 w-4"/>Approval Centre</TabsTrigger>
          <TabsTrigger value="keywords"><Lightbulb className="mr-2 h-4 w-4"/>Local Search</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              {label:'Upcoming posts',value:filtered.filter((i)=>i.scheduledFor>='2026-07-14').length,icon:CalendarDays,color:'bg-sky-50 text-sky-700'},
              {label:'Needs clinical review',value:filtered.filter((i)=>i.status==='clinical_review').length,icon:ShieldCheck,color:'bg-violet-50 text-violet-700'},
              {label:'Ready for management',value:filtered.filter((i)=>i.status==='management_review').length,icon:CheckCircle2,color:'bg-amber-50 text-amber-700'},
              {label:'Publishing failures',value:counts.failures,icon:AlertTriangle,color:'bg-red-50 text-red-700'},
            ].map((card)=><Card key={card.label} className="shadow-sm"><CardContent className="p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}><card.icon className="h-5 w-5"/></div><p className="text-3xl font-bold">{card.value}</p><p className="mt-1 text-sm text-muted-foreground">{card.label}</p></CardContent></Card>)}
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
            <Card className="shadow-sm"><CardContent className="p-0"><div className="border-b p-5"><h2 className="text-xl font-bold">Upcoming content</h2><p className="text-sm text-muted-foreground">July 14–31 seed calendar from the supplied workbook.</p></div><div className="divide-y">{filtered.slice(0,8).map((item)=><button key={item.id} onClick={()=>setSelectedId(item.id)} className="block w-full p-4 text-left transition hover:bg-slate-50"><div className="mb-2 flex flex-wrap items-start justify-between gap-2"><ContentBadges item={item}/><span className="text-sm font-semibold">{formatDate(item.scheduledFor,{weekday:'short',day:'2-digit',month:'short'})}</span></div><p className="font-bold">{item.headline}</p><p className="mt-1 text-sm text-muted-foreground">{item.format} · {item.productionNote}</p></button>)}</div></CardContent></Card>
            <div className="space-y-5">
              <Card className="border-amber-200 bg-amber-50 shadow-sm"><CardContent className="p-5"><AlertTriangle className="h-6 w-6 text-amber-700"/><h2 className="mt-3 font-bold text-amber-950">Safe publishing lock</h2><p className="mt-2 text-sm leading-6 text-amber-900">Meta and Google publishing are disabled. Approval alone cannot publish; credentials, connection tests and a production feature flag are also required.</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary"/><h2 className="font-bold">Analytics readiness</h2></div><p className="mt-3 text-sm text-muted-foreground">No provider metrics connected. Performance cards will show source and freshness once authorised accounts are available.</p><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold">0</p><p className="text-xs text-muted-foreground">Imported metrics</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-bold">Not connected</p><p className="text-xs text-muted-foreground">Freshness</p></div></div></CardContent></Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card className="shadow-sm"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h2 className="text-xl font-bold">July 2026 calendar</h2><p className="text-sm text-muted-foreground">Production and approval status remain separate on every item.</p></div><div className="flex gap-2"><Button size="sm" variant={view==='month'?'default':'outline'} onClick={()=>setView('month')}><CalendarDays className="mr-1 h-4 w-4"/>Month</Button><Button size="sm" variant={view==='week'?'default':'outline'} onClick={()=>setView('week')}><Clock3 className="mr-1 h-4 w-4"/>Week</Button><Button size="sm" variant={view==='list'?'default':'outline'} onClick={()=>setView('list')}><List className="mr-1 h-4 w-4"/>List</Button></div></CardContent></Card>
          {view==='month' && <Card className="overflow-hidden shadow-sm"><CardContent className="p-0"><div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-bold uppercase text-muted-foreground">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="p-2">{d}</div>)}</div><div className="grid grid-cols-7">{Array.from({length:35},(_,index)=>{const day=index-2; const date=day>0&&day<=31?`2026-07-${String(day).padStart(2,'0')}`:''; const entries=filtered.filter(i=>i.scheduledFor===date); return <div key={index} className="min-h-28 border-b border-r p-2"><p className="mb-1 text-xs font-semibold text-muted-foreground">{day>0&&day<=31?day:''}</p>{entries.map(item=><button key={item.id} onClick={()=>setSelectedId(item.id)} className={`mb-1 block w-full rounded-md border px-2 py-1 text-left text-[11px] leading-4 ${locationStyle[item.location]}`}><span className="line-clamp-2 font-semibold">{item.headline}</span></button>)}</div>})}</div></CardContent></Card>}
          {view==='week' && <><Card className="shadow-sm"><CardContent className="flex items-center justify-between p-3"><Button variant="ghost" size="icon" onClick={()=>{const d=new Date(`${weekStart}T00:00:00`);d.setDate(d.getDate()-7);setWeekStart(d.toISOString().slice(0,10));}}><ChevronLeft/></Button><p className="font-bold">Week of {formatDate(weekStart,{day:'2-digit',month:'long',year:'numeric'})}</p><Button variant="ghost" size="icon" onClick={()=>{const d=new Date(`${weekStart}T00:00:00`);d.setDate(d.getDate()+7);setWeekStart(d.toISOString().slice(0,10));}}><ChevronRight/></Button></CardContent></Card><div className="grid gap-3 lg:grid-cols-7">{weekDates.map(date=><Card key={date} className="min-h-48 shadow-sm"><CardContent className="p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">{formatDate(date,{weekday:'short'})}</p><p className="mb-3 text-lg font-bold">{formatDate(date)}</p>{filtered.filter(i=>i.scheduledFor===date).map(item=><button key={item.id} onClick={()=>setSelectedId(item.id)} className="mb-2 w-full rounded-lg border bg-white p-2 text-left"><ContentBadges item={item}/><p className="mt-2 text-xs font-bold">{item.headline}</p></button>)}</CardContent></Card>)}</div></>}
          {view==='list' && <div className="space-y-3">{filtered.map(item=><Card key={item.id} className="shadow-sm"><CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center"><div className="w-28 shrink-0"><p className="text-sm font-bold">{formatDate(item.scheduledFor,{weekday:'short',day:'2-digit',month:'short'})}</p></div><div className="min-w-0 flex-1"><ContentBadges item={item}/><p className="mt-2 font-bold">{item.headline}</p><p className="text-sm text-muted-foreground">{item.format} · {item.productionNote}</p></div>{workspace.currentUser.permissions.create&&<Input type="date" className="w-40" value={item.scheduledFor} onChange={(e)=>void callAction({action:'reschedule',contentId:item.id,scheduledFor:e.target.value},'Content rescheduled.')}/>}</CardContent></Card>)}</div>}
        </TabsContent>

        <TabsContent value="studio">
          <form onSubmit={saveDraft} className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card className="h-fit shadow-sm"><CardContent className="space-y-4 p-5"><div><h2 className="text-xl font-bold">AI-assisted brief</h2><p className="text-sm text-muted-foreground">Generation uses only the fields provided here and always creates a reviewable draft.</p></div>
              <div><Label>Location</Label><Select value={form.location} onValueChange={(value)=>setForm({...form,location:value as Location})}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Manikonda">Manikonda</SelectItem><SelectItem value="Lanco Hills">Lanco Hills</SelectItem><SelectItem value="Combined">Both locations</SelectItem></SelectContent></Select></div>
              <div><Label>Schedule date</Label><Input type="date" className="mt-1" value={form.scheduledFor} onChange={(e)=>setForm({...form,scheduledFor:e.target.value})}/></div>
              <div><Label>Topic / objective</Label><Input className="mt-1" value={form.topic} onChange={(e)=>setForm({...form,topic:e.target.value})}/></div>
              <div><Label>Verified service</Label><Input className="mt-1" value={form.service} onChange={(e)=>setForm({...form,service:e.target.value})}/></div>
              <div><Label>Format</Label><Select value={form.format} onValueChange={(value)=>setForm({...form,format:value})}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Instagram Static + Google Business">Static + Google Business</SelectItem><SelectItem value="Instagram Carousel + Stories">Carousel + Stories</SelectItem><SelectItem value="Instagram Reel + Stories">Reel + Stories</SelectItem><SelectItem value="LED Screen">LED screen</SelectItem></SelectContent></Select></div>
              <div><Label>Content pillar</Label><Select value={form.pillar} onValueChange={(value)=>setForm({...form,pillar:value})}><SelectTrigger className="mt-1"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Education">Education</SelectItem><SelectItem value="Service">Service</SelectItem><SelectItem value="Local SEO">Local SEO</SelectItem><SelectItem value="Doctor">Doctor</SelectItem><SelectItem value="Engagement">Engagement</SelectItem></SelectContent></Select></div>
              <Button type="button" className="w-full" onClick={()=>void generate()} disabled={busy||!workspace.currentUser.permissions.create}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Sparkles className="mr-2 h-4 w-4"/>}Generate channel drafts</Button>
            </CardContent></Card>
            <div className="space-y-5">
              {!draft?<Card className="border-dashed shadow-sm"><CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center"><WandSparkles className="h-12 w-12 text-primary"/><h2 className="mt-4 text-xl font-bold">Start with a grounded brief</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Choose a location and verified service. The studio will prepare distinct Instagram, Google Business, reel and LED copy without inventing doctor or operational details.</p></CardContent></Card>:<>
                <Card className="shadow-sm"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Editable channel drafts</h2><p className="text-sm text-muted-foreground">AI provenance: Phase 1 deterministic mock provider · human review required</p></div><Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Not approved</Badge></div><Tabs defaultValue="instagram"><TabsList><TabsTrigger value="instagram">Instagram</TabsTrigger><TabsTrigger value="google">Google Business</TabsTrigger><TabsTrigger value="reel">Reel script</TabsTrigger><TabsTrigger value="led">LED 6:4</TabsTrigger></TabsList><TabsContent value="instagram" className="space-y-3"><Label>Caption</Label><Textarea rows={8} value={draft.caption} onChange={(e)=>setDraft({...draft,caption:e.target.value})}/><Label>Hashtags</Label><Input value={draft.hashtags.join(' ')} onChange={(e)=>setDraft({...draft,hashtags:e.target.value.split(/\s+/).filter(Boolean)})}/></TabsContent><TabsContent value="google"><Label>Google Business content</Label><Textarea className="mt-2" rows={8} value={draft.googleBusinessCopy} onChange={(e)=>setDraft({...draft,googleBusinessCopy:e.target.value})}/></TabsContent><TabsContent value="reel"><Label>Reel script</Label><Textarea className="mt-2" rows={10} value={draft.reelScript} onChange={(e)=>setDraft({...draft,reelScript:e.target.value})}/></TabsContent><TabsContent value="led"><div className="mx-auto mt-4 aspect-[4/6] max-w-[360px] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-950 via-sky-800 to-teal-600 p-7 text-white shadow-xl"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-10 w-auto rounded bg-white p-1"/><div className="flex h-[75%] flex-col justify-center"><Badge className="mb-4 w-fit bg-primary">{form.location==='Combined'?'BOTH LOCATIONS':form.location.toUpperCase()}</Badge><h3 className="text-3xl leading-tight text-white">{draft.ledHeadline}</h3><p className="mt-4 text-lg text-sky-50">{draft.ledSupportingLine}</p></div><p className="border-t border-white/30 pt-4 font-semibold">Call 9989804888</p></div></TabsContent></Tabs></CardContent></Card>
                <Card className="border-amber-200 bg-amber-50 shadow-sm"><CardContent className="p-4 text-sm text-amber-900"><strong>Safety check:</strong> {draft.disclaimer}</CardContent></Card>
                <Button type="submit" className="w-full" disabled={busy||!workspace.currentUser.permissions.create}><SquarePen className="mr-2 h-4 w-4"/>Save as draft and start workflow</Button>
              </>}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="approvals">
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="h-fit shadow-sm"><CardContent className="p-0"><div className="border-b p-4"><h2 className="text-xl font-bold">Review inbox</h2><p className="text-sm text-muted-foreground">Role-specific actions are enforced by the API.</p></div><div className="max-h-[720px] overflow-y-auto divide-y">{filtered.filter(i=>['content_review','clinical_review','management_review','approved','draft'].includes(i.status)).map(item=><button key={item.id} onClick={()=>setSelectedId(item.id)} className={`block w-full p-4 text-left hover:bg-slate-50 ${selected?.id===item.id?'bg-slate-50':''}`}><ContentBadges item={item}/><p className="mt-2 text-sm font-bold">{item.headline}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(item.scheduledFor)} · {item.productionNote}</p></button>)}</div></CardContent></Card>
            {selected&&<div className="space-y-5"><Card className="shadow-sm"><CardContent className="p-5"><ContentBadges item={selected}/><h2 className="mt-4 text-2xl font-bold">{selected.headline}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{selected.contentDirection}</p><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Caption</p><p className="mt-2 whitespace-pre-line text-sm">{selected.caption || 'Draft caption not generated yet.'}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Operational check</p><p className="mt-2 text-sm">{selected.productionNote}</p><p className="mt-3 text-xs text-muted-foreground">CTA: {selected.callToAction}</p></div></div><div className="mt-5 flex flex-wrap gap-2">
              {selected.status==='draft'&&workspace.currentUser.permissions.create&&<Button onClick={()=>void callAction({action:'submit_review',contentId:selected.id},'Draft submitted for content review.')} disabled={busy}><Send className="mr-2 h-4 w-4"/>Submit for review</Button>}
              {selected.status==='content_review'&&workspace.currentUser.permissions.contentReview&&<><Button onClick={()=>void callAction({action:'review',contentId:selected.id,stage:'content',decision:'approve',note:'Content wording and creative direction reviewed.'},'Content review approved.')} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4"/>Approve content</Button><Button variant="outline" onClick={()=>void callAction({action:'review',contentId:selected.id,stage:'content',decision:'request_changes',note:'Changes requested by content reviewer.'},'Changes requested.')} disabled={busy}>Request changes</Button></>}
              {selected.status==='clinical_review'&&workspace.currentUser.permissions.clinicalReview&&<><Button onClick={()=>void callAction({action:'review',contentId:selected.id,stage:'clinical',decision:'approve',note:'Clinical wording reviewed.'},'Clinical review approved.')} disabled={busy}><ShieldCheck className="mr-2 h-4 w-4"/>Approve clinical</Button><Button variant="outline" onClick={()=>void callAction({action:'review',contentId:selected.id,stage:'clinical',decision:'request_changes',note:'Clinical changes requested.'},'Clinical changes requested.')} disabled={busy}>Request changes</Button></>}
              {selected.status==='management_review'&&workspace.currentUser.permissions.managementReview&&<><Button onClick={()=>void callAction({action:'review',contentId:selected.id,stage:'management',decision:'approve',note:'Location, availability and CTA reviewed.'},'Management approval recorded.')} disabled={busy}><CheckCircle2 className="mr-2 h-4 w-4"/>Final approval</Button><Button variant="outline" onClick={()=>void callAction({action:'review',contentId:selected.id,stage:'management',decision:'request_changes',note:'Management changes requested.'},'Changes requested.')} disabled={busy}>Request changes</Button></>}
              {selected.status==='failed'&&workspace.currentUser.permissions.publish&&<Button variant="outline" onClick={()=>void callAction({action:'retry_publish',contentId:selected.id})} disabled={busy}><RefreshCw className="mr-2 h-4 w-4"/>Retry safely</Button>}
            </div></CardContent></Card>
              <div className="grid gap-5 lg:grid-cols-2"><Card className="shadow-sm"><CardContent className="p-5"><h3 className="flex items-center gap-2 font-bold"><MessageSquare className="h-4 w-4 text-primary"/>Comments & revisions</h3><div className="my-4 max-h-60 space-y-3 overflow-y-auto">{selectedComments.length?selectedComments.map(entry=><div key={entry.id} className="rounded-lg bg-slate-50 p-3"><p className="text-sm">{entry.body}</p><p className="mt-1 text-xs text-muted-foreground">{entry.authorName || entry.authorRole} · {new Date(entry.createdAt).toLocaleString('en-IN')}</p></div>):<p className="text-sm text-muted-foreground">No comments yet.</p>}</div>{workspace.currentUser.permissions.create&&<div className="flex gap-2"><Input value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="Add a review comment"/><Button size="icon" disabled={!comment.trim()||busy} onClick={async()=>{const done=await callAction({action:'comment',contentId:selected.id,body:comment},'Comment added.');if(done)setComment('');}}><Send className="h-4 w-4"/></Button></div>}</CardContent></Card><Card className="shadow-sm"><CardContent className="p-5"><h3 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-primary"/>Approval history</h3><div className="mt-4 space-y-3">{selectedApprovals.length?selectedApprovals.map(entry=><div key={entry.id} className="border-l-2 border-primary pl-3"><p className="text-sm font-semibold">{entry.stage} · {entry.decision.replace('_',' ')}</p><p className="text-xs text-muted-foreground">{entry.actorName || entry.actorRole} · {new Date(entry.createdAt).toLocaleString('en-IN')}</p>{entry.note&&<p className="mt-1 text-xs">{entry.note}</p>}</div>):<p className="text-sm text-muted-foreground">No decisions recorded.</p>}</div></CardContent></Card></div>
            </div>}
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-5">
          <Card className="shadow-sm"><CardContent className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-bold">Location-specific keyword clusters</h2><p className="text-sm text-muted-foreground">Transparent Phase 1 seed research. External demand and competition data are not connected.</p></div><Badge variant="outline">Source: curated July planning data</Badge></div></CardContent></Card>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{workspace.keywords.filter(cluster=>location==='all'||cluster.location===location).map(cluster=><Card key={cluster.id} className="shadow-sm"><CardContent className="p-5"><div className="mb-3 flex items-start justify-between gap-2"><Badge variant="outline" className={locationStyle[cluster.location]}>{cluster.location}</Badge><Badge variant="secondary">{cluster.intent}</Badge></div><h3 className="text-lg font-bold">{cluster.clusterName}</h3><div className="mt-4 flex flex-wrap gap-2">{cluster.keywords.map(keyword=><span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{keyword}</span>)}</div><p className="mt-4 text-xs text-muted-foreground">Priority guidance: local relevance + verified service + user intent. No keyword stuffing.</p></CardContent></Card>)}</div>
          <Card className="border-dashed shadow-sm"><CardContent className="flex items-start gap-3 p-5"><MonitorPlay className="mt-0.5 h-5 w-5 text-primary"/><div><h3 className="font-bold">Provider adapter ready for a later phase</h3><p className="mt-1 text-sm text-muted-foreground">Search volume, seasonal trends, competitor notes and Google Business query ingestion remain empty until an authorised provider is connected. The UI will label source and freshness instead of inventing metrics.</p></div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </section>
  </main>;
}
