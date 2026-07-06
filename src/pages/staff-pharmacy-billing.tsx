import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeIndianRupee,
  Copy,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Pill,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocationList } from '@/generated/hooks/use-location';
import type { Location } from '@/generated/models/location-model';
import {
  searchPharmacyMedicines,
  type PharmacyCartItem,
  type PharmacyMedicine,
} from '@/lib/pharmacy-api';

interface StaffPatient {
  id: string;
  name: string;
  mobile: string;
  dob?: string;
  gender?: string;
  relation?: string;
  evitalRxPatientId?: string;
  subscription?: {
    subscriber: boolean;
    planCode?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface EvitalRxPatientCandidate {
  id: string;
  name: string;
  mobileLast5?: string;
  maskedMobile?: string;
  address?: string;
}

interface BillingItem extends PharmacyCartItem {
  discountPercentage: number;
  quantityUnit?: string;
}

interface DeliveryDetails {
  address: string;
  area: string;
  city: string;
  pincode: string;
  landmark: string;
  latitude: string;
  longitude: string;
}

interface DeliveryLinkState {
  token: string;
  url: string;
  expiresAt: number;
}

interface PlacedOrderDetails {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  gstNumber: string;
  storeName: string;
  storeAddress: string;
  paymentUrl?: string;
}

interface RecentPurchase {
  id?: string;
  order_id?: string;
  order_number?: string;
  bill_no?: string;
  bill_number?: string;
  order_date?: string;
  created_date?: string;
  created_at?: string;
  order_status?: string;
  status?: string;
  patient_name?: string;
  amount?: number | string;
  bill_amount?: number | string;
  invoice_amount?: number | string;
  payable_amount?: number | string;
  final_amount?: number | string;
  net_amount?: number | string;
  net_payable?: number | string;
  order_total?: number | string;
  grand_total?: number | string;
  total?: number | string;
  items?: unknown[];
  bill_items?: unknown[];
  order_items?: unknown[];
  medicines?: unknown[];
  medicine_details?: unknown[];
  order_medicines?: unknown[];
  products?: unknown[];
  product_details?: unknown[];
  invoice_items?: unknown[];
  [key: string]: unknown;
}

interface CompletedSale {
  id: string;
  details: PlacedOrderDetails;
  patientName: string;
  patientMobile: string;
  evitalRxPatientId: string;
  amount: number;
  createdAt: string;
  items: BillingItem[];
}

const relationships = [
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

const paymentModes = [
  { value: '1', label: 'Cash' },
  { value: '2', label: 'Credit' },
  { value: '3', label: 'UPI' },
  { value: '4', label: 'Cheque' },
  { value: '5', label: 'Paytm' },
  { value: '6', label: 'Card' },
  { value: '7', label: 'RTGS / NEFT' },
];

const billingDraftStorageKey = 'staff-pharmacy-billing-draft';

function normalizeMobile(value: string) {
  return value.replace(/\D/g, '').slice(-10);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReceiptMoney(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInKm(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.lat - from.lat);
  const lonDelta = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function displayDate(value?: string) {
  if (!value) return 'Not set';
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(timestamp));
}

function hasActiveSubscription(patient?: StaffPatient) {
  if (!patient?.subscription?.subscriber) return false;
  if (!patient.subscription.endDate) return true;
  const endDate = new Date(patient.subscription.endDate);
  if (Number.isNaN(endDate.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return endDate >= today;
}

function displayExpiry(value?: string) {
  if (!value) return 'Not set';
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(timestamp));
}

function displayBatch(value: Pick<PharmacyMedicine, 'batchNo' | 'batchId'>) {
  return value.batchNo || value.batchId || 'Not set';
}

function purchaseOrderId(order: RecentPurchase) {
  return String(order.order_id || order.id || order.order_number || order.bill_no || order.bill_number || '').trim();
}

function purchaseBillNo(order: RecentPurchase) {
  return String(order.bill_no || order.bill_number || order.order_number || purchaseOrderId(order) || 'Purchase').trim();
}

function purchaseAmount(order: RecentPurchase) {
  return Number(
    order.final_amount ||
      order.payable_amount ||
      order.net_payable ||
      order.net_amount ||
      order.bill_amount ||
      order.invoice_amount ||
      order.grand_total ||
      order.order_total ||
      order.total ||
      order.amount ||
      0
  );
}

function purchaseDate(order: RecentPurchase) {
  const value = String(order.order_date || order.created_date || order.created_at || '');
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(timestamp))
    : value || 'Date not available';
}

function purchaseItems(order: RecentPurchase) {
  const items =
    order.items ||
    order.bill_items ||
    order.order_items ||
    order.medicines ||
    order.medicine_details ||
    order.order_medicines ||
    order.products ||
    order.product_details ||
    order.invoice_items;
  return Array.isArray(items) ? items : [];
}

function purchaseItemName(item: any, index: number) {
  return String(item?.medicine_name || item?.medicine?.medicine_name || item?.name || item?.item_name || item?.product_name || `Item ${index + 1}`);
}

function purchaseItemQuantityText(item: any) {
  const loose = Number(item?.loose_quantity || item?.loose_qty || item?.billed_loose_quantity || 0);
  const packing = String(item?.packing_size || item?.pack_size || item?.packing || '');
  if (loose > 0) {
    if (/(capsules?|caps?)\b/i.test(packing)) return `${loose} Caps`;
    if (/(tablets?|tabs?)\b/i.test(packing)) return `${loose} Tabs`;
    return `${loose} loose`;
  }
  const quantity = item?.quantity || item?.qty || item?.order_quantity || item?.billed_quantity || '-';
  return `${quantity} ${String(item?.quantity_unit || item?.sale_unit || 'Strip')}`;
}

function purchaseItemAmount(item: any) {
  return Number(item?.final_amount || item?.net_amount || item?.amount || item?.total_amount || item?.total || 0);
}

function completedSaleBillNo(sale: CompletedSale) {
  return sale.details.invoiceNumber || sale.details.orderNumber || sale.details.orderId || sale.id;
}

function completedSaleDate(sale: CompletedSale) {
  const timestamp = Date.parse(sale.createdAt);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(timestamp))
    : 'Just now';
}

function baseUnitPrice(item: Pick<BillingItem, 'salePrice' | 'mrp'>) {
  return item.mrp || item.salePrice || 0;
}

function baseLpPrice(item: Pick<BillingItem, 'lpPrice'>) {
  return item.lpPrice || 0;
}

function isLooseQuantityUnit(item: Pick<BillingItem, 'saleUnit' | 'quantityUnit' | 'packUnitCount'>) {
  return Boolean(item.saleUnit && item.quantityUnit === item.saleUnit && (item.packUnitCount || 1) > 1);
}

function itemUnitPrice(item: BillingItem) {
  const price = baseUnitPrice(item);
  return isLooseQuantityUnit(item)
    ? Math.round((price / (item.packUnitCount || 1)) * 100) / 100
    : price;
}

function itemLpUnitPrice(item: Pick<BillingItem, 'lpPrice' | 'saleUnit' | 'quantityUnit' | 'packUnitCount'>) {
  const lp = baseLpPrice(item);
  return lp && isLooseQuantityUnit(item)
    ? Math.round((lp / (item.packUnitCount || 1)) * 100) / 100
    : lp;
}

function itemNetAmount(item: BillingItem) {
  const gross = itemUnitPrice(item) * item.quantity;
  return Math.max(0, gross - (gross * item.discountPercentage) / 100);
}

function itemGstPercentage(item: BillingItem) {
  return Number((item as BillingItem & { gstPercentage?: number; gst?: number; gst_percentage?: number }).gstPercentage || (item as any).gst_percentage || (item as any).gst || 0);
}

function itemGstAmount(item: BillingItem) {
  const gst = itemGstPercentage(item);
  const amount = itemNetAmount(item);
  return gst > 0 ? amount - amount / (1 + gst / 100) : 0;
}

function itemTaxableAmount(item: BillingItem) {
  return itemNetAmount(item) - itemGstAmount(item);
}

function maxQuantityForStock(item: Pick<BillingItem, 'stockQuantity' | 'stripQuantity' | 'saleUnit' | 'quantityUnit'>) {
  const stock =
    item.quantityUnit === 'strip'
      ? item.stripQuantity || item.stockQuantity
      : item.stockQuantity;
  return Math.max(1, Math.min(9999, stock && stock > 0 ? stock : 9999));
}

function pluralizeUnit(value: string) {
  return value.endsWith('s') ? value : `${value}s`;
}

function quantityUnitLabel(item: Pick<BillingItem, 'saleUnit' | 'quantityUnit'>) {
  return pluralizeUnit(item.quantityUnit || item.saleUnit || 'unit');
}

function receiptQuantityLabel(item: Pick<BillingItem, 'quantity' | 'quantityUnit' | 'saleUnit'>) {
  const unit = item.quantityUnit || item.saleUnit || 'unit';
  if (/^strips?$/i.test(unit)) return `${item.quantity} Strip`;
  if (/(tablets?|tabs?)\b/i.test(unit)) return `${item.quantity} Tabs`;
  if (/(capsules?|caps?)\b/i.test(unit)) return `${item.quantity} Caps`;
  return `${item.quantity} ${unit}`;
}

function receiptPackLabel(item: Pick<BillingItem, 'quantityUnit' | 'saleUnit' | 'packUnitCount'>) {
  if (item.quantityUnit !== 'strip' || !item.packUnitCount || item.packUnitCount <= 1) return '';
  const unit = /cap/i.test(item.saleUnit || '') ? 'Caps' : 'Tabs';
  return `${item.packUnitCount}'s Pack`;
}

function unitOptions(item: Pick<BillingItem, 'saleUnit' | 'packUnitCount'>) {
  return item.saleUnit && (item.packUnitCount || 1) > 1
    ? [item.saleUnit, 'strip']
    : [item.saleUnit || 'unit'];
}

function quantityOptionLabel(item: BillingItem, option: string) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  if (option === 'strip' && item.packUnitCount && item.saleUnit) {
    return `${quantity} ${pluralizeUnit(option)} (${quantity * item.packUnitCount} ${pluralizeUnit(item.saleUnit)})`;
  }
  return `${quantity} ${pluralizeUnit(option)}`;
}

function ageOptionLabel(age: string, unit: string) {
  const value = Math.max(1, Math.round(Number(age) || 1));
  const label = unit === 'years' ? 'Years' : unit === 'months' ? 'Months' : 'Days';
  return `${value} ${label}`;
}

function minimumUnitPriceWithMargin(
  item: Pick<BillingItem, 'lpPrice' | 'saleUnit' | 'quantityUnit' | 'packUnitCount'>
) {
  const lp = itemLpUnitPrice(item);
  return lp > 0
    ? Math.round(lp * 1.06 * 100) / 100
    : undefined;
}

function maxDiscountPercentage(
  item: Pick<BillingItem, 'lpPrice' | 'salePrice' | 'mrp' | 'saleUnit' | 'quantityUnit' | 'packUnitCount'>
) {
  const unitPrice = itemUnitPrice(item as BillingItem);
  const minimumUnitPrice = minimumUnitPriceWithMargin(item);
  if (!unitPrice || !minimumUnitPrice) return 20;
  if (unitPrice <= minimumUnitPrice) return 0;
  return Math.max(0, Math.min(100, Math.floor((1 - minimumUnitPrice / unitPrice) * 10000) / 100));
}

function clampDiscountPercentage(
  item: Pick<BillingItem, 'lpPrice' | 'salePrice' | 'mrp' | 'saleUnit' | 'quantityUnit' | 'packUnitCount'>,
  value: number
) {
  return Math.min(maxDiscountPercentage(item), Math.max(0, Number.isFinite(value) ? value : 0));
}

function isStockedMedicine(medicine: Pick<PharmacyMedicine, 'available' | 'stockQuantity'>) {
  return medicine.available !== false && (medicine.stockQuantity || 0) > 0;
}

function totalStockForMedicine(
  item: BillingItem,
  batchOptionsByMedicineId: Map<string, PharmacyMedicine[]>
) {
  const options = batchOptionsByMedicineId.get(item.medicineId || item.id) || [];
  if (!options.length) return item.stockQuantity ?? 0;
  return options.reduce((total, option) => total + (option.stockQuantity || 0), 0);
}

function totalStripsForMedicine(
  item: BillingItem,
  batchOptionsByMedicineId: Map<string, PharmacyMedicine[]>
) {
  const options = batchOptionsByMedicineId.get(item.medicineId || item.id) || [];
  if (!options.length) return item.stripQuantity ?? 0;
  return options.reduce((total, option) => total + (option.stripQuantity || 0), 0);
}

function stockedBatchOptions(item: BillingItem, batchOptionsByMedicineId: Map<string, PharmacyMedicine[]>) {
  const options = batchOptionsByMedicineId.get(item.medicineId || item.id) || [];
  const stockedOptions = options.filter(isStockedMedicine);
  return stockedOptions.some((option) => option.id === item.id)
    ? stockedOptions
    : [item, ...stockedOptions.filter((option) => option.id !== item.id)];
}

function fileToPrescriptionImage(file: File) {
  return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, data: String(reader.result || '') });
    reader.onerror = () => reject(new Error('Unable to read prescription image.'));
    reader.readAsDataURL(file);
  });
}

function AuthRequired() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-md">
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Staff sign in required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verify staff access from the staff application, then open pharmacy billing.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/staff">Open Staff Application</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function PatientCard({
  patient,
  selected,
  onSelect,
}: {
  patient: StaffPatient;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`w-full rounded-lg border bg-white p-4 text-left transition ${
        selected ? 'border-primary ring-2 ring-primary/15' : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{patient.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {patient.relation || 'Relationship not set'} · {patient.gender || 'Gender not set'}
          </p>
        </div>
        {patient.subscription?.subscriber ? (
          <Badge className="shrink-0 bg-emerald-600">Subscribed</Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">No plan</Badge>
        )}
      </div>
      {patient.subscription?.subscriber && (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-950">
          <p className="font-semibold">{patient.subscription.planCode || 'Docty plan'}</p>
          <p>
            {displayDate(patient.subscription.startDate)} to {displayDate(patient.subscription.endDate)}
          </p>
        </div>
      )}
      {patient.evitalRxPatientId && (
        <p className="mt-3 text-xs text-muted-foreground">eVitalRx ID: {patient.evitalRxPatientId}</p>
      )}
    </button>
  );
}

export default function StaffPharmacyBillingPage() {
  const { data: clinicLocations } = useLocationList();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState<'mobile' | 'otp'>('mobile');
  const [staffName, setStaffName] = useState('');
  const [staffMobile, setStaffMobile] = useState('');
  const [staffOtp, setStaffOtp] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [isSendingStaffOtp, setIsSendingStaffOtp] = useState(false);
  const [isVerifyingStaffOtp, setIsVerifyingStaffOtp] = useState(false);
  const [mobile, setMobile] = useState('');
  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [hasPatientSearchFailed, setHasPatientSearchFailed] = useState(false);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [evitalRxPatients, setEvitalRxPatients] = useState<EvitalRxPatientCandidate[]>([]);
  const [selectedEvitalRxPatientId, setSelectedEvitalRxPatientId] = useState('');
  const [isEvitalRxSearching, setIsEvitalRxSearching] = useState(false);
  const [isMappingEvitalRxPatient, setIsMappingEvitalRxPatient] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registration, setRegistration] = useState({
    name: '',
    age: '',
    ageUnit: 'years',
    gender: 'M',
    relationship: 'Self',
    email: '',
  });
  const [isAgeOptionsOpen, setIsAgeOptionsOpen] = useState(false);
  const [activeQuantityItemId, setActiveQuantityItemId] = useState('');
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medicineResults, setMedicineResults] = useState<PharmacyMedicine[]>([]);
  const [batchOptionsByMedicineId, setBatchOptionsByMedicineId] = useState<Map<string, PharmacyMedicine[]>>(
    () => new Map()
  );
  const [isMedicineSearching, setIsMedicineSearching] = useState(false);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [paymentStatus, setPaymentStatus] = useState('3');
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
    address: '',
    area: '',
    city: 'Hyderabad',
    pincode: '',
    landmark: '',
    latitude: '',
    longitude: '',
  });
  const [manualDeliveryCharge, setManualDeliveryCharge] = useState('30');
  const [deliveryLink, setDeliveryLink] = useState<DeliveryLinkState | null>(null);
  const [deliveryQrDataUrl, setDeliveryQrDataUrl] = useState('');
  const [isDeliveryLinkOpen, setIsDeliveryLinkOpen] = useState(false);
  const [isCreatingDeliveryLink, setIsCreatingDeliveryLink] = useState(false);
  const [isLoadingDeliveryLink, setIsLoadingDeliveryLink] = useState(false);
  const [isSendingDeliveryWhatsApp, setIsSendingDeliveryWhatsApp] = useState(false);
  const [isSendingInvoiceWhatsApp, setIsSendingInvoiceWhatsApp] = useState(false);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [billingNotes, setBillingNotes] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState<{ name: string; type: string; data: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails] = useState<PlacedOrderDetails | null>(null);
  const [completedOrderPopup, setCompletedOrderPopup] = useState<CompletedSale | null>(null);
  const [completedSales, setCompletedSales] = useState<CompletedSale[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<RecentPurchase | null>(null);
  const [isPurchasesLoading, setIsPurchasesLoading] = useState(false);
  const [purchaseAction, setPurchaseAction] = useState('');
  const lastPatientSearchMobileRef = useRef('');

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const deliveryClinics = useMemo(
    () =>
      (clinicLocations || []).filter(
        (clinic): clinic is Location & { lat: number; lon: number } =>
          typeof clinic.lat === 'number' && typeof clinic.lon === 'number'
      ),
    [clinicLocations]
  );
  const deliveryCoords = useMemo(() => {
    const lat = Number(deliveryDetails.latitude);
    const lon = Number(deliveryDetails.longitude);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
  }, [deliveryDetails.latitude, deliveryDetails.longitude]);
  const nearestDeliveryClinic = useMemo(() => {
    if (!deliveryCoords || deliveryClinics.length === 0) return null;
    return deliveryClinics
      .map((clinic) => ({
        clinic,
        distanceKm: distanceInKm(deliveryCoords, { lat: clinic.lat, lon: clinic.lon }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  }, [deliveryClinics, deliveryCoords]);
  const isBeyondDeliveryRadius = Boolean(nearestDeliveryClinic && nearestDeliveryClinic.distanceKm > 5);
  const totals = useMemo(() => {
    const gross = items.reduce((sum, item) => sum + itemUnitPrice(item) * item.quantity, 0);
    const net = items.reduce((sum, item) => sum + itemNetAmount(item), 0);
    const gst = items.reduce((sum, item) => sum + itemGstAmount(item), 0);
    const taxable = net - gst;
    const deliveryCharge =
      deliveryType === 'delivery'
        ? isBeyondDeliveryRadius
          ? Math.max(0, Number(manualDeliveryCharge) || 0)
          : net >= 1000
            ? 0
            : 30
        : 0;
    return { gross, discount: gross - net, taxable, gst, net, deliveryCharge, payable: net + deliveryCharge };
  }, [deliveryType, isBeyondDeliveryRadius, items, manualDeliveryCharge]);

  useEffect(() => {
    const savedDraft = window.sessionStorage.getItem(billingDraftStorageKey);
    if (!savedDraft) return;

    try {
      const draft = JSON.parse(savedDraft);
      if (typeof draft.mobile === 'string') setMobile(draft.mobile);
      if (Array.isArray(draft.patients)) setPatients(draft.patients);
      if (typeof draft.selectedPatientId === 'string') setSelectedPatientId(draft.selectedPatientId);
      if (typeof draft.hasPatientSearchFailed === 'boolean') setHasPatientSearchFailed(draft.hasPatientSearchFailed);
      if (typeof draft.isAddingPatient === 'boolean') setIsAddingPatient(draft.isAddingPatient);
      if (Array.isArray(draft.evitalRxPatients)) setEvitalRxPatients(draft.evitalRxPatients);
      if (typeof draft.selectedEvitalRxPatientId === 'string') setSelectedEvitalRxPatientId(draft.selectedEvitalRxPatientId);
      if (draft.registration && typeof draft.registration === 'object') {
        setRegistration((current) => ({ ...current, ...draft.registration }));
      }
      if (Array.isArray(draft.items)) setItems(draft.items);
      if (draft.deliveryType === 'delivery' || draft.deliveryType === 'pickup') setDeliveryType(draft.deliveryType);
      if (paymentModes.some((mode) => mode.value === draft.paymentStatus)) setPaymentStatus(draft.paymentStatus);
      if (draft.deliveryDetails && typeof draft.deliveryDetails === 'object') {
        setDeliveryDetails((current) => ({ ...current, ...draft.deliveryDetails }));
      }
      if (typeof draft.manualDeliveryCharge === 'string') setManualDeliveryCharge(draft.manualDeliveryCharge);
      if (
        draft.deliveryLink &&
        typeof draft.deliveryLink === 'object' &&
        typeof draft.deliveryLink.expiresAt === 'number' &&
        draft.deliveryLink.expiresAt > Date.now()
      ) {
        setDeliveryLink(draft.deliveryLink);
      }
      if (typeof draft.doctorName === 'string') setDoctorName(draft.doctorName);
      if (typeof draft.prescriptionNotes === 'string') setPrescriptionNotes(draft.prescriptionNotes);
      if (typeof draft.billingNotes === 'string') setBillingNotes(draft.billingNotes);
      if (draft.prescriptionImage) setPrescriptionImage(draft.prescriptionImage);
      if (draft.placedOrderDetails && typeof draft.placedOrderDetails === 'object') setPlacedOrderDetails(draft.placedOrderDetails);
      if (Array.isArray(draft.batchOptionsByMedicineId)) {
        setBatchOptionsByMedicineId(new Map(draft.batchOptionsByMedicineId));
      }
    } catch {
      window.sessionStorage.removeItem(billingDraftStorageKey);
    }
  }, []);

  useEffect(() => {
    const draft = {
      mobile,
      patients,
      selectedPatientId,
      hasPatientSearchFailed,
      isAddingPatient,
      evitalRxPatients,
      selectedEvitalRxPatientId,
      registration,
      items,
      deliveryType,
      paymentStatus,
      deliveryDetails,
      manualDeliveryCharge,
      deliveryLink,
      doctorName,
      prescriptionNotes,
      billingNotes,
      prescriptionImage,
      placedOrderDetails,
      batchOptionsByMedicineId: Array.from(batchOptionsByMedicineId.entries()),
    };
    window.sessionStorage.setItem(billingDraftStorageKey, JSON.stringify(draft));
  }, [
    mobile,
    patients,
    selectedPatientId,
    hasPatientSearchFailed,
    isAddingPatient,
    evitalRxPatients,
    selectedEvitalRxPatientId,
    registration,
    items,
    deliveryType,
    paymentStatus,
    deliveryDetails,
    manualDeliveryCharge,
    deliveryLink,
    doctorName,
    prescriptionNotes,
    billingNotes,
    prescriptionImage,
    placedOrderDetails,
    batchOptionsByMedicineId,
  ]);

  useEffect(() => {
    fetch('/api/staff/session', { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        setIsAuthenticated(response.ok);
        if (response.ok) {
          const body = await response.json().catch(() => null);
          setStaffName(body?.staff?.name || body?.staff?.mobile || '');
          setStaffMobile(body?.staff?.mobile || '');
          setSessionExpiresAt(body?.expiresAt || null);
        } else {
          setSessionExpiresAt(null);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
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
      setAuthStep('mobile');
      toast.info('Staff session expired. Sign in again to continue this order.');
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, sessionExpiresAt]);

  useEffect(() => {
    if (!deliveryLink?.url) {
      setDeliveryQrDataUrl('');
      return;
    }

    let cancelled = false;
    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(deliveryLink.url, {
          margin: 1,
          width: 220,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setDeliveryQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setDeliveryQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [deliveryLink?.url]);

  useEffect(() => {
    const normalizedMobile = normalizeMobile(mobile);
    if (normalizedMobile.length < 10) {
      lastPatientSearchMobileRef.current = '';
      setPatients([]);
      setSelectedPatientId('');
      setHasPatientSearchFailed(false);
      setIsAddingPatient(false);
      return undefined;
    }
    if (!/^[6-9]\d{9}$/.test(normalizedMobile) || normalizedMobile === lastPatientSearchMobileRef.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      lastPatientSearchMobileRef.current = normalizedMobile;
      void searchPatients();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [mobile]);

  useEffect(() => {
    const query = medicineQuery.trim();
    if (query.length < 3) {
      setMedicineResults([]);
      setIsMedicineSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setIsMedicineSearching(true);
      searchPharmacyMedicines(query)
        .then((results) => {
          if (!cancelled) {
            setMedicineResults(results);
            setBatchOptionsByMedicineId((current) => {
              const next = new Map(current);
              results.forEach((medicine) => {
                const medicineId = medicine.medicineId || medicine.id;
                const options = next.get(medicineId) || [];
                if (!options.some((option) => option.id === medicine.id)) options.push(medicine);
                next.set(
                  medicineId,
                  options.sort((a, b) => {
                    const aStocked = isStockedMedicine(a) ? 1 : 0;
                    const bStocked = isStockedMedicine(b) ? 1 : 0;
                    if (aStocked !== bStocked) return bStocked - aStocked;
                    return (b.stockQuantity || 0) - (a.stockQuantity || 0);
                  })
                );
              });
              return next;
            });
          }
        })
        .catch((error) => {
          if (!cancelled) toast.error(error instanceof Error ? error.message : 'Medicine search failed.');
        })
        .finally(() => {
          if (!cancelled) setIsMedicineSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [medicineQuery]);

  const logout = async () => {
    await fetch('/api/staff/logout', { method: 'POST' }).catch(() => null);
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
    setAuthStep('mobile');
    setStaffOtp('');
  };

  const sendStaffOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedMobile = normalizeMobile(staffMobile);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      toast.error('Enter a valid 10-digit staff mobile number.');
      return;
    }

    setIsSendingStaffOtp(true);
    try {
      const response = await fetch('/api/staff/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to send OTP.');
      setStaffMobile(normalizedMobile);
      setAuthStep('otp');
      toast.success('OTP sent successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send OTP.');
    } finally {
      setIsSendingStaffOtp(false);
    }
  };

  const verifyStaffOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (staffOtp.length !== 4) {
      toast.error('Enter the 4-digit OTP.');
      return;
    }

    setIsVerifyingStaffOtp(true);
    try {
      const response = await fetch('/api/staff/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: staffMobile, otp: staffOtp }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Unable to verify OTP.');
      setIsAuthenticated(true);
      setStaffName(body?.staff?.name || body?.staff?.mobile || staffName);
      setStaffMobile(body?.staff?.mobile || staffMobile);
      setSessionExpiresAt(body?.expiresAt || Math.floor(Date.now() / 1000) + 30 * 60);
      setStaffOtp('');
      toast.success('Staff access verified. You can continue this order.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify OTP.');
    } finally {
      setIsVerifyingStaffOtp(false);
    }
  };

  const requireStaffLogin = () => {
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
    setAuthStep('mobile');
    toast.info('Staff session expired. Sign in again to continue this order.');
  };

  const searchPatients = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const normalizedMobile = normalizeMobile(mobile);
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }

    setMobile(normalizedMobile);
    setIsPatientSearching(true);
    setPatients([]);
    setSelectedPatientId('');
    setDeliveryLink(null);
    setPlacedOrderDetails(null);
    setEvitalRxPatients([]);
    setSelectedEvitalRxPatientId('');
    setHasPatientSearchFailed(false);
    setIsAddingPatient(false);
    try {
      const response = await fetch(`/api/staff/pharmacy-patients?mobile=${encodeURIComponent(normalizedMobile)}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        lastPatientSearchMobileRef.current = '';
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to find patients.');
      const nextPatients = Array.isArray(body?.patients) ? body.patients : [];
      setPatients(nextPatients);
      if (nextPatients[0]) setSelectedPatientId(nextPatients[0].id);
      setHasPatientSearchFailed(!nextPatients.length);
      if (!nextPatients.length) toast.info('No Eka patient found. Register the patient to continue.');
      if (nextPatients.length) void searchEvitalRxPatients(normalizedMobile);
    } catch (error) {
      lastPatientSearchMobileRef.current = '';
      setHasPatientSearchFailed(false);
      toast.error(error instanceof Error ? error.message : 'Unable to find patients.');
    } finally {
      setIsPatientSearching(false);
    }
  };

  const searchEvitalRxPatients = async (mobileValue = normalizeMobile(mobile)) => {
    if (!/^[6-9]\d{9}$/.test(mobileValue)) {
      toast.error('Enter a valid 10-digit mobile number before searching eVitalRx.');
      return;
    }

    setIsEvitalRxSearching(true);
    setEvitalRxPatients([]);
    setSelectedEvitalRxPatientId('');
    try {
      const response = await fetch(`/api/staff/evitalrx-patient-search?mobile=${encodeURIComponent(mobileValue)}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to search eVitalRx patients.');
      const matches = Array.isArray(body?.patients) ? body.patients : [];
      setEvitalRxPatients(matches);
      setSelectedEvitalRxPatientId(matches[0]?.id || '');
      if (!matches.length) toast.info('No eVitalRx customer found for this mobile.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to search eVitalRx patients.');
    } finally {
      setIsEvitalRxSearching(false);
    }
  };

  const mapEvitalRxPatient = async () => {
    if (!selectedPatient) {
      toast.error('Select an Eka patient before mapping.');
      return;
    }
    if (!selectedEvitalRxPatientId) {
      toast.error('Select an eVitalRx customer to map.');
      return;
    }

    setIsMappingEvitalRxPatient(true);
    try {
      const response = await fetch('/api/staff/evitalrx-patient-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          evitalRxPatientId: selectedEvitalRxPatientId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to map eVitalRx patient.');
      setPatients((current) =>
        current.map((patient) =>
          patient.id === selectedPatient.id
            ? { ...patient, evitalRxPatientId: body?.evitalRxPatientId || selectedEvitalRxPatientId }
            : patient
        )
      );
      toast.success('eVitalRx customer mapped to the selected Eka patient.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to map eVitalRx patient.');
    } finally {
      setIsMappingEvitalRxPatient(false);
    }
  };

  const registerPatient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedMobile = normalizeMobile(mobile);
    setIsRegistering(true);
    try {
      const response = await fetch('/api/staff/pharmacy-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registration,
          mobile: normalizedMobile,
          age: Number(registration.age),
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to register patient.');
      const patient = body.patient as StaffPatient;
      setPatients((current) => [patient, ...current.filter((item) => item.id !== patient.id)]);
      setSelectedPatientId(patient.id);
      setDeliveryLink(null);
      setPlacedOrderDetails(null);
      setHasPatientSearchFailed(false);
      setIsAddingPatient(false);
      setRegistration({ name: '', age: '', ageUnit: 'years', gender: 'M', relationship: 'Self', email: '' });
      toast.success('Patient registered in Eka.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to register patient.');
    } finally {
      setIsRegistering(false);
    }
  };

  const addMedicine = (medicine: PharmacyMedicine) => {
    if (!isStockedMedicine(medicine)) {
      toast.info('This item is not in stock. Search alternatives instead.');
      return;
    }

    const quantityUnit = medicine.saleUnit || 'unit';
    setItems((current) => {
      const existing = current.find((item) => item.id === medicine.id);
      if (existing) {
        return current.map((item) =>
          item.id === medicine.id
            ? { ...item, quantity: Math.min(maxQuantityForStock(item), item.quantity + 1) }
            : item
        );
      }
      return [...current, { ...medicine, quantity: 1, quantityUnit, discountPercentage: 0 }];
    });
    setMedicineQuery('');
    setMedicineResults([]);
  };

  const selectMedicineFromSearch = (medicine: PharmacyMedicine) => {
    if (!isStockedMedicine(medicine)) {
      void searchAlternatives(medicine);
      return;
    }
    addMedicine(medicine);
  };

  const updateItem = (id: string, patch: Partial<BillingItem>) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        return {
          ...next,
          quantity: Math.min(maxQuantityForStock(next), Math.max(1, Number(next.quantity) || 1)),
          discountPercentage: clampDiscountPercentage(next, next.discountPercentage),
        };
      })
    );
  };

  const updateItemQuantity = (id: string, requestedQuantity: number) => {
    const normalizedQuantity = Math.max(1, Math.round(Number(requestedQuantity) || 1));
    setItems((current) => {
      const itemIndex = current.findIndex((item) => item.id === id);
      const item = current[itemIndex];
      if (!item) return current;

      const currentBatchMax = maxQuantityForStock(item);
      if (normalizedQuantity <= currentBatchMax) {
        return current.map((currentItem) =>
          currentItem.id === id ? { ...currentItem, quantity: normalizedQuantity } : currentItem
        );
      }

      let remainder = normalizedQuantity - currentBatchMax;
      const nextItems = current.map((currentItem) =>
        currentItem.id === id ? { ...currentItem, quantity: currentBatchMax } : currentItem
      );
      const medicineId = item.medicineId || item.id;
      const batchOptions = (batchOptionsByMedicineId.get(medicineId) || [])
        .filter((option) => option.id !== item.id && isStockedMedicine(option));

      for (const option of batchOptions) {
        if (remainder <= 0) break;
        const quantityUnit = item.quantityUnit || option.saleUnit || 'unit';
        const optionAsItem: BillingItem = {
          ...option,
          quantityUnit,
          quantity: 1,
          discountPercentage: item.discountPercentage,
        };
        const optionMax = maxQuantityForStock(optionAsItem);
        const allocatedQuantity = Math.min(optionMax, remainder);
        const existingIndex = nextItems.findIndex((currentItem) => currentItem.id === option.id);

        if (existingIndex >= 0) {
          const existingItem = nextItems[existingIndex];
          const existingMax = maxQuantityForStock(existingItem);
          const availableOnExistingLine = Math.max(0, existingMax - existingItem.quantity);
          const existingAllocation = Math.min(availableOnExistingLine, remainder);
          nextItems[existingIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + existingAllocation,
            discountPercentage: clampDiscountPercentage(existingItem, item.discountPercentage),
          };
          remainder -= existingAllocation;
        } else if (allocatedQuantity > 0) {
          nextItems.splice(itemIndex + 1, 0, {
            ...optionAsItem,
            quantity: allocatedQuantity,
            discountPercentage: clampDiscountPercentage(optionAsItem, item.discountPercentage),
          });
          remainder -= allocatedQuantity;
        }
      }

      return nextItems;
    });
  };

  const selectBatch = (currentItemId: string, nextMedicineId: string) => {
    const currentItem = items.find((item) => item.id === currentItemId);
    if (!currentItem) return;

    const options = batchOptionsByMedicineId.get(currentItem.medicineId || currentItem.id) || [];
    const selectedBatch = options.find((medicine) => medicine.id === nextMedicineId);
    if (!selectedBatch) return;

    setItems((current) =>
      current.map((item) =>
        item.id === currentItemId
          ? {
              ...selectedBatch,
              quantityUnit: item.quantityUnit || selectedBatch.saleUnit || 'unit',
              quantity: Math.min(
                item.quantity,
                maxQuantityForStock({
                  ...selectedBatch,
                  quantityUnit: item.quantityUnit || selectedBatch.saleUnit || 'unit',
                })
              ),
              discountPercentage: clampDiscountPercentage(
                {
                  ...selectedBatch,
                  quantityUnit: item.quantityUnit || selectedBatch.saleUnit || 'unit',
                },
                item.discountPercentage
              ),
            }
          : item
      )
    );
    setActiveQuantityItemId(nextMedicineId);
  };

  const searchAlternatives = async (medicine: PharmacyMedicine) => {
    const alternativeQuery = medicine.composition || medicine.name;
    if (!alternativeQuery.trim()) return;
    setMedicineQuery(alternativeQuery);
    setIsMedicineSearching(true);
    try {
      const results = await searchPharmacyMedicines(alternativeQuery);
      setMedicineResults(results);
      if (!results.some(isStockedMedicine)) toast.info('No stocked alternatives found.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to find alternatives.');
    } finally {
      setIsMedicineSearching(false);
    }
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handlePrescriptionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast.error('Choose a JPG, PNG, or WebP prescription image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Choose an image smaller than 8 MB.');
      return;
    }
    try {
      setPrescriptionImage(await fileToPrescriptionImage(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to read prescription image.');
    }
  };

  const createDeliveryLink = async () => {
    if (!selectedPatient) {
      toast.error('Select or register a patient first.');
      return;
    }

    setIsCreatingDeliveryLink(true);
    try {
      const response = await fetch('/api/staff/pharmacy-delivery-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          patientMobile: selectedPatient.mobile || mobile,
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to create delivery link.');
      setDeliveryLink({ token: body.token, url: body.url, expiresAt: body.expiresAt });
      toast.success('Delivery link created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create delivery link.');
    } finally {
      setIsCreatingDeliveryLink(false);
    }
  };

  const refreshDeliveryLink = async () => {
    setDeliveryLink(null);
    await createDeliveryLink();
  };

  const ensureFreshDeliveryLink = async () => {
    if (!deliveryLink?.token || deliveryLink.expiresAt <= Date.now()) {
      await refreshDeliveryLink();
      return;
    }

    try {
      const response = await fetch(`/api/staff/pharmacy-delivery-link?token=${encodeURIComponent(deliveryLink.token)}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok || body?.record?.submittedAt) {
        await refreshDeliveryLink();
      }
    } catch {
      await refreshDeliveryLink();
    }
  };

  const openDeliveryLinkModal = async () => {
    setIsDeliveryLinkOpen(true);
    await ensureFreshDeliveryLink();
  };

  const copyDeliveryLink = async () => {
    if (!deliveryLink?.url) return;
    await navigator.clipboard?.writeText(deliveryLink.url).catch(() => null);
    toast.success('Delivery link copied.');
  };

  const openWhatsAppDeliveryLink = () => {
    if (!deliveryLink?.url || !selectedPatient) return;
    const recipient = normalizeMobile(selectedPatient.mobile || mobile);
    const text = encodeURIComponent(
      `Docty Pharmacy: Please add your delivery address/location and prescription here: ${deliveryLink.url}`
    );
    window.open(`https://wa.me/91${recipient}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const sendDeliveryLinkWhatsAppApi = async () => {
    if (!deliveryLink?.token) return;
    setIsSendingDeliveryWhatsApp(true);
    try {
      const response = await fetch('/api/staff/pharmacy-delivery-link-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: deliveryLink.token }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to send WhatsApp message.');
      toast.success('Delivery link sent on WhatsApp.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send WhatsApp message.');
    } finally {
      setIsSendingDeliveryWhatsApp(false);
    }
  };

  const applyDeliveryLinkResponse = async () => {
    if (!deliveryLink?.token) {
      toast.error('Create a delivery link first.');
      return;
    }

    setIsLoadingDeliveryLink(true);
    try {
      const response = await fetch(`/api/staff/pharmacy-delivery-link?token=${encodeURIComponent(deliveryLink.token)}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to load delivery details.');
      const delivery = body?.record?.delivery;
      if (!delivery) {
        toast.info('Patient has not submitted delivery details yet.');
        return;
      }
      setDeliveryDetails({
        address: delivery.address || '',
        area: delivery.area || '',
        city: delivery.city || 'Hyderabad',
        pincode: delivery.pincode || '',
        landmark: delivery.landmark || '',
        latitude: typeof delivery.latitude === 'number' ? String(delivery.latitude) : '',
        longitude: typeof delivery.longitude === 'number' ? String(delivery.longitude) : '',
      });
      if (delivery.prescriptionImage) setPrescriptionImage(delivery.prescriptionImage);
      setDeliveryType('delivery');
      setManualDeliveryCharge((current) => current || '30');
      setDeliveryLink(null);
      setIsDeliveryLinkOpen(false);
      toast.success('Delivery details added to this order.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load delivery details.');
    } finally {
      setIsLoadingDeliveryLink(false);
    }
  };

  const currentBillDateText = () =>
    new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

  const currentBillNo = () => `DP-${new Date().toISOString().replace(/\D/g, '').slice(2, 14)}`;

  const invoiceNumberText = () => placedOrderDetails?.invoiceNumber || placedOrderDetails?.orderNumber || currentBillNo();

  const gstNumberText = () => placedOrderDetails?.gstNumber || '36AAHCD7944A1ZQ';

  const storeNameText = () => placedOrderDetails?.storeName || 'Docty.Pharmacy';

  const storeAddressText = () => placedOrderDetails?.storeAddress || 'Hyderabad';

  const paymentModeText = () => paymentModes.find((mode) => mode.value === paymentStatus)?.label || 'UPI';

  const isFinalBill = () => Boolean(placedOrderDetails?.invoiceNumber || placedOrderDetails?.orderNumber || placedOrderDetails?.orderId);

  const documentStatusText = () => (isFinalBill() ? 'Final' : 'Draft');

  const deliveryAddressText = () =>
    [
      deliveryDetails.address,
      deliveryDetails.area,
      deliveryDetails.city,
      deliveryDetails.pincode,
      deliveryDetails.landmark,
    ]
      .filter(Boolean)
      .join(', ');

  const panNumberText = () => gstNumberText().length >= 12 ? gstNumberText().slice(2, 12) : 'AAHCD7944A';

  const reorderUrl = () => {
    const orderReference = placedOrderDetails?.orderId || placedOrderDetails?.orderNumber || placedOrderDetails?.invoiceNumber || invoiceNumberText();
    return orderReference ? `${window.location.origin}/pharmacy/${encodeURIComponent(orderReference)}` : '';
  };

  const printBill = async () => {
    if (!selectedPatient) {
      toast.error('Select or register a patient before printing.');
      return;
    }
    if (!items.length) {
      toast.error('Add medicines before printing the bill.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=760,height=900');
    if (!printWindow) {
      toast.error('Allow popups to print the bill.');
      return;
    }

    const billNo = invoiceNumberText();
    const billedAt = currentBillDateText();
    const documentStatus = documentStatusText();
    const reorderLink = reorderUrl();
    const reorderQrDataUrl = reorderLink
      ? await import('qrcode')
          .then((QRCode) =>
            QRCode.toDataURL(reorderLink, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 112,
            })
          )
          .catch(() => '')
      : '';
    const itemRows = items
      .map((item, index) => {
        const gstPercentage = itemGstPercentage(item);
        const packLabel = receiptPackLabel(item);
        return `
          <tr class="item-start">
            <td colspan="4" class="item-name">${index + 1}. ${escapeHtml(item.name)}${packLabel ? ` (${escapeHtml(packLabel)})` : ''}</td>
          </tr>
          <tr class="muted">
            <td colspan="4">Batch ${escapeHtml(displayBatch(item))} | Exp ${escapeHtml(displayExpiry(item.expiry))}</td>
          </tr>
          <tr class="item-values">
            <td>${escapeHtml(receiptQuantityLabel(item))}</td>
            <td class="right">${escapeHtml(formatReceiptMoney(itemUnitPrice(item)))}</td>
            <td class="right">${Number(item.discountPercentage || 0).toFixed(1)}%</td>
            <td class="right">${escapeHtml(formatReceiptMoney(itemNetAmount(item)))}</td>
          </tr>
          <tr class="muted">
            <td colspan="4">GST ${gstPercentage.toFixed(1)}% | Taxable ${escapeHtml(formatReceiptMoney(itemTaxableAmount(item)))} | GST ${escapeHtml(formatReceiptMoney(itemGstAmount(item)))}</td>
          </tr>
        `;
      })
      .join('');
    const deliveryAddress = deliveryAddressText();
    const cgstAmount = totals.gst / 2;
    const sgstAmount = totals.gst / 2;
    const footerTaxText = [
      gstNumberText() ? `GSTIN: ${gstNumberText()}` : '',
      `PAN: ${panNumberText()}`,
      'LICENSE: 20',
    ].filter(Boolean).join('<br />');

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(`${documentStatus} ${billNo}`)}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #eef2f7;
              color: #000;
              font-family: "Courier New", monospace;
              font-size: 11px;
              line-height: 1.25;
              min-height: 100vh;
              padding: 24px 0;
            }
            .receipt {
              width: 74mm;
              margin: 0 auto;
              padding: 4mm;
              background: #fff;
              box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
              transform: scale(1.72);
              transform-origin: top center;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 700; }
            .brand { font-size: 16px; font-weight: 700; }
            .brand-row { display: flex; align-items: center; justify-content: center; gap: 6px; }
            .logo-full { width: 68mm; max-width: 100%; height: auto; object-fit: contain; }
            .status { margin-top: 4px; font-size: 13px; font-weight: 700; letter-spacing: 1px; }
            .draft { border: 1px solid #000; display: inline-block; padding: 2px 8px; }
            .muted { color: #333; font-size: 10px; }
            .rule { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { border-bottom: 1px dashed #000; font-size: 10px; font-weight: 700; padding: 3px 0; }
            td { padding: 2px 0; vertical-align: top; }
            .item-start td { border-top: 1px dotted #aaa; padding-top: 6px; }
            .item-start:first-child td { border-top: 0; padding-top: 2px; }
            .item-name { font-weight: 700; line-height: 1.3; }
            .item-subhead td { padding-top: 4px; color: #333; font-size: 9px; font-weight: 700; }
            .item-values td { font-weight: 700; padding-bottom: 3px; }
            .totals td { padding: 2px 0; }
            .footer { margin-top: 10px; text-align: center; font-size: 10px; }
            .bill-footer { display: grid; grid-template-columns: 1fr 78px; gap: 8px; align-items: center; }
            .footer-tax { text-align: left; font-size: 9px; line-height: 1.35; }
            .qr { text-align: center; font-size: 9px; }
            .qr img { height: 66px; width: 66px; }
            @media print {
              html, body { width: 80mm; background: #fff; padding: 0; }
              .receipt { width: 74mm; padding: 2mm 0; box-shadow: none; transform: none; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <img class="logo-full" src="/docty-pharmacy-logo.svg" alt="Docty.Pharmacy" />
              <div class="muted">${escapeHtml(storeAddressText())}</div>
              <div class="muted">M 9989804888</div>
              <div class="status ${documentStatus === 'Draft' ? 'draft' : ''}">${escapeHtml(documentStatus.toUpperCase())} BILL</div>
            </div>
            <div class="rule"></div>
            <table>
              <tr><td>Invoice</td><td class="right">${escapeHtml(billNo)}</td></tr>
              <tr><td>Date</td><td class="right">${escapeHtml(billedAt)}</td></tr>
              <tr><td>Patient</td><td class="right">${escapeHtml(selectedPatient.name)}</td></tr>
              <tr><td>Mobile</td><td class="right">+91 ${escapeHtml(selectedPatient.mobile || mobile)}</td></tr>
              <tr><td>Payment</td><td class="right">${escapeHtml(paymentModeText())}</td></tr>
              <tr><td>Type</td><td class="right">${deliveryType === 'delivery' ? 'Delivery' : 'Pickup'}</td></tr>
            </table>
            ${
              deliveryType === 'delivery' && deliveryAddress
                ? `<div class="rule"></div><div class="bold">Delivery</div><div>${escapeHtml(deliveryAddress)}</div>`
                : ''
            }
            <div class="rule"></div>
            <table>
              <thead>
                <tr>
                  <th colspan="4" class="left">Item Details</th>
                </tr>
                <tr>
                  <th>Qty</th>
                  <th class="right">Rate</th>
                  <th class="right">Disc</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div class="rule"></div>
            <table class="totals">
              <tr><td>Gross</td><td class="right">${escapeHtml(formatReceiptMoney(totals.gross))}</td></tr>
              <tr><td>Discount</td><td class="right">${escapeHtml(formatReceiptMoney(totals.discount))}</td></tr>
              <tr><td>Taxable</td><td class="right">${escapeHtml(formatReceiptMoney(totals.taxable))}</td></tr>
              <tr><td>CGST</td><td class="right">${escapeHtml(formatReceiptMoney(cgstAmount))}</td></tr>
              <tr><td>SGST</td><td class="right">${escapeHtml(formatReceiptMoney(sgstAmount))}</td></tr>
              <tr><td>Total GST</td><td class="right">${escapeHtml(formatReceiptMoney(totals.gst))}</td></tr>
              <tr><td>Medicines</td><td class="right">${escapeHtml(formatReceiptMoney(totals.net))}</td></tr>
              ${
                deliveryType === 'delivery'
                  ? `<tr><td>Delivery</td><td class="right">${totals.deliveryCharge ? escapeHtml(formatReceiptMoney(totals.deliveryCharge)) : 'Free'}</td></tr>`
                  : ''
              }
              <tr class="bold"><td>Net Payable</td><td class="right">${escapeHtml(formatReceiptMoney(totals.payable))}</td></tr>
            </table>
            <div class="rule"></div>
            <div class="bill-footer">
              <div class="footer-tax">${footerTaxText}</div>
              ${reorderQrDataUrl ? `<div class="qr"><img src="${reorderQrDataUrl}" alt="Reorder QR" /><div class="bold">Reorder</div></div>` : '<div></div>'}
            </div>
            <div class="rule"></div>
            <div class="footer">
              Thank you<br />
              Prescription validation, availability and substitutions are confirmed by Docty Pharmacy.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const sendInvoiceWhatsApp = async () => {
    if (!selectedPatient) {
      toast.error('Select or register a patient before sending the invoice.');
      return;
    }
    if (!items.length) {
      toast.error('Add medicines before sending the invoice.');
      return;
    }

    setIsSendingInvoiceWhatsApp(true);
    try {
      const billNo = invoiceNumberText();
      const billDate = currentBillDateText();
      const documentStatus = documentStatusText();
      const response = await fetch('/api/staff/pharmacy-invoice-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNo,
          billDate,
          documentStatus,
          patientName: selectedPatient.name,
          mobile: selectedPatient.mobile || mobile,
          brandName: 'Docty.Pharmacy',
          storeName: storeNameText(),
          storeAddress: storeAddressText(),
          gstNumber: gstNumberText(),
          panNumber: panNumberText(),
          licenseNumber: '20',
          orderId: placedOrderDetails?.orderId || '',
          fulfillment: deliveryType === 'delivery' ? 'Delivery' : 'Pickup',
          paymentMethod: paymentModeText(),
          reorderUrl: reorderUrl(),
          deliveryAddress: deliveryType === 'delivery' ? deliveryAddressText() : '',
          notes: billingNotes,
          totals,
          items: items.map((item) => ({
            name: item.name,
            batch: displayBatch(item),
            expiry: displayExpiry(item.expiry),
            quantity: item.quantity,
            unit: item.quantityUnit || item.saleUnit || 'unit',
            quantityUnit: item.quantityUnit,
            saleUnit: item.saleUnit,
            packSize: item.packSize,
            packUnitCount: item.packUnitCount,
            rate: itemUnitPrice(item),
            discount: item.discountPercentage || 0,
            gstPercentage: itemGstPercentage(item),
            taxableAmount: itemTaxableAmount(item),
            gstAmount: itemGstAmount(item),
            amount: itemNetAmount(item),
          })),
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to send invoice on WhatsApp.');
      toast.success('Invoice PDF sent on WhatsApp.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send invoice on WhatsApp.');
    } finally {
      setIsSendingInvoiceWhatsApp(false);
    }
  };

  const loadRecentPurchases = async () => {
    if (!selectedPatient?.evitalRxPatientId) {
      toast.error('eVitalRx Patient ID is required to search recent purchases.');
      return;
    }

    setIsPurchasesLoading(true);
    try {
      const query = new URLSearchParams({ evitalRxPatientId: selectedPatient.evitalRxPatientId });
      const response = await fetch(`/api/staff/pharmacy-purchases?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to load recent purchases.');
      const orders = Array.isArray(body?.orders) ? body.orders : [];
      setRecentPurchases(orders);
      if (!orders.length) toast.info('No recent pharmacy purchases found.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load recent purchases.');
    } finally {
      setIsPurchasesLoading(false);
    }
  };

  const printRecentPurchase = async (order: RecentPurchase) => {
    if (!selectedPatient) return;
    const orderId = purchaseOrderId(order);
    if (!orderId) {
      toast.error('Order ID is missing for this purchase.');
      return;
    }

    setPurchaseAction(`print-${orderId}`);
    try {
      const query = new URLSearchParams({
        orderId,
        patientName: selectedPatient.name,
        patientMobile: selectedPatient.mobile || mobile,
        evitalRxPatientId: selectedPatient.evitalRxPatientId || '',
        disposition: 'inline',
      });
      const response = await fetch(`/api/staff/pharmacy-purchase-invoice?${query.toString()}`, {
        headers: { Accept: 'application/pdf' },
      });
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Unable to open purchase invoice.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open purchase invoice.');
    } finally {
      setPurchaseAction('');
    }
  };

  const sendRecentPurchaseWhatsApp = async (order: RecentPurchase) => {
    if (!selectedPatient) return;
    const orderId = purchaseOrderId(order);
    if (!orderId) {
      toast.error('Order ID is missing for this purchase.');
      return;
    }

    setPurchaseAction(`whatsapp-${orderId}`);
    try {
      const response = await fetch('/api/staff/pharmacy-purchase-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          patientName: selectedPatient.name,
          patientMobile: selectedPatient.mobile || mobile,
          recipientMobile: selectedPatient.mobile || mobile,
          evitalRxPatientId: selectedPatient.evitalRxPatientId || '',
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to send purchase invoice on WhatsApp.');
      toast.success('Purchase invoice sent on WhatsApp.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send purchase invoice on WhatsApp.');
    } finally {
      setPurchaseAction('');
    }
  };

  const printCompletedSale = async (sale: CompletedSale) => {
    const orderId = sale.details.orderId || sale.details.orderNumber || sale.details.invoiceNumber;
    if (!orderId) {
      toast.error('Order ID is missing for this sale.');
      return;
    }

    setPurchaseAction(`print-completed-${sale.id}`);
    try {
      const query = new URLSearchParams({
        orderId,
        patientName: sale.patientName,
        patientMobile: sale.patientMobile,
        evitalRxPatientId: sale.evitalRxPatientId,
        disposition: 'inline',
      });
      const response = await fetch(`/api/staff/pharmacy-purchase-invoice?${query.toString()}`, {
        headers: { Accept: 'application/pdf' },
      });
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Unable to open sale invoice.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open sale invoice.');
    } finally {
      setPurchaseAction('');
    }
  };

  const sendCompletedSaleWhatsApp = async (sale: CompletedSale) => {
    const orderId = sale.details.orderId || sale.details.orderNumber || sale.details.invoiceNumber;
    if (!orderId) {
      toast.error('Order ID is missing for this sale.');
      return;
    }

    setPurchaseAction(`whatsapp-completed-${sale.id}`);
    try {
      const response = await fetch('/api/staff/pharmacy-purchase-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          patientName: sale.patientName,
          patientMobile: sale.patientMobile,
          recipientMobile: sale.patientMobile,
          evitalRxPatientId: sale.evitalRxPatientId,
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to send sale invoice on WhatsApp.');
      toast.success('Sale invoice sent on WhatsApp.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send sale invoice on WhatsApp.');
    } finally {
      setPurchaseAction('');
    }
  };

  const closeCompletedOrderPopup = () => {
    setCompletedOrderPopup(null);
    resetBillingState();
  };

  const resetBillingState = () => {
    window.sessionStorage.removeItem(billingDraftStorageKey);
    lastPatientSearchMobileRef.current = '';
    setMobile('');
    setPatients([]);
    setSelectedPatientId('');
    setEvitalRxPatients([]);
    setSelectedEvitalRxPatientId('');
    setHasPatientSearchFailed(false);
    setIsAddingPatient(false);
    setRegistration({ name: '', age: '', ageUnit: 'years', gender: 'M', relationship: 'Self', email: '' });
    setItems([]);
    setDeliveryType('pickup');
    setPaymentStatus('3');
    setDeliveryDetails({
      address: '',
      area: '',
      city: 'Hyderabad',
      pincode: '',
      landmark: '',
      latitude: '',
      longitude: '',
    });
    setManualDeliveryCharge('30');
    setDeliveryLink(null);
    setDeliveryQrDataUrl('');
    setIsDeliveryLinkOpen(false);
    setDoctorName('');
    setPrescriptionNotes('');
    setBillingNotes('');
    setPrescriptionImage(null);
    setPlacedOrderDetails(null);
    setCompletedOrderPopup(null);
    setRecentPurchases([]);
    setSelectedPurchase(null);
    setMedicineQuery('');
    setMedicineResults([]);
    setBatchOptionsByMedicineId(new Map());
    setActiveQuantityItemId('');
    setIsOrderDetailsOpen(false);
  };

  const pushPrescription = async () => {
    if (!selectedPatient) {
      toast.error('Select or register a patient first.');
      return;
    }
    if (
      deliveryType === 'delivery' &&
      (!deliveryDetails.address || !deliveryDetails.area || !deliveryDetails.city || !/^\d{6}$/.test(deliveryDetails.pincode))
    ) {
      toast.error('Add delivery address before placing a delivery order.');
      return;
    }

    setIsPushing(true);
    try {
      const response = await fetch('/api/staff/pharmacy-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          patientMobile: selectedPatient.mobile || mobile,
          evitalRxPatientId: selectedPatient.evitalRxPatientId || '',
          doctorName,
          prescriptionNotes,
          billingNotes,
          deliveryType,
          paymentStatus: Number(paymentStatus),
          deliveryDetails,
          prescriptionImage,
          items,
          deliveryCharge: totals.deliveryCharge,
          totalAmount: totals.payable,
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        requireStaffLogin();
        return;
      }
      if (!response.ok) throw new Error(body?.message || 'Unable to push prescription.');
      const invoiceDetails = body?.invoiceDetails || {};
      const nextPlacedOrderDetails = {
        orderId: String(body?.orderId || ''),
        orderNumber: String(body?.orderNumber || ''),
        invoiceNumber: String(invoiceDetails.invoiceNumber || body?.orderNumber || ''),
        gstNumber: String(invoiceDetails.gstNumber || ''),
        storeName: String(invoiceDetails.storeName || ''),
        storeAddress: String(invoiceDetails.storeAddress || ''),
        paymentUrl: String(invoiceDetails.paymentUrl || ''),
      };
      setPlacedOrderDetails(nextPlacedOrderDetails);
      const completedSale: CompletedSale = {
        id:
          nextPlacedOrderDetails.orderId ||
          nextPlacedOrderDetails.orderNumber ||
          nextPlacedOrderDetails.invoiceNumber ||
          `sale-${Date.now()}`,
        details: nextPlacedOrderDetails,
        patientName: selectedPatient.name,
        patientMobile: selectedPatient.mobile || mobile,
        evitalRxPatientId: body?.evitalRxPatientId || selectedPatient.evitalRxPatientId || '',
        amount: totals.payable,
        createdAt: new Date().toISOString(),
        items: items.map((item) => ({ ...item })),
      };
      setCompletedSales((current) => [completedSale, ...current].slice(0, 25));
      setCompletedOrderPopup(completedSale);
      if (body?.evitalRxPatientId) {
        setPatients((current) =>
          current.map((patient) =>
            patient.id === selectedPatient.id
              ? { ...patient, evitalRxPatientId: body.evitalRxPatientId }
              : patient
          )
        );
      }
      toast.success(
        body?.saved
          ? `eVitalRx bill ${body.billNo || body.orderNumber || body.orderId} saved with payment.`
          : body?.orderId
            ? `eVitalRx order ${body.orderId} created.`
            : 'Prescription pushed to eVitalRx.'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to push prescription.');
    } finally {
      setIsPushing(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <img src="/docty-logo-mark.png" alt="Docty" className="h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-bold">
                  <span className="text-red-600">Docty</span>
                  <span className="text-sky-600">.Pharmacy</span>
                </h1>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Search patients by mobile, register family members, review subscription status, and push prescription bills to eVitalRx.
              {staffName ? ` Signed in as ${staffName}.` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid items-stretch gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {isOrderDetailsOpen && <div className="fixed inset-0 z-30 bg-slate-950/30 xl:hidden" onClick={() => setIsOrderDetailsOpen(false)} />}
          <div
            className={`${
              isOrderDetailsOpen ? 'fixed inset-x-3 bottom-4 top-4 z-40 flex' : 'hidden'
            } xl:static xl:z-auto xl:flex`}
          >
            <Card className="flex h-full w-full flex-col overflow-hidden rounded-xl">
              <CardHeader className="shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ReceiptText className="h-5 w-5 text-primary" />
                    Order Details
                  </CardTitle>
                  <Button type="button" variant="ghost" size="icon" className="xl:hidden" onClick={() => setIsOrderDetailsOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile number</Label>
                  <div className="relative">
                    <Input
                      id="mobile"
                      value={mobile}
                      inputMode="numeric"
                      placeholder="10-digit mobile"
                      className="pr-10"
                      onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(-10))}
                    />
                    {isPatientSearching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {patients.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="push-patient">Patient</Label>
                    <div className="flex gap-2">
                      <select
                        id="push-patient"
                        className={`h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm font-semibold ${
                          hasActiveSubscription(selectedPatient) ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                        value={selectedPatientId}
                        onChange={(event) => {
                          setSelectedPatientId(event.target.value);
                          setDeliveryLink(null);
                          setPlacedOrderDetails(null);
                        }}
                      >
                        {patients.map((patient) => {
                          const isActive = hasActiveSubscription(patient);
                          return (
                            <option
                              key={patient.id}
                              value={patient.id}
                              className={isActive ? 'text-emerald-700' : 'text-slate-500'}
                            >
                              {patient.name} - {patient.relation || 'Relationship not set'} - {patient.gender || 'Gender not set'} -{' '}
                              {isActive ? 'Active' : 'Inactive'}
                            </option>
                          );
                        })}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 shrink-0 rounded-md px-3"
                        onClick={() => setIsAddingPatient((current) => !current)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add patient
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Enter a patient mobile number to continue.
                  </div>
                )}

                {(hasPatientSearchFailed || isAddingPatient) && (
                  <form className="space-y-3 rounded-lg border border-dashed bg-slate-50 p-4" onSubmit={registerPatient}>
                    <div>
                      <h2 className="font-semibold">{isAddingPatient ? 'Add Patient' : 'New Patient Registration'}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mobile number will be saved as +91 {normalizeMobile(mobile)}.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Patient name</Label>
                      <Input
                        id="register-name"
                        value={registration.name}
                        onChange={(event) => setRegistration((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-relationship">Relationship</Label>
                      <select
                        id="register-relationship"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={registration.relationship}
                        onChange={(event) => setRegistration((current) => ({ ...current, relationship: event.target.value }))}
                      >
                        {relationships.map((relationship) => (
                          <option key={relationship} value={relationship}>
                            {relationship}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="register-gender">Gender</Label>
                        <select
                          id="register-gender"
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={registration.gender}
                          onChange={(event) => setRegistration((current) => ({ ...current, gender: event.target.value }))}
                        >
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-age">Age</Label>
                        <div className="relative">
                          <Input
                            id="register-age"
                            value={registration.age}
                            inputMode="numeric"
                            onFocus={() => setIsAgeOptionsOpen(true)}
                            onBlur={() => window.setTimeout(() => setIsAgeOptionsOpen(false), 120)}
                            onChange={(event) => {
                              setRegistration((current) => ({ ...current, age: event.target.value.replace(/\D/g, '') }));
                              setIsAgeOptionsOpen(true);
                            }}
                          />
                          {isAgeOptionsOpen && registration.age && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-white shadow-lg">
                              {['years', 'months', 'days'].map((unit) => (
                                <button
                                  key={unit}
                                  type="button"
                                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                                    registration.ageUnit === unit ? 'bg-blue-100 font-semibold' : ''
                                  }`}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setRegistration((current) => ({ ...current, ageUnit: unit }));
                                    setIsAgeOptionsOpen(false);
                                  }}
                                >
                                  {ageOptionLabel(registration.age, unit)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={isRegistering}>
                      {isRegistering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      {isAddingPatient ? 'Add Patient' : 'Register Patient'}
                    </Button>
                  </form>
                )}

                {selectedPatient && (
                  <div className="space-y-3 rounded-lg border bg-white p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{selectedPatient.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          +91 {selectedPatient.mobile || mobile} · {selectedPatient.relation || 'Relationship not set'} ·{' '}
                          {selectedPatient.gender || 'Gender not set'}
                        </p>
                      </div>
                      {selectedPatient.subscription?.subscriber ? (
                        <Badge className="shrink-0 bg-emerald-600">Subscribed</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">No plan</Badge>
                      )}
                    </div>
                    {selectedPatient.subscription?.subscriber && (
                      <div className="mt-3 rounded-md bg-emerald-50 p-3 text-xs text-emerald-950">
                        <p className="font-semibold">{selectedPatient.subscription.planCode || 'Docty plan'}</p>
                        <p>
                          {displayDate(selectedPatient.subscription.startDate)} to{' '}
                          {displayDate(selectedPatient.subscription.endDate)}
                        </p>
                      </div>
                    )}
                    {selectedPatient.evitalRxPatientId && (
                      <p className="mt-3 text-xs text-muted-foreground">eVitalRx ID: {selectedPatient.evitalRxPatientId}</p>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">eVitalRx customer</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {selectedPatient.evitalRxPatientId
                              ? 'Mapped for pharmacy billing and recent purchases.'
                              : 'Search eVitalRx and map the correct pharmacy customer.'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 rounded-md"
                          onClick={() => void searchEvitalRxPatients()}
                          disabled={isEvitalRxSearching}
                        >
                          {isEvitalRxSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                          Search
                        </Button>
                      </div>
                      {evitalRxPatients.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <select
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={selectedEvitalRxPatientId}
                            onChange={(event) => setSelectedEvitalRxPatientId(event.target.value)}
                          >
                            {evitalRxPatients.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} - {candidate.id}
                                {candidate.mobileLast5 ? ` - *****${candidate.mobileLast5}` : ''}
                              </option>
                            ))}
                          </select>
                          {evitalRxPatients
                            .filter((candidate) => candidate.id === selectedEvitalRxPatientId)
                            .map((candidate) => (
                              <div key={candidate.id} className="rounded-md bg-slate-50 p-3 text-xs text-muted-foreground">
                                <p className="font-semibold text-slate-700">{candidate.name}</p>
                                <p>ID: {candidate.id}</p>
                                {candidate.maskedMobile && <p>Mobile: {candidate.maskedMobile}</p>}
                                {candidate.address && <p className="mt-1">{candidate.address}</p>}
                              </div>
                            ))}
                          <Button
                            type="button"
                            className="w-full rounded-md"
                            onClick={() => void mapEvitalRxPatient()}
                            disabled={
                              isMappingEvitalRxPatient ||
                              !selectedEvitalRxPatientId ||
                              selectedPatient.evitalRxPatientId === selectedEvitalRxPatientId
                            }
                          >
                            {isMappingEvitalRxPatient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Map selected customer
                          </Button>
                        </div>
                      )}
                      {!selectedPatient.evitalRxPatientId && evitalRxPatients.length === 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Use Search when this Eka patient does not have an eVitalRx ID.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-100 p-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Gross</p>
                    <p className="font-bold">{formatPrice(totals.gross)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-bold">{formatPrice(totals.discount)}</p>
                  </div>
                  <div className="col-span-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground">Medicines total</p>
                      <p className="font-bold">{formatPrice(totals.net)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-muted-foreground">Delivery charge</p>
                      <p className="font-bold">
                        {deliveryType === 'delivery'
                          ? totals.deliveryCharge === 0
                            ? 'Free'
                            : formatPrice(totals.deliveryCharge)
                          : '-'}
                      </p>
                    </div>
                    {deliveryType === 'delivery' && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {isBeyondDeliveryRadius
                          ? 'Beyond 5 km: delivery charge can be adjusted by the chemist.'
                          : 'Within 5 km: free delivery applies at ₹1000 and above; otherwise ₹30 is added.'}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 border-t pt-3">
                    <p className="text-muted-foreground">Net payable</p>
                    <p className="text-2xl font-bold text-primary">{formatPrice(totals.payable)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery-type">Fulfilment</Label>
                  <select
                    id="delivery-type"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={deliveryType}
                    onChange={(event) => setDeliveryType(event.target.value === 'delivery' ? 'delivery' : 'pickup')}
                  >
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-status">Payment mode</Label>
                  <select
                    id="payment-status"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={paymentStatus}
                    onChange={(event) => setPaymentStatus(event.target.value)}
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </div>

                {deliveryType === 'delivery' && (
                  <div className="rounded-lg border border-dashed bg-white p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">Delivery location</p>
                        {deliveryDetails.address ? (
                          <p className="mt-1 text-muted-foreground">
                            {[deliveryDetails.address, deliveryDetails.area, deliveryDetails.city, deliveryDetails.pincode, deliveryDetails.landmark]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        ) : (
                          <p className="mt-1 text-muted-foreground">Share a temporary link for the patient to add address, GPS, and prescription.</p>
                        )}
                        {deliveryDetails.latitude && deliveryDetails.longitude && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            GPS: {deliveryDetails.latitude}, {deliveryDetails.longitude}
                          </p>
                        )}
                        {nearestDeliveryClinic && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Nearest clinic: {nearestDeliveryClinic.clinic.name1 || nearestDeliveryClinic.clinic.area || 'Docty Clinic'} (
                            {nearestDeliveryClinic.distanceKm.toFixed(1)} km)
                          </p>
                        )}
                      </div>
                      <Button type="button" variant="outline" className="shrink-0 rounded-md" onClick={() => void openDeliveryLinkModal()}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Link
                      </Button>
                    </div>
                    {isBeyondDeliveryRadius && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <Label htmlFor="manual-delivery-charge">Delivery charge beyond 5 km</Label>
                        <Input
                          id="manual-delivery-charge"
                          value={manualDeliveryCharge}
                          inputMode="decimal"
                          onChange={(event) => setManualDeliveryCharge(event.target.value.replace(/[^\d.]/g, ''))}
                          placeholder="Enter charge"
                        />
                        <p className="text-xs text-muted-foreground">
                          This address is beyond the 5 km free-delivery radius. Chemist can adjust the final charge.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="doctor-name">Doctor name</Label>
                  <Input id="doctor-name" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescription-notes">Prescription notes</Label>
                  <Textarea id="prescription-notes" value={prescriptionNotes} onChange={(event) => setPrescriptionNotes(event.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-notes">Billing notes</Label>
                  <Textarea id="billing-notes" value={billingNotes} onChange={(event) => setBillingNotes(event.target.value)} rows={2} />
                </div>
                {placedOrderDetails && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-950">
                    <p className="font-semibold">eVitalRx order placed</p>
                    <p>
                      Invoice:{' '}
                      {placedOrderDetails.invoiceNumber ||
                        placedOrderDetails.orderNumber ||
                        placedOrderDetails.orderId ||
                        'Not available'}
                    </p>
                    {placedOrderDetails.gstNumber && <p>GST: {placedOrderDetails.gstNumber}</p>}
                    {placedOrderDetails.storeAddress && <p className="mt-1 text-emerald-900">{placedOrderDetails.storeAddress}</p>}
                  </div>
                )}
                <div className="space-y-3 rounded-lg border border-dashed bg-white p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Recent purchases</p>
                      <p className="text-xs text-muted-foreground">View, print, or WhatsApp previous pharmacy bills.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-md"
                      onClick={() => void loadRecentPurchases()}
                      disabled={isPurchasesLoading || !selectedPatient?.evitalRxPatientId}
                    >
                      {isPurchasesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Search
                    </Button>
                  </div>
                  {!selectedPatient?.evitalRxPatientId && (
                    <p className="text-xs text-muted-foreground">Select a patient with an eVitalRx Patient ID to search purchases.</p>
                  )}
                  {completedSales.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current session sales</p>
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {completedSales.map((sale) => (
                          <div key={sale.id} className="rounded-md border bg-emerald-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{completedSaleBillNo(sale)}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {sale.patientName} · {completedSaleDate(sale)} · {formatPrice(sale.amount)}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="Print"
                                  onClick={() => void printCompletedSale(sale)}
                                  disabled={purchaseAction === `print-completed-${sale.id}`}
                                >
                                  {purchaseAction === `print-completed-${sale.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="WhatsApp"
                                  onClick={() => void sendCompletedSaleWhatsApp(sale)}
                                  disabled={purchaseAction === `whatsapp-completed-${sale.id}`}
                                >
                                  {purchaseAction === `whatsapp-completed-${sale.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recentPurchases.length > 0 && (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {recentPurchases.map((order) => {
                        const id = purchaseOrderId(order);
                        return (
                          <div key={id || purchaseBillNo(order)} className="rounded-md border bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{purchaseBillNo(order)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {purchaseDate(order)} · {formatPrice(purchaseAmount(order))}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button type="button" size="icon" variant="ghost" title="View details" onClick={() => setSelectedPurchase(order)}>
                                  <ReceiptText className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="Print"
                                  onClick={() => void printRecentPurchase(order)}
                                  disabled={purchaseAction === `print-${id}`}
                                >
                                  {purchaseAction === `print-${id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="WhatsApp"
                                  onClick={() => void sendRecentPurchaseWhatsApp(order)}
                                  disabled={purchaseAction === `whatsapp-${id}`}
                                >
                                  {purchaseAction === `whatsapp-${id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescription-image">Prescription image</Label>
                  <Input id="prescription-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePrescriptionImage} />
                  {prescriptionImage && (
                    <p className="text-xs text-muted-foreground">
                      <Upload className="mr-1 inline h-3 w-3" />
                      {prescriptionImage.name}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Button variant="outline" className="w-full justify-center rounded-full whitespace-normal px-4 py-2 text-center" onClick={() => void printBill()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print {documentStatusText()} Bill
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center rounded-full whitespace-normal px-4 py-2 text-center"
                    onClick={() => void sendInvoiceWhatsApp()}
                    disabled={isSendingInvoiceWhatsApp}
                  >
                    {isSendingInvoiceWhatsApp ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="mr-2 h-4 w-4" />
                    )}
                    WhatsApp {documentStatusText()} Invoice
                  </Button>
                  <Button className="w-full justify-center rounded-full whitespace-normal px-4 py-2 text-center" onClick={() => void pushPrescription()} disabled={isPushing}>
                    {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}
                    Place Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex">
            <Card className="flex h-full w-full flex-col rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BadgeIndianRupee className="h-5 w-5 text-primary" />
                  Bill Items
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3">
                {items.length > 0 &&
                  items.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{item.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatPrice(itemUnitPrice(item))} per {item.quantityUnit || item.saleUnit || 'unit'}
                            {isLooseQuantityUnit(item) && item.packUnitCount
                              ? ` (strip MRP ${formatPrice(baseUnitPrice(item))} / ${item.packUnitCount})`
                              : ''}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {stockedBatchOptions(item, batchOptionsByMedicineId).length > 0 ? (
                              <select
                                className="h-7 rounded-md border border-sky-200 bg-white px-2 text-xs font-semibold"
                                value={item.id}
                                onChange={(event) => selectBatch(item.id, event.target.value)}
                              >
                                {stockedBatchOptions(item, batchOptionsByMedicineId).map((option) => (
                                  <option
                                    key={option.id}
                                    value={option.id}
                                    disabled={!isStockedMedicine(option)}
                                  >
                                    Batch: {displayBatch(option)} | Exp {displayExpiry(option.expiry)} | Stock {option.stockQuantity ?? 0} {option.saleUnit || ''} | Strips {option.stripQuantity || 0}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge variant="outline" className="rounded-md">Batch: {displayBatch(item)}</Badge>
                            )}
                            <div className="flex items-center gap-1 rounded-md border border-sky-200 bg-white px-2 py-1">
                              <span className="text-muted-foreground">Batch:</span>
                              <Input
                                value={item.batchNo || item.batchId || ''}
                                className="h-5 w-24 border-0 p-0 text-xs font-semibold shadow-none focus-visible:ring-0"
                                placeholder="Batch"
                                onChange={(event) => updateItem(item.id, { batchNo: event.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-1 rounded-md border border-sky-200 bg-white px-2 py-1">
                              <span className="text-muted-foreground">Expiry:</span>
                              <Input
                                value={item.expiry || ''}
                                className="h-5 w-20 border-0 p-0 text-xs font-semibold shadow-none focus-visible:ring-0"
                                placeholder="MM/YY"
                                onChange={(event) => updateItem(item.id, { expiry: event.target.value })}
                              />
                            </div>
                            <Badge variant="outline" className="rounded-md">
                              Total Stock: {totalStockForMedicine(item, batchOptionsByMedicineId)} {item.saleUnit || ''}
                            </Badge>
                            {item.saleUnit && totalStripsForMedicine(item, batchOptionsByMedicineId) ? (
                              <Badge variant="outline" className="rounded-md">
                                Total Strips: {totalStripsForMedicine(item, batchOptionsByMedicineId)}
                              </Badge>
                            ) : null}
                            {typeof item.lpPrice === 'number' && <Badge variant="outline" className="rounded-md">LP: {formatPrice(item.lpPrice)}</Badge>}
                            {item.location && <Badge variant="outline" className="rounded-md">Loc: {item.location}</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(item.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_100px]">
                        <div className="relative">
                          <Input
                            value={quantityInputs[item.id] ?? String(item.quantity)}
                            inputMode="numeric"
                            placeholder="Qty"
                            onFocus={() => setActiveQuantityItemId(item.id)}
                            onBlur={() => {
                              window.setTimeout(() => setActiveQuantityItemId(''), 120);
                              if (!quantityInputs[item.id]) {
                                setQuantityInputs((current) => {
                                  const next = { ...current };
                                  delete next[item.id];
                                  return next;
                                });
                              }
                            }}
                            onChange={(event) => {
                              const value = event.target.value.replace(/\D/g, '');
                              setQuantityInputs((current) => ({ ...current, [item.id]: value }));
                              if (value) updateItemQuantity(item.id, Math.max(1, Math.round(Number(value) || 1)));
                            }}
                            aria-label={`${item.name} quantity`}
                          />
                          {activeQuantityItemId === item.id && item.quantity > 0 && (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-white shadow-lg">
                              {unitOptions(item).map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                                    (item.quantityUnit || item.saleUnit || 'unit') === option
                                      ? 'bg-blue-100 font-semibold'
                                      : ''
                                  }`}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    updateItem(item.id, { quantityUnit: option });
                                    setActiveQuantityItemId('');
                                  }}
                                >
                                  {quantityOptionLabel(item, option)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <Input
                          value={item.discountPercentage}
                          inputMode="decimal"
                          onChange={(event) =>
                            updateItem(item.id, {
                              discountPercentage: clampDiscountPercentage(item, Number(event.target.value) || 0),
                            })
                          }
                          aria-label={`${item.name} discount percentage`}
                        />
                        <div className="text-xs leading-5 text-muted-foreground sm:col-start-1">
                          {item.quantity} {quantityUnitLabel(item)}
                          {item.quantityUnit === 'strip' && item.packUnitCount
                            ? ` = ${item.quantity * item.packUnitCount} ${pluralizeUnit(item.saleUnit || 'unit')}`
                            : ''}
                        </div>
                        <div className="text-xs leading-5 text-muted-foreground sm:col-start-2">
                          Max discount {maxDiscountPercentage(item).toFixed(2)}%
                          {minimumUnitPriceWithMargin(item)
                            ? ` (min ${formatPrice(minimumUnitPriceWithMargin(item) || 0)} after LP + 6%)`
                            : ' (LP not available, capped at 20%)'}
                        </div>
                        <div className="flex items-center justify-end text-sm font-bold sm:col-start-3 sm:row-start-1">
                          {formatPrice(itemNetAmount(item))}
                        </div>
                      </div>
                    </div>
                  ))}

                <div className="rounded-lg border border-dashed bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Pill className="h-4 w-4 text-primary" />
                    Add medicine
                  </div>
                  <div className="relative">
                    <Input
                      value={medicineQuery}
                      onChange={(event) => setMedicineQuery(event.target.value)}
                      placeholder="Type 3+ characters to search medicine or salt"
                      className="pr-10"
                    />
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {isMedicineSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </div>
                  </div>
                  {medicineResults.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-md border">
                      {medicineResults.slice(0, 12).map((medicine) => (
                        <button
                          key={medicine.id}
                          type="button"
                          className="grid w-full min-w-0 grid-cols-1 items-start gap-3 border-b px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 lg:grid-cols-[minmax(0,1.5fr)_90px_90px_90px_90px_120px] lg:items-center"
                          onClick={() => selectMedicineFromSearch(medicine)}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{medicine.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {medicine.composition || medicine.manufacturer || medicine.packSize || 'Details on confirmation'}
                            </p>
                          </div>
                          <div className="text-xs">
                            <span className="block text-muted-foreground">MRP</span>
                            <span className="font-semibold">{medicine.mrp ? formatPrice(medicine.mrp) : '-'}</span>
                          </div>
                          <div className="text-xs">
                            <span className="block text-muted-foreground">LP</span>
                            <span className="font-semibold">{medicine.lpPrice ? formatPrice(medicine.lpPrice) : '-'}</span>
                          </div>
                          <div className="text-xs">
                            <span className="block text-muted-foreground">Stock</span>
                            <span className="font-semibold">{medicine.stockQuantity ?? 0} {medicine.saleUnit || ''}</span>
                          </div>
                          <div className="text-xs">
                            <span className="block text-muted-foreground">Expiry</span>
                            <span className="font-semibold">{displayExpiry(medicine.expiry)}</span>
                          </div>
                          <div className="flex justify-end">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                isStockedMedicine(medicine)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {isStockedMedicine(medicine) ? (
                                <>
                                  <Plus className="h-3.5 w-3.5" />
                                  Add
                                </>
                              ) : (
                                <>
                                  <Search className="h-3.5 w-3.5" />
                                  Alternative
                                </>
                              )}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Button
        type="button"
        className="fixed bottom-4 right-4 z-30 rounded-full px-4 py-6 shadow-lg xl:hidden"
        onClick={() => setIsOrderDetailsOpen(true)}
      >
        <ReceiptText className="mr-2 h-5 w-5" />
        <span className="flex flex-col items-start leading-tight">
          <span>Order Details</span>
          <span className="text-xs font-normal opacity-90">{formatPrice(totals.payable)}</span>
        </span>
      </Button>
      {completedOrderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-xl shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ReceiptText className="h-5 w-5 text-primary" />
                    Order Placed
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Print or send the final invoice before starting the next bill.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={closeCompletedOrderPopup}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-3 rounded-lg bg-emerald-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-semibold">{completedSaleBillNo(completedOrderPopup)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">{formatPrice(completedOrderPopup.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Patient</p>
                  <p className="font-semibold">{completedOrderPopup.patientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mobile</p>
                  <p className="font-semibold">+91 {completedOrderPopup.patientMobile || mobile}</p>
                </div>
                {completedOrderPopup.details.gstNumber && (
                  <div>
                    <p className="text-muted-foreground">GST</p>
                    <p className="font-semibold">{completedOrderPopup.details.gstNumber}</p>
                  </div>
                )}
                {completedOrderPopup.details.orderId && (
                  <div>
                    <p className="text-muted-foreground">Order ID</p>
                    <p className="font-semibold">{completedOrderPopup.details.orderId}</p>
                  </div>
                )}
              </div>
              {completedOrderPopup.details.storeAddress && (
                <div className="rounded-lg border bg-white p-3 text-sm">
                  <p className="font-semibold">{completedOrderPopup.details.storeName || 'Docty.Pharmacy'}</p>
                  <p className="mt-1 text-muted-foreground">{completedOrderPopup.details.storeAddress}</p>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => void printBill()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Final Bill
                </Button>
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => void sendInvoiceWhatsApp()}
                  disabled={isSendingInvoiceWhatsApp}
                >
                  {isSendingInvoiceWhatsApp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                  WhatsApp Invoice
                </Button>
              </div>
              <Button type="button" variant="ghost" className="w-full rounded-full" onClick={closeCompletedOrderPopup}>
                Close and Start New Bill
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {isDeliveryLinkOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-xl shadow-2xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <QrCode className="h-5 w-5 text-primary" />
                    Delivery Link
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Patient can add delivery address, GPS location, and prescription image.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setIsDeliveryLinkOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveryLink ? (
                <>
                  <div className="flex flex-col items-center gap-3 rounded-lg bg-slate-50 p-4">
                    {deliveryQrDataUrl ? (
                      <img src={deliveryQrDataUrl} alt="Delivery link QR code" className="h-44 w-44 rounded-md bg-white p-2" />
                    ) : (
                      <div className="flex h-44 w-44 items-center justify-center rounded-md bg-white">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <p className="break-all text-center text-xs text-muted-foreground">{deliveryLink.url}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" className="rounded-full" onClick={() => void copyDeliveryLink()}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => void sendDeliveryLinkWhatsAppApi()}
                      disabled={isSendingDeliveryWhatsApp}
                    >
                      {isSendingDeliveryWhatsApp ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageCircle className="mr-2 h-4 w-4" />
                      )}
                      Send WhatsApp
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={openWhatsAppDeliveryLink}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Open WhatsApp Fallback
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={() => void refreshDeliveryLink()}
                    disabled={isCreatingDeliveryLink}
                  >
                    {isCreatingDeliveryLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Generate New Link
                  </Button>
                  <Button type="button" className="w-full rounded-full" onClick={() => void applyDeliveryLinkResponse()} disabled={isLoadingDeliveryLink}>
                    {isLoadingDeliveryLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Pull Submitted Details
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Link expires in 24 hours. Ask the patient to scan the QR or open the WhatsApp link, then pull submitted details here.
                  </p>
                </>
              ) : (
                <Button type="button" className="w-full rounded-full" onClick={() => void createDeliveryLink()} disabled={isCreatingDeliveryLink}>
                  {isCreatingDeliveryLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Create Delivery Link
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ReceiptText className="h-5 w-5 text-primary" />
                    Purchase Details
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{purchaseBillNo(selectedPurchase)}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedPurchase(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-[72vh] space-y-4 overflow-y-auto p-6">
              <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-semibold">{purchaseOrderId(selectedPurchase) || 'Not available'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{purchaseDate(selectedPurchase)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">{formatPrice(purchaseAmount(selectedPurchase))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold">{String(selectedPurchase.order_status || selectedPurchase.status || 'Not available')}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold">Items</p>
                {purchaseItems(selectedPurchase).length ? (
                  <div className="space-y-2">
                    {purchaseItems(selectedPurchase).map((item: any, index) => (
                      <div key={`${item?.medicine_id || item?.id || index}`} className="rounded-md border p-3 text-sm">
                        <p className="font-semibold">{String(item?.medicine_name || item?.name || item?.item_name || `Item ${index + 1}`)}</p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            Qty {purchaseItemQuantityText(item)} · Pack {String(item?.packing_size || item?.pack_size || '-')}
                          </span>
                          {purchaseItemAmount(item) > 0 && <span className="font-semibold">{formatPrice(purchaseItemAmount(item))}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Qty {String(item?.quantity || item?.qty || item?.order_quantity || '-')} · Batch{' '}
                          {String(item?.batch || item?.batch_no || item?.batch_number || '-')} · Exp {String(item?.expiry || item?.expiry_date || '-')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No item details available.</p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => void printRecentPurchase(selectedPurchase)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button type="button" className="rounded-full" onClick={() => void sendRecentPurchaseWhatsApp(selectedPurchase)}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-xl shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold">Staff Login</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in to continue pharmacy billing. Your current order stays saved on this page.
                </p>
              </div>

              {authStep === 'mobile' ? (
                <form className="space-y-4" onSubmit={sendStaffOtp}>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-staff-mobile">Staff mobile number</Label>
                    <Input
                      id="pharmacy-staff-mobile"
                      type="tel"
                      inputMode="numeric"
                      value={staffMobile}
                      onChange={(event) => setStaffMobile(event.target.value)}
                      placeholder="Enter Eka staff mobile number"
                      autoComplete="tel"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full" disabled={isSendingStaffOtp}>
                    {isSendingStaffOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={verifyStaffOtp}>
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-muted-foreground">
                    OTP sent to +91 ******{staffMobile.slice(-4)}.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy-staff-otp">4-digit OTP</Label>
                    <Input
                      id="pharmacy-staff-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={staffOtp}
                      onChange={(event) => setStaffOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Enter OTP"
                      autoComplete="one-time-code"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full" disabled={isVerifyingStaffOtp}>
                    {isVerifyingStaffOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify and Continue
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-full"
                    disabled={isSendingStaffOtp || isVerifyingStaffOtp}
                    onClick={() => {
                      setAuthStep('mobile');
                      setStaffOtp('');
                    }}
                  >
                    Change mobile number
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
