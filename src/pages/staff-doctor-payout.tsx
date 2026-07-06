import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CreditCard,
  IdCard,
  IndianRupee,
  LineChart,
  ListChecks,
  Loader2,
  LogOut,
  Save,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface StaffDoctor {
  id: string;
  name: string;
  mobile?: string;
  specialisation?: string;
}

interface PayoutAppointment {
  id: string;
  clinicId?: string;
  clinic: string;
  startTime: number;
  status: string;
  statusLabel: string;
  serviceName?: string;
  mode?: string;
  channel?: string;
  paymentAmount: number;
  paymentSource?: string;
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

function payoutTotal(payout?: PayoutAppointment['payout']) {
  return (
    Number(payout?.fee || 0) +
    Number(payout?.tests || 0) +
    Number(payout?.daycare || 0) +
    Number(payout?.referral || 0)
  );
}

export default function StaffDoctorPayoutPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [doctors, setDoctors] = useState<StaffDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [startDate, setStartDate] = useState(() => addDays(todayDate(), -29));
  const [endDate, setEndDate] = useState(todayDate());
  const [appointments, setAppointments] = useState<PayoutAppointment[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<PayoutLedgerEntry[]>([]);
  const [selectedClinicFilterId, setSelectedClinicFilterId] = useState('all');
  const [selectedPaymentClinicId, setSelectedPaymentClinicId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayDate());
  const [paidAmount, setPaidAmount] = useState('');
  const [tdsAmount, setTdsAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentToDelete, setPaymentToDelete] = useState<PayoutLedgerEntry | null>(null);
  const [superAdminOtp, setSuperAdminOtp] = useState('');
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isSavingLedger, setIsSavingLedger] = useState(false);
  const [isSendingSuperAdminOtp, setIsSendingSuperAdminOtp] = useState(false);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [savingAppointmentId, setSavingAppointmentId] = useState('');

  const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
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
  const selectedPaymentClinic = clinicOptions.find((clinic) => clinic.id === selectedPaymentClinicId);
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
    const doctorShare = filteredAppointments.reduce((sum, item) => sum + payoutTotal(item.payout), 0);
    const netPaid = filteredLedgerEntries.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    const tds = filteredLedgerEntries.reduce((sum, item) => sum + Number(item.tdsAmount || 0), 0);
    const paid = netPaid + tds;
    return {
      consultations: completedAppointments.length,
      totalAppointments: filteredAppointments.length,
      totalPayment: filteredAppointments.reduce((sum, item) => sum + Number(item.paymentAmount || 0), 0),
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

  useEffect(() => {
    fetch('/api/staff/session', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const body = await response.json().catch(() => null);
          setStaffName(body?.staff?.name || body?.staff?.mobile || '');
          setIsStaffAdmin(Boolean(body?.staff?.isAdmin));
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsStaffAdmin(false);
      })
      .finally(() => setIsCheckingSession(false));
  }, []);

  const loadDoctors = async () => {
    setIsLoadingDoctors(true);
    try {
      const response = await fetch('/api/staff/doctor-payout-doctors', {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load doctors.');
      const list = body?.doctors || [];
      setDoctors(list);
      setSelectedDoctorId((current) => current || list[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load doctors.');
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const loadAppointments = async () => {
    if (!selectedDoctorId) {
      toast.error('Select a doctor first.');
      return;
    }
    setIsLoadingAppointments(true);
    try {
      const query = new URLSearchParams({ doctorId: selectedDoctorId, startDate, endDate });
      const response = await fetch(`/api/staff/doctor-payout-appointments?${query.toString()}`, {
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
    if (!selectedDoctorId) return;
    setIsLoadingLedger(true);
    try {
      const query = new URLSearchParams({
        doctorId: selectedDoctorId,
        periodStart: startDate,
        periodEnd: endDate,
      });
      if (selectedDoctor?.name) query.set('doctorName', selectedDoctor.name);
      if (selectedDoctor?.mobile) query.set('doctorMobile', selectedDoctor.mobile);
      const response = await fetch(`/api/staff/doctor-payout-ledger?${query.toString()}`, {
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
    if (isAuthenticated && isStaffAdmin) void loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isStaffAdmin]);

  useEffect(() => {
    if (selectedDoctorId) {
      void loadAppointments();
      void loadLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId]);

  useEffect(() => {
    if (!clinicOptions.length) {
      setSelectedPaymentClinicId('');
      setSelectedClinicFilterId('all');
      return;
    }
    setSelectedClinicFilterId((current) =>
      current === 'all' || clinicOptions.some((clinic) => clinic.id === current) ? current : 'all'
    );
    setSelectedPaymentClinicId((current) =>
      current && clinicOptions.some((clinic) => clinic.id === current) ? current : clinicOptions[0].id
    );
  }, [clinicOptions]);

  const logout = async () => {
    await fetch('/api/staff/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setIsStaffAdmin(false);
    setAppointments([]);
    setDoctors([]);
  };

  const updateAppointmentValue = (
    appointmentId: string,
    field: keyof PayoutAppointment['payout'],
    value: string
  ) => {
    const amount = Number(value);
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              payout: {
                ...(appointment.payout || { fee: 0, tests: 0, daycare: 0, referral: 0 }),
                [field]: Number.isFinite(amount) ? amount : 0,
              },
            }
          : appointment
      )
    );
  };

  const savePayment = async (appointment: PayoutAppointment) => {
    setSavingAppointmentId(appointment.id);
    try {
      const response = await fetch('/api/staff/doctor-payout-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          payout: appointment.payout,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to save payout details.');
      setAppointments((current) =>
        current.map((item) =>
          item.id === appointment.id
            ? { ...item, payout: body.payout || item.payout }
            : item
        )
      );
      toast.success('Payout details saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save payout details.');
    } finally {
      setSavingAppointmentId('');
    }
  };

  const addLedgerPayment = async () => {
    if (!selectedDoctorId) {
      toast.error('Select a doctor first.');
      return;
    }
    if (!selectedPaymentClinic) {
      toast.error('Select the clinic account for this payment.');
      return;
    }
    setIsSavingLedger(true);
    try {
      const response = await fetch('/api/staff/doctor-payout-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          doctorName: selectedDoctor?.name || '',
          doctorMobile: selectedDoctor?.mobile || '',
          clinicId: selectedPaymentClinic.id,
          clinicName: selectedPaymentClinic.name,
          periodStart: startDate,
          periodEnd: endDate,
          paymentDate,
          paidAmount,
          tdsAmount,
          reference: paymentReference,
          remarks: paymentRemarks,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to add payout payment.');
      setLedgerEntries((current) => [body.entry, ...current]);
      setPaidAmount('');
      setTdsAmount('');
      setPaymentReference('');
      setPaymentRemarks('');
      toast.success('Payout payment added.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add payout payment.');
    } finally {
      setIsSavingLedger(false);
    }
  };

  const sendSuperAdminOtp = async () => {
    setIsSendingSuperAdminOtp(true);
    try {
      const response = await fetch('/api/staff/super-admin-otp', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send Super Admin OTP.');
      toast.success(`Super Admin OTP sent to ${body?.maskedMobile || 'registered mobile'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send Super Admin OTP.');
    } finally {
      setIsSendingSuperAdminOtp(false);
    }
  };

  const openDeletePaymentDialog = (entry: PayoutLedgerEntry) => {
    setPaymentToDelete(entry);
    setSuperAdminOtp('');
    void sendSuperAdminOtp();
  };

  const deleteLedgerPayment = async () => {
    if (!paymentToDelete) return;
    if (!/^\d{4,8}$/.test(superAdminOtp)) {
      toast.error('Enter the Super Admin OTP.');
      return;
    }
    setIsDeletingPayment(true);
    try {
      const response = await fetch('/api/staff/doctor-payout-ledger', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: paymentToDelete.id,
          superAdminOtp,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to delete payout payment.');
      setLedgerEntries((current) => current.filter((entry) => entry.id !== paymentToDelete.id));
      setPaymentToDelete(null);
      setSuperAdminOtp('');
      toast.success('Payout payment deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete payout payment.');
    } finally {
      setIsDeletingPayment(false);
    }
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
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <h1 className="text-2xl font-bold">Staff access required</h1>
            <p className="mt-2 text-muted-foreground">
              Please sign in through the staff application to access doctor payout.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/staff">Go to staff login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isStaffAdmin) {
    return (
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Admin access required</h1>
            <p className="mt-2 text-muted-foreground">
              Doctor Payout is available only for admin staff. Please contact the Super Admin if you need access.
            </p>
            <Button asChild className="mt-5 rounded-full">
              <Link to="/staff">Back to Staff Application</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-slate-50/70">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="h-12 w-auto" />
            <Button variant="outline" className="rounded-full bg-white" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff">
                <IdCard className="mr-2 h-4 w-4" />
                Cards
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff/leads">
                <ListChecks className="mr-2 h-4 w-4" />
                Leads
              </Link>
            </Button>
            <Button className="rounded-full">
              <CreditCard className="mr-2 h-4 w-4" />
              Doctor Payout
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/franchise">
                <LineChart className="mr-2 h-4 w-4" />
                Franchise Dashboard
              </Link>
            </Button>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <Stethoscope className="h-4 w-4" />
              Doctor payout
            </div>
            <h1 className="text-3xl font-bold">Manage doctor payout</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Review payment amount from Eka and enter doctor payout by category: Fee, Tests, Daycare, and Referral.
              {staffName ? ` Signed in as ${staffName}.` : ''}
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:p-5">
            <div className="space-y-2">
              <Label htmlFor="doctor-select">Doctor</Label>
              <select
                id="doctor-select"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedDoctorId}
                onChange={(event) => {
                  setSelectedDoctorId(event.target.value);
                  setAppointments([]);
                }}
                disabled={isLoadingDoctors}
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}{doctor.specialisation ? ` · ${doctor.specialisation}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-start-date">Start date</Label>
              <Input id="payout-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-end-date">End date</Label>
              <Input id="payout-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-filter">Clinic</Label>
              <select
                id="clinic-filter"
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
              Load
            </Button>
            <p className="text-xs text-muted-foreground md:col-span-5">
              Monthly ranges are supported up to 31 days. Eka allows 7 days per request, so we fetch weekly batches automatically.
            </p>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total payout', value: formatMoney(stats.doctorShare), icon: IndianRupee },
            { label: 'Paid', value: formatMoney(stats.paid), icon: CreditCard },
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
                <h2 className="text-xl font-bold">Clinic-wise reconciliation</h2>
                <p className="text-sm text-muted-foreground">
                  Use this view to reconcile doctor payouts separately for each clinic account.
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

        <div className="mb-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="text-xl font-bold">Add payout payment</h2>
                <p className="text-sm text-muted-foreground">
                  Record payment made for the selected doctor and date range.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="payment-clinic">Clinic account</Label>
                  <select
                    id="payment-clinic"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedPaymentClinicId}
                    onChange={(event) => setSelectedPaymentClinicId(event.target.value)}
                    disabled={!clinicOptions.length}
                  >
                    {clinicOptions.length ? (
                      clinicOptions.map((clinic) => (
                        <option key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Load appointments to select clinic</option>
                    )}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Payment records are clinic-wise so they can map to separate clinic accounts later.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid-amount">Net paid to doctor</Label>
                  <Input
                    id="paid-amount"
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(event) => setPaidAmount(event.target.value)}
                    placeholder="Amount transferred"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tds-amount">TDS deducted</Label>
                  <Input
                    id="tds-amount"
                    type="number"
                    min="0"
                    value={tdsAmount}
                    onChange={(event) => setTdsAmount(event.target.value)}
                    placeholder="TDS amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-reference">Reference</Label>
                  <Input
                    id="payment-reference"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="UPI / bank ref"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="payment-remarks">Remarks</Label>
                  <Input
                    id="payment-remarks"
                    value={paymentRemarks}
                    onChange={(event) => setPaymentRemarks(event.target.value)}
                    placeholder="Optional remarks"
                  />
                </div>
              </div>
              <Button
                className="mt-4 rounded-full"
                disabled={isSavingLedger}
                onClick={() => void addLedgerPayment()}
              >
                {isSavingLedger && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add payment
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="text-xl font-bold">Payment history</h2>
                <p className="text-sm text-muted-foreground">
                  Payments for {selectedDoctor?.name || 'selected doctor'} · {startDate} to {endDate}
                  {selectedClinicFilterId !== 'all'
                    ? ` · ${clinicOptions.find((clinic) => clinic.id === selectedClinicFilterId)?.name || 'Selected clinic'}`
                    : ''}
                </p>
              </div>
              {isLoadingLedger ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading payments...
                </div>
              ) : filteredLedgerEntries.length ? (
                <div className="space-y-3">
                  {filteredLedgerEntries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${entry.paymentDate}T00:00:00`))}</p>
                          <p className="text-sm font-semibold text-primary">
                            {entry.clinicName || 'Clinic not tagged'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.reference || 'No reference'}{entry.createdBy ? ` · by ${entry.createdBy}` : ''}
                          </p>
                          {entry.remarks && <p className="mt-1 text-sm text-muted-foreground">{entry.remarks}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            Paid {formatMoney(Number(entry.paidAmount || 0) + Number(entry.tdsAmount || 0))}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            TDS {formatMoney(Number(entry.tdsAmount || 0))}
                          </p>
                          <p className="text-sm font-semibold">
                            Net paid {formatMoney(Number(entry.paidAmount || 0))}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDeletePaymentDialog(entry)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-muted-foreground">
                  No payout payments added for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="border-b p-5">
              <h2 className="text-xl font-bold">
                Consultations{selectedDoctor ? ` · ${selectedDoctor.name}` : ''}
              </h2>
              <p className="text-sm text-muted-foreground">
                Date range can be up to 31 days.
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
                    <TableHead className="min-w-[220px]">Doctor payout</TableHead>
                    <TableHead className="text-right">Payout total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAppointments ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
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
                          <span className="block font-semibold">{formatMoney(appointment.paymentAmount)}</span>
                          {appointment.paymentSource && appointment.paymentSource !== 'not_found' ? (
                            <span className="text-[11px] text-muted-foreground">{appointment.paymentSource}</span>
                          ) : (
                            <span className="text-[11px] text-amber-600">No payment in Eka</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-[220px] flex-col gap-2">
                            {[
                              ['fee', 'Fee'],
                              ['tests', 'Tests'],
                              ['daycare', 'Daycare'],
                              ['referral', 'Referral'],
                            ].map(([field, label]) => (
                              <label
                                key={field}
                                className="grid grid-cols-[72px_1fr] items-center gap-2 text-xs text-muted-foreground"
                              >
                                <span className="font-medium">{label}</span>
                                <Input
                                  className="h-9"
                                  type="number"
                                  min="0"
                                  value={appointment.payout?.[field as keyof PayoutAppointment['payout']] || 0}
                                  onChange={(event) =>
                                    updateAppointmentValue(
                                      appointment.id,
                                      field as keyof PayoutAppointment['payout'],
                                      event.target.value
                                    )
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMoney(payoutTotal(appointment.payout))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="rounded-full"
                            disabled={savingAppointmentId === appointment.id}
                            onClick={() => void savePayment(appointment)}
                          >
                            {savingAppointmentId === appointment.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No consultations found for this doctor/date range.
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
    <Dialog
      open={Boolean(paymentToDelete)}
      onOpenChange={(open) => {
        if (!open && !isDeletingPayment) {
          setPaymentToDelete(null);
          setSuperAdminOtp('');
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldCheck className="h-5 w-5" />
            </span>
            Super Admin approval required
          </DialogTitle>
          <DialogDescription className="text-left">
            Enter the OTP sent to the Super Admin mobile ending 5621 to delete this payout payment.
          </DialogDescription>
        </DialogHeader>
        {paymentToDelete && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold">{paymentToDelete.clinicName || 'Clinic not tagged'}</p>
            <p className="text-muted-foreground">
              {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
                new Date(`${paymentToDelete.paymentDate}T00:00:00`)
              )}{' '}
              · Net paid {formatMoney(Number(paymentToDelete.paidAmount || 0))}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="super-admin-otp">Super Admin OTP</Label>
          <Input
            id="super-admin-otp"
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={superAdminOtp}
            onChange={(event) => setSuperAdminOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="Enter OTP"
            autoComplete="one-time-code"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={isSendingSuperAdminOtp || isDeletingPayment}
            onClick={() => void sendSuperAdminOtp()}
          >
            {isSendingSuperAdminOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend OTP
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={isDeletingPayment}
            onClick={() => void deleteLedgerPayment()}
          >
            {isDeletingPayment ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
