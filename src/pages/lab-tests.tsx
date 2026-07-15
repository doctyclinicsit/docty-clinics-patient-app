import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FlaskConical,
  HeartPulse,
  Info,
  Search,
  ShoppingCart,
  TestTube,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { submitClinicLead } from '@/lib/clinic-leads';
import { toast } from 'sonner';

interface LabTest {
  slug: string;
  shortName: string;
  fullName: string;
  category: string;
  sampleType: string;
  description: string;
  whyNeeded: string;
  preparation: string;
  price?: number | null;
  offerPrice?: number | null;
  displayOrder: number;
}

interface LabTestsResponse {
  tests: LabTest[];
  categories: string[];
  source: 'neon' | 'fallback' | 'fallback-error';
  warning?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
} as const;

async function fetchLabTests(): Promise<LabTestsResponse> {
  const response = await fetch('/api/lab-tests');
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Unable to load lab tests.');
  return body as LabTestsResponse;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesSearch(test: LabTest, query: string) {
  const search = normalize(query);
  if (!search) return true;
  const haystack = normalize(
    [
      test.shortName,
      test.fullName,
      test.category,
      test.sampleType,
      test.description,
      test.whyNeeded,
      test.preparation,
    ].join(' ')
  );
  return search.split(' ').filter(Boolean).every((word) => haystack.includes(word));
}

function formatLabPrice(price?: number | null) {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 'Price at clinic';
  return `₹${price.toLocaleString('en-IN')}`;
}

function getVisiblePrice(test?: Pick<LabTest, 'price' | 'offerPrice'> | null) {
  if (!test) return { primary: 'Price at clinic', secondary: '' };
  const hasOffer = typeof test.offerPrice === 'number' && Number.isFinite(test.offerPrice);
  const hasPrice = typeof test.price === 'number' && Number.isFinite(test.price);
  return {
    primary: hasOffer ? formatLabPrice(test.offerPrice) : formatLabPrice(test.price),
    secondary: hasOffer && hasPrice && test.price !== test.offerPrice ? formatLabPrice(test.price) : '',
  };
}

function getPayablePrice(test: Pick<LabTest, 'price' | 'offerPrice'>) {
  if (typeof test.offerPrice === 'number' && Number.isFinite(test.offerPrice)) return test.offerPrice;
  if (typeof test.price === 'number' && Number.isFinite(test.price)) return test.price;
  return 0;
}

function getRegularPrice(test: Pick<LabTest, 'price' | 'offerPrice'>) {
  if (typeof test.price === 'number' && Number.isFinite(test.price)) return test.price;
  return getPayablePrice(test);
}

export default function LabTestsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['lab-tests-catalog'],
    queryFn: fetchLabTests,
    staleTime: 1000 * 60 * 60 * 2,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cartItems, setCartItems] = useState<LabTest[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tests = data?.tests || [];
  const categories = useMemo(
    () => ['All', ...new Set((data?.categories || tests.map((test) => test.category)).filter(Boolean))],
    [data?.categories, tests]
  );
  const visibleTests = useMemo(
    () =>
      tests.filter((test) => {
        const categoryMatches = selectedCategory === 'All' || test.category === selectedCategory;
        return categoryMatches && matchesSearch(test, searchQuery);
      }),
    [searchQuery, selectedCategory, tests]
  );

  const cartTotals = useMemo(() => {
    const regularTotal = cartItems.reduce((total, item) => total + getRegularPrice(item), 0);
    const payableTotal = cartItems.reduce((total, item) => total + getPayablePrice(item), 0);
    return {
      regularTotal,
      payableTotal,
      savings: Math.max(regularTotal - payableTotal, 0),
    };
  }, [cartItems]);

  const isInCart = (test: LabTest) => cartItems.some((item) => item.slug === test.slug);

  const addToCart = (test: LabTest) => {
    setCartItems((items) => {
      if (items.some((item) => item.slug === test.slug)) return items;
      return [...items, test];
    });
    toast.success(`${test.shortName || test.fullName} added to cart.`);
  };

  const removeFromCart = (slug: string) => {
    setCartItems((items) => items.filter((item) => item.slug !== slug));
  };

  const handleRequestSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (cartItems.length === 0) {
      toast.error('Please add at least one lab test to the cart.');
      return;
    }
    if (!patientName.trim() || !patientPhone.trim()) {
      toast.error('Please fill in patient name and mobile number.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(patientPhone.replace(/\D/g, '').slice(-10))) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitClinicLead({
        type: 'service',
        serviceCategory: 'Lab Tests',
        patientName,
        patientMobile: patientPhone,
        interest: cartItems.map((item) => item.fullName).join(', '),
        source: 'Lab tests cart page',
        metadata: {
          itemCount: cartItems.length,
          totalPrice: cartTotals.regularTotal,
          offerTotal: cartTotals.payableTotal,
          savings: cartTotals.savings,
          labTests: cartItems.map((item) => ({
            labTestSlug: item.slug,
            shortName: item.shortName,
            fullName: item.fullName,
            category: item.category,
            price: item.price,
            offerPrice: item.offerPrice,
          })),
        },
      });
      toast.success(`Thank you ${patientName}! We'll call you shortly for ${cartItems.length} lab test${cartItems.length > 1 ? 's' : ''}.`);
      setCartItems([]);
      setPatientName('');
      setPatientPhone('');
      setIsCartOpen(false);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : 'Unable to submit your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <Button
        type="button"
        className="fixed right-4 top-20 z-[55] h-11 rounded-full shadow-lg md:right-6 md:top-24"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Cart
        {cartItems.length > 0 && (
          <span className="ml-2 rounded-full bg-primary-foreground px-2 py-0.5 text-xs font-bold text-primary">
            {cartItems.length}
          </span>
        )}
      </Button>

      <section className="relative overflow-hidden border-b pt-32 pb-16">
        <div className="absolute inset-0">
          <img
            src="/docty-clinic-lab-testing.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/96 via-background/88 to-background/55" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(254,6,92,0.10),transparent_36%),radial-gradient(circle_at_82%_70%,rgba(11,184,252,0.10),transparent_38%)]" />
        </div>

        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="mx-auto max-w-4xl text-center"
          >
            <Badge variant="secondary" className="mb-4">
              <TestTube className="mr-1.5 h-3.5 w-3.5" />
              Lab Test Catalogue
            </Badge>
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Understand the <span className="text-primary">tests</span> in your health checks
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Browse common Docty lab tests, their short names, full names, and why a clinician may recommend them.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
                <Database className="h-4 w-4 text-accent" />
                {data?.source === 'neon' ? 'Powered by Neon catalogue' : 'Starter catalogue active'}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Extra lab discounts for Docty TotalCare subscribers
              </div>
              <Button asChild className="rounded-full">
                <Link to="/packages">
                  Explore Health Checks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-b bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <Label htmlFor="lab-test-search" className="mb-2 block text-sm font-semibold">
              Search by short name, full name, or health concern
            </Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-accent" />
              <Input
                id="lab-test-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search CBC, HbA1c, thyroid, liver, fever, urine..."
                className="h-14 rounded-2xl bg-background pl-12 pr-12 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
                  aria-label="Clear lab test search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Card key={index} className="rounded-2xl">
                  <CardContent className="space-y-4 p-6">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="mx-auto max-w-2xl rounded-2xl">
              <CardContent className="p-8 text-center">
                <Info className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h2 className="text-xl font-bold">Unable to load lab tests</h2>
                <p className="mt-2 text-muted-foreground">
                  {error instanceof Error ? error.message : 'Please try again shortly.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">All Lab Tests</h2>
                  <p className="text-sm text-muted-foreground">
                    Showing {visibleTests.length} of {tests.length} tests.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {data?.warning && (
                    <Badge variant="outline" className="rounded-full">
                      Neon fallback active
                    </Badge>
                  )}
                </div>
              </div>

              {visibleTests.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No matching tests found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try searching with a short name like HbA1c, CBC/CBP, LFT, CRP or thyroid.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                >
                  {visibleTests.map((test) => {
                    const visiblePrice = getVisiblePrice(test);
                    const alreadyInCart = isInCart(test);
                    return (
                    <motion.div key={test.slug} variants={itemVariants}>
                      <Card className="h-full rounded-2xl border-border/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <CardContent className="flex h-full flex-col p-6">
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <FlaskConical className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="secondary" className="rounded-full">
                                {test.category}
                              </Badge>
                              <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
                                {visiblePrice.primary}
                                {visiblePrice.secondary && (
                                  <span className="ml-2 text-xs font-semibold text-muted-foreground line-through">
                                    {visiblePrice.secondary}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                          <div>
                            {test.shortName && (
                              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                                {test.shortName}
                              </p>
                            )}
                            <h3 className={test.shortName ? 'mt-1 text-xl font-bold leading-tight' : 'text-xl font-bold leading-tight'}>
                              {test.fullName}
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {test.description}
                            </p>
                          </div>
                          <div className="mt-5 flex-1 space-y-3 rounded-xl bg-muted/50 p-4">
                            <div className="flex gap-2">
                              <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <p className="text-sm">
                                <span className="font-semibold">Why needed: </span>
                                <span className="text-muted-foreground">{test.whyNeeded}</span>
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                              <p className="text-sm">
                                <span className="font-semibold">Sample: </span>
                                <span className="text-muted-foreground">{test.sampleType}</span>
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">{test.preparation}</p>
                          </div>
                          <Button
                            type="button"
                            variant={alreadyInCart ? 'secondary' : 'outline'}
                            className="mt-5 rounded-full"
                            onClick={() => addToCart(test)}
                            disabled={alreadyInCart}
                          >
                            {alreadyInCart ? 'Added to cart' : 'Add to cart'}
                            <ShoppingCart className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Lab test cart
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="rounded-2xl bg-muted/60 p-8 text-center">
                <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-semibold">Your lab test cart is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add tests from the catalogue and request them together.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => {
                  const visiblePrice = getVisiblePrice(item);
                  return (
                    <div key={item.slug} className="flex items-start gap-3 rounded-2xl border bg-background p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.shortName && (
                            <Badge variant="secondary" className="rounded-full">
                              {item.shortName}
                            </Badge>
                          )}
                          <Badge variant="outline" className="rounded-full">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="mt-2 font-semibold leading-snug">{item.fullName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Sample: {item.sampleType}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-bold text-accent">
                          {visiblePrice.primary}
                        </span>
                        {visiblePrice.secondary && (
                          <span className="text-xs font-semibold text-muted-foreground line-through">
                            {visiblePrice.secondary}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                          onClick={() => removeFromCart(item.slug)}
                          aria-label={`Remove ${item.fullName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-2xl bg-muted/60 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tests selected</span>
                    <span className="font-semibold">{cartItems.length}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated total</span>
                    <span className="font-bold">{formatLabPrice(cartTotals.payableTotal)}</span>
                  </div>
                  {cartTotals.savings > 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Potential savings</span>
                      <span className="font-bold text-primary">{formatLabPrice(cartTotals.savings)}</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Final confirmation, sample collection timing, and payment will be handled by the clinic team.
                  </p>
                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs font-semibold text-primary">
                    Docty TotalCare subscribers receive an additional lab-test discount at billing.
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lab-patient-name">Patient Name</Label>
              <Input
                id="lab-patient-name"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="Enter patient full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-patient-phone">Contact Number</Label>
              <Input
                id="lab-patient-phone"
                value={patientPhone}
                onChange={(event) => setPatientPhone(event.target.value)}
                placeholder="Enter 10-digit mobile number"
                inputMode="numeric"
                type="tel"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsCartOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || cartItems.length === 0}>
                {isSubmitting ? 'Submitting...' : 'Request Callback'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
