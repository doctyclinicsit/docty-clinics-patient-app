import {
  isUsableEvitalRxImage,
  requestEvitalRx,
  type EvitalRxMedicine,
  type PharmacyMedicineResult,
} from '../_lib/evitalrx.js';
import {
  getFreshInventorySnapshot,
  refreshInventorySnapshot,
} from '../_lib/pharmacy-inventory-cache.js';

type InventorySectionId = 'featured' | 'onlineTrending' | 'cosmetics' | 'fmcg' | 'babyFeed' | 'treatment';

const sectionRules: Record<Exclude<InventorySectionId, 'featured' | 'onlineTrending'>, RegExp[]> = {
  cosmetics: [
    /(sunscreen|sun screen|sunblock|spf|moistur|cream|lotion|serum|cleanser|face wash|body wash|skin|hair|shampoo|conditioner|lip|gel|soap|talc|powder|cosmetic|beauty|derma|acne|anti aging|anti-ageing|face|body lotion)/i,
  ],
  fmcg: [
    /(toothpaste|tooth brush|toothbrush|mouthwash|sanitary|diaper|baby wipe|wipe|nutrition|protein|glucose|ors|health drink|soap|hand wash|sanitizer|mask|cotton|bandage|adult diaper|napkin|feminine|hygiene|oral care|baby care)/i,
  ],
  babyFeed: [
    /(baby feed|baby food|infant formula|infant milk|follow[- ]?up formula|milk powder|weaning food|cereal|aptamil|cerelac|pediasure|pedia sure|lactogen|nan pro|\bnan\b|similac|dexolac|farex|enfamil|nestum|nutricia|mamaearth milky soft|baby nutrition)/i,
  ],
  treatment: [
    /(tablet|capsule|syrup|suspension|drop|injection|insulin|inhaler|ointment|antibiotic|pain|fever|cold|cough|diabetes|bp|blood pressure|thyroid|paracetamol|cetirizine|metformin|amlodipine|losartan|atorvastatin|pantoprazole|azithromycin)/i,
  ],
};

const onlineTrendRules: Array<{ rule: RegExp; weight: number }> = [
  { rule: /(paracetamol|dolo|calpol|fever|pain|nimesulide|diclofenac|ibuprofen)/i, weight: 12 },
  { rule: /(cetirizine|levocetirizine|allergy|cold|cough|vicks|throat|nasal|sinus)/i, weight: 11 },
  { rule: /(ors|oral rehydration|electral|walyte|glucose|dehydration)/i, weight: 10 },
  { rule: /(pantoprazole|omeprazole|rabeprazole|acidity|gastric|antacid|ranitidine)/i, weight: 9 },
  { rule: /(metformin|glucose|diabetes|insulin|sugar|test strip|glucometer)/i, weight: 9 },
  { rule: /(amlodipine|telmisartan|losartan|atorvastatin|bp|blood pressure|cholesterol)/i, weight: 8 },
  { rule: /(thyronorm|thyroxine|thyroid)/i, weight: 8 },
  { rule: /(vitamin|d3|b12|folic|zinc|calcium|magnesium|multivitamin|becosules)/i, weight: 7 },
  { rule: /(bandage|mask|sanitizer|cotton|swab|syringe|gloves|wound)/i, weight: 7 },
  { rule: /(sunscreen|moistur|face wash|shampoo|dandruff|acne|cream|gel|lotion)/i, weight: 6 },
  { rule: /(sanitary|pads|diaper|baby|women|whisper|stayfree)/i, weight: 6 },
  { rule: /(aptamil|cerelac|pediasure|pedia sure|lactogen|nan pro|\bnan\b|similac|dexolac|farex|enfamil|nestum|infant formula|baby food|baby feed)/i, weight: 8 },
];

const householdPopularRules: Array<{ rule: RegExp; weight: number }> = [
  { rule: /\b(dolo|calpol|crocin|paracetamol)\b/i, weight: 30 },
  { rule: /\b(okacet|cetirizine|levocetirizine|allegra|avil)\b/i, weight: 28 },
  { rule: /\b(vicks|vaporub|cough drops|solvin|cheston|flucold)\b/i, weight: 26 },
  { rule: /\b(digene|gelusil|gas[- ]?o[- ]?fast|gastica|digecaine)\b/i, weight: 25 },
  { rule: /\b(ors|electral|walyte|oral rehydration)\b/i, weight: 24 },
  { rule: /\b(whisper|stayfree|sanitary pad|sanitary pads|napkin)\b/i, weight: 23 },
  { rule: /\b(diaper|pampers|huggies|mamy poko|baby wipe|baby wipes)\b/i, weight: 22 },
  { rule: /\b(baby feed|baby food|infant formula|infant milk|follow[- ]?up formula|milk powder|aptamil|lactogen|nan pro|nan|cerelac|pediasure|pedia sure|similac|dexolac|farex|enfamil|nestum|nutricia)\b/i, weight: 29 },
  { rule: /\b(glucose strip|test strip|glucometer|contour plus|accu[- ]?chek|one touch)\b/i, weight: 21 },
  { rule: /\b(becosules|limcee|lemoncee|vitamin|d3|b12|zinc|calcium)\b/i, weight: 18 },
  { rule: /\b(bandage|cotton|swab|mask|sanitizer|gloves)\b/i, weight: 14 },
  { rule: /\b(sunscreen|face wash|shampoo|moistur|cream|lotion)\b/i, weight: 12 },
];

const babyFeedRule =
  /(baby feed|baby food|infant formula|infant milk|follow[- ]?up formula|milk powder|aptamil|cerelac|pediasure|pedia sure|lactogen|nan pro|\bnan\b|similac|dexolac|farex|enfamil|nestum|nutricia)/i;

function combinedMedicineText(medicine: PharmacyMedicineResult) {
  return [medicine.name, medicine.manufacturer, medicine.composition, medicine.packSize]
    .filter(Boolean)
    .join(' ');
}

function uniqueById(items: PharmacyMedicineResult[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function scoreSection(
  medicine: PharmacyMedicineResult,
  section: Exclude<InventorySectionId, 'featured' | 'onlineTrending'>
) {
  const searchableText = combinedMedicineText(medicine);
  let score = sectionRules[section].reduce(
    (total, rule) => total + (rule.test(searchableText) ? 4 : 0),
    0
  );
  const dosageType = medicine.dosageType?.toLowerCase() || '';
  const medicineType = medicine.medicineType?.toLowerCase() || '';
  const hasComposition = Boolean(medicine.composition?.trim());

  if (section === 'treatment') {
    if (hasComposition) score += 3;
    if (/(tablet|capsule|syrup|suspension|drop|injection|inhaler|ointment)/.test(dosageType)) {
      score += 3;
    }
    if (medicineType === 'drug') score += 2;
  }

  if (section === 'fmcg') {
    if (!hasComposition && !dosageType) score += 2;
    if (medicineType && medicineType !== 'drug') score += 1;
  }

  if (section === 'cosmetics') {
    if (/(cream|lotion|gel|serum|soap|shampoo|cleanser|face wash|sunscreen)/.test(dosageType)) {
      score += 2;
    }
  }

  return score;
}

function scoreOnlineTrend(medicine: PharmacyMedicineResult) {
  const searchableText = combinedMedicineText(medicine);
  const stockScore = Math.min(6, Math.floor((medicine.stockQuantity || 0) / 100));
  const dosageType = medicine.dosageType?.toLowerCase() || '';
  const medicineType = medicine.medicineType?.toLowerCase() || '';
  const ruleScore = onlineTrendRules.reduce(
    (total, { rule, weight }) => total + (rule.test(searchableText) ? weight : 0),
    0
  );
  const treatmentBoost =
    /(tablet|capsule|syrup|drop|inhaler|ointment|gel|cream)/.test(dosageType) ||
    medicineType === 'drug'
      ? 3
      : 0;

  return ruleScore + stockScore + treatmentBoost;
}

function scoreHouseholdPopular(medicine: PharmacyMedicineResult) {
  const searchableText = combinedMedicineText(medicine);
  const ruleScore = householdPopularRules.reduce(
    (total, { rule, weight }) => total + (rule.test(searchableText) ? weight : 0),
    0
  );
  const stockScore = Math.min(8, Math.floor((medicine.stockQuantity || 0) / 50));
  return ruleScore + stockScore;
}

function isBabyFeedProduct(medicine: PharmacyMedicineResult) {
  return babyFeedRule.test(combinedMedicineText(medicine));
}

function pickSection(
  medicines: PharmacyMedicineResult[],
  section: Exclude<InventorySectionId, 'featured' | 'onlineTrending'>,
  limit = 8
) {
  return medicines
    .map((medicine) => ({ medicine, score: scoreSection(medicine, section) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.medicine.stockQuantity || 0) - (a.medicine.stockQuantity || 0)
    )
    .map(({ medicine }) => medicine)
    .slice(0, limit);
}

function pickOnlineTrending(medicines: PharmacyMedicineResult[], limit = 12) {
  return medicines
    .filter((medicine) => medicine.available !== false && (medicine.stockQuantity || 0) > 0)
    .map((medicine) => ({ medicine, score: scoreOnlineTrend(medicine) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.medicine.stockQuantity || 0) - (a.medicine.stockQuantity || 0)
    )
    .map(({ medicine }) => medicine)
    .slice(0, limit);
}

function pickHouseholdPopular(medicines: PharmacyMedicineResult[], limit = 12) {
  const availableMedicines = medicines.filter(
    (medicine) => medicine.available !== false && (medicine.stockQuantity || 0) > 0
  );
  const householdMatches = availableMedicines
    .map((medicine) => ({ medicine, score: scoreHouseholdPopular(medicine) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.medicine.stockQuantity || 0) - (a.medicine.stockQuantity || 0)
    )
    .map(({ medicine }) => medicine);

  const babyFeedMatches = householdMatches.filter(isBabyFeedProduct).slice(0, 3);
  const selected = uniqueById([...babyFeedMatches, ...householdMatches]).slice(0, limit);
  if (selected.length >= limit) return selected;

  const selectedIds = new Set(selected.map((medicine) => medicine.id));
  const fallback = availableMedicines
    .filter((medicine) => !selectedIds.has(medicine.id))
    .sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))
    .slice(0, limit - selected.length);

  return [...selected, ...fallback];
}

function collectDisplayedIds(sections: PharmacyMedicineResult[][]) {
  return Array.from(
    new Set(
      sections
        .flat()
        .map((medicine) => medicine.id)
        .filter(Boolean)
    )
  );
}

async function loadMedicineImages(medicineIds: string[]) {
  if (medicineIds.length === 0) return new Map<string, string>();

  const imageMap = new Map<string, string>();
  const chunkSize = 10;
  for (let index = 0; index < medicineIds.length; index += chunkSize) {
    const chunk = medicineIds.slice(index, index + chunkSize);
    const payload =
      chunk.length === 1
        ? { medicine_id: chunk[0] }
        : { medicine_ids: JSON.stringify(chunk) };

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
    });
  }

  return imageMap;
}

function withImages(items: PharmacyMedicineResult[], imageMap: Map<string, string>) {
  return items.map((item) => ({
    ...item,
    imageUrl: imageMap.get(item.id) || (isUsableEvitalRxImage(item.imageUrl) ? item.imageUrl : undefined),
  }));
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Method not allowed.' });
  }

  try {
    const forceRefresh = String(request.query?.refresh || '') === '1';
    const snapshot = forceRefresh
      ? await refreshInventorySnapshot()
      : (await getFreshInventorySnapshot()) || (await refreshInventorySnapshot());
    const medicines = uniqueById(
      snapshot.items.sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0))
    );

    const cosmetics = pickSection(medicines, 'cosmetics', 40);
    const onlineTrending = pickOnlineTrending(medicines, 40);
    const householdPopular = pickHouseholdPopular(medicines, 40);
    const fmcg = pickSection(
      medicines.filter((medicine) => !cosmetics.some((item) => item.id === medicine.id)),
      'fmcg',
      40
    );
    const babyFeed = pickSection(medicines, 'babyFeed', 40);
    const treatment = pickSection(
      medicines.filter(
        (medicine) =>
          !cosmetics.some((item) => item.id === medicine.id) &&
          !fmcg.some((item) => item.id === medicine.id) &&
          !babyFeed.some((item) => item.id === medicine.id)
      ),
      'treatment',
      40
    );
    const imageMap = await loadMedicineImages(
      collectDisplayedIds([onlineTrending, householdPopular, cosmetics, fmcg, babyFeed, treatment])
    ).catch(() => new Map<string, string>());

    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader('X-Inventory-Synced-At', snapshot.syncedAt);
    return response.status(200).json({
      syncedAt: snapshot.syncedAt,
      onlineTrending: withImages(onlineTrending, imageMap),
      featured: withImages(householdPopular, imageMap),
      cosmetics: withImages(cosmetics, imageMap),
      fmcg: withImages(fmcg, imageMap),
      babyFeed: withImages(babyFeed, imageMap),
      treatment: withImages(treatment, imageMap),
    });
  } catch (error) {
    return response.status(502).json({
      message: error instanceof Error ? error.message : 'eVitalRx inventory is unavailable.',
    });
  }
}
