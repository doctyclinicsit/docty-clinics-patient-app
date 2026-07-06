import { neon } from '@neondatabase/serverless';

export interface FranchiseExpenseRecord {
  id: string;
  label: string;
  amount: number;
  kind: 'fixed' | 'variable';
  annualEscalation: number;
}

export interface FranchiseCapexItemRecord {
  id: string;
  category: string;
  label: string;
  estimatedAmount: number;
  actualAmount: number;
}

export interface CenterFeatureRecord {
  id: string;
  category: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface FranchiseLocationRecord {
  id: string;
  name: string;
  area: string;
  status: 'planned' | 'projected' | 'active';
  centerSft: number;
  capexType: 'projected' | 'actual';
  capex: number;
  capexItems: FranchiseCapexItemRecord[];
  monthlyFootfall: number;
  revenuePerFootfall: number;
  monthlyExpenses: FranchiseExpenseRecord[];
  centerFeatures: CenterFeatureRecord[];
  hasOwnPharmacy: boolean;
  hasOwnPhysiotherapy: boolean;
  hasOwnLab: boolean;
  hasUltrasound: boolean;
  ultrasoundType: 'none' | 'basic' | 'advanced';
  hasXray: boolean;
  hasTmtPft: boolean;
}

const scenarioId = 'default';
let ensured = false;

function generateShareCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function shareCodeExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function isActiveShareCode(expiresAt: unknown) {
  return typeof expiresAt === 'string' || expiresAt instanceof Date
    ? new Date(expiresAt).getTime() > Date.now()
    : false;
}

function scenarioResponse(row: any) {
  const activeShareCode = row?.share_code && isActiveShareCode(row?.share_code_expires_at);
  return {
    locations: normalizeFranchiseLocations(row?.locations),
    shareCode: activeShareCode ? row.share_code : '',
    shareCodeExpiresAt: activeShareCode ? row.share_code_expires_at : '',
    showBenchmark: row?.show_benchmark !== false,
    updatedBy: row?.updated_by || '',
    updatedAt: row?.updated_at || '',
  };
}

const fixedCapexCosts = {
  brandingSignage: 150000,
  licensesCompliance: 500000,
  biomedicalWastePollution: 30000,
  powerBackup: 100000,
  itSystemsSoftware: 600000,
  airconditioningLargest: 600000,
  lightingElectricals: 375000,
  dayCareClinicalEquipment: 100000,
  cctvSecurityAccess: 50000,
  launchMarketing: 150000,
  plumbing: 200000,
  physiotherapyEquipment: 120000,
  ownPharmacyInitialStockSetup: 1500000,
} as const;

const interiorFitoutCostPerSft = 1000;
const ownPharmacyStartMonthlyRevenue = 100000;
const ownPharmacyNetRevenueShare = 0.1;
const sampleCollectionPathologyMargin = 0.5;
const sampleCollectionRadiologyMargin = 0.3;

const defaultExpenses: FranchiseExpenseRecord[] = [
  { id: 'rent', label: 'Rent', amount: 175000, kind: 'fixed', annualEscalation: 0.05 },
  { id: 'salaries', label: 'Salaries', amount: 525000, kind: 'fixed', annualEscalation: 0.1 },
  { id: 'utilities-power-backup', label: 'Utilities & power backup', amount: 60000, kind: 'fixed', annualEscalation: 0.06 },
  { id: 'building-maintenance', label: 'Building maintenance', amount: 7500, kind: 'fixed', annualEscalation: 0.06 },
  { id: 'marketing-promotions', label: 'Marketing & promotions', amount: 150000, kind: 'fixed', annualEscalation: 0.04 },
  { id: 'management-fee', label: 'Management Fee', amount: 200000, kind: 'fixed', annualEscalation: 0.1 },
  { id: 'housekeeping', label: 'Housekeeping', amount: 35000, kind: 'fixed', annualEscalation: 0.06 },
  { id: 'office-pantry-supplies', label: 'Office & pantry supplies', amount: 20000, kind: 'fixed', annualEscalation: 0.05 },
  { id: 'doctor-payout', label: 'Doctor and specialist payouts', amount: 10000, kind: 'variable', annualEscalation: 0 },
  { id: 'pharmacy-supplies', label: 'Pharmacy supplies', amount: Math.round(ownPharmacyStartMonthlyRevenue * (1 - ownPharmacyNetRevenueShare)), kind: 'variable', annualEscalation: 0 },
  { id: 'dental-operations', label: 'Dental consumables and service support', amount: 45000, kind: 'variable', annualEscalation: 0.05 },
  { id: 'diagnostics-operations', label: 'Lab and diagnostics operations', amount: 10000, kind: 'variable', annualEscalation: 0 },
];

const defaultCapexItems: FranchiseCapexItemRecord[] = [
  { id: 'interiors', category: 'Interiors', label: 'Civil, interiors and fit-out at Rs.1,000/SFT', estimatedAmount: 1800 * interiorFitoutCostPerSft, actualAmount: 0 },
  { id: 'civil-finishes', category: 'Interiors', label: 'Civil finishes, partitions and wet-area finishing', estimatedAmount: 320000, actualAmount: 0 },
  { id: 'lighting-electricals', category: 'Interiors', label: 'Lighting and electricals', estimatedAmount: fixedCapexCosts.lightingElectricals, actualAmount: 0 },
  { id: 'airconditioning', category: 'Interiors', label: 'Airconditioning', estimatedAmount: Math.round(fixedCapexCosts.airconditioningLargest * (1800 / 3200)), actualAmount: 0 },
  { id: 'plumbing', category: 'Interiors', label: 'Plumbing', estimatedAmount: fixedCapexCosts.plumbing, actualAmount: 0 },
  { id: 'furniture-fixtures', category: 'Interiors', label: 'Furniture, fixtures, counters and loose seating', estimatedAmount: 340000, actualAmount: 0 },
  { id: 'consult-room-setup', category: 'Medical Equipment', label: 'Consultation room setup, exam couches and instruments', estimatedAmount: 320000, actualAmount: 0 },
  { id: 'daycare-setup', category: 'Medical Equipment', label: 'Day care bed setup with monitors and accessories', estimatedAmount: 235000, actualAmount: 0 },
  { id: 'daycare-clinical-equipment', category: 'Medical Equipment', label: 'ECG, patient monitor, oxygen cylinder and day care surgicals', estimatedAmount: fixedCapexCosts.dayCareClinicalEquipment, actualAmount: 0 },
  { id: 'dental-setup', category: 'Dental Equipment', label: 'Dental equipment and initial setup', estimatedAmount: 600000, actualAmount: 0 },
  { id: 'pharmacy-initial-stock-setup', category: 'Pharmacy Setup', label: 'Own Pharmacy - initial stock and setup', estimatedAmount: fixedCapexCosts.ownPharmacyInitialStockSetup, actualAmount: 0 },
  { id: 'physiotherapy', category: 'Physiotherapy Equipment', label: 'Physiotherapy equipment', estimatedAmount: fixedCapexCosts.physiotherapyEquipment, actualAmount: 0 },
  { id: 'diagnostics', category: 'Medical Equipment', label: 'Diagnostic room infrastructure and sample collection setup', estimatedAmount: 215000, actualAmount: 0 },
  { id: 'sterilization-infection-control', category: 'Medical Equipment', label: 'Sterilization, infection control and biomedical bins', estimatedAmount: 150000, actualAmount: 0 },
  { id: 'power-backup', category: 'IT & Software', label: 'Power backup', estimatedAmount: fixedCapexCosts.powerBackup, actualAmount: 0 },
  { id: 'it-software', category: 'IT & Software', label: 'IT systems and software', estimatedAmount: fixedCapexCosts.itSystemsSoftware, actualAmount: 0 },
  { id: 'cctv-security-access', category: 'IT & Software', label: 'CCTV, access control and security systems', estimatedAmount: fixedCapexCosts.cctvSecurityAccess, actualAmount: 0 },
  { id: 'branding-signage', category: 'Branding & Signage', label: 'External signage and in-clinic branding', estimatedAmount: fixedCapexCosts.brandingSignage, actualAmount: 0 },
  { id: 'deposits', category: 'Deposits', label: 'Rental deposit and utility deposits', estimatedAmount: 375000, actualAmount: 0 },
  { id: 'licenses', category: 'Licenses & Compliance', label: 'Licenses, statutory and compliance setup', estimatedAmount: fixedCapexCosts.licensesCompliance, actualAmount: 0 },
  { id: 'biomedical-waste-pollution', category: 'Licenses & Compliance', label: 'Biomedical waste and Pollution Control Board certification', estimatedAmount: fixedCapexCosts.biomedicalWastePollution, actualAmount: 0 },
  { id: 'fire-safety', category: 'Licenses & Compliance', label: 'Fire safety equipment and statutory fixtures', estimatedAmount: 125000, actualAmount: 0 },
  { id: 'pantry-housekeeping', category: 'Interiors', label: 'Pantry, housekeeping and back-office setup', estimatedAmount: 125000, actualAmount: 0 },
  { id: 'supplies-accessories', category: 'Contingency', label: 'Initial supplies, accessories and electronic appliances', estimatedAmount: 235000, actualAmount: 0 },
  { id: 'installation-logistics', category: 'Contingency', label: 'Installation, freight, commissioning and vendor coordination', estimatedAmount: 150000, actualAmount: 0 },
  { id: 'contingency-buffer', category: 'Contingency', label: 'Project contingency buffer', estimatedAmount: 170000, actualAmount: 0 },
  { id: 'launch-marketing', category: 'Launch Marketing', label: 'Launch campaign and local activation', estimatedAmount: fixedCapexCosts.launchMarketing, actualAmount: 0 },
];

type UltrasoundType = 'none' | 'basic' | 'advanced';

function centerProfileForSft(centerSft: number): {
  pharmacySft: number;
  consultationRooms: number;
  daycareBeds: number;
  labType: 'sample-collection' | 'in-house-testing';
  ultrasound: UltrasoundType;
  xray: boolean;
} {
  if (centerSft >= 2800) {
    return { pharmacySft: 400, consultationRooms: 5, daycareBeds: 3, labType: 'in-house-testing', ultrasound: 'advanced', xray: true };
  }
  if (centerSft >= 2000) {
    return { pharmacySft: 350, consultationRooms: 4, daycareBeds: 2, labType: 'in-house-testing', ultrasound: 'basic', xray: false };
  }
  return { pharmacySft: 275, consultationRooms: 3, daycareBeds: 1, labType: 'sample-collection', ultrasound: 'none', xray: false };
}

function defaultEquipmentForSft(centerSft: number) {
  const profile = centerProfileForSft(centerSft);
  return {
    hasOwnLab: profile.labType === 'in-house-testing',
    hasUltrasound: profile.ultrasound !== 'none',
    ultrasoundType: profile.ultrasound,
    hasXray: profile.xray,
    hasTmtPft: false,
  };
}

function defaultCenterFeaturesForSft(centerSft: number): CenterFeatureRecord[] {
  const profile = centerProfileForSft(centerSft);
  const features: CenterFeatureRecord[] = [
    {
      id: 'pharmacy',
      category: 'Pharmacy',
      title: `Pharmacy - ${profile.pharmacySft} sqft`,
      description: `Dedicated pharmacy area of ${profile.pharmacySft} sqft.`,
      enabled: true,
    },
    {
      id: 'consultation-rooms',
      category: 'Clinical Services',
      title: `Consultation rooms - ${profile.consultationRooms}`,
      description: `${profile.consultationRooms} consultation rooms for doctor visits and primary care.`,
      enabled: true,
    },
    {
      id: 'dentistry',
      category: 'Dental',
      title: 'Dentistry - 1',
      description: 'One dentistry room.',
      enabled: true,
    },
    {
      id: 'day-beds',
      category: 'Clinical Services',
      title: `Day beds - ${profile.daycareBeds}`,
      description: `${profile.daycareBeds} day bed${profile.daycareBeds > 1 ? 's' : ''} for day care support.`,
      enabled: true,
    },
    {
      id: 'lab',
      category: 'Diagnostics',
      title: profile.labType === 'in-house-testing' ? 'Lab (In-house Testing) - 1' : 'Lab (Sample Collection only) - 1',
      description: profile.labType === 'in-house-testing' ? 'One in-house lab testing area.' : 'One lab sample collection area.',
      enabled: true,
    },
    {
      id: 'physiotherapy',
      category: 'Physiotherapy',
      title: 'Physiotherapy - 1',
      description: 'One physiotherapy room.',
      enabled: true,
    },
  ];
  if (profile.ultrasound !== 'none') {
    features.push({
      id: 'ultrasound',
      category: 'Diagnostics',
      title: `Ultrasound (${profile.ultrasound}) - 1`,
      description: `One ${profile.ultrasound} ultrasound setup.`,
      enabled: true,
    });
  }
  if (profile.xray) {
    features.push({
      id: 'xray',
      category: 'Diagnostics',
      title: 'X-ray - 1',
      description: 'One X-ray setup.',
      enabled: true,
    });
  }
  return features;
}

export const defaultFranchiseLocations: FranchiseLocationRecord[] = [
  {
    id: 'gachibowli-projection',
    name: 'Gachibowli',
    area: 'Hyderabad',
    status: 'projected',
    centerSft: 1800,
    capexType: 'projected',
    capex: 3200000,
    capexItems: defaultCapexItems,
    monthlyFootfall: 820,
    revenuePerFootfall: 480,
    monthlyExpenses: defaultExpenses,
    centerFeatures: defaultCenterFeaturesForSft(1800),
    hasOwnPharmacy: true,
    hasOwnPhysiotherapy: true,
    ...defaultEquipmentForSft(1800),
  },
  {
    id: 'kondapur-projection',
    name: 'Kondapur',
    area: 'Hyderabad',
    status: 'planned',
    centerSft: 2200,
    capexType: 'projected',
    capex: 2850000,
    capexItems: defaultCapexItems.map((item) => ({
      ...item,
      estimatedAmount: Math.round(item.estimatedAmount * 0.9),
    })),
    monthlyFootfall: 740,
    revenuePerFootfall: 460,
    monthlyExpenses: defaultExpenses.map((expense) => ({
      ...expense,
      amount: Math.round(expense.amount * (expense.id === 'rent' ? 0.9 : 0.92)),
    })),
    centerFeatures: defaultCenterFeaturesForSft(2200),
    hasOwnPharmacy: true,
    hasOwnPhysiotherapy: true,
    ...defaultEquipmentForSft(2200),
  },
];

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ''
  );
}

function sqlClient() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) throw new Error('Franchise opportunity storage is not configured.');
  return neon(databaseUrl);
}

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 120) || fallback : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function safeRate(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 1) : fallback;
}

function safeBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function safeUltrasoundType(value: unknown, fallback: FranchiseLocationRecord['ultrasoundType']): FranchiseLocationRecord['ultrasoundType'] {
  return value === 'none' || value === 'basic' || value === 'advanced' ? value : fallback;
}

function safeStatus(value: unknown): FranchiseLocationRecord['status'] {
  return value === 'active' || value === 'projected' || value === 'planned' ? value : 'planned';
}

function safeCapexType(value: unknown): FranchiseLocationRecord['capexType'] {
  return value === 'actual' || value === 'projected' ? value : 'projected';
}

function safeExpense(value: unknown, fallbackIndex: number): FranchiseExpenseRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const label = safeText(record.label);
  if (!label) return undefined;
  return {
    id: safeText(record.id, `expense-${fallbackIndex}`),
    label,
    amount: safeNumber(record.amount),
    kind: record.kind === 'variable' ? 'variable' : 'fixed',
    annualEscalation: safeRate(record.annualEscalation, record.kind === 'variable' ? 0.05 : 0.06),
  };
}

function existingExpenseAmount(expenses: FranchiseExpenseRecord[], id: string, fallback: number) {
  return expenses.find((expense) => expense.id === id)?.amount || fallback;
}

function hasLegacyOpexShape(expenses: FranchiseExpenseRecord[]) {
  if (!expenses.length) return true;
  const ids = new Set(expenses.map((expense) => expense.id));
  return !ids.has('management-fee') || ids.has('medical-supplies') || ids.has('admin') || ids.has('maintenance') || ids.has('utilities');
}

function estimatedRentForServerLocation(centerSft: number, status: FranchiseLocationRecord['status'], expenses: FranchiseExpenseRecord[]) {
  const existingRent = expenses.find((expense) => expense.id === 'rent')?.amount || 0;
  return status === 'active' && existingRent > 0 ? existingRent : Math.round(centerSft * 105);
}

function recommendedOpexForServerLocation(
  centerSft: number,
  status: FranchiseLocationRecord['status'],
  expenses: FranchiseExpenseRecord[],
  hasOwnPharmacy = true,
  hasOwnLab = centerSft >= 2000,
): FranchiseExpenseRecord[] {
  const scale = centerSft >= 2800 ? 1 : centerSft >= 2000 ? 0.5 : 0;
  const sizeLabel = centerSft >= 2800 ? '2800-3500 SFT' : centerSft >= 2000 ? '2000-2500 SFT' : '1700-1900 SFT';
  const capacityUtilization = 0.5;
  const dentalRevenue = Math.round((centerSft >= 2800 ? 400000 : centerSft >= 2000 ? 350000 : 300000) * capacityUtilization);
  const isSampleCollectionOnly = centerSft < 2000 && !hasOwnLab;
  const sampleCollectionLabRevenue = Math.round(12 * 2 * 26 * capacityUtilization * 400);
  const radiologyRevenue = 0;
  const diagnosticsStartingCost = isSampleCollectionOnly
    ? Math.round(
        10000 +
        sampleCollectionLabRevenue * (1 - sampleCollectionPathologyMargin) +
        radiologyRevenue * (1 - sampleCollectionRadiologyMargin)
      )
    : 10000;
  return [
    { id: 'rent', label: `Rent for ${sizeLabel}`, amount: estimatedRentForServerLocation(centerSft, status, expenses), kind: 'fixed', annualEscalation: 0.05 },
    { id: 'salaries', label: 'Salaries', amount: existingExpenseAmount(expenses, 'salaries', Math.round(400000 + 100000 * scale + (hasOwnPharmacy ? 100000 : 0))), kind: 'fixed', annualEscalation: 0.1 },
    { id: 'utilities-power-backup', label: 'Utilities & power backup', amount: Math.round(50000 + 25000 * scale), kind: 'fixed', annualEscalation: 0.06 },
    { id: 'building-maintenance', label: 'Building maintenance', amount: Math.round(5000 + 5000 * scale), kind: 'fixed', annualEscalation: 0.06 },
    { id: 'marketing-promotions', label: 'Marketing & promotions', amount: 150000, kind: 'fixed', annualEscalation: 0.04 },
    { id: 'management-fee', label: 'Management Fee', amount: 200000, kind: 'fixed', annualEscalation: 0.1 },
    { id: 'housekeeping', label: 'Housekeeping', amount: Math.round(25000 + 20000 * scale), kind: 'fixed', annualEscalation: 0.06 },
    { id: 'office-pantry-supplies', label: 'Office & pantry supplies', amount: Math.round(15000 + 10000 * scale), kind: 'fixed', annualEscalation: 0.05 },
    { id: 'doctor-payout', label: 'Doctor and specialist payouts', amount: 10000, kind: 'variable', annualEscalation: 0 },
    ...(hasOwnPharmacy
      ? [{ id: 'pharmacy-supplies', label: 'Pharmacy supplies', amount: Math.round(ownPharmacyStartMonthlyRevenue * (1 - ownPharmacyNetRevenueShare)), kind: 'variable' as const, annualEscalation: 0 }]
      : []),
    { id: 'dental-operations', label: 'Dental consumables and service support', amount: Math.round(dentalRevenue * 0.18), kind: 'variable', annualEscalation: 0.05 },
    { id: 'diagnostics-operations', label: 'Lab and diagnostics operations', amount: diagnosticsStartingCost, kind: 'variable', annualEscalation: 0 },
  ];
}

function safeCapexItem(value: unknown, fallbackIndex: number): FranchiseCapexItemRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const label = safeText(record.label);
  if (!label) return undefined;
  return {
    id: safeText(record.id, `capex-${fallbackIndex}`),
    category: safeText(record.category, 'Other'),
    label,
    estimatedAmount: safeNumber(record.estimatedAmount),
    actualAmount: safeNumber(record.actualAmount),
  };
}

function safeCenterFeature(value: unknown, fallbackIndex: number): CenterFeatureRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const title = safeText(record.title);
  if (!title) return undefined;
  return {
    id: safeText(record.id, `feature-${fallbackIndex}`),
    category: safeText(record.category, 'Other'),
    title,
    description: safeText(record.description),
    enabled: record.enabled !== false,
  };
}

function fallbackCapexItems(totalCapex: number) {
  if (!totalCapex) return defaultCapexItems;
  const defaultTotal = defaultCapexItems.reduce((sum, item) => sum + item.estimatedAmount, 0) || 1;
  return defaultCapexItems.map((item) => ({
    ...item,
    estimatedAmount: Math.round((item.estimatedAmount / defaultTotal) * totalCapex),
  }));
}

function isOldGenericFeatureSet(features: CenterFeatureRecord[]) {
  const ids = new Set(features.map((feature) => feature.id));
  return ids.has('primary-care') || ids.has('digital-records') || ids.has('local-marketing');
}

export function normalizeFranchiseLocations(value: unknown): FranchiseLocationRecord[] {
  if (!Array.isArray(value)) return defaultFranchiseLocations;
  const locations = value
    .slice(0, 20)
    .map((item, index) => {
      if (!item || typeof item !== 'object') return undefined;
      const record = item as Record<string, unknown>;
      const name = safeText(record.name);
      if (!name) return undefined;
      const expenses = Array.isArray(record.monthlyExpenses)
        ? record.monthlyExpenses
            .map((expense, expenseIndex) => safeExpense(expense, expenseIndex))
            .filter(Boolean) as FranchiseExpenseRecord[]
        : [];
      const capex = safeNumber(record.capex);
      const capexItems = Array.isArray(record.capexItems)
        ? record.capexItems
            .map((item, itemIndex) => safeCapexItem(item, itemIndex))
            .filter(Boolean) as FranchiseCapexItemRecord[]
        : [];
      const centerFeatures = Array.isArray(record.centerFeatures)
        ? record.centerFeatures
            .map((feature, featureIndex) => safeCenterFeature(feature, featureIndex))
            .filter(Boolean) as CenterFeatureRecord[]
        : [];
      const centerSft = safeNumber(record.centerSft, 1800);
      const defaultEquipment = defaultEquipmentForSft(centerSft);
      const ultrasoundType = safeUltrasoundType(
        record.ultrasoundType,
        safeBoolean(record.hasUltrasound, defaultEquipment.hasUltrasound) ? defaultEquipment.ultrasoundType : 'none',
      );
      const hasXray = safeBoolean(record.hasXray, defaultEquipment.hasXray);
      const hasOwnPharmacy = safeBoolean(record.hasOwnPharmacy, true);
      const hasOwnPhysiotherapy = safeBoolean(record.hasOwnPhysiotherapy, true);
      const hasOwnLab = safeBoolean(record.hasOwnLab, defaultEquipment.hasOwnLab);
      const monthlyExpenses = expenses.length && !hasLegacyOpexShape(expenses)
        ? expenses
        : recommendedOpexForServerLocation(centerSft, safeStatus(record.status), expenses, hasOwnPharmacy, hasOwnLab);
      return {
        ...defaultEquipment,
        id: safeText(record.id, `location-${index + 1}`),
        name,
        area: safeText(record.area, 'Hyderabad'),
        status: safeStatus(record.status),
        centerSft,
        capexType: safeCapexType(record.capexType),
        capex,
        capexItems: capexItems.length ? capexItems : fallbackCapexItems(capex),
        monthlyFootfall: safeNumber(record.monthlyFootfall),
        revenuePerFootfall: safeNumber(record.revenuePerFootfall),
        monthlyExpenses,
        centerFeatures: centerFeatures.length && !isOldGenericFeatureSet(centerFeatures)
          ? centerFeatures
          : defaultCenterFeaturesForSft(centerSft),
        hasOwnPharmacy,
        hasOwnPhysiotherapy,
        hasOwnLab,
        hasUltrasound: ultrasoundType !== 'none',
        ultrasoundType,
        hasXray,
        hasTmtPft: safeBoolean(record.hasTmtPft, false),
      };
    })
    .filter(Boolean) as FranchiseLocationRecord[];
  return locations.length ? locations : defaultFranchiseLocations;
}

async function ensureTable(sql: any) {
  if (ensured) return;
  await sql`
    create table if not exists franchise_opportunity_scenarios (
      id text primary key,
      locations jsonb not null default '[]'::jsonb,
      share_code text,
      share_code_expires_at timestamptz,
      show_benchmark boolean not null default true,
      updated_by text,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    alter table franchise_opportunity_scenarios
    add column if not exists share_code text
  `;
  await sql`
    alter table franchise_opportunity_scenarios
    add column if not exists share_code_expires_at timestamptz
  `;
  await sql`
    alter table franchise_opportunity_scenarios
    add column if not exists show_benchmark boolean not null default true
  `;
  ensured = true;
}

export async function readFranchiseOpportunityScenario() {
  const sql = sqlClient();
  await ensureTable(sql);
  const rows = await sql`
    select locations, share_code, share_code_expires_at, show_benchmark, updated_by, updated_at
    from franchise_opportunity_scenarios
    where id = ${scenarioId}
    limit 1
  `;
  const row = rows[0];
  if (!row) {
    const insertedRows = await sql`
      insert into franchise_opportunity_scenarios (id, locations, show_benchmark, updated_at)
      values (${scenarioId}, ${JSON.stringify(defaultFranchiseLocations)}::jsonb, true, now())
      on conflict (id) do update
      set show_benchmark = franchise_opportunity_scenarios.show_benchmark
      returning locations, share_code, share_code_expires_at, show_benchmark, updated_by, updated_at
    `;
    return scenarioResponse(insertedRows[0]);
  }
  return scenarioResponse(row);
}

export async function saveFranchiseOpportunityScenario(locationsInput: unknown, updatedBy = '', showBenchmark = true) {
  const sql = sqlClient();
  await ensureTable(sql);
  const locations = normalizeFranchiseLocations(locationsInput);
  const rows = await sql`
    insert into franchise_opportunity_scenarios (id, locations, show_benchmark, updated_by, updated_at)
    values (${scenarioId}, ${JSON.stringify(locations)}::jsonb, ${Boolean(showBenchmark)}, ${updatedBy || null}, now())
    on conflict (id) do update
    set
      locations = excluded.locations,
      show_benchmark = excluded.show_benchmark,
      updated_by = excluded.updated_by,
      updated_at = now()
    returning locations, share_code, share_code_expires_at, show_benchmark, updated_by, updated_at
  `;
  return scenarioResponse(rows[0]);
}

export async function generateFranchiseOpportunityShareCode(updatedBy = '') {
  const sql = sqlClient();
  await ensureTable(sql);
  const shareCode = generateShareCode();
  const expiresAt = shareCodeExpiresAt();
  const rows = await sql`
    insert into franchise_opportunity_scenarios (id, locations, share_code, share_code_expires_at, show_benchmark, updated_by, updated_at)
    values (${scenarioId}, ${JSON.stringify(defaultFranchiseLocations)}::jsonb, ${shareCode}, ${expiresAt.toISOString()}, true, ${updatedBy || null}, now())
    on conflict (id) do update
    set
      share_code = excluded.share_code,
      share_code_expires_at = excluded.share_code_expires_at,
      updated_by = coalesce(excluded.updated_by, franchise_opportunity_scenarios.updated_by),
      updated_at = now()
    returning locations, share_code, share_code_expires_at, show_benchmark, updated_by, updated_at
  `;
  return scenarioResponse(rows[0]);
}
