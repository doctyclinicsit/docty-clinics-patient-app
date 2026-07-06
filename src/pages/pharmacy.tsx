import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  PackageCheck,
  Percent,
  Phone,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useLocationList } from '@/generated/hooks/use-location';
import type { Location } from '@/generated/models/location-model';
import { usePatientSession } from '@/lib/patient-session-context';
import {
  getPharmacyInventory,
  getPharmacyReorderItems,
  searchPharmacyMedicines,
  submitPharmacyOrder,
  type PharmacyCartItem,
  type PharmacyInventorySections,
  type PharmacyMedicine,
} from '@/lib/pharmacy-api';
import { submitClinicLead } from '@/lib/clinic-leads';

const pharmacyHighlights = [
  { label: 'Verified local pharmacy', detail: 'Docty team confirms every request', Icon: ShieldCheck },
  { label: 'Home delivery', detail: 'Free above Rs 1000 within 5 km', Icon: Truck },
  { label: 'Prescription-aware orders', detail: 'Prescription and substitution notes supported', Icon: PackageCheck },
];

const emptyInventorySections: PharmacyInventorySections = {
  onlineTrending: [],
  featured: [],
  cosmetics: [],
  fmcg: [],
  babyFeed: [],
  treatment: [],
};

const popularSearchTerms = ['Dolo', 'Okacet', 'Paracetamol', 'ORS', 'Diapers', 'Sanitary pads', 'Aptamil', 'Cerelac', 'Pediasure'];

const categoryShortcuts = [
  {
    id: 'featured',
    label: 'Most Popular',
    detail: 'Household medicines',
    title: 'Most Popular Medicines / Products',
    description: 'Household-name medicines and essentials matched from current inventory.',
    emptyText: 'Inventory products will appear here once eVitalRx returns stocked items.',
  },
  {
    id: 'onlineTrending',
    label: 'Trending Online',
    detail: 'High-intent searches',
    title: 'Trending Online Searches Available Here',
    description: 'A trend-scored shelf from current inventory using common online pharmacy demand signals.',
    emptyText: 'No trend-matched inventory products were identified.',
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics',
    detail: 'Skin and personal care',
    title: 'Cosmetics',
    description: 'Categorised from inventory by skin, hair, beauty and personal-care signals.',
    emptyText: 'No cosmetics were identified in the current inventory response.',
  },
  {
    id: 'fmcg',
    label: 'FMCG',
    detail: 'Daily essentials',
    title: 'FMCG',
    description: 'Categorised from inventory by hygiene, oral care, baby care and daily essentials.',
    emptyText: 'No FMCG items were identified in the current inventory response.',
  },
  {
    id: 'babyFeed',
    label: 'Baby Feed',
    detail: 'Formula and nutrition',
    title: 'Baby Feed',
    description: 'Aptamil, Cerelac, Pediasure and other infant or child nutrition products matched from inventory.',
    emptyText: 'No baby feed products like Aptamil, Cerelac or Pediasure were identified in the current inventory response.',
  },
  {
    id: 'treatment',
    label: 'Treatment',
    detail: 'Prescription-led stock',
    title: 'Trending Treatment Medicines',
    description: 'Categorised from inventory by dosage type, composition and common treatment signals.',
    emptyText: 'No treatment medicines were identified in the current inventory response.',
  },
] as const;

type InventoryShelfId = (typeof categoryShortcuts)[number]['id'];

const pharmacySessionStorageKey = 'docty-pharmacy-session-v1';

function formatPrice(value?: number) {
  if (typeof value !== 'number') return 'Price on confirmation';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function decodeReorderCart(value: string): PharmacyCartItem[] {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      Array.from(window.atob(padded))
        .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    const parsed = JSON.parse(json) as { items?: Array<Partial<PharmacyCartItem>> };
    if (!Array.isArray(parsed.items)) return [];

    return parsed.items
      .map((item, index) => {
        const name = String(item.name || '').trim();
        if (!name) return null;
        return {
          id: String(item.id || `invoice-item-${index + 1}`),
          name,
          imageUrl: item.imageUrl,
          manufacturer: item.manufacturer,
          composition: item.composition,
          packSize: item.packSize,
          mrp: typeof item.mrp === 'number' ? item.mrp : undefined,
          salePrice: typeof item.salePrice === 'number' ? item.salePrice : undefined,
          available: item.available !== false,
          stockQuantity: item.stockQuantity,
          dosageType: item.dosageType,
          medicineType: item.medicineType,
          quantity:
            typeof item.quantity === 'number' && item.quantity > 0
              ? Math.min(99, Math.round(item.quantity))
              : 1,
        };
      })
      .filter(Boolean) as PharmacyCartItem[];
  } catch {
    return [];
  }
}

function normalizeMobile(value?: string) {
  return String(value || '').replace(/\D/g, '').slice(-10);
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

function hasUsableProductImage(value?: string) {
  return Boolean(value && !/(\/default\.jpg|placeholder|no[-_ ]?image|logo)/i.test(value));
}

function ProductCard({
  medicine,
  onAdd,
  compact = false,
}: {
  medicine: PharmacyMedicine;
  onAdd: (medicine: PharmacyMedicine) => void;
  compact?: boolean;
}) {
  return (
    <Card className="h-full overflow-hidden rounded-xl border-border/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className={compact ? 'p-4' : 'p-5'}>
        <div className="flex h-full flex-col">
          <div className="mb-4 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-white">
            {hasUsableProductImage(medicine.imageUrl) ? (
              <img
                src={medicine.imageUrl}
                alt={medicine.name}
                loading="lazy"
                className="h-full w-full object-contain p-3 mix-blend-multiply"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#f7fbfd] px-4 text-center">
                <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Image unavailable
                </span>
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-semibold leading-6">{medicine.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {medicine.composition || medicine.manufacturer || 'Details available on confirmation'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-1 items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{medicine.packSize || 'Pack'}</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(medicine.salePrice || medicine.mrp)}
              </p>
            </div>
            <Button
              type="button"
              className="rounded-full"
              onClick={() => onAdd(medicine)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductSection({
  id,
  title,
  description,
  items,
  onAdd,
  emptyText,
}: {
  id?: string;
  title: string;
  description: string;
  items: PharmacyMedicine[];
  onAdd: (medicine: PharmacyMedicine) => void;
  emptyText: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((medicine) => (
            <ProductCard key={`${title}-${medicine.id}`} medicine={medicine} onAdd={onAdd} compact />
          ))}
        </div>
      ) : (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">{emptyText}</CardContent>
        </Card>
      )}
    </section>
  );
}

function HeroSearchResults({
  results,
  isSearching,
  hasSearched,
  onSelect,
  onRequestUnavailable,
}: {
  results: PharmacyMedicine[];
  isSearching: boolean;
  hasSearched: boolean;
  onSelect: (medicine: PharmacyMedicine) => void;
  onRequestUnavailable: () => void;
}) {
  if (isSearching) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Searching available products...
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div className="min-w-0 max-w-full overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-sm font-bold">Select a product</p>
          <p className="shrink-0 text-xs text-muted-foreground">{results.length} matches</p>
        </div>
        <div className="max-h-[320px] min-w-0 overflow-y-auto overflow-x-hidden p-1">
          {results.map((medicine) => (
            <button
              key={`hero-${medicine.id}`}
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              onClick={() => onSelect(medicine)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                {hasUsableProductImage(medicine.imageUrl) ? (
                  <img
                    src={medicine.imageUrl}
                    alt={medicine.name}
                    loading="lazy"
                    className="h-full w-full object-contain p-1 mix-blend-multiply"
                  />
                ) : (
                  <Pill className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold">{medicine.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {medicine.composition || medicine.packSize || medicine.manufacturer || 'Details on confirmation'}
                </p>
                {medicine.composition && medicine.packSize && (
                  <p className="truncate text-[11px] text-muted-foreground">{medicine.packSize}</p>
                )}
              </div>
              <span className="hidden shrink-0 text-sm font-bold text-primary sm:inline">
                {formatPrice(medicine.salePrice || medicine.mrp)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (hasSearched) {
    return (
      <div className="rounded-xl border border-dashed bg-white p-4 text-center">
        <Search className="mx-auto h-7 w-7 text-muted-foreground" />
        <h2 className="mt-3 text-sm font-semibold">Request a non-available medicine</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          We could not find this in the catalogue response. Send it as a request and our team will confirm availability or alternatives.
        </p>
        <Button type="button" className="mt-4 rounded-full" size="sm" onClick={onRequestUnavailable}>
          Request This Medicine
        </Button>
      </div>
    );
  }

  return null;
}

export default function PharmacyPage() {
  const { activeProfile, isAuthenticated, isLoading } = usePatientSession();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: clinicLocations } = useLocationList();
  const searchRequestId = useRef(0);
  const hasLoadedSessionCart = useRef(false);
  const hasLoadedReorderCart = useRef(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PharmacyMedicine[]>([]);
  const [searchedTerm, setSearchedTerm] = useState('');
  const [inventorySections, setInventorySections] =
    useState<PharmacyInventorySections>(emptyInventorySections);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [cartItems, setCartItems] = useState<PharmacyCartItem[]>([]);
  const [patientName, setPatientName] = useState(activeProfile?.name || '');
  const [patientMobile, setPatientMobile] = useState(normalizeMobile(activeProfile?.mobile));
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState<{
    name: string;
    type: string;
    data: string;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocatingDelivery, setIsLocatingDelivery] = useState(false);
  const [activeShelf, setActiveShelf] = useState<InventoryShelfId | null>(null);

  const hasSearched = searchedTerm.trim().length >= 2;
  const selectedShelf = categoryShortcuts.find((shelf) => shelf.id === activeShelf);
  const deliveryClinics = useMemo(
    () =>
      (clinicLocations || []).filter(
        (clinic): clinic is Location & { lat: number; lon: number } =>
          typeof clinic.lat === 'number' && typeof clinic.lon === 'number'
      ),
    [clinicLocations]
  );
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + (item.salePrice || item.mrp || 0) * item.quantity,
        0
      ),
    [cartItems]
  );
  const cartItemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );
  const availableCartItems = useMemo(
    () => cartItems.filter((item) => item.available !== false),
    [cartItems]
  );
  const requestOnlyCartItems = useMemo(
    () => cartItems.filter((item) => item.available === false),
    [cartItems]
  );
  const nearestDeliveryClinic = useMemo(() => {
    if (!deliveryCoords || deliveryClinics.length === 0) return null;

    return deliveryClinics
      .map((clinic) => ({
        clinic,
        distanceKm: distanceInKm(deliveryCoords, { lat: clinic.lat, lon: clinic.lon }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  }, [deliveryClinics, deliveryCoords]);
  const isWithinFreeDeliveryRadius =
    Boolean(nearestDeliveryClinic && nearestDeliveryClinic.distanceKm <= 5);
  const deliveryCharge =
    isWithinFreeDeliveryRadius && subtotal >= 1000
      ? 0
      : isWithinFreeDeliveryRadius
        ? 30
        : undefined;
  const deliveryChargeLabel =
    nearestDeliveryClinic && nearestDeliveryClinic.distanceKm > 5
      ? 'Pharmacist to confirm'
      : isWithinFreeDeliveryRadius && subtotal >= 1000
      ? 'Free'
      : typeof deliveryCharge === 'number'
        ? formatPrice(deliveryCharge)
        : deliveryCoords
          ? 'To be confirmed'
          : 'Share location to calculate';

  const mergeItemsIntoCart = (reorderItems: PharmacyCartItem[]) => {
    setCartItems((currentItems) => {
      const mergedItems = [...currentItems];
      reorderItems.forEach((reorderItem) => {
        const existingIndex = mergedItems.findIndex((item) => item.id === reorderItem.id);
        if (existingIndex >= 0) {
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            quantity: mergedItems[existingIndex].quantity + reorderItem.quantity,
          };
        } else {
          mergedItems.push(reorderItem);
        }
      });
      return mergedItems;
    });
  };

  useEffect(() => {
    if (hasLoadedSessionCart.current || typeof window === 'undefined') return;
    hasLoadedSessionCart.current = true;

    const storedValue = window.sessionStorage.getItem(pharmacySessionStorageKey);
    if (!storedValue) return;

    try {
      const storedSession = JSON.parse(storedValue) as Partial<{
        cartItems: PharmacyCartItem[];
        patientName: string;
        patientMobile: string;
        address: string;
        area: string;
        city: string;
        pincode: string;
        landmark: string;
        doctorName: string;
        prescriptionNotes: string;
        prescriptionImage: { name: string; type: string; data: string } | null;
        notes: string;
        deliveryCoords: { lat: number; lon: number } | null;
        activeShelf: InventoryShelfId | null;
      }>;

      if (Array.isArray(storedSession.cartItems)) setCartItems(storedSession.cartItems);
      if (storedSession.patientName) setPatientName(storedSession.patientName);
      if (storedSession.patientMobile) setPatientMobile(storedSession.patientMobile);
      if (typeof storedSession.address === 'string') setAddress(storedSession.address);
      if (typeof storedSession.area === 'string') setArea(storedSession.area);
      if (typeof storedSession.city === 'string') setCity(storedSession.city || 'Hyderabad');
      if (typeof storedSession.pincode === 'string') setPincode(storedSession.pincode);
      if (typeof storedSession.landmark === 'string') setLandmark(storedSession.landmark);
      if (typeof storedSession.doctorName === 'string') setDoctorName(storedSession.doctorName);
      if (typeof storedSession.prescriptionNotes === 'string') {
        setPrescriptionNotes(storedSession.prescriptionNotes);
      }
      if (storedSession.prescriptionImage) setPrescriptionImage(storedSession.prescriptionImage);
      if (typeof storedSession.notes === 'string') setNotes(storedSession.notes);
      if (
        storedSession.deliveryCoords &&
        typeof storedSession.deliveryCoords.lat === 'number' &&
        typeof storedSession.deliveryCoords.lon === 'number'
      ) {
        setDeliveryCoords(storedSession.deliveryCoords);
      }
      if (
        storedSession.activeShelf &&
        categoryShortcuts.some((shelf) => shelf.id === storedSession.activeShelf)
      ) {
        setActiveShelf(storedSession.activeShelf);
      }
    } catch {
      window.sessionStorage.removeItem(pharmacySessionStorageKey);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedReorderCart.current || !hasLoadedSessionCart.current || typeof window === 'undefined') {
      return;
    }

    const reorderToken = searchParams.get('r') || '';
    const pathReorderOrderId = location.pathname.startsWith('/pharmacy/delivery/')
      ? ''
      : decodeURIComponent(location.pathname.replace(/^\/pharmacy\/?/, '').split('/')[0] || '');
    const reorderOrderId = searchParams.get('reorderOrderId') || pathReorderOrderId;
    const medicineRefs = searchParams.get('m') || '';
    const reorderValue = searchParams.get('reorder');
    if (!reorderToken && !reorderOrderId && !medicineRefs && !reorderValue) return;
    hasLoadedReorderCart.current = true;

    const loadReorderItems = async () => {
      try {
        const reorderItems = reorderToken || reorderOrderId || medicineRefs
          ? await getPharmacyReorderItems(reorderOrderId || '', medicineRefs, reorderToken)
          : decodeReorderCart(reorderValue || '');
        if (!reorderItems.length) {
          toast.error('Unable to load medicines from this reorder QR code.');
          return;
        }

        mergeItemsIntoCart(reorderItems);
        setIsCartOpen(true);
        toast.success('Items from your invoice were added to the cart.');
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('r');
        nextParams.delete('reorder');
        nextParams.delete('reorderOrderId');
        nextParams.delete('m');
        setSearchParams(nextParams, { replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load medicines from this reorder QR code.');
      }
    };

    void loadReorderItems();
  }, [location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hasLoadedSessionCart.current || typeof window === 'undefined') return;

    window.sessionStorage.setItem(
      pharmacySessionStorageKey,
      JSON.stringify({
        cartItems,
        patientName,
        patientMobile,
        address,
        area,
        city,
        pincode,
        landmark,
        doctorName,
        prescriptionNotes,
        prescriptionImage,
        notes,
        deliveryCoords,
        activeShelf,
      })
    );
  }, [
    cartItems,
    patientName,
    patientMobile,
    address,
    area,
    city,
    pincode,
    landmark,
    doctorName,
    prescriptionNotes,
    prescriptionImage,
    notes,
    deliveryCoords,
    activeShelf,
  ]);

  useEffect(() => {
    let isMounted = true;

    getPharmacyInventory()
      .then((sections) => {
        if (isMounted) setInventorySections(sections || emptyInventorySections);
      })
      .catch(() => {
        if (isMounted) setInventorySections(emptyInventorySections);
      })
      .finally(() => {
        if (isMounted) setIsInventoryLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      searchRequestId.current += 1;
      setSearchResults([]);
      setSearchedTerm('');
      setIsSearching(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchMedicines(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const searchMedicines = async (searchTerm = query) => {
    const trimmedSearchTerm = searchTerm.trim();
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    if (trimmedSearchTerm.length < 2) {
      setSearchResults([]);
      setSearchedTerm('');
      return;
    }

    setIsSearching(true);
    setSearchedTerm(trimmedSearchTerm);
    try {
      const medicines = await searchPharmacyMedicines(trimmedSearchTerm);
      if (searchRequestId.current === requestId) setSearchResults(medicines);
    } catch (error) {
      if (searchRequestId.current === requestId) {
        setSearchResults([]);
        toast.error(error instanceof Error ? error.message : 'Medicine search is temporarily unavailable.');
      }
    } finally {
      if (searchRequestId.current === requestId) setIsSearching(false);
    }
  };

  const clearSearch = () => {
    searchRequestId.current += 1;
    setQuery('');
    setSearchedTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handlePrescriptionImageChange = (file?: File) => {
    if (!file) {
      setPrescriptionImage(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a prescription image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Prescription image must be 5 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPrescriptionImage({
        name: file.name,
        type: file.type,
        data: String(reader.result || ''),
      });
    };
    reader.onerror = () => toast.error('Unable to read prescription image.');
    reader.readAsDataURL(file);
  };

  const runPopularSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    void searchMedicines(searchTerm);
  };

  const addToCart = (medicine: PharmacyMedicine) => {
    setCartItems((items) => {
      const existingItem = items.find((item) => item.id === medicine.id);
      if (existingItem) {
        return items.map((item) =>
          item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { ...medicine, quantity: 1 }];
    });
  };

  const selectSearchMedicine = (medicine: PharmacyMedicine) => {
    searchRequestId.current += 1;
    addToCart(medicine);
    setQuery('');
    setSearchResults([]);
    setSearchedTerm('');
    setIsSearching(false);
    toast.success(`${medicine.name} added to cart.`);
  };

  const updateQuantity = (medicineId: string, quantity: number) => {
    setCartItems((items) =>
      items
        .map((item) => (item.id === medicineId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const safeInventorySections = inventorySections || emptyInventorySections;

  const requestUnavailableMedicine = () => {
    const requestedMedicine = query.trim();
    setPrescriptionNotes((currentValue) => {
      const prefix = requestedMedicine
        ? `Requested non-available medicine: ${requestedMedicine}`
        : 'Requested non-available medicine: ';
      return currentValue.trim() ? `${currentValue.trim()}\n${prefix}` : prefix;
    });
    setIsCartOpen(true);
    window.setTimeout(() => {
      document.getElementById('pharmacy-prescription')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
  };

  const showOrderRequestForm = () => {
    setIsCartOpen(true);
  };

  const useCurrentDeliveryLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location sharing is not available in this browser.');
      return;
    }

    setIsLocatingDelivery(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeliveryCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsLocatingDelivery(false);
        toast.success('Delivery location distance calculated from your nearest Docty clinic.');
      },
      () => {
        setIsLocatingDelivery(false);
        toast.error('Unable to access current location. Please allow location access and try again.');
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  };

  const submitOrder = async () => {
    const mobile = normalizeMobile(patientMobile);
    const deliveryAddress = [address, area, city, pincode ? `PIN ${pincode}` : '', landmark]
      .filter((part) => part.trim())
      .join(', ');
    if (
      !patientName.trim() ||
      !/^[6-9]\d{9}$/.test(mobile) ||
      !address.trim() ||
      !area.trim() ||
      !city.trim() ||
      !/^\d{6}$/.test(pincode.trim())
    ) {
      toast.error('Please add patient details and complete delivery location with a valid pincode.');
      return;
    }
    if (cartItems.length === 0 && !prescriptionNotes.trim() && !prescriptionImage) {
      toast.error('Add medicines, upload a prescription, or share prescription details before placing the request.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPharmacyOrder({
        patientId: activeProfile?.id,
        patientName,
        patientMobile: mobile,
        address: deliveryAddress,
        area,
        city,
        pincode,
        landmark,
        doctorName,
        notes: [
          notes,
          nearestDeliveryClinic
            ? `Delivery distance: ${nearestDeliveryClinic.distanceKm.toFixed(1)} km from ${nearestDeliveryClinic.clinic.name1}. Delivery charge: ${deliveryChargeLabel}.`
            : `Delivery charge: ${deliveryChargeLabel}.`,
        ]
          .filter(Boolean)
          .join('\n'),
        prescriptionNotes,
        prescriptionImage: prescriptionImage || undefined,
        items: cartItems,
      });
      toast.success('Pharmacy request submitted. Our team will confirm availability shortly.');
      setCartItems([]);
      setPrescriptionNotes('');
      setPrescriptionImage(null);
      setNotes('');
      window.sessionStorage.removeItem(pharmacySessionStorageKey);
    } catch (error) {
      await submitClinicLead({
        type: 'pharmacy',
        patientName,
        patientMobile: mobile,
        interest: cartItems.length
          ? cartItems.map((item) => `${item.name} x ${item.quantity}`).join(', ')
          : 'Prescription medicine request',
        serviceCategory: 'Pharmacy',
        remarks: [
          prescriptionNotes,
          prescriptionImage ? `Prescription image uploaded: ${prescriptionImage.name}` : '',
          notes,
          `Delivery: ${deliveryAddress}`,
          nearestDeliveryClinic
            ? `Delivery distance: ${nearestDeliveryClinic.distanceKm.toFixed(1)} km from ${nearestDeliveryClinic.clinic.name1}. Delivery charge: ${deliveryChargeLabel}.`
            : `Delivery charge: ${deliveryChargeLabel}.`,
        ]
          .filter(Boolean)
          .join('\n'),
        source: 'patient-pharmacy-page',
        metadata: {
          patientId: activeProfile?.id,
          cartItems,
          prescriptionImage: prescriptionImage
            ? { name: prescriptionImage.name, type: prescriptionImage.type }
            : undefined,
          subtotal,
          deliveryCharge,
          nearestDeliveryClinic: nearestDeliveryClinic
            ? {
                id: nearestDeliveryClinic.clinic.id,
                name: nearestDeliveryClinic.clinic.name1,
                distanceKm: Number(nearestDeliveryClinic.distanceKm.toFixed(2)),
              }
            : undefined,
          deliveryCoordinates: deliveryCoords,
          deliveryLocation: {
            address,
            area,
            city,
            pincode,
            landmark,
          },
        },
      });
      toast.success('Pharmacy request captured. Our team will call you to confirm the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-background">
      <Button
        type="button"
        className="fixed right-4 top-20 z-[55] h-11 rounded-full shadow-lg md:right-6 md:top-24"
        onClick={showOrderRequestForm}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Cart
        {cartItemCount > 0 && (
          <span className="ml-2 rounded-full bg-primary-foreground px-2 py-0.5 text-xs font-bold text-primary">
            {cartItemCount}
          </span>
        )}
      </Button>

      <section className="relative max-w-full overflow-hidden border-b pt-24 md:pt-28">
        <div className="absolute inset-0">
          <img
            src="/docty-clinic-pharmacy-shelves.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
        </div>
        <div className="container relative mx-auto max-w-full px-4 py-10 md:py-14">
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)] lg:items-center">
            <div className="min-w-0 max-w-2xl">
              <Badge variant="secondary" className="mb-4">
                <Pill className="mr-1.5 h-3.5 w-3.5" />
                Docty Pharmacy
              </Badge>
              <h1 className="text-4xl font-bold md:text-5xl">Medicines and essentials from nearby stock</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                Search popular medicines, add household essentials, or request anything missing.
                Docty will confirm availability, prescription needs, and delivery details.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Within 5 km', value: 'Free 1000+', Icon: Truck },
                  { label: 'Subscriber discount', value: 'Flat 20%', Icon: Percent },
                  { label: 'Profile linked', value: 'Docty', Icon: CheckCircle2 },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-xl border bg-background/90 p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-xl font-bold">{value}</p>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card id="pharmacy-search" className="min-w-0 max-w-full overflow-hidden scroll-mt-24 rounded-xl border-border/80 bg-background/95 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Search className="h-5 w-5 text-primary" />
                  Find Medicines
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 space-y-4 overflow-hidden">
                <div className="flex flex-col gap-3">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void searchMedicines();
                      }}
                      placeholder="Search Dolo, Okacet, diapers..."
                      className="h-12 rounded-full bg-white pr-12"
                    />
                    {(query || searchResults.length > 0 || hasSearched) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={clearSearch}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex max-w-full flex-wrap gap-2">
                  {popularSearchTerms.map((term) => (
                    <Button
                      key={term}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-w-0 rounded-full bg-white px-3"
                      onClick={() => runPopularSearch(term)}
                    >
                      <span className="truncate">{term}</span>
                    </Button>
                  ))}
                </div>
                <div className="grid min-w-0 gap-3 pt-1 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-0 rounded-full"
                    onClick={requestUnavailableMedicine}
                  >
                    <Upload className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">Request Non Available</span>
                  </Button>
                  <Button asChild variant="outline" className="min-w-0 rounded-full bg-white">
                    <a href="tel:+919989804888" className="min-w-0">
                      <Phone className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">Call Pharmacy</span>
                    </a>
                  </Button>
                </div>
                <HeroSearchResults
                  results={searchResults}
                  isSearching={isSearching}
                  hasSearched={hasSearched}
                  onSelect={selectSearchMedicine}
                  onRequestUnavailable={requestUnavailableMedicine}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/40 py-5">
        <div className="container mx-auto grid gap-3 px-4 md:grid-cols-3">
          {pharmacyHighlights.map(({ label, detail, Icon }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg bg-background px-4 py-3 shadow-sm">
              <Icon className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <span className="text-sm font-semibold">{label}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pharmacy-order" className="scroll-mt-24 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {categoryShortcuts.map(({ id, label, detail }) => (
                <button
                  key={label}
                  type="button"
                  className={`rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md ${
                    activeShelf === id ? 'border-primary bg-primary/5' : 'bg-background'
                  }`}
                  onClick={() => {
                    setActiveShelf(id);
                    window.setTimeout(() => {
                      document.getElementById('inventory-shelf-results')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 0);
                  }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="mt-3 block text-sm font-bold">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
                </button>
              ))}
            </div>

            <div id="inventory-shelf-results" className="scroll-mt-24">
              {isInventoryLoading ? (
                <Card className="rounded-xl">
                  <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading pharmacy inventory...
                  </CardContent>
                </Card>
              ) : selectedShelf ? (
                <ProductSection
                  id={`inventory-${selectedShelf.id}`}
                  title={selectedShelf.title}
                  description={`${selectedShelf.description} Showing up to 40 products.`}
                  items={safeInventorySections[selectedShelf.id].slice(0, 40)}
                  onAdd={addToCart}
                  emptyText={selectedShelf.emptyText}
                />
              ) : (
                <Card className="rounded-xl border-dashed">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Select a shelf above to view available products.
                  </CardContent>
                </Card>
              )}
            </div>

          </div>

          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Cart & Order Request
                </SheetTitle>
                <SheetDescription>
                  Review medicines, add delivery location, and submit your pharmacy request.
                </SheetDescription>
              </SheetHeader>
              <div id="pharmacy-order-request" className="space-y-5 px-4 pb-6">
                {!isLoading && !isAuthenticated && (
                  <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm">
                    <Link to="/patient" className="font-semibold text-primary">
                      Login to patient portal
                    </Link>{' '}
                    to prefill your profile details.
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">Available Items</h3>
                      <Badge variant="secondary">{availableCartItems.length}</Badge>
                    </div>
                    {availableCartItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Add inventory medicines from search or shelves.
                      </div>
                    ) : (
                      availableCartItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(item.salePrice || item.mrp)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-full"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-full"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-destructive"
                              onClick={() => updateQuantity(item.id, 0)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">Non-Available / Request</h3>
                      <Badge variant="outline">
                        {requestOnlyCartItems.length + (prescriptionNotes.trim() ? 1 : 0) + (prescriptionImage ? 1 : 0)}
                      </Badge>
                    </div>
                    {requestOnlyCartItems.length === 0 && !prescriptionNotes.trim() && !prescriptionImage ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Request unavailable medicines, upload a prescription image, or add prescription details below.
                      </div>
                    ) : (
                      <>
                        {requestOnlyCartItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{item.name}</p>
                              <p className="text-xs text-muted-foreground">Availability to be confirmed</p>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-destructive"
                              onClick={() => updateQuantity(item.id, 0)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        {prescriptionNotes.trim() && (
                          <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
                            <p className="font-semibold">Request notes</p>
                            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                              {prescriptionNotes.trim()}
                            </p>
                          </div>
                        )}
                        {prescriptionImage && (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
                            <div className="min-w-0">
                              <p className="font-semibold">Prescription image</p>
                              <p className="truncate text-muted-foreground">{prescriptionImage.name}</p>
                            </div>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-destructive"
                              onClick={() => setPrescriptionImage(null)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="pharmacy-name">Patient name</Label>
                    <Input
                      id="pharmacy-name"
                      value={patientName}
                      onChange={(event) => setPatientName(event.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pharmacy-mobile">Mobile number</Label>
                    <Input
                      id="pharmacy-mobile"
                      value={patientMobile}
                      onChange={(event) => setPatientMobile(event.target.value)}
                      inputMode="tel"
                      placeholder="10 digit mobile"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pharmacy-address">House / flat / building</Label>
                    <Textarea
                      id="pharmacy-address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="House number, apartment, street"
                      className="min-h-20"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pharmacy-area">Area / locality</Label>
                      <Input
                        id="pharmacy-area"
                        value={area}
                        onChange={(event) => setArea(event.target.value)}
                        placeholder="e.g. Lanco Hills"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pharmacy-city">City</Label>
                      <Input
                        id="pharmacy-city"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="Hyderabad"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pharmacy-pincode">Pincode</Label>
                      <Input
                        id="pharmacy-pincode"
                        value={pincode}
                        onChange={(event) =>
                          setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        inputMode="numeric"
                        placeholder="500089"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pharmacy-landmark">Landmark</Label>
                      <Input
                        id="pharmacy-landmark"
                        value={landmark}
                        onChange={(event) => setLandmark(event.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Delivery distance</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Share current location to calculate distance from the nearest Docty clinic.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full bg-background"
                        onClick={useCurrentDeliveryLocation}
                        disabled={isLocatingDelivery || deliveryClinics.length === 0}
                      >
                        {isLocatingDelivery ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="mr-2 h-4 w-4" />
                        )}
                        Use Location
                      </Button>
                    </div>
                    {nearestDeliveryClinic ? (
                      <p className="mt-3 text-xs font-medium text-foreground">
                        Nearest clinic: {nearestDeliveryClinic.clinic.name1} ({nearestDeliveryClinic.distanceKm.toFixed(1)} km)
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {deliveryClinics.length === 0
                          ? 'Clinic coordinates are still loading.'
                          : 'Distance will appear here after location access.'}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pharmacy-doctor">Prescribing doctor</Label>
                    <Input
                      id="pharmacy-doctor"
                      value={doctorName}
                      onChange={(event) => setDoctorName(event.target.value)}
                      placeholder="Doctor name, if available"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pharmacy-prescription" className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-accent" />
                      Non-available request / prescription details
                    </Label>
                    <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                      <Input
                        id="pharmacy-prescription-image"
                        type="file"
                        accept="image/*"
                        onChange={(event) => handlePrescriptionImageChange(event.target.files?.[0])}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Upload a prescription image up to 5 MB. eVitalRx accepts this as the prescription image for the order.
                      </p>
                      {prescriptionImage && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm">
                          <span className="truncate">{prescriptionImage.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-destructive"
                            onClick={() => setPrescriptionImage(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    <Textarea
                      id="pharmacy-prescription"
                      value={prescriptionNotes}
                      onChange={(event) => setPrescriptionNotes(event.target.value)}
                      placeholder="List medicines that were not available, or paste prescription details."
                      className="min-h-24"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pharmacy-notes">Notes</Label>
                    <Textarea
                      id="pharmacy-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Preferred delivery time, substitutions, or billing notes"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated medicines total</span>
                    <span className="font-bold">{subtotal > 0 ? formatPrice(subtotal) : 'To be confirmed'}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated delivery charge</span>
                    <span className="font-bold">{deliveryChargeLabel}</span>
                  </div>
                  <div className="mt-3 rounded-md bg-background px-3 py-2 text-xs font-medium text-foreground">
                    Free delivery above Rs 1000 applies within 5 km of the nearest Docty clinic. Within 5 km, Rs 30 applies below Rs 1000. Above 5 km is confirmed by the pharmacist.
                  </div>
                  <p className="mt-2 flex gap-2 text-xs leading-5 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {nearestDeliveryClinic
                      ? `Calculated from ${nearestDeliveryClinic.clinic.name1} at ${nearestDeliveryClinic.distanceKm.toFixed(1)} km. ${
                          nearestDeliveryClinic.distanceKm > 5
                            ? 'Delivery charge will be confirmed by the pharmacist.'
                            : 'Final pricing and prescription validation are confirmed by the pharmacy.'
                        }`
                      : 'Share location to calculate distance. Final pricing, availability, and prescription validation are confirmed by the pharmacy.'}
                  </p>
                </div>

                <Button
                  type="button"
                  className="h-12 w-full rounded-full"
                  onClick={() => void submitOrder()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                  Submit Pharmacy Request
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </section>
    </div>
  );
}
