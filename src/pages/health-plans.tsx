import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Heart,
  Users,
  User,
  UsersRound,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  totalCareBenefits,
  totalCarePlans,
  type HealthPlan,
  type HealthPlanBenefitIcon,
  type HealthPlanIcon,
} from '@/data/health-plans';
import { submitClinicLead } from '@/lib/clinic-leads';

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

const benefitIcons: Record<HealthPlanBenefitIcon, React.ElementType> = {
  consultation: Stethoscope,
  pharmacy: Pill,
  lab: TestTube,
  booking: Calendar,
  offers: Gift,
  tests: Shield,
};

const planIcons: Record<HealthPlanIcon, React.ElementType> = {
  individual: User,
  couple: Heart,
  family: Users,
  'extended-family': UsersRound,
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN').format(amount);

export default function HealthPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<HealthPlan | null>(null);
  const [patientName, setPatientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInterestDialogOpen, setIsInterestDialogOpen] = useState(false);
  const [interestedName, setInterestedName] = useState('');
  const [interestedPhone, setInterestedPhone] = useState('');
  const [isInterestSubmitting, setIsInterestSubmitting] = useState(false);

  const openPlanDialog = (plan: HealthPlan) => {
    setSelectedPlan(plan);
    setPatientName('');
    setContactNumber('');
  };

  const handlePlanSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlan || !patientName.trim() || !contactNumber.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[0-9]{10}$/.test(contactNumber.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitClinicLead({
        type: 'subscription',
        serviceCategory: 'Consultation',
        patientName,
        patientMobile: contactNumber,
        interest: selectedPlan.name,
        source: 'Health plans page',
        metadata: { planId: selectedPlan.id },
      });
      setSelectedPlan(null);
      toast.success(
        `Thank you ${patientName}! We'll call you shortly to confirm your ${selectedPlan.name} annual subscription.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInterestDialog = () => {
    setInterestedName('');
    setInterestedPhone('');
    setIsInterestDialogOpen(true);
  };

  const handleInterestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!interestedName.trim() || !interestedPhone.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!/^[0-9]{10}$/.test(interestedPhone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsInterestSubmitting(true);
    try {
      await submitClinicLead({
        type: 'subscription-interest',
        serviceCategory: 'Consultation',
        patientName: interestedName,
        patientMobile: interestedPhone,
        interest: 'Docty Total Care membership',
        source: 'Health plans general enquiry',
      });
      setIsInterestDialogOpen(false);
      toast.success(
        `Thank you ${interestedName}! We'll call you shortly about Docty Total Care membership.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit your request.');
    } finally {
      setIsInterestSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b pt-32 pb-16">
        <div className="absolute inset-0">
          <img
            src="/docty-clinic-consultation.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/96 via-background/88 to-background/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(254,6,92,0.10),transparent_36%),radial-gradient(circle_at_82%_70%,rgba(11,184,252,0.10),transparent_38%)]" />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge variant="secondary" className="mb-4">
              <Star className="h-3.5 w-3.5 mr-1.5" />
              Annual Subscription Plans
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span style={{ color: '#FE065C' }}>Docty</span>{' '}
              <span style={{ color: '#0BB8FC' }}>Total Care</span>{' '}
              Plans
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose the healthcare plan that fits your family's needs and enjoy year-round access to trusted care at Docty Clinics.
            </p>
            <div className="mt-6 inline-flex flex-col items-center rounded-md border bg-background/95 px-6 py-4 shadow-sm backdrop-blur sm:flex-row sm:gap-3">
              <span className="text-sm font-medium text-muted-foreground">Potential annual savings with Docty Total Care</span>
              <span className="text-2xl font-bold" style={{ color: '#FE065C' }}>
                Up to ₹{formatCurrency(Math.max(...totalCarePlans.map((plan) => plan.estimatedAnnualSavings)))}
              </span>
            </div>
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
            {totalCareBenefits.map((benefit) => {
              const Icon = benefitIcons[benefit.icon];
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

      {/* Annual Subscription Plans */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Annual Subscription Plans</h2>
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
            {totalCarePlans.map((plan) => {
              const Icon = planIcons[plan.icon];
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
                      <div className="mb-4 rounded-md bg-primary/5 px-3 py-2">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Potential annual savings
                        </p>
                        <p className="text-lg font-bold text-primary">
                          Up to ₹{formatCurrency(plan.estimatedAnnualSavings)}
                        </p>
                      </div>
                      <div className="flex items-baseline justify-center gap-1 mb-6">
                        <span className="text-4xl font-bold" style={{ color: '#FE065C' }}>
                          ₹{formatCurrency(plan.price)}
                        </span>
                        <span className="text-muted-foreground">/ Year</span>
                      </div>
                      <Button 
                        type="button"
                        size="lg" 
                        className={`w-full rounded-full ${
                          plan.popular ? '' : 'bg-accent text-accent-foreground hover:bg-accent/90'
                        }`}
                        variant={plan.popular ? 'default' : 'secondary'}
                        onClick={() => openPlanDialog(plan)}
                      >
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
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
              <Button
                type="button"
                size="lg"
                className="rounded-full px-8"
                onClick={openInterestDialog}
              >
                Become a Member
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                <a href="tel:+919989804888">Call 99898 04888</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] sm:max-w-3xl">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-left">
                  <span className="block text-2xl font-bold">{selectedPlan.name}</span>
                  <span className="mt-1 block text-sm font-medium text-muted-foreground">
                    {selectedPlan.subtitle} · Annual Subscription
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-7 md:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <div className="rounded-md border bg-muted/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Annual subscription
                        </p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-primary">
                            ₹{formatCurrency(selectedPlan.price)}
                          </span>
                          <span className="text-sm text-muted-foreground">/ year</span>
                        </div>
                      </div>
                      <Badge variant="secondary">{selectedPlan.members}</Badge>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {selectedPlan.description}
                    </p>
                    <div className="mt-4 rounded-md bg-background px-4 py-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Potential annual savings
                      </p>
                      <p className="text-xl font-bold text-primary">
                        Up to ₹{formatCurrency(selectedPlan.estimatedAnnualSavings)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-semibold">Features included</h3>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {totalCareBenefits.map((benefit) => {
                        const BenefitIcon = benefitIcons[benefit.icon];
                        return (
                          <li key={benefit.title} className="flex items-start gap-3 rounded-md border p-3">
                            <BenefitIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                            <div>
                              <p className="text-sm font-semibold">{benefit.title}</p>
                              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                {benefit.description}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <form onSubmit={handlePlanSubmit} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">Request subscription</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Our team will call you to confirm member details and activate the plan.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subscription-patient-name">Patient Name</Label>
                    <Input
                      id="subscription-patient-name"
                      placeholder="Enter patient full name"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subscription-contact-number">Contact Number</Label>
                    <Input
                      id="subscription-contact-number"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Enter 10-digit mobile number"
                      value={contactNumber}
                      onChange={(event) => setContactNumber(event.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="rounded-md bg-muted/50 p-4 text-sm">
                    <p className="text-muted-foreground">Selected subscription</p>
                    <p className="mt-1 font-semibold text-foreground">{selectedPlan.name}</p>
                    <p className="text-primary">
                      {selectedPlan.members} · ₹{formatCurrency(selectedPlan.price)}/year
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Potential savings up to ₹{formatCurrency(selectedPlan.estimatedAnnualSavings)} annually
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedPlan(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Request Callback'}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isInterestDialogOpen} onOpenChange={setIsInterestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">
              <span className="block text-xl font-bold">Interested in Docty Total Care?</span>
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                Share your details and our team will help you choose an annual subscription.
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleInterestSubmit} className="mt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interested-patient-name">Patient Name</Label>
              <Input
                id="interested-patient-name"
                placeholder="Enter patient full name"
                value={interestedName}
                onChange={(event) => setInterestedName(event.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interested-contact-number">Contact Number</Label>
              <Input
                id="interested-contact-number"
                type="tel"
                inputMode="numeric"
                placeholder="Enter 10-digit mobile number"
                value={interestedPhone}
                onChange={(event) => setInterestedPhone(event.target.value)}
                className="h-12"
              />
            </div>
            <div className="rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">
              No plan selection is required. Our team will explain the available individual, couple, and family subscriptions.
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsInterestDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isInterestSubmitting}>
                {isInterestSubmitting ? 'Submitting...' : 'I am Interested'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
