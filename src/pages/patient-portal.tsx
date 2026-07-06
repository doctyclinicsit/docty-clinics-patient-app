import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Camera,
  Crown,
  IndianRupee,
  LockKeyhole,
  MapPin,
  Pencil,
  Phone,
  Pill,
  ReceiptText,
  RotateCw,
  MessageCircle,
  Share2,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { usePatientSession } from '@/lib/patient-session-context';

type PortalStep = 'mobile' | 'otp' | 'register' | 'edit' | 'relationships' | 'profiles' | 'dashboard';

interface PatientProfile {
  id: string;
  name: string;
  accessToken: string;
  relation?: string;
  dob?: string;
  gender?: string;
  imageUrl?: string;
  subscription?: PatientSubscription;
  initials: string;
}

interface PatientSubscription {
  subscriber: boolean;
  planCode?: string;
  startDate?: string;
  endDate?: string;
}

interface PatientAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctor: string;
  clinicId: string;
  clinic: string;
  startTime: number;
  mode?: string;
  channel?: string;
  status: string;
  statusLabel: string;
  prescriptionUrl?: string;
  paymentAmount?: number | null;
  editable: boolean;
}

interface PharmacyPurchase {
  id?: string;
  order_id?: string;
  order_number?: string;
  bill_no?: string;
  has_invoice?: boolean;
  payment_method?: string;
  payment_mode?: string;
  payment_type?: string;
  payment_status?: string;
  status?: string;
  status_label?: string;
  status_name?: string;
  order_status?: string;
  created_date?: string;
  order_delivery_datetime?: string;
  created_at?: string;
  order_date?: string;
  date?: string;
  final_amount?: number | string;
  payable_amount?: number | string;
  total?: number | string;
  amount?: number | string;
  items?: unknown[];
  order_items?: unknown[];
  medicines?: unknown[];
}

interface RescheduleSlot {
  start: string;
  end: string;
  confId: string;
}

function profileInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PT';
}

function mapPatientProfiles(profiles: any[] = []): PatientProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    initials: profileInitials(profile.name),
  }));
}

function isNoProfileResponse(body: any) {
  const message = String(
    body?.message ||
    body?.error?.message ||
    body?.error ||
    ''
  ).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('no patient') ||
    message.includes('no profile') ||
    message.includes('profile does not exist') ||
    message.includes('patient does not exist')
  );
}

function formatGender(value?: string) {
  return value === 'M' ? 'Male' : value === 'F' ? 'Female' : value === 'O' ? 'Other' : value || 'Not specified';
}

function formatDob(value?: string) {
  if (!value) return 'Not specified';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function ageFromDob(value?: string) {
  if (!value) return '';
  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age > 0 ? String(age) : '';
}

const SUBSCRIPTION_PLAN_NAMES: Record<string, string> = {
  DME: 'Docty Me',
  DUS: 'Docty Us',
  DWE: 'Docty We',
  DAL: 'Docty All',
  DTC: 'Docty Total Care',
};

function formatSubscriptionDate(value?: string) {
  if (!value) return 'Not available';
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(timestamp));
}

function lastOneYearRange() {
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

function pharmacyOrderDate(order: PharmacyPurchase) {
  return order.created_date || order.order_delivery_datetime || order.created_at || order.order_date || order.date || '';
}

function pharmacyOrderTimestamp(order: PharmacyPurchase) {
  const timestamp = Date.parse(pharmacyOrderDate(order));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatPharmacyOrderDate(order: PharmacyPurchase) {
  const timestamp = pharmacyOrderTimestamp(order);
  return timestamp
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(timestamp))
    : 'Date not available';
}

function pharmacyOrderAmount(order: PharmacyPurchase) {
  const value = Number(
    order.final_amount ?? order.payable_amount ?? order.total ?? order.amount
  );
  return Number.isFinite(value) && value > 0
    ? `₹${value.toLocaleString('en-IN')}`
    : 'Amount to confirm';
}

function pharmacyBillNo(order: PharmacyPurchase) {
  return order.bill_no || order.order_number || order.id || order.order_id || 'Not available';
}

function pharmacyPaymentMethod(order: PharmacyPurchase) {
  const value = String(order.payment_method || order.payment_mode || order.payment_type || order.payment_status || '').trim();
  const numericMode = Number(value);
  if (!Number.isFinite(numericMode)) return value || 'Not available';
  const paymentModeLabels: Record<number, string> = {
    1: 'Cash',
    2: 'Credit',
    3: 'Debit Card',
    4: 'UPI',
    5: 'Wallet',
    6: 'Card (CC/DC)',
    7: 'Online Payment',
  };
  return paymentModeLabels[numericMode] || `Payment mode ${numericMode}`;
}

function pharmacyOrderIdentifier(order: PharmacyPurchase) {
  return String(order.order_id || order.id || order.order_number || order.bill_no || '').trim();
}

function pharmacyHasInvoice(order: PharmacyPurchase) {
  return Boolean(pharmacyOrderIdentifier(order));
}

function pharmacyOrderItemsCount(order: PharmacyPurchase) {
  const items = order.items || order.order_items || order.medicines || [];
  return Array.isArray(items) ? items.length : 0;
}

function subscriptionMemberId(profile: PatientProfile) {
  const suffix = profile.id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
  return `DC-${suffix.padStart(8, '0')}`;
}

async function imageUrlToDataUrl(url?: string) {
  if (!url) return undefined;
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) return undefined;
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to prepare the profile picture.'));
    reader.readAsDataURL(blob);
  });
}

async function renderCardPreviewToDataUrl(element?: HTMLElement | null, options?: { printClean?: boolean }) {
  if (!element) return undefined;
  const html2canvas = (await import('html2canvas')).default;
  const hasUnsupportedColorFunction = (value?: string | null) =>
    Boolean(value && (value.includes('oklch(') || value.includes('oklab(')));
  const safeCssValue = (property: string, value: string) => {
    if (!hasUnsupportedColorFunction(value)) return value;
    if (property.includes('background')) return 'rgba(255, 255, 255, 0)';
    if (property.includes('border') || property.includes('outline')) return 'rgb(226, 232, 240)';
    if (property.includes('shadow')) return '0 10px 15px -3px rgba(15, 23, 42, 0.16)';
    return 'rgb(9, 26, 38)';
  };
  const copySafeComputedStyles = (source: HTMLElement, target: HTMLElement, cloneDocument: Document) => {
    const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
    const targetNodes = [target, ...Array.from(target.querySelectorAll<HTMLElement>('*'))];
    sourceNodes.forEach((sourceNode, index) => {
      const targetNode = targetNodes[index];
      if (!targetNode) return;
      const computed = window.getComputedStyle(sourceNode);
      Array.from(computed).forEach((property) => {
        targetNode.style.setProperty(
          property,
          safeCssValue(property, computed.getPropertyValue(property)),
          computed.getPropertyPriority(property)
        );
      });
    });
    target.style.color = 'rgb(9, 26, 38)';
    target.style.backgroundColor = 'rgb(255, 255, 255)';
    target.style.borderColor = 'rgb(226, 232, 240)';
    target.style.boxShadow = options?.printClean
      ? 'none'
      : '0 25px 50px -12px rgba(15, 23, 42, 0.25)';
    cloneDocument.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
  };
  const originalBodyColor = document.body.style.color;
  const originalBodyBackground = document.body.style.backgroundColor;
  document.body.style.color = 'rgb(8, 47, 73)';
  document.body.style.backgroundColor = 'rgb(255, 255, 255)';
  element.setAttribute('data-card-capture', 'true');
  if (options?.printClean) element.setAttribute('data-pdf-capture', 'true');
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
      logging: false,
      onclone: (documentClone) => {
        const clonedBody = documentClone.body;
        clonedBody.style.color = 'rgb(8, 47, 73)';
        clonedBody.style.backgroundColor = 'rgb(255, 255, 255)';
        const clonedRoot = documentClone.documentElement;
        clonedRoot.style.color = 'rgb(8, 47, 73)';
        clonedRoot.style.backgroundColor = 'rgb(255, 255, 255)';
        const clonedCard = documentClone.querySelector<HTMLElement>('[data-card-capture="true"]');
        if (clonedCard) {
          copySafeComputedStyles(element, clonedCard, documentClone);
          clonedCard.style.color = 'rgb(9, 26, 38)';
          clonedCard.style.backgroundColor = 'rgb(255, 255, 255)';
          clonedCard.style.borderColor = 'rgb(226, 232, 240)';
          clonedCard.style.boxShadow = options?.printClean
            ? 'none'
            : '0 25px 50px -12px rgba(15, 23, 42, 0.25)';
          clonedCard.querySelectorAll<HTMLElement>('*').forEach((node) => {
            const style = node.getAttribute('style');
            if (hasUnsupportedColorFunction(style)) {
              node.removeAttribute('style');
            }
            const computed = documentClone.defaultView?.getComputedStyle(node);
            if (!computed) return;
            const safeColorProperties: Array<keyof CSSStyleDeclaration> = [
              'color',
              'backgroundColor',
              'borderTopColor',
              'borderRightColor',
              'borderBottomColor',
              'borderLeftColor',
              'outlineColor',
              'textDecorationColor',
            ];
            safeColorProperties.forEach((property) => {
              const value = String(computed[property] || '');
              if (!hasUnsupportedColorFunction(value)) return;
              if (property === 'backgroundColor') {
                node.style.backgroundColor = 'rgba(255, 255, 255, 0)';
              } else if (String(property).includes('border') || property === 'outlineColor') {
                node.style.setProperty(String(property).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`), 'rgba(226, 232, 240, 1)');
              } else {
                node.style.color = 'rgb(9, 26, 38)';
              }
            });
            if (hasUnsupportedColorFunction(computed.boxShadow)) {
              node.style.boxShadow = '0 10px 15px -3px rgba(15, 23, 42, 0.16)';
            }
          });
          clonedCard
            .querySelectorAll<HTMLElement>('[class*="text-primary"], [class*="text-\\[\\#FE065C\\]"]')
            .forEach((node) => {
              node.style.color = 'rgb(254, 6, 92)';
            });
          clonedCard
            .querySelectorAll<HTMLElement>('[class*="text-\\[\\#0BB8FC\\]"]')
            .forEach((node) => {
              node.style.color = 'rgb(11, 184, 252)';
            });
          clonedCard
            .querySelectorAll<HTMLElement>('[class*="bg-\\[\\#CFF4FF\\]"]')
            .forEach((node) => {
              node.style.backgroundColor = 'rgb(207, 244, 255)';
            });
          clonedCard
            .querySelectorAll<HTMLElement>('[class*="bg-\\[\\#FFD8E8\\]"]')
            .forEach((node) => {
              node.style.backgroundColor = 'rgb(255, 216, 232)';
            });
          clonedCard
            .querySelectorAll<HTMLElement>('[class*="border-\\[\\#0BB8FC\\]"]')
            .forEach((node) => {
              node.style.borderColor = 'rgb(11, 184, 252)';
            });
          }
        if (!options?.printClean) return;
        clonedCard?.classList.remove('shadow-2xl', 'ring-1', 'ring-slate-200');
        clonedCard?.classList.add('shadow-none', 'ring-0');
      },
    });
    return canvas.toDataURL('image/png');
  } finally {
    element.removeAttribute('data-card-capture');
    element.removeAttribute('data-pdf-capture');
    document.body.style.color = originalBodyColor;
    document.body.style.backgroundColor = originalBodyBackground;
  }
}

function drawDoctyWatermark(
  document: any,
  GState: any,
  centerX: number,
  centerY: number,
  scale: number,
  opacity: number
) {
  document.setGState(new GState({ opacity }));
  document.setFillColor(254, 6, 92);
  document.roundedRect(centerX - 3 * scale, centerY - 12 * scale, 6 * scale, 12 * scale, 3 * scale, 3 * scale, 'F');
  document.roundedRect(centerX - 3 * scale, centerY, 6 * scale, 12 * scale, 3 * scale, 3 * scale, 'F');
  document.setFillColor(11, 184, 252);
  document.roundedRect(centerX - 12 * scale, centerY - 3 * scale, 12 * scale, 6 * scale, 3 * scale, 3 * scale, 'F');
  document.roundedRect(centerX, centerY - 3 * scale, 12 * scale, 6 * scale, 3 * scale, 3 * scale, 'F');
  document.setFillColor(255, 255, 255);
  document.rect(centerX - 4 * scale, centerY - 7 * scale, 8 * scale, 14 * scale, 'F');
  document.rect(centerX - 7 * scale, centerY - 4 * scale, 14 * scale, 8 * scale, 'F');
  document.setGState(new GState({ opacity: 1 }));
}

function loadCanvasImage(src?: string): Promise<HTMLImageElement | undefined> {
  if (!src) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = src;
  });
}

function drawCanvasRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function drawCanvasCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.save();
  if (radius > 0) {
    drawCanvasRoundRect(context, x, y, width, height, radius);
    context.clip();
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

async function renderSubscriptionCardImage(profile: PatientProfile, side: 'front' | 'back' = 'front') {
  await document.fonts?.ready.catch(() => undefined);
  const width = 1250;
  const height = 788;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the card image.');

  const profilePictureDataUrl = await imageUrlToDataUrl(profile.imageUrl).catch(() => undefined);
  const safeProfileImageSource =
    profilePictureDataUrl ||
    (profile.imageUrl?.startsWith('data:') ||
    profile.imageUrl?.startsWith('/') ||
    profile.imageUrl?.startsWith(window.location.origin)
      ? profile.imageUrl
      : undefined);
  const [logo, logoMark, profilePicture] = await Promise.all([
    loadCanvasImage('/docty-logo-full.png'),
    loadCanvasImage('/docty-logo-mark.png'),
    loadCanvasImage(safeProfileImageSource),
  ]);
  const memberId = subscriptionMemberId(profile);
  const planName =
    SUBSCRIPTION_PLAN_NAMES[profile.subscription?.planCode || ''] ||
    profile.subscription?.planCode ||
    'Subscription';

  context.clearRect(0, 0, width, height);
  drawCanvasRoundRect(context, 0, 0, width, height, 78);
  context.clip();

  const backgroundGradient = context.createLinearGradient(0, 0, width, height);
  backgroundGradient.addColorStop(0, '#FFFFFF');
  backgroundGradient.addColorStop(0.58, '#FFFFFF');
  backgroundGradient.addColorStop(1, '#FFF4F8');
  context.fillStyle = backgroundGradient;
  context.fillRect(0, 0, width, height);

  const blueGlow = context.createRadialGradient(105, 690, 10, 105, 690, 210);
  blueGlow.addColorStop(0, 'rgba(11, 184, 252, 0.18)');
  blueGlow.addColorStop(1, 'rgba(11, 184, 252, 0)');
  context.fillStyle = blueGlow;
  context.fillRect(0, 420, 360, 368);

  const pinkGlow = context.createRadialGradient(1040, 120, 10, 1040, 120, 270);
  pinkGlow.addColorStop(0, 'rgba(254, 6, 92, 0.13)');
  pinkGlow.addColorStop(1, 'rgba(254, 6, 92, 0)');
  context.fillStyle = pinkGlow;
  context.fillRect(760, 0, 490, 400);

  if (logoMark) {
    context.save();
    context.globalAlpha = 0.2;
    context.drawImage(logoMark, -72, 96, 650, 650);
    context.restore();
  }

  if (side === 'back') {
    const QRCode = await import('qrcode');
    const qrCode = await QRCode.toDataURL(`https://doctyclinics.com/membership/${memberId}`, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 420,
      color: {
        dark: '#091A26',
        light: '#FFFFFF',
      },
    });
    const qrImage = await loadCanvasImage(qrCode);

    context.save();
    context.globalAlpha = 0.18;
    for (let x = 55; x < width - 40; x += 64) {
      for (let y = 55; y < height - 45; y += 64) {
        context.strokeStyle = '#0BB8FC';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x - 8, y);
        context.lineTo(x + 8, y);
        context.moveTo(x, y - 8);
        context.lineTo(x, y + 8);
        context.stroke();
      }
    }
    context.restore();

    context.textAlign = 'left';
    context.fillStyle = '#0BB8FC';
    context.font = '900 58px Poppins, Segoe UI, sans-serif';
    context.fillText('ACCESS YOUR', 60, 145);
    context.fillStyle = '#FE065C';
    context.fillText('MEMBERSHIP BENEFITS', 60, 220);
    context.fillStyle = '#091A26';
    context.font = '900 42px Poppins, Segoe UI, sans-serif';
    context.fillText('AT ANY DOCTY CLINICS', 60, 282);
    context.fillStyle = '#64748B';
    context.font = '700 18px Poppins, Segoe UI, sans-serif';
    context.fillText(memberId, 62, 318);

    context.fillStyle = '#FFFFFF';
    drawCanvasRoundRect(context, 72, 355, 220, 220, 18);
    context.fill();
    if (qrImage) context.drawImage(qrImage, 90, 373, 184, 184);

    context.strokeStyle = '#CBD5E1';
    context.lineWidth = 3;
    drawCanvasRoundRect(context, 720, 300, 430, 92, 10);
    context.stroke();
    context.fillStyle = '#091A26';
    context.font = '800 24px Poppins, Segoe UI, sans-serif';
    context.fillText('Authorized Signature:', 720, 440);

    context.fillStyle = '#0BB8FC';
    context.font = '900 26px Poppins, Segoe UI, sans-serif';
    context.fillText('Phone:', 720, 505);
    context.fillStyle = '#091A26';
    context.font = '500 26px Poppins, Segoe UI, sans-serif';
    context.fillText('9989804888', 820, 505);
    context.fillStyle = '#FE065C';
    context.font = '900 26px Poppins, Segoe UI, sans-serif';
    context.fillText('Email:', 720, 555);
    context.fillStyle = '#091A26';
    context.font = '500 26px Poppins, Segoe UI, sans-serif';
    context.fillText('care@doctyclinics.com', 810, 555);
    context.fillStyle = '#0BB8FC';
    context.font = '900 27px Poppins, Segoe UI, sans-serif';
    context.fillText('www.doctyclinics.com', 720, 605);

    if (logoMark) {
      context.drawImage(logoMark, 1050, 590, 112, 112);
    }
    context.fillStyle = '#475569';
    context.font = '500 18px Poppins, Segoe UI, sans-serif';
    context.fillText(
      'This card is non-transferable and remains the property of Docty Clinics. Terms and conditions apply.',
      60,
      720
    );
    return canvas.toDataURL('image/png');
  }

  if (logo) {
    context.drawImage(logo, 55, 52, 470, 81);
  }

  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.font = '900 32px Poppins, Segoe UI, sans-serif';
  const totalCareTitleX = 850;
  context.fillStyle = '#0BB8FC';
  context.fillText('DOCTY.', totalCareTitleX, 113);
  const doctyTitleWidth = context.measureText('DOCTY.').width;
  context.fillStyle = '#FE065C';
  context.fillText('TOTALCARE', totalCareTitleX + doctyTitleWidth - 1, 113);
  const totalCareTitleRight =
    totalCareTitleX +
    doctyTitleWidth -
    1 +
    context.measureText('TOTALCARE').width;
  context.fillStyle = '#091A26';
  context.font = '900 30px Poppins, Segoe UI, sans-serif';
  context.textAlign = 'right';
  context.fillText('CARD', totalCareTitleRight, 150);

  context.fillStyle = '#0BB8FC';
  drawCanvasRoundRect(context, 55, 235, 305, 305, 50);
  context.fill();
  context.fillStyle = '#DEF7FF';
  drawCanvasRoundRect(context, 67, 247, 281, 281, 42);
  context.fill();
  if (profilePicture) {
    drawCanvasCoverImage(context, profilePicture, 76, 256, 263, 263, 36);
  } else {
    context.fillStyle = '#FE065C';
    context.font = '900 76px Poppins, Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.fillText(profile.initials, 207, 425);
  }

  context.textAlign = 'left';
  context.fillStyle = '#CFF4FF';
  drawCanvasRoundRect(context, 455, 210, 300, 72, 18);
  context.fill();
  context.fillStyle = '#0BB8FC';
  context.font = '900 31px Poppins, Segoe UI, sans-serif';
  context.fillText('PATIENT NAME:', 485, 258);

  context.fillStyle = '#091A26';
  context.font = '900 58px Poppins, Segoe UI, sans-serif';
  context.fillText(profile.name.slice(0, 22), 455, 380);

  context.fillStyle = '#FFD8E8';
  drawCanvasRoundRect(context, 455, 445, 345, 72, 18);
  context.fill();
  context.fillStyle = '#FE065C';
  context.font = '900 31px Poppins, Segoe UI, sans-serif';
  context.fillText('MEMBERSHIP TIER:', 485, 493);

  context.fillStyle = '#091A26';
  context.font = '900 44px Poppins, Segoe UI, sans-serif';
  context.fillText(planName.toUpperCase().slice(0, 18), 455, 610);

  const chips = [
    {
      x: 55,
      width: 360,
      label: 'SUBSCRIBER ID:',
      value: memberId,
      background: '#CFF4FF',
      color: '#0BB8FC',
    },
    {
      x: 455,
      width: 345,
      label: 'VALID FROM:',
      value: formatSubscriptionDate(profile.subscription?.startDate),
      background: '#FFD8E8',
      color: '#FE065C',
    },
    {
      x: 870,
      width: 325,
      label: 'VALID TO:',
      value: formatSubscriptionDate(profile.subscription?.endDate),
      background: '#CFF4FF',
      color: '#0BB8FC',
    },
  ];
  chips.forEach((chip) => {
    context.fillStyle = chip.background;
    drawCanvasRoundRect(context, chip.x, 650, chip.width, 72, 18);
    context.fill();
    context.fillStyle = chip.color;
    context.font = '900 30px Poppins, Segoe UI, sans-serif';
    context.fillText(chip.label, chip.x + 25, 697);
    context.fillStyle = '#091A26';
    context.font = '800 30px Poppins, Segoe UI, sans-serif';
    context.fillText(chip.value, chip.x + 25, 770);
  });

  return canvas.toDataURL('image/png');
}

async function generateCardPdf(profile: PatientProfile) {
  const [{ jsPDF }, frontImage, backImage] = await Promise.all([
    import('jspdf'),
    renderSubscriptionCardImage(profile, 'front'),
    renderSubscriptionCardImage(profile, 'back'),
  ]);
  const width = 85.6;
  const height = 53.98;
  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [width, height],
    compress: true,
  });
  document.addImage(frontImage, 'PNG', 0, 0, width, height);
  document.addPage([width, height], 'landscape');
  document.addImage(backImage, 'PNG', 0, 0, width, height);
  return document;
}

function drawPlusPattern(document: any, GState: any, width: number, height: number) {
  document.setGState(new GState({ opacity: 0.16 }));
  document.setDrawColor(11, 184, 252);
  document.setLineWidth(0.18);
  for (let x = 4; x < width - 3; x += 8) {
    for (let y = 4; y < height - 3; y += 8) {
      document.line(x - 0.8, y, x + 0.8, y);
      document.line(x, y - 0.8, x, y + 0.8);
    }
  }
  document.setGState(new GState({ opacity: 1 }));
}

function drawSubtleCardGradient(document: any, GState: any, width: number, height: number) {
  document.setGState(new GState({ opacity: 0.28 }));
  for (let i = 0; i < 28; i += 1) {
    const ratio = i / 27;
    const red = Math.round(255 - ratio * 7);
    const green = Math.round(255 - ratio * 9);
    const blue = 255;
    document.setFillColor(red, green, blue);
    document.rect(1.2, 1.2 + ratio * (height - 2.4), width - 2.4, (height - 2.4) / 27 + 0.2, 'F');
  }
  document.setGState(new GState({ opacity: 0.09 }));
  document.setFillColor(11, 184, 252);
  document.circle(17, 45, 17, 'F');
  document.setFillColor(254, 6, 92);
  document.circle(70, 15, 18, 'F');
  document.setGState(new GState({ opacity: 1 }));
}

function drawPatientCardPreviewBackground(document: any, GState: any, width: number, height: number) {
  document.setFillColor(255, 255, 255);
  document.rect(0, 0, width, height, 'F');
  for (let i = 0; i < 40; i += 1) {
    const ratio = i / 39;
    const red = 255;
    const green = Math.round(255 - ratio * 11);
    const blue = Math.round(255 - ratio * 7);
    document.setFillColor(red, green, blue);
    document.rect(
      1.2 + ratio * (width - 2.4),
      1.2,
      (width - 2.4) / 39 + 0.3,
      height - 2.4,
      'F'
    );
  }
  document.setGState(new GState({ opacity: 0.36 }));
  document.setFillColor(240, 251, 255);
  document.circle(10, 45, 8, 'F');
  document.setFillColor(255, 244, 248);
  document.circle(74, 12, 13, 'F');
  document.setGState(new GState({ opacity: 1 }));
}

async function downloadSubscriptionCard(profile: PatientProfile, frontCardElement?: HTMLElement | null) {
  if (!profile.subscription?.subscriber) return;

  const [{ jsPDF, GState }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
  ]);
  const width = 85.6;
  const height = 53.98;
  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [width, height],
    compress: true,
  });
  const planName =
    SUBSCRIPTION_PLAN_NAMES[profile.subscription.planCode || ''] ||
    profile.subscription.planCode ||
    'Docty Subscription';
  const memberId = subscriptionMemberId(profile);
  const previewFront = await renderCardPreviewToDataUrl(frontCardElement, { printClean: true }).catch(() => undefined);
  const [profilePicture, logo, logoMark, qrCode] = await Promise.all([
    imageUrlToDataUrl(profile.imageUrl).catch(() => undefined),
    imageUrlToDataUrl('/docty-logo-full.png').catch(() => undefined),
    imageUrlToDataUrl('/docty-logo-mark.png').catch(() => undefined),
    QRCode.toDataURL('https://doctyclinics.com', {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 360,
      color: {
        dark: '#07324A',
        light: '#FFFFFF',
      },
    }),
  ]);

  // Front
  if (previewFront) {
    document.addImage(previewFront, 'PNG', 0, 0, width, height);
  } else {
    drawPatientCardPreviewBackground(document, GState, width, height);
    if (logoMark) {
      document.setGState(new GState({ opacity: 0.2 }));
      document.addImage(logoMark, 'PNG', -9, 7, 56, 56);
      document.setGState(new GState({ opacity: 1 }));
    } else {
      drawDoctyWatermark(document, GState, 23, 29, 2.15, 0.18);
    }

    if (logo) {
      document.addImage(logo, 'PNG', 5.3, 5.4, 39.2, 6.75);
    } else {
      document.setTextColor(254, 6, 92);
      document.setFont('helvetica', 'bold');
      document.setFontSize(8);
      document.text('Docty.Clinics', 6, 10);
    }

    document.setFont('helvetica', 'bold');
    document.setFontSize(5.3);
    const cardTitleY = 8.9;
    const doctyTitle = 'DOCTY.';
    const totalCareTitle = 'TOTALCARE';
    const titleGap = 0.5;
    const titleStartX =
      80.3 - document.getTextWidth(doctyTitle) - titleGap - document.getTextWidth(totalCareTitle);
    document.setTextColor(11, 184, 252);
    document.text(doctyTitle, titleStartX, cardTitleY);
    document.setTextColor(254, 6, 92);
    document.text(totalCareTitle, titleStartX + document.getTextWidth(doctyTitle) + titleGap, cardTitleY);
    document.setTextColor(9, 26, 38);
    document.setFontSize(5.5);
    document.text('CARD', 80.3, 13.1, { align: 'right' });

    document.setFillColor(11, 184, 252);
    document.roundedRect(5.8, 17.6, 23.4, 23.4, 3.2, 3.2, 'F');
    document.setFillColor(222, 247, 255);
    document.roundedRect(6.6, 18.4, 21.8, 21.8, 2.8, 2.8, 'F');
    if (profilePicture) {
      document.addImage(profilePicture, 'JPEG', 7.2, 19, 20.6, 20.6);
    } else {
      document.setTextColor(254, 6, 92);
      document.setFont('helvetica', 'bold');
      document.setFontSize(15);
      document.text(profile.initials, 17.5, 32, { align: 'center' });
    }

    document.setFillColor(207, 244, 255);
    document.roundedRect(33.2, 16.9, 23.6, 5.2, 1.4, 1.4, 'F');
    document.setTextColor(11, 184, 252);
    document.setFont('helvetica', 'bold');
    document.setFontSize(5.1);
    document.text('PATIENT NAME:', 34.7, 20.4);
    document.setTextColor(9, 26, 38);
    document.setFontSize(12.1);
    document.text(profile.name.slice(0, 22), 33.2, 29.1);

    document.setFillColor(255, 216, 232);
    document.roundedRect(33.2, 34.1, 24.7, 5.2, 1.4, 1.4, 'F');
    document.setTextColor(254, 6, 92);
    document.setFontSize(5.1);
    document.text('MEMBERSHIP TIER:', 34.7, 37.6);
    document.setTextColor(9, 26, 38);
    document.setFontSize(8.7);
    document.text(planName.toUpperCase().slice(0, 18), 33.2, 44.3);

    const chipY = 45.1;
    const valueY = 52.25;
    const chipHeight = 5.3;
    const chipLabelY = chipY + 3.45;
    const chipColumns = [
      { x: 5.6, width: 24.6, label: 'SUBSCRIBER ID:', color: 'blue' },
      { x: 33.2, width: 22.3, label: 'VALID FROM:', color: 'pink' },
      { x: 58.4, width: 22.0, label: 'VALID TO:', color: 'blue' },
    ];
    chipColumns.forEach((chip) => {
      if (chip.color === 'pink') {
        document.setFillColor(255, 216, 232);
      } else {
        document.setFillColor(207, 244, 255);
      }
      document.roundedRect(chip.x, chipY, chip.width, chipHeight, 1, 1, 'F');
    });
    document.setFillColor(207, 244, 255);
    document.setFontSize(5);
    chipColumns.forEach((chip) => {
      if (chip.color === 'pink') {
        document.setTextColor(254, 6, 92);
      } else {
        document.setTextColor(11, 184, 252);
      }
      document.text(chip.label, chip.x + 1.7, chipLabelY);
    });
    document.setTextColor(9, 26, 38);
    document.setFontSize(6);
    document.text(memberId, 5.6 + 1.7, valueY);
    document.text(formatSubscriptionDate(profile.subscription.startDate), 33.2 + 1.7, valueY);
    document.text(formatSubscriptionDate(profile.subscription.endDate), 58.4 + 1.7, valueY);
    if (logoMark) {
      document.addImage(logoMark, 'PNG', 70.7, 40.2, 7.4, 7.4);
    } else {
      drawDoctyWatermark(document, GState, 74.4, 43.9, 0.25, 1);
    }
  }
  // Back
  document.addPage([width, height], 'landscape');
  document.setFillColor(255, 255, 255);
  document.rect(0, 0, width, height, 'F');
  document.setFillColor(255, 255, 255);
  document.roundedRect(1.2, 1.2, width - 2.4, height - 2.4, 4, 4, 'F');
  drawSubtleCardGradient(document, GState, width, height);
  document.setTextColor(11, 184, 252);
  document.setFont('helvetica', 'bold');
  document.setFontSize(6.8);
  const accessX = 5.5;
  document.text('ACCESS YOUR', accessX, 10.5);
  document.setTextColor(254, 6, 92);
  const membershipX = accessX + document.getTextWidth('ACCESS YOUR') + 1.4;
  document.text('MEMBERSHIP', membershipX, 10.5);
  document.setTextColor(9, 26, 38);
  const benefitsX = membershipX + document.getTextWidth('MEMBERSHIP') + 1.4;
  document.text('BENEFITS', benefitsX, 10.5);
  document.setTextColor(11, 184, 252);
  document.setFontSize(5.1);
  document.text('AT ANY DOCTY CLINICS', 5.5, 16.4);
  document.setFontSize(3.2);
  document.setFont('helvetica', 'normal');
  document.setTextColor(9, 26, 38);
  document.text(memberId, 17.6, 47.6, { align: 'center' });

  document.addImage(qrCode, 'PNG', 8.2, 24, 18.8, 18.8);
  document.setTextColor(9, 26, 38);
  document.setFont('helvetica', 'bold');
  document.setFontSize(3.6);
  document.text('Scan to verify', 17.6, 45.6, { align: 'center' });

  document.setDrawColor(204, 210, 216);
  document.setLineWidth(0.35);
  document.roundedRect(49, 22, 31, 8, 1, 1, 'S');
  document.setTextColor(9, 26, 38);
  document.setFont('helvetica', 'bold');
  document.setFontSize(4.1);
  document.text('Authorized Signature:', 49, 34);

  document.setFont('helvetica', 'bold');
  document.setFontSize(4.5);
  document.setTextColor(11, 184, 252);
  document.text('Phone:', 49, 39.5);
  document.setTextColor(9, 26, 38);
  document.setFont('helvetica', 'normal');
  document.text('9989804888', 58, 39.5);
  document.setFont('helvetica', 'bold');
  document.setTextColor(254, 6, 92);
  document.text('Email:', 49, 44);
  document.setTextColor(9, 26, 38);
  document.setFont('helvetica', 'normal');
  document.text('care@doctyclinics.com', 58, 44);
  document.setFont('helvetica', 'bold');
  document.setTextColor(11, 184, 252);
  document.text('www.doctyclinics.com', 49, 48.5);
  if (logoMark) {
    document.addImage(logoMark, 'PNG', 75, 43.5, 7.5, 7.5);
  } else {
    drawDoctyWatermark(document, GState, 79, 47, 0.26, 1);
  }

  document.setTextColor(74, 90, 104);
  document.setFont('helvetica', 'normal');
  document.setFontSize(3.4);
  const footerLines = document.splitTextToSize(
    'This card is non-transferable and remains the property of Docty Clinics. Terms and conditions apply.',
    38
  );
  document.text(footerLines, 5.5, 49);

  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.save(`docty-membership-card-${safeName || profile.id}.pdf`);
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
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size
  );
  return canvas.toDataURL('image/jpeg', 0.78);
}

function appointmentDate(epochSeconds: number) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(epochSeconds * 1000));
}

function appointmentTime(epochSeconds: number) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(epochSeconds * 1000));
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rescheduleDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}

function slotTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function AccessShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100svh-4rem)] bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 pb-16 pt-28">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}

export default function PatientPortalPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const subscriptionCardRef = useRef<HTMLDivElement | null>(null);
  const { refreshSession, logout: logoutSharedSession } = usePatientSession();
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo =
    requestedReturnTo?.startsWith('/') && !requestedReturnTo.startsWith('//')
      ? requestedReturnTo
      : '';
  const isAddingFamilyMember = searchParams.get('view') === 'register';
  const isEditingProfile = searchParams.get('view') === 'edit';
  const [step, setStep] = useState<PortalStep>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isListeningForOtp, setIsListeningForOtp] = useState(false);
  const [otpListenerAttempt, setOtpListenerAttempt] = useState(0);
  const [hasAcceptedPatientConsent, setHasAcceptedPatientConsent] = useState(false);
  const [registrationName, setRegistrationName] = useState('');
  const [registrationAge, setRegistrationAge] = useState('');
  const [registrationGender, setRegistrationGender] = useState('');
  const [registrationRelationship, setRegistrationRelationship] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [hasAcceptedProfileConsent, setHasAcceptedProfileConsent] = useState(false);
  const [relationshipDrafts, setRelationshipDrafts] = useState<Record<string, string>>({});
  const [isSavingRelationships, setIsSavingRelationships] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [isDownloadingCardPdf, setIsDownloadingCardPdf] = useState(false);
  const [isSharingCard, setIsSharingCard] = useState(false);
  const [subscriptionCardSide, setSubscriptionCardSide] = useState<'front' | 'back'>('front');
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [pharmacyPurchases, setPharmacyPurchases] = useState<PharmacyPurchase[]>([]);
  const [isLoadingPharmacyPurchases, setIsLoadingPharmacyPurchases] = useState(false);
  const [pharmacyPurchasesMessage, setPharmacyPurchasesMessage] = useState('');
  const [activePharmacyInvoiceAction, setActivePharmacyInvoiceAction] = useState('');
  const [loadedPharmacyProfileId, setLoadedPharmacyProfileId] = useState('');
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<PatientAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<RescheduleSlot[]>([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<RescheduleSlot | null>(null);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const upcomingAppointments = appointments.filter(
    (appointment) => appointment.startTime * 1000 > Date.now() && !appointment.status.startsWith('CN')
  );
  const pastAppointments = appointments.filter(
    (appointment) => !upcomingAppointments.some((upcoming) => upcoming.id === appointment.id)
  );
  const sortedPharmacyPurchases = [...pharmacyPurchases].sort(
    (first, second) => pharmacyOrderTimestamp(second) - pharmacyOrderTimestamp(first)
  );
  const modificationDates = rescheduleDateOptions();

  const uploadProfilePhoto = async (file?: File) => {
    if (!file || !selectedProfile) return;
    setIsUploadingPhoto(true);
    try {
      const imageUrl = await resizeProfileImage(file);
      const response = await fetch('/api/patient-profile-photo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: selectedProfile.accessToken,
          imageUrl,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to update the profile picture.');
      }
      setProfiles((current) =>
        current.map((profile) =>
          profile.id === selectedProfile.id
            ? { ...profile, imageUrl: body.imageUrl }
            : profile
        )
      );
      await refreshSession();
      toast.success('Profile picture updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const cardBaseFilename = () => {
    const safeName = (selectedProfile?.name || 'patient')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `docty-membership-card-${safeName || 'patient'}`;
  };

  const cardImageFilename = () => {
    return `${cardBaseFilename()}-${subscriptionCardSide}.png`;
  };

  const downloadCardPdf = async () => {
    if (!selectedProfile) return;
    setIsDownloadingCardPdf(true);
    try {
      const pdfDocument = await generateCardPdf(selectedProfile);
      pdfDocument.save(`${cardBaseFilename()}.pdf`);
      toast.success('Card PDF downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate the card PDF.');
    } finally {
      setIsDownloadingCardPdf(false);
    }
  };

  const downloadCardImage = async () => {
    if (!selectedProfile) return;
    setIsDownloadingCard(true);
    try {
      const imageUrl = await renderSubscriptionCardImage(selectedProfile, subscriptionCardSide);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = cardImageFilename();
      link.click();
      toast.success('Card image downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download the card image.');
    } finally {
      setIsDownloadingCard(false);
    }
  };

  const shareCardImage = async () => {
    if (!selectedProfile) return;
    setIsSharingCard(true);
    try {
      const pdfDocument = await generateCardPdf(selectedProfile);
      const blob = pdfDocument.output('blob');
      const file = new File([blob], `${cardBaseFilename()}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: 'Docty Membership Card',
          text: 'Docty Clinics membership card PDF',
          files: [file],
        });
        return;
      }
      const pdfUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${cardBaseFilename()}.pdf`;
      link.click();
      URL.revokeObjectURL(pdfUrl);
      toast.info('PDF sharing is not supported here, so the card was downloaded instead.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(error instanceof Error ? error.message : 'Unable to share the card PDF.');
    } finally {
      setIsSharingCard(false);
    }
  };

  useEffect(() => {
    if (isEditingProfile && selectedProfile) {
      setEditName(selectedProfile.name);
      setEditAge(ageFromDob(selectedProfile.dob));
      setEditGender(selectedProfile.gender || '');
      setEditRelationship(selectedProfile.relation || 'Self');
      setStep('edit');
    } else if (isAddingFamilyMember) {
      setStep('register');
    } else if (searchParams.get('view') === 'profiles' && profiles.length) {
      setStep('profiles');
    }
  }, [isAddingFamilyMember, isEditingProfile, profiles.length, searchParams, selectedProfile]);

  const clearPatientState = () => {
    setStep('mobile');
    setMobile('');
    setOtp('');
    setProfiles([]);
    setSelectedProfileId('');
    setAppointments([]);
    setPharmacyPurchases([]);
    setPharmacyPurchasesMessage('');
    setLoadedPharmacyProfileId('');
    setSessionExpiresAt(null);
  };

  const logout = async (showMessage = true) => {
    await logoutSharedSession();
    clearPatientState();
    if (showMessage) toast.success('You have been logged out');
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const sessionResponse = await fetch('/api/patient-session', {
          headers: { Accept: 'application/json' },
        });
        if (sessionResponse.status === 401) return;

        const sessionBody = await sessionResponse.json().catch(() => null);
        if (!sessionResponse.ok || !sessionBody?.authenticated) return;

        const patientsResponse = await fetch('/api/patients', {
          headers: { Accept: 'application/json' },
        });
        const patientsBody = await patientsResponse.json().catch(() => null);
        if (!patientsResponse.ok) {
          if (isNoProfileResponse(patientsBody)) {
            setProfiles([]);
            setSelectedProfileId('');
            setSessionExpiresAt(sessionBody.expiresAt || null);
            setStep('register');
            return;
          }
          throw new Error(patientsBody?.message || 'Unable to restore patient profiles.');
        }

        const patientProfiles = mapPatientProfiles(patientsBody?.profiles);
        if (cancelled) return;

        setProfiles(patientProfiles);
        setSessionExpiresAt(sessionBody.expiresAt || null);

        const restoredProfile = patientProfiles.find(
          (profile) => profile.id === sessionBody.patientId
        );
        setSelectedProfileId(restoredProfile?.id || patientProfiles[0]?.id || '');

        if (!patientProfiles.length || isAddingFamilyMember) {
          setStep('register');
          return;
        }

        if (isEditingProfile) {
          const profileToEdit = restoredProfile || patientProfiles[0];
          setSelectedProfileId(profileToEdit.id);
          setEditName(profileToEdit.name);
          setEditAge(ageFromDob(profileToEdit.dob));
          setEditGender(profileToEdit.gender || '');
          setEditRelationship(profileToEdit.relation || 'Self');
          setStep('edit');
          return;
        }

        if (
          patientProfiles.length > 1 &&
          patientProfiles.some((profile) => !profile.relation)
        ) {
          setRelationshipDrafts(
            Object.fromEntries(
              patientProfiles
                .filter((profile) => profile.relation)
                .map((profile) => [profile.id, profile.relation as string])
            )
          );
          setStep('relationships');
          return;
        }

        if (!restoredProfile || searchParams.get('view') === 'profiles') {
          setStep('profiles');
          return;
        }

        const appointmentsResponse = await fetch('/api/patient-appointments', {
          headers: { Accept: 'application/json' },
        });
        const appointmentsBody = await appointmentsResponse.json().catch(() => null);
        if (!appointmentsResponse.ok) {
          throw new Error(appointmentsBody?.message || 'Unable to restore appointments.');
        }
        if (cancelled) return;

        const purchases = await loadPharmacyPurchases(
          restoredProfile?.accessToken || patientProfiles[0]?.accessToken
        ).catch(() => []);
        if (cancelled) return;

        setAppointments(appointmentsBody?.appointments || []);
        setPharmacyPurchases(purchases);
        setLoadedPharmacyProfileId(restoredProfile?.id || patientProfiles[0]?.id || '');
        setStep('dashboard');
      } catch (error) {
        if (!cancelled) {
          clearPatientState();
          toast.error(error instanceof Error ? error.message : 'Unable to restore your session.');
        }
      } finally {
        if (!cancelled) setIsRestoringSession(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionExpiresAt) return;

    const remainingMilliseconds = sessionExpiresAt * 1000 - Date.now();
    if (remainingMilliseconds <= 0) {
      void logout(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void logout(false);
      toast.info('Your session ended after 30 minutes. Please sign in again.');
    }, remainingMilliseconds);

    return () => window.clearTimeout(timeout);
  }, [sessionExpiresAt]);

  const sendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setOtp('');
      setOtpListenerAttempt((attempt) => attempt + 1);
      setStep('otp');
      toast.success('OTP sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async (otpCode = otp) => {
    setIsVerifyingOtp(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp: otpCode }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setSessionExpiresAt(body?.expiresAt || Math.floor(Date.now() / 1000) + 60 * 30);
      const patientsResponse = await fetch('/api/patients', {
        headers: { Accept: 'application/json' },
      });
      const patientsBody = await patientsResponse.json().catch(() => null);
      if (!patientsResponse.ok) {
        if (isNoProfileResponse(patientsBody)) {
          setProfiles([]);
          setSelectedProfileId('');
          setStep('register');
          toast.success('Mobile number verified');
          return;
        }
        throw new Error(patientsBody?.message || 'Unable to retrieve patient profiles.');
      }
      const patientProfiles = mapPatientProfiles(patientsBody?.profiles);
      setProfiles(patientProfiles);
      setSelectedProfileId(patientProfiles[0]?.id || '');
      if (
        patientProfiles.length > 1 &&
        patientProfiles.some((profile) => !profile.relation)
      ) {
        setRelationshipDrafts(
          Object.fromEntries(
            patientProfiles
              .filter((profile) => profile.relation)
              .map((profile) => [profile.id, profile.relation as string])
          )
        );
        setStep('relationships');
      } else {
        setStep(patientProfiles.length ? 'profiles' : 'register');
      }
      await refreshSession();
      toast.success('Mobile number verified');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    if (step !== 'otp' || typeof window === 'undefined' || !('OTPCredential' in window)) {
      setIsListeningForOtp(false);
      return;
    }

    const abortController = new AbortController();
    setIsListeningForOtp(true);

    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: abortController.signal,
      })
      .then((credential) => {
        const code = (credential as OTPCredential | null)?.code?.replace(/\D/g, '').slice(0, 4);
        if (code?.length !== 4) return;
        setOtp(code);
        window.setTimeout(() => void verifyOtp(code), 150);
      })
      .catch(() => {
        // Manual OTP entry remains available when WebOTP is declined or unavailable.
      })
      .finally(() => setIsListeningForOtp(false));

    return () => abortController.abort();
  }, [step, otpListenerAttempt, mobile]);

  const openPatientDashboard = async () => {
    if (!selectedProfile) return;
    setIsLoadingAppointments(true);
    setIsLoadingPharmacyPurchases(true);
    try {
      const selectionResponse = await fetch('/api/patient-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: selectedProfile.accessToken }),
      });
      const selectionBody = await selectionResponse.json().catch(() => null);
      if (!selectionResponse.ok) {
        throw new Error(selectionBody?.message || 'Unable to select patient.');
      }

      const appointmentsResponse = await fetch('/api/patient-appointments', {
        headers: { Accept: 'application/json' },
      });
      const appointmentsBody = await appointmentsResponse.json().catch(() => null);
      if (!appointmentsResponse.ok) {
        throw new Error(appointmentsBody?.message || 'Unable to retrieve appointments.');
      }

      const purchases = await loadPharmacyPurchases(selectedProfile.accessToken).catch(() => []);
      setAppointments(appointmentsBody?.appointments || []);
      setPharmacyPurchases(purchases);
      setLoadedPharmacyProfileId(selectedProfile.id);
      await refreshSession();
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        setStep('dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to retrieve appointments.');
    } finally {
      setIsLoadingAppointments(false);
      setIsLoadingPharmacyPurchases(false);
    }
  };

  const loadPharmacyPurchases = async (accessToken?: string) => {
    const { startDate, endDate } = lastOneYearRange();
    const query = new URLSearchParams({
      startDate,
      endDate,
      ...(accessToken ? { accessToken } : {}),
    });
    const response = await fetch(`/api/pharmacy/order-history?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.message || 'Unable to retrieve pharmacy purchases.');
    }

    setPharmacyPurchasesMessage(body?.message || '');
    return Array.isArray(body?.orders) ? body.orders : [];
  };

  const fetchPharmacyInvoice = async (
    order: PharmacyPurchase,
    disposition: 'inline' | 'attachment'
  ) => {
    const orderId = pharmacyOrderIdentifier(order);
    if (!orderId || !selectedProfile) {
      throw new Error('Invoice is not available for this order.');
    }

    const response = await fetch('/api/pharmacy/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
      body: JSON.stringify({
        orderId,
        accessToken: selectedProfile.accessToken,
        patientName: selectedProfile.name,
        disposition,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || 'Unable to generate pharmacy invoice.');
    }

    return response.blob();
  };

  const viewPharmacyInvoice = async (order: PharmacyPurchase) => {
    const orderId = pharmacyOrderIdentifier(order);
    setActivePharmacyInvoiceAction(`view-${orderId}`);
    try {
      const blob = await fetchPharmacyInvoice(order, 'inline');
      const invoiceUrl = URL.createObjectURL(blob);
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(invoiceUrl), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open pharmacy invoice.');
    } finally {
      setActivePharmacyInvoiceAction('');
    }
  };

  const downloadPharmacyInvoice = async (order: PharmacyPurchase) => {
    const orderId = pharmacyOrderIdentifier(order);
    setActivePharmacyInvoiceAction(`download-${orderId}`);
    try {
      const blob = await fetchPharmacyInvoice(order, 'attachment');
      const invoiceUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = invoiceUrl;
      link.download = `${pharmacyBillNo(order).replace(/[^a-z0-9._-]+/gi, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(invoiceUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download pharmacy invoice.');
    } finally {
      setActivePharmacyInvoiceAction('');
    }
  };

  const sharePharmacyInvoiceOnWhatsApp = async (order: PharmacyPurchase) => {
    const orderId = pharmacyOrderIdentifier(order);
    if (!selectedProfile) return;
    setActivePharmacyInvoiceAction(`share-${orderId}`);
    try {
      const response = await fetch('/api/pharmacy/share-invoice-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          orderId,
          accessToken: selectedProfile.accessToken,
          patientName: selectedProfile.name,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to send pharmacy invoice on WhatsApp.');
      }
      toast.success('Pharmacy invoice sent on WhatsApp.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send pharmacy invoice on WhatsApp.');
    } finally {
      setActivePharmacyInvoiceAction('');
    }
  };

  useEffect(() => {
    if (
      step !== 'dashboard' ||
      !selectedProfile ||
      isLoadingPharmacyPurchases ||
      loadedPharmacyProfileId === selectedProfile.id
    ) {
      return;
    }

    let cancelled = false;
    setIsLoadingPharmacyPurchases(true);
    loadPharmacyPurchases(selectedProfile.accessToken)
      .then((orders) => {
        if (cancelled) return;
        setPharmacyPurchases(orders);
        setLoadedPharmacyProfileId(selectedProfile.id);
      })
      .catch((error) => {
        if (!cancelled) {
          setPharmacyPurchases([]);
          setPharmacyPurchasesMessage(
            error instanceof Error ? error.message : 'Unable to retrieve pharmacy purchases.'
          );
          setLoadedPharmacyProfileId(selectedProfile.id);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPharmacyPurchases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoadingPharmacyPurchases, loadedPharmacyProfileId, selectedProfile, step]);

  const refreshAppointments = async () => {
    const appointmentsResponse = await fetch('/api/patient-appointments', {
      headers: { Accept: 'application/json' },
    });
    const appointmentsBody = await appointmentsResponse.json().catch(() => null);
    if (!appointmentsResponse.ok) {
      throw new Error(appointmentsBody?.message || 'Unable to retrieve appointments.');
    }
    setAppointments(appointmentsBody?.appointments || []);
  };

  const loadRescheduleSlots = async (
    appointment: PatientAppointment,
    selectedDate: string
  ) => {
    setRescheduleDate(selectedDate);
    setSelectedRescheduleSlot(null);
    setIsLoadingRescheduleSlots(true);
    try {
      const query = new URLSearchParams({
        appointmentId: appointment.id,
        date: selectedDate,
      });
      const response = await fetch(`/api/patient-appointment-slots?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to retrieve appointment slots.');
      }
      setRescheduleSlots(body?.slots || []);
    } catch (error) {
      setRescheduleSlots([]);
      toast.error(error instanceof Error ? error.message : 'Unable to retrieve appointment slots.');
    } finally {
      setIsLoadingRescheduleSlots(false);
    }
  };

  const openAppointmentModification = (appointment: PatientAppointment) => {
    const initialDate = dateKey(new Date());
    setEditingAppointment(appointment);
    setRescheduleSlots([]);
    setSelectedRescheduleSlot(null);
    void loadRescheduleSlots(appointment, initialDate);
  };

  const rescheduleAppointment = async () => {
    if (!editingAppointment || !selectedRescheduleSlot) return;
    setIsRescheduling(true);
    try {
      const response = await fetch('/api/patient-appointment-reschedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: editingAppointment.id,
          start: selectedRescheduleSlot.start,
          end: selectedRescheduleSlot.end,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to modify the appointment.');
      }

      await refreshAppointments();
      setEditingAppointment(null);
      toast.success('Appointment rescheduled successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to modify the appointment.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const registerPatient = async () => {
    setIsRegistering(true);
    try {
      const response = await fetch('/api/patient-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registrationName,
          age: Number(registrationAge),
          gender: registrationGender,
          relationship: registrationRelationship,
          isFamilyMember: isAddingFamilyMember,
          email: registrationEmail,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to register patient.');
      }

      const profile = mapPatientProfiles([body.profile])[0];
      setProfiles((currentProfiles) => [
        ...currentProfiles.filter((item) => item.id !== profile.id),
        profile,
      ]);
      setSelectedProfileId(profile.id);
      await refreshSession();

      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }

      const appointmentsResponse = await fetch('/api/patient-appointments', {
        headers: { Accept: 'application/json' },
      });
      const appointmentsBody = await appointmentsResponse.json().catch(() => null);
      setAppointments(appointmentsResponse.ok ? appointmentsBody?.appointments || [] : []);
      setStep('dashboard');
      toast.success('Patient registered successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to register patient.');
    } finally {
      setIsRegistering(false);
    }
  };

  const saveRelationships = async () => {
    const profilesToUpdate = profiles.filter((profile) => !profile.relation);
    if (profilesToUpdate.some((profile) => !relationshipDrafts[profile.id])) {
      toast.error('Select a relationship for each patient.');
      return;
    }

    setIsSavingRelationships(true);
    try {
      await Promise.all(
        profilesToUpdate.map(async (profile) => {
          const response = await fetch('/api/patient-relationship', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: profile.accessToken,
              relationship: relationshipDrafts[profile.id],
            }),
          });
          const body = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(body?.message || `Unable to update ${profile.name}.`);
          }
        })
      );

      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) => ({
          ...profile,
          relation: profile.relation || relationshipDrafts[profile.id],
        }))
      );
      await refreshSession();
      setStep('profiles');
      toast.success('Relationships updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update relationships.');
    } finally {
      setIsSavingRelationships(false);
    }
  };

  const saveProfile = async () => {
    if (!selectedProfile) return;
    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/patient-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: selectedProfile.accessToken,
          name: editName,
          age: Number(editAge),
          gender: editGender,
          relationship: editRelationship,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to update patient profile.');
      }

      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === selectedProfile.id
            ? {
                ...profile,
                ...body.profile,
                initials: profileInitials(body.profile.name),
              }
            : profile
        )
      );
      await refreshSession();
      toast.success('Profile updated successfully');

      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        setStep('dashboard');
        navigate('/patient', { replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update patient profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isRestoringSession) {
    return (
      <AccessShell>
        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-10 text-center">
            <ShieldCheck className="mx-auto mb-4 h-10 w-10 animate-pulse text-primary" />
            <p className="font-semibold">Restoring your secure session...</p>
          </CardContent>
        </Card>
      </AccessShell>
    );
  }

  if (step === 'mobile') {
    return (
      <AccessShell>
        <Card className="overflow-hidden rounded-3xl border-border shadow-xl">
          <div className="bg-primary px-7 py-8 text-primary-foreground">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Your health, in one place</h1>
            <p className="mt-2 text-primary-foreground/85">
              Securely access appointments, prescriptions, and receipts for your family.
            </p>
          </div>
          <CardContent className="p-7">
            <Badge variant="secondary" className="mb-5 gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5" />
              OTP-secured patient access
            </Badge>
            <Label htmlFor="patient-mobile">Mobile number</Label>
            <div className="mt-2 flex rounded-xl border border-input bg-background shadow-sm">
              <span className="flex items-center border-r px-4 text-sm font-medium text-muted-foreground">+91</span>
              <Input
                id="patient-mobile"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
                placeholder="Enter 10-digit number"
                className="h-12 border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button
              className="mt-5 h-12 w-full rounded-full"
              disabled={mobile.length !== 10 || isSendingOtp || !hasAcceptedPatientConsent}
              onClick={sendOtp}
            >
              {isSendingOtp ? 'Sending OTP...' : 'Send OTP'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-5 flex items-start gap-3">
              <Checkbox
                id="patient-access-consent"
                checked={hasAcceptedPatientConsent}
                onCheckedChange={(checked) => setHasAcceptedPatientConsent(checked === true)}
              />
              <Label htmlFor="patient-access-consent" className="block text-xs font-normal leading-5 text-muted-foreground">
                I authorise OTP verification and retrieval of patient profiles linked to this mobile number, and agree to the{' '}
                <Link to="/consent-notice" className="font-semibold text-primary">Consent Notice</Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="font-semibold text-primary">Privacy Policy</Link>.
              </Label>
            </div>
          </CardContent>
        </Card>
      </AccessShell>
    );
  }

  if (step === 'otp') {
    return (
      <AccessShell>
        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-7">
            <Button variant="ghost" className="-ml-3 mb-5 rounded-full" onClick={() => setStep('mobile')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change number
            </Button>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Phone className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-bold">Verify your number</h1>
            <p className="mt-2 text-muted-foreground">
              Enter the 4-digit OTP sent to +91 ••••••{mobile.slice(-4)}.
            </p>
            <Input
              value={otp}
              onChange={(event) => {
                const code = event.target.value.replace(/\D/g, '').slice(0, 4);
                setOtp(code);
                if (code.length === 4) {
                  window.setTimeout(() => void verifyOtp(code), 120);
                }
              }}
              autoComplete="one-time-code"
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              maxLength={4}
              aria-label="One-time password"
              placeholder="••••"
              className="my-7 h-14 rounded-2xl border-2 border-primary/20 bg-background text-center text-2xl font-black tracking-[0.8em] text-foreground shadow-sm focus-visible:ring-primary"
            />
            {isListeningForOtp && (
              <p className="-mt-3 mb-5 text-center text-xs text-muted-foreground">
                Waiting for the OTP SMS to auto-fill…
              </p>
            )}
            <Button
              className="h-12 w-full rounded-full"
              disabled={otp.length !== 4 || isVerifyingOtp}
              onClick={() => void verifyOtp()}
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
            </Button>
            <button
              className="mt-5 w-full text-sm font-semibold text-primary disabled:opacity-50"
              disabled={isSendingOtp}
              onClick={sendOtp}
            >
              {isSendingOtp ? 'Resending...' : 'Resend OTP'}
            </button>
          </CardContent>
        </Card>
      </AccessShell>
    );
  }

  if (step === 'register') {
    return (
      <AccessShell>
        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-bold">
              {isAddingFamilyMember ? 'Add Family Member' : 'Create Patient Profile'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isAddingFamilyMember
                ? 'Add a family member under your verified mobile number.'
                : `No patient is registered with +91 ••••••${mobile.slice(-4)}. Add the details below to continue.`}
            </p>

            <div className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="registration-name">Patient Name *</Label>
                <Input
                  id="registration-name"
                  value={registrationName}
                  onChange={(event) => setRegistrationName(event.target.value)}
                  placeholder="Enter full name"
                  autoComplete="name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="registration-age">Age *</Label>
                  <Input
                    id="registration-age"
                    value={registrationAge}
                    onChange={(event) =>
                      setRegistrationAge(event.target.value.replace(/\D/g, '').slice(0, 3))
                    }
                    inputMode="numeric"
                    placeholder="Years"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={registrationGender} onValueChange={setRegistrationGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isAddingFamilyMember && (
                <div className="space-y-2">
                  <Label>Relationship *</Label>
                  <Select
                    value={registrationRelationship}
                    onValueChange={setRegistrationRelationship}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'Spouse',
                        'Son',
                        'Daughter',
                        'Father',
                        'Mother',
                        'Brother',
                        'Sister',
                        'Grandfather',
                        'Grandmother',
                        'Grandson',
                        'Granddaughter',
                        'Other Family Member',
                      ].map((relationship) => (
                        <SelectItem key={relationship} value={relationship}>
                          {relationship}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="registration-email">Email (Optional)</Label>
                <Input
                  id="registration-email"
                  value={registrationEmail}
                  onChange={(event) => setRegistrationEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <Checkbox
                id="profile-registration-consent"
                checked={hasAcceptedProfileConsent}
                onCheckedChange={(checked) => setHasAcceptedProfileConsent(checked === true)}
              />
              <Label htmlFor="profile-registration-consent" className="block text-xs font-normal leading-5 text-muted-foreground">
                I confirm that the information is accurate and that I am authorised to create this patient profile under the{' '}
                <Link to="/children-dependants" className="font-semibold text-primary">Children & Dependants Policy</Link>
                {' '}and{' '}
                <Link to="/consent-notice" className="font-semibold text-primary">Consent Notice</Link>.
              </Label>
            </div>

            <Button
              className="mt-6 h-12 w-full rounded-full"
              disabled={
                isRegistering ||
                registrationName.trim().length < 2 ||
                !registrationAge ||
                !registrationGender ||
                (isAddingFamilyMember && !registrationRelationship) ||
                !hasAcceptedProfileConsent
              }
              onClick={registerPatient}
            >
              {isRegistering
                ? 'Creating Profile...'
                : isAddingFamilyMember
                  ? 'Add Family Member'
                  : 'Create Profile & Continue'}
            </Button>
          </CardContent>
        </Card>
      </AccessShell>
    );
  }

  if (step === 'edit' && selectedProfile) {
    const relationshipOptions = [
      'Self',
      'Spouse',
      'Son',
      'Daughter',
      'Father',
      'Mother',
      'Brother',
      'Sister',
      'Grandfather',
      'Grandmother',
      'Grandson',
      'Granddaughter',
      'Other Family Member',
    ];

    return (
      <AccessShell>
        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Pencil className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-bold">Edit Profile</h1>
            <p className="mt-2 text-muted-foreground">
              Update the details for {selectedProfile.name}.
            </p>

            <div className="mt-7 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-profile-name">Patient Name *</Label>
                <Input
                  id="edit-profile-name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Enter full name"
                  autoComplete="name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-profile-age">Age *</Label>
                  <Input
                    id="edit-profile-age"
                    value={editAge}
                    onChange={(event) =>
                      setEditAge(event.target.value.replace(/\D/g, '').slice(0, 3))
                    }
                    inputMode="numeric"
                    placeholder="Years"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select value={editGender} onValueChange={setEditGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Relationship *</Label>
                <Select value={editRelationship} onValueChange={setEditRelationship}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipOptions.map((relationship) => (
                      <SelectItem key={relationship} value={relationship}>
                        {relationship}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="mt-6 h-12 w-full rounded-full"
              disabled={
                isSavingProfile ||
                editName.trim().length < 2 ||
                !editAge ||
                !editGender ||
                !editRelationship
              }
              onClick={saveProfile}
            >
              {isSavingProfile ? 'Saving Profile...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </AccessShell>
    );
  }

  if (step === 'relationships') {
    const relationshipOptions = [
      'Self',
      'Spouse',
      'Son',
      'Daughter',
      'Father',
      'Mother',
      'Brother',
      'Sister',
      'Grandfather',
      'Grandmother',
      'Grandson',
      'Granddaughter',
      'Other Family Member',
    ];
    const missingRelationships = profiles.filter((profile) => !profile.relation);

    return (
      <AccessShell>
        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-bold">Update relationships</h1>
            <p className="mt-2 text-muted-foreground">
              Tell us how these patients are related to you. This helps identify family profiles during booking.
            </p>

            <div className="mt-7 space-y-4">
              {missingRelationships.map((profile) => (
                <div key={profile.id} className="rounded-2xl border bg-card p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 font-bold text-primary">
                        {profile.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        DOB {formatDob(profile.dob)}
                      </p>
                    </div>
                  </div>
                  <Label>Relationship *</Label>
                  <Select
                    value={relationshipDrafts[profile.id] || ''}
                    onValueChange={(relationship) =>
                      setRelationshipDrafts((current) => ({
                        ...current,
                        [profile.id]: relationship,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions.map((relationship) => (
                        <SelectItem key={relationship} value={relationship}>
                          {relationship}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Button
              className="mt-6 h-12 w-full rounded-full"
              disabled={
                isSavingRelationships ||
                missingRelationships.some((profile) => !relationshipDrafts[profile.id])
              }
              onClick={saveRelationships}
            >
              {isSavingRelationships ? 'Saving Relationships...' : 'Save & Continue'}
            </Button>
          </CardContent>
        </Card>
      </AccessShell>
    );
  }

  if (step === 'profiles') {
    return (
      <AccessShell>
        <div className="mb-7">
          <Badge variant="secondary" className="mb-3 gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            Mobile verified
          </Badge>
          <h1 className="text-3xl font-bold">Who are you accessing?</h1>
          <p className="mt-2 text-muted-foreground">
            {profiles.length === 1
              ? 'One patient profile is registered with this mobile number.'
              : `${profiles.length} patient profiles are registered with this mobile number.`}
          </p>
        </div>
        {profiles.length ? (
          <div className="space-y-3">
            {profiles.map((profile) => {
              const selected = selectedProfileId === profile.id;
              return (
                <button
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all ${
                    selected ? 'border-primary ring-2 ring-primary/15' : 'hover:border-primary/40'
                  }`}
                >
                  <Avatar className="h-14 w-14">
                    {profile.imageUrl && (
                      <AvatarImage
                        src={profile.imageUrl}
                        alt={profile.name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 font-bold text-primary">{profile.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{profile.name}</p>
                      {profile.relation && <Badge variant="outline">{profile.relation}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatGender(profile.gender)} · DOB {formatDob(profile.dob)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Patient ID ••••{profile.id.slice(-4)}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 ${selected ? 'border-primary bg-primary ring-4 ring-primary/10' : 'border-muted-foreground/30'}`} />
                </button>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <UserRound className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="font-bold">No patient profiles found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We could not find a Docty patient registered with this verified mobile number.
              </p>
            </CardContent>
          </Card>
        )}
        {selectedProfile && (
          <Button
            className="mt-6 h-12 w-full rounded-full"
            disabled={isLoadingAppointments}
            onClick={openPatientDashboard}
          >
            {isLoadingAppointments
              ? 'Loading appointments...'
              : `Continue as ${selectedProfile.name}`}
          </Button>
        )}
      </AccessShell>
    );
  }

  if (!selectedProfile) return null;

  return (
    <div className="bg-muted/30 pb-16 pt-24">
      <section className="border-b bg-background">
        <div className="container mx-auto flex flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                {selectedProfile.imageUrl && (
                  <AvatarImage
                    src={selectedProfile.imageUrl}
                    alt={selectedProfile.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                  {selectedProfile.initials}
                </AvatarFallback>
              </Avatar>
              <label
                className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90"
                title="Upload profile picture"
                aria-label="Upload profile picture"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={isUploadingPhoto}
                  onChange={(event) => {
                    void uploadProfilePhoto(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{selectedProfile.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => navigate('/patient?view=edit')}
                  aria-label={`Edit ${selectedProfile.name}'s profile`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatGender(selectedProfile.gender)} · DOB {formatDob(selectedProfile.dob)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {profiles.length > 1 ? (
              <Button variant="outline" className="rounded-full" onClick={() => setStep('profiles')}>
                <Users className="mr-2 h-4 w-4" />
                Switch profile
              </Button>
            ) : (
              <Button variant="outline" className="rounded-full" disabled>
                <Users className="mr-2 h-4 w-4" />
                Switch profile
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => navigate('/patient?view=register')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Family Member
            </Button>
            <Button asChild className="hidden rounded-full md:inline-flex">
              <Link to="/book-appointment">
                <Calendar className="mr-2 h-4 w-4" />
                Book appointment
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {selectedProfile.subscription?.subscriber && (
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Crown className="h-5 w-5 flex-shrink-0 text-primary" />
                <h2 className="truncate text-xl font-bold">Your Docty subscription</h2>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={isDownloadingCard || isDownloadingCardPdf || isSharingCard}
                  onClick={() => void downloadCardPdf()}
                  aria-label="Download subscription card PDF"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  disabled={isDownloadingCard || isDownloadingCardPdf || isSharingCard}
                  onClick={() => void shareCardImage()}
                  aria-label="Share subscription card image"
                  title="Share image"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="w-full max-w-[500px]">
              <div
                ref={subscriptionCardRef}
                className="relative aspect-[1.586] overflow-hidden rounded-[24px] bg-white p-4 text-[#091A26] shadow-2xl ring-1 ring-slate-200 sm:p-5"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-[#FFF4F8]" />
                <div className="absolute -bottom-10 left-0 h-24 w-24 rounded-full bg-[#0BB8FC]/10 blur-xl" />
                <div className="absolute -right-10 top-2 h-32 w-32 rounded-full bg-[#FE065C]/10 blur-xl" />
                <button
                  type="button"
                  className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[#091A26] shadow-md ring-1 ring-slate-200 backdrop-blur"
                  onClick={() => setSubscriptionCardSide((side) => (side === 'front' ? 'back' : 'front'))}
                  aria-label={`Show ${subscriptionCardSide === 'front' ? 'back' : 'front'} side of card`}
                  title={`Show ${subscriptionCardSide === 'front' ? 'back' : 'front'} side`}
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                {subscriptionCardSide === 'front' ? (
                  <>
                    <img
                      src="/docty-logo-mark.png"
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-7 top-4 w-64 opacity-20 sm:-left-8 sm:top-2 sm:w-80"
                    />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-center justify-between gap-4 pr-8">
                    <img
                      src="/docty-logo-full.png"
                      alt="Docty Clinics"
                      className="h-7 w-auto sm:h-8"
                    />
                    <div className="text-right text-[10px] font-black uppercase leading-none tracking-wide sm:text-xs">
                      <p>
                        <span className="text-[#0BB8FC]">Docty.</span>
                        <span className="text-[#FE065C]">TotalCare</span>
                      </p>
                      <p className="-mt-0.5 text-[#091A26]">Card</p>
                    </div>
                  </div>

                  <div className="mt-5 flex min-w-0 flex-1 items-center gap-4 sm:mt-6">
                    <Avatar className="h-24 w-24 rounded-[20px] border-[4px] border-[#0BB8FC] bg-[#DEF7FF] shadow-lg sm:h-28 sm:w-28">
                      {selectedProfile.imageUrl && (
                        <AvatarImage
                          src={selectedProfile.imageUrl}
                          alt={selectedProfile.name}
                          className="rounded-2xl object-cover"
                        />
                      )}
                      <AvatarFallback className="rounded-2xl bg-[#DEF7FF] text-xl font-bold text-[#FE065C]">
                        {selectedProfile.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="inline-flex rounded-md bg-[#CFF4FF] px-2 py-1 text-[10px] font-black uppercase text-[#0BB8FC]">Patient name:</p>
                      <p className="mt-0.5 truncate text-xl font-bold tracking-tight sm:text-2xl">{selectedProfile.name}</p>
                      <p className="hidden">
                        Member ID ••••{selectedProfile.id.slice(-4)}
                      </p>
                      <p className="mt-3 inline-flex rounded-md bg-[#FFD8E8] px-2 py-1 text-[10px] font-black uppercase text-[#FE065C]">
                        Membership tier:
                      </p>
                      <div className="mt-1 truncate text-sm font-black uppercase tracking-wide text-[#091A26] sm:text-base">
                        {SUBSCRIPTION_PLAN_NAMES[selectedProfile.subscription.planCode || ''] ||
                          selectedProfile.subscription.planCode ||
                          'Subscription'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                    <div>
                      <p className="flex min-h-7 w-full items-center justify-start rounded-md bg-[#CFF4FF] px-2 text-left font-black uppercase text-[#0BB8FC]">Subscriber ID:</p>
                      <p className="mt-1.5 px-2 font-bold">{subscriptionMemberId(selectedProfile)}</p>
                    </div>
                    <div>
                      <p className="flex min-h-7 w-full items-center justify-start rounded-md bg-[#FFD8E8] px-2 text-left font-black uppercase text-[#FE065C]">Valid from:</p>
                      <p className="mt-1.5 px-2 font-semibold">
                        {formatSubscriptionDate(selectedProfile.subscription.startDate)}
                      </p>
                    </div>
                    <div>
                      <p className="flex min-h-7 w-full items-center justify-start rounded-md bg-[#CFF4FF] px-2 text-left font-black uppercase text-[#0BB8FC]">Valid to:</p>
                      <p className="mt-1.5 px-2 font-semibold">
                        {formatSubscriptionDate(selectedProfile.subscription.endDate)}
                      </p>
                    </div>
                  </div>
                  <img
                    src="/docty-logo-mark.png"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-3 right-4 h-8 w-8 opacity-90"
                  />
                    </div>
                  </>
                ) : (
                  <div className="relative flex h-full flex-col justify-between pr-8">
                    <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
                      <div className="grid h-full grid-cols-6 grid-rows-4">
                        {Array.from({ length: 24 }).map((_, index) => (
                          <span key={index} className="flex items-center justify-center text-xl font-black text-[#0BB8FC]">+</span>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-[18px] font-black uppercase leading-tight tracking-tight sm:text-[28px]">
                        <span className="text-[#0BB8FC]">Access your </span>
                        <span className="text-[#FE065C]">membership benefits</span>
                        <span className="text-[#091A26]"> at any Docty Clinics</span>
                      </div>
                      <p className="mt-1 text-[9px] font-bold text-slate-500 sm:text-xs">
                        {subscriptionMemberId(selectedProfile)}
                      </p>
                    </div>
                    <div className="relative grid grid-cols-[0.82fr_1fr] items-end gap-3 sm:gap-5">
                      <div className="min-w-0">
                        <div className="flex aspect-square w-24 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:w-28">
                          <div className="grid h-full w-full grid-cols-7 grid-rows-7 gap-0.5">
                            {Array.from({ length: 49 }).map((_, index) => {
                              const row = Math.floor(index / 7);
                              const col = index % 7;
                              const finder =
                                (row < 3 && col < 3) ||
                                (row < 3 && col > 3) ||
                                (row > 3 && col < 3);
                              const data = [10, 17, 18, 24, 26, 31, 32, 38, 40, 45].includes(index);
                              return (
                                <span
                                  key={index}
                                  className={finder || data ? 'rounded-[1px] bg-[#091A26]' : 'bg-transparent'}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <p className="mt-1 text-center text-[8px] font-semibold text-slate-500 sm:text-[10px]">Scan to verify</p>
                      </div>
                      <div className="min-w-0 space-y-1.5 text-[9px] leading-tight sm:text-[11px]">
                        <div className="h-9 rounded-lg border border-slate-300 bg-white sm:h-10" />
                        <p className="font-bold text-[#091A26]">Authorized Signature</p>
                        <p><span className="font-black text-[#0BB8FC]">Phone:</span> 9989804888</p>
                        <p className="truncate"><span className="font-black text-[#FE065C]">Email:</span> care@doctyclinics.com</p>
                        <p className="truncate font-black text-[#0BB8FC]">www.doctyclinics.com</p>
                      </div>
                    </div>
                    <div className="relative flex items-end justify-between gap-3 text-[7px] leading-tight text-slate-600 sm:text-[9px]">
                      <p className="max-w-[82%]">
                        This card is non-transferable and remains the property of Docty Clinics. Terms and conditions apply.
                      </p>
                      <img src="/docty-logo-mark.png" alt="" aria-hidden="true" className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Upcoming Appointments', value: String(upcomingAppointments.length), icon: Calendar, color: 'text-primary bg-primary/10' },
            { label: 'Prescriptions', value: String(appointments.filter((item) => item.prescriptionUrl).length), icon: FileText, color: 'text-accent bg-accent/10' },
            { label: 'Visits', value: String(pastAppointments.length), icon: ReceiptText, color: 'text-primary bg-primary/10' },
            { label: 'Pharmacy Purchases', value: String(sortedPharmacyPurchases.length), icon: Pill, color: 'text-accent bg-accent/10' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="rounded-2xl">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
            <div>
              <h2 className="mb-4 text-xl font-bold">Upcoming appointments</h2>
              {upcomingAppointments.length ? upcomingAppointments.map((appointment) => (
                <Card key={appointment.id} className="overflow-hidden rounded-2xl border-primary/25">
                  <div className="h-1 bg-primary" />
                  <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <Badge className="mb-3 bg-accent text-accent-foreground">{appointment.statusLabel}</Badge>
                      <h3 className="text-lg font-bold">{appointment.doctor}</h3>
                      <p className="font-medium text-primary">
                        {appointment.mode === 'in_clinic' ? 'In-clinic consultation' : appointment.mode || appointment.channel}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{appointmentDate(appointment.startTime)}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{appointmentTime(appointment.startTime)}</span>
                        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{appointment.clinic}</span>
                      </div>
                    </div>
                    {appointment.editable && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() => openAppointmentModification(appointment)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modify
                        </Button>
                        <Button variant="outline" className="rounded-full text-destructive">Cancel</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )) : (
                <Card className="rounded-2xl">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No upcoming appointments found.
                  </CardContent>
                </Card>
              )}
            </div>
            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Pharmacy purchases</h2>
                  <p className="text-sm text-muted-foreground">Showing last one year orders, latest first.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={isLoadingPharmacyPurchases}
                  onClick={async () => {
                    if (!selectedProfile) return;
                    setIsLoadingPharmacyPurchases(true);
                    try {
                      setPharmacyPurchases(await loadPharmacyPurchases(selectedProfile.accessToken));
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Unable to refresh pharmacy purchases.');
                    } finally {
                      setIsLoadingPharmacyPurchases(false);
                    }
                  }}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              {!isLoadingPharmacyPurchases && sortedPharmacyPurchases.length > 0 && (
                <Card className="overflow-hidden rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Bill No</th>
                          <th className="px-4 py-3 font-semibold">Bill Date</th>
                          <th className="px-4 py-3 font-semibold">Bill Amount</th>
                          <th className="px-4 py-3 font-semibold">Payment Method</th>
                          <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sortedPharmacyPurchases.map((order) => {
                          const hasInvoice = pharmacyHasInvoice(order);
                          const orderId = pharmacyOrderIdentifier(order);
                          const billNo = pharmacyBillNo(order);

                          return (
                            <tr key={`${order.id || order.order_id || order.order_number || billNo}-${pharmacyOrderDate(order)}`}>
                              <td className="px-4 py-3 font-semibold">{billNo}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatPharmacyOrderDate(order)}</td>
                              <td className="px-4 py-3 font-semibold">{pharmacyOrderAmount(order)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{pharmacyPaymentMethod(order)}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-full"
                                    disabled={!hasInvoice || activePharmacyInvoiceAction === `view-${orderId}`}
                                    title="View bill"
                                    aria-label={`View bill ${billNo}`}
                                    onClick={() => void viewPharmacyInvoice(order)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-full"
                                    disabled={!hasInvoice || activePharmacyInvoiceAction === `download-${orderId}`}
                                    title="Download bill"
                                    aria-label={`Download bill ${billNo}`}
                                    onClick={() => void downloadPharmacyInvoice(order)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 rounded-full"
                                    disabled={!hasInvoice || activePharmacyInvoiceAction === `share-${orderId}`}
                                    title="Share on WhatsApp"
                                    aria-label={`Share bill ${billNo} on WhatsApp`}
                                    onClick={() => void sharePharmacyInvoiceOnWhatsApp(order)}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
              <div className={sortedPharmacyPurchases.length ? 'hidden' : 'space-y-3'}>
                {isLoadingPharmacyPurchases ? (
                  <Card className="rounded-2xl">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Loading pharmacy purchases...
                    </CardContent>
                  </Card>
                ) : sortedPharmacyPurchases.length ? sortedPharmacyPurchases.map((order) => {
                  const orderId = order.order_number || order.bill_no || order.id || order.order_id || 'Pharmacy order';
                  const status = order.status_label || order.status_name || order.order_status || order.status || 'Order received';
                  const itemCount = pharmacyOrderItemsCount(order);

                  return (
                    <Card key={`${order.id || order.order_id || order.order_number || orderId}-${pharmacyOrderDate(order)}`} className="rounded-2xl">
                      <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="flex gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                            <Pill className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{orderId}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPharmacyOrderDate(order)}
                              {itemCount ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
                            </p>
                            <div className="mt-3 flex items-center gap-1.5 text-sm">
                              <IndianRupee className="h-4 w-4 text-primary" />
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-semibold">{pharmacyOrderAmount(order)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <Badge variant="secondary">{status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }) : (
                  <Card className="rounded-2xl">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      {pharmacyPurchasesMessage || 'No pharmacy purchases found in the last one year.'}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            <div>
              <h2 className="mb-4 text-xl font-bold">Past visits</h2>
              <div className="space-y-3">
                {pastAppointments.length ? pastAppointments.map((appointment) => (
                  <Card key={appointment.id} className="rounded-2xl">
                    <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted"><Stethoscope className="h-5 w-5" /></div>
                        <div>
                          <p className="font-semibold">{appointment.doctor}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.clinic} · {appointmentDate(appointment.startTime)}
                          </p>
                          <div className="mt-3 flex items-center gap-1.5 text-sm">
                            <IndianRupee className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Payment:</span>
                            <span className="font-semibold">
                              {typeof appointment.paymentAmount === 'number'
                                ? `₹${appointment.paymentAmount.toLocaleString('en-IN')}`
                                : 'Not available'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Badge variant="secondary">{appointment.statusLabel}</Badge>
                        {appointment.prescriptionUrl && (
                          <Button asChild size="sm" variant="outline" className="rounded-full">
                            <a href={appointment.prescriptionUrl} target="_blank" rel="noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              Download Prescription
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )) : (
                  <Card className="rounded-2xl">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No past visits found.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
        </div>
      </div>

      <Dialog
        open={Boolean(editingAppointment)}
        onOpenChange={(open) => {
          if (!open && !isRescheduling) {
            setEditingAppointment(null);
            setSelectedRescheduleSlot(null);
            setRescheduleSlots([]);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Modify appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and available time for {editingAppointment?.doctor}.
              The doctor and clinic will remain unchanged.
            </DialogDescription>
          </DialogHeader>

          {editingAppointment && (
            <div className="space-y-6">
              <Card className="gap-0 rounded-xl py-0">
                <CardContent className="p-4">
                  <p className="font-semibold">{editingAppointment.doctor}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {editingAppointment.clinic}
                  </p>
                  <p className="mt-2 text-sm">
                    Current appointment:{' '}
                    <span className="font-semibold">
                      {appointmentDate(editingAppointment.startTime)} at{' '}
                      {appointmentTime(editingAppointment.startTime)}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <div>
                <Label className="mb-3 block">Select a new date</Label>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                  {modificationDates.map((date) => {
                    const value = dateKey(date);
                    const selected = rescheduleDate === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isRescheduling}
                        onClick={() => void loadRescheduleSlots(editingAppointment, value)}
                        className={`min-w-[72px] rounded-xl border px-3 py-2 text-center transition-colors ${
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background hover:border-primary/50'
                        }`}
                      >
                        <span className="block text-xs">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                        <span className="block text-lg font-bold">{date.getDate()}</span>
                        <span className="block text-xs">{date.toLocaleDateString('en-IN', { month: 'short' })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Available slots</Label>
                {isLoadingRescheduleSlots ? (
                  <div className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
                    Loading available slots...
                  </div>
                ) : rescheduleSlots.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {rescheduleSlots.map((slot) => {
                      const selected = selectedRescheduleSlot?.start === slot.start;
                      return (
                        <button
                          key={`${slot.start}-${slot.confId}`}
                          type="button"
                          disabled={isRescheduling}
                          onClick={() => setSelectedRescheduleSlot(slot)}
                          className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'bg-background hover:border-primary/50'
                          }`}
                        >
                          {slotTime(slot.start)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
                    No slots available for this date.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isRescheduling}
              onClick={() => setEditingAppointment(null)}
            >
              Keep current appointment
            </Button>
            <Button
              type="button"
              disabled={!selectedRescheduleSlot || isRescheduling}
              onClick={rescheduleAppointment}
            >
              {isRescheduling ? 'Updating...' : 'Confirm new appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
