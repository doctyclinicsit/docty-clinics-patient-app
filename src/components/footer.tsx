import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { DoctyLogo } from './docty-logo';
import { useLocationList } from '@/generated/hooks/use-location';

const services = [
  { label: 'Primary Care', href: '/services' },
  { label: 'Pharmacy', href: '/services' },
  { label: 'Lab Tests', href: '/lab-tests' },
  { label: 'Dental Care', href: '/services' },
  { label: 'Physiotherapy', href: '/services' },
  { label: 'Specialist Consultations', href: '/services' },
];

const healthPlans = [
  { label: 'Docty Me – Individual', href: '/health-plans' },
  { label: 'Docty Us – Couple', href: '/health-plans' },
  { label: 'Docty We – 3 Members', href: '/health-plans' },
  { label: 'Docty All – 4 Members', href: '/health-plans' },
];

function SocialIcon({ platform }: { platform: 'facebook' | 'instagram' | 'youtube' | 'linkedin' }) {
  const paths = {
    facebook: 'M13.5 8H16l-.4 3h-2.1v7h-3v-7H9V8h1.5V6.4c0-2.5 1.5-3.9 3.8-3.9.7 0 1.4.1 1.7.2v2.7h-1.4c-.8 0-1.1.4-1.1 1.2V8Z',
    instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm11 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    youtube: 'M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z',
    linkedin: 'M5.5 8.5H2.4V21h3.1V8.5ZM4 3A2 2 0 1 0 4 7a2 2 0 0 0 0-4Zm8.1 5.5H9.2V21h3.1v-6.2c0-1.7.3-3.3 2.4-3.3 2 0 2.1 1.9 2.1 3.4V21H20v-6.9c0-3.4-.7-6-4.7-6-1.9 0-3.1 1-3.6 2h-.1V8.5h.5Z',
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d={paths[platform]} />
    </svg>
  );
}

function getClinicDisplayName(clinic: { area?: string; name1?: string }) {
  const name = clinic.area || clinic.name1 || '';
  return name.trim().toLowerCase() === 'not available' ? 'More Cities, coming soon!!' : name;
}

export function Footer() {
  const { data: clinics, isLoading } = useLocationList();
  const uniqueClinicNames = [
    ...new Map(
      (clinics || [])
        .map((clinic) => getClinicDisplayName(clinic).trim())
        .filter((name) => name && !name.toLocaleLowerCase().startsWith('more cities'))
        .map((name) => [name.toLocaleLowerCase(), name] as const)
    ).values(),
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="space-y-4">
            <DoctyLogo size="md" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your neighbourhood healthcare partner. Quality care, 24/7 availability, and affordable services.
            </p>
            <div className="space-y-2">
              <a
                href="tel:+919989804888"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span>99898 04888</span>
              </a>
              <a
                href="mailto:care@doctyclinics.com"
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-accent" />
                <span>care@doctyclinics.com</span>
              </a>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <SocialIcon platform="facebook" />
              </a>
              <a
                href="https://www.instagram.com/doctyclinics/"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <SocialIcon platform="instagram" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="YouTube"
              >
                <SocialIcon platform="youtube" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <SocialIcon platform="linkedin" />
              </a>
            </div>
          </div>

          {/* Services column */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Services</h4>
            <ul className="space-y-2">
              {services.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Health Plans column */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Health Plans</h4>
            <ul className="space-y-2">
              {healthPlans.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinics column */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Our Clinics</h4>
            <ul className="space-y-2">
              {isLoading ? (
                [1, 2, 3, 4].map((item) => (
                  <li key={item} className="h-5 w-28 rounded bg-muted animate-pulse" aria-hidden="true" />
                ))
              ) : uniqueClinicNames.length ? (
                <>
                  {uniqueClinicNames.map((clinicName) => (
                  <li key={clinicName.toLocaleLowerCase()}>
                    <Link
                      to="/locations"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {clinicName}
                    </Link>
                  </li>
                  ))}
                  <li>
                    <Link
                      to="/locations"
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      More cities coming soon
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    to="/locations"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    View all clinics
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary">Terms of Use</Link>
            <Link to="/medical-disclaimer" className="hover:text-primary">Medical Disclaimer</Link>
            <Link to="/cancellation-refund-policy" className="hover:text-primary">Cancellation & Refunds</Link>
            <Link to="/consent-notice" className="hover:text-primary">Consent Notice</Link>
            <Link to="/children-dependants" className="hover:text-primary">Children & Dependants</Link>
            <Link to="/cookie-policy" className="hover:text-primary">Cookie Policy</Link>
            <Link to="/grievance" className="hover:text-primary">Grievance Contact</Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Docty Clinics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
