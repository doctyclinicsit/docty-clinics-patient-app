import type {
  ClinicsAndDoctorsResponse,
  DoctorProfileResponse,
  ClinicDetailsResponse,
  DoctorServicesResponse,
} from '@/services/ekaApi';

// Transform clinic data from API to app format
export interface TransformedClinic {
  id: string;
  name1: string;
  area?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  phone?: string;
  imageUrl?: string;
  open247?: boolean;
  services?: string;
  lat?: number;
  lon?: number;
}

// Transform doctor data from API to app format
export interface TransformedDoctor {
  id: string;
  name1: string;
  specialty?: string;
  qualifications?: string;
  experienceYears?: number;
  imageURL?: string;
  isAvailable?: boolean;
  nextAvailableSlot?: string;
  consultationFee?: number;
  rating?: number;
  bio?: string;
  languages?: string;
  registrationNumber?: string;
  servicesOffered?: string;
  location?: {
    id: string;
    name1: string;
    area?: string;
  };
}

// Transform service data from API to app format
export interface TransformedService {
  id: string;
  name1: string;
  serviceType?: string;
  price?: number;
  duration?: number;
  mode?: string[];
  isAvailable?: boolean;
}

/**
 * Transform clinics and doctors list from API response
 */
export function transformClinicsAndDoctors(data: ClinicsAndDoctorsResponse) {
  const clinics: TransformedClinic[] = data.data.clinics.map((clinic) => ({
    id: clinic.clinic_id,
    name1: clinic.name,
  }));

  const doctors: TransformedDoctor[] = data.data.doctors.map((doctor) => ({
    id: doctor.doctor_id,
    name1: doctor.name,
    imageURL: doctor.pic,
  }));

  return {
    clinics,
    doctors,
    business: data.data.business,
  };
}

/**
 * Transform doctor profile from API response
 */
export function transformDoctorProfile(
  data: DoctorProfileResponse
): TransformedDoctor {
  const { profile } = data;
  const { personal, professional } = profile;

  const fullName = [
    personal.salutation,
    personal.first_name,
    personal.middle_name,
    personal.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const specialty = professional.major_speciality?.name || '';
  const qualifications = professional.degree
    ?.map((d) => d.name)
    .join(', ') || '';

  // Calculate years of experience (rough estimate from DOB)
  let experienceYears = 0;
  if (personal.dob) {
    const birthYear = new Date(personal.dob).getFullYear();
    experienceYears = new Date().getFullYear() - birthYear - 25; // Assuming medical school at 25
  }

  const languages = professional.language
    ?.map((l) => l.language)
    .join(', ') || 'English';

  const registrationNumber = professional.username || '';

  const servicesOffered = professional.speciality
    ?.map((s) => s.name)
    .join(', ') || specialty;

  // Get default clinic info
  const defaultClinicId = professional.default_clinic;
  const defaultClinic = professional.clinics.find(
    (c) => c.id === defaultClinicId
  );

  const location = defaultClinic
    ? {
        id: defaultClinic.id,
        name1: defaultClinic.name,
        area: defaultClinic.address?.city || '',
      }
    : undefined;

  return {
    id: data.id,
    name1: fullName,
    specialty,
    qualifications,
    experienceYears,
    imageURL: personal.pic,
    isAvailable: professional.active,
    bio: professional.about,
    languages,
    registrationNumber,
    servicesOffered,
    location,
  };
}

/**
 * Transform clinic details from API response
 */
export function transformClinicDetails(
  data: ClinicDetailsResponse
): TransformedClinic {
  const { clinic } = data.data;

  return {
    id: clinic.clinic_id,
    name1: clinic.name,
    area: clinic.address.city,
    address: clinic.address.line1,
    city: clinic.address.city,
    state: clinic.address.state,
    pin: clinic.address.pincode.toString(),
    lat: clinic.address.lat,
    lon: clinic.address.lon,
  };
}

/**
 * Transform doctor services from API response
 */
export function transformDoctorServices(
  data: DoctorServicesResponse
): TransformedService {
  const { services } = data.data;

  return {
    id: services.conf_id,
    name1: services.service_name,
    serviceType: services.appointment_type,
    price: services.price,
    duration: services.duration,
    mode: services.mode,
    isAvailable: !services.archive,
  };
}

/**
 * Transform multiple doctor services
 */
export function transformMultipleDoctorServices(
  dataArray: DoctorServicesResponse[]
): TransformedService[] {
  return dataArray.map(transformDoctorServices);
}
