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
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceList } from '@/generated/hooks/use-service';
import { Skeleton } from '@/components/ui/skeleton';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

const serviceDetails: Record<string, { benefits: string[]; color: string }> = {
  'primary care': {
    benefits: [
      'General health consultations',
      'Chronic disease management',
      'Preventive care & screenings',
      'Health certificates & documentation',
    ],
    color: 'bg-primary',
  },
  'pharmacy': {
    benefits: [
      'Wide range of medications',
      'Prescription fulfillment',
      'OTC medicines & supplements',
      'Home delivery available',
    ],
    color: 'bg-accent',
  },
  'lab tests': {
    benefits: [
      'Blood tests & biochemistry',
      'Imaging & X-rays',
      'Quick turnaround reports',
      'Home sample collection',
    ],
    color: 'bg-accent',
  },
  'dental': {
    benefits: [
      'Routine checkups & cleaning',
      'Fillings & extractions',
      'Root canal treatment',
      'Cosmetic dentistry',
    ],
    color: 'bg-primary',
  },
  'physiotherapy': {
    benefits: [
      'Post-surgery rehabilitation',
      'Sports injury treatment',
      'Back & neck pain relief',
      'Mobility improvement programs',
    ],
    color: 'bg-primary',
  },
  'specialist': {
    benefits: [
      'Cardiology consultations',
      'Orthopedic care',
      'Dermatology services',
      'ENT specialist visits',
    ],
    color: 'bg-accent',
  },
  'day care': {
    benefits: [
      'Minor surgical procedures',
      'IV infusions & injections',
      'Wound care & dressing',
      'Observation & monitoring',
    ],
    color: 'bg-accent',
  },
  'top specialists': {
    benefits: [
      'Expert consultations',
      'Specialized treatments',
      'Second opinion services',
      'Multi-disciplinary care',
    ],
    color: 'bg-primary',
  },
  'health subscriptions': {
    benefits: [
      'Annual health plans',
      'Family coverage options',
      'Discounted consultations',
      'Priority booking',
    ],
    color: 'bg-primary',
  },
};

function getServiceDetails(serviceName: string) {
  const lowerName = serviceName.toLowerCase();
  for (const [key, value] of Object.entries(serviceDetails)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  return { benefits: [], color: 'bg-primary' };
}

export default function ServicesPage() {
  const { data: services, isLoading } = useServiceList({ orderBy: ['displayOrder asc'] });

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
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
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Multiple Services Open 24/7
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Comprehensive{' '}
              <span style={{ color: '#FE065C' }}>Healthcare Services</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              From primary care to specialized treatments, we provide everything your family needs under one roof.
            </p>
            <Button asChild size="lg" className="rounded-full">
              <Link to="/book-appointment">
                Book an Appointment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-[300px]">
                  <CardContent className="p-6">
                    <Skeleton className="h-14 w-14 rounded-xl mb-4" aria-hidden="true" />
                    <Skeleton className="h-6 w-3/4 mb-2" aria-hidden="true" />
                    <Skeleton className="h-4 w-full mb-4" aria-hidden="true" />
                    <Skeleton className="h-4 w-2/3" aria-hidden="true" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {services?.map((service) => {
                const Icon = serviceIcons[service.iconName?.toLowerCase() || 'stethoscope'] || Stethoscope;
                const details = getServiceDetails(service.name1);
                
                return (
                  <motion.div key={service.id} variants={itemVariants}>
                    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className={`w-14 h-14 rounded-xl ${details.color} text-primary-foreground flex items-center justify-center mb-3`}>
                            <Icon className="h-7 w-7" />
                          </div>
                          {service.available247 && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              24/7
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {service.name1}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm mb-4">
                          {service.description || 'Quality healthcare services for you and your family.'}
                        </p>
                        {details.benefits.length > 0 && (
                          <ul className="space-y-2">
                            {details.benefits.map((benefit: string, index: number) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                                <span className="text-foreground">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button asChild variant="outline" className="w-full mt-4 rounded-full">
                          <Link to={service.name1.toLowerCase().includes('pharmacy') ? '/pharmacy' : '/book-appointment'}>
                            {service.name1.toLowerCase().includes('pharmacy') ? 'Order Now' : 'Book Now'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold mb-4">
              Need Help Choosing a Service?
            </h2>
            <p className="text-muted-foreground mb-6">
              Our team is here to guide you to the right care. Call us or visit any of our clinics for a consultation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="rounded-full">
                <a href="tel:+919989804888">Call 99898 04888</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link to="/locations">Find a Clinic</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
