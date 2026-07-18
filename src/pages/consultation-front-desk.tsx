import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { DoctyLogo } from '@/components/docty-logo';
import { Button } from '@/components/ui/button';
import {
  bookEkaAppointment,
  findOrCreateEkaPatient,
  getEkaAppointmentSlots,
  getEkaClinics,
  getEkaDoctors,
  getEkaDoctorServices,
  type EkaAppointmentSlot,
} from '@/lib/eka-api';

type AppointmentCategory = 'New' | 'Booked' | 'Follow-ups' | 'Others';
type AppointmentStatus = 'Checked in' | 'Completed';
type IntakeMode = 'booking' | 'walk-in';
type AssignedClinic = { id: string; name: string };

type Appointment = {
  id: number;
  token: string;
  patient: string;
  initials: string;
  age: number;
  gender: 'M' | 'F';
  phone: string;
  time: string;
  doctor: string;
  specialty: string;
  service: string;
  category: AppointmentCategory;
  status: AppointmentStatus;
  payment: 'Paid' | 'Pending';
  waitMinutes: number;
};

const initialAppointments: Appointment[] = [
  {
    id: 1,
    token: 'A-01',
    patient: 'Ananya Rao',
    initials: 'AR',
    age: 32,
    gender: 'F',
    phone: '98••• 24018',
    time: '09:30 AM',
    doctor: 'Dr. Meera Iyer',
    specialty: 'General Medicine',
    service: 'Doctor Consultation',
    category: 'Booked',
    status: 'Checked in',
    payment: 'Paid',
    waitMinutes: 12,
  },
  {
    id: 2,
    token: 'A-02',
    patient: 'Rohan Verma',
    initials: 'RV',
    age: 27,
    gender: 'M',
    phone: '91••• 67542',
    time: '09:45 AM',
    doctor: 'Dr. Meera Iyer',
    specialty: 'General Medicine',
    service: 'Fever Consultation',
    category: 'New',
    status: 'Checked in',
    payment: 'Pending',
    waitMinutes: 8,
  },
  {
    id: 3,
    token: 'D-04',
    patient: 'Lakshmi Nair',
    initials: 'LN',
    age: 45,
    gender: 'F',
    phone: '99••• 38106',
    time: '10:00 AM',
    doctor: 'Dr. Arjun Menon',
    specialty: 'Dentistry',
    service: 'Dental Review',
    category: 'Follow-ups',
    status: 'Checked in',
    payment: 'Paid',
    waitMinutes: 5,
  },
  {
    id: 4,
    token: 'P-02',
    patient: 'Vikram Shah',
    initials: 'VS',
    age: 51,
    gender: 'M',
    phone: '97••• 45810',
    time: '10:15 AM',
    doctor: 'Dr. Sana Khan',
    specialty: 'Physiotherapy',
    service: 'Pain Management',
    category: 'Booked',
    status: 'Checked in',
    payment: 'Paid',
    waitMinutes: 2,
  },
  {
    id: 5,
    token: 'A-08',
    patient: 'Srinivas Reddy',
    initials: 'SR',
    age: 38,
    gender: 'M',
    phone: '90••• 74125',
    time: '08:45 AM',
    doctor: 'Dr. Meera Iyer',
    specialty: 'General Medicine',
    service: 'Doctor Consultation',
    category: 'Others',
    status: 'Completed',
    payment: 'Paid',
    waitMinutes: 0,
  },
  {
    id: 6,
    token: 'D-02',
    patient: 'Fatima Begum',
    initials: 'FB',
    age: 29,
    gender: 'F',
    phone: '96••• 13579',
    time: '09:00 AM',
    doctor: 'Dr. Arjun Menon',
    specialty: 'Dentistry',
    service: 'Dental Consultation',
    category: 'Follow-ups',
    status: 'Completed',
    payment: 'Paid',
    waitMinutes: 0,
  },
];

const categories: AppointmentCategory[] = ['New', 'Booked', 'Follow-ups', 'Others'];

function Avatar({ initials, tone = 'blue' }: { initials: string; tone?: 'blue' | 'pink' }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${
        tone === 'pink' ? 'bg-pink-50 text-[#e61663]' : 'bg-sky-50 text-sky-700'
      }`}
    >
      {initials}
    </span>
  );
}

export default function ConsultationFrontDeskPage() {
  const [authStep, setAuthStep] = useState<'mobile' | 'otp'>('mobile');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffMobile, setStaffMobile] = useState('');
  const [staffOtp, setStaffOtp] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [assignedClinics, setAssignedClinics] = useState<AssignedClinic[]>([]);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [isSendingStaffOtp, setIsSendingStaffOtp] = useState(false);
  const [isVerifyingStaffOtp, setIsVerifyingStaffOtp] = useState(false);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AppointmentCategory>('Booked');
  const [status, setStatus] = useState<AppointmentStatus>('Checked in');
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('booking');
  const [newPatient, setNewPatient] = useState('');
  const [newPatientMobile, setNewPatientMobile] = useState('');
  const [newPatientDob, setNewPatientDob] = useState('');
  const [newPatientGender, setNewPatientGender] = useState<'M' | 'F' | 'O'>('M');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [newDoctor, setNewDoctor] = useState('');
  const [newService, setNewService] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  const todayKey = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
  }, []);
  const { data: allEkaClinics = [], isLoading: clinicsLoading } = useQuery({
    queryKey: ['eka-clinics', 'front-desk'],
    queryFn: () => getEkaClinics(),
    enabled: isAuthenticated,
  });
  const { data: ekaDoctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['eka-doctors', 'front-desk'],
    queryFn: () => getEkaDoctors(),
    enabled: isAuthenticated,
  });
  const ekaClinics = useMemo(() => {
    if (isStaffAdmin) return allEkaClinics;
    const assignedIds = new Set(assignedClinics.map((item) => item.id.trim().toLowerCase()).filter(Boolean));
    const assignedNames = new Set(assignedClinics.map((item) => item.name.trim().toLowerCase()).filter(Boolean));
    return allEkaClinics.filter(
      (clinicItem) =>
        assignedIds.has(clinicItem.id.trim().toLowerCase()) ||
        assignedNames.has(clinicItem.name1.trim().toLowerCase()),
    );
  }, [allEkaClinics, assignedClinics, isStaffAdmin]);
  const clinicDoctors = useMemo(
    () =>
      ekaDoctors.filter((doctor) => {
        const locations = doctor.locations?.length
          ? doctor.locations
          : doctor.location
            ? [doctor.location]
            : [];
        return !selectedClinicId || locations.some((location) => location.id === selectedClinicId);
      }),
    [ekaDoctors, selectedClinicId],
  );
  const { data: ekaServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['eka-doctor-services', newDoctor],
    queryFn: () => getEkaDoctorServices(newDoctor),
    enabled: isAuthenticated && Boolean(newDoctor),
  });
  const { data: ekaSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['eka-front-desk-slots', newDoctor, selectedClinicId, todayKey],
    queryFn: () => getEkaAppointmentSlots(newDoctor, selectedClinicId, todayKey, todayKey),
    enabled: isAuthenticated && intakeMode === 'booking' && Boolean(newDoctor && selectedClinicId),
  });
  const availableSlots = useMemo(
    () =>
      ekaSlots
        .filter((slot) => slot.available && new Date(slot.s).getTime() > Date.now())
        .sort((first, second) => new Date(first.s).getTime() - new Date(second.s).getTime()),
    [ekaSlots],
  );
  const selectedClinic = ekaClinics.find((item) => item.id === selectedClinicId);
  const clinic = selectedClinic?.name1 || 'Loading clinic…';
  const selectedEkaDoctor = clinicDoctors.find((doctor) => doctor.id === newDoctor);
  const selectedEkaService = ekaServices.find((service) => service.id === newService);

  useEffect(() => {
    fetch('/api/staff/session', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        setIsAuthenticated(response.ok);
        if (!response.ok) return;
        setStaffName(body?.staff?.name || '');
        setStaffMobile(body?.staff?.mobile || '');
        setStaffRole(body?.staff?.role || '');
        setIsStaffAdmin(Boolean(body?.staff?.isAdmin));
        setAssignedClinics(Array.isArray(body?.staff?.assignedClinics) ? body.staff.assignedClinics : []);
        setModuleAccess(body?.staff?.moduleAccess || {});
        setSessionExpiresAt(body?.expiresAt || null);
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return undefined;
    const timeoutMs = Math.max(0, sessionExpiresAt * 1000 - Date.now());
    const timer = window.setTimeout(() => {
      setIsAuthenticated(false);
      setSessionExpiresAt(null);
      setAuthStep('mobile');
      toast.info('Staff session expired. Please verify OTP again.');
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, sessionExpiresAt]);

  useEffect(() => {
    if (!selectedClinicId && ekaClinics[0]?.id) setSelectedClinicId(ekaClinics[0].id);
  }, [ekaClinics, selectedClinicId]);

  useEffect(() => {
    if (selectedClinicId && !ekaClinics.some((item) => item.id === selectedClinicId)) {
      setSelectedClinicId(ekaClinics[0]?.id || '');
    }
  }, [ekaClinics, selectedClinicId]);

  useEffect(() => {
    if (!clinicDoctors.some((doctor) => doctor.id === newDoctor)) {
      setNewDoctor(clinicDoctors[0]?.id || '');
    }
  }, [clinicDoctors, newDoctor]);

  useEffect(() => {
    if (!ekaServices.some((service) => service.id === newService)) {
      setNewService(ekaServices[0]?.id || '');
    }
  }, [ekaServices, newService]);

  useEffect(() => {
    if (!availableSlots.some((slot) => slot.s === newSlot)) {
      setNewSlot(availableSlots[0]?.s || '');
    }
  }, [availableSlots, newSlot]);

  const counts = useMemo(
    () =>
      categories.reduce(
        (result, item) => ({
          ...result,
          [item]: appointments.filter((appointment) => appointment.category === item).length,
        }),
        {} as Record<AppointmentCategory, number>,
      ),
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    const search = query.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const matchesCategory = appointment.category === category;
      const matchesStatus = appointment.status === status;
      const matchesSearch =
        !search ||
        [
          appointment.patient,
          appointment.phone,
          appointment.specialty,
          appointment.service,
          appointment.doctor,
          appointment.token,
        ].some((value) => value.toLowerCase().includes(search));
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [appointments, category, query, status]);

  const queue = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === 'Checked in')
        .filter((appointment) => {
          const search = query.trim().toLowerCase();
          return (
            !search ||
            [
              appointment.patient,
              appointment.specialty,
              appointment.service,
              appointment.doctor,
              appointment.token,
            ].some((value) => value.toLowerCase().includes(search))
          );
        }),
    [appointments, query],
  );

  async function sendStaffOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const mobile = staffMobile.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit Eka staff mobile number.');
      return;
    }
    setIsSendingStaffOtp(true);
    try {
      const response = await fetch('/api/staff/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setStaffMobile(mobile);
      setAuthStep('otp');
      toast.success(body?.message || 'WhatsApp OTP sent successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingStaffOtp(false);
    }
  }

  async function verifyStaffOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(staffOtp)) {
      toast.error('Enter the OTP sent to your WhatsApp.');
      return;
    }
    setIsVerifyingStaffOtp(true);
    try {
      const response = await fetch('/api/staff/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: staffMobile, otp: staffOtp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setIsAuthenticated(true);
      setStaffName(body?.staff?.name || '');
      setStaffMobile(body?.staff?.mobile || staffMobile);
      setStaffRole(body?.staff?.role || '');
      setIsStaffAdmin(Boolean(body?.staff?.isAdmin));
      setAssignedClinics(Array.isArray(body?.staff?.assignedClinics) ? body.staff.assignedClinics : []);
      setModuleAccess(body?.staff?.moduleAccess || {});
      setSessionExpiresAt(body?.expiresAt || Math.floor(Date.now() / 1000) + 30 * 60);
      setStaffOtp('');
      toast.success('Eka staff access verified.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingStaffOtp(false);
    }
  }

  async function logout() {
    await fetch('/api/staff/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setStaffName('');
    setStaffRole('');
    setIsStaffAdmin(false);
    setAssignedClinics([]);
    setModuleAccess({});
    setSessionExpiresAt(null);
    setStaffOtp('');
    setAuthStep('mobile');
  }

  function completeAppointment(id: number) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) return;
    setAppointments((items) =>
      items.map((item) => (item.id === id ? { ...item, status: 'Completed', waitMinutes: 0 } : item)),
    );
    toast.success(`${appointment.patient}'s appointment marked complete.`);
  }

  function callPatient(appointment: Appointment) {
    toast.success(`${appointment.token} · ${appointment.patient} called to consultation.`);
  }

  function openWalkIn() {
    setCategory('New');
    setIntakeMode('walk-in');
    setStatus('Checked in');
  }

  async function submitIntake() {
    const mobile = newPatientMobile.replace(/\D/g, '').slice(-10);
    if (!newPatient.trim() || !/^[6-9]\d{9}$/.test(mobile) || !newPatientDob || !newDoctor || !newService) {
      toast.error('Add the patient name, valid mobile number, date of birth, doctor and service.');
      return;
    }
    if (!selectedClinicId) {
      toast.error('Select an Eka Care clinic.');
      return;
    }
    const selectedSlot = intakeMode === 'booking'
      ? availableSlots.find((slot) => slot.s === newSlot)
      : ({
          available: true,
          conf_id: newService,
          s: new Date().toISOString(),
          e: new Date(Date.now() + 30 * 60_000).toISOString(),
          serviceType: 'consultation',
          serviceName: selectedEkaService?.name1,
          mode: ['in-clinic'],
        } satisfies EkaAppointmentSlot);
    if (!selectedSlot) {
      toast.error('Select an available Eka Care slot.');
      return;
    }

    setIsSubmittingIntake(true);
    try {
      const patientInput = {
        fullName: newPatient.trim(),
        mobile,
        gender: newPatientGender,
        dob: newPatientDob,
      };
      const patient = await findOrCreateEkaPatient(patientInput);
      const ekaAppointment = await bookEkaAppointment({
        doctorId: newDoctor,
        clinicId: selectedClinicId,
        patientId: patient.oid,
        patient: patientInput,
        slot: selectedSlot,
        mode: 'INCLINIC',
      });

    const nextNumber = appointments.length + 3;
    const slotTime =
      intakeMode === 'walk-in'
        ? 'Now'
        : new Date(selectedSlot.s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const createdAppointment: Appointment = {
      id: Number.parseInt(ekaAppointment.appointment_id.replace(/\D/g, '').slice(-8), 10) || Date.now(),
      token: `${intakeMode === 'walk-in' ? 'W' : 'A'}-${String(nextNumber).padStart(2, '0')}`,
      patient: newPatient.trim(),
      initials: newPatient
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(''),
      age: 0,
      gender: 'M',
      phone: 'Phone not added',
      time: slotTime,
      doctor: selectedEkaDoctor?.name1 || 'Eka Care doctor',
      specialty: selectedEkaDoctor?.specialty || 'Consultation',
      service: selectedEkaService?.name1 || 'Consultation',
      category: intakeMode === 'walk-in' ? 'New' : 'Booked',
      status: 'Checked in',
      payment: 'Pending',
      waitMinutes: 1,
    };
    setAppointments((items) => [createdAppointment, ...items]);
    setCategory(intakeMode === 'walk-in' ? 'New' : 'Booked');
    setStatus('Checked in');
    setNewPatient('');
    setNewPatientMobile('');
    setNewPatientDob('');
    setNewNotes('');
    toast.success(
      intakeMode === 'walk-in'
        ? `${createdAppointment.token} checked in and added to the queue.`
        : `${createdAppointment.patient}'s appointment has been booked.`,
    );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create the Eka Care appointment.');
    } finally {
      setIsSubmittingIntake(false);
    }
  }

  const checkedInCount = appointments.filter((item) => item.status === 'Checked in').length;
  const completedCount = appointments.filter((item) => item.status === 'Completed').length;
  const staffInitials = (staffName || 'Staff')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const staffFirstName = staffName.split(/\s+/)[0] || 'Team';

  if (isCheckingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f9fb]">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#fe065c]" />
          <p className="mt-3 text-sm font-medium text-slate-500">Checking staff access…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f9fb] px-4 py-10">
        <div className="w-full max-w-md">
          <DoctyLogo centered className="mx-auto mb-7" />
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 text-[#fe065c]">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Clinic Management</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in with your Eka Care staff mobile number. Your assigned clinics and doctors will load automatically.
            </p>

            {authStep === 'mobile' ? (
              <form className="mt-6 space-y-4" onSubmit={sendStaffOtp}>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff mobile number</span>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">+91</span>
                    <input
                      value={staffMobile}
                      onChange={(event) => setStaffMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter 10-digit mobile"
                      className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                </label>
                <Button type="submit" className="h-12 w-full rounded-xl" disabled={isSendingStaffOtp}>
                  {isSendingStaffOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                  Send WhatsApp OTP
                </Button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={verifyStaffOtp}>
                <div className="rounded-xl bg-sky-50 p-4 text-sm text-sky-800">
                  OTP sent to <strong>+91 ******{staffMobile.slice(-4)}</strong>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">WhatsApp OTP</span>
                  <input
                    value={staffOtp}
                    onChange={(event) => setStaffOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter OTP"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </label>
                <Button type="submit" className="h-12 w-full rounded-xl" disabled={isVerifyingStaffOtp}>
                  {isVerifyingStaffOtp && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify and continue
                </Button>
                <button
                  type="button"
                  className="w-full text-sm font-medium text-slate-500 hover:text-slate-800"
                  onClick={() => {
                    setAuthStep('mobile');
                    setStaffOtp('');
                  }}
                >
                  Change mobile number
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (moduleAccess.clinic_management === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f9fb] px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-9 w-9 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Clinic Management access required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ask an administrator to enable Clinic Management for {staffName || `+91 ${staffMobile}`}.
          </p>
          <Button variant="outline" className="mt-5 rounded-xl" onClick={() => void logout()}>Sign out</Button>
        </div>
      </div>
    );
  }

  if (!isStaffAdmin && !clinicsLoading && !ekaClinics.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f9fb] px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto h-9 w-9 text-slate-400" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">No clinic assigned</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your Eka Care staff profile does not have a Docty clinic assignment. Ask an Eka administrator to assign a clinic.
          </p>
          <Button variant="outline" className="mt-5 rounded-xl" onClick={() => void logout()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fb] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-20 items-center gap-5 px-5 lg:px-8">
          <DoctyLogo size="sm" showText={false} className="shrink-0" />

          <div className="hidden h-8 w-px bg-slate-200 lg:block" />
          <div className="hidden lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Clinic Management
            </p>
            <button
              type="button"
              className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-slate-700"
              onClick={() => {
                const currentIndex = ekaClinics.findIndex((item) => item.id === selectedClinicId);
                const nextClinic = ekaClinics[(currentIndex + 1) % Math.max(ekaClinics.length, 1)];
                if (nextClinic) setSelectedClinicId(nextClinic.id);
              }}
            >
              {clinic} Clinic <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              placeholder="Search patient, speciality or service..."
              aria-label="Search patient, speciality or service"
            />
          </div>

          <button
            type="button"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#fe065c]" />
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            <Avatar initials={staffInitials} tone="pink" />
            <div className="hidden xl:block">
              <p className="text-sm font-semibold text-slate-800">{staffName || `+91 ${staffMobile}`}</p>
              <p className="text-xs text-slate-400">{staffRole || 'Clinic Staff'}</p>
            </div>
          </div>
          <button
            type="button"
            className="hidden text-slate-400 hover:text-slate-700 xl:block"
            aria-label="Sign out"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="px-4 py-5 lg:px-7">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Saturday, 18 July 2026
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Good morning, {staffFirstName}</h1>
            <p className="mt-1 text-sm text-slate-500">Here’s today’s patient flow at {clinic}.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 md:flex">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600">
                <UsersRound className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Today</p>
                <p className="text-sm font-bold text-slate-800">{appointments.length} appointments</p>
              </div>
            </div>
            <Button className="h-11 rounded-xl bg-[#fe065c] px-5 shadow-sm shadow-pink-200 hover:bg-[#e61663]" onClick={openWalkIn}>
              <Plus className="h-4 w-4" /> Add walk-in
            </Button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {categories.map((item) => {
            const active = category === item;
            return (
              <button
                type="button"
                key={item}
                onClick={() => setCategory(item)}
                className={`flex min-h-20 items-center justify-between rounded-xl border px-4 text-left transition ${
                  active
                    ? 'border-[#fe065c] bg-[#fe065c] text-white shadow-md shadow-pink-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>
                  <span className={`block text-xs font-medium ${active ? 'text-white/75' : 'text-slate-400'}`}>
                    Appointment type
                  </span>
                  <span className="mt-1 block text-sm font-semibold">{item}</span>
                </span>
                <span
                  className={`grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-bold ${
                    active ? 'bg-white/18 text-white' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  {counts[item]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,30fr)_minmax(0,70fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                  <h2 className="text-base font-bold text-slate-900">Queue Management</h2>
                </div>
                <p className="mt-1 pl-[18px] text-xs text-slate-400">{queue.length} patients waiting</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-slate-200 text-xs"
                disabled={!queue.length}
                onClick={() => queue[0] && callPatient(queue[0])}
              >
                Call next
              </Button>
            </div>

            <div className="max-h-[590px] overflow-y-auto p-3">
              {queue.map((appointment, index) => (
                <article
                  key={appointment.id}
                  className={`mb-2 rounded-xl border p-3.5 transition ${
                    index === 0 ? 'border-sky-200 bg-sky-50/60' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                        index === 0 ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {appointment.token}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="truncate text-sm font-semibold text-slate-900">{appointment.patient}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-400">{appointment.doctor}</p>
                        </div>
                        <button type="button" className="text-slate-300 hover:text-slate-600" aria-label={`More actions for ${appointment.patient}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                          <Clock3 className="h-3 w-3" />
                          Waiting {appointment.waitMinutes} min
                        </span>
                        {index === 0 ? (
                          <button
                            type="button"
                            onClick={() => callPatient(appointment)}
                            className="rounded-md bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-600"
                          >
                            Call patient
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">#{index + 1} in queue</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {!queue.length && (
                <div className="grid min-h-48 place-items-center text-center">
                  <div>
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Queue is clear</p>
                    <p className="mt-1 text-xs text-slate-400">No checked-in patients match this search.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {category === 'New' ? 'New Appointment' : 'Appointments'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {category === 'New'
                    ? 'Book a scheduled visit or check in a walk-in patient'
                    : `${category} · ${filteredAppointments.length} shown`}
                </p>
              </div>
              {category !== 'New' && <div className="flex rounded-xl bg-slate-100 p-1">
                {(['Checked in', 'Completed'] as AppointmentStatus[]).map((item) => {
                  const active = status === item;
                  const count = item === 'Checked in' ? checkedInCount : completedCount;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setStatus(item)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition md:flex-none ${
                        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {item}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? 'bg-sky-50 text-sky-600' : 'bg-slate-200 text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>}
            </div>

            {category !== 'New' && <div className="hidden grid-cols-[minmax(210px,1.4fr)_minmax(170px,1fr)_minmax(130px,.8fr)_100px_88px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:grid">
              <span>Patient</span>
              <span>Appointment</span>
              <span>Doctor</span>
              <span>Payment</span>
              <span className="text-right">Action</span>
            </div>}

            <div className="min-h-[390px]">
              {category === 'New' ? (
                <div className="p-5 lg:p-6">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIntakeMode('booking')}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        intakeMode === 'booking'
                          ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        intakeMode === 'booking' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">Appointment Booking</span>
                        <span className="mt-0.5 hidden text-xs text-slate-400 sm:block">Select a future or available slot</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntakeMode('walk-in')}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        intakeMode === 'walk-in'
                          ? 'border-[#fe065c] bg-pink-50 ring-2 ring-pink-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                        intakeMode === 'walk-in' ? 'bg-[#fe065c] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <UserRound className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">Walk-in</span>
                        <span className="mt-0.5 hidden text-xs text-slate-400 sm:block">Check in and add to queue now</span>
                      </span>
                    </button>
                  </div>

                  <div className="mx-auto mt-6 max-w-2xl space-y-3">
                    <label className="grid items-center gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400" /> Clinic
                      </span>
                      <select
                        value={selectedClinicId}
                        onChange={(event) => setSelectedClinicId(event.target.value)}
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="">{clinicsLoading ? 'Loading Eka Care clinics…' : 'Select clinic'}</option>
                        {ekaClinics.map((item) => (
                          <option key={item.id} value={item.id}>{item.name1}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid items-center gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Stethoscope className="h-4 w-4 text-slate-400" /> Doctor
                      </span>
                      <select
                        value={newDoctor}
                        onChange={(event) => setNewDoctor(event.target.value)}
                        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="">{doctorsLoading ? 'Loading Eka Care doctors…' : 'Select doctor'}</option>
                        {clinicDoctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name1}{doctor.specialty ? ` · ${doctor.specialty}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid items-center gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Clock3 className="h-4 w-4 text-slate-400" /> Slot
                      </span>
                      {intakeMode === 'walk-in' ? (
                        <span className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700">
                          Now · In Clinic
                        </span>
                      ) : (
                        <select
                          value={newSlot}
                          onChange={(event) => setNewSlot(event.target.value)}
                          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        >
                          <option value="">
                            {slotsLoading ? 'Loading Eka Care slots…' : 'Select available slot'}
                          </option>
                          {availableSlots.map((slot) => (
                            <option key={`${slot.s}-${slot.conf_id}`} value={slot.s}>
                              {new Date(slot.s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              {slot.serviceName ? ` · ${slot.serviceName}` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    <label className="grid items-center gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <UserRound className="h-4 w-4 text-slate-400" /> Patient
                      </span>
                      <span className="relative">
                        <input
                          value={newPatient}
                          onChange={(event) => setNewPatient(event.target.value)}
                          placeholder="Search or add patient"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />
                        <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                      </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="hidden sm:block" />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <input
                          value={newPatientMobile}
                          onChange={(event) => setNewPatientMobile(event.target.value)}
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="Mobile number"
                          aria-label="Patient mobile number"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />
                        <input
                          type="date"
                          value={newPatientDob}
                          onChange={(event) => setNewPatientDob(event.target.value)}
                          max={todayKey}
                          aria-label="Patient date of birth"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        />
                        <select
                          value={newPatientGender}
                          onChange={(event) => setNewPatientGender(event.target.value as 'M' | 'F' | 'O')}
                          aria-label="Patient gender"
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      </div>
                    </div>

                    <label className="grid items-center gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Stethoscope className="h-4 w-4 text-slate-400" /> Service
                      </span>
                      <span className="relative">
                        <select
                          value={newService}
                          onChange={(event) => setNewService(event.target.value)}
                          className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        >
                          <option value="">{servicesLoading ? 'Loading Eka Care services…' : 'Select service'}</option>
                          {ekaServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name1}{typeof service.price === 'number' ? ` · ₹${service.price}` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                      </span>
                    </label>

                    <label className="grid items-start gap-3 sm:grid-cols-[125px_1fr]">
                      <span className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                        <FileText className="h-4 w-4 text-slate-400" /> Notes
                      </span>
                      <textarea
                        value={newNotes}
                        onChange={(event) => setNewNotes(event.target.value)}
                        placeholder="Add notes (optional)"
                        rows={2}
                        className="resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </label>
                  </div>

                  <div className="mx-auto mt-6 max-w-2xl border-t border-slate-100 pt-5">
                    <Button
                      className={`h-12 w-full rounded-xl text-sm shadow-sm ${
                        intakeMode === 'walk-in'
                          ? 'bg-[#fe065c] shadow-pink-100 hover:bg-[#e61663]'
                          : 'bg-sky-500 shadow-sky-100 hover:bg-sky-600'
                      }`}
                      disabled={
                        isSubmittingIntake ||
                        !newPatient.trim() ||
                        !newPatientMobile.trim() ||
                        !newPatientDob ||
                        !newDoctor ||
                        !newService ||
                        (intakeMode === 'booking' && !newSlot)
                      }
                      onClick={() => void submitIntake()}
                    >
                      {isSubmittingIntake ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving to Eka Care…</>
                      ) : intakeMode === 'walk-in' ? (
                        <><UserRound className="h-4 w-4" /> Check in & add to queue</>
                      ) : (
                        <><CalendarDays className="h-4 w-4" /> Book appointment</>
                      )}
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      {intakeMode === 'walk-in'
                        ? 'A queue token will be generated automatically.'
                        : 'The appointment will appear under Booked.'}
                    </p>
                  </div>
                </div>
              ) : filteredAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="grid gap-4 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50/60 md:grid-cols-[minmax(210px,1.4fr)_minmax(170px,1fr)_minmax(130px,.8fr)_100px_88px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar initials={appointment.initials} tone={appointment.gender === 'F' ? 'pink' : 'blue'} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{appointment.patient}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {appointment.gender} · {appointment.age || '—'} yrs · {appointment.phone}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                      {appointment.time}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">{appointment.service}</p>
                  </div>

                  <div>
                    <p className="truncate text-sm font-medium text-slate-700">{appointment.doctor}</p>
                    <p className="mt-1 truncate text-xs text-sky-600">{appointment.specialty}</p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                        appointment.payment === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {appointment.payment === 'Paid' && <Check className="h-3 w-3" />}
                      {appointment.payment}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    {appointment.status === 'Checked in' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-slate-200 text-[11px]"
                        onClick={() => completeAppointment(appointment.id)}
                      >
                        Complete
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Done
                      </span>
                    )}
                  </div>
                </article>
              ))}

              {category !== 'New' && !filteredAppointments.length && (
                <div className="grid min-h-[390px] place-items-center px-6 text-center">
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                      {query ? <Search className="h-5 w-5" /> : status === 'Completed' ? <CheckCircle2 className="h-5 w-5" /> : <Stethoscope className="h-5 w-5" />}
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-700">No appointments found</p>
                    <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                      {query
                        ? 'Try another patient, speciality, doctor or service.'
                        : `There are no ${status.toLowerCase()} ${category.toLowerCase()} appointments yet.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-400">
              <span>{category === 'New' ? 'New patient intake' : `Showing ${filteredAppointments.length} appointments`}</span>
              <span className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                Updated just now
              </span>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
