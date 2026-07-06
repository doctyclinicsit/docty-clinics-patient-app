import type { IOperationOptions } from '@/lib/api-client';
import type { Doctor, DoctorClinicProfile } from '@/generated/models/doctor-model';
import type { Location } from '@/generated/models/location-model';
import type { Service } from '@/generated/models/service-model';

export const DEFAULT_CONSULTATION_FEE = 600;

interface EkaEntitiesResponse {
  data?: EkaEntitiesData;
  clinics?: EkaEntitiesData['clinics'];
  doctors?: EkaEntitiesData['doctors'];
  business?: EkaEntitiesData['business'];
}

interface EkaEntitiesData {
  clinics: Array<{
    clinic_id: string;
    name: string;
    doctors: string[];
  }>;
  doctors: Array<{
    doctor_id: string;
    name: string;
    pic?: string;
  }>;
  business?: {
    business_id: string;
    name: string;
  };
}

interface EkaDoctorProfileResponse {
  id: string;
  profile: {
    personal?: {
      salutation?: string;
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      name?: {
        fullName?: string;
        f?: string;
        l?: string;
      };
      pic?: string;
      pic_small?: string;
    };
      professional?: {
      active?: boolean;
      about?: string;
      intro?: string;
      username?: string;
      experience?: number | string;
      experience_years?: number | string;
      years_of_experience?: number | string;
      exp?: number | string;
      practicing_since?: number | string;
      practice_start_year?: number | string;
      language?: Array<{ language?: string; name?: string; code?: string } | string> | string;
      languages?: Array<{ language?: string; name?: string; code?: string } | string> | string;
      degree?: Array<{ name?: string }>;
      major_speciality?: { name?: string };
      speciality?: Array<{ name?: string }>;
      c_spec?: string[];
      registrations?: Array<{
        council?: string;
        medical_id?: string;
        year?: string | number;
        default?: boolean;
      }>;
      clinics?: Array<{
        _id?: string;
        id?: string;
        name: string;
        phone?: string;
        default?: boolean;
        contacts?: Array<{ name?: string; number?: string }>;
        services?: Array<{ name?: string } | string>;
        amenities?: Array<{ name?: string } | string>;
        images?: unknown;
        photos?: unknown;
        gallery?: unknown;
        schedule?: Record<string, {
          is_enabled?: boolean;
          bounds?: Array<{ s?: number | string; e?: number | string }>;
        }>;
        address?: {
          line1?: string;
          city?: string;
          country?: string;
          state?: string;
          pin?: string;
          pincode?: string | number;
        };
      }>;
      default_clinic?: string;
    };
  };
}

type EkaDoctorClinic = NonNullable<NonNullable<EkaDoctorProfileResponse['profile']['professional']>['clinics']>[number];
type EkaDoctorClinicAddress = NonNullable<EkaDoctorClinic['address']>;

interface EkaClinicResponse {
  data: {
    clinic: {
      clinic_id: string;
      name: string;
      address?: {
        city?: string;
        country?: string;
        lat?: number;
        line1?: string;
        lon?: number;
        pincode?: number | string;
        state?: string;
      };
    };
  };
}

interface EkaDoctorServicesResponse {
  data: {
    services: EkaDoctorService | EkaDoctorService[];
  };
}

interface EkaDoctorService {
  conf_id: string;
  service_name: string;
  duration?: number;
  mode?: string[];
  price?: number;
  currency?: string;
  archive?: boolean;
}

interface EkaAggregatedDoctor {
  summary: EkaEntitiesData['doctors'][number];
  profile?: EkaDoctorProfileResponse | null;
  services?: EkaDoctorService | EkaDoctorService[];
}

interface EkaAppointmentSlotsResponse {
  data: {
    schedule?: Record<string, Array<{
      service_type?: string;
      slots?: EkaAppointmentSlot[];
    }>>;
    services?: Record<string, {
      conf_id: string;
      currency?: string;
      mode?: string[];
      price?: number;
      service_name?: string;
    }>;
  };
}

export interface EkaAppointmentSlot {
  available: boolean;
  conf_id: string;
  e: string;
  s: string;
  serviceType?: string;
  serviceName?: string;
  price?: number;
  currency?: string;
  mode?: string[];
}

interface EkaPatientSummary {
  username?: string;
  mobile?: string;
  oid: string;
  fln?: string;
  fn?: string;
  ln?: string;
}

interface EkaCreatePatientInput {
  fullName: string;
  mobile: string;
  gender: 'M' | 'F' | 'O';
  dob: string;
  email?: string;
}

interface EkaBookAppointmentInput {
  doctorId: string;
  clinicId: string;
  patientId: string;
  patient: EkaCreatePatientInput;
  slot: EkaAppointmentSlot;
  mode: 'INCLINIC' | 'VIDEO';
}

const EKA_API_BASE_URL = 'https://api.eka.care';
const EKA_SERVER_PROXY_BASE = '/api/eka';
const EKA_PUBLIC_PROXY_BASE = '/api/eka-public';

let entitiesPromise: Promise<EkaEntitiesResponse> | undefined;

function getBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const defaultBaseUrl = getAuthToken() ? EKA_API_BASE_URL : EKA_SERVER_PROXY_BASE;
  return (configuredBaseUrl || defaultBaseUrl).replace(/\/$/, '');
}

function getAuthToken() {
  return import.meta.env.VITE_EKA_AUTH_TOKEN || import.meta.env.VITE_EKA_BEARER_TOKEN;
}

function getClientId() {
  return import.meta.env.VITE_EKA_CLIENT_ID;
}

function getPublicProfileBaseUrl() {
  return (import.meta.env.VITE_EKA_PUBLIC_BASE_URL || EKA_PUBLIC_PROXY_BASE).replace(/\/$/, '');
}

function isServerProxy() {
  return getBaseUrl().startsWith(EKA_SERVER_PROXY_BASE);
}

function buildEkaUrl(path: string) {
  return isServerProxy()
    ? `${getBaseUrl()}?path=${encodeURIComponent(path)}`
    : `${getBaseUrl()}${path}`;
}

async function ekaFetch<T>(path: string): Promise<T> {
  const token = getAuthToken();

  if (!token && !isServerProxy()) {
    throw new Error('Missing VITE_EKA_AUTH_TOKEN. Add it to your local .env file.');
  }

  const response = await fetch(buildEkaUrl(path), {
    headers: {
      ...(token ? { auth: token } : {}),
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || body?.error || response.statusText);
  }

  return body as T;
}

async function ekaJsonFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const clientId = getClientId();

  if (!token && !isServerProxy()) {
    throw new Error('Missing VITE_EKA_AUTH_TOKEN. Add it to your local .env file.');
  }

  const response = await fetch(buildEkaUrl(path), {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(clientId ? { 'client-id': clientId } : {}),
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || body?.error?.message || response.statusText);
  }

  return body as T;
}

async function ekaAppointmentFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  if (!token && !isServerProxy()) {
    throw new Error('Missing VITE_EKA_AUTH_TOKEN. Add it to your local .env file.');
  }

  const response = await fetch(buildEkaUrl(path), {
    ...init,
    headers: {
      ...(token ? { auth: token } : {}),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || body?.error?.message || response.statusText);
  }

  return body as T;
}

async function fetchPublicDoctorProfile(slug?: string, id?: string): Promise<EkaDoctorProfileResponse | undefined> {
  if (!slug) return undefined;

  const publicProfileBaseUrl = getPublicProfileBaseUrl();
  const profilePath = `/doctor/${slug}`;
  const profileUrl = publicProfileBaseUrl.startsWith('/api/eka-public')
    ? `${publicProfileBaseUrl}?path=${encodeURIComponent(profilePath)}`
    : `${publicProfileBaseUrl}${profilePath}`;
  const response = await fetch(profileUrl, {
    headers: { Accept: 'text/html' },
  });

  if (!response.ok) return undefined;

  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) return undefined;

  const data = JSON.parse(match[1]) as {
    props?: {
      pageProps?: {
        doctorState?: {
          profile?: EkaDoctorProfileResponse['profile'];
        };
      };
    };
  };
  const profile = data.props?.pageProps?.doctorState?.profile;

  return profile ? { id: id || slug, profile } : undefined;
}

function getEntities() {
  entitiesPromise ??= ekaFetch<EkaEntitiesResponse>('/dr/v1/business/entities');
  return entitiesPromise;
}

function getEntitiesData(response: EkaEntitiesResponse): EkaEntitiesData {
  return {
    clinics: response.data?.clinics ?? response.clinics ?? [],
    doctors: response.data?.doctors ?? response.doctors ?? [],
    business: response.data?.business ?? response.business,
  };
}

function formatDoctorName(profile: EkaDoctorProfileResponse) {
  const personal = profile.profile.personal;
  if (personal?.name?.fullName) return personal.name.fullName;

  const parts = [
    personal?.salutation,
    personal?.first_name,
    personal?.middle_name,
    personal?.last_name,
  ].filter(Boolean);

  return parts.join(' ').replace(/\s+/g, ' ').trim() || profile.id;
}

function formatClinicAddress(address?: EkaClinicResponse['data']['clinic']['address'] | EkaDoctorClinicAddress) {
  const postalCode = (address as { pin?: string; pincode?: string | number } | undefined)?.pincode ||
    (address as { pin?: string; pincode?: string | number } | undefined)?.pin;

  return [address?.line1, address?.city, address?.state, postalCode, address?.country]
    .filter(Boolean)
    .join(', ');
}

function clinicId(clinic: EkaDoctorClinic) {
  return clinic.id || clinic._id || '';
}

function parseExperienceYears(about?: string) {
  const match = about?.match(/(\d+)\s*(?:\+)?\s*(?:years?|yrs?)/i);
  return match ? Number(match[1]) : 0;
}

function parseNumberLike(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const match = value.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function yearsFromStartYear(value: unknown) {
  const startYear = parseNumberLike(value);
  const currentYear = new Date().getFullYear();

  if (!startYear || startYear < 1900 || startYear > currentYear) return undefined;
  return currentYear - startYear;
}

function extractExperienceYears(professional?: EkaDoctorProfileResponse['profile']['professional']) {
  const directExperience = [
    professional?.experience_years,
    professional?.years_of_experience,
    professional?.experience,
    professional?.exp,
  ]
    .map(parseNumberLike)
    .find((value): value is number => typeof value === 'number');

  if (typeof directExperience === 'number') return Math.max(0, Math.floor(directExperience));

  const startYearExperience =
    yearsFromStartYear(professional?.practice_start_year) ??
    yearsFromStartYear(professional?.practicing_since);

  if (typeof startYearExperience === 'number') return startYearExperience;

  return parseExperienceYears(professional?.about);
}

export async function getEkaPublicDoctorExperience(
  slug?: string,
  doctorId?: string
): Promise<number | undefined> {
  if (!slug) return undefined;

  const profile = await fetchPublicDoctorProfile(slug, doctorId);
  if (!profile) return undefined;

  const experienceYears = extractExperienceYears(profile.profile.professional);
  return experienceYears > 0 ? experienceYears : undefined;
}

function parseConsultationFee(services: Service[]) {
  const pricedServices = services.filter(
    (service) => typeof service.price === 'number' && service.price > 0
  );
  const exactConsultation = pricedServices.find(
    (service) => service.name1.trim().toLowerCase() === 'consultation'
  );
  const namedConsultation = pricedServices.find((service) =>
    /\b(consultation|consult)\b/i.test(service.name1)
  );

  return (exactConsultation || namedConsultation)?.price ?? DEFAULT_CONSULTATION_FEE;
}

const LANGUAGE_CODE_FALLBACKS: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  bn: 'বাংলা',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  or: 'ଓଡ଼ିଆ',
};

function formatLanguageName(value: string) {
  const normalized = value.trim();
  const code = normalized.toLowerCase();

  if (/^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(normalized)) {
    try {
      return new Intl.DisplayNames([code], { type: 'language' }).of(code) || LANGUAGE_CODE_FALLBACKS[code] || normalized;
    } catch {
      return LANGUAGE_CODE_FALLBACKS[code] || normalized;
    }
  }

  return normalized;
}

function normalizeLanguageValue(value: unknown) {
  if (typeof value === 'string') return formatLanguageName(value);
  if (!value || typeof value !== 'object') return '';

  const language = value as { language?: unknown; name?: unknown; code?: unknown };
  const rawValue = [language.code, language.language, language.name]
    .find((item): item is string => typeof item === 'string' && item.trim().length > 0)
    ?.trim();

  return rawValue ? formatLanguageName(rawValue) : '';
}

function extractLanguages(professional?: EkaDoctorProfileResponse['profile']['professional']) {
  const rawLanguages = professional?.language ?? professional?.languages;
  const values = Array.isArray(rawLanguages)
    ? rawLanguages.map(normalizeLanguageValue)
    : typeof rawLanguages === 'string'
      ? rawLanguages.split(',').map(formatLanguageName)
      : [];

  return [...new Set(values.filter(Boolean))].join(', ');
}

function firstClinic(profile: EkaDoctorProfileResponse) {
  const professional = profile.profile.professional;
  return (
    professional?.clinics?.find((clinic) => clinicId(clinic) === professional.default_clinic || clinic.default) ||
    professional?.clinics?.[0]
  );
}

function normalizeStringItem(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const item = value as { name?: unknown; label?: unknown; title?: unknown };
  return [item.name, item.label, item.title]
    .find((text): text is string => typeof text === 'string' && text.trim().length > 0)
    ?.trim() || '';
}

function extractImageUrls(value: unknown): string[] {
  if (typeof value === 'string') return value.startsWith('http') ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(extractImageUrls);
  if (!value || typeof value !== 'object') return [];

  const item = value as Record<string, unknown>;
  return ['url', 'image', 'image_url', 'src', 'contentUrl']
    .flatMap((key) => extractImageUrls(item[key]));
}

function formatScheduleTime(value?: number | string) {
  const time = String(value || '').padStart(4, '0');
  if (!/^\d{3,4}$/.test(time)) return '';

  const hours = Number(time.slice(0, -2));
  const minutes = time.slice(-2);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${suffix}`;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_CLINIC_PHONE = '9989804888';

function extractTimings(clinic: EkaDoctorClinic) {
  return Object.entries(clinic.schedule || {}).flatMap(([day, config]) => {
    if (!config?.is_enabled) return [];

    return (config.bounds || [])
      .map((bound: { s?: number | string; e?: number | string }) => {
        const start = formatScheduleTime(bound.s);
        const end = formatScheduleTime(bound.e);
        return start && end ? `${WEEK_DAYS[Number(day)] || day}: ${start} - ${end}` : '';
      })
      .filter(Boolean);
  });
}

function mapClinicProfile(clinic: EkaDoctorClinic): DoctorClinicProfile | undefined {
  const id = clinicId(clinic);
  if (!id) return undefined;

  return {
    id,
    name1: clinic.name,
    address: formatClinicAddress(clinic.address),
    phone: clinic.phone || clinic.contacts?.find((contact: { number?: string }) => contact.number)?.number || DEFAULT_CLINIC_PHONE,
    amenities: clinic.amenities?.map(normalizeStringItem).filter(Boolean),
    imageUrls: extractImageUrls([clinic.images, clinic.photos, clinic.gallery]).slice(0, 8),
    services: clinic.services?.map(normalizeStringItem).filter(Boolean),
    timings: extractTimings(clinic),
  };
}

function mapDoctorProfileToDoctor(
  profile: EkaDoctorProfileResponse,
  services: Service[] = []
): Doctor {
  const professional = profile.profile.professional;
  const clinic = firstClinic(profile);
  const clinicProfiles = professional?.clinics?.map(mapClinicProfile).filter((item): item is DoctorClinicProfile => Boolean(item)) || [];
  const clinics = clinicProfiles.map((item) => ({ id: item.id, name1: item.name1 }));
  const registration =
    professional?.registrations?.find((item) => item.default) ||
    professional?.registrations?.[0];
  const serviceNames = [
    professional?.major_speciality?.name,
    ...(professional?.speciality?.map((speciality) => speciality.name).filter(Boolean) || []),
    ...(professional?.c_spec || []),
    ...clinicProfiles.flatMap((item) => item.services || []),
    ...services.map((service) => service.name1),
  ].filter(Boolean);

  return {
    id: profile.id,
    name1: formatDoctorName(profile),
    bio: professional?.about,
    consultationFee: parseConsultationFee(services),
    experienceYears: extractExperienceYears(professional),
    imageURL: profile.profile.personal?.pic || profile.profile.personal?.pic_small,
    intro: professional?.intro,
    isAvailable: professional?.active ?? true,
    languages: extractLanguages(professional),
    location: clinic ? { id: clinicId(clinic), name1: clinic.name } : undefined,
    locations: clinics,
    publicProfileSlug: professional?.username,
    qualifications: professional?.degree?.map((degree) => degree.name).filter(Boolean).join(', '),
    registrationNumber: registration?.medical_id,
    registrationCouncil: registration?.council,
    clinicProfiles,
    doctorServices: [
      ...new Map(
        services
          .map((service) => service.name1.trim())
          .filter(Boolean)
          .map((serviceName) => [serviceName.toLocaleLowerCase(), serviceName] as const)
      ).values(),
    ],
    servicesOffered: [...new Set(serviceNames)].join(', '),
    specialty: professional?.major_speciality?.name || professional?.speciality?.[0]?.name || 'Doctor',
  };
}

function mapDoctorSummaryToDoctor(summary: EkaEntitiesData['doctors'][number]): Doctor {
  return {
    id: summary.doctor_id,
    name1: summary.name,
    experienceYears: 0,
    imageURL: summary.pic,
    isAvailable: false,
    specialty: 'Doctor',
  };
}

function mapClinicToLocation(clinic: EkaClinicResponse['data']['clinic']): Location {
  return {
    id: clinic.clinic_id,
    name1: clinic.name,
    address: formatClinicAddress(clinic.address) || clinic.name,
    area: clinic.address?.city || clinic.address?.state || clinic.name,
    open247: false,
    phone: DEFAULT_CLINIC_PHONE,
    lat: clinic.address?.lat,
    lon: clinic.address?.lon,
  };
}

function mapDoctorServiceToService(service: EkaDoctorService, index: number): Service {
  return {
    id: service.conf_id || `${service.service_name}-${index}`,
    name1: service.service_name,
    available247: false,
    description: [
      service.duration ? `${service.duration} min` : undefined,
      service.mode?.length ? service.mode.join(', ') : undefined,
    ]
      .filter(Boolean)
      .join(' | '),
    displayOrder: index + 1,
    iconName: service.mode?.includes('in-clinic') ? 'stethoscope' : 'activity',
    price: service.price,
    currency: service.currency,
  };
}

function applyOptions<T extends { name1?: string; displayOrder?: number; isAvailable?: boolean }>(
  records: T[],
  options?: IOperationOptions
) {
  let result = [...records];

  if (options?.filter === 'isAvailable eq true') {
    result = result.filter((record) => record.isAvailable);
  }

  if (options?.orderBy?.includes('displayOrder asc')) {
    result.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  } else if (options?.orderBy?.includes('name1 asc')) {
    result.sort((a, b) => (a.name1 || '').localeCompare(b.name1 || ''));
  }

  const skip = options?.skip || 0;
  const top = options?.top ?? result.length;

  return result.slice(skip, skip + top);
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').slice(-10);
}

function splitPatientName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || fullName.trim(),
    lastName: parts.slice(1).join(' '),
  };
}

function toEpochSeconds(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAvailabilityLabel(slotStart: string) {
  const slotDate = new Date(slotStart);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const dateKey = formatDateKey(slotDate);
  const label =
    dateKey === formatDateKey(today)
      ? 'Today'
      : dateKey === formatDateKey(tomorrow)
        ? 'Tomorrow'
        : slotDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = slotDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return `${label}, ${time}`;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(undefined), milliseconds);

    promise
      .then((value) => resolve(value))
      .catch(() => resolve(undefined))
      .finally(() => window.clearTimeout(timer));
  });
}

async function getNextAvailability(doctorId: string, clinicIds: string[]) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 6);
  const requests = clinicIds.map((clinicIdValue) =>
    getEkaAppointmentSlots(
      doctorId,
      clinicIdValue,
      formatDateKey(startDate),
      formatDateKey(endDate)
    ).catch(() => [])
  );

  const slotsByClinic = await Promise.all(requests);
  const nextSlot = slotsByClinic
    .flat()
    .filter((slot) => slot.available && new Date(slot.s).getTime() > Date.now())
    .sort((a, b) => new Date(a.s).getTime() - new Date(b.s).getTime())[0];

  if (nextSlot) {
    return {
      isAvailable: true,
      nextAvailableSlot: formatAvailabilityLabel(nextSlot.s),
    };
  }

  return {
    isAvailable: false,
    nextAvailableSlot: undefined,
  };
}

export async function getEkaDoctorNextAvailability(
  doctorId: string,
  clinicIds: string[]
): Promise<{ isAvailable: boolean; nextAvailableSlot?: string }> {
  const uniqueClinicIds = [...new Set(clinicIds.filter(Boolean))];
  if (!doctorId || uniqueClinicIds.length === 0) {
    return { isAvailable: false, nextAvailableSlot: undefined };
  }

  return getNextAvailability(doctorId, uniqueClinicIds);
}

function mergeDoctorProfile(base: Doctor, enrichment?: Doctor): Doctor {
  if (!enrichment) return base;

  return {
    ...base,
    bio: enrichment.bio || base.bio,
    clinicProfiles: enrichment.clinicProfiles?.length ? enrichment.clinicProfiles : base.clinicProfiles,
    experienceYears: enrichment.experienceYears || base.experienceYears,
    imageURL: enrichment.imageURL || base.imageURL,
    intro: enrichment.intro || base.intro,
    languages: enrichment.languages || base.languages,
    locations: enrichment.locations?.length ? enrichment.locations : base.locations,
    qualifications: enrichment.qualifications || base.qualifications,
    registrationCouncil: enrichment.registrationCouncil || base.registrationCouncil,
    registrationNumber: enrichment.registrationNumber || base.registrationNumber,
    doctorServices: enrichment.doctorServices?.length
      ? enrichment.doctorServices
      : base.doctorServices,
    servicesOffered: enrichment.servicesOffered || base.servicesOffered,
    specialty: enrichment.specialty || base.specialty,
  };
}

export async function getEkaDoctor(id: string): Promise<Doctor> {
  const [profile, services] = await Promise.all([
    ekaFetch<EkaDoctorProfileResponse>(`/dr/v1/doctor/${id}`),
    getEkaDoctorServices(id).catch(() => []),
  ]);

  const authenticatedDoctor = mapDoctorProfileToDoctor(profile, services);
  const publicProfile = await withTimeout(
    fetchPublicDoctorProfile(authenticatedDoctor.publicProfileSlug, id),
    2500
  );
  const publicDoctor = publicProfile ? mapDoctorProfileToDoctor(publicProfile, services) : undefined;
  const doctor = mergeDoctorProfile(authenticatedDoctor, publicDoctor);
  const clinicIds = (doctor.locations?.length ? doctor.locations : doctor.location ? [doctor.location] : [])
    .map((clinic) => clinic.id)
    .filter(Boolean);
  const availability = clinicIds.length
    ? await withTimeout(getNextAvailability(id, clinicIds), 3500)
    : undefined;

  return {
    ...doctor,
    isAvailable: availability?.isAvailable ?? false,
    nextAvailableSlot: availability?.nextAvailableSlot,
  };
}

export async function getEkaDoctors(options?: IOperationOptions): Promise<Doctor[]> {
  if (isServerProxy()) {
    const query = new URLSearchParams();
    if (typeof options?.top === 'number') query.set('top', String(options.top));
    const response = await fetch(`/api/doctors${query.size ? `?${query.toString()}` : ''}`, {
      headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.message || response.statusText);
    }

    const aggregatedDoctors: EkaAggregatedDoctor[] = Array.isArray(body?.doctors)
      ? body.doctors
      : [];
    const doctors = aggregatedDoctors.map(({ summary, profile, services }) => {
      const fallback = mapDoctorSummaryToDoctor(summary);
      if (!profile) return fallback;

      const serviceList = Array.isArray(services) ? services : services ? [services] : [];
      return mapDoctorProfileToDoctor(
        profile,
        serviceList
          .filter((service) => !service.archive)
          .map((service, index) => mapDoctorServiceToService(service, index))
      );
    });

    return applyOptions(doctors, options);
  }

  const entities = getEntitiesData(await getEntities());
  const summaries = applyOptions(
    entities.doctors.map(mapDoctorSummaryToDoctor),
    options
  );
  const doctors = await Promise.all(
    summaries.map(async (summary) => {
      try {
        const details = await withTimeout(
          Promise.all([
            ekaFetch<EkaDoctorProfileResponse>(`/dr/v1/doctor/${summary.id}`),
            getEkaDoctorServices(summary.id).catch(() => []),
          ]),
          4000
        );
        if (!details) return summary;

        const [profile, services] = details;
        const authenticatedDoctor = mapDoctorProfileToDoctor(profile, services);
        return {
          ...authenticatedDoctor,
          isAvailable: authenticatedDoctor.isAvailable,
          nextAvailableSlot: undefined,
        };
      } catch {
        return summary;
      }
    })
  );

  return doctors;
}

export async function getEkaClinic(id: string): Promise<Location> {
  const response = await ekaFetch<EkaClinicResponse>(`/dr/v1/business/clinic/${id}`);
  return mapClinicToLocation(response.data.clinic);
}

export async function getEkaClinics(options?: IOperationOptions): Promise<Location[]> {
  const entities = getEntitiesData(await getEntities());
  const clinics = await Promise.all(
    entities.clinics.map(async (clinic) => {
      try {
        return await getEkaClinic(clinic.clinic_id);
      } catch {
        return {
          id: clinic.clinic_id,
          name1: clinic.name,
          address: clinic.name,
          area: clinic.name,
          open247: false,
          phone: DEFAULT_CLINIC_PHONE,
        };
      }
    })
  );

  return applyOptions(clinics, options);
}

export async function getEkaDoctorServices(doctorId: string): Promise<Service[]> {
  const response = await ekaFetch<EkaDoctorServicesResponse>(`/dr/v1/doctor/service/${doctorId}`);
  const services = Array.isArray(response.data.services)
    ? response.data.services
    : [response.data.services];

  return services
    .filter((service) => !service.archive)
    .map((service, index) => mapDoctorServiceToService(service, index));
}

export async function getEkaServices(options?: IOperationOptions): Promise<Service[]> {
  if (isServerProxy()) {
    const response = await fetch('/api/services', {
      headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.message || response.statusText);
    }

    const services = Array.isArray(body?.services) ? body.services : [];
    return applyOptions(
      services.map((service: EkaDoctorService, index: number) =>
        mapDoctorServiceToService(service, index)
      ),
      options
    );
  }

  const entities = getEntitiesData(await getEntities());
  const servicesById = new Map<string, Service>();
  let successfulRequests = 0;
  const batchSize = 5;

  for (let index = 0; index < entities.doctors.length; index += batchSize) {
    const doctors = entities.doctors.slice(index, index + batchSize);
    const results = await Promise.allSettled(
      doctors.map((doctor) => getEkaDoctorServices(doctor.doctor_id))
    );

    results.forEach((result) => {
      if (result.status !== 'fulfilled') return;

      successfulRequests += 1;
      result.value.forEach((service) => {
        if (!servicesById.has(service.id)) {
          servicesById.set(service.id, {
            ...service,
            displayOrder: servicesById.size + 1,
          });
        }
      });
    });
  }

  if (entities.doctors.length > 0 && successfulRequests === 0) {
    throw new Error('Unable to load services from Eka.');
  }

  return applyOptions([...servicesById.values()], options);
}

function formatSlotDateBoundary(value: string, boundary: 'start' | 'end') {
  if (value.includes('T')) return value;

  return `${value}T${boundary === 'start' ? '00:00:00' : '23:59:59'}+05:30`;
}

export async function getEkaAppointmentSlots(
  doctorId: string,
  clinicId: string,
  startDate: string,
  endDate: string
): Promise<EkaAppointmentSlot[]> {
  const query = new URLSearchParams({
    start_date: formatSlotDateBoundary(startDate, 'start'),
    end_date: formatSlotDateBoundary(endDate, 'end'),
  });
  const response = await ekaAppointmentFetch<EkaAppointmentSlotsResponse>(
    `/dr/v1/doctor/${doctorId}/clinic/${clinicId}/appointment/slot?${query.toString()}`
  );
  const schedule = response.data.schedule || {};
  const services = response.data.services || {};

  return Object.values(schedule).flatMap((groups) =>
    groups.flatMap((group) =>
      (group.slots || []).map((slot) => {
        const service = services[slot.conf_id];
        return {
          ...slot,
          serviceType: group.service_type,
          serviceName: service?.service_name,
          price: service?.price,
          currency: service?.currency,
          mode: service?.mode,
        };
      })
    )
  );
}

export async function findEkaPatientByMobileAndName(
  mobile: string,
  fullName: string
): Promise<EkaPatientSummary | undefined> {
  const normalizedPhone = normalizePhone(mobile);
  const normalizedName = fullName.trim().toLowerCase();
  const query = new URLSearchParams({
    prefix: normalizedPhone,
    limit: '10',
    select: 'dob,gen',
  });
  const patients = await ekaJsonFetch<EkaPatientSummary[]>(
    `/profiles/v1/patient/search?${query.toString()}`
  );

  return patients.find((patient) => {
    const patientPhone = normalizePhone(patient.mobile || patient.username || '');
    const patientName = (patient.fln || `${patient.fn || ''} ${patient.ln || ''}`).trim().toLowerCase();

    return (
      patientPhone === normalizedPhone &&
      (patientName.includes(normalizedName) || normalizedName.includes(patientName))
    );
  });
}

export async function createEkaPatient(input: EkaCreatePatientInput): Promise<EkaPatientSummary> {
  const { firstName, lastName } = splitPatientName(input.fullName);
  const mobile = input.mobile.startsWith('+') ? input.mobile : `+91${normalizePhone(input.mobile)}`;
  const username = `DP${Date.now()}`;

  const response = await ekaJsonFetch<{ oid: string }>('/profiles/v1/patient/', {
    method: 'POST',
    body: JSON.stringify({
      fn: firstName,
      ...(lastName ? { ln: lastName } : {}),
      dob: input.dob,
      gen: input.gender,
      mobile,
      email: input.email || undefined,
      username,
    }),
  });

  return {
    oid: response.oid,
    fln: input.fullName.trim(),
    mobile,
    username,
  };
}

export async function findOrCreateEkaPatient(input: EkaCreatePatientInput): Promise<EkaPatientSummary> {
  const existingPatient = await findEkaPatientByMobileAndName(input.mobile, input.fullName);
  return existingPatient || createEkaPatient(input);
}

export async function bookEkaAppointment(input: EkaBookAppointmentInput): Promise<{ appointment_id: string }> {
  return ekaAppointmentFetch<{ appointment_id: string }>('/dr/v1/appointment', {
    method: 'POST',
    body: JSON.stringify({
      clinic_id: input.clinicId,
      doctor_id: input.doctorId,
      patient_id: input.patientId,
      appointment_details: {
        start_time: toEpochSeconds(input.slot.s),
      },
    }),
  });
}
