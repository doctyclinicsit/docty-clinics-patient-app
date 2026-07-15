import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FlaskConical,
  HeartPulse,
  Layers3,
  Package,
  Search,
  Sparkles,
  Stethoscope,
  Tag,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { healthPackages, type HealthPackage } from '@/data/health-packages';
import { toast } from 'sonner';
import { submitClinicLead } from '@/lib/clinic-leads';
import { usePatientSession } from '@/lib/patient-session-context';

interface LabTest {
  slug: string;
  shortName: string;
  fullName: string;
  category: string;
  sampleType: string;
  description: string;
  whyNeeded: string;
  preparation: string;
  price?: number | null;
  offerPrice?: number | null;
  displayOrder: number;
}

interface LabTestsResponse {
  tests: LabTest[];
  categories: string[];
  source: 'neon' | 'fallback' | 'fallback-error';
  warning?: string;
}

interface SavedCustomPackage {
  id: string;
  name: string;
  createdAt: string;
  tests: LabTest[];
  regularTotal: number;
  doctyTotal: number;
  savings: number;
}

type AssistantGender = 'Female' | 'Male' | 'Other';

interface AssistantOption {
  id: string;
  label: string;
  keywords: string[];
}

interface AssistantProfile {
  age: number;
  gender: AssistantGender;
  conditions: string[];
  habits: string[];
  lifestyle: string[];
  followUps: string[];
}

interface AssistantQuestionGroup {
  id: string;
  title: string;
  helper?: string;
  isVisible: (context: {
    age: number;
    gender: AssistantGender | '';
    conditions: string[];
    habits: string[];
    lifestyle: string[];
  }) => boolean;
  options: AssistantOption[];
}

interface AssistantRecommendation {
  test: LabTest;
  reasons: string[];
}

interface AssistantTestReason {
  slug: string;
  name: string;
  reasons: string[];
}

async function fetchLabTests(): Promise<LabTestsResponse> {
  const response = await fetch('/api/lab-tests');
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Unable to load lab tests.');
  return body as LabTestsResponse;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

const audienceIcons = {
  Women: HeartPulse,
  Adults: Users,
  'All Ages': Sparkles,
};

const CUSTOM_PACKAGE_MIN_TESTS = 10;
const SAVED_CUSTOM_PACKAGES_STORAGE_KEY = 'docty_quick_labs_saved_packages_v1';

const ASSISTANT_BASE_KEYWORDS = [
  'CBC',
  'CBP',
  'HbA1c',
  'Fasting Blood Sugar',
  'Lipid Profile',
  'Liver Function Test',
  'Kidney Function Test',
  'Thyroid Profile',
  'Urine Routine',
  'Vitamin D',
  'Vitamin B12',
  'ESR',
];

const ASSISTANT_CONDITION_OPTIONS: AssistantOption[] = [
  {
    id: 'diabetes',
    label: 'Diabetes / sugar concerns',
    keywords: ['HbA1c', 'Fasting Blood Sugar', 'Post Prandial Blood Sugar', 'Lipid Profile', 'Urine Microalbumin', 'Creatinine'],
  },
  {
    id: 'thyroid',
    label: 'Thyroid symptoms',
    keywords: ['TSH', 'T3', 'T4', 'Thyroid Profile'],
  },
  {
    id: 'bp-heart',
    label: 'BP / heart risk',
    keywords: ['Lipid Profile', 'ECG', 'HbA1c', 'Creatinine', 'High Sensitive CRP'],
  },
  {
    id: 'liver',
    label: 'Liver / digestion',
    keywords: ['Liver Function Test', 'SGPT', 'SGOT', 'Bilirubin', 'GGT'],
  },
  {
    id: 'kidney-urine',
    label: 'Kidney / urine issues',
    keywords: ['Kidney Function Test', 'Creatinine', 'Urea', 'Uric Acid', 'Urine Routine'],
  },
  {
    id: 'fatigue',
    label: 'Fatigue / low energy',
    keywords: ['CBC', 'CBP', 'Ferritin', 'Vitamin D', 'Vitamin B12', 'TSH'],
  },
  {
    id: 'fever-infection',
    label: 'Fever / infection tendency',
    keywords: ['CBC', 'CBP', 'ESR', 'CRP', 'Widal', 'Dengue', 'Malaria'],
  },
  {
    id: 'bone-joint',
    label: 'Bone / joint pain',
    keywords: ['Vitamin D', 'Calcium', 'Uric Acid', 'RA Factor', 'CRP', 'ESR'],
  },
];

const ASSISTANT_HABIT_OPTIONS: AssistantOption[] = [
  {
    id: 'smoking',
    label: 'Smoking / tobacco',
    keywords: ['Lipid Profile', 'High Sensitive CRP', 'Chest X Ray', 'CBC', 'Spirometry'],
  },
  {
    id: 'alcohol',
    label: 'Alcohol use',
    keywords: ['Liver Function Test', 'GGT', 'Lipid Profile', 'Uric Acid', 'Vitamin B12'],
  },
  {
    id: 'stress-sleep',
    label: 'High stress / poor sleep',
    keywords: ['TSH', 'Vitamin D', 'Vitamin B12', 'HbA1c', 'Lipid Profile'],
  },
  {
    id: 'outside-food',
    label: 'Frequent outside food',
    keywords: ['Liver Function Test', 'Lipid Profile', 'HbA1c', 'Uric Acid'],
  },
];

const ASSISTANT_LIFESTYLE_OPTIONS: AssistantOption[] = [
  {
    id: 'sedentary',
    label: 'Mostly sitting / desk work',
    keywords: ['HbA1c', 'Lipid Profile', 'Vitamin D', 'Liver Function Test'],
  },
  {
    id: 'weight',
    label: 'Weight management',
    keywords: ['HbA1c', 'Fasting Blood Sugar', 'Lipid Profile', 'TSH', 'Liver Function Test'],
  },
  {
    id: 'fitness',
    label: 'Fitness / active routine',
    keywords: ['CBC', 'Vitamin D', 'Vitamin B12', 'Calcium', 'Creatinine', 'Liver Function Test'],
  },
  {
    id: 'frequent-travel',
    label: 'Frequent travel',
    keywords: ['CBC', 'Liver Function Test', 'Vitamin D', 'Vitamin B12', 'HbA1c'],
  },
];

const ASSISTANT_FOLLOW_UP_GROUPS: AssistantQuestionGroup[] = [
  {
    id: 'recent-symptoms',
    title: 'Anything noticed recently?',
    helper: 'Optional, but this helps the assistant pick a sharper package.',
    isVisible: ({ age, gender }) => age > 0 && Boolean(gender),
    options: [
      {
        id: 'recent-fatigue',
        label: 'Tiredness / weakness',
        keywords: ['CBC', 'CBP', 'Ferritin', 'Vitamin D', 'Vitamin B12', 'TSH'],
      },
      {
        id: 'recent-weight-change',
        label: 'Weight change',
        keywords: ['TSH', 'HbA1c', 'Fasting Blood Sugar', 'Lipid Profile', 'Liver Function Test'],
      },
      {
        id: 'recent-fever',
        label: 'Recent fever',
        keywords: ['CBC', 'CBP', 'ESR', 'CRP', 'Dengue', 'Malaria', 'Widal'],
      },
      {
        id: 'recent-body-pain',
        label: 'Body ache / joint pain',
        keywords: ['Vitamin D', 'Calcium', 'Uric Acid', 'RA Factor', 'ESR', 'CRP'],
      },
    ],
  },
  {
    id: 'family-history',
    title: 'Family history',
    helper: 'Useful for preventive screening, especially after 30.',
    isVisible: ({ age }) => age >= 30,
    options: [
      {
        id: 'family-diabetes',
        label: 'Diabetes in family',
        keywords: ['HbA1c', 'Fasting Blood Sugar', 'Lipid Profile', 'Urine Microalbumin'],
      },
      {
        id: 'family-heart',
        label: 'Heart disease / BP',
        keywords: ['Lipid Profile', 'ECG', 'High Sensitive CRP', 'HbA1c'],
      },
      {
        id: 'family-thyroid',
        label: 'Thyroid disorder',
        keywords: ['TSH', 'T3', 'T4', 'Thyroid Profile'],
      },
      {
        id: 'family-kidney',
        label: 'Kidney disease',
        keywords: ['Kidney Function Test', 'Creatinine', 'Urea', 'Urine Routine'],
      },
    ],
  },
  {
    id: 'women-health',
    title: "Women's health",
    isVisible: ({ gender }) => gender === 'Female',
    options: [
      {
        id: 'women-heavy-periods',
        label: 'Heavy periods',
        keywords: ['CBC', 'CBP', 'Ferritin', 'Iron Studies', 'TSH'],
      },
      {
        id: 'women-irregular-periods',
        label: 'Irregular periods / PCOS',
        keywords: ['TSH', 'LH', 'FSH', 'Prolactin', 'HbA1c', 'Lipid Profile'],
      },
      {
        id: 'women-pregnancy-planning',
        label: 'Pregnancy planning',
        keywords: ['CBC', 'CBP', 'TSH', 'Vitamin D', 'Blood Group', 'Urine Routine'],
      },
      {
        id: 'women-menopause',
        label: 'Perimenopause / menopause',
        keywords: ['Calcium', 'Vitamin D', 'Lipid Profile', 'HbA1c', 'TSH'],
      },
    ],
  },
  {
    id: 'sugar-follow-up',
    title: 'Sugar risk follow-up',
    isVisible: ({ age, conditions, lifestyle }) =>
      age >= 35 || conditions.includes('diabetes') || lifestyle.includes('weight'),
    options: [
      {
        id: 'sugar-thirst',
        label: 'More thirst / urination',
        keywords: ['HbA1c', 'Fasting Blood Sugar', 'Post Prandial Blood Sugar', 'Urine Routine'],
      },
      {
        id: 'sugar-slow-healing',
        label: 'Slow wound healing',
        keywords: ['HbA1c', 'Fasting Blood Sugar', 'CBC', 'CBP'],
      },
    ],
  },
  {
    id: 'heart-lung-follow-up',
    title: 'Heart and breathing',
    isVisible: ({ age, conditions, habits }) =>
      age >= 40 || conditions.includes('bp-heart') || habits.includes('smoking'),
    options: [
      {
        id: 'heart-breathless',
        label: 'Breathlessness',
        keywords: ['ECG', 'CBC', 'CBP', 'Chest X Ray', 'Lipid Profile'],
      },
      {
        id: 'lung-cough',
        label: 'Cough / wheeze',
        keywords: ['Chest X Ray', 'CBC', 'CBP', 'ESR', 'CRP'],
      },
      {
        id: 'heart-chest-discomfort',
        label: 'Chest discomfort',
        keywords: ['ECG', 'Lipid Profile', 'High Sensitive CRP', 'HbA1c'],
      },
    ],
  },
  {
    id: 'liver-digestion-follow-up',
    title: 'Digestion and liver',
    isVisible: ({ conditions, habits }) =>
      conditions.includes('liver') || habits.includes('alcohol') || habits.includes('outside-food'),
    options: [
      {
        id: 'digestion-acidity',
        label: 'Acidity / digestion issues',
        keywords: ['Liver Function Test', 'Amylase', 'Lipase', 'CBC', 'CBP'],
      },
      {
        id: 'liver-jaundice',
        label: 'Yellow eyes / jaundice concern',
        keywords: ['Liver Function Test', 'Bilirubin', 'SGPT', 'SGOT', 'GGT'],
      },
    ],
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IN').format(price);
}

function formatPackagePrice(price: number) {
  return `INR ${formatPrice(Math.round(price))}`;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isRadiologyTest(test: LabTest) {
  const haystack = `${test.category} ${test.fullName} ${test.shortName}`.toLowerCase();
  return (
    test.category === 'Imaging & Procedures' ||
    /\b(x[- ]?ray|ultrasound|usg|mri|ct scan|mammography|doppler|radiology)\b/i.test(haystack)
  );
}

function getCustomPackageBasePrice(test: LabTest) {
  if (typeof test.price === 'number' && Number.isFinite(test.price)) return test.price;
  if (typeof test.offerPrice === 'number' && Number.isFinite(test.offerPrice)) return test.offerPrice;
  return 0;
}

function getCustomPackageDiscountRate(test: LabTest) {
  return isRadiologyTest(test) ? 0.1 : 0.6;
}

function getCustomPackagePrice(test: LabTest) {
  const basePrice = getCustomPackageBasePrice(test);
  if (basePrice <= 0) return 0;
  return Math.round(basePrice * (1 - getCustomPackageDiscountRate(test)));
}

function getTestDisplayName(test: LabTest) {
  return test.shortName ? `${test.shortName} · ${test.fullName}` : test.fullName;
}

function matchesCustomPackageSearch(test: LabTest, searchQuery: string) {
  const search = normalizeSearch(searchQuery);
  if (!search) return true;
  const haystack = normalizeSearch(
    [
      test.shortName,
      test.fullName,
      test.category,
      test.sampleType,
      test.description,
      test.whyNeeded,
    ].join(' ')
  );
  return search.split(' ').filter(Boolean).every((word) => haystack.includes(word));
}

function scoreTestForAssistantKeyword(test: LabTest, keyword: string) {
  const search = normalizeSearch(keyword);
  if (!search) return 0;

  const shortName = normalizeSearch(test.shortName);
  const fullName = normalizeSearch(test.fullName);
  const category = normalizeSearch(test.category);
  const description = normalizeSearch(`${test.description} ${test.whyNeeded}`);
  const words = search.split(' ').filter(Boolean);
  let score = 0;

  if (shortName === search) score += 120;
  if (shortName.includes(search)) score += 90;
  if (fullName === search) score += 100;
  if (fullName.includes(search)) score += 75;
  if (words.length > 1 && words.every((word) => fullName.includes(word) || shortName.includes(word))) score += 55;
  if (category.includes(search)) score += 35;
  if (description.includes(search)) score += 25;
  if (words.some((word) => description.includes(word))) score += 10;

  return score;
}

function getAssistantKeywordPurpose(keyword: string) {
  const search = normalizeSearch(keyword);
  if (/\b(cbc|cbp|complete blood)\b/.test(search)) return 'blood count, anaemia, and infection markers';
  if (/hba1c|sugar|glucose|prandial/.test(search)) return 'blood sugar and diabetes risk markers';
  if (/lipid|cholesterol|triglyceride/.test(search)) return 'cholesterol and heart-risk markers';
  if (/liver|sgpt|sgot|bilirubin|ggt/.test(search)) return 'liver function markers';
  if (/kidney|creatinine|urea|microalbumin/.test(search)) return 'kidney function and urine-related markers';
  if (/thyroid|tsh|t3|t4/.test(search)) return 'thyroid balance';
  if (/vitamin d|calcium/.test(search)) return 'bone and vitamin status';
  if (/vitamin b12|ferritin|iron/.test(search)) return 'nutrition and deficiency markers';
  if (/urine/.test(search)) return 'urine and kidney screening clues';
  if (/ecg|chest x ray|spirometry/.test(search)) return 'heart or breathing screening clues';
  if (/esr|crp|widal|dengue|malaria/.test(search)) return 'inflammation or infection clues';
  if (/psa/.test(search)) return 'age-linked prostate screening discussion';
  if (/pap/.test(search)) return "women's preventive screening discussion";
  return keyword.toLowerCase();
}

function collectAssistantKeywordSources(profile: AssistantProfile) {
  const entries: Array<{ keyword: string; source: string }> = [];
  const addEntry = (keyword: string, source: string) => {
    entries.push({ keyword, source });
  };
  const addKeywords = (options: AssistantOption[], selectedIds: string[], sourcePrefix: string) => {
    options
      .filter((option) => selectedIds.includes(option.id))
      .forEach((option) => {
        option.keywords.forEach((keyword) => addEntry(keyword, `${sourcePrefix}: ${option.label}`));
      });
  };

  ASSISTANT_BASE_KEYWORDS.forEach((keyword) =>
    addEntry(keyword, 'Included as part of a broad preventive health screening starter')
  );

  if (profile.age >= 30) {
    ['HbA1c', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test'].forEach((keyword) =>
      addEntry(keyword, 'Added because age 30+ benefits from metabolic health review')
    );
  }
  if (profile.age >= 40) {
    ['ECG', 'Calcium', 'Uric Acid', 'High Sensitive CRP'].forEach((keyword) =>
      addEntry(keyword, 'Added because age 40+ makes heart, bone, and inflammation screening more relevant')
    );
  }
  if (profile.age >= 50) {
    ['Chest X Ray', 'Vitamin B12', 'Urine Microalbumin'].forEach((keyword) =>
      addEntry(keyword, 'Added because age 50+ makes a wider preventive review useful')
    );
  }
  if (profile.gender === 'Female') {
    ['Ferritin', 'Calcium', 'Vitamin D', 'TSH'].forEach((keyword) =>
      addEntry(keyword, 'Added because you selected female, so anaemia, thyroid, and bone/vitamin review may be useful')
    );
    if (profile.age >= 30) {
      addEntry('Pap Smear', "Added because women's preventive screening may be discussed after 30");
    }
  }
  if (profile.gender === 'Male' && profile.age >= 40) {
    ['PSA', 'Uric Acid'].forEach((keyword) =>
      addEntry(keyword, 'Added because you selected male and age 40+')
    );
  }

  addKeywords(ASSISTANT_CONDITION_OPTIONS, profile.conditions, 'Added because you selected concern');
  addKeywords(ASSISTANT_HABIT_OPTIONS, profile.habits, 'Added because you selected habit');
  addKeywords(ASSISTANT_LIFESTYLE_OPTIONS, profile.lifestyle, 'Added because you selected lifestyle');
  ASSISTANT_FOLLOW_UP_GROUPS.flatMap((group) => group.options).forEach((option) => {
    if (profile.followUps.includes(option.id)) {
      option.keywords.forEach((keyword) => addEntry(keyword, `Added because of your follow-up answer: ${option.label}`));
    }
  });

  return entries;
}

function formatAssistantReason(keyword: string, source: string) {
  return `${source}. Helps review ${getAssistantKeywordPurpose(keyword)}.`;
}

function buildAssistantRecommendations(tests: LabTest[], profile: AssistantProfile): AssistantRecommendation[] {
  const pricedTests = tests
    .filter((test) => getCustomPackageBasePrice(test) > 0)
    .sort((first, second) => first.displayOrder - second.displayOrder);
  const recommendations: AssistantRecommendation[] = [];
  const recommendationMap = new Map<string, AssistantRecommendation>();
  const keywordSources = collectAssistantKeywordSources(profile);

  keywordSources.forEach(({ keyword, source }) => {
    const bestMatch = pricedTests
      .map((test) => ({ test, score: scoreTestForAssistantKeyword(test, keyword) }))
      .filter((item) => item.score > 0)
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        return first.test.displayOrder - second.test.displayOrder;
      })[0]?.test;

    if (!bestMatch) return;

    const reason = formatAssistantReason(keyword, source);
    const existingRecommendation = recommendationMap.get(bestMatch.slug);
    if (existingRecommendation) {
      if (!existingRecommendation.reasons.includes(reason) && existingRecommendation.reasons.length < 3) {
        existingRecommendation.reasons.push(reason);
      }
      return;
    }

    const recommendation = { test: bestMatch, reasons: [reason] };
    recommendations.push(recommendation);
    recommendationMap.set(bestMatch.slug, recommendation);
  });

  pricedTests.forEach((test) => {
    if (recommendations.length >= CUSTOM_PACKAGE_MIN_TESTS) return;
    if (recommendationMap.has(test.slug)) return;
    const recommendation = {
      test,
      reasons: ['Added to complete the 10-test Docty.Quick Labs package with a commonly requested screening test.'],
    };
    recommendations.push(recommendation);
    recommendationMap.set(test.slug, recommendation);
  });

  return recommendations.slice(0, 16);
}

function AssistantChipGroup({
  title,
  helper,
  options,
  selected,
  onToggle,
}: {
  title: string;
  helper?: string;
  options: AssistantOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-semibold">{title}</p>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function readSavedCustomPackages() {
  if (typeof window === 'undefined') return [];
  try {
    const storedValue = window.localStorage.getItem(SAVED_CUSTOM_PACKAGES_STORAGE_KEY);
    if (!storedValue) return [];
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object') as SavedCustomPackage[];
  } catch {
    return [];
  }
}

function writeSavedCustomPackages(packages: SavedCustomPackage[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SAVED_CUSTOM_PACKAGES_STORAGE_KEY, JSON.stringify(packages.slice(0, 8)));
}

async function fetchAccountSavedCustomPackages() {
  const response = await fetch('/api/patient-custom-packages', {
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Unable to load saved packages.');
  return (body?.packages || []) as SavedCustomPackage[];
}

async function saveAccountCustomPackage(savedPackage: SavedCustomPackage) {
  const response = await fetch('/api/patient-custom-packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(savedPackage),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Unable to save this package.');
  return body?.package as SavedCustomPackage;
}

async function deleteAccountCustomPackage(packageId: string) {
  const response = await fetch(`/api/patient-custom-packages?id=${encodeURIComponent(packageId)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Unable to delete this package.');
}

function generateCustomPackageName(selectedTests: LabTest[]) {
  if (selectedTests.length === 0) return 'My Docty.Quick Labs Package';

  const counts = selectedTests.reduce<Record<string, number>>((accumulator, test) => {
    const key = isRadiologyTest(test) ? 'Radiology' : test.category || 'Health';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const topCategories = Object.entries(counts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 2)
    .map(([category]) =>
      category
        .replace('Blood Health', 'Blood')
        .replace('Thyroid & Hormones', 'Thyroid')
        .replace('Vitamins & Minerals', 'Vitamin')
        .replace('General Diagnostics', 'Health')
    );

  const focus = topCategories.length ? topCategories.join(' + ') : 'Health';
  return `${focus} Quick Labs - ${selectedTests.length} Tests`;
}

function getHealthPackageDisplayName(healthPackage: HealthPackage) {
  return healthPackage.variant ? `${healthPackage.name} - ${healthPackage.variant}` : healthPackage.name;
}

function createIncludedPackageTest(healthPackage: HealthPackage, testName: string, index: number): LabTest {
  return {
    slug: `package-${healthPackage.id}-${index}-${normalizeSearch(testName).replace(/\s+/g, '-')}`,
    shortName: '',
    fullName: testName,
    category: 'Included in base package',
    sampleType: '',
    description: `${testName} is included in ${getHealthPackageDisplayName(healthPackage)}.`,
    whyNeeded: 'Included in the selected standard package.',
    preparation: '',
    price: 0,
    offerPrice: 0,
    displayOrder: 100000 + index,
  };
}

function findMatchingLabTestForPackageTest(testName: string, labTests: LabTest[]) {
  const packageSearch = normalizeSearch(testName);
  const packageWords = packageSearch.split(' ').filter((word) => word.length > 2);
  const scoredMatches = labTests
    .filter((test) => getCustomPackageBasePrice(test) > 0)
    .map((test) => {
      const shortName = normalizeSearch(test.shortName);
      const fullName = normalizeSearch(test.fullName);
      const haystack = normalizeSearch([test.shortName, test.fullName, test.category].join(' '));
      let score = 0;

      if (fullName === packageSearch) score += 120;
      if (shortName && packageSearch.includes(shortName)) score += 80;
      if (shortName && shortName === packageSearch) score += 100;
      if (fullName.includes(packageSearch) || packageSearch.includes(fullName)) score += 70;
      packageWords.forEach((word) => {
        if (haystack.includes(word)) score += 12;
      });

      return { test, score };
    })
    .filter((item) => item.score >= 24)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return first.test.displayOrder - second.test.displayOrder;
    });

  return scoredMatches[0]?.test || null;
}

function buildTestsFromStandardPackage(healthPackage: HealthPackage, labTests: LabTest[]) {
  const usedSlugs = new Set<string>();
  return healthPackage.tests.map((testName, index) => {
    const matchedTest = findMatchingLabTestForPackageTest(testName, labTests);
    if (matchedTest && !usedSlugs.has(matchedTest.slug)) {
      usedSlugs.add(matchedTest.slug);
      return matchedTest;
    }
    return createIncludedPackageTest(healthPackage, testName, index);
  });
}

function PackageCard({
  healthPackage,
  onBook,
  onCustomize,
}: {
  healthPackage: HealthPackage;
  onBook: (healthPackage: HealthPackage) => void;
  onCustomize: (healthPackage: HealthPackage) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const AudienceIcon = audienceIcons[healthPackage.audience];
  const visibleTests = expanded ? healthPackage.tests : healthPackage.tests.slice(0, 5);
  const remainingTests = healthPackage.tests.length - 5;

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full overflow-hidden border-border/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="h-2 bg-primary" />
        <CardContent className="flex h-full flex-col p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <AudienceIcon className="h-3.5 w-3.5" />
              {healthPackage.audience}
            </Badge>
            <Badge className="bg-accent text-accent-foreground">
              {healthPackage.discount}% off
            </Badge>
          </div>

          <div className="mb-5 min-h-[116px]">
            <h2 className="text-xl font-bold leading-tight text-foreground">{healthPackage.name}</h2>
            {healthPackage.variant && (
              <p className="mt-1 font-semibold text-primary">{healthPackage.variant}</p>
            )}
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{healthPackage.description}</p>
          </div>

          <div className="mb-5 flex items-end gap-3 border-y border-border py-4">
            <span className="pb-1 text-sm text-muted-foreground line-through">
              ₹{formatPrice(healthPackage.originalPrice)}
            </span>
            <span className="text-3xl font-bold text-primary">₹{formatPrice(healthPackage.offerPrice)}</span>
          </div>

          <div className="mb-6 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-foreground">{healthPackage.tests.length} tests included</p>
              <FlaskConical className="h-4 w-4 text-accent" />
            </div>
            <ul className="space-y-2.5">
              {visibleTests.map((test) => (
                <li key={test} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>{test}</span>
                </li>
              ))}
            </ul>
            {remainingTests > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {expanded ? (
                  <>
                    Show fewer <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    View {remainingTests} more <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="rounded-full"
              onClick={() => onBook(healthPackage)}
            >
              Book Package
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onCustomize(healthPackage)}
            >
              Customize
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PopularPackageMiniCard({
  healthPackage,
  onBook,
  onCustomize,
}: {
  healthPackage: HealthPackage;
  onBook: (healthPackage: HealthPackage) => void;
  onCustomize: (healthPackage: HealthPackage) => void;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-3xl border-border/80 bg-background/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Badge variant="secondary" className="rounded-full">
            {healthPackage.audience}
          </Badge>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
            Save {formatPackagePrice(healthPackage.originalPrice - healthPackage.offerPrice)}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{healthPackage.name}</h3>
          {healthPackage.variant && (
            <p className="mt-1 text-sm font-semibold text-primary">{healthPackage.variant}</p>
          )}
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {healthPackage.description}
          </p>
        </div>
        <div className="my-4 rounded-2xl bg-muted/50 p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Package price</p>
              <p className="mt-1 text-xl font-bold text-primary">{formatPackagePrice(healthPackage.offerPrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground line-through">{formatPackagePrice(healthPackage.originalPrice)}</p>
              <p className="text-xs font-semibold text-muted-foreground">{healthPackage.tests.length} tests</p>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => onBook(healthPackage)}
          >
            Select package
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            type="button"
            className="h-10 rounded-full"
            onClick={() => onCustomize(healthPackage)}
          >
            Customize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomPackageBuilder({
  onBook,
  customizePackageRequest,
  onCustomizeHandled,
}: {
  onBook: (healthPackage: HealthPackage) => void;
  customizePackageRequest: HealthPackage | null;
  onCustomizeHandled: () => void;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['custom-package-lab-tests'],
    queryFn: fetchLabTests,
    staleTime: 1000 * 60 * 60 * 2,
  });
  const { activeProfile, isAuthenticated, isLoading: isPatientSessionLoading } = usePatientSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [packageName, setPackageName] = useState('My Docty.Quick Labs Package');
  const [hasEditedPackageName, setHasEditedPackageName] = useState(false);
  const [savedPackages, setSavedPackages] = useState<SavedCustomPackage[]>([]);
  const [isLoadingSavedPackages, setIsLoadingSavedPackages] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assistantAge, setAssistantAge] = useState('');
  const [assistantGender, setAssistantGender] = useState<AssistantGender | ''>('');
  const [assistantConditions, setAssistantConditions] = useState<string[]>([]);
  const [assistantHabits, setAssistantHabits] = useState<string[]>([]);
  const [assistantLifestyle, setAssistantLifestyle] = useState<string[]>([]);
  const [assistantFollowUps, setAssistantFollowUps] = useState<string[]>([]);
  const [assistantReasons, setAssistantReasons] = useState<AssistantTestReason[]>([]);
  const [basePackage, setBasePackage] = useState<HealthPackage | null>(null);
  const [basePackageTestSlugs, setBasePackageTestSlugs] = useState<string[]>([]);

  const tests = data?.tests || [];
  const popularPackages = useMemo(
    () => healthPackages.filter((healthPackage) => healthPackage.featured).slice(0, 5),
    []
  );
  const selectedSlugs = useMemo(() => new Set(selectedTests.map((test) => test.slug)), [selectedTests]);
  const basePackageSlugSet = useMemo(() => new Set(basePackageTestSlugs), [basePackageTestSlugs]);
  const addOnTests = useMemo(
    () => selectedTests.filter((test) => !basePackageSlugSet.has(test.slug)),
    [basePackageSlugSet, selectedTests]
  );
  const visibleTests = useMemo(
    () =>
      tests
        .filter((test) => getCustomPackageBasePrice(test) > 0)
        .filter((test) => matchesCustomPackageSearch(test, searchQuery))
        .slice(0, searchQuery.trim() ? 18 : 12),
    [searchQuery, tests]
  );

  const packageStats = useMemo(() => {
    const baseRegularTotal = basePackage ? basePackage.originalPrice : 0;
    const baseDoctyTotal = basePackage ? basePackage.offerPrice : 0;
    const regularTotal = baseRegularTotal + addOnTests.reduce((total, test) => total + getCustomPackageBasePrice(test), 0);
    const doctyTotal = baseDoctyTotal + addOnTests.reduce((total, test) => total + getCustomPackagePrice(test), 0);
    const radiologyCount = addOnTests.filter(isRadiologyTest).length;
    const pathologyCount = addOnTests.length - radiologyCount;

    return {
      baseRegularTotal,
      baseDoctyTotal,
      regularTotal,
      doctyTotal,
      savings: Math.max(regularTotal - doctyTotal, 0),
      radiologyCount,
      pathologyCount,
      baseTestCount: basePackageTestSlugs.length,
      addOnTestCount: addOnTests.length,
    };
  }, [addOnTests, basePackage, basePackageTestSlugs.length]);

  const progress = Math.min((selectedTests.length / CUSTOM_PACKAGE_MIN_TESTS) * 100, 100);
  const remainingTests = Math.max(CUSTOM_PACKAGE_MIN_TESTS - selectedTests.length, 0);
  const packageUnlocked = Boolean(basePackage) || remainingTests === 0;
  const suggestedPackageName = useMemo(
    () => (basePackage ? `${getHealthPackageDisplayName(basePackage)} Custom Package` : generateCustomPackageName(selectedTests)),
    [basePackage, selectedTests]
  );
  const effectivePackageName = packageName.trim() || suggestedPackageName;
  const assistantAgeValue = Number(assistantAge);
  const visibleAssistantFollowUpGroups = useMemo(
    () =>
      ASSISTANT_FOLLOW_UP_GROUPS.filter((group) =>
        group.isVisible({
          age: Number.isFinite(assistantAgeValue) ? assistantAgeValue : 0,
          gender: assistantGender,
          conditions: assistantConditions,
          habits: assistantHabits,
          lifestyle: assistantLifestyle,
        })
      ),
    [assistantAgeValue, assistantConditions, assistantGender, assistantHabits, assistantLifestyle]
  );
  const visibleAssistantReasons = useMemo(
    () => assistantReasons.filter((reason) => selectedSlugs.has(reason.slug)),
    [assistantReasons, selectedSlugs]
  );

  const toggleAssistantCondition = (id: string) => {
    setAssistantConditions((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAssistantHabit = (id: string) => {
    setAssistantHabits((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAssistantLifestyle = (id: string) => {
    setAssistantLifestyle((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAssistantFollowUp = (id: string) => {
    setAssistantFollowUps((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const customizeStandardPackage = (healthPackage: HealthPackage) => {
    if (!tests.length) {
      toast.error('Lab catalogue is still loading. Please try again in a moment.');
      return false;
    }

    const includedTests = buildTestsFromStandardPackage(healthPackage, tests);
    const displayName = getHealthPackageDisplayName(healthPackage);
    setBasePackage(healthPackage);
    setBasePackageTestSlugs(includedTests.map((test) => test.slug));
    setSelectedTests(includedTests);
    setAssistantReasons([]);
    setPackageName(`${displayName} Custom Package`);
    setHasEditedPackageName(true);
    setSearchQuery('');
    toast.success(`${displayName} added as your base package. Add more tests to customise it.`);

    window.setTimeout(() => {
      document.getElementById('build-your-package')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    return true;
  };

  useEffect(() => {
    let cancelled = false;

    if (isPatientSessionLoading) return;

    if (!isAuthenticated || !activeProfile?.id) {
      setSavedPackages(readSavedCustomPackages());
      return;
    }

    setIsLoadingSavedPackages(true);
    fetchAccountSavedCustomPackages()
      .then((packages) => {
        if (!cancelled) setSavedPackages(packages);
      })
      .catch(() => {
        if (!cancelled) setSavedPackages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSavedPackages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, isAuthenticated, isPatientSessionLoading]);

  useEffect(() => {
    if (!hasEditedPackageName) {
      setPackageName(suggestedPackageName);
    }
  }, [hasEditedPackageName, suggestedPackageName]);

  useEffect(() => {
    if (!customizePackageRequest) return;
    if (isLoading) return;
    if (customizeStandardPackage(customizePackageRequest)) {
      onCustomizeHandled();
    }
  }, [customizePackageRequest, isLoading, onCustomizeHandled]);

  const saveCurrentPackage = async (showToast = true) => {
    if (selectedTests.length === 0) {
      if (showToast) toast.error('Please add tests before saving this package.');
      return;
    }

    const savedPackage: SavedCustomPackage = {
      id: `${Date.now()}-${selectedTests.map((test) => test.slug).join('-').slice(0, 40)}`,
      name: effectivePackageName,
      createdAt: new Date().toISOString(),
      tests: selectedTests,
      regularTotal: packageStats.regularTotal,
      doctyTotal: packageStats.doctyTotal,
      savings: packageStats.savings,
    };

    if (isAuthenticated && activeProfile?.id) {
      try {
        const accountPackage = await saveAccountCustomPackage(savedPackage);
        setSavedPackages((currentPackages) => [
          accountPackage,
          ...currentPackages.filter((item) => item.id !== accountPackage.id && item.name.toLowerCase() !== accountPackage.name.toLowerCase()),
        ].slice(0, 8));
        if (showToast) toast.success(`${accountPackage.name} saved under ${activeProfile.name}'s account.`);
        return;
      } catch (saveError) {
        if (showToast) {
          toast.error(saveError instanceof Error ? saveError.message : 'Unable to save this package to your account.');
        }
        throw saveError;
      }
    }

    setSavedPackages((currentPackages) => {
      const nextPackages = [
        savedPackage,
        ...currentPackages.filter((item) => item.name.toLowerCase() !== savedPackage.name.toLowerCase()),
      ].slice(0, 8);
      writeSavedCustomPackages(nextPackages);
      return nextPackages;
    });

    if (showToast) toast.success(`${effectivePackageName} saved on this device. Log in to save it under your account.`);
  };

  const loadSavedPackage = (savedPackage: SavedCustomPackage) => {
    setSelectedTests(savedPackage.tests || []);
    setBasePackage(null);
    setBasePackageTestSlugs([]);
    setPackageName(savedPackage.name);
    setHasEditedPackageName(true);
    setAssistantReasons([]);
    setSearchQuery('');
    toast.success(`${savedPackage.name} loaded.`);
  };

  const deleteSavedPackage = async (packageId: string) => {
    if (isAuthenticated && activeProfile?.id) {
      await deleteAccountCustomPackage(packageId).catch((deleteError) => {
        toast.error(deleteError instanceof Error ? deleteError.message : 'Unable to delete this package.');
      });
      setSavedPackages((currentPackages) => currentPackages.filter((item) => item.id !== packageId));
      return;
    }

    setSavedPackages((currentPackages) => {
      const nextPackages = currentPackages.filter((item) => item.id !== packageId);
      writeSavedCustomPackages(nextPackages);
      return nextPackages;
    });
  };

  const addTest = (test: LabTest) => {
    setSelectedTests((currentTests) => {
      if (currentTests.some((item) => item.slug === test.slug)) return currentTests;
      const nextTests = [...currentTests, test];
      const nextRemaining = Math.max(CUSTOM_PACKAGE_MIN_TESTS - nextTests.length, 0);
      if (nextRemaining === 0 && currentTests.length < CUSTOM_PACKAGE_MIN_TESTS) {
        toast.success('Docty.Quick Labs package unlocked!');
      } else {
        toast.success(`${test.shortName || test.fullName} added. ${nextRemaining} more to unlock.`);
      }
      return nextTests;
    });
  };

  const removeTest = (slug: string) => {
    if (basePackageSlugSet.has(slug)) {
      toast.info('This test is part of the selected base package. Clear the package to start again.');
      return;
    }
    setSelectedTests((currentTests) => currentTests.filter((test) => test.slug !== slug));
  };

  const applyAssistantRecommendations = () => {
    const age = Number(assistantAge);
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      toast.error('Please enter a valid age to start the assistant.');
      return;
    }
    if (!assistantGender) {
      toast.error('Please select gender so the assistant can suggest a better starter package.');
      return;
    }
    if (!tests.length) {
      toast.error('Lab tests are still loading. Please try again in a moment.');
      return;
    }

    const visibleFollowUpIds = new Set(
      visibleAssistantFollowUpGroups.flatMap((group) => group.options.map((option) => option.id))
    );
    const recommendations = buildAssistantRecommendations(tests, {
      age,
      gender: assistantGender,
      conditions: assistantConditions,
      habits: assistantHabits,
      lifestyle: assistantLifestyle,
      followUps: assistantFollowUps.filter((id) => visibleFollowUpIds.has(id)),
    });

    if (!recommendations.length) {
      toast.error('Unable to build a smart package from the current catalogue.');
      return;
    }

    const recommendedTests = recommendations.map((recommendation) => recommendation.test);
    setAssistantReasons(
      recommendations.map((recommendation) => ({
        slug: recommendation.test.slug,
        name: recommendation.test.shortName || recommendation.test.fullName,
        reasons: recommendation.reasons,
      }))
    );

    setSelectedTests((currentTests) => {
      const existingSlugs = new Set(currentTests.map((test) => test.slug));
      const nextTests = [...currentTests];
      recommendedTests.forEach((test) => {
        if (!existingSlugs.has(test.slug)) {
          nextTests.push(test);
          existingSlugs.add(test.slug);
        }
      });

      const addedCount = nextTests.length - currentTests.length;
      if (addedCount === 0) {
        toast.info('These assistant suggestions are already in your package.');
        return currentTests;
      }

      const nextRemaining = Math.max(CUSTOM_PACKAGE_MIN_TESTS - nextTests.length, 0);
      if (nextRemaining === 0) {
        toast.success(`Docty Assistant added ${addedCount} tests and unlocked package pricing.`);
      } else {
        toast.success(`Docty Assistant added ${addedCount} tests. Add ${nextRemaining} more to unlock pricing.`);
      }
      return nextTests;
    });

    setHasEditedPackageName(false);
    setSearchQuery('');
  };

  const handleCustomPackageSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!packageUnlocked) {
      toast.error(`Please select at least ${CUSTOM_PACKAGE_MIN_TESTS} tests to build your package.`);
      return;
    }
    if (!patientName.trim() || !patientPhone.trim()) {
      toast.error('Please fill in patient name and mobile number.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(patientPhone.replace(/\D/g, '').slice(-10))) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitClinicLead({
        type: 'health-package',
        serviceCategory: 'Lab Tests',
        patientName,
        patientMobile: patientPhone,
        interest: effectivePackageName,
        source: 'Health checks custom package builder',
        metadata: {
          packageId: basePackage?.id || 'custom-docty-quick-labs',
          packageName: effectivePackageName,
          itemCount: selectedTests.length,
          basePackageId: basePackage?.id,
          basePackageName: basePackage ? getHealthPackageDisplayName(basePackage) : undefined,
          basePackageMrp: basePackage?.originalPrice,
          basePackageOfferPrice: basePackage?.offerPrice,
          basePackageTestCount: packageStats.baseTestCount,
          addOnTestCount: packageStats.addOnTestCount,
          pathologyCount: packageStats.pathologyCount,
          radiologyCount: packageStats.radiologyCount,
          totalPrice: packageStats.regularTotal,
          offerTotal: packageStats.doctyTotal,
          savings: packageStats.savings,
          discountRules: 'Pathology 60% off, Radiology 10% off',
          assistantReasoning: visibleAssistantReasons.map((item) => ({
            labTestSlug: item.slug,
            testName: item.name,
            reasons: item.reasons,
          })),
          labTests: selectedTests.map((test) => ({
            labTestSlug: test.slug,
            shortName: test.shortName,
            fullName: test.fullName,
            category: test.category,
            testType: isRadiologyTest(test) ? 'Radiology' : 'Pathology',
            includedInBasePackage: basePackageSlugSet.has(test.slug),
            price: getCustomPackageBasePrice(test),
            offerPrice: basePackageSlugSet.has(test.slug) ? 0 : getCustomPackagePrice(test),
            discountPercent: basePackageSlugSet.has(test.slug) ? 0 : Math.round(getCustomPackageDiscountRate(test) * 100),
          })),
        },
      });
      await saveCurrentPackage(false).catch(() => {
        toast.error('Request captured, but this package could not be saved for future use.');
      });
      toast.success(`Thank you ${patientName}! We'll call you to confirm ${effectivePackageName}.`);
      setSelectedTests([]);
      setBasePackage(null);
      setBasePackageTestSlugs([]);
      setAssistantReasons([]);
      setPackageName('My Docty.Quick Labs Package');
      setHasEditedPackageName(false);
      setPatientName('');
      setPatientPhone('');
      setSearchQuery('');
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="build-your-package" className="scroll-mt-24 border-b bg-gradient-to-br from-primary/5 via-background to-accent/10 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <Badge variant="secondary" className="mb-3 rounded-full">
                <Package className="mr-1.5 h-3.5 w-3.5" />
                Popular Packages
              </Badge>
              <h2 className="text-2xl font-bold md:text-3xl">Choose a ready-made health package</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Start with one of our standard packages, or build your own custom package below.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {popularPackages.map((healthPackage) => (
              <PopularPackageMiniCard
                key={healthPackage.id}
                healthPackage={healthPackage}
                onBook={onBook}
                onCustomize={customizeStandardPackage}
              />
            ))}
          </div>
        </div>

        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <Badge className="mb-3 rounded-full bg-primary text-primary-foreground">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Docty.Quick Labs
            </Badge>
            <h2 className="text-3xl font-bold md:text-4xl">Build your Package</h2>
            <p className="mt-3 text-muted-foreground">
              Pick at least 10 tests and enjoy discounted prices.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden rounded-3xl border-border/80">
            <CardContent className="p-5 md:p-6">
              <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-bold">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Docty Assistant AI
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Answer a few quick questions and we will pre-fill a sensible screening package. You can still add or remove tests.
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-fit rounded-full">
                    AI smart starter
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-2">
                    <Label htmlFor="assistant-age">Age</Label>
                    <Input
                      id="assistant-age"
                      type="number"
                      min={1}
                      max={120}
                      inputMode="numeric"
                      value={assistantAge}
                      onChange={(event) => setAssistantAge(event.target.value)}
                      placeholder="e.g. 42"
                      className="h-11 rounded-xl bg-background"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Gender</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Female', 'Male', 'Other'] as AssistantGender[]).map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setAssistantGender(gender)}
                          className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                            assistantGender === gender
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <AssistantChipGroup
                    title="Health conditions or concerns"
                    helper="Pick anything relevant. Skip if you only want a general preventive check."
                    options={ASSISTANT_CONDITION_OPTIONS}
                    selected={assistantConditions}
                    onToggle={toggleAssistantCondition}
                  />
                  <AssistantChipGroup
                    title="Habits"
                    options={ASSISTANT_HABIT_OPTIONS}
                    selected={assistantHabits}
                    onToggle={toggleAssistantHabit}
                  />
                  <AssistantChipGroup
                    title="Lifestyle"
                    options={ASSISTANT_LIFESTYLE_OPTIONS}
                    selected={assistantLifestyle}
                    onToggle={toggleAssistantLifestyle}
                  />
                  {visibleAssistantFollowUpGroups.length > 0 && (
                    <div className="rounded-2xl border bg-background/70 p-4">
                      <div className="mb-4">
                        <p className="text-sm font-bold text-primary">Smart follow-up questions</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          These appear based on age, gender, conditions, habits, and lifestyle choices.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {visibleAssistantFollowUpGroups.map((group) => (
                          <AssistantChipGroup
                            key={group.id}
                            title={group.title}
                            helper={group.helper}
                            options={group.options}
                            selected={assistantFollowUps}
                            onToggle={toggleAssistantFollowUp}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">
                    This is a package starter, not a diagnosis. The clinic team can confirm the final list before booking.
                  </p>
                  <Button
                    type="button"
                    className="shrink-0 rounded-full"
                    onClick={applyAssistantRecommendations}
                    disabled={isLoading || isError}
                  >
                    Build AI smart package
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mb-5">
                <Label htmlFor="custom-package-search" className="mb-2 block font-semibold">
                  Search and add tests
                </Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
                  <Input
                    id="custom-package-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search CBC, HbA1c, thyroid, ultrasound, fever..."
                    className="h-12 rounded-2xl pl-12"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-2xl" />
                  ))}
                </div>
              ) : isError ? (
                <div className="rounded-2xl bg-muted/60 p-6 text-center">
                  <p className="font-semibold">Unable to load lab tests</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Please try again shortly.'}
                  </p>
                </div>
              ) : (
                <div className="grid max-h-[640px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {visibleTests.map((test) => {
                    const selected = selectedSlugs.has(test.slug);
                    const basePrice = getCustomPackageBasePrice(test);
                    const packagePrice = getCustomPackagePrice(test);

                    return (
                      <button
                        key={test.slug}
                        type="button"
                        onClick={() => addTest(test)}
                        disabled={selected}
                        className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          selected
                            ? 'border-primary/40 bg-primary/5 opacity-80'
                            : 'border-border bg-background'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            {test.shortName && (
                              <Badge variant="secondary" className="mb-2 rounded-full">
                                {test.shortName}
                              </Badge>
                            )}
                            <h3 className="line-clamp-2 font-bold leading-snug">{test.fullName}</h3>
                          </div>
                          {selected ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                          ) : (
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                              Add
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="rounded-full">
                            MRP based
                          </Badge>
                          <span className="ml-auto font-semibold text-muted-foreground line-through">
                            {formatPackagePrice(basePrice)}
                          </span>
                          <span className="font-bold text-primary">{formatPackagePrice(packagePrice)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-primary/20 shadow-xl xl:sticky xl:top-24 xl:self-start">
            <CardContent className="p-5 md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-primary">
                    <Calculator className="h-4 w-4" />
                    Your package builder
                  </p>
                  <h3 className="mt-1 text-2xl font-bold">{effectivePackageName}</h3>
                </div>
                <Badge className={packageUnlocked ? 'bg-primary text-primary-foreground' : ''} variant={packageUnlocked ? 'default' : 'secondary'}>
                  {packageUnlocked ? 'Unlocked' : `${remainingTests} to unlock`}
                </Badge>
              </div>

              {basePackage && (
                <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-primary">Customising base package</p>
                      <p className="mt-1 font-bold">{getHealthPackageDisplayName(basePackage)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Base package price stays fixed. Add-on tests are calculated separately using Docty.Quick Labs pricing.
                      </p>
                    </div>
                    <div className="rounded-xl bg-background px-4 py-3 text-right">
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPackagePrice(basePackage.originalPrice)}
                      </p>
                      <p className="font-bold text-primary">{formatPackagePrice(basePackage.offerPrice)}</p>
                    </div>
                  </div>
                </div>
              )}

              {visibleAssistantReasons.length > 0 && (
                <div className="mb-5 rounded-2xl border border-accent/30 bg-accent/5 p-4">
                  <div className="mb-3">
                    <p className="flex items-center gap-2 font-semibold text-foreground">
                      <Sparkles className="h-4 w-4 text-accent" />
                      Why these tests?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Based on the answers used in the last assistant run. Please review with the clinic team before booking.
                    </p>
                  </div>
                  <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                    {visibleAssistantReasons.slice(0, 7).map((item) => (
                      <div key={item.slug} className="rounded-xl bg-background/80 p-3">
                        <p className="text-sm font-bold">{item.name}</p>
                        <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                          {item.reasons.slice(0, 2).map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {visibleAssistantReasons.length > 7 && (
                    <p className="mt-3 text-xs font-semibold text-primary">
                      + {visibleAssistantReasons.length - 7} more suggested test explanations included in this package.
                    </p>
                  )}
                </div>
              )}

              {(isLoadingSavedPackages || savedPackages.length > 0) && (
                <div className="mb-5 rounded-2xl border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Saved packages</p>
                      <p className="text-xs text-muted-foreground">
                        {isAuthenticated && activeProfile
                          ? `Saved under ${activeProfile.name}'s patient account.`
                          : 'Stored on this device. Log in to save under your account.'}
                      </p>
                    </div>
                  </div>
                  {isLoadingSavedPackages ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14 rounded-xl" />
                      <Skeleton className="h-14 rounded-xl" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                    {savedPackages.slice(0, 3).map((savedPackage) => (
                      <div key={savedPackage.id} className="flex items-center gap-2 rounded-xl bg-muted/50 p-2">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => loadSavedPackage(savedPackage)}
                        >
                          <p className="truncate text-sm font-semibold">{savedPackage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {savedPackage.tests.length} tests · Save {formatPackagePrice(savedPackage.savings)}
                          </p>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                          onClick={() => void deleteSavedPackage(savedPackage.id)}
                          aria-label={`Delete ${savedPackage.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              )}

              {!isAuthenticated && !isPatientSessionLoading && (
                <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p className="font-semibold text-primary">Want this saved under your account?</p>
                  <p className="mt-1 text-muted-foreground">
                    Log in as a patient before saving, and your custom package will be available again from your profile.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
                    <Link to="/patient">Login to save</Link>
                  </Button>
                </div>
              )}

              <div className="mb-5 rounded-2xl border bg-background p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <Label htmlFor="custom-package-title" className="font-semibold">
                    Package name
                  </Label>
                  {hasEditedPackageName && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => {
                        setHasEditedPackageName(false);
                        setPackageName(suggestedPackageName);
                      }}
                    >
                      Use suggested name
                    </button>
                  )}
                </div>
                <Input
                  id="custom-package-title"
                  value={packageName}
                  onChange={(event) => {
                    setPackageName(event.target.value);
                    setHasEditedPackageName(true);
                  }}
                  placeholder={suggestedPackageName}
                  className="h-11 rounded-xl font-semibold"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  We suggest a name from the selected tests. You can rename it yourself before requesting.
                </p>
              </div>

              <div className="mb-5 rounded-2xl border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">{selectedTests.length} / {CUSTOM_PACKAGE_MIN_TESTS} tests selected</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <div className="mt-4 grid grid-cols-10 gap-1.5">
                  {Array.from({ length: CUSTOM_PACKAGE_MIN_TESTS }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-8 rounded-lg border text-center text-xs font-bold leading-8 ${
                        index < selectedTests.length
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-dashed bg-background text-muted-foreground'
                      }`}
                    >
                      {index < selectedTests.length ? '✓' : index + 1}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {basePackage
                    ? `${packageStats.baseTestCount} base package tests selected. Add more tests if you want to customise further.`
                    : packageUnlocked
                    ? 'Package unlocked. Add more tests if you want a bigger bundle.'
                    : `Add ${remainingTests} more test${remainingTests === 1 ? '' : 's'} to unlock custom package pricing.`}
                </p>
              </div>

              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {basePackage ? 'Base MRP + Add-ons' : 'MRP total'}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{formatPackagePrice(packageStats.regularTotal)}</p>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase text-primary">
                    {basePackage ? 'Base price + Add-ons' : 'With Docty.Quick Labs'}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary">{formatPackagePrice(packageStats.doctyTotal)}</p>
                </div>
                <div className="rounded-2xl border bg-accent/10 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">You save</p>
                  <p className="mt-1 text-2xl font-bold text-accent">{formatPackagePrice(packageStats.savings)}</p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                {basePackage
                  ? 'Your selected standard package remains the base. Any additional tests are discounted from their MRP and added to the package price.'
                  : 'All package savings are calculated on the MRP of the selected tests. The final list can be confirmed by the clinic team before booking.'}
              </div>

              <div className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">Tests added to your package</h4>
                  {selectedTests.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-primary hover:underline"
                        onClick={() => void saveCurrentPackage(true)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-primary hover:underline"
                        onClick={() => {
                          setSelectedTests([]);
                          setBasePackage(null);
                          setBasePackageTestSlugs([]);
                          setAssistantReasons([]);
                          setHasEditedPackageName(false);
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
                {selectedTests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
                    Add tests to start building your package. The first 10 slots unlock the offer.
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {selectedTests.map((test, index) => {
                      const isBaseTest = basePackageSlugSet.has(test.slug);
                      return (
                        <div key={test.slug} className="flex items-center gap-3 rounded-2xl border bg-background p-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{test.shortName || test.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {isBaseTest ? 'Included in base package' : 'Add-on test · MRP based bundle price'}
                            </p>
                          </div>
                          <div className="text-right">
                            {isBaseTest ? (
                              <p className="font-bold text-primary">Included</p>
                            ) : (
                              <>
                                <p className="text-xs text-muted-foreground line-through">{formatPackagePrice(getCustomPackageBasePrice(test))}</p>
                                <p className="font-bold text-primary">{formatPackagePrice(getCustomPackagePrice(test))}</p>
                              </>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-primary disabled:opacity-40"
                            onClick={() => removeTest(test.slug)}
                            disabled={isBaseTest}
                            aria-label={`Remove ${test.fullName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleCustomPackageSubmit} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="custom-package-name">Patient Name</Label>
                    <Input
                      id="custom-package-name"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      placeholder="Enter patient name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-package-phone">Mobile Number</Label>
                    <Input
                      id="custom-package-phone"
                      type="tel"
                      inputMode="numeric"
                      value={patientPhone}
                      onChange={(event) => setPatientPhone(event.target.value)}
                      placeholder="Enter 10-digit mobile"
                    />
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full rounded-full" disabled={isSubmitting || !packageUnlocked}>
                  {isSubmitting
                    ? 'Submitting...'
                    : basePackage
                      ? 'Request Customised Package'
                      : packageUnlocked
                      ? 'Request Docty.Quick Labs Package'
                      : `Add ${remainingTests} more to request`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default function PackagesPage() {
  const [selectedPackage, setSelectedPackage] = useState<HealthPackage | null>(null);
  const [customizePackageRequest, setCustomizePackageRequest] = useState<HealthPackage | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openBookingForm = (healthPackage: HealthPackage) => {
    setSelectedPackage(healthPackage);
    setPatientName('');
    setPatientPhone('');
  };

  const openCustomizeBuilder = (healthPackage: HealthPackage) => {
    setSelectedPackage(null);
    setCustomizePackageRequest({ ...healthPackage });
  };

  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPackage || !patientName.trim() || !patientPhone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[0-9]{10}$/.test(patientPhone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitClinicLead({
        type: 'health-package',
        serviceCategory: 'Lab Tests',
        patientName,
        patientMobile: patientPhone,
        interest: selectedPackage.name,
        source: 'Packages page',
        metadata: { packageId: selectedPackage.id },
      });
      setSelectedPackage(null);
      toast.success(
        `Thank you ${patientName}! We'll call you shortly to confirm the ${selectedPackage.name} package.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b pb-14 pt-32">
        <div className="absolute inset-0">
          <img
            src="/docty-clinic-lab-testing.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/96 via-background/88 to-background/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(254,6,92,0.10),transparent_36%),radial-gradient(circle_at_82%_70%,rgba(11,184,252,0.10),transparent_38%)]" />
        </div>
        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="secondary" className="mb-4">
              <Package className="mr-1.5 h-3.5 w-3.5" />
              {healthPackages.length} Health Packages
            </Badge>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Preventive health checks for <span className="text-primary">every need</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Transparent package pricing and complete test details from Docty Clinics.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-b py-10">
        <div className="container mx-auto grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: Stethoscope, title: 'Doctor Guidance', text: 'Clinical support when needed' },
            { icon: Zap, title: 'Quick Reports', text: 'Fast in-house processing' },
            { icon: FlaskConical, title: 'Clear Test Lists', text: 'Know exactly what is included' },
            { icon: Layers3, title: 'AI Smart Reports', text: 'Personalized pathology insights' },
            { icon: Sparkles, title: 'Build your Package', text: 'Create a custom health check' },
            { icon: Clock, title: 'Easy Booking', text: 'Choose a convenient appointment' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CustomPackageBuilder
        onBook={openBookingForm}
        customizePackageRequest={customizePackageRequest}
        onCustomizeHandled={() => setCustomizePackageRequest(null)}
      />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="mb-2 flex items-center gap-2 font-semibold text-primary">
                <Tag className="h-4 w-4" />
                Current package offers
              </p>
              <h2 className="text-3xl font-bold">All Health Packages</h2>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            {healthPackages.map((healthPackage) => (
              <PackageCard
                key={healthPackage.id}
                healthPackage={healthPackage}
                onBook={openBookingForm}
                onCustomize={openCustomizeBuilder}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-t bg-muted/40 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-3 text-3xl font-bold">Need help choosing a package?</h2>
          <p className="mx-auto mb-7 max-w-2xl text-muted-foreground">
            Our clinic team can help you select an appropriate package based on your age and health goals.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/book-appointment">
                Book an Appointment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <a href="tel:+919989804888">Call 99898 04888</a>
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {selectedPackage && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-left">
                  <span className="block text-2xl font-bold">{selectedPackage.name}</span>
                  {selectedPackage.variant && (
                    <span className="mt-1 block text-sm font-semibold text-primary">
                      {selectedPackage.variant}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-7 md:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <div className="rounded-md border bg-muted/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">Offer price</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{formatPrice(selectedPackage.originalPrice)}
                          </span>
                          <span className="text-3xl font-bold text-primary">
                            ₹{formatPrice(selectedPackage.offerPrice)}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">
                        {selectedPackage.discount}% off
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {selectedPackage.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span>Suitable for {selectedPackage.audience.toLowerCase()}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <FlaskConical className="h-4 w-4 text-accent" />
                      {selectedPackage.tests.length} tests included
                    </h3>
                    <ul className="grid max-h-64 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
                      {selectedPackage.tests.map((test) => (
                        <li key={test} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <span>{test}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">Book this package</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enter your details and our team will confirm the clinic and appointment time.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-patient-name">Patient Name</Label>
                    <Input
                      id="package-patient-name"
                      placeholder="Enter patient full name"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-patient-phone">Mobile Number</Label>
                    <Input
                      id="package-patient-phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Enter 10-digit mobile number"
                      value={patientPhone}
                      onChange={(event) => setPatientPhone(event.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="rounded-md bg-muted/50 p-4 text-sm">
                    <p className="text-muted-foreground">Selected package</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedPackage.name}</p>
                    {selectedPackage.variant && (
                      <p className="text-primary">{selectedPackage.variant}</p>
                    )}
                  </div>
                  <div className="grid gap-3 pt-2 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedPackage(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openCustomizeBuilder(selectedPackage)}
                    >
                      Customize
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Request Booking'}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
