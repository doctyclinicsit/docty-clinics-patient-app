import {
  isUsableEvitalRxImage,
  mapEvitalRxMedicineVariants,
  requestEvitalRx,
  type EvitalRxMedicine,
  type PharmacyMedicineResult,
} from '../_lib/evitalrx.js';
import {
  getFreshInventorySnapshot,
  refreshInventorySnapshot,
} from '../_lib/pharmacy-inventory-cache.js';

function uniqueById(items: PharmacyMedicineResult[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function searchableMedicineText(medicine: PharmacyMedicineResult) {
  return [
    medicine.name,
    medicine.composition,
    medicine.manufacturer,
    medicine.packSize,
    medicine.batchNo,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasStock(medicine: PharmacyMedicineResult) {
  return medicine.available !== false && (medicine.stockQuantity || 0) > 0;
}

function sortInventoryFirst(items: PharmacyMedicineResult[]) {
  return [...items].sort((a, b) => {
    const aStocked = hasStock(a) ? 1 : 0;
    const bStocked = hasStock(b) ? 1 : 0;
    if (aStocked !== bStocked) return bStocked - aStocked;
    return (b.stockQuantity || 0) - (a.stockQuantity || 0);
  });
}

async function searchEvitalMedicines(searchstring: string) {
  const body = await requestEvitalRx<{
    data?: {
      result?: EvitalRxMedicine[];
      did_you_mean_result?: unknown[];
    };
  }>({
    endpoint: 'doctor/medicines/search',
    payload: { searchstring },
  });

  return {
    medicines: (body.data?.result || []).flatMap(mapEvitalRxMedicineVariants),
    suggestions: body.data?.did_you_mean_result || [],
  };
}

async function searchInventoryBySalt(query: string) {
  const normalizedQuery = query.toLowerCase();
  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 2);
  if (!tokens.length) return [];

  const snapshot = (await getFreshInventorySnapshot()) || (await refreshInventorySnapshot());

  return snapshot.variants
    .filter((medicine) => {
      const text = searchableMedicineText(medicine);
      return tokens.every((token) => text.includes(token));
    })
    .sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))
    .slice(0, 30);
}

async function loadMedicineDetails(medicineIds: string[]) {
  if (medicineIds.length === 0) return { imageMap: new Map<string, string>(), variantMap: new Map<string, PharmacyMedicineResult[]>() };

  const imageMap = new Map<string, string>();
  const variantMap = new Map<string, PharmacyMedicineResult[]>();
  const chunkSize = 10;
  for (let index = 0; index < medicineIds.length; index += chunkSize) {
    const chunk = medicineIds.slice(index, index + chunkSize);
    const payload =
      chunk.length === 1
        ? { medicine_id: chunk[0] }
        : { medicine_ids: JSON.stringify(chunk) };

    try {
      const body = await requestEvitalRx<{ data?: EvitalRxMedicine[] | EvitalRxMedicine }>({
        endpoint: 'doctor/medicines/view',
        payload,
      });
      const medicines = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];

      medicines.forEach((medicine) => {
        const id = medicine.id || medicine.medicine_id;
        const imageUrl = isUsableEvitalRxImage(medicine.medicine_image)
          ? medicine.medicine_image
          : isUsableEvitalRxImage(medicine.thumb_medicine_image)
            ? medicine.thumb_medicine_image
            : undefined;
        if (id && imageUrl) imageMap.set(id, imageUrl);
        const variants = mapEvitalRxMedicineVariants(medicine);
        if (id && variants.length > 1) variantMap.set(id, sortInventoryFirst(variants));
      });
    } catch {
      // Keep search usable even if image enrichment is temporarily unavailable.
    }
  }

  return { imageMap, variantMap };
}

async function loadMedicineBatches(medicines: PharmacyMedicineResult[]) {
  const variantMap = new Map<string, PharmacyMedicineResult[]>();
  const medicineMap = new Map(medicines.map((medicine) => [medicine.medicineId, medicine]));

  await Promise.all(
    [...medicineMap.keys()].map(async (medicineId) => {
      try {
        const parent = medicineMap.get(medicineId);
        const body = await requestEvitalRx<{ data?: EvitalRxMedicine[] | null }>({
          endpoint: 'doctor/medicines/get_batches',
          payload: { medicine_id: medicineId },
        });
        const batches = Array.isArray(body.data) ? body.data : [];
        if (!batches.length) return;

        const variants = batches
          .map((batch, index) =>
            mapEvitalRxMedicineVariants({
              ...batch,
              medicine_id: medicineId,
              medicine_name: parent?.name,
              manufacturer_name: parent?.manufacturer,
              content: parent?.composition,
              packing_size: parent?.packSize,
              gst_percentage: parent?.gstPercentage,
              batch_id: batch.id || batch.batch_id || `batch-${index + 1}`,
              batches: undefined,
            })
          )
          .flat();
        if (variants.length) variantMap.set(medicineId, sortInventoryFirst(variants));
      } catch {
        // eVitalRx returns status_code 0 when no batches exist; search should still work.
      }
    })
  );

  return variantMap;
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  const query = String(request.query?.query || '').trim();
  if (query.length < 2) {
    return response.status(400).json({ message: 'Search query must be at least 2 characters.' });
  }

  try {
    const inventorySaltResults = await searchInventoryBySalt(query).catch(() => []);
    if (inventorySaltResults.length >= 5) {
      response.setHeader('Cache-Control', 'private, max-age=60');
      return response.status(200).json({
        items: sortInventoryFirst(uniqueById(inventorySaltResults)),
        suggestions: [],
        source: 'inventory-cache',
      });
    }

    const searchTerms = query.includes(',')
      ? [query]
      : [query, `c,${query}`, `s,${query}`, `salt,${query}`, `composition,${query}`];
    const searchResults = await Promise.allSettled(
      searchTerms.map((searchTerm) => searchEvitalMedicines(searchTerm))
    );
    const successfulResults = searchResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    const medicines = uniqueById([
      ...successfulResults.flatMap((result) => result.medicines),
      ...inventorySaltResults,
    ]);
    const medicineIds = uniqueById(medicines).map((medicine) => medicine.medicineId);
    const { imageMap, variantMap: viewVariantMap } = await loadMedicineDetails(medicineIds);
    const batchVariantMap = await loadMedicineBatches(medicines);
    const enrichedMedicines = sortInventoryFirst(uniqueById(
      medicines.flatMap((medicine) => {
        const batchVariants = batchVariantMap.get(medicine.medicineId);
        const viewVariants = viewVariantMap.get(medicine.medicineId);
        const variants = batchVariants?.length
          ? batchVariants.map((variant) => ({
              ...medicine,
              ...variant,
              name: medicine.name,
              imageUrl: variant.imageUrl || medicine.imageUrl,
              manufacturer: medicine.manufacturer,
              composition: medicine.composition,
              packSize: medicine.packSize,
              gstPercentage: variant.gstPercentage || medicine.gstPercentage,
              dosageType: medicine.dosageType,
              medicineType: medicine.medicineType,
            }))
          : viewVariants?.length
            ? viewVariants
            : [medicine];
        return variants.map((variant) => ({
          ...variant,
          gstPercentage: variant.gstPercentage || medicine.gstPercentage,
          imageUrl:
            imageMap.get(variant.medicineId) ||
            (isUsableEvitalRxImage(variant.imageUrl) ? variant.imageUrl : undefined),
        }));
      })
    ));

    response.setHeader('Cache-Control', 'private, max-age=60');
    return response.status(200).json({
      items: enrichedMedicines,
      suggestions: successfulResults.flatMap((result) => result.suggestions),
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'eVitalRx medicine search is unavailable.',
    });
  }
}
