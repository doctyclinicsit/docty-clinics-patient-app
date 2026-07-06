import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface SessionPatientProfile {
  id: string;
  name: string;
  accessToken: string;
  mobile: string;
  imageUrl?: string;
  relation?: string;
  dob?: string;
  gender?: string;
  subscription?: {
    subscriber: boolean;
    planCode?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface PatientSessionContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  profiles: SessionPatientProfile[];
  activeProfile?: SessionPatientProfile;
  selectProfile: (profileId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const PatientSessionContext = createContext<PatientSessionContextValue | undefined>(undefined);

export function PatientSessionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profiles, setProfiles] = useState<SessionPatientProfile[]>([]);
  const [activePatientId, setActivePatientId] = useState('');

  const refreshSession = useCallback(async () => {
    try {
      const sessionResponse = await fetch('/api/patient-session', {
        headers: { Accept: 'application/json' },
      });
      if (!sessionResponse.ok) {
        setIsAuthenticated(false);
        setProfiles([]);
        setActivePatientId('');
        return;
      }

      const session = await sessionResponse.json();
      const patientsResponse = await fetch('/api/patients', {
        headers: { Accept: 'application/json' },
      });
      if (!patientsResponse.ok) throw new Error('Unable to load patient profile.');

      const body = await patientsResponse.json();
      setIsAuthenticated(true);
      setProfiles(body?.profiles || []);
      setActivePatientId(session?.patientId || body?.profiles?.[0]?.id || '');
    } catch {
      setIsAuthenticated(false);
      setProfiles([]);
      setActivePatientId('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setProfiles([]);
    setActivePatientId('');
  }, []);

  const selectProfile = useCallback(
    async (profileId: string) => {
      const profile = profiles.find((item) => item.id === profileId);
      if (!profile) throw new Error('Patient profile not found.');

      const response = await fetch('/api/patient-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: profile.accessToken }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to switch patient profile.');
      }

      setActivePatientId(profile.id);
    },
    [profiles]
  );

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      profiles,
      activeProfile:
        profiles.find((profile) => profile.id === activePatientId) || profiles[0],
      selectProfile,
      refreshSession,
      logout,
    }),
    [activePatientId, isAuthenticated, isLoading, logout, profiles, refreshSession, selectProfile]
  );

  return (
    <PatientSessionContext.Provider value={value}>
      {children}
    </PatientSessionContext.Provider>
  );
}

export function usePatientSession() {
  const context = useContext(PatientSessionContext);
  if (!context) {
    throw new Error('usePatientSession must be used within PatientSessionProvider.');
  }
  return context;
}
