import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Home,
  HeartHandshake,
  LogOut,
  Pill,
  Pencil,
  UserPlus,
  Phone,
  Stethoscope,
  UserRound,
  Users,
} from 'lucide-react';
import { DoctyLogo } from './docty-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { usePatientSession } from '@/lib/patient-session-context';

const navLinks = [
  { href: '/services', label: 'Services' },
  { href: '/book-appointment', label: 'Doctors' },
  { href: '/pharmacy', label: 'Pharmacy' },
  { href: '/lab-tests', label: 'Lab Tests' },
  { href: '/locations', label: 'Locations' },
  { href: '/packages', label: 'Packages' },
  { href: '/health-plans', label: 'Health Plans' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false);
  const location = useLocation();
  const { activeProfile, profiles, isAuthenticated, isLoading, logout } = usePatientSession();
  const profileInitials = activeProfile?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PT';
  const switchProfileUrl =
    location.pathname === '/patient'
      ? '/patient?view=profiles'
      : `/patient?view=profiles&returnTo=${encodeURIComponent(
          `${location.pathname}${location.search}${location.hash}`
        )}`;
  const addFamilyMemberUrl =
    location.pathname === '/patient'
      ? '/patient?view=register'
      : `/patient?view=register&returnTo=${encodeURIComponent(
          `${location.pathname}${location.search}${location.hash}`
        )}`;
  const editProfileUrl =
    location.pathname === '/patient'
      ? '/patient?view=edit'
      : `/patient?view=edit&returnTo=${encodeURIComponent(
          `${location.pathname}${location.search}${location.hash}`
        )}`;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      const keyboardHeight = window.innerHeight - viewport.height;
      setIsMobileKeyboardOpen(keyboardHeight > 150);
    };

    updateKeyboardState();
    viewport.addEventListener('resize', updateKeyboardState);
    viewport.addEventListener('scroll', updateKeyboardState);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      viewport.removeEventListener('scroll', updateKeyboardState);
    };
  }, []);

  return (
    <>
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
            'relative flex items-center justify-between transition-all duration-300',
            isScrolled ? 'h-14' : 'h-16'
          )}
        >
          <Link to="/" className="hidden flex-shrink-0 md:block">
            <DoctyLogo size={isScrolled ? 'sm' : 'md'} />
          </Link>

          <Link
            to="/"
            className="md:hidden"
            aria-label="Docty Clinics home"
          >
            <DoctyLogo size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
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
            ))}
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
            {isAuthenticated && activeProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Open patient profile menu"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={activeProfile.imageUrl} alt={activeProfile.name} />
                      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                        {profileInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{activeProfile.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profiles.length > 1 ? (
                    <DropdownMenuItem asChild>
                      <Link to={switchProfileUrl}><Users />Switch Profile</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      <Users />Switch Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to={addFamilyMemberUrl}><UserPlus />Add Family Member</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={editProfileUrl}><Pencil />Edit Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/patient"><Calendar />View My Appointments</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
                    <LogOut />Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline" className="rounded-full" disabled={isLoading}>
                <Link to="/patient"><UserRound className="mr-2 h-4 w-4" />Login</Link>
              </Button>
            )}
          </div>

          <div className="md:hidden">
            {isAuthenticated && activeProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Open patient profile menu">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activeProfile.imageUrl} alt={activeProfile.name} />
                      <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
                        {profileInitials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{activeProfile.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profiles.length > 1 ? (
                    <DropdownMenuItem asChild>
                      <Link to={switchProfileUrl}><Users />Switch Profile</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      <Users />Switch Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to={addFamilyMemberUrl}><UserPlus />Add Family Member</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={editProfileUrl}><Pencil />Edit Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/patient"><Calendar />View My Appointments</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
                    <LogOut />Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" variant="outline" className="rounded-full" disabled={isLoading}>
                <Link to="/patient">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      </header>

      <nav
        data-mobile-navigation
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] transform-gpu border-t border-border bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1.5 shadow-[0_-6px_24px_rgba(15,23,42,0.10)] backdrop-blur-xl md:hidden',
          location.pathname === '/patient' && isMobileKeyboardOpen && 'hidden'
        )}
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-5">
          <Link
            to="/"
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 text-[10px] font-medium sm:text-[11px]',
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link
            to="/services"
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 text-[10px] font-medium sm:text-[11px]',
              location.pathname === '/services' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Stethoscope className="h-5 w-5" />
            Services
          </Link>
          <Link
            to="/book-appointment"
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 text-[10px] font-medium sm:text-[11px]',
              location.pathname === '/book-appointment' || location.pathname.startsWith('/doctor/')
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Users className="h-5 w-5" />
            Doctors
          </Link>
          <Link
            to="/pharmacy"
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 text-[10px] font-medium sm:text-[11px]',
              location.pathname === '/pharmacy' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Pill className="h-5 w-5" />
            Pharmacy
          </Link>
          <Link
            to="/health-plans"
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-0.5 text-center text-[9px] font-medium min-[390px]:text-[10px] sm:text-[11px]',
              location.pathname === '/health-plans' ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <HeartHandshake className="h-5 w-5" />
            <span className="leading-tight">Subscriptions</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
