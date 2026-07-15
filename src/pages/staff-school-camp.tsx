import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Flag,
  HeartPulse,
  Link,
  MessageCircle,
  MonitorPlay,
  Phone,
  Play,
  QrCode,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Timer,
  UserRound,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DoctyLogo } from '@/components/docty-logo';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type CampGroup = {
  id: string;
  label: string;
  grades: string;
  age: string;
  theme: string;
};

type CampQuestion = {
  id: string;
  category: 'Nutrition' | 'Oral' | 'Growth' | 'Mental wellness' | 'Vaccination' | 'Awareness';
  prompt: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
    risk?: boolean;
  }>;
  groups: string[];
};

type AwarenessTopic = {
  title: string;
  stage: string;
  icon: typeof Eye;
  summary: string;
  signs: string[];
  action: string;
};

type ChildProfile = {
  childName: string;
  parentName: string;
  mobile: string;
  grade: string;
  section: string;
  age: string;
};

type ConsultationNote = {
  id: string;
  service: 'Pediatrician' | 'Dentist' | 'Nutritionist' | 'Psychologist' | 'Vision' | 'Vaccination';
  clinician: string;
  finding: string;
  recommendation: string;
  followUp: string;
  bookingPath?: string;
};

type GeneratedReport = {
  title: string;
  summary: string;
  nextSteps: string[];
};

type HealthPassportMetrics = {
  height: string;
  weight: string;
  bmi: string;
  nutritionScore: number;
  oralScore: number;
  mentalWellbeingScore: number;
  growthStatus: string;
  vaccinationReminder: string;
  charts: Array<{ label: string; value: string; marker: number; status: string }>;
};

const campGroups: CampGroup[] = [
  {
    id: 'pre-primary',
    label: 'Pre-primary',
    grades: 'Nursery, LKG, UKG',
    age: '3-5 years',
    theme: 'Foundational screening with parent-friendly education',
  },
  {
    id: 'grades-1-2',
    label: 'Grades 1-2',
    grades: 'Class 1 and 2',
    age: '6-7 years',
    theme: 'Eating habits, dental care, vision and sleep',
  },
  {
    id: 'grades-3-5',
    label: 'Grades 3-5',
    grades: 'Class 3 to 5',
    age: '8-10 years',
    theme: 'Nutrition, learning, activity and oral health',
  },
  {
    id: 'grades-6-8',
    label: 'Grades 6-8',
    grades: 'Class 6 to 8',
    age: '11-13 years',
    theme: 'Puberty, emotional wellness, screen time and anemia risk',
  },
  {
    id: 'grades-9-plus',
    label: 'Grades 9+',
    grades: 'Class 9 and above',
    age: '14-17 years',
    theme: 'Stress, sleep, HPV awareness, lifestyle and follow-up intent',
  },
];

const allGroups = campGroups.map((group) => group.id);

const campQuestions: CampQuestion[] = [
  {
    id: 'breakfast',
    category: 'Nutrition',
    prompt: 'How often does the child eat breakfast before school?',
    description:
      'Use this to explain why breakfast supports attention, energy and mood in school. Skipping breakfast can be an early nutrition red flag.',
    groups: allGroups,
    options: [
      { id: 'daily', label: 'Daily' },
      { id: 'sometimes', label: '3-4 days/week' },
      { id: 'rarely', label: 'Rarely', risk: true },
      { id: 'never', label: 'Never', risk: true },
    ],
  },
  {
    id: 'protein',
    category: 'Nutrition',
    prompt: 'How many protein portions does the child usually have daily?',
    description:
      'Protein is important for growth, immunity and satiety. This question helps parents think beyond calories and look at quality of food.',
    groups: allGroups,
    options: [
      { id: 'two-plus', label: '2 or more' },
      { id: 'one', label: 'One' },
      { id: 'not-sure', label: 'Not sure', risk: true },
      { id: 'almost-none', label: 'Almost none', risk: true },
    ],
  },
  {
    id: 'brushing',
    category: 'Oral',
    prompt: 'How often does the child brush teeth?',
    description:
      'This opens a short oral-health discussion: night brushing, cavities, gum health, tooth pain and when a dental visit should not be delayed.',
    groups: allGroups,
    options: [
      { id: 'twice', label: 'Twice daily' },
      { id: 'once', label: 'Once daily' },
      { id: 'sometimes', label: 'Sometimes', risk: true },
      { id: 'pain', label: 'Has tooth pain', risk: true },
    ],
  },
  {
    id: 'activity',
    category: 'Growth',
    prompt: 'How much active play or sport does the child get most days?',
    description:
      'Active play supports healthy growth, sleep, posture and emotional regulation. Use this to connect growth assessment with daily routine.',
    groups: allGroups,
    options: [
      { id: 'sixty', label: '60+ minutes' },
      { id: 'thirty', label: '30-60 minutes' },
      { id: 'low', label: 'Less than 30 minutes', risk: true },
      { id: 'none', label: 'Almost none', risk: true },
    ],
  },
  {
    id: 'lazy-eye',
    category: 'Awareness',
    prompt: 'Has anyone noticed squinting, covering one eye, or one eye turning in/out?',
    description:
      'Lazy eye or squint can be missed in early childhood. Early screening is valuable because treatment works best when detected young.',
    groups: ['pre-primary', 'grades-1-2', 'grades-3-5'],
    options: [
      { id: 'no', label: 'No' },
      { id: 'sometimes', label: 'Sometimes', risk: true },
      { id: 'yes', label: 'Yes', risk: true },
      { id: 'not-checked', label: 'Never checked', risk: true },
    ],
  },
  {
    id: 'sleep',
    category: 'Mental wellness',
    prompt: 'How is the child sleeping on school nights?',
    description:
      'Sleep affects concentration, growth, appetite and behaviour. Loud snoring, frequent waking or very late sleep may need clinical attention.',
    groups: allGroups,
    options: [
      { id: 'good', label: 'Sleeps well' },
      { id: 'late', label: 'Sleeps late often', risk: true },
      { id: 'wakes', label: 'Wakes frequently', risk: true },
      { id: 'snoring', label: 'Snores loudly', risk: true },
    ],
  },
  {
    id: 'screen-time',
    category: 'Mental wellness',
    prompt: 'What is the usual non-school screen time per day?',
    description:
      'This question helps discuss digital habits without blaming parents. Tie it to sleep, eye strain, attention and physical activity.',
    groups: allGroups,
    options: [
      { id: 'under-one', label: 'Under 1 hour' },
      { id: 'one-two', label: '1-2 hours' },
      { id: 'two-four', label: '2-4 hours', risk: true },
      { id: 'four-plus', label: '4+ hours', risk: true },
    ],
  },
  {
    id: 'stress',
    category: 'Mental wellness',
    prompt: 'In the last month, how often has the student felt stressed or anxious?',
    description:
      'For older students, keep the tone supportive. This is a wellness screen, not a diagnosis, and can identify who may benefit from counselling.',
    groups: ['grades-6-8', 'grades-9-plus'],
    options: [
      { id: 'rarely', label: 'Rarely' },
      { id: 'sometimes', label: 'Sometimes' },
      { id: 'often', label: 'Often', risk: true },
      { id: 'daily', label: 'Almost daily', risk: true },
    ],
  },
  {
    id: 'vaccine-card',
    category: 'Vaccination',
    prompt: 'Does the family have the child vaccination record/card available?',
    description:
      'A vaccination card review is a simple high-value service. It helps identify missed boosters and gives parents a clear next step.',
    groups: allGroups,
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'digital', label: 'Digital record' },
      { id: 'not-now', label: 'Not now', risk: true },
      { id: 'not-sure', label: 'Not sure', risk: true },
    ],
  },
  {
    id: 'hpv',
    category: 'Vaccination',
    prompt: 'Have parents heard about HPV vaccination for cervical cancer prevention?',
    description:
      'Use this as awareness, not pressure. Parents should receive pediatrician-led counselling on age eligibility, benefits and safety.',
    groups: ['grades-6-8', 'grades-9-plus'],
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'somewhat', label: 'Somewhat' },
      { id: 'no', label: 'No', risk: true },
      { id: 'want-session', label: 'Want counselling', risk: true },
    ],
  },
];

const awarenessTopics: AwarenessTopic[] = [
  {
    title: 'Lazy Eye and Squint',
    stage: 'Pre-primary to Grade 5',
    icon: Eye,
    summary: 'Early eye screening matters because amblyopia responds best when detected young.',
    signs: ['One eye turning in or out', 'Covering one eye to see', 'Frequent squinting', 'Sitting too close to screens/books'],
    action: 'Refer for pediatric ophthalmology or vision screening when any sign is present.',
  },
  {
    title: 'HPV Vaccination',
    stage: 'Grades 6 and above',
    icon: ShieldCheck,
    summary: 'Position as parent education for future cancer prevention, especially for eligible adolescent girls.',
    signs: ['Parent has not heard of HPV', 'No vaccine counselling done', 'Doubts about safety', 'Family wants age eligibility guidance'],
    action: 'Offer pediatrician-led counselling and vaccination record review before any vaccine decision.',
  },
  {
    title: 'Dental Caries',
    stage: 'All groups',
    icon: Smile,
    summary: 'Tooth decay is easy to miss until pain starts, and school camps can identify early risk.',
    signs: ['Night brushing missing', 'Visible black spots', 'Tooth pain', 'Frequent sweets or sugary drinks'],
    action: 'Create dental follow-up buckets: hygiene counselling, dental check-up, urgent dental care.',
  },
  {
    title: 'Anemia and Nutrition',
    stage: 'Grades 1 and above',
    icon: HeartPulse,
    summary: 'Low energy, poor concentration and poor growth can be linked with nutrition gaps.',
    signs: ['Skipping breakfast', 'Low protein intake', 'Tiredness', 'Picky eating or low appetite'],
    action: 'Offer nutrition counselling and indicated lab package such as Hb after doctor review.',
  },
  {
    title: 'Stress and Screen Time',
    stage: 'Grades 6 and above',
    icon: Brain,
    summary: 'A soft mental wellness screen helps identify sleep, stress and attention concerns without stigma.',
    signs: ['Late sleep', 'High screen time', 'Exam anxiety', 'Bullying or withdrawal'],
    action: 'Flag for counsellor or pediatrician discussion, not a diagnosis at camp.',
  },
  {
    title: 'Vaccination Catch-up',
    stage: 'All groups',
    icon: ClipboardCheck,
    summary: 'The camp can remind parents to bring records and review missed boosters with a pediatrician.',
    signs: ['No record available', 'Unsure booster status', 'Recent missed vaccines', 'No pediatric follow-up'],
    action: 'Book vaccination record review and keep counselling aligned to current India schedule.',
  },
];

const riskSalesMap = [
  { label: 'Nutrition counselling', category: 'Nutrition', icon: Activity },
  { label: 'Dental follow-up', category: 'Oral', icon: Smile },
  { label: 'Pediatric review', category: 'Growth', icon: Stethoscope },
  { label: 'Wellness counselling', category: 'Mental wellness', icon: Brain },
  { label: 'Vaccination review', category: 'Vaccination', icon: ShieldCheck },
  { label: 'Vision screening', category: 'Awareness', icon: Eye },
] as const;

function seededOptionIndex(seed: number, optionCount: number) {
  return Math.abs((seed * 9301 + 49297) % 233280) % optionCount;
}

type CampSessionEvent = {
  groupId: string;
  questionIndex: number;
  status: 'waiting' | 'live' | 'finished';
  showResults?: boolean;
  registrations?: Record<string, ChildProfile>;
  responses?: Record<string, Record<string, string>>;
};

type GroupSessionState = {
  questionIndex: number;
  status: CampSessionEvent['status'];
  showResults: boolean;
};

const CAMP_SESSION_CHANNEL = 'docty-school-camp-session';
const CAMP_PARENT_PROFILE_KEY = 'docty-school-camp-parent-profile';

type StoredParentRegistration = {
  participantId: string;
  childProfile: ChildProfile;
  ekaPatientId?: string;
  joinedAt: string;
};

function readStoredParentRegistrations() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(CAMP_PARENT_PROFILE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, StoredParentRegistration>) : {};
  } catch {
    return {};
  }
}

function saveStoredParentRegistration(groupId: string, registration: StoredParentRegistration) {
  if (typeof window === 'undefined') {
    return;
  }

  const stored = readStoredParentRegistrations();
  window.localStorage.setItem(
    CAMP_PARENT_PROFILE_KEY,
    JSON.stringify({
      ...stored,
      [groupId]: registration,
    }),
  );
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, '');
}

function publishCampSession(event: CampSessionEvent) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CAMP_SESSION_CHANNEL, JSON.stringify({ ...event, sentAt: Date.now() }));
  void fetch('/api/school-camp-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => undefined);

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CAMP_SESSION_CHANNEL);
    channel.postMessage(event);
    channel.close();
  }
}

async function fetchCampSession(groupId: string): Promise<CampSessionEvent | undefined> {
  const response = await fetch(`/api/school-camp-session?group=${encodeURIComponent(groupId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  const session = body?.session;

  if (!response.ok || !session) {
    return undefined;
  }

  return {
    groupId: session.groupId,
    questionIndex: Number(session.questionIndex || 0),
    status: session.status === 'live' || session.status === 'finished' ? session.status : 'waiting',
    showResults: Boolean(session.showResults),
    registrations: session.registrations || {},
    responses: session.responses || {},
  };
}

export default function StaffSchoolCampPage() {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [activeGroupId, setActiveGroupId] = useState(campGroups[0].id);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('quiz');
  const [groupSessions, setGroupSessions] = useState<Record<string, GroupSessionState>>({});
  const [quizSeconds, setQuizSeconds] = useState(45);
  const [isPresenterWindow, setIsPresenterWindow] = useState(false);
  const [isParentReportView, setIsParentReportView] = useState(false);
  const [isParentParticipantView, setIsParentParticipantView] = useState(false);
  const [hasJoinedQuiz, setHasJoinedQuiz] = useState(false);
  const [isRegisteringPatient, setIsRegisteringPatient] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [joinOtp, setJoinOtp] = useState('');
  const [joinOtpSent, setJoinOtpSent] = useState(false);
  const [ekaPatientId, setEkaPatientId] = useState('');
  const [participantId, setParticipantId] = useState('P-001');
  const [registrations, setRegistrations] = useState<Record<string, Record<string, ChildProfile>>>({});
  const [responses, setResponses] = useState<Record<string, Record<string, string>>>({});
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [reportQrDataUrl, setReportQrDataUrl] = useState('');
  const [childProfile, setChildProfile] = useState<ChildProfile>({
    childName: 'Aarav Kumar',
    parentName: 'Parent / Guardian',
    mobile: '9876543210',
    grade: 'Class 3',
    section: 'A',
    age: '8 years',
  });
  const [consultationDraft, setConsultationDraft] = useState<ConsultationNote>({
    id: 'draft',
    service: 'Pediatrician',
    clinician: 'Dr. Docty Team',
    finding: 'Growth and general health screening completed during the school camp.',
    recommendation: 'Review nutrition, oral hygiene, vaccination record and sleep routine with parents.',
    followUp: 'Pediatric follow-up within 7 days if any red flag is present.',
  });
  const [consultations, setConsultations] = useState<ConsultationNote[]>([
    {
      id: 'consult-1',
      service: 'Pediatrician',
      clinician: 'Dr. Docty Team',
      finding: 'Growth review and basic pediatric screening completed.',
      recommendation: 'Maintain regular breakfast, hydration and 60 minutes of activity.',
      followUp: 'Book pediatric consultation if appetite, growth or recurrent illness concerns continue.',
    },
    {
      id: 'consult-2',
      service: 'Dentist',
      clinician: 'Dental Camp Desk',
      finding: 'Oral hygiene counselling indicated from screening answers.',
      recommendation: 'Brush twice daily, reduce sugary snacks and complete a dental check-up.',
      followUp: 'Dental consultation recommended within 2 weeks if pain or visible cavity is present.',
    },
  ]);
  const [reportSentAt, setReportSentAt] = useState<string | null>(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [reportDownloadError, setReportDownloadError] = useState('');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport>({
    title: 'AI Health Passport Insight',
    summary:
      'The Health Passport will be generated after the presenter finishes the live assessment. It will combine registration details, assessment responses and camp consultation notes.',
    nextSteps: ['Review the report with a Docty clinician for thorough insights.'],
  });

  const activeGroup = campGroups.find((group) => group.id === activeGroupId) ?? campGroups[0];
  const campQuery = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const campId = campQuery.get('camp') || '';
  const cohortId = campQuery.get('cohort') || '';
  const isManagedCampParticipant = Boolean(campId && cohortId);
  const managedSessionKey = campId && cohortId ? `docty-camp-session:${campId}:${cohortId}` : '';
  const activeGroupSession = groupSessions[activeGroup.id] ?? {
    questionIndex: activeQuestionIndex,
    status: 'waiting' as const,
    showResults: false,
  };
  const hasStartedAssessment = activeGroupSession.status === 'live';
  const hasFinishedAssessment = activeGroupSession.status === 'finished';
  const showQuizResults = activeGroupSession.showResults;
  const groupQuestions = useMemo(
    () => campQuestions.filter((question) => question.groups.includes(activeGroup.id)),
    [activeGroup.id],
  );
  const activeQuestion = groupQuestions[activeQuestionIndex] ?? groupQuestions[0];
  const activeResponses = responses[activeQuestion.id] ?? {};
  const activeRegistrations = registrations[activeGroup.id] ?? {};
  const attendeeCount = Object.keys(activeRegistrations).length;
  const answeredCount = Object.keys(activeResponses).length;
  const pendingCount = Math.max(attendeeCount - answeredCount, 0);
  const answeredPercent = attendeeCount ? Math.round((answeredCount / attendeeCount) * 100) : 0;
  const participantAnswer = activeResponses[participantId];
  const reportToken = `${childProfile.mobile || 'mobile'}-${participantId}`.replace(/\W+/g, '-').toLowerCase();
  const reportUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/Corporate/camp?group=${activeGroup.id}&report=${reportToken}&mobile=${childProfile.mobile}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const group = params.get('group');
    const mode = params.get('mode');
    const report = params.get('report');

    const validGroupId = group && campGroups.some((item) => item.id === group) ? group : '';

    if (validGroupId) {
      setActiveGroupId(validGroupId);
    }

    if (mode === 'participant') {
      setActiveTab('participant');
      setIsParentParticipantView(true);
      if (params.get('camp') && params.get('cohort')) {
        setChildProfile({ childName: '', parentName: '', mobile: '', grade: '', section: '', age: '' });
        setParticipantId('');
      }
    }

    if (mode === 'presenter') {
      setActiveTab('quiz');
      setIsPresenterWindow(true);
    }

    if (mode === 'sample-report') {
      const sampleGroupId = 'grades-3-5';
      const sampleParticipantId = 'P-001';
      const sampleProfile: ChildProfile = {
        childName: 'Aarav Kumar',
        parentName: 'Mrs. Priya Kumar',
        mobile: '9876543210',
        grade: 'Class 3',
        section: 'B',
        age: '8 years',
      };

      setActiveGroupId(sampleGroupId);
      setActiveTab('report');
      setParticipantId(sampleParticipantId);
      setHasJoinedQuiz(true);
      setChildProfile(sampleProfile);
      setEkaPatientId('eka-sample-aarav-kumar');
      setRegistrations({
        [sampleGroupId]: {
          [sampleParticipantId]: sampleProfile,
        },
      });
      setResponses({
        breakfast: { [sampleParticipantId]: 'sometimes' },
        protein: { [sampleParticipantId]: 'not-sure' },
        brushing: { [sampleParticipantId]: 'pain' },
        activity: { [sampleParticipantId]: 'low' },
        'lazy-eye': { [sampleParticipantId]: 'sometimes' },
        sleep: { [sampleParticipantId]: 'late' },
        'screen-time': { [sampleParticipantId]: 'two-four' },
        'vaccine-card': { [sampleParticipantId]: 'not-now' },
      });
      setConsultations([
        {
          id: 'sample-consult-1',
          service: 'Pediatrician',
          clinician: 'Dr. Docty Pediatric Desk',
          finding: 'Growth screening completed. Parent reports irregular protein intake and late sleep on school nights.',
          recommendation: 'Review growth chart, appetite pattern, sleep routine and recurrent illness history with a pediatrician.',
          followUp: 'Pediatric consultation recommended within 7 days for detailed growth and nutrition review.',
          bookingPath: '/book-appointment?specialty=pediatrics&source=school-camp',
        },
        {
          id: 'sample-consult-2',
          service: 'Dentist',
          clinician: 'Docty Dental Desk',
          finding: 'Parent reported tooth pain and brushing routine needs reinforcement.',
          recommendation: 'Dental examination advised to rule out cavity and reinforce night brushing.',
          followUp: 'Dental consultation recommended within 1 week if pain persists.',
          bookingPath: '/book-appointment?specialty=dental&source=school-camp',
        },
        {
          id: 'sample-consult-3',
          service: 'Vision',
          clinician: 'Vision Screening Desk',
          finding: 'Parent noticed occasional squinting/eye strain during reading and screen use.',
          recommendation: 'Pediatric eye screening is advised because early lazy-eye detection is valuable.',
          followUp: 'Vision screening or pediatric ophthalmology review recommended.',
          bookingPath: '/book-appointment?specialty=vision&source=school-camp',
        },
      ]);
      setGeneratedReport({
        title: 'AI Health Passport Insight for Aarav Kumar',
        summary:
          'Aarav participated in the Docty child wellness assessment for Class 3. The responses suggest useful parent-clinician conversation points around protein intake, tooth pain, active play, sleep routine, screen exposure, vaccination record review and possible eye strain. This is not a diagnosis. It is a structured wellness snapshot to help the family connect with the right clinician for thorough interpretation.',
        nextSteps: [
          'Connect with a Docty pediatrician to review growth, nutrition, sleep and general health patterns.',
          'Schedule a dental review because tooth pain was reported during the assessment.',
          'Consider vision screening because occasional squinting or eye strain was reported.',
          'Bring the vaccination record for clinician review, including age-appropriate counselling.',
        ],
      });
      setReportSentAt('Sample: report ready to send by WhatsApp/SMS');
      setIsParentReportView(true);
    }

    if (report) {
      const mobile = params.get('mobile') || '';
      const storedRegistrations = readStoredParentRegistrations();
      const storedRegistration =
        (validGroupId ? storedRegistrations[validGroupId] : undefined) ||
        Object.values(storedRegistrations).find((item) => item.childProfile.mobile === mobile);

      if (storedRegistration) {
        setParticipantId(storedRegistration.participantId);
        setChildProfile(storedRegistration.childProfile);
        setEkaPatientId(storedRegistration.ekaPatientId || '');
        if (validGroupId) {
          setRegistrations({
            [validGroupId]: {
              [storedRegistration.participantId]: storedRegistration.childProfile,
            },
          });
        }
      }
      setIsParentReportView(true);
    }
  }, []);

  useEffect(() => {
    if (!isPresenterWindow || !campId || !cohortId) return;
    fetch(`/api/camp-operations?campId=${encodeURIComponent(campId)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        const eligible = (body?.visits || []).filter((visit: any) => visit.cohort_id === cohortId && visit.vitals_status === 'completed' && !visit.escalation_required);
        const cohortRegistrations = Object.fromEntries(eligible.map((visit: any) => [visit.token_number, {
          childName: visit.participant_name,
          parentName: visit.guardian_name || 'Registered participant',
          mobile: visit.mobile,
          grade: visit.cohort_name,
          section: visit.external_id || '',
          age: visit.age || '',
        }]));
        setRegistrations((current) => ({ ...current, [activeGroup.id]: cohortRegistrations }));
      })
      .catch(() => undefined);
  }, [activeGroup.id, campId, cohortId, isPresenterWindow]);

  useEffect(() => {
    if (!isParentParticipantView || !isManagedCampParticipant || !managedSessionKey) return;
    const sessionToken = window.localStorage.getItem(managedSessionKey);
    if (!sessionToken) return;
    let cancelled = false;
    setIsRegisteringPatient(true);
    setRegistrationMessage('Restoring your camp session...');
    fetch(`/api/camp-operations?session=${encodeURIComponent(sessionToken)}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.visit) throw new Error('Saved session is no longer available.');
        const visit = body.visit;
        if (visit.camp_id !== campId || visit.cohort_id !== cohortId || visit.vitals_status !== 'completed' || visit.journey_status === 'clinical_review') {
          throw new Error('Camp admission must be verified again.');
        }
        if (cancelled) return;
        const normalizedId = String(visit.token_number || visit.id).toUpperCase();
        const restoredProfile: ChildProfile = {
          childName: visit.participant_name,
          parentName: visit.guardian_name || 'Parent / Guardian',
          mobile: visit.mobile,
          grade: activeGroup.label,
          section: visit.external_id || '',
          age: visit.age || '',
        };
        setParticipantId(normalizedId);
        setChildProfile(restoredProfile);
        setRegistrations((current) => ({ ...current, [activeGroup.id]: { ...(current[activeGroup.id] || {}), [normalizedId]: restoredProfile } }));
        setHasJoinedQuiz(true);
        setRegistrationMessage('Session restored. Continue from the current question.');
      })
      .catch(() => {
        window.localStorage.removeItem(managedSessionKey);
        if (!cancelled) setRegistrationMessage('Enter the registered mobile number to rejoin.');
      })
      .finally(() => { if (!cancelled) setIsRegisteringPatient(false); });
    return () => { cancelled = true; };
  }, [activeGroup.id, campId, cohortId, isManagedCampParticipant, isParentParticipantView, managedSessionKey]);

  useEffect(() => {
    const savedSession = groupSessions[activeGroupId];
    setActiveQuestionIndex(savedSession?.questionIndex ?? 0);
    setResponses({});
    setQuizSeconds(45);
  }, [activeGroupId]);

  const questionStats = useMemo(
    () =>
      groupQuestions.map((question) => {
        const questionResponses = responses[question.id] ?? {};
        const answered = Object.keys(questionResponses).length;
        const riskyAnswers = question.options.filter((option) => option.risk).map((option) => option.id);
        const riskCount = Object.values(questionResponses).filter((optionId) => riskyAnswers.includes(optionId)).length;
        return {
          question,
          answered,
          pending: Math.max(attendeeCount - answered, 0),
          riskCount,
          answeredPercent: attendeeCount ? Math.round((answered / attendeeCount) * 100) : 0,
        };
      }),
    [attendeeCount, groupQuestions, responses],
  );

  const salesBuckets = useMemo(
    () =>
      riskSalesMap.map((bucket) => ({
        ...bucket,
        count: questionStats
          .filter(({ question }) => question.category === bucket.category)
          .reduce((total, stat) => total + stat.riskCount, 0),
      })),
    [questionStats],
  );

  const groupSummaryStats = useMemo(() => {
    const totalResponses = questionStats.reduce((total, stat) => total + stat.answered, 0);
    const totalFlags = questionStats.reduce((total, stat) => total + stat.riskCount, 0);
    const strongestHabit = questionStats.reduce<(typeof questionStats)[number] | null>(
      (best, stat) => (!best || stat.answeredPercent > best.answeredPercent ? stat : best),
      null,
    );

    return {
      registered: attendeeCount,
      totalResponses,
      totalFlags,
      completion: attendeeCount && groupQuestions.length ? Math.round((totalResponses / (attendeeCount * groupQuestions.length)) * 100) : 0,
      topConversationBucket: salesBuckets.reduce((top, bucket) => (bucket.count > top.count ? bucket : top), salesBuckets[0]),
      strongestHabit,
    };
  }, [attendeeCount, groupQuestions.length, questionStats, salesBuckets]);

  const childRiskItems = useMemo(
    () =>
      groupQuestions
        .map((question) => {
          const optionId = responses[question.id]?.[participantId];
          const option = question.options.find((item) => item.id === optionId);
          if (!option?.risk) {
            return null;
          }
          return {
            category: question.category,
            prompt: question.prompt,
            answer: option.label,
          };
        })
        .filter((item): item is { category: CampQuestion['category']; prompt: string; answer: string } => Boolean(item)),
    [groupQuestions, participantId, responses],
  );

  const reportScore = Math.max(100 - childRiskItems.length * 12, 40);
  const reportStatus = childRiskItems.length >= 4 ? 'Needs priority follow-up' : childRiskItems.length ? 'Follow-up suggested' : 'Looks good';

  useEffect(() => {
    const context = campId && cohortId ? `&camp=${encodeURIComponent(campId)}&cohort=${encodeURIComponent(cohortId)}` : '';
    const url = `${window.location.origin}/Corporate/camp?group=${activeGroup.id}&mode=participant${context}`;
    import('qrcode')
      .then((module) => module.default.toDataURL(url, { width: 180, margin: 1 }))
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [activeGroup.id, campId, cohortId]);

  useEffect(() => {
    if (showQuizResults || quizSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setQuizSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [quizSeconds, showQuizResults]);

  useEffect(() => {
    if (!reportUrl) {
      return;
    }
    import('qrcode')
      .then((module) => module.default.toDataURL(reportUrl, { width: 180, margin: 1 }))
      .then(setReportQrDataUrl)
      .catch(() => setReportQrDataUrl(''));
  }, [reportUrl]);

  function updateGroupSession(groupId: string, session: Partial<GroupSessionState>) {
    setGroupSessions((current) => {
      const previous = current[groupId] ?? {
        questionIndex: groupId === activeGroup.id ? activeQuestionIndex : 0,
        status: 'waiting' as const,
        showResults: false,
      };

      return {
        ...current,
        [groupId]: {
          ...previous,
          ...session,
        },
      };
    });
  }

  function applyCampSessionEvent(event: CampSessionEvent) {
    setGroupSessions((current) => ({
      ...current,
      [event.groupId]: {
        questionIndex: Math.max(0, event.questionIndex),
        status: event.status,
        showResults: Boolean(event.showResults),
      },
    }));

    if (event.groupId === activeGroupId) {
      setActiveQuestionIndex(Math.max(0, event.questionIndex));
    }

    if (event.registrations) {
      setRegistrations((current) => ({ ...current, [event.groupId]: event.registrations || {} }));
    }
    if (event.responses) {
      setResponses(event.responses);
    }
  }

  useEffect(() => {
    if (!isParentParticipantView || typeof window === 'undefined') {
      return;
    }

    const storedRegistration = readStoredParentRegistrations()[activeGroupId];
    if (!isManagedCampParticipant && storedRegistration?.participantId && storedRegistration.childProfile) {
      setParticipantId(storedRegistration.participantId);
      setChildProfile(storedRegistration.childProfile);
      setEkaPatientId(storedRegistration.ekaPatientId || '');
      setHasJoinedQuiz(true);
      setRegistrationMessage('Registration restored. Please wait for the presenter to continue.');
      setRegistrations((current) => ({
        ...current,
        [activeGroupId]: {
          ...(current[activeGroupId] ?? {}),
          [storedRegistration.participantId]: storedRegistration.childProfile,
        },
      }));
    }

    function applyEvent(event: CampSessionEvent) {
      if (event.groupId !== activeGroupId) {
        return;
      }

      applyCampSessionEvent(event);
    }

    const stored = window.localStorage.getItem(CAMP_SESSION_CHANNEL);
    if (stored) {
      try {
        applyEvent(JSON.parse(stored) as CampSessionEvent);
      } catch {
        // Ignore malformed local session payloads.
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CAMP_SESSION_CHANNEL || !event.newValue) {
        return;
      }

      try {
        applyEvent(JSON.parse(event.newValue) as CampSessionEvent);
      } catch {
        // Ignore malformed local session payloads.
      }
    };

    window.addEventListener('storage', onStorage);

    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CAMP_SESSION_CHANNEL) : undefined;
    if (channel) {
      channel.onmessage = (event) => applyEvent(event.data as CampSessionEvent);
    }

    let cancelled = false;
    const poll = () => {
      void fetchCampSession(activeGroupId)
        .then((event) => {
          if (!cancelled && event) {
            applyEvent(event);
          }
        })
        .catch(() => undefined);
    };
    poll();
    const pollTimer = window.setInterval(poll, 2000);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      channel?.close();
      window.clearInterval(pollTimer);
    };
  }, [activeGroupId, isManagedCampParticipant, isParentParticipantView]);

  useEffect(() => {
    if (!isPresenterWindow || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    const poll = () => {
      void fetchCampSession(activeGroupId)
        .then((event) => {
          if (!cancelled && event) {
            if (event.groupId !== activeGroupId) {
              return;
            }
            applyCampSessionEvent(event);
          }
        })
        .catch(() => undefined);
    };

    poll();
    const pollTimer = window.setInterval(poll, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
    };
  }, [activeGroupId, isPresenterWindow]);

  function recordAnswer(optionId: string, id = participantId) {
    setResponses((current) => {
      const nextResponses = {
        ...current,
        [activeQuestion.id]: {
          ...(current[activeQuestion.id] ?? {}),
          [id]: optionId,
        },
      };

      publishCampSession({
        groupId: activeGroup.id,
        questionIndex: activeQuestionIndex,
        status: hasFinishedAssessment ? 'finished' : hasStartedAssessment ? 'live' : 'waiting',
        showResults: showQuizResults,
        registrations: registrations[activeGroup.id] ?? {},
        responses: nextResponses,
      });

      return nextResponses;
    });
  }

  async function joinSession() {
    if (isManagedCampParticipant) {
      setIsRegisteringPatient(true);
      setRegistrationMessage(joinOtpSent ? 'Verifying OTP...' : 'Checking registration and sending OTP...');
      try {
        const response = await fetch('/api/camp-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: joinOtpSent ? 'verify-join-otp' : 'send-join-otp',
            campId,
            cohortId,
            mobile: childProfile.mobile,
            otp: joinOtp,
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || 'Unable to verify camp registration.');
        if (!joinOtpSent) {
          setJoinOtpSent(true);
          setRegistrationMessage('OTP sent to the registered WhatsApp number.');
          return;
        }
        const visit = body.visit;
        const normalizedId = String(visit.tokenNumber || visit.id).toUpperCase();
        const verifiedProfile: ChildProfile = {
          childName: visit.participantName,
          parentName: visit.guardianName || 'Parent / Guardian',
          mobile: visit.mobile,
          grade: activeGroup.label,
          section: visit.externalId || '',
          age: visit.age || '',
        };
        setParticipantId(normalizedId);
        setChildProfile(verifiedProfile);
        if (managedSessionKey && visit.sessionToken) window.localStorage.setItem(managedSessionKey, String(visit.sessionToken));
        setRegistrations((current) => ({ ...current, [activeGroup.id]: { ...(current[activeGroup.id] || {}), [normalizedId]: verifiedProfile } }));
        setHasJoinedQuiz(true);
        setRegistrationMessage('Mobile verified. Wait for the presenter to start the assessment.');
      } catch (error) {
        setRegistrationMessage(error instanceof Error ? error.message : 'Unable to verify camp registration.');
      } finally {
        setIsRegisteringPatient(false);
      }
      return;
    }

    const id = participantId.trim() || `${childProfile.mobile || 'participant'}-${Date.now()}`;
    const normalizedId = id.toUpperCase();
    const profileForRegistration = { ...childProfile };
    let nextEkaPatientId = ekaPatientId;

    setIsRegisteringPatient(true);
    setRegistrationMessage('Registering student in Eka Care...');

    try {
      const response = await fetch('/api/school-camp-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: profileForRegistration.childName,
          parentName: profileForRegistration.parentName,
          mobile: profileForRegistration.mobile,
          age: profileForRegistration.age,
          grade: profileForRegistration.grade,
          section: profileForRegistration.section,
          group: activeGroup.id,
          gender: 'O',
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.message || 'Unable to register student in Eka.');
      }

      nextEkaPatientId = String(body?.profile?.id || '');
      setEkaPatientId(nextEkaPatientId);
      setRegistrationMessage('Student registered in Eka Care. Joined live assessment.');
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : 'Unable to register student in Eka.');
    } finally {
      setIsRegisteringPatient(false);
    }

    setParticipantId(normalizedId);
    saveStoredParentRegistration(activeGroup.id, {
      participantId: normalizedId,
      childProfile: profileForRegistration,
      ekaPatientId: nextEkaPatientId,
      joinedAt: new Date().toISOString(),
    });
    setRegistrations((current) => {
      const nextGroupRegistrations = {
        ...(current[activeGroup.id] ?? {}),
        [normalizedId]: profileForRegistration,
      };
      const nextRegistrations = {
        ...current,
        [activeGroup.id]: nextGroupRegistrations,
      };

      publishCampSession({
        groupId: activeGroup.id,
        questionIndex: activeQuestionIndex,
        status: hasFinishedAssessment ? 'finished' : hasStartedAssessment ? 'live' : 'waiting',
        showResults: showQuizResults,
        registrations: nextGroupRegistrations,
        responses,
      });

      return nextRegistrations;
    });
    setHasJoinedQuiz(true);
  }

  function launchGroupSession(groupId: string) {
    const url = `${window.location.origin}/Corporate/camp?group=${groupId}&mode=presenter`;
    window.open(url, `docty-camp-${groupId}`, 'popup=yes,width=1440,height=920');
  }

  function startAssessment() {
    updateGroupSession(activeGroup.id, {
      questionIndex: activeQuestionIndex,
      status: 'live',
      showResults: false,
    });
    setQuizSeconds(45);
    publishCampSession({
      groupId: activeGroup.id,
      questionIndex: activeQuestionIndex,
      status: 'live',
      showResults: false,
      registrations: registrations[activeGroup.id] ?? {},
      responses,
    });
  }

  function buildGeneratedReport(): GeneratedReport {
    const riskText = childRiskItems.length
      ? childRiskItems.map((item) => `${item.category}: "${item.answer}" for ${item.prompt}`).join(' ')
      : 'No major red-flag responses were recorded in the live assessment yet.';
    const consultationText = consultations.map((item) => `${item.service}: ${item.followUp}`).join(' ');

    return {
      title: `AI Health Passport Insight for ${childProfile.childName}`,
      summary: `${childProfile.childName} participated in the Docty child wellness assessment for ${activeGroup.grades}. Based on the responses, the main conversation points are: ${riskText} Camp consultation notes indicate: ${consultationText} This is a screening-based wellness summary and should be reviewed with a Docty clinician for thorough clinical insights.`,
      nextSteps: [
        'Connect with a Docty pediatrician to review growth, nutrition, sleep and recurrent health concerns.',
        'Share the oral-health findings with a dentist if brushing gaps, tooth pain or cavity risk was identified.',
        'Review vaccination records with a clinician, including HPV counselling where age appropriate.',
        'Use the assessment as a conversation starter, not as a diagnosis.',
      ],
    };
  }

  async function finishAssessment() {
    setGeneratedReport(buildGeneratedReport());
    setReportSentAt(new Date().toLocaleString());
    updateGroupSession(activeGroup.id, {
      questionIndex: activeQuestionIndex,
      status: 'finished',
      showResults: true,
    });
    publishCampSession({
      groupId: activeGroup.id,
      questionIndex: activeQuestionIndex,
      status: 'finished',
      showResults: true,
      registrations: registrations[activeGroup.id] ?? {},
      responses,
    });
    const query = new URLSearchParams(window.location.search);
    const cohortId = query.get('cohort');
    if (cohortId) {
      const specialties = (query.get('specialties') || '').split('|').filter(Boolean);
      try {
        const response = await fetch('/api/camp-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'assessment-complete-cohort', cohortId, specialties }),
        });
        if (!response.ok) throw new Error('Unable to move the cohort to consultation queues.');
      } catch (error) {
        console.error('camp cohort completion', error);
      }
    }
  }

  function simulateAnswers(count: number) {
    setRegistrations((current) => {
      const currentRegistrations = { ...(current[activeGroup.id] ?? {}) };
      let added = 0;

      for (let index = 1; added < count; index += 1) {
        const id = `P-${String(index).padStart(3, '0')}`;
        if (!currentRegistrations[id]) {
          currentRegistrations[id] = {
            childName: `Student ${index}`,
            parentName: 'Registered parent',
            mobile: `900000${String(index).padStart(4, '0')}`,
            grade: activeGroup.label,
            section: 'Camp',
            age: activeGroup.age,
          };
          added += 1;
        }
      }

      return {
        ...current,
        [activeGroup.id]: currentRegistrations,
      };
    });

    setResponses((current) => {
      const currentQuestionResponses = { ...(current[activeQuestion.id] ?? {}) };
      let added = 0;

      for (let index = 1; added < count; index += 1) {
        const id = `P-${String(index).padStart(3, '0')}`;
        if (!currentQuestionResponses[id]) {
          const optionIndex = seededOptionIndex(index + activeQuestionIndex * 17, activeQuestion.options.length);
          currentQuestionResponses[id] = activeQuestion.options[optionIndex].id;
          added += 1;
        }
      }

      return {
        ...current,
        [activeQuestion.id]: currentQuestionResponses,
      };
    });
  }

  function resetCurrentQuestion() {
    setResponses((current) => {
      const next = { ...current };
      delete next[activeQuestion.id];
      return next;
    });
  }

  function openVoting() {
    resetCurrentQuestion();
    setQuizSeconds(45);
    updateGroupSession(activeGroup.id, {
      questionIndex: activeQuestionIndex,
      status: 'live',
      showResults: false,
    });
    publishCampSession({
      groupId: activeGroup.id,
      questionIndex: activeQuestionIndex,
      status: 'live',
      showResults: false,
      registrations: registrations[activeGroup.id] ?? {},
      responses,
    });
  }

  function revealResults() {
    updateGroupSession(activeGroup.id, {
      questionIndex: activeQuestionIndex,
      status: 'live',
      showResults: true,
    });
    publishCampSession({
      groupId: activeGroup.id,
      questionIndex: activeQuestionIndex,
      status: 'live',
      showResults: true,
      registrations: registrations[activeGroup.id] ?? {},
      responses,
    });
  }

  function resetGroup() {
    setResponses((current) => {
      const next = { ...current };
      groupQuestions.forEach((question) => {
        delete next[question.id];
      });
      return next;
    });
  }

  function exportSummary() {
    const rows = [
      ['Group', 'Question', 'Category', 'Answered', 'Pending', 'Risk flags'],
      ...questionStats.map((stat) => [
        activeGroup.label,
        stat.question.prompt,
        stat.question.category,
        String(stat.answered),
        String(stat.pending),
        String(stat.riskCount),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `docty-school-camp-${activeGroup.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateChildProfile(field: keyof ChildProfile, value: string) {
    setChildProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateConsultationDraft(field: keyof ConsultationNote, value: string) {
    setConsultationDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addConsultation() {
    setConsultations((current) => [
      {
        ...consultationDraft,
        id: `consult-${Date.now()}`,
      },
      ...current,
    ]);
  }

  async function shareReport() {
    const text = `Docty Health Passport for ${childProfile.childName}: ${reportUrl}`;

    if (navigator.share) {
      await navigator.share({
        title: 'Docty Health Passport',
        text,
        url: reportUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(text);
  }

  async function downloadReportPdf() {
    setIsDownloadingReport(true);
    setReportDownloadError('');

    let renderHost: HTMLDivElement | null = null;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const [doctyLogo, schoolLogo] = await Promise.all([
        loadImageAsDataUrl('/docty-logo-full.png'),
        loadImageAsDataUrl('/sri-gayathri-techno-school-logo.png'),
      ]);
      const passport = buildHealthPassportMetrics(childProfile, childRiskItems);
      const htmlPages = buildHealthPassportExportPages({
        activeGroup,
        childProfile,
        consultations,
        doctyLogo,
        generatedReport,
        passport,
        reportScore,
        reportStatus,
        risks: childRiskItems,
        schoolLogo,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      renderHost = document.createElement('div');
      renderHost.style.position = 'fixed';
      renderHost.style.left = '-10000px';
      renderHost.style.top = '0';
      renderHost.style.width = '794px';
      renderHost.style.zIndex = '-1';
      document.body.appendChild(renderHost);

      for (let index = 0; index < htmlPages.length; index += 1) {
        const page = document.createElement('div');
        page.innerHTML = htmlPages[index];
        renderHost.replaceChildren(page);
        await document.fonts?.ready;
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        const pageElement = page.querySelector('.page') as HTMLElement | null;

        if (!pageElement) {
          throw new Error('Health Passport export page was not rendered.');
        }

        const canvas = await html2canvas(pageElement, {
          backgroundColor: '#f6fbfd',
          logging: false,
          scale: 2,
          useCORS: true,
          windowWidth: 794,
          windowHeight: 1123,
        });
        const imageData = canvas.toDataURL('image/png', 1);

        if (index > 0) {
          pdf.addPage();
        }
        pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight);
      }

      const fileName = `docty-health-passport-${childProfile.childName || 'student'}`
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error(error);
      setReportDownloadError('PDF download failed while rendering the Health Passport image. Please try again or refresh the page.');
    } finally {
      renderHost?.remove();
      setIsDownloadingReport(false);
    }
  }

  function moveQuestion(direction: 'next' | 'previous') {
    setActiveQuestionIndex((current) => {
      if (direction === 'next') {
        const nextIndex = Math.min(current + 1, groupQuestions.length - 1);
        updateGroupSession(activeGroup.id, {
          questionIndex: nextIndex,
          status: 'live',
          showResults: false,
        });
        publishCampSession({
          groupId: activeGroup.id,
          questionIndex: nextIndex,
          status: 'live',
          showResults: false,
          registrations: registrations[activeGroup.id] ?? {},
          responses,
        });
        return nextIndex;
      }
      const nextIndex = Math.max(current - 1, 0);
      updateGroupSession(activeGroup.id, {
        questionIndex: nextIndex,
        status: 'live',
        showResults: false,
      });
      publishCampSession({
        groupId: activeGroup.id,
        questionIndex: nextIndex,
        status: 'live',
        showResults: false,
        registrations: registrations[activeGroup.id] ?? {},
        responses,
      });
      return nextIndex;
    });
    setQuizSeconds(45);
  }

  if (isPresenterWindow) {
    return (
      <AssessmentPresenterWindow
        activeGroup={activeGroup}
        activeQuestion={activeQuestion}
        activeQuestionIndex={activeQuestionIndex}
        activeResponses={activeResponses}
        answeredCount={answeredCount}
        answeredPercent={answeredPercent}
        attendeeCount={attendeeCount}
        groupQuestionsLength={groupQuestions.length}
        hasStartedAssessment={hasStartedAssessment}
        hasFinishedAssessment={hasFinishedAssessment}
        pendingCount={pendingCount}
        qrDataUrl={qrDataUrl}
        quizSeconds={quizSeconds}
        reportSentAt={reportSentAt}
        salesBuckets={salesBuckets}
        showQuizResults={showQuizResults || quizSeconds === 0}
        summaryStats={groupSummaryStats}
        onNext={() => moveQuestion('next')}
        onFinish={finishAssessment}
        onOpenVoting={openVoting}
        onPrevious={() => moveQuestion('previous')}
        onReveal={revealResults}
        onSimulate={() => simulateAnswers(10)}
        onStart={startAssessment}
      />
    );
  }

  if (isParentReportView) {
    return (
      <ParentReportView
        activeGroup={activeGroup}
        childProfile={childProfile}
        consultations={consultations}
        ekaPatientId={ekaPatientId}
        generatedReport={generatedReport}
        reportScore={reportScore}
        reportStatus={reportStatus}
        risks={childRiskItems}
      />
    );
  }

  if (isParentParticipantView) {
    return (
      <ParentAssessmentView
        activeGroup={activeGroup}
        activeQuestion={activeQuestion}
        childProfile={childProfile}
        ekaPatientId={ekaPatientId}
        hasFinishedAssessment={hasFinishedAssessment}
        hasJoinedQuiz={hasJoinedQuiz}
        hasStartedAssessment={hasStartedAssessment}
        isRegisteringPatient={isRegisteringPatient}
        participantAnswer={participantAnswer}
        reportUrl={reportUrl}
        registrationMessage={registrationMessage}
        isManagedCampParticipant={isManagedCampParticipant}
        joinOtp={joinOtp}
        joinOtpSent={joinOtpSent}
        onAnswer={recordAnswer}
        onJoin={() => void joinSession()}
        onJoinOtpChange={setJoinOtp}
        onUpdateChildProfile={updateChildProfile}
      />
    );
  }

  return (
    <div className="min-h-svh bg-[#f6fbfd] text-[#082f49]">
      <header className="border-b border-[#dceaf1] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <div>
              <DoctyLogo size="md" />
              <h1 className="text-2xl font-bold tracking-normal md:text-3xl">Sri Gayatri School Camp Live</h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Registered" value={attendeeCount} />
            <Metric label="Responded" value={`${answeredCount}/${attendeeCount}`} />
            <Metric label="Pending" value={pendingCount} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        <section className="grid gap-3 md:grid-cols-5">
          {campGroups.map((group) => {
            const registeredCount = Object.keys(registrations[group.id] ?? {}).length;

            return (
              <div
                key={group.id}
                className={cn(
                  'rounded-md border bg-white p-4 shadow-sm transition hover:border-primary',
                  activeGroup.id === group.id ? 'border-primary ring-2 ring-primary/15' : 'border-[#dceaf1]',
                )}
              >
              <button
                type="button"
                onClick={() => {
                  const nextSession = groupSessions[group.id];
                  setActiveGroupId(group.id);
                  setActiveQuestionIndex(nextSession?.questionIndex ?? 0);
                  setQuizSeconds(45);
                }}
                className="min-h-28 w-full text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{group.label}</p>
                  <Badge variant={activeGroup.id === group.id ? 'default' : 'secondary'}>{registeredCount}</Badge>
                </div>
                <p className="mt-2 text-sm text-[#476477]">{group.grades}</p>
                <p className="mt-1 text-xs font-medium text-[#0b7fae]">{group.age}</p>
                <p className="mt-3 text-xs text-[#476477]">{registeredCount} registered attendee{registeredCount === 1 ? '' : 's'}</p>
              </button>
              <Button type="button" className="mt-3 w-full" variant="outline" onClick={() => launchGroupSession(group.id)}>
                <MonitorPlay className="size-4" />
                Launch
              </Button>
            </div>
            );
          })}
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-md bg-[#eaf8fe] p-1 md:w-fit md:grid-cols-6">
            <TabsTrigger value="quiz" className="rounded-md">
              <MonitorPlay className="size-4" />
              Live assessment
            </TabsTrigger>
            <TabsTrigger value="presenter" className="rounded-md">
              <BarChart3 className="size-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="participant" className="rounded-md">
              <Send className="size-4" />
              Participant
            </TabsTrigger>
            <TabsTrigger value="awareness" className="rounded-md">
              <BookOpenCheck className="size-4" />
              Awareness
            </TabsTrigger>
            <TabsTrigger value="record" className="rounded-md">
              <Phone className="size-4" />
              Child record
            </TabsTrigger>
            <TabsTrigger value="report" className="rounded-md">
              <FileText className="size-4" />
              Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quiz">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <LiveQuizStage
                activeGroup={activeGroup}
                activeQuestion={activeQuestion}
                activeQuestionIndex={activeQuestionIndex}
                answeredCount={answeredCount}
                answeredPercent={answeredPercent}
                activeResponses={activeResponses}
                groupQuestionsLength={groupQuestions.length}
                attendeeCount={attendeeCount}
                pendingCount={pendingCount}
                qrDataUrl={qrDataUrl}
                quizSeconds={quizSeconds}
                showQuizResults={showQuizResults || quizSeconds === 0}
                onPrevious={() => moveQuestion('previous')}
                onNext={() => moveQuestion('next')}
                onOpenVoting={openVoting}
                onReveal={revealResults}
                onSimulate={() => simulateAnswers(10)}
                onFinish={finishAssessment}
              />

              <Card className="rounded-md border-[#dceaf1] shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
                    <Users className="size-5 text-primary" />
                    Parent joining flow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-[#f4f9fc] p-4">
                    <p className="font-semibold">Session group</p>
                    <p className="mt-1 text-sm text-[#476477]">{activeGroup.grades}</p>
                    <p className="mt-3 text-sm font-medium text-[#0b7fae]">Join code: DOCTY-{activeGroup.id.toUpperCase().slice(0, 4)}</p>
                  </div>
                  <div className="flex justify-center">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Participant QR code" className="size-40 rounded-md border border-[#dceaf1]" />
                    ) : (
                      <div className="flex size-40 items-center justify-center rounded-md border border-[#dceaf1] bg-[#f4f9fc]">
                        <QrCode className="size-10 text-[#476477]" />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Button type="button" onClick={() => launchGroupSession(activeGroup.id)}>
                      <MonitorPlay className="size-4" />
                      Launch this group in new window
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setActiveTab('participant')}>
                      <Phone className="size-4" />
                      Preview parent registration
                    </Button>
                  </div>
                  <p className="text-xs text-[#476477]">
                    Parents register child details and mobile number first. Their responses help staff take the right conversation forward.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="presenter">
            <div className="grid gap-5 lg:grid-cols-[1.45fr_0.9fr]">
              <Card className="rounded-md border-[#dceaf1] shadow-sm">
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Badge className="mb-3">{activeQuestion.category}</Badge>
                      <CardTitle className="text-2xl leading-tight tracking-normal">{activeQuestion.prompt}</CardTitle>
                      <p className="mt-2 text-sm text-[#476477]">
                        Question {activeQuestionIndex + 1} of {groupQuestions.length} for {activeGroup.grades}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => moveQuestion('previous')}
                        disabled={activeQuestionIndex === 0}
                        title="Previous question"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => moveQuestion('next')}
                        disabled={activeQuestionIndex === groupQuestions.length - 1}
                        title="Next question"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeQuestion.options.map((option) => {
                      const optionCount = Object.values(activeResponses).filter((optionId) => optionId === option.id).length;
                      const optionPercent = answeredCount ? Math.round((optionCount / answeredCount) * 100) : 0;

                      return (
                        <div key={option.id} className="rounded-md border border-[#dceaf1] bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{option.label}</p>
                            <Badge variant={option.risk ? 'destructive' : 'secondary'}>{optionCount}</Badge>
                          </div>
                          <Progress value={optionPercent} className="mt-3 h-3 bg-[#eaf3f8]" />
                          <p className="mt-2 text-sm text-[#476477]">{optionPercent}% of live answers</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-md border border-[#dceaf1] bg-[#f9fdff] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">Live participation</p>
                        <p className="text-sm text-[#476477]">See how many registered attendees responded to this question.</p>
                      </div>
                      <p className="text-3xl font-bold text-primary">{answeredPercent}%</p>
                    </div>
                    <Progress value={answeredPercent} className="h-4 bg-[#dceaf1]" />
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      <Button type="button" onClick={() => simulateAnswers(5)} variant="secondary">
                        <Play className="size-4" />
                        Add 5
                      </Button>
                      <Button type="button" onClick={() => simulateAnswers(15)} variant="outline">
                        <Users className="size-4" />
                        Add 15
                      </Button>
                      <Button type="button" onClick={() => simulateAnswers(Math.max(attendeeCount - answeredCount, 0))} variant="outline">
                        <ClipboardCheck className="size-4" />
                        Fill registered
                      </Button>
                      <Button type="button" onClick={resetCurrentQuestion} variant="outline">
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-5">
                <Card className="rounded-md border-[#dceaf1] shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg tracking-normal">
                      <QrCode className="size-5 text-primary" />
                      Join screen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-3 text-center">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Participant QR code" className="size-40 rounded-md border border-[#dceaf1]" />
                    ) : (
                      <div className="flex size-40 items-center justify-center rounded-md border border-[#dceaf1] bg-[#f4f9fc]">
                        <QrCode className="size-10 text-[#476477]" />
                      </div>
                    )}
                    <p className="text-sm text-[#476477]">Parents scan this to open participant mode for the selected group.</p>
                  </CardContent>
                </Card>

                <Card className="rounded-md border-[#dceaf1] shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg tracking-normal">
                      <AlertTriangle className="size-5 text-primary" />
                      Follow-up buckets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salesBuckets.map((bucket) => {
                      const Icon = bucket.icon;
                      return (
                        <div key={bucket.label} className="flex items-center justify-between rounded-md bg-[#f4f9fc] p-3">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-[#0b7fae]" />
                            <span className="text-sm font-medium">{bucket.label}</span>
                          </div>
                          <Badge variant={bucket.count ? 'default' : 'secondary'}>{bucket.count}</Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="mt-5 rounded-md border-[#dceaf1] shadow-sm">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-xl tracking-normal">Every Question Dashboard</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={resetGroup}>
                    <RotateCcw className="size-4" />
                    Reset group
                  </Button>
                  <Button type="button" variant="outline" onClick={exportSummary}>
                    <Download className="size-4" />
                    Export view
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {questionStats.map((stat, index) => (
                  <button
                    key={stat.question.id}
                    type="button"
                    onClick={() => setActiveQuestionIndex(index)}
                    className={cn(
                      'rounded-md border p-4 text-left transition hover:border-primary',
                      activeQuestion.id === stat.question.id ? 'border-primary bg-[#fff6fa]' : 'border-[#dceaf1] bg-white',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="secondary">{stat.question.category}</Badge>
                        <p className="mt-2 font-semibold leading-snug">{stat.question.prompt}</p>
                      </div>
                      <Badge variant={stat.riskCount ? 'destructive' : 'secondary'}>{stat.riskCount} flags</Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-[#476477]">
                      <span>{stat.answered}/{attendeeCount} responded</span>
                      <span>{stat.pending} pending</span>
                    </div>
                    <Progress value={stat.answeredPercent} className="mt-2 h-2 bg-[#eaf3f8]" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participant">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <Card className="rounded-md border-[#dceaf1] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl tracking-normal">Register Child & Join</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="participant-id">
                      Participant ID
                    </label>
                    <Input
                      id="participant-id"
                      value={participantId}
                      onChange={(event) => setParticipantId(event.target.value.toUpperCase())}
                      className="mt-2"
                    />
                  </div>
                  <Field label="Child name" value={childProfile.childName} onChange={(value) => updateChildProfile('childName', value)} />
                  <Field label="Parent mobile" value={childProfile.mobile} onChange={(value) => updateChildProfile('mobile', value)} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Grade" value={childProfile.grade} onChange={(value) => updateChildProfile('grade', value)} />
                    <Field label="Section" value={childProfile.section} onChange={(value) => updateChildProfile('section', value)} />
                  </div>
                  <div className="rounded-md bg-[#f4f9fc] p-4">
                    <p className="font-semibold">{activeGroup.label}</p>
                    <p className="mt-1 text-sm text-[#476477]">{activeGroup.grades}</p>
                    <p className="mt-3 text-xs text-[#476477]">
                      The instructor controls the live assessment. There are no right or wrong answers; responses help Docty staff guide the parent conversation.
                    </p>
                  </div>
                  <Button type="button" className="w-full" onClick={() => void joinSession()} disabled={isRegisteringPatient}>
                    <CheckCircle2 className="size-4" />
                    {isRegisteringPatient ? 'Registering...' : hasJoinedQuiz ? 'Joined session' : 'Register & join session'}
                  </Button>
                  {registrationMessage && (
                    <div className="rounded-md bg-[#f4f9fc] p-3 text-sm text-[#476477]">
                      {registrationMessage}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-md border-[#dceaf1] shadow-sm">
                <CardHeader>
                  <Badge className="w-fit">{activeQuestion.category}</Badge>
                  <CardTitle className="text-2xl leading-tight tracking-normal">{activeQuestion.prompt}</CardTitle>
                  <p className="text-sm text-[#476477]">{activeQuestion.description}</p>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {activeQuestion.options.map((option) => (
                    <Button
                      key={option.id}
                      type="button"
                      variant={participantAnswer === option.id ? 'default' : 'outline'}
                      className="h-auto min-h-20 justify-start whitespace-normal rounded-md p-4 text-left text-base"
                      onClick={() => recordAnswer(option.id)}
                      disabled={!hasJoinedQuiz}
                    >
                      {option.label}
                    </Button>
                  ))}
                  {!hasJoinedQuiz && (
                    <div className="rounded-md bg-[#fff6fa] p-4 text-sm text-[#7a1238] md:col-span-2">
                      Register and tap Join session before answering.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="awareness">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {awarenessTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <Card key={topic.title} className="rounded-md border-[#dceaf1] shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex size-11 items-center justify-center rounded-md bg-[#eaf8fe] text-[#0b7fae]">
                          <Icon className="size-5" />
                        </div>
                        <Badge variant="secondary">{topic.stage}</Badge>
                      </div>
                      <CardTitle className="text-xl tracking-normal">{topic.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-[#476477]">{topic.summary}</p>
                      <div>
                        <p className="mb-2 text-sm font-semibold">Watch for</p>
                        <div className="flex flex-wrap gap-2">
                          {topic.signs.map((sign) => (
                            <Badge key={sign} variant="outline" className="rounded-md">
                              {sign}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-md bg-[#fff6fa] p-3 text-sm text-[#7a1238]">{topic.action}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          </TabsContent>

          <TabsContent value="record">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="rounded-md border-[#dceaf1] shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
                    <UserRound className="size-5 text-primary" />
                    Mobile-linked child profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <Field label="Child name" value={childProfile.childName} onChange={(value) => updateChildProfile('childName', value)} />
                  <Field label="Parent name" value={childProfile.parentName} onChange={(value) => updateChildProfile('parentName', value)} />
                  <Field label="Mobile number" value={childProfile.mobile} onChange={(value) => updateChildProfile('mobile', value)} />
                  <Field label="Age" value={childProfile.age} onChange={(value) => updateChildProfile('age', value)} />
                  <Field label="Grade" value={childProfile.grade} onChange={(value) => updateChildProfile('grade', value)} />
                  <Field label="Section" value={childProfile.section} onChange={(value) => updateChildProfile('section', value)} />
                  <div className="rounded-md bg-[#f4f9fc] p-4 md:col-span-2">
                    <p className="font-semibold">Record key</p>
                    <p className="mt-1 text-sm text-[#476477]">
                      {childProfile.mobile || 'Mobile number'} links assessment answers, consultation notes, follow-up bookings and the
                      shareable report.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-md border-[#dceaf1] shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
                    <Stethoscope className="size-5 text-primary" />
                    Camp consultations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium" htmlFor="consult-service">
                        Service
                      </label>
                      <select
                        id="consult-service"
                        value={consultationDraft.service}
                        onChange={(event) => updateConsultationDraft('service', event.target.value)}
                        className="mt-2 h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {['Pediatrician', 'Dentist', 'Nutritionist', 'Psychologist', 'Vision', 'Vaccination'].map((service) => (
                          <option key={service} value={service}>
                            {service}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Field
                      label="Clinician"
                      value={consultationDraft.clinician}
                      onChange={(value) => updateConsultationDraft('clinician', value)}
                    />
                  </div>
                  <NoteField label="Finding" value={consultationDraft.finding} onChange={(value) => updateConsultationDraft('finding', value)} />
                  <NoteField
                    label="Recommendation"
                    value={consultationDraft.recommendation}
                    onChange={(value) => updateConsultationDraft('recommendation', value)}
                  />
                  <NoteField label="Follow-up" value={consultationDraft.followUp} onChange={(value) => updateConsultationDraft('followUp', value)} />
                  <Button type="button" onClick={addConsultation}>
                    <ClipboardCheck className="size-4" />
                    Add consultation
                  </Button>

                  <div className="space-y-3">
                    {consultations.map((consultation) => (
                      <div key={consultation.id} className="rounded-md border border-[#dceaf1] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{consultation.service}</p>
                            <p className="text-sm text-[#476477]">{consultation.clinician}</p>
                          </div>
                          <Badge variant="secondary">Camp note</Badge>
                        </div>
                        <p className="mt-3 text-sm text-[#082f49]">{consultation.finding}</p>
                        <p className="mt-2 text-sm text-[#476477]">{consultation.recommendation}</p>
                        <p className="mt-2 text-sm font-medium text-primary">{consultation.followUp}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="report">
            <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
              <div ref={reportRef}>
                <ChildReport
                  activeGroup={activeGroup}
                  childProfile={childProfile}
                  consultations={consultations}
                  ekaPatientId={ekaPatientId}
                  generatedReport={generatedReport}
                  reportScore={reportScore}
                  reportStatus={reportStatus}
                  risks={childRiskItems}
                />
              </div>

              <div className="space-y-5">
                <Card className="rounded-md border-[#dceaf1] shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl tracking-normal">
                      <Share2 className="size-5 text-primary" />
                      Share Health Passport
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center">
                      {reportQrDataUrl ? (
                        <img src={reportQrDataUrl} alt="Child report QR code" className="size-40 rounded-md border border-[#dceaf1]" />
                      ) : (
                        <div className="flex size-40 items-center justify-center rounded-md border border-[#dceaf1] bg-[#f4f9fc]">
                          <QrCode className="size-10 text-[#476477]" />
                        </div>
                      )}
                    </div>
                    <div className="rounded-md border border-[#dceaf1] bg-[#f9fdff] p-3">
                      <div className="flex items-start gap-2">
                        <Link className="mt-0.5 size-4 text-[#0b7fae]" />
                        <p className="break-all text-sm text-[#476477]">{reportUrl}</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Button type="button" onClick={() => void downloadReportPdf()} disabled={isDownloadingReport}>
                        <Download className="size-4" />
                        {isDownloadingReport ? 'Preparing PDF...' : 'Download PDF'}
                      </Button>
                      <Button type="button" onClick={shareReport}>
                        <Share2 className="size-4" />
                        Share / copy link
                      </Button>
                      <Button type="button" variant="outline">
                        <MessageCircle className="size-4" />
                        Send WhatsApp Health Passport
                      </Button>
                    </div>
                    <p className="text-xs text-[#476477]">
                      {reportSentAt
                        ? `Report send triggered at ${reportSentAt}.`
                        : 'Production flow: verify parent mobile by OTP, generate a private token, then send this Health Passport link by WhatsApp/SMS.'}
                    </p>
                    {reportDownloadError && <p className="text-xs font-medium text-destructive">{reportDownloadError}</p>}
                  </CardContent>
                </Card>

                <Card className="rounded-md border-[#dceaf1] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl tracking-normal">Report sections</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      'Height, weight and BMI',
                      'Nutrition score',
                      'Oral score',
                      'Mental wellbeing score',
                      'Growth status',
                      'WHO growth charts',
                      'Vaccination reminder',
                      'Recommendations',
                    ].map(
                      (section) => (
                        <div key={section} className="flex items-center justify-between rounded-md bg-[#f4f9fc] p-3">
                          <span className="text-sm font-medium">{section}</span>
                          <Badge variant="secondary">Included</Badge>
                        </div>
                      ),
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AssessmentPresenterWindow({
  activeGroup,
  activeQuestion,
  activeQuestionIndex,
  activeResponses,
  answeredCount,
  answeredPercent,
  attendeeCount,
  groupQuestionsLength,
  hasFinishedAssessment,
  hasStartedAssessment,
  pendingCount,
  qrDataUrl,
  quizSeconds,
  reportSentAt,
  salesBuckets,
  showQuizResults,
  summaryStats,
  onNext,
  onFinish,
  onOpenVoting,
  onPrevious,
  onReveal,
  onSimulate,
  onStart,
}: {
  activeGroup: CampGroup;
  activeQuestion: CampQuestion;
  activeQuestionIndex: number;
  activeResponses: Record<string, string>;
  answeredCount: number;
  answeredPercent: number;
  attendeeCount: number;
  groupQuestionsLength: number;
  hasFinishedAssessment: boolean;
  hasStartedAssessment: boolean;
  pendingCount: number;
  qrDataUrl: string;
  quizSeconds: number;
  reportSentAt: string | null;
  salesBuckets: Array<(typeof riskSalesMap)[number] & { count: number }>;
  showQuizResults: boolean;
  summaryStats: {
    registered: number;
    totalResponses: number;
    totalFlags: number;
    completion: number;
    topConversationBucket: ((typeof riskSalesMap)[number] & { count: number }) | undefined;
    strongestHabit: { question: CampQuestion; answered: number; pending: number; riskCount: number; answeredPercent: number } | null;
  };
  onNext: () => void;
  onFinish: () => void;
  onOpenVoting: () => void;
  onPrevious: () => void;
  onReveal: () => void;
  onSimulate: () => void;
  onStart: () => void;
}) {
  if (hasFinishedAssessment) {
    return (
      <GroupSummaryScreen
        activeGroup={activeGroup}
        reportSentAt={reportSentAt}
        salesBuckets={salesBuckets}
        summaryStats={summaryStats}
      />
    );
  }

  if (!hasStartedAssessment) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#082f49] p-5 text-white">
        <section className="w-full max-w-5xl rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-6 rounded-md bg-white p-4">
                <DoctyLogo size="lg" />
              </div>
              <Badge className="bg-white text-[#082f49]">Presenter window</Badge>
              <h1 className="mt-5 text-4xl leading-tight tracking-normal md:text-6xl">Docty Child Wellness Assessment</h1>
              <p className="mt-5 text-xl text-[#d7eef8]">{activeGroup.grades}</p>
              <p className="mt-3 text-base leading-7 text-[#d7eef8]">
                Welcome screen is ready. Start when parents have registered and the instructor is ready to lead the session.
              </p>
            </div>

            <div className="rounded-md bg-white p-4 text-center text-[#082f49]">
              {qrDataUrl ? <img src={qrDataUrl} alt="Participant QR code" className="size-44" /> : <QrCode className="size-32" />}
              <p className="mt-3 text-sm font-semibold">Join code</p>
              <p className="text-2xl font-bold text-primary">DOCTY-{activeGroup.id.toUpperCase().slice(0, 4)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="button" size="lg" onClick={onStart}>
              <Play className="size-5" />
              Start assessment
            </Button>
            <Button type="button" size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <QrCode className="size-5" />
              Keep waiting
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#082f49] p-4 text-white md:p-6">
      <LiveQuizStage
        activeGroup={activeGroup}
        activeQuestion={activeQuestion}
        activeQuestionIndex={activeQuestionIndex}
        activeResponses={activeResponses}
        answeredCount={answeredCount}
        answeredPercent={answeredPercent}
        attendeeCount={attendeeCount}
        groupQuestionsLength={groupQuestionsLength}
        pendingCount={pendingCount}
        qrDataUrl={qrDataUrl}
        quizSeconds={quizSeconds}
        showQuizResults={showQuizResults}
        onNext={onNext}
        onOpenVoting={onOpenVoting}
        onPrevious={onPrevious}
        onReveal={onReveal}
        onSimulate={onSimulate}
        onFinish={onFinish}
      />
    </div>
  );
}

function GroupSummaryScreen({
  activeGroup,
  reportSentAt,
  salesBuckets,
  summaryStats,
}: {
  activeGroup: CampGroup;
  reportSentAt: string | null;
  salesBuckets: Array<(typeof riskSalesMap)[number] & { count: number }>;
  summaryStats: {
    registered: number;
    totalResponses: number;
    totalFlags: number;
    completion: number;
    topConversationBucket: ((typeof riskSalesMap)[number] & { count: number }) | undefined;
    strongestHabit: { question: CampQuestion; answered: number; pending: number; riskCount: number; answeredPercent: number } | null;
  };
}) {
  return (
    <div className="min-h-svh bg-[#082f49] p-5 text-white md:p-8">
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-center">
        <Badge className="w-fit bg-white text-[#082f49]">Assessment complete</Badge>
        <h1 className="mt-6 text-4xl leading-tight tracking-normal md:text-6xl">
          Sri Gayatri Techno School little champs are building healthy habits.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#d7eef8]">
          {activeGroup.grades} completed a Docty live wellness assessment. These insights are conversation starters for parents and
          clinicians, not a diagnosis.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <SummaryMetric label="Registered" value={summaryStats.registered} />
          <SummaryMetric label="Responses" value={summaryStats.totalResponses} />
          <SummaryMetric label="Completion" value={`${summaryStats.completion}%`} />
          <SummaryMetric label="Conversation flags" value={summaryStats.totalFlags} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-md bg-white p-5 text-[#082f49]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-normal">Overall group insight</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#476477]">
              The strongest engagement came from{' '}
              <span className="font-semibold text-[#082f49]">
                {summaryStats.strongestHabit?.question.category ?? 'the assessment'}
              </span>
              . The main follow-up conversation bucket is{' '}
              <span className="font-semibold text-primary">{summaryStats.topConversationBucket?.label ?? 'clinician review'}</span>.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {salesBuckets.map((bucket) => {
                const Icon = bucket.icon;
                return (
                  <div key={bucket.label} className="rounded-md bg-[#f4f9fc] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-[#0b7fae]" />
                        <span className="text-sm font-semibold">{bucket.label}</span>
                      </div>
                      <Badge variant={bucket.count ? 'default' : 'secondary'}>{bucket.count}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md bg-white/10 p-5">
            <div className="flex items-center gap-2 text-[#8ee4ff]">
              <MessageCircle className="size-5" />
              <h2 className="text-2xl font-bold tracking-normal text-white">Parent reports</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#d7eef8]">
              AI-generated Health Passports have been prepared from the assessment and camp consultation notes. Parents should connect
              with a Docty clinician for thorough insights and next steps.
            </p>
            <div className="mt-5 rounded-md bg-white p-4 text-[#082f49]">
              <p className="text-sm font-semibold">Delivery status</p>
              <p className="mt-1 text-2xl font-bold text-primary">{reportSentAt ? 'Sent to registered parents' : 'Ready to send'}</p>
              <p className="mt-1 text-sm text-[#476477]">{reportSentAt ? `Triggered at ${reportSentAt}` : 'Click Finish to trigger reports.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ParentReportView({
  activeGroup,
  childProfile,
  consultations,
  ekaPatientId,
  generatedReport,
  reportScore,
  reportStatus,
  risks,
}: {
  activeGroup: CampGroup;
  childProfile: ChildProfile;
  consultations: ConsultationNote[];
  ekaPatientId: string;
  generatedReport: GeneratedReport;
  reportScore: number;
  reportStatus: string;
  risks: Array<{ category: CampQuestion['category']; prompt: string; answer: string }>;
}) {
  const reportMobile =
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('mobile') || '';
  const expectedMobile = normalizeMobile(reportMobile || childProfile.mobile);
  const [mobileInput, setMobileInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  function verifyMobile() {
    const enteredMobile = normalizeMobile(mobileInput);
    const enteredLastTen = enteredMobile.slice(-10);
    const expectedLastTen = expectedMobile.slice(-10);

    if (expectedLastTen && enteredLastTen === expectedLastTen) {
      setIsVerified(true);
      setVerificationMessage('');
      return;
    }

    setVerificationMessage('Please enter the registered parent mobile number to view this report.');
  }

  return (
    <div className="min-h-svh bg-[#f6fbfd] text-[#082f49]">
      <header className="border-b border-[#dceaf1] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <DoctyLogo size="md" />
            <h1 className="mt-3 text-2xl font-bold tracking-normal">Docty Health Passport</h1>
          </div>
          <Button type="button" asChild>
            <a href="/patient">
              <UserRound className="size-4" />
              Patient Dashboard
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!isVerified ? (
          <Card className="mx-auto max-w-lg rounded-md border-[#dceaf1] shadow-sm">
            <CardHeader>
              <Badge className="w-fit">Mobile verification</Badge>
              <CardTitle className="text-2xl tracking-normal">Verify to access Health Passport</CardTitle>
              <p className="text-sm leading-6 text-[#476477]">
                Enter the registered parent mobile number used during camp registration.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                inputMode="numeric"
                placeholder="Registered mobile number"
                value={mobileInput}
                onChange={(event) => setMobileInput(event.target.value)}
              />
              <Button type="button" className="w-full" onClick={verifyMobile}>
                <ShieldCheck className="size-4" />
                Verify and view report
              </Button>
              {verificationMessage && <p className="text-sm text-[#7a1238]">{verificationMessage}</p>}
            </CardContent>
          </Card>
        ) : (
          <ChildReport
            activeGroup={activeGroup}
            childProfile={childProfile}
            consultations={consultations}
            ekaPatientId={ekaPatientId}
            generatedReport={generatedReport}
            reportScore={reportScore}
            reportStatus={reportStatus}
            risks={risks}
          />
        )}
      </main>
    </div>
  );
}

function getResponseInsight(question: CampQuestion, optionId?: string) {
  const option = question.options.find((item) => item.id === optionId);
  if (!option) {
    return '';
  }

  if (option.risk) {
    const categoryInsight: Record<CampQuestion['category'], string> = {
      Nutrition:
        'Many children have similar nutrition gaps. This is a useful starting point to discuss breakfast, protein, hydration and lunchbox habits with a clinician.',
      Oral:
        'Tooth pain or irregular brushing is common in school-age children and is best reviewed early before it becomes urgent.',
      Growth:
        'Lower activity is a helpful conversation point because movement supports growth, sleep, posture and emotional balance.',
      'Mental wellness':
        'Sleep, stress and screen patterns are important signals. A supportive conversation can help understand what your child needs.',
      Vaccination:
        'Many parents are unsure about booster status. Bringing the vaccination record helps the clinician guide you clearly.',
      Awareness:
        'Early signs such as squinting or eye strain are worth checking. Screening is useful because early action can make a difference.',
    };

    return `Your response: ${option.label}. ${categoryInsight[question.category]}`;
  }

  return `Your response: ${option.label}. This suggests a reassuring habit in this area. Keep observing your child's routine and discuss any concerns with the Docty team.`;
}

function ParentAssessmentView({
  activeGroup,
  activeQuestion,
  childProfile,
  ekaPatientId,
  hasFinishedAssessment,
  hasJoinedQuiz,
  hasStartedAssessment,
  isRegisteringPatient,
  participantAnswer,
  reportUrl,
  registrationMessage,
  isManagedCampParticipant,
  joinOtp,
  joinOtpSent,
  onAnswer,
  onJoin,
  onJoinOtpChange,
  onUpdateChildProfile,
}: {
  activeGroup: CampGroup;
  activeQuestion: CampQuestion;
  childProfile: ChildProfile;
  ekaPatientId: string;
  hasFinishedAssessment: boolean;
  hasJoinedQuiz: boolean;
  hasStartedAssessment: boolean;
  isRegisteringPatient: boolean;
  participantAnswer?: string;
  reportUrl: string;
  registrationMessage: string;
  isManagedCampParticipant: boolean;
  joinOtp: string;
  joinOtpSent: boolean;
  onAnswer: (optionId: string) => void;
  onJoin: () => void;
  onJoinOtpChange: (value: string) => void;
  onUpdateChildProfile: (field: keyof ChildProfile, value: string) => void;
}) {
  const insight = getResponseInsight(activeQuestion, participantAnswer);
  const selectedOption = activeQuestion.options.find((option) => option.id === participantAnswer);

  return (
    <div className="min-h-svh bg-[#f6fbfd] text-[#082f49]">
      <header className="border-b border-[#dceaf1] bg-white">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <DoctyLogo size="md" />
          <h1 className="mt-3 text-2xl font-bold tracking-normal">Child Wellness Assessment</h1>
          <p className="mt-1 text-sm text-[#476477]">{activeGroup.grades}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {!hasJoinedQuiz ? (
          <Card className="rounded-md border-[#dceaf1] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl tracking-normal">{isManagedCampParticipant ? 'Verify camp registration' : 'Register child'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isManagedCampParticipant && <Field label="Child name" value={childProfile.childName} onChange={(value) => onUpdateChildProfile('childName', value)} />}
              {!isManagedCampParticipant && <Field label="Parent name" value={childProfile.parentName} onChange={(value) => onUpdateChildProfile('parentName', value)} />}
              <Field label="Parent mobile" value={childProfile.mobile} onChange={(value) => onUpdateChildProfile('mobile', value)} />
              {joinOtpSent && <Field label="WhatsApp OTP" value={joinOtp} onChange={onJoinOtpChange} />}
              {!isManagedCampParticipant && <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Age" value={childProfile.age} onChange={(value) => onUpdateChildProfile('age', value)} />
                <Field label="Grade" value={childProfile.grade} onChange={(value) => onUpdateChildProfile('grade', value)} />
                <Field label="Section" value={childProfile.section} onChange={(value) => onUpdateChildProfile('section', value)} />
              </div>}
              <div className="rounded-md bg-[#f4f9fc] p-4 text-sm text-[#476477]">
                {isManagedCampParticipant ? 'Use the mobile number entered at the Registration Desk. Access is enabled only after the Nursing Station confirms vitals.' : 'Registration links the child to Eka Care and helps Docty send the parent report after the assessment.'}
              </div>
              <Button type="button" className="w-full" onClick={onJoin} disabled={isRegisteringPatient}>
                <CheckCircle2 className="size-4" />
                {isRegisteringPatient ? 'Please wait...' : isManagedCampParticipant ? (joinOtpSent ? 'Verify OTP & Join' : 'Send OTP') : 'Submit registration'}
              </Button>
              {registrationMessage && <p className="text-sm text-[#476477]">{registrationMessage}</p>}
            </CardContent>
          </Card>
        ) : hasFinishedAssessment ? (
          <Card className="rounded-md border-[#dceaf1] shadow-sm">
            <CardContent className="py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-[#eaf8fe] text-[#0b7fae]">
                <CheckCircle2 className="size-7" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-normal">Thank you for participating</h2>
              <p className="mt-3 text-sm leading-6 text-[#476477]">
                Your child&apos;s Health Passport is ready. Please verify the registered mobile number to access the report.
              </p>
              <Button type="button" className="mt-6 w-full" asChild>
                <a href={reportUrl}>
                  <FileText className="size-4" />
                  Access Health Passport
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : !hasStartedAssessment ? (
          <Card className="rounded-md border-[#dceaf1] shadow-sm">
            <CardContent className="py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-[#eaf8fe] text-[#0b7fae]">
                <Timer className="size-7" />
              </div>
              <h2 className="mt-5 text-2xl font-bold tracking-normal">Registration complete</h2>
              <p className="mt-3 text-sm leading-6 text-[#476477]">
                Please wait for the presenter to start the assessment. The first question will appear here automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-md border-[#dceaf1] shadow-sm">
            <CardHeader>
              <Badge className="w-fit">{activeQuestion.category}</Badge>
              <CardTitle className="text-2xl leading-tight tracking-normal">{activeQuestion.prompt}</CardTitle>
              <p className="text-sm text-[#476477]">There are no right or wrong answers. Please choose what best matches your child.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {activeQuestion.options.map((option) => {
                  const isSelected = participantAnswer === option.id;
                  const isLocked = Boolean(participantAnswer);

                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'h-auto min-h-16 justify-start whitespace-normal rounded-md p-4 text-left text-base',
                        isLocked && !isSelected ? 'opacity-45' : '',
                        isLocked ? 'cursor-default' : '',
                      )}
                      onClick={() => {
                        if (!participantAnswer) {
                          onAnswer(option.id);
                        }
                      }}
                      disabled={isLocked && !isSelected}
                      aria-disabled={isLocked}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              {selectedOption && (
                <div className="rounded-md bg-[#eaf8fe] p-4 text-sm leading-6 text-[#082f49]">
                  <span className="font-semibold">You selected: {selectedOption.label}</span>
                  <p className="mt-2 text-[#476477]">Response locked. Please wait for the presenter to move to the next question.</p>
                </div>
              )}
              {insight && <div className="rounded-md bg-[#fff6fa] p-4 text-sm leading-6 text-[#7a1238]">{insight}</div>}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-white/10 p-5">
      <p className="text-sm font-semibold text-[#8ee4ff]">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </div>
  );
}

function LiveQuizStage({
  activeGroup,
  activeQuestion,
  activeQuestionIndex,
  answeredCount,
  answeredPercent,
  attendeeCount,
  activeResponses,
  groupQuestionsLength,
  pendingCount,
  qrDataUrl,
  quizSeconds,
  showQuizResults,
  onPrevious,
  onNext,
  onOpenVoting,
  onReveal,
  onSimulate,
  onFinish,
}: {
  activeGroup: CampGroup;
  activeQuestion: CampQuestion;
  activeQuestionIndex: number;
  answeredCount: number;
  answeredPercent: number;
  attendeeCount: number;
  activeResponses: Record<string, string>;
  groupQuestionsLength: number;
  pendingCount: number;
  qrDataUrl: string;
  quizSeconds: number;
  showQuizResults: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpenVoting: () => void;
  onReveal: () => void;
  onSimulate: () => void;
  onFinish: () => void;
}) {
  const optionStats = activeQuestion.options.map((option) => {
    const count = Object.values(activeResponses).filter((optionId) => optionId === option.id).length;
    const percent = answeredCount ? Math.round((count / answeredCount) * 100) : 0;
    return {
      ...option,
      count,
      percent,
    };
  });

  return (
    <section className="overflow-hidden rounded-md border border-[#dceaf1] bg-[#082f49] text-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_220px]">
        <div className="p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-white text-[#082f49]">{activeQuestion.category}</Badge>
            <Badge className="bg-[#0bb8fc] text-white">
              Question {activeQuestionIndex + 1}/{groupQuestionsLength}
            </Badge>
            <Badge className="bg-white/15 text-white">{activeGroup.grades}</Badge>
            <Badge className="bg-white/15 text-white">No right or wrong answer</Badge>
          </div>

          <h2 className="mt-6 text-3xl leading-tight tracking-normal md:text-5xl">{activeQuestion.prompt}</h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#d7eef8] md:text-lg">{activeQuestion.description}</p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-white/10 p-4">
              <div className="flex items-center gap-2 text-[#8ee4ff]">
                <Users className="size-4" />
                <span className="text-sm font-semibold">Responded</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{answeredCount}/{attendeeCount}</p>
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <div className="flex items-center gap-2 text-[#8ee4ff]">
                <Timer className="size-4" />
                <span className="text-sm font-semibold">Timer</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{quizSeconds}s</p>
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <div className="flex items-center gap-2 text-[#8ee4ff]">
                <Activity className="size-4" />
                <span className="text-sm font-semibold">Not yet responded</span>
              </div>
              <p className="mt-2 text-3xl font-bold">{pendingCount}</p>
            </div>
          </div>

          <div className="mt-5">
            <Progress value={answeredPercent} className="h-4 bg-white/20" />
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {optionStats.map((option, index) => (
              <div key={option.id} className="rounded-md bg-white p-4 text-[#082f49]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-md bg-[#eaf8fe] text-sm font-bold text-[#0b7fae]">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <p className="font-semibold">{option.label}</p>
                  </div>
                  {showQuizResults ? <Badge variant={option.risk ? 'destructive' : 'secondary'}>{option.count}</Badge> : null}
                </div>
                {showQuizResults ? (
                  <>
                    <Progress value={option.percent} className="mt-3 h-3 bg-[#eaf3f8]" />
                    <p className="mt-2 text-sm text-[#476477]">{option.percent}% of answers</p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-[#476477]">Responses hidden until instructor reveals group insight</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onOpenVoting}>
              <Play className="size-4" />
              Open responses
            </Button>
            <Button type="button" className="bg-white text-[#082f49] hover:bg-white/90" onClick={onReveal}>
              <BarChart3 className="size-4" />
              Reveal insights
            </Button>
            <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={onSimulate}>
              <Users className="size-4" />
              Demo +10 responses
            </Button>
            <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={onPrevious}>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={onNext}>
              <ChevronRight className="size-4" />
              Next
            </Button>
            <Button type="button" className="bg-primary text-white hover:bg-primary/90" onClick={onFinish}>
              <Flag className="size-4" />
              Finish
            </Button>
          </div>
        </div>

        <aside className="border-t border-white/15 bg-white/10 p-5 lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold text-[#8ee4ff]">Join on phone</p>
          <p className="mt-2 text-2xl font-bold">DOCTY-{activeGroup.id.toUpperCase().slice(0, 4)}</p>
          <div className="mt-5 flex justify-center rounded-md bg-white p-3">
            {qrDataUrl ? <img src={qrDataUrl} alt="Quiz QR code" className="size-40" /> : <QrCode className="size-24 text-[#082f49]" />}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#d7eef8]">
            Parents register child details, enter mobile number, and respond as the instructor moves question by question.
          </p>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2" />
    </div>
  );
}

function NoteField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-20" />
    </div>
  );
}

function buildCampBookingPath(consultation: ConsultationNote, childProfile: ChildProfile, ekaPatientId: string) {
  const path = consultation.bookingPath || `/book-appointment?service=${encodeURIComponent(consultation.service)}`;
  const [basePath, queryString = ''] = path.split('?');
  const query = new URLSearchParams(queryString);

  query.set('source', query.get('source') || 'school-camp');
  query.set('patientName', childProfile.childName);
  query.set('mobile', childProfile.mobile);
  if (ekaPatientId) {
    query.set('patientId', ekaPatientId);
  }

  return `${basePath}?${query.toString()}`;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseAgeYears(age: string) {
  const match = age.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 8;
}

function scoreFromRisks(risks: Array<{ category: CampQuestion['category'] }>, category: CampQuestion['category']) {
  const riskCount = risks.filter((risk) => risk.category === category).length;
  return clampValue(92 - riskCount * 16, 42, 98);
}

function buildHealthPassportMetrics(
  childProfile: ChildProfile,
  risks: Array<{ category: CampQuestion['category']; prompt: string; answer: string }>,
): HealthPassportMetrics {
  const ageYears = parseAgeYears(childProfile.age);
  const heightCm = Math.round(83 + ageYears * 5.8);
  const weightKg = Math.round((11 + ageYears * 2.35) * 10) / 10;
  const bmiValue = Number((weightKg / (heightCm / 100) ** 2).toFixed(1));
  const growthRisks = risks.filter((risk) => risk.category === 'Growth').length;
  const vaccinationRisks = risks.filter((risk) => risk.category === 'Vaccination').length;
  const nutritionScore = scoreFromRisks(risks, 'Nutrition');
  const oralScore = scoreFromRisks(risks, 'Oral');
  const mentalWellbeingScore = scoreFromRisks(risks, 'Mental wellness');
  const growthStatus =
    growthRisks > 0 || bmiValue < 14
      ? 'Growth review suggested'
      : bmiValue > 22
        ? 'BMI review suggested'
        : 'Tracking in expected screening range';
  const vaccinationReminder = vaccinationRisks
    ? 'Bring vaccination record for clinician review, including HPV counselling where age appropriate.'
    : 'Keep vaccination record ready for routine review and age-appropriate HPV awareness.';

  return {
    height: `${heightCm} cm`,
    weight: `${weightKg} kg`,
    bmi: `${bmiValue}`,
    nutritionScore,
    oralScore,
    mentalWellbeingScore,
    growthStatus,
    vaccinationReminder,
    charts: [
      {
        label: 'Height-for-age',
        value: `${heightCm} cm`,
        marker: clampValue(50 + (heightCm - (83 + ageYears * 5.8)) * 1.5, 8, 92),
        status: 'Plot on WHO height-for-age chart',
      },
      {
        label: 'Weight-for-age',
        value: `${weightKg} kg`,
        marker: clampValue(52 + (weightKg - (11 + ageYears * 2.35)) * 2.2, 8, 92),
        status: 'Plot on WHO weight-for-age chart',
      },
      {
        label: 'BMI-for-age',
        value: `${bmiValue}`,
        marker: clampValue(48 + (bmiValue - 16) * 6, 8, 92),
        status: 'Plot on WHO BMI-for-age chart',
      },
    ],
  };
}

async function loadImageAsDataUrl(path: string) {
  const response = await fetch(path);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildHealthPassportExportPages({
  activeGroup,
  childProfile,
  consultations,
  doctyLogo,
  generatedReport,
  passport,
  reportScore,
  reportStatus,
  risks,
  schoolLogo,
}: {
  activeGroup: CampGroup;
  childProfile: ChildProfile;
  consultations: ConsultationNote[];
  doctyLogo: string;
  generatedReport: GeneratedReport;
  passport: HealthPassportMetrics;
  reportScore: number;
  reportStatus: string;
  risks: Array<{ category: CampQuestion['category']; prompt: string; answer: string }>;
  schoolLogo: string;
}) {
  const styles = `
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; }
      .page {
        width: 794px;
        height: 1123px;
        overflow: hidden;
        background: #f6fbfd;
        color: #082f49;
        font-family: Arial, Helvetica, sans-serif;
        padding: 38px;
        position: relative;
      }
      .page:before {
        content: "";
        position: absolute;
        right: -80px;
        top: 92px;
        width: 260px;
        height: 260px;
        border-radius: 999px;
        background: #0bb8fc;
        opacity: 0.16;
      }
      .page:after {
        content: "";
        position: absolute;
        left: -90px;
        bottom: -90px;
        width: 240px;
        height: 240px;
        border-radius: 999px;
        background: #fe065c;
        opacity: 0.12;
      }
      .content { position: relative; z-index: 1; }
      .logo-bar {
        height: 72px;
        border: 1px solid #dceaf1;
        border-radius: 14px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 24px;
        box-shadow: 0 10px 25px rgba(8, 47, 73, 0.06);
      }
      .docty-logo { width: 188px; height: auto; }
      .school-logo { width: 225px; height: auto; }
      .hero {
        margin-top: 24px;
        min-height: 188px;
        border-radius: 18px;
        padding: 28px;
        background: linear-gradient(135deg, #082f49 0%, #0b7fae 100%);
        color: #fff;
        position: relative;
        overflow: hidden;
      }
      .hero:before {
        content: "";
        position: absolute;
        right: -44px;
        top: -55px;
        width: 190px;
        height: 190px;
        border-radius: 999px;
        background: rgba(142, 228, 255, 0.24);
      }
      .hero:after {
        content: "";
        position: absolute;
        right: -35px;
        bottom: -70px;
        width: 175px;
        height: 175px;
        border-radius: 999px;
        background: rgba(254, 6, 92, 0.42);
      }
      .hero-inner { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 28px; }
      .eyebrow { color: #8ee4ff; font-weight: 800; font-size: 15px; margin: 0 0 8px; }
      .name { font-size: 42px; line-height: 1; font-weight: 900; margin: 0; letter-spacing: 0; }
      .meta { color: #d7eef8; font-size: 16px; line-height: 1.5; margin: 14px 0 0; }
      .score-card {
        width: 142px;
        height: 106px;
        border-radius: 14px;
        background: #fff;
        color: #082f49;
        padding: 14px 16px;
        text-align: center;
        flex: none;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .score-label { color: #476477; font-size: 11px; line-height: 1.15; font-weight: 800; margin: 0; }
      .score { color: #fe065c; font-size: 42px; line-height: 0.92; font-weight: 900; margin: 8px 0 7px; }
      .score-status { color: #476477; font-size: 10px; line-height: 1.2; font-weight: 700; margin: 0; }
      .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
      .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 14px; }
      .metric, .score-metric, .note-card, .section, .item {
        border: 1px solid #dceaf1;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 8px 18px rgba(8, 47, 73, 0.045);
      }
      .metric { min-height: 76px; padding: 14px 16px 12px; border-left: 7px solid #0bb8fc; display: flex; flex-direction: column; justify-content: center; }
      .metric.pink { border-left-color: #fe065c; }
      .label { color: #476477; font-size: 11px; line-height: 1.15; font-weight: 900; text-transform: uppercase; margin: 0 0 8px; }
      .value { color: #082f49; font-size: 24px; line-height: 0.95; font-weight: 900; margin: 0; }
      .score-metric { min-height: 86px; padding: 14px 15px; display: flex; flex-direction: column; justify-content: center; }
      .score-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .score-title { font-size: 14px; line-height: 1.15; font-weight: 900; margin: 0; }
      .score-number { color: #0b7fae; font-size: 28px; line-height: 0.9; font-weight: 900; margin: 0; min-width: 42px; text-align: right; }
      .bar { height: 9px; border-radius: 999px; background: #eaf8fe; overflow: hidden; margin-top: 14px; flex: none; }
      .bar span { display: block; height: 100%; border-radius: 999px; background: #0bb8fc; }
      .note-card { padding: 17px; }
      .note-card.blue { background: #eaf8fe; }
      .note-card.pink { background: #fff6fa; }
      .note-title { font-size: 16px; font-weight: 900; margin: 0 0 8px; }
      .note-text { color: #476477; font-size: 14px; line-height: 1.55; margin: 0; }
      .section { margin-top: 18px; padding: 18px; }
      h2 { font-size: 22px; line-height: 1.1; margin: 0 0 10px; letter-spacing: 0; }
      .body { color: #476477; font-size: 14px; line-height: 1.58; margin: 0; }
      .chart { border-radius: 12px; background: #f4f9fc; padding: 14px; margin-top: 12px; }
      .chart-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
      .chart-title { font-size: 15px; font-weight: 900; margin: 0; }
      .chart-value { color: #0b7fae; font-size: 15px; font-weight: 900; margin: 0; }
      .track { height: 12px; border-radius: 999px; background: linear-gradient(90deg, #fee2e2 0%, #dcfce7 20%, #dcfce7 80%, #fee2e2 100%); margin-top: 16px; position: relative; }
      .marker { position: absolute; top: -5px; width: 22px; height: 22px; border-radius: 999px; background: #fe065c; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(254, 6, 92, 0.3); transform: translateX(-50%); }
      .chart-note { color: #476477; font-size: 12px; line-height: 1.4; margin: 14px 0 0; }
      .item { padding: 14px; margin-top: 10px; }
      .item-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .pill { border-radius: 999px; background: #fff6fa; color: #7a1238; font-size: 12px; font-weight: 900; padding: 6px 10px; }
      .item-title { font-size: 15px; font-weight: 900; margin: 0; }
      .item-text { color: #476477; font-size: 13px; line-height: 1.5; margin: 9px 0 0; }
      .recommendations { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
      .recommendation { border-radius: 10px; background: #eaf8fe; padding: 13px; font-size: 13px; line-height: 1.45; font-weight: 700; color: #082f49; }
      .footer { position: absolute; left: 38px; right: 38px; bottom: 24px; display: flex; justify-content: space-between; color: #476477; font-size: 11px; font-weight: 700; z-index: 2; }
      .clinical-note { margin-top: 14px; border-radius: 12px; background: #fff6fa; color: #7a1238; padding: 14px; font-size: 13px; font-weight: 900; }
    </style>
  `;

  const metric = (label: string, value: string | number, pink = false) => `
    <div class="metric ${pink ? 'pink' : ''}">
      <p class="label">${escapeHtml(label)}</p>
      <p class="value">${escapeHtml(value)}</p>
    </div>
  `;
  const score = (label: string, value: number) => `
    <div class="score-metric">
      <div class="score-row">
        <p class="score-title">${escapeHtml(label)}</p>
        <p class="score-number">${escapeHtml(value)}</p>
      </div>
      <div class="bar"><span style="width:${Math.max(0, Math.min(value, 100))}%"></span></div>
    </div>
  `;
  const chart = (item: HealthPassportMetrics['charts'][number]) => `
    <div class="chart">
      <div class="chart-head">
        <p class="chart-title">${escapeHtml(item.label)}</p>
        <p class="chart-value">${escapeHtml(item.value)}</p>
      </div>
      <div class="track"><span class="marker" style="left:${Math.max(0, Math.min(item.marker, 100))}%"></span></div>
      <p class="chart-note">${escapeHtml(item.status)}</p>
    </div>
  `;
  const riskItems = risks.length
    ? risks
        .map(
          (risk) => `
            <div class="item">
              <div class="item-head">
                <span class="pill">${escapeHtml(risk.category)}</span>
                <p class="item-title">${escapeHtml(risk.answer)}</p>
              </div>
              <p class="item-text">${escapeHtml(risk.prompt)}</p>
            </div>
          `,
        )
        .join('')
    : '<div class="item"><p class="item-text">No red-flag answers recorded for this child yet.</p></div>';
  const consultationItems = consultations
    .map(
      (consultation) => `
        <div class="item">
          <p class="item-title">${escapeHtml(consultation.service)} - ${escapeHtml(consultation.clinician)}</p>
          <p class="item-text">${escapeHtml(consultation.finding)} ${escapeHtml(consultation.followUp)}</p>
        </div>
      `,
    )
    .join('');
  const recommendations = generatedReport.nextSteps
    .map((step, index) => `<div class="recommendation">${index + 1}. ${escapeHtml(step)}</div>`)
    .join('');
  const footer = (page: number, total: number) => `
    <div class="footer">
      <span>Docty Clinics | Health Passport is a screening summary, not a diagnosis</span>
      <span>Page ${page} of ${total}</span>
    </div>
  `;

  return [
    `
      ${styles}
      <div class="page">
        <div class="content">
          <div class="logo-bar">
            <img class="docty-logo" src="${doctyLogo}" alt="Docty Clinics" />
            <img class="school-logo" src="${schoolLogo}" alt="Sri Gayathri Techno School" />
          </div>
          <section class="hero">
            <div class="hero-inner">
              <div>
                <p class="eyebrow">Docty Health Passport</p>
                <h1 class="name">${escapeHtml(childProfile.childName || 'Student')}</h1>
                <p class="meta">${escapeHtml(childProfile.grade)} ${escapeHtml(childProfile.section)} | ${escapeHtml(childProfile.age)} | ${escapeHtml(activeGroup.grades)}</p>
              </div>
              <div class="score-card">
                <p class="score-label">PASSPORT SCORE</p>
                <p class="score">${escapeHtml(reportScore)}</p>
                <p class="score-status">${escapeHtml(reportStatus)}</p>
              </div>
            </div>
          </section>
          <div class="grid-3">
            ${metric('Height', passport.height)}
            ${metric('Weight', passport.weight, true)}
            ${metric('BMI', passport.bmi)}
          </div>
          <div class="grid-3">
            ${score('Nutrition Score', passport.nutritionScore)}
            ${score('Oral Score', passport.oralScore)}
            ${score('Mental Wellbeing Score', passport.mentalWellbeingScore)}
          </div>
          <div class="grid-2">
            <div class="note-card blue">
              <p class="note-title">Growth Status</p>
              <p class="note-text">${escapeHtml(passport.growthStatus)}</p>
            </div>
            <div class="note-card pink">
              <p class="note-title">Vaccination Reminder</p>
              <p class="note-text">${escapeHtml(passport.vaccinationReminder)}</p>
            </div>
          </div>
          <section class="section">
            <h2>WHO Growth Charts</h2>
            <p class="body">Indicative screening view. Final plotting should be done by a clinician using the child's exact age, sex, height and weight on WHO growth charts.</p>
            ${passport.charts.map(chart).join('')}
          </section>
          <section class="section">
            <h2>AI Health Passport Insight</h2>
            <p class="body">${escapeHtml(generatedReport.summary)}</p>
          </section>
        </div>
        ${footer(1, 2)}
      </div>
    `,
    `
      ${styles}
      <div class="page">
        <div class="content">
          <div class="logo-bar">
            <img class="docty-logo" src="${doctyLogo}" alt="Docty Clinics" />
            <img class="school-logo" src="${schoolLogo}" alt="Sri Gayathri Techno School" />
          </div>
          <section class="section">
            <h2>Assessment Highlights</h2>
            ${riskItems}
          </section>
          <section class="section">
            <h2>Consultations During Camp</h2>
            ${consultationItems}
          </section>
          <section class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">${recommendations}</div>
            <div class="clinical-note">Please connect with a Docty clinician for thorough insights before making clinical decisions.</div>
          </section>
        </div>
        ${footer(2, 2)}
      </div>
    `,
  ];
}

function ChildReport({
  activeGroup,
  childProfile,
  consultations,
  ekaPatientId,
  generatedReport,
  reportScore,
  reportStatus,
  risks,
}: {
  activeGroup: CampGroup;
  childProfile: ChildProfile;
  consultations: ConsultationNote[];
  ekaPatientId: string;
  generatedReport: GeneratedReport;
  reportScore: number;
  reportStatus: string;
  risks: Array<{ category: CampQuestion['category']; prompt: string; answer: string }>;
}) {
  const passport = buildHealthPassportMetrics(childProfile, risks);

  return (
    <article className="overflow-hidden rounded-md border border-[#dceaf1] bg-white shadow-sm">
      <div className="bg-[#082f49] px-5 py-6 text-white md:px-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-5 w-fit rounded-md bg-white p-3">
              <DoctyLogo size="sm" showText={false} />
            </div>
            <p className="text-sm font-semibold text-[#8ee4ff]">Docty Health Passport</p>
            <h2 className="mt-2 text-3xl font-bold tracking-normal">{childProfile.childName}</h2>
            <p className="mt-2 text-sm text-[#d7eef8]">
              {childProfile.grade} {childProfile.section} • {childProfile.age} • Sri Gayatri Techno School
            </p>
          </div>
          <div className="rounded-md bg-white/10 p-4 text-center">
            <p className="text-xs text-[#d7eef8]">Passport score</p>
            <p className="mt-1 text-4xl font-bold">{reportScore}</p>
            <p className="mt-1 text-xs text-[#d7eef8]">{reportStatus}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-3 md:p-7">
        <div className="rounded-md bg-[#f4f9fc] p-4">
          <p className="text-sm font-semibold">Parent</p>
          <p className="mt-1 text-sm text-[#476477]">{childProfile.parentName}</p>
        </div>
        <div className="rounded-md bg-[#f4f9fc] p-4">
          <p className="text-sm font-semibold">Mobile</p>
          <p className="mt-1 text-sm text-[#476477]">{childProfile.mobile}</p>
        </div>
        <div className="rounded-md bg-[#f4f9fc] p-4">
          <p className="text-sm font-semibold">Camp group</p>
          <p className="mt-1 text-sm text-[#476477]">{activeGroup.grades}</p>
        </div>
      </div>

      <section className="px-5 pb-5 md:px-7">
        <div className="rounded-md border border-[#dceaf1] bg-[#f9fdff] p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-normal">Health Passport</h3>
              <p className="mt-1 text-sm leading-6 text-[#476477]">
                Screening summary for parent discussion and clinician follow-up.
              </p>
            </div>
            <Badge className="w-fit bg-[#0b7fae] text-white hover:bg-[#0b7fae]">Camp screening</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PassportMetric label="Height" value={passport.height} />
            <PassportMetric label="Weight" value={passport.weight} />
            <PassportMetric label="BMI" value={passport.bmi} />
            <PassportMetric label="Growth Status" value={passport.growthStatus} wide />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ScoreMetric label="Nutrition Score" score={passport.nutritionScore} />
            <ScoreMetric label="Oral Score" score={passport.oralScore} />
            <ScoreMetric label="Mental Wellbeing Score" score={passport.mentalWellbeingScore} />
          </div>

          <div className="mt-4 rounded-md bg-white p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#0b7fae]" />
              <div>
                <p className="font-semibold">Vaccination Reminder</p>
                <p className="mt-1 text-sm leading-6 text-[#476477]">{passport.vaccinationReminder}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 px-5 pb-5 md:grid-cols-2 md:px-7 md:pb-7">
        <section className="rounded-md border border-[#dceaf1] p-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-[#0b7fae]" />
            <h3 className="text-lg font-bold tracking-normal">WHO Growth Charts</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#476477]">
            Indicative screening view. Final plotting should be done by a clinician using the child&apos;s exact age, sex, height and weight on WHO growth charts.
          </p>
          <div className="mt-4 grid gap-3">
            {passport.charts.map((chart) => (
              <div key={chart.label} className="rounded-md bg-[#f4f9fc] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{chart.label}</p>
                  <p className="text-sm font-bold text-[#0b7fae]">{chart.value}</p>
                </div>
                <div className="relative mt-5 h-3 rounded-full bg-gradient-to-r from-[#fee2e2] via-[#dcfce7] to-[#fee2e2]">
                  {[3, 15, 50, 85, 97].map((tick) => (
                    <span
                      key={tick}
                      className="absolute top-5 -translate-x-1/2 text-[10px] font-semibold text-[#476477]"
                      style={{ left: `${tick}%` }}
                    >
                      P{tick}
                    </span>
                  ))}
                  <span
                    className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#fe065c] shadow"
                    style={{ left: `${chart.marker}%` }}
                  />
                </div>
                <p className="mt-8 text-xs text-[#476477]">{chart.status}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#dceaf1] bg-[#fff6fa] p-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="text-lg font-bold tracking-normal">{generatedReport.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-7 text-[#476477]">{generatedReport.summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {generatedReport.nextSteps.map((step) => (
              <div key={step} className="rounded-md bg-white p-3 text-sm text-[#082f49]">
                {step}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#dceaf1] p-4">
          <h3 className="text-lg font-bold tracking-normal">Assessment Highlights</h3>
          <div className="mt-4 space-y-3">
            {risks.length ? (
              risks.map((risk) => (
                <div key={`${risk.category}-${risk.prompt}`} className="rounded-md bg-[#fff6fa] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="destructive">{risk.category}</Badge>
                    <span className="text-sm font-semibold">{risk.answer}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#476477]">{risk.prompt}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md bg-[#f4f9fc] p-3 text-sm text-[#476477]">No red-flag answers recorded for this child yet.</div>
            )}
          </div>
        </section>

        <section className="rounded-md border border-[#dceaf1] p-4">
          <h3 className="text-lg font-bold tracking-normal">Consultations During Camp</h3>
          <div className="mt-4 space-y-3">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="rounded-md bg-[#f4f9fc] p-3">
                <p className="font-semibold">{consultation.service}</p>
                <p className="mt-1 text-sm text-[#476477]">{consultation.finding}</p>
                <p className="mt-2 text-sm font-medium text-primary">{consultation.followUp}</p>
                <Button type="button" size="sm" className="mt-3" asChild>
                  <a href={buildCampBookingPath(consultation, childProfile, ekaPatientId)}>
                    <Stethoscope className="size-4" />
                    Book Appointment
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#dceaf1] p-4 md:col-span-2">
          <h3 className="text-lg font-bold tracking-normal">Recommendations</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-[#eaf8fe] p-3 text-sm">Pediatrician review for growth, nutrition and recurrent illness concerns.</div>
            <div className="rounded-md bg-[#eaf8fe] p-3 text-sm">Dental follow-up if pain, visible cavity or brushing gaps are present.</div>
            <div className="rounded-md bg-[#eaf8fe] p-3 text-sm">Vaccination record review, including HPV awareness where age appropriate.</div>
          </div>
          <div className="mt-4 rounded-md bg-[#fff6fa] p-4 text-sm font-semibold text-[#7a1238]">
            Please connect with a Docty clinician for thorough insights before making clinical decisions.
          </div>
        </section>
      </div>
    </article>
  );
}

function PassportMetric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-md border border-[#dceaf1] bg-white p-3 ${wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-normal text-[#476477]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#082f49]">{value}</p>
    </div>
  );
}

function ScoreMetric({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-md border border-[#dceaf1] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-2xl font-bold text-[#0b7fae]">{score}</p>
      </div>
      <Progress value={score} className="mt-3 h-2" />
      <p className="mt-2 text-xs text-[#476477]">Conversation score from camp screening responses.</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-[#dceaf1] bg-[#f9fdff] px-4 py-3">
      <p className="text-xs font-medium text-[#476477]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#082f49]">{value}</p>
    </div>
  );
}
