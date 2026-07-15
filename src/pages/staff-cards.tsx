import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  CreditCard,
  Database,
  Download,
  GraduationCap,
  IdCard,
  LineChart,
  ListChecks,
  Loader2,
  LogOut,
  Printer,
  RotateCw,
  Search,
  Share2,
  ShieldCheck,
  MessageCircle,
  Megaphone,
  UserCog,
  ReceiptText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  cardBaseFilename,
  formatSubscriptionDate,
  generateSubscriptionCardPdf,
  profileInitials,
  renderSubscriptionCardImage,
  subscriptionMemberId,
  subscriptionPlanName,
  type SubscriptionCardProfile,
} from '@/lib/subscription-card';

interface StaffSubscriber extends SubscriptionCardProfile {
  mobile?: string;
  dob?: string;
  gender?: string;
  relation?: string;
  createdAt?: string;
  updatedAt?: string;
  cardIssued?: boolean;
  cardIssuedDate?: string;
  evitalRxPatientId?: string;
}

interface StaffSystemLog {
  id: string;
  createdAt: string;
  level: 'info' | 'success' | 'warning' | 'error';
  source: string;
  event: string;
  message: string;
  actorName?: string;
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, '').slice(-10);
}

function formatLogDateTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function logLevelClass(level: StaffSystemLog['level']) {
  if (level === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (level === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (level === 'error') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}`;
}

function formatIssuedDate(value?: string) {
  if (!value) return 'Not issued';
  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(timestamp));
}

async function pdfToFile(profile: StaffSubscriber) {
  const pdf = await generateSubscriptionCardPdf(profile);
  return new File([pdf.output('blob')], `${cardBaseFilename(profile)}.pdf`, {
    type: 'application/pdf',
  });
}

async function resizeProfileImage(file: File) {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 8 MB.');
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const objectUrl = URL.createObjectURL(file);
    element.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read the selected image.'));
    };
    element.src = objectUrl;
  });

  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the profile image.');

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.78);
}

async function downloadPdf(profile: StaffSubscriber) {
  const pdf = await generateSubscriptionCardPdf(profile);
  pdf.save(`${cardBaseFilename(profile)}.pdf`);
}

async function sharePdf(profile: StaffSubscriber) {
  const file = await pdfToFile(profile);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `${profile.name} Docty subscription card`,
      text: 'Docty Clinics subscription card',
      files: [file],
    });
    return;
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to prepare the card PDF.'));
    reader.readAsDataURL(blob);
  });
}

async function sendCardOnWhatsApp(profile: StaffSubscriber) {
  if (!profile.mobile) throw new Error('Patient mobile number is not available.');
  const pdf = await generateSubscriptionCardPdf(profile);
  const filename = `${cardBaseFilename(profile)}.pdf`;
  const pdfDataUrl = await blobToDataUrl(pdf.output('blob'));
  const response = await fetch('/api/staff/share-card-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipientMobile: profile.mobile,
      filename,
      memberId: subscriptionMemberId(profile),
      pdfDataUrl,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || 'Unable to send the card on WhatsApp.');
  }
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function printPdf(profile: StaffSubscriber) {
  const printWindow = window.open('', '_blank', 'width=900,height=720');
  if (!printWindow) {
    await downloadPdf(profile);
    throw new Error('Popup was blocked. The card PDF has been downloaded instead.');
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtmlAttribute(profile.name)} Docty subscription card</title>
        <style>
          html,
          body {
            margin: 0;
            padding: 0;
            background: #f8fafc;
            font-family: Arial, sans-serif;
          }

          .loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0b3148;
            font-size: 16px;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="loading">Preparing card for print…</div>
      </body>
    </html>
  `);
  printWindow.document.close();

  const [frontImage, backImage] = await Promise.all([
    renderSubscriptionCardImage(profile, 'front'),
    renderSubscriptionCardImage(profile, 'back'),
  ]);

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtmlAttribute(profile.name)} Docty subscription card</title>
        <style>
          @page {
            size: 85.6mm 53.98mm;
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          .card-page {
            width: 85.6mm;
            height: 53.98mm;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }

          .card-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          img {
            display: block;
            width: 85.6mm;
            height: 53.98mm;
            object-fit: cover;
          }

          @media screen {
            body {
              background: #f8fafc;
              padding: 20px;
            }

            .card-page {
              margin: 0 auto 20px;
              border-radius: 12px;
              box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
            }
          }
        </style>
      </head>
      <body>
        <section class="card-page">
          <img src="${escapeHtmlAttribute(frontImage)}" alt="Subscription card front" />
        </section>
        <section class="card-page">
          <img src="${escapeHtmlAttribute(backImage)}" alt="Subscription card back" />
        </section>
        <script>
          const images = Array.from(document.images);
          Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
            image.onload = resolve;
            image.onerror = resolve;
          }))).then(() => {
            setTimeout(() => {
              window.focus();
              window.print();
            }, 250);
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function CardPreview({ profile }: { profile: StaffSubscriber }) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    setImageUrl('');
    renderSubscriptionCardImage(profile, side)
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) toast.error('Unable to render the card preview.');
      });
    return () => {
      cancelled = true;
    };
  }, [profile, side]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-white/90"
        onClick={() => setSide((current) => (current === 'front' ? 'back' : 'front'))}
        aria-label={`Show ${side === 'front' ? 'back' : 'front'} side`}
      >
        <RotateCw className="h-4 w-4" />
      </Button>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${profile.name} subscription card ${side}`}
          className="block aspect-[1.586] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[1.586] w-full items-center justify-center bg-slate-50 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Rendering card…
        </div>
      )}
    </div>
  );
}

function SubscriberCard({
  profile,
  showRelationship,
  onPhotoUpdated,
  onCardIssued,
  onEvitalRxPatientIdUpdated,
}: {
  profile: StaffSubscriber;
  showRelationship: boolean;
  onPhotoUpdated: (profileId: string, imageUrl: string) => void;
  onCardIssued: (profileId: string, issued: boolean, issuedDate: string) => void;
  onEvitalRxPatientIdUpdated: (profileId: string, evitalRxPatientId: string) => void;
}) {
  const [busyAction, setBusyAction] = useState<'download' | 'share' | 'print' | 'whatsapp' | ''>('');
  const [isSavingIssuedStatus, setIsSavingIssuedStatus] = useState(false);
  const [isSavingEvitalRxPatientId, setIsSavingEvitalRxPatientId] = useState(false);
  const [evitalRxPatientId, setEvitalRxPatientId] = useState(profile.evitalRxPatientId || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const initials = useMemo(() => profile.initials || profileInitials(profile.name), [profile.initials, profile.name]);

  useEffect(() => {
    setEvitalRxPatientId(profile.evitalRxPatientId || '');
  }, [profile.evitalRxPatientId]);

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const imageUrl = await resizeProfileImage(file);
      const response = await fetch('/api/staff/patient-photo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: profile.id,
          imageUrl,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to update the patient photo.');
      }
      onPhotoUpdated(profile.id, body.imageUrl);
      toast.success('Patient photo updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the patient photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const updateCardIssuedStatus = async (issued: boolean) => {
    setIsSavingIssuedStatus(true);
    const issuedDate = issued ? todayInIndia() : '';
    try {
      const response = await fetch('/api/staff/card-issued', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: profile.id,
          mobile: profile.mobile,
          cardIssued: issued,
          issuedDate,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to update printed card issue status.');
      }
      onCardIssued(profile.id, Boolean(body.cardIssued), body.cardIssuedDate || issuedDate);
      if (!issued) {
        toast.success('Printed card marked as not issued.');
      } else if (body.whatsappSent) {
        toast.success('Printed card marked issued and WhatsApp notification sent.');
      } else if (body.whatsappMessage) {
        toast.warning(`Printed card marked issued. WhatsApp not sent: ${body.whatsappMessage}`);
      } else {
        toast.success('Printed card marked issued.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update printed card issue status.');
    } finally {
      setIsSavingIssuedStatus(false);
    }
  };

  const saveEvitalRxPatientId = async () => {
    const trimmedPatientId = evitalRxPatientId.trim();
    setIsSavingEvitalRxPatientId(true);
    try {
      const response = await fetch('/api/staff/evitalrx-patient-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: profile.id,
          evitalRxPatientId: trimmedPatientId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to update eVitalRx patient ID.');
      }
      onEvitalRxPatientIdUpdated(profile.id, body.evitalRxPatientId || trimmedPatientId);
      setEvitalRxPatientId(body.evitalRxPatientId || trimmedPatientId);
      toast.success(trimmedPatientId ? 'eVitalRx patient ID saved.' : 'eVitalRx patient ID cleared.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update eVitalRx patient ID.');
    } finally {
      setIsSavingEvitalRxPatientId(false);
    }
  };

  const runAction = async (action: 'download' | 'share' | 'print' | 'whatsapp' | 'issue') => {
    setBusyAction(action);
    try {
      if (action === 'download') await downloadPdf(profile);
      if (action === 'share') await sharePdf(profile);
      if (action === 'print') await printPdf(profile);
      if (action === 'whatsapp') {
        await sendCardOnWhatsApp(profile);
        toast.success('Subscription card sent on WhatsApp.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete the card action.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(340px,0.92fr)_1fr] lg:p-5">
        <CardPreview profile={profile} />
        <div className="flex flex-col justify-between gap-5">
          <div>
            <div className="mb-4 flex items-start gap-3">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-[#0BB8FC]">
                  {profile.imageUrl && <AvatarImage src={profile.imageUrl} alt={profile.name} className="object-cover" />}
                  <AvatarFallback className="bg-[#DEF7FF] font-bold text-[#FE065C]">{initials}</AvatarFallback>
                </Avatar>
                <label
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-sm"
                  title={profile.imageUrl ? 'Update patient photo' : 'Capture patient photo'}
                  aria-label={profile.imageUrl ? 'Update patient photo' : 'Capture patient photo'}
                >
                  {isUploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    className="sr-only"
                    disabled={isUploadingPhoto}
                    onChange={(event) => {
                      void uploadPhoto(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-bold">{profile.name}</h2>
              <Badge className="bg-[#FE065C] text-white">Subscriber</Badge>
              {!profile.imageUrl && <Badge variant="outline">Photo needed</Badge>}
                </div>
              <p className="text-sm text-muted-foreground">
                {profile.mobile ? `+91 ${profile.mobile}` : 'Mobile not available'}
              </p>
              {showRelationship && (
                <p className="mt-1 text-sm font-semibold text-[#0BB8FC]">
                  Relationship: {profile.relation || 'Not specified'}
                </p>
              )}
            </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-muted-foreground">Plan</p>
                <p className="font-bold">{subscriptionPlanName(profile)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-muted-foreground">Subscriber ID</p>
                <p className="font-bold">{subscriptionMemberId(profile)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-muted-foreground">Valid from</p>
                <p className="font-bold">{formatSubscriptionDate(profile.subscription?.startDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-muted-foreground">Valid to</p>
                <p className="font-bold">{formatSubscriptionDate(profile.subscription?.endDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor={`evitalrx-${profile.id}`}>eVitalRx Patient ID</Label>
                    <Input
                      id={`evitalrx-${profile.id}`}
                      value={evitalRxPatientId}
                      placeholder="Enter eVitalRx patient ID"
                      disabled={isSavingEvitalRxPatientId}
                      onChange={(event) => setEvitalRxPatientId(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={
                      isSavingEvitalRxPatientId ||
                      evitalRxPatientId.trim() === (profile.evitalRxPatientId || '').trim()
                    }
                    onClick={() => void saveEvitalRxPatientId()}
                  >
                    {isSavingEvitalRxPatientId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={Boolean(profile.cardIssued)}
                      disabled={isSavingIssuedStatus}
                      onCheckedChange={(checked) => {
                        void updateCardIssuedStatus(Boolean(checked));
                      }}
                    />
                    <span>
                      <span className="block text-muted-foreground">Printed card issued?</span>
                      <span className="font-bold">{profile.cardIssued ? 'Issued' : 'Not issued'}</span>
                    </span>
                  </label>
                  <div className="text-left sm:text-right">
                    <p className="text-muted-foreground">Issued date/time</p>
                    <p className="font-bold">
                      {isSavingIssuedStatus ? 'Saving…' : formatIssuedDate(profile.cardIssuedDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={Boolean(busyAction)}
              onClick={() => void runAction('download')}
            >
              {busyAction === 'download' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={Boolean(busyAction)}
              onClick={() => void runAction('print')}
            >
              {busyAction === 'print' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Print
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={Boolean(busyAction)}
              onClick={() => void runAction('share')}
            >
              {busyAction === 'share' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Share
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#25D366] text-white hover:bg-[#1fad53]"
              disabled={Boolean(busyAction) || !profile.mobile}
              onClick={() => void runAction('whatsapp')}
            >
              {busyAction === 'whatsapp' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
              WhatsApp
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StaffCardsPage() {
  const [authStep, setAuthStep] = useState<'mobile' | 'otp'>('mobile');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffMobile, setStaffMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [staffName, setStaffName] = useState('');
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [mobile, setMobile] = useState('');
  const [subscribers, setSubscribers] = useState<StaffSubscriber[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [recentLogs, setRecentLogs] = useState<StaffSystemLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const loadRecentLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('/api/staff/system-logs?limit=5', {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to load system logs.');
      setRecentLogs(body?.logs || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load system logs.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetch('/api/staff/session', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const body = await response.json().catch(() => null);
          setStaffName(body?.staff?.name || '');
          setStaffMobile(body?.staff?.mobile || '');
          setIsStaffAdmin(Boolean(body?.staff?.isAdmin));
          setModuleAccess(body?.staff?.moduleAccess || {});
          setSessionExpiresAt(body?.expiresAt || null);
        } else {
          setIsStaffAdmin(false);
          setModuleAccess({});
          setSessionExpiresAt(null);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsStaffAdmin(false);
        setModuleAccess({});
        setSessionExpiresAt(null);
      })
      .finally(() => setIsCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return undefined;

    const timeoutMs = Math.max(0, sessionExpiresAt * 1000 - Date.now());
    const timer = window.setTimeout(() => {
      setIsAuthenticated(false);
      setSessionExpiresAt(null);
      setSubscribers([]);
      setAuthStep('mobile');
      toast.info('Staff session expired. Please verify OTP again.');
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, sessionExpiresAt]);

  useEffect(() => {
    if (!isAuthenticated || !isStaffAdmin) return undefined;
    void loadRecentLogs();
    const timer = window.setInterval(() => void loadRecentLogs(), 30000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, isStaffAdmin]);

  const sendStaffOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedMobile = normalizeMobile(staffMobile);
    if (normalizedMobile.length !== 10) {
      toast.error('Enter a valid 10-digit staff mobile number.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/staff/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setStaffMobile(normalizedMobile);
      setStaffName(body?.staffName || '');
      setAuthStep('otp');
      toast.success(body?.message || 'WhatsApp OTP sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyStaffOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 4) {
      toast.error('Enter the 4-digit OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch('/api/staff/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: staffMobile, otp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setIsAuthenticated(true);
      setStaffName(body?.staff?.name || staffName);
      setStaffMobile(body?.staff?.mobile || staffMobile);
      setIsStaffAdmin(Boolean(body?.staff?.isAdmin));
      setModuleAccess(body?.staff?.moduleAccess || {});
      setSessionExpiresAt(body?.expiresAt || Math.floor(Date.now() / 1000) + 30 * 60);
      setOtp('');
      toast.success('Staff access verified');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const logout = async () => {
    await fetch('/api/staff/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setIsStaffAdmin(false);
    setModuleAccess({});
    setSessionExpiresAt(null);
    setSubscribers([]);
    setRecentLogs([]);
    setOtp('');
    setAuthStep('mobile');
  };

  const updateSubscriberPhoto = (profileId: string, imageUrl: string) => {
    setSubscribers((current) =>
      current.map((profile) =>
        profile.id === profileId ? { ...profile, imageUrl } : profile
      )
    );
  };

  const updateCardIssued = (profileId: string, issued: boolean, issuedDate: string) => {
    setSubscribers((current) =>
      current.map((profile) =>
        profile.id === profileId
          ? { ...profile, cardIssued: issued, cardIssuedDate: issuedDate }
          : profile
      )
    );
  };

  const updateEvitalRxPatientId = (profileId: string, evitalRxPatientId: string) => {
    setSubscribers((current) =>
      current.map((profile) =>
        profile.id === profileId ? { ...profile, evitalRxPatientId } : profile
      )
    );
  };

  const searchSubscribers = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedMobile = normalizeMobile(mobile);
    if (normalizedMobile.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }

    setIsSearching(true);
    setSubscribers([]);
    try {
      const response = await fetch(`/api/staff/subscribers?mobile=${encodeURIComponent(normalizedMobile)}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to find subscribers.');
      setSubscribers(body?.subscribers || []);
      if (!body?.subscribers?.length) {
        toast.info('No active subscriber found for this mobile number.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to find subscribers.');
    } finally {
      setIsSearching(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold">Staff Application</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Verify your Eka staff mobile number to access subscriber cards, card issue tracking, and doctor payout tools.
              </p>
            </div>
            {authStep === 'mobile' ? (
              <form className="space-y-4" onSubmit={sendStaffOtp}>
                <div className="space-y-2">
                  <Label htmlFor="staff-mobile">Staff mobile number</Label>
                  <Input
                    id="staff-mobile"
                    type="tel"
                    inputMode="numeric"
                    value={staffMobile}
                    onChange={(event) => setStaffMobile(event.target.value)}
                    placeholder="Enter Eka staff mobile number"
                    autoComplete="tel"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isSendingOtp}>
                  {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send WhatsApp OTP
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={verifyStaffOtp}>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-muted-foreground">
                  WhatsApp OTP sent to +91 ******{staffMobile.slice(-4)}
                  <span className="block font-semibold text-foreground">
                    Staff access will be verified with Eka after OTP confirmation.
                  </span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-otp">4-digit OTP</Label>
                  <Input
                    id="staff-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter OTP"
                    autoComplete="one-time-code"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={isVerifyingOtp}>
                  {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and continue
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-full"
                  disabled={isSendingOtp}
                  onClick={() => {
                    setAuthStep('mobile');
                    setOtp('');
                  }}
                >
                  Change mobile number
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="bg-slate-50/70">
      <section className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="mb-6 flex items-center justify-between gap-4">
            <img
              src="/docty-logo-full.png"
              alt="Docty Clinics"
              className="h-12 w-auto"
            />
            <p className="hidden text-right text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Your neighbourhood clinic
            </p>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <Button className="rounded-full">
              <IdCard className="mr-2 h-4 w-4" />
              Cards
            </Button>
            {(moduleAccess.pharmacy_billing ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff/pharmacy-billing">
                <ReceiptText className="mr-2 h-4 w-4" />
                Pharmacy Billing
              </Link>
            </Button>}
            {(moduleAccess.leads ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff/leads">
                <ListChecks className="mr-2 h-4 w-4" />
                Leads
              </Link>
            </Button>}
            {(moduleAccess.social_media ?? isStaffAdmin) && <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/staff/social-media">
                <Megaphone className="mr-2 h-4 w-4" />
                Social Media
              </Link>
            </Button>}
            {(moduleAccess.corporate_camps ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
              <Link to="/Corporate/camps">
                <GraduationCap className="mr-2 h-4 w-4" />
                Corporate Camps
              </Link>
            </Button>}
            {isStaffAdmin && (
              <>
                {(moduleAccess.doctor_payout ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link to="/staff/doctor-payout">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Doctor Payout
                  </Link>
                </Button>}
                {(moduleAccess.franchise_dashboard ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link to="/franchise">
                    <LineChart className="mr-2 h-4 w-4" />
                    Franchise Dashboard
                  </Link>
                </Button>}
                {(moduleAccess.system_logs ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link to="/staff/system-logs">
                    <Database className="mr-2 h-4 w-4" />
                    System Logs
                  </Link>
                </Button>}
                {(moduleAccess.staff_administration ?? true) && <Button asChild variant="outline" className="rounded-full bg-white">
                  <Link to="/staff/administration">
                    <UserCog className="mr-2 h-4 w-4" />
                    Administration
                  </Link>
                </Button>}
              </>
            )}
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <IdCard className="h-4 w-4" />
              Staff application
              </div>
              <h1 className="text-3xl font-bold">Subscriber card desk</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Enter the patient mobile number used in Eka. Subscriber profiles are shown latest-added first.
                {staffName || staffMobile ? ` Signed in as ${staffName || `+91 ${staffMobile}`}.` : ''}
              </p>
            </div>
            <Button variant="outline" className="rounded-full bg-white" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        {isStaffAdmin && (
          <Card className="mb-6 border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Database className="h-4 w-4" />
                    System Logs
                  </div>
                  <h2 className="text-xl font-bold">Recent activity</h2>
                  <p className="text-sm text-muted-foreground">
                    Latest pharmacy, inventory, WhatsApp, and staff activity from Neon.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={isLoadingLogs}
                    onClick={() => void loadRecentLogs()}
                  >
                    {isLoadingLogs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Refresh
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link to="/staff/system-logs">
                      Open Logs
                    </Link>
                  </Button>
                </div>
              </div>

              {isLoadingLogs && recentLogs.length === 0 ? (
                <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading system logs
                </div>
              ) : recentLogs.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-5">
                  {recentLogs.map((log) => (
                    <Link
                      key={log.id}
                      to="/staff/system-logs"
                      className="rounded-lg border bg-slate-50 p-3 transition-colors hover:bg-white"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${logLevelClass(log.level)}`}>
                          {log.level}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatLogDateTime(log.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-sm font-bold">{log.event.replace(/_/g, ' ')}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {log.message}
                      </p>
                      <p className="mt-2 truncate text-[11px] font-semibold text-primary">
                        {log.source}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No system logs found yet. New pharmacy and inventory activity will appear here.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4 md:p-5">
            <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={searchSubscribers}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  inputMode="numeric"
                  placeholder="Search by patient mobile number"
                  className="h-12 rounded-full pl-12 text-base"
                />
              </div>
              <Button type="submit" className="h-12 rounded-full px-8" disabled={isSearching}>
                {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {subscribers.length > 0 ? (
          <div className="space-y-5">
            {subscribers.map((profile) => (
              <SubscriberCard
                key={profile.id}
                profile={profile}
                showRelationship={subscribers.length > 1}
                onPhotoUpdated={updateSubscriberPhoto}
                onCardIssued={updateCardIssued}
                onEvitalRxPatientIdUpdated={updateEvitalRxPatientId}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-white/80">
            <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
              <IdCard className="mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-bold">Search a subscriber mobile number</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                The card desk will display matching active subscriptions from Eka, including photo, plan, validity and actions.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
