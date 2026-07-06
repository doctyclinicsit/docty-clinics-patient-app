import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, LineChart, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { CartesianGrid, Cell, Line, LineChart as RechartsLineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

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
  baselineLocation,
  buildProjection,
  buildRevenueComponents,
  centerSizeProfileForSft,
  conservativeBaseline,
  doctyCapexContribution,
  eighteenMonthOperatingFundingNeed,
  focoRules,
  formatMoney,
  formatNumber,
  initialInvestmentRequired,
  normalizedMonthlyExpenses,
  ownerCapexContribution,
  projectedMonthlyRevenue,
  totalEstimatedCapex,
  totalMonthlyExpenses,
  workingCapitalSecurityDeposit,
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

interface OpportunityAccessResponse {
  shareCode?: string;
  showBenchmark?: boolean;
  locations?: FranchiseLocation[];
  updatedAt?: string;
  source?: {
    baseline: string;
    projection: string;
  };
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

export default function FranchiseOpportunityPage() {
  const { shareToken } = useParams();
  const [accessCode, setAccessCode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState<OpportunityAccessResponse | null>(null);

  const selectedLocation = access?.locations?.[0] || baselineLocation;
  const projection = useMemo(() => buildProjection(selectedLocation, 60), [selectedLocation]);
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
  const revenueComponents = useMemo(() => buildRevenueComponents(selectedLocation), [selectedLocation]);
  const manikondaBenchmark = useMemo(() => conservativeBaseline(), []);
  const year5 = projection[59];
  const estimatedCapex = totalEstimatedCapex(selectedLocation);
  const ownerCapex = ownerCapexContribution(selectedLocation);
  const doctyCapex = doctyCapexContribution(selectedLocation);
  const wcsd = workingCapitalSecurityDeposit(selectedLocation);
  const ownerOnlyFunding = focoRules.franchiseFee + wcsd;
  const initialInvestment = initialInvestmentRequired(selectedLocation);
  const eighteenMonthFunding = eighteenMonthOperatingFundingNeed(projection);
  const monthlyExpenses = totalMonthlyExpenses(selectedLocation);
  const normalizedExpenseRows = useMemo(() => normalizedMonthlyExpenses(selectedLocation), [selectedLocation]);
  const baseMonthlyRevenue = projectedMonthlyRevenue(selectedLocation);
  const optimalMonthlyRevenue = Math.round(baseMonthlyRevenue * 1.5);
  const maxMonthlyRevenue = Math.round(baseMonthlyRevenue * 2);
  const totalInvestment = initialInvestment + eighteenMonthFunding;
  const roi = totalInvestment > 0 ? ((year5?.operatingProfit || 0) * 12 * 100) / totalInvestment : 0;
  const threeYearOperatingProfit = projection
    .filter((month) => month.month <= 36)
    .reduce((sum, month) => sum + month.operatingProfit, 0);
  const fiveYearOperatingProfit = projection.reduce((sum, month) => sum + month.operatingProfit, 0);
  const roi3Years = totalInvestment > 0 ? (threeYearOperatingProfit * 100) / totalInvestment : 0;
  const roi5Years = totalInvestment > 0 ? (fiveYearOperatingProfit * 100) / totalInvestment : 0;
  const investmentBreakEvenMonth = projection.find((month) => month.cumulativeCashFlow >= 0)?.month || 0;
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
  const enabledFeatures = selectedLocation.centerFeatures.filter((feature) => feature.enabled);
  const centerProfile = centerSizeProfileForSft(selectedLocation.centerSft);
  const month18Projection = projection[17];
  const benchmarkVariance = manikondaBenchmark.monthlyRevenue > 0
    ? ((month18Projection?.revenue || 0) - manikondaBenchmark.monthlyRevenue) / manikondaBenchmark.monthlyRevenue
    : 0;

  const unlock = async (code = accessCode) => {
    if (!shareToken) {
      setError('This private opportunity link is missing its share token.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const locationId = new URLSearchParams(window.location.search).get('locationId') || '';
      const query = new URLSearchParams({ shareToken, shareCode: code.trim() });
      if (locationId) query.set('locationId', locationId);
      const response = await fetch(`/api/franchise/opportunity?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to open this private opportunity page.');
      setAccess(body);
      setIsUnlocked(true);
      if (code.trim()) window.localStorage.setItem(`franchise-opportunity-code:${shareToken}`, code.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open this private opportunity page.');
      setIsUnlocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!shareToken) return;
    const savedCode = window.localStorage.getItem(`franchise-opportunity-code:${shareToken}`) || '';
    if (savedCode) {
      setAccessCode(savedCode);
      void unlock(savedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareToken]);

  if (!isUnlocked) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            <img src="/docty-logo-full.png" alt="Docty Clinics" className="mx-auto mb-5 h-14 w-auto" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-center text-2xl font-bold">Private franchise opportunity</h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter the access code shared by Docty to view the opportunity model.
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <Label htmlFor="access-code">Access code</Label>
                <Input
                  id="access-code"
                  inputMode="numeric"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void unlock();
                  }}
                  placeholder="6-digit code"
                />
              </div>
              {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <Button type="button" className="w-full gap-2 rounded-md" onClick={() => void unlock()} disabled={isLoading || accessCode.length < 4}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Unlock
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className="rounded-md">Private share</Badge>
                <Badge variant="secondary" className="rounded-md">Conservative projection</Badge>
              </div>
              <h1 className="max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">
                Docty Clinics franchise opportunity
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                This model uses Docty operating data and a cautious five-year curve for {selectedLocation.name}, with operational break-even anticipated around 18 months and revenue plateauing after maturity.
              </p>
              {access?.updatedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Scenario last updated {new Date(access.updatedAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>
            <div className="rounded-md border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Source</p>
              <p>{access?.source?.baseline || 'Manikonda baseline'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-5">
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
              { label: 'Base Monthly Revenue', value: formatMoney(baseMonthlyRevenue), note: '50% capacity assumption' },
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

        <div className="space-y-5">
          <Card className="min-w-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold sm:text-xl">
                <LineChart className="h-5 w-5 text-primary" />
                5-year month-on-month projection
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Max can accelerate from month 13; Optimal accelerates from month 15 with a more gradual ramp.</p>
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

          {access?.showBenchmark !== false && (
          <>
          <Card className="min-w-0 shadow-sm">
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

          <Card className="min-w-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold sm:text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                Manikonda Benchmark
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Projected ramp compared with Docty operating actuals from Manikonda.</p>
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Actual monthly revenue', formatMoney(manikondaBenchmark.monthlyRevenue)],
                  ['Actual monthly OPEX', formatMoney(manikondaBenchmark.monthlyExpenses)],
                  ['Actual operating P/L', formatMoney(manikondaBenchmark.monthlyOperatingProfit)],
                  ['Month 18 variance', `${Math.round(benchmarkVariance * 100)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                    <p className="mt-2 text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <ChartContainer config={projectionChartConfig} className="h-[300px] w-full min-w-0 max-w-none overflow-hidden [aspect-ratio:auto]">
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
            </CardContent>
          </Card>
          </>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
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

          <Card className="min-w-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold sm:text-xl">
                <Building2 className="h-5 w-5 text-primary" />
                Indicative OPEX mix
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Monthly expense assumptions for a neighborhood clinic model.</p>
              <ChartContainer config={expenseChartConfig} className="h-[320px] min-w-0 max-w-full overflow-hidden">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={normalizedExpenseRows}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={64}
                    outerRadius={118}
                    paddingAngle={2}
                  >
                    {normalizedExpenseRows.map((expense, index) => (
                      <Cell key={expense.id} fill={expenseSliceColors[index % expenseSliceColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
        </div>

        <Card className="mt-5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <h2 className="mb-4 text-lg font-bold sm:text-xl">FOCO investment rules</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['PDF size profile', `${centerProfile.label} at ${formatMoney(centerProfile.pricePerSft)} / SFT`],
                ['PDF Capex range', `${formatMoney(centerProfile.capexMin)} - ${formatMoney(centerProfile.capexMax)}`],
                ['PDF OPEX range', `${formatMoney(centerProfile.opexMin)} - ${formatMoney(centerProfile.opexMax)} / month`],
                ['Owner capex share', `${Math.round(focoRules.franchiseOwnerCapexShare * 100)}%`],
                ['Docty capex share', `${Math.round(focoRules.doctyCapexShare * 100)}%`],
                ['Franchise fee', `${formatMoney(focoRules.franchiseFee)} - owner only, outside Capex`],
                ['WCSD', `${focoRules.wcsdMonths} months of OPEX - owner only, outside Capex`],
                ['Management fee', `${formatMoney(focoRules.monthlyManagementFee)} / month`],
                ['Annual fee escalation', `${Math.round(focoRules.managementFeeAnnualEscalation * 100)}%`],
                ['Break-even target', `Month ${focoRules.breakEvenTargetMonth}`],
                ['Post target shortfall', 'Management fee waiver, capped by fees collected'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-slate-50 p-3">
                  <p className="font-semibold text-muted-foreground">{label}</p>
                  <p className="mt-1 font-bold">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <h2 className="mb-1 text-lg font-bold sm:text-xl">Center features</h2>
            <p className="mb-4 text-sm text-muted-foreground">Facilities, services, and operating capabilities planned for this center.</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {enabledFeatures.map((feature) => (
                <div key={feature.id} className="rounded-md border bg-white p-4">
                  <Badge variant="secondary" className="mb-3 rounded-md">{feature.category}</Badge>
                  <h3 className="font-bold">{feature.title}</h3>
                  {feature.description && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b p-4 sm:p-5">
              <h2 className="text-lg font-bold sm:text-xl">Revenue assumptions</h2>
              <p className="text-sm text-muted-foreground">Service-wise monthly revenue at 50% capacity.</p>
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

        <Card className="mt-5 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b p-4 sm:p-5">
              <h2 className="text-lg font-bold sm:text-xl">Capex breakdown</h2>
              <p className="text-sm text-muted-foreground">Categorized estimate and actual setup spend.</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedLocation.capexItems.map((item) => {
                    const variance = Number(item.actualAmount || 0) - Number(item.estimatedAmount || 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="font-semibold">{item.label}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.estimatedAmount)}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.actualAmount)}</TableCell>
                        <TableCell className={`text-right font-semibold ${variance > 0 ? 'text-destructive' : variance < 0 ? 'text-emerald-700' : ''}`}>
                          {formatMoney(variance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b p-4 sm:p-5">
              <h2 className="text-lg font-bold sm:text-xl">OPEX assumptions</h2>
              <p className="text-sm text-muted-foreground">Recurring monthly expense heads and annual escalation used in projections.</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead className="text-right">Annual escalation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedExpenseRows.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-semibold">{expense.label}</TableCell>
                      <TableCell className="hidden capitalize sm:table-cell">{expense.kind}</TableCell>
                      <TableCell className="text-right">{formatMoney(expense.amount)}</TableCell>
                      <TableCell className="text-right">{Math.round(Number(expense.annualEscalation || 0) * 10000) / 100}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 shadow-sm">
          <CardContent className="p-0">
            <div className="border-b p-4 sm:p-5">
              <h2 className="text-lg font-bold sm:text-xl">Projection table</h2>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
