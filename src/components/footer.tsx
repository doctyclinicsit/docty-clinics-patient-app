import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin } from 'lucide-react';
import { DoctyLogo } from './docty-logo';

const services = [
  { label: 'Primary Care', href: '/services' },
  { label: 'Pharmacy', href: '/services' },
  { label: 'Diagnostics', href: '/services' },
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

const clinics = [
  { label: 'Lanco Hills', href: '/locations' },
  { label: 'Manikonda', href: '/locations' },
  { label: 'Nallagandla', href: '/locations' },
  { label: 'Sainikpuri', href: '/locations' },
];

export function Footer() {
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
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
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
              {clinics.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
