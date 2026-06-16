import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays } from 'date-fns';
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Phone,
  GraduationCap,
  Award,
  Languages,
  CheckCircle2,
  Calendar,
  Video,
  Building2,
  BadgeCheck,
  ChevronRight,
  Heart,
  Share2,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDoctor } from '@/generated/hooks/use-doctor';
import { useLocation } from '@/generated/hooks/use-location';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

// Generate time slots for a day
const generateTimeSlots = (date: Date) => {
  const slots = [];
  const baseHours = [9, 10, 11, 14, 15, 16, 17, 18, 19];
  for (const hour of baseHours) {
    slots.push({ time: `${hour}:00`, available: Math.random() > 0.3 });
    slots.push({ time: `${hour}:30`, available: Math.random() > 0.3 });
  }
  return slots;
};

// Generate dates for next 7 days
const generateDates = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(new Date(), i));
  }
  return dates;
};

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doctor, isLoading } = useDoctor(id || '');
  const { data: location } = useLocation(doctor?.location?.id || '');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<'clinic' | 'video'>('clinic');

  const dates = generateDates();
  const timeSlots = generateTimeSlots(selectedDate);

  const handleBookAppointment = () => {
    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }
    toast.success(`Appointment booked for ${format(selectedDate, 'MMM d')} at ${selectedTime}`);
    navigate('/book-appointment');
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
        <Button onClick={() => navigate('/')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  const servicesArray = doctor.servicesOffered?.split(',').map((s: string) => s.trim()) || [];

  return (
    <div className="flex flex-col pb-24">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground">Doctor Profile</span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 py-6"
      >
        {/* Doctor Info Card */}
        <motion.div variants={itemVariants}>
          <Card className="mb-6 overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-br from-accent/30 via-background to-primary/10 p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="w-28 h-28 md:w-36 md:h-36 border-4 border-background shadow-xl">
                    <AvatarImage src={doctor.imageURL || ''} alt={doctor.name1} className="object-cover" />
                    <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                      {doctor.name1.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                        {doctor.name1}
                      </h1>
                      <p className="text-lg" style={{ color: '#FE065C' }}>
                        {doctor.specialty}
                      </p>
                    </div>
                    {doctor.rating && (
                      <div className="flex items-center gap-1.5 bg-accent px-3 py-1.5 rounded-full">
                        <Star className="h-5 w-5 fill-accent-foreground text-accent-foreground" />
                        <span className="font-bold text-accent-foreground">{doctor.rating}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-muted-foreground mt-2">{doctor.qualifications}</p>

                  <div className="flex flex-wrap gap-3 mt-4">
                    <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {doctor.experienceYears} Years Exp
                    </Badge>
                    {doctor.registrationNumber && (
                      <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {doctor.registrationNumber}
                      </Badge>
                    )}
                    {doctor.languages && (
                      <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                        <Languages className="h-3.5 w-3.5" />
                        {doctor.languages}
                      </Badge>
                    )}
                  </div>

                  {location && (
                    <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{location.name1}, {location.area}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Consultation Fee Strip */}
            <div className="bg-muted/50 px-6 py-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" style={{ color: '#0BB8FC' }} />
                <span className="text-muted-foreground">Consultation Fee</span>
              </div>
              <span className="text-xl font-bold text-foreground">₹{doctor.consultationFee || 500}</span>
            </div>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - About & Services */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            {/* About Section */}
            {doctor.bio && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-foreground">
                    <Award className="h-5 w-5" style={{ color: '#FE065C' }} />
                    About
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{doctor.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Services Offered */}
            {servicesArray.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4 text-foreground">Services Offered</h2>
                  <div className="flex flex-wrap gap-2">
                    {servicesArray.map((service: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="py-2 px-4 text-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" style={{ color: '#0BB8FC' }} />
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Clinic Info */}
            {location && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                    <Building2 className="h-5 w-5" style={{ color: '#0BB8FC' }} />
                    Clinic Information
                  </h2>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-8 w-8" style={{ color: '#FE065C' }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{location.name1}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-4 w-4" style={{ color: '#0BB8FC' }} />
                            <span className="text-muted-foreground">{location.phone}</span>
                          </div>
                          {location.open247 && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Open 24/7
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Right Column - Booking */}
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold mb-4 text-foreground">Book Appointment</h2>

                {/* Consultation Type */}
                <div className="mb-6">
                  <Tabs
                    value={consultationType}
                    onValueChange={(v) => setConsultationType(v as 'clinic' | 'video')}
                  >
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="clinic" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        In-Clinic
                      </TabsTrigger>
                      <TabsTrigger value="video" className="gap-2">
                        <Video className="h-4 w-4" />
                        Video
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Date Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                    <Calendar className="h-4 w-4" style={{ color: '#FE065C' }} />
                    Select Date
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {dates.map((date) => {
                      const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                          }}
                          className={cn(
                            'flex flex-col items-center min-w-[60px] p-3 rounded-xl border-2 transition-all',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:border-primary/50 bg-background text-foreground'
                          )}
                        >
                          <span className={cn('text-xs', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>
                            {isToday ? 'Today' : format(date, 'EEE')}
                          </span>
                          <span className="text-lg font-bold">{format(date, 'd')}</span>
                          <span className={cn('text-xs', isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>
                            {format(date, 'MMM')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                    <Clock className="h-4 w-4" style={{ color: '#0BB8FC' }} />
                    Available Slots
                  </h3>
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {timeSlots.map((slot) => (
                        <motion.button
                          key={slot.time}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={cn(
                            'py-2 px-3 rounded-lg text-sm font-medium transition-all',
                            !slot.available && 'opacity-40 cursor-not-allowed line-through bg-muted text-muted-foreground',
                            slot.available && selectedTime !== slot.time && 'border border-border hover:border-primary/50 bg-background text-foreground',
                            selectedTime === slot.time && 'bg-primary text-primary-foreground'
                          )}
                        >
                          {slot.time}
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Fee Summary */}
                <div className="bg-muted/50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span className="text-xl font-bold text-foreground">₹{doctor.consultationFee || 500}</span>
                  </div>
                  {selectedTime && (
                    <div className="mt-2 pt-2 border-t border-border flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Selected</span>
                      <span className="font-medium text-foreground">
                        {format(selectedDate, 'MMM d')} at {selectedTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Book Button */}
                <Button
                  onClick={handleBookAppointment}
                  disabled={!selectedTime}
                  className="w-full rounded-full h-12 text-base font-semibold"
                  style={{ backgroundColor: '#FE065C' }}
                >
                  Book Appointment
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>

                {/* Next Available */}
                {doctor.nextAvailableSlot && (
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Next Available: <span className="font-medium text-foreground">{doctor.nextAvailableSlot}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
