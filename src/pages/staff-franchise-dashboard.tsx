import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  CreditCard,
  FileText,
  IdCard,
  LineChart,
  ListChecks,
  Loader2,
  LogOut,
  PieChart as PieChartIcon,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
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

interface DashboardTotals {
  appointments: number;
  completed: number;
  cancelled: number;
  patients: number;
  newPatients: number;
  repeatPatients: number;
  repeatVisits: number;
  doctors: number;
  ekaRevenue: number;
  zohoReceipts: number;
}

interface ClinicRow {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  cancelled: number;
  patients: number;
  doctors: number;
  ekaRevenue: number;
  zohoReceipts: number;
  variance: number;
}

interface DoctorRow {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  patients: number;
  revenue: number;
  completionRate: number;
}

interface SpecialtyRow {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  patients: number;
  doctors: number;
  completionRate: number;
}

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  patientName: string;
  doctorName: string;
  clinic: string;
  date: string;
  status: string;
  amount: number;
}

interface TrendRow {
  date: string;
  appointments: number;
  completed: number;
  patients: number;
  ekaRevenue: number;
  zohoReceipts: number;
}

interface MonthlyRow {
  month: string;
  label: string;
  appointments: number;
  completed: number;
  patients: number;
  zohoReceipts: number;
  completionRate: number;
}

interface DashboardResponse {
  startDate: string;
  endDate: string;
  warnings: string[];
  chartBucket?: 'daily' | 'weekly' | 'monthly';
  totals: DashboardTotals;
  clinics: ClinicRow[];
  doctors: DoctorRow[];
  specialties: SpecialtyRow[];
  receipts: ReceiptRow[];
  monthly: MonthlyRow[];
  trend: TrendRow[];
}

interface AssignedClinic {
  id: string;
  name: string;
}

const appointmentChartConfig = {
  appointments: { label: 'Appointments', color: '#0bb8fc' },
} satisfies ChartConfig;

const monthlyChartConfig = {
  zohoReceipts: { label: 'Receipts', color: '#fe065c' },
} satisfies ChartConfig;

const departmentChartConfig = {
  appointments: { label: 'Visits' },
} satisfies ChartConfig;

const departmentColors = ['#fe065c', '#0bb8fc', '#14b8a6', '#f59e0b', '#8b5cf6', '#22c55e', '#64748b'];

type PeriodPreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

const periodOptions: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

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

function startOfWeek(date: string) {
  const current = new Date(`${date}T00:00:00Z`);
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() - day + 1);
  return current.toISOString().slice(0, 10);
}

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function endOfMonth(date: string) {
  const next = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}

function addMonths(date: string, months: number) {
  const next = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
}

function chartRangeForPreset(preset: PeriodPreset, selectedStartDate: string, selectedEndDate: string) {
  const today = todayDate();
  if (preset === 'today' || preset === 'yesterday') {
    return { chartStartDate: startOfMonth(selectedStartDate), chartEndDate: selectedEndDate, chartBucket: 'daily' as const };
  }
  if (preset === 'thisWeek' || preset === 'lastWeek') {
    return { chartStartDate: startOfMonth(today), chartEndDate: today, chartBucket: 'weekly' as const };
  }
  if (preset === 'thisMonth' || preset === 'lastMonth') {
    return { chartStartDate: `${today.slice(0, 4)}-01-01`, chartEndDate: today, chartBucket: 'monthly' as const };
  }
  return { chartStartDate: selectedStartDate, chartEndDate: selectedEndDate, chartBucket: 'daily' as const };
}

function rangeForPreset(preset: PeriodPreset) {
  const today = todayDate();
  if (preset === 'today') return { startDate: today, endDate: today };
  if (preset === 'yesterday') {
    const yesterday = addDays(today, -1);
    return { startDate: yesterday, endDate: yesterday };
  }
  if (preset === 'thisWeek') return { startDate: startOfWeek(today), endDate: today };
  if (preset === 'lastWeek') {
    const start = addDays(startOfWeek(today), -7);
    return { startDate: start, endDate: addDays(start, 6) };
  }
  if (preset === 'thisMonth') return { startDate: startOfMonth(today), endDate: today };
  if (preset === 'lastMonth') {
    const start = addMonths(today, -1);
    return { startDate: start, endDate: endOfMonth(start) };
  }
  if (preset === 'thisYear') return { startDate: `${today.slice(0, 4)}-01-01`, endDate: today };
  return { startDate: addDays(today, -29), endDate: today };
}

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatDate(value: string) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(
    new Date(`${value}T00:00:00`)
  );
}

function formatPercent(numerator: number, denominator: number) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : '0%';
}

export default function StaffFranchiseDashboardPage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [isFranchiseOwner, setIsFranchiseOwner] = useState(false);
  const [authSource, setAuthSource] = useState<'staff' | 'franchise' | ''>('');
  const [staffName, setStaffName] = useState('');
  const [assignedClinics, setAssignedClinics] = useState<AssignedClinic[]>([]);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('thisMonth');
  const [startDate, setStartDate] = useState(() => rangeForPreset('thisMonth').startDate);
  const [endDate, setEndDate] = useState(() => rangeForPreset('thisMonth').endDate);
  const [clinicId, setClinicId] = useState('all');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptPage, setReceiptPage] = useState(1);
  const [specialtyPage, setSpecialtyPage] = useState(1);
  const [doctorPage, setDoctorPage] = useState(1);
  const [receiptsPerPage, setReceiptsPerPage] = useState(25);
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const receiptsHeaderRef = useRef<HTMLDivElement | null>(null);
  const receiptsFooterRef = useRef<HTMLDivElement | null>(null);
  const receiptRowRef = useRef<HTMLTableRowElement | null>(null);

  const clinicOptions = useMemo(
    () => dashboard?.clinics.map((clinic) => ({ id: clinic.id, name: clinic.name })) || [],
    [dashboard]
  );
  const chartLabel = dashboard?.chartBucket === 'weekly' ? 'weekly' : dashboard?.chartBucket === 'monthly' ? 'monthly' : 'daily';
  const receiptPageCount = Math.max(1, Math.ceil((dashboard?.receipts.length || 0) / receiptsPerPage));
  const cardPageSize = 5;
  const specialtyPageCount = Math.max(1, Math.ceil((dashboard?.specialties.length || 0) / cardPageSize));
  const doctorPageCount = Math.max(1, Math.ceil((dashboard?.doctors.length || 0) / cardPageSize));
  const paginatedReceipts = useMemo(
    () => (dashboard?.receipts || []).slice((receiptPage - 1) * receiptsPerPage, receiptPage * receiptsPerPage),
    [dashboard?.receipts, receiptPage, receiptsPerPage]
  );
  const paginatedSpecialties = useMemo(
    () => (dashboard?.specialties || []).slice((specialtyPage - 1) * cardPageSize, specialtyPage * cardPageSize),
    [dashboard?.specialties, specialtyPage]
  );
  const paginatedDoctors = useMemo(
    () => (dashboard?.doctors || []).slice((doctorPage - 1) * cardPageSize, doctorPage * cardPageSize),
    [dashboard?.doctors, doctorPage]
  );
  const busiestWeekdays = useMemo(() => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => ({
      label,
      index,
      appointments: 0,
      completed: 0,
    }));
    (dashboard?.trend || []).forEach((day) => {
      const date = new Date(`${day.date}T00:00:00`);
      const weekday = weekdays[date.getDay()];
      if (!weekday) return;
      weekday.appointments += day.appointments;
      weekday.completed += day.completed;
    });
    return weekdays
      .filter((day) => day.appointments > 0)
      .sort((a, b) => b.appointments - a.appointments || a.index - b.index);
  }, [dashboard]);
  const departmentFootfall = useMemo(() => {
    const total = dashboard?.specialties.reduce((sum, specialty) => sum + specialty.appointments, 0) || 0;
    return (dashboard?.specialties || []).map((specialty, index) => ({
      ...specialty,
      fill: departmentColors[index % departmentColors.length],
      percentage: total ? Math.round((specialty.appointments / total) * 100) : 0,
    }));
  }, [dashboard?.specialties]);
  const footfallTotal = departmentFootfall.reduce((sum, department) => sum + department.appointments, 0);
  const topDepartment = departmentFootfall[0];

  const loadSession = async () => {
    try {
      const franchiseResponse = await fetch('/api/franchise/session', { headers: { Accept: 'application/json' } });
      const franchiseBody = await franchiseResponse.json().catch(() => null);
      if (franchiseResponse.ok && franchiseBody?.authenticated) {
        setIsAuthenticated(true);
        setIsFranchiseOwner(true);
        setIsStaffAdmin(false);
        setAuthSource('franchise');
        setStaffName(franchiseBody.owner?.name || franchiseBody.owner?.mobile || '');
        setAssignedClinics(Array.isArray(franchiseBody.owner?.assignedClinics) ? franchiseBody.owner.assignedClinics : []);
        return;
      }

      const staffResponse = await fetch('/api/staff/session', { headers: { Accept: 'application/json' } });
      const staffBody = await staffResponse.json().catch(() => null);
      setIsAuthenticated(staffResponse.ok && Boolean(staffBody?.authenticated));
      setIsStaffAdmin(Boolean(staffBody?.staff?.isAdmin));
      setIsFranchiseOwner(false);
      setAuthSource(staffBody?.authenticated ? 'staff' : '');
      setStaffName(staffBody?.staff?.name || staffBody?.staff?.mobile || '');
      setAssignedClinics([]);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({ startDate, endDate });
      const chartRange = chartRangeForPreset(periodPreset, startDate, endDate);
      query.set('chartStartDate', chartRange.chartStartDate);
      query.set('chartEndDate', chartRange.chartEndDate);
      query.set('chartBucket', chartRange.chartBucket);
      if (clinicId !== 'all') query.set('clinicId', clinicId);
      const response = await fetch(`/api/staff/franchise-dashboard?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load franchise dashboard.');
      setDashboard(body);
      setReceiptPage(1);
      setSpecialtyPage(1);
      setDoctorPage(1);
      if (Array.isArray(body?.warnings)) {
        body.warnings.forEach((warning: string) => toast.warning(warning));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load franchise dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const changePeriodPreset = (value: PeriodPreset) => {
    setPeriodPreset(value);
    if (value === 'custom') return;
    const range = rangeForPreset(value);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const logout = async () => {
    await fetch(authSource === 'franchise' ? '/api/franchise/logout' : '/api/staff/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setIsStaffAdmin(false);
    setIsFranchiseOwner(false);
    setAuthSource('');
    setAssignedClinics([]);
    setDashboard(null);
  };

  const sendOtp = async () => {
    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      toast.error('Enter a valid Franchise Owner mobile number.');
      return;
    }
    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/franchise/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setMobile(normalizedMobile);
      setIsOtpSent(true);
      toast.success('OTP sent to Franchise Owner mobile.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const normalizedMobile = mobile.replace(/\D/g, '').slice(-10);
    const normalizedOtp = otp.replace(/\D/g, '').slice(0, 8);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile) || !/^\d{4,8}$/.test(normalizedOtp)) {
      toast.error('Enter the Franchise Owner mobile number and OTP.');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const response = await fetch('/api/franchise/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: normalizedMobile, otp: normalizedOtp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setIsAuthenticated(true);
      setIsFranchiseOwner(true);
      setIsStaffAdmin(false);
      setAuthSource('franchise');
      setStaffName(body?.owner?.name || body?.owner?.mobile || normalizedMobile);
      setAssignedClinics(Array.isArray(body?.owner?.assignedClinics) ? body.owner.assignedClinics : []);
      toast.success('Franchise Owner signed in.');
      await loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated && (isStaffAdmin || isFranchiseOwner)) void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isStaffAdmin, isFranchiseOwner]);

  useEffect(() => {
    if (clinicId !== 'all' && clinicOptions.length && !clinicOptions.some((clinic) => clinic.id === clinicId)) {
      setClinicId('all');
    }
  }, [clinicId, clinicOptions]);

  useEffect(() => {
    if (!isFranchiseOwner || !assignedClinics.length) return;
    setClinicId((current) =>
      current === 'all' || assignedClinics.some((clinic) => clinic.id === current) ? current : 'all'
    );
  }, [assignedClinics, isFranchiseOwner]);

  useEffect(() => {
    setReceiptPage((page) => Math.min(page, receiptPageCount));
  }, [receiptPageCount]);

  useEffect(() => {
    setSpecialtyPage((page) => Math.min(page, specialtyPageCount));
  }, [specialtyPageCount]);

  useEffect(() => {
    setDoctorPage((page) => Math.min(page, doctorPageCount));
  }, [doctorPageCount]);

  useEffect(() => {
    const updateReceiptPageSize = () => {
      if (!leftColumnRef.current) return;
      const viewportWidth = window.innerWidth;
      if (viewportWidth < 640) {
        setReceiptsPerPage(5);
        return;
      }
      const leftHeight = leftColumnRef.current.getBoundingClientRect().height;
      const headerHeight = receiptsHeaderRef.current?.getBoundingClientRect().height || 80;
      const footerHeight = receiptsFooterRef.current?.getBoundingClientRect().height || 0;
      const rowHeight = receiptRowRef.current?.getBoundingClientRect().height || 84;
      const tableHeaderHeight = 48;
      const availableHeight = leftHeight - headerHeight - footerHeight - tableHeaderHeight - 12;
      setReceiptsPerPage(Math.max(5, Math.floor(availableHeight / rowHeight)));
    };

    updateReceiptPageSize();
    window.addEventListener('resize', updateReceiptPageSize);
    return () => window.removeEventListener('resize', updateReceiptPageSize);
  }, [dashboard?.doctors.length, dashboard?.specialties.length, dashboard?.receipts.length]);

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
          <CardContent className="p-6">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-center text-2xl font-bold">Franchise Owner login</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter the mobile number registered to access the Franchise dashboard.
            </p>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="franchise-mobile">Mobile number</Label>
                <Input
                  id="franchise-mobile"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(-10))}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                />
              </div>
              {isOtpSent && (
                <div className="space-y-2">
                  <Label htmlFor="franchise-otp">OTP</Label>
                  <Input
                    id="franchise-otp"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="Enter OTP"
                    autoComplete="one-time-code"
                  />
                </div>
              )}
            </div>
            <Button
              className="mt-5 w-full rounded-full"
              disabled={isSendingOtp || isVerifyingOtp}
              onClick={() => (isOtpSent ? void verifyOtp() : void sendOtp())}
            >
              {(isSendingOtp || isVerifyingOtp) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isOtpSent ? 'Verify OTP' : 'Send OTP'}
            </Button>
            {isOtpSent && (
              <Button
                variant="ghost"
                className="mt-2 w-full rounded-full"
                disabled={isSendingOtp || isVerifyingOtp}
                onClick={() => void sendOtp()}
              >
                Resend OTP
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isStaffAdmin && !isFranchiseOwner) {
    return (
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <h1 className="text-2xl font-bold">Franchise access required</h1>
            <p className="mt-2 text-muted-foreground">
              This page is available only for registered Franchise Owners.
            </p>
            <Button className="mt-5 rounded-full" onClick={() => void logout()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main id="dashboard-top" className="min-h-screen scroll-mt-32 bg-slate-50/70 pb-24 sm:pb-0">
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="h-10 w-auto sm:h-12" />
            <Button variant="outline" size="sm" className="shrink-0 rounded-full bg-white sm:h-10 sm:px-4" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 sm:mb-6 sm:flex-wrap sm:items-center sm:overflow-visible sm:pb-0">
            {isStaffAdmin && (
              <>
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full bg-white sm:h-10 sm:px-4">
                  <Link to="/staff">
                    <IdCard className="mr-2 h-4 w-4" />
                    Cards
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full bg-white sm:h-10 sm:px-4">
                  <Link to="/staff/leads">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Leads
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full bg-white sm:h-10 sm:px-4">
                  <Link to="/staff/doctor-payout">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Doctor Payout
                  </Link>
                </Button>
              </>
            )}
            <Button size="sm" className="shrink-0 rounded-full sm:h-10 sm:px-4">
              <LineChart className="mr-2 h-4 w-4" />
              Franchise Dashboard
            </Button>
            <nav className="hidden flex-wrap gap-2 sm:flex">
              {[
                { href: '#footfall', label: 'Footfall', icon: PieChartIcon },
                { href: '#trends', label: 'Trends', icon: LineChart },
                { href: '#busiest-days', label: 'Busiest Days', icon: CalendarDays },
                { href: '#clinic-performance', label: 'Clinic Performance', icon: Activity },
                { href: '#doctor-stats', label: 'Doctor Stats', icon: Stethoscope },
                { href: '#receipts', label: 'Receipts', icon: FileText },
              ].map((item) => (
                <Button key={item.href} asChild variant="outline" size="sm" className="shrink-0 rounded-full bg-white sm:h-10 sm:px-4">
                  <a href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </a>
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <section className="border-b bg-white">
        <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <Activity className="h-4 w-4" />
              Franchise operations
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">Franchise dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
              Appointments, patients, doctors, and receipts across assigned clinics.
              {staffName ? ` Signed in as ${staffName}.` : ''}
            </p>
            {isFranchiseOwner && assignedClinics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedClinics.map((clinic) => (
                  <Badge key={`${clinic.id}-${clinic.name}`} variant="secondary" className="rounded-full">
                    Assigned clinic: {clinic.name || clinic.id}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <Card className="mb-4 shadow-sm sm:mb-6">
          <CardContent className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:p-5">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:h-11"
              value={periodPreset}
              onChange={(event) => changePeriodPreset(event.target.value as PeriodPreset)}
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:h-11"
              value={startDate}
              disabled={periodPreset !== 'custom'}
              onChange={(event) => {
                setPeriodPreset('custom');
                setStartDate(event.target.value);
              }}
            />
            <input
              type="date"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:h-11"
              value={endDate}
              disabled={periodPreset !== 'custom'}
              onChange={(event) => {
                setPeriodPreset('custom');
                setEndDate(event.target.value);
              }}
            />
            {isStaffAdmin ? (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:h-11"
                value={clinicId}
                onChange={(event) => setClinicId(event.target.value)}
              >
                <option value="all">All clinics</option>
                {clinicOptions.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            ) : assignedClinics.length > 1 ? (
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:h-11"
                value={clinicId}
                onChange={(event) => setClinicId(event.target.value)}
              >
                <option value="all">All assigned clinics</option>
                {assignedClinics.map((clinic) => (
                  <option key={`${clinic.id}-${clinic.name}`} value={clinic.id}>
                    {clinic.name || clinic.id}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex min-h-10 items-center rounded-md border border-input bg-background px-3 text-sm font-semibold sm:min-h-11">
                {assignedClinics.map((clinic) => clinic.name || clinic.id).join(', ') || 'Assigned clinic'}
              </div>
            )}
            <Button className="col-span-2 h-10 rounded-full md:col-span-1 md:h-11" onClick={() => void loadDashboard()} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </CardContent>
        </Card>

        <div className="mb-4 grid auto-rows-[118px] grid-cols-2 gap-3 sm:mb-6 sm:auto-rows-[112px] sm:grid-cols-4 sm:gap-4 xl:grid-cols-6">
          {[
            {
              label: 'Receipts',
              value: formatMoney(dashboard?.totals.zohoReceipts || 0),
              icon: FileText,
              className: 'col-span-2 row-span-1 sm:col-span-2 xl:col-span-2 xl:row-span-2',
              valueClassName: 'text-2xl sm:text-3xl',
            },
            {
              label: 'Appointments',
              value: dashboard?.totals.appointments || 0,
              icon: CalendarDays,
              className: 'col-span-1 row-span-2 sm:col-span-2 sm:row-span-1 xl:col-span-2',
              valueClassName: 'text-3xl',
            },
            {
              label: 'Completion rate',
              value: formatPercent(dashboard?.totals.completed || 0, dashboard?.totals.appointments || 0),
              icon: Activity,
              className: 'col-span-1',
              valueClassName: 'text-2xl',
            },
            {
              label: 'Patients',
              value: dashboard?.totals.patients || 0,
              icon: Users,
              className: 'col-span-1',
              valueClassName: 'text-2xl',
            },
            {
              label: 'New patients',
              value: dashboard?.totals.newPatients || 0,
              icon: Users,
              className: 'col-span-1',
              valueClassName: 'text-2xl',
            },
            {
              label: 'Repeat visits',
              value: dashboard?.totals.repeatVisits || 0,
              icon: RefreshCw,
              className: 'col-span-1',
              valueClassName: 'text-2xl',
            },
            {
              label: 'Active doctors',
              value: dashboard?.totals.doctors || 0,
              icon: Stethoscope,
              className: 'col-span-1 sm:col-span-2 xl:col-span-1',
              valueClassName: 'text-2xl',
            },
            {
              label: 'Cancelled',
              value: dashboard?.totals.cancelled || 0,
              icon: CreditCard,
              className: 'col-span-1',
              valueClassName: 'text-2xl',
            },
          ].map((item) => (
            <Card key={item.label} className={`min-w-0 overflow-hidden shadow-sm ${item.className}`}>
              <CardContent className="grid h-full min-w-0 grid-rows-[auto_1fr] gap-3 p-3 sm:p-4">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className="min-w-0 pt-1 text-sm leading-snug text-muted-foreground sm:text-sm">{item.label}</p>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex min-h-0 items-end">
                  <p className={`min-w-0 break-words font-bold leading-none ${item.valueClassName}`}>{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card id="footfall" className="mb-4 scroll-mt-32 overflow-hidden shadow-sm sm:mb-6 sm:scroll-mt-36">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Footfall</h2>
                <p className="text-sm text-muted-foreground">Department-wise visit mix for the selected period.</p>
              </div>
              <Badge variant="secondary" className="w-fit rounded-full">
                {formatNumber(footfallTotal)} visits
              </Badge>
            </div>
            {departmentFootfall.length ? (
              <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">Total footfall</p>
                    <p className="mt-2 text-3xl font-bold leading-none">{formatNumber(footfallTotal)}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">Top department</p>
                    <p className="mt-2 text-xl font-bold leading-tight">{topDepartment?.name || '-'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{topDepartment?.percentage || 0}% of visits</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">Departments</p>
                    <p className="mt-2 text-3xl font-bold leading-none">{departmentFootfall.length}</p>
                  </div>
                  <div className="min-w-0 rounded-lg border bg-white p-4 sm:col-span-3">
                    <ChartContainer config={departmentChartConfig} className="h-[250px] min-w-0 max-w-full">
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name, item) => (
                                <div className="flex min-w-[9rem] items-center justify-between gap-3">
                                  <span className="text-muted-foreground">{String(name)}</span>
                                  <span className="font-semibold">{formatNumber(Number(value))} visits</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={departmentFootfall}
                          dataKey="appointments"
                          nameKey="name"
                          innerRadius={54}
                          outerRadius={92}
                          paddingAngle={2}
                        >
                          {departmentFootfall.map((department) => (
                            <Cell key={department.id} fill={department.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                </div>
                <div className="space-y-3">
                  {departmentFootfall.slice(0, 7).map((department) => (
                    <div key={department.id} className="rounded-lg border bg-white p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold leading-tight">{department.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {department.patients} patients · {department.doctors} doctors
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold">{formatNumber(department.appointments)}</p>
                          <p className="text-xs text-muted-foreground">{department.percentage}%</p>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                        <div className="h-full rounded-full" style={{ width: `${department.percentage}%`, backgroundColor: department.fill }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                No department footfall found for this period.
              </p>
            )}
          </CardContent>
        </Card>

        <div id="trends" className="mb-4 grid min-w-0 scroll-mt-32 gap-4 sm:mb-6 sm:scroll-mt-36 xl:grid-cols-2 xl:gap-6">
          <Card className="min-w-0 overflow-hidden shadow-sm">
            <CardContent className="min-w-0 p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold sm:mb-4 sm:text-xl">{chartLabel[0].toUpperCase() + chartLabel.slice(1)} receipts</h2>
              <ChartContainer config={monthlyChartConfig} className="h-[220px] min-w-0 max-w-full overflow-hidden sm:h-[280px]">
                <BarChart data={dashboard?.monthly || []} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="zohoReceipts" fill="var(--color-zohoReceipts)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden shadow-sm">
            <CardContent className="min-w-0 p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold sm:mb-4 sm:text-xl">{chartLabel[0].toUpperCase() + chartLabel.slice(1)} appointment trend</h2>
              <ChartContainer config={appointmentChartConfig} className="h-[220px] min-w-0 max-w-full overflow-hidden sm:h-[280px]">
                <BarChart data={dashboard?.monthly || []} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="appointments" fill="var(--color-appointments)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card id="busiest-days" className="mb-4 scroll-mt-32 shadow-sm sm:mb-6 sm:scroll-mt-36">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold sm:text-xl">Busiest weekdays</h2>
              <Badge variant="secondary" className="rounded-full">
                Selected period
              </Badge>
            </div>
            {busiestWeekdays.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {busiestWeekdays.map((day, index) => (
                  <div key={day.label} className="rounded-lg border bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="font-semibold">{day.label}</p>
                      <Badge className="rounded-full">#{index + 1}</Badge>
                    </div>
                    <p className="text-3xl font-bold leading-none">{day.appointments}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {day.completed} completed
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                No appointment activity found for weekdays in this period.
              </p>
            )}
          </CardContent>
        </Card>

        <Card id="clinic-performance" className="mb-4 scroll-mt-32 shadow-sm sm:mb-6 sm:scroll-mt-36">
          <CardContent className="p-0">
            <div className="border-b p-4 sm:p-5">
              <h2 className="text-lg font-bold sm:text-xl">Clinic performance</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic</TableHead>
                    <TableHead className="text-right">Appointments</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Patients</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Doctors</TableHead>
                    <TableHead className="text-right">Receipts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.clinics || []).map((clinic) => (
                    <TableRow key={clinic.id}>
                      <TableCell>
                        <p className="font-semibold">{clinic.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {clinic.cancelled} cancelled
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{clinic.appointments}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{clinic.patients}</TableCell>
                      <TableCell className="hidden text-right md:table-cell">{clinic.doctors}</TableCell>
                      <TableCell className="text-right">{formatMoney(clinic.zohoReceipts)}</TableCell>
                    </TableRow>
                  ))}
                  {!dashboard?.clinics.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                        {isLoading ? 'Loading dashboard...' : 'No clinic data found for this period.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid w-full min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(300px,0.65fr)_minmax(0,1.35fr)] xl:gap-6">
          <div id="doctor-stats" ref={leftColumnRef} className="min-w-0 scroll-mt-32 space-y-4 sm:scroll-mt-36">
          <Card className={`min-w-0 shadow-sm ${(dashboard?.specialties.length || 0) > cardPageSize ? 'xl:h-[760px]' : ''}`}>
            <CardContent className="flex h-full flex-col p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold sm:mb-4 sm:text-xl">Specialty stats</h2>
              <div className="min-h-0 flex-1 space-y-2 sm:space-y-3">
                {paginatedSpecialties.map((specialty) => (
                  <div key={specialty.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{specialty.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {specialty.patients} patients · {specialty.doctors} doctors
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-bold">{specialty.appointments} visits</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{specialty.completionRate}% completion</span>
                      <span>{specialty.completed} completed</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-primary" style={{ width: `${specialty.completionRate}%` }} />
                    </div>
                  </div>
                ))}
                {!dashboard?.specialties?.length && (
                  <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    No specialty activity found for this period.
                  </p>
                )}
              </div>
              {(dashboard?.specialties.length || 0) > cardPageSize && (
                <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-sm text-muted-foreground">
                  <span>Page {specialtyPage} of {specialtyPageCount}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" disabled={specialtyPage <= 1} onClick={() => setSpecialtyPage((page) => Math.max(1, page - 1))}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" disabled={specialtyPage >= specialtyPageCount} onClick={() => setSpecialtyPage((page) => Math.min(specialtyPageCount, page + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`min-w-0 shadow-sm ${(dashboard?.doctors.length || 0) > cardPageSize ? 'xl:h-[760px]' : ''}`}>
            <CardContent className="flex h-full flex-col p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold sm:mb-4 sm:text-xl">Doctor performance</h2>
              <div className="min-h-0 flex-1 space-y-2 sm:space-y-3">
                {paginatedDoctors.map((doctor) => (
                  <div key={doctor.id} className="rounded-lg border bg-white p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{doctor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.patients} patients · {doctor.completionRate}% completion
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-bold sm:text-base">{doctor.appointments} visits</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-primary" style={{ width: `${doctor.completionRate}%` }} />
                    </div>
                  </div>
                ))}
                {!dashboard?.doctors.length && (
                  <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    No doctor activity found for this period.
                  </p>
                )}
              </div>
              {(dashboard?.doctors.length || 0) > cardPageSize && (
                <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-sm text-muted-foreground">
                  <span>Page {doctorPage} of {doctorPageCount}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" disabled={doctorPage <= 1} onClick={() => setDoctorPage((page) => Math.max(1, page - 1))}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" disabled={doctorPage >= doctorPageCount} onClick={() => setDoctorPage((page) => Math.min(doctorPageCount, page + 1))}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          <Card id="receipts" className="flex min-w-0 scroll-mt-32 flex-col shadow-sm sm:scroll-mt-36">
            <CardContent className="flex h-full flex-col p-0">
              <div ref={receiptsHeaderRef} className="border-b p-4 sm:p-5">
                <h2 className="text-lg font-bold sm:text-xl">Recent receipts</h2>
              </div>
              <div className="space-y-3 p-3 sm:hidden">
                {paginatedReceipts.map((receipt) => (
                  <div key={receipt.id} className="rounded-lg border bg-white p-3">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{receipt.receiptNumber}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(receipt.date)}</p>
                      </div>
                      <p className="shrink-0 text-right font-bold">{formatMoney(receipt.amount)}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-muted-foreground">Patient</span>
                        <span className="min-w-0 text-right font-medium">{receipt.patientName}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="shrink-0 text-muted-foreground">Doctor</span>
                        <span className="min-w-0 text-right">{receipt.doctorName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="shrink-0 text-muted-foreground">Clinic</span>
                        <span className="min-w-0 text-right">{receipt.clinic}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="shrink-0 text-muted-foreground">Status</span>
                        <Badge variant="secondary" className="shrink-0">{receipt.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {!dashboard?.receipts.length && (
                  <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    No receipts found for this period.
                  </p>
                )}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead className="hidden sm:table-cell">Patient</TableHead>
                      <TableHead className="hidden lg:table-cell">Doctor</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReceipts.map((receipt, index) => (
                      <TableRow key={receipt.id} ref={index === 0 ? receiptRowRef : undefined}>
                        <TableCell>
                          <p className="font-semibold">{receipt.receiptNumber}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(receipt.date)} · {receipt.clinic}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{receipt.patientName}</TableCell>
                        <TableCell className="hidden lg:table-cell">{receipt.doctorName}</TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="secondary">{receipt.status}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(receipt.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {!dashboard?.receipts.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                          No receipts found for this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div
                ref={receiptsFooterRef}
                className={`mt-auto flex items-center justify-between gap-3 border-t p-3 text-sm text-muted-foreground sm:px-5 ${
                  (dashboard?.receipts.length || 0) > receiptsPerPage ? '' : 'hidden'
                }`}
              >
                  <span>
                    Page {receiptPage} of {receiptPageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={receiptPage <= 1}
                      onClick={() => setReceiptPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={receiptPage >= receiptPageCount}
                      onClick={() => setReceiptPage((page) => Math.min(receiptPageCount, page + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-6 gap-1">
          {[
            { href: '#dashboard-top', label: 'Dashboard', icon: Activity },
            { href: '#footfall', label: 'Footfall', icon: PieChartIcon },
            { href: '#trends', label: 'Trends', icon: LineChart },
            { href: '#clinic-performance', label: 'Performance', icon: CalendarDays },
            { href: '#doctor-stats', label: 'Doctors', icon: Stethoscope },
            { href: '#receipts', label: 'Receipts', icon: FileText },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[11px] font-semibold leading-none text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </main>
  );
}
