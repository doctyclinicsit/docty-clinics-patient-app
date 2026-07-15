import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, Loader2, LockKeyhole, RefreshCw, Save, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ModuleDefinition { key:string; label:string; description:string }
interface StaffUser { mobile:string; name:string; role:string; assignedClinics:Array<{id:string;name:string}>; access:Record<string,boolean> }

export default function StaffAdministrationPage() {
  const [staffAuthenticated,setStaffAuthenticated] = useState<boolean|null>(null);
  const [adminAuthenticated,setAdminAuthenticated] = useState(false);
  const [maskedMobile,setMaskedMobile] = useState('******5621');
  const [otp,setOtp] = useState('');
  const [otpSent,setOtpSent] = useState(false);
  const [loading,setLoading] = useState(false);
  const [modules,setModules] = useState<ModuleDefinition[]>([]);
  const [users,setUsers] = useState<StaffUser[]>([]);
  const [selectedMobile,setSelectedMobile] = useState('');
  const [draftAccess,setDraftAccess] = useState<Record<string,boolean>>({});
  const [query,setQuery] = useState('');
  const [directoryWarning,setDirectoryWarning] = useState('');

  const selected = users.find((user)=>user.mobile===selectedMobile);
  const filteredUsers = useMemo(()=>users.filter((user)=>!query.trim() || `${user.name} ${user.mobile} ${user.role}`.toLowerCase().includes(query.trim().toLowerCase())),[users,query]);

  const loadAdministration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff/admin/access',{headers:{Accept:'application/json'}});
      const body = await response.json().catch(()=>null);
      if (response.status===401) { setStaffAuthenticated(false); return; }
      setStaffAuthenticated(true);
      if (response.status===403) { setAdminAuthenticated(false); return; }
      if (!response.ok) throw new Error(body?.message || 'Unable to load staff administration.');
      setAdminAuthenticated(true); setModules(body.modules || []); setUsers(body.users || []); setDirectoryWarning(body.directoryWarning || '');
      const firstMobile = selectedMobile || body.users?.[0]?.mobile || '';
      setSelectedMobile(firstMobile);
      const first = body.users?.find((user:StaffUser)=>user.mobile===firstMobile) || body.users?.[0];
      setDraftAccess(first?.access || {});
    } catch(error) { toast.error(error instanceof Error ? error.message : 'Unable to load staff administration.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ void loadAdministration(); },[]);

  const sendOtp = async () => {
    setLoading(true);
    try {
      const response=await fetch('/api/staff/admin/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      const body=await response.json().catch(()=>null); if(!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setMaskedMobile(body.maskedMobile || maskedMobile); setOtpSent(true); toast.success(body.message || 'Administration OTP sent.');
    } catch(error) { toast.error(error instanceof Error ? error.message : 'Unable to send OTP.'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (event:FormEvent) => {
    event.preventDefault(); setLoading(true);
    try {
      const response=await fetch('/api/staff/admin/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({otp})});
      const body=await response.json().catch(()=>null); if(!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setOtp(''); toast.success('Administration access verified.'); await loadAdministration();
    } catch(error) { toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.'); }
    finally { setLoading(false); }
  };

  const selectUser = (user:StaffUser) => { setSelectedMobile(user.mobile); setDraftAccess({...user.access}); };

  const save = async () => {
    if(!selectedMobile) return; setLoading(true);
    try {
      const response=await fetch('/api/staff/admin/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staffMobile:selectedMobile,access:draftAccess})});
      const body=await response.json().catch(()=>null); if(!response.ok) throw new Error(body?.message || 'Unable to save module access.');
      setUsers((current)=>current.map((user)=>user.mobile===selectedMobile?{...user,access:body.access}:user));
      setDraftAccess(body.access); toast.success('Staff module access updated.');
    } catch(error) { toast.error(error instanceof Error ? error.message : 'Unable to save module access.'); }
    finally { setLoading(false); }
  };

  if(staffAuthenticated===null || (loading&&!adminAuthenticated&&!otpSent)) return <main className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary"/></main>;
  if(staffAuthenticated===false) return <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4"><Card className="max-w-md shadow-lg"><CardContent className="p-6 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-primary"/><h1 className="mt-4 text-2xl font-bold">Staff sign-in required</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to the staff application before requesting administration access.</p><Button asChild className="mt-5 rounded-full"><Link to="/staff">Open Staff Application</Link></Button></CardContent></Card></main>;
  if(!adminAuthenticated) return <main className="min-h-screen bg-slate-50/80"><section className="container mx-auto flex min-h-[80vh] items-center justify-center px-4"><Card className="w-full max-w-md border-slate-200 shadow-xl"><CardContent className="p-7"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="h-7 w-7"/></div><div className="mt-5 text-center"><h1 className="text-2xl font-bold">Staff Administration</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">A fresh OTP sent to the authorised administrator at {maskedMobile} is required. Access expires after 10 minutes.</p></div>{!otpSent?<Button className="mt-6 w-full rounded-full" onClick={()=>void sendOtp()} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<KeyRound className="mr-2 h-4 w-4"/>}Send administration OTP</Button>:<form className="mt-6 space-y-4" onSubmit={verifyOtp}><div><Label htmlFor="admin-otp">OTP sent to {maskedMobile}</Label><Input id="admin-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} className="mt-2 text-center text-lg tracking-[.4em]" value={otp} onChange={(event)=>setOtp(event.target.value.replace(/\D/g,''))} placeholder="Enter OTP"/></div><Button type="submit" className="w-full rounded-full" disabled={loading||otp.length<4}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ShieldCheck className="mr-2 h-4 w-4"/>}Verify and enter</Button><Button type="button" variant="ghost" className="w-full" onClick={()=>void sendOtp()} disabled={loading}>Resend OTP</Button></form>}<Button asChild variant="link" className="mt-3 w-full"><Link to="/staff"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Staff</Link></Button></CardContent></Card></section></main>;

  return <main className="min-h-screen bg-slate-50/80">
    <header className="border-b bg-white"><div className="container mx-auto px-4 py-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Button asChild variant="outline" className="rounded-full"><Link to="/staff"><ArrowLeft className="mr-2 h-4 w-4"/>Staff</Link></Button><div className="flex gap-2"><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><Check className="mr-1 h-3 w-3"/>OTP verified</Badge><Button variant="outline" size="sm" className="rounded-full" onClick={()=>void loadAdministration()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</Button></div></div><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserCog className="h-6 w-6"/></div><div><h1 className="text-3xl font-bold">Staff Administration</h1><p className="mt-1 text-muted-foreground">Assign the Docty modules each staff member can access. Every change is recorded in the audit trail.</p></div></div></div></header>
    <section className="container mx-auto grid gap-5 px-4 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit shadow-sm"><CardContent className="p-0"><div className="border-b p-4"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/><h2 className="text-lg font-bold">Staff directory</h2></div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search staff or mobile"/></div>{directoryWarning&&<p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">{directoryWarning}</p>}</div><div className="max-h-[650px] divide-y overflow-y-auto">{filteredUsers.map((user)=><button key={user.mobile} onClick={()=>selectUser(user)} className={`block w-full p-4 text-left transition hover:bg-slate-50 ${selectedMobile===user.mobile?'bg-slate-50':''}`}><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{user.name || 'Staff user'}</p><p className="text-sm text-muted-foreground">+91 {user.mobile}</p></div><Badge variant="secondary">{Object.values(user.access).filter(Boolean).length} modules</Badge></div>{user.role&&<p className="mt-2 text-xs font-semibold text-primary">{user.role}</p>}</button>)}</div></CardContent></Card>
      {selected?<Card className="shadow-sm"><CardContent className="p-5"><div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"><div><Badge variant="outline">+91 {selected.mobile}</Badge><h2 className="mt-2 text-2xl font-bold">{selected.name || 'Staff user'}</h2><p className="text-sm text-muted-foreground">{selected.role || 'Role not supplied by Eka'}{selected.assignedClinics.length?` · ${selected.assignedClinics.map((clinic)=>clinic.name).join(', ')}`:''}</p></div><Button onClick={()=>void save()} disabled={loading}><Save className="mr-2 h-4 w-4"/>Save access</Button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{modules.map((module)=><div key={module.key} className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4"><div><Label htmlFor={`module-${module.key}`} className="font-bold">{module.label}</Label><p className="mt-1 text-sm leading-5 text-muted-foreground">{module.description}</p></div><Switch id={`module-${module.key}`} checked={Boolean(draftAccess[module.key])} onCheckedChange={(checked)=>setDraftAccess((current)=>({...current,[module.key]:checked}))}/></div>)}</div><div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Access control:</strong> changes take effect the next time the staff portal reloads. Administration itself always requires a fresh OTP to the authorised administrator.</div></CardContent></Card>:<Card className="border-dashed"><CardContent className="flex min-h-96 flex-col items-center justify-center text-center"><Users className="h-10 w-10 text-muted-foreground"/><h2 className="mt-3 font-bold">Select a staff member</h2><p className="mt-1 text-sm text-muted-foreground">Choose a staff user to configure module access.</p></CardContent></Card>}
    </section>
  </main>;
}
