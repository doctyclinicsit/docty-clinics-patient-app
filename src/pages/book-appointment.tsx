import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Clock,
  MapPin,
  Search,
  Star,
  Stethoscope,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import { useLocationList } from '@/generated/hooks/use-location';
import {
  DEFAULT_CONSULTATION_FEE,
  getEkaPublicDoctorExperience,
} from '@/lib/eka-api';
import type { Doctor } from '@/generated/models/doctor-model';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
} as const;

interface FaceDetectorResult {
  boundingBox: DOMRectReadOnly;
}

interface FaceDetectorLike {
  detect(image: HTMLImageElement): Promise<FaceDetectorResult[]>;
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function AutoHeadshotImage({ src, alt }: { src: string; alt: string }) {
  const [objectPosition, setObjectPosition] = useState('center 18%');

  const handleLoad = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const FaceDetector = (window as unknown as { FaceDetector?: FaceDetectorConstructor }).FaceDetector;

    if (!FaceDetector || !image.naturalWidth || !image.naturalHeight) {
      return;
    }

    try {
      const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(image);
      const face = faces[0]?.boundingBox;

      if (!face) return;

      const focusX = clamp(((face.x + face.width / 2) / image.naturalWidth) * 100, 35, 65);
      const focusY = clamp(((face.y + face.height * 0.2) / image.naturalHeight) * 100, 8, 32);

      setObjectPosition(`${focusX.toFixed(1)}% ${focusY.toFixed(1)}%`);
    } catch {
      setObjectPosition('center 18%');
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin="anonymous"
      onLoad={handleLoad}
      className="w-full h-full object-cover transition-[object-position] duration-300"
      style={{ objectPosition }}
    />
  );
}

const serviceAliases: Record<string, string[]> = {
  'primary care': ['general physician', 'general medicine', 'family physician', 'consultation'],
  consultation: ['general physician', 'general medicine', 'consultation'],
  dental: ['dentist', 'dental', 'orthodontics', 'oral'],
  physiotherapy: ['physiotherapist', 'physiotherapy', 'physical therapy', 'rehabilitation'],
  specialist: ['specialist'],
  'top specialists': ['specialist'],
  'day care': ['day care', 'procedure', 'surgery'],
};

function normalizeFilterText(value?: string) {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesSelectedService(
  doctor: { specialty?: string; servicesOffered?: string },
  selectedService: string
) {
  if (!selectedService) return true;

  const normalizedService = normalizeFilterText(selectedService);
  const doctorSearchText = normalizeFilterText(
    [doctor.specialty, doctor.servicesOffered].filter(Boolean).join(' ')
  );
  const aliases = Object.entries(serviceAliases).find(([key]) => normalizedService.includes(key))?.[1] || [];
  const terms = [normalizedService, ...aliases].map(normalizeFilterText).filter(Boolean);

  return terms.some((term) => doctorSearchText.includes(term));
}

function DoctorExperience({ doctor }: { doctor: Doctor }) {
  const { data: publicExperience, isLoading } = useQuery({
    queryKey: ['doctor-public-experience', doctor.id, doctor.publicProfileSlug],
    queryFn: () =>
      getEkaPublicDoctorExperience(doctor.publicProfileSlug, doctor.id),
    enabled: Boolean(doctor.publicProfileSlug) && doctor.experienceYears <= 0,
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
  const experienceYears = publicExperience || doctor.experienceYears;

  if (experienceYears > 0) {
    return <>{experienceYears} yrs exp</>;
  }

  return <>{isLoading ? 'Loading experience...' : 'Experience not specified'}</>;
}

export default function BookAppointmentPage() {
  const [searchParams] = useSearchParams();
  const { data: doctors, isLoading: doctorsLoading } = useDoctorList();
  const { data: locations } = useLocationList();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'all');
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || '');

  const specialties = useMemo(() => {
    if (!doctors) return [];
    return [...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean))].sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];

    return doctors.filter((doctor) => {
      const searchLower = searchQuery.toLowerCase();
      const doctorLocations = doctor.locations?.length
        ? doctor.locations
        : doctor.location
          ? [doctor.location]
          : [];
      const matchesSearch =
        searchQuery === '' ||
        doctor.name1.toLowerCase().includes(searchLower) ||
        doctor.specialty?.toLowerCase().includes(searchLower) ||
        doctor.servicesOffered?.toLowerCase().includes(searchLower) ||
        doctorLocations.some((location) => location.name1?.toLowerCase().includes(searchLower));
      const matchesSpecialty = selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;
      const matchesLocation =
        selectedLocation === 'all' ||
        doctorLocations.some((location) => location.id === selectedLocation);
      const matchesService = matchesSelectedService(doctor, selectedService);

      return matchesSearch && matchesSpecialty && matchesLocation && matchesService;
    });
  }, [doctors, searchQuery, selectedSpecialty, selectedLocation, selectedService]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setSelectedLocation('all');
    setSelectedService('');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedSpecialty !== 'all' ||
    selectedLocation !== 'all' ||
    selectedService !== '';

  return (
    <div className="flex min-w-0 max-w-full flex-col overflow-x-clip bg-background">
      <section className="pt-24 pb-12 bg-gradient-to-r from-primary/5 via-background to-accent/10" />

      <section className="py-8 border-b bg-background sticky top-16 z-40">
        <div className="container mx-auto min-w-0 max-w-full px-4">
          <div className="grid min-w-0 grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
            <div className="relative min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, speciality, services, or location..."
                className="h-12 min-w-0 max-w-full rounded-lg border-border bg-background pl-11 text-sm shadow-sm"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="h-12 w-full min-w-0 max-w-full rounded-lg border-border bg-background shadow-sm lg:w-[200px]">
                <Stethoscope className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-12 w-full min-w-0 max-w-full rounded-lg border-border bg-background shadow-sm lg:w-[200px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations
                  ?.filter((location) => location.id)
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name1}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">Filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="max-w-full min-w-0 gap-1">
                  <span className="truncate">"{searchQuery}"</span>
                  <button type="button" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedSpecialty !== 'all' && (
                <Badge variant="secondary" className="max-w-full min-w-0 gap-1">
                  <span className="truncate">{selectedSpecialty}</span>
                  <button type="button" onClick={() => setSelectedSpecialty('all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedLocation !== 'all' && (
                <Badge variant="secondary" className="max-w-full min-w-0 gap-1">
                  <span className="truncate">
                    {locations?.find((location) => location.id === selectedLocation)?.name1}
                  </span>
                  <button type="button" onClick={() => setSelectedLocation('all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedService && (
                <Badge variant="secondary" className="max-w-[calc(100%_-_5.5rem)] min-w-0 gap-1 sm:max-w-full">
                  <span className="truncate">Service: {selectedService}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedService('')}
                    aria-label={`Remove ${selectedService} service filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto shrink-0 rounded-full">
                Clear all
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto min-w-0 max-w-full px-4">
          <div className="mb-7">
            <p className="text-foreground">
              {doctorsLoading ? (
                'Loading doctors...'
              ) : (
                <>
                  Showing <span className="font-semibold">{filteredDoctors.length}</span>{' '}
                  {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}
                </>
              )}
            </p>
          </div>

          {doctorsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card key={item} className="overflow-hidden rounded-2xl">
                  <div className="h-64 bg-muted animate-pulse" aria-hidden="true" />
                  <CardContent className="p-5 space-y-3">
                    <div className="h-6 bg-muted rounded animate-pulse w-3/4" aria-hidden="true" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" aria-hidden="true" />
                    <div className="h-10 bg-muted rounded-full animate-pulse" aria-hidden="true" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDoctors.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No doctors found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search or filters.</p>
              <Button variant="outline" onClick={clearFilters} className="rounded-full">
                Clear All Filters
              </Button>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {filteredDoctors.map((doctor) => (
                <motion.div key={doctor.id} variants={itemVariants} className="min-w-0 max-w-full">
                  <Card className="h-full min-w-0 max-w-full overflow-hidden rounded-2xl border-border transition-shadow hover:shadow-lg">
                    <div className="relative h-60 overflow-hidden bg-muted">
                      {doctor.imageURL ? (
                        <AutoHeadshotImage src={doctor.imageURL} alt={doctor.name1} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center">
                          <Stethoscope className="h-16 w-16 text-primary/40" />
                        </div>
                      )}
                      {doctor.isAvailable && (
                        <Badge className="absolute top-6 right-4 rounded-full bg-accent text-accent-foreground px-3 py-1">
                          Available
                        </Badge>
                      )}
                    </div>

                    <CardContent className="flex min-w-0 flex-1 flex-col p-5">
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 break-words text-lg font-bold text-foreground">{doctor.name1}</h3>
                        <p className="mb-2 break-words font-medium" style={{ color: '#0BB8FC' }}>
                          {doctor.specialty}
                        </p>

                        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium text-foreground">{(doctor.rating || 4.8).toFixed(1)}</span>
                          </div>
                          <span className="min-w-0 text-muted-foreground">
                            <DoctorExperience doctor={doctor} />
                          </span>
                        </div>

                        {(doctor.locations?.length || doctor.location) && (
                          <div className="mb-3 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="min-w-0 break-words">
                              {doctor.locations?.length
                                ? doctor.locations.map((location) => location.name1).join(', ')
                                : doctor.location?.name1}
                            </span>
                          </div>
                        )}

                        <div className="mb-4 flex min-w-0 items-start gap-2 text-sm">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="shrink-0 text-muted-foreground">Next:</span>
                          <span
                            className="min-w-0 break-words font-medium"
                            style={{ color: doctor.nextAvailableSlot ? '#FE065C' : undefined }}
                          >
                            {doctor.nextAvailableSlot || 'All slots booked, contact for availability'}
                          </span>
                        </div>

                        <div className="text-lg font-bold mb-5" style={{ color: '#FE065C' }}>
                          ₹{new Intl.NumberFormat('en-IN').format(
                            doctor.consultationFee ?? DEFAULT_CONSULTATION_FEE
                          )}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            per consultation
                          </span>
                        </div>
                      </div>

                      <Button asChild className="w-full rounded-full h-10">
                        <Link to={`/doctor/${doctor.id}`}>Book Now</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
