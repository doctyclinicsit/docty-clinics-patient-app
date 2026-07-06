import { readAdminStaffSession } from '../../server/staff-admin.js';
import { listZohoBooksExpenses, type ZohoBooksExpenseTransaction } from '../../server/zoho-books.js';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDate(value: unknown) {
  const date = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

function monthKey(value: string) {
  return /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : 'Unknown';
}

function monthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(
    new Date(`${value}-01T00:00:00Z`)
  );
}

function todayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function summarizeBy<T extends string>(
  expenses: ZohoBooksExpenseTransaction[],
  key: (expense: ZohoBooksExpenseTransaction) => T
) {
  const rows = new Map<T, { name: T; transactions: number; total: number }>();
  expenses.forEach((expense) => {
    const name = key(expense);
    const row = rows.get(name) || { name, transactions: 0, total: 0 };
    row.transactions += 1;
    row.total += expense.total;
    rows.set(name, row);
  });
  return Array.from(rows.values()).sort((a, b) => b.total - a.total || String(a.name).localeCompare(String(b.name)));
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const adminSession = readAdminStaffSession(request.headers.cookie);
  if (adminSession.status !== 200) {
    return response.status(401).json({ message: 'Please sign in as an admin staff member.' });
  }

  const fallbackEndDate = todayDate();
  const fallbackStartDate = startOfMonth(fallbackEndDate);
  const startDate = parseDate(request.query?.startDate) || fallbackStartDate;
  const endDate = parseDate(request.query?.endDate) || fallbackEndDate;

  if (startDate > endDate) {
    return response.status(400).json({ message: 'Start date must be before end date.' });
  }

  try {
    const expenses = await listZohoBooksExpenses({ startDate, endDate });
    const monthly = summarizeBy(expenses, (expense) => monthKey(expense.date)).map((row) => ({
      month: row.name,
      label: monthLabel(row.name),
      transactions: row.transactions,
      total: row.total,
    }));

    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    return response.status(200).json({
      startDate,
      endDate,
      totals: {
        transactions: expenses.length,
        total: expenses.reduce((sum, expense) => sum + expense.total, 0),
      },
      monthly,
      byAccount: summarizeBy(expenses, (expense) => expense.accountName || 'Uncategorized'),
      byVendor: summarizeBy(expenses, (expense) => expense.vendorName || 'Vendor not tagged'),
      byLocation: summarizeBy(expenses, (expense) => expense.locationName || 'Location not tagged'),
      expenses: expenses.sort((a, b) => b.date.localeCompare(a.date) || b.total - a.total),
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to pull Zoho Books expenses.',
    });
  }
}
