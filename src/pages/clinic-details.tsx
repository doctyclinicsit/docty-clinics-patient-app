import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Navigation,
  Phone,
  Pill,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import { useLocation } from '@/generated/hooks/use-location';
import { useServiceList } from '@/generated/hooks/use-service';
import type { Doctor } from '@/generated/models/doctor-model';
import { getEkaPublicDoctorExperience } from '@/lib/eka-api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
} as const;

const fallbackServices = ['Primary Care', 'Pharmacy', 'Diagnostics', 'Dental Care', 'Physiotherapy'];

function splitValues(value?: string) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function toTitleCase(value?: string) {
  return (value || 'Hyderabad')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getClinicDisplayName(name: string) {
  return name.replace(/^Docty Clinics\s*/i, '').trim() || name;
}

function isDoctorAtClinic(doctor: Doctor, clinicId: string) {
  const doctorLocations = doctor.locations?.length ? doctor.locations : doctor.location ? [doctor.location] : [];
  return doctorLocations.some((location) => location.id === clinicId);
}

function getDirectionsUrl(location?: { address?: string; lat?: number; lon?: number }) {
  if (typeof location?.lat === 'number' && typeof location?.lon === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location?.address || '')}`;
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
    return <>{experienceYears} yrs exp</>;
  }

  return <>{isLoading ? 'Loading experience...' : 'Experience not specified'}</>;
}

function DoctorCard({ doctor, clinicId }: { doctor: Doctor; clinicId: string }) {
  const clinicProfile = doctor.clinicProfiles?.find((clinic) => clinic.id === clinicId);

  return (
    <Card className="h-full overflow-hidden rounded-2xl border-border hover:shadow-lg transition-shadow">
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
            {doctor.imageURL ? (
              <img
                src={doctor.imageURL}
                alt={doctor.name1}
                className="h-full w-full object-cover object-[center_18%]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                <Stethoscope className="h-9 w-9 text-primary/50" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold leading-tight text-foreground">{doctor.name1}</h3>
                <p className="mt-1 text-sm font-medium text-primary">{doctor.specialty}</p>
              </div>
              {doctor.isAvailable && (
                <Badge className="rounded-full bg-accent text-accent-foreground">Available</Badge>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {(doctor.rating || 4.8).toFixed(1)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <DoctorExperience doctor={doctor} />
              </span>
            </div>

            {doctor.qualifications && (
              <p className="mt-3 line-clamp-1 text-sm text-muted-foreground">{doctor.qualifications}</p>
            )}

            {clinicProfile?.services?.length ? (
              <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                Services: {clinicProfile.services.slice(0, 3).join(', ')}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="rounded-full">
                <Link to={`/doctor/${doctor.id}`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Now
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to={`/doctor/${doctor.id}`}>View Profile</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClinicDetailsPage() {
  const { id = '' } = useParams();
  const { data: clinic, isLoading: clinicLoading } = useLocation(id);
  const { data: doctors, isLoading: doctorsLoading } = useDoctorList();
  const { data: services } = useServiceList({ orderBy: ['displayOrder asc'] });

  const clinicDoctors = (doctors || []).filter((doctor) => isDoctorAtClinic(doctor, id));
  const clinicProfileServices = clinicDoctors.flatMap(
    (doctor) => doctor.clinicProfiles?.find((profile) => profile.id === id)?.services || [],
  );
  const doctorServices = clinicDoctors.flatMap((doctor) => splitValues(doctor.servicesOffered));
  const explicitServices = splitValues(clinic?.services);
  const serviceNames = [
    ...new Set([
      ...explicitServices,
      ...clinicProfileServices,
      ...doctorServices,
      ...(explicitServices.length || clinicProfileServices.length || doctorServices.length
        ? []
        : services?.map((service) => service.name1) || fallbackServices),
    ]),
  ];

  if (clinicLoading) {
    return (
      <div className="container mx-auto px-4 pt-32 pb-16">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="container mx-auto px-4 pt-32 pb-16 text-center">
        <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Clinic not found</h1>
        <p className="mt-2 text-muted-foreground">The clinic details could not be loaded.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/locations">Back to Locations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background">
      <section className="pt-24 pb-12 bg-gradient-to-r from-primary/5 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <Button asChild variant="ghost" className="mb-6 rounded-full px-0 hover:bg-transparent">
            <Link to="/locations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clinics
            </Link>
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch"
          >
            <Card className="overflow-hidden rounded-3xl border-border shadow-sm">
              <div className="grid md:grid-cols-[320px_minmax(0,1fr)]">
                <div className="relative min-h-72 overflow-hidden bg-muted">
                  {clinic.imageUrl ? (
                    <img src={clinic.imageUrl} alt={clinic.name1} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-72 items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                      <div className="text-center">
                        <span className="block text-4xl font-bold text-primary">Docty</span>
                        <span className="block text-2xl font-semibold text-accent">Clinics</span>
                      </div>
                    </div>
                  )}
                  {clinic.open247 && (
                    <Badge className="absolute right-4 top-4 rounded-full bg-primary text-primary-foreground">
                      Open 24/7
                    </Badge>
                  )}
                </div>

                <CardContent className="p-6 md:p-8">
                  <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1.5 text-sm font-semibold">
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    {toTitleCase(clinic.area)}
                  </Badge>
                  <h1 className="text-3xl font-bold md:text-4xl">{clinic.name1}</h1>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{clinic.address}</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <a
                      href={`tel:${clinic.phone}`}
                      className="flex items-center gap-3 rounded-2xl border border-border p-4 text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Phone className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{clinic.phone}</span>
                    </a>
                    <a
                      href={getDirectionsUrl(clinic)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-border p-4 text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Navigation className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Get Directions</span>
                    </a>
                  </div>
                </CardContent>
              </div>
            </Card>

            <Card className="rounded-3xl border-primary/20 bg-card shadow-sm">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold">Clinic Snapshot</h2>
                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Timings</p>
                      <p className="text-sm text-muted-foreground">{clinic.open247 ? 'Open 24/7' : 'Open Daily'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-accent/10 p-3">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">Doctors</p>
                      <p className="text-sm text-muted-foreground">
                        {doctorsLoading ? 'Loading doctors...' : `${clinicDoctors.length} associated doctors`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Care Available</p>
                      <p className="text-sm text-muted-foreground">Walk-ins and appointments supported</p>
                    </div>
                  </div>
                </div>
                <Button asChild className="mt-6 w-full rounded-full">
                  <Link to={`/book-appointment?location=${clinic.id}`}>Book Appointment</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Services at this Clinic</h2>
              <p className="mt-2 text-muted-foreground">Core healthcare services available at {clinic.name1}.</p>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {serviceNames.slice(0, 8).map((service, index) => {
              const Icon = index % 4 === 0 ? Stethoscope : index % 4 === 1 ? Pill : index % 4 === 2 ? Activity : CheckCircle2;
              return (
                <motion.div key={service} variants={itemVariants}>
                  <Card className="h-full rounded-2xl border-border">
                    <CardContent className="p-5">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="font-semibold">{service}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">Available with clinic team support.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">
                Doctors at {getClinicDisplayName(clinic.name1)}
              </h2>
              <p className="mt-2 text-muted-foreground">Choose a doctor associated with this clinic.</p>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/book-appointment">View All Doctors</Link>
            </Button>
          </div>

          {doctorsLoading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : clinicDoctors.length ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="grid gap-5 lg:grid-cols-2"
            >
              {clinicDoctors.map((doctor) => (
                <motion.div key={doctor.id} variants={itemVariants}>
                  <DoctorCard doctor={doctor} clinicId={clinic.id} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-10 text-center">
                <Stethoscope className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                <h3 className="font-semibold">No associated doctors found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please check all doctors or contact the clinic for current availability.
                </p>
                <Button asChild className="mt-5 rounded-full">
                  <Link to="/book-appointment">View Doctors</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
