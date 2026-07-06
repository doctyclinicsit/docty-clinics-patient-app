import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceList } from '@/generated/hooks/use-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uniqueServices } from '@/lib/service-utils';
import { ServiceIcon } from '@/components/service-icon';
import {
  groupServicesByCategory,
  isServiceCategoryId,
  serviceCategories,
  type ServiceCategoryId,
} from '@/lib/service-categories';

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

function getDentalServiceFocus(serviceName: string) {
  const name = serviceName.toLowerCase();

  if (name.includes('crown')) {
    return ['Tooth and crown suitability assessment', 'Crown material and treatment planning', 'Fit, bite and appearance evaluation', 'Care and maintenance guidance'];
  }
  if (name.includes('bridge')) {
    return ['Missing-tooth and supporting-teeth assessment', 'Bridge design and material discussion', 'Fit and bite evaluation', 'Cleaning and maintenance guidance'];
  }
  if (name.includes('denture')) {
    return ['Oral and missing-teeth assessment', 'Denture fit and comfort evaluation', 'Bite and chewing-function review', 'Adjustment and denture-care guidance'];
  }
  if (name.includes('restoration') || name.includes('filling') || name.includes('cavity')) {
    return ['Tooth-decay or damage assessment', 'Restoration material discussion', 'Tooth shape and bite evaluation', 'Aftercare and prevention guidance'];
  }
  if (name.includes('root canal') || name.includes('rct')) {
    return ['Pain and affected-tooth assessment', 'Root canal suitability evaluation', 'Treatment-stage explanation', 'Restoration and aftercare planning'];
  }
  if (name.includes('whitening')) {
    return ['Tooth shade and stain assessment', 'Whitening suitability review', 'Expected-result discussion', 'Sensitivity and aftercare guidance'];
  }
  if (name.includes('cleaning') || name.includes('scaling') || name.includes('hygiene')) {
    return ['Plaque, tartar and gum assessment', 'Cleaning or scaling requirement review', 'Oral-hygiene guidance', 'Follow-up care recommendations'];
  }
  if (
    name.includes('gum') ||
    name.includes('periodont') ||
    name.includes('bleeding')
  ) {
    return ['Gum-health and inflammation assessment', 'Pocketing and bleeding review', 'Personalised gum-care planning', 'Maintenance and follow-up guidance'];
  }
  if (name.includes('extraction')) {
    return ['Tooth and surrounding-area assessment', 'Extraction need and complexity review', 'Pain-control and procedure discussion', 'Post-extraction care guidance'];
  }
  if (name.includes('wisdom tooth')) {
    return ['Wisdom-tooth position assessment', 'Symptoms and surrounding-tissue review', 'Extraction or referral planning', 'Pain and aftercare guidance'];
  }
  if (name.includes('child') || name.includes('children') || name.includes('pediatric')) {
    return ['Age-appropriate oral examination', 'Cavity and gum-health screening', 'Preventive care guidance', 'Parent and child oral-hygiene education'];
  }
  if (name.includes('trauma')) {
    return ['Dental injury assessment', 'Tooth stability and soft-tissue review', 'Urgency and treatment planning', 'Follow-up and protection guidance'];
  }
  if (name.includes('screening') || name.includes('check-up') || name.includes('checkup')) {
    return ['Teeth and gum examination', 'Cavity and oral-disease screening', 'Bite and oral-function review', 'Personalised treatment recommendations'];
  }
  if (name.includes('toothache')) {
    return ['Pain history and tooth assessment', 'Likely-cause evaluation', 'Immediate relief planning', 'Definitive treatment recommendations'];
  }
  if (name.includes('referral') || name.includes('coordination')) {
    return ['Clinical assessment and case review', 'Specialist referral guidance', 'Treatment coordination', 'Follow-up planning'];
  }

  return ['Oral-health assessment', 'Procedure suitability review', 'Treatment options discussion', 'Aftercare guidance'];
}

function getServiceFocus(serviceName: string) {
  const name = serviceName.toLowerCase();
  const includesAny = (terms: string[]) => terms.some((term) => name.includes(term));
  const dentalKeywords = [
    'dental', 'tooth', 'teeth', 'dentur', 'cavity', 'gum', 'periodont',
    'root canal', 'rct', 'oral health', 'oral hygiene',
  ];

  if (dentalKeywords.some((keyword) => name.includes(keyword))) {
    return getDentalServiceFocus(serviceName);
  }

  if (includesAny(['physio', 'rehab', 'therapy', 'pain', 'posture', 'mobility', 'exercise', 'strength', 'arthritis', 'joint', 'muscle', 'ligament', 'tendon', 'fracture'])) {
    return ['Symptoms and movement assessment', 'Mobility, strength and function review', 'Personalised therapy planning', 'Recovery and home-care guidance'];
  }
  if (includesAny(['pregnan', 'maternity', 'menopause', 'pcos', 'pcod', 'gynaec', 'ovarian', 'fibroid', 'fertility', 'reproductive', 'period', 'breast', 'family planning', 'vaginal', 'abortion'])) {
    return ['Relevant health-history review', 'Symptoms and risk-factor assessment', 'Investigation or treatment planning', 'Preventive and follow-up guidance'];
  }
  if (includesAny(['anxiety', 'depression', 'stress', 'psychiatr', 'schizophrenia', 'counselling', 'de-addiction', 'psychological'])) {
    return ['Confidential mental-health assessment', 'Symptoms and daily-function review', 'Counselling or treatment planning', 'Progress monitoring and follow-up'];
  }
  if (includesAny(['vaccin', 'immun'])) {
    return ['Vaccination history review', 'Age and eligibility assessment', 'Dose and schedule guidance', 'Post-vaccination care advice'];
  }
  if (includesAny(['iv fluid', 'infusion', 'injection'])) {
    return ['Clinical need and hydration assessment', 'Therapy suitability review', 'Supervised administration planning', 'Response monitoring and aftercare'];
  }
  if (includesAny(['day care', 'admission', 'procedure'])) {
    return ['Pre-procedure clinical assessment', 'Day-care suitability review', 'Procedure and monitoring plan', 'Discharge and follow-up guidance'];
  }
  if (includesAny(['screening', 'profile', 'check-up', 'checkup', 'preventive'])) {
    return ['Health-history and risk review', 'Relevant screening assessment', 'Results and health-marker discussion', 'Preventive follow-up recommendations'];
  }
  if (includesAny(['diabetes', 'asthma', 'geriatric', 'fever', 'cold', 'medication', 'consultation', 'headache', 'migraine', 'epilepsy', 'autoimmune', 'rheumatoid'])) {
    return ['Symptoms and medical-history review', 'Clinical examination and risk assessment', 'Medication or care-plan discussion', 'Monitoring and follow-up guidance'];
  }
  if (includesAny(['ear', 'nose', 'sinus', 'throat', 'voice', 'neck treatment'])) {
    return ['Symptom and medical-history review', 'Focused ENT assessment', 'Investigation or treatment planning', 'Prevention and follow-up guidance'];
  }
  if (includesAny(['liver', 'gastric', 'stomach', 'gerd', 'acid ref', 'gallstone', 'nutrition'])) {
    return ['Digestive-health history review', 'Symptoms and lifestyle assessment', 'Investigation or treatment planning', 'Diet and follow-up guidance'];
  }
  if (includesAny(['pediatric', 'new born', 'growth', 'school kids'])) {
    return ['Age-appropriate health assessment', 'Growth, development or symptom review', 'Care and treatment planning', 'Parent guidance and follow-up'];
  }
  if (includesAny(['workplace', 'ergonomic', 'fitness'])) {
    return ['Activity and workplace-needs assessment', 'Posture, movement and risk review', 'Personalised improvement plan', 'Prevention and follow-up guidance'];
  }
  if (includesAny(['pharmacy', 'medication'])) {
    return ['Prescription or medicine review', 'Usage and dosage guidance', 'Interaction and safety checks', 'Storage and adherence guidance'];
  }

  return ['Health concern and history review', 'Clinical suitability assessment', 'Personalised care planning', 'Follow-up and preventive guidance'];
}

const problemSearchTerms: Array<{ problems: string[]; serviceTerms: string[] }> = [
  { problems: ['tooth pain', 'toothache', 'cavity', 'teeth pain'], serviceTerms: ['toothache', 'cavity', 'root canal', 'dental check-up', 'filling'] },
  { problems: ['bleeding gums', 'gum pain', 'swollen gums'], serviceTerms: ['gum', 'periodontitis', 'cleaning', 'scaling'] },
  { problems: ['missing tooth', 'missing teeth'], serviceTerms: ['denture', 'bridge', 'crown'] },
  { problems: ['yellow teeth', 'stained teeth'], serviceTerms: ['whitening', 'cleaning'] },
  { problems: ['back pain', 'lower back pain'], serviceTerms: ['back pain', 'posture', 'manual therapy', 'exercise therapy'] },
  { problems: ['neck pain', 'stiff neck'], serviceTerms: ['neck pain', 'posture', 'manual therapy'] },
  { problems: ['knee pain'], serviceTerms: ['knee pain', 'arthritis', 'joint pain', 'physiotherapy'] },
  { problems: ['shoulder pain'], serviceTerms: ['shoulder pain', 'joint pain', 'manual therapy'] },
  { problems: ['sports injury', 'sprain', 'ligament injury'], serviceTerms: ['sports injury', 'ligament', 'tendon', 'rehabilitation'] },
  { problems: ['pregnancy back pain', 'post pregnancy pain'], serviceTerms: ['pregnancy-related back pain', 'postpartum rehabilitation', 'women health physiotherapy'] },
  { problems: ['irregular periods', 'period problem'], serviceTerms: ['irregular periods', 'pcos', 'pcod', 'gynaecology'] },
  { problems: ['pregnancy care', 'maternity'], serviceTerms: ['pregnancy', 'maternity', 'pre-pregnancy'] },
  { problems: ['menopause'], serviceTerms: ['menopause'] },
  { problems: ['fertility problem', 'trying to conceive'], serviceTerms: ['fertility', 'reproductive health'] },
  { problems: ['anxiety', 'panic', 'worry'], serviceTerms: ['anxiety', 'counselling', 'psychiatric evaluation'] },
  { problems: ['depression', 'low mood'], serviceTerms: ['depression', 'counselling', 'psychiatric evaluation'] },
  { problems: ['stress', 'work stress'], serviceTerms: ['stress management', 'counselling'] },
  { problems: ['fever'], serviceTerms: ['fever', 'consultation', 'general medication'] },
  { problems: ['cold', 'cough'], serviceTerms: ['cold', 'consultation', 'pediatrics'] },
  { problems: ['asthma', 'breathing problem'], serviceTerms: ['asthma', 'consultation'] },
  { problems: ['diabetes', 'high sugar'], serviceTerms: ['diabetes', 'consultation'] },
  { problems: ['headache', 'migraine'], serviceTerms: ['headache', 'migraine', 'consultation'] },
  { problems: ['ear pain', 'hearing problem'], serviceTerms: ['ear treatment'] },
  { problems: ['sinus', 'blocked nose'], serviceTerms: ['nose', 'sinus'] },
  { problems: ['throat pain', 'voice problem'], serviceTerms: ['throat', 'voice'] },
  { problems: ['acidity', 'acid reflux', 'heartburn'], serviceTerms: ['acid reflux', 'gerd', 'gastric'] },
  { problems: ['fatty liver', 'liver problem'], serviceTerms: ['fatty liver', 'liver management'] },
  { problems: ['vaccination', 'vaccine'], serviceTerms: ['vaccination'] },
  { problems: ['child health', 'baby care'], serviceTerms: ['pediatrics', 'new born care', 'growth and development'] },
];

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function serviceMatchesSearch(serviceName: string, description: string | undefined, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const focus = getServiceFocus(serviceName);
  const searchableText = normalizeSearchText(
    [serviceName, description, ...focus].filter(Boolean).join(' ')
  );
  if (searchableText.includes(normalizedQuery)) return true;

  const queryWords = normalizedQuery.split(' ').filter((word) => word.length > 2);
  if (queryWords.length && queryWords.every((word) => searchableText.includes(word))) {
    return true;
  }

  const relatedTerms = problemSearchTerms
    .filter(({ problems }) =>
      problems.some((problem) => {
        const normalizedProblem = normalizeSearchText(problem);
        return (
          normalizedQuery.includes(normalizedProblem) ||
          normalizedProblem.includes(normalizedQuery)
        );
      })
    )
    .flatMap(({ serviceTerms }) => serviceTerms.map(normalizeSearchText));

  return relatedTerms.some((term) => searchableText.includes(term));
}

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: services, isLoading } = useServiceList({ orderBy: ['displayOrder asc'] });
  const displayedServices = useMemo(() => uniqueServices(services), [services]);
  const [searchQuery, setSearchQuery] = useState('');
  const categoryParameter = searchParams.get('category');
  const selectedCategory = isServiceCategoryId(categoryParameter)
    ? categoryParameter
    : null;
  const filteredServices = useMemo(
    () =>
      displayedServices.filter((service) =>
        serviceMatchesSearch(service.name1, service.description, searchQuery)
      ),
    [displayedServices, searchQuery]
  );
  const groupedServices = useMemo(
    () => groupServicesByCategory(displayedServices),
    [displayedServices]
  );
  const availableCategories = useMemo(
    () => serviceCategories.filter((category) => (groupedServices.get(category.id)?.length || 0) > 0),
    [groupedServices]
  );
  const selectedCategoryDetails = serviceCategories.find((category) => category.id === selectedCategory);
  const visibleServices = searchQuery
    ? filteredServices
    : selectedCategory
      ? groupedServices.get(selectedCategory) || []
      : [];

  const selectCategory = (categoryId: ServiceCategoryId) => {
    setSearchParams({ category: categoryId });
    requestAnimationFrame(() => {
      document.getElementById('services-browser')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b pt-32 pb-16">
        <div className="absolute inset-0">
          <img
            src="/docty-clinic-treatment.jpg"
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
      <section id="services-browser" className="scroll-mt-20 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-3xl">
            <Label htmlFor="service-search" className="mb-2 block text-sm font-semibold">
              What care do you need?
            </Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
              <Input
                id="service-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Describe a problem or search a service, e.g. tooth pain, back pain, vaccination..."
                className="h-14 rounded-2xl border-accent/30 bg-background pl-12 pr-12 shadow-sm focus-visible:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
                  aria-label="Clear service search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && !isLoading && filteredServices.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Showing {filteredServices.length} related {filteredServices.length === 1 ? 'service' : 'services'}.
              </p>
            )}
          </div>

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
          ) : !searchQuery && !selectedCategory ? (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold md:text-3xl">Browse by care category</h2>
                <p className="mt-2 text-sm text-muted-foreground md:text-base">
                  Start with a category, then choose the specific service you need.
                </p>
              </div>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {availableCategories.map((category) => {
                  const categoryServices = groupedServices.get(category.id) || [];
                  return (
                    <motion.div key={category.id} variants={itemVariants}>
                      <button
                        type="button"
                        onClick={() => selectCategory(category.id)}
                        className="h-full w-full text-left"
                      >
                        <Card className="group h-full gap-0 rounded-2xl py-0 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                          <CardContent className="flex h-full flex-col p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
                                <ServiceIcon serviceName={category.iconService} className="h-11 w-11" />
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {categoryServices.length}{' '}
                                {categoryServices.length === 1 ? 'service' : 'services'}
                              </Badge>
                            </div>
                            <h3 className="mt-5 text-xl font-bold transition-colors group-hover:text-primary">
                              {category.name}
                            </h3>
                            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                              {category.description}
                            </p>
                            <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">
                              View Services
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                          </CardContent>
                        </Card>
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            </>
          ) : (
            <>
              {!searchQuery && selectedCategoryDetails && (
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="-ml-3 mb-2 rounded-full"
                      onClick={() => setSearchParams({})}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      All categories
                    </Button>
                    <h2 className="text-2xl font-bold md:text-3xl">
                      {selectedCategoryDetails.name}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedCategoryDetails.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {visibleServices.length}{' '}
                    {visibleServices.length === 1 ? 'service' : 'services'}
                  </Badge>
                </div>
              )}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {visibleServices.map((service) => {
                const serviceFocus = getServiceFocus(service.name1);
                
                return (
                  <motion.div key={service.id} variants={itemVariants}>
                    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
                            <ServiceIcon serviceName={service.name1} className="h-11 w-11" />
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
                        {serviceFocus.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Service focus
                            </p>
                          <ul className="space-y-2">
                            {serviceFocus.map((benefit) => (
                              <li key={benefit} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                                <span className="text-foreground">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                          </div>
                        )}
                        <Button asChild variant="outline" className="w-full mt-4 rounded-full">
                          <Link
                            to={
                              service.name1.toLowerCase().includes('pharmacy')
                                ? '/pharmacy'
                                : `/book-appointment?service=${encodeURIComponent(service.name1)}`
                            }
                          >
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
            </>
          )}

          {!isLoading && searchQuery && filteredServices.length === 0 && (
            <Card className="mx-auto max-w-2xl rounded-3xl border-dashed">
              <CardContent className="p-10 text-center">
                <Search className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-bold">No matching services found</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try describing the main symptom differently, or call us and we’ll guide you to the right care.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button variant="outline" className="rounded-full" onClick={() => setSearchQuery('')}>
                    Clear Search
                  </Button>
                  <Button asChild className="rounded-full">
                    <a href="tel:+919989804888">Call 99898 04888</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
