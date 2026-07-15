export interface FranchiseExpense {
  id: string;
  label: string;
  amount: number;
  kind: 'fixed' | 'variable';
  annualEscalation: number;
}

export interface FranchiseCapexItem {
  id: string;
  category: string;
  label: string;
  estimatedAmount: number;
  actualAmount: number;
}

export interface CenterFeature {
  id: string;
  category: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface FranchiseLocation {
  id: string;
  name: string;
  area: string;
  status: 'planned' | 'projected' | 'active';
  centerSft: number;
  capexType: 'projected' | 'actual';
  capex: number;
  capexItems: FranchiseCapexItem[];
  monthlyFootfall: number;
  revenuePerFootfall: number;
  monthlyExpenses: FranchiseExpense[];
  centerFeatures: CenterFeature[];
  hasOwnPharmacy: boolean;
  hasOwnPhysiotherapy: boolean;
  hasOwnLab: boolean;
  hasUltrasound: boolean;
  ultrasoundType: 'none' | 'basic' | 'advanced';
  hasXray: boolean;
  hasTmtPft: boolean;
}

export interface ProjectionMonth {
  month: number;
  footfall: number;
  revenue: number;
  opex: number;
  managementFee: number;
  managementFeeWaiver: number;
  expenses: number;
  operatingProfit: number;
  ownerFundingRequired: number;
  cumulativeCashFlow: number;
  breakEven: boolean;
}

export interface RevenueComponent {
  id: string;
  label: string;
  monthlyRevenue: number;
  monthlyVolume: number;
  ticketSize: number;
  note: string;
}

export interface FocoRules {
  doctyCapexShare: number;
  franchiseOwnerCapexShare: number;
  franchiseFee: number;
  wcsdMonths: number;
  monthlyManagementFee: number;
  managementFeeAnnualEscalation: number;
  breakEvenTargetMonth: number;
}

export interface CenterSizeProfile {
  id: string;
  label: string;
  minSft: number;
  maxSft: number;
  pricePerSft: number;
  capexMin: number;
  capexMax: number;
  opexMin: number;
  opexMax: number;
  pharmacySft: number;
  consultationRooms: number;
  daycareBeds: number;
  labType: 'sample-collection' | 'in-house-testing';
  ultrasound: 'none' | 'basic' | 'advanced';
  xray: boolean;
}

export const equipmentCosts = {
  basicUltrasound: 2800000,
  advancedUltrasound: 4000000,
  xray: 1250000,
  tmtPft: 250000,
  pathologyLab: 650000,
  dentalSetup: 600000,
} as const;

export const fixedCapexCosts = {
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

export const interiorFitoutCostPerSft = 1000;
const ownPharmacyStartMonthlyRevenue = 100000;
const ownPharmacyMatureMonthlyRevenue = 3000000;
const ownPharmacyMatureMonth = 24;
const ownPharmacyNetRevenueShare = 0.1;
const ownPharmacyRevenueAnnualEscalation = 0.05;
const sampleCollectionPathologyMargin = 0.5;
const sampleCollectionRadiologyMargin = 0.3;

export const defaultExpenses: FranchiseExpense[] = [
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

export const focoRules: FocoRules = {
  doctyCapexShare: 0.5,
  franchiseOwnerCapexShare: 0.5,
  franchiseFee: 1500000,
  wcsdMonths: 3,
  monthlyManagementFee: 200000,
  managementFeeAnnualEscalation: 0.1,
  breakEvenTargetMonth: 18,
};

export const capexCategories = [
  'Interiors',
  'Medical Equipment',
  'Dental Equipment',
  'Physiotherapy Equipment',
  'Pharmacy Setup',
  'IT & Software',
  'Branding & Signage',
  'Deposits',
  'Licenses & Compliance',
  'Launch Marketing',
  'Contingency',
  'Other',
] as const;

export const centerSizeProfiles: CenterSizeProfile[] = [
  {
    id: 'compact-1700-1900',
    label: '1700-1900 SFT',
    minSft: 1700,
    maxSft: 1900,
    pricePerSft: 4300,
    capexMin: 7200000,
    capexMax: 8000000,
    opexMin: 1000000,
    opexMax: 1100000,
    pharmacySft: 275,
    consultationRooms: 3,
    daycareBeds: 1,
    labType: 'sample-collection',
    ultrasound: 'none',
    xray: false,
  },
  {
    id: 'standard-2000-2500',
    label: '2000-2500 SFT',
    minSft: 2000,
    maxSft: 2500,
    pricePerSft: 4000,
    capexMin: 8000000,
    capexMax: 10000000,
    opexMin: 1100000,
    opexMax: 1200000,
    pharmacySft: 350,
    consultationRooms: 4,
    daycareBeds: 2,
    labType: 'in-house-testing',
    ultrasound: 'basic',
    xray: false,
  },
  {
    id: 'large-2800-3500',
    label: '2800-3500 SFT',
    minSft: 2800,
    maxSft: 3500,
    pricePerSft: 3500,
    capexMin: 9800000,
    capexMax: 12000000,
    opexMin: 1200000,
    opexMax: 1300000,
    pharmacySft: 400,
    consultationRooms: 5,
    daycareBeds: 3,
    labType: 'in-house-testing',
    ultrasound: 'advanced',
    xray: true,
  },
];

export const defaultCapexItems: FranchiseCapexItem[] = [
  { id: 'interiors', category: 'Interiors', label: 'Civil, interiors and fit-out at Rs.1,000/SFT', estimatedAmount: 1800 * interiorFitoutCostPerSft, actualAmount: 0 },
  { id: 'civil-finishes', category: 'Interiors', label: 'Civil finishes, partitions and wet-area finishing', estimatedAmount: 320000, actualAmount: 0 },
  { id: 'lighting-electricals', category: 'Interiors', label: 'Lighting and electricals', estimatedAmount: fixedCapexCosts.lightingElectricals, actualAmount: 0 },
  { id: 'airconditioning', category: 'Interiors', label: 'Airconditioning', estimatedAmount: 360000, actualAmount: 0 },
  { id: 'plumbing', category: 'Interiors', label: 'Plumbing', estimatedAmount: fixedCapexCosts.plumbing, actualAmount: 0 },
  { id: 'furniture-fixtures', category: 'Interiors', label: 'Furniture, fixtures, counters and loose seating', estimatedAmount: 340000, actualAmount: 0 },
  { id: 'consult-room-setup', category: 'Medical Equipment', label: 'Consultation room setup, exam couches and instruments', estimatedAmount: 320000, actualAmount: 0 },
  { id: 'daycare-setup', category: 'Medical Equipment', label: 'Day care bed setup with monitors and accessories', estimatedAmount: 235000, actualAmount: 0 },
  { id: 'daycare-clinical-equipment', category: 'Medical Equipment', label: 'ECG, patient monitor, oxygen cylinder and day care surgicals', estimatedAmount: fixedCapexCosts.dayCareClinicalEquipment, actualAmount: 0 },
  { id: 'dental-setup', category: 'Dental Equipment', label: 'Dental equipment and initial setup', estimatedAmount: equipmentCosts.dentalSetup, actualAmount: 0 },
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

export const centerFeatureCategories = [
  'Clinical Services',
  'Diagnostics',
  'Pharmacy',
  'Dental',
  'Physiotherapy',
  'Operations',
  'Other',
] as const;

export function buildCenterFeaturesForSft(centerSft: number): CenterFeature[] {
  const profile = centerSizeProfileForSft(centerSft);
  const features: CenterFeature[] = [
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

export function applyOwnershipToCenterFeatures(
  features: CenterFeature[],
  ownership: { hasOwnPharmacy?: boolean; hasOwnPhysiotherapy?: boolean; hasOwnLab?: boolean },
) {
  return features.map((feature) => {
    if (feature.id === 'pharmacy') return { ...feature, enabled: ownership.hasOwnPharmacy ?? feature.enabled };
    if (feature.id === 'physiotherapy') return { ...feature, enabled: ownership.hasOwnPhysiotherapy ?? feature.enabled };
    if (feature.id === 'lab' && ownership.hasOwnLab) {
      return {
        ...feature,
        title: 'Lab (In-house Testing) - 1',
        description: 'One in-house lab testing area.',
        enabled: true,
      };
    }
    return feature;
  });
}

export function defaultEquipmentForSft(centerSft: number) {
  const profile = centerSizeProfileForSft(centerSft);
  return {
    hasOwnLab: profile.labType === 'in-house-testing',
    hasUltrasound: profile.ultrasound !== 'none',
    ultrasoundType: profile.ultrasound,
    hasXray: profile.xray,
    hasTmtPft: false,
  };
}

export const defaultCenterFeatures: CenterFeature[] = buildCenterFeaturesForSft(1800);

export const baselineLocation: FranchiseLocation = {
  id: 'manikonda-baseline',
  name: 'Manikonda baseline',
  area: 'Hyderabad',
  status: 'active',
  centerSft: 1800,
  capexType: 'actual',
  capex: 3200000,
  capexItems: defaultCapexItems,
  monthlyFootfall: 1025,
  revenuePerFootfall: 520,
  monthlyExpenses: defaultExpenses,
  centerFeatures: defaultCenterFeatures,
  hasOwnPharmacy: true,
  hasOwnPhysiotherapy: true,
  hasOwnLab: false,
  hasUltrasound: false,
  ultrasoundType: 'none',
  hasXray: false,
  hasTmtPft: false,
};

export const starterLocations: FranchiseLocation[] = [
  {
    ...baselineLocation,
    id: 'gachibowli-projection',
    name: 'Gachibowli',
    area: 'Hyderabad',
    status: 'projected',
    hasUltrasound: false,
    ultrasoundType: 'none',
    hasXray: false,
    hasTmtPft: false,
    capexType: 'projected',
    monthlyFootfall: 820,
    revenuePerFootfall: 480,
  },
  {
    ...baselineLocation,
    id: 'kondapur-projection',
    name: 'Kondapur',
    area: 'Hyderabad',
    status: 'planned',
    centerSft: 2200,
    hasOwnLab: true,
    hasUltrasound: true,
    ultrasoundType: 'basic',
    hasXray: false,
    hasTmtPft: false,
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
  },
];

export function formatMoney(value: number) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

export function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString('en-IN');
}

export function centerSizeProfileForSft(centerSft: number) {
  const sft = Number(centerSft || 0);
  return (
    centerSizeProfiles.find((profile) => sft >= profile.minSft && sft <= profile.maxSft) ||
    centerSizeProfiles.reduce((closest, profile) => {
      const closestDistance = Math.min(Math.abs(sft - closest.minSft), Math.abs(sft - closest.maxSft));
      const profileDistance = Math.min(Math.abs(sft - profile.minSft), Math.abs(sft - profile.maxSft));
      return profileDistance < closestDistance ? profile : closest;
    }, centerSizeProfiles[0])
  );
}

export function estimatedMonthlyFootfall(location: FranchiseLocation) {
  return buildRevenueComponents(location).reduce((sum, component) => sum + component.monthlyVolume, 0);
}

export function estimatedRevenuePerFootfall(location: FranchiseLocation) {
  const components = buildRevenueComponents(location);
  const volume = components.reduce((sum, component) => sum + component.monthlyVolume, 0) || 1;
  return Math.round(projectedMonthlyRevenue(location) / volume);
}

export function estimatedMonthlyRent(location: FranchiseLocation) {
  return Math.round(Number(location.centerSft || 0) * 105);
}

export function monthlyRentForLocation(location: FranchiseLocation) {
  const enteredRent = (location.monthlyExpenses || []).find((expense) => expense.id === 'rent')?.amount || 0;
  return location.status === 'active' && enteredRent > 0 ? enteredRent : estimatedMonthlyRent(location);
}

export function securityDepositForLocation(location: FranchiseLocation) {
  return monthlyRentForLocation(location) * 6;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function enabledFeatureText(location: FranchiseLocation) {
  return applyOwnershipToCenterFeatures(location.centerFeatures || [], {
    hasOwnPharmacy: location.hasOwnPharmacy ?? true,
    hasOwnPhysiotherapy: location.hasOwnPhysiotherapy ?? true,
    hasOwnLab: location.hasOwnLab ?? centerSizeProfileForSft(location.centerSft).labType === 'in-house-testing',
  })
    .filter((feature) => feature.enabled)
    .map((feature) => `${feature.category} ${feature.title} ${feature.description}`.toLowerCase())
    .join(' ');
}

function effectiveLabType(location: FranchiseLocation) {
  const profile = centerSizeProfileForSft(location.centerSft);
  return location.hasOwnLab || profile.labType === 'in-house-testing' ? 'in-house-testing' : 'sample-collection';
}

function equipmentCapexItems(location: FranchiseLocation, selectedText: string): FranchiseCapexItem[] {
  const profile = centerSizeProfileForSft(location.centerSft);
  const items: FranchiseCapexItem[] = [];
  const includesDental = selectedText.includes('dental') || selectedText.includes('dentistry');
  const includesInHouseLab = selectedText.includes('lab') && effectiveLabType(location) === 'in-house-testing';
  const ultrasoundType = location.hasUltrasound ? location.ultrasoundType || profile.ultrasound : 'none';

  if (includesDental) {
    items.push({
      id: 'dental-setup',
      category: 'Dental Equipment',
      label: 'Dental equipment and initial setup',
      estimatedAmount: equipmentCosts.dentalSetup,
      actualAmount: 0,
    });
  }

  if (includesInHouseLab) {
    items.push({
      id: 'pathology-lab',
      category: 'Medical Equipment',
      label: 'Lab equipment - pathology',
      estimatedAmount: equipmentCosts.pathologyLab,
      actualAmount: 0,
    });
  }

  if (location.hasUltrasound && ultrasoundType !== 'none') {
    items.push({
      id: 'ultrasound',
      category: 'Medical Equipment',
      label: `${ultrasoundType === 'advanced' ? 'Advanced' : 'Basic'} ultrasound machine`,
      estimatedAmount: ultrasoundType === 'advanced' ? equipmentCosts.advancedUltrasound : equipmentCosts.basicUltrasound,
      actualAmount: 0,
    });
  }

  if (location.hasXray && profile.xray) {
    items.push({
      id: 'xray',
      category: 'Medical Equipment',
      label: 'X-ray machine',
      estimatedAmount: equipmentCosts.xray,
      actualAmount: 0,
    });
  }

  if (location.hasTmtPft) {
    items.push({
      id: 'tmt-pft',
      category: 'Medical Equipment',
      label: 'TMT and PFT equipment',
      estimatedAmount: equipmentCosts.tmtPft,
      actualAmount: 0,
    });
  }

  return items;
}

export function buildRevenueComponents(location: FranchiseLocation): RevenueComponent[] {
  const profile = centerSizeProfileForSft(location.centerSft);
  const selectedText = enabledFeatureText(location);
  const workingDays = 26;
  const capacityUtilization = 0.5;
  const gpRooms = Math.min(1, profile.consultationRooms);
  const specialistRooms = Math.max(0, profile.consultationRooms - gpRooms);
  const gpTicket = 500;
  const specialistTicket = 600;
  const gpVolume = Math.round(14 * 4 * workingDays * capacityUtilization);
  const specialistVolume = Math.round(specialistRooms * 10 * 4 * workingDays * capacityUtilization);
  const hasPhysio = selectedText.includes('physio');
  const hasDental = selectedText.includes('dental') || selectedText.includes('dentistry');
  const hasLab = selectedText.includes('lab') || selectedText.includes('diagnostic');
  const hasPharmacy = selectedText.includes('pharmacy');
  const hasDayCare = selectedText.includes('day bed') || selectedText.includes('day care');
  const formatMultiplier = profile.id === 'large-2800-3500' ? 1 : profile.id === 'standard-2000-2500' ? 0.86 : 0.72;
  const dentalCapacityRevenue = profile.id === 'large-2800-3500' ? 400000 : profile.id === 'standard-2000-2500' ? 350000 : 300000;
  const dayCareRevenue = Math.round(profile.daycareBeds * 24 * workingDays * capacityUtilization * 260);
  const components: RevenueComponent[] = [
    {
      id: 'gp-consultations',
      label: 'GP consultations',
      monthlyRevenue: gpVolume * gpTicket,
      monthlyVolume: gpVolume,
      ticketSize: gpTicket,
      note: '1 GP room, 14 hrs/day, 15-min slots, 50% utilization.',
    },
  ];

  if (specialistRooms > 0) {
    components.push({
      id: 'specialist-consultations',
      label: 'Specialist consultations',
      monthlyRevenue: specialistVolume * specialistTicket,
      monthlyVolume: specialistVolume,
      ticketSize: specialistTicket,
      note: `${specialistRooms} specialist room${specialistRooms > 1 ? 's' : ''}, 10 hrs/day, 15-min slots, 50% utilization.`,
    });
  }

  if (hasPhysio) {
    const physioSessions = Math.round(9 * 2 * workingDays * capacityUtilization);
    components.push({
      id: 'physiotherapy',
      label: 'Physiotherapy',
      monthlyRevenue: physioSessions * 600,
      monthlyVolume: physioSessions,
      ticketSize: 600,
      note: '9 hrs/day, 30-min sessions, 50% utilization.',
    });
  }

  if (hasDental) {
    const dentalRevenue = Math.round(dentalCapacityRevenue * capacityUtilization);
    components.push({
      id: 'dental',
      label: 'Dental',
      monthlyRevenue: dentalRevenue,
      monthlyVolume: Math.round(dentalRevenue / 1800),
      ticketSize: 1800,
      note: '50% of capped monthly revenue assumption by center format.',
    });
  }

  if (hasLab) {
    const labType = effectiveLabType(location);
    const labVolume = Math.round(12 * (labType === 'in-house-testing' ? 3 : 2) * workingDays * capacityUtilization);
    const labTicket = labType === 'in-house-testing' ? 550 : 400;
    components.push({
      id: 'lab',
      label: labType === 'in-house-testing' ? 'Lab in-house testing' : 'Lab sample collection',
      monthlyRevenue: labVolume * labTicket,
      monthlyVolume: labVolume,
      ticketSize: labTicket,
      note: `${labType === 'in-house-testing' ? 'In-house testing' : 'Sample collection'}, 12 hrs/day, 50% utilization.`,
    });
  }

  const ultrasoundType = location.hasUltrasound ? location.ultrasoundType || profile.ultrasound : 'none';
  if (location.hasUltrasound && ultrasoundType !== 'none') {
    const ultrasoundVolume = 10 * workingDays;
    const ultrasoundTicket = 2000;
    components.push({
      id: 'ultrasound',
      label: `Ultrasound (${ultrasoundType})`,
      monthlyRevenue: ultrasoundVolume * ultrasoundTicket,
      monthlyVolume: ultrasoundVolume,
      ticketSize: ultrasoundTicket,
      note: 'Minimum 10 scans/day at Rs.2,000 average ticket.',
    });
  }

  if (location.hasXray && profile.xray) {
    const xrayVolume = 20 * workingDays;
    components.push({
      id: 'xray',
      label: 'X-ray',
      monthlyRevenue: xrayVolume * 700,
      monthlyVolume: xrayVolume,
      ticketSize: 700,
      note: 'Minimum 20 scans/day.',
    });
  }

  if (hasPharmacy) {
    components.push({
      id: 'pharmacy',
      label: 'Own pharmacy revenue',
      monthlyRevenue: ownPharmacyMatureMonthlyRevenue,
      monthlyVolume: Math.round(ownPharmacyMatureMonthlyRevenue / 900),
      ticketSize: 900,
      note: 'Own pharmacy ramp from Rs.1L/month to Rs.30L/month by Month 24.',
    });
  }

  if (hasDayCare) {
    components.push({
      id: 'day-care',
      label: 'Day care services',
      monthlyRevenue: dayCareRevenue,
      monthlyVolume: Math.round(dayCareRevenue / 1200),
      ticketSize: 1200,
      note: '24-hour availability, 50% utilization assumption.',
    });
  }

  components.push({
    id: 'miscellaneous',
    label: 'Miscellaneous and referrals',
    monthlyRevenue: Math.round(85000 * formatMultiplier * capacityUtilization),
    monthlyVolume: Math.round((85000 * formatMultiplier * capacityUtilization) / 850),
    ticketSize: 850,
    note: '50% capacity assumption for referrals and ancillary revenue.',
  });

  return components;
}

function largestFormatScale(location: FranchiseLocation) {
  const profile = centerSizeProfileForSft(location.centerSft);
  if (profile.id === 'large-2800-3500') return 1;
  return clamp(Number(location.centerSft || profile.minSft) / 3200, 0.5, 1);
}

export function buildRecommendedCapexItems(location: FranchiseLocation): FranchiseCapexItem[] {
  const profile = centerSizeProfileForSft(location.centerSft);
  const selectedText = enabledFeatureText(location);
  const calculatedCapex = clamp(Number(location.centerSft || profile.minSft) * profile.pricePerSft, profile.capexMin, profile.capexMax);
  const includesPhysio = selectedText.includes('physio');
  const includesPharmacy = selectedText.includes('pharmacy');
  const includesDiagnostics = selectedText.includes('diagnostic') || selectedText.includes('lab');
  const securityDeposit = securityDepositForLocation(location);
  const formatScale = largestFormatScale(location);
  const airconditioning = Math.round(fixedCapexCosts.airconditioningLargest * formatScale);
  const interiorsFitout = Math.round(Number(location.centerSft || profile.minSft) * interiorFitoutCostPerSft);
  const fixedSetupTotal =
    interiorsFitout +
    fixedCapexCosts.brandingSignage +
    fixedCapexCosts.licensesCompliance +
    fixedCapexCosts.biomedicalWastePollution +
    fixedCapexCosts.powerBackup +
    fixedCapexCosts.itSystemsSoftware +
    fixedCapexCosts.dayCareClinicalEquipment +
    fixedCapexCosts.cctvSecurityAccess +
    fixedCapexCosts.launchMarketing +
    fixedCapexCosts.plumbing +
    (includesPhysio ? fixedCapexCosts.physiotherapyEquipment : 0) +
    (includesPharmacy ? fixedCapexCosts.ownPharmacyInitialStockSetup : 0) +
    airconditioning +
    fixedCapexCosts.lightingElectricals;
  const fixedEquipmentItems = equipmentCapexItems(location, selectedText);
  const fixedEquipmentTotal = fixedEquipmentItems.reduce((sum, item) => sum + item.estimatedAmount, 0);
  const minimumDetailedSetup =
    profile.id === 'large-2800-3500' ? 900000 : profile.id === 'standard-2000-2500' ? 750000 : 600000;
  const setupCapex = Math.max(
    minimumDetailedSetup,
    calculatedCapex - securityDeposit - fixedSetupTotal - fixedEquipmentTotal,
  );
  const items = [
    { id: 'civil-finishes', category: 'Interiors', label: 'Civil finishes, partitions and wet-area finishing', weight: 0.075 },
    { id: 'furniture-fixtures', category: 'Interiors', label: 'Furniture, fixtures, counters and loose seating', weight: 0.08 },
    { id: 'consult-room-setup', category: 'Medical Equipment', label: `${profile.consultationRooms} consultation room setup, exam couches and instruments`, weight: 0.075 },
    { id: 'daycare-setup', category: 'Medical Equipment', label: `${profile.daycareBeds} day care bed setup with monitors and accessories`, weight: 0.055 },
    { id: 'diagnostics', category: 'Medical Equipment', label: 'Diagnostic room infrastructure and sample collection setup', weight: includesDiagnostics ? 0.05 : 0 },
    { id: 'sterilization-infection-control', category: 'Medical Equipment', label: 'Sterilization, infection control and biomedical bins', weight: 0.035 },
    { id: 'fire-safety', category: 'Licenses & Compliance', label: 'Fire safety equipment and statutory fixtures', weight: 0.03 },
    { id: 'pantry-housekeeping', category: 'Interiors', label: 'Pantry, housekeeping and back-office setup', weight: 0.03 },
    { id: 'supplies-accessories', category: 'Contingency', label: 'Initial supplies, accessories and electronic appliances', weight: 0.055 },
    { id: 'installation-logistics', category: 'Contingency', label: 'Installation, freight, commissioning and vendor coordination', weight: 0.035 },
    { id: 'contingency-buffer', category: 'Contingency', label: 'Project contingency buffer', weight: 0.04 },
  ];
  const activeItems = items.filter((item) => item.weight > 0);
  const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0) || 1;
  return [
    {
      id: 'lease-deposit',
      category: 'Deposits',
      label: 'Lease security deposit - 6 months rent',
      estimatedAmount: securityDeposit,
      actualAmount: 0,
    },
    {
      id: 'interiors',
      category: 'Interiors',
      label: `Interiors and fit-out for ${profile.label} at Rs.1,000/SFT`,
      estimatedAmount: interiorsFitout,
      actualAmount: 0,
    },
    {
      id: 'branding-signage',
      category: 'Branding & Signage',
      label: 'Branding and signage',
      estimatedAmount: fixedCapexCosts.brandingSignage,
      actualAmount: 0,
    },
    {
      id: 'licenses',
      category: 'Licenses & Compliance',
      label: 'Licenses and compliance',
      estimatedAmount: fixedCapexCosts.licensesCompliance,
      actualAmount: 0,
    },
    {
      id: 'biomedical-waste-pollution',
      category: 'Licenses & Compliance',
      label: 'Biomedical waste and Pollution Control Board certification',
      estimatedAmount: fixedCapexCosts.biomedicalWastePollution,
      actualAmount: 0,
    },
    {
      id: 'airconditioning',
      category: 'Interiors',
      label: `Airconditioning (${profile.id === 'large-2800-3500' ? 'largest format' : 'proportional to SFT'})`,
      estimatedAmount: airconditioning,
      actualAmount: 0,
    },
    {
      id: 'lighting-electricals',
      category: 'Interiors',
      label: 'Lighting and electricals',
      estimatedAmount: fixedCapexCosts.lightingElectricals,
      actualAmount: 0,
    },
    {
      id: 'plumbing',
      category: 'Interiors',
      label: 'Plumbing',
      estimatedAmount: fixedCapexCosts.plumbing,
      actualAmount: 0,
    },
    {
      id: 'daycare-clinical-equipment',
      category: 'Medical Equipment',
      label: 'ECG, patient monitor, oxygen cylinder and day care surgicals',
      estimatedAmount: fixedCapexCosts.dayCareClinicalEquipment,
      actualAmount: 0,
    },
    {
      id: 'power-backup',
      category: 'IT & Software',
      label: 'Power backup',
      estimatedAmount: fixedCapexCosts.powerBackup,
      actualAmount: 0,
    },
    {
      id: 'it-software',
      category: 'IT & Software',
      label: 'IT systems and software',
      estimatedAmount: fixedCapexCosts.itSystemsSoftware,
      actualAmount: 0,
    },
    {
      id: 'cctv-security-access',
      category: 'IT & Software',
      label: 'CCTV, access control and security systems',
      estimatedAmount: fixedCapexCosts.cctvSecurityAccess,
      actualAmount: 0,
    },
    {
      id: 'launch-marketing',
      category: 'Launch Marketing',
      label: 'Launch campaign and local activation',
      estimatedAmount: fixedCapexCosts.launchMarketing,
      actualAmount: 0,
    },
    ...(includesPhysio
      ? [
          {
            id: 'physiotherapy',
            category: 'Physiotherapy Equipment',
            label: 'Physiotherapy equipment',
            estimatedAmount: fixedCapexCosts.physiotherapyEquipment,
            actualAmount: 0,
          },
        ]
      : []),
    ...(includesPharmacy
      ? [
          {
            id: 'pharmacy-initial-stock-setup',
            category: 'Pharmacy Setup',
            label: 'Own Pharmacy - initial stock and setup',
            estimatedAmount: fixedCapexCosts.ownPharmacyInitialStockSetup,
            actualAmount: 0,
          },
        ]
      : []),
    ...fixedEquipmentItems,
    ...activeItems.map((item) => ({
      id: item.id,
      category: item.category,
      label: item.label,
      estimatedAmount: Math.round((item.weight / totalWeight) * setupCapex),
      actualAmount: 0,
    })),
  ];
}

export function buildRecommendedOpexItems(location: FranchiseLocation): FranchiseExpense[] {
  const profile = centerSizeProfileForSft(location.centerSft);
  const selectedText = enabledFeatureText(location);
  const includesDental = selectedText.includes('dental') || selectedText.includes('dentistry');
  const hasDiagnostics = selectedText.includes('lab') || selectedText.includes('diagnostic');
  const includesPharmacy = selectedText.includes('pharmacy');
  const scale = profile.id === 'large-2800-3500' ? 1 : profile.id === 'standard-2000-2500' ? 0.5 : 0;
  const revenueComponents = buildRevenueComponents(location);
  const revenueById = new Map(revenueComponents.map((component) => [component.id, component.monthlyRevenue]));
  const dentalRevenue = Number(revenueById.get('dental') || 0);
  const items: FranchiseExpense[] = [
    { id: 'rent', label: `Rent for ${profile.label}`, amount: monthlyRentForLocation(location), kind: 'fixed', annualEscalation: 0.05 },
    { id: 'salaries', label: 'Salaries', amount: Math.round(400000 + 100000 * scale + (includesPharmacy ? 100000 : 0)), kind: 'fixed', annualEscalation: 0.1 },
    { id: 'utilities-power-backup', label: 'Utilities & power backup', amount: Math.round(50000 + 25000 * scale), kind: 'fixed', annualEscalation: 0.06 },
    { id: 'building-maintenance', label: 'Building maintenance', amount: Math.round(5000 + 5000 * scale), kind: 'fixed', annualEscalation: 0.06 },
    { id: 'marketing-promotions', label: 'Marketing & promotions', amount: 150000, kind: 'fixed', annualEscalation: 0.04 },
    { id: 'management-fee', label: 'Management Fee', amount: focoRules.monthlyManagementFee, kind: 'fixed', annualEscalation: focoRules.managementFeeAnnualEscalation },
    { id: 'housekeeping', label: 'Housekeeping', amount: Math.round(25000 + 20000 * scale), kind: 'fixed', annualEscalation: 0.06 },
    { id: 'office-pantry-supplies', label: 'Office & pantry supplies', amount: Math.round(15000 + 10000 * scale), kind: 'fixed', annualEscalation: 0.05 },
    {
      id: 'doctor-payout',
      label: 'Doctor and specialist payouts',
      amount: 10000,
      kind: 'variable',
      annualEscalation: 0,
    },
    ...(includesPharmacy
      ? [{
          id: 'pharmacy-supplies',
          label: 'Pharmacy supplies',
          amount: Math.round(ownPharmacyStartMonthlyRevenue * (1 - ownPharmacyNetRevenueShare)),
          kind: 'variable' as const,
          annualEscalation: 0,
        }]
      : []),
    ...(includesDental
      ? [{
          id: 'dental-operations',
          label: 'Dental consumables and service support',
          amount: Math.round(dentalRevenue * 0.18),
          kind: 'variable' as const,
          annualEscalation: 0.05,
        }]
      : []),
    ...(hasDiagnostics
      ? [{
          id: 'diagnostics-operations',
          label: 'Lab and diagnostics operations',
          amount: diagnosticsOperationsStartingCost(location),
          kind: 'variable' as const,
          annualEscalation: 0,
        }]
      : []),
  ];
  return items;
}

function isManagementFeeExpense(expense: FranchiseExpense) {
  return expense.id === 'management-fee' || expense.label.toLowerCase().includes('management fee');
}

export function totalMonthlyExpenses(location: FranchiseLocation) {
  return location.monthlyExpenses.reduce((sum, expense) => (
    sum + Number(normalizedExpenseForLocation(location, expense).amount || 0)
  ), 0);
}

function diagnosticsOperationsStartingCost(location: FranchiseLocation) {
  if (effectiveLabType(location) !== 'sample-collection') return 10000;
  const revenueById = new Map(buildRevenueComponents(location).map((component) => [component.id, component.monthlyRevenue]));
  const pathologyRevenue = Number(revenueById.get('lab') || 0);
  const radiologyRevenue = Number(revenueById.get('ultrasound') || 0) + Number(revenueById.get('xray') || 0);
  const pathologyCost = pathologyRevenue * (1 - sampleCollectionPathologyMargin);
  const radiologyCost = radiologyRevenue * (1 - sampleCollectionRadiologyMargin);
  return Math.round(10000 + pathologyCost + radiologyCost);
}

function normalizedExpenseForLocation(location: FranchiseLocation, expense: FranchiseExpense) {
  if (expense.id === 'rent') return { ...expense, amount: monthlyRentForLocation(location) };
  if (expense.id === 'diagnostics-operations') {
    return { ...expense, amount: Math.max(Number(expense.amount || 0), diagnosticsOperationsStartingCost(location)) };
  }
  return expense;
}

export function normalizedMonthlyExpenses(location: FranchiseLocation) {
  return location.monthlyExpenses.map((expense) => normalizedExpenseForLocation(location, expense));
}

export function monthlyExpenseForMonth(expense: FranchiseExpense, month: number) {
  if (expense.id === 'doctor-payout') {
    const progress = Math.min(1, Math.max(0, (month - 1) / 59));
    return Math.round(10000 + (350000 - 10000) * progress);
  }
  if (expense.id === 'diagnostics-operations') {
    const startingCost = Math.max(10000, Number(expense.amount || 0));
    const matureCost = Math.max(600000, startingCost);
    const progress = Math.min(1, Math.max(0, (month - 1) / 59));
    return Math.round(startingCost + (matureCost - startingCost) * progress);
  }
  if (expense.id === 'pharmacy-supplies') {
    return Math.round(ownPharmacyRevenueForMonth(month) * (1 - ownPharmacyNetRevenueShare));
  }
  const escalation = Math.max(0, Number(expense.annualEscalation || 0));
  const elapsedYears = Math.max(0, Math.floor((month - 1) / 12));
  return Math.round(Number(expense.amount || 0) * ((1 + escalation) ** elapsedYears));
}

export function totalMonthlyExpensesForMonth(location: FranchiseLocation, month: number) {
  return location.monthlyExpenses.reduce((sum, expense) => {
    return sum + monthlyExpenseForMonth(normalizedExpenseForLocation(location, expense), month);
  }, 0);
}

export function monthlyManagementFeeForLocation(location: FranchiseLocation, month: number) {
  const configuredFee = location.monthlyExpenses.find(isManagementFeeExpense);
  if (configuredFee) return monthlyExpenseForMonth(configuredFee, month);
  return managementFeeForMonth(month);
}

export function operatingOpexForMonth(location: FranchiseLocation, month: number) {
  return location.monthlyExpenses.reduce((sum, expense) => {
    if (isManagementFeeExpense(expense)) return sum;
    return sum + monthlyExpenseForMonth(normalizedExpenseForLocation(location, expense), month);
  }, 0);
}

export function operatingOpex(location: FranchiseLocation) {
  return location.monthlyExpenses.reduce((sum, expense) => {
    if (isManagementFeeExpense(expense)) return sum;
    return sum + Number(normalizedExpenseForLocation(location, expense).amount || 0);
  }, 0);
}

function isOwnerOnlyFundingItem(item: FranchiseCapexItem) {
  const text = `${item.id} ${item.category} ${item.label}`.toLowerCase();
  return text.includes('franchise fee') || text.includes('wcsd') || text.includes('working capital security');
}

export function totalEstimatedCapex(location: FranchiseLocation) {
  const capexItems = (location.capexItems || []).filter((item) => !isOwnerOnlyFundingItem(item));
  return capexItems.reduce((sum, item) => sum + Number(item.estimatedAmount || 0), 0) || Number(location.capex || 0);
}

export function totalActualCapex(location: FranchiseLocation) {
  return (location.capexItems || [])
    .filter((item) => !isOwnerOnlyFundingItem(item))
    .reduce((sum, item) => sum + Number(item.actualAmount || 0), 0);
}

export function effectiveCapex(location: FranchiseLocation) {
  return totalEstimatedCapex(location);
}

export function ownerCapexContribution(location: FranchiseLocation) {
  return Math.round(effectiveCapex(location) * focoRules.franchiseOwnerCapexShare);
}

export function doctyCapexContribution(location: FranchiseLocation) {
  return Math.round(effectiveCapex(location) * focoRules.doctyCapexShare);
}

export function workingCapitalSecurityDeposit(location: FranchiseLocation) {
  return Math.round(totalMonthlyExpenses(location) * focoRules.wcsdMonths);
}

export function initialInvestmentRequired(location: FranchiseLocation) {
  return ownerCapexContribution(location) + focoRules.franchiseFee + workingCapitalSecurityDeposit(location);
}

export function managementFeeForMonth(month: number) {
  const escalationYears = Math.max(0, Math.floor((month - 1) / 12));
  return Math.round(focoRules.monthlyManagementFee * ((1 + focoRules.managementFeeAnnualEscalation) ** escalationYears));
}

export function projectedMonthlyRevenue(location: FranchiseLocation) {
  return buildRevenueComponents(location).reduce((sum, component) => sum + component.monthlyRevenue, 0);
}

export function ownPharmacyRevenueForMonth(month: number) {
  if (month <= ownPharmacyMatureMonth) {
    const progress = Math.min(1, Math.max(0, (month - 1) / (ownPharmacyMatureMonth - 1)));
    return Math.round(ownPharmacyStartMonthlyRevenue + (ownPharmacyMatureMonthlyRevenue - ownPharmacyStartMonthlyRevenue) * progress);
  }
  const elapsedYears = Math.max(0, (month - ownPharmacyMatureMonth) / 12);
  return Math.round(ownPharmacyMatureMonthlyRevenue * ((1 + ownPharmacyRevenueAnnualEscalation) ** elapsedYears));
}

export function buildProjection(location: FranchiseLocation, months = 60): ProjectionMonth[] {
  const revenueComponents = buildRevenueComponents(location);
  const hasOwnPharmacyRevenue = revenueComponents.some((component) => component.id === 'pharmacy');
  const baseRevenue = revenueComponents.reduce((sum, component) => sum + component.monthlyRevenue, 0);
  const steadyPharmacyRevenue = hasOwnPharmacyRevenue ? ownPharmacyMatureMonthlyRevenue : 0;
  const clinicBaseRevenue = Math.max(0, baseRevenue - steadyPharmacyRevenue);
  const month18Outflow = operatingOpexForMonth(location, focoRules.breakEvenTargetMonth) + monthlyManagementFeeForLocation(location, focoRules.breakEvenTargetMonth);
  const breakEvenRevenue = month18Outflow * 1.03;
  const matureOutflow = operatingOpexForMonth(location, 36) + monthlyManagementFeeForLocation(location, 36);
  const breakEvenClinicRevenue = Math.max(0, breakEvenRevenue - (hasOwnPharmacyRevenue ? ownPharmacyRevenueForMonth(focoRules.breakEvenTargetMonth) : 0));
  const matureClinicRevenue = Math.max(
    clinicBaseRevenue,
    breakEvenClinicRevenue,
    matureOutflow * 1.16 - (hasOwnPharmacyRevenue ? ownPharmacyRevenueForMonth(36) : 0),
  );
  const firstMonthRevenue = 50000;
  const rampStart = firstMonthRevenue / Math.max(1, breakEvenClinicRevenue);
  const revenueAnnualEscalation = 0.05;
  const projection: ProjectionMonth[] = [];
  let cumulativeCashFlow = -initialInvestmentRequired(location);
  let cumulativeManagementFeeCollected = 0;
  let previousRevenue = 0;

  for (let index = 0; index < months; index += 1) {
    const month = index + 1;
    const earlyRamp = Math.min(1, Math.max(0, (month - 1) / (focoRules.breakEvenTargetMonth - 1)));
    const matureRamp = Math.min(1, Math.max(0, month - 18) / 18);
    const earlyRevenue = firstMonthRevenue + (breakEvenClinicRevenue - firstMonthRevenue) * earlyRamp;
    const steadyRevenue = breakEvenClinicRevenue + (matureClinicRevenue - breakEvenClinicRevenue) * matureRamp;
    const plateauMultiplier = month > 36 ? (1 + revenueAnnualEscalation) ** ((month - 36) / 12) : 1;
    const pharmacyRevenue = hasOwnPharmacyRevenue ? ownPharmacyRevenueForMonth(month) : 0;
    const rawRevenue = Math.round((month <= 18 ? earlyRevenue : steadyRevenue) * plateauMultiplier + pharmacyRevenue);
    const revenue = Math.max(previousRevenue, rawRevenue);
    previousRevenue = revenue;
    const opex = operatingOpexForMonth(location, month);
    const managementFee = monthlyManagementFeeForLocation(location, month);
    const shortfallBeforeWaiver = Math.max(0, opex + managementFee - revenue);
    const managementFeeWaiver = month > focoRules.breakEvenTargetMonth
      ? Math.min(managementFee, shortfallBeforeWaiver, cumulativeManagementFeeCollected)
      : 0;
    const netManagementFee = managementFee - managementFeeWaiver;
    const expenses = opex + netManagementFee;
    cumulativeManagementFeeCollected += netManagementFee;
    const matureFootfall = estimatedMonthlyFootfall(location);
    const footfallRamp = month <= 18
      ? rampStart + earlyRamp * (1 - rampStart)
      : 1 + Math.min(0.12, (month - 18) * 0.004);
    const operatingProfit = revenue - expenses;
    const ownerFundingRequired = Math.max(0, expenses - revenue);
    cumulativeCashFlow += operatingProfit;
    projection.push({
      month,
      footfall: Math.round(matureFootfall * footfallRamp),
      revenue,
      opex,
      managementFee,
      managementFeeWaiver,
      expenses,
      operatingProfit,
      ownerFundingRequired,
      cumulativeCashFlow,
      breakEven: operatingProfit >= 0,
    });
  }

  return projection;
}

export function firstOperatingBreakEvenMonth(projection: ProjectionMonth[]) {
  return projection.find((month) => month.operatingProfit >= 0)?.month || 0;
}

export function eighteenMonthOperatingFundingNeed(projection: ProjectionMonth[]) {
  return projection
    .filter((month) => month.month <= focoRules.breakEvenTargetMonth)
    .reduce((sum, month) => sum + month.ownerFundingRequired, 0);
}

export function conservativeBaseline() {
  const monthlyExpenses = totalMonthlyExpenses(baselineLocation);
  const monthlyRevenue = projectedMonthlyRevenue(baselineLocation);
  const monthlyFootfall = estimatedMonthlyFootfall(baselineLocation);
  const revenuePerFootfall = estimatedRevenuePerFootfall(baselineLocation);
  const monthlyOperatingProfit = monthlyRevenue - monthlyExpenses;
  return {
    monthlyExpenses,
    monthlyRevenue,
    monthlyFootfall,
    revenuePerFootfall,
    monthlyOperatingProfit,
    operatingMargin: monthlyRevenue > 0 ? monthlyOperatingProfit / monthlyRevenue : 0,
  };
}
