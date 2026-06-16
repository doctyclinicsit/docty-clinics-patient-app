import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Heart,
  Users,
  User,
  UsersRound,
  CheckCircle2,
  ArrowRight,
  Star,
  Sparkles,
  Shield,
  Pill,
  TestTube,
  Calendar,
  Gift,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

const benefits = [
  {
    icon: Stethoscope,
    title: 'Unlimited Consultations',
    description: 'General Physician, Dental & Physiotherapy',
  },
  {
    icon: Pill,
    title: '20% Pharmacy Discount',
    description: 'On all branded medicines',
  },
  {
    icon: TestTube,
    title: 'Additional 20% Discount on Lab Tests',
    description: 'Over and above existing offers',
  },
  {
    icon: Calendar,
    title: 'Priority Appointment Booking',
    description: 'With Specialists & Surgeons',
  },
  {
    icon: Gift,
    title: 'Exclusive Member-Only Promotional Offers',
    description: 'Special deals and discounts',
  },
  {
    icon: Shield,
    title: 'Free Health Tests Included',
    description: 'CBP, FBS, RBS, Glucose & Blood Grouping',
  },
];

const plans = [
  {
    id: 'docty-me',
    name: 'Docty Me',
    subtitle: 'Individual Plan',
    description: 'Perfect for individuals seeking affordable year-round healthcare support.',
    price: 999,
    icon: User,
    members: '1 Member',
    popular: false,
  },
  {
    id: 'docty-us',
    name: 'Docty Us',
    subtitle: 'Couple Plan',
    description: 'Designed for couples to stay healthy together with unlimited consultations and healthcare benefits.',
    price: 1799,
    icon: Heart,
    members: '2 Members',
    popular: true,
  },
  {
    id: 'docty-we',
    name: 'Docty We',
    subtitle: 'Family Plan',
    description: 'Ideal for small families with healthcare coverage for parents and children.',
    price: 2399,
    icon: Users,
    members: '3 Members',
    popular: false,
  },
  {
    id: 'docty-all',
    name: 'Docty All',
    subtitle: 'Extended Family Plan',
    description: 'Comprehensive healthcare support for larger families with maximum savings and benefits.',
    price: 2999,
    icon: UsersRound,
    members: '4 Members',
    popular: false,
  },
];

export default function HealthPlansPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(254,6,92,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(11,184,252,0.08),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-4">
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Annual Membership Plans
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span style={{ color: '#FE065C' }}>Docty</span>{' '}
              <span style={{ color: '#0BB8FC' }}>Total Care</span>{' '}
              Plans
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose the healthcare plan that fits your family's needs and enjoy year-round access to trusted care at Docty Clinics.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Why Choose{' '}
              <span style={{ color: '#FE065C' }}>Docty</span>{' '}
              <span style={{ color: '#0BB8FC' }}>Total Care</span>?
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div key={benefit.title} variants={itemVariants}>
                  <Card className="h-full border-2 border-transparent hover:border-primary/20 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-accent text-accent-foreground flex-shrink-0">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Membership Plans */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Membership Plans</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the plan that best suits your healthcare needs
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <motion.div key={plan.id} variants={itemVariants}>
                  <Card className={`h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden ${
                    plan.popular 
                      ? 'border-2 border-primary ring-2 ring-primary/20' 
                      : 'border-2 border-border hover:border-accent/50'
                  }`}>
                    {plan.popular && (
                      <div className="absolute top-0 right-0">
                        <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                          Most Popular
                        </div>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                        plan.popular 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-accent text-accent-foreground'
                      }`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <CardTitle className="text-xl">
                        <span style={{ color: '#FE065C' }}>{plan.name.split(' ')[0]}</span>{' '}
                        <span style={{ color: '#0BB8FC' }}>{plan.name.split(' ')[1]}</span>
                      </CardTitle>
                      <CardDescription className="font-medium text-foreground">
                        {plan.subtitle}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-4">
                        <Badge variant="secondary" className="mb-4">
                          {plan.members}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6 min-h-[60px]">
                        {plan.description}
                      </p>
                      <div className="flex items-baseline justify-center gap-1 mb-6">
                        <span className="text-4xl font-bold" style={{ color: '#FE065C' }}>₹{plan.price}</span>
                        <span className="text-muted-foreground">/ Year</span>
                      </div>
                      <Button 
                        asChild 
                        size="lg" 
                        className={`w-full rounded-full ${
                          plan.popular ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'
                        }`}
                        variant={plan.popular ? 'default' : 'secondary'}
                      >
                        <Link to="/book-appointment">
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(254,6,92,0.06),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(11,184,252,0.06),transparent_40%)]" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-6">
              <Sparkles className="h-8 w-8" style={{ color: '#FE065C' }} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Smartest{' '}
              <span style={{ color: '#FE065C' }}>₹999</span>{' '}
              You'll Spend in a Year
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              At Docty Clinics, we believe quality healthcare should be accessible, affordable, and available whenever you need it. Our annual healthcare memberships are designed to help you and your family save more while staying healthier throughout the year.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link to="/book-appointment">
                  Become a Member
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <a href="tel:+919989804888">Call 99898 04888</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
