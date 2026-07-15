import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Stethoscope,
  Pill,
  Microscope,
  Smile,
  Activity,
  Users,
  Heart,
  Clock,
  Building2,
  BadgeCheck,
  ArrowRight,
  Phone,
  ChevronRight,
  MapPin,
  Shield,
  FileText,
  Home,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Layers3,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { useServiceList } from '@/generated/hooks/use-service';
import { useLocationList } from '@/generated/hooks/use-location';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import type { Doctor } from '@/generated/models/doctor-model';
import { featuredHealthPackages, type HealthPackage } from '@/data/health-packages';
import {
  totalCareBenefits,
  totalCareMaxAnnualSavings,
  totalCarePlans,
  totalCareStartingPrice,
} from '@/data/health-plans';
import { getEkaDoctorNextAvailability, getEkaPublicDoctorExperience } from '@/lib/eka-api';
import type { Service } from '@/generated/models/service-model';
import { usePatientSession } from '@/lib/patient-session-context';
import { uniqueServices } from '@/lib/service-utils';
import { ServiceIcon } from '@/components/service-icon';
import { submitClinicLead, type ClinicLeadService } from '@/lib/clinic-leads';
import {
  groupServicesByCategory,
  serviceCategories,
} from '@/lib/service-categories';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

const fallbackServices: Service[] = [
  { id: 'primary-care', name1: 'Primary Care', available247: true, displayOrder: 1, iconName: 'stethoscope' },
  { id: 'pharmacy', name1: 'Pharmacy', available247: true, displayOrder: 2, iconName: 'pill' },
  { id: 'diagnostics', name1: 'Diagnostics', available247: false, displayOrder: 3, iconName: 'microscope' },
  { id: 'dental-care', name1: 'Dental Care', available247: false, displayOrder: 4, iconName: 'smile' },
  { id: 'physiotherapy', name1: 'Physiotherapy', available247: false, displayOrder: 5, iconName: 'activity' },
  { id: 'specialists', name1: 'Specialist Consultations', available247: false, displayOrder: 6, iconName: 'users' },
];

const trustIndicators = [
  { icon: BadgeCheck, label: 'Qualified Doctors', value: '50+' },
  { icon: Users, label: 'Happy Patients', value: '2,500+' },
  { icon: Clock, label: 'Years of Trust', value: '5+' },
  { icon: Building2, label: 'Clinic Locations', value: '4' },
];

const whyChooseUs = [
  { icon: Clock, title: 'Open 24/7', description: 'Round-the-clock care for all your health needs' },
  { icon: BadgeCheck, title: 'Qualified Doctors', description: 'Experienced & certified medical professionals' },
  { icon: FileText, title: 'Digital Records', description: 'Access your health records anytime, anywhere' },
  { icon: Shield, title: 'Affordable Care', description: 'Quality healthcare at pocket-friendly prices' },
  { icon: Home, title: 'Near You', description: '4 convenient locations across Hyderabad' },
  { icon: CreditCard, title: 'Health Plans', description: 'Annual memberships starting ₹999/year' },
];

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

const clinicImages = [
  {
    src: '/docty-clinic-consultation.jpg',
    alt: 'Docty Clinics doctor consulting with a patient',
    position: 'object-[42%_center]',
  },
  {
    src: '/docty-clinic-treatment.jpg',
    alt: 'Docty Clinics treatment room',
    position: 'object-[62%_center]',
  },
  {
    src: '/docty-clinic-pharmacy-shelves.jpg',
    alt: 'Docty Clinics pharmacy shelves',
    position: 'object-[58%_center]',
  },
  {
    src: '/docty-clinic-therapy-closeup.jpg',
    alt: 'Docty Clinics therapy care',
    position: 'object-[62%_center]',
  },
  {
    src: '/docty-clinic-lab-testing.jpg',
    alt: 'Docty Clinics lab testing',
    position: 'object-[48%_center]',
  },
  {
    src: '/docty-clinic-vitals.jpg',
    alt: 'Docty Clinics vitals check',
    position: 'object-[54%_center]',
  },
  {
    src: '/docty-clinic-dental-care.jpg',
    alt: 'Docty Clinics dental care',
    position: 'object-[55%_center]',
  },
  {
    src: '/docty-clinic-blood-sample.jpg',
    alt: 'Docty Clinics diagnostic sample collection',
    position: 'object-[58%_center]',
  },
  {
    src: '/docty-clinic-pharmacist.jpg',
    alt: 'Docty Clinics pharmacist',
    position: 'object-[50%_center]',
  },
];

function getRandomClinicImages() {
  const shuffled = [...clinicImages].sort(() => Math.random() - 0.5);
  return {
    main: shuffled[0] || clinicImages[0],
    secondary: shuffled[1] || shuffled[0] || clinicImages[0],
  };
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function DoctorExperience({ doctor }: { doctor: Doctor }) {
  const { data: publicExperience, isLoading } = useQuery({
    queryKey: ['doctor-public-experience', doctor.id, doctor.publicProfileSlug],
    queryFn: () => getEkaPublicDoctorExperience(doctor.publicProfileSlug, doctor.id),
    enabled: Boolean(doctor.publicProfileSlug),
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
  const experienceYears = publicExperience || doctor.experienceYears;

  if (experienceYears > 0) {
    return <span>{experienceYears} years exp</span>;
  }

  return (
    <span className={isLoading ? 'animate-pulse' : undefined}>
      {isLoading ? 'Loading experience...' : 'Experience not specified'}
    </span>
  );
}

function DoctorBookingSection({
  doctor,
  onRequestAppointment,
}: {
  doctor: Doctor;
  onRequestAppointment: (doctor: Doctor) => void;
}) {
  const clinicIds = (doctor.locations?.length
    ? doctor.locations
    : doctor.location
      ? [doctor.location]
      : []
  ).map((clinic) => clinic.id);
  const { data: availability, isLoading } = useQuery({
    queryKey: ['doctor-next-availability', doctor.id, clinicIds],
    queryFn: () => getEkaDoctorNextAvailability(doctor.id, clinicIds),
    enabled: clinicIds.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const hasAvailableSlot = Boolean(availability?.isAvailable && availability.nextAvailableSlot);

  return (
    <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Next Available</div>
          <div className="font-semibold text-foreground text-sm flex min-w-0 items-start gap-1">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span className={isLoading ? 'animate-pulse text-muted-foreground' : 'break-words'}>
              {isLoading
                ? 'Checking slots...'
                : hasAvailableSlot ? availability?.nextAvailableSlot : 'All Slots Booked'}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full flex-shrink-0 rounded-full px-4 sm:w-auto"
          onClick={(event) => {
            if (isLoading || hasAvailableSlot) return;
            event.preventDefault();
            event.stopPropagation();
            onRequestAppointment(doctor);
          }}
        >
          {isLoading || hasAvailableSlot ? 'Book Now' : 'Request Appointment'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { activeProfile, profiles, isAuthenticated, selectProfile } = usePatientSession();
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isSchoolCollabOpen, setIsSchoolCollabOpen] = useState(false);
  const [heroImages] = useState(getRandomClinicImages);
  const [selectedService, setSelectedService] = useState<string>('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingRequestProfile, setIsSwitchingRequestProfile] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<HealthPackage | null>(null);
  const [packageName, setPackageName] = useState('');
  const [packagePhone, setPackagePhone] = useState('');
  const [isPackageSubmitting, setIsPackageSubmitting] = useState(false);

  const {
    data: services,
  } = useServiceList({ orderBy: ['displayOrder asc'] });
  const fallbackServiceCards = useMemo(
    () => shuffleItems(uniqueServices(fallbackServices)),
    []
  );
  const displayedServices = useMemo(
    () =>
      services?.length
        ? shuffleItems(uniqueServices(services))
        : fallbackServiceCards,
    [fallbackServiceCards, services]
  );
  const homepageServiceCategories = useMemo(() => {
    const groupedServices = groupServicesByCategory(displayedServices);
    return serviceCategories
      .map((category) => ({
        ...category,
        serviceCount: groupedServices.get(category.id)?.length || 0,
      }))
      .filter((category) => category.serviceCount > 0)
      .slice(0, 8);
  }, [displayedServices]);
  const { data: locations } = useLocationList();
  const {
    data: doctors,
    isLoading: doctorsLoading,
    isError: doctorsError,
    refetch: refetchDoctors,
  } = useDoctorList({ top: 100 });
  const mostExperiencedDoctors = useMemo(
    () => {
      const sortedDoctors = [...(doctors || [])].sort((firstDoctor, secondDoctor) => {
        const experienceDifference =
          (secondDoctor.experienceYears || 0) - (firstDoctor.experienceYears || 0);
        if (experienceDifference !== 0) return experienceDifference;
        return firstDoctor.name1.localeCompare(secondDoctor.name1);
      });
      const selectedDoctors: Doctor[] = [];
      const selectedDoctorIds = new Set<string>();
      const representedSpecialties = new Set<string>();

      sortedDoctors.forEach((doctor) => {
        const specialtyKey = (doctor.specialty || 'General Medicine').trim().toLowerCase();
        if (representedSpecialties.has(specialtyKey)) return;
        selectedDoctors.push(doctor);
        selectedDoctorIds.add(doctor.id);
        representedSpecialties.add(specialtyKey);
      });

      sortedDoctors.forEach((doctor) => {
        if (selectedDoctors.length >= 6) return;
        if (selectedDoctorIds.has(doctor.id)) return;
        selectedDoctors.push(doctor);
        selectedDoctorIds.add(doctor.id);
      });

      return selectedDoctors.slice(0, 6);
    },
    [doctors]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsSchoolCollabOpen(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, []);

  const openLeadDialog = (service: string) => {
    setSelectedService(service);
    setLeadName(activeProfile?.name || '');
    setLeadPhone(activeProfile?.mobile || '');
    setIsLeadDialogOpen(true);
  };

  const getLeadServiceCategory = (service: string): ClinicLeadService => {
    if (service === 'Pharmacy Order') return 'Pharmacy';
    if (service === 'Lab Test') return 'Lab Tests';
    if (service === 'Dental Checkup') return 'Dental';
    if (service === 'Physiotherapy') return 'Physiotherapy';
    return 'Consultation';
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestName = activeProfile?.name || leadName;
    const requestPhone = activeProfile?.mobile || leadPhone;
    if (!requestName.trim() || !requestPhone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[0-9]{10}$/.test(requestPhone.replace(/\D/g, '').slice(-10))) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitClinicLead({
        type: selectedService === 'Pharmacy Order' ? 'pharmacy' : 'service',
        serviceCategory: getLeadServiceCategory(selectedService),
        patientName: requestName,
        patientMobile: requestPhone,
        interest: selectedService,
        source: 'Homepage quick request',
        metadata: { profileId: activeProfile?.id || null },
      });
      setIsLeadDialogOpen(false);
      toast.success(
        selectedService === 'Pharmacy Order'
          ? `Thank you ${requestName}! Our pharmacy team will call you shortly.`
          : `Thank you ${requestName}! We'll call you shortly for your ${selectedService} appointment.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPackageDialog = (healthPackage: HealthPackage) => {
    setSelectedPackage(healthPackage);
    setPackageName('');
    setPackagePhone('');
  };

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !packageName.trim() || !packagePhone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[0-9]{10}$/.test(packagePhone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setIsPackageSubmitting(true);
    try {
      await submitClinicLead({
        type: 'health-package',
        serviceCategory: 'Lab Tests',
        patientName: packageName,
        patientMobile: packagePhone,
        interest: selectedPackage.name,
        source: 'Homepage health package',
        metadata: { packageId: selectedPackage.id },
      });
      setSelectedPackage(null);
      toast.success(
        `Thank you ${packageName}! We'll call you shortly to confirm the ${selectedPackage.name} package.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsPackageSubmitting(false);
    }
  };
  const isPharmacyRequest = selectedService === 'Pharmacy Order';

  return (
    <div className="flex flex-col pt-24 md:pt-26">
      {/* Hero Section - Pharmacy-inspired layout with Quick Book focus */}
      <section className="relative max-w-full overflow-hidden border-b">
        <div className="absolute inset-0">
          <img
            src={heroImages.main.src}
            alt=""
            className={`h-full w-full object-cover opacity-80 ${heroImages.main.position}`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/82 to-background/45" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(14,173,230,0.10),transparent_34%),radial-gradient(circle_at_18%_80%,rgba(254,6,92,0.08),transparent_32%)]" />
        </div>

        <div className="container relative mx-auto max-w-full px-4 py-10 lg:py-16">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)] lg:items-center">
            {/* Left Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="min-w-0 max-w-3xl space-y-6 lg:space-y-8"
            >
              <motion.div variants={itemVariants} className="flex items-center gap-2">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Open 24/7 • All Days
                </Badge>
                <Badge variant="outline" className="px-3 py-1.5 text-sm">
                  4 Clinics
                </Badge>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
              >
                Your Neighbourhood
                <br />
                <span className="text-primary">Healthcare Partner</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-lg md:text-xl text-muted-foreground max-w-lg"
              >
                Primary Care, Pharmacy, Diagnostics, Dental, Physiotherapy and Specialist Care — all under one roof.
              </motion.p>

              <motion.p
                variants={itemVariants}
                className="max-w-xl text-sm font-medium text-muted-foreground"
              >
                Walk in to any Docty clinic, request a callback, or quickly book the care you need.
              </motion.p>

              {/* Emergency Call */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-full px-5">
                  <Link to="/book-appointment">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Appointment
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full bg-white/90 px-5">
                  <a href="tel:+919989804888">
                    <Phone className="mr-2 h-4 w-4 text-primary" />
                    Call 99898 04888
                  </a>
                </Button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3"
              >
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/85 p-3 shadow-sm backdrop-blur">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold leading-tight text-foreground">Trusted by</div>
                    <div className="text-sm font-medium text-muted-foreground">1000+ families</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/85 p-3 shadow-sm backdrop-blur">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold leading-tight text-foreground">Open 24/7</div>
                    <div className="text-sm font-medium text-muted-foreground">All days</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/85 p-3 shadow-sm backdrop-blur">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold leading-tight text-foreground">4 Clinics</div>
                    <div className="text-sm font-medium text-muted-foreground">Across Hyderabad</div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Link
                  to="/health-plans"
                  className="group flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-background/90 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <Heart className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-muted-foreground">
                        Potential annual savings with Docty Total Care
                      </div>
                      <div className="mt-0.5 text-2xl font-bold text-accent">
                        Up to ₹{formatCurrency(totalCareMaxAnnualSavings)}
                      </div>
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5 sm:flex">
                    View Plans
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </motion.div>
            </motion.div>

            {/* Quick Booking Card */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="min-w-0"
            >
              <motion.div
                variants={itemVariants}
                className="rounded-2xl border border-border/80 bg-background/95 p-5 shadow-xl backdrop-blur md:p-6"
              >
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Quick Book
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openLeadDialog('Doctor Consultation')}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Doctor</div>
                      <div className="text-xs text-muted-foreground">Consult now</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openLeadDialog('Lab Test')}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                      <Microscope className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Lab Test</div>
                      <div className="text-xs text-muted-foreground">Book test</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openLeadDialog('Dental Checkup')}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                      <Smile className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Dental</div>
                      <div className="text-xs text-muted-foreground">Checkup</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openLeadDialog('Physiotherapy')}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Physio</div>
                      <div className="text-xs text-muted-foreground">Therapy</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openLeadDialog('Pharmacy Order')}
                    className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-3 text-left transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Pill className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Order Pharmacy</div>
                        <div className="text-xs text-muted-foreground">Medicines from your neighbourhood clinic</div>
                      </div>
                    </div>
                    <Badge className="flex-shrink-0 bg-accent text-accent-foreground">Open 24 Hours</Badge>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Trust Stats Bar */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 bg-card rounded-2xl p-6 border border-border shadow-sm"
          >
            {trustIndicators.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-muted/30 scroll-mt-24">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Care Categories
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              Find the right type of care, then explore every available service
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="show"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {homepageServiceCategories.map((category) => {
              return (
                <motion.div key={category.id} variants={itemVariants}>
                  <Link to={`/services?category=${category.id}`}>
                    <Card className="group h-full cursor-pointer text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                      <CardContent className="flex h-full flex-col items-center p-5 md:p-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto mb-4 flex items-center justify-center">
                          <ServiceIcon serviceName={category.iconService} className="h-9 w-9" />
                        </div>
                        <h3 className="mb-2 font-semibold text-foreground transition-colors group-hover:text-primary">
                          {category.name}
                        </h3>
                        <p className="mb-3 line-clamp-2 flex-1 text-xs leading-5 text-muted-foreground">
                          {category.description}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {category.serviceCount}{' '}
                          {category.serviceCount === 1 ? 'service' : 'services'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/services">
                View All Care Categories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Our Doctors Section */}
      <section id="doctors" className="py-16 scroll-mt-24">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Experienced Doctors by <span className="text-primary">Speciality</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              A balanced mix of senior doctors, with the most experienced doctor from each speciality shown first.
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {doctorsLoading ? (
              [1, 2, 3].map((item) => (
                <motion.div key={item} variants={itemVariants}>
                  <Card className="h-full overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="h-24 w-24 flex-shrink-0 animate-pulse rounded-2xl bg-muted" />
                        <div className="flex-1 space-y-3">
                          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : doctorsError ? (
              <motion.div variants={itemVariants} className="col-span-full rounded-md border bg-card p-8 text-center">
                <p className="font-medium text-foreground">We could not load the doctors</p>
                <p className="mt-1 text-sm text-muted-foreground">Please retry the connection.</p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => refetchDoctors()}>
                  Try Again
                </Button>
              </motion.div>
            ) : mostExperiencedDoctors.length ? mostExperiencedDoctors.map((doctor) => (
              <motion.div key={doctor.id} variants={itemVariants} className="min-w-0">
                <Link to={`/doctor/${doctor.id}`} className="block min-w-0">
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                    <CardContent className="p-0">
                      <div className="flex gap-4 p-4">
                        {/* Doctor Photo */}
                        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-muted">
                          {doctor.imageURL ? (
                            <img
                              src={doctor.imageURL}
                              alt={doctor.name1}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                              <Stethoscope className="h-10 w-10 text-primary/50" />
                            </div>
                          )}
                        </div>
                        
                        {/* Doctor Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-lg truncate">{doctor.name1}</h3>
                          <p className="text-primary font-medium text-sm">{doctor.specialty}</p>
                          {doctor.qualifications && (
                            <p className="text-muted-foreground text-xs mt-0.5">{doctor.qualifications}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <DoctorExperience doctor={doctor} />
                          </div>
                        </div>
                      </div>
                      
                      <DoctorBookingSection
                        doctor={doctor}
                        onRequestAppointment={(requestedDoctor) =>
                          openLeadDialog(`appointment with ${requestedDoctor.name1}`)
                        }
                      />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )) : (
              <motion.div variants={itemVariants} className="col-span-full rounded-2xl border bg-card p-8 text-center">
                <p className="font-medium text-foreground">No doctors available right now</p>
                <p className="mt-1 text-sm text-muted-foreground">Please check again shortly.</p>
              </motion.div>
            )}
          </motion.div>

          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/book-appointment">
                Book Appointment with Any Doctor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Docty */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose <span className="text-primary">Docty Clinics</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              We're committed to making quality healthcare accessible, affordable, and available 24/7
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {whyChooseUs.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={itemVariants}>
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex gap-4">
                      <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${
                        index % 2 === 0 ? 'bg-primary/10' : 'bg-accent/10'
                      }`}>
                        <Icon className={`h-6 w-6 ${index % 2 === 0 ? 'text-primary' : 'text-accent'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Clinic Locations */}
      <section id="locations" className="order-3 py-16 bg-muted/30 scroll-mt-24">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Find a Clinic Near You
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground">
              4 convenient locations across Hyderabad
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {locations?.slice(0, 4).map((location) => (
              <motion.div key={location.id} variants={itemVariants}>
                <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                  <div className="h-40 relative overflow-hidden">
                    {location.imageUrl ? (
                      <img
                        src={location.imageUrl}
                        alt={location.name1}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-accent/10 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-2xl font-bold" style={{ color: '#FE065C' }}>Docty</span>
                          <span className="text-lg font-semibold block" style={{ color: '#0BB8FC' }}>Clinics</span>
                        </div>
                      </div>
                    )}
                    {location.open247 && (
                      <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                        24/7
                      </Badge>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <h3 className="font-bold text-white text-sm">{location.name1}</h3>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {location.address}
                    </p>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`tel:${location.phone}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {location.phone}
                      </a>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={`/locations/${location.id}`}>
                          <MapPin className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/locations">
                View All Locations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Health Plans CTA */}
      <section className="order-1 border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-50px' }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <motion.div variants={itemVariants} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary text-primary-foreground">
                    <Heart className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: '#FE065C' }}>Docty</div>
                    <div className="text-xl font-semibold" style={{ color: '#0BB8FC' }}>TOTAL CARE</div>
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold">
                  Your Health. Our Priority.
                  <br />
                  <span className="text-primary">Every Day.</span>
                </h2>

                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Starting from</span>
                  <span className="text-5xl font-bold text-primary">
                    ₹{formatCurrency(totalCareStartingPrice)}
                  </span>
                  <span className="text-muted-foreground">/year</span>
                </div>

                <div className="rounded-md border bg-background px-5 py-4 shadow-sm">
                  <p className="text-sm font-medium text-muted-foreground">
                    Potential annual savings with Docty Total Care
                  </p>
                  <p className="mt-1 text-3xl font-bold" style={{ color: '#0BB8FC' }}>
                    Up to ₹{formatCurrency(totalCareMaxAnnualSavings)}
                  </p>
                </div>

                <ul className="space-y-3">
                  {totalCareBenefits.map((benefit) => (
                    <li key={benefit.title} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-foreground">
                        <strong>{benefit.title}</strong>
                        <span className="text-muted-foreground"> - {benefit.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="rounded-full px-8">
                  <Link to="/health-plans">
                    Explore Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div variants={itemVariants} className="relative order-first lg:order-last">
                <img
                  src="https://cdn.hubblecontent.osi.office.net/m365content/publish/2dbbf6a3-24f0-4131-9f28-159f7948f471/thumbnails/large.jpg"
                  alt="Healthy family enjoying time outdoors"
                  className="h-[280px] w-full rounded-lg object-cover shadow-xl sm:h-[360px] lg:h-[430px]"
                />
                <div className="absolute bottom-4 left-4 rounded-md bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                  <p className="text-sm font-semibold text-foreground">Healthcare for the whole family</p>
                  <p className="text-xs text-muted-foreground">
                    {totalCarePlans.length} annual plans from ₹
                    {formatCurrency(totalCareStartingPrice)} with savings up to ₹
                    {formatCurrency(totalCareMaxAnnualSavings)}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
      </section>

      {/* Health Packages */}
      <section id="packages" className="order-2 py-16 scroll-mt-24">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="text-center mb-12"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Health Packages & Checkups
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground">
              Comprehensive health checkups at affordable prices
            </motion.p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="mb-10 overflow-hidden rounded-lg border bg-gradient-to-r from-primary/5 via-background to-accent/10"
          >
            <div className="grid items-center gap-6 px-6 py-7 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
              <div>
                <Badge variant="outline" className="mb-4 gap-2 bg-background/80 px-3 py-1.5">
                  <Layers3 className="h-4 w-4 text-accent" />
                  <span>
                    <strong className="text-primary">AI</strong> Smart Reports
                  </span>
                </Badge>
                <h3 className="max-w-3xl text-2xl font-bold leading-tight text-foreground md:text-3xl">
                  AI Personalized Smart Pathology Reports
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                  Go beyond raw test values with clear, personalized insights that make your health reports easier to understand and discuss with your doctor.
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 md:grid-cols-1">
                {[
                  'Easy-to-read insights',
                  'Personalized health markers',
                  'Doctor-ready summary',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-2">
                    <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {featuredHealthPackages.map((pkg) => (
              <motion.div key={pkg.id} variants={itemVariants}>
                  <Card className="group h-full overflow-hidden border-border transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Microscope className="h-5 w-5" />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {pkg.audience}
                        </Badge>
                      </div>

                      <div className="mt-5 flex-1">
                        <h3 className="text-base font-bold leading-snug text-foreground">
                          {pkg.name}
                        </h3>
                        {pkg.variant && (
                          <p className="mt-1 text-xs font-semibold text-primary">{pkg.variant}</p>
                        )}
                        <p className="mt-3 line-clamp-3 text-sm leading-5 text-muted-foreground">
                          {pkg.description}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                          {pkg.tests.length} tests included
                        </div>
                      </div>

                      <div className="mt-5 border-t pt-4">
                        <div className="mb-4 flex items-end gap-2">
                          <span className="text-2xl font-bold text-primary">
                            ₹{new Intl.NumberFormat('en-IN').format(pkg.offerPrice)}
                          </span>
                          <span className="pb-1 text-xs text-muted-foreground line-through">
                            ₹{new Intl.NumberFormat('en-IN').format(pkg.originalPrice)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full rounded-full"
                          onClick={() => openPackageDialog(pkg)}
                        >
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link to="/packages">
                View All Packages
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="order-4 py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Take Care of Your Health?
            </motion.h2>
            <motion.p variants={itemVariants} className="text-primary-foreground/90 mb-8 text-lg">
              Book an appointment today and experience quality healthcare at your neighbourhood clinic.
            </motion.p>
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="rounded-full px-8">
                <Link to="/book-appointment">
                  Book Appointment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8 border-primary-foreground/30 bg-white text-[#fe065c] hover:bg-white/90 hover:text-[#fe065c]"
              >
                <a href="tel:+919989804888">
                  <Phone className="mr-2 h-4 w-4" />
                  Call 99898 04888
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Dialog open={isSchoolCollabOpen} onOpenChange={setIsSchoolCollabOpen}>
        <DialogContent className="max-h-[calc(100svh-1rem)] overflow-y-auto p-0 sm:max-w-4xl">
          <div className="relative overflow-hidden bg-[#f6fbfd]">
            <div
              className="absolute inset-0 bg-[url('/school-camp-healthy-kids-hero.png')] bg-[length:auto_82%] bg-[position:right_50%_top_82px] bg-no-repeat opacity-100 md:bg-[length:auto_98%] md:bg-[position:right_-34px_top_52px]"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[linear-gradient(105deg,#ffffff_0%,#ffffff_37%,rgba(255,255,255,0.86)_55%,rgba(255,255,255,0.12)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,#fe065c_0%,#0bb8fc_54%,rgba(11,184,252,0)_100%)] opacity-95" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,#fff6fa_0%,rgba(246,251,253,0)_100%)]" />
            <div className="absolute bottom-0 right-0 h-24 w-full bg-[linear-gradient(135deg,rgba(254,6,92,0.92)_0%,rgba(11,184,252,0.88)_55%,rgba(255,255,255,0)_56%)] opacity-80" />
            <div className="relative p-6 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-white/70 bg-white/88 p-3 shadow-lg shadow-[#082f49]/10 backdrop-blur">
                <img src="/docty-logo-full.png" alt="Docty Clinics" className="h-11 w-auto" />
                <div className="hidden h-10 w-px bg-[#dceaf1] sm:block" />
                <img src="/sri-gayathri-techno-school-logo.png" alt="Sri Gayathri Techno Schools" className="h-11 w-auto" />
              </div>

              <div className="mt-7 min-h-[520px] md:min-h-[560px]">
                <div className="max-w-[470px]">
                  <DialogHeader>
                    <DialogTitle className="text-left text-4xl font-black leading-tight tracking-normal md:text-6xl">
                      <span className="block text-[#fe065c] drop-shadow-sm">Healthy Kids</span>
                      <span className="block text-[#0b7fae] drop-shadow-sm">Happy Futures</span>
                    </DialogTitle>
                  </DialogHeader>
                  <Badge className="mt-4 rounded-full bg-[#082f49] px-4 py-1.5 text-sm text-white shadow-lg shadow-[#082f49]/20 hover:bg-[#082f49]">
                    5-week interactive health journey
                  </Badge>
                  <p className="mt-5 max-w-md text-base font-medium leading-7 text-[#082f49]">
                    A Health & Wellness Camp for <span className="font-bold text-[#fe065c]">Sri Gayathri Techno School Students</span>, powered by Docty Clinics.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                    {[
                      { icon: Stethoscope, title: 'Expert Assessments' },
                      { icon: FileText, title: 'AI Reports' },
                      { icon: Heart, title: 'Parent Education' },
                      { icon: BadgeCheck, title: 'Special Offers' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="rounded-md border border-white/70 bg-white/88 p-3 shadow-lg shadow-[#082f49]/10 backdrop-blur">
                          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#fe065c] text-white shadow-md shadow-[#fe065c]/25">
                            <Icon className="size-5" />
                          </div>
                          <p className="mt-2 text-[11px] font-bold leading-tight text-[#082f49]">{item.title}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {[
                      { icon: Calendar, title: '5 Saturdays' },
                      { icon: Building2, title: 'On Campus Camp' },
                      { icon: Activity, title: 'Live Assessment' },
                      { icon: Sparkles, title: 'AI Reports' },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="flex items-center gap-2 rounded-md bg-[#082f49]/92 p-2 text-white shadow-lg shadow-[#082f49]/15 ring-1 ring-white/30 backdrop-blur">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0bb8fc] text-white">
                            <Icon className="size-4" />
                          </div>
                          <p className="text-xs font-black leading-snug">{item.title}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-md border border-white/70 bg-white/92 p-3 shadow-xl shadow-[#fe065c]/10 backdrop-blur">
                    <p className="text-sm font-black text-[#fe065c]">Exclusive Total Care Offer</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-[#eaf8fe] p-3 shadow-inner">
                        <p className="text-xs font-bold text-[#082f49]">Students & Staff</p>
                        <p className="text-xs font-bold text-[#8aa0ad] line-through">Rs 999/-</p>
                        <p className="text-2xl font-black text-[#0b7fae]">Rs 199/-</p>
                      </div>
                      <div className="rounded-md bg-[#fff6fa] p-3 shadow-inner">
                        <p className="text-xs font-bold text-[#082f49]">Family Members</p>
                        <p className="text-xs font-bold text-[#8aa0ad] line-through">Rs 999/-</p>
                        <p className="text-2xl font-black text-[#fe065c]">Rs 399/-</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-md bg-white/80 p-4 shadow-lg shadow-[#082f49]/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-[#082f49]">Caring today. Healthier tomorrow.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="rounded-full bg-[#fe065c] shadow-lg shadow-[#fe065c]/25 hover:bg-[#d9044f]">
                    <Link to="/school-camp-collaboration" onClick={() => setIsSchoolCollabOpen(false)}>
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-[#0b7fae] bg-white/80 text-[#0b7fae] hover:bg-[#eaf8fe]">
                    <a href="tel:+919989804888">
                      <Phone className="mr-2 h-4 w-4" />
                      Call Docty
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Capture Dialog */}
      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold">
                  {isPharmacyRequest ? 'Order from Pharmacy' : `Book ${selectedService}`}
                </div>
                <div className="text-sm font-normal text-muted-foreground">
                  {isPharmacyRequest ? "We'll call to assist with your order" : "We'll call you to confirm"}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeadSubmit} className="space-y-4 mt-4">
            {isAuthenticated && activeProfile ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Requesting for</p>
                    {profiles.length > 1 ? (
                      <Select
                        value={activeProfile.id}
                        disabled={isSwitchingRequestProfile}
                        onValueChange={async (profileId) => {
                          setIsSwitchingRequestProfile(true);
                          try {
                            await selectProfile(profileId);
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : 'Unable to switch patient profile.'
                            );
                          } finally {
                            setIsSwitchingRequestProfile(false);
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1 h-9 min-w-52 border-primary/30 bg-primary/5 shadow-none hover:bg-primary/10 focus:ring-primary/25">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                              {profile.relation ? ` · ${profile.relation}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-bold">{activeProfile.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">+91 {activeProfile.mobile}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Your Name</Label>
                  <Input
                    id="lead-name"
                    placeholder="Enter your full name"
                    value={leadName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadName(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-phone">Contact Number</Label>
                  <Input
                    id="lead-phone"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={leadPhone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadPhone(e.target.value)}
                    className="h-12"
                  />
                </div>
              </>
            )}
            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {isPharmacyRequest ? (
                  <>
                    Our pharmacy team will call you shortly to understand your medicine requirements and assist with the order.
                  </>
                ) : (
                  <>
                    Our team will call you within 5 minutes to confirm your appointment for{' '}
                    <span className="font-medium text-foreground">{selectedService}</span>.
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsLeadDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Request Callback'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedPackage && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-left">
                  <span className="block text-xl font-bold">{selectedPackage.name}</span>
                  {selectedPackage.variant && (
                    <span className="mt-1 block text-sm font-semibold text-primary">
                      {selectedPackage.variant}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Package offer</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-primary">
                            ₹{new Intl.NumberFormat('en-IN').format(selectedPackage.offerPrice)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{new Intl.NumberFormat('en-IN').format(selectedPackage.originalPrice)}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-accent text-accent-foreground">
                        {selectedPackage.discount}% off
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {selectedPackage.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <Microscope className="h-4 w-4 text-accent" />
                      {selectedPackage.tests.length} tests included
                    </h3>
                    <ul className="max-h-52 space-y-2 overflow-y-auto pr-2">
                      {selectedPackage.tests.map((test) => (
                        <li key={test} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                          <span>{test}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <form onSubmit={handlePackageSubmit} className="space-y-4">
                  <div>
                    <h3 className="font-semibold">Book this package</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Our team will call you to confirm the clinic and preferred time.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-name">Your Name</Label>
                    <Input
                      id="package-name"
                      placeholder="Enter your full name"
                      value={packageName}
                      onChange={(event) => setPackageName(event.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-phone">Contact Number</Label>
                    <Input
                      id="package-phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Enter 10-digit mobile number"
                      value={packagePhone}
                      onChange={(event) => setPackagePhone(event.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{selectedPackage.name}</span>
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedPackage(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isPackageSubmitting}>
                      {isPackageSubmitting ? 'Submitting...' : 'Request Booking'}
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
