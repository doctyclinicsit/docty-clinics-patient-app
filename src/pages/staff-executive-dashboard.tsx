import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Copy,
  Database,
  FileSpreadsheet,
  Filter,
  Loader2,
  Lock,
  MessageCircle,
  RefreshCw,
  Send,
  Share2,
  ShoppingCart,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart as RechartsLineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ExecutiveTotals {
  revenue: number;
  footfall: number;
  pharmacyRevenue: number;
  clinicRevenue: number;
  activeDays: number;
  categories: number;
  averageRevenuePerFootfall: number;
  averageDailyRevenue: number;
}

interface MonthlyRow {
  month: string;
  label: string;
  footfall: number;
  revenue: number;
  pharmacyRevenue: number;
  clinicRevenue: number;
}

interface CategoryRow {
  category: string;
  footfall: number;
  revenue: number;
  activeDays: number;
  averageRevenuePerFootfall: number;
}

interface DailyRow {
  date: string;
  day: string;
  footfall: number;
  revenue: number;
  pharmacyRevenue: number;
  clinicRevenue: number;
}

interface HistoricalRow {
  date: string;
  week: number;
  day: string;
  category: string;
  footfall: number;
  revenue: number;
  source: string;
  location: string;
  totalBill?: number;
  discount?: number;
}

interface LocationRow {
  location: string;
  footfall: number;
  revenue: number;
  totalBill: number;
  discount: number;
  activeDays: number;
  categories: number;
  averageRevenuePerFootfall: number;
}

interface WeekdayRow {
  day: string;
  footfall: number;
  revenue: number;
}

interface PharmacyBreakdownRow {
  gstPercentage?: string;
  medicine?: string;
  revenue: number;
  lineItems: number;
}

interface PharmacyDashboard {
  source: string;
  location: string;
  note: string;
  totals: {
    revenue: number;
    bills: number;
    lineItems: number;
    activeDays: number;
    locations: number;
    averageBillValue: number;
    allHistoricalPharmacyRevenue: number;
  };
  locations: Array<{
    location: string;
    source: string;
    revenue: number;
    bills: number;
    lineItems: number;
    averageBillValue: number;
    activeDays: number;
  }>;
  daily: Array<HistoricalRow & { lineItems: number }>;
  gstBreakdown: PharmacyBreakdownRow[];
  topMedicines: PharmacyBreakdownRow[];
}

interface ProfitLossMonthlyRow {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  expenseRatio: number;
}

interface ExpenseCategoryRow {
  category: string;
  amount: number;
  transactions: number;
  share: number;
}

interface ExpenseRow {
  date: string;
  month: string;
  expense: string;
  category: string;
  amount: number;
  location: string;
  source: string;
}

interface ProfitLossDashboard {
  totals: {
    revenue: number;
    expenses: number;
    netProfit: number;
    profitMargin: number;
    expenseRatio: number;
    expenseTransactions: number;
  };
  monthly: ProfitLossMonthlyRow[];
  expensesByCategory: ExpenseCategoryRow[];
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    footfall: number;
    share: number;
    averageRevenuePerFootfall: number;
  }>;
  expenses: ExpenseRow[];
  recentExpenses: ExpenseRow[];
}

interface DashboardResponse {
  startDate: string;
  endDate: string;
  source: {
    sources: string[];
    firstDate: string;
    lastDate: string;
  };
  warnings: string[];
  categories: string[];
  locations: string[];
  totals: ExecutiveTotals;
  revenueCards: {
    totalRevenue: number;
    clinicRevenue: number;
    pharmacyRevenue: number;
  };
  monthly: MonthlyRow[];
  categoriesSummary: CategoryRow[];
  locationsSummary: LocationRow[];
  weekdays: WeekdayRow[];
  profitLoss: ProfitLossDashboard;
  pharmacy: PharmacyDashboard;
  daily: DailyRow[];
  rows: HistoricalRow[];
  share?: {
    shareToken: string;
    shareCode?: string;
    shareCodeExpiresAt?: string;
    updatedBy?: string;
    updatedAt?: string;
  };
}

const revenueChartConfig = {
  revenue: { label: 'Revenue', color: '#fe065c' },
  clinicRevenue: { label: 'Clinic revenue', color: '#0bb8fc' },
  pharmacyRevenue: { label: 'Pharmacy revenue', color: '#14b8a6' },
} satisfies ChartConfig;

const footfallChartConfig = {
  averageDailyFootfall: { label: 'Avg. daily footfall', color: '#0bb8fc' },
} satisfies ChartConfig;

const averageRevenueChartConfig = {
  averageRevenuePerFootfall: { label: 'Avg. revenue / footfall', color: '#f59e0b' },
} satisfies ChartConfig;

const profitLossChartConfig = {
  revenue: { label: 'Revenue', color: '#14b8a6' },
  expenses: { label: 'Expenses', color: '#fe065c' },
  netProfit: { label: 'Net profit', color: '#0bb8fc' },
} satisfies ChartConfig;

const profitLossRatioChartConfig = {
  profitMarginPercent: { label: 'Profit margin', color: '#14b8a6' },
  expenseRatioPercent: { label: 'Expense ratio', color: '#fe065c' },
} satisfies ChartConfig;

const pharmacyChartConfig = {
  revenue: { label: 'Revenue', color: '#14b8a6' },
  lineItems: { label: 'Line items', color: '#fe065c' },
} satisfies ChartConfig;

const pieChartConfig = {
  revenue: { label: 'Revenue' },
} satisfies ChartConfig;

const pieColors = ['#fe065c', '#0bb8fc', '#14b8a6', '#f59e0b', '#8b5cf6', '#22c55e', '#64748b', '#ec4899'];
const dataStartDate = '2025-09-01';
const dataEndDate = '2026-06-30';
const opexDetailPageSize = 12;

type DatePresetKey = 'till-date' | 'this-month' | 'last-month' | 'this-quarter' | 'last-quarter' | 'this-year' | 'last-year';

const datePresets: Array<{ key: DatePresetKey; label: string }> = [
  { key: 'till-date', label: 'Till Date' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
  { key: 'this-quarter', label: 'This Quarter' },
  { key: 'last-quarter', label: 'Last Quarter' },
  { key: 'this-year', label: 'This Year' },
  { key: 'last-year', label: 'Last Year' },
];

const compareQuestions = [
  'Compare month-on-month growth between clinics.',
  'Which clinic is improving faster month-on-month?',
  'Which clinic has better pharmacy contribution by month?',
  'Where should we focus next month by clinic?',
];

function formatMoney(value: number) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString('en-IN');
}

function formatPercent(value: number) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatDate(value: string) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`)
  );
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(
    new Date(`${value}-01T00:00:00Z`)
  );
}

function formatCompactDate(value: string) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`));
}

function dateDiffDays(start: string, end: string) {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  return Math.max(1, Math.round((endTime - startTime) / 86400000) + 1);
}

function weekStartDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return formatIsoDate(date);
}

function defaultStartDate() {
  return dataStartDate;
}

function defaultEndDate() {
  return dataEndDate;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatePresetRange(key: DatePresetKey, dataWindow: { firstDate?: string; lastDate?: string }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;

  if (key === 'till-date') {
    return {
      startDate: dataWindow.firstDate || dataStartDate,
      endDate: dataWindow.lastDate || dataEndDate,
    };
  }

  if (key === 'this-month') {
    return {
      startDate: formatIsoDate(new Date(year, month, 1)),
      endDate: formatIsoDate(today),
    };
  }

  if (key === 'last-month') {
    return {
      startDate: formatIsoDate(new Date(year, month - 1, 1)),
      endDate: formatIsoDate(new Date(year, month, 0)),
    };
  }

  if (key === 'this-quarter') {
    return {
      startDate: formatIsoDate(new Date(year, quarterStartMonth, 1)),
      endDate: formatIsoDate(today),
    };
  }

  if (key === 'last-quarter') {
    return {
      startDate: formatIsoDate(new Date(year, quarterStartMonth - 3, 1)),
      endDate: formatIsoDate(new Date(year, quarterStartMonth, 0)),
    };
  }

  if (key === 'this-year') {
    return {
      startDate: formatIsoDate(new Date(year, 0, 1)),
      endDate: formatIsoDate(today),
    };
  }

  return {
    startDate: formatIsoDate(new Date(year - 1, 0, 1)),
    endDate: formatIsoDate(new Date(year - 1, 11, 31)),
  };
}

export default function StaffExecutiveDashboardPage() {
  const { shareToken } = useParams();
  const isSharedInvestorView = Boolean(shareToken);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [activeDatePreset, setActiveDatePreset] = useState<DatePresetKey | 'custom'>('till-date');
  const [profitLossDrilldown, setProfitLossDrilldown] = useState<'monthly' | 'expenses' | 'revenue' | 'opex'>('monthly');
  const [assistantQuestion, setAssistantQuestion] = useState('Compare month-on-month growth between clinics.');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareAccessCode, setShareAccessCode] = useState('');
  const [isShareUnlocked, setIsShareUnlocked] = useState(!isSharedInvestorView);
  const [opexCategoryFilter, setOpexCategoryFilter] = useState('all');
  const [opexDetailPage, setOpexDetailPage] = useState(1);

  const shareAccessStorageKey = shareToken ? `executive-dashboard-share-code:${shareToken}` : '';
  const dashboardShareUrl =
    typeof window !== 'undefined' && dashboard?.share?.shareToken
      ? `${window.location.origin}/executive/dashboard/share/${dashboard.share.shareToken}`
      : '';
  const topCategory = dashboard?.categoriesSummary[0];
  const recentRows = useMemo(() => (dashboard?.rows || []).slice(0, 60), [dashboard?.rows]);
  const footfallTrendMode = useMemo<'daily' | 'weekly' | 'monthly'>(() => {
    if (activeDatePreset === 'this-month' || activeDatePreset === 'last-month') return 'daily';
    if (activeDatePreset === 'this-quarter' || activeDatePreset === 'last-quarter') return 'weekly';
    if (activeDatePreset === 'this-year' || activeDatePreset === 'last-year' || activeDatePreset === 'till-date') return 'monthly';
    const rangeDays = dateDiffDays(startDate, endDate);
    if (rangeDays <= 45) return 'daily';
    if (rangeDays <= 150) return 'weekly';
    return 'monthly';
  }, [activeDatePreset, endDate, startDate]);
  const footfallTrend = useMemo(() => {
    const dailyRows = [...(dashboard?.daily || [])].sort((a, b) => a.date.localeCompare(b.date));
    if (footfallTrendMode === 'daily') {
      return {
        badge: 'Daily',
        description: 'Actual daily footfall for the selected period.',
        rows: dailyRows.map((row) => ({
          label: formatCompactDate(row.date),
          date: row.date,
          averageDailyFootfall: row.footfall,
        })),
      };
    }

    const buckets = new Map<string, { label: string; footfall: number; days: Set<string> }>();
    dailyRows.forEach((row) => {
      const key = footfallTrendMode === 'weekly' ? weekStartDate(row.date) : row.date.slice(0, 7);
      const label = footfallTrendMode === 'weekly' ? `Week of ${formatCompactDate(key)}` : monthLabel(key);
      const bucket = buckets.get(key) || { label, footfall: 0, days: new Set<string>() };
      bucket.footfall += row.footfall;
      bucket.days.add(row.date);
      buckets.set(key, bucket);
    });

    return {
      badge: footfallTrendMode === 'weekly' ? 'Weekly avg.' : 'Monthly avg.',
      description:
        footfallTrendMode === 'weekly'
          ? 'Average daily footfall inside each week of the selected period.'
          : 'Average daily footfall inside each month of the selected period.',
      rows: Array.from(buckets.entries()).map(([key, row]) => ({
        label: row.label,
        date: key,
        averageDailyFootfall: row.days.size ? Math.round(row.footfall / row.days.size) : 0,
      })),
    };
  }, [dashboard?.daily, footfallTrendMode]);
  const averageRevenueTrend = useMemo(() => {
    const dailyRows = [...(dashboard?.daily || [])].sort((a, b) => a.date.localeCompare(b.date));
    if (footfallTrendMode === 'daily') {
      return {
        badge: 'Daily',
        description: 'Average revenue per footfall for each day in the selected period.',
        rows: dailyRows.map((row) => ({
          label: formatCompactDate(row.date),
          date: row.date,
          averageRevenuePerFootfall: row.footfall ? Math.round(row.revenue / row.footfall) : 0,
        })),
      };
    }

    const buckets = new Map<string, { label: string; revenue: number; footfall: number }>();
    dailyRows.forEach((row) => {
      const key = footfallTrendMode === 'weekly' ? weekStartDate(row.date) : row.date.slice(0, 7);
      const label = footfallTrendMode === 'weekly' ? `Week of ${formatCompactDate(key)}` : monthLabel(key);
      const bucket = buckets.get(key) || { label, revenue: 0, footfall: 0 };
      bucket.revenue += row.revenue;
      bucket.footfall += row.footfall;
      buckets.set(key, bucket);
    });

    return {
      badge: footfallTrendMode === 'weekly' ? 'Weekly' : 'Monthly',
      description:
        footfallTrendMode === 'weekly'
          ? 'Revenue divided by footfall for each week in the selected period.'
          : 'Revenue divided by footfall for each month in the selected period.',
      rows: Array.from(buckets.entries()).map(([key, row]) => ({
        label: row.label,
        date: key,
        averageRevenuePerFootfall: row.footfall ? Math.round(row.revenue / row.footfall) : 0,
      })),
    };
  }, [dashboard?.daily, footfallTrendMode]);
  const pharmacyCategory = dashboard?.categoriesSummary.find((row) => row.category === 'Pharmacy');
  const clinicCategories = dashboard?.categoriesSummary.filter((row) => row.category !== 'Pharmacy') || [];
  const pharmacyDailyRows = useMemo(() => (dashboard?.pharmacy.daily || []).slice(0, 30).reverse(), [dashboard?.pharmacy.daily]);
  const pharmacyGstPieData = useMemo(
    () =>
      (dashboard?.pharmacy.gstBreakdown || [])
        .filter((row) => row.revenue > 0)
        .map((row) => ({ name: `${row.gstPercentage || 'Unknown'}% GST`, revenue: row.revenue })),
    [dashboard?.pharmacy.gstBreakdown]
  );
  const locationPieData = useMemo(
    () =>
      (dashboard?.locationsSummary || [])
        .filter((row) => row.revenue > 0)
        .map((row) => ({ name: row.location.replace('Docty Clinics ', ''), revenue: row.revenue })),
    [dashboard?.locationsSummary]
  );
  const categoryPieData = useMemo(
    () =>
      (dashboard?.categoriesSummary || [])
        .filter((row) => row.revenue > 0)
        .slice(0, 7)
        .map((row) => ({ name: row.category, revenue: row.revenue })),
    [dashboard?.categoriesSummary]
  );
  const profitLossExpensePieData = useMemo(
    () =>
      (dashboard?.profitLoss.expensesByCategory || [])
        .filter((row) => row.amount > 0)
        .slice(0, 7)
        .map((row) => ({ name: row.category, value: row.amount })),
    [dashboard?.profitLoss.expensesByCategory]
  );
  const profitLossRevenuePieData = useMemo(
    () =>
      (dashboard?.profitLoss.revenueByCategory || [])
        .filter((row) => row.revenue > 0)
        .slice(0, 7)
        .map((row) => ({ name: row.category, value: row.revenue })),
    [dashboard?.profitLoss.revenueByCategory]
  );
  const profitLossMarginTrendRows = useMemo(
    () =>
      (dashboard?.profitLoss.monthly || []).map((row) => ({
        ...row,
        profitMarginPercent: Math.round(row.profitMargin * 100),
        expenseRatioPercent: Math.round(row.expenseRatio * 100),
      })),
    [dashboard?.profitLoss.monthly]
  );
  const opexCategoryOptions = useMemo(
    () => Array.from(new Set((dashboard?.profitLoss.expenses || []).map((row) => row.category))).sort(),
    [dashboard?.profitLoss.expenses]
  );
  const filteredOpexRows = useMemo(
    () =>
      (dashboard?.profitLoss.expenses || []).filter(
        (row) => opexCategoryFilter === 'all' || row.category === opexCategoryFilter
      ),
    [dashboard?.profitLoss.expenses, opexCategoryFilter]
  );
  const opexTotalPages = Math.max(1, Math.ceil(filteredOpexRows.length / opexDetailPageSize));
  const opexCurrentPage = Math.min(opexDetailPage, opexTotalPages);
  const paginatedOpexRows = useMemo(
    () => filteredOpexRows.slice((opexCurrentPage - 1) * opexDetailPageSize, opexCurrentPage * opexDetailPageSize),
    [filteredOpexRows, opexCurrentPage]
  );
  const opexStartRow = filteredOpexRows.length ? (opexCurrentPage - 1) * opexDetailPageSize + 1 : 0;
  const opexEndRow = Math.min(filteredOpexRows.length, opexCurrentPage * opexDetailPageSize);
  const busiestWeekdays = useMemo(() => (dashboard?.weekdays || []).filter((row) => row.footfall > 0), [dashboard?.weekdays]);
  const compareRows = useMemo(() => {
    const rows = dashboard?.rows || [];
    const totalRevenue = (dashboard?.locationsSummary || []).reduce((sum, row) => sum + row.revenue, 0);
    return (dashboard?.locationsSummary || [])
      .map((row) => {
        const locationRows = rows.filter((item) => item.location === row.location);
        const pharmacyRevenue = locationRows
          .filter((item) => item.category === 'Pharmacy')
          .reduce((sum, item) => sum + item.revenue, 0);
        const clinicRevenue = locationRows
          .filter((item) => item.category !== 'Pharmacy')
          .reduce((sum, item) => sum + item.revenue, 0);
        return {
          ...row,
          displayName: row.location.replace('Docty Clinics ', ''),
          revenueShare: totalRevenue ? row.revenue / totalRevenue : 0,
          pharmacyRevenue,
          clinicRevenue,
          pharmacyShare: row.revenue ? pharmacyRevenue / row.revenue : 0,
          clinicShare: row.revenue ? clinicRevenue / row.revenue : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue || a.location.localeCompare(b.location));
  }, [dashboard?.locationsSummary, dashboard?.rows]);
  const compareMonthlyRows = useMemo(
    () =>
      (dashboard?.profitLoss.monthly || []).map((row, index, rows) => {
        const previous = rows[index - 1];
        const revenueChange = previous ? row.revenue - previous.revenue : 0;
        const expenseChange = previous ? row.expenses - previous.expenses : 0;
        const profitChange = previous ? row.netProfit - previous.netProfit : 0;
        return {
          ...row,
          revenueChange,
          expenseChange,
          profitChange,
          revenueGrowth: previous?.revenue ? revenueChange / previous.revenue : 0,
          expenseGrowth: previous?.expenses ? expenseChange / previous.expenses : 0,
        };
      }),
    [dashboard?.profitLoss.monthly]
  );
  const compareClinicMonthlyRows = useMemo(() => {
    const locationNames = compareRows.map((row) => row.location);
    const locationLabels = Object.fromEntries(compareRows.map((row) => [row.location, row.displayName]));
    const months = new Map<
      string,
      {
        month: string;
        label: string;
        totalRevenue: number;
        byLocation: Record<string, { revenue: number; footfall: number; clinicRevenue: number; pharmacyRevenue: number }>;
      }
    >();

    (dashboard?.rows || []).forEach((row) => {
      const month = row.date.slice(0, 7);
      const current = months.get(month) || {
        month,
        label: monthLabel(month),
        totalRevenue: 0,
        byLocation: {},
      };
      const locationRow = current.byLocation[row.location] || { revenue: 0, footfall: 0, clinicRevenue: 0, pharmacyRevenue: 0 };
      locationRow.revenue += row.revenue;
      locationRow.footfall += row.footfall;
      if (row.category === 'Pharmacy') locationRow.pharmacyRevenue += row.revenue;
      else locationRow.clinicRevenue += row.revenue;
      current.byLocation[row.location] = locationRow;
      current.totalRevenue += row.revenue;
      months.set(month, current);
    });

    const rows = Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
    return rows.map((row, index) => {
      const previous = rows[index - 1];
      const values: Record<string, number | string> = {
        month: row.month,
        label: row.label,
        totalRevenue: row.totalRevenue,
      };
      locationNames.forEach((locationName) => {
        const safeName = locationLabels[locationName] || locationName;
        const current = row.byLocation[locationName] || { revenue: 0, footfall: 0, clinicRevenue: 0, pharmacyRevenue: 0 };
        const previousRevenue = previous?.byLocation[locationName]?.revenue || 0;
        values[`${safeName} Revenue`] = current.revenue;
        values[`${safeName} Footfall`] = current.footfall;
        values[`${safeName} Clinic Revenue`] = current.clinicRevenue;
        values[`${safeName} Pharmacy Revenue`] = current.pharmacyRevenue;
        values[`${safeName} MoM Change`] = current.revenue - previousRevenue;
        values[`${safeName} MoM Growth`] = previousRevenue ? (current.revenue - previousRevenue) / previousRevenue : 0;
      });
      return values;
    });
  }, [compareRows, dashboard?.rows]);

  const loadSession = async () => {
    if (isSharedInvestorView) {
      setIsAuthenticated(true);
      setIsStaffAdmin(true);
      setStaffName('Investor view');
      setIsCheckingSession(false);
      return;
    }
    try {
      const response = await fetch('/api/staff/session', { headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null);
      setIsAuthenticated(response.ok && Boolean(body?.authenticated));
      setIsStaffAdmin(Boolean(body?.staff?.isAdmin));
      setStaffName(body?.staff?.name || body?.staff?.mobile || '');
    } finally {
      setIsCheckingSession(false);
    }
  };

  const loadDashboard = async (overrides?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    location?: string;
    shareCode?: string;
  }) => {
    setIsLoading(true);
    try {
      const nextStartDate = overrides?.startDate || startDate;
      const nextEndDate = overrides?.endDate || endDate;
      const nextCategory = overrides?.category || category;
      const nextLocation = overrides?.location || location;
      const nextShareCode = overrides?.shareCode || shareAccessCode;
      const query = new URLSearchParams({ startDate: nextStartDate, endDate: nextEndDate });
      if (nextCategory !== 'all') query.set('category', nextCategory);
      if (nextLocation !== 'all') query.set('location', nextLocation);
      if (shareToken) {
        query.set('shareToken', shareToken);
        if (nextShareCode) query.set('shareCode', nextShareCode);
      }
      const response = await fetch(`/api/executive-dashboard?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (shareToken && response.status === 403) {
          setIsShareUnlocked(false);
          if (shareAccessStorageKey) sessionStorage.removeItem(shareAccessStorageKey);
        }
        throw new Error(body?.message || 'Unable to load executive dashboard.');
      }
      setDashboard(body);
      if (shareToken && nextShareCode) {
        setIsShareUnlocked(true);
        if (shareAccessStorageKey) sessionStorage.setItem(shareAccessStorageKey, nextShareCode);
      }
      if (Array.isArray(body?.warnings)) {
        body.warnings.forEach((warning: string) => toast.warning(warning));
      }
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load executive dashboard.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unlockSharedDashboard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = shareAccessCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Please enter the 6-digit access code.');
      return;
    }
    await loadDashboard({ shareCode: code });
  };

  const copyExecutiveDashboardShare = async (text: string) => {
    if (!navigator.clipboard) {
      toast.error('Clipboard access is not available in this browser.');
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  };

  const generateDashboardShare = async () => {
    if (isSharedInvestorView) return;
    setIsGeneratingShare(true);
    try {
      const response = await fetch('/api/executive-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'share' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to generate private dashboard access code.');
      const shareUrl = `${window.location.origin}/executive/dashboard/share/${body.shareToken}`;
      const shareText = [
        'Docty Executive Dashboard',
        shareUrl,
        `Access code: ${body.shareCode}`,
        `Valid till: ${body.shareCodeExpiresAt ? new Date(body.shareCodeExpiresAt).toLocaleString('en-IN') : '24 hours'}`,
      ].join('\n');
      setDashboard((current) => (current ? { ...current, share: body } : current));
      await copyExecutiveDashboardShare(shareText);
      toast.success('Fresh private dashboard link and access code copied. Valid for 24 hours.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate private dashboard access code.');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const applyDatePreset = (preset: DatePresetKey) => {
    const range = getDatePresetRange(preset, {
      firstDate: dashboard?.source.firstDate,
      lastDate: dashboard?.source.lastDate,
    });
    setActiveDatePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    if (isAuthenticated && isStaffAdmin) void loadDashboard(range);
  };

  const applyRevenueFilter = (nextCategory: 'all' | 'Pharmacy' | 'clinics') => {
    setCategory(nextCategory);
    if (isAuthenticated && isStaffAdmin) void loadDashboard({ category: nextCategory });
  };

  const askDashboardAssistant = async () => {
    const question = assistantQuestion.trim();
    if (!question) {
      toast.error('Please enter a question for the assistant.');
      return;
    }
    if (!dashboard) {
      toast.error('Dashboard data is still loading.');
      return;
    }

    setIsAssistantLoading(true);
    setAssistantAnswer('');
    try {
      const context = {
        selectedRange: { startDate: dashboard.startDate, endDate: dashboard.endDate, category, location },
        totals: dashboard.totals,
        revenueCards: dashboard.revenueCards,
        locations: compareRows,
        clinicMonthOnMonth: compareClinicMonthlyRows,
        consolidatedMonthOnMonth: compareMonthlyRows,
        revenueCategories: dashboard.profitLoss.revenueByCategory.slice(0, 15),
        expenseCategories: dashboard.profitLoss.expensesByCategory.slice(0, 15),
        weekdays: dashboard.weekdays,
        recentRows: dashboard.rows.slice(0, 80),
      };
      const response = await fetch('/api/staff/executive-dashboard-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ question, context, shareToken, shareCode: shareAccessCode }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to ask the assistant.');
      setAssistantAnswer(body?.answer || 'No answer returned.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to ask the assistant.');
    } finally {
      setIsAssistantLoading(false);
    }
  };

  useEffect(() => {
    void loadSession();
  }, [isSharedInvestorView]);

  useEffect(() => {
    if (opexDetailPage > opexTotalPages) setOpexDetailPage(opexTotalPages);
    if (opexCategoryFilter !== 'all' && !opexCategoryOptions.includes(opexCategoryFilter)) {
      setOpexCategoryFilter('all');
      setOpexDetailPage(1);
    }
  }, [opexCategoryFilter, opexCategoryOptions, opexDetailPage, opexTotalPages]);

  useEffect(() => {
    if (!isAuthenticated || !isStaffAdmin) return;
    if (!isSharedInvestorView) {
      void loadDashboard();
      return;
    }
    const savedCode = shareAccessStorageKey ? sessionStorage.getItem(shareAccessStorageKey) || '' : '';
    if (/^\d{6}$/.test(savedCode)) {
      setShareAccessCode(savedCode);
      void loadDashboard({ shareCode: savedCode });
    } else {
      setIsShareUnlocked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isStaffAdmin]);

  if (isCheckingSession) {
    return (
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!isAuthenticated || !isStaffAdmin) {
    return (
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Executive Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please sign in as an admin staff member to view executive reporting.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isSharedInvestorView && !isShareUnlocked) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="p-6">
              <div className="text-center">
                <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold">Investor Access</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the 6-digit secure code to open the Executive Dashboard.
                </p>
              </div>
              <form className="mt-6 space-y-4" onSubmit={unlockSharedDashboard}>
                <div>
                  <Label htmlFor="executive-share-code" className="text-xs font-semibold uppercase text-muted-foreground">
                    Access code
                  </Label>
                  <Input
                    id="executive-share-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={shareAccessCode}
                    onChange={(event) => setShareAccessCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="mt-2 text-center text-lg font-semibold tracking-[0.4em]"
                    autoComplete="one-time-code"
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Unlock Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full">Executive Dashboard</Badge>
                <Badge variant="secondary" className="rounded-full">
                  Historical Data
                </Badge>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Executive Dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Sales performance from uploaded historical workbooks, prepared for leadership review.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4 text-primary" />
              <span>{staffName || 'Admin staff'}</span>
              {isSharedInvestorView ? <span className="hidden sm:inline">- read-only share link</span> : null}
              {dashboard?.source.sources.length ? (
                <span className="hidden sm:inline">- {dashboard.source.sources.join(', ')}</span>
              ) : null}
            </div>
          </div>

          {!isSharedInvestorView && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">Investor share access</span>
                  {dashboard?.share?.shareCode ? (
                    <Badge variant="secondary" className="rounded-md">
                      Code {dashboard.share.shareCode}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 break-all text-muted-foreground">
                  {dashboardShareUrl || 'Generate a temporary private link for investor review.'}
                </p>
                {dashboard?.share?.shareCodeExpiresAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Valid till {new Date(dashboard.share.shareCodeExpiresAt).toLocaleString('en-IN')}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {dashboardShareUrl && dashboard?.share?.shareCode ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      void copyExecutiveDashboardShare(
                        [
                          'Docty Executive Dashboard',
                          dashboardShareUrl,
                          `Access code: ${dashboard.share?.shareCode || ''}`,
                          `Valid till: ${
                            dashboard.share?.shareCodeExpiresAt
                              ? new Date(dashboard.share.shareCodeExpiresAt).toLocaleString('en-IN')
                              : '24 hours'
                          }`,
                        ].join('\n')
                      ).then((copied) => {
                        if (copied) toast.success('Private dashboard link copied.');
                      })
                    }
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                ) : null}
                <Button type="button" className="gap-2" onClick={() => void generateDashboardShare()} disabled={isGeneratingShare}>
                  {isGeneratingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Generate share code
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-lg border bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <div>
                <Label htmlFor="executive-start-date" className="text-xs font-semibold uppercase text-muted-foreground">
                  Start date
                </Label>
                <Input
                  id="executive-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setActiveDatePreset('custom');
                    setStartDate(event.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="executive-end-date" className="text-xs font-semibold uppercase text-muted-foreground">
                  End date
                </Label>
                <Input
                  id="executive-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setActiveDatePreset('custom');
                    setEndDate(event.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="executive-category" className="text-xs font-semibold uppercase text-muted-foreground">
                  Category
                </Label>
                <select
                  id="executive-category"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="all">All categories</option>
                  <option value="clinics">Clinics</option>
                  {(dashboard?.categories || []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="executive-location" className="text-xs font-semibold uppercase text-muted-foreground">
                  Location
                </Label>
                <select
                  id="executive-location"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option value="all">All locations</option>
                  {(dashboard?.locations || []).map((item) => (
                    <option key={item} value={item}>
                      {item.replace('Docty Clinics ', '')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button className="w-full gap-2" onClick={() => void loadDashboard()} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant={activeDatePreset === preset.key ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 rounded-md px-3 text-xs"
                  onClick={() => applyDatePreset(preset.key)}
                  disabled={isLoading}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-5">
        <Tabs defaultValue="profit-loss" className="gap-4">
          <div className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b bg-slate-50/95 px-4 pb-2 pt-1 backdrop-blur">
            <TabsList className="h-auto min-w-max">
              <TabsTrigger value="profit-loss" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                P/L Statement
              </TabsTrigger>
              <TabsTrigger value="historical" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Revenues
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-2">
                <Database className="h-4 w-4" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-2">
                <Activity className="h-4 w-4" />
                Compare
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="historical" className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">Revenue filters</h2>
                  <p className="text-sm text-muted-foreground">Switch the revenue view between all revenue, pharmacy, and clinic services.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All Revenues' },
                    { value: 'Pharmacy', label: 'Pharmacy' },
                    { value: 'clinics', label: 'Clinics' },
                  ].map((item) => (
                    <Button
                      key={item.value}
                      type="button"
                      size="sm"
                      variant={category === item.value ? 'default' : 'outline'}
                      className="h-8 rounded-md px-3 text-xs"
                      onClick={() => applyRevenueFilter(item.value as 'all' | 'Pharmacy' | 'clinics')}
                      disabled={isLoading}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  key: 'all',
                  label: 'Total Revenue',
                  value: dashboard?.revenueCards.totalRevenue || 0,
                  note: 'Clinics + pharmacy',
                  icon: BarChart3,
                  accent: 'text-primary',
                },
                {
                  key: 'clinics',
                  label: 'Clinic Revenue',
                  value: dashboard?.revenueCards.clinicRevenue || 0,
                  note: 'Click to filter clinics',
                  icon: Activity,
                  accent: 'text-sky-600',
                },
                {
                  key: 'Pharmacy',
                  label: 'Pharmacy Revenue',
                  value: dashboard?.revenueCards.pharmacyRevenue || 0,
                  note: 'Click to filter pharmacy',
                  icon: ShoppingCart,
                  accent: 'text-teal-600',
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => applyRevenueFilter(item.key as 'all' | 'Pharmacy' | 'clinics')}
                    disabled={isLoading}
                    className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 ${
                      isSelected ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-2xl font-bold tracking-normal">{formatMoney(item.value)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{isSelected ? 'Selected view' : item.note}</p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                        <Icon className={`h-5 w-5 ${item.accent}`} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Monthly revenue trend</h2>
                    <Badge variant="secondary" className="rounded-full">
                      {dashboard ? `${formatDate(dashboard.startDate)} - ${formatDate(dashboard.endDate)}` : 'Loading'}
                    </Badge>
                  </div>
                  <ChartContainer config={revenueChartConfig} className="h-[260px] min-w-0 max-w-full overflow-hidden sm:h-[320px]">
                    <BarChart data={dashboard?.monthly || []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 1000}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="clinicRevenue" stackId="revenue" fill="var(--color-clinicRevenue)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pharmacyRevenue" stackId="revenue" fill="var(--color-pharmacyRevenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="min-w-0 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <h2 className="mb-4 text-lg font-bold sm:text-xl">Executive readout</h2>
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-white p-3">
                      <div className="flex items-start gap-3">
                        <BarChart3 className="mt-0.5 h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold">{topCategory?.category || 'No category'} leads revenue</p>
                          <p className="text-sm text-muted-foreground">
                            {topCategory ? `${formatMoney(topCategory.revenue)} across ${formatNumber(topCategory.footfall)} footfall.` : 'No historical rows found.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <div className="flex items-start gap-3">
                        <ShoppingCart className="mt-0.5 h-5 w-5 text-teal-600" />
                        <div>
                          <p className="font-semibold">Pharmacy contribution</p>
                          <p className="text-sm text-muted-foreground">
                            {pharmacyCategory
                              ? `${formatMoney(pharmacyCategory.revenue)} from ${formatNumber(pharmacyCategory.footfall)} transactions/footfall.`
                              : 'No pharmacy rows in the selected range.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 h-5 w-5 text-sky-600" />
                        <div>
                          <p className="font-semibold">Data window</p>
                          <p className="text-sm text-muted-foreground">
                            {dashboard?.source.firstDate ? `${formatDate(dashboard.source.firstDate)} to ${formatDate(dashboard.source.lastDate)}` : 'Waiting for data.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Daily average footfall trend</h2>
                      <p className="text-sm text-muted-foreground">{footfallTrend.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-full">
                      {footfallTrend.badge}
                    </Badge>
                  </div>
                  <ChartContainer config={footfallChartConfig} className="h-[240px] min-w-0 max-w-full overflow-hidden">
                    <RechartsLineChart data={footfallTrend.rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="averageDailyFootfall"
                        stroke="var(--color-averageDailyFootfall)"
                        strokeWidth={3}
                        dot={footfallTrend.rows.length <= 12 ? { r: 3 } : false}
                      />
                    </RechartsLineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Avg. revenue / footfall trend</h2>
                      <p className="text-sm text-muted-foreground">{averageRevenueTrend.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-full">
                      {averageRevenueTrend.badge}
                    </Badge>
                  </div>
                  <ChartContainer config={averageRevenueChartConfig} className="h-[240px] min-w-0 max-w-full overflow-hidden">
                    <RechartsLineChart data={averageRevenueTrend.rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value)}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="averageRevenuePerFootfall"
                        stroke="var(--color-averageRevenuePerFootfall)"
                        strokeWidth={3}
                        dot={averageRevenueTrend.rows.length <= 12 ? { r: 3 } : false}
                      />
                    </RechartsLineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="min-w-0 shadow-sm">
              <CardContent className="p-0">
                <div className="border-b p-4 sm:p-5">
                  <h2 className="text-lg font-bold sm:text-xl">Category performance</h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Footfall</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Avg.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboard?.categoriesSummary || []).slice(0, 8).map((row) => (
                        <TableRow key={row.category}>
                          <TableCell>
                            <p className="font-semibold">{row.category}</p>
                            <p className="text-xs text-muted-foreground">{row.activeDays} active days</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(row.revenue)}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{formatNumber(row.footfall)}</TableCell>
                          <TableCell className="hidden text-right md:table-cell">{formatMoney(row.averageRevenuePerFootfall)}</TableCell>
                        </TableRow>
                      ))}
                      {!dashboard?.categoriesSummary.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            {isLoading ? 'Loading dashboard...' : 'No historical sales found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Revenue mix</h2>
                    <Badge variant="secondary" className="rounded-full">By location</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                    <ChartContainer config={pieChartConfig} className="h-[240px] min-w-0 max-w-full overflow-hidden">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={locationPieData} dataKey="revenue" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                          {locationPieData.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2">
                      {locationPieData.map((row, index) => (
                        <div key={row.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-2 text-sm">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                            <span className="truncate font-medium">{row.name}</span>
                          </div>
                          <span className="shrink-0 font-semibold">{formatMoney(row.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Category mix</h2>
                    <Badge variant="secondary" className="rounded-full">Top categories</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px] md:items-center">
                    <ChartContainer config={pieChartConfig} className="h-[240px] min-w-0 max-w-full overflow-hidden">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={categoryPieData} dataKey="revenue" nameKey="name" innerRadius={52} outerRadius={92} paddingAngle={2}>
                          {categoryPieData.map((entry, index) => (
                            <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-2">
                      {categoryPieData.map((row, index) => (
                        <div key={row.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-2 text-sm">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                            <span className="truncate font-medium">{row.name}</span>
                          </div>
                          <span className="shrink-0 font-semibold">{formatMoney(row.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Busiest days of the week</h2>
                    <p className="text-sm text-muted-foreground">Ranked by footfall for the selected filters.</p>
                  </div>
                  <Badge className="w-fit rounded-full">
                    {busiestWeekdays[0]?.day || 'No activity'}
                  </Badge>
                </div>
                {busiestWeekdays.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                    {busiestWeekdays.map((day, index) => {
                      const maxFootfall = busiestWeekdays[0]?.footfall || 1;
                      const width = Math.max(8, Math.round((day.footfall / maxFootfall) * 100));
                      return (
                        <div key={day.day} className="rounded-lg border bg-white p-4">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="font-semibold">{day.day}</p>
                            <Badge variant={index === 0 ? 'default' : 'secondary'} className="rounded-full">#{index + 1}</Badge>
                          </div>
                          <p className="text-3xl font-bold leading-none">{formatNumber(day.footfall)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatMoney(day.revenue)}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    No weekday activity found for the selected filters.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Historical Data</h2>
                    <p className="text-sm text-muted-foreground">Uploaded spreadsheet rows normalized for dashboard reporting.</p>
                  </div>
                  <Badge variant="secondary" className="w-fit rounded-full">
                    Showing latest {recentRows.length} rows
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="hidden md:table-cell">Source</TableHead>
                        <TableHead className="text-right">Footfall</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRows.map((row) => (
                        <TableRow key={`${row.date}-${row.location}-${row.category}`}>
                          <TableCell>
                            <p className="font-semibold">{formatDate(row.date)}</p>
                            <p className="text-xs text-muted-foreground">{row.day} - Week {row.week}</p>
                          </TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell className="hidden lg:table-cell">{row.location.replace('Docty Clinics ', '')}</TableCell>
                          <TableCell className="hidden md:table-cell">{row.source}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.footfall)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(row.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Revenue', value: formatMoney(dashboard?.profitLoss.totals.revenue || 0), note: 'Selected period' },
                { label: 'Expenses', value: formatMoney(dashboard?.profitLoss.totals.expenses || 0), note: `${formatNumber(dashboard?.profitLoss.totals.expenseTransactions || 0)} OPEX rows` },
                { label: 'Net profit / loss', value: formatMoney(dashboard?.profitLoss.totals.netProfit || 0), note: `${formatPercent(dashboard?.profitLoss.totals.profitMargin || 0)} margin` },
                { label: 'Expense ratio', value: formatPercent(dashboard?.profitLoss.totals.expenseRatio || 0), note: 'Expenses as % of revenue' },
              ].map((item) => (
                <Card key={item.label} className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="min-w-0 overflow-hidden shadow-sm">
              <CardContent className="min-w-0 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Monthly P/L statement</h2>
                    <p className="text-sm text-muted-foreground">Revenue less Manikonda operating expenses for the selected range.</p>
                  </div>
                  <Badge variant="secondary" className="w-fit rounded-full">
                    {formatDate(dashboard?.startDate || startDate)} - {formatDate(dashboard?.endDate || endDate)}
                  </Badge>
                </div>
                <ChartContainer config={profitLossChartConfig} className="h-[300px] min-w-0 max-w-full overflow-hidden">
                  <BarChart data={dashboard?.profitLoss.monthly || []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 1000}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="netProfit" fill="var(--color-netProfit)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Expense mix</h2>
                    <Badge variant="secondary" className="rounded-full">Category</Badge>
                  </div>
                  <ChartContainer config={pieChartConfig} className="h-[230px] min-w-0 max-w-full overflow-hidden">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={profitLossExpensePieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2}>
                        {profitLossExpensePieData.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-2 space-y-2">
                    {profitLossExpensePieData.slice(0, 5).map((row, index) => (
                      <div key={row.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                          <span className="truncate font-medium">{row.name}</span>
                        </div>
                        <span className="shrink-0 font-semibold">{formatMoney(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Revenue mix</h2>
                    <Badge variant="secondary" className="rounded-full">Category</Badge>
                  </div>
                  <ChartContainer config={pieChartConfig} className="h-[230px] min-w-0 max-w-full overflow-hidden">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={profitLossRevenuePieData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2}>
                        {profitLossRevenuePieData.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-2 space-y-2">
                    {profitLossRevenuePieData.slice(0, 5).map((row, index) => (
                      <div key={row.name} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                          <span className="truncate font-medium">{row.name}</span>
                        </div>
                        <span className="shrink-0 font-semibold">{formatMoney(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Margin trend</h2>
                    <Badge variant="secondary" className="rounded-full">Monthly</Badge>
                  </div>
                  <ChartContainer config={profitLossRatioChartConfig} className="h-[260px] min-w-0 max-w-full overflow-hidden">
                    <RechartsLineChart data={profitLossMarginTrendRows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value)}%`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="profitMarginPercent" stroke="var(--color-profitMarginPercent)" strokeWidth={3} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="expenseRatioPercent" stroke="var(--color-expenseRatioPercent)" strokeWidth={3} dot={{ r: 3 }} />
                    </RechartsLineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">P/L drilldown</h2>
                    <p className="text-sm text-muted-foreground">Switch between monthly, category, revenue, and raw OPEX views.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'monthly', label: 'Monthly P/L' },
                      { key: 'expenses', label: 'Expense Categories' },
                      { key: 'revenue', label: 'Revenue Categories' },
                      { key: 'opex', label: 'OPEX Detail' },
                    ].map((item) => (
                      <Button
                        key={item.key}
                        type="button"
                        size="sm"
                        variant={profitLossDrilldown === item.key ? 'default' : 'outline'}
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setProfitLossDrilldown(item.key as 'monthly' | 'expenses' | 'revenue' | 'opex')}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    {profitLossDrilldown === 'monthly' && (
                      <>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Net</TableHead>
                            <TableHead className="hidden text-right md:table-cell">Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dashboard?.profitLoss.monthly || []).map((row) => (
                            <TableRow key={row.month}>
                              <TableCell className="font-semibold">{row.label}</TableCell>
                              <TableCell className="text-right">{formatMoney(row.revenue)}</TableCell>
                              <TableCell className="text-right">{formatMoney(row.expenses)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(row.netProfit)}</TableCell>
                              <TableCell className="hidden text-right md:table-cell">{formatPercent(row.profitMargin)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </>
                    )}
                    {profitLossDrilldown === 'expenses' && (
                      <>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Expense Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">Rows</TableHead>
                            <TableHead className="hidden text-right md:table-cell">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dashboard?.profitLoss.expensesByCategory || []).map((row) => (
                            <TableRow key={row.category}>
                              <TableCell className="font-semibold">{row.category}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(row.amount)}</TableCell>
                              <TableCell className="hidden text-right sm:table-cell">{formatNumber(row.transactions)}</TableCell>
                              <TableCell className="hidden text-right md:table-cell">{formatPercent(row.share)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </>
                    )}
                    {profitLossDrilldown === 'revenue' && (
                      <>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Revenue Category</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">Footfall</TableHead>
                            <TableHead className="hidden text-right md:table-cell">Avg.</TableHead>
                            <TableHead className="hidden text-right lg:table-cell">Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dashboard?.profitLoss.revenueByCategory || []).map((row) => (
                            <TableRow key={row.category}>
                              <TableCell className="font-semibold">{row.category}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(row.revenue)}</TableCell>
                              <TableCell className="hidden text-right sm:table-cell">{formatNumber(row.footfall)}</TableCell>
                              <TableCell className="hidden text-right md:table-cell">{formatMoney(row.averageRevenuePerFootfall)}</TableCell>
                              <TableCell className="hidden text-right lg:table-cell">{formatPercent(row.share)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </>
                    )}
                    {profitLossDrilldown === 'opex' && (
                      <>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Expense</TableHead>
                            <TableHead className="hidden sm:table-cell">Category</TableHead>
                            <TableHead className="hidden md:table-cell">Month</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(dashboard?.profitLoss.expenses || []).slice(0, 80).map((row) => (
                            <TableRow key={`${row.source}-${row.expense}-${row.amount}`}>
                              <TableCell className="font-semibold">{row.expense}</TableCell>
                              <TableCell className="hidden sm:table-cell">{row.category}</TableCell>
                              <TableCell className="hidden md:table-cell">{row.month}</TableCell>
                              <TableCell className="text-right font-semibold">{formatMoney(row.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </>
                    )}
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total expenses', value: formatMoney(dashboard?.profitLoss.totals.expenses || 0), note: `${formatNumber(dashboard?.profitLoss.totals.expenseTransactions || 0)} OPEX rows` },
                { label: 'Expense ratio', value: formatPercent(dashboard?.profitLoss.totals.expenseRatio || 0), note: 'Expenses as % of revenue' },
                { label: 'Largest category', value: dashboard?.profitLoss.expensesByCategory[0]?.category || 'No category', note: formatMoney(dashboard?.profitLoss.expensesByCategory[0]?.amount || 0) },
                { label: 'Monthly average', value: formatMoney((dashboard?.profitLoss.totals.expenses || 0) / Math.max(1, dashboard?.profitLoss.monthly.filter((row) => row.expenses > 0).length || 1)), note: 'For months with OPEX' },
              ].map((item) => (
                <Card key={item.label} className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-muted-foreground">{item.label}</p>
                    <p className="mt-2 truncate text-2xl font-bold">{item.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Expense category mix</h2>
                    <Badge variant="secondary" className="rounded-full">OPEX</Badge>
                  </div>
                  <ChartContainer config={pieChartConfig} className="h-[260px] min-w-0 max-w-full overflow-hidden">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={profitLossExpensePieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={98} paddingAngle={2}>
                        {profitLossExpensePieData.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <h2 className="mb-4 text-lg font-bold sm:text-xl">Monthly expense trend</h2>
                  <ChartContainer config={profitLossChartConfig} className="h-[260px] min-w-0 max-w-full overflow-hidden">
                    <BarChart data={dashboard?.profitLoss.monthly || []} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 1000}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="border-b p-4 sm:p-5">
                  <h2 className="text-lg font-bold sm:text-xl">Expense category drilldown</h2>
                  <p className="text-sm text-muted-foreground">OPEX summarized by category for the selected location filters.</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Rows</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboard?.profitLoss.expensesByCategory || []).map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="font-semibold">{row.category}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(row.amount)}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{formatNumber(row.transactions)}</TableCell>
                          <TableCell className="hidden text-right md:table-cell">{formatPercent(row.share)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">OPEX detail</h2>
                    <p className="text-sm text-muted-foreground">Latest normalized expense rows from uploaded files.</p>
                  </div>
                  <div className="flex w-full items-center gap-2 rounded-md border bg-white px-2 py-1.5 lg:w-auto">
                    <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Label htmlFor="opex-category-filter" className="sr-only">
                      Category
                    </Label>
                    <select
                      id="opex-category-filter"
                      className="h-8 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none lg:w-52"
                      value={opexCategoryFilter}
                      onChange={(event) => {
                        setOpexCategoryFilter(event.target.value);
                        setOpexDetailPage(1);
                      }}
                    >
                      <option value="all">All categories</option>
                      {opexCategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense</TableHead>
                        <TableHead className="hidden sm:table-cell">Category</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="hidden md:table-cell">Month</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOpexRows.map((row, index) => (
                        <TableRow key={`${row.source}-${row.location}-${row.expense}-${row.amount}-${index}`}>
                          <TableCell className="font-semibold">{row.expense}</TableCell>
                          <TableCell className="hidden sm:table-cell">{row.category}</TableCell>
                          <TableCell className="hidden lg:table-cell">{row.location.replace('Docty Clinics ', '')}</TableCell>
                          <TableCell className="hidden md:table-cell">{row.month}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                      {!paginatedOpexRows.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No OPEX rows found for this category.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <span>
                    Showing {formatNumber(opexStartRow)}-{formatNumber(opexEndRow)} of {formatNumber(filteredOpexRows.length)} rows
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-md px-3 text-xs"
                      onClick={() => setOpexDetailPage((page) => Math.max(1, page - 1))}
                      disabled={opexCurrentPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="min-w-20 text-center text-xs font-semibold text-foreground">
                      Page {formatNumber(opexCurrentPage)} of {formatNumber(opexTotalPages)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-md px-3 text-xs"
                      onClick={() => setOpexDetailPage((page) => Math.min(opexTotalPages, page + 1))}
                      disabled={opexCurrentPage >= opexTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">Clinic month-on-month comparison</h2>
                  <p className="text-sm text-muted-foreground">Compare each clinic across months using revenue, footfall, and pharmacy contribution.</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {compareRows.map((row) => {
                const latestMonth = compareClinicMonthlyRows.at(-1);
                const latestRevenue = Number(latestMonth?.[`${row.displayName} Revenue`] || 0);
                const latestGrowth = Number(latestMonth?.[`${row.displayName} MoM Growth`] || 0);
                const latestPharmacy = Number(latestMonth?.[`${row.displayName} Pharmacy Revenue`] || 0);
                return (
                  <Card key={row.location} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">Clinic</p>
                          <h2 className="text-xl font-bold">{row.displayName}</h2>
                        </div>
                        <Badge variant="secondary" className="rounded-full">{formatPercent(row.revenueShare)}</Badge>
                      </div>
                      <p className="text-2xl font-bold">{formatMoney(row.revenue)}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-slate-50 p-2">
                          <p className="text-muted-foreground">Latest month</p>
                          <p className="font-semibold">{formatMoney(latestRevenue)}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-2">
                          <p className="text-muted-foreground">MoM growth</p>
                          <p className="font-semibold">{formatPercent(latestGrowth)}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-2">
                          <p className="text-muted-foreground">Pharmacy</p>
                          <p className="font-semibold">{formatMoney(latestPharmacy)}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-2">
                          <p className="text-muted-foreground">Footfall</p>
                          <p className="font-semibold">{formatNumber(row.footfall)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Month-on-month by clinic</h2>
                      <p className="text-sm text-muted-foreground">Monthly revenue trend for each available clinic.</p>
                    </div>
                    <Badge variant="secondary" className="w-fit rounded-full">
                      {formatDate(dashboard?.startDate || startDate)} - {formatDate(dashboard?.endDate || endDate)}
                    </Badge>
                  </div>
                  <ChartContainer config={revenueChartConfig} className="h-[300px] min-w-0 max-w-full overflow-hidden">
                    <BarChart data={compareClinicMonthlyRows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 1000}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {compareRows.map((row, index) => (
                        <Bar
                          key={row.location}
                          dataKey={`${row.displayName} Revenue`}
                          fill={pieColors[index % pieColors.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">Dashboard assistant</h2>
                      <p className="text-sm text-muted-foreground">Ask dynamic AI questions from the selected dashboard data.</p>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {compareQuestions.map((question) => (
                      <Button
                        key={question}
                        type="button"
                        size="sm"
                        variant={assistantQuestion === question ? 'default' : 'outline'}
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setAssistantQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                  <textarea
                    value={assistantQuestion}
                    onChange={(event) => setAssistantQuestion(event.target.value)}
                    className="mb-3 min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="Ask about clinic comparison, month-on-month trends, P/L, revenue mix, expenses, or busiest days..."
                  />
                  <Button type="button" className="mb-4 w-full gap-2" onClick={() => void askDashboardAssistant()} disabled={isAssistantLoading}>
                    {isAssistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Ask AI
                  </Button>
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-muted-foreground">Answer</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6">
                      {assistantAnswer || 'Ask a question to scan the current dashboard data.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="border-b p-4 sm:p-5">
                  <h2 className="text-lg font-bold sm:text-xl">Clinic month-on-month table</h2>
                  <p className="text-sm text-muted-foreground">Each month compared across clinics, including MoM movement.</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        {compareRows.map((row) => (
                          <TableHead key={row.location} className="text-right">{row.displayName}</TableHead>
                        ))}
                        <TableHead className="hidden text-right md:table-cell">Top Clinic</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compareClinicMonthlyRows.map((row) => {
                        const leader = compareRows
                          .slice()
                          .sort((a, b) => Number(row[`${b.displayName} Revenue`] || 0) - Number(row[`${a.displayName} Revenue`] || 0))[0];
                        return (
                          <TableRow key={String(row.month)}>
                            <TableCell className="font-semibold">{row.label}</TableCell>
                            {compareRows.map((locationRow) => {
                              const revenue = Number(row[`${locationRow.displayName} Revenue`] || 0);
                              const growth = Number(row[`${locationRow.displayName} MoM Growth`] || 0);
                              return (
                                <TableCell key={locationRow.location} className="text-right">
                                  <p className="font-semibold">{formatMoney(revenue)}</p>
                                  <p className="text-xs text-muted-foreground">{formatPercent(growth)} MoM</p>
                                </TableCell>
                              );
                            })}
                            <TableCell className="hidden text-right md:table-cell">{leader?.displayName || 'No leader'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pharmacy" className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Pharmacy Sales</h2>
                    <p className="text-sm text-muted-foreground">
                      {dashboard?.pharmacy.note || 'June 2026 pharmacy sales will appear after the dashboard loads.'}
                    </p>
                  </div>
                  <Badge className="rounded-full">{dashboard?.pharmacy.location.replace('Docty Clinics ', '') || 'Manikonda'}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">June revenue</p>
                    <p className="mt-2 text-2xl font-bold">{formatMoney(dashboard?.pharmacy.totals.revenue || 0)}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">Bills</p>
                    <p className="mt-2 text-2xl font-bold">{formatNumber(dashboard?.pharmacy.totals.bills || 0)}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">Avg. bill value</p>
                    <p className="mt-2 text-2xl font-bold">{formatMoney(dashboard?.pharmacy.totals.averageBillValue || 0)}</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-muted-foreground">Report rows</p>
                    <p className="mt-2 text-2xl font-bold">{formatNumber(dashboard?.pharmacy.totals.lineItems || 0)}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {(dashboard?.pharmacy.locations || []).map((row) => (
                    <div key={row.location} className="rounded-lg border bg-slate-50 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{row.location.replace('Docty Clinics ', '')}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(row.bills)} bills across {row.activeDays} days
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                          {formatMoney(row.averageBillValue)} avg.
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">{formatMoney(row.revenue)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">Daily pharmacy sales</h2>
                    <Badge variant="secondary" className="rounded-full">
                      {formatNumber(dashboard?.pharmacy.totals.activeDays || 0)} active days
                    </Badge>
                  </div>
                  <ChartContainer config={pharmacyChartConfig} className="h-[280px] min-w-0 max-w-full overflow-hidden">
                    <BarChart data={pharmacyDailyRows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value) => formatDate(String(value)).replace(' 2026', '')} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 1000}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="min-w-0 overflow-hidden shadow-sm">
                <CardContent className="min-w-0 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold sm:text-xl">GST mix</h2>
                    <Badge variant="secondary" className="rounded-full">Manikonda</Badge>
                  </div>
                  <ChartContainer config={pieChartConfig} className="h-[230px] min-w-0 max-w-full overflow-hidden">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={pharmacyGstPieData} dataKey="revenue" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2}>
                        {pharmacyGstPieData.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-2 space-y-2">
                    {(dashboard?.pharmacy.gstBreakdown || []).map((row, index) => (
                      <div key={row.gstPercentage || index} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                          <span className="truncate font-medium">{row.gstPercentage || 'Unknown'}% GST</span>
                        </div>
                        <span className="shrink-0 font-semibold">{formatMoney(row.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="border-b p-4 sm:p-5">
                    <h2 className="text-lg font-bold sm:text-xl">Top medicines</h2>
                    <p className="text-sm text-muted-foreground">Ranked by invoice value in the Manikonda June report.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Lines</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dashboard?.pharmacy.topMedicines || []).slice(0, 10).map((row) => (
                          <TableRow key={row.medicine}>
                            <TableCell className="max-w-[260px] font-medium">
                              <span className="line-clamp-2">{row.medicine}</span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatMoney(row.revenue)}</TableCell>
                            <TableCell className="hidden text-right sm:table-cell">{formatNumber(row.lineItems)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="border-b p-4 sm:p-5">
                    <h2 className="text-lg font-bold sm:text-xl">Daily pharmacy detail</h2>
                    <p className="text-sm text-muted-foreground">Bill count and report-row volume by sale date.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Bills</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Lines</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(dashboard?.pharmacy.daily || []).slice(0, 10).map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>
                              <p className="font-semibold">{formatDate(row.date)}</p>
                              <p className="text-xs text-muted-foreground">{row.day}</p>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatMoney(row.revenue)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.footfall)}</TableCell>
                            <TableCell className="hidden text-right sm:table-cell">{formatNumber(row.lineItems)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clinics" className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Location performance</h2>
                    <p className="text-sm text-muted-foreground">September 2025-June 2026 historical data by clinic location.</p>
                  </div>
                </div>
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  {(dashboard?.locationsSummary || []).map((row) => (
                    <div key={row.location} className="rounded-lg border bg-white p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{row.location.replace('Docty Clinics ', '')}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(row.footfall)} footfall across {row.activeDays} days
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                          {row.categories} categories
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold">{formatMoney(row.revenue)}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-slate-50 p-2">
                          <p className="text-muted-foreground">Gross bill</p>
                          <p className="font-semibold">{formatMoney(row.totalBill)}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 p-2">
                          <p className="text-muted-foreground">Discount</p>
                          <p className="font-semibold">{formatMoney(row.discount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {clinicCategories.slice(0, 8).map((row) => (
                    <div key={row.category} className="rounded-lg border bg-white p-4">
                      <p className="font-semibold">{row.category}</p>
                      <p className="mt-2 text-xl font-bold">{formatMoney(row.revenue)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatNumber(row.footfall)} footfall</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
