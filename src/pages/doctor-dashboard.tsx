import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  IndianRupee,
  Loader2,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DoctorSession {
  id: string;
  name: string;
  mobile: string;
  specialisation?: string;
}

interface DoctorAppointment {
  id: string;
  clinicId?: string;
  clinic: string;
  startTime: number;
  endTime?: number;
  status: string;
  statusLabel: string;
  mode?: string;
  channel?: string;
  serviceName?: string;
  paymentAmount: number;
  payout: {
    fee: number;
    tests: number;
    daycare: number;
    referral: number;
  };
}

interface PayoutLedgerEntry {
  id: string;
  clinicId?: string;
  clinicName?: string;
  paymentDate: string;
  paidAmount: number;
  tdsAmount: number;
  reference?: string;
  remarks?: string;
  createdAt: string;
  createdBy?: string;
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, '').slice(-10);
}

function todayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatDateTime(epochSeconds: number) {
  if (!epochSeconds) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochSeconds * 1000));
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function payoutTotal(payout?: DoctorAppointment['payout']) {
  return (
    Number(payout?.fee || 0) +
    Number(payout?.tests || 0) +
    Number(payout?.daycare || 0) +
    Number(payout?.referral || 0)
  );
}

export default function DoctorDashboardPage() {
  const [authStep, setAuthStep] = useState<'mobile' | 'otp'>('mobile');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [doctor, setDoctor] = useState<DoctorSession | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [endDate, setEndDate] = useState(todayDate());
  const [startDate, setStartDate] = useState(() => addDays(todayDate(), -29));
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PayoutLedgerEntry[]>([]);
  const [selectedClinicFilterId, setSelectedClinicFilterId] = useState('all');
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  const clinicOptions = useMemo(() => {
    const clinics = new Map<string, string>();
    appointments.forEach((appointment) => {
      const clinicId = appointment.clinicId || appointment.clinic || 'unknown';
      clinics.set(clinicId, appointment.clinic || 'Clinic not specified');
    });
    ledgerEntries.forEach((entry) => {
      const clinicId = entry.clinicId || entry.clinicName || 'untagged';
      clinics.set(clinicId, entry.clinicName || 'Clinic not tagged');
    });
    return Array.from(clinics, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments, ledgerEntries]);
  const filteredAppointments = useMemo(
    () =>
      selectedClinicFilterId === 'all'
        ? appointments
        : appointments.filter((appointment) => (appointment.clinicId || appointment.clinic || 'unknown') === selectedClinicFilterId),
    [appointments, selectedClinicFilterId]
  );
  const filteredLedgerEntries = useMemo(
    () =>
      selectedClinicFilterId === 'all'
        ? ledgerEntries
        : ledgerEntries.filter((entry) => (entry.clinicId || entry.clinicName || 'untagged') === selectedClinicFilterId),
    [ledgerEntries, selectedClinicFilterId]
  );
  const completedAppointments = filteredAppointments.filter((appointment) =>
    ['CM', 'CMNP'].includes(appointment.status)
  );
  const stats = useMemo(() => {
    const totalPayment = filteredAppointments.reduce((sum, item) => sum + Number(item.paymentAmount || 0), 0);
    const doctorShare = filteredAppointments.reduce((sum, item) => sum + payoutTotal(item.payout), 0);
    const netPaid = filteredLedgerEntries.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    const tds = filteredLedgerEntries.reduce((sum, item) => sum + Number(item.tdsAmount || 0), 0);
    const paid = netPaid + tds;
    return {
      consultations: completedAppointments.length,
      totalAppointments: filteredAppointments.length,
      totalPayment,
      doctorShare,
      paid,
      netPaid,
      tds,
      balance: Math.max(0, doctorShare - paid),
    };
  }, [filteredAppointments, completedAppointments.length, filteredLedgerEntries]);

  const clinicSummaries = useMemo(() => {
    const clinics = new Map<
      string,
      { id: string; name: string; doctorShare: number; netPaid: number; tds: number; paid: number; balance: number }
    >();

    filteredAppointments.forEach((appointment) => {
      const id = appointment.clinicId || appointment.clinic || 'unknown';
      const current = clinics.get(id) || {
        id,
        name: appointment.clinic || 'Clinic not specified',
        doctorShare: 0,
        netPaid: 0,
        tds: 0,
        paid: 0,
        balance: 0,
      };
      current.doctorShare += payoutTotal(appointment.payout);
      clinics.set(id, current);
    });

    filteredLedgerEntries.forEach((entry) => {
      const id = entry.clinicId || entry.clinicName || 'untagged';
      const current = clinics.get(id) || {
        id,
        name: entry.clinicName || 'Clinic not tagged',
        doctorShare: 0,
        netPaid: 0,
        tds: 0,
        paid: 0,
        balance: 0,
      };
      current.netPaid += Number(entry.paidAmount || 0);
      current.tds += Number(entry.tdsAmount || 0);
      current.paid = current.netPaid + current.tds;
      clinics.set(id, current);
    });

    return Array.from(clinics.values())
      .map((clinic) => ({
        ...clinic,
        paid: clinic.netPaid + clinic.tds,
        balance: Math.max(0, clinic.doctorShare - clinic.netPaid - clinic.tds),
      }))
      .sort((a, b) => b.doctorShare - a.doctorShare || a.name.localeCompare(b.name));
  }, [filteredAppointments, filteredLedgerEntries]);

  const loadAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const query = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/doctor/appointments?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load consultations.');
      setAppointments(body?.appointments || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load consultations.');
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const loadLedger = async () => {
    setIsLoadingLedger(true);
    try {
      const query = new URLSearchParams({ periodStart: startDate, periodEnd: endDate });
      const response = await fetch(`/api/doctor/payout-ledger?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load payout payments.');
      setLedgerEntries(body?.entries || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load payout payments.');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetch('/api/doctor/session', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const body = await response.json().catch(() => null);
          setDoctor(body?.doctor || null);
          setMobile(body?.doctor?.mobile || '');
          setSessionExpiresAt(body?.expiresAt || null);
        } else {
          setSessionExpiresAt(null);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setSessionExpiresAt(null);
      })
      .finally(() => setIsCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return undefined;
    const timer = window.setTimeout(() => {
      setIsAuthenticated(false);
      setDoctor(null);
      setAppointments([]);
      setSessionExpiresAt(null);
      setAuthStep('mobile');
      toast.info('Doctor session expired. Please verify OTP again.');
    }, Math.max(0, sessionExpiresAt * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, sessionExpiresAt]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadAppointments();
      void loadLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!clinicOptions.length) {
      setSelectedClinicFilterId('all');
      return;
    }
    setSelectedClinicFilterId((current) =>
      current === 'all' || clinicOptions.some((clinic) => clinic.id === current) ? current : 'all'
    );
  }, [clinicOptions]);

  const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedMobile = normalizeMobile(mobile);
    if (normalizedMobile.length !== 10) {
      toast.error('Enter a valid 10-digit doctor mobile number.');
      return;
    }
    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/doctor/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setMobile(normalizedMobile);
      setAuthStep('otp');
      toast.success('OTP sent successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 4) {
      toast.error('Enter the 4-digit OTP.');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const response = await fetch('/api/doctor/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setIsAuthenticated(true);
      setDoctor(body?.doctor || null);
      setSessionExpiresAt(body?.expiresAt || Math.floor(Date.now() / 1000) + 30 * 60);
      setOtp('');
      toast.success('Doctor access verified.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const logout = async () => {
    await fetch('/api/doctor/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setDoctor(null);
    setAppointments([]);
    setLedgerEntries([]);
    setSessionExpiresAt(null);
    setAuthStep('mobile');
  };

  if (isCheckingSession) {
    return (
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold">Doctor dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Verify your listed doctor mobile number to view consultation stats and payout information.
              </p>
            </div>
            {authStep === 'mobile' ? (
              <form className="space-y-4" onSubmit={sendOtp}>
                <div className="space-y-2">
                  <Label htmlFor="doctor-mobile">Doctor mobile number</Label>
                  <Input
                    id="doctor-mobile"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(event) => setMobile(event.target.value)}
                    placeholder="Enter listed doctor mobile number"
                    autoComplete="tel"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isSendingOtp}>
                  {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={verifyOtp}>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-muted-foreground">
                  OTP sent to +91 ••••••{mobile.slice(-4)}
                  <span className="block font-semibold text-foreground">
                    Access will be allowed only if this mobile exists in the Eka doctor list.
                  </span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor-otp">4-digit OTP</Label>
                  <Input
                    id="doctor-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter OTP"
                    autoComplete="one-time-code"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isVerifyingOtp}>
                  {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={() => {
                    setAuthStep('mobile');
                    setOtp('');
                  }}
                >
                  Change mobile number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/70">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="h-12 w-auto" />
            <Button variant="outline" className="rounded-full bg-white" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Stethoscope className="h-4 w-4" />
              Doctor dashboard
            </div>
            <h1 className="text-3xl font-bold">Welcome, {doctor?.name || 'Doctor'}</h1>
            <p className="text-muted-foreground">
              {doctor?.specialisation || 'Consultations'} · +91 {doctor?.mobile}
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:p-5">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor-clinic-filter">Clinic</Label>
              <select
                id="doctor-clinic-filter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedClinicFilterId}
                onChange={(event) => setSelectedClinicFilterId(event.target.value)}
              >
                <option value="all">All clinics</option>
                {clinicOptions.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="self-end rounded-full"
              onClick={() => {
                void loadAppointments();
                void loadLedger();
              }}
              disabled={isLoadingAppointments || isLoadingLedger}
            >
              {isLoadingAppointments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh
            </Button>
            <p className="text-xs text-muted-foreground md:col-span-4">
              You can select up to 31 days. We fetch Eka appointments in weekly batches in the background.
            </p>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total payout', value: formatMoney(stats.doctorShare), icon: IndianRupee },
            { label: 'Paid', value: formatMoney(stats.paid), icon: IndianRupee },
            { label: 'TDS deducted', value: formatMoney(stats.tds), icon: IndianRupee },
            { label: 'Balance so far', value: formatMoney(stats.balance), icon: CalendarDays },
          ].map((item) => (
            <Card key={item.label} className="shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {clinicSummaries.length > 1 && (
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="text-xl font-bold">Clinic-wise payout</h2>
                <p className="text-sm text-muted-foreground">
                  Each clinic can be reconciled independently when clinic accounts are separate.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border bg-white">
                <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-muted-foreground md:grid-cols-[1fr_130px_130px_130px_130px]">
                  <span>Clinic</span>
                  <span className="text-right">Payout</span>
                  <span className="hidden text-right md:block">Paid</span>
                  <span className="hidden text-right md:block">TDS</span>
                  <span className="hidden text-right md:block">Balance</span>
                </div>
                <div className="divide-y">
                  {clinicSummaries.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 md:grid-cols-[1fr_130px_130px_130px_130px] md:items-center"
                    >
                      <div>
                        <p className="font-semibold">{clinic.name}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm md:hidden">
                          <span className="text-muted-foreground">Paid {formatMoney(clinic.paid)}</span>
                          <span className="text-muted-foreground">TDS {formatMoney(clinic.tds)}</span>
                          <span className="font-semibold">Balance {formatMoney(clinic.balance)}</span>
                        </div>
                      </div>
                      <p className="text-right font-bold">{formatMoney(clinic.doctorShare)}</p>
                      <p className="hidden text-right text-muted-foreground md:block">{formatMoney(clinic.paid)}</p>
                      <p className="hidden text-right text-muted-foreground md:block">{formatMoney(clinic.tds)}</p>
                      <p className="hidden text-right font-semibold md:block">{formatMoney(clinic.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Payout payments</h2>
              <p className="text-sm text-muted-foreground">
                Payments recorded by Docty staff for {startDate} to {endDate}.
                {selectedClinicFilterId !== 'all'
                  ? ` Showing ${clinicOptions.find((clinic) => clinic.id === selectedClinicFilterId)?.name || 'selected clinic'}.`
                  : ''}
              </p>
            </div>
            {isLoadingLedger ? (
              <div className="flex h-24 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading payment details...
              </div>
            ) : filteredLedgerEntries.length ? (
              <div className="overflow-hidden rounded-2xl border bg-white">
                <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-muted-foreground md:grid-cols-[1fr_140px_140px_140px]">
                  <span>Payment details</span>
                  <span className="text-right">Paid</span>
                  <span className="hidden text-right md:block">TDS</span>
                  <span className="hidden text-right md:block">Net paid</span>
                </div>
                <div className="divide-y">
                  {filteredLedgerEntries.map((entry) => {
                    const netPaidAmount = Number(entry.paidAmount || 0);
                    const tdsAmount = Number(entry.tdsAmount || 0);
                    const grossPaidAmount = netPaidAmount + tdsAmount;
                    return (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 md:grid-cols-[1fr_140px_140px_140px] md:items-center"
                      >
                        <div>
                          <p className="font-semibold">
                            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                              new Date(`${entry.paymentDate}T00:00:00`)
                            )}
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            {entry.clinicName || 'Clinic not tagged'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Reference: {entry.reference || 'Not added'}
                          </p>
                          {entry.remarks && (
                            <p className="mt-1 text-sm text-muted-foreground">{entry.remarks}</p>
                          )}
                          <div className="mt-2 flex gap-4 text-sm md:hidden">
                            <span className="text-muted-foreground">TDS {formatMoney(tdsAmount)}</span>
                            <span className="font-semibold">Net {formatMoney(netPaidAmount)}</span>
                          </div>
                        </div>
                        <p className="text-right font-bold">{formatMoney(grossPaidAmount)}</p>
                        <p className="hidden text-right text-muted-foreground md:block">
                          {formatMoney(tdsAmount)}
                        </p>
                        <p className="hidden text-right font-semibold md:block">
                          {formatMoney(netPaidAmount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-muted-foreground">
                No payout payments recorded for this period yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="border-b p-5">
              <h2 className="text-xl font-bold">Consultations</h2>
              <p className="text-sm text-muted-foreground">
                Payout values are maintained by Docty staff and shown here for your reference.
                {selectedClinicFilterId !== 'all'
                  ? ` Showing ${clinicOptions.find((clinic) => clinic.id === selectedClinicFilterId)?.name || 'selected clinic'}.`
                  : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & time</TableHead>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Total payment</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Tests</TableHead>
                    <TableHead className="text-right">Daycare</TableHead>
                    <TableHead className="text-right">Referral</TableHead>
                    <TableHead className="text-right">Doctor share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAppointments ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        Loading consultations...
                      </TableCell>
                    </TableRow>
                  ) : filteredAppointments.length ? (
                    filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">{formatDateTime(appointment.startTime)}</TableCell>
                        <TableCell>{appointment.clinic}</TableCell>
                        <TableCell>
                          <Badge variant={['CM', 'CMNP'].includes(appointment.status) ? 'default' : 'secondary'}>
                            {appointment.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>{appointment.serviceName || appointment.mode || appointment.channel || 'Consultation'}</TableCell>
                        <TableCell className="text-right">
                          {formatMoney(appointment.paymentAmount)}
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(appointment.payout?.fee || 0)}</TableCell>
                        <TableCell className="text-right">{formatMoney(appointment.payout?.tests || 0)}</TableCell>
                        <TableCell className="text-right">{formatMoney(appointment.payout?.daycare || 0)}</TableCell>
                        <TableCell className="text-right">{formatMoney(appointment.payout?.referral || 0)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(payoutTotal(appointment.payout))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                        No consultations found for this date range.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
