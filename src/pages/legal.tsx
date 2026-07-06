import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Mail, Phone } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

interface LegalDocument {
  title: string;
  summary: string;
  sections: LegalSection[];
}

const documents: Record<string, LegalDocument> = {
  '/privacy-policy': {
    title: 'Privacy Policy',
    summary:
      'How Docty Clinics processes, shares, and protects personal and health-related information.',
    sections: [
      {
        title: 'Scope and our role',
        paragraphs: [
          'Docty Clinics operates this website as a patient-access, appointment-coordination, and support interface. Clinical management is performed in the Eka Care clinic management system, which remains the clinical system of record.',
          'Docty does not operate a separate patient or clinical-record database for this website. Information may nevertheless be processed temporarily in the patient’s browser and through our protected hosting APIs when a user authenticates, views a profile, manages an appointment, or submits a request.',
        ],
      },
      {
        title: 'Information processed',
        items: [
          'Identity and contact details needed for a requested workflow, such as name, mobile number, email, age, gender, date of birth, and family relationship.',
          'Patient profiles, appointments, prescription links, consultation, and payment information retrieved from Eka Care for the selected patient.',
          'Booking, callback, package, subscription, clinic, doctor, and service preferences.',
          'Security and technical data required to operate and protect the service, including encrypted session tokens, request metadata, and essential cookies.',
        ],
      },
      {
        title: 'Purposes of processing',
        items: [
          'To authenticate users by OTP and provide access to patient profiles.',
          'To retrieve, create, or update Eka Care patient profiles at the user’s direction.',
          'To book, view, and modify eligible appointments.',
          'To contact users regarding callbacks, packages, subscriptions, appointments, or support.',
          'To prevent misuse, maintain security, investigate incidents, comply with legal obligations, and improve service reliability.',
        ],
      },
      {
        title: 'Systems and service providers',
        items: [
          'Eka Care is used for clinical management, patient profiles, doctor and clinic information, appointments, schedules, prescriptions, and other supported clinical workflows.',
          'Zoho CRM is used by authorised support staff for non-clinical follow-up. Leads are limited to name, contact number, an approved general service category, location, and structured operational remarks such as doctor, requested date, package, plan, or enquiry source. Age, gender, date of birth, symptoms, diagnoses, prescriptions, and medical history are not included in the Zoho lead payload.',
          'MSG91 is used for OTP authentication and a generic WhatsApp confirmation. The WhatsApp request contains the mobile number and approved generic template information; it does not include patient name, doctor, clinic, service, package, appointment date, diagnosis, or clinical records.',
          'Vercel hosts the application and protected serverless APIs. Patient data may pass through these APIs transiently to complete requested workflows, but the application does not intentionally persist a separate patient database on Vercel.',
          'Clinics and healthcare professionals receive information necessary to provide the selected healthcare service.',
        ],
      },
      {
        title: 'Security and sessions',
        items: [
          'Patient sessions use encrypted, authenticated, HTTP-only, Secure cookies and expire after 30 minutes or when the user logs out.',
          'Patient-selection tokens are encrypted, purpose-restricted, and expire with the authenticated session.',
          'Patient API responses are marked private and not intended to be cached.',
          'Credentials and third-party API keys are held in protected server-side configuration and are not intentionally exposed in browser code.',
          'No internet transmission or storage system can be guaranteed completely secure.',
        ],
      },
      {
        title: 'Retention and data minimisation',
        paragraphs: [
          'Clinical records are retained and managed in Eka Care according to the clinic’s clinical, legal, and operational requirements. Docty does not maintain a duplicate clinical-record database for this website.',
          'Zoho support information should be retained only for the period reasonably needed to resolve and follow up the enquiry, subject to applicable contractual and legal requirements. Generic MSG91 delivery records may be retained by the provider according to its service terms.',
        ],
      },
      {
        title: 'Shared mobile numbers and family profiles',
        paragraphs: [
          'A verified mobile number may be associated with more than one Eka Care patient profile. Anyone who can receive the OTP may be able to see profiles linked to that number. Users must proceed only when authorised by the relevant patient.',
          'A parent or lawful guardian may manage a minor’s profile. A person accessing another adult’s profile must have that adult’s permission or other lawful authority. Sensitive information should not be viewed on a shared device without the patient’s permission.',
          'Please contact us promptly if a profile should be removed from a mobile number, access appears incorrect, or you suspect unauthorised use.',
        ],
      },
      {
        title: 'Your choices and requests',
        items: [
          'Request information about personal data processed through the service.',
          'Request correction of inaccurate profile information.',
          'Request erasure where applicable and where retention is not required for healthcare, legal, safety, accounting, or contractual purposes.',
          'Withdraw optional consent or stop using the patient portal. Withdrawal does not invalidate processing already completed at the user’s request.',
          'Raise a grievance or report suspected unauthorised access.',
        ],
      },
    ],
  },
  '/terms': {
    title: 'Terms of Use',
    summary:
      'The rules governing access to and use of the Docty Clinics website and patient services.',
    sections: [
      {
        title: 'Using the service',
        items: [
          'Provide accurate information and use patient profiles only when authorised to do so.',
          'Keep OTPs and account access secure and notify us of suspected unauthorised access.',
          'On a shared mobile number or device, do not open another adult’s profile or sensitive information without their permission.',
          'A parent or lawful guardian is responsible for managing a minor’s profile and confirming that the relationship information is accurate.',
          'Do not misuse, disrupt, reverse engineer, scrape, or attempt unauthorised access to the service.',
        ],
      },
      {
        title: 'Appointments and healthcare services',
        paragraphs: [
          'Appointment requests are subject to doctor, clinic, and slot availability. A submitted request is not guaranteed until confirmed.',
          'Eligible upcoming appointments may be modified through the patient portal. A modification is completed only after the new slot is accepted by Eka Care, and availability may change before confirmation.',
          'Clinical decisions, diagnosis, prescriptions, and treatment are provided by the relevant healthcare professional. The website is an access and coordination service.',
          'Clinical management and clinical records are maintained in Eka Care, not in a separate Docty website database.',
        ],
      },
      {
        title: 'Prices and payments',
        paragraphs: [
          'Displayed prices, inclusions, offers, and availability may change. The final amount and service details will be confirmed before or at the clinic. Any applicable cancellation or refund is governed by the Cancellation, Refund and Rescheduling Policy.',
        ],
      },
      {
        title: 'Third-party services',
        paragraphs: [
          'The service depends on Eka Care, MSG91, Zoho CRM, Vercel, telecommunications networks, and other supporting providers. Their availability, security controls, and processing are also governed by their applicable contracts and service terms.',
        ],
      },
      {
        title: 'Availability and liability',
        paragraphs: [
          'We aim to keep the service accurate and available but cannot guarantee uninterrupted operation or that third-party systems will always be available. Nothing in these terms excludes liability that cannot lawfully be excluded.',
        ],
      },
    ],
  },
  '/medical-disclaimer': {
    title: 'Medical Disclaimer',
    summary: 'Important limitations concerning medical information and emergency care.',
    sections: [
      {
        title: 'Not emergency care',
        paragraphs: [
          'This website is not an emergency service. If you believe someone is experiencing a medical emergency, call 112 or go to the nearest emergency department immediately.',
        ],
      },
      {
        title: 'General information only',
        paragraphs: [
          'Website content, package descriptions, automated reports, and general health information do not replace examination, diagnosis, or treatment by a qualified healthcare professional.',
          'Do not delay or discontinue professional medical care because of information displayed on this website.',
        ],
      },
      {
        title: 'Clinical responsibility',
        paragraphs: [
          'Doctors and healthcare professionals remain responsible for their independent clinical judgement. Test results and prescriptions should be interpreted in the context of the patient’s complete medical history.',
          'The patient portal displays information received from Eka Care and does not independently verify or reinterpret the clinical record.',
        ],
      },
    ],
  },
  '/cancellation-refund-policy': {
    title: 'Cancellation, Refund & Rescheduling Policy',
    summary: 'How appointment, package, subscription, and payment changes are handled.',
    sections: [
      {
        title: 'Appointments',
        paragraphs: [
          'Eligible upcoming appointments may be modified through the patient portal by selecting a new available slot. The doctor and clinic remain unchanged unless a separate booking is made.',
          'A modification is effective only after confirmation from the connected appointment system. If modification is unavailable or fails, the original appointment remains in place.',
          'Cancellation is not currently completed through the patient portal. Please contact the clinic as early as possible to request cancellation. Changes remain subject to doctor and clinic availability.',
        ],
      },
      {
        title: 'Packages and subscriptions',
        paragraphs: [
          'Eligibility for cancellation, transfer, or refund depends on whether services, tests, consultations, or benefits have already been used or scheduled.',
        ],
      },
      {
        title: 'Refunds',
        paragraphs: [
          'Approved refunds are returned through the original payment method where practicable. Bank or payment-provider processing times may apply. Cash payments may require clinic verification.',
        ],
      },
      {
        title: 'How to request a change',
        paragraphs: [
          'Use the Modify option for an eligible upcoming appointment, or call 99898 04888 or email care@doctyclinics.com with only the minimum information needed to identify the booking and requested change. Do not send prescriptions, diagnoses, or unnecessary medical history by ordinary email.',
        ],
      },
    ],
  },
  '/consent-notice': {
    title: 'Patient Consent Notice',
    summary:
      'What you authorise when using OTP-based patient access and healthcare workflows.',
    sections: [
      {
        title: 'Your authorisation',
        items: [
          'Verify the supplied mobile number using OTP.',
          'Retrieve patient profiles associated with that verified number from connected healthcare systems.',
          'Create, update, and select patient or family-member profiles at your direction.',
          'Retrieve appointments and related clinical or payment information from Eka Care for the selected patient.',
          'Book or modify eligible appointments at your direction.',
          'Share necessary details with the selected clinic, doctor, laboratory, pharmacy, or service provider.',
          'Share limited non-clinical enquiry details with authorised Docty support staff through Zoho CRM when a callback, package, subscription, pharmacy, or appointment-support request is submitted.',
          'Send OTPs and generic service confirmations to the verified or submitted mobile number through MSG91.',
        ],
      },
      {
        title: 'Shared mobile and family-profile confirmation',
        paragraphs: [
          'A mobile number may be linked to multiple family profiles in Eka Care. By selecting or managing another person’s profile, you confirm that you have that person’s permission or other lawful authority.',
          'For a minor, you confirm that you are the parent or lawful guardian or are otherwise authorised to act for the child. For another adult, you must not view appointments, prescriptions, payments, or other sensitive information without that adult’s permission.',
          'Do not continue on a shared device if another person may be able to see the patient’s information.',
        ],
      },
      {
        title: 'Support communications',
        paragraphs: [
          'Zoho CRM receives only the limited information needed for support follow-up: name, contact number, general service category, location, and structured operational remarks. It does not receive age, gender, date of birth, symptoms, diagnoses, prescriptions, or medical history from the lead workflow.',
          'MSG91 receives the mobile number required for OTP or generic WhatsApp delivery. Generic WhatsApp confirmations do not identify the doctor, clinic, service, package, appointment date, diagnosis, or treatment.',
        ],
      },
      {
        title: 'Withdrawal and limitations',
        paragraphs: [
          'You may log out, stop using the service, or contact us regarding consent and data rights. Withdrawal does not invalidate processing already performed and may be limited where records must be retained for healthcare, safety, accounting, contractual, or legal reasons.',
        ],
      },
    ],
  },
  '/grievance': {
    title: 'Grievance & Privacy Contact',
    summary:
      'How to contact Docty Clinics about privacy, account access, corrections, or complaints.',
    sections: [
      {
        title: 'Contact us',
        paragraphs: [
          'Email care@doctyclinics.com or call 99898 04888. Please include your name, verified mobile number, a clear description of the request, and the minimum reference information needed for us to assist.',
          'Do not send OTPs, passwords, prescriptions, diagnoses, or full medical records by ordinary email.',
        ],
      },
      {
        title: 'Requests we can help with',
        items: [
          'Access, correction, or deletion requests.',
          'Consent withdrawal and account-access concerns.',
          'A profile linked to the wrong or shared mobile number.',
          'A request to restrict or remove family-profile access.',
          'Suspected unauthorised access or data-security incidents.',
          'Appointment, payment, refund, and service complaints.',
        ],
      },
      {
        title: 'Identity verification',
        paragraphs: [
          'To protect patient information, we may verify identity and authority before acting on a request. Healthcare records may need to be retained in Eka Care where required for treatment, safety, accounting, contractual, or legal reasons.',
        ],
      },
    ],
  },
  '/cookie-policy': {
    title: 'Cookie Policy',
    summary: 'How this website currently uses browser storage and cookies.',
    sections: [
      {
        title: 'Essential session cookie',
        paragraphs: [
          'The patient portal uses an essential encrypted and authenticated session cookie. It is HTTP-only, Secure, restricted from cross-site use through SameSite controls, and expires after 30 minutes or when the user logs out.',
          'The cookie contains encrypted session information needed to identify the verified mobile session and selected patient. It is not readable by normal browser JavaScript.',
        ],
      },
      {
        title: 'Analytics and advertising',
        paragraphs: [
          'The current patient workflow does not require advertising cookies. If optional analytics, advertising, session replay, or tracking technologies are introduced, this policy and the consent controls must be reviewed before they are enabled on patient workflows.',
        ],
      },
      {
        title: 'Caching and shared devices',
        paragraphs: [
          'Patient API responses are marked private and no-store. Users should still log out after using a shared device and should avoid saving screenshots or downloads where others can access them.',
        ],
      },
      {
        title: 'Browser controls',
        paragraphs: [
          'Blocking essential cookies may prevent OTP-authenticated patient features from working correctly.',
        ],
      },
    ],
  },
  '/children-dependants': {
    title: 'Children & Dependants Policy',
    summary:
      'Rules for creating and managing profiles for minors and dependent family members.',
    sections: [
      {
        title: 'Authority to act',
        paragraphs: [
          'A profile for a minor must be created and managed by a parent or lawful guardian or another person lawfully authorised to act for the child. The responsible adult confirms this authority when creating or managing the profile.',
          'A user managing another adult’s profile must have that person’s permission or other lawful authority. Family relationship alone does not remove the need to respect that adult’s privacy.',
        ],
      },
      {
        title: 'Profiles linked to a shared mobile number',
        paragraphs: [
          'Eka Care may return multiple patient profiles associated with one verified mobile number. Anyone able to receive the OTP for that number may potentially access the linked profile list through the portal.',
          'Users must select only profiles they are authorised to manage. Contact Docty Clinics if a profile is incorrectly linked, access should be removed, or the mobile number should be updated.',
        ],
      },
      {
        title: 'Use of dependent information',
        paragraphs: [
          'Dependent information is processed to identify the patient and support profiles, appointments, healthcare services, clinical records in Eka Care, billing, and related support. It should not be used for unrelated purposes.',
          'Docty support leads are data-minimised and should not include the dependant’s symptoms, diagnosis, prescriptions, or medical history.',
        ],
      },
      {
        title: 'Accuracy and control',
        paragraphs: [
          'The responsible adult should keep dependent details accurate, use the correct relationship label, and contact us if access should be corrected or removed.',
          'When the dependant becomes able to manage their own care, the family should update the registered mobile number and access arrangement where appropriate.',
        ],
      },
    ],
  },
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const document = documents[pathname] || documents['/terms'];

  return (
    <div className="bg-muted/20 pb-16 pt-28">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary">Docty Clinics</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{document.title}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">{document.summary}</p>
          <p className="mt-3 text-xs text-muted-foreground">Last updated: 20 June 2026</p>
        </div>

        {pathname === '/medical-disclaimer' && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
            <p className="text-sm font-medium">
              For a medical emergency, call 112 or visit the nearest emergency department.
            </p>
          </div>
        )}

        <Card className="rounded-3xl">
          <CardContent className="space-y-8 p-6 md:p-9">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <a
            href="mailto:care@doctyclinics.com"
            className="flex items-center gap-2 text-primary"
          >
            <Mail className="h-4 w-4" />
            care@doctyclinics.com
          </a>
          <a
            href="tel:+919989804888"
            className="flex items-center gap-2 text-primary"
          >
            <Phone className="h-4 w-4" />
            99898 04888
          </a>
          <Link to="/grievance" className="font-semibold text-primary">
            Submit a grievance
          </Link>
        </div>
      </div>
    </div>
  );
}
