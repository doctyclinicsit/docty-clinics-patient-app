export interface PharmacyMedicine {
  id: string;
  medicineId?: string;
  name: string;
  imageUrl?: string;
  manufacturer?: string;
  composition?: string;
  packSize?: string;
  mrp?: number;
  salePrice?: number;
  lpPrice?: number;
  gstPercentage?: number;
  available?: boolean;
  stockQuantity?: number;
  looseQuantity?: number;
  stripQuantity?: number;
  saleUnit?: string;
  packUnitCount?: number;
  batchNo?: string;
  batchId?: string;
  expiry?: string;
  location?: string;
  dosageType?: string;
  medicineType?: string;
}

export interface PharmacyCartItem extends PharmacyMedicine {
  quantity: number;
}

export interface PharmacyInventorySections {
  onlineTrending: PharmacyMedicine[];
  featured: PharmacyMedicine[];
  cosmetics: PharmacyMedicine[];
  fmcg: PharmacyMedicine[];
  babyFeed: PharmacyMedicine[];
  treatment: PharmacyMedicine[];
}

const emptyInventorySections: PharmacyInventorySections = {
  onlineTrending: [],
  featured: [],
  cosmetics: [],
  fmcg: [],
  babyFeed: [],
  treatment: [],
};

export interface PharmacyOrderInput {
  patientId?: string;
  patientName: string;
  patientMobile: string;
  address: string;
  area?: string;
  city?: string;
  pincode?: string;
  landmark?: string;
  doctorName?: string;
  notes?: string;
  prescriptionNotes?: string;
  prescriptionImage?: {
    name: string;
    type: string;
    data: string;
  };
  items: PharmacyCartItem[];
}

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || body?.error || fallbackMessage);
  }

  return (body?.data ?? body?.items ?? body) as T;
}

export async function searchPharmacyMedicines(query: string) {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  const response = await fetch(`/api/pharmacy/medicines?query=${encodeURIComponent(trimmedQuery)}`, {
    headers: { Accept: 'application/json' },
  });

  return parseResponse<PharmacyMedicine[]>(response, 'Unable to search medicines.');
}

export async function getPharmacyInventory() {
  const response = await fetch('/api/pharmacy/inventory', {
    headers: { Accept: 'application/json' },
  });

  const body = await parseResponse<Partial<PharmacyInventorySections> | null>(
    response,
    'Unable to load pharmacy inventory.'
  );

  return {
    onlineTrending: Array.isArray(body?.onlineTrending)
      ? body.onlineTrending
      : emptyInventorySections.onlineTrending,
    featured: Array.isArray(body?.featured) ? body.featured : emptyInventorySections.featured,
    cosmetics: Array.isArray(body?.cosmetics) ? body.cosmetics : emptyInventorySections.cosmetics,
    fmcg: Array.isArray(body?.fmcg) ? body.fmcg : emptyInventorySections.fmcg,
    babyFeed: Array.isArray(body?.babyFeed) ? body.babyFeed : emptyInventorySections.babyFeed,
    treatment: Array.isArray(body?.treatment) ? body.treatment : emptyInventorySections.treatment,
  };
}

export async function submitPharmacyOrder(input: PharmacyOrderInput) {
  const response = await fetch('/api/pharmacy/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseResponse<{ orderId?: string; message?: string }>(
    response,
    'Unable to submit pharmacy order.'
  );
}

export async function getPharmacyReorderItems(orderId: string, medicineRefs?: string, reorderToken?: string) {
  const query = new URLSearchParams({
    ...(reorderToken ? { r: reorderToken } : {}),
    ...(orderId ? { orderId } : {}),
    ...(medicineRefs ? { m: medicineRefs } : {}),
  });
  const response = await fetch(`/api/pharmacy/reorder?${query.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  const body = await parseResponse<{ items?: PharmacyCartItem[] }>(
    response,
    'Unable to load reorder medicines.'
  );

  return Array.isArray(body.items) ? body.items : [];
}
