import { motion } from 'motion/react';
import {
  MapPin,
  Clock,
  Phone,
  Navigation,
  Building2,
  Stethoscope,
  Pill,
  Microscope,
  Smile,
  Activity,
  Bed,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocationList } from '@/generated/hooks/use-location';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';

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

const serviceIcons: Record<string, LucideIcon> = {
  'Primary Care': Stethoscope,
  'Pharmacy': Pill,
  'Lab Tests': Microscope,
  'Dental': Smile,
  'Physiotherapy': Activity,
  'Day Care Services': Bed,
  'Top Specialists': Users,
};

export default function LocationsPage() {
  const { data: locations, isLoading } = useLocationList();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="pt-28 pb-12 bg-gradient-to-br from-background via-background to-muted relative overflow-hidden">
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
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              4 Clinics Across Hyderabad
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find a{' '}
              <span style={{ color: '#FE065C' }}>Docty Clinic</span>{' '}
              Near You
            </h1>
            <p className="text-lg text-muted-foreground">
              Quality healthcare in your neighbourhood. Multiple locations across Hyderabad for your convenience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" aria-hidden="true" />
                  <CardContent className="p-6">
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
              className="grid md:grid-cols-2 gap-8"
            >
              {locations?.map((location) => (
                <motion.div key={location.id} variants={itemVariants}>
                  <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    {/* Clinic Image */}
                    <div className="relative h-52 overflow-hidden">
                      {location.imageUrl ? (
                        <img
                          src={location.imageUrl}
                          alt={location.name1}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-muted flex items-center justify-center">
                          <div className="text-center">
                            <span className="text-3xl font-bold" style={{ color: '#FE065C' }}>Docty</span>
                            <span className="text-2xl font-semibold block" style={{ color: '#0BB8FC' }}>Clinics</span>
                          </div>
                        </div>
                      )}
                      {location.open247 && (
                        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold">
                          OPEN 24/7
                        </Badge>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <h3 className="text-xl font-bold text-white">{location.name1}</h3>
                        <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                          {location.area}
                        </Badge>
                      </div>
                    </div>

                    {/* Details */}
                    <CardContent className="p-6">
                      {/* Address */}
                      <div className="flex items-start gap-3 mb-4">
                        <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-muted-foreground leading-relaxed">
                          {location.address}
                        </p>
                      </div>

                      {/* Contact & Hours */}
                      <div className="flex flex-wrap gap-4 mb-5">
                        <a
                          href={`tel:${location.phone}`}
                          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                        >
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="font-medium">{location.phone}</span>
                        </a>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-accent" />
                          <span className="font-medium text-foreground">
                            {location.open247 ? 'Open 24/7' : 'Open Daily'}
                          </span>
                        </div>
                      </div>

                      {/* Services */}
                      {location.services && (
                        <div className="mb-5">
                          <h4 className="text-sm font-semibold text-foreground mb-3">Services Available</h4>
                          <div className="flex flex-wrap gap-2">
                            {location.services.split(',').map((service: string) => {
                              const serviceName = service.trim();
                              const Icon = serviceIcons[serviceName] || Stethoscope;
                              return (
                                <Badge
                                  key={serviceName}
                                  variant="outline"
                                  className="flex items-center gap-1.5 py-1.5 px-3"
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {serviceName}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-full"
                          onClick={() => {
                            const searchQuery = encodeURIComponent(location.address || '');
                            window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank');
                          }}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Get Directions
                        </Button>
                        <Button
                          className="flex-1 rounded-full"
                          asChild
                        >
                          <a href={`tel:${location.phone}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call Clinic
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Emergency CTA */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-primary-foreground mb-2">
                Need Emergency Care?
              </h2>
              <p className="text-primary-foreground/90">
                Walk in to any of our 24/7 clinics or call us immediately.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-full px-8"
            >
              <a href="tel:+919989804888">
                <Phone className="h-5 w-5 mr-2" />
                Call 99898 04888
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-4">All Locations in Hyderabad</h2>
            <p className="text-muted-foreground mb-8">
              Conveniently located across the city for easy access to quality healthcare
            </p>
            
            <div className="bg-card rounded-2xl border border-border p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {locations?.map((location) => (
                  <div key={location.id} className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm">{location.area}</h4>
                    <span className="text-xs text-muted-foreground">
                      {location.open247 ? '24/7' : 'Daily'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}