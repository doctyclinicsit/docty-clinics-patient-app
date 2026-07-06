import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  CalendarPlus,
  CheckCircle2,
  LockKeyhole,
  MapPin,
  Minus,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useDoctorList } from '@/generated/hooks/use-doctor';
import { useServiceList } from '@/generated/hooks/use-service';
import type { Doctor } from '@/generated/models/doctor-model';
import type { Service } from '@/generated/models/service-model';
import {
  searchPharmacyMedicines,
  submitPharmacyOrder,
  type PharmacyCartItem,
  type PharmacyMedicine,
} from '@/lib/pharmacy-api';
import { usePatientSession } from '@/lib/patient-session-context';
import { getServiceCategory } from '@/lib/service-categories';
import {
  hasHealthConcern,
  isAppointmentIntent,
  requiresLoginForChatRequest,
  triagePatientText,
  type TriageResult,
} from '@/lib/chatbot-triage';
import { cn } from '@/lib/utils';

const EMERGENCY_PHONE = '112';
const CLINIC_EMERGENCY_PHONE = '9989804888';

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  triage?: TriageResult;
  doctorRecommendations?: Doctor[];
  kind?: 'emergency' | 'login' | 'appointment' | 'profile-select' | 'profile-register' | 'service-lead';
  serviceLead?: ServiceLeadDraft;
};

type PendingQuestionnaire = {
  originalText: string;
  triage: TriageResult;
  questionIndex: number;
  answers: string[];
};

type ServiceLeadDraft = {
  label: 'Lab Tests' | 'Pharmacy' | 'Home Care';
  type: 'service' | 'pharmacy';
  serviceCategory: 'Lab Tests' | 'Pharmacy' | 'Home Care';
  interest: string;
};

function createMessage(role: ChatMessage['role'], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    ...extra,
  };
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, '').slice(-10);
}

function formatPharmacyPrice(value?: number) {
  if (typeof value !== 'number') return 'Price on confirmation';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDoctorMatches(
  doctors: Doctor[],
  specialty: string
) {
  const normalizedSpecialty = specialty.toLowerCase();
  const searchTerms = [
    ...normalizedSpecialty.split(/\s+or\s+|\s+and\s+|,/),
    normalizedSpecialty.replace(/ specialist|ician|ologist/g, '').trim(),
    normalizedSpecialty.includes('spine') ? 'orthopedic' : '',
    normalizedSpecialty.includes('physio') ? 'physiotherapy' : '',
    normalizedSpecialty.includes('general physician') ? 'general medicine' : '',
    normalizedSpecialty.includes('general physician') ? 'primary care' : '',
    normalizedSpecialty.includes('general physician') ? 'consultation' : '',
    normalizedSpecialty.includes('general physician') ? 'family physician' : '',
  ]
    .map((term) => term.replace(/\b(or|and|specialist)\b/g, '').trim())
    .filter((term) => term.length >= 4);

  return doctors
    .filter((doctor) => {
      const doctorText = [doctor.specialty, doctor.name1, doctor.servicesOffered, doctor.doctorServices?.join(' ')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchTerms.some((term) => doctorText.includes(term));
    })
    .slice(0, 3);
}

function formatPossibleCauses(triage: TriageResult) {
  if (!triage.possibleCauses?.length) return '';

  return `Based on what you shared, this could be related to ${triage.possibleCauses.join(', ')}. `;
}

function getServiceLeadDraft(input: string): ServiceLeadDraft | undefined {
  if (/\b(pharmacy|medicine|medicines|tablet|prescription order|order medicine)\b/i.test(input)) {
    return {
      label: 'Pharmacy',
      type: 'pharmacy',
      serviceCategory: 'Pharmacy',
      interest: 'Pharmacy order request',
    };
  }

  if (/\b(lab|blood test|diagnostic|test package|health check|lab test|labs)\b/i.test(input)) {
    return {
      label: 'Lab Tests',
      type: 'service',
      serviceCategory: 'Lab Tests',
      interest: 'Lab Tests',
    };
  }

  if (/\b(homecare|home care|home visit|nursing at home|care at home)\b/i.test(input)) {
    return {
      label: 'Home Care',
      type: 'service',
      serviceCategory: 'Home Care',
      interest: 'Home Care',
    };
  }

  return undefined;
}

function doctorLocationLabel(doctor: Doctor) {
  const locations = doctor.locations?.length
    ? doctor.locations
    : doctor.location
      ? [doctor.location]
      : [];

  return locations.map((location) => location.name1).filter(Boolean).join(', ');
}

function DoctorRecommendationCards({ doctors }: { doctors: Doctor[] }) {
  if (doctors.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {doctors.map((doctor) => {
        const location = doctorLocationLabel(doctor);
        return (
          <div key={doctor.id} className="overflow-hidden rounded-md border bg-background text-foreground">
            <div className="flex gap-3 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {doctor.imageURL ? (
                  <img src={doctor.imageURL} alt={doctor.name1} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{doctor.name1}</p>
                <p className="truncate text-xs font-medium text-primary">{doctor.specialty}</p>
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {doctor.experienceYears > 0 && (
                    <p>{doctor.experienceYears}+ years experience</p>
                  )}
                  {location && (
                    <p className="flex min-w-0 items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{location}</span>
                    </p>
                  )}
                  <p>{doctor.nextAvailableSlot || 'Availability shown on profile'}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t p-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/doctor/${doctor.id}`}>View Profile</Link>
              </Button>
              <Button asChild size="sm">
                <Link to={`/doctor/${doctor.id}`}>Book</Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LabTestCards({
  services,
  onSelect,
}: {
  services: Service[];
  onSelect: (service: Service) => void;
}) {
  if (services.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">Available lab tests and diagnostics</p>
      {services.slice(0, 6).map((service) => (
        <button
          key={service.id}
          type="button"
          onClick={() => onSelect(service)}
          className="w-full rounded-md border bg-background p-3 text-left text-foreground transition-colors hover:border-primary/50"
        >
          <span className="block text-sm font-semibold">{service.name1}</span>
          {service.description && (
            <span className="mt-1 block text-xs text-muted-foreground">{service.description}</span>
          )}
          {typeof service.price === 'number' && service.price > 0 && (
            <span className="mt-2 block text-xs font-semibold text-primary">
              INR {new Intl.NumberFormat('en-IN').format(service.price)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ChatPharmacyFindMedicinesCard({
  query,
  onQueryChange,
  results,
  isSearching,
  hasSearched,
  onAdd,
  onRequestUnavailable,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: PharmacyMedicine[];
  isSearching: boolean;
  hasSearched: boolean;
  onAdd: (medicine: PharmacyMedicine) => void;
  onRequestUnavailable: () => void;
}) {
  return (
    <div className="w-full max-w-full min-w-0 space-y-3 overflow-hidden rounded-md border bg-background p-3 text-foreground">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Search className="h-4 w-4 text-primary" />
        Find Medicines
      </div>
      <div className="w-full min-w-0">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search Dolo, Okacet, diapers..."
          className="min-w-0"
        />
      </div>

      {isSearching && (
        <p className="text-xs text-muted-foreground">Searching medicines...</p>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="space-y-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <p>No exact match found. You can request this medicine and our pharmacy team will confirm availability.</p>
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={onRequestUnavailable}>
            Request Non Available
          </Button>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="min-w-0 space-y-2">
          {results.slice(0, 5).map((medicine) => (
            <div key={medicine.id} className="w-full max-w-full min-w-0 overflow-hidden rounded-md border bg-muted/20 p-2">
              <div className="flex min-w-0 gap-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary">
                  {medicine.imageUrl ? (
                    <img src={medicine.imageUrl} alt={medicine.name} className="h-full w-full object-cover" />
                  ) : (
                    <Pill className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{medicine.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {[medicine.composition, medicine.packSize, medicine.manufacturer].filter(Boolean).join(' | ') || 'Details available on confirmation'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-primary">
                    {formatPharmacyPrice(medicine.salePrice || medicine.mrp)}
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" className="mt-2 w-full max-w-full" onClick={() => onAdd(medicine)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatPharmacyCartOrder({
  items,
  patientName,
  patientMobile,
  address,
  area,
  city,
  pincode,
  notes,
  isSubmitting,
  onPatientNameChange,
  onPatientMobileChange,
  onAddressChange,
  onAreaChange,
  onCityChange,
  onPincodeChange,
  onNotesChange,
  onQuantityChange,
  onSubmit,
}: {
  items: PharmacyCartItem[];
  patientName: string;
  patientMobile: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  notes: string;
  isSubmitting: boolean;
  onPatientNameChange: (value: string) => void;
  onPatientMobileChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onPincodeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onQuantityChange: (medicineId: string, quantity: number) => void;
  onSubmit: () => void;
}) {
  const availableItems = items.filter((item) => item.available !== false);
  const requestItems = items.filter((item) => item.available === false);
  const subtotal = availableItems.reduce((total, item) => total + (item.salePrice || item.mrp || 0) * item.quantity, 0);
  const renderCartItem = (item: PharmacyCartItem, requestOnly = false) => (
    <div
      key={item.id}
      className={cn(
        'grid w-full min-w-0 grid-cols-1 gap-2 overflow-hidden rounded-md border p-2',
        requestOnly && 'border-dashed'
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {requestOnly ? 'Availability to be confirmed' : formatPharmacyPrice(item.salePrice || item.mrp)}
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => onQuantityChange(item.id, item.quantity - 1)}>
          {item.quantity <= 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </Button>
        <span className="w-6 shrink-0 text-center text-sm font-semibold">{item.quantity}</span>
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => onQuantityChange(item.id, item.quantity + 1)}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full min-w-0 space-y-3 overflow-hidden rounded-md border bg-background p-3 text-foreground">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShoppingCart className="h-4 w-4 text-primary" />
        Cart & Order Request
      </div>
      <div className="min-w-0 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold">Order Items</p>
            <Badge variant="secondary" className="shrink-0 rounded-md">{availableItems.length}</Badge>
          </div>
          {availableItems.length === 0 ? (
            <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              Add available medicines from search.
            </div>
          ) : (
            availableItems.map((item) => renderCartItem(item))
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold">Non-Available / Request</p>
            <Badge variant="outline" className="shrink-0 rounded-md">{requestItems.length + (notes.trim() ? 1 : 0)}</Badge>
          </div>
          {requestItems.length === 0 && !notes.trim() ? (
            <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              Request unavailable medicines or add prescription details below.
            </div>
          ) : (
            <>
              {requestItems.map((item) => renderCartItem(item, true))}
              {notes.trim() && (
                <div className="rounded-md border border-dashed bg-muted/40 p-2 text-xs">
                  <p className="font-semibold">Request notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{notes.trim()}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {subtotal > 0 && (
        <div className="grid w-full min-w-0 grid-cols-1 gap-1 overflow-hidden rounded-md bg-muted px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <span className="text-muted-foreground">Estimated medicines total</span>
          <span className="min-w-0 font-bold">{formatPharmacyPrice(subtotal)}</span>
        </div>
      )}
      <Input value={patientName} onChange={(event) => onPatientNameChange(event.target.value)} placeholder="Patient name" />
      <Input value={patientMobile} onChange={(event) => onPatientMobileChange(event.target.value)} placeholder="Contact number" inputMode="tel" />
      <Textarea
        value={address}
        onChange={(event) => onAddressChange(event.target.value)}
        placeholder="Delivery address"
        className="min-h-16 resize-none text-sm"
      />
      <Input value={area} onChange={(event) => onAreaChange(event.target.value)} placeholder="Area / locality" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={city} onChange={(event) => onCityChange(event.target.value)} placeholder="City" />
        <Input
          value={pincode}
          onChange={(event) => onPincodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Pincode"
          inputMode="numeric"
        />
      </div>
      <Textarea
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Non-available request, prescription details, doctor name, or special instructions"
        className="min-h-16 resize-none text-sm"
      />
      <Button type="button" size="sm" className="w-full" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Pharmacy Request'}
      </Button>
    </div>
  );
}

export function PatientChatbot() {
  const { isAuthenticated, activeProfile, refreshSession } = usePatientSession();
  const { data: doctors = [] } = useDoctorList();
  const { data: services = [] } = useServiceList({ orderBy: ['displayOrder asc'] });
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'bot',
      'Hi there, what can I help you with: Appointment, Lab Tests, Pharmacy, or Homecare services?'
    ),
  ]);
  const [emergencyLead, setEmergencyLead] = useState({
    name: activeProfile?.name || '',
    mobile: activeProfile?.mobile || '',
  });
  const [loginMobile, setLoginMobile] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [hasAcceptedLoginConsent, setHasAcceptedLoginConsent] = useState(false);
  const [loginStep, setLoginStep] = useState<'mobile' | 'otp'>('mobile');
  const [authMode, setAuthMode] = useState<'choice' | 'login' | 'register'>('choice');
  const [hasVerifiedChatMobile, setHasVerifiedChatMobile] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [chatProfiles, setChatProfiles] = useState<Array<{ id: string; name: string; relation?: string; accessToken: string }>>([]);
  const [selectedChatProfileId, setSelectedChatProfileId] = useState('');
  const [isSelectingProfile, setIsSelectingProfile] = useState(false);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationAge, setRegistrationAge] = useState('');
  const [registrationGender, setRegistrationGender] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [hasAcceptedProfileConsent, setHasAcceptedProfileConsent] = useState(false);
  const [isRegisteringProfile, setIsRegisteringProfile] = useState(false);
  const [pendingQuestionnaire, setPendingQuestionnaire] = useState<PendingQuestionnaire | null>(null);
  const [serviceLeadName, setServiceLeadName] = useState('');
  const [serviceLeadMobile, setServiceLeadMobile] = useState('');
  const [serviceLeadNotes, setServiceLeadNotes] = useState('');
  const [isSubmittingServiceLead, setIsSubmittingServiceLead] = useState(false);
  const [pharmacyQuery, setPharmacyQuery] = useState('');
  const [pharmacySearchResults, setPharmacySearchResults] = useState<PharmacyMedicine[]>([]);
  const [hasPharmacySearched, setHasPharmacySearched] = useState(false);
  const [isPharmacySearching, setIsPharmacySearching] = useState(false);
  const [pharmacyCartItems, setPharmacyCartItems] = useState<PharmacyCartItem[]>([]);
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyArea, setPharmacyArea] = useState('');
  const [pharmacyCity, setPharmacyCity] = useState('Hyderabad');
  const [pharmacyPincode, setPharmacyPincode] = useState('');
  const [isSubmittingPharmacyOrder, setIsSubmittingPharmacyOrder] = useState(false);
  const [isPharmacyFlowActive, setIsPharmacyFlowActive] = useState(false);
  const [isSubmittingEmergencyLead, setIsSubmittingEmergencyLead] = useState(false);
  const latestBotMessageRef = useRef<HTMLDivElement | null>(null);
  const pharmacySearchRequestId = useRef(0);

  const latestEmergency = useMemo(
    () => [...messages].reverse().find((message) => message.kind === 'emergency'),
    [messages]
  );
  const labTestServices = useMemo(
    () =>
      services.filter(
        (service) =>
          getServiceCategory(service.name1) === 'diagnostics' ||
          /\b(lab|test|diagnostic|screening|profile|checkup|check up|blood|urine|ecg|x ray|ultrasound)\b/i.test(
            `${service.name1} ${service.description || ''}`
          )
      ),
    [services]
  );
  const canRegisterChatProfile = isAuthenticated || hasVerifiedChatMobile;

  useEffect(() => {
    if (!isOpen) return;

    latestBotMessageRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isPharmacyFlowActive) return;

    const trimmedQuery = pharmacyQuery.trim();
    if (trimmedQuery.length < 2) {
      pharmacySearchRequestId.current += 1;
      setPharmacySearchResults([]);
      setHasPharmacySearched(false);
      setIsPharmacySearching(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchChatMedicines(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isPharmacyFlowActive, pharmacyQuery]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMessage = createMessage('user', text);
    const nextMessages = [userMessage];
    const needsLogin = requiresLoginForChatRequest(text);

    const serviceLead = getServiceLeadDraft(text);

    if (serviceLead) {
      setIsPharmacyFlowActive(serviceLead.label === 'Pharmacy');
      nextMessages.push(
        createMessage(
          'bot',
          serviceLead.label === 'Pharmacy'
            ? 'Sure, I can help you find medicines and create a pharmacy order request. Search below and add medicines to the cart.'
            : `Sure, I can help with ${serviceLead.label}. Please share your name, contact number, and any details our team should know.`,
          { kind: 'service-lead', serviceLead }
        )
      );
    } else if (pendingQuestionnaire) {
      const answers = [...pendingQuestionnaire.answers, text];
      const combinedText = `${pendingQuestionnaire.originalText} ${answers.join(' ')}`;
      const updatedTriage = triagePatientText(combinedText);
      const nextQuestionIndex = pendingQuestionnaire.questionIndex + 1;
      const nextQuestion = pendingQuestionnaire.triage.followUpQuestions?.[nextQuestionIndex];

      if (updatedTriage.urgency === 'emergency') {
        setPendingQuestionnaire(null);
        nextMessages.push(
          createMessage(
            'bot',
            'This may need urgent medical attention. Please call emergency services now or go to the nearest emergency department. I can also request an urgent callback from our care team, but please do not wait for the chatbot if symptoms are severe.',
            { triage: updatedTriage, kind: 'emergency' }
          )
        );
      } else if (nextQuestion) {
        setPendingQuestionnaire({
          ...pendingQuestionnaire,
          questionIndex: nextQuestionIndex,
          answers,
        });
        nextMessages.push(
          createMessage('bot', nextQuestion)
        );
      } else {
        setPendingQuestionnaire(null);
        const finalTriage: TriageResult =
          updatedTriage.urgency === 'needs_more_info'
            ? {
                ...updatedTriage,
                specialty: updatedTriage.specialty || 'General Physician',
                urgency: 'routine',
                reason:
                  updatedTriage.reason ||
                  'Based on what you shared, a general physician can assess the concern and guide further specialist care if needed.',
              }
            : updatedTriage;
        const matches = formatDoctorMatches(doctors, finalTriage.specialty);
        const doctorText = matches.length
          ? ` Available doctors: ${matches.map((doctor) => doctor.name1).join(', ')}.`
          : '';
        const educationText = finalTriage.education ? `${finalTriage.education} ` : '';
        const urgencyText =
          finalTriage.urgency === 'same_day'
            ? 'Because you described this as severe or worsening, please consider a same-day consultation if possible. '
            : '';

        nextMessages.push(
          createMessage(
            'bot',
            `${educationText}${formatPossibleCauses(finalTriage)}${finalTriage.reason} ${urgencyText}This is not a diagnosis, and the clinician will evaluate you properly. I can help you book an appointment with ${finalTriage.specialty}.${doctorText}`,
            { triage: finalTriage, kind: 'appointment', doctorRecommendations: matches }
          )
        );
      }
    } else if (needsLogin && !isAuthenticated) {
      setAuthMode('choice');
      nextMessages.push(
        createMessage(
          'bot',
          'Please login to access appointments, prescriptions, medical history, profile details, cancellations, or rescheduling. I can still help you book a new appointment as a guest.',
          { kind: 'login' }
        )
      );
    } else if (needsLogin) {
      nextMessages.push(
        createMessage(
          'bot',
          'You are logged in, so you can manage appointments and view prescriptions from the patient portal. Please confirm any cancellation or reschedule before it is submitted.',
          { kind: 'login' }
        )
      );
    } else {
      const triage = triagePatientText(text);

      if (triage.urgency === 'emergency') {
        nextMessages.push(
          createMessage(
            'bot',
            'This may need urgent medical attention. Please call emergency services now or go to the nearest emergency department. I can also request an urgent callback from our care team, but please do not wait for the chatbot if symptoms are severe.',
            { triage, kind: 'emergency' }
          )
        );
      } else if (triage.urgency === 'needs_more_info') {
        const firstQuestion = triage.followUpQuestions?.[0] || 'How long have you had this concern?';
        setPendingQuestionnaire({
          originalText: text,
          triage,
          questionIndex: 0,
          answers: [],
        });
        nextMessages.push(
          createMessage(
            'bot',
            `${triage.education || ''} ${triage.reason}\n\n${firstQuestion}`
          )
        );
      } else if (isAppointmentIntent(text) || hasHealthConcern(text)) {
        const matches = formatDoctorMatches(doctors, triage.specialty);
        const doctorText = matches.length
          ? ` Available doctors: ${matches.map((doctor) => doctor.name1).join(', ')}.`
          : '';
        const educationText = triage.education ? `${triage.education} ` : '';
        const urgencyText =
          triage.urgency === 'same_day'
            ? 'Because you described this as severe or worsening, please consider a same-day consultation if possible. '
            : '';
        const alternateText = triage.alternateSpecialty
          ? ` If it has been going on for a long time, follows an injury, or moves down the leg with numbness/weakness, ${triage.alternateSpecialty} may be better.`
          : '';
        nextMessages.push(
          createMessage(
            'bot',
            `${educationText}${formatPossibleCauses(triage)}${triage.reason}${alternateText} ${urgencyText}This is not a diagnosis, and the clinician will evaluate you properly. Can I help you book an appointment with ${triage.specialty}?${doctorText} You can continue to appointment booking with name, contact number, age, and gender.`,
            { triage, kind: 'appointment', doctorRecommendations: matches }
          )
        );
      } else {
        nextMessages.push(
          createMessage(
            'bot',
            'I can share general educational information, but I cannot diagnose, prescribe, or recommend treatment. If you describe the concern briefly, I can suggest which specialist to book.'
          )
        );
      }
    }

    setMessages((current) => [...current, ...nextMessages]);
    setInput('');
  };

  const startServiceLead = (serviceLead: ServiceLeadDraft) => {
    setIsPharmacyFlowActive(serviceLead.label === 'Pharmacy');

    const introByService: Record<ServiceLeadDraft['label'], string> = {
      'Lab Tests':
        'I can help you request lab tests, health checkups, or diagnostic sample collection. Share the test/package name if you know it, or describe what you need and our team will assist.',
      Pharmacy:
        'I can help you find medicines and create a pharmacy order request. Search for a medicine below, add it to the cart, and submit your request with patient and delivery details.',
      'Home Care':
        'I can help you request homecare services such as nursing support, sample collection, injections, physiotherapy at home, or other care assistance. Share what service you need and our team will guide you.',
    };

    setMessages((current) => [
      ...current,
      createMessage('user', serviceLead.label),
      createMessage(
        'bot',
        serviceLead.label === 'Pharmacy'
          ? introByService[serviceLead.label]
          : `${introByService[serviceLead.label]}\n\nPlease share your name, contact number, and any details our team should know.`,
        { kind: 'service-lead', serviceLead }
      ),
    ]);
  };

  const startAppointmentHelp = () => {
    setIsPharmacyFlowActive(false);
    setMessages((current) => [
      ...current,
      createMessage('user', 'Appointment'),
      createMessage(
        'bot',
        'I can help you with booking a new appointment, rescheduling, cancellation, or viewing your appointment history. Booking a new appointment can be done as a guest with basic patient details. Reschedule, cancellation, and history need you to login first.\n\nTell me what you would like to do, or describe your concern and I can help guide you to the right doctor.'
      ),
    ]);
  };

  const startChatLogin = () => {
    setAuthMode('login');
    setLoginStep('mobile');
  };

  const startChatRegistration = () => {
    setAuthMode('register');
    setLoginStep('mobile');
    setMessages((current) => [
      ...current,
      createMessage('user', 'Register'),
      createMessage(
        'bot',
        'Please verify your mobile number and complete the registration form below.',
        { kind: 'profile-register' }
      ),
    ]);
  };

  const resetChatPharmacyOrder = () => {
    setPharmacyQuery('');
    pharmacySearchRequestId.current += 1;
    setPharmacySearchResults([]);
    setHasPharmacySearched(false);
    setPharmacyCartItems([]);
    setPharmacyAddress('');
    setPharmacyArea('');
    setPharmacyCity('Hyderabad');
    setPharmacyPincode('');
    setServiceLeadName('');
    setServiceLeadMobile('');
    setServiceLeadNotes('');
  };

  const cancelChatPharmacyOrder = () => {
    resetChatPharmacyOrder();
    setIsPharmacyFlowActive(false);
    setMessages((current) => [
      ...current,
      createMessage('bot', 'Pharmacy order request cancelled. You can choose another option or start again anytime.'),
    ]);
  };

  const goBackToChatOptions = () => {
    resetChatPharmacyOrder();
    setIsPharmacyFlowActive(false);
    setMessages((current) => [
      ...current,
      createMessage(
        'bot',
        'Sure. What can I help you with: Appointment, Lab Tests, Pharmacy, or Homecare services?'
      ),
    ]);
  };

  const submitServiceLead = async (serviceLead: ServiceLeadDraft) => {
    const mobile = cleanPhone(serviceLeadMobile);
    if (!serviceLeadName.trim() || !/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter patient name and a valid 10-digit mobile number.');
      return;
    }

    setIsSubmittingServiceLead(true);
    try {
      const response = await fetch('/api/clinic-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: serviceLead.type,
          patient: {
            name: serviceLeadName.trim(),
            mobile,
          },
          interest: serviceLead.interest,
          serviceCategory: serviceLead.serviceCategory,
          remarks: serviceLeadNotes.trim() || undefined,
          source: 'Patient Chatbot',
          metadata: {
            chatbotService: serviceLead.label,
          },
          requestedAt: new Date().toISOString(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to submit your request.');
      }

      toast.success(`${serviceLead.label} request submitted.`);
      setMessages((current) => [
        ...current,
        createMessage(
          'bot',
          `Your ${serviceLead.label} request has been submitted. Our team will contact you shortly.`
        ),
      ]);
      setServiceLeadName('');
      setServiceLeadMobile('');
      setServiceLeadNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit request.');
    } finally {
      setIsSubmittingServiceLead(false);
    }
  };

  const selectLabTestService = (service: Service) => {
    setServiceLeadNotes((current) => {
      const selected = `Selected lab test: ${service.name1}`;
      return current.trim() ? `${current.trim()}\n${selected}` : selected;
    });
    toast.success(`${service.name1} added to request.`);
  };

  const searchChatMedicines = async (searchTerm = pharmacyQuery) => {
    const query = searchTerm.trim();
    const requestId = pharmacySearchRequestId.current + 1;
    pharmacySearchRequestId.current = requestId;
    if (query.length < 2) {
      setPharmacySearchResults([]);
      setHasPharmacySearched(false);
      return;
    }

    setIsPharmacySearching(true);
    setHasPharmacySearched(true);
    try {
      const results = await searchPharmacyMedicines(query);
      if (pharmacySearchRequestId.current === requestId) {
        setPharmacySearchResults(results);
      }
    } catch (error) {
      if (pharmacySearchRequestId.current === requestId) {
        setPharmacySearchResults([]);
        toast.error(error instanceof Error ? error.message : 'Unable to search medicines.');
      }
    } finally {
      if (pharmacySearchRequestId.current === requestId) {
        setIsPharmacySearching(false);
      }
    }
  };

  const addMedicineToChatCart = (medicine: PharmacyMedicine) => {
    setPharmacyCartItems((current) => {
      const existing = current.find((item) => item.id === medicine.id);
      if (existing) {
        return current.map((item) =>
          item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...current, { ...medicine, quantity: 1 }];
    });
    setPharmacyQuery('');
    setPharmacySearchResults([]);
    setHasPharmacySearched(false);
    toast.success(`${medicine.name} added to cart.`);
  };

  const requestUnavailableChatMedicine = () => {
    const requestedMedicine = pharmacyQuery.trim();
    if (requestedMedicine.length < 2) {
      toast.error('Enter the medicine name to request.');
      return;
    }

    addMedicineToChatCart({
      id: `requested-${Date.now()}`,
      name: requestedMedicine,
      available: false,
    });
  };

  const updateChatCartQuantity = (medicineId: string, quantity: number) => {
    setPharmacyCartItems((current) =>
      quantity <= 0
        ? current.filter((item) => item.id !== medicineId)
        : current.map((item) => (item.id === medicineId ? { ...item, quantity } : item))
    );
  };

  const submitChatPharmacyOrder = async () => {
    const mobile = cleanPhone(serviceLeadMobile);
    if (!serviceLeadName.trim() || !/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter patient name and a valid 10-digit mobile number.');
      return;
    }
    if (pharmacyCartItems.length === 0) {
      toast.error('Add or request at least one medicine.');
      return;
    }
    if (!pharmacyAddress.trim()) {
      toast.error('Enter delivery address for the pharmacy request.');
      return;
    }
    if (!pharmacyArea.trim() || !pharmacyCity.trim() || !/^\d{6}$/.test(pharmacyPincode)) {
      toast.error('Enter area, city, and a valid 6-digit pincode.');
      return;
    }

    setIsSubmittingPharmacyOrder(true);
    try {
      const availableItems = pharmacyCartItems.filter((item) => item.available !== false);
      const requestItems = pharmacyCartItems.filter((item) => item.available === false);
      const requestNotes = [
        requestItems.length
          ? `Non-available requests: ${requestItems.map((item) => `${item.name} x ${item.quantity}`).join(', ')}`
          : '',
        serviceLeadNotes.trim(),
      ]
        .filter(Boolean)
        .join('\n');

      await submitPharmacyOrder({
        patientName: serviceLeadName.trim(),
        patientMobile: mobile,
        address: pharmacyAddress.trim(),
        area: pharmacyArea.trim(),
        city: pharmacyCity.trim(),
        pincode: pharmacyPincode,
        notes: requestNotes || undefined,
        prescriptionNotes: requestNotes || undefined,
        items: pharmacyCartItems,
      });

      toast.success('Pharmacy request submitted.');
      setMessages((current) => [
        ...current,
        createMessage(
          'bot',
          availableItems.length > 0
            ? 'Your pharmacy order request has been submitted. Available medicines will be pushed as a draft sale, and any requested items will be confirmed by our pharmacy team.'
            : 'Your pharmacy request has been submitted. Our pharmacy team will confirm availability, price, and delivery details shortly.'
        ),
      ]);
      setPharmacyCartItems([]);
      setPharmacyQuery('');
      pharmacySearchRequestId.current += 1;
      setPharmacySearchResults([]);
      setHasPharmacySearched(false);
      setPharmacyAddress('');
      setPharmacyArea('');
      setPharmacyCity('Hyderabad');
      setPharmacyPincode('');
      setIsPharmacyFlowActive(false);
      setServiceLeadName('');
      setServiceLeadMobile('');
      setServiceLeadNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit pharmacy request.');
    } finally {
      setIsSubmittingPharmacyOrder(false);
    }
  };

  const handleEmergencyLead = async () => {
    const mobile = cleanPhone(emergencyLead.mobile);
    if (!emergencyLead.name.trim() || !/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter patient name and a valid 10-digit mobile number.');
      return;
    }

    setIsSubmittingEmergencyLead(true);
    try {
      const response = await fetch('/api/emergency-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: {
            name: emergencyLead.name,
            mobile,
          },
          summary: latestEmergency?.triage?.reason || 'Emergency concern reported in chatbot.',
          redFlags: latestEmergency?.triage?.redFlags || [],
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to submit emergency callback request.');
      }

      toast.success('Urgent callback request generated.');
      setMessages((current) => [
        ...current,
        createMessage(
          'bot',
          'The urgent callback request has been generated. Please still call emergency services immediately if symptoms are severe.'
        ),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit emergency request.');
    } finally {
      setIsSubmittingEmergencyLead(false);
    }
  };

  const sendLoginOtp = async () => {
    const mobile = cleanPhone(loginMobile);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!hasAcceptedLoginConsent) {
      toast.error('Please accept consent to retrieve linked patient profiles.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to send OTP.');
      }

      setLoginMobile(mobile);
      setLoginOtp('');
      setLoginStep('otp');
      toast.success('OTP sent successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyLoginOtp = async (otpCode = loginOtp) => {
    const mobile = cleanPhone(loginMobile);
    const otp = otpCode.replace(/\D/g, '').slice(0, 4);
    if (!/^[6-9]\d{9}$/.test(mobile) || otp.length !== 4) {
      toast.error('Enter the 4-digit OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to verify OTP.');
      }

      const patientsResponse = await fetch('/api/patients', {
        headers: { Accept: 'application/json' },
      });
      const patientsBody = await patientsResponse.json().catch(() => null);
      if (!patientsResponse.ok) {
        throw new Error(patientsBody?.message || 'Unable to retrieve patient profiles.');
      }

      const profiles = Array.isArray(patientsBody?.profiles) ? patientsBody.profiles : [];
      setHasVerifiedChatMobile(true);
      setChatProfiles(profiles);
      setSelectedChatProfileId(profiles[0]?.id || '');

      if (profiles.length > 1) {
        setMessages((current) => [
          ...current,
          createMessage(
            'bot',
            'Mobile number verified. Multiple patient profiles are linked to this number. Please select the profile you want to use in this chat.',
            { kind: 'profile-select' }
          ),
        ]);
      } else if (profiles.length === 1) {
        await refreshSession();
        setMessages((current) => [
          ...current,
          createMessage(
            'bot',
            `You are logged in as ${profiles[0].name}. I can now help with upcoming appointments, prescriptions, history, cancellation, and rescheduling.`
          ),
        ]);
      } else {
        setMessages((current) => [
          ...current,
          createMessage(
            'bot',
            'Mobile number verified, but no patient profile is linked to this number yet. Create a patient profile to continue.',
            { kind: 'profile-register' }
          ),
        ]);
      }
      toast.success('Logged in successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const registerChatProfile = async () => {
    const age = Number(registrationAge);
    if (registrationName.trim().length < 2) {
      toast.error('Enter the patient name.');
      return;
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      toast.error('Enter a valid age between 1 and 120.');
      return;
    }
    if (!['M', 'F', 'O'].includes(registrationGender)) {
      toast.error('Select the patient gender.');
      return;
    }
    if (!hasAcceptedProfileConsent) {
      toast.error('Please accept consent to create this profile.');
      return;
    }

    setIsRegisteringProfile(true);
    try {
      const response = await fetch('/api/patient-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registrationName,
          age,
          gender: registrationGender,
          email: registrationEmail,
          isFamilyMember: false,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to register patient.');
      }

      await refreshSession();
      setMessages((current) => [
        ...current,
        createMessage(
          'bot',
          `Patient profile created for ${body?.profile?.name || registrationName}. I can now help with appointments, prescriptions, history, cancellation, and rescheduling for this patient.`
        ),
      ]);
      toast.success('Patient registered successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to register patient.');
    } finally {
      setIsRegisteringProfile(false);
    }
  };

  const selectChatProfile = async () => {
    const profile = chatProfiles.find((item) => item.id === selectedChatProfileId);
    if (!profile) {
      toast.error('Select a patient profile.');
      return;
    }

    setIsSelectingProfile(true);
    try {
      const response = await fetch('/api/patient-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: profile.accessToken }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to select patient profile.');
      }

      await refreshSession();
      setMessages((current) => [
        ...current,
        createMessage(
          'bot',
          `Profile selected: ${profile.name}. I can now help with upcoming appointments, prescriptions, history, cancellation, and rescheduling for this patient.`
        ),
      ]);
      toast.success('Patient profile selected.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to select profile.');
    } finally {
      setIsSelectingProfile(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] h-14 w-14 rounded-full shadow-lg md:bottom-6 md:right-6',
          isOpen && 'hidden'
        )}
        aria-label="Open Docty assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {isOpen && (
        <section className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex h-[calc(100svh-7rem-env(safe-area-inset-bottom))] max-w-md flex-col overflow-hidden rounded-lg border bg-background shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[640px] md:max-h-[82svh] md:w-[420px]">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">Docty Assistant</h2>
                <p className="truncate text-xs text-muted-foreground">
                  Patient help, not medical advice
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <X className="h-5 w-5" />
            </Button>
          </header>

          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <div className="space-y-3 p-4 pb-8">
              <div className="flex flex-wrap gap-2">
                <Badge variant={isAuthenticated ? 'default' : 'secondary'} className="rounded-md">
                  {isAuthenticated ? 'Logged in' : 'Guest booking enabled'}
                </Badge>
                <Badge variant="outline" className="rounded-md">
                  No diagnosis or prescriptions
                </Badge>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                This assistant is only to help patients with general information and appointment
                guidance. It is not medical advice, diagnosis, or treatment.
              </div>
              {messages.length === 1 && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={startAppointmentHelp}
                  >
                    Appointment
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startServiceLead({
                        label: 'Lab Tests',
                        type: 'service',
                        serviceCategory: 'Lab Tests',
                        interest: 'Lab Tests',
                      })
                    }
                  >
                    Lab Tests
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startServiceLead({
                        label: 'Pharmacy',
                        type: 'pharmacy',
                        serviceCategory: 'Pharmacy',
                        interest: 'Pharmacy order request',
                      })
                    }
                  >
                    Pharmacy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startServiceLead({
                        label: 'Home Care',
                        type: 'service',
                        serviceCategory: 'Home Care',
                        interest: 'Home Care',
                      })
                    }
                  >
                    Homecare
                  </Button>
                </div>
              )}

              {messages.map((message, index) => {
                const isLatestBotMessage =
                  message.role === 'bot' &&
                  index === messages.findLastIndex((item) => item.role === 'bot');

                return (
                <div
                  key={message.id}
                  ref={isLatestBotMessage ? latestBotMessageRef : undefined}
                  className={cn(
                    'flex min-w-0',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'min-w-0 max-w-[88%] overflow-hidden rounded-lg px-3 py-2 text-sm leading-6',
                      message.kind === 'service-lead' && message.serviceLead?.label === 'Pharmacy' && 'w-full max-w-full',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="whitespace-pre-line">{message.text}</p>

                    {message.kind === 'emergency' && (
                      <div className="mt-3 space-y-2 rounded-md border border-destructive/30 bg-background p-3 text-foreground">
                        <div className="flex items-start gap-2 text-destructive">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <p className="text-xs font-semibold">Emergency mode</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button asChild size="sm" variant="destructive">
                            <a href={`tel:${EMERGENCY_PHONE}`}>
                              <Phone className="mr-1.5 h-4 w-4" />
                              Call 112
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href={`tel:${CLINIC_EMERGENCY_PHONE}`}>
                              <Phone className="mr-1.5 h-4 w-4" />
                              Call Clinic
                            </a>
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            value={emergencyLead.name}
                            onChange={(event) =>
                              setEmergencyLead((current) => ({ ...current, name: event.target.value }))
                            }
                            placeholder="Patient name"
                          />
                          <Input
                            value={emergencyLead.mobile}
                            onChange={(event) =>
                              setEmergencyLead((current) => ({ ...current, mobile: event.target.value }))
                            }
                            placeholder="Contact number"
                            inputMode="tel"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={handleEmergencyLead}
                            disabled={isSubmittingEmergencyLead}
                          >
                            {isSubmittingEmergencyLead ? 'Generating lead...' : 'Request Urgent Callback'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.kind === 'login' && (
                      isAuthenticated ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link to="/patient">
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Open Portal
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3 rounded-md border bg-background p-3 text-foreground">
                          {authMode === 'choice' ? (
                            <>
                              <p className="text-xs font-semibold">Continue as</p>
                              <div className="grid grid-cols-2 gap-2">
                                <Button type="button" size="sm" onClick={startChatLogin}>
                                  Login
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={startChatRegistration}>
                                  Register
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-start gap-2">
                                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                <p className="text-xs font-semibold">
                                  {authMode === 'register' ? 'Verify mobile to register' : 'Login with OTP'}
                                </p>
                              </div>

                              {loginStep === 'mobile' ? (
                                <div className="space-y-3">
                                  <div className="flex rounded-md border border-input bg-background">
                                    <span className="flex items-center border-r px-3 text-xs font-medium text-muted-foreground">
                                      +91
                                    </span>
                                    <Input
                                      value={loginMobile}
                                      onChange={(event) =>
                                        setLoginMobile(event.target.value.replace(/\D/g, '').slice(0, 10))
                                      }
                                      placeholder="10-digit mobile"
                                      inputMode="numeric"
                                      maxLength={10}
                                      className="h-10 border-0 shadow-none focus-visible:ring-0"
                                    />
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      id="chatbot-login-consent"
                                      checked={hasAcceptedLoginConsent}
                                      onCheckedChange={(checked) => setHasAcceptedLoginConsent(checked === true)}
                                    />
                                    <Label
                                      htmlFor="chatbot-login-consent"
                                      className="text-[11px] font-normal leading-4 text-muted-foreground"
                                    >
                                      I authorise OTP verification and retrieval of patient profiles linked to this
                                      mobile number.
                                    </Label>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="w-full"
                                    onClick={sendLoginOtp}
                                    disabled={isSendingOtp || loginMobile.length !== 10 || !hasAcceptedLoginConsent}
                                  >
                                    {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <p className="text-xs text-muted-foreground">
                                    Enter the OTP sent to +91 ******{loginMobile.slice(-4)}.
                                  </p>
                                  <Input
                                    value={loginOtp}
                                    onChange={(event) => {
                                      const code = event.target.value.replace(/\D/g, '').slice(0, 4);
                                      setLoginOtp(code);
                                      if (code.length === 4) {
                                        window.setTimeout(() => void verifyLoginOtp(code), 120);
                                      }
                                    }}
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    maxLength={4}
                                    placeholder="OTP"
                                    className="h-11 text-center text-lg font-bold tracking-[0.35em]"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setLoginStep('mobile')}
                                      disabled={isVerifyingOtp}
                                    >
                                      Change
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => void verifyLoginOtp()}
                                      disabled={loginOtp.length !== 4 || isVerifyingOtp}
                                    >
                                      {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                                    </Button>
                                  </div>
                                  <button
                                    type="button"
                                    className="w-full text-xs font-semibold text-primary disabled:opacity-50"
                                    disabled={isSendingOtp}
                                    onClick={sendLoginOtp}
                                  >
                                    {isSendingOtp ? 'Resending...' : 'Resend OTP'}
                                  </button>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAuthMode('choice')}
                                >
                                  Back
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={authMode === 'register' ? startChatLogin : startChatRegistration}
                                >
                                  {authMode === 'register' ? 'Login instead' : 'Register instead'}
                                </Button>
                              </div>
                            </>
                          )}

                          <Button asChild size="sm" variant="ghost" className="w-full">
                            <Link to="/patient">Open full patient login</Link>
                          </Button>
                        </div>
                      )
                    )}

                    {message.kind === 'appointment' && (
                      <>
                        <DoctorRecommendationCards
                          doctors={
                            message.doctorRecommendations?.length
                              ? message.doctorRecommendations
                              : message.triage?.specialty
                                ? formatDoctorMatches(doctors, message.triage.specialty)
                                : []
                          }
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link to={`/book-appointment?service=${encodeURIComponent(message.triage?.specialty || '')}`}>
                              <CalendarPlus className="mr-1.5 h-4 w-4" />
                              Book Appointment
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/book-appointment">
                              <Stethoscope className="mr-1.5 h-4 w-4" />
                              View Doctors
                            </Link>
                          </Button>
                        </div>
                      </>
                    )}

                    {message.kind === 'service-lead' && message.serviceLead && (
                      <div className="mt-3 space-y-3">
                        {message.serviceLead.label === 'Pharmacy' ? (
                          <>
                            <ChatPharmacyFindMedicinesCard
                              query={pharmacyQuery}
                              onQueryChange={setPharmacyQuery}
                              results={pharmacySearchResults}
                              isSearching={isPharmacySearching}
                              hasSearched={hasPharmacySearched}
                              onAdd={addMedicineToChatCart}
                              onRequestUnavailable={requestUnavailableChatMedicine}
                            />
                            {pharmacyCartItems.length > 0 && (
                              <ChatPharmacyCartOrder
                                items={pharmacyCartItems}
                                patientName={serviceLeadName}
                                patientMobile={serviceLeadMobile}
                                address={pharmacyAddress}
                                area={pharmacyArea}
                                city={pharmacyCity}
                                pincode={pharmacyPincode}
                                notes={serviceLeadNotes}
                                isSubmitting={isSubmittingPharmacyOrder}
                                onPatientNameChange={setServiceLeadName}
                                onPatientMobileChange={setServiceLeadMobile}
                                onAddressChange={setPharmacyAddress}
                                onAreaChange={setPharmacyArea}
                                onCityChange={setPharmacyCity}
                                onPincodeChange={setPharmacyPincode}
                                onNotesChange={setServiceLeadNotes}
                                onQuantityChange={updateChatCartQuantity}
                                onSubmit={() => void submitChatPharmacyOrder()}
                              />
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={goBackToChatOptions}>
                                Go Back
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={cancelChatPharmacyOrder}>
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2 rounded-md border bg-background p-3 text-foreground">
                            {message.serviceLead.label === 'Lab Tests' && (
                              <LabTestCards
                                services={labTestServices}
                                onSelect={selectLabTestService}
                              />
                            )}
                            <Input
                              value={serviceLeadName}
                              onChange={(event) => setServiceLeadName(event.target.value)}
                              placeholder="Patient name"
                            />
                            <Input
                              value={serviceLeadMobile}
                              onChange={(event) => setServiceLeadMobile(event.target.value)}
                              placeholder="Contact number"
                              inputMode="tel"
                            />
                            <Textarea
                              value={serviceLeadNotes}
                              onChange={(event) => setServiceLeadNotes(event.target.value)}
                              placeholder="Tell us what you need"
                              className="min-h-20 resize-none text-sm"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="w-full"
                              onClick={() => void submitServiceLead(message.serviceLead as ServiceLeadDraft)}
                              disabled={isSubmittingServiceLead}
                            >
                              {isSubmittingServiceLead ? 'Submitting...' : `Submit ${message.serviceLead.label} Request`}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {message.kind === 'profile-select' && (
                      <div className="mt-3 space-y-3 rounded-md border bg-background p-3 text-foreground">
                        <p className="text-xs font-semibold">Select patient profile</p>
                        <div className="space-y-2">
                          {chatProfiles.map((profile) => (
                            <label
                              key={profile.id}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors',
                                selectedChatProfileId === profile.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border bg-background hover:border-primary/50'
                              )}
                            >
                              <input
                                type="radio"
                                name="chatbot-patient-profile"
                                value={profile.id}
                                checked={selectedChatProfileId === profile.id}
                                onChange={() => setSelectedChatProfileId(profile.id)}
                                className="h-4 w-4 accent-primary"
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{profile.name}</span>
                                {profile.relation && (
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {profile.relation}
                                  </span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          onClick={selectChatProfile}
                          disabled={!selectedChatProfileId || isSelectingProfile}
                        >
                          {isSelectingProfile ? 'Selecting...' : 'Use Selected Profile'}
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="w-full">
                          <Link to="/patient">Manage profiles in portal</Link>
                        </Button>
                      </div>
                    )}

                    {message.kind === 'profile-register' && (
                      <div className="mt-3 space-y-3 rounded-md border bg-background p-3 text-foreground">
                        <p className="text-xs font-semibold">Create patient profile</p>
                        {!canRegisterChatProfile && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                            Verify the mobile number above before submitting this registration.
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="chat-registration-name" className="text-xs">
                            Patient Name *
                          </Label>
                          <Input
                            id="chat-registration-name"
                            value={registrationName}
                            onChange={(event) => setRegistrationName(event.target.value)}
                            placeholder="Enter full name"
                            autoComplete="name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="chat-registration-age" className="text-xs">
                              Age *
                            </Label>
                            <Input
                              id="chat-registration-age"
                              value={registrationAge}
                              onChange={(event) =>
                                setRegistrationAge(event.target.value.replace(/\D/g, '').slice(0, 3))
                              }
                              inputMode="numeric"
                              placeholder="Years"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="chat-registration-gender" className="text-xs">
                              Gender *
                            </Label>
                            <select
                              id="chat-registration-gender"
                              value={registrationGender}
                              onChange={(event) => setRegistrationGender(event.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                              <option value="">Select</option>
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                              <option value="O">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chat-registration-email" className="text-xs">
                            Email (Optional)
                          </Label>
                          <Input
                            id="chat-registration-email"
                            value={registrationEmail}
                            onChange={(event) => setRegistrationEmail(event.target.value)}
                            placeholder="name@example.com"
                            type="email"
                            autoComplete="email"
                          />
                        </div>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="chat-profile-registration-consent"
                            checked={hasAcceptedProfileConsent}
                            onCheckedChange={(checked) => setHasAcceptedProfileConsent(checked === true)}
                          />
                          <Label
                            htmlFor="chat-profile-registration-consent"
                            className="text-[11px] font-normal leading-4 text-muted-foreground"
                          >
                            I confirm that the information is accurate and that I am authorised to
                            create this patient profile.
                          </Label>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full"
                          onClick={registerChatProfile}
                          disabled={
                            isRegisteringProfile ||
                            !canRegisterChatProfile ||
                            registrationName.trim().length < 2 ||
                            !registrationAge ||
                            !registrationGender ||
                            !hasAcceptedProfileConsent
                          }
                        >
                          {isRegisteringProfile ? 'Creating Profile...' : 'Create Profile & Continue'}
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="w-full">
                          <Link to="/patient">Open full registration</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </ScrollArea>

          <footer className="shrink-0 border-t bg-background p-3">
            {!isPharmacyFlowActive && (
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Describe your concern or ask to book an appointment"
                  className="max-h-28 min-h-12 resize-none rounded-lg text-sm"
                />
                <Button type="button" size="icon" className="h-12 w-12 shrink-0 rounded-lg" onClick={handleSend}>
                  <Send className="h-5 w-5" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            )}
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              For quick assistance, call{' '}
              <a href={`tel:${CLINIC_EMERGENCY_PHONE}`} className="font-semibold text-primary">
                9989804888
              </a>
              . For emergencies, call 112 immediately.
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
