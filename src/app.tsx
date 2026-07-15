import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';

import Layout from '@/pages/_layout';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/system/error-boundary';
import { initialize } from '@/lib/api-client';

import HomePage from '@/pages/index';
import ServicesPage from '@/pages/services';
import HealthPlansPage from '@/pages/health-plans';
import PackagesPage from '@/pages/packages';
import LabTestsPage from '@/pages/lab-tests';
import LocationsPage from '@/pages/locations';
import ClinicDetailsPage from '@/pages/clinic-details';
import BookAppointmentPage from '@/pages/book-appointment';
import DoctorProfilePage from '@/pages/doctor-profile';
import PatientPortalPage from '@/pages/patient-portal';
import PharmacyPage from '@/pages/pharmacy';
import PharmacyDeliveryLinkPage from '@/pages/pharmacy-delivery-link';
import LegalPage from '@/pages/legal';
import StaffCardsPage from '@/pages/staff-cards';
import StaffPharmacyBillingPage from '@/pages/staff-pharmacy-billing';
import StaffDoctorPayoutPage from '@/pages/staff-doctor-payout';
import StaffExecutiveDashboardPage from '@/pages/staff-executive-dashboard';
import StaffFranchiseDashboardPage from '@/pages/staff-franchise-dashboard';
import StaffFranchiseOpportunityPage from '@/pages/staff-franchise-opportunity';
import StaffLeadsPage from '@/pages/staff-leads';
import StaffSchoolCampPage from '@/pages/staff-school-camp';
import StaffEducationalCampsPage from '@/pages/staff-educational-camps';
import CorporateCampOperationsPage from '@/pages/corporate-camp-operations';
import CorporateCampJourneyPage from '@/pages/corporate-camp-journey';
import CampFinancePage from '@/pages/camp-finance';
import StaffSystemLogsPage from '@/pages/staff-system-logs';
import StaffSocialMediaPage from '@/pages/staff-social-media';
import StaffAdministrationPage from '@/pages/staff-administration';
import SchoolCampCollaborationPage from '@/pages/school-camp-collaboration';
import FranchiseOpportunityPage from '@/pages/franchise-opportunity';
import DoctorDashboardPage from '@/pages/doctor-dashboard';
import DoctorConsultationPage from '@/pages/doctor-consultation';
import ConsultationFrontDeskPage from '@/pages/consultation-front-desk';
import ConsultationRoomTabletPage from '@/pages/consultation-room-tablet';
import NotFoundPage from '@/pages/not-found';

function App() {
  useEffect(() => {
    document.title = 'Docty Clinics - Your Neighbourhood Clinics';
    initialize();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary resetQueryCache>
        <JotaiProvider>
          <Toaster richColors />
          <Router>
            <Routes>
              <Route path="doctor-consultation/:appointmentId" element={<DoctorConsultationPage />} />
              <Route path="consultation/front-desk" element={<ConsultationFrontDeskPage />} />
              <Route path="consultation/tablet" element={<ConsultationRoomTabletPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="health-plans" element={<HealthPlansPage />} />
                <Route path="packages" element={<PackagesPage />} />
                <Route path="lab-tests" element={<LabTestsPage />} />
                <Route path="locations" element={<LocationsPage />} />
                <Route path="locations/:id" element={<ClinicDetailsPage />} />
                <Route path="book-appointment" element={<BookAppointmentPage />} />
                <Route path="doctor/:id" element={<DoctorProfilePage />} />
                <Route path="doctor-dashboard" element={<DoctorDashboardPage />} />
                <Route path="patient" element={<PatientPortalPage />} />
                <Route path="pharmacy" element={<PharmacyPage />} />
                <Route path="pharmacy/delivery/:token" element={<PharmacyDeliveryLinkPage />} />
                <Route path="school-camp-collaboration" element={<SchoolCampCollaborationPage />} />
                <Route path="staff" element={<StaffCardsPage />} />
                <Route path="staff/cards" element={<StaffCardsPage />} />
                <Route path="staff/pharmacy-billing" element={<StaffPharmacyBillingPage />} />
                <Route path="staff/leads" element={<StaffLeadsPage />} />
                <Route path="Corporate/camp" element={<StaffSchoolCampPage />} />
                <Route path="Corporate/camps" element={<StaffEducationalCampsPage />} />
                <Route path="Corporate/operations" element={<CorporateCampOperationsPage />} />
                <Route path="Corporate/registration" element={<CorporateCampOperationsPage />} />
                <Route path="Corporate/nursing" element={<CorporateCampOperationsPage />} />
                <Route path="Corporate/hall" element={<CorporateCampOperationsPage />} />
                <Route path="Corporate/queue" element={<CorporateCampOperationsPage />} />
                <Route path="Corporate/participants" element={<CorporateCampOperationsPage />} />
                <Route path="Corporate/journey" element={<CorporateCampJourneyPage />} />
                <Route path="Corporate/finance" element={<CampFinancePage />} />
                <Route path="camps/finance" element={<CampFinancePage />} />
                <Route path="staff/doctor-payout" element={<StaffDoctorPayoutPage />} />
                <Route path="executive/dashboard" element={<StaffExecutiveDashboardPage />} />
                <Route path="executive/dashboard/share/:shareToken" element={<StaffExecutiveDashboardPage />} />
                <Route path="staff/franchise-dashboard" element={<StaffFranchiseDashboardPage />} />
                <Route path="staff/franchise-opportunity" element={<StaffFranchiseOpportunityPage />} />
                <Route path="staff/system-logs" element={<StaffSystemLogsPage />} />
                <Route path="staff/social-media" element={<StaffSocialMediaPage />} />
                <Route path="staff/administration" element={<StaffAdministrationPage />} />
                <Route path="franchise" element={<StaffFranchiseDashboardPage />} />
                <Route path="franchise/opportunity/:shareToken" element={<FranchiseOpportunityPage />} />
                {[
                  'privacy-policy',
                  'terms',
                  'medical-disclaimer',
                  'cancellation-refund-policy',
                  'consent-notice',
                  'grievance',
                  'cookie-policy',
                  'children-dependants',
                ].map((path) => (
                  <Route key={path} path={path} element={<LegalPage />} />
                ))}
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
