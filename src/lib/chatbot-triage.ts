export type ChatbotCapability =
  | 'health_education'
  | 'specialist_suggestion'
  | 'emergency_detection'
  | 'emergency_lead_generation'
  | 'clinic_info'
  | 'doctor_search'
  | 'slot_search'
  | 'guest_appointment_booking'
  | 'book_appointment'
  | 'reschedule_appointment'
  | 'cancel_appointment'
  | 'upcoming_appointments'
  | 'prescriptions'
  | 'visit_history'
  | 'patient_profile';

export const CHATBOT_CAPABILITIES: Record<'loggedOut' | 'loggedIn', ChatbotCapability[]> = {
  loggedOut: [
    'health_education',
    'specialist_suggestion',
    'emergency_detection',
    'emergency_lead_generation',
    'clinic_info',
    'doctor_search',
    'slot_search',
    'guest_appointment_booking',
  ],
  loggedIn: [
    'health_education',
    'specialist_suggestion',
    'emergency_detection',
    'emergency_lead_generation',
    'clinic_info',
    'doctor_search',
    'slot_search',
    'guest_appointment_booking',
    'book_appointment',
    'reschedule_appointment',
    'cancel_appointment',
    'upcoming_appointments',
    'prescriptions',
    'visit_history',
    'patient_profile',
  ],
};

export interface TriageResult {
  specialty: string;
  alternateSpecialty?: string;
  urgency: 'emergency' | 'same_day' | 'routine' | 'needs_more_info';
  reason: string;
  education?: string;
  possibleCauses?: string[];
  followUpQuestions?: string[];
  redFlags: string[];
}

const emergencyRules = [
  { pattern: /\b(chest pain|heart attack|crushing chest|severe chest)\b/i, label: 'chest pain' },
  { pattern: /\b(severe breathlessness|can't breathe|cannot breathe|blue lips|choking)\b/i, label: 'breathing difficulty' },
  { pattern: /\b(stroke|face droop|slurred speech|one side weak|sudden weakness)\b/i, label: 'stroke-like symptoms' },
  { pattern: /\b(unconscious|fainted|loss of consciousness|seizure)\b/i, label: 'loss of consciousness or seizure' },
  { pattern: /\b(severe bleeding|heavy bleeding|blood loss)\b/i, label: 'severe bleeding' },
  { pattern: /\b(suicidal|self harm|kill myself)\b/i, label: 'self-harm risk' },
  { pattern: /\b(anaphylaxis|severe allergy|swollen tongue|swollen throat)\b/i, label: 'severe allergic reaction' },
  { pattern: /\b(severe head injury|head trauma|accident|road accident)\b/i, label: 'major injury' },
  { pattern: /\b(pregnan\w*.*bleeding|pregnan\w*.*severe pain|labou?r pain)\b/i, label: 'pregnancy emergency' },
  { pattern: /\b(loss of bladder|loss of bowel|can't pass urine|cannot pass urine|saddle numbness|groin numbness)\b/i, label: 'serious back-pain warning signs' },
];

const specialtyRules = [
  { specialty: 'Cardiologist', pattern: /\b(heart|palpitation|bp|blood pressure|cardiac)\b/i },
  { specialty: 'Pulmonologist', pattern: /\b(asthma|wheez|breath|cough|lung)\b/i },
  { specialty: 'Dermatologist', pattern: /\b(skin|rash|itch|acne|eczema|allergy|hair fall)\b/i },
  { specialty: 'Orthopedician', pattern: /\b(joint|bone|fracture|sprain|back\s*pain|backpain|spine|sciatica|knee|shoulder|injury)\b/i },
  { specialty: 'Dentist', pattern: /\b(tooth|teeth|dental|gum|mouth pain)\b/i },
  { specialty: 'Ophthalmologist', pattern: /\b(eye|vision|red eye|blurred vision)\b/i },
  { specialty: 'ENT Specialist', pattern: /\b(ear|nose|throat|sinus|tonsil|hearing)\b/i },
  { specialty: 'Gynecologist', pattern: /\b(period|pregnan|vaginal|pcos|fertility|menstrual)\b/i },
  { specialty: 'Pediatrician', pattern: /\b(child|baby|infant|newborn|toddler|kid)\b/i },
  { specialty: 'Gastroenterologist', pattern: /\b(stomach|abdomen|acidity|gastric|vomit|diarrhea|constipation|liver)\b/i },
  { specialty: 'Neurologist', pattern: /\b(migraine|headache|numbness|nerve|dizziness|vertigo)\b/i },
  { specialty: 'Psychiatrist', pattern: /\b(anxiety|depression|panic|sleep|stress)\b/i },
  { specialty: 'Endocrinologist', pattern: /\b(diabetes|thyroid|hormone|sugar)\b/i },
  { specialty: 'Urologist', pattern: /\b(urine|urinary|kidney stone|burning urination)\b/i },
];

const healthConcernPattern =
  /\b(pain|ache|fever|cough|rash|itch|vomit|diarrhea|constipation|breath|dizzy|headache|injury|swelling|burning|bleeding|allergy|backpain|back\s*pain|stomach|skin|tooth|eye|ear|throat)\b/i;

function hasBackPainConcern(input: string) {
  return /\b(back\s*pain|backpain|lower back|upper back|spine|sciatica)\b/i.test(input);
}

function hasStomachPainConcern(input: string) {
  return /\b(stomach\s*pain|abdominal\s*pain|abdomen\s*pain|belly\s*pain|tummy\s*pain|gastric\s*pain)\b/i.test(input);
}

function hasSymptomContext(input: string) {
  return /\b(today|yesterday|hours?|days?|weeks?|months?|years?|since|after|before|sudden|gradual|mild|moderate|severe|worsening|better|left|right|upper|lower|fever|vomit|diarrhea|bleeding|swelling|injury|fall|pregnan|child|baby|diabetes|bp|asthma|breath|chest|dizzy|faint|numb|weak|rash spreading|pus|burning|urine|period)\b/i.test(
    input
  );
}

function hasAffirmedSymptom(input: string, pattern: RegExp) {
  const normalized = input.toLowerCase();
  const matches = normalized.matchAll(pattern);

  for (const match of matches) {
    const index = match.index || 0;
    const prefix = normalized.slice(Math.max(0, index - 18), index);
    if (!/\b(no|not|without|none|nil)\s+$/i.test(prefix)) return true;
  }

  return false;
}

export function triagePatientText(input: string): TriageResult {
  const redFlags = emergencyRules
    .filter((rule) => rule.pattern.test(input))
    .map((rule) => rule.label);

  if (redFlags.length > 0) {
    return {
      specialty: 'Emergency care',
      urgency: 'emergency',
      reason: `The concern includes ${redFlags.join(', ')}.`,
      redFlags,
    };
  }

  if (hasBackPainConcern(input)) {
    const longTermOrRadiating = /\b(long\s*term|longtime|long time|chronic|months?|weeks?|radiat|sciatica|leg pain|numb|tingl|weakness|injury|fall)\b/i.test(input);
    const hasDurationOrContext = /\b(today|yesterday|days?|weeks?|months?|years?|long\s*term|longtime|long time|chronic|since|after|injury|fall|lifting|sitting|posture|radiat|sciatica|leg pain|numb|tingl|weakness)\b/i.test(input);

    if (!hasDurationOrContext) {
      return {
        specialty: 'Physiotherapist or Orthopedician',
        alternateSpecialty: 'Orthopedician or Spine Specialist',
        urgency: 'needs_more_info',
        education:
          'Back pain can sometimes be related to posture, muscle strain, long sitting, lifting, or a longer-term spine or joint issue.',
        possibleCauses: ['posture-related strain', 'muscle strain', 'long sitting or lifting-related pain', 'spine or joint-related concern'],
        reason:
          'Before suggesting the right specialist, it is better to understand how long this has been happening and whether there are any warning symptoms.',
        followUpQuestions: [
          'How long have you had the back pain?',
          'Did it start after an injury, fall, lifting, or long sitting?',
          'Does the pain go down the leg, or do you have numbness, tingling, or weakness?',
          'Any fever, loss of bladder or bowel control, or numbness around the groin area?',
        ],
        redFlags: [],
      };
    }

    return {
      specialty: longTermOrRadiating ? 'Orthopedician or Spine Specialist' : 'Physiotherapist',
      alternateSpecialty: longTermOrRadiating ? 'Physiotherapist' : 'Orthopedician or Spine Specialist',
      urgency: /\b(severe|worsening|unbearable)\b/i.test(input) ? 'same_day' : 'routine',
      education:
        'Back pain can sometimes be related to posture, muscle strain, long sitting, lifting, or a longer-term spine or joint issue.',
      possibleCauses: longTermOrRadiating
        ? ['disc or nerve-related pain', 'sciatica-like pain', 'spine or joint-related concern', 'injury-related pain']
        : ['posture-related strain', 'muscle strain', 'long sitting or lifting-related pain'],
      reason: longTermOrRadiating
        ? 'Because you mentioned a longer-lasting, injury-related, or radiating back concern, an orthopedician or spine specialist may be more appropriate.'
        : 'If this is recent and related to posture, strain, or long sitting, a physiotherapist may be a good first appointment.',
      redFlags: [],
    };
  }

  if (hasStomachPainConcern(input)) {
    const hasContext = /\b(today|yesterday|hours?|days?|weeks?|months?|since|after|right side|left side|upper|lower|burning|acidity|gas|loose motion|diarrhea|vomit|fever|constipation|urine|urinary|pregnan|period|severe|worsening)\b/i.test(input);

    if (!hasContext) {
      return {
        specialty: 'General Physician',
        alternateSpecialty: 'Gastroenterologist',
        urgency: 'needs_more_info',
        education:
          'Stomach pain can happen for many reasons, including acidity, indigestion, infection, constipation, urinary issues, menstrual or pregnancy-related causes, or other abdominal conditions.',
        possibleCauses: ['acidity or indigestion', 'stomach infection', 'constipation', 'urinary symptoms', 'menstrual or pregnancy-related causes'],
        reason:
          'Before suggesting the right doctor, it is better to understand the location, duration, severity, and associated symptoms.',
        followUpQuestions: [
          'How long have you had the stomach pain?',
          'Where is the pain: upper abdomen, lower abdomen, right side, left side, or around the navel?',
          'Do you also have fever, vomiting, loose motions, constipation, burning urination, or acidity?',
          'Is the pain severe, worsening, or associated with fainting, blood in vomit/stool, pregnancy, or a rigid/swollen abdomen?',
        ],
        redFlags: [],
      };
    }

    const hasClearDigestiveSymptoms = hasAffirmedSymptom(
      input,
      /\b(acidity|gastric|reflux|burning|vomit|vomiting|diarrhea|loose motion|constipation)\b/gi
    );

    return {
      specialty: hasClearDigestiveSymptoms ? 'Gastroenterologist' : 'General Physician',
      alternateSpecialty: 'Gastroenterologist',
      urgency: /\b(severe|worsening|fever|vomit|blood|pregnan|faint|rigid|swollen)\b/i.test(input)
        ? 'same_day'
        : 'routine',
      education:
        'Stomach pain can be related to digestion, infection, constipation, urinary symptoms, menstrual or pregnancy-related concerns, or other abdominal conditions.',
      possibleCauses: ['acidity or indigestion', 'stomach infection', 'constipation', 'urinary symptoms', 'other abdominal conditions'],
      reason:
        'A general physician is often a good first appointment for unclear stomach pain, and a gastroenterologist may be appropriate when symptoms point toward digestion, acidity, vomiting, diarrhea, or constipation.',
      redFlags: [],
    };
  }

  if (hasHealthConcern(input) && !hasSymptomContext(input)) {
    return {
      specialty: 'General Physician',
      urgency: 'needs_more_info',
      education:
        'Symptoms can have different causes depending on duration, severity, location, and associated signs.',
      possibleCauses: ['a short-term strain or infection', 'inflammation', 'an underlying condition that needs examination'],
      reason:
        'Before suggesting the right doctor, it is better to understand a little more about what you are experiencing.',
      followUpQuestions: [
        'How long have you had this symptom?',
        'Is it mild, moderate, or severe, and is it getting worse?',
        'Where exactly do you feel it, if location applies?',
        'Do you have fever, vomiting, breathing difficulty, swelling, bleeding, dizziness, weakness, or any other symptom with it?',
      ],
      redFlags: [],
    };
  }

  const specialty = specialtyRules.find((rule) => rule.pattern.test(input))?.specialty || 'General Physician';
  const sameDay = /\b(high fever|severe pain|worsening|not improving|vomit|dehydration)\b/i.test(input);

  return {
    specialty,
    urgency: sameDay ? 'same_day' : 'routine',
    possibleCauses: possibleCausesForSpecialty(specialty, input),
    reason:
      specialty === 'General Physician'
        ? 'A general physician is usually the right first appointment for broad or unclear symptoms.'
        : `A ${specialty.toLowerCase()} commonly handles concerns like the one described.`,
    redFlags: [],
  };
}

function possibleCausesForSpecialty(specialty: string, input: string) {
  if (/\b(shoulder|joint|knee|sprain|injury|bone)\b/i.test(input)) {
    return ['muscle or ligament strain', 'joint inflammation', 'posture or overuse-related pain', 'injury-related pain'];
  }
  if (specialty === 'Dermatologist') {
    return ['skin allergy or irritation', 'infection', 'eczema-like rash', 'acne or hair-related concern'];
  }
  if (specialty === 'ENT Specialist') {
    return ['throat infection', 'sinus-related concern', 'ear infection or blockage', 'allergy-related symptoms'];
  }
  if (specialty === 'Pulmonologist') {
    return ['airway irritation', 'asthma-like symptoms', 'respiratory infection', 'allergy-related breathing symptoms'];
  }
  if (specialty === 'Neurologist') {
    return ['migraine-like headache', 'nerve-related symptoms', 'vertigo-like symptoms', 'stress or sleep-related headache'];
  }
  if (specialty === 'Dentist') {
    return ['tooth decay', 'gum inflammation', 'tooth infection', 'jaw or bite-related pain'];
  }
  if (specialty === 'Ophthalmologist') {
    return ['eye strain', 'infection or allergy', 'dryness', 'vision-related concern'];
  }
  if (specialty === 'Urologist') {
    return ['urinary infection', 'kidney stone-like pain', 'bladder irritation', 'urinary tract concern'];
  }
  return ['a short-term illness', 'inflammation', 'an underlying concern that needs examination'];
}

export function hasHealthConcern(input: string) {
  return healthConcernPattern.test(input) || specialtyRules.some((rule) => rule.pattern.test(input));
}

export function requiresLoginForChatRequest(input: string) {
  return /\b(my appointment|my appointments|upcoming appointment|upcoming appointments|reschedule|cancel|prescription|prescriptions|medical history|history|record|records|profile|profiles)\b/i.test(
    input
  );
}

export function isAppointmentIntent(input: string) {
  return /\b(book|appointment|consult|doctor|specialist|slot|available|availability)\b/i.test(input);
}
