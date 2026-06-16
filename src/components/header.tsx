import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DoctyLogo } from './docty-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '#services', label: 'Services', isSection: true },
  { href: '#doctors', label: 'Doctors', isSection: true },
  { href: '#locations', label: 'Locations', isSection: true },
  { href: '#packages', label: 'Packages', isSection: true },
  { href: '/health-plans', label: 'Health Plans', isSection: false },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string, isSection: boolean) => {
    setIsOpen(false);
    if (isSection && isHomePage) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (isSection && !isHomePage) {
      window.location.href = '/' + href;
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/98 backdrop-blur-lg shadow-md'
          : 'bg-background/80 backdrop-blur-sm'
      )}
    >
      {/* Top info bar */}
      <div
        className={cn(
          'hidden md:block transition-all duration-300 overflow-hidden',
          isScrolled ? 'h-0' : 'h-10'
        )}
      >
        <div className="bg-muted h-10 flex items-center">
          <div className="container mx-auto px-4 flex justify-between items-center text-sm">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Open 24/7</span>
              </span>
              <span className="text-muted-foreground">4 Clinics Across Hyderabad</span>
            </div>
            <a
              href="tel:+919989804888"
              className="flex items-center gap-1.5 font-semibold text-primary hover:text-primary/90 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>99898 04888</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4">
        <div
          className={cn(
            'flex items-center justify-between transition-all duration-300',
            isScrolled ? 'h-14' : 'h-16'
          )}
        >
          <Link to="/" className="flex-shrink-0">
            <DoctyLogo size={isScrolled ? 'sm' : 'md'} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) =>
              link.isSection ? (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href, link.isSection)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all text-foreground hover:bg-muted cursor-pointer"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    location.pathname === link.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:+919989804888"
              className={cn(
                'flex items-center gap-2 font-semibold text-primary transition-opacity',
                isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
            >
              <Phone className="h-4 w-4" />
              <span className="hidden lg:inline">99898 04888</span>
            </a>
            <Button asChild className="rounded-full">
              <Link to="/book-appointment">Book Appointment</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
            className="md:hidden border-t border-border bg-background"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) =>
                link.isSection ? (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href, link.isSection)}
                    className="px-4 py-3 rounded-xl text-sm font-medium transition-all text-foreground hover:bg-muted text-left"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      location.pathname === link.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              )}
              <div className="flex items-center gap-2 px-4 py-2 text-primary font-semibold">
                <Phone className="h-4 w-4" />
                <a href="tel:+919989804888">99898 04888</a>
              </div>
              <Button asChild className="mt-2">
                <Link to="/book-appointment" onClick={() => setIsOpen(false)}>
                  Book Appointment
                </Link>
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
