export interface SubscriptionCardProfile {
  id: string;
  name: string;
  imageUrl?: string;
  initials?: string;
  subscription?: {
    subscriber?: boolean;
    planCode?: string;
    startDate?: string;
    endDate?: string;
  };
}

export const SUBSCRIPTION_PLAN_NAMES: Record<string, string> = {
  DME: 'Docty Me',
  DUS: 'Docty Us',
  DWE: 'Docty We',
  DAL: 'Docty All',
  DTC: 'Docty Total Care',
};

export function profileInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PT';
}

export function formatSubscriptionDate(value?: string) {
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

export function subscriptionMemberId(profile: SubscriptionCardProfile) {
  const suffix = profile.id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
  return `DC-${suffix.padStart(8, '0')}`;
}

export function subscriptionPlanName(profile: SubscriptionCardProfile) {
  return (
    SUBSCRIPTION_PLAN_NAMES[profile.subscription?.planCode || ''] ||
    profile.subscription?.planCode ||
    'Subscription'
  );
}

export function cardBaseFilename(profile: SubscriptionCardProfile) {
  return `docty-membership-card-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'patient'}`;
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

function drawRoundRect(
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

function drawCoverImage(
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
    drawRoundRect(context, x, y, width, height, radius);
    context.clip();
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

function drawLabel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  tone: 'blue' | 'pink'
) {
  const isBlue = tone === 'blue';
  context.fillStyle = isBlue ? '#CFF4FF' : '#FFD8E8';
  drawRoundRect(context, x, y, width, 72, 18);
  context.fill();
  context.fillStyle = isBlue ? '#0BB8FC' : '#FE065C';
  context.font = '900 30px Poppins, Segoe UI, sans-serif';
  context.fillText(label, x + 25, y + 47);
}

export async function renderSubscriptionCardImage(
  profile: SubscriptionCardProfile,
  side: 'front' | 'back' = 'front'
) {
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
  const planName = subscriptionPlanName(profile);

  context.clearRect(0, 0, width, height);
  drawRoundRect(context, 0, 0, width, height, 78);
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
      color: { dark: '#091A26', light: '#FFFFFF' },
    });
    const qrImage = await loadCanvasImage(qrCode);

    context.textAlign = 'left';
    context.fillStyle = '#0BB8FC';
    context.font = '900 52px Poppins, Segoe UI, sans-serif';
    context.fillText('ACCESS YOUR', 60, 145);
    context.fillStyle = '#FE065C';
    context.fillText('MEMBERSHIP BENEFITS', 60, 215);
    context.fillStyle = '#091A26';
    context.font = '900 38px Poppins, Segoe UI, sans-serif';
    context.fillText('AT ANY DOCTY CLINICS', 60, 272);
    context.fillStyle = '#64748B';
    context.font = '700 18px Poppins, Segoe UI, sans-serif';
    context.fillText(memberId, 62, 310);

    context.fillStyle = '#FFFFFF';
    drawRoundRect(context, 72, 350, 220, 220, 18);
    context.fill();
    if (qrImage) context.drawImage(qrImage, 90, 368, 184, 184);

    context.strokeStyle = '#CBD5E1';
    context.lineWidth = 3;
    drawRoundRect(context, 720, 300, 430, 92, 10);
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

    if (logoMark) context.drawImage(logoMark, 1050, 590, 112, 112);
    context.fillStyle = '#475569';
    context.font = '500 18px Poppins, Segoe UI, sans-serif';
    context.fillText(
      'This card is non-transferable and remains the property of Docty Clinics. Terms and conditions apply.',
      60,
      720
    );
    return canvas.toDataURL('image/png');
  }

  if (logo) context.drawImage(logo, 55, 52, 470, 81);

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
  drawRoundRect(context, 55, 235, 305, 305, 50);
  context.fill();
  context.fillStyle = '#DEF7FF';
  drawRoundRect(context, 67, 247, 281, 281, 42);
  context.fill();
  if (profilePicture) {
    drawCoverImage(context, profilePicture, 76, 256, 263, 263, 36);
  } else {
    context.fillStyle = '#FE065C';
    context.font = '900 76px Poppins, Segoe UI, sans-serif';
    context.textAlign = 'center';
    context.fillText(profile.initials || profileInitials(profile.name), 207, 425);
  }

  context.textAlign = 'left';
  drawLabel(context, 455, 210, 300, 'PATIENT NAME:', 'blue');
  context.fillStyle = '#091A26';
  context.font = '900 58px Poppins, Segoe UI, sans-serif';
  context.fillText(profile.name.slice(0, 22), 455, 380);

  drawLabel(context, 455, 445, 345, 'MEMBERSHIP TIER:', 'pink');
  context.fillStyle = '#091A26';
  context.font = '900 44px Poppins, Segoe UI, sans-serif';
  context.fillText(planName.toUpperCase().slice(0, 18), 455, 610);

  [
    { x: 55, width: 360, label: 'SUBSCRIBER ID:', value: memberId, tone: 'blue' as const },
    {
      x: 455,
      width: 345,
      label: 'VALID FROM:',
      value: formatSubscriptionDate(profile.subscription?.startDate),
      tone: 'pink' as const,
    },
    {
      x: 870,
      width: 325,
      label: 'VALID TO:',
      value: formatSubscriptionDate(profile.subscription?.endDate),
      tone: 'blue' as const,
    },
  ].forEach((chip) => {
    drawLabel(context, chip.x, 650, chip.width, chip.label, chip.tone);
    context.fillStyle = '#091A26';
    context.font = '800 30px Poppins, Segoe UI, sans-serif';
    context.fillText(chip.value, chip.x + 25, 770);
  });

  return canvas.toDataURL('image/png');
}

export async function generateSubscriptionCardPdf(profile: SubscriptionCardProfile) {
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
