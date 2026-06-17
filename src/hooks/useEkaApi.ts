import { useState, useEffect } from 'react';
import { ekaApi } from '@/services/ekaApi';
import {
  transformClinicsAndDoctors,
  transformDoctorProfile,
  transformClinicDetails,
  transformDoctorServices,
  type TransformedClinic,
  type TransformedDoctor,
  type TransformedService,
} from '@/lib/transformers';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch clinics and doctors list
 */
export function useClinicsAndDoctors() {
  const [state, setState] = useState<
    UseApiState<{
      clinics: TransformedClinic[];
      doctors: TransformedDoctor[];
    }>
  >({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const response = await ekaApi.getClinicsAndDoctors();
        const transformed = transformClinicsAndDoctors(response);
        setState({
          data: {
            clinics: transformed.clinics,
            doctors: transformed.doctors,
          },
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
        });
      }
    };

    fetchData();
  }, []);

  return state;
}

/**
 * Hook to fetch doctor profile by ID
 */
export function useDoctorProfile(doctorId: string | undefined) {
  const [state, setState] = useState<UseApiState<TransformedDoctor>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!doctorId) {
      setState({
        data: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const response = await ekaApi.getDoctorProfile(doctorId);
        const transformed = transformDoctorProfile(response);
        setState({
          data: transformed,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
        });
      }
    };

    fetchData();
  }, [doctorId]);

  return state;
}

/**
 * Hook to fetch clinic details by ID
 */
export function useClinicDetails(clinicId: string | undefined) {
  const [state, setState] = useState<UseApiState<TransformedClinic>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!clinicId) {
      setState({
        data: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const response = await ekaApi.getClinicDetails(clinicId);
        const transformed = transformClinicDetails(response);
        setState({
          data: transformed,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
        });
      }
    };

    fetchData();
  }, [clinicId]);

  return state;
}

/**
 * Hook to fetch doctor services by ID
 */
export function useDoctorServices(doctorId: string | undefined) {
  const [state, setState] = useState<UseApiState<TransformedService>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!doctorId) {
      setState({
        data: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const response = await ekaApi.getDoctorServices(doctorId);
        const transformed = transformDoctorServices(response);
        setState({
          data: transformed,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState({
          data: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
        });
      }
    };

    fetchData();
  }, [doctorId]);

  return state;
}
