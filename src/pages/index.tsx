import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Stethoscope,
  Pill,
  Microscope,
  Smile,
  Activity,
  Users,
  Bed,
  Heart,
  Clock,
  Building2,
  BadgeCheck,
  Sparkles,
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
  X,
  AlertCircle,
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
import { toast } from 'sonner';
import { useServiceList } from '@/generated/hooks/use-service';
import { useLocationList } from '@/generated/hooks/use-location';
import { useHealthPackageList } from '@/generated/hooks/use-health-package';
import { useHealthPlanList } from '@/generated/hooks/use-health-plan';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import { HealthPackageTargetAudienceKeyToLabel } from '@/generated/models/health-package-model';
import type { HealthPackageTargetAudienceKey } from '@/generated/models/health-package-model';

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

const serviceIcons: Record<string, React.ElementType> = {
  stethoscope: Stethoscope,
  pill: Pill,
  microscope: Microscope,
  smile: Smile,
  activity: Activity,
  users: Users,
  bed: Bed,
  heart: Heart,
};

const trustIndicators = [
  { icon: BadgeCheck, label: 'Qualified Doctors', value: '50+' },
  { icon: Users, label: 'Happy Patients', value: '10,000+' },
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

export default function HomePage() {
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services } = useServiceList({ orderBy: ['displayOrder asc'] });
  const { data: locations } = useLocationList();
  const { data: packages } = useHealthPackageList();
  const { data: plans } = useHealthPlanList();
  const { data: doctors } = useDoctorList({ filter: 'isAvailable eq true' });

  const featuredPlan = plans?.find((p) => p.name1.toLowerCase().includes('total care'));

  const openLeadDialog = (service: string) => {
    setSelectedService(service);
    setLeadName('');
    setLeadPhone('');
    setIsLeadDialogOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[0-9]{10}$/.test(leadPhone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setIsLeadDialogOpen(false);
    toast.success(`Thank you ${leadName}! We'll call you shortly for your ${selectedService} appointment.`);
  };

  return (
    <div className="flex flex-col pt-24 md:pt-26">
      {/* Hero Section - Trust Building with Booking Focus */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent" />
        
        <div className="container mx-auto px-4 py-12 lg:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6 lg:space-y-8"
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

              {/* Quick Booking Card */}
              <motion.div
                variants={itemVariants}
                className="bg-card rounded-2xl border-2 border-primary/20 p-6 shadow-lg"
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
                </div>
              </motion.div>

              {/* Emergency Call */}
              <motion.div variants={itemVariants} className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">Emergency Helpline</div>
                    <a href="tel:+919989804888" className="font-bold text-primary text-lg">
                      99898 04888
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Side - Trust Building Imagery */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="relative hidden lg:block"
            >
              {/* Main Image */}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://cdn.hubblecontent.osi.office.net/m365content/publish/b2ee3d70-ec5d-42db-bcda-92692f1aa1d5/thumbnails/large.jpg"
                    alt="Caring doctor with patient at Docty Clinics"
                    className="w-full h-[520px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>

                {/* Floating Trust Card */}
                <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl p-4 shadow-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground">Trusted by</div>
                      <div className="text-2xl font-bold text-primary">10,000+</div>
                      <div className="text-xs text-muted-foreground">Families in Hyderabad</div>
                    </div>
                  </div>
                </div>

                {/* 24/7 Badge */}
                <div className="absolute top-6 right-6 bg-primary text-primary-foreground rounded-2xl p-4 shadow-lg">
                  <div className="text-3xl font-bold">24/7</div>
                  <div className="text-sm opacity-90">Always Open</div>
                </div>

                {/* Secondary Image */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-2xl overflow-hidden shadow-xl border-4 border-background">
                  <img
                    src="https://cdn.hubblecontent.osi.office.net/m365content/publish/58044694-9de2-46ec-923b-360d52a8fa67/thumbnails/large.jpg"
                    alt="Clinic reception"
                    className="w-full h-full object-cover"
                  />
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
              Our Services
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive healthcare services designed for your convenience
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          >
            {services?.slice(0, 8).map((service) => {
              const Icon = serviceIcons[service.iconName?.toLowerCase() || 'stethoscope'] || Stethoscope;
              return (
                <motion.div key={service.id} variants={itemVariants}>
                  <Link to="/services">
                    <Card className="text-center h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 cursor-pointer group">
                      <CardContent className="p-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto mb-4 flex items-center justify-center">
                          <Icon className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{service.name1}</h3>
                        {service.available247 && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            24/7
                          </Badge>
                        )}
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
                View All Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

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
              Our <span className="text-primary">Doctors</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              Experienced and qualified medical professionals ready to care for you
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {doctors?.slice(0, 6).map((doctor) => (
              <motion.div key={doctor.id} variants={itemVariants}>
                <Link to={`/doctor/${doctor.id}`}>
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
                            <span>{doctor.experienceYears} years exp</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Booking Section */}
                      <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-muted-foreground">Next Available</div>
                            <div className="font-semibold text-foreground text-sm flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {doctor.nextAvailableSlot || 'Today'}
                            </div>
                          </div>
                          <Button size="sm" className="rounded-full px-4">
                            Book Now
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
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
      <section id="locations" className="py-16 bg-muted/30 scroll-mt-24">
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
                        <Link to="/locations">
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
      {featuredPlan && (
        <section className="py-16 bg-gradient-to-r from-primary/5 via-background to-accent/5">
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
                  <span className="text-5xl font-bold text-primary">₹{featuredPlan.pricePerYearINR}</span>
                  <span className="text-muted-foreground">/year</span>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">Unlimited GP, Dental & Physio Consultations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">20% Discount on Pharmacy Purchases</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">Additional 20% Discount on Lab Tests</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">Priority Booking with Specialists & Surgeons</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">Free Health Tests (CBP, FBS, RBS & more)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">Exclusive Member-Only Promotional Offers</span>
                  </li>
                </ul>

                <Button asChild size="lg" className="rounded-full px-8">
                  <Link to="/health-plans">
                    Become a Member
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div variants={itemVariants} className="relative hidden lg:block">
                <img
                  src="https://cdn.hubblecontent.osi.office.net/m365content/publish/2dbbf6a3-24f0-4131-9f28-159f7948f471/thumbnails/large.jpg"
                  alt="Happy family with Docty Total Care"
                  className="rounded-3xl shadow-xl w-full h-[400px] object-cover"
                />
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Health Packages */}
      <section id="packages" className="py-16 scroll-mt-24">
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
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
            className="grid md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {packages?.map((pkg) => (
              <motion.div key={pkg.id} variants={itemVariants}>
                <Link to="/packages">
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 cursor-pointer">
                    <div className="h-44 relative overflow-hidden">
                      <img
                        src={pkg.imageUrl || 'https://cdn.hubblecontent.osi.office.net/m365content/publish/b2ee3d70-ec5d-42db-bcda-92692f1aa1d5/thumbnails/large.jpg'}
                        alt={pkg.name1}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <Badge variant="secondary" className="text-xs mb-2">
                          {HealthPackageTargetAudienceKeyToLabel[pkg.targetAudienceKey as HealthPackageTargetAudienceKey]}
                        </Badge>
                        <h3 className="font-bold text-white text-sm leading-tight">{pkg.name1}</h3>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">₹{pkg.priceINR}</span>
                        <Button size="sm" className="rounded-full">Book</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
      <section className="py-16 bg-primary text-primary-foreground">
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

      {/* Lead Capture Dialog */}
      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold">Book {selectedService}</div>
                <div className="text-sm font-normal text-muted-foreground">We'll call you to confirm</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeadSubmit} className="space-y-4 mt-4">
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
            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Our team will call you within 5 minutes to confirm your appointment for <span className="font-medium text-foreground">{selectedService}</span>.
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
    </div>
  );
}
