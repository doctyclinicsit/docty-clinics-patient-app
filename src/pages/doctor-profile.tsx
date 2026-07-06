import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { addDays, format, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleCheckBig,
  Clock,
  GraduationCap,
  IndianRupee,
  Languages,
  Navigation,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Video,
  WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDoctor } from '@/generated/hooks/use-doctor';
import { useLocation } from '@/generated/hooks/use-location';
import {
  bookEkaAppointment,
  DEFAULT_CONSULTATION_FEE,
  findOrCreateEkaPatient,
  getEkaAppointmentSlots,
  getEkaDoctorServices,
  type EkaAppointmentSlot,
} from '@/lib/eka-api';
import { cn } from '@/lib/utils';
import { usePatientSession } from '@/lib/patient-session-context';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
} as const;

const generateDates = () => Array.from({ length: 7 }, (_, index) => addDays(new Date(), index));

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function splitList(value?: string) {
  const items = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];
  return [
    ...new Map(
      items.map((item) => [item.toLocaleLowerCase(), item] as const)
    ).values(),
  ];
}

function formatSlotTime(slot: EkaAppointmentSlot) {
  return format(parseISO(slot.s), 'h:mm a');
}

function ageToDob(age: number) {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - Math.floor(age));
  return format(dob, 'yyyy-MM-dd');
}

const clinicModes = ['in-clinic', 'in_clinic', 'inclinic', 'inclinc', 'clinic'];
const videoModes = ['tele', 'video', 'online', 'teleconsultation'];

function slotSupportsMode(slot: EkaAppointmentSlot, mode: 'clinic' | 'video') {
  if (!slot.mode?.length) return true;
  const normalizedModes = slot.mode.map((item) => item.trim().toLowerCase());
  const acceptedModes = mode === 'clinic' ? clinicModes : videoModes;
  return normalizedModes.some((item) => acceptedModes.includes(item));
}

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doctor, isLoading } = useDoctor(id || '');
  const { data: liveDoctorServices = [] } = useQuery({
    queryKey: ['eka-doctor-services', id],
    queryFn: () => getEkaDoctorServices(id || ''),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
  const { activeProfile, profiles, selectProfile } = usePatientSession();

  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<EkaAppointmentSlot | null>(null);
  const [consultationType, setConsultationType] = useState<'clinic' | 'video'>('clinic');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'M' | 'F' | 'O'>('M');
  const [patientEmail, setPatientEmail] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [hasAcceptedBookingConsent, setHasAcceptedBookingConsent] = useState(false);
  const [isSwitchingPatient, setIsSwitchingPatient] = useState(false);
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState('');

  const dates = useMemo(generateDates, []);
  const languages = splitList(doctor?.languages);
  const specialisations = splitList(doctor?.specialty);
  const qualifications = splitList(doctor?.qualifications);
  const doctorClinics = useMemo(() => {
    const clinics = doctor?.locations?.length ? doctor.locations : doctor?.location ? [doctor.location] : [];
    const seen = new Set<string>();

    return clinics.filter((clinic) => {
      if (!clinic.id || seen.has(clinic.id)) return false;
      seen.add(clinic.id);
      return true;
    });
  }, [doctor?.location, doctor?.locations]);
  const clinicId = selectedClinicId || doctorClinics[0]?.id;
  const { data: location } = useLocation(clinicId || '');
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const {
    data: slots = [],
    isLoading: slotsLoading,
    isError: slotsError,
  } = useQuery({
    queryKey: ['eka-appointment-slots', id, clinicId, selectedDateKey],
    queryFn: () => getEkaAppointmentSlots(id || '', clinicId || '', selectedDateKey, selectedDateKey),
    enabled: !!id && !!clinicId,
  });
  const futureSlots = useMemo(
    () =>
      slots.filter(
        (slot) =>
          parseISO(slot.s).getTime() > Date.now() &&
          slot.available
      ),
    [slots]
  );
  const hasClinicSlots = futureSlots.some((slot) => slotSupportsMode(slot, 'clinic'));
  const hasVideoSlots = futureSlots.some((slot) => slotSupportsMode(slot, 'video'));

  useEffect(() => {
    if (slotsLoading || slotsError) return;
    if (consultationType === 'clinic' && !hasClinicSlots && hasVideoSlots) {
      setConsultationType('video');
      setSelectedSlot(null);
    } else if (consultationType === 'video' && !hasVideoSlots && hasClinicSlots) {
      setConsultationType('clinic');
      setSelectedSlot(null);
    }
  }, [consultationType, hasClinicSlots, hasVideoSlots, slotsError, slotsLoading]);

  const filteredSlots = useMemo(() => {
    const matchingSlots = futureSlots.filter((slot) =>
      slotSupportsMode(slot, consultationType)
    );
    const slotsByTime = new Map<string, EkaAppointmentSlot>();

    matchingSlots.forEach((slot) => {
      const current = slotsByTime.get(slot.s);
      const isConsultation = slot.serviceType?.trim().toLowerCase() === 'consultation';
      const currentIsConsultation = current?.serviceType?.trim().toLowerCase() === 'consultation';

      if (
        !current ||
        (slot.available && !current.available) ||
        (isConsultation && !currentIsConsultation)
      ) {
        slotsByTime.set(slot.s, slot);
      }
    });

    return [...slotsByTime.values()].sort(
      (first, second) => parseISO(first.s).getTime() - parseISO(second.s).getTime()
    );
  }, [consultationType, futureSlots]);
  const alternativeModeHasSlots =
    consultationType === 'clinic' ? hasVideoSlots : hasClinicSlots;
  const shouldRequestAppointment =
    !slotsLoading &&
    !slotsError &&
    filteredSlots.length === 0 &&
    !alternativeModeHasSlots;

  useEffect(() => {
    if (!selectedClinicId && doctorClinics[0]?.id) {
      setSelectedClinicId(doctorClinics[0].id);
    }
  }, [doctorClinics, selectedClinicId]);

  const handleBookAppointment = async () => {
    if (!selectedSlot && !shouldRequestAppointment) {
      toast.error('Please select a time slot');
      return;
    }
    if (!activeProfile && !patientName.trim()) {
      toast.error('Please enter patient name');
      return;
    }
    if (!activeProfile && !/^[0-9]{10}$/.test(patientPhone.replace(/\D/g, '').slice(-10))) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    const age = Number(patientAge);
    if (!activeProfile && (!Number.isFinite(age) || age <= 0 || age > 120)) {
      toast.error('Please enter a valid patient age');
      return;
    }
    if (activeProfile && (!activeProfile.mobile || !activeProfile.dob)) {
      toast.error('The selected patient profile is missing a mobile number or date of birth.');
      return;
    }
    if (!id || !clinicId) {
      toast.error('Doctor or clinic details are missing');
      return;
    }

    setIsBooking(true);
    try {
      const patient = {
        fullName: activeProfile?.name || patientName.trim(),
        mobile: activeProfile?.mobile || patientPhone.trim(),
        gender: (activeProfile?.gender || patientGender) as 'M' | 'F' | 'O',
        dob: activeProfile?.dob || ageToDob(age),
        email: activeProfile ? undefined : patientEmail.trim() || undefined,
      };
      if (shouldRequestAppointment) {
        const leadResponse = await fetch('/api/appointment-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'Doctor Profile - No Slots Available',
            patient: {
              id: activeProfile?.id || null,
              name: patient.fullName,
              mobile: patient.mobile.replace(/\D/g, '').slice(-10),
              gender: patient.gender,
              dob: patient.dob,
              email: patient.email || null,
              relationship: activeProfile?.relation || null,
            },
            doctor: {
              id,
              name: doctor?.name1,
              specialty: doctor?.specialty || null,
            },
            clinic: {
              id: clinicId,
              name: location?.name1 || doctorClinics.find((clinic) => clinic.id === clinicId)?.name1,
            },
            requestedDate: selectedDateKey,
            consultationMode: consultationType === 'clinic' ? 'INCLINIC' : 'VIDEO',
            consultationFee: doctor?.consultationFee || DEFAULT_CONSULTATION_FEE,
            requestedAt: new Date().toISOString(),
          }),
        });
        const leadBody = await leadResponse.json().catch(() => null);
        if (!leadResponse.ok) {
          throw new Error(leadBody?.message || 'Unable to submit appointment request.');
        }

        toast.success('Appointment request submitted. Our team will contact you.');
        return;
      }

      const patientId = activeProfile
        ? activeProfile.id
        : (await findOrCreateEkaPatient(patient)).oid;
      const appointment = await bookEkaAppointment({
        doctorId: id,
        clinicId,
        patientId,
        patient,
        slot: selectedSlot,
        mode: consultationType === 'clinic' ? 'INCLINIC' : 'VIDEO',
      });

      setConfirmedAppointmentId(appointment.appointment_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-2">Doctor Not Found</h1>
        <p className="text-muted-foreground mb-6">The doctor profile you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/book-appointment')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Doctors
        </Button>
      </div>
    );
  }

  const selectedClinicName =
    location?.name1 ||
    doctorClinics.find((clinic) => clinic.id === clinicId)?.name1 ||
    doctor.location?.name1 ||
    'Docty Clinics';
  const selectedClinicProfile = doctor.clinicProfiles?.find((clinic) => clinic.id === clinicId);
  const clinicAddress =
    location?.address ||
    selectedClinicProfile?.address ||
    selectedClinicName ||
    'Clinic address will be shared after confirmation';
  const clinicPhone = location?.phone || selectedClinicProfile?.phone || '99898 04888';
  const clinicServices = [
    ...new Map(
      [
        ...(selectedClinicProfile?.services || []),
        ...(doctor.doctorServices || []),
        ...liveDoctorServices.map((service) => service.name1),
      ]
        .map((service) => service.trim())
        .filter(Boolean)
        .map((service) => [service.toLocaleLowerCase(), service] as const)
    ).values(),
  ];
  const clinicAmenities = selectedClinicProfile?.amenities?.filter(Boolean) || [];
  const clinicTimings = selectedClinicProfile?.timings?.filter(Boolean) || [];
  const clinicImages = selectedClinicProfile?.imageUrls?.filter(Boolean) || [];
  const directionsUrl =
    typeof location?.lat === 'number' && typeof location?.lon === 'number'
      ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicAddress)}`;

  return (
    <div className="flex flex-col">
      <section className="pt-32 pb-12 bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(254,6,92,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(11,184,252,0.06),transparent_50%)]" />

        <div className="container mx-auto px-4 relative">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 rounded-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-3xl"
          >
            <Badge variant="secondary" className="mb-4">
              <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />
              {doctor.isAvailable ? 'Available for Appointments' : 'Availability Limited'}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Book with <span style={{ color: '#FE065C' }}>{doctor.name1}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              {doctor.specialty} at {selectedClinicName}
            </p>
          </motion.div>
        </div>
      </section>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 py-12"
      >
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-2 border-transparent shadow-sm">
                <CardContent className="p-0">
                  <div className="bg-background">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                      <Avatar className="h-28 w-28 md:h-36 md:w-36 rounded-2xl border-4 border-background shadow-md">
                        <AvatarImage src={doctor.imageURL || ''} alt={doctor.name1} className="object-cover" />
                        <AvatarFallback className="rounded-2xl bg-primary text-3xl font-bold text-primary-foreground">
                          {getInitials(doctor.name1)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className="mb-3">
                          <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          {doctor.isAvailable ? 'Available for appointments' : 'Availability limited'}
                        </Badge>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                          {doctor.name1}
                        </h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                          {doctor.intro || `${doctor.specialty} in ${location?.area || selectedClinicName || 'Hyderabad, India'}`}
                        </p>

                        <div className="mt-5 grid sm:grid-cols-3 gap-3">
                          <div className="rounded-lg border bg-muted/40 p-3 min-h-[86px]">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Stethoscope className="h-4 w-4 text-primary" />
                              Experience
                            </div>
                            <p className="mt-1 font-semibold">
                              {doctor.experienceYears > 0 ? `${doctor.experienceYears}+ years` : 'Not specified'}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-muted/40 p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <IndianRupee className="h-4 w-4 text-accent" />
                              Consultation
                            </div>
                            <p className="mt-1 font-semibold">INR {doctor.consultationFee || DEFAULT_CONSULTATION_FEE}</p>
                          </div>
                          <div className="rounded-lg border bg-muted/40 p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building2 className="h-4 w-4 text-primary" />
                              {doctorClinics.length > 1 ? `${doctorClinics.length} Clinics` : 'Clinic'}
                            </div>
                            {doctorClinics.length > 1 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {doctorClinics.map((clinic) => (
                                  <button
                                    key={clinic.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClinicId(clinic.id);
                                      setSelectedSlot(null);
                                    }}
                                    className={cn(
                                      'max-w-full rounded-full border px-2.5 py-1 text-xs font-medium leading-none transition-colors',
                                      clinic.id === clinicId
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-background text-foreground hover:border-primary/50'
                                    )}
                                    title={clinic.name1}
                                  >
                                    <span className="block max-w-[150px] truncate">{clinic.name1.replace('Docty Clinics ', '')}</span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1 font-semibold truncate">{selectedClinicName}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t bg-gradient-to-r from-primary/5 via-background to-accent/5 px-6 md:px-8 py-4 grid sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">In-clinic visits</p>
                          <p className="text-sm text-muted-foreground">Available at selected clinic</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Video className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">Tele consultation</p>
                          <p className="text-sm text-muted-foreground">Subject to doctor availability</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
              <Card className="h-full border-2 border-transparent hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Languages className="h-5 w-5 text-primary" />
                    Languages
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {languages.length > 0 ? (
                      languages.map((language) => (
                        <Badge key={language} variant="secondary" className="px-3 py-1">
                          {language}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full border-2 border-transparent hover:border-accent/30 transition-colors">
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" />
                    Specialisations
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {specialisations.map((specialisation) => (
                      <Badge key={specialisation} variant="outline" className="px-3 py-1">
                        {specialisation}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-2 border-transparent hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    About Doctor
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {doctor.bio || `${doctor.name1} is a ${doctor.specialty} practicing at Docty Clinics.`}
                  </p>
                  {(doctor.registrationNumber || doctor.registrationCouncil) && (
                    <div className="mt-5 rounded-lg border bg-muted/40 p-4">
                      <p className="text-sm font-medium">Medical Registration</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[doctor.registrationNumber, doctor.registrationCouncil].filter(Boolean).join(' | ')}
                      </p>
                    </div>
                  )}
                  {qualifications.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {qualifications.map((qualification) => (
                        <Badge key={qualification} variant="secondary" className="px-3 py-1.5">
                          {qualification}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-2 border-transparent hover:border-accent/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4 md:justify-between mb-5">
                    <div>
                      <h2 className="font-bold text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-accent" />
                        Clinic
                      </h2>
                      {doctorClinics.length > 1 ? (
                        <div className="mt-3 max-w-sm">
                          <Select
                            value={clinicId}
                            onValueChange={(value) => {
                              setSelectedClinicId(value);
                              setSelectedSlot(null);
                            }}
                          >
                            <SelectTrigger className="h-11">
                              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                              <SelectValue placeholder="Select Clinic" />
                            </SelectTrigger>
                            <SelectContent>
                              {doctorClinics.map((clinic) => (
                                <SelectItem key={clinic.id} value={clinic.id}>
                                  {clinic.name1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className="mt-1 font-semibold">{selectedClinicName}</p>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{clinicAddress}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="rounded-full">
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Navigation className="mr-2 h-4 w-4" />
                          Directions
                        </a>
                      </Button>
                      <Button asChild className="rounded-full">
                        <a href={`tel:${clinicPhone}`}>
                          <Phone className="mr-2 h-4 w-4" />
                          Call
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {[
                      { icon: WalletCards, title: 'Payment Modes', value: 'Cash, Cards, UPI' },
                      { icon: Clock, title: 'Timings', value: clinicTimings.length ? clinicTimings.slice(0, 2).join(', ') : 'Walk-in supported' },
                      { icon: CheckCircle2, title: 'Amenities', value: clinicAmenities.length ? clinicAmenities.slice(0, 3).join(', ') : 'Restroom, accessible entry' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="rounded-lg bg-muted/50 p-4">
                          <Icon className="h-5 w-5 text-primary mb-2" />
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {clinicServices.length > 0 && (
                    <div className="mt-5">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Services at this clinic
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {clinicServices.map((service) => (
                          <Badge key={service} variant="secondary" className="px-3 py-1">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {clinicImages.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {clinicImages.slice(0, 4).map((imageUrl) => (
                        <div key={imageUrl} className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                          <img
                            src={imageUrl}
                            alt={`${selectedClinicName} clinic`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.aside variants={itemVariants} className="lg:sticky lg:top-24">
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-1">
                  {shouldRequestAppointment ? 'Request Appointment' : 'Book Appointment'}
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {shouldRequestAppointment
                    ? 'No slots are available for this date. Send a request and our team will contact you.'
                    : 'Choose your consultation type and preferred slot.'}
                </p>

                {doctorClinics.length > 1 && (
                  <div className="mb-5 space-y-2">
                    <Label>Clinic</Label>
                    <Select
                      value={clinicId}
                      onValueChange={(value) => {
                        setSelectedClinicId(value);
                        setSelectedSlot(null);
                      }}
                    >
                      <SelectTrigger>
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Select Clinic" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctorClinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Tabs value={consultationType} onValueChange={(value) => setConsultationType(value as 'clinic' | 'video')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="clinic" className="gap-2" disabled={!slotsLoading && !hasClinicSlots}>
                      <Building2 className="h-4 w-4" />
                      Clinic
                    </TabsTrigger>
                    <TabsTrigger value="video" className="gap-2" disabled={!slotsLoading && !hasVideoSlots}>
                      <Video className="h-4 w-4" />
                      Video
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Select Date
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {dates.slice(0, 4).map((date) => {
                      const selected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedSlot(null);
                          }}
                          className={cn(
                            'rounded-lg border p-3 text-center transition-colors',
                            selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary/50'
                          )}
                        >
                          <span className={cn('block text-xs', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                            {format(date, 'EEE')}
                          </span>
                          <span className="block text-lg font-bold">{format(date, 'd')}</span>
                          <span className={cn('block text-xs', selected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                            {format(date, 'MMM')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    Available Slots
                  </h3>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slotsLoading ? (
                      <div className="col-span-3 rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                        Loading slots...
                      </div>
                    ) : slotsError ? (
                      <div className="col-span-3 rounded-lg bg-destructive/10 px-3 py-6 text-center text-sm text-destructive">
                        Unable to load slots
                      </div>
                    ) : filteredSlots.length === 0 && alternativeModeHasSlots ? (
                      <div className="col-span-3 rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                        Switching to the available consultation mode...
                      </div>
                    ) : filteredSlots.length === 0 ? (
                      <div className="col-span-3 rounded-lg bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
                        No slots available
                      </div>
                    ) : (
                      filteredSlots.map((slot) => (
                        <button
                          key={`${slot.s}-${slot.conf_id}`}
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            !slot.available && 'cursor-not-allowed bg-muted text-muted-foreground line-through opacity-50',
                            slot.available && selectedSlot?.s !== slot.s && 'border bg-background hover:border-primary/50',
                            selectedSlot?.s === slot.s && 'bg-primary text-primary-foreground'
                          )}
                        >
                          {formatSlotTime(slot)}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {activeProfile ? (
                  <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Booking for</p>
                        <Select
                          value={activeProfile.id}
                          disabled={isSwitchingPatient}
                          onValueChange={async (profileId) => {
                            setIsSwitchingPatient(true);
                            try {
                              await selectProfile(profileId);
                              toast.success('Patient changed');
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Unable to switch patient profile.'
                              );
                            } finally {
                              setIsSwitchingPatient(false);
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1 h-auto border-0 bg-transparent p-0 text-left text-base font-bold shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                <span className="font-medium">{profile.name}</span>
                                {profile.relation && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {profile.relation}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-sm font-semibold">Patient Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="patient-name">Full Name</Label>
                    <Input
                      id="patient-name"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      placeholder="Enter patient full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient-phone">Mobile Number</Label>
                    <Input
                      id="patient-phone"
                      value={patientPhone}
                      onChange={(event) => setPatientPhone(event.target.value)}
                      placeholder="10-digit mobile number"
                      type="tel"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="patient-age">Age</Label>
                      <Input
                        id="patient-age"
                        value={patientAge}
                        onChange={(event) => setPatientAge(event.target.value.replace(/\D/g, '').slice(0, 3))}
                        inputMode="numeric"
                        min={1}
                        max={120}
                        placeholder="Years"
                        type="number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={patientGender} onValueChange={(value) => setPatientGender(value as 'M' | 'F' | 'O')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patient-email">Email</Label>
                    <Input
                      id="patient-email"
                      value={patientEmail}
                      onChange={(event) => setPatientEmail(event.target.value)}
                      placeholder="Optional"
                      type="email"
                    />
                  </div>
                  </div>
                )}

                <div className="mt-6 rounded-xl bg-muted/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Consultation Fee</span>
                    <span className="font-bold">INR {doctor.consultationFee || DEFAULT_CONSULTATION_FEE}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mode</span>
                    <span className="font-medium capitalize">{consultationType === 'clinic' ? 'In-clinic' : 'Video'}</span>
                  </div>
                  {selectedSlot && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm text-muted-foreground">Selected</span>
                      <span className="font-medium">{format(parseISO(selectedSlot.s), 'MMM d')} at {formatSlotTime(selectedSlot)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <Checkbox
                    id="appointment-consent"
                    checked={hasAcceptedBookingConsent}
                    onCheckedChange={(checked) => setHasAcceptedBookingConsent(checked === true)}
                  />
                  <Label htmlFor="appointment-consent" className="block text-xs font-normal leading-5 text-muted-foreground">
                    I consent to sharing the selected patient’s details with the clinic and doctor for this appointment, and agree to the{' '}
                    <Link to="/consent-notice" className="font-semibold text-primary">Consent Notice</Link>
                    {' '}and{' '}
                    <Link to="/terms" className="font-semibold text-primary">Terms of Use</Link>.
                  </Label>
                </div>

                <Button
                  onClick={handleBookAppointment}
                  disabled={
                    (!selectedSlot && !shouldRequestAppointment) ||
                    isBooking ||
                    !hasAcceptedBookingConsent
                  }
                  className="mt-5 w-full h-12 rounded-full text-base font-semibold"
                >
                  {isBooking
                    ? shouldRequestAppointment
                      ? 'Submitting Request...'
                      : 'Booking...'
                    : shouldRequestAppointment
                      ? 'Request Appointment'
                      : 'Book Appointment'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>

                <Button asChild variant="outline" className="mt-3 w-full rounded-full sm:hidden">
                  <a href={`tel:${clinicPhone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Clinic
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </motion.main>

      <Dialog
        open={Boolean(confirmedAppointmentId)}
        onOpenChange={(open) => !open && setConfirmedAppointmentId('')}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3 pr-8 text-left">
              <CircleCheckBig className="mt-0.5 h-8 w-8 flex-shrink-0 text-emerald-600" />
              <div>
                <span className="block text-xl font-bold">Appointment booked successfully</span>
                <span className="mt-1 block break-all text-sm font-normal text-muted-foreground">
                  Booking ID: {confirmedAppointmentId}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Doctor</dt>
                <dd className="text-right font-semibold">{doctor.name1}</dd>

                <dt className="text-muted-foreground">Clinic</dt>
                <dd className="text-right font-semibold">{selectedClinicName}</dd>

                <dt className="text-muted-foreground">Appointment</dt>
                <dd className="text-right font-semibold">
                  {selectedSlot
                    ? `${format(parseISO(selectedSlot.s), 'dd MMM yyyy, h:mm a')}`
                    : format(selectedDate, 'dd MMM yyyy')}
                </dd>

                <dt className="text-muted-foreground">Mode</dt>
                <dd className="text-right font-semibold">
                  {consultationType === 'clinic' ? 'In-Clinic' : 'Video Consultation'}
                </dd>
              </dl>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-semibold">{selectedClinicName}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{clinicAddress}</p>
                  <a
                    href={`tel:${clinicPhone.replace(/\s/g, '')}`}
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {clinicPhone}
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline">
                <a href={`tel:${clinicPhone.replace(/\s/g, '')}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Clinic
                </a>
              </Button>
              <Button asChild>
                <a href={directionsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="mr-2 h-4 w-4" />
                  Directions
                </a>
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setConfirmedAppointmentId('')}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
