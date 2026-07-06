import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Calculator,
  Copy,
  LineChart,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { CartesianGrid, Cell, Line, LineChart as RechartsLineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
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
import {
  applyOwnershipToCenterFeatures,
  buildProjection,
  buildCenterFeaturesForSft,
  buildRecommendedCapexItems,
  buildRecommendedOpexItems,
  buildRevenueComponents,
  capexCategories,
  centerFeatureCategories,
  centerSizeProfileForSft,
  conservativeBaseline,
  defaultEquipmentForSft,
  defaultCapexItems,
  defaultCenterFeatures,
  defaultExpenses,
  doctyCapexContribution,
  eighteenMonthOperatingFundingNeed,
  estimatedMonthlyFootfall,
  estimatedMonthlyRent,
  estimatedRevenuePerFootfall,
  firstOperatingBreakEvenMonth,
  focoRules,
  formatMoney,
  formatNumber,
  initialInvestmentRequired,
  monthlyRentForLocation,
  normalizedMonthlyExpenses,
  ownerCapexContribution,
  projectedMonthlyRevenue,
  securityDepositForLocation,
  starterLocations,
  totalActualCapex,
  totalEstimatedCapex,
  totalMonthlyExpenses,
  workingCapitalSecurityDeposit,
  type CenterFeature,
  type FranchiseCapexItem,
  type FranchiseExpense,
  type FranchiseLocation,
} from '@/lib/franchise-opportunity';

const projectionChartConfig = {
  revenue: { label: 'Base revenue', color: '#0bb8fc' },
  optimalRevenue: { label: 'Optimal revenue', color: '#2563eb' },
  maxRevenue: { label: 'Max revenue', color: '#8b5cf6' },
  cumulativePnl: { label: 'Base', color: '#0bb8fc' },
  cumulativeOptimalPnl: { label: 'Optimal', color: '#2563eb' },
  cumulativeMaxPnl: { label: 'Max', color: '#8b5cf6' },
  expenses: { label: 'OPEX + management fee', color: '#fe065c' },
  operatingProfit: { label: 'Operating profit', color: '#14b8a6' },
  manikondaRevenue: { label: 'Manikonda actual revenue', color: '#475569' },
  manikondaOperatingProfit: { label: 'Manikonda actual operating profit', color: '#f59e0b' },
} satisfies ChartConfig;

const expenseChartConfig = {
  amount: { label: 'Amount', color: '#fe065c' },
} satisfies ChartConfig;

const expenseSliceColors = ['#0bb8fc', '#fe065c', '#14b8a6', '#f59e0b', '#8b5cf6', '#22c55e', '#ef4444', '#64748b'];

function cloneNewLocation() {
  return {
    id: `location-${Date.now()}`,
    name: 'New opportunity',
    area: 'Hyderabad',
    status: 'planned' as const,
    centerSft: 1800,
    capexType: 'projected' as const,
    capex: 2800000,
    capexItems: defaultCapexItems.map((item) => ({ ...item })),
    monthlyFootfall: 700,
    revenuePerFootfall: 450,
    monthlyExpenses: defaultExpenses.map((expense) => ({ ...expense })),
    centerFeatures: defaultCenterFeatures.map((feature) => ({ ...feature })),
    hasOwnPharmacy: true,
    hasOwnPhysiotherapy: true,
    ...defaultEquipmentForSft(1800),
  };
}

function preserveCapexActuals(
  nextItems: FranchiseCapexItem[],
  previousItems: FranchiseCapexItem[] = [],
) {
  const byId = new Map(previousItems.map((item) => [item.id, item]));
  const byLabel = new Map(previousItems.map((item) => [`${item.category}::${item.label}`.toLowerCase(), item]));

  return nextItems.map((item) => {
    const previous = byId.get(item.id) || byLabel.get(`${item.category}::${item.label}`.toLowerCase());
    return previous ? { ...item, actualAmount: Number(previous.actualAmount || 0) } : item;
  });
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

function phasedRevenueMultiplier(month: number, targetMultiplier: number) {
  if (targetMultiplier <= 1) return 1;
  const isMaxScenario = targetMultiplier >= 2;
  const rampStartMonth = isMaxScenario ? 12 : 14;
  const rampEndMonth = isMaxScenario ? 18 : 22;
  const progress = Math.min(1, Math.max(0, (month - rampStartMonth) / (rampEndMonth - rampStartMonth)));
  return 1 + (targetMultiplier - 1) * progress;
}

function scenarioRevenueForMonth(month: number, baseRevenue: number, targetMultiplier: number) {
  if (targetMultiplier <= 1) return baseRevenue;
  const firstMonthBaseRevenue = 50000;
  const firstMonthScenarioRevenue = firstMonthBaseRevenue * targetMultiplier;
  const earlyUpliftProgress = Math.min(1, Math.max(0, (month - 1) / 11));
  const earlyUplift = Math.round((firstMonthScenarioRevenue - firstMonthBaseRevenue) * (1 - earlyUpliftProgress));
  return Math.round(baseRevenue * phasedRevenueMultiplier(month, targetMultiplier)) + earlyUplift;
}

export default function StaffFranchiseOpportunityPage() {
  const [locations, setLocations] = useState<FranchiseLocation[]>(starterLocations);
  const [selectedId, setSelectedId] = useState(locations[0]?.id || '');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [shareInfo, setShareInfo] = useState<{ shareToken: string; shareCode?: string; shareCodeExpiresAt?: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedId) || locations[0],
    [locations, selectedId]
  );
  const projection = useMemo(
    () => (selectedLocation ? buildProjection(selectedLocation, 60) : []),
    [selectedLocation]
  );
  const projectionChartData = useMemo(
    () => {
      const benchmark = conservativeBaseline();
      let cumulativePnl = 0;
      let cumulativeOptimalPnl = 0;
      let cumulativeMaxPnl = 0;
      return projection.map((month) => {
        const optimalRevenue = scenarioRevenueForMonth(month.month, month.revenue, 1.5);
        const maxRevenue = scenarioRevenueForMonth(month.month, month.revenue, 2);
        cumulativePnl += month.revenue - month.expenses;
        cumulativeOptimalPnl += optimalRevenue - month.expenses;
        cumulativeMaxPnl += maxRevenue - month.expenses;
        return {
          ...month,
          optimalRevenue,
          maxRevenue,
          manikondaRevenue: benchmark.monthlyRevenue,
          manikondaOperatingProfit: benchmark.monthlyOperatingProfit,
          cumulativePnl,
          cumulativeOptimalPnl,
          cumulativeMaxPnl,
        };
      });
    },
    [projection]
  );
  const revenueComponents = useMemo(
    () => (selectedLocation ? buildRevenueComponents(selectedLocation) : []),
    [selectedLocation]
  );
  const manikondaBenchmark = useMemo(() => conservativeBaseline(), []);
  const breakEvenMonth = firstOperatingBreakEvenMonth(projection);
  const monthlyRevenue = selectedLocation ? projectedMonthlyRevenue(selectedLocation) : 0;
  const monthlyExpenses = selectedLocation ? totalMonthlyExpenses(selectedLocation) : 0;
  const normalizedExpenseRows = useMemo(
    () => (selectedLocation ? normalizedMonthlyExpenses(selectedLocation) : []),
    [selectedLocation]
  );
  const estimatedFootfall = selectedLocation ? estimatedMonthlyFootfall(selectedLocation) : 0;
  const estimatedRevenuePerVisit = selectedLocation ? estimatedRevenuePerFootfall(selectedLocation) : 0;
  const estimatedRent = selectedLocation ? estimatedMonthlyRent(selectedLocation) : 0;
  const monthlyRent = selectedLocation ? monthlyRentForLocation(selectedLocation) : 0;
  const securityDeposit = selectedLocation ? securityDepositForLocation(selectedLocation) : 0;
  const estimatedCapex = selectedLocation ? totalEstimatedCapex(selectedLocation) : 0;
  const actualCapex = selectedLocation ? totalActualCapex(selectedLocation) : 0;
  const ownerCapex = selectedLocation ? ownerCapexContribution(selectedLocation) : 0;
  const doctyCapex = selectedLocation ? doctyCapexContribution(selectedLocation) : 0;
  const wcsd = selectedLocation ? workingCapitalSecurityDeposit(selectedLocation) : 0;
  const ownerOnlyFunding = focoRules.franchiseFee + wcsd;
  const initialInvestment = selectedLocation ? initialInvestmentRequired(selectedLocation) : 0;
  const eighteenMonthFunding = eighteenMonthOperatingFundingNeed(projection);
  const month18 = projection[17];
  const year5 = projection[59];
  const optimalMonthlyRevenue = Math.round(monthlyRevenue * 1.5);
  const maxMonthlyRevenue = Math.round(monthlyRevenue * 2);
  const totalInvestment = initialInvestment + eighteenMonthFunding;
  const roi = totalInvestment > 0 ? ((year5?.operatingProfit || 0) * 12 * 100) / totalInvestment : 0;
  const threeYearOperatingProfit = projection
    .filter((month) => month.month <= 36)
    .reduce((sum, month) => sum + month.operatingProfit, 0);
  const fiveYearOperatingProfit = projection.reduce((sum, month) => sum + month.operatingProfit, 0);
  const roi3Years = totalInvestment > 0 ? (threeYearOperatingProfit * 100) / totalInvestment : 0;
  const roi5Years = totalInvestment > 0 ? (fiveYearOperatingProfit * 100) / totalInvestment : 0;
  const investmentBreakEvenMonth = projection.find((month) => month.cumulativeCashFlow >= 0)?.month || 0;
  const benchmarkCheckpoints = [18, 36, 60].map((monthNumber) => {
    const row = projection[monthNumber - 1];
    return {
      month: monthNumber,
      revenue: row?.revenue || 0,
      operatingProfit: row?.operatingProfit || 0,
      revenueVariance: manikondaBenchmark.monthlyRevenue > 0
        ? ((row?.revenue || 0) - manikondaBenchmark.monthlyRevenue) / manikondaBenchmark.monthlyRevenue
        : 0,
    };
  });
  const revenueScenarioMetrics = [
    { label: 'Base', multiplier: 1 },
    { label: 'Optimal', multiplier: 1.5 },
    { label: 'Max', multiplier: 2 },
  ].map((scenario) => {
    const cumulativeProfit = projection.reduce(
      (sum, month) => sum + scenarioRevenueForMonth(month.month, month.revenue, scenario.multiplier) - month.expenses,
      0
    );
    return {
      ...scenario,
      cumulativeProfit,
      roi: totalInvestment > 0 ? (cumulativeProfit * 100) / totalInvestment : 0,
    };
  });
  const centerProfile = selectedLocation ? centerSizeProfileForSft(selectedLocation.centerSft) : undefined;
  const cityOptions = useMemo(
    () => Array.from(new Set(locations.map((location) => location.area || 'Hyderabad'))),
    [locations]
  );
  const locationsForSelectedCity = useMemo(
    () => locations.filter((location) => location.area === selectedLocation?.area),
    [locations, selectedLocation?.area]
  );
  const shareUrl = shareInfo?.shareToken
    ? `${window.location.origin}/franchise/opportunity/${shareInfo.shareToken}?locationId=${encodeURIComponent(selectedLocation?.id || '')}`
    : '';

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const sessionResponse = await fetch('/api/staff/session', { headers: { Accept: 'application/json' } });
        const sessionBody = await sessionResponse.json().catch(() => null);
        const authorized = sessionResponse.ok && Boolean(sessionBody?.authenticated && sessionBody?.staff?.isAdmin);
        setIsAuthorized(authorized);
        if (!authorized) return;

        const shareResponse = await fetch('/api/franchise/opportunity', { headers: { Accept: 'application/json' } });
        const shareBody = await shareResponse.json().catch(() => null);
        if (shareResponse.ok && shareBody?.shareToken) {
          setShareInfo({ shareToken: shareBody.shareToken, shareCode: shareBody.shareCode, shareCodeExpiresAt: shareBody.shareCodeExpiresAt });
          setShowBenchmark(shareBody.showBenchmark !== false);
          if (Array.isArray(shareBody.locations) && shareBody.locations.length) {
            setLocations(shareBody.locations);
            setSelectedId(shareBody.locations[0].id);
          }
          setUpdatedAt(shareBody.updatedAt || '');
          setUpdatedBy(shareBody.updatedBy || '');
        }
      } finally {
        setIsCheckingSession(false);
      }
    };

    void loadAccess();
  }, []);

  useEffect(() => {
    if (selectedLocation) setSelectedId(selectedLocation.id);
  }, [selectedLocation]);

  const updateLocation = (changes: Partial<FranchiseLocation>) => {
    if (!selectedLocation) return;
    setLocations((current) =>
      current.map((location) =>
        location.id === selectedLocation.id ? { ...location, ...changes } : location
      )
    );
  };

  const updateCenterSft = (centerSft: number) => {
    if (!selectedLocation) return;
    const equipment = defaultEquipmentForSft(centerSft);
    const centerFeatures = applyOwnershipToCenterFeatures(buildCenterFeaturesForSft(centerSft), {
      hasOwnPharmacy: selectedLocation.hasOwnPharmacy ?? true,
      hasOwnPhysiotherapy: selectedLocation.hasOwnPhysiotherapy ?? true,
      hasOwnLab: equipment.hasOwnLab,
    });
    const nextLocation = {
      ...selectedLocation,
      centerSft,
      centerFeatures,
      ...equipment,
    };
    updateLocation({
      centerSft,
      centerFeatures: nextLocation.centerFeatures,
      ...equipment,
      ...(selectedLocation.status !== 'active'
        ? {
            monthlyExpenses: selectedLocation.monthlyExpenses.map((expense) =>
              expense.id === 'rent' ? { ...expense, amount: estimatedMonthlyRent(nextLocation) } : expense
            ),
            capexItems: preserveCapexActuals(buildRecommendedCapexItems(nextLocation), selectedLocation.capexItems),
          }
        : {}),
    });
  };

  const selectCity = (city: string) => {
    const firstInCity = locations.find((location) => location.area === city);
    if (firstInCity) setSelectedId(firstInCity.id);
  };

  const updateStatus = (status: FranchiseLocation['status']) => {
    if (!selectedLocation) return;
    const nextLocation = { ...selectedLocation, status };
    const rent = monthlyRentForLocation(nextLocation);
    const nextExpenses = selectedLocation.monthlyExpenses.map((expense) =>
      expense.id === 'rent' ? { ...expense, amount: rent } : expense
    );
    let hasSecurityDeposit = false;
    const capexItems = selectedLocation.capexItems.map((item) => {
      const isDeposit = item.id === 'lease-deposit' || item.id === 'deposits' || item.label.toLowerCase().includes('deposit');
      if (!isDeposit) return item;
      hasSecurityDeposit = true;
      return { ...item, id: 'lease-deposit', category: 'Deposits', label: 'Lease security deposit - 6 months rent', estimatedAmount: rent * 6 };
    });
    updateLocation({
      status,
      monthlyExpenses: nextExpenses,
      capexItems: hasSecurityDeposit
        ? capexItems
        : [
            { id: 'lease-deposit', category: 'Deposits', label: 'Lease security deposit - 6 months rent', estimatedAmount: rent * 6, actualAmount: 0 },
            ...selectedLocation.capexItems,
          ],
    });
  };

  const updateExpense = (expenseId: string, changes: Partial<FranchiseExpense>) => {
    if (!selectedLocation) return;
    updateLocation({
      monthlyExpenses: selectedLocation.monthlyExpenses.map((expense) =>
        expense.id === expenseId ? { ...expense, ...changes } : expense
      ),
    });
  };

  const updateRent = (amount: number) => {
    if (!selectedLocation) return;
    const hasRent = selectedLocation.monthlyExpenses.some((expense) => expense.id === 'rent');
    const nextExpenses: FranchiseExpense[] = hasRent
      ? selectedLocation.monthlyExpenses.map((expense) =>
          expense.id === 'rent' ? { ...expense, amount } : expense
        )
      : [
          { id: 'rent', label: 'Rent', amount, kind: 'fixed', annualEscalation: 0.05 },
          ...selectedLocation.monthlyExpenses,
        ];
    const nextLocation = { ...selectedLocation, monthlyExpenses: nextExpenses };
    let hasSecurityDeposit = false;
    const nextCapexItems = selectedLocation.capexItems.map((item) => {
      const isDeposit = item.id === 'lease-deposit' || item.id === 'deposits' || item.label.toLowerCase().includes('deposit');
      if (!isDeposit) return item;
      hasSecurityDeposit = true;
      return { ...item, id: 'lease-deposit', category: 'Deposits', label: 'Lease security deposit - 6 months rent', estimatedAmount: monthlyRentForLocation(nextLocation) * 6 };
    });
    updateLocation({
      monthlyExpenses: nextExpenses,
      capexItems: hasSecurityDeposit
        ? nextCapexItems
        : [
            { id: 'lease-deposit', category: 'Deposits', label: 'Lease security deposit - 6 months rent', estimatedAmount: monthlyRentForLocation(nextLocation) * 6, actualAmount: 0 },
            ...selectedLocation.capexItems,
          ],
    });
  };

  const updateEquipment = (
    changes: Pick<
      Partial<FranchiseLocation>,
      'hasOwnPharmacy' | 'hasOwnPhysiotherapy' | 'hasOwnLab' | 'hasUltrasound' | 'ultrasoundType' | 'hasXray' | 'hasTmtPft'
    >,
  ) => {
    if (!selectedLocation) return;
    const nextLocation = {
      ...selectedLocation,
      ...changes,
      centerFeatures: applyOwnershipToCenterFeatures(selectedLocation.centerFeatures, {
        hasOwnPharmacy: changes.hasOwnPharmacy ?? selectedLocation.hasOwnPharmacy ?? true,
        hasOwnPhysiotherapy: changes.hasOwnPhysiotherapy ?? selectedLocation.hasOwnPhysiotherapy ?? true,
        hasOwnLab: changes.hasOwnLab ?? selectedLocation.hasOwnLab ?? false,
      }),
    };
    updateLocation({
      ...changes,
      centerFeatures: nextLocation.centerFeatures,
      capexItems: preserveCapexActuals(buildRecommendedCapexItems(nextLocation), selectedLocation.capexItems),
      monthlyExpenses: buildRecommendedOpexItems(nextLocation),
    });
  };

  const addExpense = () => {
    if (!selectedLocation) return;
    updateLocation({
      monthlyExpenses: [
        ...selectedLocation.monthlyExpenses,
        {
          id: `expense-${Date.now()}`,
          label: 'New OPEX item',
          amount: 0,
          kind: 'fixed',
          annualEscalation: 0.05,
        },
      ],
    });
  };

  const removeExpense = (expenseId: string) => {
    if (!selectedLocation) return;
    updateLocation({
      monthlyExpenses: selectedLocation.monthlyExpenses.filter((expense) => expense.id !== expenseId),
    });
  };

  const updateCapexItem = (itemId: string, changes: Partial<FranchiseCapexItem>) => {
    if (!selectedLocation) return;
    updateLocation({
      capexItems: selectedLocation.capexItems.map((item) =>
        item.id === itemId ? { ...item, ...changes } : item
      ),
    });
  };

  const addCapexItem = () => {
    if (!selectedLocation) return;
    updateLocation({
      capexItems: [
        ...selectedLocation.capexItems,
        {
          id: `capex-${Date.now()}`,
          category: 'Other',
          label: 'New capex item',
          estimatedAmount: 0,
          actualAmount: 0,
        },
      ],
    });
  };

  const removeCapexItem = (itemId: string) => {
    if (!selectedLocation) return;
    updateLocation({
      capexItems: selectedLocation.capexItems.filter((item) => item.id !== itemId),
    });
  };

  const updateCenterFeature = (featureId: string, changes: Partial<CenterFeature>) => {
    if (!selectedLocation) return;
    updateLocation({
      centerFeatures: selectedLocation.centerFeatures.map((feature) =>
        feature.id === featureId ? { ...feature, ...changes } : feature
      ),
    });
  };

  const addCenterFeature = () => {
    if (!selectedLocation) return;
    updateLocation({
      centerFeatures: [
        ...selectedLocation.centerFeatures,
        {
          id: `feature-${Date.now()}`,
          category: 'Other',
          title: 'New center feature',
          description: '',
          enabled: true,
        },
      ],
    });
  };

  const removeCenterFeature = (featureId: string) => {
    if (!selectedLocation) return;
    updateLocation({
      centerFeatures: selectedLocation.centerFeatures.filter((feature) => feature.id !== featureId),
    });
  };

  const autoBuildFinancials = () => {
    if (!selectedLocation) return;
    const centerFeatures = applyOwnershipToCenterFeatures(buildCenterFeaturesForSft(selectedLocation.centerSft), {
      hasOwnPharmacy: selectedLocation.hasOwnPharmacy ?? true,
      hasOwnPhysiotherapy: selectedLocation.hasOwnPhysiotherapy ?? true,
      hasOwnLab: selectedLocation.hasOwnLab ?? false,
    });
    const generatedLocation = { ...selectedLocation, centerFeatures };
    updateLocation({
      capexType: 'projected',
      centerFeatures,
      capexItems: preserveCapexActuals(buildRecommendedCapexItems(generatedLocation), selectedLocation.capexItems),
      monthlyFootfall: estimatedMonthlyFootfall(generatedLocation),
      revenuePerFootfall: estimatedRevenuePerFootfall(generatedLocation),
      monthlyExpenses: buildRecommendedOpexItems(generatedLocation),
    });
    toast.success('Capex and OPEX rebuilt from SFT and selected features.');
  };

  const addLocation = () => {
    const location = cloneNewLocation();
    setLocations((current) => [location, ...current]);
    setSelectedId(location.id);
  };

  const removeLocation = (id: string) => {
    setLocations((current) => {
      const next = current.filter((location) => location.id !== id);
      setSelectedId(next[0]?.id || '');
      return next.length ? next : [cloneNewLocation()];
    });
  };

  const saveLocations = () => {
    setIsSaving(true);
    fetch('/api/franchise/opportunity', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations, showBenchmark }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || 'Unable to save franchise opportunity assumptions.');
        if (Array.isArray(body?.locations) && body.locations.length) setLocations(body.locations);
        if (body?.shareToken) setShareInfo({ shareToken: body.shareToken, shareCode: body.shareCode, shareCodeExpiresAt: body.shareCodeExpiresAt });
        setUpdatedAt(body?.updatedAt || '');
        setUpdatedBy(body?.updatedBy || '');
        toast.success('Franchise opportunity assumptions saved to Neon.');
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to save franchise opportunity assumptions.');
      })
      .finally(() => setIsSaving(false));
  };

  const resetLocations = () => {
    setLocations(starterLocations);
    setSelectedId(starterLocations[0].id);
    toast.success('Projection assumptions reset locally. Save to update Neon.');
  };

  const copyShareText = async () => {
    if (!shareUrl) return;
    setIsSharing(true);
    try {
      const response = await fetch('/api/franchise/opportunity', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to generate private access code.');
      const nextShareInfo = {
        shareToken: body.shareToken || shareInfo?.shareToken || '',
        shareCode: body.shareCode || '',
        shareCodeExpiresAt: body.shareCodeExpiresAt || '',
      };
      setShareInfo(nextShareInfo);
      const text = `Docty Franchise Opportunity - ${selectedLocation?.name || 'Selected location'}\n${shareUrl}\nAccess code: ${nextShareInfo.shareCode}\nValid till: ${nextShareInfo.shareCodeExpiresAt ? new Date(nextShareInfo.shareCodeExpiresAt).toLocaleString('en-IN') : '24 hours'}`;
      await navigator.clipboard.writeText(text);
      toast.success('Fresh private share code copied. Valid for 24 hours.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate private access code.');
    } finally {
      setIsSharing(false);
    }
  };

  if (!selectedLocation) return null;

  if (isCheckingSession) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6 text-center">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">Staff access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in as an admin staff member to manage franchise opportunity assumptions.
            </p>
            <Button asChild className="mt-5 w-full rounded-md">
              <Link to="/staff/cards">Go to staff login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge className="rounded-md">Staff</Badge>
                <Badge variant="secondary" className="rounded-md">Franchise planning</Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Franchise opportunity planner</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Add proposed locations, compare projected or actual capex, tune monthly expenses, and track conservative month-on-month break-even.
              </p>
              {updatedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last saved {new Date(updatedAt).toLocaleString('en-IN')} {updatedBy ? `by ${updatedBy}` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2 rounded-md" onClick={resetLocations}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button type="button" variant="outline" className="gap-2 rounded-md" onClick={addLocation}>
                <Plus className="h-4 w-4" />
                Add location
              </Button>
              <Button type="button" className="gap-2 rounded-md" onClick={saveLocations} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
          {shareInfo && (
            <div className="mt-5 rounded-md border bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Private opportunity share
                  </h2>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{shareUrl}</p>
                  {shareInfo.shareCode && (
                    <p className="mt-1 text-sm">
                      Access code: <span className="font-bold">{shareInfo.shareCode}</span>
                      {shareInfo.shareCodeExpiresAt ? (
                        <span className="ml-2 text-muted-foreground">
                          valid till {new Date(shareInfo.shareCodeExpiresAt).toLocaleString('en-IN')}
                        </span>
                      ) : null}
                    </p>
                  )}
                  <label className="mt-3 flex w-fit items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={showBenchmark}
                      onChange={(event) => setShowBenchmark(event.target.checked)}
                    />
                    Show Manikonda benchmark on shared pages
                  </label>
                </div>
                <Button type="button" variant="outline" className="w-fit gap-2 rounded-md" onClick={() => void copyShareText()} disabled={isSharing}>
                  {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Generate & copy private link
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-5">
        <Card className="mb-5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-md">Franchise card</Badge>
                  <Badge variant="secondary" className="rounded-md">{centerProfile?.label || 'Size not set'}</Badge>
                  <Badge variant="outline" className="rounded-md capitalize">{selectedLocation.status}</Badge>
                </div>
                <h2 className="truncate text-xl font-bold sm:text-2xl">{selectedLocation.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedLocation.area} | {formatNumber(selectedLocation.centerSft)} SFT | {formatNumber(estimatedFootfall)} estimated monthly footfall | {formatMoney(monthlyRevenue)} monthly revenue
                </p>
              </div>
              <div className="grid w-full gap-3 md:grid-cols-2 xl:max-w-4xl xl:grid-cols-5">
                <div>
                  <Label htmlFor="franchise-city">City</Label>
                  <select
                    id="franchise-city"
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedLocation.area}
                    onChange={(event) => selectCity(event.target.value)}
                  >
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="franchise-location">Location</Label>
                  <select
                    id="franchise-location"
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedLocation.id}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {locationsForSelectedCity.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="franchise-sft">Center SFT</Label>
                  <Input id="franchise-sft" type="number" value={selectedLocation.centerSft} onChange={(event) => updateCenterSft(Number(event.target.value))} />
                </div>
                <div>
                  <Label htmlFor="franchise-rent">Monthly rent</Label>
                  <Input
                    id="franchise-rent"
                    type="number"
                    value={monthlyRent}
                    onChange={(event) => updateRent(Number(event.target.value))}
                    disabled={selectedLocation.status !== 'active'}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedLocation.status === 'active' ? 'Entered rent' : `Estimated at Rs.105/SFT: ${formatMoney(estimatedRent)}`}
                  </p>
                </div>
                <div>
                  <Label htmlFor="franchise-status">Status</Label>
                  <select
                    id="franchise-status"
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedLocation.status}
                    onChange={(event) => updateStatus(event.target.value as FranchiseLocation['status'])}
                  >
                    <option value="planned">Planned</option>
                    <option value="projected">Projected</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-md border bg-slate-50 p-3 text-sm md:grid-cols-2 xl:grid-cols-6">
              <label className="flex items-center justify-between gap-3 rounded-md bg-white p-3">
                <span>
                  <span className="block font-semibold">Own Pharmacy</span>
                  <span className="text-xs text-muted-foreground">Include pharmacy margin and operations</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selectedLocation.hasOwnPharmacy ?? true}
                  onChange={(event) => updateEquipment({ hasOwnPharmacy: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md bg-white p-3">
                <span>
                  <span className="block font-semibold">Own Physiotherapy</span>
                  <span className="text-xs text-muted-foreground">Include physio revenue, OPEX and setup</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selectedLocation.hasOwnPhysiotherapy ?? true}
                  onChange={(event) => updateEquipment({ hasOwnPhysiotherapy: event.target.checked })}
                />
              </label>
              <label className={`flex items-center justify-between gap-3 rounded-md bg-white p-3 ${centerProfile?.labType === 'in-house-testing' ? 'opacity-75' : ''}`}>
                <span>
                  <span className="block font-semibold">Own Lab</span>
                  <span className="text-xs text-muted-foreground">
                    {centerProfile?.labType === 'in-house-testing' ? 'Included for this size' : 'Upgrade to in-house testing'}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={centerProfile?.labType === 'in-house-testing' || Boolean(selectedLocation.hasOwnLab)}
                  disabled={centerProfile?.labType === 'in-house-testing'}
                  onChange={(event) => updateEquipment({ hasOwnLab: event.target.checked })}
                />
              </label>
              <label className={`flex flex-col gap-2 rounded-md bg-white p-3 ${centerProfile?.ultrasound === 'none' ? 'opacity-60' : ''}`}>
                <span>
                  <span className="block font-semibold">Ultrasound</span>
                  <span className="text-xs text-muted-foreground">
                    {centerProfile?.ultrasound === 'none' ? 'Not available for this size' : 'Basic Rs.28L / Advanced Rs.40L'}
                  </span>
                </span>
                <select
                  className="h-9 rounded-md border border-input bg-white px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={selectedLocation.hasUltrasound ? selectedLocation.ultrasoundType || centerProfile?.ultrasound || 'none' : 'none'}
                  disabled={centerProfile?.ultrasound === 'none'}
                  onChange={(event) => {
                    const ultrasoundType = event.target.value as FranchiseLocation['ultrasoundType'];
                    updateEquipment({ hasUltrasound: ultrasoundType !== 'none', ultrasoundType });
                  }}
                >
                  <option value="none">None</option>
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className={`flex items-center justify-between gap-3 rounded-md bg-white p-3 ${!centerProfile?.xray ? 'opacity-60' : ''}`}>
                <span>
                  <span className="block font-semibold">X-ray</span>
                  <span className="text-xs text-muted-foreground">{centerProfile?.xray ? 'Rs.12.5L' : 'Available in 2800-3500 SFT'}</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selectedLocation.hasXray && Boolean(centerProfile?.xray)}
                  disabled={!centerProfile?.xray}
                  onChange={(event) => updateEquipment({ hasXray: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md bg-white p-3">
                <span>
                  <span className="block font-semibold">TMT & PFT</span>
                  <span className="text-xs text-muted-foreground">Optional, Rs.2.5L</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={selectedLocation.hasTmtPft}
                  onChange={(event) => updateEquipment({ hasTmtPft: event.target.checked })}
                />
              </label>
            </div>

            <details className="mt-4 rounded-md border bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-bold">Assumptions</summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label htmlFor="franchise-name">Location name</Label>
                  <Input id="franchise-name" value={selectedLocation.name} onChange={(event) => updateLocation({ name: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="franchise-area">City / area</Label>
                  <Input id="franchise-area" value={selectedLocation.area} onChange={(event) => updateLocation({ area: event.target.value })} />
                </div>
                <div className="rounded-md bg-white p-3 text-sm">
                  <p className="font-semibold text-muted-foreground">Estimated revenue / visit</p>
                  <p className="mt-1 font-bold">{formatMoney(estimatedRevenuePerVisit)}</p>
                </div>
                <div className="rounded-md bg-white p-3 text-sm">
                  <p className="font-semibold text-muted-foreground">Lease security deposit</p>
                  <p className="mt-1 font-bold">{formatMoney(securityDeposit)}</p>
                </div>
                <div className="rounded-md bg-white p-3 text-sm">
                  <p className="font-semibold text-muted-foreground">PDF Capex / OPEX band</p>
                  <p className="mt-1 font-bold">
                    {centerProfile ? `${formatMoney(centerProfile.capexMin)}-${formatMoney(centerProfile.capexMax)} / ${formatMoney(centerProfile.opexMin)}-${formatMoney(centerProfile.opexMax)}` : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="gap-2 rounded-md" onClick={addLocation}>
                  <Plus className="h-4 w-4" />
                  Add location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 rounded-md text-destructive hover:text-destructive"
                  onClick={() => removeLocation(selectedLocation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove location
                </Button>
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="mb-5">
          <h2 className="mb-3 text-lg font-bold">Investor Snapshot</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Estimated Capex', value: formatMoney(estimatedCapex), note: 'Setup Capex; excludes fee and WCSD' },
            { label: 'Docty Share', value: formatMoney(doctyCapex), note: 'Based on Estimated Capex' },
            { label: 'Investor Share', value: formatMoney(ownerCapex), note: 'Based on Estimated Capex' },
            { label: 'Owner only Funding', value: formatMoney(ownerOnlyFunding), note: `Fee ${formatMoney(focoRules.franchiseFee)} + WCSD ${formatMoney(wcsd)}` },
            { label: 'Initial Owner Investment', value: formatMoney(initialInvestment), note: 'Investor share + owner-only funding' },
            { label: '18-Month Funding Buffer', value: formatMoney(eighteenMonthFunding), note: 'Projected operating shortfall' },
            { label: 'Total Investment', value: formatMoney(totalInvestment), note: 'Initial owner investment + buffer' },
            { label: 'Monthly Expenses', value: formatMoney(monthlyExpenses), note: `${selectedLocation.monthlyExpenses.length} expense heads` },
            { label: 'Base Monthly Revenue', value: formatMoney(monthlyRevenue), note: '50% capacity assumption' },
            { label: 'Optimal Monthly Revenue', value: formatMoney(optimalMonthlyRevenue), note: '75% capacity view' },
            { label: 'Max Monthly Revenue', value: formatMoney(maxMonthlyRevenue), note: '100% capacity view' },
            { label: 'ROI', value: formatPercent(roi), note: 'Year-5 annualized P/L / total investment' },
            { label: 'ROI 3Yrs', value: formatPercent(roi3Years), note: 'Cumulative 36-month P/L / total investment' },
            { label: 'ROI 5Yrs', value: formatPercent(roi5Years), note: 'Cumulative 60-month P/L / total investment' },
            { label: 'Investment Breakeven (Month)', value: investmentBreakEvenMonth ? `Month ${investmentBreakEvenMonth}` : 'Beyond 5 years', note: 'Cumulative cash flow turns positive' },
            { label: 'Projected Profits (Cumulative)', value: formatMoney(fiveYearOperatingProfit), note: 'Total projected operating P/L over 60 months' },
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
        </div>

        <Card className="mb-5 min-w-0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
                  <LineChart className="h-5 w-5 text-primary" />
                  5-year projection
                </h2>
                <p className="text-sm text-muted-foreground">Max can accelerate from month 13; Optimal accelerates from month 15 with a more gradual ramp.</p>
              </div>
              <Badge variant={month18?.operatingProfit && month18.operatingProfit >= 0 ? 'default' : 'secondary'} className="w-fit rounded-md">
                Month 18: {formatMoney(month18?.operatingProfit || 0)}
              </Badge>
            </div>
            <ChartContainer config={projectionChartConfig} className="h-[360px] w-full min-w-0 max-w-none overflow-hidden [aspect-ratio:auto]">
              <RechartsLineChart data={projectionChartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickFormatter={(value) => `M${value}`} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 100000}L`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="optimalRevenue" stroke="var(--color-optimalRevenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="maxRevenue" stroke="var(--color-maxRevenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="operatingProfit" stroke="var(--color-operatingProfit)" strokeWidth={2} dot={false} />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {showBenchmark && (
        <>
        <Card className="mb-5 min-w-0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold sm:text-xl">
              <LineChart className="h-5 w-5 text-primary" />
              Cumulative PnL
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">Hockey-stick view of cumulative operating PnL for Base, Optimal, and Max models.</p>
            <ChartContainer config={projectionChartConfig} className="h-[340px] w-full min-w-0 max-w-none overflow-hidden [aspect-ratio:auto]">
              <RechartsLineChart data={projectionChartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickFormatter={(value) => `M${value}`} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 100000}L`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cumulativePnl" stroke="var(--color-cumulativePnl)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumulativeOptimalPnl" stroke="var(--color-cumulativeOptimalPnl)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumulativeMaxPnl" stroke="var(--color-cumulativeMaxPnl)" strokeWidth={2} dot={false} />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="mb-5 min-w-0 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
                  <Building2 className="h-5 w-5 text-primary" />
                  Projected vs Manikonda Actuals
                </h2>
                <p className="text-sm text-muted-foreground">Benchmark projected ramp against operating actuals from the Manikonda center.</p>
              </div>
              <Badge variant="outline" className="w-fit rounded-md">Benchmark actuals</Badge>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['Actual revenue', formatMoney(manikondaBenchmark.monthlyRevenue)],
                ['Actual OPEX', formatMoney(manikondaBenchmark.monthlyExpenses)],
                ['Actual P/L', formatMoney(manikondaBenchmark.monthlyOperatingProfit)],
                ['Actual footfall', formatNumber(manikondaBenchmark.monthlyFootfall)],
                ['Revenue / visit', formatMoney(manikondaBenchmark.revenuePerFootfall)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <ChartContainer config={projectionChartConfig} className="h-[320px] w-full min-w-0 max-w-none overflow-hidden [aspect-ratio:auto]">
              <RechartsLineChart data={projectionChartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickFormatter={(value) => `M${value}`} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${Number(value) / 100000}L`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="manikondaRevenue" stroke="var(--color-manikondaRevenue)" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                <Line type="monotone" dataKey="operatingProfit" stroke="var(--color-operatingProfit)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="manikondaOperatingProfit" stroke="var(--color-manikondaOperatingProfit)" strokeWidth={2} strokeDasharray="6 6" dot={false} />
              </RechartsLineChart>
            </ChartContainer>
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Checkpoint</TableHead>
                    <TableHead className="text-right">Projected revenue</TableHead>
                    <TableHead className="text-right">Projected P/L</TableHead>
                    <TableHead className="text-right">Revenue variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarkCheckpoints.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-semibold">Month {row.month}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.revenue)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.operatingProfit)}</TableCell>
                      <TableCell className="text-right">{formatPercent(row.revenueVariance * 100)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </>
        )}

        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-bold">ROI with Base, Optimal & Max Revenue</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {revenueScenarioMetrics.map((scenario) => (
                  <div key={scenario.label} className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-muted-foreground">{scenario.label}</p>
                    <p className="mt-2 text-2xl font-bold">{formatPercent(scenario.roi)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-bold">Cumulative Profits with Base, Optimal & Max Revenue</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {revenueScenarioMetrics.map((scenario) => (
                  <div key={scenario.label} className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-muted-foreground">{scenario.label}</p>
                    <p className="mt-2 text-2xl font-bold">{formatMoney(scenario.cumulativeProfit)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card className="shadow-sm">
              <CardContent className="space-y-4 p-4">
                <h2 className="text-lg font-bold">FOCO rules</h2>
                <div className="grid gap-3 text-sm">
                  {[
                    ['Owner capex share', `${Math.round(focoRules.franchiseOwnerCapexShare * 100)}%`],
                    ['Docty capex share', `${Math.round(focoRules.doctyCapexShare * 100)}%`],
                    ['Franchise fee', `${formatMoney(focoRules.franchiseFee)} - owner only, outside Capex`],
                    ['WCSD', `${focoRules.wcsdMonths} months of OPEX - owner only, outside Capex`],
                    ['Management fee', `${formatMoney(focoRules.monthlyManagementFee)} / month`],
                    ['Annual fee escalation', `${Math.round(focoRules.managementFeeAnnualEscalation * 100)}%`],
                    ['Break-even target', `Month ${focoRules.breakEvenTargetMonth}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-right font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-5">
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Center features</h2>
                    <p className="text-sm text-muted-foreground">
                      Define the facilities, services, technology, and operating capabilities for this center.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="w-fit gap-2 rounded-md" onClick={addCenterFeature}>
                    <Plus className="h-4 w-4" />
                    Add feature
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Show</TableHead>
                        <TableHead className="min-w-44">Category</TableHead>
                        <TableHead className="min-w-52">Feature</TableHead>
                        <TableHead className="min-w-80">Description</TableHead>
                        <TableHead className="w-14" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLocation.centerFeatures.map((feature) => (
                        <TableRow key={feature.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input accent-primary"
                              checked={feature.enabled}
                              onChange={(event) => updateCenterFeature(feature.id, { enabled: event.target.checked })}
                              aria-label={`Show ${feature.title}`}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                              value={feature.category}
                              onChange={(event) => updateCenterFeature(feature.id, { category: event.target.value })}
                            >
                              {centerFeatureCategories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-9"
                              value={feature.title}
                              onChange={(event) => updateCenterFeature(feature.id, { title: event.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-9"
                              value={feature.description}
                              onChange={(event) => updateCenterFeature(feature.id, { description: event.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeCenterFeature(feature.id)}
                              disabled={selectedLocation.centerFeatures.length <= 1}
                              aria-label="Remove center feature"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">Auto-build financial assumptions</h2>
                  <p className="text-sm text-muted-foreground">
                    Uses the PDF size band, price per SFT, capex/OPEX ranges, and enabled center features.
                  </p>
                  {centerProfile && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {centerProfile.label}: {formatMoney(centerProfile.capexMin)} - {formatMoney(centerProfile.capexMax)} Capex, {formatMoney(centerProfile.opexMin)} - {formatMoney(centerProfile.opexMax)} monthly OPEX.
                    </p>
                  )}
                </div>
                <Button type="button" className="w-fit gap-2 rounded-md" onClick={autoBuildFinancials}>
                  <Calculator className="h-4 w-4" />
                  Auto-build Capex & OPEX
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="border-b p-4 sm:p-5">
                  <h2 className="text-lg font-bold sm:text-xl">Revenue assumptions</h2>
                  <p className="text-sm text-muted-foreground">All service lines use a 50% capacity assumption.</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead className="hidden md:table-cell">Basis</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Ticket</TableHead>
                        <TableHead className="text-right">Monthly</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueComponents.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell className="font-semibold">{component.label}</TableCell>
                          <TableCell className="hidden max-w-md text-sm text-muted-foreground md:table-cell">{component.note}</TableCell>
                          <TableCell className="text-right">{formatNumber(component.monthlyVolume)}</TableCell>
                          <TableCell className="text-right">{formatMoney(component.ticketSize)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(component.monthlyRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h2 className="text-lg font-bold sm:text-xl">Capex builder</h2>
                    <p className="text-sm text-muted-foreground">
                      Categorize each setup item and track estimate versus actual spend.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="w-fit gap-2 rounded-md" onClick={addCapexItem}>
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-44">Category</TableHead>
                        <TableHead className="min-w-56">Item</TableHead>
                        <TableHead className="w-36 text-right">Estimate</TableHead>
                        <TableHead className="w-36 text-right">Actual</TableHead>
                        <TableHead className="w-32 text-right">Variance</TableHead>
                        <TableHead className="w-14" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLocation.capexItems.map((item) => {
                        const variance = Number(item.actualAmount || 0) - Number(item.estimatedAmount || 0);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <select
                                className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                value={item.category}
                                onChange={(event) => updateCapexItem(item.id, { category: event.target.value })}
                              >
                                {capexCategories.map((category) => (
                                  <option key={category} value={category}>{category}</option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-9"
                                value={item.label}
                                onChange={(event) => updateCapexItem(item.id, { label: event.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="ml-auto h-9 text-right"
                                value={item.estimatedAmount}
                                onChange={(event) => updateCapexItem(item.id, { estimatedAmount: Number(event.target.value) })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="ml-auto h-9 text-right"
                                value={item.actualAmount}
                                onChange={(event) => updateCapexItem(item.id, { actualAmount: Number(event.target.value) })}
                              />
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${variance > 0 ? 'text-destructive' : variance < 0 ? 'text-emerald-700' : ''}`}>
                              {formatMoney(variance)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeCapexItem(item.id)}
                                disabled={selectedLocation.capexItems.length <= 1}
                                aria-label="Remove capex item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid gap-3 border-t p-4 text-sm sm:grid-cols-3 sm:p-5">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="font-semibold text-muted-foreground">Estimated capex</p>
                    <p className="mt-1 text-lg font-bold">{formatMoney(estimatedCapex)}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="font-semibold text-muted-foreground">Actual capex</p>
                    <p className="mt-1 text-lg font-bold">{formatMoney(actualCapex)}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="font-semibold text-muted-foreground">Variance</p>
                    <p className={`mt-1 text-lg font-bold ${actualCapex - estimatedCapex > 0 ? 'text-destructive' : actualCapex > 0 ? 'text-emerald-700' : ''}`}>
                      {formatMoney(actualCapex ? actualCapex - estimatedCapex : 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card className="min-w-0 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <h2 className="mb-4 text-lg font-bold sm:text-xl">Monthly expense mix</h2>
                  <ChartContainer config={expenseChartConfig} className="h-[250px] min-w-0 max-w-full overflow-hidden">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={normalizedExpenseRows}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={92}
                        paddingAngle={2}
                      >
                        {normalizedExpenseRows.map((expense, index) => (
                          <Cell key={expense.id} fill={expenseSliceColors[index % expenseSliceColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-4 grid gap-2">
                    {normalizedExpenseRows.map((expense, index) => {
                      const share = monthlyExpenses > 0 ? (Number(expense.amount || 0) * 100) / monthlyExpenses : 0;
                      return (
                        <div key={expense.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{ backgroundColor: expenseSliceColors[index % expenseSliceColors.length] }}
                            />
                            <span className="truncate font-medium">{expense.label}</span>
                          </span>
                          <span className="shrink-0 text-right text-muted-foreground">
                            {formatMoney(expense.amount)} · {Math.round(share)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                      <h2 className="text-lg font-bold sm:text-xl">OPEX assumptions</h2>
                      <p className="text-sm text-muted-foreground">Define recurring expense heads and annual escalation.</p>
                    </div>
                    <Button type="button" variant="outline" className="w-fit gap-2 rounded-md" onClick={addExpense}>
                      <Plus className="h-4 w-4" />
                      Add OPEX
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-56">Expense</TableHead>
                          <TableHead className="min-w-32">Type</TableHead>
                          <TableHead className="w-36 text-right">Monthly</TableHead>
                          <TableHead className="w-36 text-right">Escalation</TableHead>
                          <TableHead className="w-14" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLocation.monthlyExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <Input
                                className="h-9"
                                value={expense.label}
                                onChange={(event) => updateExpense(expense.id, { label: event.target.value })}
                              />
                            </TableCell>
                            <TableCell>
                              <select
                                className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm capitalize outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                value={expense.kind}
                                onChange={(event) => updateExpense(expense.id, { kind: event.target.value as FranchiseExpense['kind'] })}
                              >
                                <option value="fixed">Fixed</option>
                                <option value="variable">Variable</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="ml-auto h-9 text-right"
                                value={expense.amount}
                                onChange={(event) => updateExpense(expense.id, { amount: Number(event.target.value) })}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="ml-auto h-9 text-right"
                                value={Math.round(Number(expense.annualEscalation || 0) * 10000) / 100}
                                onChange={(event) => updateExpense(expense.id, { annualEscalation: Number(event.target.value) / 100 })}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeExpense(expense.id)}
                                disabled={selectedLocation.monthlyExpenses.length <= 1}
                                aria-label="Remove OPEX item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="border-b p-4 sm:p-5">
                  <h2 className="text-lg font-bold sm:text-xl">Month-on-month 5-year projection</h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Footfall</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">OPEX</TableHead>
                        <TableHead className="hidden text-right lg:table-cell">Mgmt fee</TableHead>
                        <TableHead className="hidden text-right lg:table-cell">Waiver</TableHead>
                        <TableHead className="hidden text-right xl:table-cell">Owner funding</TableHead>
                        <TableHead className="text-right">Operating P/L</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Cash flow after initial investment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projection.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-semibold">Month {row.month}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.footfall)}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.revenue)}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{formatMoney(row.opex)}</TableCell>
                          <TableCell className="hidden text-right lg:table-cell">{formatMoney(row.managementFee)}</TableCell>
                          <TableCell className="hidden text-right lg:table-cell">{formatMoney(row.managementFeeWaiver)}</TableCell>
                          <TableCell className="hidden text-right xl:table-cell">{formatMoney(row.ownerFundingRequired)}</TableCell>
                          <TableCell className={`text-right font-semibold ${row.operatingProfit >= 0 ? 'text-emerald-700' : 'text-destructive'}`}>
                            {formatMoney(row.operatingProfit)}
                          </TableCell>
                          <TableCell className="hidden text-right md:table-cell">{formatMoney(row.cumulativeCashFlow)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
