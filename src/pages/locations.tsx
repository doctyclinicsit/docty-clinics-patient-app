import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Bed,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Microscope,
  Navigation,
  Phone,
  Pill,
  Smile,
  Stethoscope,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import { useLocationList } from '@/generated/hooks/use-location';
import type { Location } from '@/generated/models/location-model';
import type { LucideIcon } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

const serviceIcons: Record<string, LucideIcon> = {
  'Primary Care': Stethoscope,
  Pharmacy: Pill,
  Diagnostics: Microscope,
  'Lab Tests': Microscope,
  Dental: Smile,
  'Dental Care': Smile,
  Physiotherapy: Activity,
  'Day Care Services': Bed,
  'Top Specialists': Users,
};

const defaultServices = ['Primary Care', 'Pharmacy', 'Diagnostics', 'Dental Care', 'Physiotherapy'];

const clinicImages = [
  '/docty-clinic-consultation.jpg',
  '/docty-clinic-treatment.jpg',
  '/docty-clinic-vitals.jpg',
  '/docty-clinic-lab-testing.jpg',
  '/docty-clinic-dental-care.jpg',
  '/docty-clinic-pharmacy-shelves.jpg',
];

function toTitleCase(value?: string) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAreaLabel(location: Location) {
  const nameArea = location.name1.replace(/^Docty Clinics\s*/i, '').trim();
  const area = location.area?.trim();

  if (!area || area.toLowerCase() === 'not available') return nameArea || 'Hyderabad';
  if (area.toLowerCase() === 'hyderabad' && nameArea) return nameArea;
  return toTitleCase(area);
}

function getCityLabel(location: Location) {
  const address = location.address || '';
  if (/hyderabad/i.test(address) || /telangana/i.test(address)) return 'Hyderabad';
  return toTitleCase(location.area || 'Hyderabad');
}

function getServices(location: Location) {
  const services = location.services
    ?.split(',')
    .map((service) => service.trim())
    .filter(Boolean);

  return services?.length ? services : defaultServices;
}

function getDirectionsUrl(location: Location) {
  if (typeof location.lat === 'number' && typeof location.lon === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || location.name1)}`;
}

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocationList();
  const { data: doctors } = useDoctorList();

  return (
    <div className="flex flex-col">
      <section className="pt-28 pb-12 bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(254,6,92,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(11,184,252,0.06),transparent_50%)]" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-3xl"
          >
            <Badge variant="secondary" className="mb-4">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              {locations?.length || 0} Clinics Across Hyderabad
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find a <span style={{ color: '#FE065C' }}>Docty Clinic</span> Near You
            </h1>
            <p className="text-lg text-muted-foreground">
              Quality healthcare in your neighbourhood. Choose a clinic, check available services, and get directions
              using the clinic location.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid gap-6">
              {[...Array(4)].map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="grid md:grid-cols-[260px_minmax(0,1fr)]">
                    <Skeleton className="h-56 w-full md:h-full" aria-hidden="true" />
                    <CardContent className="space-y-4 p-6">
                      <Skeleton className="h-7 w-2/3" aria-hidden="true" />
                      <Skeleton className="h-4 w-full" aria-hidden="true" />
                      <Skeleton className="h-4 w-4/5" aria-hidden="true" />
                      <Skeleton className="h-10 w-full" aria-hidden="true" />
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid gap-6"
            >
              {locations?.map((location, index) => {
                const services = getServices(location);
                const area = getAreaLabel(location);
                const city = getCityLabel(location);
                const imageUrl = location.imageUrl || clinicImages[index % clinicImages.length];
                const doctorCount =
                  doctors?.filter((doctor) => {
                    const doctorLocations = doctor.locations?.length
                      ? doctor.locations
                      : doctor.location
                        ? [doctor.location]
                        : [];
                    return doctorLocations.some((doctorLocation) => doctorLocation.id === location.id);
                  }).length || 0;

                return (
                  <motion.div key={location.id} variants={itemVariants}>
                    <Card className="h-full overflow-hidden border-border transition-all duration-300 hover:border-primary/30 hover:shadow-lg group">
                      <div className="grid h-full md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
                        <div className="relative min-h-56 overflow-hidden md:min-h-full">
                          <img
                            src={imageUrl}
                            alt={`${location.name1} clinic`}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                            <Badge className="bg-primary text-primary-foreground">
                              {location.open247 ? 'Open 24/7' : 'Open Daily'}
                            </Badge>
                            <Badge className="bg-white/90 text-foreground">{city}</Badge>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-5">
                            <p className="text-sm font-medium text-white/85">{area}</p>
                            <h2 className="mt-1 text-2xl font-bold text-white">{location.name1}</h2>
                          </div>
                        </div>

                        <CardContent className="flex flex-col p-6">
                          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_210px]">
                            <div>
                              <div className="flex items-start gap-3">
                                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                                <p className="text-sm leading-6 text-muted-foreground">{location.address}</p>
                              </div>

                              <div className="mt-5">
                                <h3 className="mb-3 text-sm font-semibold">Services Available</h3>
                                <div className="flex flex-wrap gap-2">
                                  {services.slice(0, 5).map((service) => {
                                    const Icon = serviceIcons[service] || Stethoscope;
                                    return (
                                      <Badge key={service} variant="outline" className="gap-1.5 py-1.5">
                                        <Icon className="h-3.5 w-3.5" />
                                        {service}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-t pt-5 lg:block lg:space-y-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                              <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-accent" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Clinic Hours</p>
                                  <p className="font-semibold">{location.open247 ? 'Open 24/7' : 'Open Daily'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <Users className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Doctors</p>
                                  <p className="font-semibold">{doctorCount || 'Available'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <CreditCard className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Payment</p>
                                  <p className="font-semibold">Cash, Cards, UPI</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                                <span className="font-medium">Walk-ins supported</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto flex flex-col gap-4 border-t pt-5 xl:flex-row xl:items-center xl:justify-between">
                            <a
                              href={`tel:${location.phone}`}
                              className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                            >
                              <Phone className="h-4 w-4 text-primary" />
                              {location.phone}
                            </a>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" asChild>
                                <Link to={`/locations/${location.id}`}>
                                  <CalendarCheck className="mr-1.5 h-4 w-4" />
                                  Details
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a href={getDirectionsUrl(location)} target="_blank" rel="noreferrer">
                                  <Navigation className="mr-1.5 h-4 w-4" />
                                  Directions
                                </a>
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a href={`tel:${location.phone}`}>
                                  <Phone className="mr-1.5 h-4 w-4" />
                                  Call
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-primary-foreground mb-2">
                Need Care Now?
              </h2>
              <p className="text-primary-foreground/90">
                Walk in to any Docty clinic or call us for help choosing the nearest location.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-8">
              <a href="tel:+919989804888">
                <Phone className="h-5 w-5 mr-2" />
                Call 99898 04888
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Clinic Areas in Hyderabad</h2>
            <p className="text-muted-foreground mb-8">
              Conveniently located across the city for easy access to quality healthcare.
            </p>

            <div className="bg-card rounded-2xl border border-border p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {locations?.map((location) => (
                  <div key={location.id} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">{getAreaLabel(location)}</h4>
                    <span className="text-xs text-muted-foreground">{getCityLabel(location)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
