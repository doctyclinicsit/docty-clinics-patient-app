import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IndianRupee, Loader2, LogOut, Plus, ReceiptText, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Cohort = { id: string; name: string };
type Expense = { id: string; expense_category: string; description: string; amount: number; occurred_on: string; submitted_by_name: string };
type Sale = { id: string; sale_category: string; description: string; net_amount: number; occurred_on: string; submitted_by_name: string };

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

export default function CampFinancePage() {
  const [params] = useSearchParams();
  const campId = params.get('camp') || '';
  const sessionKey = campId ? `docty-station-session:${campId}:finance` : '';
  const [token, setToken] = useState(() => sessionKey ? window.sessionStorage.getItem(sessionKey) || '' : '');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState({ expenses: 0, sales: 0, net: 0 });
  const [staffName, setStaffName] = useState('');

  const headers = { Authorization: `Bearer ${token}` };
  const endSession = () => { if (sessionKey) window.sessionStorage.removeItem(sessionKey); setToken(''); setOtp(''); setOtpSent(false); };

  const load = async () => {
    if (!token || !campId) return;
    setLoading(true);
    try {
      const [financeResponse, campResponse] = await Promise.all([
        fetch('/api/camp-finance', { headers, cache: 'no-store' }),
        fetch(`/api/camp-operations?campId=${encodeURIComponent(campId)}&station=finance`, { headers, cache: 'no-store' }),
      ]);
      const finance = await financeResponse.json().catch(() => null);
      const camp = await campResponse.json().catch(() => null);
      if (financeResponse.status === 401 || campResponse.status === 401) { endSession(); throw new Error('Your Camp Finance session has expired.'); }
      if (!financeResponse.ok) throw new Error(finance?.message || 'Unable to load camp finances.');
      if (!campResponse.ok) throw new Error(camp?.message || 'Unable to load assigned cohorts.');
      setExpenses(finance.expenses || []); setSales(finance.sales || []); setSummary(finance.summary || { expenses: 0, sales: 0, net: 0 });
      setStaffName(finance.staffName || ''); setCohorts(camp.cohorts || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load Camp Finance.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [token, campId]);

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true);
    try {
      const response = await fetch('/api/camp-station-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: otpSent ? 'verify-otp' : 'send-otp', campId, stationType: 'finance', mobile, otp }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify access.');
      if (!otpSent) { setOtpSent(true); setMessage('OTP sent to your assigned WhatsApp number.'); return; }
      window.sessionStorage.setItem(sessionKey, body.token); setToken(body.token); setStaffName(body.staffName || ''); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to verify access.'); }
    finally { setLoading(false); }
  };

  const submitRecord = async (event: FormEvent<HTMLFormElement>, resource: 'expense' | 'sale') => {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget); const payload: Record<string, unknown> = { resource };
    form.forEach((value, key) => { payload[key] = value; });
    try {
      const response = await fetch('/api/camp-finance', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (response.status === 401) endSession();
      if (!response.ok) throw new Error(body?.message || 'Unable to save transaction.');
      event.currentTarget.reset(); toast.success(resource === 'expense' ? 'Expense submitted.' : 'Sale recorded.'); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save transaction.'); }
    finally { setLoading(false); }
  };

  if (!token) return <main className="flex min-h-screen items-center justify-center bg-[#f3f6f8] p-4"><Card className="w-full max-w-md rounded-lg"><CardContent className="p-6"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-10 w-auto" /><p className="mt-6 text-xs font-bold uppercase text-sky-600">Camp Finance</p><h1 className="mt-1 text-2xl font-bold">Staff session access</h1><p className="mt-2 text-sm text-slate-500">Sign in with the mobile assigned to Camp Finance. Access is available only for this browser session.</p><form className="mt-5 grid gap-4" onSubmit={authenticate}><div><Label>Assigned mobile</Label><Input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="numeric" maxLength={10} disabled={otpSent} required /></div>{otpSent && <div><Label>WhatsApp OTP</Label><Input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" maxLength={8} autoFocus required /></div>}<Button disabled={loading || !campId}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{otpSent ? 'Verify OTP & Start Session' : 'Send OTP'}</Button>{message && <p className="text-sm text-slate-600">{message}</p>}</form></CardContent></Card></main>;

  const today = new Date().toISOString().slice(0, 10);
  return <main className="min-h-screen bg-[#f3f6f8] text-slate-900"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4"><div className="flex items-center gap-4"><img src="/docty-logo-full.png" alt="Docty Clinics" className="h-9 w-auto" /><div><p className="text-xs font-bold uppercase text-sky-600">Camp Finance</p><h1 className="font-bold">Sales & Expenses</h1></div></div><div className="flex items-center gap-2"><span className="hidden text-sm font-semibold sm:inline">{staffName}</span><Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="outline" onClick={endSession}><LogOut className="mr-2 h-4 w-4" />End Session</Button></div></div></header><section className="mx-auto max-w-6xl px-4 py-6"><div className="mb-5 grid gap-3 sm:grid-cols-3">{[[TrendingUp, summary.sales, 'Camp sales'], [ReceiptText, summary.expenses, 'Camp expenses'], [IndianRupee, summary.net, 'Net contribution']].map(([Icon, value, label]) => <Card key={String(label)} className="rounded-lg shadow-none"><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-sky-700" /><div><p className="text-xl font-bold">{money(value as number)}</p><p className="text-xs text-slate-500">{label as string}</p></div></CardContent></Card>)}</div><Tabs defaultValue="expense"><TabsList><TabsTrigger value="expense">Add Expense</TabsTrigger><TabsTrigger value="sale">Record Sale</TabsTrigger><TabsTrigger value="ledger">Ledger</TabsTrigger></TabsList><TabsContent value="expense"><FinanceForm type="expense" cohorts={cohorts} today={today} loading={loading} onSubmit={submitRecord} /></TabsContent><TabsContent value="sale"><FinanceForm type="sale" cohorts={cohorts} today={today} loading={loading} onSubmit={submitRecord} /></TabsContent><TabsContent value="ledger"><Card className="rounded-lg shadow-none"><CardContent className="p-0"><div className="divide-y">{[...sales.map((item) => ({ ...item, kind: 'Sale', amount: item.net_amount, category: item.sale_category })), ...expenses.map((item) => ({ ...item, kind: 'Expense', amount: item.amount, category: item.expense_category }))].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{item.description}</p><p className="text-xs text-slate-500">{item.kind} / {item.category} / {item.occurred_on} / {item.submitted_by_name}</p></div><p className={`font-bold ${item.kind === 'Sale' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.kind === 'Sale' ? '+' : '-'}{money(item.amount)}</p></div>)}</div></CardContent></Card></TabsContent></Tabs></section></main>;
}

function FinanceForm({ type, cohorts, today, loading, onSubmit }: { type: 'expense' | 'sale'; cohorts: Cohort[]; today: string; loading: boolean; onSubmit: (event: FormEvent<HTMLFormElement>, resource: 'expense' | 'sale') => Promise<void> }) {
  const sale = type === 'sale';
  return <Card className="max-w-2xl rounded-lg shadow-none"><CardContent className="p-5"><form className="grid gap-4" onSubmit={(event) => void onSubmit(event, type)}><div className="grid gap-3 sm:grid-cols-2"><div><Label>Cohort</Label><select name="cohortId" className="h-9 w-full rounded-md border bg-white px-3 text-sm"><option value="">Whole camp</option>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></div><div><Label>Date</Label><Input name="occurredOn" type="date" defaultValue={today} required /></div></div><div className="grid gap-3 sm:grid-cols-2"><div><Label>Category</Label><select name="category" className="h-9 w-full rounded-md border bg-white px-3 text-sm">{(sale ? ['Consultation', 'Subscription', 'Pharmacy', 'Lab Test', 'Vaccination', 'Package', 'Other'] : ['Travel', 'Food', 'Consumables', 'Equipment', 'Venue', 'Marketing', 'Staff', 'Other']).map((item) => <option key={item}>{item}</option>)}</select></div><div><Label>Payment mode</Label><select name="paymentMode" className="h-9 w-full rounded-md border bg-white px-3 text-sm"><option>UPI</option><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Credit</option></select></div></div><div><Label>Description</Label><Input name="description" required /></div>{sale ? <><div className="grid grid-cols-3 gap-3"><div><Label>Quantity</Label><Input name="quantity" type="number" min="1" defaultValue="1" /></div><div><Label>Gross amount</Label><Input name="grossAmount" type="number" min="0" step="0.01" required /></div><div><Label>Discount</Label><Input name="discountAmount" type="number" min="0" step="0.01" defaultValue="0" /></div></div><div><Label>Payment reference</Label><Input name="referenceNumber" /></div></> : <><div><Label>Amount</Label><Input name="amount" type="number" min="0" step="0.01" required /></div><div><Label>Receipt URL</Label><Input name="receiptUrl" type="url" placeholder="Optional receipt link" /></div></>}<Button disabled={loading}><Plus className="mr-2 h-4 w-4" />{sale ? 'Record Sale' : 'Submit Expense'}</Button></form></CardContent></Card>;
}
