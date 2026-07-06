export interface ExecutiveLancoOpexRow {
  date: string;
  month: string;
  expense: string;
  category: string;
  amount: number;
  location: string;
  source: string;
}

export interface ExecutiveLancoOpexDataIssue {
  source: string;
  row: number;
  field: string;
  value: string;
  context: string;
}

export const EXECUTIVE_LANCO_OPEX_ROWS: ExecutiveLancoOpexRow[] = [
  { date: '2026-06-01', month: '2026-06', expense: 'Petty Cash Expenses', category: 'Office Expenses', amount: 12000, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Office Supplies', category: 'Office Expenses', amount: 50000, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Rent Expense', category: 'Rent', amount: 230100, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Repairs and Maintenance', category: 'Maintenance', amount: 1320, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Building Maintenance', category: 'Maintenance', amount: 10000, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Electricity Charges', category: 'Utilities', amount: 38391, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Other Expenses', category: 'Miscellaneous', amount: 1500, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Transportation Expense', category: 'Transportation', amount: 750, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Clinic & Medical Staff Salaries', category: 'Salaries', amount: 330500, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Deep Cleaning', category: 'Maintenance', amount: 2500, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Housekeeping Expenses', category: 'Staff Expenses', amount: 9600, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
  { date: '2026-06-01', month: '2026-06', expense: 'Staff Welfare', category: 'Staff Expenses', amount: 4249, location: 'Docty Clinics Lanco Hills', source: 'LAN-Opex-Jun2026.xlsx' },
];

export const EXECUTIVE_LANCO_OPEX_SUMMARY = {
  monthly: { '2026-06': 690910 },
  categories: {
    Salaries: 330500,
    Rent: 230100,
    'Office Expenses': 62000,
    Utilities: 38391,
    Maintenance: 13820,
    'Staff Expenses': 13849,
    Miscellaneous: 1500,
    Transportation: 750,
  },
} as const;

export const EXECUTIVE_LANCO_OPEX_DATA_ISSUES: ExecutiveLancoOpexDataIssue[] = [];
