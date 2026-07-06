import { issueSignedToken, presignUrl, put } from '@vercel/blob';
import { jsPDF } from 'jspdf';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { sendPharmacyReceiptWhatsApp } from '../_lib/msg91-whatsapp.js';
import { safeWriteSystemLog } from '../_lib/system-logs.js';
import { readStaffSession, staffSessionSecret } from '../../server/staff-session.js';

function normalizeIndianMobile(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function text(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function money(value: unknown) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function shortMoney(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function addWrapped(document: jsPDF, value: string, x: number, y: number, width: number, lineHeight = 12) {
  const lines = document.splitTextToSize(value || '-', width);
  document.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function compactUnit(value: unknown) {
  const unitText = text(value);
  if (!unitText) return '';
  if (/(tablets?|tabs?)\b/i.test(unitText)) return 'Tabs';
  if (/(capsules?|caps?)\b/i.test(unitText)) return 'Caps';
  if (/^strips?$/i.test(unitText)) return 'Strip';
  if (/bottle/i.test(unitText)) return 'Btl';
  if (/tube/i.test(unitText)) return 'Tube';
  if (/sachet/i.test(unitText)) return 'Sachet';
  return text(value).split(/\s+/)[0].slice(0, 8);
}

function packLabel(item: any) {
  const source = text(item.packSize) || text(item.unit);
  const match = source.match(/(\d+)\s*(tablets?|tabs?|capsules?|caps?)\b/i);
  if (!match) return '';
  return `${match[1]}'s Pack`;
}

function quantityLabel(item: any) {
  const quantity = Number(item.quantity || 0);
  const explicitUnit = text(item.quantityUnit) || text(item.saleUnit) || text(item.unit);
  const pack = text(item.packSize);
  if (/^strips?$/i.test(explicitUnit)) return `${quantity} Strip`;
  return `${quantity} ${compactUnit(explicitUnit) || compactUnit(pack) || 'Qty'}`;
}

export async function buildStaffThermalInvoicePdf(payload: any) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const estimatedHeight = Math.max(
    360,
    236 +
      items.length * 78 +
      (text(payload.deliveryAddress) ? 58 : 0) +
      (text(payload.notes) ? 44 : 0) +
      (text(payload.reorderUrl) ? 78 : 26)
  );
  const document = new jsPDF({ unit: 'pt', format: [226.77, estimatedHeight] });
  const margin = 10;
  const pageWidth = document.internal.pageSize.getWidth();
  let y = 18;
  const contentWidth = pageWidth - margin * 2;
  const storeAddress = text(payload.storeAddress, 'Hyderabad');
  const gstNumber = text(payload.gstNumber, '36AAHCD7944A1ZQ');
  const panNumber = text(payload.panNumber, gstNumber.length >= 12 ? gstNumber.slice(2, 12) : 'AAHCD7944A');
  const licenseNumber = text(payload.licenseNumber, '20');
  const documentStatus = text(payload.documentStatus, 'Draft').toLowerCase() === 'final' ? 'Final' : 'Draft';
  const reorderUrl = text(payload.reorderUrl);
  const logoPath = join(process.cwd(), 'public', 'docty-logo-mark.png');

  if (existsSync(logoPath)) {
    const logo = readFileSync(logoPath).toString('base64');
    document.addImage(`data:image/png;base64,${logo}`, 'PNG', margin + 2, y - 8, 20, 20);
  }
  document.setFont('helvetica', 'bold');
  document.setFontSize(15);
  document.setTextColor(237, 0, 28);
  const doctyX = margin + 28;
  const doctyY = y + 4;
  document.text('Docty', doctyX, doctyY);
  const doctyWidth = document.getTextWidth('Docty');
  document.setTextColor(0, 125, 197);
  document.text('.Pharmacy', doctyX + doctyWidth + 1, doctyY);
  document.setTextColor(0, 0, 0);
  y += 18;
  document.setFont('helvetica', 'normal');
  document.setFontSize(8);
  document.splitTextToSize(storeAddress, contentWidth).forEach((line: string) => {
    document.text(line, pageWidth / 2, y, { align: 'center' });
    y += 9;
  });
  document.text('M 9989804888', pageWidth / 2, y, { align: 'center' });
  y += 9;
  document.setFont('helvetica', 'bold');
  document.setFontSize(10);
  document.text(`${documentStatus.toUpperCase()} BILL`, pageWidth / 2, y + 3, { align: 'center' });
  y += 14;

  const patientName = text(payload.patientName, 'Patient');
  const billNo = text(payload.billNo, 'Invoice');
  const billDate = text(payload.billDate, new Date().toLocaleDateString('en-IN'));
  const line = () => {
    document.setLineDashPattern([2, 2], 0);
    document.line(margin, y, pageWidth - margin, y);
    document.setLineDashPattern([], 0);
    y += 8;
  };
  const detailRow = (label: string, value: string) => {
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.text(label, margin, y);
    document.text(value || '-', pageWidth - margin, y, { align: 'right', maxWidth: 126 });
    y += 10;
  };

  line();
  detailRow('Invoice', billNo);
  detailRow('Date', billDate);
  detailRow('Patient', patientName);
  detailRow('Mobile', `+91 ${text(payload.mobile)}`);
  detailRow('Payment', text(payload.paymentMethod, 'UPI'));
  detailRow('Type', text(payload.fulfillment, 'Pickup'));

  const deliveryAddress = text(payload.deliveryAddress);
  if (deliveryAddress) {
    line();
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.text('Delivery', margin, y);
    y += 10;
    document.setFont('helvetica', 'normal');
    y = addWrapped(document, deliveryAddress, margin, y, contentWidth, 9);
  }

  line();
  document.setFont('helvetica', 'bold');
  document.setFontSize(8);
  document.text('Item Details', margin, y);
  y += 10;
  document.text('Qty', margin, y);
  document.text('Rate', 82, y, { align: 'right' });
  document.text('Disc', 128, y, { align: 'right' });
  document.text('Amount', pageWidth - margin, y, { align: 'right' });
  y += 8;
  line();
  document.setFont('helvetica', 'normal');
  document.setFontSize(8);
  items.forEach((item: any, index: number) => {
    const pack = packLabel(item);
    const name = `${index + 1}. ${text(item.name, 'Medicine')}${pack ? ` (${pack})` : ''}`;
    const gstRate = Number(item.gstPercentage || 0);
    const discount = Number(item.discount || 0);
    const quantityText = quantityLabel(item);
    document.setFont('helvetica', 'bold');
    y = addWrapped(document, name, margin, y, contentWidth, 10);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    y = addWrapped(document, `Batch ${text(item.batch, '-')} | Exp ${text(item.expiry, '-')}`, margin, y, contentWidth, 9);
    document.setFontSize(8);
    document.setFont('helvetica', 'bold');
    document.text(quantityText || '-', margin, y);
    document.text(shortMoney(item.rate), 82, y, { align: 'right' });
    document.text(`${discount.toFixed(1)}%`, 128, y, { align: 'right' });
    document.text(shortMoney(item.amount), pageWidth - margin, y, { align: 'right' });
    y += 10;
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    y = addWrapped(
      document,
      `Disc ${discount.toFixed(1)}% | GST ${gstRate.toFixed(1)}% | Taxable ${shortMoney(item.taxableAmount)} | GST Amt ${shortMoney(item.gstAmount)}`,
      margin,
      y,
      contentWidth,
      9
    );
    document.setDrawColor(230, 230, 230);
    document.line(margin, y, pageWidth - margin, y);
    y += 8;
    document.setFontSize(8);
  });

  line();
  const totals = payload.totals || {};
  const taxableTotal = Number(totals.taxable || 0);
  const gstTotal = Number(totals.gst || 0);
  const cgstTotal = Number(totals.cgst ?? totals.cgstAmount ?? gstTotal / 2);
  const sgstTotal = Number(totals.sgst ?? totals.sgstAmount ?? gstTotal / 2);
  ([
    ['Gross', money(totals.gross)],
    ['Discount', money(totals.discount)],
    ['Taxable', money(taxableTotal)],
    ['CGST', money(cgstTotal)],
    ['SGST', money(sgstTotal)],
    ['Total GST', money(gstTotal)],
    ['Medicines', money(totals.net)],
    ['Delivery', Number(totals.deliveryCharge || 0) ? money(totals.deliveryCharge) : 'Free'],
    ['Net Payable', money(totals.payable)],
  ] as [string, string][]).forEach(([label, value], index, rows) => {
    document.setFont('helvetica', index === rows.length - 1 ? 'bold' : 'normal');
    document.setFontSize(index === rows.length - 1 ? 9 : 8);
    document.text(label, margin, y);
    document.text(value, pageWidth - margin, y, { align: 'right' });
    y += index === rows.length - 1 ? 12 : 10;
  });

  const notes = text(payload.notes);
  if (notes) {
    line();
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.text('Notes', margin, y);
    y += 10;
    document.setFont('helvetica', 'normal');
    y = addWrapped(document, notes, margin, y, contentWidth, 9);
  }

  line();
  document.setFont('helvetica', 'normal');
  document.setFontSize(7.5);
  const footerLeftX = margin;
  const qrX = pageWidth - margin - 62;
  if (gstNumber) {
    document.text(`GSTIN: ${gstNumber}`, footerLeftX, y);
    y += 9;
  }
  document.text(`PAN: ${panNumber}`, footerLeftX, y);
  y += 9;
  document.text(`LICENSE: ${licenseNumber}`, footerLeftX, y);
  const footerTop = y - (gstNumber ? 18 : 9);
  if (reorderUrl) {
    const qrDataUrl = await QRCode.toDataURL(reorderUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 96,
    });
    document.addImage(qrDataUrl, 'PNG', qrX, footerTop - 4, 58, 58);
    document.setFont('helvetica', 'bold');
    document.setFontSize(7);
    document.text('Reorder', qrX + 29, footerTop + 62, { align: 'center' });
  }
  y = Math.max(y + 10, footerTop + (reorderUrl ? 72 : 22));

  line();
  document.setFont('helvetica', 'normal');
  document.setFontSize(7);
  document.text('Thank you', pageWidth / 2, y, { align: 'center' });
  y += 9;
  document.splitTextToSize('Prescription validation, availability and substitutions are confirmed by Docty Pharmacy.', contentWidth).forEach((footerLine: string) => {
    document.text(footerLine, pageWidth / 2, y, { align: 'center' });
    y += 8;
  });

  return Buffer.from(document.output('arraybuffer'));
}

export default async function handler(request: any, response: any) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const secret = staffSessionSecret();
  const staffSession = secret ? readStaffSession(request.headers.cookie, secret) : undefined;
  if (!staffSession) return response.status(401).json({ message: 'Please sign in as staff.' });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return response.status(500).json({ message: 'Invoice document storage is not configured.' });

  const recipientMobile = normalizeIndianMobile(request.body?.mobile);
  const patientName = text(request.body?.patientName, 'Patient');
  const billNo = text(request.body?.billNo, `DP-${Date.now()}`);
  const billDate = text(request.body?.billDate, new Date().toLocaleDateString('en-IN'));
  const billAmount = String(Math.round(Number(request.body?.totals?.payable || 0)));
  const documentStatus = text(request.body?.documentStatus, 'Draft').toLowerCase() === 'final' ? 'Final' : 'Draft';

  if (!recipientMobile) return response.status(400).json({ message: 'Enter a valid recipient mobile number.' });
  if (!Array.isArray(request.body?.items) || !request.body.items.length) {
    return response.status(400).json({ message: 'Add medicines before sending the invoice.' });
  }

  try {
    const pdf = await buildStaffThermalInvoicePdf({ ...request.body, documentStatus, mobile: recipientMobile, patientName, billNo, billDate });
    const safeBillNo = billNo.replace(/[^a-z0-9_-]/gi, '-');
    const filename = `${documentStatus}-${safeBillNo}.pdf`;
    const blob = await put(`staff-pharmacy-invoices/${documentStatus.toLowerCase()}-${safeBillNo}-${Date.now()}.pdf`, pdf, {
      access: 'private',
      contentType: 'application/pdf',
      token: blobToken,
    });
    const validUntil = Date.now() + 60 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname: blob.pathname,
      operations: ['get'],
      validUntil,
      token: blobToken,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: 'private',
      operation: 'get',
      pathname: blob.pathname,
      validUntil,
    });

    const whatsappResponse = await sendPharmacyReceiptWhatsApp({
      mobileValue: recipientMobile,
      documentUrl: presignedUrl,
      filename,
      patientName,
      billNo: `${documentStatus} ${billNo}`,
      billDate,
      billAmount,
      paymentMethod: text(request.body?.paymentMethod, request.body?.fulfillment || 'Pharmacy Order'),
    });

    await safeWriteSystemLog({
      level: 'success',
      source: 'pharmacy-invoice',
      event: 'invoice_whatsapp_sent',
      message: `${documentStatus} invoice ${billNo} sent on WhatsApp to ${patientName}.`,
      actorName: staffSession.name || '',
      actorMobile: staffSession.mobile || '',
      metadata: {
        billNo,
        documentStatus,
        billAmount,
        recipientMobileLast4: recipientMobile.slice(-4),
        blobPathname: blob.pathname,
      },
    });

    return response.status(200).json({ success: true, whatsappResponse });
  } catch (error) {
    await safeWriteSystemLog({
      level: 'error',
      source: 'pharmacy-invoice',
      event: 'invoice_whatsapp_failed',
      message: error instanceof Error ? error.message : 'Unable to send pharmacy invoice on WhatsApp.',
      actorName: staffSession.name || '',
      actorMobile: staffSession.mobile || '',
      metadata: {
        billNo,
        documentStatus,
        recipientMobileLast4: recipientMobile.slice(-4),
      },
    });
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'Unable to send pharmacy invoice on WhatsApp.',
    });
  }
}
