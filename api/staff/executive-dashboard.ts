import { readAdminStaffSession } from '../../server/staff-admin.js';
import {
  HISTORICAL_SALES_DATA_ISSUES,
  HISTORICAL_SALES_ROWS,
  type HistoricalSalesRow,
} from '../../server/executive-historical-sales.js';
import {
  EXECUTIVE_MANIKONDA_2025_SALES_DATA_ISSUES,
  EXECUTIVE_MANIKONDA_2025_SALES_ROWS,
} from '../../server/executive-2025-manikonda-sales.js';
import {
  EXECUTIVE_JUNE_CLINIC_SALES_DATA_ISSUES,
  EXECUTIVE_JUNE_CLINIC_SALES_ROWS,
} from '../../server/executive-june-clinic-sales.js';
import {
  EXECUTIVE_JUNE_PHARMACY_GST_BREAKDOWN,
  EXECUTIVE_JUNE_PHARMACY_SALES_DATA_ISSUES,
  EXECUTIVE_JUNE_PHARMACY_SALES_ROWS,
  EXECUTIVE_JUNE_PHARMACY_TOP_MEDICINES,
  EXECUTIVE_JUNE_PHARMACY_TOTALS,
} from '../../server/executive-june-pharmacy-sales.js';
import {
  EXECUTIVE_MANIKONDA_OPEX_DATA_ISSUES,
  EXECUTIVE_MANIKONDA_OPEX_ROWS,
} from '../../server/executive-manikonda-opex.js';
import {
  EXECUTIVE_LANCO_OPEX_DATA_ISSUES,
  EXECUTIVE_LANCO_OPEX_ROWS,
} from '../../server/executive-lanco-opex.js';

const EXECUTIVE_DASHBOARD_SHARE_TOKEN =
  process.env.EXECUTIVE_DASHBOARD_SHARE_TOKEN || 'dcty-investor-2026-6fb7b688c6fd4b8fbf61a95e8c1b35d2';
const EXECUTIVE_DASHBOARD_SHARE_CODE = process.env.EXECUTIVE_DASHBOARD_SHARE_CODE || '742619';

interface ExecutiveSalesRow {
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
  lineItems?: number;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDate(value: unknown) {
  const date = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
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

function monthKey(value: string) {
  return value.slice(0, 7);
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(
    new Date(`${value}-01T00:00:00Z`)
  );
}

function historicalRowWithLocation(row: HistoricalSalesRow): ExecutiveSalesRow {
  return {
    ...row,
    location: 'Docty Clinics Manikonda',
    totalBill: row.revenue,
    discount: 0,
  };
}

function formatSourceRange(rows: ExecutiveSalesRow[]) {
  const sources = Array.from(new Set(rows.map((row) => row.source))).sort();
  const firstDate = rows[0]?.date || '';
  const lastDate = rows.at(-1)?.date || '';
  return { sources, firstDate, lastDate };
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  const shareToken = text(request.query?.shareToken);
  const shareCode = text(request.query?.shareCode);
  const hasShareToken = shareToken && shareToken === EXECUTIVE_DASHBOARD_SHARE_TOKEN;
  const hasShareAccess = hasShareToken && shareCode === EXECUTIVE_DASHBOARD_SHARE_CODE;
  if (adminSession.status !== 200 && hasShareToken && !hasShareAccess) {
    return response.status(403).json({ message: 'Please enter the 6-digit investor access code.' });
  }
  if (adminSession.status !== 200 && !hasShareAccess) {
    return response.status(401).json({ message: 'Please sign in as an admin staff member.' });
  }

  const allRows: ExecutiveSalesRow[] = [
    ...EXECUTIVE_MANIKONDA_2025_SALES_ROWS.map(historicalRowWithLocation),
    ...HISTORICAL_SALES_ROWS.map(historicalRowWithLocation),
    ...EXECUTIVE_JUNE_CLINIC_SALES_ROWS,
    ...EXECUTIVE_JUNE_PHARMACY_SALES_ROWS,
  ].sort((a, b) => a.date.localeCompare(b.date) || a.location.localeCompare(b.location) || a.category.localeCompare(b.category));
  const allDates = allRows.map((row) => row.date).sort();
  const fallbackEndDate = allDates.at(-1) || todayDate();
  const fallbackStartDate = allDates[0] || addDays(fallbackEndDate, -29);
  const startDate = parseDate(request.query?.startDate) || fallbackStartDate;
  const endDate = parseDate(request.query?.endDate) || fallbackEndDate;
  const categoryFilter = text(request.query?.category);
  const locationFilter = text(request.query?.location);

  if (startDate > endDate) {
    return response.status(400).json({ message: 'Start date must be before end date.' });
  }

  const dateLocationRows = allRows.filter((row) => {
    if (row.date < startDate || row.date > endDate) return false;
    if (locationFilter && locationFilter !== 'all' && row.location !== locationFilter) return false;
    return true;
  });
  const selectedRows = dateLocationRows.filter((row) => {
    if (categoryFilter === 'clinics') return row.category !== 'Pharmacy';
    return categoryFilter && categoryFilter !== 'all' ? row.category === categoryFilter : true;
  });

  const categoryRows = new Map<string, { category: string; footfall: number; revenue: number; days: Set<string> }>();
  const monthlyRows = new Map<string, { month: string; label: string; footfall: number; revenue: number; pharmacyRevenue: number; clinicRevenue: number }>();
  const dailyRows = new Map<string, { date: string; day: string; footfall: number; revenue: number; pharmacyRevenue: number; clinicRevenue: number }>();
  const weekdayRows = new Map<string, { day: string; footfall: number; revenue: number }>();
  const locationRows = new Map<string, { location: string; footfall: number; revenue: number; totalBill: number; discount: number; categories: Set<string>; days: Set<string> }>();

  selectedRows.forEach((row) => {
    const category = categoryRows.get(row.category) || {
      category: row.category,
      footfall: 0,
      revenue: 0,
      days: new Set<string>(),
    };
    category.footfall += row.footfall;
    category.revenue += row.revenue;
    category.days.add(row.date);
    categoryRows.set(row.category, category);

    const key = monthKey(row.date);
    const month = monthlyRows.get(key) || {
      month: key,
      label: monthLabel(key),
      footfall: 0,
      revenue: 0,
      pharmacyRevenue: 0,
      clinicRevenue: 0,
    };
    month.footfall += row.footfall;
    month.revenue += row.revenue;
    if (row.category === 'Pharmacy') month.pharmacyRevenue += row.revenue;
    else month.clinicRevenue += row.revenue;
    monthlyRows.set(key, month);

    const day = dailyRows.get(row.date) || {
      date: row.date,
      day: row.day,
      footfall: 0,
      revenue: 0,
      pharmacyRevenue: 0,
      clinicRevenue: 0,
    };
    day.footfall += row.footfall;
    day.revenue += row.revenue;
    if (row.category === 'Pharmacy') day.pharmacyRevenue += row.revenue;
    else day.clinicRevenue += row.revenue;
    dailyRows.set(row.date, day);

    const weekday = weekdayRows.get(row.day) || { day: row.day, footfall: 0, revenue: 0 };
    weekday.footfall += row.footfall;
    weekday.revenue += row.revenue;
    weekdayRows.set(row.day, weekday);

    const location = locationRows.get(row.location) || {
      location: row.location,
      footfall: 0,
      revenue: 0,
      totalBill: 0,
      discount: 0,
      categories: new Set<string>(),
      days: new Set<string>(),
    };
    location.footfall += row.footfall;
    location.revenue += row.revenue;
    location.totalBill += row.totalBill ?? row.revenue;
    location.discount += row.discount ?? 0;
    location.categories.add(row.category);
    location.days.add(row.date);
    locationRows.set(row.location, location);
  });

  const totalRevenue = selectedRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalFootfall = selectedRows.reduce((sum, row) => sum + row.footfall, 0);
  const pharmacyRevenue = selectedRows
    .filter((row) => row.category === 'Pharmacy')
    .reduce((sum, row) => sum + row.revenue, 0);
  const revenueCardPharmacyRevenue = dateLocationRows
    .filter((row) => row.category === 'Pharmacy')
    .reduce((sum, row) => sum + row.revenue, 0);
  const revenueCardClinicRevenue = dateLocationRows
    .filter((row) => row.category !== 'Pharmacy')
    .reduce((sum, row) => sum + row.revenue, 0);
  const revenueCardTotalRevenue = revenueCardPharmacyRevenue + revenueCardClinicRevenue;
  const selectedPharmacyRows = selectedRows.filter((row) => row.category === 'Pharmacy');
  const selectedJunePharmacyRows = EXECUTIVE_JUNE_PHARMACY_SALES_ROWS.filter((row) => {
    if (row.date < startDate || row.date > endDate) return false;
    if (locationFilter && locationFilter !== 'all' && row.location !== locationFilter) return false;
    return !categoryFilter || categoryFilter === 'all' || categoryFilter === 'Pharmacy';
  });
  const selectedJunePharmacyRevenue = selectedJunePharmacyRows.reduce((sum, row) => sum + row.revenue, 0);
  const selectedJunePharmacyBills = selectedJunePharmacyRows.reduce((sum, row) => sum + row.footfall, 0);
  const selectedJunePharmacyLineItems = selectedJunePharmacyRows.reduce((sum, row) => sum + (row.lineItems || 0), 0);
  const selectedJunePharmacyActiveDays = new Set(selectedJunePharmacyRows.map((row) => row.date)).size;
  const selectedJunePharmacyLocations = new Set(selectedJunePharmacyRows.map((row) => row.location));
  const selectedJunePharmacyLocationRows = Array.from(
    selectedJunePharmacyRows
      .reduce((map, row) => {
        const location = map.get(row.location) || {
          location: row.location,
          source: row.source,
          revenue: 0,
          bills: 0,
          lineItems: 0,
          activeDays: new Set<string>(),
        };
        location.revenue += row.revenue;
        location.bills += row.footfall;
        location.lineItems += row.lineItems || 0;
        location.activeDays.add(row.date);
        map.set(row.location, location);
        return map;
      }, new Map<string, { location: string; source: string; revenue: number; bills: number; lineItems: number; activeDays: Set<string> }>())
      .values()
  )
    .map((row) => ({
      location: row.location,
      source: row.source,
      revenue: row.revenue,
      bills: row.bills,
      lineItems: row.lineItems,
      averageBillValue: row.bills ? row.revenue / row.bills : 0,
      activeDays: row.activeDays.size,
    }))
    .sort((a, b) => b.revenue - a.revenue || a.location.localeCompare(b.location));
  const selectedJunePharmacyDailyRows = Array.from(
    selectedJunePharmacyRows
      .reduce((map, row) => {
        const day = map.get(row.date) || {
          date: row.date,
          week: row.week,
          day: row.day,
          category: 'Pharmacy',
          footfall: 0,
          revenue: 0,
          location: 'All pharmacy locations',
          source: row.source,
          totalBill: 0,
          discount: 0,
          lineItems: 0,
        };
        day.footfall += row.footfall;
        day.revenue += row.revenue;
        day.totalBill = (day.totalBill ?? 0) + (row.totalBill ?? row.revenue);
        day.discount = (day.discount ?? 0) + (row.discount ?? 0);
        day.lineItems += row.lineItems || 0;
        map.set(row.date, day);
        return map;
      }, new Map<string, ExecutiveSalesRow & { lineItems: number }>())
      .values()
  ).sort((a, b) => b.date.localeCompare(a.date));
  const selectedJunePharmacyGstBreakdown = Array.from(
    EXECUTIVE_JUNE_PHARMACY_GST_BREAKDOWN.filter((row) => {
      return !locationFilter || locationFilter === 'all' || row.location === locationFilter;
    })
      .reduce((map, row) => {
        const key = row.gstPercentage || 'Unknown';
        const summary = map.get(key) || { gstPercentage: key, revenue: 0, lineItems: 0 };
        summary.revenue += row.revenue;
        summary.lineItems += row.lineItems;
        map.set(key, summary);
        return map;
      }, new Map<string, { gstPercentage: string; revenue: number; lineItems: number }>())
      .values()
  ).sort((a, b) => b.revenue - a.revenue || a.gstPercentage.localeCompare(b.gstPercentage));
  const selectedJunePharmacyTopMedicines = EXECUTIVE_JUNE_PHARMACY_TOP_MEDICINES.filter((row) => {
    return !locationFilter || locationFilter === 'all' || row.location === locationFilter;
  });
  const clinicRevenue = totalRevenue - pharmacyRevenue;
  const activeDays = new Set(selectedRows.map((row) => row.date)).size;
  const source = formatSourceRange(allRows);
  const allExpenseRows = [...EXECUTIVE_MANIKONDA_OPEX_ROWS, ...EXECUTIVE_LANCO_OPEX_ROWS];
  const selectedExpenses = allExpenseRows.filter((row) => {
    if (row.date < startDate || row.date > endDate) return false;
    return !locationFilter || locationFilter === 'all' || row.location === locationFilter;
  });
  const expenseCategoryRows = new Map<string, { category: string; amount: number; transactions: number }>();
  const expenseMonthlyRows = new Map<string, { month: string; label: string; expenses: number; transactions: number }>();
  selectedExpenses.forEach((expense) => {
    const category = expenseCategoryRows.get(expense.category) || { category: expense.category, amount: 0, transactions: 0 };
    category.amount += expense.amount;
    category.transactions += 1;
    expenseCategoryRows.set(expense.category, category);

    const key = monthKey(expense.date);
    const month = expenseMonthlyRows.get(key) || { month: key, label: monthLabel(key), expenses: 0, transactions: 0 };
    month.expenses += expense.amount;
    month.transactions += 1;
    expenseMonthlyRows.set(key, month);
  });
  const totalExpenses = selectedExpenses.reduce((sum, row) => sum + row.amount, 0);
  const allProfitMonths = Array.from(new Set([...monthlyRows.keys(), ...expenseMonthlyRows.keys()])).sort();
  const profitLossMonthly = allProfitMonths.map((key) => {
    const revenue = monthlyRows.get(key)?.revenue || 0;
    const expenses = expenseMonthlyRows.get(key)?.expenses || 0;
    const netProfit = revenue - expenses;
    return {
      month: key,
      label: monthLabel(key),
      revenue,
      expenses,
      netProfit,
      profitMargin: revenue ? netProfit / revenue : 0,
      expenseRatio: revenue ? expenses / revenue : 0,
    };
  });
  const netProfit = totalRevenue - totalExpenses;

  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  return response.status(200).json({
    startDate,
    endDate,
    source,
    warnings: HISTORICAL_SALES_DATA_ISSUES.map(
      (issue) => `${issue.source} row ${issue.row}: ${issue.field} "${issue.value}" in ${issue.context} was treated as 0.`
    ).concat(
      EXECUTIVE_MANIKONDA_2025_SALES_DATA_ISSUES.map(
        (issue) => `${issue.source} row ${issue.row}: ${issue.field} "${issue.value}" in ${issue.context} was treated as 0.`
      )
    ).concat(
      EXECUTIVE_JUNE_CLINIC_SALES_DATA_ISSUES.map(
        (issue: { source: string; row: number; value: string }) => `${issue.source} row ${issue.row}: ${issue.value}`
      )
    ).concat(
      EXECUTIVE_JUNE_PHARMACY_SALES_DATA_ISSUES.map(
        (issue: { source: string; row: number; value: string }) => `${issue.source} row ${issue.row}: ${issue.value}`
      )
    ).concat(
      EXECUTIVE_MANIKONDA_OPEX_DATA_ISSUES.map(
        (issue) => `${issue.source} row ${issue.row}: ${issue.field} "${issue.value}" in ${issue.context} was treated as 0.`
      )
    ).concat(
      EXECUTIVE_LANCO_OPEX_DATA_ISSUES.map(
        (issue) => `${issue.source} row ${issue.row}: ${issue.field} "${issue.value}" in ${issue.context} was treated as 0.`
      )
    ),
    categories: Array.from(new Set(allRows.map((row) => row.category))).sort(),
    locations: Array.from(new Set(allRows.map((row) => row.location))).sort(),
    totals: {
      revenue: totalRevenue,
      footfall: totalFootfall,
      pharmacyRevenue,
      clinicRevenue,
      activeDays,
      categories: categoryRows.size,
      averageRevenuePerFootfall: totalFootfall ? totalRevenue / totalFootfall : 0,
      averageDailyRevenue: activeDays ? totalRevenue / activeDays : 0,
    },
    revenueCards: {
      totalRevenue: revenueCardTotalRevenue,
      clinicRevenue: revenueCardClinicRevenue,
      pharmacyRevenue: revenueCardPharmacyRevenue,
    },
    monthly: Array.from(monthlyRows.values()).sort((a, b) => a.month.localeCompare(b.month)),
    categoriesSummary: Array.from(categoryRows.values())
      .map((row) => ({
        category: row.category,
        footfall: row.footfall,
        revenue: row.revenue,
        activeDays: row.days.size,
        averageRevenuePerFootfall: row.footfall ? row.revenue / row.footfall : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category)),
    weekdays: Array.from(weekdayRows.values()).sort((a, b) => b.revenue - a.revenue),
    locationsSummary: Array.from(locationRows.values())
      .map((row) => ({
        location: row.location,
        footfall: row.footfall,
        revenue: row.revenue,
        totalBill: row.totalBill,
        discount: row.discount,
        activeDays: row.days.size,
        categories: row.categories.size,
        averageRevenuePerFootfall: row.footfall ? row.revenue / row.footfall : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || a.location.localeCompare(b.location)),
    profitLoss: {
      totals: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        netProfit,
        profitMargin: totalRevenue ? netProfit / totalRevenue : 0,
        expenseRatio: totalRevenue ? totalExpenses / totalRevenue : 0,
        expenseTransactions: selectedExpenses.length,
      },
      monthly: profitLossMonthly,
      expensesByCategory: Array.from(expenseCategoryRows.values())
        .map((row) => ({
          category: row.category,
          amount: row.amount,
          transactions: row.transactions,
          share: totalExpenses ? row.amount / totalExpenses : 0,
        }))
        .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category)),
      revenueByCategory: Array.from(categoryRows.values())
        .map((row) => ({
          category: row.category,
          revenue: row.revenue,
          footfall: row.footfall,
          share: totalRevenue ? row.revenue / totalRevenue : 0,
          averageRevenuePerFootfall: row.footfall ? row.revenue / row.footfall : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category)),
      expenses: selectedExpenses.slice().sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount),
      recentExpenses: selectedExpenses.slice().sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount).slice(0, 40),
    },
    pharmacy: {
      source: EXECUTIVE_JUNE_PHARMACY_TOTALS.source,
      location: EXECUTIVE_JUNE_PHARMACY_TOTALS.location,
      note: 'June 2026 pharmacy sales are loaded for Manikonda and Lanco Hills.',
      totals: {
        revenue: selectedJunePharmacyRevenue,
        bills: selectedJunePharmacyBills,
        lineItems: selectedJunePharmacyLineItems,
        activeDays: selectedJunePharmacyActiveDays,
        locations: selectedJunePharmacyLocations.size,
        averageBillValue: selectedJunePharmacyBills ? selectedJunePharmacyRevenue / selectedJunePharmacyBills : 0,
        allHistoricalPharmacyRevenue: selectedPharmacyRows.reduce((sum, row) => sum + row.revenue, 0),
      },
      locations: selectedJunePharmacyLocationRows,
      daily: selectedJunePharmacyDailyRows,
      gstBreakdown: selectedJunePharmacyGstBreakdown,
      topMedicines: selectedJunePharmacyTopMedicines,
    },
    daily: Array.from(dailyRows.values()).sort((a, b) => b.date.localeCompare(a.date)),
    rows: selectedRows.slice().sort((a, b) => b.date.localeCompare(a.date) || b.revenue - a.revenue),
  });
}
