import type { Service } from '@/generated/models/service-model';

export const serviceCategories = [
  { id: 'primary-care', name: 'Primary Care', description: 'Everyday consultations, general medicine, pharmacy, and preventive care.', iconService: 'Primary Care' },
  { id: 'dental-care', name: 'Dental Care', description: 'Oral health, tooth pain, cleaning, restorations, and dental procedures.', iconService: 'Dental Care' },
  { id: 'physiotherapy', name: 'Physiotherapy', description: 'Pain relief, movement, posture, rehabilitation, and recovery support.', iconService: 'Physiotherapy' },
  { id: 'womens-health', name: 'Women’s Health', description: 'Gynaecology, pregnancy, fertility, periods, and menopause care.', iconService: 'Women’s Health' },
  { id: 'child-care', name: 'Child Care', description: 'Newborn, child health, growth, development, and paediatric care.', iconService: 'Child Care' },
  { id: 'mental-health', name: 'Mental Health', description: 'Confidential support for stress, anxiety, mood, and emotional wellbeing.', iconService: 'Mental Health' },
  { id: 'ent', name: 'ENT', description: 'Care for ear, nose, throat, sinus, hearing, and voice concerns.', iconService: 'ENT' },
  { id: 'digestive-health', name: 'Digestive Health', description: 'Stomach, acidity, liver, nutrition, and digestive health services.', iconService: 'Digestive Health' },
  { id: 'vaccinations', name: 'Vaccinations', description: 'Vaccination assessment, schedules, doses, and preventive immunisation.', iconService: 'Vaccination' },
  { id: 'diagnostics', name: 'Diagnostics', description: 'Lab tests, screening, health checks, and diagnostic assessments.', iconService: 'Diagnostics' },
  { id: 'day-care', name: 'Day Care', description: 'Short-stay procedures, IV therapy, injections, and supervised care.', iconService: 'Day Care' },
  { id: 'specialist-care', name: 'Other Specialist Care', description: 'Heart, lungs, brain, skin, eyes, kidneys, joints, and specialist services.', iconService: 'Specialist Consultations' },
] as const;

export type ServiceCategoryId = (typeof serviceCategories)[number]['id'];

function normalizeCategoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isServiceCategoryId(value: string | null): value is ServiceCategoryId {
  return serviceCategories.some((category) => category.id === value);
}

export function getServiceCategory(serviceName: string): ServiceCategoryId {
  const name = normalizeCategoryText(serviceName);

  if (/(dental|dentist|tooth|teeth|oral|crown|bridge|denture|root canal|gum|periodont|whitening|extraction)/.test(name)) return 'dental-care';
  if (/(physio|rehab|manual therapy|exercise therapy|posture|mobility|back pain|neck pain|sports injury)/.test(name)) return 'physiotherapy';
  if (/(pregnan|maternity|gynaec|gynecol|women|pcos|pcod|fertility|menopause|period|ovarian|fibroid|breast|reproductive)/.test(name)) return 'womens-health';
  if (/(pediatric|paediatric|child|baby|newborn|new born|growth and development|school kids)/.test(name)) return 'child-care';
  if (/(mental|psychiatr|psycholog|anxiety|depression|stress|counselling|de addiction|schizophrenia)/.test(name)) return 'mental-health';
  if (/(ear|nose|throat|sinus|hearing|voice|\bent\b)/.test(name)) return 'ent';
  if (/(digest|gastric|stomach|gerd|acid reflux|liver|hepatic|gallstone|nutrition)/.test(name)) return 'digestive-health';
  if (/(vaccin|immun)/.test(name)) return 'vaccinations';
  if (/(diagnostic|laboratory|lab test|blood test|screening|health check|checkup|check up|profile|ecg|ultrasound|x ray)/.test(name)) return 'diagnostics';
  if (/(day care|daycare|admission|iv fluid|infusion|injection|short stay|home care|homecare)/.test(name)) return 'day-care';
  if (/(consultation|primary care|general medicine|general physician|family physician|fever|cold|medication|pharmacy|health counselling|geriatric)/.test(name)) return 'primary-care';

  return 'specialist-care';
}

export function groupServicesByCategory(services: Service[]) {
  const groups = new Map<ServiceCategoryId, Service[]>();
  serviceCategories.forEach((category) => groups.set(category.id, []));
  services.forEach((service) => {
    groups.get(getServiceCategory(service.name1))?.push(service);
  });
  return groups;
}
