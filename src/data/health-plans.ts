export type HealthPlanIcon = 'individual' | 'couple' | 'family' | 'extended-family';
export type HealthPlanBenefitIcon = 'consultation' | 'pharmacy' | 'lab' | 'booking' | 'offers' | 'tests';

export interface HealthPlan {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  estimatedAnnualSavings: number;
  icon: HealthPlanIcon;
  members: string;
  popular: boolean;
}

export interface HealthPlanBenefit {
  icon: HealthPlanBenefitIcon;
  title: string;
  description: string;
}

export const totalCareBenefits: HealthPlanBenefit[] = [
  {
    icon: 'consultation',
    title: 'Unlimited Consultations',
    description: 'General Physician, Dental & Physiotherapy',
  },
  {
    icon: 'pharmacy',
    title: '20% Pharmacy Discount',
    description: 'On all branded medicines',
  },
  {
    icon: 'lab',
    title: 'Additional 20% Discount on Lab Tests',
    description: 'Over and above existing offers',
  },
  {
    icon: 'booking',
    title: 'Priority Appointment Booking',
    description: 'With Specialists & Surgeons',
  },
  {
    icon: 'offers',
    title: 'Exclusive Member-Only Promotional Offers',
    description: 'Special deals and discounts',
  },
  {
    icon: 'tests',
    title: 'Free Health Tests Included',
    description: 'CBP, FBS, RBS, Glucose & Blood Grouping',
  },
];

export const totalCarePlans: HealthPlan[] = [
  {
    id: 'docty-me',
    name: 'Docty Me',
    subtitle: 'Individual Plan',
    description: 'Perfect for individuals seeking affordable year-round healthcare support.',
    price: 999,
    estimatedAnnualSavings: 6500,
    icon: 'individual',
    members: '1 Member',
    popular: false,
  },
  {
    id: 'docty-us',
    name: 'Docty Us',
    subtitle: 'Couple Plan',
    description: 'Designed for couples to stay healthy together with unlimited consultations and healthcare benefits.',
    price: 1799,
    estimatedAnnualSavings: 12000,
    icon: 'couple',
    members: '2 Members',
    popular: true,
  },
  {
    id: 'docty-we',
    name: 'Docty We',
    subtitle: 'Family Plan',
    description: 'Ideal for small families with healthcare coverage for parents and children.',
    price: 2399,
    estimatedAnnualSavings: 18000,
    icon: 'family',
    members: '3 Members',
    popular: false,
  },
  {
    id: 'docty-all',
    name: 'Docty All',
    subtitle: 'Extended Family Plan',
    description: 'Comprehensive healthcare support for larger families with maximum savings and benefits.',
    price: 2999,
    estimatedAnnualSavings: 24000,
    icon: 'extended-family',
    members: '4 Members',
    popular: false,
  },
];

export const totalCareStartingPrice = Math.min(...totalCarePlans.map((plan) => plan.price));
export const totalCareMaxAnnualSavings = Math.max(
  ...totalCarePlans.map((plan) => plan.estimatedAnnualSavings)
);
