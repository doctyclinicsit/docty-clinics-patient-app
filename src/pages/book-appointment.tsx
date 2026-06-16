import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Star,
  Clock,
  Stethoscope,
  Building2,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import { useLocationList } from '@/generated/hooks/use-location';

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

export default function BookAppointmentPage() {
  const { data: doctors, isLoading: doctorsLoading } = useDoctorList();
  const { data: locations } = useLocationList();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Get unique specialties from doctors
  const specialties = useMemo(() => {
    if (!doctors) return [];
    const uniqueSpecialties = [...new Set(doctors.map((d) => d.specialty).filter(Boolean))];
    return uniqueSpecialties.sort();
  }, [doctors]);

  // Filter doctors based on search and filters
  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];

    return doctors.filter((doctor) => {
      // Search by name, specialty, or location
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        doctor.name1.toLowerCase().includes(searchLower) ||
        doctor.specialty?.toLowerCase().includes(searchLower) ||
        doctor.location?.name1?.toLowerCase().includes(searchLower);

      // Filter by specialty
      const matchesSpecialty =
        selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;

      // Filter by location
      const matchesLocation =
        selectedLocation === 'all' || doctor.location?.id === selectedLocation;

      return matchesSearch && matchesSpecialty && matchesLocation;
    });
  }, [doctors, searchQuery, selectedSpecialty, selectedLocation]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setSelectedLocation('all');
  };

  const hasActiveFilters =
    searchQuery !== '' || selectedSpecialty !== 'all' || selectedLocation !== 'all';

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(254,6,92,0.06),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(11,184,252,0.06),transparent_50%)]" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-4">
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              Find Your Doctor
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Book Your{' '}
              <span style={{ color: '#FE065C' }}>Appointment</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Search by doctor name, specialty, or location to find the right healthcare provider
              for you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-8 border-b bg-card sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, specialty, or location..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />
            </div>

            {/* Specialty Filter */}
            <Select
              value={selectedSpecialty}
              onValueChange={(val: string) => setSelectedSpecialty(val)}
            >
              <SelectTrigger className="w-full md:w-[200px] h-12">
                <Stethoscope className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((specialty: string) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select
              value={selectedLocation}
              onValueChange={(val: string) => setSelectedLocation(val)}
            >
              <SelectTrigger className="w-full md:w-[200px] h-12">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations
                  ?.filter((loc) => loc.id)
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name1}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="lg"
                onClick={clearFilters}
                className="h-12 gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedSpecialty !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {selectedSpecialty}
                  <button onClick={() => setSelectedSpecialty('all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedLocation !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {locations?.find((l) => l.id === selectedLocation)?.name1}
                  <button onClick={() => setSelectedLocation('all')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Results Count */}
          <div className="mb-6">
            <p className="text-muted-foreground">
              {doctorsLoading ? (
                'Loading doctors...'
              ) : (
                <>
                  Showing <span className="font-semibold text-foreground">{filteredDoctors.length}</span>{' '}
                  {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}
                  {hasActiveFilters && ' matching your criteria'}
                </>
              )}
            </p>
          </div>

          {doctorsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" aria-hidden="true" />
                  <CardContent className="p-5 space-y-3">
                    <div className="h-6 bg-muted rounded animate-pulse w-3/4" aria-hidden="true" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" aria-hidden="true" />
                    <div className="h-10 bg-muted rounded animate-pulse" aria-hidden="true" />
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
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filters to find more doctors.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredDoctors.map((doctor) => (
                <motion.div key={doctor.id} variants={itemVariants}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                    {/* Doctor Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={
                          doctor.imageURL ||
                          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop'
                        }
                        alt={doctor.name1}
                        className="w-full h-full object-cover"
                      />
                      {doctor.isAvailable && (
                        <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">
                          Available
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-5 flex-1 flex flex-col">
                      {/* Doctor Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1 text-foreground">
                          {doctor.name1}
                        </h3>
                        <p style={{ color: '#0BB8FC' }} className="font-medium mb-2">
                          {doctor.specialty}
                        </p>

                        {/* Rating & Experience */}
                        <div className="flex items-center gap-4 mb-3 text-sm">
                          {doctor.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium text-foreground">
                                {doctor.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                          <span className="text-muted-foreground">
                            {doctor.experienceYears} yrs exp
                          </span>
                        </div>

                        {/* Location */}
                        {doctor.location && (
                          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{doctor.location.name1}</span>
                          </div>
                        )}

                        {/* Next Available */}
                        {doctor.nextAvailableSlot && (
                          <div className="flex items-center gap-2 mb-4 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Next: </span>
                            <span style={{ color: '#FE065C' }} className="font-medium">
                              {doctor.nextAvailableSlot}
                            </span>
                          </div>
                        )}

                        {/* Consultation Fee */}
                        {doctor.consultationFee && (
                          <div className="text-lg font-bold mb-4" style={{ color: '#FE065C' }}>
                            ₹{doctor.consultationFee}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              per consultation
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Book Now Button */}
                      <Button asChild className="w-full rounded-full">
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
