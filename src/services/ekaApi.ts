import { apiClient } from './apiClient';

// Types for API responses
export interface ClinicsAndDoctorsResponse {
  status_code: number;
  success: boolean;
  data: {
    clinics: Array<{
      clinic_id: string;
      name: string;
      doctors: string[];
    }>;
    doctors: Array<{
      name: string;
      doctor_id: string;
      pic: string;
    }>;
    business: {
      business_id: string;
      name: string;
    };
  };
}

export interface DoctorProfileResponse {
  id: string;
  profile: {
    personal: {
      salutation: string;
      first_name: string;
      middle_name: string;
      last_name: string;
      dob: string;
      gender: string;
      pic: string;
    };
    professional: {
      active: boolean;
      username: string;
      about: string;
      language: Array<{
        code: string;
        language: string;
      }>;
      degree: Array<{
        name: string;
        branch_name: string;
        college_name: string;
        start_year: string;
        end_year: string;
      }>;
      major_speciality: {
        name: string;
        code: string;
      };
      speciality: Array<{
        name: string;
      }>;
      clinics: Array<{
        id: string;
        name: string;
        contacts: Array<{
          name: string;
          number: string;
        }>;
        address: {
          line1: string;
          city: string;
          country: string;
          state: string;
          pin: string;
        };
      }>;
      default_clinic: string;
    };
  };
}

export interface ClinicDetailsResponse {
  success: boolean;
  data: {
    clinic: {
      clinic_id: string;
      name: string;
      address: {
        city: string;
        country: string;
        lat: number;
        line1: string;
        lon: number;
        pincode: number;
        state: string;
      };
    };
  };
}

export interface DoctorServicesResponse {
  data: {
    services: {
      appointment_type: string;
      archive: boolean;
      book_ahead_days: number;
      created_at: number;
      currency: string;
      duration: number;
      mode: string[];
      pre_pay: boolean;
      price: number;
      service_name: string;
      conf_id: string;
    };
  };
}

// API Service
export const ekaApi = {
  // Get all clinics and associated doctors
  getClinicsAndDoctors: async () => {
    const response = await apiClient.get<ClinicsAndDoctorsResponse>(
      '/dr/v1/business/entities'
    );
    return response.data;
  },

  // Get doctor profile details
  getDoctorProfile: async (doctorId: string) => {
    const response = await apiClient.get<DoctorProfileResponse>(
      `/dr/v1/doctor/${doctorId}`
    );
    return response.data;
  },

  // Get clinic details
  getClinicDetails: async (clinicId: string) => {
    const response = await apiClient.get<ClinicDetailsResponse>(
      `/dr/v1/business/clinic/${clinicId}`
    );
    return response.data;
  },

  // Get doctor services
  getDoctorServices: async (doctorId: string) => {
    const response = await apiClient.get<DoctorServicesResponse>(
      `/dr/v1/doctor/service/${doctorId}`
    );
    return response.data;
  },
};
