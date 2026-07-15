export interface ExecutiveManualIncomeRow {
  date: string;
  week: number;
  day: string;
  category: string;
  footfall: number;
  revenue: number;
  location: string;
  source: string;
  totalBill: number;
  discount: number;
}

export const EXECUTIVE_MANUAL_INCOME_ROWS: ExecutiveManualIncomeRow[] = [
  {
    date: '2026-06-30',
    week: 27,
    day: 'Tuesday',
    category: 'Referral Income',
    footfall: 0,
    revenue: 29500,
    location: 'Docty Clinics Manikonda',
    source: 'Yashoda Hospital referral income',
    totalBill: 29500,
    discount: 0,
  },
];
