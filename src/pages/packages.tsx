import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Package,
  ArrowRight,
  CheckCircle2,
  Users,
  UserRound,
  Baby,
  Heart,
  Sparkles,
  Stethoscope,
  Zap,
  FlaskConical,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHealthPackageList } from '@/generated/hooks/use-health-package';
import { HealthPackageTargetAudienceKeyToLabel } from '@/generated/models/health-package-model';
import type { HealthPackageTargetAudienceKey } from '@/generated/models/health-package-model';
import { Skeleton } from '@/components/ui/skeleton';

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

const audienceIcons: Record<string, React.ElementType> = {
  'Women': Heart,
  'Men': UserRound,
  'Children': Baby,
  'Seniors': Users,
  'All Ages': Sparkles,
};

const packageBenefits: Record<string, string[]> = {
  'monsoon': [
    'Complete blood count',
    'Dengue & malaria screening',
    'Immunity check panel',
    'Vitamin D & B12 levels',
    'Doctor consultation',
  ],
  'women': [
    'Hormonal profile test',
    'Thyroid function test',
    'Anemia screening',
    'Bone density check',
    'Gynecologist consultation',
  ],
  'men': [
    'Cardiac risk assessment',
    'Liver function test',
    'Kidney function test',
    'PSA screening',
    'Physician consultation',
  ],
  'child': [
    'Growth assessment',
    'Vaccination review',
    'Vision & hearing test',
    'Developmental screening',
    'Pediatrician consultation',
  ],
  'senior': [
    'Cardiac evaluation',
    'Diabetes screening',
    'Arthritis assessment',
    'Memory screening',
    'Geriatric consultation',
  ],
};

function getPackageBenefits(packageName: string): string[] {
  const lowerName = packageName.toLowerCase();
  for (const [key, benefits] of Object.entries(packageBenefits)) {
    if (lowerName.includes(key)) {
      return benefits;
    }
  }
  return [
    'Comprehensive health check',
    'Blood tests & diagnostics',
    'Doctor consultation',
    'Health report & analysis',
  ];
}

function getPackageColor(index: number): string {
  const colors = ['bg-primary', 'bg-accent', 'bg-primary', 'bg-accent', 'bg-primary'];
  return colors[index % colors.length];
}

export default function PackagesPage() {
  const { data: packages, isLoading } = useHealthPackageList();

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
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Health Checkup Packages
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span style={{ color: '#FE065C' }}>Health Packages</span>{' '}
              & Campaigns
            </h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive health checkups designed for every stage of life. Early detection, better prevention.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Features Highlight */}
      <section className="py-12 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-6"
          >
            {[
              {
                icon: Stethoscope,
                title: 'Doctor Consultations',
                description: 'All packages include expert doctor consultation',
                color: 'primary',
              },
              {
                icon: Zap,
                title: 'Quickest Turnaround',
                description: 'Experience fast results with Docty Quickcare Labs',
                color: 'accent',
              },
              {
                icon: FlaskConical,
                title: 'In-House Processing',
                description: 'Samples processed in our own certified labs',
                color: 'primary',
              },
              {
                icon: Clock,
                title: 'Available 24/7',
                description: 'Book and access services any time, any day',
                color: 'accent',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} variants={itemVariants}>
                  <Card className="text-center h-full border-2 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                        feature.color === 'primary' ? 'bg-primary/10' : 'bg-accent/10'
                      }`}>
                        <Icon className={`h-7 w-7 ${feature.color === 'primary' ? 'text-primary' : 'text-accent'}`} />
                      </div>
                      <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="h-[450px]">
                  <Skeleton className="h-48 w-full" aria-hidden="true" />
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" aria-hidden="true" />
                    <Skeleton className="h-8 w-1/2 mb-4" aria-hidden="true" />
                    <Skeleton className="h-4 w-full mb-2" aria-hidden="true" />
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
              {packages?.map((pkg, index) => {
                const audienceLabel = HealthPackageTargetAudienceKeyToLabel[pkg.targetAudienceKey as HealthPackageTargetAudienceKey];
                const Icon = audienceIcons[audienceLabel] || Sparkles;
                const benefits = getPackageBenefits(pkg.name1);
                const bgColor = getPackageColor(index);
                
                return (
                  <motion.div key={pkg.id} variants={itemVariants}>
                    <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={pkg.imageUrl || 'https://cdn.hubblecontent.osi.office.net/m365content/publish/b2ee3d70-ec5d-42db-bcda-92692f1aa1d5/thumbnails/large.jpg'}
                          alt={pkg.name1}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute top-4 left-4">
                          <Badge className={`${bgColor} text-primary-foreground`}>
                            <Icon className="h-3.5 w-3.5 mr-1" />
                            {audienceLabel}
                          </Badge>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-xl font-bold text-white mb-1">{pkg.name1}</h3>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-white">₹{pkg.priceINR}</span>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground mb-4">
                          {pkg.description || 'Complete health screening package with expert consultation.'}
                        </p>
                        <ul className="space-y-2 mb-5">
                          {benefits.map((benefit: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                              <span className="text-foreground">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                        <Button asChild className="w-full rounded-full">
                          <Link to="/book-appointment">
                            Book Now
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



      {/* CTA */}
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
              Ready to Take Control of Your Health?
            </h2>
            <p className="text-muted-foreground mb-6">
              Book your health package today and get expert insights into your well-being.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/book-appointment">
                  Book a Package
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <a href="tel:+919989804888">Call for Assistance</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
