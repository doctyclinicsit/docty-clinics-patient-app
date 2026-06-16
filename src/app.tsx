import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { initialize } from '@microsoft/power-apps/app';

import Layout from '@/pages/_layout';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/system/error-boundary';

import HomePage from '@/pages/index';
import ServicesPage from '@/pages/services';
import HealthPlansPage from '@/pages/health-plans';
import PackagesPage from '@/pages/packages';
import LocationsPage from '@/pages/locations';
import BookAppointmentPage from '@/pages/book-appointment';
import DoctorProfilePage from '@/pages/doctor-profile';
import NotFoundPage from '@/pages/not-found';

function App() {
  useEffect(() => {
    initialize();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary resetQueryCache>
        <JotaiProvider>
          <Toaster richColors />
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="health-plans" element={<HealthPlansPage />} />
                <Route path="packages" element={<PackagesPage />} />
                <Route path="locations" element={<LocationsPage />} />
                <Route path="book-appointment" element={<BookAppointmentPage />} />
                <Route path="doctor/:id" element={<DoctorProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Router>
        </JotaiProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
