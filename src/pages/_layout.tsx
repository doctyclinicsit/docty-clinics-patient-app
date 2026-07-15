import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PatientChatbot } from '@/components/patient-chatbot';
import { PatientSessionProvider } from '@/lib/patient-session-context';

export default function Layout() {
  const { pathname, search } = useLocation();
  const isStaffPage = pathname.startsWith('/staff');
  const isCorporatePage = pathname.toLowerCase().startsWith('/corporate');
  const isCampPage = pathname.toLowerCase().startsWith('/camps');
  const isExecutivePage = pathname.startsWith('/executive');
  const isFranchisePage = pathname === '/franchise' || pathname.startsWith('/franchise/opportunity/');
  const isDoctorDashboard = pathname === '/doctor-dashboard';
  const isPatientDeliveryLink = pathname.startsWith('/pharmacy/delivery/');
  const isInternalPage = isStaffPage || isCorporatePage || isCampPage || isExecutivePage || isFranchisePage || isDoctorDashboard;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, search]);

  return (
    <PatientSessionProvider>
      <div
        className={`flex min-h-svh min-w-0 max-w-full flex-col overflow-x-clip bg-background text-foreground ${
          isInternalPage ? 'pb-0' : 'pb-20 md:pb-0'
        }`}
      >
        {!isInternalPage && <Header />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isInternalPage && (
          <div className={pathname === '/patient' || isPatientDeliveryLink ? 'hidden md:block' : undefined}>
            <Footer />
          </div>
        )}
        {!isInternalPage && <PatientChatbot />}
      </div>
    </PatientSessionProvider>
  );
}
